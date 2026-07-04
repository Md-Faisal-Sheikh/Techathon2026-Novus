'use strict';

const EventEmitter = require('events');
const config = require('./config');

/**
 * store.js — THE single source of truth.
 *
 * There is exactly one office state in the whole system. The API server reads
 * from it, pushes it over WebSocket, and the Discord bot reads the very same
 * state through the HTTP API. Nothing else holds device state.
 *
 * Office layout (fixed by the brief):
 *   3 rooms x (2 fans + 3 lights) = 15 devices total.
 *   Total fans = 6, total lights = 9.  (The brief's "18" is an error.)
 */

const ROOMS = [
  { key: 'drawing', name: 'Drawing Room' },
  { key: 'work1', name: 'Work Room 1' },
  { key: 'work2', name: 'Work Room 2' },
];

// Human-friendly aliases the Discord `!room` command accepts.
const ROOM_ALIASES = {
  drawing: 'drawing', 'drawing room': 'drawing', draw: 'drawing', dr: 'drawing',
  work1: 'work1', 'work room 1': 'work1', 'work 1': 'work1', wr1: 'work1', w1: 'work1',
  work2: 'work2', 'work room 2': 'work2', 'work 2': 'work2', wr2: 'work2', w2: 'work2',
};

function ratedWatts(type) {
  return type === 'fan' ? config.FAN_WATTS : config.LIGHT_WATTS;
}

class OfficeStore extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this.energyWh = { total: 0, drawing: 0, work1: 0, work2: 0 }; // accumulated since midnight
    this._energyDay = this._todayKey();
    this._lastTick = Date.now();
    this._timer = null;
    this._seed();
  }

  // ---- construction ----------------------------------------------------------

  _seed() {
    const now = Date.now();
    let id = 1;
    for (const room of ROOMS) {
      const layout = [
        { type: 'fan', label: 'Fan 1' },
        { type: 'fan', label: 'Fan 2' },
        { type: 'light', label: 'Light 1' },
        { type: 'light', label: 'Light 2' },
        { type: 'light', label: 'Light 3' },
      ];
      layout.forEach((d, i) => {
        // Seed a believable starting picture: work rooms busy, drawing room quiet.
        const baseOn = room.key === 'drawing' ? 0.25 : 0.6;
        const status = Math.random() < baseOn;
        this.devices.push({
          id: `${room.key}-${d.type}-${i + 1}`,
          num: id++,
          name: d.label,
          type: d.type,
          room: room.name,
          roomKey: room.key,
          status,
          ratedWatts: ratedWatts(d.type),
          powerWatts: status ? ratedWatts(d.type) : 0,
          lastChanged: now,
          onSince: status ? now : null,
        });
      });
    }
  }

  // ---- simulation loop -------------------------------------------------------

  start() {
    if (this._timer) return;
    this._lastTick = Date.now();
    this._timer = setInterval(() => this.tick(), config.SIM_INTERVAL_MS);
    // Don't keep the process alive purely for the simulator in tests.
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  /**
   * Advance the world by one step: accumulate energy for the elapsed interval,
   * then flip a few devices so the dashboard always has live movement.
   */
  tick(now = Date.now()) {
    this._accumulateEnergy(now);
    this._mutate(now);
    this.emit('update', this.snapshot(now));
    return this.snapshot(now);
  }

  _accumulateEnergy(now) {
    // Reset the daily counter at local midnight.
    const today = this._todayKey(now);
    if (today !== this._energyDay) {
      this.energyWh = { total: 0, drawing: 0, work1: 0, work2: 0 };
      this._energyDay = today;
    }
    const hours = (now - this._lastTick) / 3_600_000; // ms -> hours
    this._lastTick = now;
    if (hours <= 0) return;
    for (const d of this.devices) {
      if (d.status) {
        const wh = d.powerWatts * hours; // W * h = Wh
        this.energyWh.total += wh;
        this.energyWh[d.roomKey] += wh;
      }
    }
  }

  _mutate(now) {
    const hour = new Date(now).getHours();
    const officeOpen = hour >= config.OFFICE_OPEN_HOUR && hour < config.OFFICE_CLOSE_HOUR;
    // People turn things on during office hours and (mostly) off afterwards.
    for (const d of this.devices) {
      const pOff = officeOpen ? 0.06 : 0.35; // chance an ON device turns off
      const pOn = officeOpen ? 0.12 : 0.02;  // chance an OFF device turns on
      const roll = Math.random();
      if (d.status && roll < pOff) this._setDevice(d, false, now);
      else if (!d.status && roll < pOn) this._setDevice(d, true, now);
    }
  }

  _setDevice(d, on, now = Date.now()) {
    if (d.status === on) return;
    d.status = on;
    d.powerWatts = on ? d.ratedWatts : 0;
    d.lastChanged = now;
    d.onSince = on ? now : null;
  }

  // ---- read API (used by server + bot) --------------------------------------

  getDevices() {
    return this.devices.map((d) => ({ ...d }));
  }

  getRoomKey(input) {
    if (!input) return null;
    return ROOM_ALIASES[String(input).trim().toLowerCase()] || null;
  }

  getRoom(input, now = Date.now()) {
    const key = this.getRoomKey(input);
    if (!key) return null;
    const meta = ROOMS.find((r) => r.key === key);
    const devices = this.devices.filter((d) => d.roomKey === key);
    return {
      key,
      name: meta.name,
      devices: devices.map((d) => ({ ...d })),
      power: devices.reduce((s, d) => s + d.powerWatts, 0),
      fansOn: devices.filter((d) => d.type === 'fan' && d.status).length,
      lightsOn: devices.filter((d) => d.type === 'light' && d.status).length,
      energyWh: this.energyWh[key],
    };
  }

  getPower() {
    const perRoom = {};
    for (const r of ROOMS) perRoom[r.key] = 0;
    let total = 0;
    for (const d of this.devices) {
      total += d.powerWatts;
      perRoom[d.roomKey] += d.powerWatts;
    }
    return {
      totalWatts: total,
      perRoom, // keyed by room key
      todayKwh: +(this.energyWh.total / 1000).toFixed(3),
      perRoomKwh: {
        drawing: +(this.energyWh.drawing / 1000).toFixed(3),
        work1: +(this.energyWh.work1 / 1000).toFixed(3),
        work2: +(this.energyWh.work2 / 1000).toFixed(3),
      },
    };
  }

  /**
   * Anomaly detection. Two rules from the brief:
   *   1. Devices left ON outside office hours (9AM-5PM).
   *   2. A room where ALL devices have been ON continuously > threshold hours.
   */
  getAlerts(now = Date.now()) {
    const alerts = [];
    const d = new Date(now);
    const hour = d.getHours();
    const afterHours =
      config.FORCE_AFTER_HOURS ||
      hour < config.OFFICE_OPEN_HOUR ||
      hour >= config.OFFICE_CLOSE_HOUR;
    const iso = d.toISOString();

    // Rule 1 — after-hours usage, grouped per room.
    if (afterHours) {
      for (const room of ROOMS) {
        const on = this.devices.filter((x) => x.roomKey === room.key && x.status);
        if (on.length > 0) {
          const fans = on.filter((x) => x.type === 'fan').length;
          const lights = on.filter((x) => x.type === 'light').length;
          alerts.push({
            id: `afterhours-${room.key}`,
            severity: 'warning',
            room: room.name,
            roomKey: room.key,
            type: 'after_hours',
            message: `${room.name}: ${fans} fan(s) and ${lights} light(s) still ON outside office hours.`,
            timestamp: iso,
          });
        }
      }
    }

    // Rule 2 — a whole room stuck ON for too long.
    const thresholdMs = config.ROOM_ON_HOURS_THRESHOLD * 3_600_000;
    for (const room of ROOMS) {
      const devices = this.devices.filter((x) => x.roomKey === room.key);
      const allOn = devices.every((x) => x.status);
      if (!allOn) continue;
      const oldestOnSince = Math.min(...devices.map((x) => x.onSince || now));
      const contMs = now - oldestOnSince;
      if (contMs >= thresholdMs) {
        const mins = Math.round(contMs / 60000);
        alerts.push({
          id: `stuck-${room.key}`,
          severity: 'critical',
          room: room.name,
          roomKey: room.key,
          type: 'room_all_on',
          message: `${room.name}: all ${devices.length} devices ON for ${mins} min straight.`,
          timestamp: iso,
        });
      }
    }

    return alerts;
  }

  snapshot(now = Date.now()) {
    return {
      timestamp: new Date(now).toISOString(),
      rooms: ROOMS.map((r) => this.getRoom(r.key, now)),
      power: this.getPower(),
      alerts: this.getAlerts(now),
      officeHours: {
        open: config.OFFICE_OPEN_HOUR,
        close: config.OFFICE_CLOSE_HOUR,
        forceAfterHours: config.FORCE_AFTER_HOURS,
      },
    };
  }

  // ---- test / demo helpers ---------------------------------------------------

  /** Force a device on/off by id (used by tests and the /api/devices/:id/set route). */
  setDeviceById(id, on, now = Date.now()) {
    const dev = this.devices.find((x) => x.id === id);
    if (!dev) return null;
    this._setDevice(dev, !!on, now);
    this.emit('update', this.snapshot(now));
    return { ...dev };
  }

  /** Force every device in a room on/off (handy for triggering the room alert in a demo). */
  setRoom(input, on, now = Date.now()) {
    const key = this.getRoomKey(input);
    if (!key) return null;
    for (const dev of this.devices.filter((x) => x.roomKey === key)) {
      this._setDevice(dev, !!on, now);
    }
    this.emit('update', this.snapshot(now));
    return this.getRoom(key, now);
  }

  _todayKey(now = Date.now()) {
    const d = new Date(now);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }
}

// Export a single shared instance — this is what makes it one source of truth.
const store = new OfficeStore();

module.exports = { store, OfficeStore, ROOMS, ROOM_ALIASES };

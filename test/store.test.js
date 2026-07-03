'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

// Freeze config to deterministic values before the store loads.
process.env.FAN_WATTS = '60';
process.env.LIGHT_WATTS = '15';
process.env.OFFICE_OPEN_HOUR = '9';
process.env.OFFICE_CLOSE_HOUR = '17';
process.env.ROOM_ON_HOURS_THRESHOLD = '2';

const { OfficeStore } = require('../src/store');

test('office has exactly 15 devices: 6 fans + 9 lights', () => {
  const s = new OfficeStore();
  const devices = s.getDevices();
  assert.strictEqual(devices.length, 15);
  assert.strictEqual(devices.filter((d) => d.type === 'fan').length, 6);
  assert.strictEqual(devices.filter((d) => d.type === 'light').length, 9);
});

test('each of the 3 rooms has 2 fans + 3 lights', () => {
  const s = new OfficeStore();
  for (const key of ['drawing', 'work1', 'work2']) {
    const room = s.getRoom(key);
    assert.strictEqual(room.devices.filter((d) => d.type === 'fan').length, 2);
    assert.strictEqual(room.devices.filter((d) => d.type === 'light').length, 3);
  }
});

test('room aliases resolve', () => {
  const s = new OfficeStore();
  assert.strictEqual(s.getRoomKey('Work Room 1'), 'work1');
  assert.strictEqual(s.getRoomKey('w2'), 'work2');
  assert.strictEqual(s.getRoomKey('drawing room'), 'drawing');
  assert.strictEqual(s.getRoomKey('nope'), null);
});

test('total power equals the sum of ON device ratings', () => {
  const s = new OfficeStore();
  s.setRoom('work1', true);
  s.setRoom('work2', false);
  s.setRoom('drawing', false);
  // work1 fully on = 2*60 + 3*15 = 165
  assert.strictEqual(s.getPower().totalWatts, 165);
  assert.strictEqual(s.getPower().perRoom.work1, 165);
});

test('after-hours alert fires when a device is on outside office hours', () => {
  const s = new OfficeStore();
  s.setRoom('drawing', false);
  s.setRoom('work1', false);
  s.setRoom('work2', false);
  s.setDeviceById('work1-fan-1', true);
  const at10pm = new Date(); at10pm.setHours(22, 0, 0, 0);
  const alerts = s.getAlerts(at10pm.getTime());
  assert.ok(alerts.some((a) => a.type === 'after_hours' && a.roomKey === 'work1'));
});

test('no after-hours alert during office hours', () => {
  const s = new OfficeStore();
  s.setDeviceById('work1-fan-1', true);
  const at11am = new Date(); at11am.setHours(11, 0, 0, 0);
  const alerts = s.getAlerts(at11am.getTime());
  assert.ok(!alerts.some((a) => a.type === 'after_hours'));
});

test('room_all_on alert fires after the threshold', () => {
  const s = new OfficeStore();
  const now = Date.now();
  const threeHoursAgo = now - 3 * 3_600_000;
  // Fresh stores seed devices randomly, so force the room fully OFF first. That
  // guarantees every device transitions off->on and gets the backdated onSince
  // (a no-op on->on set intentionally preserves the existing timer).
  s.setRoom('work2', false);
  s.setRoom('work2', true, threeHoursAgo); // all 5 on, continuously since 3h ago
  const alerts = s.getAlerts(now);
  assert.ok(alerts.some((a) => a.type === 'room_all_on' && a.roomKey === 'work2'));
});

test('energy accumulates over time', () => {
  const s = new OfficeStore();
  s.setRoom('drawing', false);
  s.setRoom('work1', false);
  s.setRoom('work2', false);
  s.setDeviceById('work1-fan-1', true); // 60W
  const t0 = Date.now();
  s._lastTick = t0;
  s._accumulateEnergy(t0 + 3_600_000); // +1 hour -> 60 Wh
  assert.ok(Math.abs(s.getPower().todayKwh - 0.06) < 1e-6);
});

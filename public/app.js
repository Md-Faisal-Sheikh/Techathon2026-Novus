/* Office Power Monitor — dashboard client
 * Connects to the shared backend over Socket.IO and re-renders on every update.
 * No polling, no manual refresh: the backend pushes state, we paint it.
 */
(function () {
  'use strict';

  const socket = io();
  const NS = 'http://www.w3.org/2000/svg';

  // Room geometry for the top-view floor plan (viewBox 900 x 420).
  const ROOM_BOXES = {
    drawing: { x: 24, w: 268, name: 'Drawing Room' },
    work1:   { x: 316, w: 268, name: 'Work Room 1' },
    work2:   { x: 608, w: 268, name: 'Work Room 2' },
  };
  const ROOM_ORDER = ['drawing', 'work1', 'work2'];

  // Device -> position within its room (fractions of room width; absolute y).
  const LIGHT_SLOTS = [0.25, 0.5, 0.75];
  const FAN_SLOTS = [0.34, 0.66];
  const LIGHT_Y = 74;
  const FAN_Y = 214;

  // ---------------------------------------------------------------- floor plan
  function buildFloor() {
    const svg = document.getElementById('floor');
    svg.innerHTML = '';

    // glow filter for lit lights
    const defs = el('defs');
    defs.innerHTML =
      '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="6" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg.appendChild(defs);

    for (const key of ROOM_ORDER) {
      const box = ROOM_BOXES[key];
      // room shell
      svg.appendChild(rect(box.x, 20, box.w, 380, { rx: 10, fill: '#101826', stroke: '#26344f', 'stroke-width': 1.5 }));
      // label
      svg.appendChild(text(box.x + 14, 400 - 12, box.name.toUpperCase(), {
        fill: '#6c7c98', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace', 'letter-spacing': '1.5',
      }));
      // simple furniture so it reads as a real room
      drawFurniture(svg, key, box);

      // lights
      LIGHT_SLOTS.forEach((frac, i) => {
        const cx = box.x + box.w * frac;
        svg.appendChild(makeLight(`${key}-light-${i + 1}`, cx, LIGHT_Y));
      });
      // fans
      FAN_SLOTS.forEach((frac, i) => {
        const cx = box.x + box.w * frac;
        svg.appendChild(makeFan(`${key}-fan-${i + 1}`, cx, FAN_Y));
      });
    }
  }

  function drawFurniture(svg, key, box) {
    const cy = 300;
    if (key === 'drawing') {
      // sofa + coffee table (waiting area)
      svg.appendChild(rect(box.x + 30, cy - 6, 90, 34, { rx: 8, fill: '#1c2740', stroke: '#2c3a58' }));
      svg.appendChild(rect(box.x + 145, cy + 2, 54, 26, { rx: 6, fill: '#1c2740', stroke: '#2c3a58' }));
    } else {
      // two desks with chairs
      [0.28, 0.68].forEach((f) => {
        const dx = box.x + box.w * f - 34;
        svg.appendChild(rect(dx, cy - 4, 68, 30, { rx: 5, fill: '#1c2740', stroke: '#2c3a58' }));
        svg.appendChild(circ(dx + 34, cy + 44, 9, { fill: '#17223a', stroke: '#2c3a58' }));
      });
    }
  }

  function makeLight(id, cx, cy) {
    const g = el('g', { id: `sv-${id}` });
    const halo = circ(cx, cy, 15, { fill: '#ffd05b', opacity: 0.0, 'data-role': 'halo' });
    const bulb = circ(cx, cy, 9, { fill: '#2a3550', stroke: '#3a4a66', 'stroke-width': 1, 'data-role': 'bulb' });
    g.appendChild(halo);
    g.appendChild(bulb);
    return g;
  }

  function makeFan(id, cx, cy) {
    const g = el('g', { id: `sv-${id}`, class: 'fan-group' });
    // mount ring
    g.appendChild(circ(cx, cy, 20, { fill: 'none', stroke: '#2c3a58', 'stroke-width': 1 }));
    const blades = el('g', { class: 'fan-blades' });
    for (let k = 0; k < 3; k++) {
      const blade = el('path', {
        d: bladePath(cx, cy, (k * 120 * Math.PI) / 180),
        fill: '#3a4a66', 'data-role': 'blade',
      });
      blades.appendChild(blade);
    }
    g.appendChild(blades);
    g.appendChild(circ(cx, cy, 4, { fill: '#5a6a86', 'data-role': 'hub' }));
    return g;
  }

  function bladePath(cx, cy, ang) {
    const len = 17, wid = 5;
    const tip = [cx + Math.cos(ang) * len, cy + Math.sin(ang) * len];
    const p1 = [cx + Math.cos(ang + 0.5) * wid, cy + Math.sin(ang + 0.5) * wid];
    const p2 = [cx + Math.cos(ang - 0.5) * wid, cy + Math.sin(ang - 0.5) * wid];
    return `M${cx},${cy} L${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${tip[0].toFixed(1)},${tip[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)} Z`;
  }

  function updateFloor(rooms) {
    for (const room of rooms) {
      for (const d of room.devices) {
        const g = document.getElementById(`sv-${d.id}`);
        if (!g) continue;
        if (d.type === 'light') {
          const bulb = g.querySelector('[data-role=bulb]');
          const halo = g.querySelector('[data-role=halo]');
          if (d.status) {
            bulb.setAttribute('fill', '#ffd05b');
            bulb.setAttribute('filter', 'url(#glow)');
            halo.setAttribute('fill', '#ffd05b');
            halo.setAttribute('opacity', '0.28');
          } else {
            bulb.setAttribute('fill', '#2a3550');
            bulb.removeAttribute('filter');
            halo.setAttribute('opacity', '0');
          }
        } else {
          g.classList.toggle('fan-on', d.status);
          g.querySelectorAll('[data-role=blade]').forEach((b) =>
            b.setAttribute('fill', d.status ? '#ff9e40' : '#3a4a66'));
          g.querySelector('[data-role=hub]').setAttribute('fill', d.status ? '#ffc07a' : '#5a6a86');
        }
      }
    }
  }

  // ------------------------------------------------------------- side panels
  function updatePower(power) {
    document.getElementById('totalW').textContent = Math.round(power.totalWatts);
    document.getElementById('todayKwh').textContent = `${power.todayKwh.toFixed(3)} kWh today`;

    const wrap = document.getElementById('roomBars');
    const max = Math.max(300, power.totalWatts); // shared scale
    wrap.innerHTML = '';
    for (const key of ROOM_ORDER) {
      const w = power.perRoom[key] || 0;
      const bar = document.createElement('div');
      bar.className = 'rbar';
      bar.innerHTML =
        `<div class="rbar-top"><span class="name">${ROOM_BOXES[key].name}</span><span class="w">${Math.round(w)} W</span></div>` +
        `<div class="rbar-track"><div class="rbar-fill" style="width:${(w / max) * 100}%"></div></div>`;
      wrap.appendChild(bar);
    }
  }

  function updateAlerts(alerts) {
    const list = document.getElementById('alertList');
    document.getElementById('alertCount').textContent = `${alerts.length} active`;
    if (!alerts.length) {
      list.innerHTML = '<li class="alert-empty">All clear — nothing anomalous.</li>';
      return;
    }
    list.innerHTML = '';
    for (const a of alerts) {
      const li = document.createElement('li');
      li.className = `alert-item ${a.severity === 'critical' ? 'critical' : ''}`;
      const emoji = a.severity === 'critical' ? '🚨' : '⚠️';
      li.innerHTML =
        `<div class="msg">${emoji} ${escapeHtml(a.message)}</div>` +
        `<div class="ts">${new Date(a.timestamp).toLocaleTimeString()}</div>`;
      list.appendChild(li);
    }
  }

  function updateDevices(rooms) {
    const wrap = document.getElementById('rooms');
    let onCount = 0;
    wrap.innerHTML = '';
    for (const room of rooms) {
      const col = document.createElement('div');
      col.className = 'room-col';
      let rows = '';
      for (const d of room.devices) {
        if (d.status) onCount++;
        const ico = d.type === 'fan' ? '🌀' : '💡';
        rows +=
          `<div class="dev-row">` +
          `<span class="dev-ico">${ico}</span>` +
          `<span class="dev-name">${d.name}</span>` +
          `<span class="dev-w">${d.status ? d.powerWatts + 'W' : '—'}</span>` +
          `<span class="pill ${d.status ? 'on' : 'off'}">${d.status ? 'ON' : 'OFF'}</span>` +
          `</div>`;
      }
      col.innerHTML =
        `<h3>${room.name}</h3>` +
        `<div class="room-power">${Math.round(room.power)} W · ${room.fansOn + room.lightsOn}/5 on</div>` +
        rows;
      wrap.appendChild(col);
    }
    document.getElementById('devSummary').textContent = `${onCount} / 15 on`;
  }

  // ---------------------------------------------------------------- plumbing
  function render(state) {
    updateFloor(state.rooms);
    updateDevices(state.rooms);
    updatePower(state.power);
    updateAlerts(state.alerts);
    document.getElementById('lastUpdate').textContent =
      'updated ' + new Date(state.timestamp).toLocaleTimeString();
  }

  socket.on('connect', () => setConn(true));
  socket.on('disconnect', () => setConn(false));
  socket.on('state', render);

  function setConn(live) {
    const c = document.getElementById('conn');
    c.classList.toggle('live', live);
    document.getElementById('connText').textContent = live ? 'live' : 'offline';
  }

  // local wall clock
  setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString();
  }, 1000);

  // ------------------------------------------------------------------ helpers
  function el(tag, attrs) { const n = document.createElementNS(NS, tag); setAttrs(n, attrs); return n; }
  function rect(x, y, w, h, attrs) { return el('rect', Object.assign({ x, y, width: w, height: h }, attrs)); }
  function circ(cx, cy, r, attrs) { return el('circle', Object.assign({ cx, cy, r }, attrs)); }
  function text(x, y, str, attrs) { const t = el('text', Object.assign({ x, y }, attrs)); t.textContent = str; return t; }
  function setAttrs(n, attrs) { if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  buildFloor();
})();

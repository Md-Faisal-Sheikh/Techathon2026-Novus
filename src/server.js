'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const config = require('./config');
const { store } = require('./store');

/**
 * server.js — the shared backend.
 *
 *   [ Simulated Device Layer (store) ]
 *              |
 *         [ Backend API ]  <-- this file
 *          /          \
 *   [ Web Dashboard ]  [ Discord Bot ]
 *
 * The dashboard connects over WebSocket for push updates; the Discord bot calls
 * the REST endpoints below. Both see identical data because both read `store`.
 */

const app = express();
app.use(express.json());

// Allow the React dev server (or any separately-hosted frontend) to call the
// REST API directly. Mirrors the Socket.IO `origin: '*'` below. In the default
// dev flow the Vite proxy makes this same-origin, so it's a no-op there.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- REST API ---------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Full snapshot — everything the dashboard/bot needs in one call.
app.get('/api/state', (_req, res) => res.json(store.snapshot()));

// All 15 devices, grouped and flat.
app.get('/api/devices', (_req, res) => {
  res.json({ count: store.getDevices().length, devices: store.getDevices() });
});

// One room by name/alias, e.g. /api/rooms/work1
app.get('/api/rooms/:name', (req, res) => {
  const room = store.getRoom(req.params.name);
  if (!room) return res.status(404).json({ error: `Unknown room "${req.params.name}"` });
  res.json(room);
});

// Live power meter + today's energy.
app.get('/api/power', (_req, res) => res.json(store.getPower()));

// Active alerts.
app.get('/api/alerts', (_req, res) => res.json({ alerts: store.getAlerts() }));

// ---- Demo controls (optional; make alerts appear on cue during a live demo) --

app.post('/api/devices/:id/set', (req, res) => {
  const updated = store.setDeviceById(req.params.id, !!req.body.on);
  if (!updated) return res.status(404).json({ error: 'Unknown device id' });
  res.json(updated);
});

app.post('/api/rooms/:name/set', (req, res) => {
  const room = store.setRoom(req.params.name, !!req.body.on);
  if (!room) return res.status(404).json({ error: 'Unknown room' });
  res.json(room);
});

// ---- Real-time layer --------------------------------------------------------

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  // Send the current picture immediately on connect, then stream updates.
  socket.emit('state', store.snapshot());
});

// Push every simulator tick (and manual override) to all connected dashboards.
store.on('update', (snapshot) => io.emit('state', snapshot));

// ---- Boot -------------------------------------------------------------------

function start() {
  store.start();
  server.listen(config.PORT, () => {
    console.log(`[server] backend + dashboard on http://localhost:${config.PORT}`);
    console.log(`[server] simulating 15 devices every ${config.SIM_INTERVAL_MS} ms`);
  });
  return server;
}

if (require.main === module) start();

module.exports = { app, server, io, start };

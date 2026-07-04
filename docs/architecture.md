# Architecture

## One source of truth

The whole system is organised around a single rule from the brief: **the web
dashboard and the Discord bot must read the same live data.** We enforce this
with one in-memory store (`src/store.js`) that is the *only* place device state
exists.

```
        [ Simulated Device Layer ]        src/store.js  (the ONLY state)
                    │
             [ Backend API ]              src/server.js (Express + Socket.IO)
              /            \
   [ Web Dashboard ]   [ Discord Bot ]    public/       src/bot.js
        (WebSocket)      (HTTP GET)
              \            /
             [ The boss / team ]
```

- The **dashboard** opens a Socket.IO connection. The server pushes a fresh
  snapshot on every device change — no polling, no manual refresh.
- The **bot** calls the same REST endpoints the dashboard's data comes from
  (`/api/state`, `/api/rooms/:name`, `/api/power`, `/api/alerts`). It holds no
  state of its own, so it can never disagree with the dashboard.

Because both interfaces derive from one store, "what the dashboard shows" and
"what the bot says" are the same reality by construction, not by luck.

## Modules

| File | Responsibility |
|------|----------------|
| `src/config.js` | All tunables, env-driven (ports, office hours, thresholds, tokens). |
| `src/store.js` | Device model, simulator loop, power + energy math, alert rules. Single source of truth. |
| `src/server.js` | REST API + Socket.IO push + serves the dashboard. |
| `src/bot.js` | Discord commands + proactive alert posting. Reads the API. |
| `src/llm.js` | Optional LLM humanizer with an offline template fallback. |
| `public/` | The dashboard (vanilla JS + Socket.IO client + live SVG floor plan). |
| `test/` | Unit tests for device count, power math, and alert logic. |

## Data model

Each of the 15 devices:

```js
{
  id: "work1-fan-1",          // stable id
  name: "Fan 1",              // display name
  type: "fan" | "light",
  room: "Work Room 1",
  roomKey: "work1",
  status: true,               // on/off
  ratedWatts: 60,             // 60 fan / 15 light
  powerWatts: 60,             // rated when on, 0 when off
  lastChanged: 1712345678901, // ms epoch of last flip
  onSince: 1712345678901      // ms epoch it turned on (null if off)
}
```

## The simulator

`store.tick()` runs on an interval (default 3 s). Each tick it:

1. **Accumulates energy** — integrates `power × Δt` per device into a daily kWh
   counter (per-room and total), resetting at local midnight.
2. **Mutates devices** — flips a few devices with time-of-day-aware
   probabilities (things come on during office hours, mostly go off after), so
   the dashboard always has live movement.
3. **Emits** the new snapshot, which the server relays over WebSocket.

## Alerts

Two anomaly rules (`store.getAlerts`):

1. **After-hours usage** — any device ON outside 9 AM–5 PM, grouped per room.
2. **Room stuck on** — every device in a room ON continuously beyond a threshold
   (default 2 h). Uses `onSince` to measure the continuous run.

Alerts are timestamped. The bot re-checks them on a timer and posts new ones to
a Discord channel.

## Swapping simulation for hardware

The simulator writes the same data shape a real ESP32 would `POST` (see
`hardware/`). To go from concept to real hardware you'd add an `/api/ingest`
route that writes incoming device reports into the store — nothing downstream
(dashboard, bot, alerts) would change.

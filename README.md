# Office Power Monitor — Lights, Fans, Discord

A real-time office monitoring system for the **Techathon Nationals 2026 Hackathon** (IUT Robotics Society) preliminary round problem: *"Lights, Fans, Discord: The Boss's Big Idea."*

The boss wants to see every light and fan in the office on a **live web dashboard**, check how much power is being burned, and ask a **Discord bot** about it — all reading from **one shared backend**. This project delivers exactly that, plus a simulated device layer, an active-alerts engine, a hardware/electrical concept, and a system diagram.

---

## 1. Problem Understanding

A small office runs everything on Discord, and people keep leaving lights and fans on after they go home. The bill climbs and nobody notices in time. The boss wants continuous visibility into the office's electrical state through two interfaces that must always agree with each other.

**The office layout is fixed:** 3 rooms — *Drawing Room*, *Work Room 1*, *Work Room 2* — each with **2 fans + 3 lights** (5 devices per room).

> **A note on device count.** The prose in a couple of places in the problem PDF says *"18 devices,"* but its own math is `3 rooms × (2 fans + 3 lights) = 15`, and the office-layout figure summarizes **6 fans + 9 lights = 15**. The "18" is an inconsistency in the brief. This implementation uses the internally consistent, layout-accurate value of **15 devices (6 fans + 9 lights)** throughout, as confirmed with the team.

Each device tracks: **status** (on/off), **power draw** (realistic watts when on — fan 60 W, light 15 W), **room**, and **last-changed timestamp**. The data is **simulated and dynamic** — it changes over time so the dashboard always has something live to show.

---

## 2. Solution Approach & Architecture

The core design principle from the brief is **one source of truth**. Both the web dashboard and the Discord bot read the same live device state — they never diverge.

```
                         ┌──────────────────────────┐
                         │   Simulated Device Layer  │
                         │  15 devices + tick() loop │
                         │   (src/store.js — the     │
                         │    single source of truth)│
                         └────────────┬─────────────┘
                                      │ emits 'update'
                         ┌────────────▼─────────────┐
                         │       Backend API         │
                         │  Express REST + Socket.IO │
                         │       (src/server.js)     │
                         └──────┬──────────────┬─────┘
                    Socket.IO   │              │  HTTP (REST)
                    (live push) │              │
                    ┌───────────▼───┐    ┌─────▼──────────┐
                    │  Web Dashboard │    │  Discord Bot   │
                    │ public/app.js  │    │  src/bot.js    │
                    │ live floor plan│    │ !status !room  │
                    │ + power + alerts│   │ !usage !alerts │
                    └───────────────┘    └────────────────┘
                              \                /
                               \              /
                              ┌──▼────────────▼──┐
                              │       User        │
                              └───────────────────┘
```

A single in-memory `OfficeStore` (an `EventEmitter`) owns all device state and runs the simulator. The Express server exposes that state over REST and pushes every change to browsers over Socket.IO. The Discord bot reads the **same backend over HTTP**, so a device change made by the simulator reaches the dashboard (via websocket) and the bot's next answer identically. A full-resolution version of this flow is in [`docs/system-diagram.svg`](docs/system-diagram.svg), and a deeper write-up is in [`docs/architecture.md`](docs/architecture.md).

### Key design decisions

- **In-memory store, not a database.** The brief explicitly allows an in-memory store with a simulator, and it keeps the demo one-command and dependency-light. The store is deliberately isolated in `src/store.js` so it could be swapped for a DB or real hardware feed without touching the server, dashboard, or bot.
- **Simulator lives inside the store.** A `tick()` loop mutates device states on a timer using office-hours-aware probabilities (rooms are much more likely to be active 9–5) and accumulates energy (`power × Δt`) into a running daily kWh total.
- **Alerts are derived, not stored.** `getAlerts()` computes anomalies on demand from current state, so they're always consistent with what the dashboard and bot show.

---

## 3. Technologies Used

| Layer | Technology |
| --- | --- |
| Language / runtime | **Node.js** (>= 18), vanilla JavaScript |
| Backend API | **Express** (REST) + **Socket.IO** (real-time push) |
| Discord bot | **discord.js** v14 |
| Frontend | Vanilla JS + Socket.IO client + hand-built inline **SVG** floor plan (no framework) |
| AI / LLM (optional) | OpenAI Chat Completions (`gpt-4o-mini` by default) as a response *humanizer*, with an offline template fallback |
| Testing | Node's built-in `node:test` runner |
| Dev tooling | `concurrently` (run server + bot together) |

No frontend framework and no database are used — this keeps the codebase small, readable, and trivially runnable by judges.

---

## 4. Setup & Installation

**Prerequisites:** Node.js 18 or newer.

```bash
# 1. install dependencies
npm install

# 2. create your env file from the template
cp .env.example .env
```

Open `.env` and fill in what you need. **The dashboard and simulator run with zero configuration** — every value has a sensible default. You only need to edit `.env` for the Discord bot (see below) or to tune the demo.

Key settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Backend HTTP + Socket.IO port |
| `SIM_INTERVAL_MS` | `3000` | How often the simulator mutates device state |
| `FAN_WATTS` / `LIGHT_WATTS` | `60` / `15` | Per-device power draw when on |
| `OFFICE_OPEN_HOUR` / `OFFICE_CLOSE_HOUR` | `9` / `17` | Office hours (24h clock) for alerts |
| `ROOM_ON_HOURS_THRESHOLD` | `2` | Hours a whole room can be on before it's flagged |
| `FORCE_AFTER_HOURS` | `false` | Force "after hours" so that alert always shows in a demo |
| `DISCORD_TOKEN` | *(empty)* | Bot token — only needed to run the bot |
| `DISCORD_ALERT_CHANNEL_ID` | *(empty)* | Channel for proactive alert posts (bonus feature) |
| `OPENAI_API_KEY` | *(empty)* | Optional — enables LLM-phrased bot replies |

---

## 5. How to Run

### Web dashboard + backend

```bash
npm start
```

Then open **http://localhost:3000**. The dashboard updates live — no page refresh — showing the floor plan (lights glow when on, fans spin when running), the total + per-room power meter, the active-alerts panel, and a per-room device list.

### Discord bot

1. Create an application + bot at <https://discord.com/developers/applications>, enable the **Message Content Intent**, and invite it to your server.
2. Put the bot token in `DISCORD_TOKEN` (and optionally a channel ID in `DISCORD_ALERT_CHANNEL_ID`).
3. With the backend already running, start the bot:

```bash
npm run bot
```

### Both together (recommended for the demo)

```bash
npm run dev
```

This launches the server and the bot side-by-side with colour-coded output.

### Tests

```bash
npm test
```

Runs 8 unit tests covering device counts, room composition, aliases, power math, both alert types, and energy accumulation.

### Demo tips

- To make the **after-hours alert** appear regardless of the real clock, set `FORCE_AFTER_HOURS=true`.
- To make the **"room on too long" alert** appear within seconds, set `ROOM_ON_HOURS_THRESHOLD` to a small value like `0.02` (~72 s), or use the demo control below to turn a whole room on.

---

## 6. API Endpoints

All endpoints are served by `src/server.js`. The bot uses these same endpoints, which is what guarantees both interfaces reflect one reality.

### REST

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check `{ ok, time }` |
| `GET` | `/api/state` | Full snapshot: devices, rooms, power, alerts |
| `GET` | `/api/devices` | All 15 devices with status/power/room/lastChanged |
| `GET` | `/api/rooms/:name` | One room (`work1`, `work2`, `drawing`, and aliases) |
| `GET` | `/api/power` | Total watts now + per-room breakdown + today's kWh |
| `GET` | `/api/alerts` | Current active alerts (timestamped) |
| `POST` | `/api/devices/:id/set` | Demo control — set one device on/off (`{ "on": true }`) |
| `POST` | `/api/rooms/:name/set` | Demo control — set a whole room on/off (`{ "on": true }`) |

### Real-time (Socket.IO)

On connection the server emits a `state` event with the full snapshot, and re-emits `state` to all clients every time the store changes. The dashboard listens for `state` and re-renders — this is what makes updates appear without a refresh.

---

## 7. Discord Bot Commands

The bot pulls **real answers from live simulated data** — nothing is hardcoded or random. Responses are phrased in a friendly, conversational tone (the boss hates robotic data dumps).

| Command | What it does |
| --- | --- |
| `!status` | Quick on/off summary for every room |
| `!room <name>` | One room in detail (e.g. `!room work1`) |
| `!usage` | Total watts right now + today's estimated kWh |
| `!alerts` | Anything anomalous right now |
| `!help` | Lists the commands |

**Bonus — proactive alerts:** if `DISCORD_ALERT_CHANNEL_ID` is set, the bot polls the backend and posts a message to that channel when an alert condition triggers (e.g. *"Hey! Work Room 2 still has 2 fans and 3 lights on and it's after hours — did someone forget to leave?"*), with de-duplication so it doesn't spam the same alert.

---

## 8. AI Integration Details

The Discord bot is required to give friendly, humanized answers, and the brief strongly encourages using an LLM for this. The AI here is a **response humanizer**, deliberately scoped so it never invents facts:

- **All numbers and states come from the backend.** The bot fetches real data from the REST API, then passes those facts to `humanize()` in `src/llm.js`. The LLM only *rewords* the given facts into a natural sentence.
- **Model:** OpenAI Chat Completions, `gpt-4o-mini` by default (configurable via `OPENAI_MODEL`). The system prompt explicitly forbids inventing or altering any values.
- **Graceful offline fallback.** If `OPENAI_API_KEY` is not set, the bot uses hand-written friendly templates (`statusTemplate`, `roomTemplate`, `usageTemplate`, `alertTemplate`) and runs **fully offline**. This means the whole project — including the bot — works with zero external API keys, which keeps the judge demo frictionless, while the LLM path is available when a key is provided.

This separation (facts from code, phrasing from the model) is intentional: it gives conversational, non-robotic replies without the risk of an LLM hallucinating a wattage or a device state.

---

## 9. Hardware / Electrical Concept

This is a **concept/simulation only** — no physical hardware is required for the demo — but the design is electrically sound and documented in [`hardware/`](hardware/):

- [`hardware/README.md`](hardware/README.md) — pin-mapping table, connection list, and electrical reasoning (opto-isolated state sensing + current sensing).
- [`hardware/room1-schematic.svg`](hardware/room1-schematic.svg) — a representative one-room circuit: an **ESP32** senses the on/off state of all 5 devices via **H11AA1 opto-isolators**, measures room current with an **ACS712** hall-effect sensor, and POSTs readings to the backend over WiFi.
- [`hardware/room_firmware.ino`](hardware/room_firmware.ino) — a matching ESP32 Arduino sketch (concept).

The principle is **sense, don't switch** — the microcontroller reads mains-driven device states through opto-isolation rather than switching mains directly, which keeps the low-voltage logic safely isolated. A real deployment would replicate this one-room circuit across all three rooms.

---

## 10. Project Structure

```
office-power-monitor/
├── src/
│   ├── store.js      # single source of truth: 15 devices, simulator, alerts
│   ├── server.js     # Express REST + Socket.IO backend
│   ├── bot.js        # discord.js bot (reads the shared backend over HTTP)
│   ├── llm.js        # optional LLM humanizer + offline templates
│   └── config.js     # env-driven configuration
├── public/
│   ├── index.html    # dashboard shell
│   ├── styles.css    # control-room theme
│   └── app.js        # Socket.IO client + live SVG floor plan
├── docs/
│   ├── system-diagram.svg   # high-level system diagram (not Mermaid, per brief)
│   └── architecture.md      # architecture deep-dive
├── hardware/
│   ├── README.md            # pin mapping + electrical reasoning
│   ├── room1-schematic.svg  # representative one-room circuit
│   └── room_firmware.ino    # ESP32 sketch (concept)
├── test/
│   └── store.test.js # 8 unit tests
├── .env.example
├── package.json
└── README.md
```

---

## 11. How It Maps to the Requirements

| Deliverable | Where |
| --- | --- |
| High-level system diagram (no Mermaid) | `docs/system-diagram.svg` + §2 above |
| Hardware/electrical schematic | `hardware/` (schematic, pin map, firmware) |
| Simulated device data (dynamic) | `src/store.js` — 15 devices, `tick()` loop |
| Web dashboard (live, no refresh) | `public/` — floor plan, power meter, alerts |
| Discord bot (shared backend) | `src/bot.js` — `!status` `!room` `!usage` `!alerts` |
| Live power meter + per-room breakdown | `GET /api/power`, dashboard power card |
| Active alerts (after-hours, room-on-too-long) | `store.getAlerts()`, alerts panel + bot |
| One shared backend / single source of truth | `src/store.js` singleton, read by both interfaces |
| Friendly / LLM responses | `src/llm.js` |
| Proactive alert posting (bonus) | `src/bot.js` alert polling |
| Visual floor plan with glowing lights + spinning fans (bonus) | `public/app.js` |

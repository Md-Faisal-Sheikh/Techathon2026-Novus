# Novus Office — Interactive Control Panel (React)

Top-view office dashboard: click fans to spin them (with realistic spin-up /
coast-down inertia), toggle lights, watch live power draw, and control devices
per room. Originally a React port of the single-file `../office-control-panel.html`,
it is now driven by the **shared backend** (`../src`): device state streams in
live over Socket.IO and every toggle is sent back as a REST command, so this
dashboard and the Discord bot always agree.

## Run (dev)

The dashboard needs the backend running. In two terminals:

```bash
# terminal 1 — backend API + simulator (from the repo root)
npm install
npm start                 # http://localhost:3000

# terminal 2 — this React dev server
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Then open the printed URL (default http://localhost:5173). The Vite dev server
proxies `/api` and `/socket.io` to the backend on :3000 (see `vite.config.js`),
so there's nothing else to configure. The header shows a **Live / Connecting /
Offline** badge for the backend connection.

To point at a backend on another host, set `VITE_BACKEND_URL` (e.g.
`VITE_BACKEND_URL=http://192.168.1.5:3000 npm run dev`) — the backend sends CORS
headers so a direct, non-proxied connection works too.

## Build

```bash
npm run build     # production bundle -> dist/
npm run preview   # serve the built bundle
```

## Structure

```
src/
  main.jsx              app entry
  App.jsx               layout + wiring: reads live state from the backend,
                        sends toggles back, derives metrics
  api.js                backend bridge — device-id mapping (frontend <-> backend)
                        + REST control calls
  styles.css            all styles
  constants.js          room geometry, wattages, fan speeds
  devices.js            builds the fan/light list (Fan 1–6, Light 1–9)
  util.js               keyboard-activation helper
  hooks/
    useBackend.js       Socket.IO connection: live snapshot -> on/off map +
                        connection status, and the setDevice/setRoom/setAll commands
    useFanSpin.js       single requestAnimationFrame loop; drives fan rotation
                        + motion-blur imperatively via refs (no re-render/frame)
  components/
    Header.jsx          title + connection badge + All Off
    KpiTiles.jsx        Fans / Lights / Devices / Power / Est. energy tiles
    Toolbar.jsx         bulk Fans/Lights on-off + fan-speed segmented control
    FloorPlan.jsx       the interactive SVG plan (rooms, walls, dimming)
    Fan.jsx             one ceiling fan (registers blade refs for the anim loop)
    Light.jsx           one light
    Furniture.jsx       desks, sofa, rug per room
    RoomCards.jsx       per-room status pips + toggles
```

### How the fan animation works in React

React never re-renders per frame. `useFanSpin` runs one `requestAnimationFrame`
loop that eases each fan's angular velocity toward a target (spin-up when on,
coast-down when off) and writes `transform="rotate(...)"` + motion-blur opacity
straight to the DOM nodes each fan registers. Toggling a device only re-renders
to update classes/labels; the loop reads the latest state from a ref.

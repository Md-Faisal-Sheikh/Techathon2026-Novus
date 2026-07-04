# Novus Office — Interactive Control Panel (React)

Top-view office dashboard: click fans to spin them (with realistic spin-up /
coast-down inertia), toggle lights, watch live power draw, and control devices
per room. This is the React port of the original single-file
`../office-control-panel.html`.

## Run (dev)

```bash
cd frontend
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

## Build

```bash
npm run build     # production bundle -> dist/
npm run preview   # serve the built bundle
```

## Structure

```
src/
  main.jsx              app entry
  App.jsx               state + layout (device on/off map, speed, derived metrics)
  styles.css            all styles
  constants.js          room geometry, wattages, fan speeds
  devices.js            builds the fan/light list (Fan 1–6, Light 1–9)
  util.js               keyboard-activation helper
  hooks/
    useFanSpin.js       single requestAnimationFrame loop; drives fan rotation
                        + motion-blur imperatively via refs (no re-render/frame)
  components/
    Header.jsx          title + All Off
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

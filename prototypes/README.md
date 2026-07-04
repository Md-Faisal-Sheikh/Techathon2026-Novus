# Prototypes

`office-control-panel.html` is an early static mockup used while exploring the
dashboard's look and feel. It holds its own local state and is **not** wired to
the backend (`src/server.js`) — it does not reflect live device data.

The real, backend-driven dashboards are:
- [`public/`](../public/) — vanilla JS + Socket.IO, served by the main backend (`npm start`).
- [`frontend/`](../frontend/) — React + Vite rebuild of the same live view (see its own README).
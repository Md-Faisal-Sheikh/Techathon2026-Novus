// Room geometry (SVG user units, viewBox 0 0 640 388) + shared constants.

export const ROOMS = [
  { id: 'draw', name: 'DRAWING ROOM', x0: 22,  x1: 236, y0: 22, y1: 372, kind: 'lounge', floor: '#eaddc2' },
  { id: 'w1',   name: 'WORK ROOM 1',  x0: 236, x1: 432, y0: 22, y1: 372, kind: 'work',   floor: '#ecdcbc' },
  { id: 'w2',   name: 'WORK ROOM 2',  x0: 432, x1: 618, y0: 22, y1: 372, kind: 'work',   floor: '#ece0c4' },
];

// Mirror the backend's ratings (FAN_WATTS / LIGHT_WATTS in src/config.js) so the
// per-device and per-room wattages shown here match the backend's live totals.
export const FAN_W = 60;   // watts per fan
export const LIGHT_W = 15; // watts per light

// Fan spin targets in degrees/second, per speed setting.
export const SPEEDS = { low: 95, med: 220, high: 440 };
export const SPEEDS_REDUCED = { low: 35, med: 70, high: 120 }; // prefers-reduced-motion

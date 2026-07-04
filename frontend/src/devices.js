import { ROOMS } from './constants';

// Build the static fan + light lists from ROOMS. Devices are numbered
// continuously across the whole office (Fan 1..6, Light 1..9). Only geometry +
// identity live here; on/off state is held separately in App.
export function createDevices() {
  const fans = [];
  const lights = [];
  ROOMS.forEach((r) => {
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    const px = (f) => r.x0 + f * w;
    const py = (f) => r.y0 + f * h;
    // 2 fans per room: top-centre + mid-centre
    fans.push({ id: `${r.id}-f1`, room: r.id, label: `Fan ${fans.length + 1}`, cx: px(0.5), cy: py(0.16) });
    fans.push({ id: `${r.id}-f2`, room: r.id, label: `Fan ${fans.length + 1}`, cx: px(0.5), cy: py(0.55) });
    // 3 lights per room: top-left, top-right, bottom-centre
    lights.push({ id: `${r.id}-l1`, room: r.id, label: `Light ${lights.length + 1}`, cx: px(0.24), cy: py(0.16) });
    lights.push({ id: `${r.id}-l2`, room: r.id, label: `Light ${lights.length + 1}`, cx: px(0.76), cy: py(0.16) });
    lights.push({ id: `${r.id}-l3`, room: r.id, label: `Light ${lights.length + 1}`, cx: px(0.5), cy: py(0.9) });
  });
  return { fans, lights };
}

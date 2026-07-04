import Furniture from './Furniture';
import Fan from './Fan';
import Light from './Light';

// The interactive top-view plan. Draw order per room: floor → furniture → dim
// overlay → label; then walls/windows; then devices on top so they stay bright.
export default function FloorPlan({ rooms, fans, lights, on, onToggle, register }) {
  return (
    <svg
      className="plan"
      viewBox="0 0 640 388"
      role="img"
      aria-label="Office floor plan — three rooms with fans and lights"
    >
      <defs>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#ffe89a" stopOpacity=".95" />
          <stop offset="42%" stopColor="#ffcf5a" stopOpacity=".45" />
          <stop offset="100%" stopColor="#ffcf5a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4c35" />
          <stop offset="1" stopColor="#48301f" />
        </linearGradient>
      </defs>

      {/* building shell (rooms only) */}
      <rect x="12" y="12" width="616" height="364" rx="6" fill="#cbb896" />
      <rect x="12" y="12" width="616" height="364" rx="6" fill="none" stroke="#35302b" strokeWidth="9" />

      {rooms.map((r) => {
        const cx = (r.x0 + r.x1) / 2;
        const roomLights = lights.filter((l) => l.room === r.id);
        const litFrac = roomLights.filter((l) => on[l.id]).length / roomLights.length;
        return (
          <g key={r.id}>
            <rect x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill={r.floor} />
            <Furniture room={r} />
            {/* darken the room as its lights go off */}
            <rect
              className="room-dim"
              x={r.x0}
              y={r.y0}
              width={r.x1 - r.x0}
              height={r.y1 - r.y0}
              fill="#0a0e17"
              opacity={(1 - litFrac) * 0.5}
            />
            <rect className="room-label-bg" x={cx - 58} y={r.y0 + 6} width="116" height="18" rx="9" />
            <text className="room-label" x={cx} y={r.y0 + 19}>
              {r.name}
            </text>
          </g>
        );
      })}

      {/* interior walls between rooms */}
      <line x1="236" y1="16" x2="236" y2="372" stroke="#35302b" strokeWidth="7" />
      <line x1="432" y1="16" x2="432" y2="372" stroke="#35302b" strokeWidth="7" />

      {/* windows on top wall */}
      <rect x="96" y="9" width="70" height="6" rx="1" fill="#9fd0e6" />
      <rect x="300" y="9" width="70" height="6" rx="1" fill="#9fd0e6" />
      <rect x="500" y="9" width="70" height="6" rx="1" fill="#9fd0e6" />

      {fans.map((f) => (
        <Fan key={f.id} fan={f} on={on[f.id]} onToggle={onToggle} register={register} />
      ))}
      {lights.map((l) => (
        <Light key={l.id} light={l} on={on[l.id]} onToggle={onToggle} />
      ))}
    </svg>
  );
}

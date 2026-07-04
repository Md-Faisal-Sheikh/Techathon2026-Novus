import { useRef, useEffect } from 'react';
import { activateOnKey } from '../util';

const BLADE = 'M0,-5 Q6,-8 5,-15 Q4,-25 0,-27 Q-3.5,-25 -4.5,-15 Q-5.5,-8 0,-5 Z';

export default function Fan({ fan, on, onToggle, register }) {
  const bladesRef = useRef(null);
  const blurRef = useRef(null);

  // Register/unregister this fan's animated nodes with the rAF loop.
  useEffect(() => {
    register(fan.id, bladesRef.current, blurRef.current);
    return () => register(fan.id, null, null);
  }, [fan.id, register]);

  const toggle = () => onToggle(fan.id);

  return (
    <g
      className={`fan ${on ? 'on' : ''}`}
      data-fan={fan.id}
      transform={`translate(${fan.cx},${fan.cy})`}
      tabIndex={0}
      role="button"
      aria-label={`${fan.label} (${on ? 'on' : 'off'})`}
      onClick={toggle}
      onKeyDown={(e) => activateOnKey(e, toggle)}
    >
      <circle className="fan-hit" r="27" fill="transparent" />
      <circle r="26" fill="#000" opacity=".05" />
      <circle ref={blurRef} className="fan-blur" r="25" />
      <circle r="8.5" fill="#5a3d2b" />
      {/* rotation is applied imperatively to this group by useFanSpin */}
      <g ref={bladesRef} className="blades">
        <path className="blade" d={BLADE} />
        <path className="blade" d={BLADE} transform="rotate(120)" />
        <path className="blade" d={BLADE} transform="rotate(240)" />
      </g>
      <circle className="fan-hub" r="5" />
      <circle r="1.8" fill="#7a5439" />
      <text className="dev-label" x="0" y="34">
        {fan.label}
      </text>
    </g>
  );
}

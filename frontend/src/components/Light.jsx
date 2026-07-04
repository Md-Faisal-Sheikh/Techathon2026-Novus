import { activateOnKey } from '../util';

export default function Light({ light, on, onToggle }) {
  const toggle = () => onToggle(light.id);

  return (
    <g
      className={`light ${on ? 'on' : ''}`}
      data-light={light.id}
      transform={`translate(${light.cx},${light.cy})`}
      tabIndex={0}
      role="button"
      aria-label={`${light.label} (${on ? 'on' : 'off'})`}
      onClick={toggle}
      onKeyDown={(e) => activateOnKey(e, toggle)}
    >
      <circle className="l-hit" r="16" fill="transparent" />
      <circle className="glow" r="20" fill="url(#glow)" />
      <circle className="bulb" r="7.5" />
      <text className="dev-label" x="0" y="17">
        {light.label}
      </text>
    </g>
  );
}

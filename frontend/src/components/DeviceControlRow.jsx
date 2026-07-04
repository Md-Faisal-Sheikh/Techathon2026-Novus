import { formatAgo } from '../util';

function FanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 12C12 8.5 9.8 5.5 7 5.5C5 5.5 4 7.3 5 9C6 10.8 9 11.8 12 12Z" fill="currentColor" />
      <path d="M12 12C15.5 12 18.5 9.8 18.5 7C18.5 5 16.7 4 15 5C13.2 6 12.2 9 12 12Z" fill="currentColor" />
      <path d="M12 12C12 15.5 14.2 18.5 17 18.5C19 18.5 20 16.7 19 15C18 13.2 15 12.2 12 12Z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12 3.5C9 3.5 6.5 6 6.5 9C6.5 11 7.5 12.5 9 13.7C9.6 14.2 10 15 10 15.8V16.5H14V15.8C14 15 14.4 14.2 15 13.7C16.5 12.5 17.5 11 17.5 9C17.5 6 15 3.5 12 3.5Z"
        fill="currentColor"
      />
      <path d="M10 18.5H14M10.6 20.5H13.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// One interactive device line: type icon, name, live wattage (— when off),
// and a single on/off pill. Icon color marks device TYPE (fan vs light) and
// never changes with state; the pill is the only accent-when-on element here.
export default function DeviceControlRow({ device, kind, isOn, watts, lastChanged, now, onSet }) {
  return (
    <div className="dc-row">
      <span className={`dc-icon dc-icon-${kind}`}>{kind === 'fan' ? <FanIcon /> : <LightIcon />}</span>
      <span className="dc-name">{device.label}</span>
      <span className="dc-watts">{isOn ? `${watts}W` : '—'}</span>
      <span className="dc-changed" title="Last changed">
        {formatAgo(lastChanged, now)}
      </span>
      <button
        type="button"
        className={`dc-pill${isOn ? ' on' : ''}`}
        aria-pressed={isOn}
        aria-label={`${device.label} — turn ${isOn ? 'off' : 'on'}`}
        onClick={() => onSet(!isOn)}
      >
        {isOn ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

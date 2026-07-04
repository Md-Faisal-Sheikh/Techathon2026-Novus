import { useNow } from '../hooks/useNow';

const SEVERITY_RANK = { critical: 0, warning: 1 };
const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning' };

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatHour(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

// Mirrors the backend's own after-hours check (src/store.js getAlerts) so the
// badge always agrees with whether the "after hours" alert rule is live.
function isAfterHours(now, officeHours) {
  if (!officeHours) return false;
  if (officeHours.forceAfterHours) return true;
  const hour = new Date(now).getHours();
  return hour < officeHours.open || hour >= officeHours.close;
}

// Anomalies the backend derives live from current device state (src/store.js
// getAlerts): devices left on after office hours, and rooms stuck fully-on
// past the threshold. Each alert is timestamped at detection time and this
// panel re-renders on every backend snapshot, so it's always current.
export default function AlertsPanel({ alerts, officeHours }) {
  const now = useNow(1000); // tick every second for a live clock
  const sorted = [...(alerts || [])].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );
  const afterHours = isAfterHours(now, officeHours);

  return (
    <div className="alerts-panel">
      <div className="alerts-clock">
        <span className="alerts-day">
          {new Date(now).toLocaleDateString([], { weekday: 'long' })},{' '}
          {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {officeHours && (
          <span className={`alerts-hours-badge${afterHours ? ' after-hours' : ''}`}>
            {afterHours ? 'After Hours' : `Office Open · ${formatHour(officeHours.open)}–${formatHour(officeHours.close)}`}
          </span>
        )}
      </div>

      <div className="alerts-head">
        <h2>Active Alerts</h2>
        <span className={`alerts-count${sorted.length ? ' has-alerts' : ''}`}>{sorted.length}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="alerts-empty">All clear — no active alerts.</div>
      ) : (
        <ul className="alerts-list">
          {sorted.map((a) => (
            <li className={`alert-item alert-${a.severity}`} key={a.id}>
              <span className="alert-badge">{SEVERITY_LABEL[a.severity] || a.severity}</span>
              <div className="alert-body">
                <div className="alert-message">{a.message}</div>
                <div className="alert-meta">
                  <span className="alert-room">{a.room}</span>
                  <span className="alert-time">{formatTime(a.timestamp)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

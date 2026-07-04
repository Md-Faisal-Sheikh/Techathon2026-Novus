// Always-visible power meter: office total + a per-room breakdown bar for each
// of the 3 rooms. All bars encode the same metric (watts), so per the color
// rule for nominal categories, every bar shares one hue (the app accent) —
// identity comes from the room-name label, not a distinct color per room.
export default function PowerMeter({ power, rooms }) {
  const totalWatts = power?.totalWatts ?? 0;
  const todayKwh = power?.todayKwh ?? 0;

  return (
    <div className="power-meter">
      <div className="pm-head">
        <h2>Power Consumption</h2>
        <div className="pm-total">
          {totalWatts}
          <small> W total</small>
        </div>
      </div>
      <div className="pm-today">Today: {todayKwh} kWh</div>

      <div className="pm-rooms">
        {(rooms || []).map((r) => {
          const watts = r.power ?? 0;
          const pct = totalWatts > 0 ? Math.round((watts / totalWatts) * 100) : 0;
          return (
            <div className="pm-room" key={r.key}>
              <div className="pm-room-head">
                <span className="pm-room-name">{r.name}</span>
                <span className="pm-room-watts">{watts} W</span>
              </div>
              <div
                className="pm-bar-track"
                role="meter"
                aria-label={`${r.name} power draw`}
                aria-valuenow={watts}
                aria-valuemin={0}
                aria-valuemax={totalWatts}
                title={`${r.name}: ${watts} W (${pct}% of office total)`}
              >
                <div className="pm-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Always-visible power meter: office total + a per-room breakdown bar for each
// of the 3 rooms. All bars encode the same metric (watts), so per the color
// rule for nominal categories, every bar shares one hue (the app accent) —
// identity comes from the room-name label, not a distinct color per room.
export default function PowerMeter({ power, rooms }) {
  const totalWatts = power?.totalWatts ?? 0;
  const todayKwh = power?.todayKwh ?? 0;
  const costPerHourBdt = power?.costPerHourBdt ?? 0;
  const todayCostBdt = power?.todayCostBdt ?? 0;
  const tariff = power?.tariffBdtPerKwh ?? 0;

  return (
    <div className="power-meter">
      <div className="pm-head">
        <h2>Power Consumption</h2>
        <div className="pm-total">
          {totalWatts}
          <small> W total</small>
        </div>
      </div>
      <div className="pm-cost">৳{costPerHourBdt.toFixed(2)} / hour</div>
      <div className="pm-today">
        Today: {todayKwh} kWh · ৳{todayCostBdt.toFixed(2)}
      </div>

      <div className="pm-rooms">
        {(rooms || []).map((r) => {
          const watts = r.power ?? 0;
          const pct = totalWatts > 0 ? Math.round((watts / totalWatts) * 100) : 0;
          const roomCostBdt = (watts / 1000) * tariff;
          return (
            <div className="pm-room" key={r.key}>
              <div className="pm-room-head">
                <span className="pm-room-name">{r.name}</span>
                <span className="pm-room-watts">
                  {watts} W · ৳{roomCostBdt.toFixed(2)}/hr
                </span>
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

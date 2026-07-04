function Tile({ cls, label, value, unit }) {
  return (
    <div className={cls ? `tile ${cls}` : 'tile'}>
      <div className="k">{label}</div>
      <div className="v">
        {value}
        <small>{unit}</small>
      </div>
    </div>
  );
}

export default function KpiTiles({ fansOn, totalFans, lightsOn, totalLights, power, costPerHourBdt }) {
  const devicesOn = fansOn + lightsOn;
  const totalDevices = totalFans + totalLights;
  const energy = ((power * 24) / 1000).toFixed(1); // projected kWh/day at current draw
  const cost = costPerHourBdt != null ? costPerHourBdt.toFixed(2) : '—';

  return (
    <div className="tiles">
      <Tile label="Fans On" value={fansOn} unit={`/${totalFans}`} />
      <Tile label="Lights On" value={lightsOn} unit={`/${totalLights}`} />
      <Tile label="Devices On" value={devicesOn} unit={`/${totalDevices}`} />
      <Tile cls="hero" label="Cost (Now)" value={`৳${cost}`} unit="/hr" />
      <Tile label="Power Draw" value={power} unit=" W" />
      <Tile label="Est. Use" value={energy} unit=" kWh/day" />
    </div>
  );
}

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

export default function KpiTiles({ fansOn, totalFans, lightsOn, totalLights, power }) {
  const devicesOn = fansOn + lightsOn;
  const totalDevices = totalFans + totalLights;
  const energy = ((power * 24) / 1000).toFixed(1); // projected kWh/day at current draw

  return (
    <div className="tiles">
      <Tile label="Fans On" value={fansOn} unit={`/${totalFans}`} />
      <Tile label="Lights On" value={lightsOn} unit={`/${totalLights}`} />
      <Tile label="Devices On" value={devicesOn} unit={`/${totalDevices}`} />
      <Tile cls="hero" label="Power Draw (Now)" value={power} unit=" W" />
      <Tile label="Est. Use" value={energy} unit=" kWh/day" />
    </div>
  );
}

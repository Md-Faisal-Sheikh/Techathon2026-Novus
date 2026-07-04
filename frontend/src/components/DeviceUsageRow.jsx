// One device's read-only usage line: dot lights up when on, wattage shown
// (0 W when off). Shared by the Usage popup and Room Cards' usage mode.
export default function DeviceUsageRow({ device, isOn, watts }) {
  return (
    <div className="up-device">
      <span className={`up-dot${isOn ? ' on' : ''}`} />
      <span className="up-name">{device.label}</span>
      <span className="up-watts">{isOn ? watts : 0} W</span>
    </div>
  );
}

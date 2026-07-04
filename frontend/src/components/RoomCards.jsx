import DeviceControlRow from './DeviceControlRow';
import DeviceUsageRow from './DeviceUsageRow';
import { FAN_W, LIGHT_W } from '../constants';

export default function RoomCards({ rooms, fans, lights, on, onSetDevice, usageMode, onShowUsage }) {
  if (usageMode) {
    return (
      <>
        <div className="usage-section-head">
          <h2>Current Usage</h2>
          <button onClick={onShowUsage}>Detailed Usage</button>
        </div>
        <div className="cards">
          {rooms.map((r) => {
            const roomFans = fans.filter((f) => f.room === r.id);
            const roomLights = lights.filter((l) => l.room === r.id);
            const total =
              roomFans.filter((f) => on[f.id]).length * FAN_W +
              roomLights.filter((l) => on[l.id]).length * LIGHT_W;
            return (
              <div className="room-card" key={r.id}>
                <div className="rc-usage-head">
                  <h3>{r.name}</h3>
                  <span className="rc-usage-watts">{total} W</span>
                </div>
                <div className="usage-devices">
                  {roomFans.map((f) => (
                    <DeviceUsageRow key={f.id} device={f} isOn={on[f.id]} watts={FAN_W} />
                  ))}
                  {roomLights.map((l) => (
                    <DeviceUsageRow key={l.id} device={l} isOn={on[l.id]} watts={LIGHT_W} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // Default view: every device's icon, name, live wattage, and an on/off pill,
  // always together — no mode needed to see usage alongside control.
  const totalOn = fans.filter((f) => on[f.id]).length + lights.filter((l) => on[l.id]).length;
  const totalDevices = fans.length + lights.length;

  return (
    <div className="devices-panel">
      <div className="devices-head">
        <h2>Devices</h2>
        <span className="devices-count">
          {totalOn} / {totalDevices} ON
        </span>
      </div>
      <div className="devices-rooms">
        {rooms.map((r) => {
          const roomFans = fans.filter((f) => f.room === r.id);
          const roomLights = lights.filter((l) => l.room === r.id);
          const roomOn = roomFans.filter((f) => on[f.id]).length + roomLights.filter((l) => on[l.id]).length;
          const roomTotal = roomFans.length + roomLights.length;
          const watts =
            roomFans.filter((f) => on[f.id]).length * FAN_W + roomLights.filter((l) => on[l.id]).length * LIGHT_W;
          return (
            <div className="device-room" key={r.id}>
              <div className="device-room-name">{r.name}</div>
              <div className="device-room-sub">
                {watts} W · {roomOn}/{roomTotal} on
              </div>
              <div className="device-room-list">
                {roomFans.map((f) => (
                  <DeviceControlRow
                    key={f.id}
                    device={f}
                    kind="fan"
                    isOn={on[f.id]}
                    watts={FAN_W}
                    onSet={(v) => onSetDevice(f.id, v)}
                  />
                ))}
                {roomLights.map((l) => (
                  <DeviceControlRow
                    key={l.id}
                    device={l}
                    kind="light"
                    isOn={on[l.id]}
                    watts={LIGHT_W}
                    onSet={(v) => onSetDevice(l.id, v)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

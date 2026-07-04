import { useEffect } from 'react';
import { FAN_W, LIGHT_W } from '../constants';
import DeviceUsageRow from './DeviceUsageRow';

// Floating power-usage breakdown: office total -> per-room total -> per-device
// wattage. Reads the same `on` state as everything else, so it's always live.
export default function UsagePanel({ rooms, fans, lights, on, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const roomsData = rooms.map((room) => {
    const roomFans = fans.filter((f) => f.room === room.id);
    const roomLights = lights.filter((l) => l.room === room.id);
    const total = roomFans.filter((f) => on[f.id]).length * FAN_W + roomLights.filter((l) => on[l.id]).length * LIGHT_W;
    return { room, roomFans, roomLights, total };
  });
  const grandTotal = roomsData.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="usage-backdrop" onClick={onClose}>
      <div
        className="usage-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Power usage breakdown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="usage-head">
          <div>
            <div className="usage-title">Power Usage</div>
            <div className="usage-total">
              {grandTotal}
              <small> W total</small>
            </div>
          </div>
          <button className="usage-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="usage-rooms">
          {roomsData.map(({ room, roomFans, roomLights, total }) => (
            <div className="usage-room" key={room.id}>
              <div className="usage-room-head">
                <span>{room.name}</span>
                <span className="usage-room-watts">{total} W</span>
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
          ))}
        </div>
      </div>
    </div>
  );
}

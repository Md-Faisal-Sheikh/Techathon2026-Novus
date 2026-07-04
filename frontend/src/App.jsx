import { useMemo, useState, useCallback } from 'react';
import { ROOMS, FAN_W, LIGHT_W } from './constants';
import { createDevices } from './devices';
import { useFanSpin } from './hooks/useFanSpin';
import { useBackend } from './hooks/useBackend';
import Header from './components/Header';
import KpiTiles from './components/KpiTiles';
import FloorPlan from './components/FloorPlan';
import RoomCards from './components/RoomCards';
import UsagePanel from './components/UsagePanel';
import PowerMeter from './components/PowerMeter';
import AlertsPanel from './components/AlertsPanel';


const warn = (e) => console.warn('[backend] command failed: ', e);



export default function App() {
  const { fans, lights } = useMemo(createDevices, []);

  // Live on/off + power now come from the shared backend (Socket.IO). The store
  // there is the single source of truth; this app renders it and sends commands
  // back over REST — it no longer keeps its own device state.
  const { on, lastChanged, snapshot, connected, ready, setDevice, setAll } = useBackend();

  const [speed] = useState('med'); // fixed at medium while the speed control is hidden
  const [showUsage, setShowUsage] = useState(false);
  const [usageMode, setUsageMode] = useState(false); // true -> room cards show read-only wattage instead of ON/OFF controls

  const toggle = useCallback((id) => setDevice(id, !on[id]).catch(warn), [on, setDevice]);
  const setDeviceSafe = useCallback((id, value) => setDevice(id, value).catch(warn), [setDevice]);
  const onAllOff = useCallback(() => setAll(false).catch(warn), [setAll]);

  const register = useFanSpin(on, speed);

  // Derived metrics. Counts come from the live on-map; the headline power draw
  // is the backend's own total when available so both interfaces agree exactly.
  const fansOn = fans.filter((f) => on[f.id]).length;
  const lightsOn = lights.filter((l) => on[l.id]).length;
  const power = snapshot?.power?.totalWatts ?? fansOn * FAN_W + lightsOn * LIGHT_W;

  return (
    <div className="wrap">
      <Header
        connected={connected}
        ready={ready}
        usageMode={usageMode}
        onToggleUsageMode={() => setUsageMode((v) => !v)}
        onAllOff={onAllOff}
      />

      <KpiTiles
        fansOn={fansOn}
        totalFans={fans.length}
        lightsOn={lightsOn}
        totalLights={lights.length}
        power={power}
      />

      <AlertsPanel alerts={snapshot?.alerts} officeHours={snapshot?.officeHours} />

      <div className="plan-hero">
        <FloorPlan
          rooms={ROOMS}
          fans={fans}
          lights={lights}
          on={on}
          onToggle={toggle}
          register={register}
        />
      </div>

      {usageMode && <PowerMeter power={snapshot?.power} rooms={snapshot?.rooms} />}

      <RoomCards
        rooms={ROOMS}
        fans={fans}
        lights={lights}
        on={on}
        lastChanged={lastChanged}
        onSetDevice={setDeviceSafe}
        usageMode={usageMode}
        onShowUsage={() => setShowUsage(true)}
      />

      <p className="hint">
        💡 Everything is clickable on the plan. Keyboard: <b>Tab</b> to a device,{' '}
        <b>Enter/Space</b> to toggle.
      </p>

      {showUsage && (
        <UsagePanel
          rooms={ROOMS}
          fans={fans}
          lights={lights}
          on={on}
          onClose={() => setShowUsage(false)}
        />
      )}
    </div>
  );
}

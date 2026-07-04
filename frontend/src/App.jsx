import { useMemo, useState, useCallback } from 'react';
import { ROOMS, FAN_W, LIGHT_W } from './constants';
import { createDevices } from './devices';
import { useFanSpin } from './hooks/useFanSpin';
import Header from './components/Header';
import KpiTiles from './components/KpiTiles';
import FloorPlan from './components/FloorPlan';
import RoomCards from './components/RoomCards';
import UsagePanel from './components/UsagePanel';

export default function App() {
  const { fans, lights } = useMemo(createDevices, []);
  const allIds = useMemo(() => [...fans, ...lights].map((d) => d.id), [fans, lights]);

  // Single source of truth for on/off: { [deviceId]: boolean }. Everything is on to start.
  const [on, setOn] = useState(() => Object.fromEntries(allIds.map((id) => [id, true])));
  const [speed] = useState('med'); // fixed at medium while the speed control is hidden
  const [showUsage, setShowUsage] = useState(false);
  const [usageMode, setUsageMode] = useState(false); // true -> room cards show read-only wattage instead of ON/OFF controls

  const setMany = useCallback(
    (ids, value) =>
      setOn((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = value;
        });
        return next;
      }),
    []
  );
  const toggle = useCallback((id) => setOn((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const setDevice = useCallback((id, value) => setOn((prev) => ({ ...prev, [id]: value })), []);

  const setAll = (v) => setMany(allIds, v);

  const register = useFanSpin(on, speed);

  // Derived metrics
  const fansOn = fans.filter((f) => on[f.id]).length;
  const lightsOn = lights.filter((l) => on[l.id]).length;
  const power = fansOn * FAN_W + lightsOn * LIGHT_W;

  return (
    <div className="wrap">
      <Header
        usageMode={usageMode}
        onToggleUsageMode={() => setUsageMode((v) => !v)}
        onShowUsage={() => setShowUsage(true)}
        onAllOff={() => setAll(false)}
      />

      <KpiTiles
        fansOn={fansOn}
        totalFans={fans.length}
        lightsOn={lightsOn}
        totalLights={lights.length}
        power={power}
      />

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

      <RoomCards
        rooms={ROOMS}
        fans={fans}
        lights={lights}
        on={on}
        onSetDevice={setDevice}
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

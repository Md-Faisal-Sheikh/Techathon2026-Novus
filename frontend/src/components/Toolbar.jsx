const SPEED_LABELS = { low: 'Low', med: 'Med', high: 'High' };

export default function Toolbar({ speed, setSpeed, setAllFans, setAllLights }) {
  return (
    <div className="toolbar">
      <div className="grp">
        <b>Fans</b>
        <button onClick={() => setAllFans(true)}>On</button>
        <button onClick={() => setAllFans(false)}>Off</button>
      </div>
      <div className="grp">
        <b>Lights</b>
        <button onClick={() => setAllLights(true)}>On</button>
        <button onClick={() => setAllLights(false)}>Off</button>
      </div>
      <div className="grp">
        <b>Fan&nbsp;speed</b>
        <div className="seg">
          {['low', 'med', 'high'].map((s) => (
            <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

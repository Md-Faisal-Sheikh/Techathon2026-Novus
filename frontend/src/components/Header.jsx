export default function Header({ usageMode, onToggleUsageMode, onShowUsage, onAllOff }) {
  return (
    <header>
      <div className="title">
        <h1>Novus Office</h1>
        <p>Click any fan to spin it, any light to toggle it</p>
      </div>
      <div className="header-mid">
        <button
          className={`mode-btn${usageMode ? ' active' : ''}`}
          aria-pressed={usageMode}
          onClick={onToggleUsageMode}
        >
          Usage Mode
        </button>
      </div>
      <div className="row" style={{ margin: 0 }}>
        <button onClick={onShowUsage}>Usage</button>
        <button onClick={onAllOff}>All Off</button>
      </div>
    </header>
  );
}

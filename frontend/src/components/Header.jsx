function ConnStatus({ connected, ready }) {
  const state = connected ? (ready ? 'live' : 'connecting') : 'offline';
  const label = { live: 'Live', connecting: 'Connecting…', offline: 'Offline' }[state];
  return (
    <span className={`conn conn-${state}`} title={`Backend: ${label}`}>
      <span className="conn-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function Header({ connected, ready, usageMode, onToggleUsageMode, onShowUsage, onAllOff }) {
  return (
    <header>
      <div className="title">
        <h1>Novus Office</h1>
        <p>Click any fan to spin it, any light to toggle it</p>
      </div>
      <div className="header-mid">
        <ConnStatus connected={connected} ready={ready} />
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

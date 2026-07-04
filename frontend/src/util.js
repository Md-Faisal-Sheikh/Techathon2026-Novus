// Fire an activation callback for keyboard users (Enter / Space) on a
// role="button" element.
export function activateOnKey(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

// Compact "time since" label for a lastChanged epoch-ms timestamp, e.g. for a
// device's on/off history. `now` is passed in (rather than read live) so many
// labels can refresh off one shared ticking clock — see hooks/useNow.js.
export function formatAgo(epochMs, now) {
  if (!epochMs) return '—';
  const diffSec = Math.round(Math.max(0, now - epochMs) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

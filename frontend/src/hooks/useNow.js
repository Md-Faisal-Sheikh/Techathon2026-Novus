import { useEffect, useState } from 'react';

// A shared "now" that ticks every intervalMs, so many components can render
// freshening relative-time labels ("2m ago") off one timer instead of each
// running its own.
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

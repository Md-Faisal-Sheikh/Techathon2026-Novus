import { useRef, useEffect, useCallback } from 'react';
import { SPEEDS, SPEEDS_REDUCED } from '../constants';

/**
 * Drives every ceiling fan from a single requestAnimationFrame loop.
 *
 * Fans register their `<g class="blades">` and `<circle class="fan-blur">` DOM
 * nodes via the returned `register(id, blades, blur)` callback. The loop eases
 * each fan's angular velocity toward a target (spin-up when on, coast-down when
 * off) and writes the rotation + motion-blur opacity straight to the DOM — so
 * React never re-renders on a per-frame basis. The loop reads the latest on/off
 * map and speed from a ref, and self-stops once everything is at rest.
 *
 * @param {Object} on     map of deviceId -> boolean (only fan ids are used here)
 * @param {string} speed  'low' | 'med' | 'high'
 * @returns {(id:string, blades:Element|null, blur:Element|null) => void}
 */
export function useFanSpin(on, speed) {
  const nodes = useRef(new Map());          // id -> { blades, blur }
  const anim = useRef(new Map());           // id -> { angle, vel }  (persists across renders)
  const raf = useRef(null);
  const lastT = useRef(0);
  const latest = useRef({ on, speed });     // freshest state for the loop
  const speeds = useRef(SPEEDS);

  const register = useCallback((id, blades, blur) => {
    if (blades) {
      nodes.current.set(id, { blades, blur });
      if (!anim.current.has(id)) anim.current.set(id, { angle: Math.random() * 360, vel: 0 });
    } else {
      nodes.current.delete(id); // keep anim state so a re-mounted fan resumes its angle
    }
  }, []);

  const tick = useCallback((now) => {
    const dt = Math.min(0.05, (now - lastT.current) / 1000); // clamp (e.g. after a tab switch)
    lastT.current = now;
    const { on: onMap, speed: spd } = latest.current;
    const SP = speeds.current;
    let active = false;
    nodes.current.forEach(({ blades, blur }, id) => {
      const a = anim.current.get(id);
      if (!a) return;
      const target = onMap[id] ? SP[spd] : 0;
      a.vel += (target - a.vel) * Math.min(1, dt * 3.5); // inertia: smooth spin-up / coast-down
      if (target === 0 && Math.abs(a.vel) < 1.2) a.vel = 0; // settle to a full stop
      if (a.vel) {
        a.angle = (a.angle + a.vel * dt) % 360;
        blades.setAttribute('transform', `rotate(${a.angle.toFixed(2)})`);
      }
      const ratio = Math.min(1, Math.abs(a.vel) / SP.high); // 0..1 -> motion blur
      if (blur) blur.style.opacity = (ratio * 0.5).toFixed(3);
      blades.style.opacity = (1 - ratio * 0.5).toFixed(3);
      if (a.vel !== 0 || target !== 0) active = true;
    });
    raf.current = active ? requestAnimationFrame(tick) : null;
  }, []);

  const ensure = useCallback(() => {
    if (raf.current === null) {
      lastT.current = performance.now();
      raf.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // Honour prefers-reduced-motion once.
  useEffect(() => {
    speeds.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? SPEEDS_REDUCED
      : SPEEDS;
  }, []);

  // Keep the loop's view of state fresh, and (re)start it whenever things change.
  useEffect(() => {
    latest.current = { on, speed };
    ensure();
  }, [on, speed, ensure]);

  // Stop the loop on unmount.
  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    },
    []
  );

  return register;
}

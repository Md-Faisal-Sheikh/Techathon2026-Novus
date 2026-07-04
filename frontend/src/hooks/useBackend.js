import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL, snapshotToMaps, setDeviceById, setRoom, setAll } from '../api';

/**
 * Connects to the shared backend over Socket.IO and exposes its live state plus
 * the controls to change it. The backend (src/store.js) is the single source of
 * truth; it emits a full `state` snapshot on connect and on every simulator tick
 * / manual override, so this hook is the app's live feed and its command channel.
 *
 * @returns {{
 *   on: Object,            // { [frontendDeviceId]: boolean } — drives the whole UI
 *   lastChanged: Object,   // { [frontendDeviceId]: epochMs } — when status last flipped
 *   snapshot: Object|null, // raw backend snapshot (power, alerts, rooms, ...)
 *   connected: boolean,    // is the websocket currently up?
 *   ready: boolean,        // received at least one snapshot?
 *   setDevice: (feId:string, on:boolean) => Promise,
 *   setRoom:   (feRoomId:string, on:boolean) => Promise,
 *   setAll:    (on:boolean) => Promise,
 * }}
 */
export function useBackend() {
  const [snapshot, setSnapshot] = useState(null);
  const [connected, setConnected] = useState(false);
  const idsRef = useRef({}); // freshest { feId: backendId } for addressing commands

  useEffect(() => {
    // No URL => same origin (Vite proxies /socket.io to the backend in dev).
    const socket = BACKEND_URL ? io(BACKEND_URL) : io();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (snap) => setSnapshot(snap));
    return () => socket.close();
  }, []);

  const { on, ids, lastChanged } = useMemo(
    () => (snapshot ? snapshotToMaps(snapshot) : { on: {}, ids: {}, lastChanged: {} }),
    [snapshot]
  );
  idsRef.current = ids;

  // Translate a frontend device id to the backend id the store reported for it,
  // then hit the REST control endpoint. The backend echoes the change back over
  // the socket, so state stays authoritative — we never guess it locally.
  const setDevice = useCallback((feId, value) => {
    const backendId = idsRef.current[feId];
    if (!backendId) return Promise.reject(new Error(`No backend id for ${feId}`));
    return setDeviceById(backendId, value);
  }, []);

  return { on, lastChanged, snapshot, connected, ready: snapshot !== null, setDevice, setRoom, setAll };
}

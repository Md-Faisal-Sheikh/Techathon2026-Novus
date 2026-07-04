// api.js — the bridge between this React frontend and the shared backend.
//
// The backend (src/server.js) is the single source of truth: it streams a full
// `state` snapshot over Socket.IO and accepts device/room commands over REST.
// This module translates between the two device vocabularies and wraps the REST
// control endpoints.
//
// Frontend IDs (see devices.js):   draw-f1, w1-l3, w2-f2, ...
// Backend  device objects carry:   { id, roomKey:'work1', type:'light',
//                                     name:'Light 1', status, ... }
//
// We key the mapping off roomKey + type + the number in `name` ("Light 1" -> 1),
// which is exactly how this frontend numbers its devices. We deliberately do NOT
// parse the backend's raw `id` (its light ids are light-3..5, numbered by slot
// in the room), so the two stay aligned however the backend mints ids.

// Where the backend lives. Empty string => same origin, which in dev is proxied
// to the backend by Vite (see vite.config.js). Set VITE_BACKEND_URL to reach a
// backend on another host/port directly (the backend sends CORS headers).
export const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || '';

const ROOM_BE_TO_FE = { drawing: 'draw', work1: 'w1', work2: 'w2' };
const ROOM_FE_TO_BE = { draw: 'drawing', w1: 'work1', w2: 'work2' };

/** Backend device object -> this frontend's device id (e.g. -> 'w1-l1'). */
export function beDeviceToFeId(dev) {
  const feRoom = ROOM_BE_TO_FE[dev.roomKey];
  const n = parseInt(String(dev.name).replace(/\D/g, ''), 10); // "Light 2" -> 2
  if (!feRoom || !n) return null;
  return `${feRoom}-${dev.type === 'fan' ? 'f' : 'l'}${n}`;
}

/** Frontend room id ('draw'/'w1'/'w2') -> backend room key. */
export function feToBeRoomKey(feRoomId) {
  return ROOM_FE_TO_BE[feRoomId] || null;
}

/** All frontend room ids, for bulk operations. */
export const FE_ROOM_IDS = Object.keys(ROOM_FE_TO_BE);

/**
 * Fold a backend snapshot into the two maps the app needs: the { feId: boolean }
 * on/off map that drives every component, and a { feId: backendId } lookup used
 * to address the REST control endpoints.
 */
export function snapshotToMaps(snapshot) {
  const on = {};
  const ids = {};
  for (const room of snapshot.rooms || []) {
    for (const dev of room.devices || []) {
      const feId = beDeviceToFeId(dev);
      if (!feId) continue;
      on[feId] = !!dev.status;
      ids[feId] = dev.id;
    }
  }
  return { on, ids };
}

// ---- REST controls ---------------------------------------------------------

async function post(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/** Set one device on/off by its backend id. */
export function setDeviceById(backendId, on) {
  return post(`/api/devices/${backendId}/set`, { on: !!on });
}

/** Set a whole room on/off. Accepts a frontend room id. */
export function setRoom(feRoomId, on) {
  const key = feToBeRoomKey(feRoomId);
  if (!key) return Promise.reject(new Error(`Unknown room id: ${feRoomId}`));
  return post(`/api/rooms/${key}/set`, { on: !!on });
}

/** Turn every device in the office on/off (the "All Off" button). */
export function setAll(on) {
  return Promise.all(FE_ROOM_IDS.map((feRoomId) => setRoom(feRoomId, on)));
}

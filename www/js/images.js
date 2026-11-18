// Images for notebook pages. Kept as files in the app's private storage on the
// phone (Capacitor Filesystem, DATA directory), not inside the saved state,
// so the app stays fast and storage limits aren't hit. In a browser they live
// in IndexedDB. Large images are resized before saving.
const FS = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Filesystem : null);
const DIR = 'notebook';
const MAX = 2000;        // longest side, px
const QUALITY = 0.85;

export const newId = () => (crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));

// ---------- browser storage (IndexedDB) ----------
let dbp = null;
function db() {
  dbp ||= new Promise((resolve, reject) => {
    const r = indexedDB.open('lamp-images', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('img', mode);
    const req = fn(tx.objectStore('img'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- resize ----------
async function decode(blob) {
  if (window.createImageBitmap) { try { return await createImageBitmap(blob); } catch {} }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
async function shrink(blob) {
  const src = await decode(blob);
  const w0 = src.width, h0 = src.height;
  const k = Math.min(1, MAX / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // transparent PNGs get a white page, not black
  ctx.drawImage(src, 0, 0, w, h);
  const data = c.toDataURL('image/jpeg', QUALITY);
  return { b64: data.slice(data.indexOf(',') + 1), w, h };
}

const path = (id) => `${DIR}/${id}.jpg`;
const urls = new Map();

// Saves an image (File/Blob); returns { id, w, h }
export async function add(blob) {
  const { b64, w, h } = await shrink(blob);
  const id = newId();
  await put(id, b64);
  return { id, w, h };
}

async function put(id, b64) {
  const fs = FS();
  if (fs) await fs.writeFile({ path: path(id), data: b64, directory: 'DATA', recursive: true });
  else await idb('readwrite', (s) => s.put(b64, id));
  urls.delete(id);
}

// A URL an <img> can show
export async function url(id) {
  if (urls.has(id)) return urls.get(id);
  let u = '';
  const fs = FS();
  try {
    if (fs) {
      const { uri } = await fs.getUri({ path: path(id), directory: 'DATA' });
      u = window.Capacitor.convertFileSrc(uri);
    } else {
      const b64 = await idb('readonly', (s) => s.get(id));
      if (b64) u = `data:image/jpeg;base64,${b64}`;
    }
  } catch {}
  if (u) urls.set(id, u);
  return u;
}

// The image as base64 (backups)
export async function read(id) {
  const fs = FS();
  try {
    if (fs) return (await fs.readFile({ path: path(id), directory: 'DATA' })).data || '';
    return (await idb('readonly', (s) => s.get(id))) || '';
  } catch { return ''; }
}

export async function remove(id) {
  urls.delete(id);
  const fs = FS();
  try {
    if (fs) await fs.deleteFile({ path: path(id), directory: 'DATA' });
    else await idb('readwrite', (s) => s.delete(id));
  } catch {}
}

// A copy in the cache folder that the share sheet can hand to other apps
export async function shareable(id, name) {
  const fs = FS();
  if (!fs) return null;
  const data = await read(id);
  if (!data) return null;
  const { uri } = await fs.writeFile({ path: `${name || id}.jpg`, data, directory: 'CACHE' });
  return uri;
}

// Restoring a backup: write its images back
export async function restoreAll(map) {
  for (const [id, b64] of Object.entries(map || {})) {
    if (typeof b64 === 'string' && b64.length > 100) { try { await put(id, b64); } catch {} }
  }
}

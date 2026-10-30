// Back up and restore everything as a .json file.
// On the phone the file goes to the share sheet (Google Drive, Gmail, Messenger,
// Files…); in a browser it downloads. API keys are left out of the file.
import { state, save, replaceAll } from './store.js';
import { today } from './plan.js';

const SECRET = ['nltKey', 'esvKey'];
const native = () => !!window.Capacitor?.isNativePlatform?.();

export const fileName = () => `lamp-backup-${today()}.json`;

export function backupJSON() {
  const data = JSON.parse(JSON.stringify(state));
  for (const k of SECRET) delete data[k];
  delete data.lastBackup;
  return JSON.stringify({ app: 'lamp', kind: 'backup', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

// Returns true when the backup was handed off (not cancelled)
export async function exportBackup() {
  const json = backupJSON();
  if (native()) {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    const { uri } = await Filesystem.writeFile({ path: fileName(), data: json, directory: 'CACHE', encoding: 'utf8' });
    try {
      await Share.share({ title: 'Lamp backup', text: `My Lamp backup (${today()})`, files: [uri], dialogTitle: 'Save your Lamp backup' });
    } catch (e) {
      if (/cancel/i.test(e?.message || '')) return false;
      throw e;
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  state.lastBackup = new Date().toISOString(); save();
  return true;
}

// Lets the user pick a file; resolves with its text (or null if nothing picked)
export function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const f = input.files?.[0]; input.remove();
      resolve(f ? await f.text() : null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

// Accepts a Lamp backup file, a raw saved state, or an old backup code
export function parseBackup(text) {
  let obj = null;
  const t = (text || '').trim();
  try { obj = JSON.parse(t); } catch {
    try { obj = JSON.parse(decodeURIComponent(escape(atob(t)))); } catch {}
  }
  if (!obj || typeof obj !== 'object') throw new Error('not json');
  const data = obj.app === 'lamp' && obj.data ? obj.data : obj;
  if (!data.done || typeof data.done !== 'object' || !data.startDate) throw new Error('not a lamp backup');
  return { data, exportedAt: obj.exportedAt || null };
}

export function summarize(data) {
  const doneCount = ['ot', 'nt', 'ps'].reduce((n, k) => n + Object.keys(data.done?.[k] || {}).length, 0);
  return {
    name: data.name || '',
    startDate: data.startDate,
    fullDays: Object.values(data.log || {}).filter((n) => n >= 4).length,
    readings: doneCount + Object.keys(data.done?.pr || {}).length,
    highlights: Object.keys(data.highlights || {}).length,
    notes: (data.notes || []).length,
    reactions: Object.keys(data.reactions || {}).length,
    prayers: (data.prayers || []).length,
  };
}

export function restore(data) {
  const keep = Object.fromEntries(SECRET.map((k) => [k, state[k]]));
  replaceAll({ ...data, ...keep, onboarded: true });
}

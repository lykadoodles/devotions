// Persistent state. Uses Capacitor Preferences on the phone (survives WebView
// storage clears) and localStorage in a plain browser.
import { today, addDays, diffDays } from './plan.js';

const KEY = 'lamp.state.v1';
const prefs = () => window.Capacitor?.Plugins?.Preferences;

const DEFAULTS = () => ({
  v: 1,
  onboarded: false,
  name: '',
  startDate: today(),
  translation: 'NLT',
  nltKey: '',
  theme: 'system',
  fontScale: 1,
  readFont: 'serif',
  music: { on: false, vol: 0.6 },
  prayed: {},
  reminder: { on: false, time: '06:00' },
  // done[track][key] = date it was marked read
  done: { ot: {}, nt: {}, ps: {}, pr: {} },
  // log[date] = number of portions marked read that day
  log: {},
  badges: {},
  earlyReads: 0,
});

export const state = DEFAULTS();

export async function load() {
  let raw = null;
  try { const p = prefs(); if (p) raw = (await p.get({ key: KEY }))?.value; } catch {}
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch {} }
  if (raw) {
    try {
      const s = JSON.parse(raw);
      const d = DEFAULTS();
      Object.assign(state, d, s, {
        done: { ...d.done, ...(s.done || {}) },
        reminder: { ...d.reminder, ...(s.reminder || {}) },
      });
    } catch {}
  }
}

export function save() {
  const s = JSON.stringify(state);
  try { localStorage.setItem(KEY, s); } catch {}
  try { prefs()?.set({ key: KEY, value: s }); } catch {}
}

export function reset(keepSettings = true) {
  const keep = keepSettings
    ? { name: state.name, translation: state.translation, nltKey: state.nltKey, theme: state.theme,
        fontScale: state.fontScale, readFont: state.readFont, music: state.music, reminder: state.reminder, onboarded: state.onboarded }
    : {};
  Object.assign(state, DEFAULTS(), keep);
  save();
}

export const isDone = (track, key) => !!state.done[track]?.[key];

export function setDone(track, key, on) {
  const t = today();
  const was = state.done[track][key];
  if (on && !was) {
    state.done[track][key] = t;
    state.log[t] = (state.log[t] || 0) + 1;
    if (new Date().getHours() < 7) state.earlyReads++;
  } else if (!on && was) {
    delete state.done[track][key];
    if (state.log[was]) state.log[was]--;
    if (!state.log[was]) delete state.log[was];
  }
  save();
}

// A day is "lit" when four portions were read on it.
export const LIT = 4;
export const isLit = (date) => (state.log[date] || 0) >= LIT;

export function streak() {
  let d = today();
  if (!isLit(d)) d = addDays(d, -1); // today still in progress
  let n = 0;
  while (isLit(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function longestStreak() {
  const days = Object.keys(state.log).filter(isLit).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// Persistent state. Uses Capacitor Preferences on the phone (survives WebView
// storage clears) and localStorage in a plain browser.
import { today, addDays, diffDays } from './plan.js';

export const DEFAULT_PLANNER = () => ({ on: false, from: 7, to: 21, items: [], goals: [] });

const KEY = 'lamp.state.v1';
const prefs = () => window.Capacitor?.Plugins?.Preferences;

const DEFAULTS = () => ({
  v: 1,
  onboarded: false,
  name: '',
  startDate: today(),
  translation: 'NLT',
  nltKey: '',
  esvKey: '',
  theme: 'system',
  fontScale: 1,
  readFont: 'serif',
  music: { on: false, vol: 0.6 },
  prayed: {},
  prayers: [],
  reminder: { on: false, time: '06:00' },
  rhemaNotif: { on: false, time: '07:00' },
  audioRate: 1,
  prayAudio: false,
  voices: { en: '', fil: '' },
  drama: true,
  dramaVoices: { en: {}, fil: {} },
  // done[track][key] = date it was marked read
  done: { ot: {}, nt: {}, ps: {}, pr: {} },
  // log[date] = number of portions marked read that day
  log: {},
  badges: {},
  earlyReads: 0,
  // Weekly planner (optional tab). See planner.js
  planner: DEFAULT_PLANNER(),
});

export const state = DEFAULTS();

export async function load() {
  let raw = null;
  try { const p = prefs(); if (p) raw = (await p.get({ key: KEY }))?.value; } catch {}
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch {} }
  if (raw) {
    try { Object.assign(state, normalize(JSON.parse(raw))); } catch {}
  }
}

// Fills in anything missing (older saves, backups) with defaults
export function normalize(s) {
  const d = DEFAULTS();
  return Object.assign(d, s, {
    done: { ...d.done, ...(s.done || {}) },
    reminder: { ...d.reminder, ...(s.reminder || {}) },
    rhemaNotif: { ...d.rhemaNotif, ...(s.rhemaNotif || {}) },
    music: { ...d.music, ...(s.music || {}) },
    planner: { ...d.planner, ...(s.planner || {}) },
  });
}

// Replaces everything (used when restoring a backup)
export function replaceAll(s) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, normalize(s));
  save();
}

export function save() {
  const s = JSON.stringify(state);
  try { localStorage.setItem(KEY, s); } catch {}
  try { prefs()?.set({ key: KEY, value: s }); } catch {}
}

export function reset(keepSettings = true) {
  const keep = keepSettings
    ? { name: state.name, translation: state.translation, nltKey: state.nltKey, esvKey: state.esvKey, theme: state.theme,
        fontScale: state.fontScale, readFont: state.readFont, readPage: state.readPage, music: state.music, reminder: state.reminder, rhemaNotif: state.rhemaNotif, audioRate: state.audioRate, prayAudio: state.prayAudio, voices: state.voices, drama: state.drama, dramaVoices: state.dramaVoices, onboarded: state.onboarded, planner: state.planner }
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
// The app also counts a day as lit when all of that day's readings are done
// (so reading ahead keeps tomorrow's streak alive).
let litHook = () => false;
export const setLitHook = (fn) => { litHook = fn; };
export const isLit = (date) => (state.log[date] || 0) >= LIT || litHook(date);

export function streak() {
  let d = today();
  if (!isLit(d)) d = addDays(d, -1); // today still in progress
  let n = 0;
  while (isLit(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function longestStreak() {
  const set = new Set(Object.keys(state.log));
  for (let d = state.startDate, t = today(); d <= t; d = addDays(d, 1)) set.add(d);
  const days = [...set].filter(isLit).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

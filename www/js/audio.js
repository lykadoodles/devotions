// Audio Bible: reads passages aloud with the phone's text-to-speech voice.
// Every item is handed to the native speech queue at once (queue strategy "add"),
// so reading carries on with the screen off even if the app itself is paused.
// Each speak() call resolves when its item finishes, which drives the
// follow-along highlight whenever the app is in front.
import { state, save } from './store.js';

const native = () => window.Capacitor?.Plugins?.TextToSpeech;
const web = () => window.speechSynthesis;
export const available = () => !!(native() || web());

export const RATES = [0.8, 1, 1.2, 1.5];
let queue = [];          // [{ text, k?, portion?: { track, key, label }, kind?: 'title' }]
let idx = 0;             // item being read (or next to read when paused)
let gen = 0;             // bumps on every start/stop so stale callbacks are ignored
let playing = false;
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (ev) => listeners.forEach((fn) => { try { fn(ev, snapshot()); } catch (e) { console.warn(e); } });
export const snapshot = () => ({ playing, idx, item: queue[idx] || null, length: queue.length, queue });
export const isActive = () => queue.length > 0;
export const rate = () => (RATES.includes(state.audioRate) ? state.audioRate : 1);

function speak(text, g) {
  const n = native();
  if (n) return n.speak({ text, lang: 'en-US', rate: rate(), pitch: 1, volume: 1, category: 'playback', queueStrategy: 1 });
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate();
    u.onend = () => resolve(); u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(e));
    if (g === gen) web().speak(u);
  });
}
async function hush() {
  try { const n = native(); if (n) await n.stop(); else web()?.cancel(); } catch {}
}

export function load(items, start = 0) { queue = items.filter((i) => i.text && i.text.trim()); idx = Math.max(0, Math.min(start, queue.length - 1)); }

export async function play(from = idx) {
  if (!queue.length) return;
  const g = ++gen;
  await hush();
  if (g !== gen) return;
  idx = Math.max(0, Math.min(from, queue.length - 1));
  playing = true; emit('play');
  for (let i = idx; i < queue.length; i++) {
    const me = i;
    speak(queue[i].text, g).then(() => {
      if (g !== gen) return;
      idx = me + 1;
      if (idx >= queue.length) { playing = false; idx = queue.length - 1; emit('end'); }
      else emit('next');
    }).catch((e) => { if (g === gen) { console.warn('tts', e); playing = false; emit('error'); } });
  }
}

export async function pause() { gen++; playing = false; await hush(); emit('pause'); }
export async function stop() { gen++; playing = false; await hush(); queue = []; idx = 0; emit('stop'); }
export const toggle = () => (playing ? pause() : play(idx));
export const skip = (d) => { const to = Math.max(0, Math.min(queue.length - 1, idx + d)); return playing ? play(to) : (idx = to, emit('seek')); };
export function setRate(r) { state.audioRate = r; save(); if (playing) play(idx); else emit('rate'); }
export const indexOf = (pred) => queue.findIndex(pred);

// Turns rendered scripture (verses already wrapped in span.v[data-k]) into items:
// one per chapter title and one per verse.
export function itemsFrom(root, portion) {
  const out = [];
  if (portion?.intro) out.push({ text: portion.intro, portion, kind: 'title' });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let last = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.matches('h2.ch-title')) {
      const t = n.cloneNode(true); t.querySelectorAll('.ch-range').forEach((x) => x.remove());
      out.push({ text: t.textContent.trim(), portion, kind: 'title' }); last = null;
    } else if (n.matches('span.v')) {
      const t = n.cloneNode(true); t.querySelectorAll('sup').forEach((x) => x.remove());
      const words = t.textContent.replace(/\s+/g, ' ').trim();
      if (!words) continue;
      if (last && last.k === n.dataset.k) last.text += ` ${words}`;
      else { last = { k: n.dataset.k, text: words, portion }; out.push(last); }
    }
  }
  return out;
}

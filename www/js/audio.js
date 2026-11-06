// Audio Bible: reads passages aloud with the phone's text-to-speech voice.
// Every item is handed to the native speech queue at once (queue strategy "add"),
// so reading carries on with the screen off even if the app itself is paused.
// Each speak() call resolves when its item finishes, which drives the
// follow-along highlight whenever the app is in front.
import { state, save } from './store.js';
import { TRANSLATIONS } from './text.js';
import { newContext, segments } from './drama.js';
// Voice language follows the translation (Filipino voice for Tagalog/Cebuano)
const lang = () => TRANSLATIONS[state.translation]?.lang || 'en-US';

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

// ---------- voices ----------
// Phones ship several voices (male and female, different accents). The reader
// picks one per language in Settings or the Aa sheet; we remember its name and
// look up its current position in the phone's list when speaking.
let voiceCache = null;
export async function voices() {
  if (voiceCache) return voiceCache;
  try {
    const n = native();
    if (n) voiceCache = ((await n.getSupportedVoices()).voices || []).map((v, i) => ({ ...v, index: i }));
    else if (web()) {
      let v = web().getVoices();
      if (!v.length) { await new Promise((r) => { web().onvoiceschanged = r; setTimeout(r, 1500); }); v = web().getVoices(); }
      voiceCache = v.map((x, i) => ({ name: x.name, lang: x.lang, voiceURI: x.voiceURI, localService: x.localService, index: i, _w: x }));
    } else voiceCache = [];
  } catch { voiceCache = []; }
  return voiceCache;
}
export const langKey = (l) => (/^(fil|tl)/i.test(l) ? 'fil' : 'en');
export const voicesFor = async (key) => (await voices()).filter((v) => (key === 'fil' ? /^(fil|tl)/i : /^en/i).test(v.lang || ''));
async function chosenVoice(l) {
  const want = state.voices?.[langKey(l)];
  if (!want) return null;
  return (await voices()).find((v) => v.voiceURI === want || v.name === want) || null;
}
export function setVoice(key, v, role = 'narrator') {
  const id = v ? (v.voiceURI || v.name) : '';
  if (role === 'narrator') state.voices = { ...(state.voices || {}), [key]: id };
  else state.dramaVoices = { ...(state.dramaVoices || {}), [key]: { ...(state.dramaVoices?.[key] || {}), [role]: id } };
  save();
}
export const voiceIdFor = (key, role = 'narrator') => (role === 'narrator' ? state.voices?.[key] : state.dramaVoices?.[key]?.[role]) || '';
export const dramaOn = () => state.drama !== false;

// Male or female? Phones don't say, so: the reader's own tag first, then
// voice names that give it away (Samsung "SMTf00"/"SMTm00", "… Male"/"… Female",
// and a few Google voice codes known for sure). Otherwise unknown ('').
const KNOWN = { iom: 'm', tpd: 'm', rjs: 'm', sfg: 'f', gba: 'f' };
export function genderOf(v) {
  if (!v) return '';
  const id = v.voiceURI || v.name || '';
  const own = state.voiceGender?.[id];
  if (own) return own;
  const n = `${v.name || ''} ${v.voiceURI || ''}`.toLowerCase();
  const smt = n.match(/smt([fm])\d/); if (smt) return smt[1];
  if (/\bfemale\b|\bwoman\b/.test(n)) return 'f';
  if (/\bmale\b|\bman\b/.test(n)) return 'm';
  const code = n.match(/-x-([a-z]{3})(?:-|\b)/); if (code && KNOWN[code[1]]) return KNOWN[code[1]];
  return '';
}
// Tagging a voice: if it was picked for the other sex's role, that role goes back to Automatic
export function setGender(key, v, g) {
  const id = v.voiceURI || v.name;
  const map = { ...(state.voiceGender || {}) };
  if (g) map[id] = g; else delete map[id];
  state.voiceGender = map;
  const dv = { ...(state.dramaVoices?.[key] || {}) };
  for (const role of ['male', 'female', 'god']) if (dv[role] === id && g && g !== (role === 'female' ? 'f' : 'm')) delete dv[role];
  state.dramaVoices = { ...(state.dramaVoices || {}), [key]: dv };
  save();
}
// Which voices a role may use: Men and God get male voices, Women female voices
export const roleGender = (role) => (role === 'female' ? 'f' : role === 'male' || role === 'god' ? 'm' : '');

// Dramatized reading: each character role gets its own voice. Without a chosen
// voice, the narrator's voice is pitched (lower for men, higher for women, and
// lower and a little slower for God) so the roles still sound different.
const ROLE_TONE = {
  narrator: { pitch: 1, rate: 1 },
  male: { pitch: 0.85, rate: 1 },
  female: { pitch: 1.25, rate: 1 },
  god: { pitch: 0.72, rate: 0.9 },
};
async function voiceFor(key, role) {
  const id = voiceIdFor(key, role);
  return id ? (await voices()).find((v) => v.voiceURI === id || v.name === id) || null : null;
}
async function rolePlan(key, role) {
  if (role === 'narrator') return { v: await voiceFor(key, 'narrator'), pitch: 1, rate: 1 };
  const own = await voiceFor(key, role);
  const t = ROLE_TONE[role];
  if (own) return { v: own, pitch: role === 'god' ? 0.92 : 1, rate: role === 'god' ? t.rate : 1 };
  return { v: await voiceFor(key, 'narrator'), pitch: t.pitch, rate: t.rate };
}

function speakWith(text, l, v, queueStrategy, tone = { pitch: 1, rate: 1 }) {
  const n = native();
  if (n) return n.speak({ text, lang: l, rate: rate() * tone.rate, pitch: tone.pitch, volume: 1, category: 'playback', queueStrategy, ...(v ? { voice: v.index } : {}) });
  return null;
}
function speakWeb(text, l, v, tone, onerror) {
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l; u.rate = rate() * (tone?.rate || 1); u.pitch = tone?.pitch || 1; if (v?._w) u.voice = v._w;
    u.onend = () => resolve(); u.onerror = (e) => (onerror ? (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(e)) : resolve());
    web().speak(u);
  });
}

// Plays a short sample in a voice (Settings / voice picker)
const SAMPLES = {
  en: { narrator: 'The Lord is my shepherd; I shall not want.', male: 'Here am I. Send me!', female: 'My soul magnifies the Lord.', god: 'I am who I am.' },
  fil: { narrator: 'Si Yahweh ang aking pastol; hindi ako magkukulang.', male: 'Narito ako, isugo mo ako.', female: 'Pinupuri ng aking kaluluwa ang Panginoon.', god: 'Ako ay si Ako nga.' },
};
export async function preview(v, key, role = 'narrator') {
  gen++; playing = false; await hush();
  const l = v?.lang || (key === 'fil' ? 'fil-PH' : 'en-US');
  const text = SAMPLES[key]?.[role] || SAMPLES.en.narrator;
  // no voice chosen for a character: preview the pitched narrator
  let plan = { v, pitch: 1, rate: 1 };
  if (role !== 'narrator') plan = v ? { v, pitch: role === 'god' ? 0.92 : 1, rate: role === 'god' ? ROLE_TONE.god.rate : 1 } : { v: await voiceFor(key, 'narrator'), ...ROLE_TONE[role] };
  const p = speakWith(text, plan.v?.lang || l, plan.v, 0, plan);
  if (p) return p;
  web()?.cancel();
  return speakWeb(text, plan.v?.lang || l, plan.v, plan);
}

let plans = null; // role -> { v, pitch, rate }, resolved once per play() so queued items keep their order
function speak(item, g) {
  const plan = plans?.[item.role || 'narrator'] || plans?.narrator || { v: null, pitch: 1, rate: 1 };
  const p = speakWith(item.text, lang(), plan.v, 1, plan);
  if (p) return p;
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = lang(); u.rate = rate() * plan.rate; u.pitch = plan.pitch; if (plan.v?._w) u.voice = plan.v._w;
    u.onend = () => resolve(); u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(e));
    if (g === gen) web().speak(u);
  });
}
async function hush() {
  try { const n = native(); if (n) await n.stop(); else web()?.cancel(); } catch {}
}

// One-off phrase (guided prayers), in English, replacing anything being read
export async function speakOnce(text, l = 'en-US') {
  const v = await chosenVoice(l);
  const p = speakWith(text, l, v, 0);
  if (p) return p;
  web()?.cancel();
  return speakWeb(text, l, v);
}
export const hushNow = () => hush();

export function load(items, start = 0) { queue = items.filter((i) => i.text && i.text.trim()); idx = Math.max(0, Math.min(start, queue.length - 1)); }

export async function play(from = idx) {
  if (!queue.length) return;
  const g = ++gen;
  await hush();
  const key = langKey(lang());
  plans = {};
  for (const r of ['narrator', 'male', 'female', 'god']) plans[r] = await rolePlan(key, r);
  if (g !== gen) return;
  idx = Math.max(0, Math.min(from, queue.length - 1));
  playing = true; emit('play');
  for (let i = idx; i < queue.length; i++) {
    const me = i;
    speak(queue[i], g).then(() => {
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
export function itemsFrom(root, portion, tr = state.translation) {
  const verses = [];
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
      else { last = { k: n.dataset.k, text: words, portion }; out.push(last); verses.push(last); }
    }
  }
  if (!dramaOn()) return out;
  // Dramatized: split each verse into narration and characters' lines
  const dlang = tr === 'TGL' ? 'tgl' : tr === 'CEB' ? 'ceb' : 'en';
  let ctx = null, ctxBook = -1;
  return out.flatMap((it) => {
    if (!it.k) return [it];
    const book = +it.k.split('.')[0];
    if (!ctx || book !== ctxBook) { ctx = newContext(dlang, book); ctxBook = book; }
    const segs = segments(it.text, ctx);
    return segs.length ? segs.map((sg) => ({ ...it, text: sg.text, role: sg.role })) : [it];
  });
}

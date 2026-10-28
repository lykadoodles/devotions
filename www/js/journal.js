// Highlights and heart notes.
// Verses are keyed "book.chapter.verse" so a highlight shows in every translation.
// Each saved item keeps a snapshot of the words as read, so the journal can show
// them without loading the passage again.
import { state, save } from './store.js';
import { META, bookName, today } from './plan.js';

export const COLORS = {
  yellow: '#ffd84d',
  green: '#7fe0a0',
  blue: '#7cc8ff',
  pink: '#ff9ec7',
  orange: '#ffb074',
};

const hl = () => (state.highlights ||= {});   // key -> { color, text, tr, date }
const notes = () => (state.notes ||= []);     // [{ id, keys, ref, text, tr, note, date, color }]

export const keyOf = (b, c, v) => `${b}.${c}.${v}`;
export const parseKey = (k) => k.split('.').map(Number);
export const highlightOf = (k) => hl()[k];
export const notesFor = (k) => notes().filter((n) => n.keys.includes(k));
export const allNotes = () => notes().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
export const allHighlights = () => Object.entries(hl())
  .map(([k, h]) => ({ k, ...h }))
  .sort((a, b) => b.date.localeCompare(a.date) || compareKeys(a.k, b.k));

export function compareKeys(a, b) {
  const [b1, c1, v1] = parseKey(a); const [b2, c2, v2] = parseKey(b);
  return b1 - b2 || c1 - c2 || v1 - v2;
}

// "Romans 8:28–30" or "Romans 8:39 – 9:1"
export function refOf(keys) {
  const ks = keys.slice().sort(compareKeys);
  const [b, c, v] = parseKey(ks[0]);
  const [b2, c2, v2] = parseKey(ks[ks.length - 1]);
  const one = META.books[b].verses.length === 1;
  const name = bookName(b, c === c2);
  if (b !== b2) return `${name} ${c}:${v} – ${bookName(b2, true)} ${c2}:${v2}`;
  if (c !== c2) return `${name} ${c}:${v}–${c2}:${v2}`;
  const vs = ks.length === 1 || v === v2 ? `${v}` : `${v}–${v2}`;
  return one ? `${name} ${vs}` : `${name} ${c}:${vs}`;
}

export function setHighlight(items, color, tr = state.translation) {
  // items: [{ k, text }]
  for (const { k, text } of items) {
    if (!color) delete hl()[k];
    else hl()[k] = { color, text, tr, date: today() };
  }
  save();
}

export function addNote(items, note, color, tr = state.translation) {
  const keys = items.map((i) => i.k).sort(compareKeys);
  const n = {
    id: Date.now().toString(36),
    keys,
    ref: refOf(keys),
    text: items.slice().sort((a, b) => compareKeys(a.k, b.k)).map((i) => i.text).join(' '),
    tr,
    note: note.trim(),
    date: today(),
    color: color || null,
  };
  notes().unshift(n);
  save();
  return n;
}
export function updateNote(id, note) { const n = notes().find((x) => x.id === id); if (n) { n.note = note.trim(); save(); } }
export function removeNote(id) { state.notes = notes().filter((x) => x.id !== id); save(); }
export const noteCount = () => notes().length;
export const highlightCount = () => Object.keys(hl()).length;

// Wrap in quotation marks unless the verse already opens with one
export const quote = (t) => (/^[“"‘']/.test(t) ? t : `“${t}”`);

// ---------- emoji reactions (one per verse) ----------
export const REACTIONS = [
  ['🙏', 'Prayer'], ['❤️', 'Love'], ['🙌', 'Praise'], ['😭', 'Moved to tears'],
  ['🔥', 'Fired up'], ['✨', 'Revelation'], ['💡', 'Insight'], ['🕊️', 'Peace'],
];
const rx = () => (state.reactions ||= {});   // key -> { emoji, text, tr, date }
export const reactionOf = (k) => rx()[k];
export function setReaction(items, emoji, tr = state.translation) {
  for (const { k, text } of items) {
    if (!emoji) delete rx()[k];
    else rx()[k] = { emoji, text, tr, date: today() };
  }
  save();
}
export const reactionCount = () => Object.keys(rx()).length;

// Every verse you marked: highlighted and/or reacted to
export function markedVerses() {
  const keys = new Set([...Object.keys(state.highlights || {}), ...Object.keys(rx())]);
  return [...keys].map((k) => {
    const h = state.highlights?.[k]; const r = rx()[k];
    return { k, color: h?.color || null, emoji: r?.emoji || null, text: (h || r).text, tr: (h || r).tr,
      date: [h?.date, r?.date].filter(Boolean).sort().pop() };
  }).sort((a, b) => b.date.localeCompare(a.date) || compareKeys(a.k, b.k));
}

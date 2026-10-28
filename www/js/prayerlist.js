// Prayer list: requests kept on the phone, woven into the closing prayer,
// and marked answered with a note of how God answered.
import { state, save } from './store.js';
import { today } from './plan.js';

const list = () => (state.prayers ||= []);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const active = () => list().filter((p) => !p.answered);
export const answered = () => list().filter((p) => p.answered)
  .sort((a, b) => (b.answered.date || '').localeCompare(a.answered.date || ''));
export const byId = (id) => list().find((p) => p.id === id);

export function add(text, who = '') {
  text = text.trim(); who = who.trim();
  if (!text) return null;
  const p = { id: uid(), text, who, created: today(), prayedCount: 0, lastPrayed: null, answered: null };
  list().unshift(p);
  save();
  return p;
}
export function update(id, fields) { Object.assign(byId(id) || {}, fields); save(); }
export function remove(id) { state.prayers = list().filter((p) => p.id !== id); save(); }
export function markPrayed(ids) {
  const t = today();
  for (const id of ids) {
    const p = byId(id);
    if (p && p.lastPrayed !== t) { p.prayedCount = (p.prayedCount || 0) + 1; p.lastPrayed = t; }
  }
  save();
}
export function markAnswered(id, note = '') { update(id, { answered: { date: today(), note: note.trim() } }); }
export function unanswer(id) { update(id, { answered: null }); }

// 2–3 requests for today's closing prayer, least recently prayed first.
// Stable for the day so the prayer doesn't change on every visit.
export function forToday(n = 3) {
  const t = today();
  return active()
    .slice()
    .sort((a, b) => {
      const ap = a.lastPrayed === t ? '0' : a.lastPrayed || '';
      const bp = b.lastPrayed === t ? '0' : b.lastPrayed || '';
      return ap.localeCompare(bp) || a.created.localeCompare(b.created);
    })
    .slice(0, n);
}

export const totalPrayed = () => list().reduce((a, p) => a + (p.prayedCount || 0), 0);

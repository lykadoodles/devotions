// Devotional notes for each reading: key takeaway, how to apply it today, and
// a one-line prayer used to build the closing prayer.
// data/devo.json = { ot: [365], nt: [365], ps: [365], pr: [31] } of { t, a, p }
import { proverbsChapters } from './plan.js';

let DEVO = null;
let loading = null;

export function loadDevo() {
  if (DEVO) return Promise.resolve(DEVO);
  if (!loading) {
    loading = fetch('data/devo.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => (DEVO = d));
  }
  return loading;
}

// { takeaway, apply, pray } or null
export function devoFor(track, key) {
  if (!DEVO) return null;
  let e = null;
  if (track === 'pr') {
    const [a, b] = proverbsChapters(key);
    const list = (DEVO.pr || []).slice(a - 1, b).filter(Boolean);
    if (!list.length) return null;
    if (list.length === 1) e = list[0];
    else e = { t: list.map((x) => x.t).join(' '), a: list[0].a, p: list[0].p };
  } else {
    e = (DEVO[track] || [])[Number(key) - 1];
  }
  return e && e.t ? { takeaway: e.t, apply: e.a, pray: e.p } : null;
}

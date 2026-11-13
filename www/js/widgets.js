// Home-screen widgets (Android). The widgets are native and can't run this
// app's code, so the app writes a small summary they read: the next 14 days'
// verse of the day and readings, the prayer list and the planner's to-dos.
// It's stored with Preferences (the same storage the widgets read), so they
// keep working without opening Lamp, including after midnight.
// Ticks made on a widget are queued natively and applied here when Lamp opens.
import { state, isDone, streak } from './store.js';
import { today, addDays, readingsFor, label, planDayFor, TRACKS, TRACK_ORDER } from './plan.js';
import { verseTextSaved } from './text.js';
import { rhemaRange, dailyIndex } from './rhema.js';
import * as Prayers from './prayerlist.js';
import * as Planner from './planner.js';

const P = () => window.Capacitor?.Plugins || {};
const native = () => !!window.Capacitor?.isNativePlatform?.() && !!P().Preferences;
const KEY = 'lamp.widget';
const ACTIONS = 'lamp.widget.actions';
const ROUTE = 'lamp.widget.route';
const DAYS = 14;

const hourLabel = (h) => (h == null ? '' : h === 12 ? '12 nn' : h === 0 ? '12 am' : h < 12 ? `${h} am` : `${h - 12} pm`);

// Verse texts are looked up once per day and translation (they come from the saved Bible)
let verseCache = { key: '', days: {} };
async function verses() {
  const k = `${today()}|${state.translation}|${state.rhema?.date}|${state.rhema?.idx}`;
  if (verseCache.key === k) return verseCache.days;
  const days = {};
  for (let i = 0; i < DAYS; i++) {
    const date = addDays(today(), i);
    const range = rhemaRange(state.rhema?.date === date ? state.rhema.idx : dailyIndex(date));
    const ref = label(range);
    try {
      const r = await verseTextSaved(range);
      days[date] = { ref, text: r.text.replace(/\s+/g, ' ').trim(), tr: r.translation };
    } catch { days[date] = { ref, text: '', tr: '' }; }
  }
  verseCache = { key: k, days };
  return days;
}

export async function build() {
  const vs = await verses();
  const days = {};
  for (let i = 0; i < DAYS; i++) {
    const date = addDays(today(), i);
    const n = planDayFor(state.startDate, date);
    const rs = readingsFor(state.startDate, date).sort((a, b) => TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track));
    days[date] = {
      day: n >= 1 && n <= 365 ? n : 0,
      verse: vs[date] || null,
      readings: rs.map((r) => ({ name: TRACKS[r.track].name, ref: label(r.range), done: isDone(r.track, r.key), route: `#/read/${r.track}/${r.key}` })),
      plan: Planner.enabled()
        ? Planner.items().filter((x) => x.date === date).sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0))
          .map((x) => ({ id: x.id, text: x.text, time: hourLabel(x.hour), done: !!x.done }))
        : [],
    };
  }
  return {
    v: 1,
    updated: new Date().toISOString(),
    name: state.name || '',
    streak: streak(),
    days,
    prayers: Prayers.active().slice(0, 8).map((p) => ({ text: p.text, who: p.who || '' })),
    prayerCount: Prayers.active().length,
    planner: {
      on: Planner.enabled(),
      todos: Planner.enabled() ? Planner.items().filter((x) => !x.date && !x.done).slice(0, 8).map((x) => ({ id: x.id, text: x.text, done: false })) : [],
    },
  };
}

let timer = 0;
let last = '';
// Called after every save (debounced) and when Lamp opens
export function refresh(delay = 1200) {
  if (!native()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const json = JSON.stringify(await build());
      const sig = json.replace(/"updated":"[^"]*",/, '');
      if (sig === last) return;
      last = sig;
      await P().Preferences.set({ key: KEY, value: json });
      await P().LampWidgets?.refresh?.();
    } catch (e) { console.warn('widgets', e); }
  }, delay);
}

// Ticks made on a widget (to-dos) and screens a widget asked to open
export async function applyPending(open) {
  if (!native()) return;
  try {
    const raw = (await P().Preferences.get({ key: ACTIONS }))?.value;
    if (raw) {
      await P().Preferences.remove({ key: ACTIONS });
      for (const a of JSON.parse(raw) || []) {
        if (a.type === 'todo' && a.id) Planner.updateItem(a.id, { done: !!a.done });
      }
      last = '';
      refresh(0);
    }
    const route = (await P().Preferences.get({ key: ROUTE }))?.value;
    if (route) { await P().Preferences.remove({ key: ROUTE }); open(route); }
  } catch (e) { console.warn('widget actions', e); }
}

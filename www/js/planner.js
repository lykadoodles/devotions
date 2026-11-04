// Weekly planner: a "week at a glance" spread modelled on a paper planner.
// Monday-start weeks, an hourly grid, a to-do rail, weekly goals, and each
// day's Bible reading in the column header. The reading ticker has no data of
// its own: it reads Lamp's progress (state.done), so marking a portion read
// anywhere in the app shows up here.
//
// Records are sync-ready for a later Google Drive sync: every item and goal
// has a UUID, an updatedAt timestamp, and is soft-deleted (deleted: true)
// rather than removed, so two copies can be merged without losing edits.
import { state, save, isDone, isLit, DEFAULT_PLANNER } from './store.js';
import { META, today, addDays, parseISO, iso, fmtDate, readingsFor, segments, TRACKS } from './plan.js';

// ---------- data ----------
export { DEFAULT_PLANNER };

const P = () => {
  state.planner ||= DEFAULT_PLANNER();
  state.planner.items ||= [];
  state.planner.goals ||= [];
  return state.planner;
};
export const enabled = () => !!state.planner?.on;

const uid = () => (crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16);
  }));
const now = () => new Date().toISOString();
const touch = (rec, fields = {}) => { Object.assign(rec, fields, { updatedAt: now() }); save(); return rec; };

const live = (arr) => arr.filter((x) => !x.deleted);
export const items = () => live(P().items);
export const goals = (week) => live(P().goals).filter((g) => g.week === week);
const itemById = (id) => P().items.find((x) => x.id === id);
const goalById = (id) => P().goals.find((x) => x.id === id);

export function addItem(text, week, date = null, hour = null) {
  text = text.trim();
  if (!text) return null;
  const t = now();
  const it = { id: uid(), text, week, date, hour, done: false, carried: false, createdAt: t, updatedAt: t, deleted: false };
  P().items.push(it); save();
  return it;
}
export const updateItem = (id, fields) => { const it = itemById(id); return it ? touch(it, fields) : null; };
export const removeItem = (id) => updateItem(id, { deleted: true });
export const schedule = (id, date, hour) => updateItem(id, { date, hour, week: mondayOf(date) });
export const unschedule = (id) => updateItem(id, { date: null, hour: null });

export function addGoal(week) {
  const t = now();
  const g = { id: uid(), week, goal: '', next: '', due: '', result: '', createdAt: t, updatedAt: t, deleted: false };
  P().goals.push(g); save();
  return g;
}
export const updateGoal = (id, fields) => { const g = goalById(id); return g ? touch(g, fields) : null; };
export const removeGoal = (id) => updateGoal(id, { deleted: true });

// Unfinished, unscheduled to-dos from past weeks move into this week.
export function carryOver(week) {
  let n = 0;
  for (const it of items()) {
    if (!it.done && !it.date && it.week < week) { it.week = week; it.carried = true; it.updatedAt = now(); n++; }
  }
  if (n) save();
  return n;
}

// ---------- weeks (Monday start, ISO 8601 numbering) ----------
export function mondayOf(date) {
  const d = parseISO(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
export function isoWeek(date) {
  const d = parseISO(date);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of this week
  const y = d.getFullYear();
  const jan4 = new Date(y, 0, 4);
  return { year: y, week: 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7) };
}
export const weekDays = (week) => Array.from({ length: 7 }, (_, i) => addDays(week, i));

// ---------- labels ----------
const ABBR = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1 Sam', '2 Sam', '1 Kgs', '2 Kgs', '1 Chr', '2 Chr',
  'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad',
  'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1 Cor', '2 Cor',
  'Gal', 'Eph', 'Phil', 'Col', '1 Thess', '2 Thess', '1 Tim', '2 Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1 Pet', '2 Pet',
  '1 John', '2 John', '3 John', 'Jude', 'Rev'];

// Compact reference like the paper planner: "Gen 19:30–21:21", "Ps 7:1–5"
export function shortLabel(range) {
  return segments(range).map(({ b, c1, v1, c2, v2 }) => {
    const vs = META.books[b].verses;
    const n = ABBR[b] || META.books[b].name;
    const fullStart = v1 === 1, fullEnd = v2 === vs[c2 - 1];
    if (vs.length === 1) return fullStart && fullEnd ? n : `${n} ${v1}–${v2}`;
    if (c1 === c2) return fullStart && fullEnd ? `${n} ${c1}` : `${n} ${c1}:${v1}${v1 === v2 ? '' : `–${v2}`}`;
    return fullStart && fullEnd ? `${n} ${c1}–${c2}` : `${n} ${c1}:${v1}–${c2}:${v2}`;
  }).join('; ');
}

const hourLabel = (h) => (h === 12 ? '12 nn' : h === 0 ? '12 am' : h < 12 ? `${h} am` : `${h - 12} pm`);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ico = (d, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${d}</svg>`;
const I = {
  prev: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  carry: '<path d="M4 12h12M12 6l6 6-6 6"/>',
};

// ---------- view ----------
let $app = null;
let toast = () => {};
let shownWeek = null;
let placing = null; // id of the to-do waiting for a time slot

export function init(deps) { $app = deps.app; toast = deps.toast || toast; }

export function render(weekParam) {
  const curWeek = mondayOf(today());
  const week = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOf(weekParam) : curWeek;
  if (week !== shownWeek) placing = null;
  shownWeek = week;
  const moved = week === curWeek ? carryOver(week) : 0;
  const days = weekDays(week);
  const { week: wn } = isoWeek(week);
  const pl = P();
  const from = Math.min(pl.from, pl.to), to = Math.max(pl.from, pl.to);
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const t = today();
  const all = items();
  // Entries before or after the visible hours still show, in the first/last row
  const inRow = (d, h) => all.filter((x) => x.date === d && x.hour != null &&
    (x.hour === h || (h === from && x.hour < from) || (h === to && x.hour > to)));
  const todos = all.filter((x) => x.week === week && !x.date)
    .sort((a, b) => (a.done - b.done) || a.createdAt.localeCompare(b.createdAt));
  const open = todos.filter((x) => !x.done).length;
  const gl = goals(week);
  const review = week < curWeek || (week === curWeek && parseISO(t).getDay() === 0);
  const end = days[6];
  const span = `${fmtDate(week, { month: 'short', day: 'numeric' })} – ${fmtDate(end, parseISO(end).getMonth() === parseISO(week).getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}, ${parseISO(end).getFullYear()}`;

  const dayHead = (d) => {
    const dt = parseISO(d);
    const rs = readingsFor(state.startDate, d);
    const sameDay = rs.filter((r) => state.done[r.track]?.[r.key] === d).length;
    const extra = Math.max(0, (state.log[d] || 0) - sameDay);
    return `<div class="pl-dh ${d === t ? 'today' : ''} ${isLit(d) ? 'lit' : ''}">
      <a class="pl-dname" href="${d === t ? '#/today' : `#/day/${d}`}">
        <span>${dt.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <b>${dt.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()} ${dt.getDate()}</b>
      </a>
      <div class="pl-ticks">${rs.map((r) => `<a class="pl-tick t-${r.track} ${isDone(r.track, r.key) ? 'done' : ''}" href="#/read/${r.track}/${r.key}" title="${esc(TRACKS[r.track].name)}"><i></i><span>${esc(shortLabel(r.range))}</span></a>`).join('')}</div>
      ${extra ? `<div class="pl-extra">+${extra} caught up</div>` : ''}
    </div>`;
  };

  const entry = (x) => `<span class="pl-entry ${x.done ? 'done' : ''}" data-pl="item" data-id="${x.id}">${x.hour < from || x.hour > to ? `<small>${hourLabel(x.hour)}</small> ` : ''}${esc(x.text)}</span>`;

  $app.classList.add('planner-mode');
  $app.innerHTML = `
    <header class="top rise">
      <div><div class="eyebrow">Week at a glance</div><h1 class="h1">Week ${wn}</h1>
        <p class="muted" style="margin:4px 0 0">${esc(span)}</p></div>
      <div class="pl-weeknav">
        <a class="pl-navbtn" href="#/planner/${addDays(week, -7)}" aria-label="Previous week">${ico(I.prev)}</a>
        ${week !== curWeek ? `<a class="pl-navbtn now" href="#/planner">This week</a>` : ''}
        <a class="pl-navbtn" href="#/planner/${addDays(week, 7)}" aria-label="Next week">${ico(I.next)}</a>
      </div>
    </header>

    <div class="pl-scroll rise" id="pl-scroll">
      <div class="pl-grid ${placing ? 'placing' : ''}" style="grid-template-rows:auto repeat(${hours.length}, minmax(48px, auto))">
        <div class="pl-corner"></div>
        ${days.map(dayHead).join('')}
        ${hours.map((h) => `
          <div class="pl-hour">${hourLabel(h)}</div>
          ${days.map((d) => `<div class="pl-slot ${d === t ? 'today' : ''}" data-pl="slot" data-date="${d}" data-hour="${h}">${inRow(d, h).map(entry).join('')}</div>`).join('')}
        `).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">To-dos</div><span class="muted" style="font-size:13px">${open ? `${open} open` : todos.length ? 'All done' : ''}</span></div>
      <form class="padd pl-add" data-plform="todo" autocomplete="off">
        <div class="padd-row" style="border:0;margin:0;padding:0">
          <input id="pl-todo" type="text" placeholder="Add a to-do for this week" maxlength="140">
          <button class="btn primary small" type="submit">Add</button>
        </div>
      </form>
      ${moved ? `<p class="help">${moved} unfinished to-do${moved > 1 ? 's' : ''} carried over from last week.</p>` : ''}
      ${todos.length ? `<div class="list pl-todos">${todos.map((x) => `
        <div class="item pl-todo ${x.done ? 'done' : ''} ${placing === x.id ? 'placing' : ''}">
          <button class="pl-check" data-pl="done" data-id="${x.id}" aria-label="${x.done ? 'Mark not done' : 'Mark done'}">${ico(I.check)}</button>
          <button class="t pl-todo-text" data-pl="item" data-id="${x.id}"><b>${esc(x.text)}</b>${x.carried ? `<span>${ico(I.carry, 'class="pl-mini"')} Carried over</span>` : ''}</button>
          ${x.done ? '' : `<button class="pc-btn" data-pl="place" data-id="${x.id}" aria-label="Schedule">${ico(I.cal)}<span>${placing === x.id ? 'Cancel' : 'Schedule'}</span></button>`}
        </div>`).join('')}</div>` : `<p class="help" style="text-align:center;margin:14px 0">Nothing on your list yet. Add a to-do, then tap <b>Schedule</b> to give it a time.</p>`}
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Goals for the week</div>
        <button class="pc-btn" data-pl="goal-add">${ico(I.plus)}<span>Add goal</span></button></div>
      ${review && gl.some((g) => g.goal && !g.result) ? `<div class="banner pl-review"><div><b>Week in review</b><div class="muted" style="font-size:13.5px;margin-top:2px">How did your goals go? Note the results below.</div></div></div>` : ''}
      ${gl.length ? `<div class="pl-goals">${gl.map((g, i) => `
        <div class="pl-goal rise" data-id="${g.id}">
          <div class="pl-goal-top"><span class="pl-num">${i + 1}</span>
            <textarea rows="1" data-plf="goal" data-id="${g.id}" placeholder="Goal" maxlength="200">${esc(g.goal)}</textarea>
            <button class="pl-del" data-pl="goal-del" data-id="${g.id}" aria-label="Delete goal">${ico(I.trash)}</button></div>
          <label>Next action step<input type="text" data-plf="next" data-id="${g.id}" value="${esc(g.next)}" placeholder="The very next thing to do" maxlength="200"></label>
          <label class="pl-due">Deadline<input type="date" data-plf="due" data-id="${g.id}" value="${esc(g.due)}"></label>
          <label>Results / remarks<textarea rows="2" data-plf="result" data-id="${g.id}" placeholder="${review ? 'How did it go?' : 'Fill this in at the end of the week'}" maxlength="400">${esc(g.result)}</textarea></label>
        </div>`).join('')}</div>` : `<p class="help" style="text-align:center;margin:14px 0">Set a few goals for the week, each with its next action and a deadline.</p>`}
    </div>

    <p class="help" style="text-align:center;margin-top:28px">Proverbs 16:3 · “Commit your work to the Lord, and your plans will succeed.”</p>
    ${placing ? placingBar() : ''}
  `;
  layout(week === curWeek ? days.indexOf(t) : 0);
}

function placingBar() {
  const it = itemById(placing);
  return `<div class="pl-placebar"><span>Tap a time for <b>${esc(it?.text || '')}</b></span><button class="btn small" data-pl="place-cancel">Cancel</button></div>`;
}

// Size the day columns to the screen: 3 days on a phone (like one page of
// the paper spread), more on wider screens, all 7 on a tablet or landscape.
let lastCols = 0;
function layout(focusIdx = -1) {
  const sc = document.getElementById('pl-scroll');
  if (!sc) return;
  const w = sc.clientWidth;
  const cols = w >= 760 ? 7 : w >= 560 ? 5 : w >= 420 ? 4 : 3;
  lastCols = cols;
  sc.style.setProperty('--colw', `${Math.floor((w - 46) / cols)}px`);
  if (focusIdx >= 0) sc.scrollLeft = Math.min(focusIdx, 7 - cols) * Math.floor((w - 46) / cols);
}
addEventListener('resize', () => { if (document.getElementById('pl-scroll')) layout(); });

function rerender() {
  const sc = document.getElementById('pl-scroll');
  const x = sc?.scrollLeft || 0, y = scrollY;
  render(shownWeek);
  const sc2 = document.getElementById('pl-scroll');
  if (sc2) sc2.scrollLeft = x;
  window.scrollTo(0, y);
}

function sheet(html, onOpen) {
  const o = document.createElement('div');
  o.className = 'overlay sheet-overlay';
  o.innerHTML = `<div class="sheet pl-sheet" role="dialog"><div class="sheet-grip"></div>${html}</div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-close]')) close(); });
  onOpen?.(o, close);
  return close;
}

const whenLabel = (d, h) => `${fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' })} · ${hourLabel(h)}`;

function newEntrySheet(date, hour) {
  sheet(`
    <div class="eyebrow">${esc(whenLabel(date, hour))}</div>
    <form data-plform="entry" autocomplete="off" style="margin-top:12px">
      <input class="field" id="pl-entry" type="text" placeholder="What’s happening?" maxlength="140" style="margin:0">
      <button class="btn primary block" type="submit" style="margin-top:12px">Add</button>
    </form>`, (o, close) => {
    const f = o.querySelector('form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = o.querySelector('#pl-entry').value;
      if (addItem(v, mondayOf(date), date, hour)) { close(); rerender(); }
    });
    setTimeout(() => o.querySelector('#pl-entry')?.focus(), 250);
  });
}

function itemSheet(id) {
  const it = itemById(id);
  if (!it) return;
  sheet(`
    <div class="eyebrow">${it.date ? esc(whenLabel(it.date, it.hour)) : 'To-do'}</div>
    <input class="field" id="pl-edit" type="text" value="${esc(it.text)}" maxlength="140" style="margin:12px 0 0">
    <div class="pl-sheet-actions">
      <button class="btn" data-sa="done">${ico(I.check, 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"')} ${it.done ? 'Not done' : 'Done'}</button>
      ${it.date ? `<button class="btn" data-sa="move">Move</button><button class="btn" data-sa="unschedule">To-dos</button>`
    : `<button class="btn" data-sa="place">Schedule</button>`}
      <button class="btn pl-danger" data-sa="delete">Delete</button>
    </div>
    <button class="btn primary block" data-sa="save" style="margin-top:10px">Save</button>`, (o, close) => {
    o.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sa]');
      if (!b) return;
      const a = b.dataset.sa;
      const text = o.querySelector('#pl-edit').value.trim();
      if (text && text !== it.text) updateItem(id, { text });
      if (a === 'done') updateItem(id, { done: !it.done });
      if (a === 'unschedule') { unschedule(id); toast('Moved back to to-dos'); }
      if (a === 'delete') { removeItem(id); toast('Deleted'); }
      close();
      if (a === 'move' || a === 'place') { startPlacing(id); return; }
      rerender();
    });
  });
}

function startPlacing(id) {
  placing = id;
  rerender();
  document.getElementById('pl-scroll')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- events (only while the planner is on screen) ----------
const onPlanner = () => location.hash.startsWith('#/planner') && enabled();

document.addEventListener('click', (e) => {
  if (!onPlanner() || e.target.closest('.overlay')) return;
  const el = e.target.closest('[data-pl]');
  if (!el) return;
  const { pl: a, id } = el.dataset;
  if (a === 'slot' || (a === 'item' && placing && el.closest('.pl-slot'))) {
    const s = el.closest('.pl-slot');
    if (placing) {
      const it = itemById(placing);
      schedule(placing, s.dataset.date, Number(s.dataset.hour));
      placing = null;
      toast(`Scheduled ${it ? `“${it.text}”` : ''}`.trim());
      rerender();
    } else if (a === 'slot') newEntrySheet(s.dataset.date, Number(s.dataset.hour));
    return;
  }
  if (a === 'item') { itemSheet(id); return; }
  if (a === 'done') { const it = itemById(id); updateItem(id, { done: !it.done }); rerender(); return; }
  if (a === 'place') { if (placing === id) { placing = null; rerender(); } else startPlacing(id); return; }
  if (a === 'place-cancel') { placing = null; rerender(); return; }
  if (a === 'goal-add') {
    const g = addGoal(shownWeek); rerender();
    setTimeout(() => document.querySelector(`textarea[data-plf="goal"][data-id="${g.id}"]`)?.focus(), 50);
    return;
  }
  if (a === 'goal-del') {
    const g = goalById(id);
    if (g && (g.goal || g.next || g.result) && !confirm('Delete this goal?')) return;
    removeGoal(id); rerender();
  }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-plform="todo"]');
  if (!f || !onPlanner()) return;
  e.preventDefault();
  const inp = document.getElementById('pl-todo');
  if (addItem(inp.value, shownWeek)) { rerender(); document.getElementById('pl-todo')?.focus(); }
});

// Goal fields save as you type (no re-render, so the keyboard stays open)
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-plf]');
  if (!el || !onPlanner()) return;
  if (el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  const g = goalById(el.dataset.id);
  if (!g) return;
  Object.assign(g, { [el.dataset.plf]: el.value, updatedAt: now() });
  clearTimeout(saveTimer); saveTimer = setTimeout(save, 400);
});
let saveTimer = 0;
// Make sure a half-typed goal is saved if the app goes to the background
document.addEventListener('visibilitychange', () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; save(); } });

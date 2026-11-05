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
import { META, today, addDays, parseISO, iso, fmtDate, readingsFor, segments, TRACKS, label } from './plan.js';
import { verseText, verseTextIn } from './text.js';

// ---------- data ----------
export { DEFAULT_PLANNER };

const P = () => {
  state.planner ||= DEFAULT_PLANNER();
  state.planner.items ||= [];
  state.planner.goals ||= [];
  state.planner.birthdays ||= [];
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
let tab = 'week';   // week | todos | goals | bdays

const hooks = { changed: () => {}, askNotif: null };
export function init(deps) { $app = deps.app; toast = deps.toast || toast; hooks.changed = deps.onChange || hooks.changed; hooks.askNotif = deps.askNotif || null; }

export function render(weekParam, openId) {
  if (weekParam === 'bday') {
    history.replaceState(null, '', '#/planner');
    render(null);
    if (openId) setTimeout(() => greetSheet(openId, today()), 200);
    return;
  }
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
      ${birthdaysOn(d).map((b) => `<button class="pl-bday ${greetedIn(b, dt.getFullYear()) ? 'done' : ''}" data-pl="bday" data-id="${b.id}" data-date="${d}">🎂 <span>${esc(b.name)}</span></button>`).join('')}
      <div class="pl-ticks">${rs.map((r) => `<a class="pl-tick t-${r.track} ${isDone(r.track, r.key) ? 'done' : ''}" href="#/read/${r.track}/${r.key}" title="${esc(TRACKS[r.track].name)}"><i></i><span>${esc(shortLabel(r.range))}</span></a>`).join('')}</div>
      ${extra ? `<div class="pl-extra">+${extra} caught up</div>` : ''}
    </div>`;
  };

  const entry = (x) => `<span class="pl-entry ${x.done ? 'done' : ''}" data-pl="item" data-id="${x.id}">${x.hour < from || x.hour > to ? `<small>${hourLabel(x.hour)}</small> ` : ''}${esc(x.text)}</span>`;

  const nB = bdays().length;
  const tabBtn = (k, label, n) => `<button class="${tab === k ? 'on' : ''}" data-pl="tab" data-tab="${k}">${label}${n ? ` <i>${n}</i>` : ''}</button>`;

  const weekHTML = `
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
    <p class="help" style="text-align:center">Tap an hour to add something. Swipe sideways for more days.</p>`;

  const todosHTML = `
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
        ${x.done ? '' : `<button class="pc-btn" data-pl="place" data-id="${x.id}" aria-label="Schedule">${ico(I.cal)}<span>Schedule</span></button>`}
      </div>`).join('')}</div>` : `<p class="help" style="text-align:center;margin:14px 0">Nothing on your list yet. Add a to-do, then tap <b>Schedule</b> to give it a time.</p>`}`;

  const goalsHTML = `
    <button class="btn block pl-addbtn" data-pl="goal-add">${ico(I.plus)} Add a goal</button>
    ${review && gl.some((g) => g.goal && !g.result) ? `<div class="banner pl-review"><div><b>Week in review</b><div class="muted" style="font-size:13.5px;margin-top:2px">How did your goals go? Note the results below.</div></div></div>` : ''}
    ${gl.length ? `<div class="pl-gtable-wrap"><div class="pl-gtable" role="table">
      <div class="pl-grow pl-ghead" role="row"><span></span><span>Goals for the week</span><span>Next action step</span><span>Deadline</span><span>Results / remarks</span><span></span></div>
      ${gl.map((g, i) => `<div class="pl-grow" role="row" data-id="${g.id}">
        <span class="pl-gnum">${i + 1}</span>
        <textarea rows="1" data-plf="goal" data-id="${g.id}" placeholder="Goal" maxlength="200" aria-label="Goal">${esc(g.goal)}</textarea>
        <textarea rows="1" data-plf="next" data-id="${g.id}" placeholder="Next step" maxlength="200" aria-label="Next action step">${esc(g.next)}</textarea>
        <input type="date" data-plf="due" data-id="${g.id}" value="${esc(g.due)}" aria-label="Deadline">
        <textarea rows="1" data-plf="result" data-id="${g.id}" placeholder="${review ? 'How did it go?' : 'End of week'}" maxlength="400" aria-label="Results or remarks">${esc(g.result)}</textarea>
        <button class="pl-del" data-pl="goal-del" data-id="${g.id}" aria-label="Delete goal">${ico(I.trash)}</button>
      </div>`).join('')}
    </div></div>` : `<p class="help" style="text-align:center;margin:14px 0">Set a few goals for the week, each with its next action and a deadline.</p>`}`;

  $app.classList.add('planner-mode');
  $app.innerHTML = `
    <header class="pl-head rise">
      <div class="pl-head-row">
        <div><div class="eyebrow">${esc(span)}</div><h1 class="h1 pl-h1">Week ${wn}</h1></div>
        <div class="pl-weeknav">
          <a class="pl-navbtn" href="#/planner/${addDays(week, -7)}" aria-label="Previous week">${ico(I.prev)}</a>
          ${week !== curWeek ? `<a class="pl-navbtn now" href="#/planner">Today</a>` : ''}
          <a class="pl-navbtn" href="#/planner/${addDays(week, 7)}" aria-label="Next week">${ico(I.next)}</a>
        </div>
      </div>
      <p class="pl-motto">“Commit your work to the Lord, and your plans will succeed.” <span>Proverbs 16:3 NLT</span></p>
      <div class="seg-ctl pl-tabs" role="tablist">
        ${tabBtn('week', 'Week')}${tabBtn('todos', 'To-dos', open)}${tabBtn('goals', 'Goals', gl.length)}${tabBtn('bdays', '<span aria-label="Birthdays">🎂</span>', nB)}
      </div>
    </header>
    <div class="pl-panel">
      ${tab === 'todos' ? todosHTML : tab === 'goals' ? goalsHTML : tab === 'bdays' ? birthdaySection() : weekHTML}
    </div>
    ${placing ? placingBar() : tab === 'week' ? `<button class="pl-fab" data-pl="quick" aria-label="Add">${ico(I.plus)}</button>` : ''}
  `;
  fitGoalBoxes();
  document.fonts?.ready.then(fitGoalBoxes);
  if (tab !== 'week') return;
  layout(week === curWeek ? days.indexOf(t) : 0);
}

// Goal cells grow with their text, like writing on more lines of the page
function fitGoalBoxes() {
  document.querySelectorAll('.pl-grow textarea').forEach((el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; });
}
addEventListener('resize', fitGoalBoxes);

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

// The + button on the week view: add a to-do, goal or birthday without leaving the grid
function quickSheet() {
  sheet(`
    <div class="eyebrow">Add to this week</div>
    <form data-plform="quick" autocomplete="off" style="margin-top:12px">
      <div class="padd-row" style="border:0;margin:0;padding:0;gap:8px">
        <input class="field" id="pl-quick" type="text" placeholder="New to-do" maxlength="140" style="margin:0">
        <button class="btn primary small" type="submit">Add</button>
      </div>
    </form>
    <div class="pl-sheet-actions">
      <button class="btn" data-q="goal">${ico(I.plus, 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4"')} Goal</button>
      <button class="btn" data-q="bday">🎂 Birthday</button>
    </div>
    <p class="help">To add something at a set time, tap that hour in the grid.</p>`, (o, close) => {
    o.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const it = addItem(o.querySelector('#pl-quick').value, shownWeek);
      if (!it) return;
      close(); toast('Added to your to-dos'); rerender();
    });
    o.addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]')?.dataset.q;
      if (!q) return;
      close();
      if (q === 'bday') { birthdaySheet(null); return; }
      tab = 'goals';
      const g = addGoal(shownWeek); render(shownWeek); window.scrollTo(0, 0);
      setTimeout(() => document.querySelector(`textarea[data-plf="goal"][data-id="${g.id}"]`)?.focus(), 80);
    });
    setTimeout(() => o.querySelector('#pl-quick')?.focus(), 250);
  });
}

function startPlacing(id) {
  placing = id;
  tab = 'week';
  rerender();
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
  if (a === 'tab') { tab = el.dataset.tab; placing = null; render(shownWeek); window.scrollTo(0, 0); return; }
  if (a === 'quick') { quickSheet(); return; }
  if (a === 'item') { itemSheet(id); return; }
  if (a === 'bday') { greetSheet(id, el.dataset.date); return; }
  if (a === 'bday-add') { birthdaySheet(null); return; }
  if (a === 'bday-edit') { birthdaySheet(id); return; }
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


// ---------- birthdays ----------
// Each birthday becomes a greeting on the day: a ready message with the
// person's name and a blessing verse, to copy or share. The verse and message
// rotate per person each year, so nobody gets the same one twice in a row.
const BLESSINGS = [
  [[3, 6, 24], [3, 6, 26]], // Numbers 6:24–26
  [[23, 29, 11], [23, 29, 11]], // Jeremiah 29:11
  [[18, 118, 24], [18, 118, 24]], // Psalm 118:24
  [[35, 3, 17], [35, 3, 17]], // Zephaniah 3:17
  [[24, 3, 22], [24, 3, 23]], // Lamentations 3:22–23
  [[18, 90, 12], [18, 90, 12]], // Psalm 90:12
  [[18, 139, 14], [18, 139, 14]], // Psalm 139:14
  [[19, 3, 5], [19, 3, 6]], // Proverbs 3:5–6
  [[49, 1, 6], [49, 1, 6]], // Philippians 1:6
  [[22, 40, 31], [22, 40, 31]], // Isaiah 40:31
  [[18, 20, 4], [18, 20, 4]], // Psalm 20:4
  [[63, 1, 2], [63, 1, 2]], // 3 John 2
  [[18, 16, 11], [18, 16, 11]], // Psalm 16:11
  [[48, 3, 20], [48, 3, 20]], // Ephesians 3:20
];
const MESSAGES = {
  en: [
    'Happy birthday, {name}! 🎂 Thanking God for you today and praying this new year of your life is full of His goodness.',
    'Happy, happy birthday, {name}! 🥳 May this year bring you closer to Jesus and fill your days with joy, peace and answered prayers.',
    '{name}, happy birthday! 🎉 I’m so grateful God put you in my life. Praying His blessings over you this year.',
    'Happy birthday, {name}! 🎈 May the Lord surprise you with His kindness in big and small ways this year.',
  ],
  enAge: 'Happy {age} birthday, {name}! 🎂 Celebrating God’s faithfulness in your life and praying this year is your most blessed one yet.',
  fil: [
    'Maligayang kaarawan, {name}! 🎂 Salamat sa Diyos sa buhay mo. Ipinagdarasal ko na punuin ka Niya ng kagalakan at kapayapaan ngayong taon.',
    'Happy birthday, {name}! 🥳 Nawa’y pagpalain ka pa ng Panginoon at ingatan ka Niya sa bawat araw ng bagong taon ng buhay mo.',
    'Maligayang kaarawan, {name}! 🎉 Isa kang malaking biyaya sa buhay ko. Patuloy kang gabayan at pagpalain ng Diyos.',
    'Happy birthday, {name}! 🎈 Ipinagpapasalamat ko sa Diyos ang buhay mo. Nawa’y mapuno ng Kanyang pag-ibig ang taon mo.',
  ],
  filAge: 'Maligayang ika-{n} kaarawan, {name}! 🎂 Salamat sa Diyos sa {n} taon ng Kanyang katapatan sa buhay mo. Pagpalain ka pa Niya!',
};
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }));
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const bdays = () => live(P().birthdays);
const bdayById = (id) => P().birthdays.find((x) => x.id === id);

// The birthday's date in a given year (Feb 29 → Feb 28 outside leap years)
function bdayDate(b, year) {
  const len = new Date(year, b.month, 0).getDate();
  const day = Math.min(b.day, len);
  return `${year}-${String(b.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export const birthdaysOn = (date) => { const y = parseISO(date).getFullYear(); return bdays().filter((b) => bdayDate(b, y) === date); };
const yearRec = (b, y) => ((b.years ||= {})[y] ||= {});
const greetedIn = (b, y) => !!b.years?.[y]?.greeted;
const ageIn = (b, y) => (b.year ? y - b.year : null);
function nextOccurrence(b, from = today()) {
  const y = parseISO(from).getFullYear();
  const d = bdayDate(b, y);
  return d >= from ? d : bdayDate(b, y + 1);
}
const daysUntil = (d) => Math.round((parseISO(d) - parseISO(today())) / 864e5);

function upsertBirthday(id, fields) {
  if (id) { const b = bdayById(id); return b ? touch(b, fields) : null; }
  const t = now();
  const b = { id: uid(), name: '', month: 1, day: 1, year: null, lang: 'en', years: {}, createdAt: t, updatedAt: t, deleted: false, ...fields };
  P().birthdays.push(b); save();
  return b;
}

function pickMessage(b, y) {
  const r = yearRec(b, y);
  if (r.msg) return r.msg;
  const lang = b.lang === 'fil' ? 'fil' : 'en';
  const age = ageIn(b, y);
  const list = MESSAGES[lang];
  const i = (hash(b.id) + y + (r.mOff || 0)) % (list.length + (age > 0 ? 1 : 0));
  const tpl = i === list.length ? MESSAGES[`${lang}Age`] : list[i];
  return tpl.replace(/\{name\}/g, b.name).replace(/\{age\}/g, age > 0 ? ordinal(age) : '').replace(/\{n\}/g, age);
}
const pickVerse = (b, y) => BLESSINGS[(hash(b.id) + y + (yearRec(b, y).vOff || 0)) % BLESSINGS.length];

async function verseFor(b, y) {
  const range = pickVerse(b, y);
  try {
    const res = b.lang === 'fil' ? await verseTextIn(range, 'TGL') : await verseText(range);
    // Drop speech marks at the ends (the greeting adds its own quotes)
    const text = (res.text || '').replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '');
    return { ...res, text, ref: label(range) };
  } catch { return { text: '', translation: '', ref: label(range) }; }
}
const composeText = (msg, note, v) => [msg.trim(), note?.trim(), v.text ? `“${v.text}”\n${v.ref}` : v.ref].filter(Boolean).join('\n\n');

// For the Today screen
export function todayBanner() {
  if (!enabled()) return '';
  const t = today(), y = parseISO(t).getFullYear();
  const list = birthdaysOn(t).filter((b) => !greetedIn(b, y));
  if (!list.length) return '';
  const names = list.map((b) => esc(b.name));
  const who = names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(' and ');
  return `<a class="banner rise pl-bday-banner" href="#/planner/bday/${list[0].id}">
    <div class="pl-cake">🎂</div>
    <div class="t"><b>It’s ${who}’s birthday today</b><span class="muted">Your greeting and verse are ready to send</span></div>
  </a>`;
}

// Notifications for upcoming birthdays (the app schedules them)
export function birthdayNotifications(days = 30) {
  if (!enabled() || P().bdayNotif === false) return [];
  const out = [];
  for (const b of bdays()) {
    const d = nextOccurrence(b);
    if (daysUntil(d) > days || greetedIn(b, parseISO(d).getFullYear())) continue;
    out.push({ date: d, id: b.id, title: `🎂 ${b.name}’s birthday today`, body: 'Your greeting and a blessing verse are ready to send.' });
  }
  return out;
}

function birthdaySection() {
  const list = bdays().map((b) => ({ b, d: nextOccurrence(b) })).sort((x, y) => x.d.localeCompare(y.d));
  const when = (d) => { const n = daysUntil(d); return n === 0 ? '<b class="pl-today-tag">Today</b>' : n === 1 ? 'Tomorrow' : n < 7 ? `In ${n} days` : esc(fmtDate(d, { month: 'short', day: 'numeric' })); };
  return `<div>
      <button class="btn block pl-addbtn" data-pl="bday-add">${ico(I.plus)} Add a birthday</button>
      ${list.length ? `<div class="list">${list.map(({ b, d }) => {
    const y = parseISO(d).getFullYear(), age = ageIn(b, y), done = greetedIn(b, y);
    return `<div class="item pl-bday-row">
          <button class="t" data-pl="bday-edit" data-id="${b.id}" style="text-align:left"><b>🎂 ${esc(b.name)}</b><span>${when(d)}${age > 0 ? ` · turns ${age}` : ''}${b.lang === 'fil' ? ' · Tagalog' : ''}</span></button>
          <button class="pc-btn ${done ? 'on' : ''}" data-pl="bday" data-id="${b.id}" data-date="${d}">${done ? 'Greeted ✓' : 'Greeting'}</button>
        </div>`;
  }).join('')}</div>` : '<p class="help" style="text-align:center;margin:14px 0">Add birthdays and Lamp will have a greeting with a verse ready on the day, to copy or share.</p>'}
    </div>`;
}

function birthdaySheet(id) {
  const b = id ? bdayById(id) : null;
  const now0 = parseISO(today());
  const m = b?.month || now0.getMonth() + 1, dd = b?.day || now0.getDate();
  sheet(`
    <div class="eyebrow">${b ? 'Edit birthday' : 'Add a birthday'}</div>
    <form class="pl-bform" autocomplete="off">
      <input class="field" id="bd-name" type="text" placeholder="Name (as you’d greet them)" maxlength="60" value="${esc(b?.name || '')}">
      <div class="pl-brow">
        <select class="field" id="bd-month" aria-label="Month">${MONTHS.map((n, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <select class="field" id="bd-day" aria-label="Day">${Array.from({ length: 31 }, (_, i) => `<option ${i + 1 === dd ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
        <input class="field" id="bd-year" type="number" inputmode="numeric" placeholder="Year" aria-label="Birth year (optional)" min="1900" max="${now0.getFullYear()}" value="${b?.year || ''}">
      </div>
      <p class="help" style="margin:6px 4px 0">Year is optional. With it, the greeting can say how old they’re turning.</p>
      <div class="sheet-row"><span class="eyebrow">Greeting in</span>
        <div class="seg-ctl" id="bd-lang"><button type="button" data-lang="en" class="${b?.lang !== 'fil' ? 'on' : ''}">English</button><button type="button" data-lang="fil" class="${b?.lang === 'fil' ? 'on' : ''}">Tagalog</button></div></div>
      <button class="btn primary block" type="submit">${b ? 'Save' : 'Add birthday'}</button>
      ${b ? '<button class="btn block pl-danger" type="button" data-bdel style="margin-top:8px">Delete</button>' : ''}
    </form>`, (o, close) => {
    let lang = b?.lang || 'en';
    o.querySelector('#bd-lang').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]'); if (!btn) return;
      lang = btn.dataset.lang;
      o.querySelectorAll('#bd-lang button').forEach((x) => x.classList.toggle('on', x === btn));
    });
    o.querySelector('[data-bdel]')?.addEventListener('click', () => {
      if (!confirm(`Delete ${b.name}’s birthday?`)) return;
      upsertBirthday(b.id, { deleted: true }); close(); rerender(); hooks.changed();
    });
    o.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const $n = o.querySelector('#bd-name');
      const name = $n.value.trim();
      if (!name) { $n.focus(); return; }
      const yr = Number(o.querySelector('#bd-year').value);
      const first = !bdays().length;
      upsertBirthday(b?.id, { name, month: Number(o.querySelector('#bd-month').value), day: Number(o.querySelector('#bd-day').value),
        year: yr >= 1900 && yr <= now0.getFullYear() ? yr : null, lang });
      close(); rerender();
      toast(b ? 'Birthday saved' : `${name}’s birthday added 🎂`);
      if (first) hooks.askNotif?.();
      hooks.changed();
    });
    if (!b) setTimeout(() => o.querySelector('#bd-name')?.focus(), 250);
  });
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch {}
  ta.remove(); return ok;
}

function greetSheet(id, date) {
  const b = bdayById(id);
  if (!b || b.deleted) return;
  const y = parseISO(date).getFullYear();
  const age = ageIn(b, y);
  let v = { text: '', ref: label(pickVerse(b, y)), translation: '' };
  sheet(`
    <div class="eyebrow">🎂 ${esc(fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric' }))}${age > 0 ? ` · turns ${age}` : ''}</div>
    <div class="h1" style="font-size:24px;margin-top:4px">${esc(b.name)}’s birthday</div>
    <textarea class="field pl-gmsg" id="bd-msg" rows="4" maxlength="600" aria-label="Message"></textarea>
    <input class="field" id="bd-note" type="text" placeholder="Add a personal line (optional)" maxlength="200" value="${esc(yearRec(b, y).note || '')}">
    <div class="pl-verse"><p id="bd-verse">Loading verse…</p>
      <div class="pl-verse-foot"><span id="bd-ref">${esc(v.ref)}</span>
      <span><button class="link-btn" data-g="msg">New message</button> · <button class="link-btn" data-g="verse">New verse</button></span></div></div>
    <div class="pl-sheet-actions">
      <button class="btn" data-g="copy">Copy</button>
      <button class="btn primary" data-g="share">Share</button>
    </div>
    <button class="btn block" data-g="greeted" style="margin-top:8px">${greetedIn(b, y) ? 'Greeted ✓ · undo' : 'Mark as greeted'}</button>`, (o, close) => {
    const $msg = o.querySelector('#bd-msg'), $note = o.querySelector('#bd-note');
    const fillVerse = async () => {
      o.querySelector('#bd-verse').textContent = 'Loading verse…';
      v = await verseFor(b, y);
      o.querySelector('#bd-verse').textContent = v.text ? `“${v.text}”` : 'Couldn’t load the verse text. The reference will still be included.';
      o.querySelector('#bd-ref').textContent = `${v.ref}${v.translation ? ` · ${v.translation}` : ''}`;
    };
    $msg.value = pickMessage(b, y);
    fillVerse();
    $msg.addEventListener('input', () => { yearRec(b, y).msg = $msg.value; touch(b); });
    $note.addEventListener('change', () => { yearRec(b, y).note = $note.value.trim(); touch(b); });
    const greeted = () => { if (!greetedIn(b, y)) { yearRec(b, y).greeted = today(); touch(b); hooks.changed(); } };
    o.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-g]')?.dataset.g;
      if (!g) return;
      const text = composeText($msg.value, $note.value, v);
      if (g === 'msg') { const r = yearRec(b, y); delete r.msg; r.mOff = (r.mOff || 0) + 1; touch(b); $msg.value = pickMessage(b, y); return; }
      if (g === 'verse') { const r = yearRec(b, y); r.vOff = (r.vOff || 0) + 1; touch(b); fillVerse(); return; }
      if (g === 'copy') {
        if (!(await copyText(text))) { toast('Couldn’t copy'); return; }
        greeted(); toast('Copied. Paste it in your chat 🎉');
      }
      if (g === 'share') {
        const Sh = window.Capacitor?.Plugins?.Share;
        try {
          if (Sh) await Sh.share({ title: `Happy birthday, ${b.name}!`, text, dialogTitle: `Greet ${b.name}` });
          else if (navigator.share) await navigator.share({ text });
          else { await copyText(text); toast('Copied'); }
        } catch { return; }
        greeted();
      }
      if (g === 'greeted') { if (greetedIn(b, y)) { delete yearRec(b, y).greeted; touch(b); hooks.changed(); } else greeted(); }
      close(); if (onPlanner()) rerender();
    });
  });
}

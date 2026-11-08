// Notebook: long-form writing that isn't tied to one verse. Sermon notes,
// devotions, letters to God, or anything else. Works with or without the planner.
// Records are sync-ready like the planner's: UUID, updatedAt, soft delete.
import { state, save } from './store.js';
import { today, fmtDate } from './plan.js';

export const KINDS = {
  sermon: { name: 'Sermon notes', short: 'Sermon', icon: '⛪', title: 'Sermon title', body: 'Main points, verses, and what God is saying to you…' },
  devotion: { name: 'Devotion', short: 'Devotion', icon: '🕯️', title: 'Title or passage', body: 'What did you read? What is God showing you? How will you respond?' },
  letter: { name: 'Letter to God', short: 'Letter', icon: '💌', title: 'Dear Lord…', body: 'Pour out your heart to Him…' },
  note: { name: 'Note', short: 'Note', icon: '📝', title: 'Title', body: 'Write anything…' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => (crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
const now = () => new Date().toISOString();
const list = () => (state.notebook ||= []);
const live = () => list().filter((n) => !n.deleted);
const byId = (id) => list().find((n) => n.id === id);
const isEmpty = (n) => !n.title?.trim() && !n.body?.trim() && !n.speaker?.trim() && !n.place?.trim();
export const count = () => live().filter((n) => !isEmpty(n)).length;

let deps = { app: null, toast: () => {}, refs: () => [], tabs: null };
export function init(d) { deps = { ...deps, ...d }; }

let filter = '';
let query = '';

const BOOK_ICON = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>';
const BACK = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';

export function render(a, b) {
  if (a === 'new') {
    const t = now();
    const n = { id: uid(), kind: KINDS[b] ? b : 'note', title: '', date: today(), speaker: '', place: '', body: '', createdAt: t, updatedAt: t, deleted: false };
    list().push(n); save();
    history.replaceState(null, '', `#/notebook/${n.id}`);
    return editor(n);
  }
  if (a) { const n = byId(a); if (n && !n.deleted) return editor(n); history.replaceState(null, '', '#/notebook'); }
  return listView();
}

// Leaving an untouched new page shouldn't leave an empty entry behind
function sweep() {
  let changed = false;
  for (const n of list()) if (!n.deleted && isEmpty(n) && !location.hash.includes(n.id)) { n.deleted = true; n.updatedAt = now(); changed = true; }
  if (changed) save();
}

function listView() {
  sweep();
  deps.tabs.hidden = false;
  const q = query.trim().toLowerCase();
  const all = live().filter((n) => !isEmpty(n));
  const shown = all.filter((n) => (!filter || n.kind === filter) && (!q || `${n.title} ${n.body} ${n.speaker} ${n.place}`.toLowerCase().includes(q)))
    .sort((x, y) => (y.date || '').localeCompare(x.date || '') || y.updatedAt.localeCompare(x.updatedAt));
  const used = Object.keys(KINDS).filter((k) => all.some((n) => n.kind === k));
  deps.app.innerHTML = `
    <header class="top rise">
      <a class="icon-btn" href="#/journey" aria-label="Back">${BACK}</a>
      <div style="flex:1"><div class="eyebrow">Your words</div><h1 class="h1">Notebook</h1></div>
    </header>
    <div class="nb-new rise">${Object.entries(KINDS).map(([k, v]) => `<a class="nb-newbtn" href="#/notebook/new/${k}"><span>${v.icon}</span><b>${esc(v.name)}</b></a>`).join('')}</div>
    ${all.length ? `
      <input class="field nb-search rise" id="nb-q" type="search" placeholder="Search your notebook" value="${esc(query)}" autocomplete="off">
      ${used.length > 1 ? `<div class="emo-filter rise">
        <button class="${!filter ? 'on' : ''}" data-nb="filter" data-k="">All <small>${all.length}</small></button>
        ${used.map((k) => `<button class="${filter === k ? 'on' : ''}" data-nb="filter" data-k="${k}">${KINDS[k].icon} ${esc(KINDS[k].short)} <small>${all.filter((n) => n.kind === k).length}</small></button>`).join('')}
      </div>` : ''}
      <div class="nb-list" id="nb-list">${shown.map(card).join('') || '<p class="help" style="text-align:center">Nothing matches.</p>'}</div>`
    : `<div class="empty rise"><div style="font-size:42px">📖</div><b>Your notebook is empty</b><p class="muted">Take sermon notes on Sunday, write a longer devotion, or a letter to God. Bible references you write become links.</p></div>`}`;
}

function card(n) {
  const k = KINDS[n.kind] || KINDS.note;
  const snippet = (n.body || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const meta = [fmtDate(n.date || n.createdAt.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' }), n.kind === 'sermon' ? n.speaker : ''].filter(Boolean).join(' · ');
  return `<a class="card nb-card rise" href="#/notebook/${n.id}">
    <div class="nb-kind">${k.icon} ${esc(k.short)}</div>
    <b>${esc(n.title || (n.kind === 'letter' ? 'Dear Lord' : snippet.slice(0, 50) || 'Untitled'))}</b>
    ${snippet ? `<p>${esc(snippet)}${n.body.length > 140 ? '…' : ''}</p>` : ''}
    <small>${esc(meta)}</small>
  </a>`;
}

function refChips(text) {
  const rs = deps.refs(text || '');
  return rs.length ? `<div class="eyebrow" style="margin-top:14px">Passages</div><div class="ref-chips">${rs.map((r) => `<a class="ref-chip" href="${r.href}">${BOOK_ICON}${esc(r.label)}</a>`).join('')}</div>` : '';
}

let current = null;
let timer = 0;
function flush() { if (timer) { clearTimeout(timer); timer = 0; save(); } }
document.addEventListener('visibilitychange', flush);
addEventListener('hashchange', () => { flush(); });

function editor(n) {
  current = n.id;
  deps.tabs.hidden = true;
  const k = KINDS[n.kind] || KINDS.note;
  deps.app.innerHTML = `
    <header class="top nb-top">
      <a class="icon-btn" href="#/notebook" aria-label="Back to notebook">${BACK}</a>
      <div class="seg-ctl nb-kinds">${Object.entries(KINDS).map(([key, v]) => `<button class="${n.kind === key ? 'on' : ''}" data-nb="kind" data-k="${key}" title="${esc(v.name)}">${v.icon}<span>${esc(v.short)}</span></button>`).join('')}</div>
    </header>
    <div class="nb-editor">
      <input class="nb-title" id="nb-title" data-nbf="title" type="text" placeholder="${esc(k.title)}" value="${esc(n.title)}" maxlength="140" autocomplete="off">
      <div class="nb-meta">
        <input type="date" data-nbf="date" value="${esc(n.date || today())}" aria-label="Date">
        ${n.kind === 'sermon' ? `<input type="text" data-nbf="speaker" placeholder="Speaker" value="${esc(n.speaker)}" maxlength="80" autocomplete="off">
        <input type="text" data-nbf="place" placeholder="Church or event" value="${esc(n.place)}" maxlength="80" autocomplete="off">` : ''}
      </div>
      <textarea class="nb-body" id="nb-body" data-nbf="body" placeholder="${esc(k.body)}">${esc(n.body)}</textarea>
      <div id="nb-refs">${refChips(`${n.title}\n${n.body}`)}</div>
      <div class="nb-actions">
        <span class="muted nb-saved" id="nb-saved">${n.body || n.title ? 'Saved on this phone' : ''}</span>
        <button class="btn small" data-nb="share">Share</button>
        <button class="btn small" data-nb="delete">Delete</button>
      </div>
    </div>`;
  const body = deps.app.querySelector('#nb-body');
  grow(body, false);
  document.fonts?.ready.then(() => grow(body, false));
  if (isEmpty(n)) setTimeout(() => deps.app.querySelector(n.kind === 'letter' ? '#nb-body' : '#nb-title')?.focus(), 300);
}

const onNotebook = () => location.hash.startsWith('#/notebook');

// Grow the page with the text without the screen jumping: measuring a textarea
// briefly shrinks it, which used to scroll the page and hide the line being typed.
// Then make sure the line being typed sits above the keyboard.
function grow(el, follow) {
  const y = window.scrollY;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
  window.scrollTo(0, y);
  if (!follow) return;
  const vv = window.visualViewport;
  const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  // where the caret is: measure the text before it with a hidden twin
  const twin = document.createElement('div');
  const cs = getComputedStyle(el);
  for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'paddingRight', 'boxSizing']) twin.style[k] = cs[k];
  Object.assign(twin.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: `${el.clientWidth}px`, left: '-9999px', top: '0' });
  twin.textContent = el.value.slice(0, el.selectionEnd ?? el.value.length) + '\u200b';
  document.body.appendChild(twin);
  const caretY = el.getBoundingClientRect().top + twin.scrollHeight;
  twin.remove();
  const lh = parseFloat(cs.lineHeight) || 30;
  if (caretY > viewBottom - lh * 0.6) window.scrollBy(0, caretY - viewBottom + lh * 1.6);
}

document.addEventListener('input', (e) => {
  if (!onNotebook()) return;
  if (e.target.id === 'nb-q') {
    query = e.target.value;
    const pos = e.target.selectionStart;
    listView();
    const q = document.getElementById('nb-q'); q.focus(); q.setSelectionRange(pos, pos);
    return;
  }
  const el = e.target.closest('[data-nbf]');
  const n = current && byId(current);
  if (!el || !n) return;
  n[el.dataset.nbf] = el.value; n.updatedAt = now();
  if (el.id === 'nb-body') grow(el, true);
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = 0; save();
    const s = document.getElementById('nb-saved'); if (s) s.textContent = 'Saved on this phone';
    const r = document.getElementById('nb-refs'); if (r) r.innerHTML = refChips(`${n.title}\n${n.body}`);
  }, 500);
});

document.addEventListener('click', async (e) => {
  if (!onNotebook() || e.target.closest('.overlay')) return;
  const el = e.target.closest('[data-nb]');
  if (!el) return;
  const a = el.dataset.nb;
  if (a === 'filter') { filter = el.dataset.k; listView(); return; }
  const n = current && byId(current);
  if (!n) return;
  if (a === 'kind') {
    flush();
    n.kind = el.dataset.k; n.updatedAt = now(); save();
    const y = scrollY; editor(n); window.scrollTo(0, y);
    return;
  }
  if (a === 'delete') {
    if (!isEmpty(n) && !confirm('Delete this page? This can’t be undone.')) return;
    n.deleted = true; n.updatedAt = now(); save();
    deps.toast('Deleted');
    location.hash = '#/notebook';
    return;
  }
  if (a === 'share') {
    flush();
    const k = KINDS[n.kind] || KINDS.note;
    const head = [n.title || k.name, n.kind === 'sermon' ? [n.speaker, n.place].filter(Boolean).join(' · ') : '', fmtDate(n.date || today(), { month: 'long', day: 'numeric', year: 'numeric' })].filter(Boolean).join('\n');
    const text = `${head}\n\n${n.body || ''}`.trim();
    const Sh = window.Capacitor?.Plugins?.Share;
    try {
      if (Sh) await Sh.share({ title: n.title || k.name, text, dialogTitle: 'Share' });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); deps.toast('Copied'); }
    } catch {}
  }
});

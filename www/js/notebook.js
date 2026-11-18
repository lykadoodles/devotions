// Notebook: long-form writing that isn't tied to one verse. Sermon notes,
// devotions, letters to God, or anything else. Works with or without the planner.
// Records are sync-ready like the planner's: UUID, updatedAt, soft delete.
import { state, save } from './store.js';
import { today, fmtDate } from './plan.js';
import * as Images from './images.js';

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
const pics = (n) => (n.images ||= []);
const isEmpty = (n) => !n.title?.trim() && !n.body?.trim() && !n.speaker?.trim() && !n.place?.trim() && !(n.images || []).length;
export const count = () => live().filter((n) => !isEmpty(n)).length;

let deps = { app: null, toast: () => {}, refs: () => [], tabs: null };
export function init(d) { deps = { ...deps, ...d }; }

let filter = '';
let query = '';

const BOOK_ICON = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>';
const BACK = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
const SHARE = '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
const TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>';
const PIC = '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CAL = '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

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
  loadImgs(deps.app);
}

// fills <img data-img> with the saved image
function loadImgs(root) {
  root.querySelectorAll('img[data-img]').forEach(async (img) => { const u = await Images.url(img.dataset.img); if (u) img.src = u; else img.closest('.nb-pic')?.classList.add('missing'); });
}

function gallery(n) {
  return pics(n).map((im) => `<button class="nb-pic" data-nb="pic" data-id="${im.id}" style="aspect-ratio:${im.w || 4}/${im.h || 3}" aria-label="Open image"><img data-img="${im.id}" alt=""></button>`).join('');
}
function redrawGallery(n) {
  const g = document.getElementById('nb-gallery');
  if (g) { g.innerHTML = gallery(n); loadImgs(g); }
  document.querySelector('.nb-editor')?.classList.toggle('has-pics', pics(n).length > 0);
  const body = document.getElementById('nb-body'); if (body) grow(body, false);
}

async function addImages(n, files) {
  const imgs = files.filter((f) => f && f.type?.startsWith('image/'));
  if (!imgs.length) return;
  const s = document.getElementById('nb-saved'); if (s) s.textContent = 'Adding image…';
  let added = 0;
  for (const f of imgs) {
    try { pics(n).push(await Images.add(f)); added++; } catch (e) { console.warn('image', e); }
  }
  n.updatedAt = now(); save();
  redrawGallery(n);
  if (s) s.textContent = added ? 'Saved on this phone' : '';
  if (!added) deps.toast('Couldn’t add that image');
  else document.getElementById('nb-gallery')?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Full-screen view of one image: share it or remove it from the page
function viewer(n, id) {
  const o = document.createElement('div');
  o.className = 'overlay nb-viewer';
  o.innerHTML = `<img data-img="${id}" alt="">
    <div class="nb-vbar">
      <button class="nb-ibtn" data-v="close" aria-label="Close">${CLOSE}</button>
      <span style="flex:1"></span>
      <button class="nb-ibtn" data-v="share" aria-label="Share image">${SHARE}</button>
      <button class="nb-ibtn" data-v="remove" aria-label="Remove image">${TRASH}</button>
    </div>`;
  document.body.appendChild(o);
  loadImgs(o);
  o.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-v]')?.dataset.v;
    if (!v) { if (e.target === o) o.remove(); return; }
    if (v === 'close') return o.remove();
    if (v === 'remove') {
      if (!confirm('Remove this image from the page?')) return;
      n.images = pics(n).filter((x) => x.id !== id); n.updatedAt = now(); save();
      Images.remove(id); o.remove(); redrawGallery(n); return;
    }
    if (v === 'share') {
      try {
        const uri = await Images.shareable(id, 'lamp-image');
        const Sh = window.Capacitor?.Plugins?.Share;
        if (uri && Sh) await Sh.share({ files: [uri], dialogTitle: 'Share image' });
      } catch {}
    }
  });
}

function card(n) {
  const k = KINDS[n.kind] || KINDS.note;
  const snippet = (n.body || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const meta = [fmtDate(n.date || n.createdAt.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' }), n.kind === 'sermon' ? n.speaker : ''].filter(Boolean).join(' · ');
  const im = (n.images || [])[0];
  return `<a class="card nb-card rise ${im ? 'has-pic' : ''}" href="#/notebook/${n.id}">
    ${im ? `<img class="nb-thumb" data-img="${im.id}" alt="" loading="lazy">${n.images.length > 1 ? `<span class="nb-thumbn">+${n.images.length - 1}</span>` : ''}` : ''}
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
    <header class="nb-bar">
      <a class="nb-ibtn" href="#/notebook" aria-label="Back to notebook">${BACK}</a>
      <span class="nb-crumb">Notebook</span>
      <button class="nb-ibtn" data-nb="share" aria-label="Share">${SHARE}</button>
      <button class="nb-ibtn" data-nb="delete" aria-label="Delete">${TRASH}</button>
    </header>
    <div class="nb-editor ${pics(n).length ? 'has-pics' : ''}">
      <input class="nb-title" id="nb-title" data-nbf="title" type="text" placeholder="${esc(k.title)}" value="${esc(n.title)}" maxlength="140" autocomplete="off">
      <div class="nb-kinds" role="radiogroup" aria-label="Kind of page">${Object.entries(KINDS).map(([key, v]) => `<button class="nb-kchip ${n.kind === key ? 'on' : ''}" data-nb="kind" data-k="${key}" role="radio" aria-checked="${n.kind === key}"><span aria-hidden="true">${v.icon}</span>${esc(v.short)}</button>`).join('')}</div>
      <div class="nb-meta">
        <label class="nb-date">${CAL}<input type="date" data-nbf="date" value="${esc(n.date || today())}" aria-label="Date"></label>
        <label class="nb-date nb-addimg" title="Add an image">${PIC}<span>Image</span><input type="file" accept="image/*" multiple hidden id="nb-file"></label>
        ${n.kind === 'sermon' ? `<input class="nb-mfield" type="text" data-nbf="speaker" placeholder="Speaker" value="${esc(n.speaker)}" maxlength="80" autocomplete="off">
        <input class="nb-mfield" type="text" data-nbf="place" placeholder="Church or event" value="${esc(n.place)}" maxlength="80" autocomplete="off">` : ''}
      </div>
      <textarea class="nb-body" id="nb-body" data-nbf="body" placeholder="${esc(k.body)}">${esc(n.body)}</textarea>
      <div class="nb-gallery" id="nb-gallery">${gallery(n)}</div>
      <div id="nb-refs">${refChips(`${n.title}\n${n.body}`)}</div>
      <p class="nb-saved" id="nb-saved">${n.body || n.title ? 'Saved on this phone' : ''}</p>
    </div>`;
  const body = deps.app.querySelector('#nb-body');
  grow(body, false);
  document.fonts?.ready.then(() => grow(body, false));
  loadImgs(deps.app);
  deps.app.querySelector('#nb-file').addEventListener('change', (e) => { addImages(n, [...(e.target.files || [])]); e.target.value = ''; });
  // Paste a copied image or screenshot into the title or text
  for (const el of deps.app.querySelectorAll('#nb-title, #nb-body')) el.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    addImages(n, files);
  });
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
  if (a === 'pic') { viewer(n, el.dataset.id); return; }
  if (a === 'delete') {
    if (!isEmpty(n) && !confirm('Delete this page? This can’t be undone.')) return;
    pics(n).forEach((im) => Images.remove(im.id));
    n.images = [];
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
      const files = [];
      for (const [i, im] of pics(n).entries()) { try { const u = await Images.shareable(im.id, `lamp-page-${i + 1}`); if (u) files.push(u); } catch {} }
      if (Sh) await Sh.share({ title: n.title || k.name, text, ...(files.length ? { files } : {}), dialogTitle: 'Share' });
      else if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); deps.toast('Copied'); }
    } catch {}
  }
});

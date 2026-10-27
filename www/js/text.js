// Loads scripture text.
// NLT comes from Tyndale's NLT API (https://api.nlt.to) with the user's free key,
// cached on the device. WEB (World English Bible, public domain) is bundled and
// used offline or when no NLT key is set.
import { META, chapters, bookName } from './plan.js';
import { state } from './store.js';
import { NLT_KEY } from './config.js';

// The user's own key (Settings) wins; otherwise the key built into the app.
export const nltKey = () => state.nltKey || NLT_KEY;
export const hasBuiltInKey = () => !!NLT_KEY;

const webCache = {};
async function webBook(b) {
  const id = META.books[b].id;
  if (!webCache[id]) webCache[id] = fetch(`data/web/${id}.json`).then((r) => r.json());
  return webCache[id];
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function chapterTitle(ch, multi) {
  return `<h2 class="ch-title">${esc(bookName(ch.b, true))} ${META.books[ch.b].verses.length > 1 ? ch.c : ''}${
    ch.full || !multi ? '' : ` <span class="ch-range">: ${ch.v1}–${ch.v2}</span>`}</h2>`;
}

async function renderWEB(range) {
  const chs = chapters(range);
  let html = '';
  for (const ch of chs) {
    const book = await webBook(ch.b);
    const segs = book[ch.c - 1] || [];
    html += chapterTitle(ch, chs.length > 1);
    let open = null; // 'p' | 'poem'
    const close = () => { if (open === 'p') html += '</p>'; if (open === 'poem') html += '</div>'; open = null; };
    let cur = 0; // verse the current segment belongs to (v=0 continues the previous verse)
    for (const [kind, v, text] of segs) {
      const inRange = (n) => n >= ch.v1 && n <= ch.v2;
      if (kind === 'h') { if (inRange(v)) { close(); html += `<h3 class="sup-title">${esc(text)}</h3>`; } continue; }
      if (kind === '/' || kind === '-') { if (inRange(v)) close(); continue; }
      if (v) cur = v;
      if (!inRange(cur)) continue;
      const verse = v;
      const vn = verse ? `<sup class="vn">${verse}</sup>` : '';
      if (kind === 'p') {
        if (open !== 'p') { close(); html += '<p>'; open = 'p'; }
        html += `${vn}${esc(text)}`;
      } else {
        if (open !== 'poem') { close(); html += '<div class="poem">'; open = 'poem'; }
        html += `<span class="line">${vn}${esc(text)}</span>`;
      }
    }
    close();
  }
  return html;
}

// ---- NLT ----
const API = 'https://api.nlt.to/api/passages';
const CACHE = 'nlt-v1';

function nltRef(ch) {
  const name = bookName(ch.b, true);
  return ch.full ? `${name} ${ch.c}` : `${name} ${ch.c}:${ch.v1}-${ch.v2}`;
}

async function cached(ref) {
  try { const c = await caches.open(CACHE); const r = await c.match(`/nlt/${encodeURIComponent(ref)}`); if (r) return r.text(); } catch {}
  try { return localStorage.getItem(`nlt:${ref}`); } catch {}
  return null;
}
async function store(ref, html) {
  try { const c = await caches.open(CACHE); await c.put(`/nlt/${encodeURIComponent(ref)}`, new Response(html)); return; } catch {}
  try { localStorage.setItem(`nlt:${ref}`, html); } catch {}
}

function cleanNLT(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const root = doc.querySelector('#bibletext') || doc.querySelector('.bibletext') || doc.body;
  root.querySelectorAll('script,style,link,meta,title,form,input,button,img,iframe,.tn,.a-tn,a.a-tn,span.tn').forEach((n) => n.remove());
  root.querySelectorAll('.vn').forEach((n) => {
    const s = doc.createElement('sup'); s.className = 'vn'; s.textContent = n.textContent.trim(); n.replaceWith(s);
  });
  const ALLOWED = new Set(['P', 'H2', 'H3', 'H4', 'SUP', 'SPAN', 'BR', 'EM', 'I', 'B', 'STRONG', 'DIV', 'SECTION']);
  const walk = (el) => {
    for (const child of [...el.children]) {
      walk(child);
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
      for (const a of [...child.attributes]) if (a.name !== 'class') child.removeAttribute(a.name);
    }
  };
  walk(root);
  const text = root.textContent.replace(/\s+/g, ' ').trim();
  if (text.length < 15) throw new Error('Empty NLT response');
  return root.innerHTML;
}

async function fetchNLT(ch) {
  const ref = nltRef(ch);
  const hit = await cached(ref);
  if (hit) return hit;
  const url = `${API}?ref=${encodeURIComponent(ref)}&version=NLT&key=${encodeURIComponent(nltKey())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Your NLT key was rejected' : `NLT server error ${res.status}`);
  const html = cleanNLT(await res.text());
  await store(ref, html);
  return html;
}

async function renderNLT(range) {
  const chs = chapters(range);
  const parts = await Promise.all(chs.map(fetchNLT));
  return parts.map((p, i) => `<section class="nlt">${chapterTitle(chs[i], chs.length > 1)}${p}</section>`).join('');
}

export const NLT_NOTICE = 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.';
export const WEB_NOTICE = 'World English Bible (WEB). Public domain.';

// Returns { html, translation, note }
export async function passage(range) {
  if (state.translation === 'NLT') {
    if (!nltKey()) {
      return { html: await renderWEB(range), translation: 'WEB', note: 'Add your free NLT key in Settings to read in the NLT. Showing the World English Bible for now.' };
    }
    try {
      return { html: await renderNLT(range), translation: 'NLT' };
    } catch (e) {
      return { html: await renderWEB(range), translation: 'WEB', note: `Couldn't load the NLT (${e.message || 'offline'}). Showing the World English Bible instead.` };
    }
  }
  return { html: await renderWEB(range), translation: 'WEB' };
}

// Warm the NLT cache for upcoming readings so they work offline.
export async function prefetch(ranges) {
  if (state.translation !== 'NLT' || !nltKey() || !navigator.onLine) return;
  for (const r of ranges) for (const ch of chapters(r)) { try { await fetchNLT(ch); } catch { return; } }
}

export async function testKey(key) {
  const url = `${API}?ref=${encodeURIComponent('John 3:16')}&version=NLT&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = cleanNLT(await res.text());
  return html;
}

// Plain text of a short passage (for the Rhema card and sharing).
export async function verseText(range) {
  if (state.translation === 'NLT' && nltKey()) {
    try {
      const parts = await Promise.all(chapters(range).map(fetchNLT));
      const text = parts.map((h) => {
        const d = new DOMParser().parseFromString(`<div>${h}</div>`, 'text/html');
        d.querySelectorAll('h1,h2,h3,h4,sup,.vn,.ch-title,.tn,.a-tn').forEach((n) => n.remove());
        return d.body.textContent;
      }).join(' ').replace(/\s+/g, ' ').trim();
      if (text.length > 5) return { text, translation: 'NLT' };
    } catch {}
  }
  let out = '';
  for (const ch of chapters(range)) {
    const book = await webBook(ch.b);
    let cur = 0;
    for (const [kind, v, t] of book[ch.c - 1] || []) {
      if (kind !== 'p' && kind !== 'l') continue;
      if (v) cur = v;
      if (cur >= ch.v1 && cur <= ch.v2) out += t + ' ';
    }
  }
  return { text: out.replace(/\s+/g, ' ').trim(), translation: 'WEB' };
}

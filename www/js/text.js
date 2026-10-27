// Loads scripture text in the reader's chosen translation.
//
// Built in (public domain, work offline):
//   BSB  Berean Standard Bible   (public domain since 2023, CC0)
//   KJV  King James Version      (1769)
//   WEB  World English Bible
// Online (official APIs, each needs a free key):
//   NLT  Tyndale's NLT API  https://api.nlt.to   (passages saved on the phone)
//   ESV  Crossway's ESV API https://api.esv.org  (max 500 verses stored, per Crossway's terms)
import { META, chapters, bookName } from './plan.js';
import { state } from './store.js';
import { NLT_KEY, ESV_KEY } from './config.js';

export const TRANSLATIONS = {
  NLT: { name: 'New Living Translation', short: 'NLT', online: true, desc: 'Clear, modern English' },
  ESV: { name: 'English Standard Version', short: 'ESV', online: true, desc: 'Word-for-word, modern' },
  BSB: { name: 'Berean Standard Bible', short: 'BSB', online: false, desc: 'Modern and accurate · offline' },
  KJV: { name: 'King James Version', short: 'KJV', online: false, desc: 'Classic 1769 English · offline' },
  WEB: { name: 'World English Bible', short: 'WEB', online: false, desc: 'Modern, public domain · offline' },
};
export const TRANSLATION_ORDER = ['NLT', 'ESV', 'BSB', 'KJV', 'WEB'];
const FALLBACK = 'BSB'; // used when an online translation is unavailable

// The user's own key (Settings) wins; otherwise a key built into the app.
export const nltKey = () => state.nltKey || NLT_KEY;
export const esvKey = () => state.esvKey || ESV_KEY;
export const hasBuiltInKey = (t = 'NLT') => !!(t === 'ESV' ? ESV_KEY : NLT_KEY);
const keyFor = (t) => (t === 'ESV' ? esvKey() : t === 'NLT' ? nltKey() : '');
export const current = () => (TRANSLATIONS[state.translation] ? state.translation : 'NLT');
export const wantsOnline = () => TRANSLATIONS[current()].online && !!keyFor(current());

export const NOTICES = {
  NLT: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
  ESV: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. www.esv.org',
  BSB: 'The Holy Bible, Berean Standard Bible, BSB. Public domain. berean.bible',
  KJV: 'King James Version (1769). Public domain.',
  WEB: 'World English Bible (WEB). Public domain.',
};
// kept for older imports
export const NLT_NOTICE = NOTICES.NLT;
export const WEB_NOTICE = NOTICES.WEB;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const withTimeout = (promise, ms, msg = 'timed out') =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

function chapterTitle(ch, multi) {
  return `<h2 class="ch-title">${esc(bookName(ch.b, true))} ${META.books[ch.b].verses.length > 1 ? ch.c : ''}${
    ch.full || !multi ? '' : ` <span class="ch-range">: ${ch.v1}–${ch.v2}</span>`}</h2>`;
}

// ---------- built-in translations ----------
const localCache = {};
function localBook(code, b) {
  const id = META.books[b].id;
  const key = `${code}/${id}`;
  if (!localCache[key]) localCache[key] = fetch(`data/${code.toLowerCase()}/${id}.json`).then((r) => r.json());
  return localCache[key];
}

async function renderLocal(range, code) {
  const chs = chapters(range);
  let html = '';
  for (const ch of chs) {
    const book = await localBook(code, ch.b);
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
      const vn = v ? `<sup class="vn">${v}</sup>` : '';
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

async function localText(range, code) {
  let out = '';
  for (const ch of chapters(range)) {
    const book = await localBook(code, ch.b);
    let cur = 0;
    for (const [kind, v, t] of book[ch.c - 1] || []) {
      if (kind !== 'p' && kind !== 'l') continue;
      if (v) cur = v;
      if (cur >= ch.v1 && cur <= ch.v2) out += t + ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- on-device storage for online passages ----------
// Saved in the app's private storage on the phone (Capacitor Filesystem), so
// they survive restarts and WebView cache clears. Browser: Cache API / localStorage.
const FS = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Filesystem : null);
const memo = new Map();
const fileFor = (t, ref) => `${t.toLowerCase()}/${ref.replace(/[^a-z0-9]+/gi, '_')}.html`;
const memoKey = (t, ref) => `${t}:${ref}`;

async function cached(t, ref) {
  const mk = memoKey(t, ref);
  if (memo.has(mk)) return memo.get(mk);
  const fs = FS();
  if (fs) {
    try {
      const r = await withTimeout(fs.readFile({ path: fileFor(t, ref), directory: 'DATA', encoding: 'utf8' }), 2000);
      if (r?.data) { memo.set(mk, r.data); return r.data; }
    } catch {}
  }
  try {
    const hit = await withTimeout((async () => {
      const c = await caches.open(`${t.toLowerCase()}-v1`); const r = await c.match(`/${t}/${encodeURIComponent(ref)}`); return r ? r.text() : null;
    })(), 1500);
    if (hit) { memo.set(mk, hit); return hit; }
  } catch {}
  try { const v = localStorage.getItem(`${t.toLowerCase()}:${ref}`); if (v) { memo.set(mk, v); return v; } } catch {}
  return null;
}

async function removeSaved(t, ref) {
  memo.delete(memoKey(t, ref));
  const fs = FS();
  if (fs) { try { await fs.deleteFile({ path: fileFor(t, ref), directory: 'DATA' }); } catch {} }
  try { const c = await caches.open(`${t.toLowerCase()}-v1`); await c.delete(`/${t}/${encodeURIComponent(ref)}`); } catch {}
  try { localStorage.removeItem(`${t.toLowerCase()}:${ref}`); } catch {}
}

// Crossway allows storing at most 500 ESV verses; keep a small rolling window.
const ESV_LIMIT = 480;
function esvIndex() { try { return JSON.parse(localStorage.getItem('esv.idx') || '[]'); } catch { return []; } }
function saveEsvIndex(idx) { try { localStorage.setItem('esv.idx', JSON.stringify(idx)); } catch {} }
async function trackEsv(ref, verses) {
  let idx = esvIndex().filter(([r]) => r !== ref);
  idx.push([ref, verses, Date.now()]);
  let total = idx.reduce((a, [, n]) => a + n, 0);
  while (total > ESV_LIMIT && idx.length > 1) {
    const [old, n] = idx.shift();
    total -= n;
    await removeSaved('ESV', old);
  }
  saveEsvIndex(idx);
}

async function store(t, ref, html, verses) {
  memo.set(memoKey(t, ref), html);
  if (t === 'ESV') await trackEsv(ref, verses);
  const fs = FS();
  if (fs) {
    try { await withTimeout(fs.writeFile({ path: fileFor(t, ref), data: html, directory: 'DATA', encoding: 'utf8', recursive: true }), 3000); return; } catch {}
  }
  try { await withTimeout((async () => { const c = await caches.open(`${t.toLowerCase()}-v1`); await c.put(`/${t}/${encodeURIComponent(ref)}`, new Response(html)); })(), 2000); return; } catch {}
  try { localStorage.setItem(`${t.toLowerCase()}:${ref}`, html); } catch {}
}

export async function savedCount(t = 'NLT') {
  const fs = FS();
  if (fs) { try { const r = await fs.readdir({ path: t.toLowerCase(), directory: 'DATA' }); return r.files.length; } catch { return 0; } }
  return [...memo.keys()].filter((k) => k.startsWith(`${t}:`)).length;
}

// ---------- cleaning API HTML ----------
function cleanHTML(raw, t) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const root = doc.querySelector('#bibletext') || doc.querySelector('.bibletext') || doc.body;
  root.querySelectorAll('script,style,link,meta,title,form,input,button,img,iframe,.tn,.a-tn,a.a-tn,span.tn,.footnote,.footnotes,.audio,.extra_text,h2').forEach((n) => n.remove());
  // verse numbers: NLT uses .vn; ESV uses b.verse-num / b.chapter-num
  root.querySelectorAll('.vn, .verse-num, .chapter-num').forEach((n) => {
    const s = doc.createElement('sup'); s.className = 'vn';
    s.textContent = n.classList.contains('chapter-num') ? '1' : n.textContent.replace(/[^\d]/g, '');
    n.replaceWith(s);
  });
  root.querySelectorAll('.woc').forEach((n) => n.replaceWith(...n.childNodes)); // words of Christ: plain
  const ALLOWED = new Set(['P', 'H3', 'H4', 'SUP', 'SPAN', 'BR', 'EM', 'I', 'B', 'STRONG', 'DIV', 'SECTION']);
  const walk = (el) => {
    for (const child of [...el.children]) {
      walk(child);
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
      for (const a of [...child.attributes]) if (a.name !== 'class') child.removeAttribute(a.name);
    }
  };
  walk(root);
  const text = root.textContent.replace(/\s+/g, ' ').trim();
  if (text.length < 15) throw new Error(`Empty ${t} response`);
  return root.innerHTML;
}

// ---------- online fetchers ----------
const refFor = (ch) => {
  const name = bookName(ch.b, true);
  return ch.full ? `${name} ${ch.c}` : `${name} ${ch.c}:${ch.v1}-${ch.v2}`;
};

async function requestNLT(ref, key) {
  const url = `https://api.nlt.to/api/passages?ref=${encodeURIComponent(ref)}&version=NLT&key=${encodeURIComponent(key)}`;
  const res = await withTimeout(fetch(url), 10000, 'the NLT server took too long');
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'your NLT key was rejected' : `NLT server error ${res.status}`);
  return cleanHTML(await res.text(), 'NLT');
}

async function requestESV(ref, key) {
  const params = new URLSearchParams({
    q: ref, 'include-passage-references': 'false', 'include-footnotes': 'false', 'include-footnote-body': 'false',
    'include-audio-link': 'false', 'include-short-copyright': 'false', 'include-copyright': 'false',
    'include-headings': 'true', 'include-first-verse-numbers': 'true', 'include-verse-numbers': 'true',
  });
  const res = await withTimeout(fetch(`https://api.esv.org/v3/passage/html/?${params}`, { headers: { Authorization: `Token ${key}` } }), 10000, 'the ESV server took too long');
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'your ESV key was rejected' : `ESV server error ${res.status}`);
  const data = await res.json();
  return cleanHTML((data.passages || []).join(''), 'ESV');
}

async function fetchOnline(t, ch) {
  const ref = refFor(ch);
  const hit = await cached(t, ref);
  if (hit) return hit;
  const key = keyFor(t);
  if (!key) throw new Error(`no ${t} key`);
  const html = t === 'ESV' ? await requestESV(ref, key) : await requestNLT(ref, key);
  await store(t, ref, html, ch.v2 - ch.v1 + 1);
  return html;
}

const htmlToText = (h) => {
  const d = new DOMParser().parseFromString(`<div>${h}</div>`, 'text/html');
  d.querySelectorAll('h1,h2,h3,h4,sup,.vn,.ch-title').forEach((n) => n.remove());
  return d.body.textContent;
};

// ---------- public API ----------
// Returns { html, translation, note }
export async function passage(range) {
  const t = current();
  if (!TRANSLATIONS[t].online) return { html: await renderLocal(range, t), translation: t };
  if (!keyFor(t)) {
    return { html: await renderLocal(range, FALLBACK), translation: FALLBACK,
      note: `Add a free ${t} key in Settings to read in the ${t}. Showing the Berean Standard Bible for now.` };
  }
  try {
    const chs = chapters(range);
    const parts = await Promise.all(chs.map((ch) => fetchOnline(t, ch)));
    return { html: parts.map((p, i) => `<section class="api-text">${chapterTitle(chs[i], chs.length > 1)}${p}</section>`).join(''), translation: t };
  } catch (e) {
    return { html: await renderLocal(range, FALLBACK), translation: FALLBACK,
      note: `Couldn't load the ${t} (${e.message || 'offline'}). Showing the Berean Standard Bible instead.` };
  }
}

// Plain text of a short passage (Rhema card, sharing). `online:false` = instant built-in text.
export async function verseText(range, { online = true } = {}) {
  if (online && wantsOnline()) {
    try { return await verseTextOnline(range); } catch {}
  }
  const t = TRANSLATIONS[current()].online ? FALLBACK : current();
  return { text: await localText(range, t), translation: t };
}

export async function verseTextOnline(range) {
  const t = current();
  const parts = await withTimeout(Promise.all(chapters(range).map((ch) => fetchOnline(t, ch))), 12000);
  const text = parts.map(htmlToText).join(' ').replace(/\s+/g, ' ').trim();
  if (text.length < 5) throw new Error('empty');
  return { text, translation: t };
}

// Download upcoming readings ahead of time (skips anything already saved).
// ESV is limited to a few hundred verses by Crossway's terms, so only the first
// ~400 verses of the list are fetched for ESV.
let prefetching = false;
export async function prefetch(ranges) {
  const t = current();
  if (prefetching || !wantsOnline() || !navigator.onLine) return;
  prefetching = true;
  let budget = t === 'ESV' ? 400 : Infinity;
  try {
    for (const r of ranges) for (const ch of chapters(r)) {
      budget -= ch.v2 - ch.v1 + 1;
      if (budget < 0) return;
      try { await fetchOnline(t, ch); } catch { return; }
    }
  } finally { prefetching = false; }
}

export async function testKey(key, t = 'NLT') {
  return t === 'ESV' ? requestESV('John 3:16', key) : requestNLT('John 3:16', key);
}

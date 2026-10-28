import {
  loadPlan, META, PLAN, DAYS, PR_BOOK, PS_BOOK, TRACKS, TRACK_ORDER, today, addDays, diffDays, fmtDate,
  planDayFor, readingsFor, readingFor, label, verseCount, minutes, proverbsChapters,
  BOOK_TOTALS, BOOK_DAYS, DAY_BOOK_VERSES, TOTAL_VERSES, chapters,
} from './plan.js';
import { state, load, save, reset, isDone, setDone, streak, longestStreak, isLit, LIT, setLitHook } from './store.js';
import { passage, prefetch, savedCount, testKey, hasBuiltInKey, verseText, verseTextOnline, wantsOnline, NOTICES, TRANSLATIONS, TRANSLATION_ORDER, current as currentTranslation } from './text.js';
import { rhemaRange, dailyIndex, randomIndex } from './rhema.js';
import { loadDevo, devoFor } from './devo.js';
import { openingFor, closingPrayer } from './prayers.js';
import * as music from './music.js';
import * as PL from './prayerlist.js';
import * as J from './journal.js';

const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const P = () => window.Capacitor?.Plugins || {};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- icons ----------
const ICON = {
  scroll: '<path d="M8 3h11a2 2 0 0 1 2 2v1h-4"/><path d="M17 6v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h11"/><path d="M8 3a2 2 0 0 0-2 2v12"/><path d="M10 8h4M10 12h4"/>',
  cross: '<path d="M12 3v18M7 8h10"/>',
  harp: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-15-1 9-7 15-15 15z"/><path d="M5 19l8-8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  aminus: '<path d="M4 18l5-12 5 12M6 14h6M16 12h5"/>',
  aplus: '<path d="M4 18l5-12 5 12M6 14h6M16 12h5M18.5 9.5v5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  flame: '<path d="M12 3c1.6 3.3 5 5.4 5 10a5 5 0 0 1-10 0c0-2.4 1-3.6 2-5 .3 1.6 1.2 2.6 2 3 0-3-.8-5.4 1-8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  musicoff: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 3l18 18"/>',
  pray: '<path d="M12 3c-1.5 2-3 4.5-3 8v6l-3 4h12l-3-4v-6c0-3.5-1.5-6-3-8z"/><path d="M12 3v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24">${ICON[n] || ''}</svg>`;

const FLAME_SVG = (cls = '') => `
<svg class="flame ${cls}" viewBox="0 0 100 130" aria-hidden="true">
  <defs>
    <radialGradient id="fg" cx="50%" cy="78%" r="70%">
      <stop offset="0" stop-color="#fff7d6"/><stop offset=".3" stop-color="#ffd166"/>
      <stop offset=".65" stop-color="#f4892f"/><stop offset="1" stop-color="#d9480f"/>
    </radialGradient>
  </defs>
  <path d="M50 4C58 27 84 42 84 78c0 27-16 48-34 48S16 105 16 78c0-20 12-31 19-47 4 14 10 20 15 22C50 37 45 21 50 4z" fill="url(#fg)"/>
  <path class="inner" d="M50 62c6 12 17 20 17 36 0 14-8 22-17 22s-17-8-17-22c0-12 11-21 17-36z" fill="#fff4c9" opacity=".95"/>
</svg>`;

const SPARKLE = (cls, style) => `<svg class="sparkle ${cls}" style="${style}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.8 6.4 2.6 9.9 12 12-9.4 2.1-11.2 5.6-12 12-.8-6.4-2.6-9.9-12-12C9.4 9.9 11.2 6.4 12 0z" fill="currentColor"/></svg>`;

// Encouragement verses (World English Bible, public domain)
const VERSES = [
  ['Your word is a lamp to my feet, and a light for my path.', 'Psalm 119:105'],
  ['Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness.', '2 Timothy 3:16'],
  ['The grass withers, the flower fades; but the word of our God stands forever.', 'Isaiah 40:8'],
  ['Man shall not live by bread alone, but by every word that proceeds out of God’s mouth.', 'Matthew 4:4'],
  ['I have hidden your word in my heart, that I might not sin against you.', 'Psalm 119:11'],
  ['Heaven and earth will pass away, but my words will not pass away.', 'Matthew 24:35'],
  ['Trust in Yahweh with all your heart, and don’t lean on your own understanding.', 'Proverbs 3:5'],
  ['Blessed is the man … his delight is in Yahweh’s law. On his law he meditates day and night.', 'Psalm 1:1–2'],
  ['For the word of God is living and active, and sharper than any two-edged sword.', 'Hebrews 4:12'],
  ['The entrance of your words gives light. It gives understanding to the simple.', 'Psalm 119:130'],
  ['His mercies don’t fail. They are new every morning. Great is your faithfulness.', 'Lamentations 3:22–23'],
  ['Be strong and courageous. Don’t be afraid … for Yahweh your God is with you wherever you go.', 'Joshua 1:9'],
];
const verseOfDay = (d = today()) => VERSES[(diffDays('2024-01-01', d) % VERSES.length + VERSES.length) % VERSES.length];

// ---------- helpers ----------
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
function haptic(kind = 'light') {
  const H = P().Haptics;
  try {
    if (H) kind === 'success' ? H.notification({ type: 'SUCCESS' }) : H.impact({ style: kind === 'heavy' ? 'HEAVY' : 'LIGHT' });
    else navigator.vibrate?.(kind === 'success' ? [15, 60, 25] : 10);
  } catch {}
}
function applyTheme() {
  const r = document.documentElement;
  if (state.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', state.theme);
  r.style.setProperty('--read-size', `${Math.round(19 * state.fontScale)}px`);
  r.setAttribute('data-readfont', state.readFont === 'sans' ? 'sans' : 'serif');
  const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]').content = dark ? '#2a5be8' : '#f4f7ff';
}
// Greetings rotate each time the app is opened (stable while navigating).
const GREETINGS = {
  late: ['Hi', 'Hello', 'Welcome back'],                  // 12–5 AM
  morning: ['New mercies', 'Good morning', 'Morning'],     // 5 AM–12 PM
  afternoon: ['Good afternoon', 'Hello', 'Welcome back'],  // 12–6 PM
  evening: ['Good evening', 'Hello', 'Welcome back'],      // 6 PM–12 AM
};
let opens = 0;
function countOpen() {
  try { opens = (Number(localStorage.getItem('lamp.opens')) || 0) + 1; localStorage.setItem('lamp.opens', String(opens)); }
  catch { opens = Math.floor(Math.random() * 3); }
}
const greeting = () => {
  const h = new Date().getHours();
  const set = GREETINGS[h < 5 ? 'late' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'];
  return set[opens % set.length];
};
const dayNum = () => planDayFor(state.startDate, today());

// ---------- progress maths ----------
function prStats() {
  let total = 0; const uniq = new Set();
  for (const date of Object.keys(state.done.pr)) {
    const [a, b] = proverbsChapters(date);
    for (let c = a; c <= b; c++) { uniq.add(c); total++; }
  }
  return { cycles: Math.floor(total / 31), partial: (total % 31) / 31, uniq: uniq.size, total };
}
function bookRead(b) {
  if (b === PR_BOOK) return Math.min(1, prStats().uniq / 31);
  let v = 0;
  for (const { track, day } of BOOK_DAYS[b]) if (isDone(track, day)) v += DAY_BOOK_VERSES[track][day - 1][b] || 0;
  return Math.min(1, v / BOOK_TOTALS[b]);
}
const bookDone = (b) => bookRead(b) >= 0.999;
function trackPct(t) {
  if (t === 'pr') { const s = prStats(); return Math.min(1, s.total / (31 * 12)); }
  return Object.keys(state.done[t]).length / DAYS;
}
function biblePct() {
  let v = 0;
  META.books.forEach((_, b) => { v += bookRead(b) * BOOK_TOTALS[b]; });
  return { pct: v / TOTAL_VERSES(), verses: Math.round(v) };
}
function missed() {
  const out = [];
  const t = today();
  const n = Math.min(dayNum() - 1, DAYS);
  for (let d = 1; d <= n; d++) {
    const date = addDays(state.startDate, d - 1);
    for (const r of readingsFor(state.startDate, date)) if (!isDone(r.track, r.key)) out.push({ ...r, date });
  }
  // Proverbs before the plan started don't count; plan days after DAYS: only proverbs
  if (dayNum() > DAYS + 1) {
    for (let date = addDays(state.startDate, DAYS); date < t; date = addDays(date, 1)) {
      if (!isDone('pr', date)) out.push({ track: 'pr', key: date, range: readingFor('pr', date).range, date });
    }
  }
  return out;
}

// ---------- badges ----------
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const BADGES = [
  { id: 'first', name: 'First Light', desc: 'Read your first portion', icon: 'spark', test: () => Object.values(state.done).some((m) => Object.keys(m).length) },
  { id: 'full', name: 'Full Lamp', desc: 'All four portions in a day', icon: 'flame', test: () => Object.keys(state.log).some(isLit) },
  { id: 's3', name: 'Kindled', desc: '3-day streak', icon: 'flame', test: () => longestStreak() >= 3 },
  { id: 's7', name: 'Week of Light', desc: '7-day streak', icon: 'flame', test: () => longestStreak() >= 7 },
  { id: 's30', name: 'Faithful Month', desc: '30-day streak', icon: 'star', test: () => longestStreak() >= 30 },
  { id: 's100', name: 'Hundredfold', desc: '100-day streak', icon: 'star', test: () => longestStreak() >= 100 },
  { id: 'early', name: 'Early Riser', desc: 'Read before 7 AM five times', icon: 'sun', test: () => state.earlyReads >= 5 },
  { id: 'pr1', name: 'Wise Start', desc: 'All 31 chapters of Proverbs', icon: 'leaf', test: () => prStats().uniq >= 31 },
  { id: 'pr6', name: 'Seeker of Wisdom', desc: 'Proverbs six times', icon: 'leaf', test: () => prStats().cycles >= 6 },
  { id: 'pr12', name: 'Twelvefold Wisdom', desc: 'Proverbs twelve times', icon: 'crown', test: () => prStats().cycles >= 12 },
  { id: 'torah', name: 'The Torah', desc: 'Genesis to Deuteronomy', icon: 'scroll', test: () => range(0, 4).every(bookDone) },
  { id: 'history', name: 'Kings & Kingdoms', desc: 'Joshua to Esther', icon: 'crown', test: () => range(5, 16).every(bookDone) },
  { id: 'gospels', name: 'The Gospels', desc: 'Matthew, Mark, Luke, John', icon: 'cross', test: () => range(39, 42).every(bookDone) },
  { id: 'letters', name: 'Paul’s Letters', desc: 'Romans to Philemon', icon: 'book', test: () => range(44, 56).every(bookDone) },
  { id: 'psalms', name: 'Songs of the Heart', desc: 'All 150 Psalms', icon: 'harp', test: () => bookDone(PS_BOOK) },
  { id: 'prophets', name: 'Voice of the Prophets', desc: 'Isaiah to Malachi', icon: 'scroll', test: () => range(22, 38).every(bookDone) },
  { id: 'nt', name: 'New Covenant', desc: 'The whole New Testament', icon: 'cross', test: () => range(39, 65).every(bookDone) },
  { id: 'ot', name: 'Old Covenant', desc: 'The whole Old Testament', icon: 'scroll', test: () => range(0, 38).every(bookDone) },
  { id: 's365', name: 'Year of Grace', desc: '365-day streak', icon: 'crown', test: () => longestStreak() >= 365 },
  { id: 'answered', name: 'He Answers', desc: 'Mark your first answered prayer', icon: 'star', test: () => PL.answered().length >= 1 },
  { id: 'intercessor', name: 'Faithful Intercessor', desc: 'Pray for requests 50 times', icon: 'pray', test: () => PL.totalPrayed() >= 50 },
  { id: 'heartnote', name: 'Treasured Word', desc: 'Write your first heart note', icon: 'book', test: () => J.noteCount() >= 1 },
  { id: 'notes10', name: 'Heart Journal', desc: 'Write ten heart notes', icon: 'book', test: () => J.noteCount() >= 10 },
  { id: 'react10', name: 'Heart Felt', desc: 'React to ten verses', icon: 'spark', test: () => J.reactionCount() >= 10 },
  { id: 'bible', name: 'The Whole Story', desc: 'Every book of the Bible', icon: 'crown', test: () => range(0, 65).every(bookDone) },
];
function checkBadges() {
  const fresh = [];
  for (const b of BADGES) if (!state.badges[b.id] && b.test()) { state.badges[b.id] = today(); fresh.push(b); }
  if (fresh.length) save();
  return fresh;
}

// ---------- confetti ----------
function confetti(power = 1) {
  const c = document.getElementById('confetti');
  const ctx = c.getContext('2d');
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const colors = ['--ot', '--nt', '--ps', '--pr', '--flame', '--flame-hi'].map((v) => css.getPropertyValue(v).trim());
  const parts = Array.from({ length: Math.round(140 * power) }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .42,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 15 - 5,
    r: Math.random() * 6 + 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() > .5,
  }));
  let frame = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .38; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    if (++frame < 160) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

function modal(html, onClose) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(o);
  const close = () => { o.remove(); onClose?.(); };
  o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-close]')) close(); });
  return close;
}

function showBadges(list, then) {
  if (!list.length) return then?.();
  const [b, ...rest] = list;
  haptic('success'); confetti(.7);
  modal(`
    <div class="badge" style="background:none;border:0;padding:0"><div class="medal pop-in">${icon(b.icon)}</div></div>
    <div class="eyebrow" style="margin-top:14px">Badge unlocked</div>
    <div class="h1">${esc(b.name)}</div>
    <p>${esc(b.desc)}</p>
    <button class="btn primary block" data-close>Wonderful</button>`, () => showBadges(rest, then));
}

// Called after any reading is marked
function afterMark(track, key, wasAllDoneBefore, fromReader = false) {
  const t = dateOfReading(track, key);
  const todays = readingsFor(state.startDate, t);
  const allDone = todays.every((r) => isDone(r.track, r.key));
  const fresh = checkBadges();
  if (allDone && !wasAllDoneBefore && t >= today()) {
    if (fromReader && !prayed(t, 'close')) { pendingCelebration = true; showBadges(fresh); return; }
    celebrate(fresh, t);
  } else {
    showBadges(fresh);
  }
}

function celebrate(fresh = [], date = today()) {
  {
    const ahead = date > today();
    haptic('success'); confetti(1.2);
    const s = streak();
    const [vq, vr] = verseOfDay();
    modal(`
      ${FLAME_SVG('pop-in')}
      <div class="streak-num" style="font-size:54px">${s}</div>
      <div class="streak-label">day streak</div>
      <div class="h1">${ahead ? `Day ${planDayFor(state.startDate, date)} is complete` : 'Today’s lamp is full'}</div>
      <p class="verse-quote" style="color:var(--text)">“${esc(vq)}”</p>
      <div class="verse-ref" style="margin-bottom:18px">${esc(vr)}</div>
      <button class="btn primary block" data-close>Amen</button>`, () => showBadges(fresh));
  }
}

// ---------- devotion flow ----------
// Calendar date a reading belongs to (Proverbs is keyed by date, others by plan day)
const dateOfReading = (track, key) => (track === 'pr' ? key : addDays(state.startDate, Number(key) - 1));
const dayComplete = (date) => {
  const n = planDayFor(state.startDate, date);
  if (n < 1 || n > DAYS) return false;
  return readingsFor(state.startDate, date).every((r) => isDone(r.track, r.key));
};
setLitHook(dayComplete);
const daySuffix = (date) => (date === today() ? '' : `/${date}`);
const dayHref = (date) => (date === today() ? '#/today' : `#/day/${date}`);
const prayed = (date, which) => !!state.prayed?.[date]?.[which];
function setPrayed(date, which) {
  state.prayed ||= {};
  state.prayed[date] = { ...(state.prayed[date] || {}), [which]: true };
  save();
}
// Where "Start / Continue devotion" should go next
function nextDevoStep(t = today()) {
  if (!prayed(t, 'open')) return `#/pray/open${daySuffix(t)}`;
  const r = readingsFor(state.startDate, t).find((x) => !isDone(x.track, x.key));
  if (r) return `#/read/${r.track}/${r.key}`;
  if (!prayed(t, 'close')) return `#/pray/close${daySuffix(t)}`;
  return null;
}
let pendingCelebration = false;

function musicBtn() {
  const on = music.isPlaying();
  return `<button class="icon-btn music-btn ${on ? 'on' : ''}" data-action="music" aria-label="${on ? 'Turn off' : 'Play'} soft piano">${icon(on ? 'music' : 'musicoff')}</button>`;
}
function syncMusicButtons() {
  document.querySelectorAll('.music-btn').forEach((b) => { b.outerHTML = musicBtn(); });
}

function prayerRow(which, t = today()) {
  const done = prayed(t, which);
  const title = which === 'open' ? 'Opening prayer' : 'Closing prayer';
  const sub = which === 'open' ? openingFor(t).theme : 'Respond to what God said today';
  return `
  <a class="rcard prayer-card ${done ? 'done' : ''} rise" href="#/pray/${which}${daySuffix(t)}">
    <div class="glyph">${icon('pray')}</div>
    <div class="body">
      <div class="track">${title}</div>
      <div class="ref">${esc(sub)}</div>
      <div class="meta">${which === 'open' ? 'Ask for wisdom and guidance' : 'Based on today’s readings'} · 2 min</div>
    </div>
    <span class="check" aria-hidden="true">${icon('check')}</span>
  </a>`;
}

// ---------- views ----------
function trackCard(r, i = 0) {
  const t = TRACKS[r.track];
  const done = isDone(r.track, r.key);
  const v = verseCount(r.range);
  return `
  <a class="rcard t-${r.track} ${done ? 'done' : ''} rise" style="animation-delay:${i * 60}ms" href="#/read/${r.track}/${r.key}">
    <div class="glyph">${icon(t.icon)}</div>
    <div class="body">
      <div class="track">${t.name}</div>
      <div class="ref">${esc(label(r.range))}</div>
      <div class="meta">${minutes(r.range)} min · ${v} verses</div>
    </div>
    <button class="check" data-toggle="${r.track}|${r.key}" aria-label="Mark ${t.name} as read">${icon('check')}</button>
  </a>`;
}

function ringSVG(todays) {
  const r = 46, C = 2 * Math.PI * r, gap = 7, seg = 90 - gap;
  const by = Object.fromEntries(todays.map((x) => [x.track, x]));
  return `<svg class="ring" viewBox="0 0 100 100">${TRACK_ORDER.map((t, i) => {
    const on = by[t] && isDone(t, by[t].key);
    const len = (C * seg) / 360;
    return `<circle class="seg ${t} ${on ? 'on' : ''}" cx="50" cy="50" r="${r}" stroke-width="3.4"
      stroke-dasharray="${len} ${C}" transform="rotate(${i * 90 + gap / 2} 50 50)"/>`;
  }).join('')}</svg>`;
}

function flameScale(s) { return s === 0 ? 0.8 : s < 3 ? 1 : s < 7 ? 1.15 : s < 30 ? 1.3 : s < 100 ? 1.45 : 1.6; }

function viewToday(date) {
  const t = date && date > today() ? date : today();
  const ahead = t > today();
  const n = planDayFor(state.startDate, t);
  const todays = readingsFor(state.startDate, t);
  const doneCount = todays.filter((r) => isDone(r.track, r.key)).length;
  const all = doneCount === todays.length;
  const s = streak();
  const litToday = isLit(t);
  const miss = ahead ? [] : missed();
  const totalMin = todays.filter((r) => !isDone(r.track, r.key)).reduce((a, r) => a + minutes(r.range), 0);
  const [vq, vr] = verseOfDay();
  let dayLabel;
  if (n < 1) dayLabel = `<b>${-n + 1}</b><span>days to go</span>`;
  else if (n > DAYS) dayLabel = `<b>✦</b><span>year complete</span>`;
  else dayLabel = `<b>Day ${n}</b><span>of ${DAYS}</span>`;

  const sub = all
    ? `You’ve read everything for today`
    : `<b>${doneCount} of ${todays.length}</b> read · about ${totalMin} min left`;

  $app.innerHTML = `
    <header class="top rise">
      <div>
        ${ahead ? `<a class="eyebrow" href="#/today">← Back to today</a>` : `<div class="eyebrow">${esc(fmtDate(t))}</div>`}
        <h1 class="h1">${ahead ? `Reading ahead` : `${greeting()}${state.name ? `, ${esc(state.name)}` : ''}`}</h1>
        ${ahead ? `<p class="muted" style="margin:6px 0 0">${esc(fmtDate(t))}’s devotion. It will count for that day.</p>` : ''}
      </div>
      <div class="daypill">${dayLabel}</div>
    </header>

    <div class="hero ${all ? 'full' : ''}" style="--glow:${(0.12 + doneCount * 0.08).toFixed(2)}">
      <div class="glow"></div>
      ${SPARKLE('s1', 'top:6%;right:12%')}${SPARKLE('s2', 'top:20%;left:8%')}${SPARKLE('s3', 'bottom:14%;right:6%')}
      ${ringSVG(todays)}
      <div class="flame-wrap" style="--fs:${flameScale(s)}">
        ${FLAME_SVG(s === 0 && doneCount === 0 ? 'ember' : '')}
        <div class="streak-num">${s}</div>
        <div class="streak-label">day streak${s && !litToday ? ' · keep it lit' : ''}</div>
      </div>
    </div>
    <p class="hero-sub">${sub}</p>

    ${(() => {
      const next = nextDevoStep(t);
      const started = prayed(t, 'open') || doneCount > 0;
      if (!next) return `<div class="devo-cta done rise"><span>${icon('check')}</span> ${ahead ? `Day ${n}’s devotion is complete` : 'Today’s devotion is complete'}</div>`;
      return `<a class="btn primary block devo-cta rise" href="#/devo${daySuffix(t)}">${icon('play')} ${ahead ? `${started ? 'Continue' : 'Start'} Day ${n}’s devotion` : started ? 'Continue today’s devotion' : 'Start today’s devotion'}</a>`;
    })()}

    ${ahead ? '' : `<section class="rhema rise" id="rhema" style="animation-delay:.15s">
      <div class="rhema-head">
        <span class="eyebrow">${SPARKLE('', 'position:static;width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:6px')}Rhema for today</span>
        <div class="rhema-actions">
          <button class="icon-btn" data-action="rhema-new" aria-label="Show another verse">${icon('shuffle')}</button>
          <button class="icon-btn" data-action="rhema-share" aria-label="Share this verse">${icon('share')}</button>
        </div>
      </div>
      <p class="rhema-text" id="rhema-text">&nbsp;</p>
      <div class="rhema-ref" id="rhema-ref">&nbsp;</div>
    </section>`}

    ${miss.length ? `
      <a class="banner rise" href="#/catchup">
        <div class="t"><b>Catch up on ${miss.length} portion${miss.length > 1 ? 's' : ''}</b><span class="muted">From earlier days, so you can stay on track</span></div>
        <div class="icon-btn">${icon('arrow')}</div>
      </a>` : ''}

    ${n > DAYS ? `
      <div class="done-note rise">
        <div class="h2">You finished the year’s plan</div>
        <p class="muted">Proverbs keeps going daily. Start a new year whenever you’re ready.</p>
        <button class="btn primary" data-action="new-year">Start a new year</button>
      </div>` : ''}
    ${n < 1 ? `<p class="help" style="text-align:center">Your plan starts ${esc(fmtDate(state.startDate))}. Proverbs is ready for you every day.</p>` : ''}

    <div class="readings">
      ${prayerRow('open', t)}
      ${todays.map(trackCard).join('')}
      ${prayerRow('close', t)}
    </div>

    ${all ? `
      <div class="done-note rise">
        <div class="h2">Well done ✦</div>
        ${n >= 1 && n < DAYS ? `
          <p class="muted" style="margin:6px 0 14px">Still hungry for the Word? You can read ahead.</p>
          <a class="btn block read-ahead" href="#/day/${addDays(t, 1)}">Continue to Day ${n + 1} ${icon('arrow').replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')}</a>`
        : `<p class="muted" style="margin:6px 0 0">See you tomorrow.</p>`}
      </div>` : ''}
  `;
  if (!ahead) loadRhema();
  // Save the next 7 days (and their Rhema verses) on the phone for offline use
  const upcoming = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(t, d);
    upcoming.push(...readingsFor(state.startDate, date).map((r) => r.range), rhemaRange(dailyIndex(date)));
  }
  prefetch(upcoming);
}

// ---------- rhema ----------
let rhemaShown = null; // { ref, text, translation }
function currentRhemaIndex() {
  const t = today();
  return state.rhema?.date === t ? state.rhema.idx : dailyIndex(t);
}
let rhemaToken = 0;
async function loadRhema(idx = currentRhemaIndex()) {
  const box = document.getElementById('rhema');
  if (!box) return;
  const token = ++rhemaToken;
  const range = rhemaRange(idx);
  const ref = label(range);
  const tEl = () => document.getElementById('rhema-text');
  const rEl = () => document.getElementById('rhema-ref');
  const show = (res) => {
    if (token !== rhemaToken || !tEl()) return;
    rhemaShown = { ref, ...res };
    tEl().textContent = res.text ? `“${res.text}”` : '';
    rEl().textContent = `${ref}${res.translation ? ` · ${res.translation}` : ''}`;
    box.classList.add('fresh'); setTimeout(() => box.classList.remove('fresh'), 600);
  };
  rEl().textContent = ref;
  // 1) instant, offline text
  try { show(await verseText(range, { online: false })); } catch (e) { console.warn('rhema web', e); }
  // 2) upgrade to NLT when it arrives
  if (wantsOnline()) {
    try { show(await verseTextOnline(range)); } catch (e) { console.warn('rhema nlt', e); }
  }
}

// ---------- prayer list ----------
let showAnswered = false;
function viewPrayerList() {
  const act = PL.active();
  const ans = PL.answered();
  const todayIds = new Set(PL.forToday().map((p) => p.id));
  const card = (p) => `
    <div class="pcard ${p.answered ? 'answered' : ''} rise" data-id="${p.id}">
      <div class="pc-body">
        <div class="pc-text">${esc(p.text)}</div>
        <div class="pc-meta">${p.who ? `<span class="pc-who">${esc(p.who)}</span> · ` : ''}${p.answered
          ? `Answered ${esc(fmtDate(p.answered.date, { month: 'short', day: 'numeric', year: 'numeric' }))}`
          : `Added ${esc(fmtDate(p.created, { month: 'short', day: 'numeric' }))}${p.prayedCount ? ` · prayed ${p.prayedCount}×` : ''}${todayIds.has(p.id) ? ' · <span class="pc-today">in today’s prayer</span>' : ''}`}</div>
        ${p.answered?.note ? `<div class="pc-note">“${esc(p.answered.note)}”</div>` : ''}
      </div>
      <div class="pc-actions">
        ${p.answered ? '' : `<button class="pc-btn ${p.lastPrayed === today() ? 'on' : ''}" data-action="pl-prayed" data-id="${p.id}">${icon('pray')}<span>${p.lastPrayed === today() ? 'Prayed' : 'Pray'}</span></button>
        <button class="pc-btn" data-action="pl-answer" data-id="${p.id}">${icon('check')}<span>Answered</span></button>`}
        <button class="pc-btn more" data-action="pl-menu" data-id="${p.id}" aria-label="More options"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
      </div>
    </div>`;
  $app.innerHTML = `
    <header class="top rise"><div>
      <div class="eyebrow">Philippians 4:6</div>
      <h1 class="h1">Prayer list</h1>
      <p class="muted" style="margin:6px 0 0">${act.length ? `${act.length} request${act.length > 1 ? 's' : ''} · a few are added to your closing prayer each day` : 'Bring every request to God. A few are added to your closing prayer each day.'}</p>
    </div></header>

    <form class="padd rise" data-form="pl-add" autocomplete="off">
      <textarea id="pl-text" rows="2" placeholder="What would you like to pray for?" maxlength="300"></textarea>
      <div class="padd-row">
        <input id="pl-who" type="text" placeholder="For whom? (optional)" maxlength="60">
        <button class="btn primary small" type="submit">Add</button>
      </div>
    </form>

    ${ans.length ? `<div class="answered-banner rise"><b>${ans.length}</b> answered prayer${ans.length > 1 ? 's' : ''}. God is faithful.</div>` : ''}

    <div class="section">
      <div class="section-head"><div class="h2">Praying for</div><span class="muted" style="font-size:13px">${act.length}</span></div>
      ${act.length ? `<div class="plist">${act.map(card).join('')}</div>` : `<p class="help" style="text-align:center;margin:18px 0">No requests yet. Add your first one above.</p>`}
    </div>

    ${ans.length ? `
    <div class="section">
      <button class="section-head as-btn" data-action="pl-toggle-answered"><div class="h2">Answered</div><span class="muted" style="font-size:13px">${showAnswered ? 'Hide' : `Show ${ans.length}`}</span></button>
      ${showAnswered ? `<div class="plist">${ans.map(card).join('')}</div>` : ''}
    </div>` : ''}
  `;
}

function plSheet(html) {
  const close = modal(`<div style="text-align:left">${html}</div>`);
  return close;
}

function viewCatchup() {
  const miss = ahead ? [] : missed();
  const groups = {};
  for (const m of miss) (groups[m.date] ||= []).push(m);
  const dates = Object.keys(groups).sort().reverse();
  $app.innerHTML = `
    <header class="top rise"><div>
      <a class="eyebrow" href="#/today">← Today</a>
      <h1 class="h1">Catch up</h1>
      <p class="muted" style="margin:6px 0 0">${miss.length ? `${miss.length} portion${miss.length > 1 ? 's' : ''} waiting. One at a time is enough.` : 'You’re all caught up. Beautiful.'}</p>
    </div></header>
    ${dates.map((d) => `
      <div class="section">
        <div class="section-head"><div class="eyebrow">${esc(fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' }))} · Day ${planDayFor(state.startDate, d)}</div></div>
        <div class="readings" style="margin-top:0">${groups[d].map(trackCard).join('')}</div>
      </div>`).join('')}
  `;
}

async function viewReader(track, key) {
  const r = readingFor(track, key);
  if (!r) { location.hash = '#/today'; return; }
  const t = TRACKS[track];
  $app.classList.add('reader-mode');
  const ref = label(r.range);
  const renderTop = () => `
    <div class="reader-top t-${track}">
      <div class="row">
        <button class="icon-btn" data-action="back" aria-label="Back">${icon('back')}</button>
        <div class="reader-title"><div class="track">${t.name}</div><div class="ref">${esc(ref)}</div></div>
        <button class="tr-chip" data-action="reading-sheet" aria-label="Translation and text options">${currentTranslation()}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
        ${musicBtn()}
        <button class="icon-btn" data-action="reading-sheet" aria-label="Text options"><span style="font-family:var(--serif);font-size:19px;font-weight:600">Aa</span></button>
      </div>
      <div class="progress" id="rprog"></div>
    </div>`;
  $app.innerHTML = `${renderTop()}<div class="loading"><div class="spinner"></div></div>`;
  autoMusic();
  let res;
  await loadDevo();
  const dv = devoFor(track, key);
  try { res = await passage(r.range); } catch (e) { res = { html: `<p>Couldn’t load this passage. ${esc(e.message || '')}</p>`, translation: '' }; }
  if (!location.hash.startsWith(`#/read/${track}/${key}`)) return; // navigated away
  const done = isDone(track, key);
  const contextLine = track === 'pr'
    ? `Proverbs for ${fmtDate(key, { month: 'long', day: 'numeric' })}`
    : `Day ${key} of ${DAYS}`;
  $app.innerHTML = `
    ${renderTop()}
    ${res.note ? `<div class="note" style="margin:12px 16px 0">${esc(res.note)}</div>` : ''}
    <article class="scripture t-${track}">${res.html}</article>
    ${dv ? `
    <section class="takeaway t-${track}">
      <div class="tk-row"><div class="tk-icon">${icon('bulb')}</div><div><div class="eyebrow">Key takeaway</div><p>${esc(dv.takeaway)}</p></div></div>
      ${dv.apply ? `<div class="tk-row"><div class="tk-icon">${icon('target')}</div><div><div class="eyebrow">Apply it today</div><p>${esc(dv.apply)}</p></div></div>` : ''}
    </section>` : ''}
    <div class="reader-foot t-${track}">
      <button class="btn primary block mark-btn ${done ? 'done' : ''}" data-mark="${track}|${key}">
        ${done ? `${icon('check').replace('<svg', '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"')} Read` : 'Mark as read'}
      </button>
      <p class="help" style="text-align:center">${esc(contextLine)} · <button class="link-btn" data-action="reading-sheet">${res.translation || ''} · change</button></p>
      <p class="copyright">${NOTICES[res.translation] || ''}</p>
    </div>`;
  window.scrollTo(0, 0);
  readerTr = res.translation;
  tagVerses(document.querySelector('.scripture'), r.range);
  paintVerses();
  const prog = document.getElementById('rprog');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.width = `${h > 0 ? Math.min(100, (scrollY / h) * 100) : 100}%`;
  };
  onScroll();
  window.onscroll = onScroll;
}

// ---------- verse selection, highlights, heart notes ----------
let readerTr = '';
const selected = new Set();

// Wrap each verse's words in <span class="v" data-k="book.chapter.verse">, for any translation's markup
function tagVerses(root, range) {
  if (!root) return;
  const chs = chapters(range);
  let ci = -1, cur = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 1) {
      if (n.matches('h2.ch-title')) { ci++; cur = chs[ci]?.v1 || 1; }
      else if (n.matches('sup.vn')) { const v = parseInt(n.textContent, 10); if (v) cur = v; }
      continue;
    }
    if (ci < 0 || !chs[ci] || !n.textContent.trim() || n.parentElement.closest('h1,h2,h3,h4,sup')) continue;
    texts.push([n, chs[ci].b, chs[ci].c, cur]);
  }
  for (const [t, b, c, v] of texts) {
    const sp = document.createElement('span');
    sp.className = 'v';
    sp.dataset.k = J.keyOf(b, c, v);
    t.replaceWith(sp);
    sp.appendChild(t);
  }
}

function paintVerses() {
  document.querySelectorAll('.scripture sup.vreact').forEach((x) => x.remove());
  const lastSpan = {};
  document.querySelectorAll('.scripture span.v').forEach((sp) => {
    const k = sp.dataset.k;
    const h = J.highlightOf(k);
    sp.style.setProperty('--hl', h ? J.COLORS[h.color] || '' : '');
    sp.classList.toggle('hl', !!h);
    sp.classList.toggle('sel', selected.has(k));
    sp.classList.remove('note-end');
    lastSpan[k] = sp;
  });
  for (const [k, sp] of Object.entries(lastSpan)) {
    if (J.notesFor(k).length) sp.classList.add('note-end');
    const r = J.reactionOf(k);
    if (r) {
      const sup = document.createElement('sup');
      sup.className = 'vreact';
      sup.textContent = r.emoji;
      sup.title = (J.REACTIONS.find(([e]) => e === r.emoji) || [])[1] || '';
      sp.after(sup);
    }
  }
}

function selectedItems() {
  const by = {};
  document.querySelectorAll('.scripture span.v').forEach((sp) => {
    if (selected.has(sp.dataset.k)) by[sp.dataset.k] = (by[sp.dataset.k] || '') + sp.textContent;
  });
  return Object.keys(by).sort(J.compareKeys).map((k) => ({ k, text: by[k].replace(/\s+/g, ' ').trim() }));
}

function shareText(items) {
  return `${J.quote(items.map((i) => i.text).join(' '))}\n— ${J.refOf(items.map((i) => i.k))}${readerTr ? ` (${readerTr})` : ''}`;
}

function renderVerseBar() {
  let bar = document.getElementById('vbar');
  if (!selected.size) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'vbar'; bar.className = 'vbar'; document.body.appendChild(bar); }
  const items = selectedItems();
  const allHl = items.length && items.every((i) => J.highlightOf(i.k));
  bar.innerHTML = `
    <div class="vbar-top"><b>${esc(J.refOf(items.map((i) => i.k)))}</b>
      <button class="icon-btn" data-action="v-clear" aria-label="Clear selection"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="vbar-emoji">
      ${J.REACTIONS.map(([e, name]) => {
        const on = items.length && items.every((i) => J.reactionOf(i.k)?.emoji === e);
        return `<button class="emo ${on ? 'on' : ''}" data-action="v-react" data-emoji="${e}" aria-label="${name}" title="${name}">${e}</button>`;
      }).join('')}
    </div>
    <div class="vbar-colors">
      ${Object.entries(J.COLORS).map(([name, hex]) => `<button class="swatch" style="--sw:${hex}" data-action="v-hl" data-color="${name}" aria-label="Highlight ${name}"></button>`).join('')}
      ${allHl ? `<button class="swatch clear" data-action="v-hl" data-color="" aria-label="Remove highlight"><svg viewBox="0 0 24 24"><path d="M5 19L19 5"/></svg></button>` : ''}
    </div>
    <div class="vbar-actions">
      <button data-action="v-note">${icon('book')}<span>Note</span></button>
      <button data-action="v-copy"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Copy</span></button>
      <button data-action="v-share">${icon('share')}<span>Share</span></button>
    </div>`;
}

function clearSelection() { selected.clear(); paintVerses(); renderVerseBar(); }

async function shareVerses(text, title) {
  const Sh = P().Share;
  try {
    if (Sh) await Sh.share({ title, text, dialogTitle: 'Share' });
    else if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Copied'); }
  } catch {}
}

// tap a verse to select / unselect it
document.addEventListener('click', (e) => {
  const sp = e.target.closest('.scripture span.v');
  if (!sp || e.target.closest('a,button')) return;
  const k = sp.dataset.k;
  if (selected.has(k)) selected.delete(k); else selected.add(k);
  haptic();
  paintVerses();
  renderVerseBar();
});

// ---------- journal ----------
let journalTab = 'notes';
let journalEmoji = '';
function viewJournal() {
  const notes = J.allNotes();
  const hls = J.markedVerses().filter((h) => !journalEmoji || h.emoji === journalEmoji);
  const allMarked = J.markedVerses();
  const usedEmoji = J.REACTIONS.filter(([e]) => allMarked.some((h) => h.emoji === e));
  const noteCard = (n) => `
    <div class="jcard rise" style="--jc:${n.color ? J.COLORS[n.color] : 'var(--flame-hi)'}">
      <div class="jc-head"><b>${esc(n.ref)}</b><span>${esc(fmtDate(n.date, { month: 'short', day: 'numeric', year: 'numeric' }))}${n.tr ? ` · ${esc(n.tr)}` : ''}</span></div>
      <p class="jc-verse">${esc(J.quote(n.text))}</p>
      ${n.note ? `<p class="jc-note">${esc(n.note)}</p>` : ''}
      <div class="pc-actions">
        <button class="pc-btn" data-action="j-share" data-id="${n.id}">${icon('share')}<span>Share</span></button>
        <button class="pc-btn more" data-action="j-menu" data-id="${n.id}" aria-label="More"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
      </div>
    </div>`;
  const hlCard = (h) => `
    <div class="jcard hlcard rise" style="--jc:${J.COLORS[h.color] || 'var(--line)'}">
      <div class="jc-head"><b>${esc(J.refOf([h.k]))}${h.emoji ? ` <span class="jc-emo">${h.emoji}</span>` : ''}</b><span>${esc(fmtDate(h.date, { month: 'short', day: 'numeric' }))}${h.tr ? ` · ${esc(h.tr)}` : ''}</span></div>
      <p class="jc-verse">${esc(h.text)}</p>
      <div class="pc-actions">
        <button class="pc-btn" data-action="h-share" data-k="${h.k}">${icon('share')}<span>Share</span></button>
        <button class="pc-btn more" data-action="h-remove" data-k="${h.k}" aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </div>`;
  $app.innerHTML = `
    <header class="top rise"><div>
      <a class="eyebrow" href="#/journey">← Journey</a>
      <h1 class="h1">Journal</h1>
      <p class="muted" style="margin:6px 0 0">The verses that spoke to you, and what they meant.</p>
    </div></header>
    <div class="seg-ctl jtabs rise">
      <button class="${journalTab === 'notes' ? 'on' : ''}" data-action="j-tab" data-tab="notes">Heart notes · ${notes.length}</button>
      <button class="${journalTab === 'hl' ? 'on' : ''}" data-action="j-tab" data-tab="hl">Verses · ${allMarked.length}</button>
    </div>
    ${journalTab === 'hl' && usedEmoji.length ? `<div class="emo-filter rise">
      <button class="${!journalEmoji ? 'on' : ''}" data-action="j-emo" data-emoji="">All</button>
      ${usedEmoji.map(([e, name]) => `<button class="${journalEmoji === e ? 'on' : ''}" data-action="j-emo" data-emoji="${e}" title="${name}">${e} <small>${allMarked.filter((h) => h.emoji === e).length}</small></button>`).join('')}
    </div>` : ''}
    <div class="plist" style="margin-top:16px">
      ${journalTab === 'notes'
        ? (notes.length ? notes.map(noteCard).join('') : `<p class="help" style="text-align:center;margin:24px 8px">No notes yet. While reading, tap a verse that speaks to you, then tap <b>Note</b>.</p>`)
        : (hls.length ? hls.map(hlCard).join('') : `<p class="help" style="text-align:center;margin:24px 8px">No marked verses yet. While reading, tap a verse, then pick a color or an emoji.</p>`)}
    </div>`;
}

// ---------- reading options sheet ----------
function openReadingSheet() {
  const o = document.createElement('div');
  o.className = 'overlay sheet-overlay';
  const render = () => {
    o.innerHTML = `<div class="sheet" role="dialog" aria-label="Reading options">
      <div class="sheet-grip"></div>
      <div class="eyebrow">Translation</div>
      <div class="tr-grid">
        ${TRANSLATION_ORDER.map((code) => `<button class="tr-opt ${currentTranslation() === code ? 'on' : ''}" data-tr="${code}">
          <b>${code}</b><span>${TRANSLATIONS[code].name.replace(' Translation', '').replace(' Version', '')}</span>${TRANSLATIONS[code].online ? '<i>online</i>' : '<i>offline</i>'}
        </button>`).join('')}
      </div>
      <div class="sheet-row"><span class="eyebrow">Text size</span>
        <div class="seg-ctl"><button data-sz="-">A−</button><button disabled style="min-width:58px">${Math.round(state.fontScale * 100)}%</button><button data-sz="+">A+</button></div></div>
      <div class="sheet-row"><span class="eyebrow">Font</span>
        <div class="seg-ctl"><button class="${state.readFont !== 'sans' ? 'on' : ''}" data-rf="serif" style="font-family:var(--serif)">Serif</button><button class="${state.readFont === 'sans' ? 'on' : ''}" data-rf="sans">Sans</button></div></div>
      <button class="btn primary block" data-done style="margin-top:14px">Done</button>
    </div>`;
  };
  render();
  document.body.appendChild(o);
  let changedTr = false;
  const close = () => { o.remove(); if (changedTr) route(); };
  o.addEventListener('click', (e) => {
    if (e.target === o || e.target.closest('[data-done]')) return close();
    const tr = e.target.closest('[data-tr]');
    if (tr) { state.translation = tr.dataset.tr; save(); changedTr = true; haptic(); render(); return; }
    const sz = e.target.closest('[data-sz]');
    if (sz) { state.fontScale = Math.max(0.8, Math.min(1.6, +(state.fontScale + (sz.dataset.sz === '+' ? 0.1 : -0.1)).toFixed(2))); save(); applyTheme(); render(); return; }
    const rf = e.target.closest('[data-rf]');
    if (rf) { state.readFont = rf.dataset.rf; save(); applyTheme(); render(); }
  });
}

// ---------- guided prayer ----------
function autoMusic() { if (state.music?.on) music.play().then(syncMusicButtons); }

async function viewPrayer(which, t = today()) {
  $app.classList.add('reader-mode');
  autoMusic();
  let prayer;
  viewPrayer.requests = [];
  if (which === 'open') prayer = openingFor(t);
  else {
    await loadDevo();
    const items = readingsFor(state.startDate, t).map((r) => devoFor(r.track, r.key)).filter(Boolean);
    viewPrayer.requests = PL.forToday();
    prayer = closingPrayer(items, viewPrayer.requests);
  }
  const lines = prayer.lines;
  let i = 0;
  const render = () => {
    const done = i >= lines.length - 1;
    const shown = lines.slice(0, i + 1);
    $app.innerHTML = `
      <div class="reader-top">
        <div class="row">
          <button class="icon-btn" data-action="back" aria-label="Back">${icon('back')}</button>
          <div class="reader-title"><div class="track" style="color:var(--muted)">${which === 'open' ? 'Opening prayer' : 'Closing prayer'}</div><div class="ref">${esc(prayer.theme)}</div></div>
          ${musicBtn()}
        </div>
      </div>
      <div class="prayer">
        <div class="prayer-flame">${FLAME_SVG()}</div>
        <div class="eyebrow" style="text-align:center">${esc(prayer.refs)}</div>
        <div class="prayer-lines">
          ${shown.map((l, k) => typeof l === 'string'
            ? `<p class="pl ${k === i ? 'current' : ''}">${esc(l)}</p>`
            : l.request
              ? `<div class="pl request ${k === i ? 'current' : ''}"><span class="req-icon">${icon('pray')}</span><div><b>${esc(l.request)}</b>${l.who ? `<small>for ${esc(l.who)}</small>` : ''}</div></div>`
              : `<div class="pl silence ${k === i ? 'current' : ''}"><div class="breath"></div><span>${esc(l.silence)}</span></div>`).join('')}
        </div>
        <div class="prayer-foot">
          ${done
            ? `<button class="btn primary block" data-action="amen" data-which="${which}" data-date="${t}" data-req="${viewPrayer.requests.map((r) => r.id).join(',')}">Amen</button>`
            : `<button class="btn primary block" data-action="pray-next">${lines[i]?.silence ? 'Continue' : 'Next'}</button>`}
          <div class="prayer-dots">${lines.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        </div>
      </div>`;
    const cur = $app.querySelector('.pl.current');
    cur?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  viewPrayer.next = () => { if (i < lines.length - 1) { i++; haptic(); render(); } };
  render();
}

function nextUnreadToday() {
  return readingsFor(state.startDate, today()).find((r) => !isDone(r.track, r.key))
      || missed()[0];
}

function viewJourney() {
  const { pct, verses } = biblePct();
  const s = streak(), best = longestStreak();
  const lit = Object.keys(state.log).filter(isLit).length;
  const pr = prStats();
  const miss = missed().length;
  const C = 2 * Math.PI * 46;
  // heatmap
  const start = state.startDate;
  const startDow = new Date(start.replace(/-/g, '/')).getDay();
  const t = today();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<i class="pad"></i>';
  for (let i = 0; i < DAYS; i++) {
    const d = addDays(start, i);
    const n = Math.min(4, state.log[d] || 0);
    cells += `<i class="l${n} ${d > t ? 'future' : ''} ${d === t ? 'today' : ''}" title="${d}"></i>`;
  }
  const shelf = (from, to) => META.books.slice(from, to + 1).map((b, j) => {
    const i = from + j;
    const p = bookRead(i);
    const h = 46 + Math.round(Math.sqrt(BOOK_TOTALS[i]) * 0.9);
    const tr = i === PS_BOOK ? 'ps' : i === PR_BOOK ? 'pr' : b.track === 'NT' ? 'nt' : 'ot';
    return `<button class="spine t-${tr} ${p >= .999 ? 'complete' : ''}" style="height:${Math.min(h, 88)}px" data-book="${i}"><i style="height:${(p * 100).toFixed(1)}%"></i></button>`;
  }).join('');

  $app.innerHTML = `
    <header class="top rise"><div>
      <div class="eyebrow">Your year in the Word</div>
      <h1 class="h1">Journey</h1>
    </div></header>

    <div class="card section bigstat rise">
      <div class="bigring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" stroke="var(--surface-2)" stroke-width="7"/>
          <circle cx="50" cy="50" r="46" stroke="var(--flame)" stroke-width="7" stroke-dasharray="${(C * pct).toFixed(1)} ${C}"/>
        </svg>
        <div class="val">${(pct * 100).toFixed(pct < .1 ? 1 : 0)}<small>%</small></div>
      </div>
      <div>
        <div class="h2">of the Bible read</div>
        <p class="muted" style="margin:6px 0 10px">${verses.toLocaleString()} of ${TOTAL_VERSES().toLocaleString()} verses</p>
        ${dayNum() < 1 ? '' : miss ? `<a class="chip warn" href="#/catchup">${miss} behind · catch up</a>` : `<span class="chip good">On track</span>`}
      </div>
    </div>

    <div class="stats section">
      <div class="card stat"><b>${s}</b><span>Current streak</span></div>
      <div class="card stat"><b>${best}</b><span>Best streak</span></div>
      <div class="card stat"><b>${lit}</b><span>Full days</span></div>
    </div>

    <a class="card section journal-card rise" href="#/journal">
      <div class="jl-icon">${icon('book')}</div>
      <div class="t"><b>Your journal</b><span>${J.noteCount()} heart note${J.noteCount() === 1 ? '' : 's'} · ${J.markedVerses().length} marked verse${J.markedVerses().length === 1 ? '' : 's'}</span></div>
      <div class="icon-btn">${icon('arrow')}</div>
    </a>

    <div class="section">
      <div class="section-head"><div class="h2">Four streams</div></div>
      <div class="card bars">
        ${['ot', 'nt', 'ps'].map((k) => `
          <div class="bar-row t-${k}">
            <div class="lbl"><span>${TRACKS[k].name}</span><span>${Object.keys(state.done[k]).length} / ${DAYS} days</span></div>
            <div class="bar"><i style="width:${(trackPct(k) * 100).toFixed(1)}%"></i></div>
          </div>`).join('')}
        <div class="bar-row t-pr">
          <div class="lbl"><span>Proverbs</span><span>${pr.cycles} of 12 times through</span></div>
          <div class="beads">${Array.from({ length: 12 }, (_, i) =>
            i < pr.cycles ? '<span class="bead full"></span>'
            : i === pr.cycles && pr.partial ? `<span class="bead part" style="--p:${(pr.partial * 100).toFixed(0)}%"></span>`
            : '<span class="bead"></span>').join('')}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Your bookshelf</div><span class="muted" style="font-size:13px">${META.books.filter((_, i) => bookDone(i)).length} / 66 books</span></div>
      <div class="card">
        <div class="shelf">${shelf(0, 38)}</div>
        <div class="shelf-label"><span>Genesis</span><span>Old Testament</span><span>Malachi</span></div>
        <div class="shelf">${shelf(39, 65)}</div>
        <div class="shelf-label" style="margin-bottom:0"><span>Matthew</span><span>New Testament</span><span>Revelation</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Days lit</div></div>
      <div class="card">
        <div class="heat">${cells}</div>
        <div class="legend">Less <i style="background:var(--surface-2)"></i><i class="l1" style="background:color-mix(in srgb,var(--flame) 30%,var(--surface-2))"></i><i style="background:color-mix(in srgb,var(--flame) 55%,var(--surface-2))"></i><i style="background:color-mix(in srgb,var(--flame) 78%,var(--surface-2))"></i><i style="background:var(--flame)"></i> More</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Badges</div><span class="muted" style="font-size:13px">${Object.keys(state.badges).length} / ${BADGES.length}</span></div>
      <div class="badges">
        ${BADGES.map((b) => {
          const on = state.badges[b.id];
          return `<div class="badge ${on ? '' : 'locked'}"><div class="medal">${icon(on ? b.icon : 'lock')}</div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function viewSettings() {
  const seg = (name, val, opts) => `<div class="seg-ctl">${opts.map(([v, l]) =>
    `<button class="${val === v ? 'on' : ''}" data-set="${name}" data-val="${v}">${l}</button>`).join('')}</div>`;
  $app.innerHTML = `
    <header class="top rise"><div><div class="eyebrow">Make it yours</div><h1 class="h1">Settings</h1></div></header>

    <div class="section">
      <div class="section-head"><div class="h2">Reading</div></div>
      <div class="list">
        ${TRANSLATION_ORDER.map((code) => `
        <button class="item tr-row ${currentTranslation() === code ? 'on' : ''}" data-set="translation" data-val="${code}">
          <span class="radio"></span>
          <span class="t"><b>${TRANSLATIONS[code].name} <span class="tr-code">${code}</span></b><span>${TRANSLATIONS[code].desc}${TRANSLATIONS[code].online ? ' · online' : ''}</span></span>
        </button>`).join('')}
        ${['NLT', 'ESV'].map((k) => `
        <div class="item" style="flex-direction:column;align-items:stretch">
          <div class="t"><b>${k} API key</b><span>${state[k.toLowerCase() + 'Key'] ? 'Your key saved ✓' : hasBuiltInKey(k) ? 'Built into this app ✓ (optional override)' : `Needed to read in the ${k}`}</span></div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <input class="field" style="margin:0" type="password" id="key-${k}" placeholder="Paste your ${k} key" value="${esc(state[k.toLowerCase() + 'Key'] || '')}" autocomplete="off">
            <button class="btn small" data-action="save-key" data-kind="${k}">Save</button>
          </div>
        </div>`).join('')}
        <div class="item"><div class="t"><b>Reading font</b><span>${state.readFont === 'sans' ? 'Sans-serif (Manrope)' : 'Serif (Literata)'}</span></div>
          ${seg('readFont', state.readFont || 'serif', [['serif', 'Serif'], ['sans', 'Sans']])}</div>
        <div class="item"><div class="t"><b>Text size</b><span>${Math.round(state.fontScale * 100)}%</span></div>
          <div class="seg-ctl"><button data-action="font-">A−</button><button data-action="font+">A+</button></div></div>
        <div class="item"><div class="t"><b>Theme</b></div>
          ${seg('theme', state.theme, [['system', 'Auto'], ['dark', 'Dark'], ['light', 'Light']])}</div>
      </div>
      <p class="help" id="saved-note">Checking saved passages…</p>
      <p class="help">BSB, KJV and WEB are public domain and built in, so they work offline. NLT and ESV are copyrighted and load from their publishers’ official services. Free keys: <a href="https://api.nlt.to" target="_blank" rel="noopener">api.nlt.to</a> (NLT) and <a href="https://api.esv.org" target="_blank" rel="noopener">api.esv.org</a> (ESV). By Crossway’s terms, only a few days of ESV readings are kept on your phone.</p>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Soft piano</div></div>
      <div class="list">
        <div class="item"><div class="t"><b>Play while reading and praying</b><span>Gentle ambient piano, made live on your phone</span></div>
          <button class="switch ${state.music?.on ? 'on' : ''}" data-action="music-pref" aria-label="Toggle soft piano"></button></div>
        <div class="item"><div class="t"><b>Volume</b></div><input type="range" id="mvol" min="0" max="100" value="${Math.round((state.music?.vol ?? 0.6) * 100)}" style="width:150px;accent-color:var(--accent)"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Daily reminder</div></div>
      <div class="list">
        <div class="item"><div class="t"><b>Remind me to read</b><span>A gentle nudge with the day’s passages</span></div>
          <button class="switch ${state.reminder.on ? 'on' : ''}" data-action="reminder" aria-label="Toggle reminder"></button></div>
        <div class="item"><div class="t"><b>Time</b></div><input type="time" id="rtime" value="${state.reminder.time}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="h2">Plan</div></div>
      <div class="list">
        <div class="item"><div class="t"><b>Your name</b></div><input type="text" id="name" value="${esc(state.name)}" placeholder="Name" style="width:150px"></div>
        <div class="item"><div class="t"><b>Start date</b><span>Day 1 of your 365</span></div><input type="date" id="start" value="${state.startDate}"></div>
        <div class="item"><div class="t"><b>Back up progress</b><span>Copy a backup code to keep somewhere safe</span></div><button class="btn small" data-action="export">Copy</button></div>
        <div class="item"><div class="t"><b>Restore progress</b><span>Paste a backup code</span></div><button class="btn small" data-action="import">Paste</button></div>
        <div class="item"><div class="t"><b class="danger">Reset progress</b><span>Clears readings, streaks and badges</span></div><button class="btn small" data-action="reset">Reset</button></div>
      </div>
      <p class="help">Old Testament, New Testament and Psalms are spread across 365 days by verse count. Proverbs follows the calendar (chapter = today’s date), so you read it 12 times a year.</p>
    </div>
    <p class="help" style="text-align:center;margin-top:28px">Lamp · “Your word is a lamp to my feet.”</p>
  `;
}

async function fillSavedNote() {
  const el = document.getElementById('saved-note');
  if (!el) return;
  const t = currentTranslation();
  if (!TRANSLATIONS[t].online) { el.textContent = `${TRANSLATIONS[t].name} is built into the app and works fully offline.`; return; }
  const n = await savedCount(t);
  el.textContent = n ? `${n} ${t} passage${n === 1 ? '' : 's'} saved on this phone for offline reading. The next 7 days download automatically when you're online.` : 'NLT passages are saved on this phone as you read, and the next 7 days download automatically when you’re online.';
}

function viewWelcome() {
  $tabs.hidden = true;
  const t = today();
  const jan1 = `${new Date().getFullYear() + (new Date().getMonth() >= 10 ? 1 : 0)}-01-01`;
  $app.innerHTML = `
    <div class="welcome">
      <div class="rise">${FLAME_SVG()}</div>
      <h1 class="h1 rise" style="animation-delay:.1s">Lamp</h1>
      <p class="verse-quote rise" style="animation-delay:.2s">“Your word is a lamp to my feet, and a light for my path.”</p>
      <div class="verse-ref rise" style="animation-delay:.25s">Psalm 119:105</div>
      <div class="tracks-preview rise" style="animation-delay:.35s">
        <div class="t-ot" style="--c:var(--ot)">Old Test.<small>~2 chapters</small></div>
        <div class="t-nt" style="--c:var(--nt)">New Test.<small>~1 chapter</small></div>
        <div class="t-ps" style="--c:var(--ps)">Psalms<small>a few verses</small></div>
        <div class="t-pr" style="--c:var(--pr)">Proverbs<small>1 a day</small></div>
      </div>
      <p class="muted rise" style="animation-delay:.4s;font-size:14px;margin:6px 0 0">About 15 minutes a day. The whole Bible in a year, and Proverbs twelve times.</p>
      <div class="form rise" style="animation-delay:.5s">
        <label for="wname">What should we call you?</label>
        <input class="field" style="margin:0" id="wname" type="text" placeholder="Your name" value="${esc(state.name)}">
        <label for="wstart">When does your year begin?</label>
        <div class="seg-ctl" style="width:100%">
          <button class="on" style="flex:1" data-start="${t}">Today</button>
          <button style="flex:1" data-start="${jan1}">Jan 1</button>
          <button style="flex:1" data-start="pick">Pick a date</button>
        </div>
        <input class="field" style="margin:0" id="wstart" type="date" value="${t}" hidden>
        <button class="btn primary block" data-action="begin" style="margin-top:8px">${icon('flame').replace('<svg', '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"')} Light the lamp</button>
      </div>
    </div>`;
}

// ---------- reminders ----------
async function scheduleReminders() {
  const LN = P().LocalNotifications;
  if (!LN) return;
  try {
    const pending = await LN.getPending();
    if (pending.notifications?.length) await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!state.reminder.on) return;
    const [hh, mm] = state.reminder.time.split(':').map(Number);
    const list = [];
    for (let i = 0; i < 21; i++) {
      const date = addDays(today(), i);
      const at = new Date(date.replace(/-/g, '/')); at.setHours(hh, mm, 0, 0);
      if (at <= new Date()) continue;
      const rs = readingsFor(state.startDate, date);
      if (i === 0 && rs.every((r) => isDone(r.track, r.key))) continue;
      const n = planDayFor(state.startDate, date);
      list.push({
        id: 1000 + i,
        title: n >= 1 && n <= DAYS ? `Day ${n} · your lamp is waiting` : 'Your daily Proverb is waiting',
        body: rs.map((r) => label(r.range)).join(' · '),
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (list.length) await LN.schedule({ notifications: list });
  } catch (e) { console.warn('reminders', e); }
}

// ---------- router ----------
function route() {
  window.onscroll = null;
  selected.clear(); document.getElementById('vbar')?.remove();
  $app.classList.remove('reader-mode');
  if (!state.onboarded) return viewWelcome();
  const [, view, a, b] = (location.hash || '#/today').split('/');
  const isDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '');
  if (view === 'devo') { const d = isDate(a) ? a : today(); const n = nextDevoStep(d); location.replace(n || dayHref(d)); return; }
  const reader = view === 'read' || view === 'pray';
  $tabs.hidden = reader;
  if (!reader && music.isPlaying()) { music.stop(); }
  $tabs.querySelectorAll('a').forEach((x) => x.classList.toggle('on', x.dataset.tab === (view === 'day' ? 'today' : view === 'journal' ? 'journey' : view || 'today')));
  if (!reader) window.scrollTo(0, 0);
  if (view === 'pray') return viewPrayer(a === 'close' ? 'close' : 'open', isDate(b) && b > today() ? b : today());
  if (view === 'day') return viewToday(isDate(a) ? a : today());
  if (reader) return viewReader(a, b);
  if (view === 'journey') return viewJourney();
  if (view === 'settings') { viewSettings(); fillSavedNote(); return; }
  if (view === 'catchup') return viewCatchup();
  if (view === 'prayer') return viewPrayerList();
  if (view === 'journal') return viewJournal();
  return viewToday();
}

function toggle(track, key, on, fromReader = false) {
  const before = readingsFor(state.startDate, dateOfReading(track, key)).every((r) => isDone(r.track, r.key));
  setDone(track, key, on);
  if (on) { haptic(); afterMark(track, key, before, fromReader); }
  scheduleReminders();
}

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-toggle],[data-mark],[data-action],[data-set],[data-start],[data-book]');
  if (!el) return;

  if (el.dataset.toggle) {
    e.preventDefault(); e.stopPropagation();
    const [track, key] = el.dataset.toggle.split('|');
    const on = !isDone(track, key);
    toggle(track, key, on);
    const card = el.closest('.rcard');
    card?.classList.toggle('done', on);
    if (location.hash.includes('catchup')) setTimeout(route, 350); else setTimeout(route, on ? 380 : 0);
    return;
  }
  if (el.dataset.mark) {
    const [track, key] = el.dataset.mark.split('|');
    const on = !isDone(track, key);
    toggle(track, key, on, true);
    if (!on) return route();
    const day = dateOfReading(track, key);
    const dayList = readingsFor(state.startDate, day);
    const next = dayList.find((r) => !isDone(r.track, r.key)) || (day <= today() ? nextUnreadToday() : null);
    const foot = el.parentElement;
    const isToday = day >= today();
    el.outerHTML = `<button class="btn primary block mark-btn done" data-mark="${track}|${key}">${icon('check').replace('<svg', '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"')} Read</button>`;
    if (isToday && !dayList.some((x) => !isDone(x.track, x.key)) && !prayed(day, 'close')) {
      foot.insertAdjacentHTML('afterbegin', `<a class="btn block rise" style="margin-bottom:10px" href="#/pray/close${daySuffix(day)}">${icon('pray').replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')} Continue to closing prayer</a>`);
    } else if (next) {
      foot.insertAdjacentHTML('afterbegin', `<a class="btn block rise t-${next.track}" style="margin-bottom:10px;border-color:var(--c)" href="#/read/${next.track}/${next.key}">Next: ${esc(label(next.range))} ${icon('arrow').replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"')}</a>`);
    } else {
      foot.insertAdjacentHTML('afterbegin', `<a class="btn block rise" style="margin-bottom:10px" href="${dayHref(day > today() ? day : today())}">${day > today() ? `Back to Day ${planDayFor(state.startDate, day)}` : 'Back to today'}</a>`);
    }
    return;
  }
  if (el.dataset.set) {
    state[el.dataset.set] = el.dataset.val; save(); applyTheme(); route(); return;
  }
  if (el.dataset.start) {
    el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));
    const inp = document.getElementById('wstart');
    inp.hidden = el.dataset.start !== 'pick';
    if (el.dataset.start !== 'pick') inp.value = el.dataset.start;
    return;
  }
  if (el.dataset.book) {
    const i = Number(el.dataset.book);
    toast(`${META.books[i].name} · ${Math.round(bookRead(i) * 100)}% read`);
    return;
  }
  const a = el.dataset.action;
  if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/today'); }
  if (a === 'music') {
    state.music ||= { on: false, vol: 0.6 };
    if (music.isPlaying()) { music.stop(); state.music.on = false; }
    else { music.setVolume(state.music.vol ?? 0.6); await music.play(); state.music.on = true; }
    save(); syncMusicButtons();
    if (location.hash.startsWith('#/settings')) route();
  }
  if (a === 'reading-sheet') openReadingSheet();
  if (a === 'v-clear') clearSelection();
  if (a === 'v-react') {
    const items = selectedItems();
    const already = items.every((i) => J.reactionOf(i.k)?.emoji === el.dataset.emoji);
    J.setReaction(items, already ? null : el.dataset.emoji, readerTr);
    haptic();
    clearSelection();
    showBadges(checkBadges());
  }
  if (a === 'v-hl') {
    J.setHighlight(selectedItems(), el.dataset.color || null, readerTr);
    haptic(); toast(el.dataset.color ? 'Highlighted' : 'Highlight removed');
    clearSelection();
  }
  if (a === 'v-copy') {
    try { await navigator.clipboard.writeText(shareText(selectedItems())); toast('Copied'); } catch { toast('Couldn’t copy'); }
    clearSelection();
  }
  if (a === 'v-share') { const items = selectedItems(); await shareVerses(shareText(items), J.refOf(items.map((i) => i.k))); clearSelection(); }
  if (a === 'v-note') {
    const items = selectedItems();
    const ref = J.refOf(items.map((i) => i.k));
    const close = modal(`<div style="text-align:left">
      <div class="eyebrow">${esc(ref)}</div>
      <p class="jc-verse" style="margin:8px 0 12px">${esc(J.quote(items.map((i) => i.text).join(' ').slice(0, 280) + (items.map((i) => i.text).join(' ').length > 280 ? '…' : '')))}</p>
      <textarea id="v-note-text" class="field" rows="4" placeholder="What is God saying to you through this?" maxlength="1000"></textarea>
      <button class="btn primary block" data-action="v-note-save" style="margin-top:12px">Save to my journal</button>
      <button class="btn block" data-close style="margin-top:8px">Cancel</button></div>`);
    viewJournal.pending = { items, close };
    setTimeout(() => document.getElementById('v-note-text')?.focus(), 200);
  }
  if (a === 'v-note-save' && viewJournal.pending) {
    const { items, close } = viewJournal.pending;
    const txt = document.getElementById('v-note-text')?.value || '';
    const color = items.map((i) => J.highlightOf(i.k)?.color).find(Boolean) || 'yellow';
    J.addNote(items, txt, color, readerTr);
    J.setHighlight(items.filter((i) => !J.highlightOf(i.k)), color, readerTr);
    viewJournal.pending = null; close();
    haptic('success'); toast('Saved to your journal');
    clearSelection();
    showBadges(checkBadges());
  }
  if (a === 'j-tab') { journalTab = el.dataset.tab; viewJournal(); }
  if (a === 'j-emo') { journalEmoji = el.dataset.emoji; viewJournal(); }
  if (a === 'j-share') {
    const n = J.allNotes().find((x) => x.id === el.dataset.id);
    if (n) await shareVerses(`${J.quote(n.text)}\n— ${n.ref}${n.tr ? ` (${n.tr})` : ''}`, n.ref);
  }
  if (a === 'h-share') {
    const h = J.highlightOf(el.dataset.k);
    const hv = h || J.reactionOf(el.dataset.k);
    if (hv) await shareVerses(`${J.quote(hv.text)}\n— ${J.refOf([el.dataset.k])}${hv.tr ? ` (${hv.tr})` : ''}`, J.refOf([el.dataset.k]));
  }
  if (a === 'h-remove') { J.setHighlight([{ k: el.dataset.k }], null); J.setReaction([{ k: el.dataset.k }], null); viewJournal(); toast('Removed'); }
  if (a === 'j-menu') {
    const n = J.allNotes().find((x) => x.id === el.dataset.id);
    if (!n) return;
    const close = modal(`<div style="text-align:left">
      <div class="eyebrow">${esc(n.ref)}</div>
      <textarea id="j-edit" class="field" rows="5" maxlength="1000">${esc(n.note)}</textarea>
      <button class="btn primary block" data-action="j-edit-save" data-id="${n.id}" style="margin-top:12px">Save</button>
      <button class="btn block danger" data-action="j-delete" data-id="${n.id}" style="margin-top:8px">Delete note</button></div>`);
    viewJournal.close = close;
  }
  if (a === 'j-edit-save') { J.updateNote(el.dataset.id, document.getElementById('j-edit').value); viewJournal.close?.(); viewJournal(); }
  if (a === 'j-delete') {
    if (el.dataset.confirm) { J.removeNote(el.dataset.id); viewJournal.close?.(); viewJournal(); toast('Note deleted'); }
    else { el.dataset.confirm = '1'; el.textContent = 'Tap again to delete'; }
  }
  if (a === 'pl-prayed') {
    const p = PL.byId(el.dataset.id);
    if (p && p.lastPrayed !== today()) { PL.markPrayed([p.id]); haptic(); toast('Prayed ✦'); showBadges(checkBadges()); }
    viewPrayerList();
  }
  if (a === 'pl-toggle-answered') { showAnswered = !showAnswered; viewPrayerList(); }
  if (a === 'pl-answer') {
    const p = PL.byId(el.dataset.id);
    if (!p) return;
    const close = plSheet(`
      <div class="eyebrow">Answered prayer</div>
      <div class="h2" style="margin:6px 0 12px">${esc(p.text)}</div>
      <textarea id="pl-note" class="field" rows="3" placeholder="How did God answer? (optional)" maxlength="300"></textarea>
      <button class="btn primary block" data-action="pl-answer-save" data-id="${p.id}" style="margin-top:12px">Praise God, it’s answered</button>
      <button class="btn block" data-close style="margin-top:8px">Not yet</button>`);
    viewPrayerList.closeSheet = close;
  }
  if (a === 'pl-answer-save') {
    PL.markAnswered(el.dataset.id, document.getElementById('pl-note')?.value || '');
    viewPrayerList.closeSheet?.();
    haptic('success'); confetti(.6);
    showAnswered = true; viewPrayerList();
    setTimeout(() => showBadges(checkBadges()), 600);
  }
  if (a === 'pl-menu') {
    const p = PL.byId(el.dataset.id);
    if (!p) return;
    const close = plSheet(`
      <div class="eyebrow">Edit request</div>
      <textarea id="pl-edit-text" class="field" rows="3" maxlength="300">${esc(p.text)}</textarea>
      <input id="pl-edit-who" class="field" type="text" placeholder="For whom? (optional)" maxlength="60" value="${esc(p.who || '')}">
      <button class="btn primary block" data-action="pl-edit-save" data-id="${p.id}" style="margin-top:12px">Save</button>
      ${p.answered ? `<button class="btn block" data-action="pl-unanswer" data-id="${p.id}" style="margin-top:8px">Move back to praying</button>` : ''}
      <button class="btn block danger" data-action="pl-delete" data-id="${p.id}" style="margin-top:8px">Delete</button>`);
    viewPrayerList.closeSheet = close;
  }
  if (a === 'pl-edit-save') {
    const text = document.getElementById('pl-edit-text').value.trim();
    if (text) PL.update(el.dataset.id, { text, who: document.getElementById('pl-edit-who').value.trim() });
    viewPrayerList.closeSheet?.(); viewPrayerList();
  }
  if (a === 'pl-unanswer') { PL.unanswer(el.dataset.id); viewPrayerList.closeSheet?.(); viewPrayerList(); }
  if (a === 'pl-delete') {
    if (el.dataset.confirm) { PL.remove(el.dataset.id); viewPrayerList.closeSheet?.(); viewPrayerList(); toast('Request deleted'); }
    else { el.dataset.confirm = '1'; el.textContent = 'Tap again to delete'; }
  }
  if (a === 'pray-next') viewPrayer.next?.();
  if (a === 'music-pref') {
    state.music ||= { on: false, vol: 0.6 };
    state.music.on = !state.music.on; save();
    if (state.music.on) { music.setVolume(state.music.vol ?? 0.6); await music.play(); setTimeout(() => music.stop(), 4000); toast('Soft piano will play during your devotion'); }
    route();
  }
  if (a === 'amen') {
    const which = el.dataset.which;
    const day = el.dataset.date || today();
    setPrayed(day, which); haptic('success');
    if (el.dataset.req) PL.markPrayed(el.dataset.req.split(',').filter(Boolean));
    if (which === 'open') {
      const r = readingsFor(state.startDate, day).find((x) => !isDone(x.track, x.key));
      location.hash = r ? `#/read/${r.track}/${r.key}` : dayHref(day);
    } else {
      location.hash = dayHref(day);
      if (pendingCelebration || readingsFor(state.startDate, day).every((x) => isDone(x.track, x.key))) {
        pendingCelebration = false;
        setTimeout(() => celebrate(checkBadges(), day), 450);
      }
    }
  }
  if (a === 'rhema-new') {
    const idx = randomIndex(currentRhemaIndex());
    state.rhema = { date: today(), idx }; save(); haptic();
    el.classList.add('spin'); setTimeout(() => el.classList.remove('spin'), 500);
    loadRhema(idx);
  }
  if (a === 'rhema-share' && rhemaShown?.text) {
    const msg = `“${rhemaShown.text}”\n— ${rhemaShown.ref} (${rhemaShown.translation})`;
    const Sh = P().Share;
    try {
      if (Sh) await Sh.share({ title: rhemaShown.ref, text: msg, dialogTitle: 'Share this verse' });
      else if (navigator.share) await navigator.share({ text: msg });
      else { await navigator.clipboard.writeText(msg); toast('Verse copied'); }
    } catch {}
  }
  if (a === 'readfont') {
    state.readFont = state.readFont === 'sans' ? 'serif' : 'sans'; save(); applyTheme();
    el.innerHTML = state.readFont === 'sans' ? '<span style="font-family:var(--serif);font-size:19px;font-weight:600">Aa</span>' : '<span style="font-family:var(--sans);font-size:18px;font-weight:800">Aa</span>';
    toast(state.readFont === 'sans' ? 'Sans-serif reading font' : 'Serif reading font');
  }
  if (a === 'font+' || a === 'font-') {
    state.fontScale = Math.max(0.8, Math.min(1.6, +(state.fontScale + (a === 'font+' ? 0.1 : -0.1)).toFixed(2)));
    save(); applyTheme();
    if (!location.hash.startsWith('#/read')) route();
  }
  if (a === 'begin') {
    state.name = document.getElementById('wname').value.trim();
    state.startDate = document.getElementById('wstart').value || today();
    state.onboarded = true; save();
    location.hash = '#/today'; route();
    confetti(.6); haptic('success');
  }
  if (a === 'save-key') {
    const kind = el.dataset.kind || 'NLT';
    const field = kind.toLowerCase() + 'Key';
    const key = document.getElementById(`key-${kind}`).value.trim();
    el.textContent = '…';
    if (!key) { state[field] = ''; save(); route(); return; }
    try {
      await testKey(key, kind);
      state[field] = key; state.translation = kind; save(); toast(`${kind} key works ✓`); route();
    } catch (err) {
      state[field] = key; save();
      toast(navigator.onLine ? `Key saved, but the ${kind} test failed. Check the key.` : 'Saved. We’ll test it when you’re online.');
      route();
    }
  }
  if (a === 'reminder') {
    const LN = P().LocalNotifications;
    if (!state.reminder.on && LN) {
      try { const p = await LN.requestPermissions(); if (p.display !== 'granted') { toast('Notifications are blocked in Android settings'); return; } } catch {}
    }
    state.reminder.on = !state.reminder.on; save(); scheduleReminders();
    if (!LN && state.reminder.on) toast('Reminders work in the Android app');
    route();
  }
  if (a === 'export') {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    try { await navigator.clipboard.writeText(code); toast('Backup code copied'); } catch { prompt('Copy your backup code', code); }
  }
  if (a === 'import') {
    const code = prompt('Paste your backup code');
    if (!code) return;
    try { const s = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); Object.assign(state, s); save(); applyTheme(); toast('Progress restored'); route(); }
    catch { toast('That code didn’t work'); }
  }
  if (a === 'reset') {
    if (confirm('Reset all reading progress, streaks and badges?')) { reset(true); state.startDate = today(); save(); toast('Fresh start'); route(); }
  }
  if (a === 'new-year') {
    state.done.ot = {}; state.done.nt = {}; state.done.ps = {}; state.startDate = today(); save(); confetti(); route();
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.dataset.form === 'pl-add') {
    e.preventDefault();
    const text = document.getElementById('pl-text').value;
    const who = document.getElementById('pl-who').value;
    if (PL.add(text, who)) { haptic(); toast('Added to your prayer list'); viewPrayerList(); }
    else document.getElementById('pl-text').focus();
  }
});

document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'mvol') { state.music ||= { on: false, vol: 0.6 }; state.music.vol = Number(e.target.value) / 100; save(); music.setVolume(state.music.vol); }
  if (id === 'rtime') { state.reminder.time = e.target.value || '06:00'; save(); scheduleReminders(); toast('Reminder time saved'); }
  if (id === 'name') { state.name = e.target.value.trim(); save(); }
  if (id === 'start' && e.target.value) {
    state.startDate = e.target.value; save(); scheduleReminders(); toast(`Plan starts ${fmtDate(state.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}`);
  }
});

window.addEventListener('hashchange', route);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
// Refresh the Today view when the app comes back to the foreground on a new day
let lastDay = today();
let hiddenAt = 0;
let resumeMusic = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); if (music.isPlaying()) { music.stop(0.2); resumeMusic = true; } return; }
  if (resumeMusic) { resumeMusic = false; if (/^#\/(read|pray)/.test(location.hash)) music.play().then(syncMusicButtons); }
  // Coming back after a few minutes counts as a fresh open: new greeting.
  if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) { countOpen(); if (!location.hash.startsWith('#/read')) route(); }
  if (document.visibilityState === 'visible' && today() !== lastDay) { lastDay = today(); route(); scheduleReminders(); }
});

(async function init() {
  await Promise.all([load(), loadPlan()]);
  countOpen();
  applyTheme();
  route();
  scheduleReminders();
})();

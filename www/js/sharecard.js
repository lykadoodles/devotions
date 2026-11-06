// Verse cards: share a verse as a picture, with a background (built-in scenes or
// the reader's own photo) and a font. Drawn on a canvas, so it works offline.
import { state, save } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const FONTS = [
  { id: 'classic', name: 'Classic', family: 'Literata', weight: 400, style: 'normal', scale: 1 },
  { id: 'elegant', name: 'Elegant', family: 'Playfair Display', weight: 600, style: 'italic', scale: 1 },
  { id: 'modern', name: 'Modern', family: 'Manrope', weight: 600, style: 'normal', scale: 0.95 },
  { id: 'script', name: 'Script', family: 'Dancing Script', weight: 600, style: 'normal', scale: 1.2 },
  { id: 'hand', name: 'Handwritten', family: 'Caveat', weight: 600, style: 'normal', scale: 1.3 },
  { id: 'bold', name: 'Bold', family: 'Oswald', weight: 500, style: 'normal', scale: 1, upper: true },
];

// Built-in scenes are painted in code (no stock photos to license).
const SCENES = [
  { id: 'dawn', name: 'Dawn', dark: true },
  { id: 'night', name: 'Starry night', dark: true },
  { id: 'sea', name: 'Sea', dark: true },
  { id: 'hills', name: 'Hills', dark: true },
  { id: 'lamp', name: 'Lamp', dark: true },
  { id: 'paper', name: 'Paper', dark: false },
  { id: 'sage', name: 'Sage', dark: false },
  { id: 'blush', name: 'Blush', dark: false },
];

const SIZES = { square: [1080, 1080], story: [1080, 1920] };

// seeded random so stars/grain look the same in preview and share
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function paintScene(ctx, id, W, H) {
  const lin = (stops, x0 = 0, y0 = 0, x1 = 0, y1 = H) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const fill = (s) => { ctx.fillStyle = s; ctx.fillRect(0, 0, W, H); };
  const r = rng(7);
  if (id === 'dawn') {
    fill(lin([[0, '#1d2b64'], [0.5, '#6b4c9a'], [0.85, '#d9744f'], [1, '#f2a66e']]));
    const g = ctx.createRadialGradient(W / 2, H * 1.02, 10, W / 2, H * 1.02, W * 0.55);
    g.addColorStop(0, 'rgba(255,225,170,.75)'); g.addColorStop(1, 'rgba(255,225,170,0)'); fill(g);
  } else if (id === 'night') {
    fill(lin([[0, '#050a1f'], [0.6, '#14204a'], [1, '#2b3b74']]));
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.75})`; const s = r() * 2.6 + 0.4; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.85, s, 0, 7); ctx.fill(); }
  } else if (id === 'sea') {
    fill(lin([[0, '#9fd3e6'], [0.48, '#e9f4f2'], [0.5, '#2f7ea1'], [1, '#0d3550']]));
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.18})`; ctx.lineWidth = 2 + r() * 3; const y = H * (0.52 + r() * 0.46); const x = r() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + r() * 160, y); ctx.stroke(); }
  } else if (id === 'hills') {
    fill(lin([[0, '#f6c28b'], [0.55, '#f3dfc1'], [1, '#e9e4d4']]));
    [['#8fa98a', 0.62, 0.08], ['#5f7f63', 0.72, 0.1], ['#3d5a45', 0.84, 0.07]].forEach(([c, base, amp], k) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (base + Math.sin(x / W * Math.PI * (1.4 + k * 0.7) + k) * amp));
      ctx.lineTo(W, H); ctx.fill();
    });
  } else if (id === 'lamp') {
    fill(lin([[0, '#1a1208'], [1, '#2e1d0b']]));
    const g = ctx.createRadialGradient(W / 2, H * 0.5, 10, W / 2, H * 0.5, Math.max(W, H) * 0.65);
    g.addColorStop(0, 'rgba(255,190,90,.55)'); g.addColorStop(0.5, 'rgba(240,130,40,.15)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fill(g);
  } else if (id === 'paper') {
    fill('#f6efe1');
    for (let i = 0; i < 3500; i++) { ctx.fillStyle = `rgba(120,90,50,${r() * 0.06})`; ctx.fillRect(r() * W, r() * H, 2, 2); }
  } else if (id === 'sage') {
    fill(lin([[0, '#e4ece0'], [1, '#bfd0bb']], 0, 0, W, H));
  } else if (id === 'blush') {
    fill(lin([[0, '#fbe7e1'], [1, '#f2c9cf']], 0, 0, W, H));
  }
}

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

async function ensureFont(f) { try { await document.fonts.load(`${f.style} ${f.weight} 60px "${f.family}"`); await document.fonts.load('600 40px "Manrope"'); } catch {} }

// Draws the card; returns the canvas
export async function drawCard(canvas, { text, ref, tr }, opt) {
  const [W, H] = SIZES[opt.size] || SIZES.square;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const font = FONTS.find((f) => f.id === opt.font) || FONTS[0];
  await ensureFont(font);
  let dark = true;
  if (opt.bg === 'photo' && opt.photo) {
    const img = opt.photo; const s = Math.max(W / img.width, H / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.fillStyle = `rgba(0,0,0,${opt.dim ?? 0.35})`; ctx.fillRect(0, 0, W, H);
  } else {
    const sc = SCENES.find((x) => x.id === opt.bg) || SCENES[0];
    paintScene(ctx, sc.id, W, H); dark = sc.dark;
  }
  const ink = dark ? '#ffffff' : '#2b2118';
  const sub = dark ? 'rgba(255,255,255,.82)' : 'rgba(43,33,24,.72)';
  const body = font.upper ? text.toUpperCase() : text;
  const quoted = `“${body}”`;
  // fit the text: largest size whose wrapped block fits the box
  const padX = W * 0.11, boxW = W - padX * 2, boxH = H * (opt.size === 'story' ? 0.55 : 0.62);
  let size = 92 * font.scale, lines, lh;
  for (; size > 22; size -= 2) {
    ctx.font = `${font.style} ${font.weight} ${size}px "${font.family}"`;
    lines = wrap(ctx, quoted, boxW); lh = size * (font.id === 'bold' ? 1.2 : 1.38);
    if (lines.length * lh <= boxH) break;
  }
  const refSize = Math.max(30, Math.min(44, size * 0.55));
  const blockH = lines.length * lh + refSize * 2.4;
  let y = (H - blockH) / 2 + lh * 0.8;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (dark) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 2; }
  ctx.fillStyle = ink;
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += lh; }
  ctx.font = `600 ${refSize}px "Manrope"`; ctx.fillStyle = sub;
  ctx.fillText(`— ${ref}${tr ? ` (${tr})` : ''}`, W / 2, y + refSize * 0.9);
  ctx.shadowColor = 'transparent';
  ctx.font = '600 26px "Manrope"'; ctx.fillStyle = dark ? 'rgba(255,255,255,.55)' : 'rgba(43,33,24,.45)';
  ctx.fillText('Lamp · Bible in a Year', W / 2, H - 48);
  return canvas;
}

async function shareCanvas(canvas, ref) {
  const data = canvas.toDataURL('image/png');
  const P = window.Capacitor?.Plugins || {};
  const native = window.Capacitor?.isNativePlatform?.();
  if (native && P.Filesystem && P.Share) {
    const name = `lamp-verse-${Date.now()}.png`;
    const { uri } = await P.Filesystem.writeFile({ path: name, data: data.split(',')[1], directory: 'CACHE' });
    await P.Share.share({ title: ref, files: [uri], dialogTitle: 'Share verse' });
    return;
  }
  const blob = await (await fetch(data)).blob();
  const file = new File([blob], 'lamp-verse.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: ref }); return; }
  const a = document.createElement('a'); a.href = data; a.download = 'lamp-verse.png'; a.click();
}

// Opens the card maker. shareAsText() is the plain-text fallback.
export function openCardMaker(verse, { shareAsText, toast = () => {} } = {}) {
  const opt = { size: 'square', bg: 'dawn', font: 'classic', dim: 0.35, ...(state.cardStyle || {}), photo: null };
  if (opt.bg === 'photo') opt.bg = 'dawn';
  const o = document.createElement('div');
  o.className = 'overlay sheet-overlay';
  o.innerHTML = `<div class="sheet card-sheet" role="dialog" aria-label="Share verse as a picture">
    <div class="sheet-grip"></div>
    <div class="card-preview"><canvas id="vc-canvas"></canvas></div>
    <div class="eyebrow">Background</div>
    <div class="chip-row" id="vc-bg">
      <label class="bg-chip photo-chip" title="Your photo"><input type="file" accept="image/*" hidden id="vc-file"><span>＋</span><small>Photo</small></label>
      ${SCENES.map((s) => `<button class="bg-chip" data-bg="${s.id}"><canvas width="96" height="96" data-scene="${s.id}"></canvas><small>${esc(s.name)}</small></button>`).join('')}
    </div>
    <div class="dim-row" id="vc-dim" hidden><span class="muted">Darken photo</span><input type="range" min="0" max="0.7" step="0.05" id="vc-dimr"></div>
    <div class="eyebrow">Font</div>
    <div class="chip-row" id="vc-font">${FONTS.map((f) => `<button class="font-chip" data-font="${f.id}" style="font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight}">${f.upper ? f.name.toUpperCase() : f.name}</button>`).join('')}</div>
    <div class="seg-ctl" id="vc-size"><button data-size="square">Square (post)</button><button data-size="story">Tall (story)</button></div>
    <button class="btn primary block" data-act="share-img" style="margin-top:14px">Share picture</button>
    <button class="btn block" data-act="share-text" style="margin-top:8px">Share as text instead</button>
  </div>`;
  document.body.appendChild(o);
  const canvas = o.querySelector('#vc-canvas');
  o.querySelectorAll('canvas[data-scene]').forEach((c) => paintScene(c.getContext('2d'), c.dataset.scene, 96, 96));
  let busy = 0;
  const redraw = async () => {
    const me = ++busy;
    o.querySelectorAll('[data-bg]').forEach((b) => b.classList.toggle('on', b.dataset.bg === opt.bg));
    o.querySelector('.photo-chip').classList.toggle('on', opt.bg === 'photo');
    o.querySelectorAll('[data-font]').forEach((b) => b.classList.toggle('on', b.dataset.font === opt.font));
    o.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === opt.size));
    o.querySelector('#vc-dim').hidden = opt.bg !== 'photo';
    o.querySelector('#vc-dimr').value = opt.dim;
    const tmp = document.createElement('canvas');
    await drawCard(tmp, verse, opt);
    if (me !== busy) return;
    canvas.width = tmp.width; canvas.height = tmp.height; canvas.getContext('2d').drawImage(tmp, 0, 0);
  };
  const remember = () => { const { photo, ...keep } = opt; state.cardStyle = keep; save(); };
  redraw();
  const close = () => o.remove();
  o.addEventListener('click', async (e) => {
    if (e.target === o) return close();
    const b = e.target.closest('[data-bg]'); if (b) { opt.bg = b.dataset.bg; remember(); return redraw(); }
    const f = e.target.closest('[data-font]'); if (f) { opt.font = f.dataset.font; remember(); return redraw(); }
    const s = e.target.closest('[data-size]'); if (s) { opt.size = s.dataset.size; remember(); return redraw(); }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'share-text') { close(); return shareAsText?.(); }
    if (act === 'share-img') {
      const btn = e.target.closest('[data-act]'); btn.disabled = true; btn.textContent = 'Preparing…';
      try { const c = document.createElement('canvas'); await drawCard(c, verse, opt); await shareCanvas(c, verse.ref); close(); }
      catch (err) { if (!/cancel/i.test(err?.message || '')) toast('Couldn’t share the picture'); btn.disabled = false; btn.textContent = 'Share picture'; }
    }
  });
  o.querySelector('#vc-dimr').addEventListener('input', (e) => { opt.dim = +e.target.value; remember(); redraw(); });
  o.querySelector('#vc-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = new Image();
    img.onload = () => { opt.photo = img; opt.bg = 'photo'; redraw(); };
    img.onerror = () => toast('Couldn’t open that photo');
    img.src = URL.createObjectURL(file);
  });
}

const { chromium } = require('playwright');
const fs = require('fs');
const F = '/home/claude/devotions/www/fonts/';
const font = (n, f) => `@font-face{font-family:${n};src:url(data:font/woff2;base64,${fs.readFileSync(F + f).toString('base64')})}`;
const img = (f) => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
const FLAME = (w) => `<svg viewBox="0 0 100 130" width="${w}" style="display:block;overflow:visible;filter:drop-shadow(0 0 ${w/4}px rgba(255,150,60,.9)) drop-shadow(0 0 ${w/14}px rgba(255,210,120,.9))"><defs><radialGradient id="g${w}" cx="50%" cy="78%" r="70%"><stop offset="0" stop-color="#fff7d6"/><stop offset=".3" stop-color="#ffd166"/><stop offset=".65" stop-color="#f4892f"/><stop offset="1" stop-color="#d9480f"/></radialGradient></defs><path d="M50 4C58 27 84 42 84 78c0 27-16 48-34 48S16 105 16 78c0-20 12-31 19-47 4 14 10 20 15 22C50 37 45 21 50 4z" fill="url(#g${w})"/><path d="M50 62c6 12 17 20 17 36 0 14-8 22-17 22s-17-8-17-22c0-12 11-21 17-36z" fill="#fff4c9" opacity=".95"/></svg>`;
const CSS = (w, h) => `${font('M8', 'manrope-latin-800-normal.woff2')}${font('M5', 'manrope-latin-500-normal.woff2')}${font('L4i', 'literata-latin-400-italic.woff2')}
*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;position:relative;color:#fff;font-family:M5;
background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 3px,transparent 3px 70px),radial-gradient(60% 45% at 75% 40%,rgba(255,150,70,.22),rgba(255,150,70,0) 70%),radial-gradient(120% 60% at 85% -5%,#5b8cff,rgba(91,140,255,0) 55%),radial-gradient(90% 55% at 0% 100%,#3a2fd6,rgba(58,47,214,0) 60%),linear-gradient(180deg,#2a5be8,#1f44c4 45%,#172c88)}
.abs{position:absolute}.brand{display:flex;align-items:center;gap:12px;font-family:M8;letter-spacing:.2em;color:#dbe6ff}
h1{font-family:M8;letter-spacing:-2px;line-height:1.05;text-shadow:0 0 34px rgba(170,205,255,.7)}.acc{color:#ffbf70;text-shadow:0 0 30px rgba(255,160,70,.8)}
p{color:#dbe6ff;line-height:1.4}
.phone{border-radius:56px;padding:11px;background:linear-gradient(150deg,rgba(255,255,255,.6),rgba(255,255,255,.18) 40%,rgba(255,255,255,.38));box-shadow:0 40px 80px -20px rgba(5,10,50,.85),0 0 70px -10px rgba(160,196,255,.5)}
.phone .s{border-radius:46px;overflow:hidden;background:#10236e}.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.verse{font-family:L4i;color:#e6edff}`;
const phone = (src, w, style = '') => `<div class="phone abs" style="width:${w}px;height:${Math.round(w * 2.02)}px;${style}"><div class="s" style="height:100%"><img src="${img(src)}"></div></div>`;
const R = '/tmp/claude-0/video/raw/', A = '/tmp/claude-0/au/';

const cover = `<style>${CSS(1640, 924)}</style>
<div class="abs" style="left:110px;top:200px;width:760px">
  <div class="brand" style="font-size:30px">${FLAME(34)}LAMP</div>
  <h1 style="font-size:92px;margin-top:26px">Read your Bible<br>in a <span class="acc">year</span></h1>
  <p style="font-size:34px;margin-top:22px">About 15 minutes a day · Prayer · Scripture · Reflection</p>
  <p class="verse" style="font-size:28px;margin-top:26px">“Your word is a lamp to my feet and a light to my path.” <span style="font-family:M5;font-style:normal;font-size:22px;letter-spacing:.08em;color:#c9d8ff">PSALM 119:105</span></p>
</div>
${phone(R + 'journey.jpg', 250, 'left:1010px;top:250px;transform:rotate(-9deg)')}
${phone(R + 'celebrate.jpg', 250, 'left:1330px;top:250px;transform:rotate(9deg)')}
${phone(R + 'today.jpg', 280, 'left:1160px;top:175px')}`;

const post = (h, s, shot, extra = '') => `<style>${CSS(1080, 1350)}</style>
<div class="brand abs" style="top:66px;left:0;right:0;justify-content:center;font-size:28px">${FLAME(30)}LAMP</div>
<div class="abs" style="top:140px;left:60px;right:60px;text-align:center"><h1 style="font-size:84px">${h}</h1><p style="font-size:36px;margin-top:20px">${s}</p></div>
${phone(shot, 560, 'left:260px;top:520px')}${extra}`;

const POSTS = [
  ['fb-post-1-whole-bible.png', 'The whole Bible<br>in a <span class="acc">year</span>', 'Old Testament · New Testament · Psalms · Proverbs<br>About 15 minutes a day', R + 'today.jpg'],
  ['fb-post-2-audio.png', 'Listen to<br><span class="acc">God’s Word</span>', 'Read aloud, verse by verse, even with your screen off', A + '2-reading.png'],
  ['fb-post-3-highlight.png', 'Highlight, <span class="acc">react</span>,<br>remember', 'Tap any verse. Mark how it moved you.', R + 'versebar.jpg'],
  ['fb-post-4-prayer.png', 'A prayer list you<br><span class="acc">actually pray</span>', 'Mark answered prayers. See God’s faithfulness.', R + 'prayerlist.jpg'],
  ['fb-post-5-streak.png', 'Watch your<br><span class="acc">lamp grow</span>', 'Streaks, badges and a celebration for every full day', R + 'celebrate.jpg'],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setViewportSize({ width: 1640, height: 924 }); await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: 'fb-cover-photo.png' });
  await p.setViewportSize({ width: 1080, height: 1350 });
  for (const [f, h, s, shot] of POSTS) { await p.setContent(post(h, s, shot)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: f }); }
  await b.close();
})();

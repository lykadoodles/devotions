// Soft ambient piano, generated live with the Web Audio API.
// No recordings: a slow chord progression with gentle arpeggiated notes,
// piano-like tones (layered sines with a soft attack and long decay),
// a warm low-pass filter and a generated reverb tail.

let ctx = null;
let master, dry, wet, filter, timer = null;
let playing = false;
let nextTime = 0;
let step = 0;
let volume = 0.6;

// D major, slow and hopeful: Dmaj9 – Bm7 – Gmaj7 – A(sus) – repeated with variations
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
const PROGRESSIONS = [
  [[50, 62, 66, 69, 76], [47, 62, 66, 69, 74], [43, 59, 62, 66, 71], [45, 61, 64, 69, 73]],
  [[50, 62, 66, 69, 73], [42, 61, 66, 69, 73], [47, 59, 62, 66, 71], [43, 59, 62, 67, 74]],
  [[43, 59, 62, 66, 71], [45, 61, 64, 69, 76], [47, 62, 66, 69, 74], [50, 62, 66, 69, 78]],
];
const MELODY = [74, 76, 78, 81, 83, 86, 88]; // D-major pentatonic, upper register
const BEAT = 0.78;          // seconds per beat (~77 bpm)
const BEATS_PER_CHORD = 8;  // long, unhurried chords

function impulse(seconds = 4.2, decay = 3.2) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  filter.Q.value = 0.3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 3;
  dry = ctx.createGain(); dry.gain.value = 0.55;
  wet = ctx.createGain(); wet.gain.value = 0.6;
  const verb = ctx.createConvolver(); verb.buffer = impulse();
  filter.connect(dry).connect(comp);
  filter.connect(verb).connect(wet).connect(comp);
  comp.connect(master).connect(ctx.destination);
}

// One piano-like note
function note(midi, time, vel = 0.2, length = 4) {
  const f = MIDI(midi);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, time);
  out.gain.exponentialRampToValueAtTime(vel, time + 0.012);
  out.gain.exponentialRampToValueAtTime(vel * 0.45, time + 0.35);
  out.gain.exponentialRampToValueAtTime(0.0001, time + length);
  out.connect(filter);
  const partials = [[1, 1], [2, 0.32], [3, 0.12], [4, 0.05]];
  for (const [mult, amp] of partials) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * mult;
    o.detune.value = (Math.random() - 0.5) * 6;
    const g = ctx.createGain();
    // higher partials fade faster, like a real string
    g.gain.setValueAtTime(amp, time);
    g.gain.exponentialRampToValueAtTime(Math.max(amp * 0.02, 0.0001), time + length / mult);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + length + 0.1);
  }
}

function schedule() {
  // schedule ~1.5 s ahead
  while (nextTime < ctx.currentTime + 1.5) {
    const beatInChord = step % BEATS_PER_CHORD;
    const chordIndex = Math.floor(step / BEATS_PER_CHORD);
    const prog = PROGRESSIONS[Math.floor(chordIndex / 4) % PROGRESSIONS.length];
    const chord = prog[chordIndex % 4];
    const t = nextTime + (Math.random() - 0.5) * 0.02;
    if (beatInChord === 0) {
      note(chord[0] - 12, t, 0.12, 7);           // soft low bass
      note(chord[0], t + 0.02, 0.1, 6.5);
      chord.slice(1).forEach((n, i) => note(n, t + 0.18 + i * 0.16, 0.07, 6)); // rolled chord
    } else if (beatInChord === 4 && Math.random() < 0.6) {
      chord.slice(2).forEach((n, i) => note(n, t + i * 0.12, 0.05, 4.5));
    }
    // sparse melody
    if (beatInChord % 2 === 1 && Math.random() < 0.45) {
      const pool = MELODY.filter((m) => chord.some((c) => (m - c) % 12 === 0) || Math.random() < 0.35);
      const m = pool[Math.floor(Math.random() * pool.length)] || MELODY[0];
      note(m, t, 0.06 + Math.random() * 0.03, 3.5);
    }
    nextTime += BEAT;
    step++;
  }
}

export function isPlaying() { return playing; }

export async function play() {
  try {
    if (!ctx) setup();
    if (ctx.state === 'suspended') await ctx.resume();
    if (playing) return;
    playing = true;
    nextTime = ctx.currentTime + 0.1;
    step = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume * 0.9, ctx.currentTime + 2.5);
    schedule();
    timer = setInterval(schedule, 300);
  } catch (e) { console.warn('music', e); playing = false; }
}

export function stop(fade = 1.5) {
  if (!ctx || !playing) return;
  playing = false;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  clearInterval(timer); timer = null;
  setTimeout(() => { if (!playing) ctx.suspend(); }, fade * 1000 + 200);
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (ctx && playing) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume * 0.9, ctx.currentTime + 0.3);
  }
}

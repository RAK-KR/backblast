// Web Audio 합성 효과음. 고음 없이 저역 위주로 묵직하게.
let ctx = null;
let master = null;
let comp = null;
let noiseBuf = null;
let volume = 0.7;
const lastPlay = {};

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    ctx = null;
    return;
  }
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 5;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(comp);
  comp.connect(ctx.destination);

  const len = ctx.sampleRate * 1.5;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

function throttle(name, gap) {
  const t = performance.now();
  if (lastPlay[name] && t - lastPlay[name] < gap) return true;
  lastPlay[name] = t;
  return false;
}

function noise(dur, freq, q, gain, sweepTo = null, type = 'lowpass') {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function thump(freqStart, freqEnd, dur, gain, type = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(freqStart, t);
  o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  rifle() {
    if (!ctx || throttle('rifle', 35)) return;
    noise(0.07, 1400, 0.8, 0.32, 300);
    thump(150, 55, 0.08, 0.45);
  },
  needle() {
    if (!ctx || throttle('needle', 30)) return;
    noise(0.045, 1200, 0.8, 0.22, 350);
    thump(130, 60, 0.05, 0.3);
  },
  repeater() {
    if (!ctx) return;
    noise(0.14, 1100, 0.9, 0.42, 180);
    thump(120, 40, 0.16, 0.7);
  },
  lance() {
    if (!ctx) return;
    noise(0.35, 900, 1.2, 0.5, 90);
    thump(90, 28, 0.45, 0.9, 'triangle');
    thump(60, 30, 0.5, 0.5, 'sawtooth');
  },
  blast() {
    if (!ctx) return;
    noise(0.32, 1000, 0.7, 0.75, 110);
    thump(95, 32, 0.32, 1.0);
  },
  slug() {
    if (!ctx) return;
    noise(0.4, 800, 0.9, 0.8, 80);
    thump(80, 26, 0.45, 1.1, 'triangle');
  },
  empty() {
    if (!ctx || throttle('empty', 120)) return;
    thump(220, 140, 0.04, 0.25, 'square');
  },
  hit() {
    if (!ctx || throttle('hit', 45)) return;
    noise(0.05, 700, 2, 0.18, 300, 'bandpass');
    thump(110, 70, 0.05, 0.2, 'triangle');
  },
  bigHit() {
    if (!ctx || throttle('bighit', 60)) return;
    noise(0.12, 600, 1.5, 0.4, 150, 'bandpass');
    thump(90, 40, 0.14, 0.5, 'triangle');
  },
  hurt() {
    if (!ctx) return;
    noise(0.25, 500, 1, 0.6, 120);
    thump(70, 35, 0.3, 0.8, 'sawtooth');
  },
  telegraph() {
    if (!ctx || throttle('tele', 150)) return;
    thump(70, 64, 0.5, 0.25, 'sawtooth');
  },
  laser() {
    if (!ctx) return;
    noise(0.55, 600, 3, 0.45, 200, 'bandpass');
    thump(58, 45, 0.6, 0.55, 'sawtooth');
  },
  slam() {
    if (!ctx) return;
    noise(0.6, 600, 0.7, 0.9, 50);
    thump(60, 22, 0.7, 1.2);
  },
  orb() {
    if (!ctx || throttle('orb', 90)) return;
    thump(120, 60, 0.15, 0.3, 'triangle');
  },
  explode() {
    if (!ctx || throttle('explode', 50)) return;
    noise(0.5, 700, 0.8, 0.7, 60);
    thump(70, 25, 0.5, 0.8);
  },
  groggy() {
    if (!ctx) return;
    noise(1.0, 400, 0.8, 0.6, 60);
    thump(50, 20, 1.1, 1.0, 'sawtooth');
    thump(75, 37, 0.9, 0.6, 'triangle');
  },
  land() {
    if (!ctx || throttle('land', 150)) return;
    noise(0.08, 300, 1, 0.2, 100);
  },
  reload() {
    if (!ctx || throttle('reload', 100)) return;
    noise(0.04, 900, 4, 0.18, 500, 'bandpass');
    setTimeout(() => ctx && noise(0.05, 700, 4, 0.2, 400, 'bandpass'), 70);
  },
  bossDown() {
    if (!ctx) return;
    noise(1.8, 600, 0.6, 1.0, 30);
    thump(55, 18, 2.0, 1.2);
    thump(82, 30, 1.6, 0.6, 'triangle');
  },
  drop(rarity) {
    if (!ctx) return;
    const base = [110, 131, 147, 165][rarity] || 110;
    thump(base, base, 0.6, 0.4, 'triangle');
    setTimeout(() => ctx && thump(base * 1.5, base * 1.5, 0.8, 0.35, 'triangle'), 110);
    if (rarity >= 2) setTimeout(() => ctx && thump(base * 2, base * 2, 1.0, 0.3, 'triangle'), 220);
    noise(0.5, 500, 0.8, 0.3, 120);
  },
  jet() {
    if (!ctx || throttle('jet', 90)) return;
    noise(0.12, 700, 0.6, 0.22, 250);
  },
  hook() {
    if (!ctx) return;
    noise(0.08, 1200, 3, 0.25, 500, 'bandpass');
    thump(160, 90, 0.08, 0.3, 'triangle');
  },
  latch() {
    if (!ctx) return;
    noise(0.1, 800, 2, 0.35, 300, 'bandpass');
    thump(120, 60, 0.12, 0.45, 'triangle');
  },
  ui() {
    if (!ctx || throttle('ui', 60)) return;
    thump(180, 120, 0.05, 0.2, 'triangle');
  },
};

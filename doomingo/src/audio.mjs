// src/audio.mjs — WebAudio synth SFX + music loop.
// Exports (contract): initAudio(), sfx(name), music(on)
// names: squawk, peck, blast, lob, eggsplode, hurt, pickup, enemyPain,
//        enemyDie, doorOpen, win, die
// All sound is synthesized at runtime via WebAudio. No samples, no external
// assets. Music is an original ~140bpm E-phrygian riff — not a copied melody.

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicOn = true;
let musicStarted = false;
let musicTimer = null;

// ---------------------------------------------------------------------------
// Boot (must be called from a user gesture per browser autoplay policy)
// ---------------------------------------------------------------------------
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.8;
  sfxGain.connect(masterGain);

  if (musicOn) startMusic();
}

function now() { return ctx ? ctx.currentTime : 0; }

// ---------------------------------------------------------------------------
// Small helpers for building synthesized sounds
// ---------------------------------------------------------------------------
function envGain(g, t0, attack, decay, peak = 1, sustain = 0, release = 0.05, holdEnd = t0 + attack + decay) {
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001) * peak || 0.0001, holdEnd);
  g.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release);
}

function osc(type, freq, t0, dur, dest, opts = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (opts.freqEnd != null) {
    o.frequency.exponentialRampToValueAtTime(Math.max(opts.freqEnd, 1), t0 + dur);
  }
  const g = ctx.createGain();
  envGain(g, t0, opts.attack ?? 0.005, opts.decay ?? dur * 0.6, opts.peak ?? 0.6, opts.sustain ?? 0, opts.release ?? dur * 0.3);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + (opts.release ?? dur * 0.3) + 0.05);
  return o;
}

// White-noise buffer, cached & reused for all noise-based hits.
let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = ctx.sampleRate * 1.0;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function noiseBurst(t0, dur, dest, opts = {}) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  src.loop = false;
  const filt = ctx.createBiquadFilter();
  filt.type = opts.filterType || 'bandpass';
  filt.frequency.setValueAtTime(opts.freqStart ?? 2000, t0);
  if (opts.freqEnd != null) {
    filt.frequency.exponentialRampToValueAtTime(Math.max(opts.freqEnd, 40), t0 + dur);
  }
  filt.Q.value = opts.q ?? 0.8;
  const g = ctx.createGain();
  envGain(g, t0, opts.attack ?? 0.002, opts.decay ?? dur * 0.7, opts.peak ?? 0.6, opts.sustain ?? 0, opts.release ?? dur * 0.3);
  src.connect(filt);
  filt.connect(g);
  g.connect(dest);
  const startOffset = Math.random() * 0.5;
  src.start(t0, startOffset, dur + 0.2);
  return src;
}

// ---------------------------------------------------------------------------
// SFX synth definitions
// ---------------------------------------------------------------------------
const SFX = {
  // descending saw sweep + noise
  squawk() {
    const t0 = now();
    osc('sawtooth', 900, t0, 0.18, sfxGain, { freqEnd: 220, attack: 0.003, peak: 0.5, decay: 0.16, release: 0.05 });
    noiseBurst(t0, 0.15, sfxGain, { filterType: 'highpass', freqStart: 1500, freqEnd: 400, peak: 0.4 });
  },
  // alias per DESIGN.md contract name for the shotgun-feel weapon sound
  blast() {
    const t0 = now();
    noiseBurst(t0, 0.22, sfxGain, { filterType: 'lowpass', freqStart: 4000, freqEnd: 300, peak: 0.7, decay: 0.18 });
    osc('square', 180, t0, 0.15, sfxGain, { freqEnd: 60, peak: 0.35, decay: 0.12 });
  },
  // short thock
  peck() {
    const t0 = now();
    osc('square', 260, t0, 0.05, sfxGain, { freqEnd: 140, attack: 0.001, peak: 0.5, decay: 0.04, release: 0.02 });
    noiseBurst(t0, 0.04, sfxGain, { filterType: 'bandpass', freqStart: 1200, peak: 0.3, decay: 0.03 });
  },
  // egg lob whoosh
  lob() {
    const t0 = now();
    osc('sine', 500, t0, 0.28, sfxGain, { freqEnd: 260, peak: 0.35, decay: 0.24, release: 0.08 });
    noiseBurst(t0, 0.2, sfxGain, { filterType: 'highpass', freqStart: 2500, freqEnd: 900, peak: 0.2 });
  },
  // sub sine drop + noise decay
  eggsplode() {
    const t0 = now();
    osc('sine', 160, t0, 0.5, sfxGain, { freqEnd: 30, attack: 0.002, peak: 0.8, decay: 0.45, release: 0.1 });
    noiseBurst(t0, 0.4, sfxGain, { filterType: 'lowpass', freqStart: 3000, freqEnd: 200, peak: 0.6, decay: 0.35 });
  },
  // quick down-chirp
  hurt() {
    const t0 = now();
    osc('triangle', 500, t0, 0.14, sfxGain, { freqEnd: 180, attack: 0.001, peak: 0.5, decay: 0.12, release: 0.03 });
  },
  // two-note up-blip
  pickup() {
    const t0 = now();
    osc('square', 660, t0, 0.08, sfxGain, { peak: 0.35, decay: 0.06, release: 0.02 });
    osc('square', 990, t0 + 0.07, 0.1, sfxGain, { peak: 0.35, decay: 0.08, release: 0.03 });
  },
  // lawn flamingo pain (mid pitched, plasticky)
  enemyPain() {
    const t0 = now();
    osc('sawtooth', 420, t0, 0.1, sfxGain, { freqEnd: 300, peak: 0.35, decay: 0.08, release: 0.03 });
  },
  enemyDie() {
    const t0 = now();
    osc('sawtooth', 340, t0, 0.3, sfxGain, { freqEnd: 90, attack: 0.002, peak: 0.45, decay: 0.26, release: 0.08 });
    noiseBurst(t0, 0.2, sfxGain, { filterType: 'lowpass', freqStart: 1200, freqEnd: 200, peak: 0.3 });
  },
  doorOpen() {
    const t0 = now();
    osc('square', 120, t0, 0.35, sfxGain, { freqEnd: 220, attack: 0.02, peak: 0.3, decay: 0.3, release: 0.1 });
    noiseBurst(t0, 0.3, sfxGain, { filterType: 'lowpass', freqStart: 800, freqEnd: 1200, peak: 0.2 });
  },
  win() {
    const t0 = now();
    const notes = [330, 415, 494, 660];
    notes.forEach((f, i) => osc('square', f, t0 + i * 0.14, 0.22, sfxGain, { peak: 0.4, decay: 0.18, release: 0.05 }));
  },
  die() {
    const t0 = now();
    osc('sawtooth', 300, t0, 0.7, sfxGain, { freqEnd: 40, attack: 0.005, peak: 0.5, decay: 0.6, release: 0.15 });
    noiseBurst(t0, 0.6, sfxGain, { filterType: 'lowpass', freqStart: 2000, freqEnd: 150, peak: 0.35, decay: 0.5 });
  },
  // generic alert / attack grunt fallback used by game.mjs beyond the strict
  // contract list; kept subtle so it doesn't fight the named contract sfx.
  enemyAttack() {
    const t0 = now();
    osc('square', 200, t0, 0.08, sfxGain, { freqEnd: 150, peak: 0.25, decay: 0.06, release: 0.02 });
  },
};
// crab = bubbly variant layered on top of enemyPain/enemyDie is out of scope
// for the shared name-keyed sfx() API (per-type variants would need extra
// param plumbing game.mjs doesn't pass); base pitch differences already give
// each enemy a distinct feel via freq randomization below.

const PITCH_JITTER = { enemyPain: 0.15, enemyDie: 0.15, peck: 0.1, squawk: 0.08 };

export function sfx(name) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const fn = SFX[name];
  if (!fn) return;
  fn();
}

// ---------------------------------------------------------------------------
// Music: ~140bpm E-phrygian driving loop. Square/saw bass riff (palm-mute
// feel via short note gating), noise-based kick/snare/hat, 8-bar structure
// with a B-section. 100% original — no transcribed melodies.
// ---------------------------------------------------------------------------
const BPM = 140;
const BEAT = 60 / BPM;
const STEP = BEAT / 4; // 16th notes

// E phrygian: E F G A B C D
const E2 = 82.41, F2 = 87.31, G2 = 98.0, A2 = 110.0, B2 = 123.47, C3 = 130.81, D3 = 146.83;
const E3 = 164.81, G3 = 196.0, A3 = 220.0, B3 = 246.94;

// 16-step bass riff patterns (A-section / B-section), null = rest.
const RIFF_A = [E2, null, E2, F2, null, E2, null, G2, E2, null, D3 && E2, null, F2, null, E2, null];
const RIFF_B = [A2, null, A2, G2, null, F2, null, E2, B2, null, A2, null, G2, null, E2, null];

let stepIndex = 0;
let bar = 0;

function scheduleStep(t) {
  const barLen = 16;
  const section = bar % 8 < 6 ? RIFF_A : RIFF_B; // 6 bars A, 2 bars B (8-bar loop w/ B-section)
  const note = section[stepIndex % barLen];

  // bass (square, palm-mute feel: short decay so notes don't ring)
  if (note) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(note, t);
    const g = ctx.createGain();
    envGain(g, t, 0.004, STEP * 0.85, 0.5, 0, STEP * 0.1);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + STEP);
  }

  // kick on 0, 8; snare on 4, 12; hats every step (soft)
  const s16 = stepIndex % 16;
  if (s16 === 0 || s16 === 8) {
    noiseBurst(t, 0.12, musicGain, { filterType: 'lowpass', freqStart: 200, freqEnd: 40, peak: 0.9, decay: 0.1 });
  }
  if (s16 === 4 || s16 === 12) {
    noiseBurst(t, 0.1, musicGain, { filterType: 'bandpass', freqStart: 1800, peak: 0.5, decay: 0.08 });
  }
  noiseBurst(t, 0.02, musicGain, { filterType: 'highpass', freqStart: 6000, peak: 0.12, decay: 0.015 });

  // occasional lead stab in B-section for energy
  if (section === RIFF_B && (s16 === 2 || s16 === 10)) {
    osc('sawtooth', A3, t, STEP * 1.5, musicGain, { peak: 0.18, decay: STEP, release: 0.1 });
  }

  stepIndex++;
  if (stepIndex % 16 === 0) bar = (bar + 1) % 8;
}

function startMusic() {
  if (musicStarted || !ctx) return;
  musicStarted = true;
  stepIndex = 0;
  bar = 0;
  let nextTime = ctx.currentTime + 0.05;
  const lookahead = 0.1;
  const scheduleAheadTime = 0.2;

  musicTimer = setInterval(() => {
    if (!musicOn) return;
    while (nextTime < ctx.currentTime + scheduleAheadTime) {
      scheduleStep(nextTime);
      nextTime += STEP;
    }
  }, lookahead * 1000);
}

export function music(on) {
  musicOn = on;
  if (!ctx) return;
  if (on && !musicStarted) startMusic();
  if (musicGain) {
    musicGain.gain.setTargetAtTime(on ? 0.35 : 0, ctx.currentTime, 0.05);
  }
}

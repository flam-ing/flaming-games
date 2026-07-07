// SUPER MINGO — audio.mjs
// WebAudio-only sound engine. Original melodies (never any known game tune).
// Exports: initAudio(), sfx(name), music(track, fast=false)

let actx = null;
let masterGain = null;
let musicMuted = false;

let currentTrack = 'off';
let currentFast = false;
let seqTimer = null;
let seqStep = 0;

// ---------------------------------------------------------------------------
// Init (call on first user gesture)
// ---------------------------------------------------------------------------

export function initAudio() {
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  actx = new AC();
  masterGain = actx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(actx.destination);
  if (actx.state === 'suspended') actx.resume();
}

export function toggleMute() {
  musicMuted = !musicMuted;
  if (musicMuted) stopSequencer();
  else if (currentTrack !== 'off') startSequencer(currentTrack, currentFast);
  return musicMuted;
}

export function isMuted() { return musicMuted; }

// ---------------------------------------------------------------------------
// Low-level oscillator helpers
// ---------------------------------------------------------------------------

function now() { return actx.currentTime; }

function envGain(startTime, attack, decay, peak) {
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(peak, startTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);
  return g;
}

function tone(freq, startTime, dur, type = 'square', peak = 0.25, dest = masterGain) {
  if (!actx) return;
  const osc = actx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  const g = envGain(startTime, 0.005, dur, peak);
  osc.connect(g);
  g.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = actx.sampleRate * 0.3;
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function noiseHit(startTime, dur, peak = 0.2, filterFreq = 4000) {
  if (!actx) return;
  const src = actx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const filt = actx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = filterFreq;
  const g = envGain(startTime, 0.001, dur, peak);
  src.connect(filt);
  filt.connect(g);
  g.connect(masterGain);
  src.start(startTime);
  src.stop(startTime + dur + 0.02);
}

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------

const SFX = {
  'flap-jump': () => { const t = now(); slide2(520, 780, t, 0.11, 'square', 0.22); noiseHit(t, 0.04, 0.08, 6000); },
  'flutter': () => { const t = now(); tone(700, t, 0.05, 'square', 0.18); tone(820, t + 0.06, 0.05, 'square', 0.18); },
  'stomp': () => { const t = now(); tone(180, t, 0.07, 'square', 0.22); noiseHit(t, 0.03, 0.1, 2000); },
  'stomp-bounce': () => { const t = now(); tone(180, t, 0.07, 'square', 0.22); noiseHit(t, 0.03, 0.1, 2000); },
  'bump': () => { const t = now(); tone(300, t, 0.05, 'square', 0.2); },
  'pearl': () => { const t = now(); tone(1046, t, 0.06, 'square', 0.2); tone(1568, t + 0.045, 0.09, 'square', 0.2); },
  'shrimp-powerup': () => {
    const t = now();
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.05, 0.09, 'square', 0.22));
  },
  'preen-oil': () => {
    const t = now();
    [392, 494, 587, 784, 987].forEach((f, i) => tone(f, t + i * 0.045, 0.12, 'triangle', 0.2));
  },
  '1up': () => {
    const t = now();
    [660, 880, 1046, 1318, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.1, 'square', 0.2));
  },
  'brick-break': () => { const t = now(); noiseHit(t, 0.14, 0.22, 1200); },
  'flare-spit': () => { const t = now(); slide2(900, 300, t, 0.09, 'sawtooth', 0.18); },
  'hurt': () => { const t = now(); slide2(400, 120, t, 0.22, 'square', 0.24); },
  'warp': () => { const t = now(); slide2(200, 500, t, 0.18, 'triangle', 0.2); },
  'checkpoint': () => { const t = now(); tone(659, t, 0.06, 'square', 0.18); tone(880, t + 0.06, 0.1, 'square', 0.18); },
  'shell-close': () => { const t = now(); noiseHit(t, 0.05, 0.18, 3000); tone(150, t, 0.05, 'square', 0.15); },
  'shell-kick': () => { const t = now(); tone(220, now(), 0.05, 'square', 0.2); noiseHit(now(), 0.06, 0.15, 5000); },
  'pole-jingle': () => {
    const t = now();
    [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.14, 'triangle', 0.22));
  },
  'fish-lob': () => { const t = now(); tone(300, t, 0.06, 'square', 0.15); },
  'boss-squawk': () => { const t = now(); slide2(700, 200, t, 0.28, 'sawtooth', 0.25); noiseHit(t, 0.1, 0.15, 800); },
  'boss-defeat': () => {
    const t = now();
    [880, 700, 500, 300, 150].forEach((f, i) => tone(f, t + i * 0.09, 0.14, 'sawtooth', 0.22));
  },
  'win-fanfare': () => {
    const t = now();
    const notes = [523, 523, 523, 659, 784, 784, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, t + i * 0.14, 0.18, 'square', 0.24));
  },
};

function slide2(freqFrom, freqTo, startTime, dur, type = 'square', peak = 0.22) {
  if (!actx) return;
  const osc = actx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), startTime + dur);
  const g = envGain(startTime, 0.004, dur, peak);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

export function sfx(name) {
  if (!actx) return;
  const fn = SFX[name];
  if (fn) fn();
}

// ---------------------------------------------------------------------------
// Music sequencer — one tiny step sequencer drives all tracks.
// ---------------------------------------------------------------------------

// Each track: bpm, steps-per-bar, and pattern arrays (note index into scale, or null = rest)
// Original 8-bar AABA bouncy chiptune for overworld; minor sparse variant for underroots; 6/8 driving for boss.

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19]; // C major-ish, extended
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19];

function scaleFreq(base, scale, degree) {
  const semis = scale[((degree % scale.length) + scale.length) % scale.length] + 12 * Math.floor(degree / scale.length);
  return base * Math.pow(2, semis / 12);
}

// A-section lead pattern (bouncy, degree indices, null = rest), 16 steps
const A_LEAD = [0, null, 4, null, 7, null, 4, null, 2, null, 4, null, 0, null, null, null];
const B_LEAD = [7, null, 9, null, 11, null, 9, null, 7, null, 4, null, 2, null, 0, null];
const BASS_PATTERN = [0, null, null, 0, 4, null, null, 4, 0, null, null, 0, 7, null, null, 7];
const HAT_PATTERN = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];

const BOSS_LEAD = [0, 3, 4, 3, 0, null, 7, 5, 4, 3, 0, null];
const BOSS_BASS = [0, null, 0, null, 4, null, 4, null, -3, null, -3, null];

const TRACKS = {
  overworld: { bpm: 150, base: 261.6, scale: MAJOR_SCALE, form: ['A', 'A', 'B', 'A'], stepsPerBar: 16 },
  underroots: { bpm: 132, base: 220, scale: MINOR_SCALE, form: ['A', 'B'], stepsPerBar: 16, sparse: true },
  boss: { bpm: 168, base: 246.9, scale: MINOR_SCALE, form: ['BOSS'], stepsPerBar: 12, driving: true },
};

function stopSequencer() {
  if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
}

function startSequencer(track, fast) {
  stopSequencer();
  if (musicMuted || !actx) return;
  const cfg = TRACKS[track];
  if (!cfg) return;
  seqStep = 0;
  const rateMul = fast ? 1.25 : 1;
  const stepDur = (60 / cfg.bpm / 4) / rateMul; // 16th notes

  let barIdx = 0;
  function scheduleStep() {
    if (musicMuted || currentTrack !== track) return;
    const section = cfg.form[barIdx % cfg.form.length];
    const t = now();
    const i = seqStep % cfg.stepsPerBar;

    if (cfg.driving) {
      const leadDeg = BOSS_LEAD[i % BOSS_LEAD.length];
      const bassDeg = BOSS_BASS[i % BOSS_BASS.length];
      if (leadDeg !== null) tone(scaleFreq(cfg.base * 1.5, cfg.scale, leadDeg), t, stepDur * 0.9, 'sawtooth', 0.16);
      if (bassDeg !== null) tone(scaleFreq(cfg.base * 0.5, cfg.scale, bassDeg), t, stepDur * 1.6, 'triangle', 0.2);
      if (i % 3 === 0) noiseHit(t, stepDur * 0.5, 0.12, 5000);
    } else {
      const leadPattern = section === 'B' ? B_LEAD : A_LEAD;
      const leadDeg = leadPattern[i];
      if (leadDeg !== null && !(cfg.sparse && Math.random() < 0.35)) {
        tone(scaleFreq(cfg.base * 2, cfg.scale, leadDeg), t, stepDur * 0.85, 'square', 0.14);
      }
      const bassDeg = BASS_PATTERN[i];
      if (bassDeg !== null) tone(scaleFreq(cfg.base * 0.5, cfg.scale, bassDeg), t, stepDur * 1.4, 'triangle', 0.18);
      if (HAT_PATTERN[i] && !cfg.sparse) noiseHit(t, stepDur * 0.4, 0.06, 7000);
    }

    seqStep++;
    if (i === cfg.stepsPerBar - 1) barIdx++;
    seqTimer = setTimeout(scheduleStep, stepDur * 1000);
  }
  scheduleStep();
}

export function music(track, fast = false) {
  if (track === currentTrack && fast === currentFast) return;
  currentTrack = track;
  currentFast = fast;
  if (track === 'off' || !actx) {
    stopSequencer();
    return;
  }
  startSequencer(track, fast);
}

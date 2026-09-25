/* MINIGAME·100 — synthesized audio: SFX presets + procedural music. No samples, all WebAudio. */
(function () {
  'use strict';
  const A = {
    ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
    sfxOn: true, musicOn: true, _last: {},
  };
  try {
    A.sfxOn = localStorage.getItem('mg100:sfx') !== '0';
    A.musicOn = localStorage.getItem('mg100:music') !== '0';
  } catch (e) { /* storage unavailable */ }

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    A.master = ctx.createGain(); A.master.gain.value = 0.8;
    A.master.connect(comp); comp.connect(ctx.destination);
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = A.sfxOn ? 0.55 : 0; A.sfxBus.connect(A.master);
    A.musicBus = ctx.createGain(); A.musicBus.gain.value = A.musicOn ? 0.3 : 0; A.musicBus.connect(A.master);
    // shared echo for music
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(A.musicBus);
    A.echo = dl;
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
  };
  const unlock = () => A.init();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  A.setSfx = function (on) {
    A.sfxOn = on; try { localStorage.setItem('mg100:sfx', on ? '1' : '0'); } catch (e) {}
    if (A.sfxBus) A.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, A.ctx.currentTime, 0.02);
  };
  A.setMusic = function (on) {
    A.musicOn = on; try { localStorage.setItem('mg100:music', on ? '1' : '0'); } catch (e) {}
    if (A.musicBus) A.musicBus.gain.setTargetAtTime(on ? 0.3 : 0, A.ctx.currentTime, 0.05);
  };

  /* ---- primitive voices ---- */
  // tone: oscillator with pitch slide + AD envelope
  A.tone = function (o) {
    if (!A.ctx || !A.sfxOn && !o.bus) return;
    const ctx = A.ctx, t = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.1, vol = (o.vol === undefined ? 0.3 : o.vol);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, o.f || 440), t);
    if (o.f2) {
      if (o.lin) osc.frequency.linearRampToValueAtTime(Math.max(20, o.f2), t + dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + dur);
    }
    if (o.detune) osc.detune.value = o.detune;
    const a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g);
    g.connect(o.bus || A.sfxBus);
    if (o.echo && A.echo) g.connect(A.echo);
    osc.start(t); osc.stop(t + dur + 0.05);
  };
  A.noise = function (o) {
    if (!A.ctx || !A.sfxOn && !o.bus) return;
    const ctx = A.ctx, t = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.2, vol = o.vol === undefined ? 0.3 : o.vol;
    const src = ctx.createBufferSource(); src.buffer = A.noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 3000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || A.sfxBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.mtof = mtof;
  A.note = function (midi, dur = 0.25, type = 'triangle', vol = 0.25, delay = 0, echo = false) {
    A.tone({ f: mtof(midi), dur, type, vol, delay, a: 0.008, echo });
  };

  /* ---- SFX presets. p = pitch multiplier, v = volume multiplier ---- */
  const P = {
    blip: (p, v) => A.tone({ f: 880 * p, dur: 0.06, type: 'square', vol: 0.12 * v }),
    click: (p, v) => A.tone({ f: 1400 * p, f2: 700 * p, dur: 0.035, type: 'triangle', vol: 0.2 * v }),
    tick: (p, v) => A.noise({ dur: 0.03, vol: 0.18 * v, ft: 'highpass', f: 5000 * p }),
    select: (p, v) => { A.tone({ f: 660 * p, dur: 0.06, vol: 0.12 * v }); A.tone({ f: 990 * p, dur: 0.09, vol: 0.12 * v, delay: 0.055 }); },
    coin: (p, v) => { A.tone({ f: 988 * p, dur: 0.07, vol: 0.13 * v }); A.tone({ f: 1319 * p, dur: 0.22, vol: 0.13 * v, delay: 0.06 }); },
    jump: (p, v) => A.tone({ f: 260 * p, f2: 620 * p, dur: 0.16, type: 'square', vol: 0.12 * v, lp: 3000 }),
    hop: (p, v) => A.tone({ f: 420 * p, f2: 840 * p, dur: 0.08, type: 'triangle', vol: 0.25 * v }),
    flap: (p, v) => { A.noise({ dur: 0.1, vol: 0.2 * v, ft: 'bandpass', f: 900 * p, f2: 400 * p, q: 2 }); A.tone({ f: 500 * p, f2: 700 * p, dur: 0.07, type: 'triangle', vol: 0.12 * v }); },
    shoot: (p, v) => A.tone({ f: 1100 * p, f2: 220 * p, dur: 0.11, type: 'square', vol: 0.09 * v, lp: 4000 }),
    laser: (p, v) => A.tone({ f: 1800 * p, f2: 260 * p, dur: 0.16, type: 'sawtooth', vol: 0.08 * v, lp: 5000 }),
    hit: (p, v) => { A.noise({ dur: 0.13, vol: 0.32 * v, f: 2400 * p, f2: 300 }); A.tone({ f: 220 * p, f2: 70 * p, dur: 0.12, type: 'square', vol: 0.12 * v, lp: 1200 }); },
    hurt: (p, v) => { A.tone({ f: 400 * p, f2: 90 * p, dur: 0.3, type: 'sawtooth', vol: 0.16 * v, lp: 1800 }); A.noise({ dur: 0.2, vol: 0.25 * v, f: 1500, f2: 200 }); },
    explode: (p, v) => { A.noise({ dur: 0.7, vol: 0.55 * v, f: 1600 * p, f2: 60 }); A.tone({ f: 110 * p, f2: 30, dur: 0.6, type: 'sine', vol: 0.5 * v }); },
    boom: (p, v) => { A.noise({ dur: 1.3, vol: 0.7 * v, f: 900 * p, f2: 40 }); A.tone({ f: 80 * p, f2: 25, dur: 1.1, type: 'sine', vol: 0.7 * v }); },
    pop: (p, v) => A.tone({ f: 900 * p, f2: 280 * p, dur: 0.09, type: 'sine', vol: 0.3 * v }),
    bounce: (p, v) => A.tone({ f: 330 * p, f2: 520 * p, dur: 0.07, type: 'triangle', vol: 0.25 * v }),
    thud: (p, v) => { A.tone({ f: 160 * p, f2: 45, dur: 0.18, type: 'sine', vol: 0.55 * v }); A.noise({ dur: 0.06, vol: 0.15 * v, f: 800 }); },
    power: (p, v) => [0, 4, 7, 12, 16].forEach((s, i) => A.tone({ f: 523 * p * Math.pow(2, s / 12), dur: 0.12, type: 'square', vol: 0.09 * v, delay: i * 0.055, lp: 4000 })),
    win: (p, v) => [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => A.tone({ f: 523 * p * Math.pow(2, s / 12), dur: i === 7 ? 0.5 : 0.14, type: 'square', vol: 0.09 * v, delay: i * 0.085, lp: 3500 })),
    lose: (p, v) => [0, -3, -6, -12].forEach((s, i) => A.tone({ f: 330 * p * Math.pow(2, s / 12), f2: 320 * p * Math.pow(2, (s - 1) / 12), dur: i === 3 ? 0.55 : 0.18, type: 'square', vol: 0.1 * v, delay: i * 0.17, lp: 2200 })),
    error: (p, v) => { A.tone({ f: 140 * p, dur: 0.1, type: 'square', vol: 0.12 * v, lp: 900 }); A.tone({ f: 120 * p, dur: 0.14, type: 'square', vol: 0.12 * v, delay: 0.1, lp: 900 }); },
    whoosh: (p, v) => A.noise({ dur: 0.28, vol: 0.28 * v, ft: 'bandpass', f: 400 * p, f2: 2600 * p, q: 1.5, a: 0.08 }),
    swish: (p, v) => A.noise({ dur: 0.16, vol: 0.3 * v, ft: 'bandpass', f: 3200 * p, f2: 700 * p, q: 1.2, a: 0.02 }),
    charge: (p, v) => A.tone({ f: 180 * p, f2: 900 * p, dur: 0.45, type: 'sawtooth', vol: 0.07 * v, lp: 2500 }),
    place: (p, v) => { A.tone({ f: 520 * p, dur: 0.05, type: 'triangle', vol: 0.25 * v }); A.noise({ dur: 0.03, vol: 0.12 * v, ft: 'highpass', f: 3000 }); },
    match: (p, v) => [0, 4, 7].forEach((s, i) => A.tone({ f: 660 * p * Math.pow(2, s / 12), dur: 0.1, type: 'triangle', vol: 0.2 * v, delay: i * 0.045 })),
    slice: (p, v) => { A.noise({ dur: 0.12, vol: 0.3 * v, ft: 'highpass', f: 2500 * p, f2: 6000 * p }); A.tone({ f: 1500 * p, f2: 900 * p, dur: 0.06, type: 'sine', vol: 0.08 * v }); },
    splash: (p, v) => A.noise({ dur: 0.45, vol: 0.35 * v, ft: 'lowpass', f: 3000 * p, f2: 300 }),
    engine: (p, v) => A.tone({ f: 60 * p, f2: 62 * p, dur: 0.08, type: 'sawtooth', vol: 0.05 * v, lp: 600 }),
    ding: (p, v) => { A.tone({ f: 1568 * p, dur: 0.6, type: 'sine', vol: 0.22 * v }); A.tone({ f: 3136 * p, dur: 0.3, type: 'sine', vol: 0.06 * v }); },
    card: (p, v) => A.noise({ dur: 0.05, vol: 0.25 * v, ft: 'bandpass', f: 2500 * p, q: 0.8 }),
    shuffle: (p, v) => { for (let i = 0; i < 8; i++) A.noise({ dur: 0.04, vol: 0.18 * v, ft: 'bandpass', f: 2200 * p + i * 90, q: 0.8, delay: i * 0.045 }); },
    dice: (p, v) => { for (let i = 0; i < 5; i++) A.noise({ dur: 0.03, vol: 0.25 * v, ft: 'bandpass', f: 1800 * p + Math.random() * 1500, q: 3, delay: i * 0.05 + Math.random() * 0.02 }); },
    tada: (p, v) => { [0, 4, 7, 12].forEach((s) => A.tone({ f: 392 * p * Math.pow(2, s / 12), dur: 0.9, type: 'triangle', vol: 0.12 * v, delay: 0.12 })); A.tone({ f: 392 * p, dur: 0.1, type: 'triangle', vol: 0.15 * v }); },
  };
  A.presets = P;
  A.play = function (name, p = 1, v = 1) {
    if (!A.ctx || !A.sfxOn) return;
    const now = performance.now();
    if (A._last[name] && now - A._last[name] < 28) return; // throttle stacking
    A._last[name] = now;
    const fn = P[name];
    if (fn) fn(p, v);
  };

  /* ---- procedural music: seeded loop per game ---- */
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11],
    mixo: [0, 2, 4, 5, 7, 9, 10], penta: [0, 3, 5, 7, 10], phryg: [0, 1, 3, 5, 7, 8, 10],
  };
  const PROGS = [[0, 5, 3, 4], [0, 3, 4, 3], [0, 6, 5, 4], [0, 2, 5, 4], [0, 5, 6, 4], [0, 0, 3, 4], [0, 4, 5, 3]];
  const Music = { playing: false, timer: null };
  Music.start = function (seed, opts = {}) {
    Music.stop();
    if (!A.ctx) A.init();
    if (!A.ctx) return;
    const r = U.seeded(seed);
    const moods = opts.mood ? [opts.mood] : ['minor', 'dorian', 'minor', 'major', 'mixo', 'phryg'];
    const scaleName = moods[(r() * moods.length) | 0];
    const scale = SCALES[scaleName];
    const root = 40 + ((r() * 8) | 0);
    const bpm = opts.bpm || 96 + ((r() * 7) | 0) * 8;
    const prog = PROGS[(r() * PROGS.length) | 0];
    const step = 60 / bpm / 4;
    const deg = (d, oct = 0) => { const n = scale.length; const o = Math.floor(d / n); return root + scale[((d % n) + n) % n] + 12 * (o + oct); };
    // patterns
    const bassPat = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 1 : r() < 0.35 ? (r() < 0.5 ? 2 : 1) : 0));
    const kickPat = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 1 : r() < 0.12 ? 1 : 0));
    const hatPat = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 1 : r() < 0.4 ? 0.5 : 0));
    const arpShape = [0, 2, 4, 7, 4, 2, 0, 4].map((x) => x + (r() < 0.2 ? 1 : 0));
    const arpType = r() < 0.5 ? 'square' : 'sawtooth';
    const melody = Array.from({ length: 64 }, (_, i) => (i % 2 === 0 && r() < 0.42 ? ((r() * 9) | 0) + 7 : -1));
    const leadType = r() < 0.5 ? 'triangle' : 'square';
    const intensity = opts.intensity || 1;
    let stepIdx = 0, nextT = A.ctx.currentTime + 0.1;
    const bus = A.musicBus;
    const tone = (o) => A.tone(Object.assign({ bus }, o));
    const kick = (t) => {
      const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
    };
    const hat = (t, v) => {
      const ctx = A.ctx, s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.13 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.06);
    };
    const snare = (t) => {
      const ctx = A.ctx, s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.18);
    };
    const schedule = () => {
      if (!A.ctx) return;
      while (nextT < A.ctx.currentTime + 0.15) {
        const t = nextT, i = stepIdx % 16, bar = Math.floor(stepIdx / 16) % 4, loop = Math.floor(stepIdx / 64);
        const chord = prog[bar];
        const delay = t - A.ctx.currentTime;
        if (bassPat[i]) tone({ f: mtof(deg(chord, 0) + (bassPat[i] === 2 ? 12 : 0)), dur: step * 1.8, type: 'triangle', vol: 0.5, delay, a: 0.005 });
        if (loop > 0 || bar > 1) {
          if (kickPat[i]) kick(t);
          if (i === 4 || i === 12) snare(t);
          if (hatPat[i]) hat(t, hatPat[i]);
        }
        if (intensity > 0 && (bar % 2 === 1 || loop % 2 === 1)) {
          const n = deg(chord + arpShape[i % 8], 1);
          tone({ f: mtof(n), dur: step * 0.9, type: arpType, vol: 0.05, delay, lp: 1800 + 600 * Math.sin(stepIdx / 20), echo: true });
        }
        if (loop % 2 === 1 || loop > 2) {
          const m = melody[stepIdx % 64];
          if (m >= 0) tone({ f: mtof(deg(m + chord, 1)), dur: step * 3, type: leadType, vol: 0.09, delay, lp: 2600, echo: true, a: 0.01 });
        }
        stepIdx++; nextT += step;
      }
    };
    Music.playing = true;
    Music.timer = setInterval(schedule, 30);
    schedule();
  };
  Music.stop = function () { if (Music.timer) clearInterval(Music.timer); Music.timer = null; Music.playing = false; };
  A.music = Music;
  window.Sound = A;
})();

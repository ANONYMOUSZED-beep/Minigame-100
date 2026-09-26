/* MINIGAME·100 — seeded song generator + sample-accurate scheduler for the rhythm games.
   A song is a flat, time-sorted list of events (kick/snare/hat/bass/pad/lead). Games build
   their charts from the same events, so every note you hit is a note you hear. */
(function () {
  'use strict';
  const MG = (window.MG = window.MG || {});
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
  const PROGS = {
    minor: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 5, 3, 4], [0, 6, 5, 4]],
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 0, 4]],
    dorian: [[0, 3, 0, 3], [0, 6, 3, 0], [0, 1, 3, 0]],
  };
  const W1 = ['Neon', 'Midnight', 'Crystal', 'Electric', 'Velvet', 'Solar', 'Digital', 'Lunar', 'Chrome', 'Hyper', 'Ultra', 'Cosmic', 'Golden', 'Sapphire', 'Arcade'];
  const W2 = ['Drift', 'Circuit', 'Skyline', 'Heartbeat', 'Horizon', 'Pulse', 'Dreams', 'Runner', 'Bloom', 'Rush', 'Cascade', 'Voltage', 'Mirage', 'Overdrive', 'Parade'];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function make(seed, o = {}) {
    const r = U.seeded(seed >>> 0);
    const pick = (a) => a[(r() * a.length) | 0];
    const bpm = o.bpm || 104 + ((r() * 5) | 0) * 6;
    const spb = 60 / bpm, st = spb / 4;
    const mode = o.mode || pick(['minor', 'minor', 'major', 'dorian']);
    const scale = SCALES[mode], root = 55 + ((r() * 7) | 0);
    const prog = pick(PROGS[mode]);
    const note = (idx) => root + scale[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);
    const plan = o.plan || [['intro', 2], ['A', 8], ['B', 8], ['A', 8], ['B', 8], ['outro', 2]];
    const density = o.density || 1;
    const ev = [];
    const push = (e) => ev.push(e);

    // motif: 2 bars = 32 sixteenths; returns [{s, len, deg}]
    function motif(dens, lo, hi) {
      const out = [];
      let deg = lo + 2 + ((r() * 3) | 0);
      for (let s = 0; s < 32; s++) {
        const p = s % 8 === 0 ? 0.85 : s % 4 === 0 ? 0.6 : s % 2 === 0 ? 0.3 : 0.1;
        if (r() < p * dens) {
          deg = Math.max(lo, Math.min(hi, deg + pick([-2, -1, -1, 1, 1, 2, 0, 3, -3])));
          out.push({ s, deg });
        }
      }
      if (!out.length || out[0].s !== 0) out.unshift({ s: 0, deg: lo + 2 });
      for (let i = 0; i < out.length; i++) out[i].len = Math.min(8, (i + 1 < out.length ? out[i + 1].s : 32) - out[i].s);
      return out;
    }
    const mA = motif(0.95 * density, 0, 7), mA2 = motif(0.95 * density, 0, 7), mB = motif(1.15 * density, 2, 10), mB2 = motif(1.1 * density, 3, 11);
    let bar = 0;
    for (const [sec, bars] of plan) {
      for (let b = 0; b < bars; b++, bar++) {
        const t0 = bar * 16 * st, chordDeg = prog[bar % prog.length];
        const chord = [chordDeg, chordDeg + 2, chordDeg + 4].map((d) => note(d));
        const drums = sec !== 'outro' || b === 0;
        // drums
        for (let s = 0; s < 16; s++) {
          const t = t0 + s * st;
          if (!drums) break;
          const kick = s === 0 || s === 8 || (sec === 'B' && (s === 10 || s === 14 && b % 2)) || (sec === 'A' && s === 11 && b % 2);
          const snare = (s === 4 || s === 12) && sec !== 'intro';
          if (kick) push({ t, type: 'kick', sec, bar, s });
          if (snare) push({ t, type: 'snare', sec, bar, s });
          if (sec === 'intro' ? s % 4 === 2 : sec === 'B' ? s % 2 === 0 : s % 4 === 2 || s % 4 === 0) push({ t, type: 'hat', sec, bar, s, open: s % 8 === 6 });
        }
        if (sec === 'outro' && b > 0) { push({ t: t0, type: 'kick', sec, bar, s: 0 }); push({ t: t0, type: 'pad', notes: chord, dur: spb * 4, sec, bar, s: 0 }); continue; }
        // bass
        if (sec !== 'intro') for (let s = 0; s < 16; s += 2) { const oct = s % 4 === 2 && sec === 'B' ? 12 : 0; push({ t: t0 + s * st, type: 'bass', midi: chord[0] - 24 + oct, dur: st * 1.8, sec, bar, s }); }
        // pads
        if (sec !== 'intro') push({ t: t0, type: 'pad', notes: chord, dur: spb * 4, sec, bar, s: 0 });
        // lead from motifs (2-bar phrases, 4-bar variation)
        if (sec === 'A' || sec === 'B') {
          const half = b % 2, phrase = Math.floor(b / 2) % 4;
          const m = sec === 'A' ? (phrase === 3 ? mA2 : mA) : phrase % 2 ? mB2 : mB;
          for (const n of m) {
            if ((n.s >= 16) !== !!half) continue;
            const s = n.s - half * 16;
            // make the lead land on the current chord on strong beats
            let d = n.deg;
            if (s % 8 === 0) { const ct = [chordDeg, chordDeg + 2, chordDeg + 4, chordDeg + 7]; d = ct.reduce((bst, c) => (Math.abs(c - n.deg) < Math.abs(bst - n.deg) ? c : bst), ct[0]); }
            push({ t: t0 + s * st, type: 'lead', midi: note(d), deg: d, dur: n.len * st, len: n.len, sec, bar, s });
          }
        }
      }
    }
    ev.sort((a, b) => a.t - b.t || (a.type === 'lead') - (b.type === 'lead'));
    const length = bar * 16 * st;
    return { bpm, spb, st, mode, root, events: ev, length, bars: bar, title: `${pick(W1)} ${pick(W2)}` };
  }

  function play(E, e, delay, mix = {}) {
    const v = mix.vol || 1;
    switch (e.type) {
      case 'kick': E.tone({ f: 150, f2: 42, dur: 0.2, type: 'sine', vol: 0.55 * v, delay }); break;
      case 'snare': E.noise({ dur: 0.16, vol: 0.26 * v, ft: 'bandpass', f: 1900, q: 0.7, delay }); E.tone({ f: 230, f2: 130, dur: 0.08, type: 'triangle', vol: 0.12 * v, delay }); break;
      case 'hat': E.noise({ dur: e.open ? 0.12 : 0.035, vol: 0.06 * v, ft: 'highpass', f: 7500, delay }); break;
      case 'bass': E.tone({ f: mtof(e.midi), dur: e.dur, type: 'sawtooth', vol: 0.13 * v, lp: 520, delay }); break;
      case 'pad': if (mix.pad !== false) for (const m of e.notes) E.tone({ f: mtof(m), dur: e.dur, type: 'triangle', vol: 0.035 * v, a: 0.12, delay }); break;
      case 'lead': if (mix.lead !== false) { E.tone({ f: mtof(e.midi), dur: Math.max(0.12, e.dur * 0.95), type: 'square', vol: 0.06 * v, lp: 2800, delay, echo: true }); E.tone({ f: mtof(e.midi), dur: Math.max(0.12, e.dur), type: 'triangle', vol: 0.09 * v, delay }); } break;
    }
  }

  // Scheduler: call update(songTime) every frame with the game's own clock (paused games stop scheduling).
  function player(E, song, mix) {
    let i = 0;
    return {
      update(time, look = 0.14) {
        const ev = song.events;
        while (i < ev.length && ev[i].t < time + look) {
          const e = ev[i++];
          if (e.t < time - 0.03) continue;
          play(E, e, Math.max(0, e.t - time), mix);
        }
      },
      seek(time) { i = song.events.findIndex((e) => e.t >= time); if (i < 0) i = song.events.length; },
    };
  }

  MG.Song = { make, play, player, mtof };
})();

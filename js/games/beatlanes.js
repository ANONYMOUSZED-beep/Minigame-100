MG.add({
  id: 'beatlanes', name: 'Beat Lanes', cat: 'Rhythm', color: '#e879f9', color2: '#22d3ee', music: false,
  desc: 'A synthwave note highway with a freshly composed track every run. Hit, hold, chain — and chase the S rank.',
  how: ['Hit notes as they cross the line: <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd><kbd>↓</kbd><kbd>↑</kbd><kbd>→</kbd>', 'Touch: tap the lane at the bottom of the screen', 'Long notes: keep holding until the tail ends', 'Misses drain the meter — empty it and the song stops'],
  pad: false,
  make(E) {
    const W = 960, H = 600, CX = W / 2, HIT = 505, VP = 70, K = 3.6, LW = 116, LA = 1.55;
    const COL = ['#22c55e', '#ef4444', '#facc15', '#3b82f6'];
    const KEYS = [['KeyD', 'ArrowLeft', 'KeyA'], ['KeyF', 'ArrowDown', 'KeyS'], ['KeyJ', 'ArrowUp', 'KeyW'], ['KeyK', 'ArrowRight', 'KeyL']];
    const WIN = { p: 0.05, g: 0.095, o: 0.14 };
    const song = MG.Song.make((Math.random() * 1e9) | 0);
    const player = MG.Song.player(E, song);
    // ---- chart ----
    const notes = [];
    let last = -1, lastLane = 1, lastDeg = 0;
    for (const e of song.events) {
      if (e.type === 'kick' && e.sec === 'intro' && e.bar === 1) { notes.push({ t: e.t, lane: e.s === 0 ? 1 : 2 }); continue; }
      if (e.type !== 'lead') continue;
      if (e.t - last < song.st * 1.9) continue;
      let lane;
      const dd = e.deg - lastDeg;
      if (e.t - last > song.spb * 2) lane = ((e.deg % 4) + 4) % 4;
      else lane = lastLane + (dd === 0 ? 0 : Math.sign(dd) * (Math.abs(dd) >= 3 ? 2 : 1));
      if (lane > 3) lane = 3 - (lane - 3) - 1; if (lane < 0) lane = -lane; lane = U.clamp(lane, 0, 3);
      const n = { t: e.t, lane };
      if (e.len >= 6) n.end = e.t + e.dur * 0.85;
      notes.push(n);
      if (e.sec === 'B' && e.s === 0 && !n.end) notes.push({ t: e.t, lane: (lane + 2) % 4, chord: true });
      last = e.t; lastLane = lane; lastDeg = e.deg;
    }
    notes.sort((a, b) => a.t - b.t);
    const total = notes.length;
    const kicks = song.events.filter((e) => e.type === 'kick').map((e) => e.t);
    let songT = -2.2, ki = 0, pulse = 0, hp = 1, combo = 0, maxC = 0, cnt = { p: 0, g: 0, o: 0, m: 0 }, over = false, judge = null, T = 0;
    const lanePress = [0, 0, 0, 0], held = [false, false, false, false], flare = [0, 0, 0, 0];
    const stars = D.makeStars(90, W, 260, 11);
    let lat = 0;
    E.stat('Song', song.title); E.stat('Combo', 0);
    const mult = () => Math.min(4, 1 + Math.floor(combo / 10));
    function proj(u, lx) { const s = 1 / (1 + Math.max(-0.2, u) * K); return [CX + lx * s, VP + (HIT - VP) * s, s]; }
    function judgeHit(n, dt) {
      const a = Math.abs(dt), k = a <= WIN.p ? 'p' : a <= WIN.g ? 'g' : 'o';
      cnt[k]++; combo++; maxC = Math.max(maxC, combo); hp = Math.min(1, hp + 0.025);
      E.score += { p: 300, g: 200, o: 100 }[k] * mult();
      judge = { k, t: 0.5, late: dt > 0 };
      const [x, y] = proj(0, (n.lane - 1.5) * LW);
      flare[n.lane] = 1;
      E.burst(x, y, { n: k === 'p' ? 18 : 10, colors: [COL[n.lane], '#fff'], speed: 260, angle: -Math.PI / 2, spread: 2.2, shape: 'spark' });
      E.sfx('tick', 1.5, 0.35);
      if (combo % 50 === 0) { E.pop(CX, 250, `${combo} COMBO!`, { color: '#fde047', size: 34 }); E.sfx('power', 1.2, 0.5); }
    }
    function miss(n) {
      n.miss = true; cnt.m++; if (combo >= 20) E.sfx('error', 0.8, 0.4);
      combo = 0; hp -= 0.075; judge = { k: 'm', t: 0.5 };
      if (hp <= 0 && !over) {
        over = true; E.sfx('lose'); E.shake(10);
        E.over({ title: 'Song Failed', msg: `${song.title} · ${Math.round((songT / song.length) * 100)}% through · max combo ${maxC}` });
      }
    }
    function laneAt(x) { return U.clamp(Math.floor((x - (CX - 2 * LW)) / LW), 0, 3); }
    return {
      start() { if (window.Sound && Sound.ctx) lat = Math.min(0.08, Sound.ctx.outputLatency || Sound.ctx.baseLatency || 0); },
      update(dt) {
        T += dt;
        if (over) return;
        songT += dt;
        player.update(songT);
        const t = songT - lat;
        while (ki < kicks.length && kicks[ki] <= t) { ki++; pulse = 1; }
        pulse = Math.max(0, pulse - dt * 5);
        judge && (judge.t -= dt);
        for (let l = 0; l < 4; l++) { flare[l] = Math.max(0, flare[l] - dt * 4); lanePress[l] = Math.max(0, lanePress[l] - dt * 6); }
        // input
        const hits = [false, false, false, false];
        for (let l = 0; l < 4; l++) { if (E.hit(...KEYS[l])) hits[l] = true; held[l] = E.down(...KEYS[l]); }
        if (E.ptr.hit && E.ptr.y > 200) hits[laneAt(E.ptr.x)] = true;
        if (E.ptr.down && E.ptr.y > 200) held[laneAt(E.ptr.x)] = true;
        for (let l = 0; l < 4; l++) {
          if (!hits[l]) continue;
          lanePress[l] = 1;
          let best = null, bd = 1e9;
          for (const n of notes) { if (n.t - t > WIN.o + 0.02) break; if (n.lane !== l || n.done || n.miss) continue; const d = Math.abs(t - n.t); if (d < bd) { bd = d; best = n; } }
          if (best && bd <= WIN.o) { best.done = true; if (best.end) best.holding = true; judgeHit(best, t - best.t); }
        }
        for (const n of notes) {
          if (n.t - t > 0.5) break;
          if (!n.done && !n.miss && t - n.t > WIN.o) miss(n);
          if (n.holding) {
            if (t >= n.end) { n.holding = false; n.held = true; E.score += 100 * mult(); flare[n.lane] = 1; E.sfx('select', 1.4, 0.4); }
            else if (!held[n.lane]) { n.holding = false; n.dropped = true; combo = 0; }
            else { E.score += Math.round(dt * 400); flare[n.lane] = Math.max(flare[n.lane], 0.6); }
          }
        }
        E.stat('Combo', combo);
        if (songT > song.length + 1.2 && !over) {
          over = true;
          const acc = total ? (cnt.p * 3 + cnt.g * 2 + cnt.o) / (total * 3) : 0, pct = Math.round(acc * 1000) / 10;
          const grade = cnt.m === 0 && cnt.g + cnt.o === 0 ? 'SS' : acc >= 0.95 ? 'S' : acc >= 0.9 ? 'A' : acc >= 0.8 ? 'B' : acc >= 0.7 ? 'C' : 'D';
          E.sfx('tada');
          E.over({ win: true, title: `Rank ${grade}`, msg: `${song.title} · ${pct}% · ${cnt.p} perfect · ${cnt.g} great · ${cnt.o} good · ${cnt.m} miss · max combo ${maxC}${cnt.m === 0 ? ' · FULL COMBO' : ''}` });
        }
      },
      draw(g) {
        const t = songT - lat;
        // sky
        const sk = g.createLinearGradient(0, 0, 0, HIT); sk.addColorStop(0, '#0b0322'); sk.addColorStop(0.55, '#3b0764'); sk.addColorStop(1, '#831843'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
        D.stars(g, stars, W, 260, T);
        const hz = proj(1, 0)[1];
        // sun
        const sr = 120 + pulse * 6;
        g.save(); g.beginPath(); g.rect(0, 0, W, hz); g.clip();
        D.glow(g, CX, hz - 20, sr * 2.4, '#f472b6', 0.5);
        const sg = g.createLinearGradient(0, hz - sr - 20, 0, hz); sg.addColorStop(0, '#fde047'); sg.addColorStop(1, '#f43f5e'); g.fillStyle = sg; g.beginPath(); g.arc(CX, hz - 10, sr, 0, U.TAU); g.fill();
        g.fillStyle = '#3b0764'; for (let i = 0; i < 7; i++) { const y = hz - 60 + i * 11 + ((T * 12) % 11); g.fillRect(CX - sr, y, sr * 2, 2 + i * 0.9); }
        // mountains
        g.fillStyle = '#1e0b3a'; g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= W; x += 40) g.lineTo(x, hz - 30 - Math.abs(Math.sin(x * 0.013) * 60) - Math.abs(Math.sin(x * 0.041)) * 20); g.lineTo(W, hz); g.fill();
        g.restore();
        // ground grid
        g.fillStyle = '#0a0118'; g.fillRect(0, hz, W, H - hz);
        g.strokeStyle = `rgba(232,121,249,${0.25 + pulse * 0.25})`; g.lineWidth = 1.5;
        const beatPhase = ((t / song.spb) % 1 + 1) % 1;
        for (let i = 0; i < 12; i++) { const u = 1 - ((i + beatPhase) / 12) * 1.2; if (u < -0.15) continue; const [, y, s] = proj(u, 0); g.globalAlpha = Math.min(1, s * 2); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.globalAlpha = 1;
        for (let i = -12; i <= 12; i++) { const [x1, y1] = proj(1, i * LW * 0.9), [x2, y2] = proj(-0.2, i * LW * 0.9); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
        // highway
        const [a1x, a1y] = proj(1, -2 * LW), [b1x] = proj(1, 2 * LW), [a2x, a2y] = proj(-0.2, -2 * LW), [b2x] = proj(-0.2, 2 * LW);
        g.fillStyle = 'rgba(8,4,20,.88)'; g.beginPath(); g.moveTo(a1x, a1y); g.lineTo(b1x, a1y); g.lineTo(b2x, a2y); g.lineTo(a2x, a2y); g.fill();
        for (let l = 0; l <= 4; l++) { const [x1, y1] = proj(1, (l - 2) * LW), [x2, y2] = proj(-0.2, (l - 2) * LW); D.line(g, x1, y1, x2, y2, l === 0 || l === 4 ? '#e879f9' : 'rgba(255,255,255,.12)', l === 0 || l === 4 ? 3 : 1.5); }
        // lane press beams
        for (let l = 0; l < 4; l++) {
          const k = Math.max(lanePress[l] * 0.6, held[l] ? 0.35 : 0, flare[l]);
          if (k <= 0.01) continue;
          const [x1, y1] = proj(0.6, (l - 2) * LW), [x2] = proj(0.6, (l - 1) * LW), [x3, y3] = proj(0, (l - 2) * LW), [x4] = proj(0, (l - 1) * LW);
          const gr = g.createLinearGradient(0, y1, 0, y3); gr.addColorStop(0, U.rgba(COL[l], 0)); gr.addColorStop(1, U.rgba(COL[l], 0.35 * k));
          g.fillStyle = gr; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y1); g.lineTo(x4, y3); g.lineTo(x3, y3); g.fill();
        }
        // beat lines on highway
        const firstBeat = Math.ceil(t / song.spb);
        for (let b = firstBeat; b * song.spb < t + LA; b++) { const u = (b * song.spb - t) / LA, [x1, y] = proj(u, -2 * LW), [x2] = proj(u, 2 * LW); D.line(g, x1, y, x2, y, b % 4 === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)', b % 4 === 0 ? 2 : 1); }
        // hit line & receptors
        D.line(g, a2x + 10, HIT, b2x - 10, HIT, 'rgba(255,255,255,.35)', 2);
        for (let l = 0; l < 4; l++) {
          const [x, y] = proj(0, (l - 1.5) * LW), p = Math.max(lanePress[l], held[l] ? 0.5 : 0);
          D.glow(g, x, y, 60 + flare[l] * 40, COL[l], 0.25 + flare[l] * 0.6);
          g.save(); g.translate(x, y); g.scale(1, 0.42);
          D.circle(g, 0, 0, 44, 'rgba(0,0,0,.6)', COL[l], 4);
          D.circle(g, 0, 0, 30 * (1 - p * 0.25), U.rgba(COL[l], 0.25 + p * 0.5));
          g.restore();
          D.text(g, ['D', 'F', 'J', 'K'][l], x, y + 34, { size: 13, font: 'mono', color: 'rgba(255,255,255,.3)' });
        }
        // notes (far to near)
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          if (n.t - t > LA) continue;
          if (n.done && !n.holding && !(n.end && !n.held && !n.dropped)) continue;
          if (n.miss && t - n.t > 0.25) continue;
          const lx = (n.lane - 1.5) * LW;
          if (n.end) {
            const u0 = Math.max(0, (Math.max(n.t, n.holding ? t : n.t) - t) / LA), u1 = Math.min(1, (n.end - t) / LA);
            if (u1 > u0 && !n.dropped && !n.miss) {
              const [xa, ya, sa] = proj(u0, lx), [xb, yb, sb] = proj(u1, lx);
              g.fillStyle = U.rgba(COL[n.lane], n.holding ? 0.75 : 0.45);
              g.beginPath(); g.moveTo(xa - 14 * sa, ya); g.lineTo(xa + 14 * sa, ya); g.lineTo(xb + 14 * sb, yb); g.lineTo(xb - 14 * sb, yb); g.fill();
              if (n.holding) D.glow(g, xa, ya, 70, COL[n.lane], 0.6);
            }
            if (n.done) continue;
          }
          const u = (n.t - t) / LA, [x, y, s] = proj(u, lx), fade = Math.min(1, (1 - u) * 6);
          g.save(); g.globalAlpha = n.miss ? 0.35 : fade; g.translate(x, y); g.scale(s, s * 0.45);
          D.circle(g, 0, 6, 46, 'rgba(0,0,0,.5)');
          D.circle(g, 0, 0, 46, U.shade(COL[n.lane], -0.35));
          D.circle(g, 0, -4, 40, COL[n.lane]);
          D.circle(g, 0, -4, 20, '#fff');
          D.circle(g, 0, -4, 14, n.chord ? '#fde047' : U.shade(COL[n.lane], 0.3));
          g.restore();
        }
        // judgement
        if (judge && judge.t > 0) {
          const k = judge.t / 0.5, txt = { p: 'PERFECT', g: 'GREAT', o: 'GOOD', m: 'MISS' }[judge.k], c = { p: '#fde047', g: '#4ade80', o: '#60a5fa', m: '#f87171' }[judge.k];
          D.text(g, txt, CX, 330 - (1 - k) * 12, { size: 30 + (1 - k) * 4, color: c, alpha: Math.min(1, k * 2), glow: c, blur: 12 });
          if (judge.k !== 'm' && judge.k !== 'p') D.text(g, judge.late ? 'late' : 'early', CX, 358, { size: 12, font: 'mono', color: 'rgba(255,255,255,.5)', alpha: k });
        }
        if (combo >= 5) D.text(g, combo, CX, 290, { size: 26 + pulse * 4, color: 'rgba(255,255,255,.85)' });
        if (mult() > 1) D.text(g, `×${mult()}`, CX + 260, HIT - 150, { size: 36, color: '#22d3ee', glow: '#22d3ee' });
        // HP meter
        D.fillRR(g, 24, 120, 14, 300, 7, 'rgba(255,255,255,.08)');
        D.fillRR(g, 24, 120 + 300 * (1 - hp), 14, 300 * hp, 7, hp < 0.3 ? '#ef4444' : hp < 0.6 ? '#facc15' : '#4ade80');
        // progress
        const pr = U.clamp(songT / song.length, 0, 1);
        D.fillRR(g, W / 2 - 200, 14, 400, 4, 2, 'rgba(255,255,255,.1)'); D.fillRR(g, W / 2 - 200, 14, 400 * pr, 4, 2, '#e879f9');
        D.text(g, `♪ ${song.title}  ·  ${song.bpm} BPM`, W / 2, 34, { size: 13, font: 'mono', color: 'rgba(255,255,255,.6)' });
        if (songT < 0) D.text(g, Math.ceil(-songT), CX, 260, { size: 80, color: '#fff', glow: '#e879f9', alpha: 0.9 });
      },
    };
  },
});

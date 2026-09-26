MG.add({
  id: 'echo', name: 'Echo', cat: 'Brain', color: '#34d399', color2: '#f472b6',
  desc: 'The classic memory machine, reborn in neon. Watch, listen, repeat — one more note every round.',
  how: ['Watch and listen to the sequence', 'Repeat it by clicking the pads or with <kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd><kbd>←</kbd>', 'Each round adds one step and the tempo creeps up', 'Take longer than 4 seconds or miss a step and it\'s over'],
  pad: 'LRUD', scoreLabel: 'Rounds', music: false,
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2 + 10, R0 = 92, R1 = 232;
    // pads: top, right, bottom, left
    const PADS = [
      { c: '#22c55e', k: 'U', f: 329.63, name: 'green' }, { c: '#ef4444', k: 'R', f: 277.18, name: 'red' },
      { c: '#facc15', k: 'D', f: 220.0, name: 'yellow' }, { c: '#3b82f6', k: 'L', f: 164.81, name: 'blue' },
    ];
    const lit = [0, 0, 0, 0];
    let seq = [], st = 'pre', stT = 1.0, si = 0, ii = 0, idle = 0, T = 0, rip = [], deadPad = -1;
    function tone(i, dur) {
      E.tone({ f: PADS[i].f, dur, type: 'triangle', vol: 0.3, echo: true });
      E.tone({ f: PADS[i].f * 2, dur: dur * 0.8, type: 'sine', vol: 0.08 });
    }
    const gap = () => Math.max(0.2, 0.55 - seq.length * 0.022);
    function nextRound() {
      seq.push(U.ri(0, 3)); st = 'show'; si = 0; stT = 0.6;
      E.stat('Length', seq.length);
    }
    function press(i) {
      lit[i] = 1; tone(i, 0.32); rip.push({ i, t: 0 });
      if (i !== seq[ii]) { fail(i); return; }
      ii++; idle = 0;
      if (ii >= seq.length) {
        E.score = seq.length; st = 'good'; stT = 0.9;
        E.burst(CX, CY, { n: 24, colors: PADS.map((p) => p.c), speed: 260 });
        if (seq.length % 5 === 0) { E.sfx('power'); E.banner(`${seq.length} IN A ROW`, seq.length >= 15 ? 'Elephant memory' : 'Keep going', { color: '#34d399', life: 1.1 }); }
      }
    }
    function fail(i) {
      st = 'fail'; deadPad = seq[ii];
      E.sfx('lose'); E.shake(10); E.flash('#7f1d1d', 0.4);
      E.tone({ f: 90, dur: 0.8, type: 'sawtooth', vol: 0.2, lp: 700 });
      void i;
      E.after(1.4, () => E.over({ msg: `Reached a sequence of ${seq.length} · you remembered ${seq.length - 1}` }));
    }
    return {
      update(dt) {
        T += dt;
        for (let i = 0; i < 4; i++) lit[i] = Math.max(0, lit[i] - dt * 3.2);
        for (const r of rip) r.t += dt; rip = rip.filter((r) => r.t < 0.6);
        if (st === 'pre') { stT -= dt; if (stT <= 0) nextRound(); return; }
        if (st === 'show') {
          stT -= dt;
          if (stT <= 0) {
            if (si < seq.length) { const i = seq[si++]; lit[i] = 1.25; tone(i, gap() * 0.9); stT = gap() + 0.12; }
            else { st = 'input'; ii = 0; idle = 0; }
          }
          return;
        }
        if (st === 'good') { stT -= dt; if (stT <= 0) nextRound(); return; }
        if (st === 'input') {
          idle += dt;
          if (idle > 4) { fail(-1); return; }
          PADS.forEach((p, i) => { if (E.hit(p.k)) press(i); });
          if (st === 'input' && E.ptr.hit) {
            const dx = E.ptr.x - CX, dy = E.ptr.y - CY, d = Math.hypot(dx, dy);
            if (d > R0 - 6 && d < R1 + 12) { const a = U.wrap(Math.atan2(dy, dx) + Math.PI / 2 + Math.PI / 4, 0, U.TAU); press(Math.floor(a / (Math.PI / 2)) % 4); }
          }
        }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#111827', '#030712');
        D.grid(g, W, H, 40, 'rgba(255,255,255,.025)');
        // device body
        D.shadow(g, CX, CY + 30, R1 + 30, 40, 0.5);
        D.circle(g, CX, CY, R1 + 24, '#0b0f1a', 'rgba(255,255,255,.08)', 2);
        for (let i = 0; i < 4; i++) {
          const p = PADS[i], a0 = -Math.PI / 2 - Math.PI / 4 + (i * Math.PI) / 2 + 0.05, a1 = a0 + Math.PI / 2 - 0.1, L = Math.min(1, lit[i]);
          const mid = (a0 + a1) / 2, push = L * 6;
          const ox = Math.cos(mid) * push, oy = Math.sin(mid) * push;
          g.save(); g.translate(CX + ox, CY + oy);
          if (L > 0.02) D.glow(g, Math.cos(mid) * 160, Math.sin(mid) * 160, 190, p.c, L * 0.8);
          g.beginPath(); g.arc(0, 0, R1, a0, a1); g.arc(0, 0, R0, a1, a0, true); g.closePath();
          const gr = g.createRadialGradient(0, 0, R0, 0, 0, R1);
          gr.addColorStop(0, U.shade(p.c, -0.72 + L * 0.85)); gr.addColorStop(1, U.shade(p.c, -0.48 + L * 0.8));
          g.fillStyle = gr; g.fill();
          g.strokeStyle = U.rgba(p.c, 0.35 + L * 0.6); g.lineWidth = 2; g.stroke();
          if (st === 'fail' && i === deadPad) { g.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 20)})`; g.lineWidth = 5; g.stroke(); }
          // key hint
          D.text(g, ['▲', '▶', '▼', '◀'][i], Math.cos(mid) * (R1 - 40), Math.sin(mid) * (R1 - 40), { size: 16, color: `rgba(255,255,255,${0.18 + L * 0.5})` });
          g.restore();
        }
        for (const r of rip) { const p = PADS[r.i], mid = -Math.PI / 2 + (r.i * Math.PI) / 2; g.globalAlpha = 1 - r.t / 0.6; D.circle(g, CX + Math.cos(mid) * 160, CY + Math.sin(mid) * 160, 30 + r.t * 160, null, p.c, 3); g.globalAlpha = 1; }
        // hub
        D.circle(g, CX, CY, R0 - 10, '#020617', 'rgba(255,255,255,.12)', 2);
        D.text(g, 'ECHO', CX, CY - 30, { size: 18, font: 'mono', color: 'rgba(255,255,255,.4)' });
        D.text(g, seq.length || '—', CX, CY + 6, { size: 52, color: '#fff', glow: st === 'input' ? '#34d399' : '#f472b6', blur: 14 });
        D.text(g, st === 'show' ? 'WATCH' : st === 'input' ? 'YOUR TURN' : st === 'good' ? 'NICE!' : st === 'fail' ? 'WRONG' : 'READY', CX, CY + 44, { size: 12, font: 'mono', color: st === 'fail' ? '#f87171' : st === 'input' ? '#34d399' : 'rgba(255,255,255,.5)' });
        // idle timeout ring
        if (st === 'input') { const k = 1 - idle / 4; g.strokeStyle = k < 0.3 ? '#f87171' : 'rgba(52,211,153,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(CX, CY, R0 - 4, -Math.PI / 2, -Math.PI / 2 + U.TAU * k); g.stroke(); }
        // progress dots
        const n = seq.length, sp = Math.min(22, 520 / Math.max(1, n));
        for (let i = 0; i < n; i++) {
          const x = CX - ((n - 1) * sp) / 2 + i * sp, done = st === 'input' ? i < ii : st === 'show' ? i < si : st !== 'fail';
          D.circle(g, x, H - 34, Math.min(6, sp * 0.3), done ? (st === 'show' ? PADS[seq[i]].c : '#34d399') : 'rgba(255,255,255,.14)');
        }
        D.text(g, `BEST ${E.best || 0}`, W - 24, 30, { size: 14, font: 'mono', align: 'right', color: 'rgba(255,255,255,.45)' });
      },
    };
  },
});

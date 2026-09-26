MG.add({
  id: 'aimlab', name: 'Aim Trainer', cat: 'Brain', color: '#22d3ee', color2: '#f43f5e',
  desc: 'A 45-second, three-phase flick test: gridshot, strafing targets, then micro precision. How clean is your aim?',
  how: ['Click / tap targets as fast as you can', 'Faster hits score more · misses break your streak', 'Phases: Gridshot → Strafe → Micro', 'No mouse? Steer with <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> and fire with <kbd>Space</kbd>'],
  pad: 'LRUDA', padLabels: { A: 'FIRE' },
  make(E) {
    const W = 960, H = 600, DUR = 45, WALL = { x: 90, y: 50, w: 780, h: 380 };
    const PH = [{ name: 'GRIDSHOT', r: 30, move: 0 }, { name: 'STRAFE', r: 28, move: 120 }, { name: 'MICRO', r: 14, move: 0 }];
    let time = DUR, el = 0, phase = -1, targets = [], cx = W / 2, cy = H / 2 - 40, kick = 0, marks = [], shots = 0, hits = 0, rsum = 0, streak = 0, bestStreak = 0, over = false, T = 0;
    E.stat('Accuracy', '—'); E.stat('Avg', '—');
    function place() {
      const P = PH[phase];
      for (let tries = 0; tries < 30; tries++) {
        const x = U.rand(WALL.x + 50, WALL.x + WALL.w - 50), y = U.rand(WALL.y + 50, WALL.y + WALL.h - 40);
        if (targets.every((o) => U.dist(o.x, o.y, x, y) > 110)) return targets.push({ x, y, r: P.r, born: el, sp: 0, vx: P.move ? U.pick([-1, 1]) * U.rand(0.7, 1.3) * P.move : 0, ph: U.rand(U.TAU) });
      }
      targets.push({ x: W / 2, y: WALL.y + WALL.h / 2, r: P.r, born: el, sp: 0, vx: 0, ph: 0 });
    }
    function setPhase(p) {
      phase = p; targets = [];
      E.banner(PH[p].name, ['Three at a time — clear them fast', 'Targets are on the move', 'Tiny targets. Precision over speed.'][p], { color: '#22d3ee', life: 1.3 });
      for (let i = 0; i < 3; i++) place();
      E.sfx('select');
    }
    function fire(x, y) {
      shots++; kick = 1; E.sfx('shoot', 0.55, 0.45); E.shake(1.5);
      let hit = null;
      for (const o of targets) if (U.dist(x, y, o.x, o.y) <= o.r * Math.min(1, o.sp) + 3) hit = o;
      if (hit) {
        hits++; streak++; bestStreak = Math.max(bestStreak, streak);
        const ms = (el - hit.born) * 1000, center = 1 - U.dist(x, y, hit.x, hit.y) / hit.r;
        rsum += ms;
        const pts = Math.round((60 + Math.max(0, 140 - ms / 8) + (center > 0.6 ? 40 : 0)) * (1 + Math.min(streak, 30) / 30) * (phase === 2 ? 1.5 : 1));
        E.score += pts;
        E.sfx('pop', 1.2 + Math.min(streak, 20) * 0.02); if (center > 0.6) E.sfx('ding', 1.2, 0.3);
        E.burst(hit.x, hit.y, { n: 18, colors: ['#22d3ee', '#fff', '#67e8f9'], speed: 320, shape: 'square', size: 3 });
        E.ring(hit.x, hit.y, { r: hit.r * 2.4, color: center > 0.6 ? '#fde047' : '#22d3ee' });
        E.pop(hit.x, hit.y - hit.r - 12, center > 0.6 ? `BULLSEYE +${pts}` : `+${pts}`, { size: center > 0.6 ? 18 : 15, color: center > 0.6 ? '#fde047' : '#fff', life: 0.6 });
        marks.push({ x, y, t: 0.25, hit: true });
        targets = targets.filter((o) => o !== hit); place();
      } else {
        if (streak >= 5) E.pop(x, y - 20, 'streak lost', { size: 14, color: '#f87171', life: 0.6 });
        streak = 0; E.sfx('tick', 0.6, 0.6); marks.push({ x, y, t: 0.25, hit: false });
      }
      E.stat('Accuracy', `${Math.round((hits / shots) * 100)}%`); if (hits) E.stat('Avg', `${Math.round(rsum / hits)} ms`);
    }
    return {
      start() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = 'none'; },
      destroy() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = ''; },
      update(dt) {
        T += dt;
        if (phase < 0) setPhase(0);
        if (over) return;
        el += dt; time -= dt;
        if (phase === 0 && el > 15) setPhase(1); else if (phase === 1 && el > 30) setPhase(2);
        if (time <= 0) {
          over = true; E.sfx('tada');
          E.over({ title: 'Session Complete', msg: `${hits} hits · ${shots ? Math.round((hits / shots) * 100) : 0}% accuracy · ${hits ? Math.round(rsum / hits) : 0} ms avg · best streak ${bestStreak}` });
          return;
        }
        for (const o of targets) {
          o.sp = Math.min(1, o.sp + dt * 7);
          if (o.vx) { o.x += o.vx * dt; if (o.x < WALL.x + o.r + 10 || o.x > WALL.x + WALL.w - o.r - 10) { o.vx *= -1; o.x = U.clamp(o.x, WALL.x + o.r + 10, WALL.x + WALL.w - o.r - 10); } o.y += Math.sin(T * 2 + o.ph) * 30 * dt; }
        }
        if (E.ptr.moved || E.ptr.hit) { cx = E.ptr.x; cy = E.ptr.y; }
        const a = E.axis(); cx = U.clamp(cx + a.x * 520 * dt, 0, W); cy = U.clamp(cy + a.y * 520 * dt, 0, H);
        if (E.ptr.hit) fire(E.ptr.x, E.ptr.y);
        if (E.hit('A')) fire(cx, cy);
        kick = Math.max(0, kick - dt * 8);
        for (const m of marks) m.t -= dt; marks = marks.filter((m) => m.t > 0);
      },
      draw(g) {
        // room
        D.bg(g, W, H, '#0b1220', '#020617');
        // floor perspective
        g.fillStyle = '#0f172a'; g.beginPath(); g.moveTo(WALL.x, WALL.y + WALL.h); g.lineTo(WALL.x + WALL.w, WALL.y + WALL.h); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        g.strokeStyle = 'rgba(34,211,238,.12)'; g.lineWidth = 1;
        for (let i = 0; i <= 12; i++) { const k = i / 12; g.beginPath(); g.moveTo(WALL.x + WALL.w * k, WALL.y + WALL.h); g.lineTo(W * k, H); g.stroke(); }
        for (let i = 1; i < 6; i++) { const k = Math.pow(i / 6, 1.8), y = WALL.y + WALL.h + (H - WALL.y - WALL.h) * k, x0 = WALL.x * (1 - k), x1 = W - (W - WALL.x - WALL.w) * (1 - k); D.line(g, x0, y, x1, y, 'rgba(34,211,238,.1)', 1); }
        // side walls
        g.fillStyle = '#0a1020'; g.beginPath(); g.moveTo(0, 0); g.lineTo(WALL.x, WALL.y); g.lineTo(WALL.x, WALL.y + WALL.h); g.lineTo(0, H); g.fill();
        g.beginPath(); g.moveTo(W, 0); g.lineTo(WALL.x + WALL.w, WALL.y); g.lineTo(WALL.x + WALL.w, WALL.y + WALL.h); g.lineTo(W, H); g.fill();
        // back wall
        const wg = g.createLinearGradient(0, WALL.y, 0, WALL.y + WALL.h); wg.addColorStop(0, '#1e293b'); wg.addColorStop(1, '#172033');
        g.fillStyle = wg; g.fillRect(WALL.x, WALL.y, WALL.w, WALL.h);
        g.save(); g.beginPath(); g.rect(WALL.x, WALL.y, WALL.w, WALL.h); g.clip(); D.grid(g, W, H, 39, 'rgba(148,163,184,.07)', WALL.x, WALL.y); g.restore();
        D.strokeRR(g, WALL.x, WALL.y, WALL.w, WALL.h, 2, 'rgba(34,211,238,.35)', 2);
        D.glow(g, W / 2, WALL.y, 300, '#22d3ee', 0.08);
        // targets
        for (const o of targets) {
          const r = o.r * U.ease.outBack(o.sp);
          D.shadow(g, o.x, WALL.y + WALL.h + 8, r * 0.8, 5, 0.3);
          D.glow(g, o.x, o.y, r * 2.6, '#22d3ee', 0.45);
          D.orb(g, o.x, o.y, r, '#0891b2', 0.55);
          D.circle(g, o.x, o.y, r * 0.66, null, 'rgba(255,255,255,.75)', Math.max(1.5, r * 0.09));
          D.circle(g, o.x, o.y, r * 0.28, '#f43f5e');
          D.circle(g, o.x - r * 0.35, o.y - r * 0.38, r * 0.16, 'rgba(255,255,255,.55)');
        }
        // hit markers
        for (const m of marks) { const k = m.t / 0.25, s = 8 + (1 - k) * 6, c = m.hit ? `rgba(255,255,255,${k})` : `rgba(248,113,113,${k})`; D.line(g, m.x - s, m.y - s, m.x - s / 2, m.y - s / 2, c, 2.5); D.line(g, m.x + s, m.y - s, m.x + s / 2, m.y - s / 2, c, 2.5); D.line(g, m.x - s, m.y + s, m.x - s / 2, m.y + s / 2, c, 2.5); D.line(g, m.x + s, m.y + s, m.x + s / 2, m.y + s / 2, c, 2.5); }
        // HUD
        const k = Math.max(0, time / DUR);
        D.fillRR(g, W / 2 - 160, 16, 320, 8, 4, 'rgba(255,255,255,.1)');
        D.fillRR(g, W / 2 - 160, 16, 320 * k, 8, 4, time < 5 ? '#f43f5e' : '#22d3ee');
        D.text(g, time.toFixed(1), W / 2, 36, { size: 14, font: 'mono', color: 'rgba(255,255,255,.7)' });
        for (let i = 0; i < 3; i++) D.fillRR(g, W / 2 - 60 + i * 42, H - 26, 36, 6, 3, i < phase ? '#22d3ee' : i === phase ? `rgba(34,211,238,${0.5 + 0.5 * Math.sin(T * 6)})` : 'rgba(255,255,255,.12)');
        if (streak >= 3) D.text(g, `STREAK ${streak}`, W - 24, H - 30, { size: 18, align: 'right', color: '#fde047' });
        // crosshair
        const gap = 6 + kick * 8, len = 10;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { D.line(g, cx + dx * gap, cy + dy * gap, cx + dx * (gap + len), cy + dy * (gap + len), 'rgba(0,0,0,.6)', 4, 'butt'); D.line(g, cx + dx * gap, cy + dy * gap, cx + dx * (gap + len), cy + dy * (gap + len), '#4ade80', 2, 'butt'); }
        D.circle(g, cx, cy, 1.8, '#4ade80');
        D.vignette(g, W, H, 0.4);
      },
    };
  },
});

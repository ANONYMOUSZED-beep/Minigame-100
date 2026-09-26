MG.add({
  id: 'airhockey', name: 'Air Hockey', cat: 'Sports', color: '#38bdf8', color2: '#f43f5e',
  desc: 'Glowing arcade air hockey against a predictive AI. Bank shots, fake-outs, first to 7.',
  how: ['Move your mallet with the mouse / touch (or <kbd>←↑↓→</kbd>)', 'Mallet speed transfers into the puck — flick for power', 'Bank off the rails to sneak past the AI', 'First to 7 goals wins'],
  w: 600, h: 900, pad: 'LRUD',
  make(E) {
    const W = 600, H = 900, M = 40, GOAL = 190, PR = 24, MR = 38, PAD = 30;
    const pl = { x: W / 2, y: H - 150, vx: 0, vy: 0 }, ai = { x: W / 2, y: 150, vx: 0, vy: 0, mode: 'guard', t: 0 };
    let puck, score = [0, 0], serveT = 1, state = 'play', trail = [], usePtr = false, goalFx = 0, lastHit = 0, over = false;
    function resetPuck(toward) { puck = { x: W / 2, y: H / 2 + (toward === 'me' ? 90 : toward === 'ai' ? -90 : 0), vx: 0, vy: 0 }; serveT = 0.9; trail = []; }
    resetPuck('me');
    E.stat('Score', '0 – 0');
    function malletHit(m) {
      const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
      if (d < PR + MR && d > 0.01) {
        const nx = dx / d, ny = dy / d;
        puck.x = m.x + nx * (PR + MR); puck.y = m.y + ny * (PR + MR);
        const rvx = puck.vx - m.vx, rvy = puck.vy - m.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny;
          const sp = Math.hypot(puck.vx, puck.vy); if (sp > 1900) { puck.vx *= 1900 / sp; puck.vy *= 1900 / sp; }
          const power = Math.min(1, -vn / 1400);
          E.sfx('hit', 1.3 + power * 0.4, 0.3 + power * 0.7); E.shake(power * 6); lastHit = 0.15;
          E.burst(puck.x - nx * PR, puck.y - ny * PR, { n: 8 + power * 20, colors: [m === pl ? '#38bdf8' : '#f43f5e', '#fff'], speed: 200 + power * 250 });
        }
      }
    }
    function goal(forMe) {
      score[forMe ? 0 : 1]++;
      E.stat('Score', `${score[0]} – ${score[1]}`);
      if (forMe) E.score += 100;
      E.sfx(forMe ? 'win' : 'lose'); E.flash(forMe ? '#38bdf8' : '#f43f5e', 0.35); E.shake(12); goalFx = 1;
      E.burst(puck.x, puck.y, { n: 60, colors: forMe ? ['#38bdf8', '#fff'] : ['#f43f5e', '#fff'], speed: 400 });
      if (score[0] >= 7 || score[1] >= 7) { over = true; const win = score[0] >= 7; if (win) E.score += 1000 + (7 - score[1]) * 100; E.after(1.4, () => E.over({ win, title: win ? 'You Win!' : 'AI Wins', msg: `${score[0]} – ${score[1]}` })); }
      resetPuck(forMe ? 'ai' : 'me');
    }
    return {
      update(dt) {
        goalFx = Math.max(0, goalFx - dt * 2); lastHit -= dt;
        // player mallet
        const ox = pl.x, oy = pl.y;
        const a = E.axis();
        if (a.x || a.y) { usePtr = false; pl.x += a.x * 900 * dt; pl.y += a.y * 900 * dt; }
        if (E.ptr.moved || E.ptr.down) usePtr = true;
        if (usePtr) { pl.x = U.damp(pl.x, E.ptr.x, 30, dt); pl.y = U.damp(pl.y, E.ptr.y, 30, dt); }
        pl.x = U.clamp(pl.x, M + MR, W - M - MR); pl.y = U.clamp(pl.y, H / 2 + MR, H - M - MR);
        pl.vx = (pl.x - ox) / Math.max(dt, 1e-4); pl.vy = (pl.y - oy) / Math.max(dt, 1e-4);
        // AI mallet: predict puck path, defend home, strike when puck on its side & slow-ish
        ai.t += dt;
        const aox = ai.x, aoy = ai.y;
        let tx = W / 2, ty = 130;
        const onMySide = puck.y < H / 2;
        if (onMySide && (puck.vy < 250 || puck.y < ai.y + 40)) { tx = puck.x + (puck.x - W / 2) * 0.15; ty = puck.y - (puck.y > ai.y ? 36 : -60); if (puck.y < ai.y) { tx = puck.x + (puck.x < W / 2 ? 60 : -60); ty = puck.y - 70; } }
        else if (puck.vy < 0) { const tt = (puck.y - 140) / -puck.vy; let px = puck.x + puck.vx * Math.min(tt, 1.5); const span = W - 2 * (M + PR); px -= M + PR; px = ((px % (2 * span)) + 2 * span) % (2 * span); if (px > span) px = 2 * span - px; tx = px + M + PR; ty = 120; }
        const skill = U.clamp(0.72 + (score[0] - score[1]) * 0.04, 0.6, 0.95);
        const maxV = 700 + skill * 700;
        const dx = tx - ai.x, dy = ty - ai.y, d = Math.hypot(dx, dy);
        if (d > 1) { const st = Math.min(d, maxV * dt); ai.x += (dx / d) * st; ai.y += (dy / d) * st; }
        ai.x = U.clamp(ai.x, M + MR, W - M - MR); ai.y = U.clamp(ai.y, M + MR, H / 2 - MR);
        ai.vx = (ai.x - aox) / Math.max(dt, 1e-4); ai.vy = (ai.y - aoy) / Math.max(dt, 1e-4);
        if (serveT > 0) { serveT -= dt; return; }
        // puck
        const sub = 6, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          puck.x += puck.vx * h; puck.y += puck.vy * h;
          const fr = Math.exp(-0.25 * h); puck.vx *= fr; puck.vy *= fr;
          if (puck.x < M + PR) { puck.x = M + PR; puck.vx = Math.abs(puck.vx) * 0.9; E.sfx('tick', 1, 0.5); }
          if (puck.x > W - M - PR) { puck.x = W - M - PR; puck.vx = -Math.abs(puck.vx) * 0.9; E.sfx('tick', 1, 0.5); }
          const inGoalX = Math.abs(puck.x - W / 2) < GOAL / 2;
          if (puck.y < M + PR) { if (inGoalX && !over) { goal(true); return; } puck.y = M + PR; puck.vy = Math.abs(puck.vy) * 0.9; E.sfx('tick', 1, 0.5); }
          if (puck.y > H - M - PR) { if (inGoalX && !over) { goal(false); return; } puck.y = H - M - PR; puck.vy = -Math.abs(puck.vy) * 0.9; E.sfx('tick', 1, 0.5); }
          malletHit(pl); malletHit(ai);
        }
        // un-stick a dead puck
        if (Math.hypot(puck.vx, puck.vy) < 20 && Math.abs(puck.y - H / 2) < 10) { puck.vy += (U.chance(0.5) ? 1 : -1) * 40; }
        trail.push([puck.x, puck.y]); if (trail.length > 14) trail.shift();
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#020617'; g.fillRect(0, 0, W, H);
        // table
        D.fillRR(g, 8, 8, W - 16, H - 16, 40, '#0f172a');
        D.strokeRR(g, 8, 8, W - 16, H - 16, 40, 'rgba(56,189,248,.5)', 3);
        const tg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 600); tg.addColorStop(0, '#1e293b'); tg.addColorStop(1, '#0b1220');
        D.fillRR(g, M, M, W - 2 * M, H - 2 * M, 26, tg);
        g.fillStyle = 'rgba(148,163,184,.12)'; for (let y = M + 20; y < H - M; y += 28) for (let x = M + 20 + ((y / 28) % 2) * 14; x < W - M; x += 28) g.fillRect(x, y, 2, 2);
        g.strokeStyle = 'rgba(244,63,94,.5)'; g.lineWidth = 3; D.line(g, M, H / 2, W - M, H / 2, 'rgba(255,255,255,.25)', 3);
        D.circle(g, W / 2, H / 2, 80, null, 'rgba(255,255,255,.18)', 3);
        D.circle(g, W / 2, M, 110, null, 'rgba(244,63,94,.35)', 3); D.circle(g, W / 2, H - M, 110, null, 'rgba(56,189,248,.35)', 3);
        // goals
        for (const [y, c] of [[M - 6, '#f43f5e'], [H - M + 6, '#38bdf8']]) { D.glow(g, W / 2, y, GOAL * 0.9, c, 0.35 + goalFx * 0.4); D.fillRR(g, W / 2 - GOAL / 2, y - 6, GOAL, 12, 6, c); }
        // puck trail
        g.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(250,204,21,${(i / trail.length) * 0.45})`; g.lineWidth = (i / trail.length) * PR * 1.6; g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke(); }
        D.glow(g, puck.x, puck.y, 60, '#facc15', 0.6 + (lastHit > 0 ? 0.4 : 0));
        D.shadow(g, puck.x + 4, puck.y + 6, PR, PR, 0.4);
        D.circle(g, puck.x, puck.y, PR, '#111827', '#facc15', 4); D.circle(g, puck.x, puck.y, PR * 0.5, null, 'rgba(250,204,21,.6)', 2);
        // mallets
        const mallet = (m, c) => { D.glow(g, m.x, m.y, 80, c, 0.45); D.shadow(g, m.x + 5, m.y + 8, MR, MR, 0.4); D.orb(g, m.x, m.y, MR, c, 0.3); D.circle(g, m.x, m.y, MR * 0.62, U.shade(c, -0.3)); D.orb(g, m.x, m.y, MR * 0.42, U.shade(c, 0.2), 0.5); };
        mallet(ai, '#f43f5e'); mallet(pl, '#38bdf8');
        // score
        D.text(g, score[1], W - 60, H / 2 - 50, { size: 64, color: 'rgba(244,63,94,.35)' });
        D.text(g, score[0], W - 60, H / 2 + 54, { size: 64, color: 'rgba(56,189,248,.35)' });
        if (serveT > 0 && !over) D.text(g, 'READY', W / 2, H / 2 + (puck.y > H / 2 ? 150 : -150), { size: 22, color: 'rgba(255,255,255,.6)' });
        void t;
      },
    };
  },
});

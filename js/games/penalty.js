MG.add({
  id: 'penalty', name: 'Penalty Kick', cat: 'Sports', color: '#22c55e', color2: '#f8fafc',
  desc: 'A full shootout under the lights: swipe to bend shots past the keeper, then read the striker and dive.',
  how: ['Shooting: swipe from the ball toward the goal — curve the swipe to bend it', 'Keyboard: move the target with <kbd>←↑↓→</kbd>, <kbd>Space</kbd> to shoot', 'Keeping: click / tap where you want to dive (or aim with arrows + <kbd>Space</kbd>)', 'Five kicks each, then sudden death'],
  pad: 'LRUDA', padLabels: { A: 'GO' },
  make(E) {
    const W = 960, H = 600, GX = 480, GY = 330, PXM = 71, SPOT = [480, 540];
    const gToS = (gx, gy) => [GX + gx * PXM, GY - gy * PXM];
    const sToG = (x, y) => [(x - GX) / PXM, (GY - y) / PXM];
    let phase = 'shoot', state = 'ready', kicks = { me: [], ai: [] }, round = 0, ball, keeper, shooter, reticle = { gx: 1.8, gy: 1.2 }, swipe = null, result = null, resT = 0, netBulge = null, flash = 0, sudden = false;
    function resetKeeper() { keeper = { gx: 0, gy: 0, tgx: 0, tgy: 0, dive: 0, dir: 0, react: 0, moving: false }; }
    function setup() {
      ball = { t: 0, from: SPOT, tgx: 0, tgy: 0, flightT: 0.7, curve: 0, live: false, spin: 0 };
      resetKeeper(); result = null; state = 'ready'; netBulge = null;
      if (phase === 'keep') { shooter = { t: 0, run: 1.1, tgx: U.rand(-3.3, 3.3), tgy: U.rand(0.2, 2.2) * (U.chance(0.7) ? 1 : 0.4), lean: 0 }; shooter.lean = Math.sign(shooter.tgx) * (U.chance(0.7) ? 1 : -1); }
      E.stat('Round', sudden ? 'SD' : `${Math.min(5, round + 1)}/5`);
    }
    setup();
    const tally = (arr) => arr.filter(Boolean).length;
    function kick(gx, gy, flightT, curve) {
      ball.tgx = gx; ball.tgy = gy; ball.flightT = flightT; ball.curve = curve; ball.live = true; ball.t = 0; state = 'flight';
      E.sfx('thud', 0.8); E.shake(3);
      if (phase === 'shoot') {
        // AI keeper guess
        const read = U.clamp(0.28 + round * 0.06, 0.28, 0.6), guess = U.chance(read) ? [gx + U.rand(-0.6, 0.6), gy + U.rand(-0.4, 0.4)] : [U.pick([-2.4, -1.2, 0, 1.2, 2.4]), U.rand(0.3, 1.6)];
        keeper.tgx = U.clamp(guess[0], -3.3, 3.3); keeper.tgy = U.clamp(guess[1] - 0.9, 0, 1.1); keeper.react = 0.12 + U.rand(0, 0.1);
      }
    }
    function arrive() {
      const bx = ball.tgx, by = ball.tgy;
      const inGoal = Math.abs(bx) < 3.55 && by < 2.35 && by >= 0;
      const kx = keeper.gx, ky = keeper.gy + 0.9;
      const saved = inGoal && Math.abs(bx - kx) < 0.95 + (keeper.dive > 0.5 ? 0.25 : 0) && Math.abs(by - ky) < 1.15;
      const post = !inGoal && Math.abs(Math.abs(bx) - 3.66) < 0.12 && by < 2.5 || !inGoal && Math.abs(by - 2.44) < 0.1 && Math.abs(bx) < 3.7;
      let goal = inGoal && !saved;
      result = goal ? 'GOAL!' : saved ? 'SAVED!' : post ? 'OFF THE POST!' : 'MISSED!';
      const mine = phase === 'shoot';
      (mine ? kicks.me : kicks.ai).push(goal);
      if (goal) { netBulge = { gx: bx, gy: by, t: 1 }; E.sfx(mine ? 'win' : 'lose'); if (mine) { E.score += 100; E.flash('#22c55e', 0.2); } else E.shake(6); }
      else { if (saved) E.sfx(mine ? 'hit' : 'power'); else E.sfx(post ? 'ding' : 'whoosh'); if (!mine) { E.score += 150; E.flash('#60a5fa', 0.2); } }
      if (goal || saved) { const [x, y] = gToS(bx, by); E.burst(x, y, { n: 30, colors: goal ? ['#fff', '#22c55e', '#facc15'] : ['#60a5fa', '#fff'], speed: 260 }); }
      state = 'result'; resT = 1.8;
      E.stat('Score', `${tally(kicks.me)} – ${tally(kicks.ai)}`);
    }
    function next() {
      if (phase === 'shoot') { phase = 'keep'; setup(); return; }
      phase = 'shoot'; round++;
      const m = tally(kicks.me), a = tally(kicks.ai), n = kicks.me.length;
      let over = null;
      if (!sudden) {
        const remaining = 5 - n;
        if (m > a + remaining || a > m + remaining) over = m > a;
        else if (n >= 5) { if (m !== a) over = m > a; else { sudden = true; E.banner('SUDDEN DEATH', null, { color: '#ef4444' }); } }
      } else if (m !== a) over = m > a;
      if (over !== null) { if (over) E.score += 1000; E.after(0.4, () => E.over({ win: over, title: over ? 'Champions!' : 'Defeated', msg: `Shootout ${m} – ${a}` })); state = 'done'; return; }
      setup();
    }
    E.stat('Score', '0 – 0');
    return {
      update(dt) {
        flash = Math.max(0, flash - dt);
        if (netBulge) netBulge.t = Math.max(0, netBulge.t - dt * 0.8);
        if (state === 'result') { resT -= dt; if (resT <= 0) next(); }
        if (state === 'done') return;
        // keeper motion (both phases)
        if (state === 'flight' || state === 'result') {
          if (phase === 'shoot') keeper.react -= dt;
          if (keeper.react <= 0 || phase === 'keep') {
            const dx = keeper.tgx - keeper.gx, dy = keeper.tgy - keeper.gy, d = Math.hypot(dx, dy);
            const sp = 7.5 * (phase === 'keep' ? 1.1 : 1);
            if (d > 0.02) { const st = Math.min(d, sp * dt); keeper.gx += (dx / d) * st; keeper.gy += (dy / d) * st; }
            keeper.dive = U.clamp(Math.abs(keeper.gx) / 2.2 + keeper.gy / 2.5, 0, 1); keeper.dir = Math.sign(keeper.gx);
          }
        }
        if (phase === 'shoot' && state === 'ready') {
          const a = E.axis();
          reticle.gx = U.clamp(reticle.gx + a.x * 4 * dt, -4.2, 4.2); reticle.gy = U.clamp(reticle.gy - a.y * 3 * dt, 0, 3);
          if (E.hit('A')) kick(reticle.gx + U.rand(-0.15, 0.15), reticle.gy + U.rand(-0.1, 0.1), 0.62, 0);
          if (E.ptr.hit && E.ptr.sy > 380) swipe = { pts: [[E.ptr.sx, E.ptr.sy, E.t - 1 / 60]] };
          if (swipe && E.ptr.down) swipe.pts.push([E.ptr.x, E.ptr.y, E.t]);
          if (swipe && E.ptr.up) {
            const P = swipe.pts; swipe = null; P.push([E.ptr.x, E.ptr.y, E.t + 1 / 60]);
            const [x0, y0, t0] = P[0], [x1, y1, t1] = P[P.length - 1], dy = y0 - y1;
            if (dy > 40) {
              const speed = dy / Math.max(0.06, t1 - t0);
              const gx = ((x1 - x0) / dy) * 5.2, gy = U.clamp((dy - 60) / 110 + (speed > 2200 ? 0.6 : 0), 0, 3.6);
              const mid = P[Math.floor(P.length / 2)], lx = U.lerp(x0, x1, (y0 - mid[1]) / dy), curve = U.clamp((mid[0] - lx) / 40, -1.5, 1.5);
              kick(gx + curve * 0.35, gy, U.clamp(900 / speed, 0.42, 0.85), curve);
            }
          }
        }
        if (phase === 'keep') {
          if (state === 'ready') {
            shooter.t += dt;
            const a = E.axis();
            reticle.gx = U.clamp(reticle.gx + a.x * 5 * dt, -3.5, 3.5); reticle.gy = U.clamp(reticle.gy - a.y * 3 * dt, 0, 2.2);
            if (shooter.t >= shooter.run) kick(shooter.tgx, shooter.tgy, U.rand(0.55, 0.75), U.rand(-0.6, 0.6));
          }
          if (!keeper.moving && (state === 'ready' || state === 'flight')) {
            if (E.ptr.hit) { const [gx, gy] = sToG(E.ptr.x, E.ptr.y); keeper.tgx = U.clamp(gx, -3.6, 3.6); keeper.tgy = U.clamp(gy - 0.9, 0, 1.1); keeper.moving = true; E.sfx('whoosh', 1.3); }
            if (E.hit('A')) { keeper.tgx = reticle.gx; keeper.tgy = U.clamp(reticle.gy - 0.9, 0, 1.1); keeper.moving = true; E.sfx('whoosh', 1.3); }
          }
        }
        if (state === 'flight') { ball.t += dt / ball.flightT; ball.spin += dt * 20; if (ball.t >= 1) { ball.t = 1; arrive(); } }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#020617', '#0f172a');
        // stands & crowd
        g.fillStyle = '#111827'; g.fillRect(0, 30, W, 120);
        for (let i = 0; i < 420; i++) { const x = (i * 23.7) % W, y = 36 + ((i * 17) % 108); g.fillStyle = U.hsl((i * 53) % 360, 50, 30 + ((i * 7) % 20)); g.fillRect(x, y + Math.sin(t * 6 + i) * (result === 'GOAL!' ? 3 : 0.5), 5, 6); }
        for (const lx of [60, 900]) { D.glow(g, lx, 24, 160, '#fef9c3', 0.35); D.fillRR(g, lx - 30, 8, 60, 26, 5, '#f8fafc'); }
        D.fillRR(g, 0, 150, W, 22, 0, '#1e3a8a'); D.text(g, 'MG·100 CUP  ·  PENALTY SHOOTOUT  ·  MG·100 CUP  ·  PENALTY SHOOTOUT  ·  MG·100 CUP', W / 2 - ((t * 60) % 200), 161, { size: 12, font: 'mono', color: '#bfdbfe' });
        // pitch
        const pg = g.createLinearGradient(0, 172, 0, H); pg.addColorStop(0, '#14532d'); pg.addColorStop(1, '#15803d'); g.fillStyle = pg; g.fillRect(0, 172, W, H - 172);
        for (let k = 0; k < 10; k++) { if (k % 2) continue; const y0 = 172 + Math.pow(k / 10, 1.6) * (H - 172), y1 = 172 + Math.pow((k + 1) / 10, 1.6) * (H - 172); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, y0, W, y1 - y0); }
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(80, GY); g.lineTo(W - 80, GY); g.stroke();
        g.beginPath(); g.moveTo(230, GY); g.lineTo(150, 440); g.lineTo(W - 150, 440); g.lineTo(W - 230, GY); g.stroke();
        D.circle(g, SPOT[0], SPOT[1] + 8, 4, '#fff');
        // net
        const [l, top] = gToS(-3.66, 2.44), [r] = gToS(3.66, 0);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(l, top, r - l, GY - top);
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
        for (let gx = -3.6; gx <= 3.6; gx += 0.3) { const [x] = gToS(gx, 0); const push = netBulge ? Math.max(0, 1 - Math.abs(gx - netBulge.gx) / 1.2) * netBulge.t * 12 : 0; g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + push * 0.3, (top + GY) / 2 - push, x, GY); g.stroke(); }
        for (let gy = 0.25; gy < 2.44; gy += 0.3) { const [, y] = gToS(0, gy); g.beginPath(); g.moveTo(l, y); g.lineTo(r, y); g.stroke(); }
        // keeper
        const [kx, ky] = gToS(keeper.gx, keeper.gy);
        g.save(); g.translate(kx, ky - 64); g.rotate(keeper.dir * keeper.dive * 1.2);
        D.shadow(g, 0, 64, 30, 6, keeper.gy > 0.2 ? 0.15 : 0.3);
        const kit = phase === 'shoot' ? '#f97316' : '#3b82f6';
        D.fillRR(g, -16, -20, 32, 44, 10, kit); D.circle(g, 0, -34, 13, '#fcd9b6'); g.fillStyle = '#1f2937'; g.beginPath(); g.arc(0, -38, 13, Math.PI, 0); g.fill();
        g.fillStyle = '#111827'; g.fillRect(-14, 22, 11, 38); g.fillRect(3, 22, 11, 38);
        const armUp = 0.6 + keeper.dive * 0.9;
        for (const s of [-1, 1]) { g.save(); g.translate(s * 16, -14); g.rotate(s * (0.5 + armUp * 0.8)); D.fillRR(g, -5, -38, 10, 38, 5, kit); D.circle(g, 0, -40, 9, '#fef08a'); g.restore(); }
        g.restore();
        // posts
        g.lineCap = 'round';
        D.line(g, l, GY + 2, l, top, '#f8fafc', 9); D.line(g, r, GY + 2, r, top, '#f8fafc', 9); D.line(g, l, top, r, top, '#f8fafc', 9);
        D.line(g, l + 2, GY, l + 2, top + 2, '#cbd5e1', 3);
        // shooter (AI) run-up
        if (phase === 'keep' && (state === 'ready' || (state === 'flight' && ball.t < 0.3))) {
          const k = U.clamp(shooter.t / shooter.run, 0, 1), sx = SPOT[0] - 120 + k * 100 + shooter.lean * 10 * k, sy = SPOT[1] + 30 - k * 20;
          g.save(); g.translate(sx, sy); g.rotate(-0.15 + shooter.lean * 0.1);
          D.fillRR(g, -14, -80, 28, 50, 10, '#dc2626'); D.circle(g, 0, -92, 13, '#8d5524');
          g.fillStyle = '#f8fafc'; g.fillRect(-12, -32, 10, 34); g.fillRect(2, -32 + Math.sin(k * 20) * 4, 10, 34);
          g.restore();
        }
        // ball
        let bx, by, bs;
        if (!ball.live) { [bx, by] = SPOT; bs = 1; }
        else {
          const k = ball.t, [tx, ty] = gToS(ball.tgx, ball.tgy);
          bx = U.lerp(SPOT[0], tx, k) + Math.sin(k * Math.PI) * ball.curve * -60; by = U.lerp(SPOT[1], ty, U.ease.outQuad(k)) - Math.sin(k * Math.PI) * 30; bs = U.lerp(1, 0.42, k);
          if (state === 'result' && result === 'GOAL!') { bs = 0.42; }
        }
        D.shadow(g, bx, ball.live ? U.lerp(SPOT[1] + 18, GY, ball.t) : SPOT[1] + 18, 20 * bs, 5 * bs, 0.35);
        g.save(); g.translate(bx, by); g.rotate(ball.spin); D.orb(g, 0, 0, 20 * bs, '#f8fafc', 0.2);
        g.fillStyle = '#111827'; for (let k = 0; k < 5; k++) { const a = (k / 5) * U.TAU; D.poly(g, U.range(5).map((q) => [Math.cos(a) * 11 * bs + Math.cos((q / 5) * U.TAU) * 4 * bs, Math.sin(a) * 11 * bs + Math.sin((q / 5) * U.TAU) * 4 * bs]), '#111827'); }
        D.poly(g, U.range(5).map((q) => [Math.cos((q / 5) * U.TAU - Math.PI / 2) * 6 * bs, Math.sin((q / 5) * U.TAU - Math.PI / 2) * 6 * bs]), '#111827');
        g.restore();
        // reticle
        if (state === 'ready') {
          const [rx, ry] = gToS(reticle.gx, reticle.gy);
          g.strokeStyle = phase === 'shoot' ? 'rgba(250,204,21,.9)' : 'rgba(96,165,250,.9)'; g.lineWidth = 2.5;
          g.beginPath(); g.arc(rx, ry, 16, 0, U.TAU); g.moveTo(rx - 24, ry); g.lineTo(rx - 8, ry); g.moveTo(rx + 8, ry); g.lineTo(rx + 24, ry); g.moveTo(rx, ry - 24); g.lineTo(rx, ry - 8); g.moveTo(rx, ry + 8); g.lineTo(rx, ry + 24); g.stroke();
        }
        if (swipe && swipe.pts.length > 1) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); swipe.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        // scoreboard
        D.fillRR(g, W / 2 - 180, 10, 360, 44, 12, 'rgba(0,0,0,.6)');
        D.text(g, 'YOU', W / 2 - 150, 32, { size: 14, align: 'left', color: '#facc15' }); D.text(g, 'CPU', W / 2 + 150, 32, { size: 14, align: 'right', color: '#93c5fd' });
        const dots = (arr, x0, dir) => { const n = Math.max(5, arr.length); for (let i = 0; i < n; i++) D.circle(g, x0 + dir * i * 16, 32, 5.5, arr[i] === undefined ? 'rgba(255,255,255,.15)' : arr[i] ? '#22c55e' : '#ef4444'); };
        dots(kicks.me, W / 2 - 100, 1); dots(kicks.ai, W / 2 + 100, -1);
        const phaseTxt = state === 'ready' ? (phase === 'shoot' ? 'YOUR KICK — swipe to shoot' : 'YOU\'RE IN GOAL — tap where to dive') : '';
        if (phaseTxt) D.text(g, phaseTxt, W / 2, H - 22, { size: 16, font: 'ui', weight: 700, color: 'rgba(255,255,255,.85)' });
        if (result && state === 'result') D.text(g, result, W / 2, 180, { size: 64, color: '#fff', glow: result === 'GOAL!' ? (phase === 'shoot' ? '#22c55e' : '#ef4444') : '#60a5fa', alpha: Math.min(1, resT * 2) });
      },
    };
  },
});

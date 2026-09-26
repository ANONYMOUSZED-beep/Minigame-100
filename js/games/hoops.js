MG.add({
  id: 'hoops', name: 'Hoop Shot', cat: 'Sports', color: '#f97316', color2: '#60a5fa',
  desc: 'A 60-second shooting spree. Flick for the arc, swish for 3, chain makes to catch fire.',
  how: ['Drag back from the ball and release to shoot (slingshot)', 'Or <kbd>←</kbd> <kbd>→</kbd> angle · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>Space</kbd> shoot', 'Swish (no rim) = 3 points · rim-in = 2', 'Three in a row sets you ON FIRE (double points) — the hoop starts moving later'],
  pad: 'LRUDA', padLabels: { A: 'SHOOT' },
  make(E) {
    const W = 960, H = 600, FLOOR = 540, BR = 19, GRAV = 1500;
    const hoop = { x: 780, y: 250, w: 74, move: 0, vx: 0 };
    let ball, spot, time = 60, streak = 0, fire = false, touchedRim = false, scoredThis = false, aim = { a: -0.9, p: 0.62 }, drag = null, made = 0, attempts = 0, state = 'aim', resetT = 0, net = [], crowdT = 0;
    const rimL = () => [hoop.x - hoop.w / 2, hoop.y], rimR = () => [hoop.x + hoop.w / 2, hoop.y];
    function buildNet() {
      net = [];
      for (let s = 0; s < 6; s++) { const strand = []; for (let k = 0; k < 5; k++) { const x = hoop.x - hoop.w / 2 + (s / 5) * hoop.w; strand.push({ x: x + (hoop.x - x) * k * 0.08, y: hoop.y + k * 14, px: 0, py: 0 }); } strand.forEach((p) => { p.px = p.x; p.py = p.y; }); net.push(strand); }
    }
    buildNet();
    function newSpot() {
      const far = Math.min(1, made / 12);
      spot = { x: U.rand(120, 420 - far * 120), y: U.rand(360, 470) };
      ball = { x: spot.x, y: spot.y, vx: 0, vy: 0, rot: 0, live: false };
      touchedRim = false; scoredThis = false; state = 'aim';
      aim.a = U.ang(spot.x, spot.y, hoop.x, hoop.y - 200);
    }
    newSpot();
    E.stat('Time', 60); E.stat('Made', 0);
    function shoot(a, p) {
      const sp = 450 + p * 820;
      ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.live = true; state = 'fly'; attempts++;
      E.sfx('whoosh', 1.2, 0.5);
    }
    function rimHit(rx, ry) {
      const d = U.dist(ball.x, ball.y, rx, ry);
      if (d < BR + 4) {
        const nx = (ball.x - rx) / d, ny = (ball.y - ry) / d, vn = ball.vx * nx + ball.vy * ny;
        ball.x = rx + nx * (BR + 4); ball.y = ry + ny * (BR + 4);
        if (vn < 0) { ball.vx -= 1.6 * vn * nx; ball.vy -= 1.6 * vn * ny; touchedRim = true; E.sfx('tick', 0.7, Math.min(1, -vn / 500)); }
      }
    }
    function score() {
      scoredThis = true; made++; streak++;
      if (streak === 3 && !fire) { fire = true; E.banner('ON FIRE!', '×2 points', { color: '#f97316' }); E.sfx('power'); }
      const pts = (touchedRim ? 2 : 3) * (fire ? 2 : 1);
      E.score += pts; E.stat('Made', made);
      E.pop(hoop.x, hoop.y - 50, touchedRim ? `+${pts}` : `SWISH +${pts}`, { color: touchedRim ? '#fff' : '#facc15', size: touchedRim ? 26 : 32 });
      E.sfx(touchedRim ? 'coin' : 'win', 1, 0.8); crowdT = 1.2;
      E.burst(hoop.x, hoop.y + 30, { n: fire ? 40 : 20, colors: fire ? ['#f97316', '#facc15', '#fff'] : ['#60a5fa', '#fff'], speed: 220 });
      if (made >= 10) hoop.move = Math.min(160, (made - 9) * 18);
    }
    return {
      update(dt) {
        time -= dt; E.stat('Time', Math.max(0, Math.ceil(time)));
        crowdT = Math.max(0, crowdT - dt);
        if (time <= 0 && state !== 'fly') { state = 'over'; E.sfx('lose', 1.2); E.over({ title: 'Buzzer!', msg: `${made} of ${attempts} shots · ${attempts ? Math.round((made / attempts) * 100) : 0}%` }); return; }
        // hoop motion
        if (hoop.move) { const nx = 780 + Math.sin(E.t * 0.9) * hoop.move * 0.6; hoop.vx = (nx - hoop.x) / Math.max(dt, 1e-4); for (const s of net) for (const p of s) { p.x += nx - hoop.x; p.px += nx - hoop.x; } hoop.x = nx; }
        if (state === 'aim') {
          const ax = E.axis();
          aim.a = U.clamp(aim.a + ax.x * 1.4 * dt, -Math.PI + 0.1, -0.1); aim.p = U.clamp(aim.p - ax.y * 0.6 * dt, 0.05, 1);
          if (E.ptr.hit) drag = { x: E.ptr.x, y: E.ptr.y };
          if (drag && E.ptr.down) { const dx = drag.x - E.ptr.x, dy = drag.y - E.ptr.y, d = Math.hypot(dx, dy); if (d > 8) { aim.a = U.clamp(Math.atan2(dy, dx), -Math.PI + 0.1, -0.1); aim.p = U.clamp(d / 220, 0.05, 1); } }
          if (drag && E.ptr.up) { const d = Math.hypot(drag.x - E.ptr.x, drag.y - E.ptr.y); drag = null; if (d > 20) shoot(aim.a, aim.p); }
          if (E.hit('A')) shoot(aim.a, aim.p);
        } else if (state === 'fly') {
          const sub = 4, h = dt / sub;
          for (let s = 0; s < sub; s++) {
            const py = ball.y;
            ball.vy += GRAV * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.rot += (ball.vx / BR) * h;
            rimHit(...rimL()); rimHit(...rimR());
            // backboard
            const bx = hoop.x + hoop.w / 2 + 14;
            if (ball.x + BR > bx && ball.x - BR < bx + 10 && ball.y > hoop.y - 120 && ball.y < hoop.y + 20) { if (ball.vx > 0) { ball.x = bx - BR; ball.vx *= -0.6; E.sfx('thud', 1.2, 0.6); touchedRim = true; } }
            // scoring: pass down through the rim plane between the rims
            if (!scoredThis && py < hoop.y && ball.y >= hoop.y && ball.vy > 0 && ball.x > hoop.x - hoop.w / 2 + 6 && ball.x < hoop.x + hoop.w / 2 - 6) score();
            if (ball.y + BR > FLOOR) { ball.y = FLOOR - BR; ball.vy *= -0.6; ball.vx *= 0.8; if (Math.abs(ball.vy) > 120) E.sfx('thud', 0.9, Math.min(1, Math.abs(ball.vy) / 800)); }
            if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx) * 0.6; }
            // net push
            for (const st of net) for (const p of st) { const d = U.dist(ball.x, ball.y, p.x, p.y); if (d < BR + 2) { p.x += ((p.x - ball.x) / d) * (BR + 2 - d); p.y += ((p.y - ball.y) / d) * (BR + 2 - d); ball.vx *= 0.995; ball.vy *= 0.99; } }
          }
          resetT += dt;
          const settled = ball.y > FLOOR - BR - 2 && Math.abs(ball.vy) < 80;
          if (ball.x > W + 60 || resetT > 4 || (settled && resetT > 0.8)) {
            if (!scoredThis) { streak = 0; if (fire) { fire = false; E.pop(W / 2, 120, 'Fire out', { color: '#94a3b8' }); } }
            resetT = 0; newSpot();
          }
        }
        // net verlet
        for (const st of net) {
          st.forEach((p, k) => { if (k === 0) return; const vx = (p.x - p.px) * 0.96, vy = (p.y - p.py) * 0.96; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 400 * dt * dt; });
          for (let it = 0; it < 3; it++) for (let k = 1; k < st.length; k++) { const a = st[k - 1], b = st[k], d = U.dist(a.x, a.y, b.x, b.y) || 1, diff = (d - 14) / d; if (k - 1 === 0) { b.x -= (b.x - a.x) * diff; b.y -= (b.y - a.y) * diff; } else { a.x += (b.x - a.x) * diff * 0.5; a.y += (b.y - a.y) * diff * 0.5; b.x -= (b.x - a.x) * diff * 0.5; b.y -= (b.y - a.y) * diff * 0.5; } }
          st[0].x = hoop.x - hoop.w / 2 + (net.indexOf(st) / 5) * hoop.w; st[0].y = hoop.y;
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#1e1b4b', '#0f172a');
        // crowd
        for (let i = 0; i < 180; i++) { const x = (i * 53) % W, y = 40 + ((i * 37) % 160), jump = crowdT > 0 ? Math.abs(Math.sin(t * 12 + i)) * 6 * crowdT : 0; D.circle(g, x, y - jump, 7, U.hsl((i * 47) % 360, 40, 35)); D.fillRR(g, x - 8, y + 6 - jump, 16, 16, 5, U.hsl((i * 83) % 360, 35, 28)); }
        g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(0, 0, W, 230);
        // spotlights
        g.save(); g.globalCompositeOperation = 'lighter'; for (const sx of [200, 760]) { const gr = g.createRadialGradient(sx, 0, 10, sx, 0, 520); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } g.restore();
        // floor
        const fg = g.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, '#c2773a'); fg.addColorStop(1, '#8a4b1f'); g.fillStyle = fg; g.fillRect(0, FLOOR, W, H - FLOOR);
        g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 40) g.fillRect(x, FLOOR, 2, H - FLOOR);
        D.line(g, 0, FLOOR, W, FLOOR, '#fde68a', 2);
        D.text(g, `${Math.max(0, Math.ceil(time))}`, W / 2, 110, { size: 64, color: time < 10 ? '#f87171' : '#fde68a', font: 'mono', glow: time < 10 ? '#ef4444' : null });
        // hoop: pole, board
        const bx = hoop.x + hoop.w / 2 + 14;
        D.fillRR(g, bx + 30, hoop.y - 60, 14, FLOOR - hoop.y + 60, 4, '#475569');
        D.line(g, bx + 10, hoop.y - 20, bx + 36, hoop.y - 20, '#64748b', 6);
        D.fillRR(g, bx, hoop.y - 120, 12, 140, 3, 'rgba(226,232,240,.85)');
        D.strokeRR(g, bx + 1, hoop.y - 60, 10, 50, 2, '#ef4444', 2);
        // net
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5;
        for (const st of net) { g.beginPath(); st.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
        for (let k = 1; k < 5; k++) { g.beginPath(); net.forEach((st, i) => (i ? g.lineTo(st[k].x, st[k].y) : g.moveTo(st[k].x, st[k].y))); g.stroke(); }
        // rim
        const rc = fire ? '#f97316' : '#ef4444';
        if (fire) D.glow(g, hoop.x, hoop.y, 90, '#f97316', 0.5 + 0.2 * Math.sin(t * 10));
        D.line(g, hoop.x - hoop.w / 2, hoop.y, hoop.x + hoop.w / 2 + 14, hoop.y, rc, 6);
        // aim preview
        if (state === 'aim') {
          const sp = 450 + aim.p * 820; let x = ball.x, y = ball.y, vx = Math.cos(aim.a) * sp, vy = Math.sin(aim.a) * sp;
          for (let i = 0; i < 16; i++) { for (let k = 0; k < 3; k++) { vy += GRAV / 60; x += vx / 60; y += vy / 60; } g.globalAlpha = 1 - i / 16; D.circle(g, x, y, 4, '#fff'); }
          g.globalAlpha = 1;
          D.fillRR(g, spot.x - 40, spot.y + 34, 80, 7, 3, 'rgba(0,0,0,.4)'); D.fillRR(g, spot.x - 40, spot.y + 34, 80 * aim.p, 7, 3, U.mix('#4ade80', '#ef4444', aim.p));
        }
        // ball
        D.shadow(g, ball.x, FLOOR, BR * (0.6 + 0.4 * Math.min(1, ball.y / FLOOR)), 5, 0.35);
        if (fire && state === 'fly') D.glow(g, ball.x, ball.y, 50, '#f97316', 0.8);
        g.save(); g.translate(ball.x, ball.y); g.rotate(ball.rot);
        D.orb(g, 0, 0, BR, '#ea580c', 0.35);
        g.strokeStyle = '#431407'; g.lineWidth = 2; g.beginPath(); g.moveTo(-BR, 0); g.lineTo(BR, 0); g.moveTo(0, -BR); g.lineTo(0, BR); g.stroke();
        g.beginPath(); g.arc(-BR * 1.2, 0, BR * 0.9, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(BR * 1.2, 0, BR * 0.9, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
        g.restore();
        // front rim over the ball for depth
        D.line(g, hoop.x - hoop.w / 2, hoop.y, hoop.x + 4, hoop.y, rc, 6);
        D.text(g, fire ? `ON FIRE ×2 · streak ${streak}` : `streak ${streak}`, 24, H - 28, { size: 14, align: 'left', font: 'ui', color: fire ? '#fdba74' : '#94a3b8' });
      },
    };
  },
});

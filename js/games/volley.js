MG.add({
  id: 'volley', name: 'Blob Volley', cat: 'Sports', color: '#34d399', color2: '#f472b6',
  desc: 'Slime-style beach volleyball. Head the ball over the net, spike from the air, outwit the AI blob.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> move · <kbd>↑</kbd> / <kbd>Space</kbd> jump', 'Touch: hold left/right side to move, tap the top half to jump', 'Where the ball hits your dome decides where it goes', 'Rally scoring — first to 7 (win by 2)'],
  pad: 'LRA', padLabels: { A: 'JUMP' },
  make(E) {
    const W = 960, H = 600, FLOOR = 520, NETX = W / 2, NETH = 120, NW = 10, BR = 16, SR = 52, G = 1500;
    const me = { x: 240, y: FLOOR, vx: 0, vy: 0, col: '#34d399', side: -1 }, ai = { x: 720, y: FLOOR, vx: 0, vy: 0, col: '#f472b6', side: 1, think: 0, tx: 720 };
    let ball, score = [0, 0], serve = 'me', pause = 1, rally = 0, trail = [], over = false, sand = [];
    for (let i = 0; i < 80; i++) sand.push([U.rand(W), U.rand(FLOOR + 8, H), U.rand(1, 3)]);
    function resetBall() { ball = { x: serve === 'me' ? 240 : 720, y: 220, vx: 0, vy: 0, rot: 0 }; pause = 1; trail = []; rally = 0; }
    resetBall();
    E.stat('Score', '0 – 0');
    function blobPhys(b, move, jump, dt, minX, maxX) {
      b.vx = move * 470;
      if (jump && b.y >= FLOOR) { b.vy = -760; E.sfx('jump', b === me ? 1 : 0.8, 0.4); }
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > FLOOR) { b.y = FLOOR; b.vy = 0; }
      b.x = U.clamp(b.x, minX + SR, maxX - SR);
    }
    function collideBlob(b) {
      const dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy);
      if (d < SR + BR && dy < 8 && d > 0.01) {
        const nx = dx / d, ny = dy / d;
        ball.x = b.x + nx * (SR + BR); ball.y = b.y + ny * (SR + BR);
        const rvx = ball.vx - b.vx, rvy = ball.vy - b.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          ball.vx -= 1.9 * vn * nx; ball.vy -= 1.9 * vn * ny;
          ball.vx += b.vx * 0.25; ball.vy += Math.min(0, b.vy) * 0.3;
          const sp = Math.hypot(ball.vx, ball.vy); if (sp > 1150) { ball.vx *= 1150 / sp; ball.vy *= 1150 / sp; }
          if (sp < 420) { ball.vy -= 120; }
          rally++; E.sfx('bounce', 0.9 + Math.random() * 0.2, 0.8);
          E.burst(ball.x - nx * BR, ball.y - ny * BR, { n: 10, colors: [b.col, '#fff'], speed: 160 });
          if (b.vy < -200 && ball.vy > 300) { E.shake(5); E.pop(ball.x, ball.y - 30, 'SPIKE!', { color: '#fde68a' }); }
        }
      }
    }
    function point(forMe) {
      score[forMe ? 0 : 1]++; serve = forMe ? 'me' : 'ai';
      E.stat('Score', `${score[0]} – ${score[1]}`);
      E.sfx(forMe ? 'coin' : 'hurt'); E.shake(8);
      E.burst(ball.x, FLOOR, { n: 40, colors: ['#fde68a', '#fef3c7', forMe ? '#34d399' : '#f472b6'], speed: 260, angle: -Math.PI / 2, spread: 2.4, grav: 800 });
      if (forMe) E.score += 100 + rally * 10;
      const [a, b] = score;
      if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) { over = true; const win = a > b; if (win) E.score += 1000; E.after(1.2, () => E.over({ win, title: win ? 'Beach Champion!' : 'AI Wins', msg: `${a} – ${b}` })); }
      else resetBall();
    }
    return {
      update(dt) {
        if (over) return;
        // player input
        let mv = E.axis().x, jump = E.down('U', 'A');
        if (E.ptr.down) { if (E.ptr.y < H * 0.45) jump = true; else mv = E.ptr.x < me.x - 20 ? -1 : E.ptr.x > me.x + 20 ? 1 : 0; }
        blobPhys(me, mv, jump, dt, 0, NETX - NW / 2);
        // AI: predict landing x on its side, position slightly behind the ball to push it over
        ai.think -= dt;
        if (ai.think <= 0) {
          ai.think = 0.05;
          let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
          for (let k = 0; k < 180 && y < FLOOR - SR * 0.8; k++) { vy += G / 60; x += vx / 60; y += vy / 60; if (x < BR) { x = BR; vx = -vx; } if (x > W - BR) { x = W - BR; vx = -vx; } }
          ai.tx = x > NETX ? x + 22 + U.rand(-6, 6) : 700;
        }
        const d = ai.tx - ai.x, amv = Math.abs(d) > 8 ? Math.sign(d) : 0;
        const ajump = ball.x > NETX && Math.abs(ball.x - ai.x) < 90 && ball.y < FLOOR - 140 && ball.y > FLOOR - 330 && ball.vy > -100 && Math.random() < 0.25;
        blobPhys(ai, pause > 0 ? 0 : amv * 0.92, ajump, dt, NETX + NW / 2, W);
        if (pause > 0) { pause -= dt; ball.y = 220 + Math.sin(E.t * 4) * 4; return; }
        // ball
        const sub = 4, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          ball.vy += G * 0.55 * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.rot += ball.vx * h * 0.05;
          if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); E.sfx('tick'); }
          if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx); E.sfx('tick'); }
          // net
          if (ball.y > FLOOR - NETH - BR && Math.abs(ball.x - NETX) < NW / 2 + BR) {
            if (ball.y < FLOOR - NETH) { ball.vy = -Math.abs(ball.vy) * 0.8; ball.y = FLOOR - NETH - BR; }
            else { ball.vx = (ball.x < NETX ? -1 : 1) * Math.abs(ball.vx) * 0.8; ball.x = NETX + (ball.x < NETX ? -1 : 1) * (NW / 2 + BR); }
            E.sfx('tick', 0.6);
          }
          collideBlob(me); collideBlob(ai);
          if (ball.y > FLOOR - BR) { point(ball.x > NETX); return; }
        }
        trail.push([ball.x, ball.y]); if (trail.length > 10) trail.shift();
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#38bdf8', '#bae6fd');
        D.glow(g, 800, 90, 120, '#fef9c3', 0.6); D.circle(g, 800, 90, 42, '#fef9c3');
        g.fillStyle = '#0ea5e9'; g.fillRect(0, 380, W, 70); g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 40) g.fillRect(x + Math.sin(t + x) * 6, 400 + ((x * 7) % 30), 18, 2);
        // palms
        for (const px of [60, 900]) { D.line(g, px, FLOOR, px + 20, 300, '#92400e', 12); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.6; g.fillStyle = '#16a34a'; g.save(); g.translate(px + 20, 300); g.rotate(a + Math.sin(t + k) * 0.05); g.beginPath(); g.ellipse(40, 0, 46, 10, 0.3, 0, U.TAU); g.fill(); g.restore(); } }
        const sg = g.createLinearGradient(0, FLOOR - 70, 0, H); sg.addColorStop(0, '#fde68a'); sg.addColorStop(1, '#f59e0b'); g.fillStyle = sg; g.fillRect(0, FLOOR - 70 + 70, W, H - FLOOR);
        g.fillStyle = '#fcd34d'; g.fillRect(0, 450, W, FLOOR - 450);
        for (const [x, y, r] of sand) D.circle(g, x, y, r, 'rgba(180,120,40,.35)');
        // net
        D.line(g, NETX, FLOOR, NETX, FLOOR - NETH - 6, '#f8fafc', NW);
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; for (let y = FLOOR - NETH; y < FLOOR; y += 12) { g.beginPath(); g.moveTo(NETX - 18, y); g.lineTo(NETX + 18, y); g.stroke(); }
        D.fillRR(g, NETX - 20, FLOOR - NETH - 10, 40, 10, 4, '#ef4444');
        // blobs
        const blob = (b, faceBall) => {
          D.shadow(g, b.x, FLOOR + 4, SR * (1 - (FLOOR - b.y) / 600), 8, 0.3);
          g.save(); g.translate(b.x, b.y);
          const sq = b.y >= FLOOR ? 1 + Math.sin(t * 8) * 0.02 : 1 + Math.min(0.15, Math.abs(b.vy) / 4000);
          g.scale(1 / sq, sq);
          const gr = g.createRadialGradient(-SR * 0.3, -SR * 0.6, 4, 0, -SR * 0.3, SR * 1.1); gr.addColorStop(0, U.shade(b.col, 0.4)); gr.addColorStop(1, U.shade(b.col, -0.25));
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, SR, Math.PI, 0); g.closePath(); g.fill();
          const ex = b.side < 0 ? 18 : -18, ang = U.ang(b.x + ex, b.y - 30, ball.x, ball.y);
          D.circle(g, ex, -30, 10, '#fff'); D.circle(g, ex + Math.cos(ang) * 4, -30 + Math.sin(ang) * 4, 5, '#111');
          g.restore(); void faceBall;
        };
        blob(me); blob(ai);
        // ball
        g.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(255,255,255,${(i / trail.length) * 0.4})`; g.lineWidth = (i / trail.length) * BR * 1.4; g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke(); }
        D.shadow(g, ball.x, FLOOR + 2, BR * (0.4 + 0.6 * (ball.y / FLOOR)), 4, 0.3);
        g.save(); g.translate(ball.x, ball.y); g.rotate(ball.rot);
        D.circle(g, 0, 0, BR, '#f8fafc');
        g.fillStyle = '#facc15'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, BR, 0, 2.1); g.fill();
        g.fillStyle = '#3b82f6'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, BR, 2.1, 4.2); g.fill();
        D.circle(g, 0, 0, BR, null, 'rgba(0,0,0,.2)', 1.5);
        g.restore();
        if (ball.y < 0) D.poly(g, [[ball.x, 10], [ball.x - 8, 24], [ball.x + 8, 24]], '#fff');
        D.text(g, score[0], W / 2 - 70, 60, { size: 56, color: '#fff', stroke: 'rgba(0,0,0,.2)', lw: 6 });
        D.text(g, score[1], W / 2 + 70, 60, { size: 56, color: '#fff', stroke: 'rgba(0,0,0,.2)', lw: 6 });
        D.text(g, '–', W / 2, 60, { size: 40, color: '#fff' });
      },
    };
  },
});

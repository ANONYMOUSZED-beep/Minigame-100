MG.add({
  id: 'pong', name: 'Pong Duel', cat: 'Arcade', color: '#e879f9', color2: '#22d3ee',
  desc: 'The original duel, supercharged. Slice spin, smash returns and outplay an adaptive AI to 7.',
  how: ['Move with mouse / touch or <kbd>↑</kbd> <kbd>↓</kbd>', 'Moving the paddle as you hit adds spin', 'Hit with the paddle edge for sharper angles', 'First to 7 wins · long rallies score bonus'],
  pad: 'UD',
  make(E) {
    const W = 960, H = 600, PH = 104, PW = 14;
    const me = { x: 44, y: H / 2, vy: 0, flash: 0, score: 0 }, ai = { x: W - 44, y: H / 2, vy: 0, flash: 0, score: 0, target: H / 2, think: 0 };
    let ball, serveT = 1.2, serveDir = 1, rally = 0, bestRally = 0, trail = [], usePtr = false, over = false, hits = 0;
    function newBall() {
      ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9, spin: 0, speed: 430 + (me.score + ai.score) * 8, hot: 0 };
      serveT = 1.1; trail = []; rally = 0;
    }
    newBall();
    function serve() {
      const a = U.rand(-0.45, 0.45);
      ball.vx = Math.cos(a) * ball.speed * serveDir; ball.vy = Math.sin(a) * ball.speed;
      E.sfx('blip', 1.4);
    }
    function predictY() {
      // simulate straight-line reflections to AI x
      let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
      if (vx <= 0) return H / 2;
      const tt = (ai.x - PW - x) / vx; y = y + vy * tt;
      const span = H - 2 * ball.r;
      y -= ball.r; y = ((y % (2 * span)) + 2 * span) % (2 * span); if (y > span) y = 2 * span - y;
      return y + ball.r;
    }
    function paddleHit(p, side) {
      const rel = U.clamp((ball.y - p.y) / (PH / 2), -1, 1);
      const sp = Math.min(1150, Math.hypot(ball.vx, ball.vy) + 26 + Math.abs(p.vy) * 0.05);
      const smash = Math.abs(p.vy) > 700;
      const a = rel * 0.95;
      ball.vx = Math.cos(a) * sp * side * (smash ? 1.18 : 1); ball.vy = Math.sin(a) * sp;
      ball.spin = U.clamp(p.vy * 0.0035, -3.2, 3.2);
      ball.hot = smash ? 1 : 0;
      p.flash = 1; rally++; hits++;
      if (rally > bestRally) bestRally = rally;
      E.stat('Rally', rally);
      E.sfx(smash ? 'hit' : 'bounce', 0.9 + Math.min(rally, 20) * 0.03);
      E.shake(smash ? 9 : 3);
      E.burst(ball.x, ball.y, { n: smash ? 30 : 12, colors: side > 0 ? ['#22d3ee', '#fff'] : ['#e879f9', '#fff'], speed: smash ? 380 : 220, angle: side > 0 ? 0 : Math.PI, spread: 1.6 });
      if (smash) { E.pop(ball.x + side * 30, ball.y - 26, 'SMASH!', { color: '#fde68a', size: 22 }); E.freeze(0.05); }
    }
    function point(winner) {
      winner.score++;
      const isMe = winner === me;
      E.sfx(isMe ? 'coin' : 'hurt'); E.shake(14); E.flash(isMe ? '#22d3ee' : '#e879f9', 0.25);
      E.burst(ball.x, ball.y, { n: 60, colors: isMe ? ['#22d3ee', '#fff'] : ['#e879f9', '#fff'], speed: 420, life: 1 });
      E.ring(ball.x, ball.y, { color: isMe ? '#22d3ee' : '#e879f9', r: 160, lw: 8 });
      if (isMe) E.score += 100 + rally * 10;
      serveDir = isMe ? 1 : -1;
      if (me.score >= 7 || ai.score >= 7) {
        over = true; const win = me.score >= 7;
        if (win) E.score += 1000 + (7 - ai.score) * 150;
        E.after(1.2, () => E.over({ win, title: win ? 'You Win!' : 'AI Wins', msg: `${me.score} – ${ai.score} · longest rally ${bestRally}` }));
      } else if (me.score === 6 || ai.score === 6) E.banner('MATCH POINT');
      newBall();
    }
    return {
      update(dt) {
        // player
        const py = me.y;
        if (E.ptr.moved || E.ptr.down) usePtr = true;
        const ay = E.axis().y; if (ay) usePtr = false;
        if (usePtr) me.y = U.damp(me.y, E.ptr.y, 22, dt); else me.y += ay * 620 * dt;
        me.y = U.clamp(me.y, PH / 2, H - PH / 2);
        me.vy = (me.y - py) / Math.max(dt, 1e-4);
        // ai: reacts with delay + error, gets sharper as score grows
        const skill = U.clamp(0.55 + (me.score - ai.score) * 0.06 + (me.score + ai.score) * 0.025, 0.45, 0.95);
        ai.think -= dt;
        if (ai.think <= 0) {
          ai.think = 0.18 - skill * 0.1;
          if (ball.vx > 0) ai.target = predictY() + U.rand(-1, 1) * (1 - skill) * 150 + (U.chance(0.2) ? U.rand(-30, 30) : 0);
          else ai.target = H / 2 + (ball.y - H / 2) * 0.3;
        }
        const aiPrev = ai.y, maxV = 280 + skill * 420;
        ai.y += U.clamp(ai.target - ai.y, -maxV * dt, maxV * dt);
        ai.y = U.clamp(ai.y, PH / 2, H - PH / 2);
        ai.vy = (ai.y - aiPrev) / Math.max(dt, 1e-4);
        me.flash = Math.max(0, me.flash - dt * 4); ai.flash = Math.max(0, ai.flash - dt * 4);
        if (over) return;
        if (serveT > 0) { serveT -= dt; ball.y = H / 2 + Math.sin(E.t * 3) * 6; if (serveT <= 0) serve(); return; }
        // ball
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          const h = dt / steps;
          ball.vy += ball.spin * 160 * h; ball.spin *= Math.exp(-1.2 * h);
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); ball.spin *= -0.5; E.sfx('tick', 1, 0.6); E.burst(ball.x, 0, { n: 5, color: '#fff', speed: 100, angle: Math.PI / 2, spread: 1.5, size: 2 }); }
          if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); ball.spin *= -0.5; E.sfx('tick', 1, 0.6); E.burst(ball.x, H, { n: 5, color: '#fff', speed: 100, angle: -Math.PI / 2, spread: 1.5, size: 2 }); }
          if (ball.vx < 0 && ball.x - ball.r < me.x + PW / 2 && ball.x > me.x - PW && Math.abs(ball.y - me.y) < PH / 2 + ball.r) { ball.x = me.x + PW / 2 + ball.r; paddleHit(me, 1); }
          if (ball.vx > 0 && ball.x + ball.r > ai.x - PW / 2 && ball.x < ai.x + PW && Math.abs(ball.y - ai.y) < PH / 2 + ball.r) { ball.x = ai.x - PW / 2 - ball.r; paddleHit(ai, -1); }
        }
        trail.push([ball.x, ball.y]); if (trail.length > 16) trail.shift();
        ball.hot = Math.max(0, ball.hot - dt * 0.4);
        if (ball.x < -30) point(ai); else if (ball.x > W + 30) point(me);
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1a0f2e', '#06040d');
        D.grid(g, W, H, 40, 'rgba(232,121,249,.05)');
        // big faded scores
        D.text(g, me.score, W / 2 - 150, H / 2, { size: 220, color: 'rgba(34,211,238,.08)' });
        D.text(g, ai.score, W / 2 + 150, H / 2, { size: 220, color: 'rgba(232,121,249,.08)' });
        g.setLineDash([12, 14]); D.line(g, W / 2, 10, W / 2, H - 10, 'rgba(255,255,255,.14)', 3, 'butt'); g.setLineDash([]);
        D.circle(g, W / 2, H / 2, 70, null, 'rgba(255,255,255,.07)', 2);
        // paddles
        const drawPad = (p, col) => {
          D.glow(g, p.x, p.y, 110, col, 0.35 + p.flash * 0.5);
          const gr = g.createLinearGradient(p.x - PW / 2, 0, p.x + PW / 2, 0); gr.addColorStop(0, U.shade(col, 0.5)); gr.addColorStop(1, col);
          D.fillRR(g, p.x - PW / 2, p.y - PH / 2, PW, PH, 7, gr);
          if (p.flash > 0) { g.globalAlpha = p.flash; D.fillRR(g, p.x - PW / 2, p.y - PH / 2, PW, PH, 7, '#fff'); g.globalAlpha = 1; }
        };
        drawPad(me, '#22d3ee'); drawPad(ai, '#e879f9');
        // ball + trail
        const col = ball.hot > 0.2 ? '#fde68a' : '#ffffff';
        g.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const k = i / trail.length;
          g.strokeStyle = U.rgba(ball.hot > 0.2 ? '#f97316' : ball.vx > 0 ? '#22d3ee' : '#e879f9', k * 0.6);
          g.lineWidth = ball.r * 2 * k; g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke();
        }
        D.glow(g, ball.x, ball.y, 40, ball.hot > 0.2 ? '#f97316' : '#bae6fd', 0.9);
        D.circle(g, ball.x, ball.y, ball.r, col);
        if (serveT > 0 && !over) D.text(g, serveDir > 0 ? 'YOUR SERVE' : 'AI SERVES', W / 2, H / 2 + 110, { size: 16, font: 'ui', weight: 600, color: 'rgba(255,255,255,.5)' });
        D.text(g, 'YOU', 80, 26, { size: 13, font: 'mono', color: 'rgba(34,211,238,.7)' });
        D.text(g, 'AI', W - 70, 26, { size: 13, font: 'mono', color: 'rgba(232,121,249,.7)' });
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

MG.add({
  id: 'pinball', name: 'Neon Pinball', cat: 'Sports', color: '#e879f9', color2: '#22d3ee',
  desc: 'A full pinball table: real flipper physics, pop bumpers, slingshots, drop targets, rollover lanes and a kickout saucer.',
  how: ['Flippers: <kbd>←</kbd>/<kbd>Z</kbd> left · <kbd>→</kbd>/<kbd>X</kbd> right (touch: left / right half)', 'Hold <kbd>↓</kbd> or <kbd>Space</kbd> to pull the plunger, release to launch (touch: hold bottom-right)', 'Light all three top lanes to raise the multiplier', 'Knock down the drop-target bank for a big bonus · 3 balls'],
  w: 560, h: 900, pad: 'LRA', padLabels: { A: 'PLUNGE' },
  make(E) {
    const W = 560, H = 900, BR = 10, GRAV = 1150;
    const segs = [];
    const S = (x1, y1, x2, y2, o = {}) => segs.push({ x1, y1, x2, y2, ...o });
    // outer walls + top arc
    S(30, 880, 30, 210); S(530, 880, 530, 210); S(490, 880, 490, 300, { lane: true });
    const arcPts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; arcPts.push([280 + Math.cos(a) * 250, 210 + Math.sin(a) * 180]); }
    for (let i = 0; i < arcPts.length - 1; i++) S(arcPts[i][0], arcPts[i][1], arcPts[i + 1][0], arcPts[i + 1][1]);
    // lower funnels & inlanes
    S(30, 690, 172, 792); S(490, 690, 388, 792);
    S(70, 580, 70, 690, { post: true }); S(450, 580, 450, 690, { post: true });
    // slingshots (kicking hypotenuse)
    const slings = [[[100, 600], [100, 690], [150, 722]], [[420, 600], [420, 690], [370, 722]]];
    for (const [a, b, c] of slings) { S(a[0], a[1], b[0], b[1]); S(b[0], b[1], c[0], c[1]); S(c[0], c[1], a[0], a[1], { kick: 520, sling: true }); }
    // top lane posts
    const lanePosts = [[190, 150], [250, 150], [310, 150], [370, 150]];
    for (const [x, y] of lanePosts) S(x, y, x, y + 34, { post: true });
    const lanes = [{ x: 220, lit: false }, { x: 280, lit: false }, { x: 340, lit: false }];
    const bumpers = [{ x: 210, y: 290, r: 26, flash: 0 }, { x: 330, y: 290, r: 26, flash: 0 }, { x: 270, y: 375, r: 26, flash: 0 }];
    const targets = [{ x: 44, y: 400 }, { x: 44, y: 445 }, { x: 44, y: 490 }].map((t) => ({ ...t, down: false, flash: 0 }));
    const saucer = { x: 420, y: 440, t: 0, hold: 0 };
    const flips = [{ px: 172, py: 792, len: 78, rest: 0.52, up: -0.48, a: 0.52, w: 0, side: 1 }, { px: 388, py: 792, len: 78, rest: Math.PI - 0.52, up: Math.PI + 0.48, a: Math.PI - 0.52, w: 0, side: -1 }];
    let ball, balls = 3, plunge = 0, mult = 1, saveT = 0, state = 'plunger', lightT = 0, drainT = 0, bumps = 0, T = 0, tiltMsg = null, trail = [];
    function newBall() { ball = { x: 510, y: 848, vx: 0, vy: 0, inLane: true }; state = 'plunger'; plunge = 0; trail = []; }
    newBall();
    E.stat('Ball', `1/3`); E.stat('×', 1);
    const add = (pts) => { E.score += pts * mult; };
    function hitSeg(s, e = 0.55) {
      const q = U.segDist(ball.x, ball.y, s.x1, s.y1, s.x2, s.y2);
      if (q.d < BR && q.d > 1e-4) {
        const nx = (ball.x - q.x) / q.d, ny = (ball.y - q.y) / q.d, vn = ball.vx * nx + ball.vy * ny;
        ball.x = q.x + nx * BR; ball.y = q.y + ny * BR;
        if (vn < 0) {
          ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
          if (s.kick && -vn > 60) { ball.vx += nx * s.kick; ball.vy += ny * s.kick; add(10); E.sfx('bounce', 1.4, 0.7); E.shake(2); s.flash = 1; }
          else if (-vn > 180) E.sfx('tick', 1, Math.min(0.6, -vn / 1500));
        }
        return true;
      }
      return false;
    }
    function hitFlipper(f) {
      const ex = f.px + Math.cos(f.a) * f.len, ey = f.py + Math.sin(f.a) * f.len;
      const q = U.segDist(ball.x, ball.y, f.px, f.py, ex, ey), rad = U.lerp(9, 5, q.t);
      if (q.d < BR + rad && q.d > 1e-4) {
        const nx = (ball.x - q.x) / q.d, ny = (ball.y - q.y) / q.d;
        ball.x = q.x + nx * (BR + rad); ball.y = q.y + ny * (BR + rad);
        const sx = -f.w * (q.y - f.py), sy = f.w * (q.x - f.px);
        const rvx = ball.vx - sx, rvy = ball.vy - sy, vn = rvx * nx + rvy * ny;
        if (vn < 0) { ball.vx -= 1.35 * vn * nx; ball.vy -= 1.35 * vn * ny; if (Math.abs(f.w) > 5) E.sfx('thud', 1.3, 0.5); }
      }
    }
    function drain() {
      if (saveT > 0) { tiltMsg = { t: 'BALL SAVED', life: 1.6 }; E.sfx('power'); newBall(); return; }
      balls--; E.sfx('lose'); E.shake(8);
      const bonus = bumps * 100 * mult; E.score += bonus; bumps = 0;
      tiltMsg = { t: `BONUS ${bonus}`, life: 1.8 };
      if (balls <= 0) { state = 'over'; E.after(1.2, () => E.over({ msg: `Multiplier ×${mult}` })); return; }
      E.stat('Ball', `${4 - balls}/3`); mult = Math.max(1, mult - 1); E.stat('×', mult);
      state = 'drain'; drainT = 1.2;
    }
    return {
      update(dt) {
        T += dt; lightT += dt;
        if (tiltMsg) { tiltMsg.life -= dt; if (tiltMsg.life <= 0) tiltMsg = null; }
        const touchPlunge = state === 'plunger' && E.ptr.down && E.ptr.x > W / 2 && E.ptr.y >= H - 220;
        const leftBtn = E.down('L', 'KeyZ') || (E.ptr.down && !touchPlunge && E.ptr.x < W / 2), rightBtn = E.down('R', 'KeyX') || (E.ptr.down && !touchPlunge && E.ptr.x >= W / 2);
        for (const f of flips) {
          const want = (f.side > 0 ? leftBtn : rightBtn) ? f.up : f.rest, prev = f.a;
          const sp = want === f.up ? 24 : 12;
          f.a = U.approach(f.a, want, sp * dt);
          f.w = (f.a - prev) / Math.max(dt, 1e-4);
          if (want === f.up && prev !== f.up && Math.abs(prev - f.up) > 0.8) E.sfx('click', 0.7, 0.6);
        }
        for (const b of bumpers) b.flash = Math.max(0, b.flash - dt * 4);
        for (const s of segs) if (s.flash) s.flash = Math.max(0, s.flash - dt * 4);
        for (const t of targets) t.flash = Math.max(0, t.flash - dt * 3);
        if (state === 'drain') { drainT -= dt; if (drainT <= 0) newBall(); return; }
        if (state === 'over') return;
        if (state === 'plunger') {
          if (E.down('D', 'A') || touchPlunge) plunge = Math.min(1, plunge + dt * 1.1);
          else if (plunge > 0) { ball.vy = -(900 + plunge * 1100); state = 'play'; saveT = 7; E.sfx('whoosh', 1.2); plunge = 0; }
          ball.y = 848 + plunge * 26;
          return;
        }
        saveT -= dt;
        if (saucer.hold > 0) {
          saucer.hold -= dt; ball.x = saucer.x; ball.y = saucer.y; ball.vx = ball.vy = 0;
          if (saucer.hold <= 0) { ball.vx = -520; ball.vy = -260; saucer.t = 0.6; E.sfx('explode', 1.6, 0.4); }
          return;
        }
        saucer.t -= dt;
        const sub = 10, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          ball.vy += GRAV * h;
          const sp = Math.hypot(ball.vx, ball.vy); if (sp > 2600) { ball.vx *= 2600 / sp; ball.vy *= 2600 / sp; }
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          for (const sg of segs) hitSeg(sg, sg.post ? 0.6 : 0.45);
          for (const f of flips) hitFlipper(f);
          for (const b of bumpers) {
            const d = U.dist(ball.x, ball.y, b.x, b.y);
            if (d < b.r + BR) { const nx = (ball.x - b.x) / d, ny = (ball.y - b.y) / d; ball.x = b.x + nx * (b.r + BR); ball.y = b.y + ny * (b.r + BR); const vn = ball.vx * nx + ball.vy * ny; ball.vx += nx * (Math.max(0, -vn) * 1.1 + 560); ball.vy += ny * (Math.max(0, -vn) * 1.1 + 560); b.flash = 1; bumps++; add(100); E.sfx('pop', 0.9 + Math.random() * 0.3, 0.8); E.shake(3); E.burst(b.x + nx * b.r, b.y + ny * b.r, { n: 10, colors: ['#e879f9', '#fff'], speed: 200 }); }
          }
          for (const t of targets) if (!t.down && ball.x - BR < t.x + 8 && ball.x > t.x - 4 && Math.abs(ball.y - t.y) < 18) { t.down = true; t.flash = 1; ball.vx = Math.abs(ball.vx) * 0.8 + 100; add(500); E.sfx('hit', 1.4); if (targets.every((q) => q.down)) { add(5000); E.sfx('win'); tiltMsg = { t: 'TARGET BANK +5000', life: 2 }; E.after(1.5, () => targets.forEach((q) => { q.down = false; q.flash = 1; })); } }
          if (saucer.t <= 0 && U.dist(ball.x, ball.y, saucer.x, saucer.y) < 14 && Math.hypot(ball.vx, ball.vy) < 900) { saucer.hold = 1.1; add(1000); E.sfx('power'); tiltMsg = { t: 'SAUCER +1000', life: 1.2 }; E.flash('#22d3ee', 0.15); break; }
        }
        // rollover lanes
        for (const ln of lanes) if (!ln.lit && Math.abs(ball.x - ln.x) < 18 && ball.y > 150 && ball.y < 190) { ln.lit = true; add(250); E.sfx('coin', 1.3); }
        if (lanes.every((l) => l.lit)) { lanes.forEach((l) => (l.lit = false)); mult = Math.min(5, mult + 1); E.stat('×', mult); tiltMsg = { t: `MULTIPLIER ×${mult}`, life: 1.8 }; E.sfx('power'); }
        // lane change: flipper presses rotate the lit lanes
        if (E.hit('L', 'KeyZ', 'R', 'KeyX')) { const lit = lanes.map((l) => l.lit); if (E.hit('R', 'KeyX')) lit.unshift(lit.pop()); else lit.push(lit.shift()); lanes.forEach((l, i) => (l.lit = lit[i])); }
        trail.push([ball.x, ball.y]); if (trail.length > 8) trail.shift();
        if (ball.y > H + 20) drain();
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#05030d'; g.fillRect(0, 0, W, H);
        // playfield art
        const pf = g.createLinearGradient(0, 0, 0, H); pf.addColorStop(0, '#1e0b3a'); pf.addColorStop(1, '#0b1a33'); g.fillStyle = pf;
        g.beginPath(); g.moveTo(30, 880); g.lineTo(30, 210); arcPts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(530, 880); g.closePath(); g.fill();
        g.save(); g.clip();
        for (let r = 60; r < 600; r += 40) D.circle(g, 280, 520, r, null, `rgba(232,121,249,${0.05 + 0.03 * Math.sin(t * 2 - r * 0.02)})`, 2);
        D.text(g, 'MG', 270, 560, { size: 120, color: 'rgba(34,211,238,.07)' });
        D.text(g, '100', 270, 650, { size: 80, color: 'rgba(232,121,249,.07)' });
        g.restore();
        // lane lights & arrows
        lanes.forEach((ln) => { D.glow(g, ln.x, 200, 22, ln.lit ? '#facc15' : '#475569', ln.lit ? 0.9 : 0.3); D.circle(g, ln.x, 200, 7, ln.lit ? '#fde047' : '#334155'); });
        for (let i = 0; i < 5; i++) { const on = i < mult; D.poly(g, [[250 + i * 16, 740], [258 + i * 16, 728], [266 + i * 16, 740]], on ? '#22d3ee' : '#1e293b'); }
        D.text(g, `×${mult}`, 280, 760, { size: 14, color: '#22d3ee' });
        // saucer
        D.glow(g, saucer.x, saucer.y, 36, '#22d3ee', 0.4 + 0.3 * Math.sin(t * 5)); D.circle(g, saucer.x, saucer.y, 14, '#020617', '#22d3ee', 3);
        // walls
        g.lineCap = 'round';
        for (const s of segs) {
          const c = s.sling ? (s.flash ? '#fff' : '#f472b6') : s.post ? '#94a3b8' : '#22d3ee';
          D.line(g, s.x1, s.y1, s.x2, s.y2, U.rgba(c, 0.25), 10); D.line(g, s.x1, s.y1, s.x2, s.y2, c, 3);
        }
        for (const [a, b, c] of slings) D.poly(g, [a, b, c], 'rgba(244,114,182,.12)');
        // targets
        for (const tg of targets) { if (tg.down) { D.fillRR(g, tg.x - 4, tg.y - 14, 4, 28, 2, '#334155'); continue; } D.glow(g, tg.x + 4, tg.y, 20, '#facc15', 0.4 + tg.flash); D.fillRR(g, tg.x - 4, tg.y - 15, 12, 30, 3, tg.flash ? '#fff' : '#facc15'); }
        // bumpers
        for (const b of bumpers) { D.glow(g, b.x, b.y, 60, '#e879f9', 0.35 + b.flash * 0.6); D.circle(g, b.x, b.y, b.r, '#3b0764', b.flash ? '#fff' : '#e879f9', 4); D.circle(g, b.x, b.y, b.r * 0.55, b.flash ? '#fff' : '#f0abfc'); D.star(g, b.x, b.y, b.r * 0.4, b.r * 0.18, 5, t * 2, '#3b0764'); }
        // flippers
        for (const f of flips) {
          const ex = f.px + Math.cos(f.a) * f.len, ey = f.py + Math.sin(f.a) * f.len;
          D.line(g, f.px, f.py, ex, ey, 'rgba(250,204,21,.3)', 22); D.line(g, f.px, f.py, ex, ey, '#facc15', 14); D.line(g, f.px, f.py, ex, ey, '#fef08a', 5);
          D.circle(g, f.px, f.py, 6, '#78350f');
        }
        // plunger
        D.fillRR(g, 500, 866 + plunge * 26, 20, 30, 4, '#94a3b8'); g.fillStyle = '#ef4444'; g.fillRect(500, 862 + plunge * 26, 20, 5);
        if (state === 'plunger') { D.fillRR(g, 496, 620, 28, 160, 8, 'rgba(255,255,255,.06)'); D.fillRR(g, 496, 780 - 160 * plunge, 28, 160 * plunge, 8, U.mix('#4ade80', '#ef4444', plunge)); }
        // ball
        for (let i = 1; i < trail.length; i++) { g.globalAlpha = (i / trail.length) * 0.35; D.circle(g, trail[i][0], trail[i][1], BR * (i / trail.length), '#e2e8f0'); }
        g.globalAlpha = 1;
        if (state !== 'drain' && state !== 'over') { D.shadow(g, ball.x + 5, ball.y + 7, BR, BR, 0.4); D.orb(g, ball.x, ball.y, BR, '#e2e8f0', 0.6); D.circle(g, ball.x - 3, ball.y - 4, 3, 'rgba(255,255,255,.9)'); }
        // glass glare
        const gl = g.createLinearGradient(0, 0, W, H); gl.addColorStop(0, 'rgba(255,255,255,.06)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
        // score display
        D.fillRR(g, 40, 18, 440, 44, 10, 'rgba(0,0,0,.6)');
        D.text(g, U.fmtNum(E.score), 260, 41, { size: 28, color: '#fb923c', font: 'mono', glow: '#f97316', blur: 10 });
        for (let i = 0; i < balls; i++) D.orb(g, 70 + i * 22, 40, 7, '#e2e8f0');
        if (saveT > 0 && state === 'play') D.text(g, 'BALL SAVE', 280, 830, { size: 12, font: 'mono', color: '#4ade80', alpha: 0.5 + 0.5 * Math.sin(t * 10) });
        if (state === 'plunger') D.text(g, 'HOLD ↓ / SPACE — RELEASE TO LAUNCH', 260, 860, { size: 11, font: 'mono', color: 'rgba(255,255,255,.55)' });
        if (tiltMsg) D.text(g, tiltMsg.t, 270, 470, { size: 26, color: '#fff', glow: '#e879f9', alpha: Math.min(1, tiltMsg.life * 2) });
      },
    };
  },
});

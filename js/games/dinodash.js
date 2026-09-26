MG.add({
  id: 'dinodash', name: 'Dino Dash', cat: 'Runner', color: '#94a3b8', color2: '#fbbf24',
  desc: 'The offline runner, remastered: day-night cycles, parallax deserts, pterodactyls and variable jumps.',
  how: ['<kbd>Space</kbd> / <kbd>↑</kbd> / tap to jump — hold for a higher jump', '<kbd>↓</kbd> to duck (and slam down mid-air)', 'Touch: swipe down to duck', 'The desert speeds up forever'],
  w: 960, h: 440, pad: 'DA', padLabels: { A: 'JUMP' },
  make(E) {
    const W = 960, H = 440, GY = 360;
    const dino = { x: 110, y: GY, vy: 0, duck: false, run: 0, dead: false, land: 0 };
    let obs = [], speed = 380, dist = 0, spawnD = 600, dayT = 0, night = 0, ground = [], clouds = [], mounts = [0, 1].map((l) => U.range(12).map((i) => ({ x: i * 180 + U.rand(-40, 40), h: U.rand(60, 150) * (l ? 0.7 : 1) }))), milestone = 100, holdJump = false, swipeDuck = 0;
    for (let i = 0; i < 40; i++) ground.push({ x: U.rand(W), y: U.rand(GY + 8, H - 10), w: U.rand(2, 8) });
    for (let i = 0; i < 5; i++) clouds.push({ x: U.rand(W), y: U.rand(40, 170), s: U.rand(0.6, 1.2) });
    function spawn() {
      const r = Math.random(), sc = dist / 10;
      if (sc > 300 && r < 0.28) { const hgt = U.pick([GY - 30, GY - 70, GY - 115]); obs.push({ type: 'bird', x: W + 60, y: hgt, w: 54, h: 30, t: 0 }); }
      else { const n = U.ri(1, sc > 200 ? 3 : 2), big = U.chance(0.4); obs.push({ type: 'cactus', x: W + 40, n, big, w: n * (big ? 30 : 22), h: big ? 72 : 50, seed: U.ri(0, 999) }); }
      spawnD = U.rand(380, 700) + speed * 0.5;
    }
    function jump() { if (dino.y >= GY && !dino.dead) { dino.vy = -820; holdJump = true; E.sfx('jump', 1, 0.6); E.burst(dino.x, GY, { n: 8, color: '#d6b98c', speed: 90, angle: -Math.PI * 0.9, spread: 1.2, glow: false, size: 3 }); } }
    function die() {
      dino.dead = true; E.sfx('hurt'); E.shake(14); E.flash('#fff', 0.5); E.freeze(0.1); E.vibrate(200);
      E.burst(dino.x + 20, dino.y - 40, { n: 30, colors: ['#94a3b8', '#fff', '#fbbf24'], speed: 260, shape: 'square', size: 3 });
      E.after(0.9, () => E.over({ msg: `${Math.floor(dist / 10)} m` }));
    }
    function cactus(g, x, y, h, seed, col) {
      const r = U.seeded(seed);
      D.fillRR(g, x - 7, y - h, 14, h, 7, col);
      const la = h * (0.35 + r() * 0.25), ra = h * (0.25 + r() * 0.3);
      D.fillRR(g, x - 20, y - la - 20, 9, 22, 4.5, col); D.fillRR(g, x - 20, y - la, 18, 8, 4, col);
      D.fillRR(g, x + 11, y - ra - 26, 9, 26, 4.5, col); D.fillRR(g, x + 2, y - ra - 2, 18, 8, 4, col);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 3, y - h + 6, 2, h - 12);
    }
    return {
      update(dt) {
        const dark = night;
        if (dino.dead) return;
        dist += speed * dt; E.score = Math.floor(dist / 10);
        speed = Math.min(980, 380 + dist * 0.012);
        dayT += dt;
        const cyc = (Math.floor(dist / 10) % 1400) / 1400; night = U.damp(night, cyc > 0.5 ? 1 : 0, 1.5, dt); void dark;
        if (Math.floor(dist / 10) >= milestone) { milestone += 100; E.sfx('coin', 1.2); E.pop(W - 90, 60, `${milestone - 100}`, { color: '#fbbf24', size: 20 }); }
        // input
        if (E.hit('A', 'U') || (E.ptr.hit && E.ptr.y < H)) jump();
        if (!E.down('A', 'U') && !E.ptr.down) holdJump = false;
        if (E.swipe === 'D') swipeDuck = 0.5;
        swipeDuck -= dt;
        dino.duck = (E.down('D') || swipeDuck > 0) && !dino.dead;
        // physics
        const g0 = dino.vy < 0 && holdJump ? 1700 : 3200;
        dino.vy += (dino.duck && dino.y < GY ? 6000 : g0) * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GY) { if (dino.vy > 300) { dino.land = 1; E.burst(dino.x, GY, { n: 10, color: '#d6b98c', speed: 110, angle: -Math.PI / 2, spread: 2.6, glow: false, size: 3 }); E.sfx('thud', 1.4, 0.3); } dino.y = GY; dino.vy = 0; }
        dino.land = Math.max(0, dino.land - dt * 5);
        dino.run += dt * speed * 0.045;
        if (dino.y >= GY && Math.random() < 0.3) E.burst(dino.x - 16, GY - 2, { n: 1, color: '#d6b98c', speed: 60, angle: Math.PI + 0.3, spread: 0.5, glow: false, size: 2, life: 0.4 });
        spawnD -= speed * dt; if (spawnD <= 0) spawn();
        for (const o of obs) { o.x -= speed * dt * (o.type === 'bird' ? 1.08 : 1); o.t = (o.t || 0) + dt; }
        obs = obs.filter((o) => o.x > -100);
        // collision (forgiving hitboxes)
        const hb = dino.duck && dino.y >= GY ? { x: dino.x - 26, y: dino.y - 38, w: 62, h: 36 } : { x: dino.x - 16, y: dino.y - 74, w: 36, h: 70 };
        for (const o of obs) {
          const ob = o.type === 'bird' ? { x: o.x - o.w / 2 + 6, y: o.y - 12, w: o.w - 12, h: 22 } : { x: o.x - o.w / 2 + 4, y: GY - o.h + 6, w: o.w - 8, h: o.h - 6 };
          if (U.rectsHit(hb, ob)) { die(); break; }
        }
        for (const c of clouds) { c.x -= speed * 0.08 * dt * c.s; if (c.x < -100) { c.x = W + 50; c.y = U.rand(40, 170); } }
        for (const gd of ground) { gd.x -= speed * dt; if (gd.x < -10) { gd.x = W + U.rand(0, 50); gd.y = U.rand(GY + 8, H - 10); } }
        mounts.forEach((l, li) => l.forEach((m) => { m.x -= speed * (li ? 0.12 : 0.05) * dt; if (m.x < -200) m.x += 180 * 12; }));
      },
      draw(g) {
        const t = E.t, n = night;
        const sky1 = U.mix('#7dd3fc', '#0b1026', n), sky2 = U.mix('#fef3c7', '#312e81', n);
        D.bg(g, W, H, sky1, sky2);
        if (n > 0.05) { g.globalAlpha = n; g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const x = (i * 137.5 + t * 3) % W, y = (i * 53) % 220; g.globalAlpha = n * (0.4 + 0.6 * Math.abs(Math.sin(t + i))); g.fillRect(x, y, 2, 2); } g.globalAlpha = 1; }
        const sunY = 80 + n * 300, moonY = 380 - n * 300;
        D.glow(g, 800, sunY, 120, '#fde68a', 0.6 * (1 - n)); D.circle(g, 800, sunY, 34, '#fef3c7');
        if (n > 0.1) { g.globalAlpha = n; D.circle(g, 160, moonY, 26, '#f8fafc'); D.circle(g, 172, moonY - 6, 22, U.mix(sky1, sky2, 0.3)); g.globalAlpha = 1; }
        for (const c of clouds) { g.globalAlpha = 0.7 - n * 0.4; for (let k = 0; k < 3; k++) D.circle(g, c.x + k * 24 * c.s, c.y + (k === 1 ? -8 : 0), 18 * c.s, '#fff'); g.globalAlpha = 1; }
        mounts.forEach((l, li) => { g.fillStyle = li ? U.mix('#d6a770', '#3b3561', n) : U.mix('#e7c9a0', '#2a2550', n); g.beginPath(); g.moveTo(-200, GY); for (const m of l) { g.lineTo(m.x, GY - m.h); g.lineTo(m.x + 90, GY); } g.lineTo(W + 200, GY); g.closePath(); g.fill(); });
        // ground
        g.fillStyle = U.mix('#e9cf9e', '#3a3350', n); g.fillRect(0, GY, W, H - GY);
        g.fillStyle = U.mix('#b98b4f', '#5b5480', n); g.fillRect(0, GY, W, 3);
        g.fillStyle = U.mix('#c9a26a', '#4b4470', n); for (const gd of ground) g.fillRect(gd.x, gd.y, gd.w, 2);
        const col = U.mix('#4b5563', '#e2e8f0', n), cCol = U.mix('#15803d', '#86efac', n * 0.7);
        for (const o of obs) {
          if (o.type === 'cactus') { for (let k = 0; k < o.n; k++) cactus(g, o.x - o.w / 2 + (k + 0.5) * (o.w / o.n), GY, o.h - (k % 2) * 8, o.seed + k, cCol); }
          else {
            const flap = Math.sin(o.t * 14) > 0;
            g.save(); g.translate(o.x, o.y);
            D.poly(g, [[-26, 0], [-8, -6], [18, -4], [28, 2], [14, 6], [-8, 6]], U.mix('#7c2d12', '#fca5a5', n));
            D.poly(g, [[-4, -2], [8, -2], [2, flap ? -30 : 26]], U.mix('#9a3412', '#fecaca', n));
            D.poly(g, [[28, 2], [40, 4], [28, 6]], '#f59e0b'); D.circle(g, 20, -1, 2, '#fff');
            g.restore();
          }
        }
        // dino
        g.save(); g.translate(dino.x, dino.y);
        const sq = 1 - dino.land * 0.12; g.scale(1 + dino.land * 0.1, sq);
        D.shadow(g, 0, 2 + (GY - dino.y) * 0, 30 - Math.min(20, (GY - dino.y) * 0.1), 5, 0.25);
        const legA = dino.y < GY ? 0.4 : Math.sin(dino.run) * 0.7, legB = dino.y < GY ? -0.2 : -Math.sin(dino.run) * 0.7;
        const belly = U.mix('#9ca3af', '#f8fafc', n);
        if (dino.duck && dino.y >= GY) {
          D.poly(g, [[-44, -22], [-20, -30], [-20, -14]], col);
          g.fillStyle = col; g.beginPath(); g.ellipse(0, -22, 30, 14, 0, 0, U.TAU); g.fill();
          D.fillRR(g, 16, -36, 34, 20, 7, col); D.fillRR(g, 30, -22, 20, 7, 3, col);
          D.circle(g, 36, -30, 4, '#fff'); D.circle(g, 37, -30, 2, dino.dead ? '#ef4444' : '#111');
          for (const [ox, a] of [[-10, legA], [8, legB]]) { g.save(); g.translate(ox, -10); g.rotate(a); D.fillRR(g, -4, 0, 9, 12, 3, col); g.restore(); }
        } else {
          D.poly(g, [[-40, -40], [-14, -52], [-12, -30]], col);
          g.fillStyle = col; g.beginPath(); g.ellipse(-4, -40, 22, 20, -0.2, 0, U.TAU); g.fill();
          g.fillStyle = belly; g.beginPath(); g.ellipse(2, -34, 12, 12, 0, 0, U.TAU); g.fill();
          D.fillRR(g, 2, -70, 14, 26, 6, col);
          D.fillRR(g, 0, -80, 36, 22, 8, col); D.fillRR(g, 14, -66, 22, 8, 3, col);
          D.circle(g, 16, -73, 4.5, '#fff'); D.circle(g, 17.5, -73, 2.2, dino.dead ? '#ef4444' : '#111');
          if (dino.dead) { D.line(g, 13, -76, 20, -70, '#111', 2); D.line(g, 20, -76, 13, -70, '#111', 2); }
          D.fillRR(g, 12, -46, 10, 5, 2, col);
          for (const [ox, a] of [[-10, legA], [4, legB]]) { g.save(); g.translate(ox, -24); g.rotate(a); D.fillRR(g, -5, 0, 10, 24, 4, col); D.fillRR(g, -5, 20, 14, 5, 2, col); g.restore(); }
        }
        g.restore();
        D.text(g, String(Math.floor(dist / 10)).padStart(5, '0'), W - 24, 30, { size: 22, font: 'mono', align: 'right', color: U.mix('#4b5563', '#e2e8f0', n) });
        const b = E.best; if (b) D.text(g, 'HI ' + String(b).padStart(5, '0'), W - 120, 30, { size: 22, font: 'mono', align: 'right', color: U.mix('#9ca3af', '#94a3b8', n) });
      },
    };
  },
});

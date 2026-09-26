MG.add({
  id: 'wingbeat', name: 'Wingbeat', cat: 'Runner', color: '#fbbf24', color2: '#fb7185',
  desc: 'One-button flight through a sunset city. Pillars start drifting once you get good.',
  how: ['Tap, click, <kbd>Space</kbd> or <kbd>↑</kbd> to flap', 'Thread the gaps between the pillars', 'Medals at 10 · 20 · 30 · 50', 'Past 15, some pillars start to move'],
  w: 540, h: 800, pad: 'A', padLabels: { A: 'FLAP' },
  make(E) {
    const W = 540, H = 800, GROUND = 700;
    const bird = { x: 150, y: 360, vy: 0, a: 0, flap: 0, dead: false, t: 0 };
    let pipes = [], spawnX = 520, scroll = 0, speed = 190, started = false, passed = 0, groundX = 0, featherT = 0;
    const clouds = U.range(7).map((i) => ({ x: U.rand(W), y: U.rand(60, 360), s: U.rand(0.6, 1.4), v: U.rand(0.2, 0.5) }));
    const city = [0, 1, 2].map((layer) => { const r = U.seeded(40 + layer); const b = []; let x = 0; while (x < W * 2) { const w = 30 + r() * 50; b.push({ x, w, h: 80 + r() * (140 + layer * 60), win: r() }); x += w + 4; } return b; });
    function addPipe(x) {
      const gap = Math.max(150, 200 - passed * 1.6);
      const cy = U.rand(170 + gap / 2, GROUND - 110 - gap / 2);
      pipes.push({ x, cy, gap, w: 84, scored: false, move: passed > 15 && U.chance(0.35) ? U.rand(40, 80) : 0, ph: U.rand(6), t: 0 });
    }
    function flap() {
      if (bird.dead) return;
      started = true; bird.vy = -470; bird.flap = 1;
      E.sfx('flap', 1 + Math.random() * 0.15, 0.8);
      E.burst(bird.x - 10, bird.y + 6, { n: 3, colors: ['#fff7ed', '#fde68a'], speed: 70, angle: Math.PI * 0.75, spread: 1, grav: 200, life: 0.6, size: 3, glow: false, shape: 'square' });
    }
    function die() {
      if (bird.dead) return;
      bird.dead = true; bird.vy = Math.min(bird.vy, -200);
      E.sfx('hit'); E.flash('#fff', 0.7); E.shake(12); E.freeze(0.12); E.vibrate(150);
      E.burst(bird.x, bird.y, { n: 30, colors: ['#fde68a', '#fb923c', '#fff'], speed: 250, shape: 'square', size: 3 });
      E.after(0.35, () => E.sfx('whoosh', 0.6));
      const medal = passed >= 50 ? 'Platinum' : passed >= 30 ? 'Gold' : passed >= 20 ? 'Silver' : passed >= 10 ? 'Bronze' : null;
      E.after(1.1, () => E.over({ msg: medal ? `${medal} medal · ${passed} pillars` : `${passed} pillar${passed === 1 ? '' : 's'} cleared` }));
    }
    function pillar(g, x, y, w, h, top) {
      const gr = g.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, '#0f766e'); gr.addColorStop(0.35, '#2dd4bf'); gr.addColorStop(0.6, '#14b8a6'); gr.addColorStop(1, '#115e59');
      g.fillStyle = gr; g.fillRect(x + 6, y, w - 12, h);
      const capY = top ? y + h - 30 : y;
      const cg = g.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, '#134e4a'); cg.addColorStop(0.35, '#5eead4'); cg.addColorStop(1, '#0f766e');
      D.fillRR(g, x, capY, w, 30, 6, cg);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 16, y, 6, h);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(x + 1, capY + 1, w - 2, 28);
    }
    return {
      update(dt) {
        bird.t += dt; bird.flap = Math.max(0, bird.flap - dt * 4);
        if (E.hit('A', 'U') || E.ptr.hit) flap();
        for (const c of clouds) { c.x -= c.v * speed * 0.2 * dt; if (c.x < -120) c.x = W + 60; }
        if (!started) { bird.y = 360 + Math.sin(bird.t * 3) * 10; bird.a = 0; groundX -= speed * dt; return; }
        bird.vy += 1500 * dt; bird.vy = Math.min(bird.vy, 800);
        bird.y += bird.vy * dt;
        bird.a = U.clamp(bird.vy / 900, -0.45, bird.dead ? 1.6 : 1.3);
        if (bird.y > GROUND - 14) { bird.y = GROUND - 14; if (!bird.dead) die(); bird.vy = 0; }
        if (bird.y < -40) bird.y = -40;
        if (bird.dead) return;
        const sp = speed + Math.min(passed, 40) * 1.5;
        scroll += sp * dt; groundX -= sp * dt;
        spawnX -= sp * dt;
        if (spawnX <= W) { addPipe(W + 40); spawnX += 260 - Math.min(passed, 30); }
        for (const p of pipes) {
          p.x -= sp * dt; p.t += dt;
          const cy = p.cy + (p.move ? Math.sin(p.t * 1.6 + p.ph) * p.move : 0);
          p.curY = cy;
          if (!p.scored && p.x + p.w < bird.x - 12) { p.scored = true; passed++; E.score = passed; E.sfx('coin', 1 + (passed % 10 === 0 ? 0.3 : 0)); if (passed % 10 === 0) { E.pop(bird.x, bird.y - 40, `${passed}!`, { color: '#fde68a', size: 28 }); E.flash('#fde68a', 0.15); } }
          const r = 13;
          if (bird.x + r > p.x + 4 && bird.x - r < p.x + p.w - 4 && (bird.y - r < cy - p.gap / 2 || bird.y + r > cy + p.gap / 2)) die();
        }
        pipes = pipes.filter((p) => p.x > -120);
        featherT -= dt;
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#1e1b4b', '#fb923c');
        const sun = g.createRadialGradient(W * 0.7, 480, 10, W * 0.7, 480, 200); sun.addColorStop(0, 'rgba(254,243,199,1)'); sun.addColorStop(0.2, 'rgba(253,186,116,.8)'); sun.addColorStop(1, 'rgba(251,146,60,0)');
        g.fillStyle = sun; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 37) % 240, 1.5, 1.5);
        for (const c of clouds) { g.globalAlpha = 0.35; for (let k = 0; k < 4; k++) D.circle(g, c.x + k * 26 * c.s, c.y + Math.sin(k * 2) * 8 * c.s, 24 * c.s, '#fde2e4'); g.globalAlpha = 1; }
        const cols = ['#4c1d95', '#3b0764', '#1e0a3c'];
        city.forEach((layer, li) => {
          const off = (scroll * (0.1 + li * 0.15)) % (W * 2);
          g.fillStyle = cols[li];
          for (const b of layer) {
            let x = b.x - off; if (x + b.w < 0) x += W * 2;
            const y = GROUND - b.h * (0.6 + li * 0.2);
            g.fillRect(x, y, b.w, GROUND - y);
            if (li === 2) { g.fillStyle = 'rgba(253,224,71,.5)'; for (let wy = y + 10; wy < GROUND - 10; wy += 16) for (let wx = x + 6; wx < x + b.w - 6; wx += 12) if (((wx * 13 + wy * 7) | 0) % 5 < 2) g.fillRect(wx, wy, 4, 6); g.fillStyle = cols[li]; }
          }
        });
        for (const p of pipes) { const cy = p.curY || p.cy; pillar(g, p.x, -10, p.w, cy - p.gap / 2 + 10, true); pillar(g, p.x, cy + p.gap / 2, p.w, GROUND - (cy + p.gap / 2), false); }
        // ground
        g.fillStyle = '#65a30d'; g.fillRect(0, GROUND, W, 16);
        g.fillStyle = '#a16207'; g.fillRect(0, GROUND + 16, W, H - GROUND - 16);
        g.fillStyle = '#84cc16'; for (let x = (groundX % 36) - 36; x < W; x += 36) D.poly(g, [[x, GROUND + 16], [x + 18, GROUND], [x + 36, GROUND + 16]], '#84cc16');
        g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = (groundX % 24) - 24; x < W; x += 24) g.fillRect(x, GROUND + 30, 12, 4);
        // bird
        g.save(); g.translate(bird.x, bird.y); g.rotate(bird.a);
        const sq = 1 + bird.flap * 0.15;
        g.scale(1 / sq, sq);
        D.glow(g, 0, 0, 40, '#fde68a', 0.3);
        D.orb(g, 0, 0, 17, '#fbbf24', 0.5);
        g.fillStyle = '#fff7ed'; g.beginPath(); g.ellipse(3, 6, 10, 7, 0, 0, U.TAU); g.fill();
        const wing = bird.dead ? 0.3 : Math.sin(bird.t * (started ? 22 : 10)) * 0.8 - bird.flap * 0.8;
        g.save(); g.translate(-5, 2); g.rotate(wing); g.fillStyle = '#f59e0b'; g.beginPath(); g.ellipse(-8, 0, 11, 6, 0, 0, U.TAU); g.fill(); g.restore();
        D.circle(g, 7, -6, 6, '#fff'); D.circle(g, 9, -6, 3, bird.dead ? '#ef4444' : '#111');
        if (bird.dead) { D.line(g, 6, -9, 12, -3, '#111', 2); D.line(g, 12, -9, 6, -3, '#111', 2); }
        D.poly(g, [[14, -1], [26, 2], [14, 7]], '#f97316');
        g.restore();
        if (!started) { D.text(g, 'TAP TO FLY', W / 2, 250, { size: 34, color: '#fff', stroke: 'rgba(0,0,0,.3)', lw: 6 }); D.text(g, '▲', W / 2, 300 + Math.sin(t * 5) * 6, { size: 26, color: '#fde68a' }); }
        D.text(g, passed, W / 2, 90, { size: 72, color: '#fff', stroke: 'rgba(0,0,0,.35)', lw: 10 });
      },
    };
  },
});

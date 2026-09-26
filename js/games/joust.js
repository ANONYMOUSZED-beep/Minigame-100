MG.add({
  id: 'joust', name: 'Sky Joust', cat: 'Arcade', color: '#fbbf24', color2: '#ef4444',
  desc: 'Flap-powered aerial jousting over a lava pit. The higher lance wins — then grab the egg before it hatches.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> steer · tap <kbd>Space</kbd> / <kbd>↑</kbd> to flap (or click)', 'Collide while HIGHER than your foe to unseat them', 'Collect the eggs before they hatch into tougher riders', 'The screen wraps sideways — the lava does not forgive'],
  pad: 'LRA', padLabels: { A: 'FLAP' },
  make(E) {
    const W = 960, H = 600, LAVA = 560, GRAV = 620;
    const plats = [
      { x: 0, y: 500, w: 180 }, { x: 780, y: 500, w: 180 }, { x: 330, y: 520, w: 300 },
      { x: 90, y: 330, w: 170 }, { x: 700, y: 330, w: 170 }, { x: 390, y: 380, w: 180 },
      { x: 250, y: 190, w: 150 }, { x: 560, y: 190, w: 150 }, { x: -60, y: 150, w: 130 }, { x: 890, y: 150, w: 130 },
    ];
    const TYPES = [{ name: 'Bounder', col: '#ef4444', pts: 500, skill: 0.4, speed: 150 }, { name: 'Hunter', col: '#94a3b8', pts: 750, skill: 0.65, speed: 190 }, { name: 'Shadow Lord', col: '#3b82f6', pts: 1500, skill: 0.9, speed: 240 }];
    let wave = 0, lives = 3, pl, foes = [], eggs = [], spawnQ = [], spawnT = 0, eggChain = 0, waveT = 0, bubbles = [];
    function mkRider(x, y, isPl, tier = 0) { return { x, y, vx: 0, vy: 0, face: 1, flap: 0, wing: 0, grounded: false, isPl, tier, inv: isPl ? 2 : 0.8, dead: false, think: 0, goalY: y, goalX: x }; }
    function newWave() {
      wave++; E.stat('Wave', wave); waveT = 0;
      const n = Math.min(3 + wave, 10);
      spawnQ = U.range(n).map((i) => Math.min(2, Math.floor((wave - 1) / 3) + (i % 4 === 3 && wave > 1 ? 1 : 0)));
      spawnT = 1; eggChain = 0;
      E.banner('WAVE ' + wave, wave % 5 === 0 ? 'Egg wave — grab them all!' : null);
    }
    pl = mkRider(480, 470, true);
    newWave();
    E.stat('Lives', lives);
    function physics(r, dt) {
      r.vy += GRAV * dt; r.vy = Math.min(r.vy, 520);
      r.vx *= Math.exp(-(r.grounded ? 3 : 0.6) * dt);
      const py = r.y;
      r.x += r.vx * dt; r.y += r.vy * dt;
      if (r.x < -20) r.x += W + 40; if (r.x > W + 20) r.x -= W + 40;
      if (r.y < 20) { r.y = 20; r.vy = Math.abs(r.vy) * 0.5; }
      r.grounded = false;
      for (const p of plats) {
        const inX = r.x > p.x - 8 && r.x < p.x + p.w + 8;
        if (!inX) continue;
        if (r.vy >= 0 && py + 18 <= p.y + 2 && r.y + 18 >= p.y) { r.y = p.y - 18; r.vy = 0; r.grounded = true; }
        else if (r.vy < 0 && py - 18 >= p.y + 14 && r.y - 18 < p.y + 14) { r.y = p.y + 32; r.vy = Math.abs(r.vy) * 0.4; }
      }
    }
    function flap(r) { r.vy = Math.max(r.vy - 250, -330); r.flap = 0.18; if (r.isPl) E.sfx('flap', 1, 0.6); }
    function unseat(f) {
      f.dead = true;
      const t = TYPES[f.tier]; E.score += t.pts; E.pop(f.x, f.y - 30, '+' + t.pts, { color: t.col, size: 20 });
      E.burst(f.x, f.y, { n: 26, colors: [t.col, '#fde68a', '#fff'], speed: 260 }); E.sfx('hit'); E.shake(6); E.freeze(0.05);
      eggs.push({ x: f.x, y: f.y, vx: f.vx * 0.6, vy: -120, tier: Math.min(2, f.tier + 1), t: 0, hatch: U.rand(5, 8), grounded: false });
    }
    function playerDie(cause) {
      if (pl.dead) return;
      pl.dead = true; lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx(cause === 'lava' ? 'splash' : 'hurt'); E.shake(12); E.flash('#ef4444', 0.3); E.vibrate(160);
      E.burst(pl.x, pl.y, { n: 40, colors: cause === 'lava' ? ['#f97316', '#fde68a'] : ['#fbbf24', '#fff'], speed: 300 });
      if (lives <= 0) E.after(1.2, () => E.over({ msg: `Fell on wave ${wave}` }));
      else E.after(1.5, () => { Object.assign(pl, mkRider(480, 470, true)); });
    }
    function drawRider(g, r, col, riderCol) {
      if (r.dead) return;
      const blink = r.inv > 0 && Math.sin(E.t * 30) > 0;
      if (blink) g.globalAlpha = 0.5;
      g.save(); g.translate(r.x, r.y); g.scale(r.face, 1);
      // bird body
      D.shadow(g, 0, 18, 18, 4, r.grounded ? 0.3 : 0);
      g.fillStyle = col; g.beginPath(); g.ellipse(-2, 4, 17, 10, -0.1, 0, U.TAU); g.fill();
      g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(18, -8, 16, -18); g.lineTo(20, -20); g.quadraticCurveTo(24, -8, 14, 4); g.fill();
      D.circle(g, 18, -19, 5, col);
      D.poly(g, [[22, -20], [30, -17], [22, -16]], '#fbbf24');
      D.circle(g, 19, -21, 1.6, '#111');
      // legs
      const legT = r.grounded ? Math.sin(E.t * 18 * Math.min(1, Math.abs(r.vx) / 60)) * 5 : 3;
      D.line(g, -4, 12, -4 + legT, 20, '#fbbf24', 2.5); D.line(g, 2, 12, 2 - legT, 20, '#fbbf24', 2.5);
      // wing
      const wa = r.flap > 0 ? -1.1 : Math.sin(r.wing) * 0.5 + (r.grounded ? 0.5 : 0.1);
      g.save(); g.translate(-4, 0); g.rotate(wa);
      g.fillStyle = U.shade(col, -0.25); g.beginPath(); g.ellipse(-12, 0, 16, 6, 0, 0, U.TAU); g.fill(); g.restore();
      // rider + lance
      D.fillRR(g, -6, -18, 11, 14, 3, riderCol);
      D.circle(g, 0, -23, 6, '#e5e7eb'); g.fillStyle = '#64748b'; g.fillRect(-1, -27, 9, 3);
      D.line(g, -14, -12, 30, -16, '#e2e8f0', 2.5); D.circle(g, 30, -16, 2, '#fff');
      g.restore();
      g.globalAlpha = 1;
    }
    return {
      update(dt) {
        waveT += dt;
        // player
        if (!pl.dead) {
          const ax = E.axis().x;
          if (ax) { pl.vx += ax * (pl.grounded ? 900 : 420) * dt; pl.face = ax; }
          if (E.ptr.down) { const dx = E.ptr.x - pl.x; if (Math.abs(dx) > 20) { pl.vx += Math.sign(dx) * 380 * dt; pl.face = Math.sign(dx); } }
          pl.vx = U.clamp(pl.vx, -280, 280);
          if (E.hit('A', 'U') || E.ptr.hit) flap(pl);
          pl.inv -= dt; pl.flap -= dt; pl.wing += dt * (pl.grounded ? 4 : 12);
          physics(pl, dt);
          if (pl.y > LAVA - 4) playerDie('lava');
        }
        // spawn
        spawnT -= dt;
        if (spawnQ.length && spawnT <= 0) {
          const p = U.pick([plats[3], plats[4], plats[6], plats[7], plats[2]]);
          const f = mkRider(p.x + p.w / 2, p.y - 18, false, spawnQ.shift()); f.face = U.chance(0.5) ? 1 : -1;
          foes.push(f); spawnT = 1.4; E.sfx('charge', 1.2, 0.4);
          E.ring(f.x, f.y, { color: TYPES[f.tier].col, r: 50 });
        }
        // foes AI
        for (const f of foes) {
          if (f.dead) continue;
          const T = TYPES[f.tier];
          f.think -= dt; f.inv -= dt; f.flap -= dt; f.wing += dt * 12;
          if (f.think <= 0) {
            f.think = U.rand(0.4, 1.2) * (1.2 - T.skill);
            const aggressive = Math.random() < T.skill && !pl.dead;
            f.goalY = aggressive ? pl.y - U.rand(20, 60) : U.rand(80, 460);
            f.goalX = aggressive ? pl.x : f.x + U.pick([-1, 1]) * 300;
          }
          let dx = f.goalX - f.x; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
          f.face = dx > 0 ? 1 : -1;
          f.vx = U.approach(f.vx, f.face * T.speed, 300 * dt);
          if ((f.y > f.goalY && f.vy > -60 && Math.random() < dt * 9) || f.y > LAVA - 90 && f.vy > -100) flap(f);
          physics(f, dt);
          if (f.y > LAVA - 4) { f.dead = true; E.burst(f.x, LAVA, { n: 20, colors: ['#f97316', '#fde68a'], speed: 200 }); E.sfx('splash', 1.2, 0.5); }
          // joust
          if (!pl.dead && pl.inv <= 0 && f.inv <= 0) {
            let ddx = f.x - pl.x; if (ddx > W / 2) ddx -= W; if (ddx < -W / 2) ddx += W;
            if (Math.abs(ddx) < 36 && Math.abs(f.y - pl.y) < 34) {
              const diff = (f.y - pl.y);
              if (Math.abs(diff) < 5) { const s = Math.sign(ddx) || 1; pl.vx = -s * 260; f.vx = s * 260; pl.vy -= 80; f.vy -= 80; E.sfx('bounce', 0.6); E.burst((pl.x + f.x) / 2, pl.y - 15, { n: 10, color: '#fff', speed: 160 }); f.inv = 0.3; pl.inv = 0.3; }
              else if (diff > 0) unseat(f);
              else playerDie('joust');
            }
          }
        }
        foes = foes.filter((f) => !f.dead);
        // eggs
        for (let i = eggs.length - 1; i >= 0; i--) {
          const e = eggs[i]; e.t += dt;
          e.vy += GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.exp(-1.5 * dt);
          if (e.x < -10) e.x += W + 20; if (e.x > W + 10) e.x -= W + 20;
          for (const p of plats) if (e.x > p.x && e.x < p.x + p.w && e.vy > 0 && e.y + 8 >= p.y && e.y + 8 - e.vy * dt <= p.y + 4) { e.y = p.y - 8; e.vy = -e.vy * 0.4; if (Math.abs(e.vy) < 30) e.vy = 0; e.vx *= 0.7; }
          if (e.y > LAVA) { eggs.splice(i, 1); continue; }
          if (!pl.dead && U.dist(e.x, e.y, pl.x, pl.y + 6) < 28) {
            eggChain++; const pts = 250 * Math.min(eggChain, 4); E.score += pts;
            E.pop(e.x, e.y - 20, '+' + pts, { color: '#fde68a' }); E.sfx('coin', 1 + eggChain * 0.1); E.burst(e.x, e.y, { n: 14, colors: ['#fff', '#fde68a'] });
            eggs.splice(i, 1); continue;
          }
          if (e.t > e.hatch) {
            eggs.splice(i, 1);
            const f = mkRider(e.x, e.y - 20, false, e.tier); f.vy = -200; foes.push(f); E.sfx('charge', 0.8, 0.5);
            E.pop(e.x, e.y - 30, 'HATCHED!', { color: TYPES[e.tier].col, size: 16 });
          }
        }
        if (!spawnQ.length && !foes.length && !eggs.length) { E.score += 500 + wave * 100; E.sfx('win'); newWave(); }
        // lava bubbles
        if (Math.random() < dt * 4) bubbles.push({ x: U.rand(W), r: 0, max: U.rand(4, 10) });
        for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.r += dt * 10; if (b.r > b.max) { bubbles.splice(i, 1); E.burst(b.x, LAVA + 4, { n: 3, color: '#fdba74', speed: 60, angle: -Math.PI / 2, spread: 1, grav: 200, size: 2 }); } }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#0b0718', '#2a0d0d');
        g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 50; i++) g.fillRect((i * 173) % W, (i * 71) % 300, 1.5, 1.5);
        // distant rock silhouettes
        g.fillStyle = '#1a0f22'; g.beginPath(); g.moveTo(0, LAVA);
        for (let x = 0; x <= W; x += 40) g.lineTo(x, 420 - Math.abs(Math.sin(x * 0.013)) * 120 - Math.sin(x * 0.05) * 20);
        g.lineTo(W, LAVA); g.fill();
        // lava
        const lg = g.createLinearGradient(0, LAVA, 0, H); lg.addColorStop(0, '#fde68a'); lg.addColorStop(0.15, '#f97316'); lg.addColorStop(1, '#7f1d1d');
        g.fillStyle = lg; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) g.lineTo(x, LAVA + Math.sin(x * 0.05 + t * 3) * 3);
        g.lineTo(W, H); g.fill();
        D.glow(g, W / 2, LAVA + 20, 520, '#f97316', 0.25);
        for (const b of bubbles) D.circle(g, b.x, LAVA + 2, b.r, null, '#fde68a', 1.5);
        // platforms
        for (const p of plats) {
          D.glow(g, p.x + p.w / 2, p.y + 6, p.w * 0.6, '#fbbf24', 0.08);
          const gr = g.createLinearGradient(0, p.y, 0, p.y + 22); gr.addColorStop(0, '#78716c'); gr.addColorStop(1, '#292524');
          g.fillStyle = gr; g.beginPath(); g.moveTo(p.x, p.y);
          g.lineTo(p.x + p.w, p.y); g.lineTo(p.x + p.w - 10, p.y + 14);
          for (let x = p.x + p.w - 10; x > p.x + 10; x -= 16) g.lineTo(x - 8, p.y + 14 + ((x * 7) % 11));
          g.lineTo(p.x + 10, p.y + 14); g.closePath(); g.fill();
          g.fillStyle = '#fbbf24'; g.fillRect(p.x, p.y - 2, p.w, 3);
        }
        for (const e of eggs) {
          const wob = e.t > e.hatch - 1.5 ? Math.sin(t * 30) * 0.3 : 0;
          g.save(); g.translate(e.x, e.y); g.rotate(wob);
          D.orb(g, 0, 0, 8, e.hatch - e.t < 1.5 ? '#fca5a5' : '#f1f5f9'); g.restore();
        }
        for (const f of foes) drawRider(g, f, '#1f2937', TYPES[f.tier].col);
        drawRider(g, pl, '#facc15', '#2563eb');
        for (let i = 0; i < lives; i++) D.circle(g, 26 + i * 22, 28, 7, '#facc15');
        D.vignette(g, W, H, 0.45);
      },
    };
  },
});

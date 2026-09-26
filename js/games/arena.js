MG.add({
  id: 'arena', name: 'Neon Arena', cat: 'Action', color: '#22d3ee', color2: '#e879f9',
  desc: 'A twin-stick shooter on a living, warping grid. Swarms, splitters, black holes — and a multiplier to chase.',
  how: ['Move with <kbd>WASD</kbd> · aim + fire with the mouse (hold) or <kbd>←↑↓→</kbd>', 'Touch: drag to steer — your guns auto-aim', '<kbd>Space</kbd> / right-click drops a bomb (3 per life)', 'Collect gold geoms to grow your multiplier'],
  pad: 'LRUDA', padLabels: { A: 'BOMB' },
  make(E) {
    const W = 960, H = 600, GX = 48, GY = 30;
    // warp grid
    const pts = [];
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) { const x = (i / GX) * W, y = (j / GY) * H; pts.push({ x, y, rx: x, ry: y, vx: 0, vy: 0 }); }
    const P = (i, j) => pts[j * (GX + 1) + i];
    function impulse(x, y, force, radius) {
      for (const p of pts) { const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy); if (d < radius && d > 1) { const k = (1 - d / radius) * force; p.vx += (dx / d) * k; p.vy += (dy / d) * k; } }
    }
    const pl = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: 0, inv: 2, cd: 0, dead: 0 };
    let bullets = [], foes = [], geoms = [], spawns = [], lives = 3, bombs = 3, mult = 1, t0 = 0, spawnT = 1.5, heat = 0, autoAim = false, killStreak = 0;
    E.stat('Lives', lives); E.stat('Bombs', bombs); E.stat('×', mult);
    const DEF = {
      wander: { col: '#c084fc', r: 14, sp: 80, pts: 50, hp: 1 },
      grunt: { col: '#22d3ee', r: 13, sp: 125, pts: 100, hp: 1 },
      weaver: { col: '#4ade80', r: 13, sp: 150, pts: 100, hp: 1 },
      splitter: { col: '#f472b6', r: 15, sp: 110, pts: 150, hp: 1 },
      mini: { col: '#f9a8d4', r: 7, sp: 230, pts: 50, hp: 1 },
      dart: { col: '#fb923c', r: 11, sp: 260, pts: 50, hp: 1 },
      hole: { col: '#ef4444', r: 22, sp: 0, pts: 750, hp: 12 },
    };
    function queueSpawn(type, x, y) { spawns.push({ type, x, y, t: 0.9 }); }
    function spawnWave() {
      const lvl = Math.min(12, 1 + Math.floor(t0 / 18));
      const r = Math.random();
      const corner = () => [U.pick([60, W - 60]), U.pick([60, H - 60])];
      const away = () => { let x, y; do { x = U.rand(40, W - 40); y = U.rand(40, H - 40); } while (U.dist(x, y, pl.x, pl.y) < 220); return [x, y]; };
      if (r < 0.25) { const [x, y] = corner(); for (let i = 0; i < 3 + lvl; i++) queueSpawn(U.pick(lvl > 2 ? ['grunt', 'weaver'] : ['grunt']), x + U.rand(-40, 40), y + U.rand(-40, 40)); }
      else if (r < 0.45) for (let i = 0; i < 4 + lvl; i++) queueSpawn('wander', ...away());
      else if (r < 0.6 && lvl > 1) for (let i = 0; i < 2 + (lvl >> 1); i++) queueSpawn('splitter', ...away());
      else if (r < 0.75 && lvl > 2) { const side = U.chance(0.5); for (let i = 0; i < 6 + lvl; i++) queueSpawn('dart', side ? 30 : 30 + (i * (W - 60)) / (6 + lvl), side ? 30 + (i * (H - 60)) / (6 + lvl) : 30); }
      else if (r < 0.82 && lvl > 3 && foes.filter((f) => f.type === 'hole').length < 2) queueSpawn('hole', ...away());
      else for (let i = 0; i < 2 + lvl; i++) queueSpawn(U.pick(['grunt', 'wander', 'weaver']), ...away());
    }
    function addFoe(type, x, y) { const d = DEF[type]; foes.push({ type, x, y, vx: 0, vy: 0, a: U.rand(6), hp: d.hp, t: 0, r: d.r, dir: U.rand(6) }); }
    function kill(f, byBomb) {
      f.dead = true; const d = DEF[f.type];
      E.score += d.pts * mult; killStreak++;
      E.burst(f.x, f.y, { n: f.type === 'hole' ? 80 : 22, colors: [d.col, '#fff'], speed: f.type === 'hole' ? 500 : 320, shape: 'spark', life: 0.8 });
      impulse(f.x, f.y, f.type === 'hole' ? 900 : 260, f.type === 'hole' ? 260 : 120);
      E.sfx('explode', 1.4 + Math.random() * 0.4, f.type === 'hole' ? 1 : 0.3);
      if (f.type === 'hole') { E.shake(14); E.flash('#ef4444', 0.25); }
      if (f.type === 'splitter') for (let i = 0; i < 3; i++) { addFoe('mini', f.x, f.y); const m = foes[foes.length - 1]; const a = (i / 3) * U.TAU + U.rand(-0.3, 0.3); m.vx = Math.cos(a) * 200; m.vy = Math.sin(a) * 200; }
      if (!byBomb) { const n = f.type === 'hole' ? 10 : U.ri(1, 2); for (let i = 0; i < n; i++) geoms.push({ x: f.x, y: f.y, vx: U.rand(-80, 80), vy: U.rand(-80, 80), t: 8 }); }
    }
    function bomb() {
      if (bombs <= 0 || pl.dead) return;
      bombs--; E.stat('Bombs', bombs);
      E.sfx('boom'); E.flash('#fff', 0.7); E.shake(18); E.freeze(0.06);
      E.ring(pl.x, pl.y, { color: '#fff', r: 900, life: 0.8, lw: 14 });
      impulse(pl.x, pl.y, 900, 700);
      foes.forEach((f) => kill(f, true)); spawns = [];
    }
    function hitPlayer() {
      if (pl.inv > 0 || pl.dead) return;
      lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('boom', 0.8); E.shake(22); E.flash('#e879f9', 0.4); E.freeze(0.1); E.vibrate(220);
      E.burst(pl.x, pl.y, { n: 90, colors: ['#fff', '#22d3ee', '#e879f9'], speed: 500, shape: 'spark', life: 1.4 });
      impulse(pl.x, pl.y, 900, 450);
      foes = []; spawns = []; pl.dead = 1.8; mult = 1; E.stat('×', mult);
      if (lives <= 0) E.after(1.4, () => E.over({ msg: `Survived ${Math.floor(t0)}s` }));
    }
    return {
      manualFx: false,
      update(dt) {
        t0 += dt;
        // grid physics
        for (let j = 1; j < GY; j++) for (let i = 1; i < GX; i++) {
          const p = P(i, j), n = [P(i - 1, j), P(i + 1, j), P(i, j - 1), P(i, j + 1)];
          const ax = (p.rx - p.x) * 30 + ((n[0].x + n[1].x + n[2].x + n[3].x) / 4 - p.x) * 60;
          const ay = (p.ry - p.y) * 30 + ((n[0].y + n[1].y + n[2].y + n[3].y) / 4 - p.y) * 60;
          p.vx = (p.vx + ax * dt) * Math.exp(-4 * dt); p.vy = (p.vy + ay * dt) * Math.exp(-4 * dt);
        }
        for (const p of pts) {
          const v = Math.hypot(p.vx, p.vy); if (v > 700) { p.vx *= 700 / v; p.vy *= 700 / v; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          const ox = p.x - p.rx, oy = p.y - p.ry, o = Math.hypot(ox, oy); if (o > 70) { p.x = p.rx + (ox / o) * 70; p.y = p.ry + (oy / o) * 70; }
        }
        if (pl.dead > 0) {
          pl.dead -= dt;
          if (pl.dead <= 0 && lives > 0) { pl.dead = 0; pl.x = W / 2; pl.y = H / 2; pl.inv = 2.5; bombs = Math.max(bombs, 3); E.stat('Bombs', bombs); }
          return;
        }
        // input
        const ax = (E.down('KeyD') ? 1 : 0) - (E.down('KeyA') ? 1 : 0), ay = (E.down('KeyS') ? 1 : 0) - (E.down('KeyW') ? 1 : 0);
        let mx = ax, my = ay;
        if (E.ptr.type === 'touch' && E.ptr.down) { autoAim = true; const dx = E.ptr.x - pl.x, dy = E.ptr.y - pl.y, d = Math.hypot(dx, dy); if (d > 20) { mx = dx / d; my = dy / d; } }
        else if (E.ptr.type === 'mouse') autoAim = false;
        // pad arrows move when on touch pad
        if (E.ptr.type === 'touch' || autoAim) { const a = E.axis(); if (a.x || a.y) { mx = a.x; my = a.y; } }
        const ml = Math.hypot(mx, my) || 1;
        pl.vx = U.damp(pl.vx, (mx / ml) * 340 * (mx || my ? 1 : 0), 12, dt); pl.vy = U.damp(pl.vy, (my / ml) * 340 * (mx || my ? 1 : 0), 12, dt);
        pl.x = U.clamp(pl.x + pl.vx * dt, 14, W - 14); pl.y = U.clamp(pl.y + pl.vy * dt, 14, H - 14);
        if (mx || my) { pl.a = Math.atan2(pl.vy, pl.vx); if (Math.random() < 0.6) E.burst(pl.x - Math.cos(pl.a) * 12, pl.y - Math.sin(pl.a) * 12, { n: 1, colors: ['#fb923c', '#fde68a'], speed: 60, life: 0.3, size: 2.5 }); }
        pl.inv -= dt;
        // aim
        let aim = null;
        const kx = (E.down('ArrowRight') ? 1 : 0) - (E.down('ArrowLeft') ? 1 : 0), ky = (E.down('ArrowDown') ? 1 : 0) - (E.down('ArrowUp') ? 1 : 0);
        if (!autoAim && (kx || ky)) aim = Math.atan2(ky, kx);
        else if (!autoAim && E.ptr.down && E.ptr.type !== 'touch') aim = U.ang(pl.x, pl.y, E.ptr.x, E.ptr.y);
        else if (autoAim && foes.length) { let best = null, bd = 1e9; for (const f of foes) { const d = U.dist2(f.x, f.y, pl.x, pl.y); if (d < bd) { bd = d; best = f; } } if (best && bd < 420 * 420) aim = U.ang(pl.x, pl.y, best.x, best.y); }
        if (E.hit('Space') || E.ptr.rhit) bomb();
        pl.cd -= dt;
        if (aim !== null && pl.cd <= 0) {
          const streams = t0 > 90 ? 3 : t0 > 35 ? 2 : 1;
          pl.cd = 0.085;
          for (let s = 0; s < streams; s++) {
            const off = (s - (streams - 1) / 2) * 0.08;
            const a = aim + off + U.rand(-0.02, 0.02);
            bullets.push({ x: pl.x + Math.cos(a) * 14, y: pl.y + Math.sin(a) * 14, vx: Math.cos(a) * 880, vy: Math.sin(a) * 880 });
          }
          if (Math.random() < 0.5) E.sfx('shoot', 1.6, 0.3);
        }
        // spawns
        spawnT -= dt;
        if (spawnT <= 0) { spawnWave(); spawnT = Math.max(1.1, 3.6 - t0 * 0.02) * U.rand(0.7, 1.2); }
        for (let i = spawns.length - 1; i >= 0; i--) { const s = spawns[i]; s.t -= dt; if (s.t <= 0) { addFoe(s.type, s.x, s.y); spawns.splice(i, 1); if (Math.random() < 0.3) E.sfx('blip', 0.7, 0.2); } }
        // foes
        for (const f of foes) {
          const d = DEF[f.type]; f.t += dt;
          const dx = pl.x - f.x, dy = pl.y - f.y, dist = Math.hypot(dx, dy) || 1;
          if (f.type === 'wander') { f.dir += U.rand(-3, 3) * dt; f.vx = Math.cos(f.dir) * d.sp; f.vy = Math.sin(f.dir) * d.sp; f.a += dt * 3; }
          else if (f.type === 'grunt' || f.type === 'mini' || f.type === 'splitter') { const sp = d.sp * (f.type === 'grunt' ? 0.8 + 0.3 * Math.sin(f.t * 4) : 1); f.vx = U.damp(f.vx, (dx / dist) * sp, f.type === 'mini' ? 3 : 5, dt); f.vy = U.damp(f.vy, (dy / dist) * sp, f.type === 'mini' ? 3 : 5, dt); f.a += dt * 2; }
          else if (f.type === 'weaver') {
            let evx = 0, evy = 0;
            for (const b of bullets) { const bx = f.x - b.x, by = f.y - b.y, bd = Math.hypot(bx, by); if (bd < 110) { evx += (bx / bd) * 400 * (1 - bd / 110); evy += (by / bd) * 400 * (1 - bd / 110); } }
            f.vx = U.damp(f.vx, (dx / dist) * d.sp + evx, 6, dt); f.vy = U.damp(f.vy, (dy / dist) * d.sp + evy, 6, dt); f.a += dt;
          } else if (f.type === 'dart') { if (!f.vx && !f.vy) { const a = f.x < 40 ? 0 : Math.PI / 2; f.vx = Math.cos(a) * d.sp; f.vy = Math.sin(a) * d.sp; } f.a = Math.atan2(f.vy, f.vx); }
          else if (f.type === 'hole') {
            f.a += dt;
            for (const o of foes) if (o !== f && o.type !== 'hole') { const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy); if (od < 260 && od > 5) { o.vx += (ox / od) * 900 * dt * (1 - od / 260); o.vy += (oy / od) * 900 * dt * (1 - od / 260); } if (od < f.r) { o.dead = true; f.hp = Math.min(f.hp + 1, 20); f.r = Math.min(40, f.r + 1); } }
            if (dist < 280) { pl.vx -= (dx / dist) * 700 * dt * (1 - dist / 280); pl.vy -= (dy / dist) * 700 * dt * (1 - dist / 280); }
            impulse(f.x, f.y, -30 * dt * 60, 90);
          }
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.x < f.r || f.x > W - f.r) { f.vx *= -1; f.x = U.clamp(f.x, f.r, W - f.r); f.dir = Math.PI - f.dir; }
          if (f.y < f.r || f.y > H - f.r) { f.vy *= -1; f.y = U.clamp(f.y, f.r, H - f.r); f.dir = -f.dir; }
          if (!f.dead && dist < f.r + 9) hitPlayer();
        }
        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt;
          let hit = b.x < 0 || b.y < 0 || b.x > W || b.y > H;
          if (hit) { E.burst(U.clamp(b.x, 0, W), U.clamp(b.y, 0, H), { n: 3, color: '#fde68a', speed: 120, size: 2, life: 0.3 }); impulse(b.x, b.y, 60, 50); }
          else for (const f of foes) if (!f.dead && U.dist2(b.x, b.y, f.x, f.y) < (f.r + 4) * (f.r + 4)) {
            hit = true; f.hp--;
            if (f.hp <= 0) kill(f); else { E.burst(b.x, b.y, { n: 5, color: DEF[f.type].col, speed: 150, size: 2 }); E.sfx('tick', 0.7, 0.3); f.r = Math.max(14, f.r - 0.6); }
            break;
          }
          if (hit) bullets.splice(i, 1);
        }
        foes = foes.filter((f) => !f.dead);
        // geoms
        for (let i = geoms.length - 1; i >= 0; i--) {
          const gm = geoms[i]; gm.t -= dt;
          const dx = pl.x - gm.x, dy = pl.y - gm.y, d = Math.hypot(dx, dy);
          if (d < 90) { gm.vx += (dx / d) * 1400 * dt; gm.vy += (dy / d) * 1400 * dt; }
          gm.vx *= Math.exp(-2 * dt); gm.vy *= Math.exp(-2 * dt); gm.x += gm.vx * dt; gm.y += gm.vy * dt;
          if (d < 16) { mult++; E.stat('×', mult); geoms.splice(i, 1); E.sfx('coin', 1.5 + Math.min(mult, 40) * 0.01, 0.25); continue; }
          if (gm.t <= 0) geoms.splice(i, 1);
        }
        heat = U.damp(heat, 0, 2, dt);
        void killStreak;
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#03020a'; g.fillRect(0, 0, W, H);
        // grid
        g.lineWidth = 1;
        for (let j = 0; j <= GY; j++) { g.beginPath(); for (let i = 0; i <= GX; i++) { const p = P(i, j); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.strokeStyle = j % 5 === 0 ? 'rgba(96,165,250,.28)' : 'rgba(96,165,250,.12)'; g.stroke(); }
        for (let i = 0; i <= GX; i++) { g.beginPath(); for (let j = 0; j <= GY; j++) { const p = P(i, j); j ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.strokeStyle = i % 5 === 0 ? 'rgba(96,165,250,.28)' : 'rgba(96,165,250,.12)'; g.stroke(); }
        g.strokeStyle = 'rgba(34,211,238,.6)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
        // spawn markers
        for (const s of spawns) { const k = 1 - s.t / 0.9; g.globalAlpha = 0.3 + k * 0.7; D.circle(g, s.x, s.y, 24 * (1 - k) + 6, null, DEF[s.type].col, 2); g.globalAlpha = 1; }
        for (const gm of geoms) { g.globalAlpha = Math.min(1, gm.t); D.glow(g, gm.x, gm.y, 12, '#facc15', 0.8); D.poly(g, [[gm.x, gm.y - 5], [gm.x + 4, gm.y], [gm.x, gm.y + 5], [gm.x - 4, gm.y]], '#fde047'); g.globalAlpha = 1; }
        for (const f of foes) {
          const d = DEF[f.type], c = d.col;
          D.glow(g, f.x, f.y, f.r * 2.6, c, 0.45);
          g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.lineWidth = 2.5; g.strokeStyle = c; g.lineJoin = 'round';
          const r = f.r;
          if (f.type === 'wander') { for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(r, -r * 0.2); g.lineTo(r * 0.3, -r); g.closePath(); g.stroke(); } }
          else if (f.type === 'grunt') { const s = 1 + 0.15 * Math.sin(f.t * 8); g.scale(s, 1 / s); g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); g.stroke(); }
          else if (f.type === 'weaver') { g.strokeRect(-r, -r, r * 2, r * 2); g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r); g.stroke(); }
          else if (f.type === 'splitter' || f.type === 'mini') { g.strokeRect(-r, -r, r * 2, r * 2); g.rotate(Math.PI / 4); g.strokeRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2); }
          else if (f.type === 'dart') { g.beginPath(); g.moveTo(r, 0); g.lineTo(-r, -r * 0.7); g.lineTo(-r * 0.4, 0); g.lineTo(-r, r * 0.7); g.closePath(); g.stroke(); }
          else if (f.type === 'hole') { g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, r + 4 + k * 5 + Math.sin(t * 6 + k) * 2, 0, U.TAU); g.strokeStyle = U.rgba(c, 0.6 - k * 0.18); g.stroke(); } }
          g.restore();
        }
        g.lineCap = 'round';
        for (const b of bullets) { D.line(g, b.x, b.y, b.x - b.vx * 0.018, b.y - b.vy * 0.018, '#fde68a', 3); }
        if (!pl.dead && (pl.inv <= 0 || Math.sin(t * 30) > 0)) {
          D.glow(g, pl.x, pl.y, 44, '#e0f2fe', 0.5);
          g.save(); g.translate(pl.x, pl.y); g.rotate(pl.a);
          g.strokeStyle = '#f0f9ff'; g.lineWidth = 2.5; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(14, 0); g.lineTo(-4, -12); g.lineTo(-12, -8); g.lineTo(-3, 0); g.lineTo(-12, 8); g.lineTo(-4, 12); g.closePath(); g.stroke();
          g.restore();
        }
        D.text(g, `×${mult}`, W - 16, 24, { size: 22, align: 'right', color: '#facc15' });
        for (let i = 0; i < bombs; i++) D.circle(g, 22 + i * 20, H - 20, 6, null, '#e879f9', 2);
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

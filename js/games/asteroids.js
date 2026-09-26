MG.add({
  id: 'asteroids', name: 'Rock Storm', cat: 'Arcade', color: '#7dd3fc', color2: '#c084fc',
  desc: 'Vector-glow Asteroids. Drift, split rocks, dodge saucers, and hyperspace out of trouble.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> rotate · <kbd>↑</kbd> thrust', '<kbd>Space</kbd> fire (hold for auto) · <kbd>X</kbd> hyperspace', 'Big rocks split into smaller, faster ones', 'Extra life every 10,000 points'],
  pad: 'LRUAB', padLabels: { A: 'FIRE', B: 'HYP' },
  make(E) {
    const W = 960, H = 600;
    const ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, r: 12, alive: true, inv: 2.5, respawn: 0, hyp: 0 };
    let rocks = [], bullets = [], ufoBullets = [], debris = [], ufo = null, ufoT = 18, wave = 0, lives = 3, cd = 0, nextLife = 10000, waveT = 0, thrusting = false, beat = 0, beatT = 1;
    const stars = D.makeStars(140, W, H, 21);
    const SZ = { 3: 50, 2: 27, 1: 14 };
    function mkRock(x, y, size, speed) {
      const n = U.ri(9, 13), pts = [];
      for (let i = 0; i < n; i++) pts.push(U.rand(0.7, 1.08));
      const a = U.rand(U.TAU), sp = (speed || U.rand(40, 90)) * (4 - size) * 0.62;
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, r: SZ[size], pts, rot: U.rand(U.TAU), vr: U.rand(-1, 1), hue: U.ri(190, 280) };
    }
    function spawnWave() {
      wave++; E.stat('Wave', wave);
      const n = Math.min(3 + wave, 11);
      for (let i = 0; i < n; i++) {
        let x, y; do { x = U.rand(W); y = U.rand(H); } while (U.dist(x, y, ship.x, ship.y) < 220);
        rocks.push(mkRock(x, y, 3, 30 + wave * 6));
      }
      if (wave > 1) E.banner('WAVE ' + wave);
      beatT = 1;
    }
    spawnWave();
    E.stat('Lives', lives);
    const wrap = (o) => { o.x = U.wrap(o.x, 0, W); o.y = U.wrap(o.y, 0, H); };
    function explodeShip() {
      ship.alive = false; ship.respawn = 2.2; lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('explode'); E.shake(16); E.flash('#fff', 0.3); E.freeze(0.06); E.vibrate(150);
      const pts = shipPts();
      for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % 3];
        debris.push({ x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2, len: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), a: Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), vx: U.rand(-60, 60) + ship.vx * 0.3, vy: U.rand(-60, 60) + ship.vy * 0.3, vr: U.rand(-4, 4), life: 2 });
      }
      E.burst(ship.x, ship.y, { n: 40, colors: ['#7dd3fc', '#fff', '#c084fc'], speed: 300, life: 1 });
      if (lives <= 0) E.after(1.4, () => E.over({ msg: `Reached wave ${wave}` }));
    }
    function shipPts() {
      const c = Math.cos(ship.a), s = Math.sin(ship.a);
      return [[18, 0], [-12, -11], [-12, 11]].map(([x, y]) => [ship.x + x * c - y * s, ship.y + x * s + y * c]);
    }
    function splitRock(i, bx, by) {
      const r = rocks[i]; rocks.splice(i, 1);
      const pts = { 3: 20, 2: 50, 1: 100 }[r.size];
      E.score += pts;
      if (E.score >= nextLife) { nextLife += 10000; lives++; E.stat('Lives', lives); E.sfx('power'); E.pop(ship.x, ship.y - 30, '1UP', { color: '#4ade80' }); }
      const col = U.hsl(r.hue, 90, 70);
      E.burst(r.x, r.y, { n: 8 + r.size * 8, colors: [col, '#fff'], speed: 120 + r.size * 60, shape: 'spark', life: 0.7 });
      E.ring(r.x, r.y, { color: col, r: r.r * 1.6, lw: 3 });
      E.sfx('explode', 1.6 - r.size * 0.25, 0.25 + r.size * 0.15);
      E.shake(r.size * 2.5);
      if (r.size > 1) for (let k = 0; k < 2; k++) { const n = mkRock(r.x, r.y, r.size - 1, 50 + wave * 6); n.hue = r.hue; rocks.push(n); }
    }
    function drawPoly(g, x, y, pts, r, rot, stroke, fill) {
      g.beginPath();
      pts.forEach((k, i) => { const a = rot + (i / pts.length) * U.TAU; const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      g.strokeStyle = U.rgba(stroke, 0.25); g.lineWidth = 7; g.stroke();
      g.strokeStyle = stroke; g.lineWidth = 2; g.stroke();
    }
    const each = (o, r, fn) => { // draw with wrap ghosts
      fn(o.x, o.y);
      const gx = o.x < r ? W : o.x > W - r ? -W : 0, gy = o.y < r ? H : o.y > H - r ? -H : 0;
      if (gx) fn(o.x + gx, o.y); if (gy) fn(o.x, o.y + gy); if (gx && gy) fn(o.x + gx, o.y + gy);
    };
    return {
      update(dt) {
        cd -= dt; ship.hyp -= dt; thrusting = false;
        if (ship.alive) {
          const ax = E.axis().x;
          ship.a += ax * 4.6 * dt;
          if (E.down('U')) {
            thrusting = true;
            ship.vx += Math.cos(ship.a) * 330 * dt; ship.vy += Math.sin(ship.a) * 330 * dt;
            if (Math.random() < 0.8) E.burst(ship.x - Math.cos(ship.a) * 12, ship.y - Math.sin(ship.a) * 12, { n: 1, colors: ['#fbbf24', '#f97316', '#fde68a'], speed: 160, angle: ship.a + Math.PI, spread: 0.5, life: 0.35, size: 3, vx: ship.vx, vy: ship.vy, drag: 1 });
            if (Math.random() < 0.3) E.sfx('engine', 1.5, 1.2);
          }
          const sp = Math.hypot(ship.vx, ship.vy);
          if (sp > 440) { ship.vx *= 440 / sp; ship.vy *= 440 / sp; }
          ship.vx *= Math.exp(-0.45 * dt); ship.vy *= Math.exp(-0.45 * dt);
          ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
          ship.inv -= dt;
          if (E.down('A') && cd <= 0 && bullets.length < 7) {
            cd = 0.15;
            const nx = Math.cos(ship.a), ny = Math.sin(ship.a);
            bullets.push({ x: ship.x + nx * 18, y: ship.y + ny * 18, vx: nx * 640 + ship.vx, vy: ny * 640 + ship.vy, life: 0.85 });
            E.sfx('shoot', 1.2, 0.8);
            ship.vx -= nx * 6; ship.vy -= ny * 6;
          }
          if (E.hit('B') && ship.hyp <= 0) {
            ship.hyp = 2.5;
            E.burst(ship.x, ship.y, { n: 24, color: '#c084fc', speed: 200 }); E.sfx('whoosh', 1.4);
            ship.x = U.rand(60, W - 60); ship.y = U.rand(60, H - 60); ship.vx = ship.vy = 0; ship.inv = Math.max(ship.inv, 0.6);
            E.ring(ship.x, ship.y, { color: '#c084fc', r: 60 });
          }
        } else {
          ship.respawn -= dt;
          if (ship.respawn <= 0 && lives > 0 && !rocks.some((r) => U.dist(r.x, r.y, W / 2, H / 2) < r.r + 90)) {
            Object.assign(ship, { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, inv: 2.5 });
            E.ring(ship.x, ship.y, { color: '#7dd3fc', r: 70 });
          }
        }
        for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); }
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt;
          let hit = false;
          for (let j = rocks.length - 1; j >= 0; j--) if (U.dist2(b.x, b.y, rocks[j].x, rocks[j].y) < rocks[j].r * rocks[j].r * 0.85) { splitRock(j, b.x, b.y); hit = true; break; }
          if (!hit && ufo && U.dist(b.x, b.y, ufo.x, ufo.y) < ufo.r + 3) { hit = true; killUfo(); }
          if (hit || b.life <= 0) bullets.splice(i, 1);
        }
        // UFO
        ufoT -= dt;
        if (!ufo && ufoT <= 0 && wave >= 2) {
          const small = E.score > 8000 || U.chance(0.3), dir = U.chance(0.5) ? 1 : -1;
          ufo = { x: dir > 0 ? -30 : W + 30, y: U.rand(80, H - 80), vx: dir * (small ? 150 : 110), r: small ? 12 : 20, small, t: 0, cd: 1.2 };
          ufoT = U.rand(14, 22);
        }
        if (ufo) {
          ufo.t += dt; ufo.x += ufo.vx * dt; ufo.y += Math.sin(ufo.t * 2.2) * 70 * dt; ufo.y = U.wrap(ufo.y, 0, H);
          if (Math.random() < dt * 8) E.sfx('blip', ufo.small ? 1.8 : 1.3, 0.25);
          ufo.cd -= dt;
          if (ufo.cd <= 0 && ship.alive) {
            ufo.cd = ufo.small ? 0.9 : 1.3;
            let a = U.ang(ufo.x, ufo.y, ship.x, ship.y) + (ufo.small ? U.rand(-0.12, 0.12) : U.rand(-0.8, 0.8));
            ufoBullets.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, life: 1.6 });
            E.sfx('laser', 0.8, 0.5);
          }
          if (ufo.x < -60 || ufo.x > W + 60) ufo = null;
        }
        for (let i = ufoBullets.length - 1; i >= 0; i--) {
          const b = ufoBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt;
          if (ship.alive && ship.inv <= 0 && U.dist(b.x, b.y, ship.x, ship.y) < ship.r) { ufoBullets.splice(i, 1); explodeShip(); continue; }
          if (b.life <= 0) ufoBullets.splice(i, 1);
        }
        // ship collisions
        if (ship.alive && ship.inv <= 0) {
          for (let j = rocks.length - 1; j >= 0; j--) if (U.dist(ship.x, ship.y, rocks[j].x, rocks[j].y) < rocks[j].r * 0.85 + ship.r * 0.7) { splitRock(j); explodeShip(); break; }
          if (ship.alive && ufo && U.dist(ship.x, ship.y, ufo.x, ufo.y) < ufo.r + ship.r) { killUfo(); explodeShip(); }
        }
        for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.vr * dt; d.life -= dt; if (d.life <= 0) debris.splice(i, 1); }
        // heartbeat
        beatT -= dt;
        if (beatT <= 0 && rocks.length) { beatT = U.clamp(0.25 + rocks.length * 0.05, 0.3, 1); beat ^= 1; E.tone({ f: beat ? 55 : 49, dur: 0.12, type: 'triangle', vol: 0.35 }); }
        if (!rocks.length) { waveT += dt; if (waveT > 1.5) { waveT = 0; spawnWave(); } }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#050514', '#0b0620');
        const neb = g.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, 420);
        neb.addColorStop(0, 'rgba(192,132,252,.16)'); neb.addColorStop(1, 'rgba(192,132,252,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H);
        const neb2 = g.createRadialGradient(W * 0.2, H * 0.8, 10, W * 0.2, H * 0.8, 380);
        neb2.addColorStop(0, 'rgba(56,189,248,.12)'); neb2.addColorStop(1, 'rgba(56,189,248,0)'); g.fillStyle = neb2; g.fillRect(0, 0, W, H);
        D.stars(g, stars, W, H, t);
        for (const r of rocks) {
          const col = U.hsl(r.hue, 90, 72);
          each(r, r.r, (x, y) => drawPoly(g, x, y, r.pts, r.r, r.rot, col, 'rgba(20,16,48,.85)'));
        }
        for (const b of bullets) { D.glow(g, b.x, b.y, 12, '#7dd3fc', 1); D.circle(g, b.x, b.y, 2.5, '#fff'); }
        for (const b of ufoBullets) { D.glow(g, b.x, b.y, 14, '#f43f5e', 1); D.circle(g, b.x, b.y, 3, '#ffd1dc'); }
        if (ufo) {
          const s = ufo.r / 20, x = ufo.x, y = ufo.y;
          D.glow(g, x, y, 50 * s, '#4ade80', 0.5);
          g.save(); g.translate(x, y); g.scale(s, s);
          D.poly(g, [[-24, 0], [-10, -8], [10, -8], [24, 0], [10, 8], [-10, 8]], 'rgba(10,40,20,.8)', '#4ade80', 2);
          g.beginPath(); g.ellipse(0, -9, 9, 7, 0, Math.PI, 0); g.strokeStyle = '#4ade80'; g.stroke();
          D.line(g, -24, 0, 24, 0, '#4ade80', 1.5);
          for (let i = -2; i <= 2; i++) D.circle(g, i * 8, 3, 1.6, Math.sin(t * 12 + i) > 0 ? '#fde68a' : '#4ade80');
          g.restore();
        }
        for (const d of debris) {
          g.globalAlpha = Math.min(1, d.life);
          const c = Math.cos(d.a) * d.len / 2, s = Math.sin(d.a) * d.len / 2;
          D.line(g, d.x - c, d.y - s, d.x + c, d.y + s, '#7dd3fc', 2);
        }
        g.globalAlpha = 1;
        if (ship.alive && (ship.inv <= 0 || Math.sin(t * 30) > 0)) {
          each(ship, 20, (x, y) => {
            const ox = ship.x, oy = ship.y; ship.x = x; ship.y = y;
            const pts = shipPts();
            if (thrusting) {
              const c = Math.cos(ship.a), s = Math.sin(ship.a), fl = 16 + Math.random() * 12;
              D.poly(g, [[x - c * 12 - s * 6, y - s * 12 + c * 6], [x - c * (12 + fl), y - s * (12 + fl)], [x - c * 12 + s * 6, y - s * 12 - c * 6]], '#fbbf24', null);
              D.glow(g, x - c * 20, y - s * 20, 28, '#f97316', 0.8);
            }
            D.glow(g, x, y, 34, '#7dd3fc', 0.35);
            D.poly(g, pts, 'rgba(12,20,40,.9)', null);
            g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
            g.strokeStyle = 'rgba(125,211,252,.3)'; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke();
            g.strokeStyle = '#e0f2fe'; g.lineWidth = 2; g.stroke();
            ship.x = ox; ship.y = oy;
          });
        }
        if (ship.hyp > 0 && ship.alive) { g.fillStyle = 'rgba(192,132,252,.5)'; g.fillRect(W / 2 - 40, H - 14, 80 * (1 - ship.hyp / 2.5), 3); }
        D.vignette(g, W, H, 0.5);
      },
    };
    function killUfo() {
      E.score += ufo.small ? 1000 : 200;
      E.pop(ufo.x, ufo.y - 20, ufo.small ? '+1000' : '+200', { color: '#4ade80' });
      E.burst(ufo.x, ufo.y, { n: 40, colors: ['#4ade80', '#fde68a', '#fff'], speed: 320, shape: 'spark' });
      E.ring(ufo.x, ufo.y, { color: '#4ade80', r: 90 }); E.sfx('explode', 1.1); E.shake(10);
      ufo = null;
    }
  },
});

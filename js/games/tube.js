MG.add({
  id: 'tube', name: 'Tube Blaster', cat: 'Arcade', color: '#facc15', color2: '#ef4444',
  desc: 'A Tempest-style vector shooter. Hold the rim of a 3D tube as flippers, tankers and spikers crawl up.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> move around the rim (or aim with the mouse)', '<kbd>Space</kbd> / hold click to fire down your lane', '<kbd>X</kbd> Superzapper — wipes the tube, once per level', 'After clearing a level you warp down the tube — shoot spikes out of your lane first!'],
  pad: 'LRAB', padLabels: { A: 'FIRE', B: 'ZAP' },
  make(E) {
    const W = 960, H = 600, VP = { x: 480, y: 250 }, K = 6;
    const SHAPES = [
      { closed: true, pts: U.range(16).map((i) => { const a = (i / 16) * U.TAU - Math.PI / 2; return [480 + Math.cos(a) * 260, 320 + Math.sin(a) * 250]; }) },
      { closed: true, pts: (() => { const p = []; const s = 240; for (let i = 0; i < 4; i++) p.push([240 + i * 120, 70]); for (let i = 0; i < 4; i++) p.push([720, 70 + i * 125]); for (let i = 0; i < 4; i++) p.push([720 - i * 120, 570]); for (let i = 0; i < 4; i++) p.push([240, 570 - i * 125]); void s; return p; })() },
      { closed: true, pts: [[400, 60], [560, 60], [560, 220], [720, 220], [720, 390], [560, 390], [560, 570], [400, 570], [400, 390], [240, 390], [240, 220], [400, 220]].flatMap((p, i, a) => { const q = a[(i + 1) % a.length]; return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]]; }) },
      { closed: false, pts: U.range(16).map((i) => [90 + i * 52, 560]) },
      { closed: false, pts: U.range(15).map((i) => [120 + i * 51.4, 560 - Math.abs(i - 7) * 58]) },
      { closed: true, pts: U.range(16).map((i) => { const a = (i / 16) * U.TAU - Math.PI / 2, r = i % 2 ? 150 : 280; return [480 + Math.cos(a) * r, 320 + Math.sin(a) * r * 0.95]; }) },
      { closed: false, pts: U.range(15).map((i) => { const a = Math.PI + (i / 14) * Math.PI; return [480 + Math.cos(a) * 330, 200 - Math.sin(a) * 340]; }) },
    ];
    const COLORS = ['#3b82f6', '#ef4444', '#facc15', '#22d3ee', '#a855f7', '#4ade80', '#f97316'];
    let level = 0, lives = 3, shape, lanes, pl, bullets, enemies, ebullets, spikes, spawnQ, spawnT, zapper, state, stateT, warpZ = 0, moveT = 0;
    const f = (z) => 1 / (1 + z * K);
    const proj = (p, z) => [VP.x + (p[0] - VP.x) * f(z), VP.y + (p[1] - VP.y) * f(z)];
    function laneEdges(i) { const n = shape.pts.length; return [shape.pts[i % n], shape.pts[(i + 1) % n]]; }
    function lanePt(i, z, t = 0.5) { const [a, b] = laneEdges(i); return proj([U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t)], z); }
    function laneDelta(a, b) { if (!shape.closed) return b - a; let d = b - a; if (d > lanes / 2) d -= lanes; if (d < -lanes / 2) d += lanes; return d; }
    function startLevel() {
      level++; E.stat('Level', level);
      shape = SHAPES[(level - 1) % SHAPES.length];
      lanes = shape.closed ? shape.pts.length : shape.pts.length - 1;
      pl = { lane: Math.floor(lanes / 2), vis: Math.floor(lanes / 2), dead: false, cd: 0 };
      bullets = []; enemies = []; ebullets = []; spikes = Array(lanes).fill(1);
      const n = 8 + level * 3;
      spawnQ = U.range(n).map(() => (level > 1 && U.chance(0.25) ? 'tanker' : level > 2 && U.chance(0.2) ? 'spiker' : 'flipper'));
      spawnT = 1.2; zapper = 1; state = 'play'; warpZ = 0;
      E.banner('LEVEL ' + level, ['Circle', 'Square', 'Cross', 'Flat', 'Vee', 'Star', 'Arch'][(level - 1) % SHAPES.length]);
    }
    startLevel();
    E.stat('Lives', lives);
    const speed = () => 0.11 + level * 0.018;
    function killEnemy(e, pts) {
      e.dead = true; E.score += pts;
      const [x, y] = lanePt(Math.round(e.lane), e.z);
      E.burst(x, y, { n: 18, colors: [e.type === 'tanker' ? '#a855f7' : e.type === 'spiker' ? '#4ade80' : '#ef4444', '#fff'], speed: 200 * f(e.z) + 60, shape: 'spark' });
      E.sfx('explode', 1.6, 0.35); E.shake(2);
      if (e.type === 'tanker') for (const d of [-1, 1]) { const l = e.lane + d; if (shape.closed || (l >= 0 && l < lanes)) enemies.push(mk('flipper', (l + lanes) % lanes, e.z)); }
    }
    function mk(type, lane, z = 1) { return { type, lane, from: lane, to: lane, flipT: 1, z, t: 0, cd: U.rand(1, 3), dir: -1 }; }
    function playerDie() {
      if (pl.dead) return;
      pl.dead = true; lives--; E.stat('Lives', Math.max(0, lives));
      const [x, y] = lanePt(pl.lane, 0);
      E.burst(x, y, { n: 60, colors: ['#facc15', '#fff', '#f97316'], speed: 340, shape: 'spark', life: 1.1 });
      E.sfx('boom'); E.shake(18); E.flash('#facc15', 0.3); E.vibrate(200);
      state = 'dead'; stateT = 2;
    }
    function drawShape(g, pts, z, color, lw, closed) {
      g.beginPath(); pts.forEach((p, i) => { const q = proj(p, z); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); if (closed) g.closePath();
      g.strokeStyle = color; g.lineWidth = lw; g.stroke();
    }
    return {
      update(dt) {
        if (state === 'dead') {
          stateT -= dt;
          if (stateT <= 0) {
            if (lives <= 0) { state = 'over'; E.over({ msg: `Reached level ${level}` }); return; }
            pl.dead = false; enemies = enemies.filter((e) => e.z > 0.6); enemies.forEach((e) => (e.z = 1)); ebullets = []; state = 'play';
          }
          return;
        }
        if (state === 'warp') {
          warpZ += dt * 0.55;
          if (spikes[pl.lane] < 1 && warpZ > spikes[pl.lane] - 0.02 && !pl.dead) { playerDie(); return; }
          if (warpZ >= 1.2) startLevel();
          return;
        }
        // move
        moveT -= dt;
        const ax = E.axis().x;
        let target = null;
        if (E.ptr.moved || E.ptr.down) {
          let best = pl.lane, bd = 1e9;
          for (let i = 0; i < lanes; i++) { const [x, y] = lanePt(i, 0); const d = U.dist2(x, y, E.ptr.x, E.ptr.y); if (d < bd) { bd = d; best = i; } }
          target = best;
        }
        if (ax && moveT <= 0) { let nl = pl.lane + ax; if (shape.closed) nl = (nl + lanes) % lanes; else nl = U.clamp(nl, 0, lanes - 1); if (nl !== pl.lane) { pl.lane = nl; E.sfx('tick', 1.4, 0.4); } moveT = 0.075; }
        else if (target !== null && target !== pl.lane && moveT <= 0) { pl.lane = (pl.lane + Math.sign(laneDelta(pl.lane, target)) + lanes) % lanes; moveT = 0.05; E.sfx('tick', 1.4, 0.3); }
        const dv = laneDelta(pl.vis, pl.lane); pl.vis += dv * Math.min(1, dt * 20); if (shape.closed) pl.vis = (pl.vis + lanes) % lanes;
        pl.cd -= dt;
        if ((E.down('A') || E.ptr.down) && pl.cd <= 0 && bullets.length < 8) { bullets.push({ lane: pl.lane, z: 0 }); pl.cd = 0.1; E.sfx('shoot', 1.6, 0.5); }
        if (E.hit('B') && zapper > 0) {
          zapper--; E.sfx('boom', 1.5); E.flash('#fff', 0.6); E.shake(12);
          enemies.forEach((e) => !e.dead && killEnemy(e, 50)); enemies = enemies.filter((e) => e.type === 'flipper' && !e.dead); enemies.forEach((e) => killEnemy(e, 50)); ebullets = [];
        }
        // spawn
        spawnT -= dt;
        if (spawnQ.length && spawnT <= 0) { enemies.push(mk(spawnQ.shift(), U.ri(0, lanes - 1))); spawnT = Math.max(0.4, 1.6 - level * 0.08) * U.rand(0.6, 1.3); }
        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i], z0 = b.z; b.z += dt * 2.6;
          let hit = false;
          for (const e of enemies) if (!e.dead && Math.round(e.lane) === b.lane && e.flipT >= 1 && e.z >= z0 - 0.03 && e.z <= b.z + 0.03) { killEnemy(e, { flipper: 150, tanker: 100, spiker: 50 }[e.type]); hit = true; break; }
          if (!hit) for (let j = ebullets.length - 1; j >= 0; j--) { const eb = ebullets[j]; if (eb.lane === b.lane && Math.abs(eb.z - b.z) < 0.06) { ebullets.splice(j, 1); hit = true; E.burst(...lanePt(b.lane, b.z), { n: 6, color: '#fff', speed: 80 }); break; } }
          if (!hit && spikes[b.lane] < 1 && b.z >= spikes[b.lane]) { spikes[b.lane] = Math.min(1, spikes[b.lane] + 0.07); E.score += 3; hit = true; E.burst(...lanePt(b.lane, b.z), { n: 4, color: '#4ade80', speed: 60, size: 2 }); E.sfx('tick', 2, 0.3); }
          if (hit || b.z > 1) bullets.splice(i, 1);
        }
        enemies = enemies.filter((e) => !e.dead);
        // enemies
        for (const e of enemies) {
          e.t += dt;
          if (e.flipT < 1) { e.flipT = Math.min(1, e.flipT + dt / 0.22); e.lane = e.to; }
          if (e.type === 'spiker') {
            e.z += e.dir * speed() * 0.9 * dt;
            spikes[e.lane] = Math.min(spikes[e.lane], Math.max(e.z, 0.25));
            if (e.z < 0.3) e.dir = 1;
            if (e.z > 1) { e.z = 1; e.dir = -1; e.lane = U.ri(0, lanes - 1); }
          } else if (e.z > 0) {
            e.z = Math.max(0, e.z - speed() * (e.type === 'tanker' ? 0.6 : 1) * dt);
            if (e.type === 'flipper' && e.flipT >= 1 && Math.random() < dt * 0.35 && e.z > 0.15) { const nl = e.lane + U.pick([-1, 1]); if (shape.closed || (nl >= 0 && nl < lanes)) { e.from = e.lane; e.to = (nl + lanes) % lanes; e.flipT = 0; } }
            e.cd -= dt;
            if (e.cd <= 0 && e.z > 0.2) { e.cd = U.rand(1.5, 4) / (1 + level * 0.1); ebullets.push({ lane: e.lane, z: e.z }); }
            if (e.z <= 0 && e.type === 'tanker') { killEnemy(e, 0); }
          } else if (e.flipT >= 1) {
            // on the rim: flip toward player
            e.cd -= dt;
            if (e.cd <= 0) {
              const d = Math.sign(laneDelta(e.lane, pl.lane));
              if (d) { e.from = e.lane; e.to = (e.lane + d + lanes) % lanes; e.flipT = 0; E.sfx('tick', 0.6, 0.3); }
              e.cd = Math.max(0.25, 0.6 - level * 0.03);
            }
          }
          if (!pl.dead && e.z <= 0.02 && e.lane === pl.lane && e.flipT >= 1) playerDie();
        }
        for (let i = ebullets.length - 1; i >= 0; i--) {
          const b = ebullets[i]; b.z -= dt * 0.45;
          if (b.z <= 0) { if (b.lane === pl.lane) playerDie(); ebullets.splice(i, 1); }
        }
        if (!spawnQ.length && !enemies.some((e) => e.type !== 'spiker') && state === 'play') {
          enemies = []; state = 'warp'; warpZ = 0; E.sfx('charge', 0.6); E.score += 500 * level; E.pop(480, 120, `LEVEL BONUS +${500 * level}`, { color: '#facc15', size: 24 });
        }
      },
      draw(g) {
        const t = E.t, col = COLORS[(level - 1) % COLORS.length];
        g.fillStyle = '#020108'; g.fillRect(0, 0, W, H);
        g.save();
        if (state === 'warp') { const s = 1 + warpZ * warpZ * 3; g.translate(VP.x, VP.y); g.scale(s, s); g.translate(-VP.x, -VP.y); }
        // web
        const pts = shape.pts;
        g.lineJoin = 'round';
        drawShape(g, pts, 1, U.rgba(col, 0.5), 1.2, shape.closed);
        drawShape(g, pts, 0, U.rgba(col, 0.25), 8, shape.closed);
        drawShape(g, pts, 0, col, 2.2, shape.closed);
        for (let i = 0; i < pts.length; i++) { const a = proj(pts[i], 0), b = proj(pts[i], 1); D.line(g, a[0], a[1], b[0], b[1], U.rgba(col, 0.55), 1.2); }
        // lit player lane
        if (!pl.dead) {
          const [a, b] = laneEdges(pl.lane);
          const q = [proj(a, 0), proj(b, 0), proj(b, 1), proj(a, 1)];
          D.poly(g, q, U.rgba('#facc15', 0.06), U.rgba('#facc15', 0.5), 1.5);
        }
        // spikes
        for (let i = 0; i < lanes; i++) if (spikes[i] < 1) { const a = lanePt(i, spikes[i]), b = lanePt(i, 1); D.line(g, a[0], a[1], b[0], b[1], '#4ade80', 2); D.glow(g, a[0], a[1], 10, '#4ade80', 0.8); }
        // enemies
        for (const e of enemies) {
          const lane = e.flipT < 1 ? null : e.lane;
          const [a, b] = laneEdges(lane === null ? e.to : lane);
          let pA = proj(a, e.z), pB = proj(b, e.z);
          if (lane === null) { const [a2, b2] = laneEdges(e.from), k = e.flipT; pA = [U.lerp(proj(a2, e.z)[0], pA[0], k), U.lerp(proj(a2, e.z)[1], pA[1], k)]; pB = [U.lerp(proj(b2, e.z)[0], pB[0], k), U.lerp(proj(b2, e.z)[1], pB[1], k)]; }
          const mx = (pA[0] + pB[0]) / 2, my = (pA[1] + pB[1]) / 2, s = f(e.z);
          const nx = -(pB[1] - pA[1]) * 0.25, ny = (pB[0] - pA[0]) * 0.25;
          if (e.type === 'flipper') {
            D.glow(g, mx, my, 30 * s + 6, '#ef4444', 0.5);
            D.poly(g, [pA, [mx + nx * 0.6, my + ny * 0.6], pB, [mx - nx * 0.6, my - ny * 0.6]], null, '#ef4444', 2);
            D.line(g, pA[0], pA[1], pB[0], pB[1], '#f472b6', 1.5);
          } else if (e.type === 'tanker') {
            D.glow(g, mx, my, 36 * s + 6, '#a855f7', 0.5);
            const r = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) * 0.32;
            D.poly(g, [[mx, my - r], [mx + r, my], [mx, my + r], [mx - r, my]], 'rgba(168,85,247,.2)', '#c084fc', 2);
            D.poly(g, [[mx, my - r * 0.5], [mx + r * 0.5, my], [mx, my + r * 0.5], [mx - r * 0.5, my]], null, '#f0abfc', 1.5);
          } else {
            const r = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) * 0.25;
            g.strokeStyle = '#4ade80'; g.lineWidth = 2; g.beginPath();
            for (let k = 0; k < 14; k++) { const ang = k * 0.9 + t * 8, rr = (k / 14) * r; k ? g.lineTo(mx + Math.cos(ang) * rr, my + Math.sin(ang) * rr) : g.moveTo(mx, my); }
            g.stroke();
          }
        }
        for (const b of ebullets) { const [x, y] = lanePt(b.lane, b.z); D.glow(g, x, y, 16 * f(b.z) + 5, '#f472b6', 0.9); D.circle(g, x, y, 5 * f(b.z) + 1.5, '#fff'); }
        for (const b of bullets) { const [x, y] = lanePt(b.lane, b.z); D.glow(g, x, y, 14 * f(b.z) + 4, '#facc15', 1); D.circle(g, x, y, 4 * f(b.z) + 1, '#fff'); }
        // player claw
        if (!pl.dead) {
          const vl = Math.round(pl.vis) % lanes, frac = pl.vis - Math.floor(pl.vis);
          const i0 = Math.floor(pl.vis) % lanes, z = state === 'warp' ? warpZ : 0;
          const [a0, b0] = laneEdges(i0);
          const [a1, b1] = laneEdges((i0 + (shape.closed ? 1 : 0)) % lanes);
          const A = proj([U.lerp(a0[0], a1[0], frac), U.lerp(a0[1], a1[1], frac)], z), B = proj([U.lerp(b0[0], b1[0], frac), U.lerp(b0[1], b1[1], frac)], z);
          const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
          const ox = (mx - VP.x) * 0.12, oy = (my - VP.y) * 0.12;
          D.glow(g, mx, my, 50, '#facc15', 0.5);
          D.poly(g, [A, [mx + ox, my + oy], B, [mx + ox * 0.4, my + oy * 0.4 + 0], [mx, my], [mx + ox * 0.4, my + oy * 0.4]], null, '#facc15', 2.5);
          D.poly(g, [A, [mx + ox * 1.4, my + oy * 1.4], B], null, '#fde68a', 1.5);
          void vl;
        }
        g.restore();
        for (let i = 0; i < lives; i++) { const x = 30 + i * 30, y = 30; D.poly(g, [[x - 10, y + 6], [x, y - 8], [x + 10, y + 6], [x, y]], null, '#facc15', 2); }
        if (zapper) D.text(g, 'ZAPPER READY  [X]', W - 20, 28, { size: 13, font: 'mono', color: '#22d3ee', align: 'right' });
        if (state === 'warp') D.text(g, 'WARP!', 480, 560, { size: 30, color: '#fff', glow: '#22d3ee', alpha: 0.6 + 0.4 * Math.sin(t * 20) });
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

MG.add({
  id: 'heist', name: 'Shadow Heist', cat: 'Action', color: '#818cf8', color2: '#facc15',
  desc: 'Procedural stealth. Slip past guards with raycast vision cones, steal every gem and vanish.',
  how: ['Move with <kbd>WASD</kbd> / <kbd>←↑↓→</kbd> or click / tap to walk there', 'Hold <kbd>Shift</kbd> (or <kbd>B</kbd>) to sneak — running makes noise guards hear', 'Stay out of the yellow vision cones; the eye meter shows how close you are to being spotted', 'Grab all the gems, then reach the exit'],
  pad: 'LRUDB', padLabels: { B: 'SNEAK' },
  make(E) {
    const W = 960, H = 600, C = 32, GW = 30, GH = 17, OY = 56;
    let grid, rooms, guards, loot, exitC, pl, level = 0, lives = 3, state, stateT, noiseT = 0, noises = [], spotted = false, lvlTime = 0, pathTo = null, wasSeen = false;
    const solid = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || grid[y][x] === 1;
    const solidPx = (x, y) => solid(Math.floor(x / C), Math.floor((y - OY) / C));
    function gen() {
      level++; E.stat('Level', level);
      grid = U.grid(GW, GH, 0);
      for (let x = 0; x < GW; x++) { grid[0][x] = 1; grid[GH - 1][x] = 1; }
      for (let y = 0; y < GH; y++) { grid[y][0] = 1; grid[y][GW - 1] = 1; }
      rooms = [];
      const split = (x, y, w, h, depth) => {
        const canV = w >= 13, canH = h >= 10;
        if (depth > 4 || (!canV && !canH) || (depth > 2 && Math.random() < 0.2)) { rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) }); return; }
        const vert = canV && (!canH || w / h > 1.3 || (w / h > 0.8 && Math.random() < 0.5));
        if (vert) {
          const s = U.ri(x + 6, x + w - 7);
          for (let j = y; j < y + h; j++) grid[j][s] = 1;
          const d = U.ri(y + 1, y + h - 3); grid[d][s] = 0; grid[d + 1][s] = 0;
          if (h > 9 && Math.random() < 0.6) { const d2 = U.ri(y + 1, y + h - 2); grid[d2][s] = 0; }
          split(x, y, s - x, h, depth + 1); split(s + 1, y, x + w - s - 1, h, depth + 1);
        } else {
          const s = U.ri(y + 4, y + h - 5);
          for (let i = x; i < x + w; i++) grid[s][i] = 1;
          const d = U.ri(x + 1, x + w - 3); grid[s][d] = 0; grid[s][d + 1] = 0;
          if (w > 12 && Math.random() < 0.6) { const d2 = U.ri(x + 1, x + w - 2); grid[s][d2] = 0; }
          split(x, y, w, s - y, depth + 1); split(x, s + 1, w, y + h - s - 1, depth + 1);
        }
      };
      split(1, 1, GW - 2, GH - 2, 0);
      // furniture pillars for cover
      for (const r of rooms) if (r.w > 6 && r.h > 5 && Math.random() < 0.6) { const px = U.ri(r.x + 2, r.x + r.w - 3), py = U.ri(r.y + 2, r.y + r.h - 3); grid[py][px] = 1; if (Math.random() < 0.5 && px + 1 < r.x + r.w - 1) grid[py][px + 1] = 1; }
      // start & exit in far rooms
      rooms.sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
      const start = rooms[0], end = rooms[rooms.length - 1];
      const free = (r) => { for (let k = 0; k < 50; k++) { const x = U.ri(r.x, r.x + r.w - 1), y = U.ri(r.y, r.y + r.h - 1); if (!grid[y][x]) return [x, y]; } return [r.cx, r.cy]; };
      const [sx, sy] = free(start);
      pl = { x: (sx + 0.5) * C, y: OY + (sy + 0.5) * C, face: 0, walk: 0 };
      exitC = free(end);
      const mids = U.shuffle(rooms.slice(1));
      const nLoot = Math.min(3 + Math.floor(level / 2), mids.length + 1);
      loot = [];
      for (let i = 0; i < nLoot; i++) { const r = mids[i % mids.length]; const [x, y] = free(r); if (!loot.some((l) => l.x === x && l.y === y) && !(x === exitC[0] && y === exitC[1])) loot.push({ x, y, got: false, t: U.rand(6) }); }
      // guards patrol between rooms via BFS paths
      guards = [];
      const nG = Math.min(2 + level, 8);
      for (let i = 0; i < nG; i++) {
        const seq = U.shuffle(rooms.slice(1)).slice(0, U.ri(2, 3));
        let route = [];
        for (let k = 0; k < seq.length; k++) { const a = free(seq[k]), b = free(seq[(k + 1) % seq.length]); route = route.concat(bfs(a, b)); }
        if (route.length < 2) continue;
        const [gx, gy] = route[0];
        if (U.dist(gx, gy, sx, sy) < 7) continue;
        guards.push({ x: (gx + 0.5) * C, y: OY + (gy + 0.5) * C, route, ri: 0, a: 0, state: 'patrol', meter: 0, look: 0, target: null, wait: 0, speed: 58 + level * 3, cone: [], t: 0 });
      }
      state = 'play'; lvlTime = 0; wasSeen = false; pathTo = null; noises = [];
      E.stat('Loot', `0/${loot.length}`);
      E.banner(`JOB ${level}`, `${loot.length} gems · ${guards.length} guards`, { color: '#818cf8' });
    }
    function bfs(a, b) {
      const key = (x, y) => y * GW + x, prev = new Map([[key(a[0], a[1]), null]]), q = [a];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === b[0] && y === b[1]) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (!solid(nx, ny) && !prev.has(k)) { prev.set(k, [x, y]); q.push([nx, ny]); } }
      }
      const out = []; let cur = b;
      if (!prev.has(key(b[0], b[1]))) return [];
      while (cur) { out.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
      return out;
    }
    gen();
    E.stat('Lives', lives);
    function ray(x, y, a, max) {
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let d = 0; d < max; d += 5) if (solidPx(x + dx * d, y + dy * d)) return d;
      return max;
    }
    function los(x1, y1, x2, y2) { const d = U.dist(x1, y1, x2, y2); return ray(x1, y1, U.ang(x1, y1, x2, y2), d) >= d - 2; }
    function moveCircle(o, dx, dy, r = 10) {
      o.x += dx; if (solidPx(o.x + Math.sign(dx) * r, o.y - r + 2) || solidPx(o.x + Math.sign(dx) * r, o.y + r - 2)) o.x -= dx;
      o.y += dy; if (solidPx(o.x - r + 2, o.y + Math.sign(dy) * r) || solidPx(o.x + r - 2, o.y + Math.sign(dy) * r)) o.y -= dy;
    }
    function caught() {
      state = 'caught'; stateT = 2; lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('lose'); E.flash('#ef4444', 0.45); E.shake(10); E.vibrate(250);
    }
    return {
      update(dt) {
        if (state === 'caught') { stateT -= dt; if (stateT <= 0) { if (lives <= 0) { state = 'over'; E.over({ msg: `Busted on job ${level}` }); } else { level--; gen(); } } return; }
        if (state === 'escaped') { stateT -= dt; if (stateT <= 0) gen(); return; }
        lvlTime += dt;
        // player input
        const sneak = E.down('ShiftLeft', 'ShiftRight', 'B');
        const a = E.axis();
        let mx = a.x, my = a.y;
        if (E.ptr.hit && E.ptr.y > OY) { const tx = Math.floor(E.ptr.x / C), ty = Math.floor((E.ptr.y - OY) / C); if (!solid(tx, ty)) { const p = bfs([Math.floor(pl.x / C), Math.floor((pl.y - OY) / C)], [tx, ty]); pathTo = p.length ? p.slice(1) : null; } }
        if (mx || my) pathTo = null;
        if (pathTo && pathTo.length) { const [tx, ty] = pathTo[0], px = (tx + 0.5) * C, py = OY + (ty + 0.5) * C, d = U.dist(pl.x, pl.y, px, py); if (d < 4) pathTo.shift(); else { mx = (px - pl.x) / d; my = (py - pl.y) / d; } }
        const l = Math.hypot(mx, my);
        const moving = l > 0.01;
        const sp = sneak ? 72 : 145;
        if (moving) { moveCircle(pl, (mx / l) * sp * dt, (my / l) * sp * dt); pl.face = Math.atan2(my, mx); pl.walk += dt * (sneak ? 6 : 12); }
        // noise
        noiseT -= dt;
        if (moving && !sneak && noiseT <= 0) { noiseT = 0.45; noises.push({ x: pl.x, y: pl.y, r: 0, max: 110 }); for (const gd of guards) if (U.dist(gd.x, gd.y, pl.x, pl.y) < 110 && gd.state !== 'alert') { gd.state = 'investigate'; gd.target = [pl.x, pl.y]; gd.wait = 0; gd.meter = Math.max(gd.meter, 0.25); } }
        for (let i = noises.length - 1; i >= 0; i--) { noises[i].r += dt * 260; if (noises[i].r > noises[i].max) noises.splice(i, 1); }
        // loot / exit
        for (const lt of loot) if (!lt.got && U.dist(pl.x, pl.y, (lt.x + 0.5) * C, OY + (lt.y + 0.5) * C) < 18) {
          lt.got = true; E.score += 500; const got = loot.filter((q) => q.got).length; E.stat('Loot', `${got}/${loot.length}`);
          E.sfx('coin', 1.2); E.burst((lt.x + 0.5) * C, OY + (lt.y + 0.5) * C, { n: 20, colors: ['#facc15', '#fff'], speed: 150 });
          if (got === loot.length) { E.pop(pl.x, pl.y - 30, 'ALL GEMS — GET OUT!', { color: '#4ade80', size: 18 }); E.sfx('power'); }
        }
        if (loot.every((q) => q.got) && U.dist(pl.x, pl.y, (exitC[0] + 0.5) * C, OY + (exitC[1] + 0.5) * C) < 18) {
          const tb = Math.max(0, Math.round(1500 - lvlTime * 15)), ghost = wasSeen ? 0 : 1000;
          E.score += tb + ghost + 500 * level; E.sfx('win'); state = 'escaped'; stateT = 2.2;
          E.banner(ghost ? 'GHOST!' : 'ESCAPED', `time +${tb}${ghost ? ' · ghost +1000' : ''}`, { color: '#4ade80' });
          return;
        }
        // guards
        spotted = false;
        for (const gd of guards) {
          gd.t += dt;
          const dist = U.dist(gd.x, gd.y, pl.x, pl.y), range = gd.state === 'alert' ? 240 : 185, half = 0.62;
          const inCone = dist < range && Math.abs(U.angDiff(gd.a, U.ang(gd.x, gd.y, pl.x, pl.y))) < half && los(gd.x, gd.y, pl.x, pl.y);
          const close = dist < 26;
          if (inCone || close) {
            gd.meter += dt * (sneak ? 0.9 : 1.4) * (1.6 - dist / range) * (gd.state === 'alert' ? 2 : 1);
            gd.target = [pl.x, pl.y]; spotted = true; if (gd.meter > 0.35) wasSeen = true;
            if (gd.meter > 0.35 && gd.state === 'patrol') { gd.state = 'investigate'; E.sfx('blip', 0.8, 0.5); }
            if (gd.meter >= 1 && gd.state !== 'alert') { gd.state = 'alert'; E.sfx('error', 1.3); E.pop(gd.x, gd.y - 26, '!', { color: '#ef4444', size: 28 }); }
          } else gd.meter = Math.max(0, gd.meter - dt * 0.25);
          if (gd.state === 'alert' && close) { caught(); return; }
          if (gd.state === 'alert' && gd.meter >= 1.6) { caught(); return; }
          let tx, ty, spd = gd.speed;
          if (gd.state === 'patrol') { const [cx, cy] = gd.route[gd.ri]; tx = (cx + 0.5) * C; ty = OY + (cy + 0.5) * C; if (U.dist(gd.x, gd.y, tx, ty) < 3) { gd.ri = (gd.ri + 1) % gd.route.length; } }
          else if (gd.target) {
            [tx, ty] = gd.target; spd *= gd.state === 'alert' ? 2 : 1.1;
            if (U.dist(gd.x, gd.y, tx, ty) < 8 || !los(gd.x, gd.y, tx, ty)) {
              if (!los(gd.x, gd.y, tx, ty) && !gd.chase) { gd.chase = bfs([Math.floor(gd.x / C), Math.floor((gd.y - OY) / C)], [Math.floor(tx / C), Math.floor((ty - OY) / C)]).slice(1); }
              if (gd.chase && gd.chase.length) { const [cx, cy] = gd.chase[0]; tx = (cx + 0.5) * C; ty = OY + (cy + 0.5) * C; if (U.dist(gd.x, gd.y, tx, ty) < 4) gd.chase.shift(); }
              else { gd.wait += dt; tx = gd.x; ty = gd.y; gd.a += Math.sin(gd.t * 2) * dt * 2; if (gd.wait > 2.5) { gd.state = 'patrol'; gd.target = null; gd.chase = null; gd.wait = 0; gd.meter = Math.min(gd.meter, 0.3); let bi = 0, bd = 1e9; gd.route.forEach(([cx, cy], i) => { const d = U.dist2((cx + 0.5) * C, OY + (cy + 0.5) * C, gd.x, gd.y); if (d < bd) { bd = d; bi = i; } }); gd.ri = bi; } }
            } else gd.chase = null;
          }
          if (tx !== undefined) {
            const d = U.dist(gd.x, gd.y, tx, ty);
            if (d > 1) { const ang = U.ang(gd.x, gd.y, tx, ty); gd.a += U.clamp(U.angDiff(gd.a, ang), -5 * dt, 5 * dt); const step = Math.min(d, spd * dt); gd.x += Math.cos(ang) * step; gd.y += Math.sin(ang) * step; }
          }
          // vision cone polygon
          gd.cone = [[gd.x, gd.y]];
          for (let k = 0; k <= 24; k++) { const aa = gd.a - half + (k / 24) * half * 2; const d = ray(gd.x, gd.y, aa, range); gd.cone.push([gd.x + Math.cos(aa) * d, gd.y + Math.sin(aa) * d]); }
        }
        if (spotted && Math.random() < dt * 3) E.tone({ f: 880, dur: 0.05, type: 'sine', vol: 0.05 });
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, W, H);
        // floor
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const px = x * C, py = OY + y * C;
          if (grid[y][x]) continue;
          g.fillStyle = (x + y) % 2 ? '#1a1d33' : '#1d2038'; g.fillRect(px, py, C, C);
        }
        // exit
        const exOpen = loot.every((q) => q.got);
        const ex = (exitC[0] + 0.5) * C, ey = OY + (exitC[1] + 0.5) * C;
        D.glow(g, ex, ey, exOpen ? 60 : 30, exOpen ? '#4ade80' : '#475569', exOpen ? 0.8 : 0.4);
        D.strokeRR(g, ex - 12, ey - 12, 24, 24, 5, exOpen ? '#4ade80' : '#475569', 2.5); D.text(g, '⇲', ex, ey + 1, { size: 16, font: 'ui', color: exOpen ? '#4ade80' : '#64748b' });
        // cones
        for (const gd of guards) {
          if (gd.cone.length < 3) continue;
          const col = gd.state === 'alert' ? '239,68,68' : gd.state === 'investigate' ? '251,146,60' : '250,204,21';
          const gr = g.createRadialGradient(gd.x, gd.y, 5, gd.x, gd.y, 230); gr.addColorStop(0, `rgba(${col},.32)`); gr.addColorStop(1, `rgba(${col},.04)`);
          g.fillStyle = gr; g.beginPath(); gd.cone.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        }
        for (const n of noises) { g.globalAlpha = 1 - n.r / n.max; D.circle(g, n.x, n.y, n.r, null, '#a5b4fc', 1.5); g.globalAlpha = 1; }
        // walls with 3D tops
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (!grid[y][x]) continue;
          const px = x * C, py = OY + y * C;
          g.fillStyle = '#2b2f4f'; g.fillRect(px, py, C, C);
          g.fillStyle = '#3b4170'; g.fillRect(px, py - 6, C, C - 4);
          if (!grid[y + 1] || !grid[y + 1][x]) { g.fillStyle = '#23263f'; g.fillRect(px, py + C - 10, C, 10); }
        }
        // loot
        for (const lt of loot) if (!lt.got) { const x = (lt.x + 0.5) * C, y = OY + (lt.y + 0.5) * C + Math.sin(t * 3 + lt.t) * 2; D.glow(g, x, y, 26, '#facc15', 0.6); D.poly(g, [[x, y - 9], [x + 8, y - 2], [x, y + 9], [x - 8, y - 2]], '#fde047', '#fff', 1); }
        if (pathTo && pathTo.length) { g.fillStyle = 'rgba(165,180,252,.35)'; for (const [x, y] of pathTo) g.fillRect((x + 0.5) * C - 2, OY + (y + 0.5) * C - 2, 4, 4); }
        // guards
        for (const gd of guards) {
          D.shadow(g, gd.x, gd.y + 10, 11, 4, 0.4);
          g.save(); g.translate(gd.x, gd.y); g.rotate(gd.a);
          D.fillRR(g, -9, -11, 16, 22, 7, '#334155'); D.circle(g, 2, 0, 8, '#e2e8f0'); g.fillStyle = '#1e293b'; g.beginPath(); g.arc(2, 0, 8, -2.2, 2.2); g.fill();
          D.circle(g, 12, 6, 3, '#fde68a'); g.restore();
          if (gd.meter > 0.02) {
            const k = Math.min(1, gd.meter);
            D.circle(g, gd.x, gd.y - 26, 9, 'rgba(0,0,0,.6)');
            g.strokeStyle = gd.state === 'alert' ? '#ef4444' : '#fb923c'; g.lineWidth = 3; g.beginPath(); g.arc(gd.x, gd.y - 26, 9, -Math.PI / 2, -Math.PI / 2 + k * U.TAU); g.stroke();
            D.text(g, gd.state === 'alert' ? '!' : '?', gd.x, gd.y - 25, { size: 12, color: '#fff' });
          }
        }
        // player
        const bob = Math.sin(pl.walk) * 1.5;
        D.shadow(g, pl.x, pl.y + 10, 10, 4, 0.5);
        g.save(); g.translate(pl.x, pl.y + bob); g.rotate(pl.face);
        D.circle(g, 0, 0, 10, '#111827'); D.circle(g, 0, 0, 10, null, '#6366f1', 1.5);
        D.circle(g, 5, -3, 1.8, '#a5b4fc'); D.circle(g, 5, 3, 1.8, '#a5b4fc');
        g.restore();
        if (spotted) D.glow(g, pl.x, pl.y, 30, '#ef4444', 0.3 + 0.2 * Math.sin(t * 20));
        // header
        g.fillStyle = '#070812'; g.fillRect(0, 0, W, OY);
        loot.forEach((lt, i) => { const x = 24 + i * 26; D.poly(g, [[x, 18], [x + 8, 25], [x, 38], [x - 8, 25]], lt.got ? '#facc15' : 'rgba(255,255,255,.12)'); });
        const worst = guards.reduce((m, gd) => Math.max(m, gd.meter), 0);
        D.text(g, 'DETECTION', W / 2 - 110, 28, { size: 11, font: 'mono', color: '#94a3b8', align: 'right' });
        D.fillRR(g, W / 2 - 100, 20, 200, 16, 8, 'rgba(255,255,255,.08)');
        D.fillRR(g, W / 2 - 100, 20, 200 * Math.min(1, worst / 1.6), 16, 8, worst > 1 ? '#ef4444' : worst > 0.35 ? '#fb923c' : '#facc15');
        D.text(g, E.down('ShiftLeft', 'ShiftRight', 'B') ? 'SNEAKING' : 'RUNNING (noisy)', W - 20, 28, { size: 12, font: 'mono', align: 'right', color: E.down('ShiftLeft', 'ShiftRight', 'B') ? '#a5b4fc' : '#fb923c' });
        if (state === 'caught') { g.fillStyle = 'rgba(127,29,29,.35)'; g.fillRect(0, 0, W, H); D.text(g, 'BUSTED', W / 2, H / 2, { size: 64, color: '#fff', glow: '#ef4444' }); }
        D.vignette(g, W, H, 0.55);
      },
    };
  },
});

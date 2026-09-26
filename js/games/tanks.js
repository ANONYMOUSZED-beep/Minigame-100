MG.add({
  id: 'tanks', name: 'Tank Ricochet', cat: 'Action', color: '#d97706', color2: '#3b82f6',
  desc: 'Diorama tank battles with ricocheting shells. Enemy AIs bank shots off walls — so should you.',
  how: ['Drive with <kbd>WASD</kbd> · aim with the mouse (or <kbd>←↑↓→</kbd>)', 'Click / <kbd>Space</kbd> to fire — shells bounce once off walls', 'Shells cancel each other out: shoot incoming fire down', 'Green tanks bank shots twice. Watch the angles.'],
  pad: 'LRUDA', padLabels: { A: 'FIRE' },
  make(E) {
    const W = 960, H = 600, C = 40, GW = 24, GH = 15;
    let grid, level = 0, lives = 3, pl, foes, shells, marks, state, stateT, aimMouse = true;
    const TYPES = {
      brown: { col: '#a16207', speed: 0, fire: 2.6, shellSp: 250, bounces: 1, max: 1, pts: 100 },
      grey: { col: '#6b7280', speed: 70, fire: 2.0, shellSp: 260, bounces: 1, max: 1, pts: 200 },
      green: { col: '#16a34a', speed: 0, fire: 1.8, shellSp: 420, bounces: 2, max: 2, pts: 400 },
      red: { col: '#dc2626', speed: 95, fire: 0.6, shellSp: 290, bounces: 1, max: 3, pts: 500 },
      purple: { col: '#7c3aed', speed: 130, fire: 1.2, shellSp: 330, bounces: 1, max: 2, pts: 600 },
    };
    const wall = (cx, cy) => cx < 0 || cy < 0 || cx >= GW || cy >= GH || grid[cy][cx] > 0;
    const wallAt = (x, y) => wall(Math.floor(x / C), Math.floor(y / C));
    function genLevel() {
      level++; E.stat('Level', level);
      for (let tries = 0; tries < 50; tries++) {
        grid = U.grid(GW, GH, 0);
        const n = 5 + Math.min(level, 6);
        for (let k = 0; k < n; k++) {
          const w = U.ri(1, 4), h = U.ri(1, 4), x = U.ri(2, GW / 2 - 1 - w), y = U.ri(1, GH - 1 - h), breakable = U.chance(0.25) ? 2 : 1;
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { grid[y + j][x + i] = breakable; grid[GH - 1 - (y + j)][GW - 1 - (x + i)] = breakable; }
        }
        for (let j = 5; j < 10; j++) for (let i = 0; i < 3; i++) { grid[j][i] = 0; grid[j][GW - 1 - i] = 0; }
        // connectivity check
        const seen = new Set(['1,7']), st = [[1, 7]];
        while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!wall(nx, ny) && !seen.has(k)) { seen.add(k); st.push([nx, ny]); } } }
        let free = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!grid[y][x]) free++;
        if (seen.has(`${GW - 2},7`) && seen.size === free) break;
      }
      pl = { x: 1.5 * C, y: 7.5 * C, a: 0, ta: 0, cd: 0, dead: false, tread: 0 };
      const pool = ['brown', 'grey', 'grey', 'green', 'red', 'purple'].slice(0, Math.min(6, 2 + level));
      const n = Math.min(1 + Math.ceil(level / 2), 6);
      foes = [];
      const spots = [];
      for (let y = 1; y < GH - 1; y++) for (let x = GW / 2 + 2; x < GW - 1; x++) if (!grid[y][x]) spots.push([x, y]);
      U.shuffle(spots);
      for (let i = 0; i < n; i++) { const [x, y] = spots[i]; const type = i === 0 && level === 1 ? 'brown' : U.pick(pool); foes.push({ type, x: (x + 0.5) * C, y: (y + 0.5) * C, a: Math.PI, ta: Math.PI, cd: U.rand(1, 2.5), goal: null, dead: false, think: 0, tread: 0 }); }
      shells = []; marks = []; state = 'intro'; stateT = 1.6;
      E.banner('MISSION ' + level, `${n} enemy tank${n > 1 ? 's' : ''}`);
    }
    genLevel();
    E.stat('Lives', lives);
    function collideTank(t) {
      const r = 15;
      for (let k = 0; k < 2; k++) {
        const cx = Math.floor(t.x / C), cy = Math.floor(t.y / C);
        for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
          if (!wall(x, y)) continue;
          const nx = U.clamp(t.x, x * C, x * C + C), ny = U.clamp(t.y, y * C, y * C + C), dx = t.x - nx, dy = t.y - ny, d = Math.hypot(dx, dy);
          if (d < r && d > 0.001) { t.x = nx + (dx / d) * r; t.y = ny + (dy / d) * r; }
          else if (d === 0) { t.x += 1; }
        }
      }
      t.x = U.clamp(t.x, 15, W - 15); t.y = U.clamp(t.y, 15, H - 15);
    }
    // trace a shell path; returns points + whether it passes near target
    function trace(x, y, a, bounces, target, maxLen = 1400) {
      let vx = Math.cos(a) * 8, vy = Math.sin(a) * 8, len = 0, b = 0;
      while (len < maxLen) {
        const nx = x + vx, ny = y + vy;
        if (wallAt(nx, ny)) {
          if (b >= bounces) return null;
          b++;
          if (wallAt(nx, y)) vx = -vx; else vy = -vy;
          if (wallAt(x + vx, y + vy)) return null;
          continue;
        }
        x = nx; y = ny; len += 8;
        if (target && U.dist2(x, y, target.x, target.y) < 18 * 18) return { hit: true, len, b };
        if (b > 0 || len > 60) for (const f of foes) if (!f.dead && U.dist2(x, y, f.x, f.y) < 20 * 20) return null; // would hit an ally (or itself)
      }
      return null;
    }
    function fire(t, isPl) {
      const T = isPl ? { shellSp: 330, bounces: 1, max: 5 } : TYPES[t.type];
      const mine = shells.filter((s) => s.owner === t).length;
      if (mine >= T.max) return false;
      const bx = t.x + Math.cos(t.ta) * 26, by = t.y + Math.sin(t.ta) * 26;
      if (wallAt(bx, by)) return false;
      shells.push({ x: bx, y: by, vx: Math.cos(t.ta) * T.shellSp, vy: Math.sin(t.ta) * T.shellSp, bounces: T.bounces, owner: t, trail: [], fast: T.shellSp > 400 });
      E.sfx('shoot', isPl ? 0.8 : 0.7, 0.7); E.shake(isPl ? 3 : 1);
      E.burst(bx, by, { n: 8, colors: ['#fde68a', '#f97316', '#a8a29e'], speed: 140, angle: t.ta, spread: 0.8, life: 0.4 });
      return true;
    }
    function boom(x, y, big) {
      E.burst(x, y, { n: big ? 60 : 16, colors: ['#fde68a', '#f97316', '#ef4444', '#57534e'], speed: big ? 320 : 160, life: big ? 1 : 0.5 });
      E.ring(x, y, { color: '#fde68a', r: big ? 80 : 30 });
      E.sfx(big ? 'explode' : 'hit', big ? 0.9 : 1.4, big ? 1 : 0.4); E.shake(big ? 12 : 3);
      marks.push({ x, y, r: big ? 30 : 10, scorch: true });
    }
    function killTank(t) {
      t.dead = true; boom(t.x, t.y, true);
      if (t === pl) { lives--; E.stat('Lives', Math.max(0, lives)); state = 'dead'; stateT = 2; E.flash('#ef4444', 0.3); E.vibrate(200); }
      else { E.score += TYPES[t.type].pts * level; E.pop(t.x, t.y - 30, '+' + TYPES[t.type].pts * level, { color: '#fde68a' }); }
    }
    function drawTank(g, t, col, isPl) {
      g.save(); g.translate(t.x, t.y);
      D.shadow(g, 3, 5, 22, 18, 0.3);
      g.save(); g.rotate(t.a);
      g.fillStyle = '#292524'; g.fillRect(-18, -17, 36, 8); g.fillRect(-18, 9, 36, 8);
      g.fillStyle = '#57534e'; for (let i = 0; i < 6; i++) { const o = ((i * 6 + t.tread) % 36) - 18; g.fillRect(o, -17, 2, 8); g.fillRect(o, 9, 2, 8); }
      const gr = g.createLinearGradient(0, -12, 0, 12); gr.addColorStop(0, U.shade(col, 0.3)); gr.addColorStop(1, U.shade(col, -0.2));
      D.fillRR(g, -16, -11, 32, 22, 5, gr);
      g.restore();
      g.rotate(t.ta);
      D.fillRR(g, 4, -3.5, 22, 7, 2, U.shade(col, -0.35));
      D.circle(g, 0, 0, 10, U.shade(col, 0.15)); D.circle(g, 0, 0, 10, null, U.shade(col, -0.4), 2);
      if (isPl) D.circle(g, -2, -2, 3, 'rgba(255,255,255,.5)');
      g.restore();
    }
    return {
      update(dt) {
        if (state === 'intro') { stateT -= dt; if (stateT <= 0) state = 'play'; }
        if (state === 'dead') { stateT -= dt; if (stateT <= 0) { if (lives <= 0) { state = 'over'; E.over({ msg: `Reached mission ${level}` }); return; } pl.dead = false; pl.x = 1.5 * C; pl.y = 7.5 * C; shells = []; state = 'intro'; stateT = 1; } }
        if (state === 'clear') { stateT -= dt; if (stateT <= 0) genLevel(); }
        const active = state === 'play';
        // player
        if (!pl.dead) {
          let mx = (E.down('KeyD') ? 1 : 0) - (E.down('KeyA') ? 1 : 0), my = (E.down('KeyS') ? 1 : 0) - (E.down('KeyW') ? 1 : 0);
          const touch = E.ptr.type === 'touch';
          if (touch) { const a = E.axis(); mx = a.x; my = a.y; }
          if (active && (mx || my)) {
            const target = Math.atan2(my, mx);
            let d = U.angDiff(pl.a, target), dir = 1;
            if (Math.abs(d) > Math.PI / 2) { d = U.angDiff(pl.a, target + Math.PI); dir = -1; }
            pl.a += U.clamp(d, -8 * dt, 8 * dt);
            const align = Math.max(0, Math.cos(U.angDiff(pl.a, dir > 0 ? target : target + Math.PI)));
            const sp = 125 * align * dir;
            pl.x += Math.cos(pl.a) * sp * dt; pl.y += Math.sin(pl.a) * sp * dt;
            pl.tread += dt * 60 * dir;
            if (Math.random() < 0.3) marks.push({ x: pl.x, y: pl.y, a: pl.a });
            if (Math.random() < 0.15) E.sfx('engine', 1.2, 0.8);
            collideTank(pl);
          }
          const kx = (E.down('ArrowRight') ? 1 : 0) - (E.down('ArrowLeft') ? 1 : 0), ky = (E.down('ArrowDown') ? 1 : 0) - (E.down('ArrowUp') ? 1 : 0);
          if (!touch && (kx || ky)) { aimMouse = false; pl.ta = U.lerp(pl.ta, pl.ta + U.angDiff(pl.ta, Math.atan2(ky, kx)), Math.min(1, dt * 12)); }
          if (E.ptr.moved && !touch) aimMouse = true;
          if (aimMouse && !touch) pl.ta = U.ang(pl.x, pl.y, E.ptr.x, E.ptr.y);
          if (touch && E.ptr.hit) pl.ta = U.ang(pl.x, pl.y, E.ptr.x, E.ptr.y);
          pl.cd -= dt;
          if (active && (E.hit('Space') || E.ptr.hit) && pl.cd <= 0) { if (fire(pl, true)) pl.cd = 0.25; }
        }
        // AI
        for (const f of foes) {
          if (f.dead || !active) continue;
          const T = TYPES[f.type];
          f.think -= dt; f.cd -= dt;
          // aim: direct or ricochet
          if (f.think <= 0 && !pl.dead) {
            f.think = 0.25;
            let best = null;
            const direct = U.ang(f.x, f.y, pl.x, pl.y);
            const r0 = trace(f.x, f.y, direct, 0, pl);
            if (r0) best = direct;
            else if (T.bounces > 0) { for (let i = 0; i < 72; i++) { const a = (i / 72) * U.TAU; const r = trace(f.x, f.y, a, T.bounces, pl); if (r && (!best || Math.random() < 0.3)) { best = a; if (r.b <= 1) break; } } }
            f.aim = best;
            if (T.speed) {
              // pick a new wander goal
              if (!f.goal || U.dist(f.x, f.y, f.goal.x, f.goal.y) < 20 || Math.random() < 0.05) { let gx, gy, k = 0; do { gx = U.ri(1, GW - 2); gy = U.ri(1, GH - 2); k++; } while ((wall(gx, gy) || U.dist(gx * C, gy * C, pl.x, pl.y) < 200) && k < 30); f.goal = { x: (gx + 0.5) * C, y: (gy + 0.5) * C }; }
            }
          }
          if (f.aim !== null && f.aim !== undefined) { const d = U.angDiff(f.ta, f.aim); f.ta += U.clamp(d, -4 * dt, 4 * dt); if (Math.abs(d) < 0.06 && f.cd <= 0) { if (fire(f)) f.cd = T.fire * U.rand(0.8, 1.3); } }
          else f.ta += Math.sin(E.t + f.x) * dt;
          if (T.speed && f.goal) {
            // dodge incoming shells
            let dvx = 0, dvy = 0;
            for (const s of shells) { if (s.owner === f) continue; const dx = f.x - s.x, dy = f.y - s.y, d = Math.hypot(dx, dy); if (d < 130) { const along = (dx * s.vx + dy * s.vy) / (Math.hypot(s.vx, s.vy) * d); if (along > 0.7) { dvx += -s.vy / 3; dvy += s.vx / 3; } } }
            const ga = U.ang(f.x, f.y, f.goal.x, f.goal.y);
            const vx = Math.cos(ga) * T.speed + dvx, vy = Math.sin(ga) * T.speed + dvy;
            const ma = Math.atan2(vy, vx); f.a += U.clamp(U.angDiff(f.a, ma), -5 * dt, 5 * dt);
            const sp = Math.min(Math.hypot(vx, vy), T.speed * 1.4);
            const ox = f.x, oy = f.y;
            f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt; collideTank(f);
            if (U.dist(ox, oy, f.x, f.y) < sp * dt * 0.3) f.goal = null;
            f.tread += dt * 50;
            if (Math.random() < 0.2) marks.push({ x: f.x, y: f.y, a: f.a });
          }
        }
        // shells
        for (const s of shells) {
          if (s.dead) continue;
          s.trail.push([s.x, s.y]); if (s.trail.length > 10) s.trail.shift();
          for (let k = 0; k < 4 && !s.dead; k++) {
            const nx = s.x + (s.vx * dt) / 4, ny = s.y + (s.vy * dt) / 4;
            if (wallAt(nx, ny)) {
              const cx = Math.floor(nx / C), cy = Math.floor(ny / C);
              if (grid[cy] && grid[cy][cx] === 2) { grid[cy][cx] = 0; boom((cx + 0.5) * C, (cy + 0.5) * C, false); E.burst((cx + 0.5) * C, (cy + 0.5) * C, { n: 20, colors: ['#d6b588', '#a47148'], shape: 'square', speed: 200 }); s.dead = true; break; }
              if (s.bounces <= 0) { s.dead = true; boom(s.x, s.y, false); break; }
              s.bounces--;
              if (wallAt(nx, s.y)) s.vx = -s.vx; else s.vy = -s.vy;
              E.sfx('tick', 0.9, 0.5); E.burst(s.x, s.y, { n: 4, color: '#fde68a', speed: 90, size: 2 });
              continue;
            }
            s.x = nx; s.y = ny;
            for (const t of [pl, ...foes]) if (!t.dead && U.dist2(s.x, s.y, t.x, t.y) < 16 * 16 && !(t === s.owner && s.trail.length < 4)) { killTank(t); s.dead = true; break; }
          }
          if (!s.dead) for (const o of shells) if (o !== s && !o.dead && U.dist2(s.x, s.y, o.x, o.y) < 8 * 8) { boom((s.x + o.x) / 2, (s.y + o.y) / 2, false); s.dead = o.dead = true; break; }
        }
        shells = shells.filter((s) => !s.dead);
        if (marks.length > 600) marks.splice(0, marks.length - 600);
        if (state === 'play' && foes.every((f) => f.dead)) { state = 'clear'; stateT = 2.2; E.sfx('win'); E.score += 500 * level; E.pop(W / 2, H / 2, `MISSION CLEAR +${500 * level}`, { color: '#fde68a', size: 30, life: 2 }); if (level % 3 === 0) { lives++; E.stat('Lives', lives); } }
      },
      draw(g) {
        // floor
        g.fillStyle = '#e7d3ad'; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(160,120,70,.08)'; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if ((x + y) % 2) g.fillRect(x * C, y * C, C, C);
        for (const m of marks) {
          if (m.scorch) { const gr = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r); gr.addColorStop(0, 'rgba(40,30,20,.45)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2); continue; }
          g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.fillStyle = 'rgba(90,70,40,.16)'; g.fillRect(-2, -15, 4, 5); g.fillRect(-2, 10, 4, 5); g.restore();
        }
        // walls with 3D top
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const v = grid[y][x]; if (!v) continue;
          const px = x * C, py = y * C;
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + 6, py + 8, C, C);
          g.fillStyle = v === 2 ? '#b08457' : '#8a5a33'; g.fillRect(px, py + 8, C, C - 8);
          g.fillStyle = v === 2 ? '#d6b588' : '#b07a4a'; g.fillRect(px, py, C, C - 8);
          g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, C - 1, C - 9);
          if (v === 2) { g.strokeStyle = 'rgba(80,50,20,.35)'; g.beginPath(); g.moveTo(px + 6, py + 6); g.lineTo(px + C - 6, py + C - 14); g.moveTo(px + C - 6, py + 6); g.lineTo(px + 6, py + C - 14); g.stroke(); }
          else { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px + 4, py + 4, C - 8, 3); }
        }
        // aim line
        if (!pl.dead && state === 'play') { g.setLineDash([4, 8]); D.line(g, pl.x + Math.cos(pl.ta) * 26, pl.y + Math.sin(pl.ta) * 26, pl.x + Math.cos(pl.ta) * 120, pl.y + Math.sin(pl.ta) * 120, 'rgba(37,99,235,.35)', 2); g.setLineDash([]); }
        for (const f of foes) if (!f.dead) drawTank(g, f, TYPES[f.type].col, false);
        if (!pl.dead) drawTank(g, pl, '#2563eb', true);
        for (const s of shells) {
          g.lineCap = 'round';
          for (let i = 1; i < s.trail.length; i++) { g.strokeStyle = `rgba(120,113,108,${(i / s.trail.length) * 0.5})`; g.lineWidth = (i / s.trail.length) * 5; g.beginPath(); g.moveTo(s.trail[i - 1][0], s.trail[i - 1][1]); g.lineTo(s.trail[i][0], s.trail[i][1]); g.stroke(); }
          g.save(); g.translate(s.x, s.y); g.rotate(Math.atan2(s.vy, s.vx)); D.fillRR(g, -6, -3.5, 12, 7, 3.5, s.fast ? '#dc2626' : '#f5f5f4'); D.circle(g, 5, 0, 3.5, s.fast ? '#fca5a5' : '#e7e5e4'); g.restore();
        }
        if (E.ptr.type === 'mouse' && aimMouse && state === 'play') { const x = E.ptr.x, y = E.ptr.y; D.circle(g, x, y, 9, null, '#2563eb', 2); D.circle(g, x, y, 2, '#2563eb'); }
        D.vignette(g, W, H, 0.35, '60,40,10');
      },
    };
  },
});

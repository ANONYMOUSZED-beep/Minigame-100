MG.add({
  id: 'pixelquest', name: 'Pixel Quest', cat: 'Runner', color: '#f472b6', color2: '#38bdf8',
  desc: 'A tight precision platformer: coyote time, wall jumps, air-dash. Eight procedurally built stages, each solvable by design.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> run · <kbd>Space</kbd> / <kbd>Z</kbd> / <kbd>↑</kbd> jump (hold for height)', 'Jump while sliding down a wall to wall-jump', '<kbd>X</kbd> / <kbd>Shift</kbd> + direction to air-dash (refills on landing or at crystals)', 'Springs launch you · cracked blocks crumble · reach the flag'],
  pad: 'LRUDAB', padLabels: { A: 'JUMP', B: 'DASH' },
  make(E) {
    const T = 32, RH = 18, W = 960, H = 600, OY = 24;
    const TIPS = ['Run & jump to the flag', 'Mind the spikes', 'Wall-jump up the chimneys', 'Dash across the wide gaps', 'Springs & crumbling blocks', 'Everything at once', 'Longer, meaner', 'The final stretch'];
    let map, LW, level = 0, pl, cam = 0, deaths = 0, coinsGot = 0, coinsTotal = 0, lvlTime = 0, state, stateT, crumble = new Map(), crystals = [], springs = [], ghosts = [], flag;
    const at = (x, y) => (y < 0 ? '.' : x < 0 || x >= LW || y >= RH ? '#' : map[y][x]);
    const solid = (x, y) => { const c = at(x, y); return c === '#' || (c === 'C' && !(crumble.get(y * 999 + x) > 0.45)); };
    function gen() {
      level++;
      const d = level;
      LW = 50 + d * 14;
      map = U.grid(LW, RH, '.');
      const put = (x, y, c) => { if (x >= 0 && x < LW && y >= 0 && y < RH) map[y][x] = c; };
      const col = (x, top, c = '#') => { for (let y = top; y < RH; y++) put(x, y, c); };
      for (let x = 0; x < LW; x++) { put(x, 17, '#'); put(x, 16, '^'); }
      let x = 0, py = 13;
      for (let i = 0; i < 6; i++) col(x++, py);
      const coins = [];
      const kinds = ['hop'];
      if (d >= 2) kinds.push('hop', 'stairs', 'float');
      if (d >= 3) kinds.push('chimney');
      if (d >= 4) kinds.push('dash');
      if (d >= 5) kinds.push('spring', 'crumble');
      if (d >= 6) kinds.push('chimney', 'dash', 'float');
      let last = null;
      while (x < LW - 14) {
        let k = U.pick(kinds);
        if (k === last && k !== 'hop') k = 'hop';
        last = k;
        if (k === 'hop') {
          const gap = U.ri(2, Math.min(5, 2 + Math.floor(d / 2))), ny = U.clamp(py + U.ri(-3, 2), 5, 14), len = U.ri(3, 6);
          coins.push([x + (gap >> 1), Math.min(py, ny) - 3]);
          x += gap; py = ny; for (let i = 0; i < len; i++) col(x++, py);
        } else if (k === 'stairs') {
          for (let s = 0; s < 3; s++) { x += U.ri(2, 3); py = U.clamp(py - U.ri(1, 2), 5, 14); put(x, py, '#'); put(x + 1, py, '#'); if (s === 1) coins.push([x, py - 2]); x += 2; }
          x += 2; py = U.clamp(py + U.ri(0, 2), 5, 14); for (let i = 0; i < 4; i++) col(x++, py);
        } else if (k === 'float') {
          for (let s = 0; s < 3; s++) { x += U.ri(3, 4); py = U.clamp(py + U.ri(-2, 2), 6, 13); for (let i = 0; i < 3; i++) put(x + i, py, '#'); coins.push([x + 1, py - 2]); x += 3; }
          x += 2; for (let i = 0; i < 4; i++) col(x++, py);
        } else if (k === 'chimney') {
          if (py < 11) { py = U.clamp(py + 3, 5, 14); for (let i = 0; i < 3; i++) col(x++, py); }
          for (let i = 0; i < 4; i++) col(x++, py);
          const s = x, top = py - U.ri(5, 7);
          for (let y = 0; y <= py - 3; y++) put(s - 1, y, '#');
          for (let i = 0; i < 4; i++) col(s + i, py);
          col(s + 4, top); col(s + 5, top);
          coins.push([s + 2, top - 1]);
          x = s + 6; py = top; for (let i = 0; i < 3; i++) col(x++, py);
        } else if (k === 'dash') {
          const gap = U.ri(7, 8 + (d > 6 ? 2 : 0));
          coins.push([x + (gap >> 1), py - 2]);
          if (gap > 8) crystals.push({ x: x + (gap >> 1), y: py - 2, cd: 0 });
          x += gap; for (let i = 0; i < 4; i++) col(x++, py);
        } else if (k === 'spring') {
          put(x - 2, py - 1, 'S');
          const ny = Math.max(4, py - U.ri(6, 8));
          x += U.ri(2, 3); py = ny; for (let i = 0; i < 4; i++) col(x++, py);
          coins.push([x - 2, py - 2]);
        } else if (k === 'crumble') {
          const gap = U.ri(6, 9);
          for (let i = 0; i < gap; i++) put(x + i, py, 'C');
          coins.push([x + (gap >> 1), py - 2]);
          x += gap; for (let i = 0; i < 4; i++) col(x++, py);
        }
      }
      while (x < LW) col(x++, py);
      flag = { x: LW - 5, y: py - 1 };
      map.forEach((r, y) => r.forEach((c, xx) => { if (c === 'S') springs.push({ x: xx, y, t: 0 }); }));
      coinsTotal += coins.length;
      state = 'play'; lvlTime = 0; cam = 0;
      return coins.map(([cx, cy]) => ({ x: cx, y: cy, got: false }));
    }
    let coins = [];
    function startLevel() {
      crystals = []; springs = []; crumble = new Map();
      coins = gen();
      spawn();
      E.stat('Stage', `${level}/8`);
      E.banner(`STAGE ${level}`, TIPS[level - 1], { color: '#f472b6' });
    }
    function spawn() { pl = { x: 2 * T + 6, y: 11 * T, vx: 0, vy: 0, w: 18, h: 26, face: 1, ground: false, coyote: 0, buf: 0, dash: 1, dashT: 0, dvx: 0, dvy: 0, wall: 0, wallLock: 0, dead: false, scarf: [], sq: 0 }; for (let i = 0; i < 6; i++) pl.scarf.push([pl.x, pl.y]); }
    startLevel();
    E.stat('Deaths', 0);
    function rectHitsSolid(x, y, w, h) { const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 1) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 1) / T); for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true; return false; }
    function touchCrumble(x, y, w) { const ty = Math.floor((y + 1) / T); for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 1) / T); tx++) if (at(tx, ty) === 'C') { const k = ty * 999 + tx; if (!crumble.has(k)) { crumble.set(k, 0.001); E.sfx('tick', 0.6, 0.3); } } }
    function die() {
      if (pl.dead) return;
      pl.dead = true; deaths++; E.stat('Deaths', deaths);
      E.sfx('hurt'); E.shake(8); E.vibrate(120);
      E.burst(pl.x + pl.w / 2 - cam, pl.y + pl.h / 2 + OY, { n: 30, colors: ['#f472b6', '#fff', '#38bdf8'], speed: 280, shape: 'square', size: 3 });
      state = 'dead'; stateT = 0.6;
    }
    return {
      update(dt) {
        lvlTime += dt;
        for (const [k, v] of crumble) { const nv = v + dt; if (nv > 3.2) crumble.delete(k); else crumble.set(k, nv); }
        for (const c of crystals) c.cd = Math.max(0, c.cd - dt);
        for (const s of springs) s.t = Math.max(0, s.t - dt * 4);
        if (state === 'dead') { stateT -= dt; if (stateT <= 0) { spawn(); state = 'play'; crumble.clear(); } return; }
        if (state === 'win') { stateT -= dt; if (stateT <= 0) { if (level >= 8) { state = 'done'; E.score += 5000; E.over({ win: true, title: 'Quest Complete!', msg: `${coinsGot}/${coinsTotal} coins · ${deaths} deaths` }); } else startLevel(); } return; }
        const p = pl, ax = E.axis();
        const jumpHit = E.hit('A', 'U'), jumpHeld = E.down('A', 'U');
        if (jumpHit) p.buf = 0.12; else p.buf -= dt;
        p.coyote -= dt; p.wallLock -= dt;
        // dash
        if (E.hit('B') && p.dash > 0 && p.dashT <= 0) {
          let dx = ax.x, dy = ax.y; if (!dx && !dy) dx = p.face;
          const l = Math.hypot(dx, dy); p.dvx = (dx / l) * 640; p.dvy = (dy / l) * 640; p.dashT = 0.15; p.dash--;
          E.sfx('whoosh', 1.4); E.shake(3); E.flash('#38bdf8', 0.08);
        }
        if (p.dashT > 0) {
          p.dashT -= dt; p.vx = p.dvx; p.vy = p.dvy;
          if (Math.random() < 0.7) ghosts.push({ x: p.x, y: p.y, t: 0.25, face: p.face });
          if (p.dashT <= 0) { p.vx *= 0.55; p.vy = p.dvy < 0 ? p.dvy * 0.35 : p.vy * 0.4; }
        } else {
          const accel = p.ground ? 2600 : 1600, maxv = 240;
          if (ax.x && p.wallLock <= 0) { p.vx += ax.x * accel * dt; p.face = ax.x; }
          else if (!ax.x) { const fr = (p.ground ? 2600 : 900) * dt; p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr; }
          p.vx = U.clamp(p.vx, -maxv, maxv);
          const rising = p.vy < 0, g = rising ? (jumpHeld ? 1150 : 2600) : 2000;
          p.vy = Math.min(p.vy + g * dt, p.wall && ax.x === p.wall && p.vy > 0 ? 120 : 820);
        }
        // wall detection
        p.wall = 0;
        if (!p.ground) { if (rectHitsSolid(p.x - 2, p.y + 4, 2, p.h - 8)) p.wall = -1; else if (rectHitsSolid(p.x + p.w, p.y + 4, 2, p.h - 8)) p.wall = 1; }
        // jump
        if (p.buf > 0) {
          if (p.ground || p.coyote > 0) { p.vy = -600; p.ground = false; p.coyote = 0; p.buf = 0; p.sq = 1; E.sfx('jump', 1.1, 0.5); E.burst(p.x + p.w / 2 - cam, p.y + p.h + OY, { n: 6, color: '#e2e8f0', speed: 80, angle: Math.PI / 2, spread: 2.5, glow: false, size: 2 }); }
          else if (p.wall) { p.vy = -560; p.vx = -p.wall * 290; p.face = -p.wall; p.wallLock = 0.14; p.buf = 0; p.sq = 1; E.sfx('jump', 1.3, 0.5); E.burst(p.x + (p.wall > 0 ? p.w : 0) - cam, p.y + p.h / 2 + OY, { n: 8, color: '#e2e8f0', speed: 100, glow: false, size: 2 }); }
        }
        // move & collide
        const wasGround = p.ground;
        p.x += p.vx * dt;
        if (rectHitsSolid(p.x, p.y, p.w, p.h)) { if (p.vx > 0) p.x = Math.floor((p.x + p.w) / T) * T - p.w - 0.01; else if (p.vx < 0) p.x = Math.floor(p.x / T + 1) * T + 0.01; p.vx = 0; }
        p.y += p.vy * dt; p.ground = false;
        if (rectHitsSolid(p.x, p.y, p.w, p.h)) {
          if (p.vy > 0) { p.y = Math.floor((p.y + p.h) / T) * T - p.h - 0.01; p.ground = true; if (!wasGround && p.vy > 300) { p.sq = -0.8; E.sfx('thud', 1.6, 0.2); } }
          else p.y = Math.floor(p.y / T + 1) * T + 0.01;
          p.vy = 0;
        }
        p.x = U.clamp(p.x, 0, LW * T - p.w);
        if (p.ground) { p.coyote = 0.09; p.dash = 1; touchCrumble(p.x, p.y + p.h, p.w); }
        p.sq = U.damp(p.sq, 0, 12, dt);
        // hazards & pickups
        const cx0 = Math.floor(p.x / T), cx1 = Math.floor((p.x + p.w - 1) / T), cy0 = Math.floor(p.y / T), cy1 = Math.floor((p.y + p.h - 1) / T);
        for (let ty = cy0; ty <= cy1; ty++) for (let tx = cx0; tx <= cx1; tx++) {
          const c = at(tx, ty);
          if (c === '^' && p.y + p.h > ty * T + 14) die();
          if (c === 'S' && p.vy >= 0 && p.y + p.h > ty * T + 16) { p.vy = -1050; p.dash = 1; springs.forEach((s) => { if (s.x === tx && s.y === ty) s.t = 1; }); E.sfx('bounce', 0.7); E.sfx('power', 1.5, 0.4); }
        }
        if (p.y > RH * T) die();
        for (const c of coins) if (!c.got && U.rectsHit({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: c.x * T + 8, y: c.y * T + 8, w: 16, h: 16 })) { c.got = true; coinsGot++; E.score += 100; E.sfx('coin', 1.2 + Math.random() * 0.1); E.burst(c.x * T + 16 - cam, c.y * T + 16 + OY, { n: 12, colors: ['#facc15', '#fff'], speed: 140 }); E.stat('Coins', coinsGot); }
        for (const c of crystals) if (c.cd <= 0 && U.dist(p.x + p.w / 2, p.y + p.h / 2, c.x * T + 16, c.y * T + 16) < 26 && p.dash < 1) { p.dash = 1; c.cd = 2.5; E.sfx('power', 1.8, 0.5); E.ring(c.x * T + 16 - cam, c.y * T + 16 + OY, { color: '#38bdf8', r: 40 }); }
        if (p.x > flag.x * T - 10 && p.y > (flag.y - 4) * T) {
          state = 'win'; stateT = 1.8; const tb = Math.max(0, Math.round(1500 - lvlTime * 20)); E.score += 1000 + tb;
          E.sfx('win'); E.banner('STAGE CLEAR', `+${1000 + tb}`, { color: '#facc15' });
          for (let i = 0; i < 5; i++) E.after(i * 0.15, () => E.burst(flag.x * T - cam + U.rand(-40, 40), (flag.y - 3) * T + OY, { n: 20, colors: ['#f472b6', '#38bdf8', '#facc15'], speed: 250 }));
        }
        // scarf physics
        const anchor = [p.x + p.w / 2 - p.face * 4, p.y + 10];
        p.scarf[0] = anchor;
        for (let i = 1; i < p.scarf.length; i++) { const [px, py] = p.scarf[i - 1]; let [sx, sy] = p.scarf[i]; sy += 30 * dt; const d = U.dist(px, py, sx, sy) || 1; sx = px + ((sx - px) / d) * 5; sy = py + ((sy - py) / d) * 5; p.scarf[i] = [sx - p.face * 0.6, sy]; }
        for (let i = ghosts.length - 1; i >= 0; i--) { ghosts[i].t -= dt; if (ghosts[i].t <= 0) ghosts.splice(i, 1); }
        cam = U.damp(cam, U.clamp(p.x - W * 0.38, 0, LW * T - W), 8, dt);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#1e1b4b', '#be185d');
        D.glow(g, 760, 180, 300, '#fbcfe8', 0.25);
        for (let layer = 0; layer < 3; layer++) {
          g.fillStyle = ['#3b1361', '#2e1150', '#1f0a3a'][layer];
          const off = cam * (0.1 + layer * 0.15), base = 380 + layer * 60;
          g.beginPath(); g.moveTo(0, H);
          for (let x = -40; x <= W + 40; x += 40) { const wx = x + off; g.lineTo(x - (off % 40), base - Math.abs(Math.sin(wx * 0.004 + layer)) * (120 - layer * 30) - Math.sin(wx * 0.02) * 10); }
          g.lineTo(W, H); g.fill();
        }
        g.save(); g.translate(-Math.round(cam), OY);
        const x0 = Math.max(0, Math.floor(cam / T) - 1), x1 = Math.min(LW, x0 + Math.ceil(W / T) + 3);
        for (let y = 0; y < RH; y++) for (let x = x0; x < x1; x++) {
          const c = map[y][x], px = x * T, py = y * T;
          if (c === '#') {
            const top = at(x, y - 1) !== '#';
            g.fillStyle = (x + y) % 2 ? '#4a2c5e' : '#44285a'; g.fillRect(px, py, T, T);
            g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(px + ((x * 7 + y * 3) % 20), py + ((x * 3 + y * 11) % 22), 5, 4);
            if (top) { g.fillStyle = '#34d399'; g.fillRect(px, py, T, 7); g.fillStyle = '#10b981'; g.fillRect(px, py + 7, T, 3); g.fillStyle = '#6ee7b7'; g.fillRect(px + 3, py + 1, T - 6, 2); }
          } else if (c === '^') {
            g.fillStyle = '#cbd5e1';
            for (let k = 0; k < 2; k++) D.poly(g, [[px + k * 16, py + T], [px + k * 16 + 8, py + 12], [px + k * 16 + 16, py + T]], '#e2e8f0', '#94a3b8', 1);
          } else if (c === 'C') {
            const v = crumble.get(y * 999 + x) || 0;
            if (v > 0.45) continue;
            const sh = v > 0 ? U.rand(-2, 2) : 0;
            g.fillStyle = '#a16207'; g.fillRect(px + sh, py, T, T * 0.6);
            g.strokeStyle = '#713f12'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 8 + sh, py); g.lineTo(px + 14 + sh, py + 10); g.lineTo(px + 10 + sh, py + 18); g.moveTo(px + 24 + sh, py); g.lineTo(px + 20 + sh, py + 12); g.stroke();
          } else if (c === 'S') {
            const s = springs.find((q) => q.x === x && q.y === y), ext = s ? s.t * 10 : 0;
            D.fillRR(g, px + 4, py + T - 8, T - 8, 8, 2, '#64748b');
            g.strokeStyle = '#facc15'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 4; k++) g.lineTo(px + (k % 2 ? 22 : 10), py + T - 8 - k * (3 + ext / 4)); g.stroke();
            D.fillRR(g, px + 4, py + T - 14 - 12 - ext, T - 8, 6, 3, '#ef4444');
          }
        }
        for (const c of coins) if (!c.got) { const sx = Math.abs(Math.cos(t * 4 + c.x)); D.glow(g, c.x * T + 16, c.y * T + 16, 20, '#facc15', 0.5); g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(c.x * T + 16, c.y * T + 16, 9 * sx + 1, 10, 0, 0, U.TAU); g.fill(); g.fillStyle = '#fde68a'; g.fillRect(c.x * T + 15, c.y * T + 10, 2, 12 * (sx > 0.3 ? 1 : 0)); }
        for (const c of crystals) { const a = c.cd > 0 ? 0.25 : 1, y = c.y * T + 16 + Math.sin(t * 3) * 4; g.globalAlpha = a; D.glow(g, c.x * T + 16, y, 34, '#38bdf8', 0.7); D.poly(g, [[c.x * T + 16, y - 13], [c.x * T + 26, y], [c.x * T + 16, y + 13], [c.x * T + 6, y]], '#7dd3fc', '#e0f2fe', 2); g.globalAlpha = 1; }
        // flag
        const fx = flag.x * T + 16, fy = (flag.y + 1) * T;
        D.fillRR(g, fx - 2, fy - 130, 4, 130, 2, '#e2e8f0');
        g.fillStyle = '#f472b6'; g.beginPath(); g.moveTo(fx + 2, fy - 128); for (let k = 0; k <= 8; k++) g.lineTo(fx + 2 + k * 6, fy - 128 + Math.sin(t * 6 + k * 0.8) * 4 + (k === 8 ? 16 : 0)); g.lineTo(fx + 2, fy - 96); g.fill();
        D.glow(g, fx, fy - 110, 70, '#f472b6', 0.3);
        // player
        for (const gh of ghosts) { g.globalAlpha = gh.t * 2; D.fillRR(g, gh.x, gh.y, 18, 26, 5, '#38bdf8'); g.globalAlpha = 1; }
        if (!pl.dead) {
          const p = pl;
          g.strokeStyle = p.dash ? '#f472b6' : '#64748b'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); p.scarf.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
          g.save(); g.translate(p.x + p.w / 2, p.y + p.h);
          const sx = 1 + p.sq * -0.18, sy = 1 + p.sq * 0.22; g.scale(sx * p.face, sy);
          D.fillRR(g, -9, -26, 18, 26, 6, '#f8fafc');
          D.fillRR(g, -9, -26, 18, 9, 5, p.dash ? '#f472b6' : '#64748b');
          D.circle(g, 4, -14, 2.4, '#1e1b4b'); D.circle(g, -2, -14, 2.4, '#1e1b4b');
          if (p.wall && !p.ground && p.vy > 0) { g.fillStyle = '#e2e8f0'; g.fillRect(8, -18, 3, 10); }
          g.restore();
        }
        g.restore();
        // HUD
        D.fillRR(g, 12, 4, 180, 16, 8, 'rgba(0,0,0,.35)');
        const got = coins.filter((c) => c.got).length;
        D.text(g, `STAGE ${level}/8   ●  ${got}/${coins.length}`, 22, 12, { size: 11, font: 'mono', align: 'left', color: '#fde68a' });
        D.fillRR(g, W - 200, 8, 188, 8, 4, 'rgba(255,255,255,.12)'); D.fillRR(g, W - 200, 8, 188 * U.clamp(pl.x / (flag.x * T), 0, 1), 8, 4, '#f472b6');
      },
    };
  },
});

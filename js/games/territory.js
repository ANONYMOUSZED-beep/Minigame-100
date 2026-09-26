MG.add({
  id: 'territory', name: 'Territory', cat: 'Arcade', color: '#34d399', color2: '#f472b6',
  desc: 'Qix-style land grab. Cut across the void, seal off space the orbs can\'t reach, and reveal the art beneath.',
  how: ['Move with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd> or swipe', 'Leave the safe zone to draw a line — close it to claim territory', 'Orbs destroy unfinished lines · crawlers patrol your land', 'Claim 75% to clear the level'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600, C = 10, GW = 96, GH = 56, TOP = 40;
    const SEA = 0, LAND = 1, TRAIL = 2;
    let grid, level = 0, pl, balls, crawlers, lives = 3, pct = 0, art, reveal, moveT = 0, dir = null, pending = null, state, stateT, trailCells = [];
    const idx = (x, y) => y * GW + x;
    const hsl2rgb = (h, s, l) => { const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; };
    function makeArt() {
      const w = 240, h = 140, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
      const hue = (level * 67) % 360, s1 = U.rand(0.02, 0.05), s2 = U.rand(0.02, 0.06), s3 = U.rand(0.01, 0.04);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = Math.sin(i * s1 + level) + Math.sin(j * s2) + Math.sin((i + j) * s3) + Math.sin(Math.hypot(i - w / 2, j - h / 2) * 0.08);
        const hh = (hue + v * 40 + 360) % 360, l = 45 + v * 9;
        const [r, g, b] = hsl2rgb(hh / 360, 0.8, l / 100);
        const k = (j * w + i) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      const big = document.createElement('canvas'); big.width = W; big.height = GH * C;
      const bx = big.getContext('2d'); bx.imageSmoothingEnabled = true; bx.drawImage(c, 0, 0, W, GH * C);
      // overlay facets
      bx.globalAlpha = 0.12; bx.strokeStyle = '#fff';
      for (let k = 0; k < 40; k++) { bx.beginPath(); bx.moveTo(U.rand(W), U.rand(GH * C)); bx.lineTo(U.rand(W), U.rand(GH * C)); bx.stroke(); }
      return big;
    }
    function newLevel() {
      level++; E.stat('Level', level);
      grid = new Uint8Array(GW * GH);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (x < 2 || y < 2 || x >= GW - 2 || y >= GH - 2) grid[idx(x, y)] = LAND;
      art = makeArt();
      reveal = document.createElement('canvas'); reveal.width = W; reveal.height = GH * C;
      paint(U.range(GW * GH).filter((i) => grid[i] === LAND));
      pl = { x: GW / 2 | 0, y: 0, px: GW / 2, py: 0, inSea: false };
      balls = U.range(1 + level).map(() => ({ x: U.rand(10, GW - 10), y: U.rand(10, GH - 10), vx: U.pick([-1, 1]) * (11 + level), vy: U.pick([-1, 1]) * (11 + level) }));
      crawlers = level > 1 ? U.range(Math.min(level - 1, 3)).map(() => ({ x: U.ri(0, 1) ? 1 : GW - 2, y: GH - 1, vx: U.pick([-1, 1]) * 9, vy: -9, fx: 0, fy: 0 })) : [];
      state = 'play'; dir = null; pending = null; trailCells = []; calcPct();
      E.banner('LEVEL ' + level, 'Claim 75%');
    }
    function paint(cells) { const g = reveal.getContext('2d'); for (const i of cells) { const x = (i % GW) * C, y = ((i / GW) | 0) * C; g.drawImage(art, x, y, C, C, x, y, C, C); } }
    function calcPct() { let n = 0, tot = 0; for (let y = 2; y < GH - 2; y++) for (let x = 2; x < GW - 2; x++) { tot++; if (grid[idx(x, y)] === LAND) n++; } pct = n / tot; E.stat('Claimed', Math.floor(pct * 100) + '%'); }
    newLevel();
    E.stat('Lives', lives);
    function claim() {
      // trail becomes land; flood from each ball; unreached sea becomes land
      for (const i of trailCells) grid[i] = LAND;
      const reach = new Uint8Array(GW * GH), st = [];
      for (const b of balls) { const i = idx(U.clamp(Math.floor(b.x), 0, GW - 1), U.clamp(Math.floor(b.y), 0, GH - 1)); if (grid[i] === SEA && !reach[i]) { reach[i] = 1; st.push(i); } }
      while (st.length) {
        const i = st.pop(), x = i % GW;
        for (const n of [x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1, i - GW, i + GW]) if (n >= 0 && n < GW * GH && grid[n] === SEA && !reach[n]) { reach[n] = 1; st.push(n); }
      }
      const newCells = [...trailCells];
      for (let i = 0; i < GW * GH; i++) if (grid[i] === SEA && !reach[i]) { grid[i] = LAND; newCells.push(i); }
      paint(newCells);
      const before = pct; calcPct();
      const gained = Math.round((pct - before) * 10000);
      E.score += gained + (gained > 1500 ? gained : 0);
      const cx = (pl.x + 0.5) * C, cy = TOP + (pl.y + 0.5) * C;
      E.pop(cx, cy - 20, `+${Math.round((pct - before) * 100)}%`, { color: '#34d399', size: gained > 1500 ? 30 : 20 });
      E.sfx(gained > 1500 ? 'power' : 'match'); if (gained > 1500) { E.flash('#34d399', 0.2); E.shake(6); }
      for (let k = 0; k < Math.min(newCells.length, 60); k++) { const i = U.pick(newCells); E.burst((i % GW) * C + 5, TOP + ((i / GW) | 0) * C + 5, { n: 2, colors: ['#fff', '#34d399'], speed: 80, life: 0.6, size: 3 }); }
      trailCells = [];
      if (pct >= 0.75) { state = 'clear'; stateT = 2.2; const bonus = Math.round((pct - 0.75) * 20000) + 1000 * level; E.score += bonus; E.sfx('win'); E.pop(W / 2, H / 2, `LEVEL CLEAR +${bonus}`, { color: '#fde68a', size: 32, life: 2 }); }
    }
    function die() {
      lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('hurt'); E.shake(12); E.flash('#f43f5e', 0.3); E.vibrate(160);
      E.burst((pl.x + 0.5) * C, TOP + (pl.y + 0.5) * C, { n: 40, colors: ['#f43f5e', '#fff'], speed: 300 });
      for (const i of trailCells) grid[i] = SEA; trailCells = [];
      state = 'dead'; stateT = 1.4;
    }
    return {
      update(dt) {
        if (state === 'clear') { stateT -= dt; if (stateT <= 0) newLevel(); return; }
        if (state === 'dead') {
          stateT -= dt;
          if (stateT <= 0) { if (lives <= 0) { state = 'over'; E.over({ msg: `Level ${level} · ${Math.floor(pct * 100)}% claimed` }); return; } pl = { x: GW / 2 | 0, y: 0, inSea: false }; dir = null; state = 'play'; }
          return;
        }
        for (const k of ['L', 'R', 'U', 'D']) if (E.hit(k) || E.swipe === k) pending = k;
        const held = ['L', 'R', 'U', 'D'].find((k) => E.down(k));
        if (E.ptr.down) { const dx = E.ptr.x - (pl.x + 0.5) * C, dy = E.ptr.y - (TOP + (pl.y + 0.5) * C); if (Math.hypot(dx, dy) > 16) pending = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U'; }
        moveT -= dt;
        if (moveT <= 0) {
          moveT = 1 / 26;
          let d = held || pending || (pl.inSea ? dir : null);
          if (pl.inSea && dir && d && ({ L: 'R', R: 'L', U: 'D', D: 'U' })[d] === dir) d = dir; // no reversing into trail
          pending = null;
          if (d) {
            dir = d;
            const nx = U.clamp(pl.x + (d === 'L' ? -1 : d === 'R' ? 1 : 0), 0, GW - 1), ny = U.clamp(pl.y + (d === 'U' ? -1 : d === 'D' ? 1 : 0), 0, GH - 1);
            const c = grid[idx(nx, ny)];
            if (c === TRAIL) { die(); return; }
            pl.x = nx; pl.y = ny;
            if (c === SEA) { grid[idx(nx, ny)] = TRAIL; trailCells.push(idx(nx, ny)); if (!pl.inSea) E.sfx('blip', 1.2, 0.4); pl.inSea = true; }
            else if (pl.inSea) { pl.inSea = false; dir = null; claim(); }
          }
        }
        // balls
        for (const b of balls) {
          for (const axis of ['x', 'y']) {
            const v = axis === 'x' ? b.vx : b.vy, n = b[axis] + v * dt;
            const tx = axis === 'x' ? Math.floor(n + Math.sign(v) * 0.5) : Math.floor(b.x), ty = axis === 'y' ? Math.floor(n + Math.sign(v) * 0.5) : Math.floor(b.y);
            const c = grid[idx(U.clamp(tx, 0, GW - 1), U.clamp(ty, 0, GH - 1))];
            if (c === TRAIL) { die(); return; }
            if (c === LAND) { if (axis === 'x') b.vx = -b.vx; else b.vy = -b.vy; E.sfx('tick', 0.8 + Math.random() * 0.4, 0.15); }
            else b[axis] = n;
          }
          if (pl.inSea && Math.abs(b.x - (pl.x + 0.5)) < 1 && Math.abs(b.y - (pl.y + 0.5)) < 1) { die(); return; }
        }
        for (const cr of crawlers) {
          for (const axis of ['x', 'y']) {
            const v = axis === 'x' ? cr.vx : cr.vy, n = cr[axis] + v * dt;
            const tx = axis === 'x' ? Math.floor(n + Math.sign(v) * 0.5) : Math.floor(cr.x), ty = axis === 'y' ? Math.floor(n + Math.sign(v) * 0.5) : Math.floor(cr.y);
            const out = tx < 0 || ty < 0 || tx >= GW || ty >= GH;
            const c = out ? SEA : grid[idx(tx, ty)];
            if (c !== LAND) { if (axis === 'x') cr.vx = -cr.vx; else cr.vy = -cr.vy; } else cr[axis] = n;
          }
          if (Math.abs(cr.x - (pl.x + 0.5)) < 1 && Math.abs(cr.y - (pl.y + 0.5)) < 1) { die(); return; }
        }
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H);
        // sea shimmer
        g.save(); g.translate(0, TOP);
        const sg = g.createLinearGradient(0, 0, W, GH * C); sg.addColorStop(0, '#0b1026'); sg.addColorStop(1, '#170b26'); g.fillStyle = sg; g.fillRect(0, 0, W, GH * C);
        g.strokeStyle = 'rgba(52,211,153,.05)';
        for (let y = 0; y < GH * C; y += 20) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + t * 2 + y) * 4); g.stroke(); }
        g.drawImage(reveal, 0, 0);
        // land edges glow: draw outline where land meets sea (cheap: every cell check limited)
        g.fillStyle = 'rgba(255,255,255,.55)';
        for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) { const i = idx(x, y); if (grid[i] === LAND && (grid[i - 1] === SEA || grid[i + 1] === SEA || grid[i - GW] === SEA || grid[i + GW] === SEA)) g.fillRect(x * C + 3, y * C + 3, 4, 4); }
        // trail
        for (const i of trailCells) { const x = (i % GW) * C, y = ((i / GW) | 0) * C; g.fillStyle = '#fde68a'; g.fillRect(x + 1, y + 1, C - 2, C - 2); }
        for (let k = 0; k < trailCells.length; k += 4) { const i = trailCells[k]; D.glow(g, (i % GW) * C + 5, ((i / GW) | 0) * C + 5, 18, '#fbbf24', 0.35); }
        for (const b of balls) { D.glow(g, b.x * C, b.y * C, 36, '#f472b6', 0.8); D.orb(g, b.x * C, b.y * C, 8, '#f472b6'); }
        for (const cr of crawlers) { g.save(); g.translate(cr.x * C, cr.y * C); g.rotate(t * 6); D.glow(g, 0, 0, 30, '#f43f5e', 0.7); D.star(g, 0, 0, 9, 4, 4, 0, '#f43f5e', '#fff'); g.restore(); }
        if (state !== 'dead') {
          const px = (pl.x + 0.5) * C, py = (pl.y + 0.5) * C;
          D.glow(g, px, py, 40, '#34d399', 0.9);
          D.fillRR(g, px - 7, py - 7, 14, 14, 3, '#ecfdf5'); D.strokeRR(g, px - 7, py - 7, 14, 14, 3, '#34d399', 2.5);
        }
        g.restore();
        // header
        D.fillRR(g, 12, 10, 300, 20, 10, 'rgba(255,255,255,.08)');
        D.fillRR(g, 12, 10, 300 * Math.min(1, pct / 0.75), 20, 10, pct >= 0.75 ? '#fde68a' : '#34d399');
        D.text(g, `${Math.floor(pct * 100)}% / 75%`, 162, 20, { size: 13, font: 'mono', color: '#04120c' });
        for (let i = 0; i < lives; i++) D.fillRR(g, W - 30 - i * 24, 12, 16, 16, 3, '#34d399');
      },
    };
  },
});

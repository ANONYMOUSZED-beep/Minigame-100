MG.add({
  id: 'g2048', name: '2048', cat: 'Puzzle', color: '#f59e0b', color2: '#a855f7',
  desc: 'Slide, merge, repeat. The cult number puzzle with buttery tile animation and a glow that grows with every doubling.',
  how: ['Slide all tiles with <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> / <kbd>WASD</kbd> or swipe', 'Equal tiles that collide merge into one', 'Reach the 2048 tile — then keep going', 'No moves left and it\'s over · <kbd>U</kbd> undoes one move (3 per game)'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600, N = 4, CS = 112, GAP = 14, BS = N * CS + (N + 1) * GAP, BX = (W - BS) / 2, BY = (H - BS) / 2 + 12;
    const PAL = { 2: '#334155', 4: '#475569', 8: '#f97316', 16: '#fb7185', 32: '#f43f5e', 64: '#dc2626', 128: '#facc15', 256: '#eab308', 512: '#84cc16', 1024: '#22d3ee', 2048: '#a855f7', 4096: '#ec4899', 8192: '#f0abfc' };
    let tiles = [], nid = 1, anim = 0, won = false, over = false, moves = 0, undos = 3, hist = [], T = 0, bestTile = 2, shakeB = 0;
    const cell = (x, y) => [BX + GAP + x * (CS + GAP), BY + GAP + y * (CS + GAP)];
    function spawn() {
      const free = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!tiles.some((t) => !t.dead && t.x === x && t.y === y)) free.push([x, y]);
      if (!free.length) return;
      const [x, y] = U.pick(free);
      tiles.push({ id: nid++, v: Math.random() < 0.9 ? 2 : 4, x, y, px: x, py: y, born: 0.18, pop: 0 });
    }
    spawn(); spawn();
    const snap = () => tiles.filter((t) => !t.dead).map((t) => ({ v: t.v, x: t.x, y: t.y }));
    function canMove() {
      const g = U.grid(N, N, 0); for (const t of tiles) if (!t.dead) g[t.y][t.x] = t.v;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!g[y][x]) return true; if (x < N - 1 && g[y][x] === g[y][x + 1]) return true; if (y < N - 1 && g[y][x] === g[y + 1][x]) return true; }
      return false;
    }
    function move(dx, dy) {
      if (anim > 0) finish();
      const before = snap(), sc = E.score;
      const live = tiles.filter((t) => !t.dead);
      const at = (x, y) => live.find((t) => t.x === x && t.y === y && !t.gone);
      const xs = U.range(N), ys = U.range(N);
      if (dx > 0) xs.reverse(); if (dy > 0) ys.reverse();
      let moved = false, gained = 0;
      for (const t of live) { t.px = t.x; t.py = t.y; t.merged = false; }
      for (const y of ys) for (const x of xs) {
        const t = at(x, y); if (!t) continue;
        let nx = x, ny = y;
        while (true) {
          const tx = nx + dx, ty = ny + dy;
          if (tx < 0 || ty < 0 || tx >= N || ty >= N) break;
          const o = at(tx, ty);
          if (!o) { nx = tx; ny = ty; continue; }
          if (o.v === t.v && !o.merged && !o.into) { t.x = tx; t.y = ty; t.gone = true; t.into = o; o.merged = true; o.v *= 2; o.pop = 1; gained += o.v; moved = true; }
          break;
        }
        if (!t.gone && (nx !== x || ny !== y)) { t.x = nx; t.y = ny; moved = true; }
      }
      if (!moved) { shakeB = 0.2; E.sfx('tick', 0.5, 0.4); return; }
      hist.push({ tiles: before, score: sc }); if (hist.length > 10) hist.shift();
      moves++; anim = 0.11;
      E.sfx('swish', 1.3, 0.35);
      if (gained) {
        E.score += gained;
        const top = Math.max(...live.filter((t) => t.merged).map((t) => t.v));
        E.sfx('pop', 0.7 + Math.log2(top) * 0.06); if (top >= 128) E.sfx('coin', 0.6 + Math.log2(top) * 0.05, 0.5);
        E.pop(BX + BS + 70, BY + 40, `+${gained}`, { color: '#fde68a', size: 22 });
      }
    }
    function finish() {
      tiles = tiles.filter((t) => !t.gone);
      for (const t of tiles) { t.px = t.x; t.py = t.y; t.into = null; }
      anim = 0;
    }
    function afterMove() {
      spawn();
      const top = Math.max(...tiles.map((t) => t.v));
      if (top > bestTile) {
        bestTile = top; E.stat('Best tile', top);
        const t = tiles.find((q) => q.v === top), [x, y] = cell(t.x, t.y);
        if (top >= 128) E.burst(x + CS / 2, y + CS / 2, { n: 24, colors: [PAL[top] || '#fff', '#fff'], speed: 260 });
        if (top === 2048 && !won) { won = true; E.sfx('win'); E.flash('#a855f7', 0.4); E.banner('2048!', 'You did it — keep going for more', { color: '#a855f7', life: 2.2 }); }
      }
      if (!canMove()) { over = true; E.sfx('lose'); E.after(0.8, () => E.over({ title: 'No Moves Left', msg: `Best tile ${bestTile} · ${moves} moves` })); }
    }
    E.stat('Best tile', 2); E.stat('Undo', undos);
    return {
      update(dt) {
        T += dt; shakeB = Math.max(0, shakeB - dt);
        for (const t of tiles) { t.born = Math.max(0, t.born - dt); t.pop = Math.max(0, t.pop - dt * 5); }
        if (anim > 0) { anim -= dt; if (anim <= 0) { finish(); afterMove(); } return; }
        if (over) return;
        let d = null;
        if (E.hit('L') || E.swipe === 'L') d = [-1, 0]; else if (E.hit('R') || E.swipe === 'R') d = [1, 0]; else if (E.hit('U') || E.swipe === 'U') d = [0, -1]; else if (E.hit('D') || E.swipe === 'D') d = [0, 1];
        if (d) move(d[0], d[1]);
        if (E.hit('KeyU') && undos > 0 && hist.length) {
          const h = hist.pop(); undos--; E.stat('Undo', undos);
          tiles = h.tiles.map((t) => ({ id: nid++, v: t.v, x: t.x, y: t.y, px: t.x, py: t.y, born: 0, pop: 0 })); E.score = h.score;
          E.sfx('whoosh', 0.8, 0.5);
        }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1c1433', '#07050d');
        for (let i = 0; i < 5; i++) D.glow(g, (i * 263 + t * 12) % (W + 200) - 100, 120 + ((i * 181) % 380), 160, i % 2 ? '#a855f7' : '#f59e0b', 0.07);
        const sx = Math.sin(shakeB * 90) * 6 * shakeB * 5;
        g.save(); g.translate(sx, 0);
        D.shadow(g, W / 2, BY + BS + 12, BS * 0.5, 14, 0.5);
        D.fillRR(g, BX, BY, BS, BS, 18, '#1e1b2e'); D.strokeRR(g, BX, BY, BS, BS, 18, 'rgba(255,255,255,.08)', 2);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [cx, cy] = cell(x, y); D.fillRR(g, cx, cy, CS, CS, 12, 'rgba(255,255,255,.045)'); }
        const k = anim > 0 ? U.ease.outCubic(1 - anim / 0.11) : 1;
        const order = tiles.slice().sort((a, b) => (a.gone ? 0 : 1) - (b.gone ? 0 : 1));
        for (const tl of order) {
          const fx = U.lerp(tl.px, tl.x, k), fy = U.lerp(tl.py, tl.y, k);
          const [x, y] = cell(fx, fy);
          const shownV = tl.merged && anim > 0 ? tl.v / 2 : tl.v;
          const born = tl.born > 0 ? 1 - U.ease.outBack(1 - tl.born / 0.18) : 0;
          const sc = (1 - born) * (1 + Math.sin(tl.pop * Math.PI) * 0.14);
          if (sc <= 0.01) continue;
          const col = PAL[shownV] || '#f0abfc';
          g.save(); g.translate(x + CS / 2, y + CS / 2); g.scale(sc, sc);
          if (shownV >= 128) D.glow(g, 0, 0, CS * (0.9 + Math.log2(shownV) * 0.04), col, 0.35 + 0.1 * Math.sin(t * 3 + tl.id));
          D.tile(g, -CS / 2, -CS / 2, CS, CS, 12, col, 6);
          const digits = String(shownV).length;
          D.text(g, shownV, 0, -3, { size: digits <= 2 ? 48 : digits === 3 ? 40 : 32, color: shownV <= 4 ? '#e2e8f0' : '#fff', shadow: 'rgba(0,0,0,.25)' });
          g.restore();
        }
        g.restore();
        // side panels
        D.text(g, '2048', BX / 2, BY + 40, { size: 54, color: '#f59e0b', glow: '#f59e0b', blur: 16 });
        D.text(g, 'join the numbers', BX / 2, BY + 80, { size: 13, font: 'mono', color: 'rgba(255,255,255,.4)' });
        D.text(g, `MOVES ${moves}`, BX / 2, BY + 150, { size: 14, font: 'mono', color: 'rgba(255,255,255,.55)' });
        D.text(g, `UNDO ×${undos}  [U]`, BX / 2, BY + 176, { size: 14, font: 'mono', color: 'rgba(255,255,255,.55)' });
        D.text(g, 'BEST TILE', BX + BS + 110, BY + 110, { size: 13, font: 'mono', color: 'rgba(255,255,255,.4)' });
        D.tile(g, BX + BS + 70, BY + 128, 80, 80, 12, PAL[bestTile] || '#f0abfc', 5);
        D.text(g, bestTile, BX + BS + 110, BY + 164, { size: String(bestTile).length > 3 ? 22 : 28, color: '#fff' });
      },
    };
  },
});

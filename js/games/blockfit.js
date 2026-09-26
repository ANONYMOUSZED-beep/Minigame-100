MG.add({
  id: 'blockfit', name: 'Block Fit', cat: 'Puzzle', color: '#fb923c', color2: '#22d3ee',
  desc: 'Drag pieces onto a 10×10 grid. Complete rows or columns to clear them — plan space for whatever comes next.',
  how: ['Drag a piece from the tray onto the grid', 'Fill a full row or column to clear it · clearing several at once scores a combo', 'You get three pieces at a time', 'Keys: <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> pick, arrows move, <kbd>Space</kbd> place · no room for any piece ends the game'],
  pad: 'LRUDA', padLabels: { A: 'PLACE' },
  make(E) {
    const W = 960, H = 600, N = 10, S = 50, GX = 240, GY = 50;
    const SHAPES = [
      [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [2, 1], [2, 2], [1, 2], [0, 2]],
    ];
    const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'];
    const WEIGHTS = [2, 3, 3, 3, 3, 2, 2, 1, 1, 3, 1, 2, 2, 2, 2, 1, 1, 1, 1];
    const grid = U.grid(N, N, () => null);
    let tray = [], drag = null, sel = 0, kx = 3, ky = 3, streak = 0, clearFx = [], T = 0, over = false, placedCount = 0;
    const pickShape = () => { let r = Math.random() * WEIGHTS.reduce((a, b) => a + b, 0); for (let i = 0; i < SHAPES.length; i++) { r -= WEIGHTS[i]; if (r < 0) return i; } return 0; };
    function deal() { tray = [0, 1, 2].map((i) => ({ sh: pickShape(), col: U.pick(COLORS), used: false, slot: i, pop: 1 })); E.sfx('card', 1, 0.6); }
    deal();
    const cells = (p) => SHAPES[p.sh];
    const dims = (p) => [Math.max(...cells(p).map((c) => c[0])) + 1, Math.max(...cells(p).map((c) => c[1])) + 1];
    const fits = (p, x, y) => cells(p).every(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && !grid[y + dy][x + dx]);
    const anyFit = (p) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(p, x, y)) return true; return false; };
    const slotPos = (i) => [110, 105 + i * 170];
    function place(p, x, y) {
      for (const [dx, dy] of cells(p)) grid[y + dy][x + dx] = { col: p.col, pop: 1 };
      p.used = true; placedCount++;
      E.score += cells(p).length; E.sfx('place', 1.1);
      // clear lines
      const rowsF = U.range(N).filter((r) => grid[r].every(Boolean)), colsF = U.range(N).filter((c) => grid.every((row) => row[c]));
      const lines = rowsF.length + colsF.length;
      if (lines) {
        streak++;
        const pts = lines * 10 * lines * 5 + (streak > 1 ? streak * 20 : 0);
        E.score += pts;
        const doomed = new Set();
        for (const r of rowsF) for (let c = 0; c < N; c++) doomed.add(r * N + c);
        for (const c of colsF) for (let r = 0; r < N; r++) doomed.add(r * N + c);
        for (const k of doomed) { const r = (k / N) | 0, c = k % N, cell = grid[r][c]; clearFx.push({ x: GX + c * S, y: GY + r * S, col: cell.col, t: 0, d: (rowsF.includes(r) ? c : r) * 0.025 }); grid[r][c] = null; }
        for (const r of rowsF) clearFx.push({ line: 'r', i: r, t: 0 }); for (const c of colsF) clearFx.push({ line: 'c', i: c, t: 0 });
        E.sfx('match', 1 + lines * 0.1); if (lines >= 2) { E.sfx('power'); E.shake(4 + lines * 2); }
        const label = lines >= 4 ? 'INCREDIBLE!' : lines === 3 ? 'AMAZING!' : lines === 2 ? 'DOUBLE!' : 'CLEAR';
        E.pop(GX + (N * S) / 2, GY + (N * S) / 2, `${label} +${pts}`, { color: '#fde047', size: 22 + lines * 4 });
        if (streak > 1) E.pop(GX + (N * S) / 2, GY + (N * S) / 2 + 40, `streak ×${streak}`, { color: '#22d3ee', size: 18 });
      } else streak = 0;
      if (tray.every((q) => q.used)) deal();
      const live = tray.filter((q) => !q.used);
      if (!live.some(anyFit)) { over = true; E.sfx('lose'); E.after(1.2, () => E.over({ title: 'No Room Left', msg: `${placedCount} pieces placed` })); }
      sel = tray.findIndex((q) => !q.used);
    }
    return {
      update(dt) {
        T += dt;
        for (const row of grid) for (const c of row) if (c) c.pop = Math.max(0, c.pop - dt * 4);
        for (const p of tray) p.pop = Math.max(0, p.pop - dt * 3);
        for (const f of clearFx) f.t += dt; clearFx = clearFx.filter((f) => f.t < 0.6 + (f.d || 0));
        if (over) return;
        const ptr = E.ptr;
        if (ptr.hit) {
          tray.forEach((p, i) => { if (p.used) return; const [sx, sy] = slotPos(i), [w, h] = dims(p); if (U.ptInRect(ptr.x, ptr.y, sx - 70, sy - 70, 140, 140)) { drag = { p, ox: (w * S) / 2, oy: (h * S) / 2 + (ptr.type === 'touch' ? 70 : 0) }; sel = i; E.sfx('tick', 1.4, 0.4); } });
        }
        if (drag && !ptr.down) {
          const gx = Math.round((ptr.x - drag.ox - GX) / S), gy = Math.round((ptr.y - drag.oy - GY) / S);
          if (fits(drag.p, gx, gy)) place(drag.p, gx, gy); else E.sfx('tick', 0.6, 0.4);
          drag = null;
        }
        // keyboard
        for (let i = 0; i < 3; i++) if (E.hit('Digit' + (i + 1)) && !tray[i].used) { sel = i; E.sfx('tick', 1.4, 0.4); }
        if (E.hit('L')) kx--; if (E.hit('R')) kx++; if (E.hit('U')) ky--; if (E.hit('D')) ky++;
        const sp = tray[sel]; if (sp && !sp.used) { const [w, h] = dims(sp); kx = U.clamp(kx, 0, N - w); ky = U.clamp(ky, 0, N - h); }
        if (E.hit('A') && sp && !sp.used) { if (fits(sp, kx, ky)) place(sp, kx, ky); else E.sfx('error', 1.2, 0.5); }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#1e293b', '#020617');
        D.shadow(g, GX + (N * S) / 2, GY + N * S + 14, N * S * 0.5, 14, 0.5);
        D.fillRR(g, GX - 10, GY - 10, N * S + 20, N * S + 20, 16, '#0f172a');
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = grid[y][x], px = GX + x * S, py = GY + y * S;
          if (!c) { D.fillRR(g, px + 2, py + 2, S - 4, S - 4, 7, 'rgba(255,255,255,.05)'); continue; }
          const s = 1 + Math.sin(c.pop * Math.PI) * 0.12;
          g.save(); g.translate(px + S / 2, py + S / 2); g.scale(s, s); D.tile(g, -S / 2 + 2, -S / 2 + 2, S - 4, S - 4, 7, c.col, 4); g.restore();
        }
        // ghost preview
        let ghost = null;
        if (drag) { const gx = Math.round((E.ptr.x - drag.ox - GX) / S), gy = Math.round((E.ptr.y - drag.oy - GY) / S); ghost = { p: drag.p, x: gx, y: gy }; }
        else if (tray[sel] && !tray[sel].used && E.ptr.type !== 'mouse' && E.ptr.type !== 'touch') ghost = { p: tray[sel], x: kx, y: ky };
        if (ghost) {
          const ok = fits(ghost.p, ghost.x, ghost.y);
          for (const [dx, dy] of cells(ghost.p)) { const x = ghost.x + dx, y = ghost.y + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; D.fillRR(g, GX + x * S + 3, GY + y * S + 3, S - 6, S - 6, 7, ok ? U.rgba(ghost.p.col, 0.35) : 'rgba(239,68,68,.25)'); }
          if (ok) {
            // highlight lines that would clear
            const tmp = grid.map((r) => r.map(Boolean)); for (const [dx, dy] of cells(ghost.p)) tmp[ghost.y + dy][ghost.x + dx] = true;
            for (let r = 0; r < N; r++) if (tmp[r].every(Boolean)) { g.fillStyle = 'rgba(253,224,71,.12)'; g.fillRect(GX, GY + r * S, N * S, S); }
            for (let c = 0; c < N; c++) if (tmp.every((row) => row[c])) { g.fillStyle = 'rgba(253,224,71,.12)'; g.fillRect(GX + c * S, GY, S, N * S); }
          }
        }
        // clear effects
        for (const f of clearFx) {
          if (f.line) { const k = f.t / 0.6; g.fillStyle = `rgba(255,255,255,${(1 - k) * 0.5})`; if (f.line === 'r') g.fillRect(GX, GY + f.i * S, N * S, S); else g.fillRect(GX + f.i * S, GY, S, N * S); continue; }
          const k = Math.max(0, f.t - f.d) / 0.5; if (k >= 1) continue;
          g.save(); g.translate(f.x + S / 2, f.y + S / 2 - k * 20); g.rotate(k * 2); g.scale(1 - k, 1 - k); g.globalAlpha = 1 - k; D.tile(g, -S / 2 + 2, -S / 2 + 2, S - 4, S - 4, 7, f.col, 4); g.restore();
        }
        // tray
        tray.forEach((p, i) => {
          const [sx, sy] = slotPos(i);
          D.fillRR(g, sx - 70, sy - 70, 140, 140, 18, i === sel && !p.used ? 'rgba(34,211,238,.1)' : 'rgba(255,255,255,.04)');
          if (p.used || (drag && drag.p === p)) return;
          const [w, h] = dims(p), s = Math.min(1, 110 / (Math.max(w, h) * S)) * 0.9 * (1 - p.pop * 0.3), fitsAny = anyFit(p);
          g.save(); g.translate(sx, sy); g.scale(s, s); g.globalAlpha = fitsAny ? 1 : 0.35;
          for (const [dx, dy] of cells(p)) D.tile(g, dx * S - (w * S) / 2 + 2, dy * S - (h * S) / 2 + 2, S - 4, S - 4, 7, p.col, 4);
          g.restore();
          D.text(g, i + 1, sx - 56, sy - 54, { size: 12, font: 'mono', color: 'rgba(255,255,255,.3)' });
        });
        if (drag) { const [w, h] = dims(drag.p); g.save(); g.translate(E.ptr.x - drag.ox, E.ptr.y - drag.oy); g.globalAlpha = 0.95; for (const [dx, dy] of cells(drag.p)) D.tile(g, dx * S + 2, dy * S + 2, S - 4, S - 4, 7, drag.p.col, 4); g.restore(); void w; void h; }
        // right panel
        D.text(g, 'BLOCK FIT', 850, 70, { size: 26, color: '#fdba74', glow: '#fb923c', blur: 12 });
        D.text(g, E.score, 850, 150, { size: 44, color: '#fff' });
        D.text(g, 'SCORE', 850, 186, { size: 12, font: 'mono', color: 'rgba(255,255,255,.4)' });
        if (streak > 1) D.text(g, `STREAK ×${streak}`, 850, 250, { size: 20, color: '#22d3ee' });
        void t;
      },
    };
  },
});

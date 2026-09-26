MG.add({
  id: 'sudoku', name: 'Sudoku', cat: 'Puzzle', color: '#60a5fa', color2: '#f472b6', score: 'low', fmt: 'time',
  desc: 'Freshly generated puzzles with a guaranteed unique solution, pencil marks, smart highlighting and hints.',
  how: ['Select a cell, then type <kbd>1</kbd>–<kbd>9</kbd> or use the number pad', '<kbd>N</kbd> toggles pencil marks · <kbd>Backspace</kbd> erases · <kbd>H</kbd> hint (+30 s)', 'Three mistakes and the puzzle is lost', 'Fastest clean solve is your record'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600, S = 58, GX = 70, GY = 38, PX = 660;
    // ---------- generator ----------
    const box = (i) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
    function count(grid, limit) {
      const rows = new Array(9).fill(0), cols = new Array(9).fill(0), bxs = new Array(9).fill(0);
      for (let i = 0; i < 81; i++) if (grid[i]) { const b = 1 << grid[i]; rows[(i / 9) | 0] |= b; cols[i % 9] |= b; bxs[box(i)] |= b; }
      let n = 0;
      (function rec() {
        if (n >= limit) return;
        let best = -1, bm = 0, bc = 10;
        for (let i = 0; i < 81; i++) if (!grid[i]) {
          const m = ~(rows[(i / 9) | 0] | cols[i % 9] | bxs[box(i)]) & 0x3fe; let c = 0; for (let v = m; v; v &= v - 1) c++;
          if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; }
        }
        if (best < 0) { n++; return; }
        for (let v = 1; v <= 9; v++) if (bm & (1 << v)) {
          const r = (best / 9) | 0, c = best % 9, bb = box(best), b = 1 << v;
          grid[best] = v; rows[r] |= b; cols[c] |= b; bxs[bb] |= b;
          rec();
          grid[best] = 0; rows[r] &= ~b; cols[c] &= ~b; bxs[bb] &= ~b;
          if (n >= limit) return;
        }
      })();
      return n;
    }
    function full() {
      const g = new Array(81).fill(0);
      (function fill(i) {
        if (i === 81) return true;
        for (const v of U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          let ok = true; const r = (i / 9) | 0, c = i % 9;
          for (let k = 0; k < 9 && ok; k++) if (g[r * 9 + k] === v || g[k * 9 + c] === v) ok = false;
          const br = r - (r % 3), bc = c - (c % 3);
          for (let y = 0; y < 3 && ok; y++) for (let x = 0; x < 3; x++) if (g[(br + y) * 9 + bc + x] === v) ok = false;
          if (!ok) continue;
          g[i] = v; if (fill(i + 1)) return true; g[i] = 0;
        }
        return false;
      })(0);
      return g;
    }
    const sol = full(), puz = sol.slice();
    let clues = 81;
    for (const i of U.shuffle(U.range(81))) {
      if (clues <= 28) break;
      const v = puz[i]; puz[i] = 0;
      if (count(puz.slice(), 2) !== 1) puz[i] = v; else clues--;
    }
    // ---------- state ----------
    const cells = puz.map((v, i) => ({ v, given: !!v, notes: 0, bad: false, pop: 0, i }));
    let sel = cells.findIndex((c) => !c.given), notes = false, mistakes = 0, hints = 3, time = 0, penalty = 0, st = 'play', winT = 0, T = 0;
    E.stat('Mistakes', '0/3'); E.stat('Hints', hints);
    const peers = (i) => cells.filter((c) => c.i !== i && (((c.i / 9) | 0) === ((i / 9) | 0) || c.i % 9 === i % 9 || box(c.i) === box(i)));
    function place(v) {
      const c = cells[sel]; if (!c || c.given || st !== 'play') return;
      if (notes && v) { if (c.v) return; c.notes ^= 1 << v; E.sfx('tick', 1.4, 0.5); return; }
      if (!v) { c.v = 0; c.bad = false; c.notes = 0; E.sfx('tick', 0.8, 0.5); return; }
      if (c.v === v && !c.bad) return;
      c.v = v; c.pop = 1; c.notes = 0;
      if (sol[c.i] !== v) {
        c.bad = true; mistakes++; E.stat('Mistakes', `${mistakes}/3`); E.sfx('error'); E.shake(5);
        if (mistakes >= 3) { st = 'lost'; E.sfx('lose'); E.after(1, () => E.over({ win: false, title: 'Three Mistakes', msg: `${cells.filter((q) => q.v && !q.bad).length}/81 cells correct` })); }
        return;
      }
      c.bad = false; E.sfx('place', 1.1);
      for (const p of peers(c.i)) p.notes &= ~(1 << v);
      // unit completion flourishes
      const r = (c.i / 9) | 0, co = c.i % 9, bb = box(c.i);
      const done = (f) => cells.filter(f).every((q) => q.v && !q.bad);
      if (done((q) => ((q.i / 9) | 0) === r)) flourish(cells.filter((q) => ((q.i / 9) | 0) === r));
      if (done((q) => q.i % 9 === co)) flourish(cells.filter((q) => q.i % 9 === co));
      if (done((q) => box(q.i) === bb)) flourish(cells.filter((q) => box(q.i) === bb));
      if (cells.filter((q) => q.v === v && !q.bad).length === 9) E.pop(PX + 130, 470, `all ${v}s placed`, { color: '#93c5fd', size: 16 });
      if (cells.every((q) => q.v && !q.bad)) { st = 'won'; winT = 0; E.score = time + penalty; E.sfx('win'); E.after(1.8, () => E.over({ win: true, title: 'Solved!', msg: `${U.fmtTime(time, 1)}s${penalty ? ` + ${penalty}s hint penalty` : ''} · ${mistakes} mistake${mistakes === 1 ? '' : 's'}` })); }
    }
    function flourish(list) { list.forEach((q) => { q.glow = 1; q.gd = U.dist(q.i % 9, (q.i / 9) | 0, cells[sel].i % 9, (cells[sel].i / 9) | 0) * 0.05; }); E.sfx('match', 1.1, 0.5); }
    function hint() {
      if (hints <= 0 || st !== 'play') return;
      let c = cells[sel];
      if (!c || (c.v && !c.bad) || c.given) c = U.pick(cells.filter((q) => !q.v || q.bad));
      if (!c) return;
      hints--; penalty += 30; E.stat('Hints', hints); sel = c.i;
      const was = notes; notes = false; place(sol[c.i]); notes = was; c.hinted = true;
      E.pop(PX + 130, 470, '+30 s', { color: '#fca5a5', size: 18 });
    }
    const cellXY = (i) => { const x = i % 9, y = (i / 9) | 0; return [GX + x * S + Math.floor(x / 3) * 4, GY + y * S + Math.floor(y / 3) * 4]; };
    const BTN = U.range(9).map((k) => ({ v: k + 1, x: PX + (k % 3) * 84, y: 150 + Math.floor(k / 3) * 84, w: 74, h: 74 }))
      .concat([{ v: 0, x: PX, y: 408, w: 74, h: 46, label: 'ERASE' }, { v: 'n', x: PX + 84, y: 408, w: 74, h: 46, label: 'NOTES' }, { v: 'h', x: PX + 168, y: 408, w: 74, h: 46, label: 'HINT' }]);
    return {
      update(dt) {
        T += dt;
        for (const c of cells) { c.pop = Math.max(0, c.pop - dt * 4); if (c.glow) { if (c.gd > 0) c.gd -= dt; else c.glow = Math.max(0, c.glow - dt * 1.6); } }
        if (st === 'won') { winT += dt; return; }
        if (st !== 'play') return;
        time += dt; E.score = time + penalty; E.stat('Time', U.fmtTime(time + penalty, 0));
        let x = sel % 9, y = (sel / 9) | 0;
        if (E.hit('L')) x = (x + 8) % 9; if (E.hit('R')) x = (x + 1) % 9; if (E.hit('U')) y = (y + 8) % 9; if (E.hit('D')) y = (y + 1) % 9;
        sel = y * 9 + x;
        for (let v = 1; v <= 9; v++) if (E.hit('Digit' + v, 'Numpad' + v)) place(v);
        if (E.hit('Backspace', 'Delete', 'Digit0', 'Numpad0')) place(0);
        if (E.hit('KeyN')) { notes = !notes; E.sfx('select'); }
        if (E.hit('KeyH')) hint();
        if (E.ptr.hit) {
          const p = E.ptr;
          for (let i = 0; i < 81; i++) { const [cx, cy] = cellXY(i); if (U.ptInRect(p.x, p.y, cx, cy, S, S)) { sel = i; E.sfx('tick', 1.2, 0.3); } }
          for (const bt of BTN) if (U.ptInRect(p.x, p.y, bt.x, bt.y, bt.w, bt.h)) { bt.press = 0.15; if (bt.v === 'n') { notes = !notes; E.sfx('select'); } else if (bt.v === 'h') hint(); else place(bt.v); }
        }
        for (const bt of BTN) if (bt.press) bt.press = Math.max(0, bt.press - dt);
      },
      draw(g) {
        D.radialBg(g, W, H, '#172554', '#050816');
        const sc = cells[sel], sv = sc && sc.v && !sc.bad ? sc.v : 0;
        const sx = sel % 9, sy = (sel / 9) | 0, sb = box(sel);
        D.shadow(g, GX + 265, GY + 540, 280, 16, 0.5);
        D.fillRR(g, GX - 8, GY - 8, 9 * S + 8 + 16, 9 * S + 8 + 16, 14, '#0b1437');
        for (const c of cells) {
          const [x, y] = cellXY(c.i), cx = c.i % 9, cy = (c.i / 9) | 0;
          let bg = '#e8eefc';
          if (cx === sx || cy === sy || box(c.i) === sb) bg = '#d3def8';
          if (sv && c.v === sv && !c.bad) bg = '#b6c9f5';
          if (c.i === sel) bg = notes ? '#fbcfe8' : '#93c5fd';
          if (st === 'won') { const w = Math.sin(U.clamp(winT * 5 - (cx + cy) * 0.35, 0, Math.PI)); bg = U.mix(bg, '#86efac', w); }
          g.fillStyle = bg; g.fillRect(x, y, S - 2, S - 2);
          if (c.glow) { g.fillStyle = `rgba(250,204,21,${c.glow * 0.55})`; g.fillRect(x, y, S - 2, S - 2); }
          if (c.v) {
            const s = 1 + Math.sin(c.pop * Math.PI) * 0.25;
            D.text(g, c.v, x + S / 2 - 1, y + S / 2, { size: 30 * s, font: c.given ? 'display' : 'ui', weight: c.given ? 700 : 600, color: c.bad ? '#dc2626' : c.given ? '#0f172a' : c.hinted ? '#9333ea' : '#1d4ed8' });
          } else if (c.notes) {
            for (let v = 1; v <= 9; v++) if (c.notes & (1 << v)) D.text(g, v, x + 10 + ((v - 1) % 3) * 18, y + 11 + Math.floor((v - 1) / 3) * 17, { size: 12, font: 'mono', weight: 500, color: sv === v ? '#1d4ed8' : '#64748b' });
          }
        }
        // number pad
        D.text(g, 'SUDOKU', PX + 121, 50, { size: 34, color: '#93c5fd', glow: '#3b82f6', blur: 14 });
        D.text(g, `${clues} clues · unique solution`, PX + 121, 84, { size: 13, font: 'mono', color: 'rgba(255,255,255,.45)' });
        D.text(g, U.fmtTime(time + penalty, 0) + 's', PX + 121, 118, { size: 20, font: 'mono', color: '#e2e8f0' });
        for (const bt of BTN) {
          const act = bt.v === 'n' && notes, left = typeof bt.v === 'number' && bt.v > 0 ? 9 - cells.filter((c) => c.v === bt.v && !c.bad).length : null;
          D.tile(g, bt.x, bt.y + (bt.press ? 3 : 0), bt.w, bt.h, 12, act ? '#db2777' : left === 0 ? '#1e293b' : '#1e3a8a', 5);
          if (bt.label) D.text(g, bt.label + (bt.v === 'h' ? ` ${hints}` : ''), bt.x + bt.w / 2, bt.y + bt.h / 2 - 2 + (bt.press ? 3 : 0), { size: 13, font: 'mono', color: '#e2e8f0' });
          else { D.text(g, bt.v, bt.x + bt.w / 2, bt.y + bt.h / 2 - 6 + (bt.press ? 3 : 0), { size: 32, color: left === 0 ? '#475569' : '#fff' }); D.text(g, left, bt.x + bt.w / 2, bt.y + bt.h - 14, { size: 11, font: 'mono', color: 'rgba(255,255,255,.4)' }); }
        }
        for (let i = 0; i < 3; i++) D.circle(g, PX + 100 + i * 22, 490, 7, i < mistakes ? '#ef4444' : 'rgba(255,255,255,.15)');
        D.text(g, 'mistakes', PX + 121, 512, { size: 11, font: 'mono', color: 'rgba(255,255,255,.35)' });
        if (notes) D.text(g, 'PENCIL MODE', PX + 121, 540, { size: 14, font: 'mono', color: '#f472b6' });
      },
    };
  },
});

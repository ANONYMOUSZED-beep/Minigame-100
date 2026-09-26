MG.add({
  id: 'nonogram', name: 'Nonogram', cat: 'Puzzle', color: '#2dd4bf', color2: '#f472b6', score: 'low', fmt: 'time',
  desc: 'Picture logic: the numbers tell you the runs of filled squares in every row and column. Five hidden pixel paintings.',
  how: ['Click / drag to fill squares · right-click / drag to mark ✕', 'Clue numbers list the runs of filled squares, in order', 'Rows and columns whose clues are satisfied dim out', 'Touch: switch between FILL and ✕ with the button · keys: arrows, <kbd>Space</kbd>, <kbd>X</kbd>'],
  pad: 'LRUDAB', padLabels: { A: 'FILL', B: '✕' },
  make(E) {
    const W = 960, H = 600;
    const PUZ = [
      ['Heart', '#f43f5e', ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..']],
      ['Cottage', '#f59e0b', ['..X..', '.XXX.', 'XXXXX', '.X.X.', '.XXX.']],
      ['Mushroom', '#ef4444', ['..XXXX..', '.XX..XX.', 'XXXXXXXX', 'X..XX..X', 'XXXXXXXX', '..X..X..', '..X..X..', '..XXXX..']],
      ['Smiley', '#facc15', ['..XXXXXX..', '.X......X.', 'X..X..X..X', 'X..X..X..X', 'X........X', 'X.X....X.X', 'X..XXXX..X', 'X........X', '.X......X.', '..XXXXXX..']],
      ['Ghost', '#a78bfa', ['....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XX..XXXX..XX', 'XX..XXXX..XX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXX.XXXX.XXX', 'XXXX....XXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'X.XXX..XXX.X']],
    ];
    let clueW = 0, clueH = 0, lv = -1, N, sol, cell, cs, ox, oy, rowC, colC, cur = [0, 0], mode = 'fill', drag = null, time = 0, total = 0, st = 'play', stT = 0, T = 0, reveal = 0, name, col;
    const runs = (arr) => { const r = []; let n = 0; for (const v of arr) { if (v) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    function load() {
      lv++; [name, col] = PUZ[lv]; const rows = PUZ[lv][2]; N = rows.length;
      sol = rows.map((r) => [...r].map((ch) => (ch === 'X' ? 1 : 0)));
      cell = U.grid(N, N, () => ({ s: 0, a: 0 })); // s: 0 empty, 1 filled, 2 marked
      rowC = sol.map((r) => runs(r)); colC = U.range(N).map((x) => runs(sol.map((r) => r[x])));
      const maxR = Math.max(...rowC.map((c) => c.length)), maxC = Math.max(...colC.map((c) => c.length));
      cs = Math.floor(Math.min(400 / N, 60)); clueW = maxR * 18 + 14; clueH = maxC * 18 + 10;
      ox = Math.round((W - N * cs - clueW) / 2 + clueW) - 60; oy = Math.round((H - N * cs - clueH) / 2 + clueH) + 8;
      time = 0; st = 'play'; reveal = 0;
      E.stat('Picture', `${lv + 1}/${PUZ.length}`);
      E.banner(`PICTURE ${lv + 1}`, `${N}×${N}`, { color: '#2dd4bf', life: 1.1 });
    }
    load();
    const rowOk = (y) => same(runs(cell[y].map((c) => (c.s === 1 ? 1 : 0))), rowC[y]);
    const colOk = (x) => same(runs(cell.map((r) => (r[x].s === 1 ? 1 : 0))), colC[x]);
    function check() {
      for (let i = 0; i < N; i++) if (!rowOk(i) || !colOk(i)) return;
      st = 'solved'; stT = 2.6; total += time; E.score = total;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (cell[y][x].s === 2) cell[y][x].s = 0;
      E.sfx('win');
    }
    function setCell(x, y, v) {
      const c = cell[y][x]; if (c.s === v) return;
      c.s = v; c.a = 1;
      E.sfx(v === 1 ? 'place' : v === 2 ? 'tick' : 'click', v === 1 ? 1 + (x + y) * 0.01 : 1, 0.45);
      const done = [rowOk(y), colOk(x)];
      if (v === 1 && done[0]) E.sfx('select', 1.3, 0.3);
      check();
    }
    const at = (px, py) => { const x = Math.floor((px - ox) / cs), y = Math.floor((py - oy) / cs); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
    const MB = { x: 60, y: H - 90, w: 110, h: 50 };
    return {
      update(dt) {
        T += dt;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cell[y][x].a = Math.max(0, cell[y][x].a - dt * 5);
        if (st === 'solved') { reveal += dt; stT -= dt; if (stT <= 0) { if (lv >= PUZ.length - 1) { st = 'done'; E.over({ win: true, title: 'Gallery Complete', msg: `All ${PUZ.length} pictures in ${U.fmtTime(total, 1)}s` }); } else load(); } return; }
        if (st !== 'play') return;
        time += dt; E.score = total + time;
        const p = E.ptr;
        if (p.hit && U.ptInRect(p.x, p.y, MB.x, MB.y, MB.w, MB.h)) { mode = mode === 'fill' ? 'mark' : 'fill'; E.sfx('select'); }
        else if (p.hit || p.rhit) {
          const c = at(p.x, p.y);
          if (c) {
            const [x, y] = c, m = p.rhit || mode === 'mark' ? 2 : 1, curS = cell[y][x].s;
            const v = curS === m ? 0 : m; drag = { v, m, axis: null, x0: x, y0: y }; cur = [x, y]; setCell(x, y, v);
          }
        }
        if (drag && (p.down || p.rdown)) {
          const c = at(p.x, p.y);
          if (c) {
            let [x, y] = c;
            if (!drag.axis && (x !== drag.x0 || y !== drag.y0)) drag.axis = x !== drag.x0 ? 'x' : 'y';
            if (drag.axis === 'x') y = drag.y0; else if (drag.axis === 'y') x = drag.x0;
            const s = cell[y][x].s;
            if (drag.v === 0 ? s === drag.m : s === 0) setCell(x, y, drag.v);
            cur = [x, y];
          }
        }
        if (!p.down && !p.rdown) drag = null;
        if (E.hit('L')) cur[0] = (cur[0] + N - 1) % N; if (E.hit('R')) cur[0] = (cur[0] + 1) % N; if (E.hit('U')) cur[1] = (cur[1] + N - 1) % N; if (E.hit('D')) cur[1] = (cur[1] + 1) % N;
        if (E.hit('A')) { const c = cell[cur[1]][cur[0]]; setCell(cur[0], cur[1], c.s === 1 ? 0 : 1); }
        if (E.hit('B', 'KeyX')) { const c = cell[cur[1]][cur[0]]; setCell(cur[0], cur[1], c.s === 2 ? 0 : 2); }
      },
      draw(g) {
        D.radialBg(g, W, H, '#134e4a', '#041312');
        // clues
        for (let y = 0; y < N; y++) {
          const ok = rowOk(y), hl = cur[1] === y;
          if (hl && st === 'play') { g.fillStyle = 'rgba(45,212,191,.08)'; g.fillRect(ox - clueW, oy + y * cs, clueW + N * cs, cs); }
          rowC[y].slice().reverse().forEach((n, i) => D.text(g, n, ox - 14 - i * 18, oy + y * cs + cs / 2 + 1, { size: 15, font: 'mono', color: ok ? 'rgba(255,255,255,.25)' : hl ? '#5eead4' : '#e2e8f0' }));
        }
        for (let x = 0; x < N; x++) {
          const ok = colOk(x), hl = cur[0] === x;
          if (hl && st === 'play') { g.fillStyle = 'rgba(45,212,191,.08)'; g.fillRect(ox + x * cs, oy - clueH, cs, clueH + N * cs); }
          colC[x].slice().reverse().forEach((n, i) => D.text(g, n, ox + x * cs + cs / 2, oy - 14 - i * 18, { size: 15, font: 'mono', color: ok ? 'rgba(255,255,255,.25)' : hl ? '#5eead4' : '#e2e8f0' }));
        }
        // grid
        D.fillRR(g, ox - 6, oy - 6, N * cs + 12, N * cs + 12, 8, '#0f2e2c');
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = cell[y][x], px = ox + x * cs, py = oy + y * cs;
          g.fillStyle = (x + y) % 2 ? '#e6f4f1' : '#dcefeb'; g.fillRect(px, py, cs, cs);
          if (st === 'solved' || st === 'done') {
            const k = U.clamp(reveal * 3 - (x + y) * 0.06, 0, 1);
            if (sol[y][x]) { g.fillStyle = U.mix('#0f172a', col, k); g.fillRect(px, py, cs, cs); }
            continue;
          }
          if (c.s === 1) { const s = 1 - c.a * 0.3, d = (cs * (1 - s)) / 2; g.fillStyle = '#0f172a'; g.fillRect(px + 1 + d, py + 1 + d, cs - 2 - 2 * d, cs - 2 - 2 * d); g.fillStyle = 'rgba(45,212,191,.25)'; g.fillRect(px + 1 + d, py + 1 + d, cs - 2 - 2 * d, 3); }
          else if (c.s === 2) { const m = cs * 0.28; D.line(g, px + m, py + m, px + cs - m, py + cs - m, '#f472b6', 2.5); D.line(g, px + cs - m, py + m, px + m, py + cs - m, '#f472b6', 2.5); }
        }
        for (let i = 0; i <= N; i++) { const th = i % 5 === 0 ? 2 : 1, c = i % 5 === 0 ? 'rgba(15,23,42,.6)' : 'rgba(15,23,42,.18)'; D.line(g, ox + i * cs, oy, ox + i * cs, oy + N * cs, c, th, 'butt'); D.line(g, ox, oy + i * cs, ox + N * cs, oy + i * cs, c, th, 'butt'); }
        if (st === 'play') D.strokeRR(g, ox + cur[0] * cs + 1, oy + cur[1] * cs + 1, cs - 2, cs - 2, 4, `rgba(244,114,182,${0.5 + 0.4 * Math.sin(T * 6)})`, 2.5);
        if (st === 'solved') D.text(g, name.toUpperCase() + '!', ox + (N * cs) / 2, oy + N * cs + 40, { size: 32, color: col, glow: col, alpha: Math.min(1, reveal * 2) });
        // side info
        const px = W - 150;
        D.text(g, 'NONOGRAM', px, 70, { size: 26, color: '#5eead4', glow: '#14b8a6', blur: 12 });
        D.text(g, `picture ${lv + 1} of ${PUZ.length}`, px, 100, { size: 13, font: 'mono', color: 'rgba(255,255,255,.5)' });
        D.text(g, `${U.fmtTime(total + (st === 'play' ? time : 0), 1)}s`, px, 132, { size: 20, font: 'mono', color: '#e2e8f0' });
        // mini preview of your fill
        const ms = Math.floor(120 / N);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = cell[y][x].s === 1 ? '#e2e8f0' : 'rgba(255,255,255,.06)'; g.fillRect(px - (ms * N) / 2 + x * ms, 170 + y * ms, ms - 1, ms - 1); }
        // mode button
        D.tile(g, MB.x, MB.y, MB.w, MB.h, 12, mode === 'fill' ? '#0f766e' : '#be185d', 5);
        D.text(g, mode === 'fill' ? '■ FILL' : '✕ MARK', MB.x + MB.w / 2, MB.y + MB.h / 2 - 3, { size: 16, color: '#fff' });
      },
    };
  },
});

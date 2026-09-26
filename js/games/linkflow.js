MG.add({
  id: 'linkflow', name: 'Link Flow', cat: 'Puzzle', color: '#38bdf8', color2: '#f472b6',
  desc: 'Connect every pair of matching dots with a pipe. Pipes can\'t cross — and every square on the board must be filled.',
  how: ['Drag from a dot to draw its pipe to the matching dot', 'Crossing another pipe cuts it · drag back over your pipe to undo', 'A board is solved when all pairs connect <b>and</b> every square is filled', 'Keys: arrows move, <kbd>Space</kbd> grabs / releases a pipe'],
  pad: 'LRUDA', padLabels: { A: 'GRAB' },
  make(E) {
    const W = 960, H = 600;
    const SIZES = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9];
    const PAL = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#06b6d4', '#ec4899', '#a855f7', '#a3e635', '#f5f5f4', '#b45309', '#6366f1', '#14b8a6'];
    let lv = -1, N, S, OX, OY, dots, paths, owner, active = null, strokes = 0, st = 'play', stT = 0, T = 0, cur = [0, 0], kGrab = false, nudge = 0;
    function gen(n) {
      let path = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) path.push([y % 2 ? n - 1 - x : x, y]);
      for (let it = 0; it < n * n * 30; it++) {
        if (Math.random() < 0.5) path.reverse();
        const [hx, hy] = path[0], [px, py] = path[1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [hx + dx, hy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !(x === px && y === py));
        const [tx, ty] = U.pick(nb), i = path.findIndex(([x, y]) => x === tx && y === ty);
        path = path.slice(0, i).reverse().concat(path.slice(i));
      }
      const k = Math.max(3, Math.round(n * 1.05)), lens = new Array(k).fill(3);
      for (let r = n * n - 3 * k; r > 0; r--) lens[U.ri(0, k - 1)]++;
      const segs = []; let p = 0;
      for (const L of U.shuffle(lens)) { segs.push(path.slice(p, p + L)); p += L; }
      return segs;
    }
    function load(next = true) {
      if (next) lv++;
      N = SIZES[Math.min(lv, SIZES.length - 1)];
      S = Math.floor(Math.min(500 / N, 90)); OX = Math.round((W - N * S) / 2) + 80; OY = Math.round((H - N * S) / 2) + 10;
      const segs = gen(N);
      dots = segs.map((sg, c) => ({ c, a: sg[0], b: sg[sg.length - 1] }));
      paths = dots.map(() => []); owner = U.grid(N, N, -1); active = null; strokes = 0; st = 'play'; cur = [0, 0]; kGrab = false;
      E.stat('Board', `${lv + 1}/${SIZES.length}`);
      if (next) E.banner(`BOARD ${lv + 1}`, `${N}×${N} · ${dots.length} flows`, { color: '#38bdf8', life: 1.1 });
    }
    load();
    const dotAt = (x, y) => dots.find((d) => (d.a[0] === x && d.a[1] === y) || (d.b[0] === x && d.b[1] === y));
    const same = (p, q) => p[0] === q[0] && p[1] === q[1];
    function rebuildOwner() { owner = U.grid(N, N, -1); paths.forEach((p, c) => p.forEach(([x, y]) => (owner[y][x] = c))); }
    const connected = (c) => { const p = paths[c], d = dots[c]; return p.length >= 2 && ((same(p[0], d.a) && same(p[p.length - 1], d.b)) || (same(p[0], d.b) && same(p[p.length - 1], d.a))); };
    function begin(x, y) {
      const d = dotAt(x, y);
      if (d) { paths[d.c] = [[x, y]]; active = d.c; strokes++; rebuildOwner(); E.sfx('select', 1 + d.c * 0.05, 0.5); return true; }
      const c = owner[y][x];
      if (c >= 0) { const i = paths[c].findIndex((p) => same(p, [x, y])); paths[c] = paths[c].slice(0, i + 1); active = c; strokes++; rebuildOwner(); E.sfx('select', 1 + c * 0.05, 0.5); return true; }
      return false;
    }
    function extend(x, y) {
      if (active === null) return;
      const p = paths[active], last = p[p.length - 1];
      if (same(last, [x, y])) return;
      if (Math.abs(last[0] - x) + Math.abs(last[1] - y) !== 1) return;
      const i = p.findIndex((q) => same(q, [x, y]));
      if (i >= 0) { paths[active] = p.slice(0, i + 1); rebuildOwner(); E.sfx('tick', 0.9, 0.3); return; }
      if (connected(active)) return;
      const d = dotAt(x, y);
      if (d && d.c !== active) { nudge = 0.25; return; }
      const o = owner[y][x];
      if (o >= 0 && o !== active) { const j = paths[o].findIndex((q) => same(q, [x, y])); paths[o] = paths[o].slice(0, j); E.sfx('hit', 1.6, 0.3); }
      p.push([x, y]); rebuildOwner();
      E.tone({ f: 330 * Math.pow(2, (p.length % 12) / 12), dur: 0.06, type: 'triangle', vol: 0.12 });
      if (connected(active)) { E.sfx('match', 1 + active * 0.04, 0.6); const [ex, ey] = cellC(x, y); E.burst(ex, ey, { n: 12, color: PAL[active], speed: 160 }); }
    }
    function end() {
      if (active === null) return;
      active = null;
      const all = dots.every((d) => connected(d.c)), full = owner.every((r) => r.every((c) => c >= 0));
      if (all && full) {
        st = 'won'; stT = 1.8;
        const perfect = strokes <= dots.length, pts = N * 100 + (perfect ? 300 : 0);
        E.score += pts; E.sfx('win');
        E.banner(perfect ? 'PERFECT!' : 'SOLVED', `+${pts}`, { color: '#4ade80', life: 1.6 });
      } else if (all) { E.pop(OX + (N * S) / 2, OY - 18, 'Fill every square!', { color: '#fde047', size: 20 }); }
    }
    const cellC = (x, y) => [OX + x * S + S / 2, OY + y * S + S / 2];
    const cellAt = (px, py) => { const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
    return {
      update(dt) {
        T += dt; nudge = Math.max(0, nudge - dt);
        if (st === 'won') { stT -= dt; if (stT <= 0) { if (lv >= SIZES.length - 1) { st = 'done'; E.over({ win: true, title: 'All Flows Linked', msg: `${SIZES.length} boards solved` }); } else load(); } return; }
        const p = E.ptr;
        if (p.hit) { const c = cellAt(p.x, p.y); if (c) begin(...c); }
        if (p.down && active !== null && !kGrab) {
          const c = cellAt(p.x, p.y);
          if (c) {
            // walk step by step toward the pointer cell so fast drags don't skip squares
            let guard = 0;
            while (guard++ < 20) { const pa = paths[active], last = pa[pa.length - 1]; if (!last || same(last, c)) break; const dx = Math.sign(c[0] - last[0]), dy = Math.sign(c[1] - last[1]); const nx = Math.abs(c[0] - last[0]) >= Math.abs(c[1] - last[1]) ? [last[0] + dx, last[1]] : [last[0], last[1] + dy]; const before = pa.length; extend(...nx); if (paths[active].length === before && !paths[active].some((q) => same(q, nx))) break; }
          }
        }
        if (!p.down && active !== null && !kGrab) end();
        // keyboard
        for (const [k, d] of [['L', [-1, 0]], ['R', [1, 0]], ['U', [0, -1]], ['D', [0, 1]]]) if (E.hit(k)) { cur = [U.clamp(cur[0] + d[0], 0, N - 1), U.clamp(cur[1] + d[1], 0, N - 1)]; if (kGrab) extend(...cur); }
        if (E.hit('A')) { if (kGrab) { kGrab = false; end(); } else if (begin(...cur)) kGrab = true; }
        const done = owner.flat().filter((c) => c >= 0).length;
        E.stat('Flows', `${dots.filter((d) => connected(d.c)).length}/${dots.length}`); E.stat('Pipe', `${Math.round((done / (N * N)) * 100)}%`);
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#0f172a', '#020617');
        D.fillRR(g, OX - 8, OY - 8, N * S + 16, N * S + 16, 12, '#0b1220');
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const o = owner[y][x];
          g.fillStyle = o >= 0 ? U.rgba(PAL[o], connected(o) ? 0.22 : 0.12) : '#111827';
          g.fillRect(OX + x * S + 1, OY + y * S + 1, S - 2, S - 2);
        }
        g.strokeStyle = 'rgba(148,163,184,.12)'; g.lineWidth = 1;
        for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(OX + i * S, OY); g.lineTo(OX + i * S, OY + N * S); g.moveTo(OX, OY + i * S); g.lineTo(OX + N * S, OY + i * S); g.stroke(); }
        // pipes
        g.lineCap = 'round'; g.lineJoin = 'round';
        paths.forEach((p, c) => {
          if (p.length < 2) return;
          g.beginPath(); p.forEach(([x, y], i) => { const [cx, cy] = cellC(x, y); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
          g.strokeStyle = U.rgba(PAL[c], 0.35); g.lineWidth = S * 0.5; g.stroke();
          g.strokeStyle = PAL[c]; g.lineWidth = S * 0.32; g.stroke();
        });
        // dots
        for (const d of dots) for (const pt of [d.a, d.b]) {
          const [cx, cy] = cellC(...pt), con = connected(d.c);
          if (con) D.glow(g, cx, cy, S * 0.8, PAL[d.c], 0.4);
          D.circle(g, cx, cy, S * 0.34, PAL[d.c]); D.circle(g, cx - S * 0.1, cy - S * 0.1, S * 0.08, 'rgba(255,255,255,.55)');
        }
        if (active !== null) { const p = paths[active], [x, y] = p[p.length - 1], [cx, cy] = cellC(x, y); D.circle(g, cx, cy, S * 0.44 + Math.sin(t * 10) * 2, null, U.rgba(PAL[active], 0.7), 3); }
        if (E.ptr.type !== 'mouse' && E.ptr.type !== 'touch') D.strokeRR(g, OX + cur[0] * S + 3, OY + cur[1] * S + 3, S - 6, S - 6, 8, kGrab ? '#fde047' : 'rgba(255,255,255,.6)', 3);
        // side
        D.text(g, 'LINK FLOW', 150, 80, { size: 30, color: '#7dd3fc', glow: '#0ea5e9', blur: 14 });
        D.text(g, `board ${lv + 1} of ${SIZES.length}`, 150, 112, { size: 13, font: 'mono', color: 'rgba(255,255,255,.5)' });
        const done = owner.flat().filter((c) => c >= 0).length;
        D.text(g, `${Math.round((done / (N * N)) * 100)}%`, 150, 190, { size: 44, color: '#fff' });
        D.text(g, 'PIPE FILLED', 150, 226, { size: 12, font: 'mono', color: 'rgba(255,255,255,.4)' });
        D.text(g, `${dots.filter((d) => connected(d.c)).length} / ${dots.length}`, 150, 300, { size: 32, color: '#fff' });
        D.text(g, 'FLOWS', 150, 330, { size: 12, font: 'mono', color: 'rgba(255,255,255,.4)' });
        D.text(g, `strokes ${strokes}`, 150, 390, { size: 14, font: 'mono', color: strokes <= dots.length ? '#86efac' : 'rgba(255,255,255,.5)' });
      },
    };
  },
});

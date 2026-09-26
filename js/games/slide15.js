MG.add({
  id: 'slide15', name: 'Slide Puzzle', cat: 'Puzzle', color: '#fb7185', color2: '#38bdf8', score: 'low', fmt: 'time',
  desc: 'Reassemble a hand-painted scene one sliding tile at a time. A 3×3 warm-up, then the real 4×4 fifteen puzzle.',
  how: ['Click / tap a tile in line with the gap to slide it (whole rows move)', 'Arrow keys slide a tile into the gap', 'Hold <kbd>Space</kbd> or the eye button to peek at the finished picture', 'Total time over both boards is your score'],
  pad: 'LRUDA', padLabels: { A: 'PEEK' },
  make(E) {
    const W = 960, H = 600, BS = 480, BX = 240, BY = 70;
    let lv = -1, N, tiles, blank, img, moves = 0, total = 0, time = 0, st = 'play', stT = 0, peek = 0, T = 0, solvedT = 0;
    const PAINT = [
      (x, s) => { // sunset over the sea
        const sk = x.createLinearGradient(0, 0, 0, s * 0.6); sk.addColorStop(0, '#1e1b4b'); sk.addColorStop(0.5, '#be185d'); sk.addColorStop(1, '#fb923c'); x.fillStyle = sk; x.fillRect(0, 0, s, s * 0.6);
        x.fillStyle = '#fde68a'; x.beginPath(); x.arc(s / 2, s * 0.58, s * 0.16, Math.PI, 0); x.fill();
        for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`; x.fillRect(Math.random() * s, Math.random() * s * 0.3, 2, 2); }
        const se = x.createLinearGradient(0, s * 0.6, 0, s); se.addColorStop(0, '#7c2d12'); se.addColorStop(1, '#0c4a6e'); x.fillStyle = se; x.fillRect(0, s * 0.6, s, s * 0.4);
        for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(253,230,138,${0.6 - i * 0.04})`; const w = s * 0.3 * (1 - i * 0.05); x.fillRect(s / 2 - w / 2 + Math.sin(i) * 10, s * 0.62 + i * 12, w, 4); }
        x.fillStyle = '#1c1917'; x.beginPath(); x.moveTo(0, s * 0.6); x.lineTo(s * 0.18, s * 0.47); x.lineTo(s * 0.32, s * 0.6); x.fill();
        x.beginPath(); x.moveTo(s * 0.7, s * 0.6); x.lineTo(s * 0.86, s * 0.42); x.lineTo(s, s * 0.55); x.lineTo(s, s * 0.6); x.fill();
        x.strokeStyle = '#1c1917'; x.lineWidth = 3; x.beginPath(); x.moveTo(s * 0.3, s * 0.3); x.quadraticCurveTo(s * 0.33, s * 0.27, s * 0.36, s * 0.3); x.quadraticCurveTo(s * 0.39, s * 0.27, s * 0.42, s * 0.3); x.stroke();
      },
      (x, s) => { // neon city at night
        const sk = x.createLinearGradient(0, 0, 0, s); sk.addColorStop(0, '#020617'); sk.addColorStop(0.7, '#312e81'); sk.addColorStop(1, '#a21caf'); x.fillStyle = sk; x.fillRect(0, 0, s, s);
        for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,255,255,${Math.random()})`; x.fillRect(Math.random() * s, Math.random() * s * 0.5, 1.5, 1.5); }
        x.fillStyle = '#f5f5f4'; x.beginPath(); x.arc(s * 0.78, s * 0.18, s * 0.08, 0, 7); x.fill(); x.fillStyle = '#020617'; x.beginPath(); x.arc(s * 0.81, s * 0.16, s * 0.07, 0, 7); x.fill();
        const cols = ['#22d3ee', '#f472b6', '#facc15', '#a3e635'];
        for (let layer = 0; layer < 2; layer++) for (let bx = -10; bx < s; bx += 40 + Math.random() * 30) {
          const bw = 36 + Math.random() * 40, bh = s * (0.25 + Math.random() * 0.4) * (layer ? 0.8 : 1), by = s - bh;
          x.fillStyle = layer ? '#0f172a' : '#1e1b4b'; x.fillRect(bx, by, bw, bh);
          const c = cols[(Math.random() * 4) | 0];
          for (let wy = by + 8; wy < s - 8; wy += 14) for (let wx = bx + 5; wx < bx + bw - 6; wx += 10) if (Math.random() < 0.45) { x.fillStyle = c; x.globalAlpha = 0.5 + Math.random() * 0.5; x.fillRect(wx, wy, 5, 7); x.globalAlpha = 1; }
          if (Math.random() < 0.3) { x.strokeStyle = c; x.lineWidth = 3; x.strokeRect(bx + 4, by + 10, bw - 8, 14); }
        }
      },
    ];
    function load() {
      lv++; N = lv === 0 ? 3 : 4;
      img = document.createElement('canvas'); img.width = img.height = BS; PAINT[lv](img.getContext('2d'), BS);
      tiles = U.range(N * N - 1).map((k) => ({ k, at: k, fx: k % N, fy: Math.floor(k / N) }));
      blank = N * N - 1;
      // shuffle by legal random moves (always solvable), avoiding immediate backtracking
      let prev = -1;
      for (let i = 0; i < (N === 3 ? 60 : 180); i++) {
        const opts = nbrs(blank).filter((p) => p !== prev);
        const p = U.pick(opts); prev = blank; slideOne(p, true);
      }
      if (solved()) { const p = nbrs(blank)[0]; slideOne(p, true); }
      for (const t of tiles) { t.fx = t.at % N; t.fy = Math.floor(t.at / N); }
      moves = 0; time = 0; st = 'play';
      E.stat('Board', `${lv + 1}/2`); E.stat('Moves', 0);
      E.banner(N === 3 ? 'WARM-UP' : 'THE FIFTEEN', `${N}×${N}`, { color: '#fb7185', life: 1.2 });
    }
    const nbrs = (i) => { const x = i % N, y = Math.floor(i / N), o = []; if (x > 0) o.push(i - 1); if (x < N - 1) o.push(i + 1); if (y > 0) o.push(i - N); if (y < N - 1) o.push(i + N); return o; };
    const solved = () => tiles.every((t) => t.k === t.at);
    function slideOne(p, silent) { const t = tiles.find((q) => q.at === p); t.at = blank; blank = p; if (!silent) moves++; return t; }
    function slideFrom(p) {
      const bx = blank % N, by = Math.floor(blank / N), px = p % N, py = Math.floor(p / N);
      if (px !== bx && py !== by) { E.sfx('tick', 0.6, 0.4); return; }
      const step = px === bx ? (py > by ? N : -N) : px > bx ? 1 : -1;
      let n = 0;
      while (blank !== p) { slideOne(blank + step); n++; }
      E.sfx('card', 0.9 + Math.random() * 0.2); if (n > 1) E.sfx('swish', 1.4, 0.3);
      E.stat('Moves', moves);
      if (solved()) {
        st = 'solved'; stT = 2; solvedT = 0; total += time; E.score = total;
        E.sfx('win'); E.burst(W / 2, BY + BS / 2, { n: 50, colors: ['#fb7185', '#38bdf8', '#fde68a', '#fff'], speed: 380 });
      }
    }
    load();
    const cs = () => BS / N;
    return {
      update(dt) {
        T += dt;
        for (const t of tiles) { t.fx = U.damp(t.fx, t.at % N, 22, dt); t.fy = U.damp(t.fy, Math.floor(t.at / N), 22, dt); }
        peek = U.damp(peek, E.down('A') || (E.ptr.down && U.dist(E.ptr.x, E.ptr.y, BX + BS + 80, BY + 60) < 34) ? 1 : 0, 12, dt);
        if (st === 'solved') {
          solvedT += dt; stT -= dt;
          if (stT <= 0) { if (lv >= 1) { st = 'done'; E.over({ win: true, title: 'Picture Perfect', msg: `Both boards in ${U.fmtTime(total, 1)}s` }); } else load(); }
          return;
        }
        if (st !== 'play') return;
        time += dt; E.score = total + time;
        const dirs = [['L', 1], ['R', -1], ['U', N], ['D', -N]];
        for (const [k, off] of dirs) if (E.hit(k)) { const p = blank + off; const ok = off === 1 ? blank % N < N - 1 : off === -1 ? blank % N > 0 : p >= 0 && p < N * N; if (ok) slideFrom(p); }
        if (E.ptr.hit && U.ptInRect(E.ptr.x, E.ptr.y, BX, BY, BS, BS)) { const x = Math.floor((E.ptr.x - BX) / cs()), y = Math.floor((E.ptr.y - BY) / cs()); slideFrom(y * N + x); }
      },
      draw(g) {
        const c = cs(), t = T;
        D.radialBg(g, W, H, '#312e81', '#0b0a1f');
        D.shadow(g, BX + BS / 2, BY + BS + 16, BS * 0.52, 16, 0.5);
        D.fillRR(g, BX - 14, BY - 14, BS + 28, BS + 28, 18, '#1e1b4b'); D.strokeRR(g, BX - 14, BY - 14, BS + 28, BS + 28, 18, 'rgba(255,255,255,.1)', 2);
        g.fillStyle = '#0b0a1f'; g.fillRect(BX, BY, BS, BS);
        for (const tl of tiles) {
          const x = BX + tl.fx * c, y = BY + tl.fy * c, sx = (tl.k % N) * c, sy = Math.floor(tl.k / N) * c;
          g.save(); D.rr(g, x + 2, y + 2, c - 4, c - 4, 10); g.clip();
          g.drawImage(img, sx, sy, c, c, x, y, c, c);
          const hl = g.createLinearGradient(0, y, 0, y + c); hl.addColorStop(0, 'rgba(255,255,255,.18)'); hl.addColorStop(0.2, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = hl; g.fillRect(x, y, c, c);
          g.restore();
          D.strokeRR(g, x + 2, y + 2, c - 4, c - 4, 10, tl.k === tl.at ? 'rgba(134,239,172,.5)' : 'rgba(255,255,255,.2)', 2);
          D.fillRR(g, x + 8, y + 8, 30, 22, 7, 'rgba(0,0,0,.5)');
          D.text(g, tl.k + 1, x + 23, y + 19, { size: 14, font: 'mono', color: '#fff' });
        }
        if (peek > 0.01 || st === 'solved') { g.globalAlpha = st === 'solved' ? Math.min(1, solvedT * 2) : peek; g.drawImage(img, BX, BY, BS, BS); g.globalAlpha = 1; }
        if (st === 'solved') D.text(g, 'SOLVED', BX + BS / 2, BY + BS / 2, { size: 60, color: '#fff', glow: '#fb7185', blur: 24, stroke: 'rgba(0,0,0,.4)', lw: 8, alpha: Math.min(1, solvedT * 3) });
        // side panel
        D.circle(g, BX + BS + 80, BY + 60, 32, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.25)', 2);
        g.save(); g.translate(BX + BS + 80, BY + 60); g.beginPath(); g.ellipse(0, 0, 16, 10, 0, 0, U.TAU); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); D.circle(g, 0, 0, 5, '#fff'); g.restore();
        D.text(g, 'PEEK', BX + BS + 80, BY + 108, { size: 12, font: 'mono', color: 'rgba(255,255,255,.5)' });
        g.drawImage(img, BX + BS + 30, BY + 150, 100, 100); D.strokeRR(g, BX + BS + 30, BY + 150, 100, 100, 4, 'rgba(255,255,255,.3)', 2);
        D.text(g, `${moves} moves`, BX + BS + 80, BY + 280, { size: 16, font: 'mono', color: '#e2e8f0' });
        D.text(g, `${U.fmtTime(total + (st === 'play' ? time : 0), 1)}s`, BX + BS + 80, BY + 306, { size: 16, font: 'mono', color: '#fda4af' });
        D.text(g, `BOARD ${lv + 1}/2`, BX - 120, BY + 30, { size: 16, font: 'mono', color: 'rgba(255,255,255,.5)' });
        void t;
      },
    };
  },
});

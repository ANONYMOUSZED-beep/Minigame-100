MG.add({
  id: 'pipeflow', name: 'Pipe Flow', cat: 'Puzzle', color: '#4ade80', color2: '#38bdf8',
  desc: 'Race the goo. Lay pipe from the queue before the flow starts, and keep building ahead of it — spills end the run.',
  how: ['Click / tap a square to place the next pipe from the queue', 'Replacing an unused pipe costs a few points', 'The flow must travel the required length to clear the level', 'Crosses score a bonus if the goo passes through twice · <kbd>F</kbd> fast-forwards'],
  pad: 'LRUDAB', padLabels: { A: 'PLACE', B: 'FAST' },
  make(E) {
    const W = 960, H = 600, C = 10, R = 7, S = 68, OX = 250, OY = 70;
    const N = 1, EE = 2, SS = 4, WW = 8;
    const PIECES = [EE | WW, N | SS, N | EE, EE | SS, SS | WW, WW | N, 15];
    const WEIGHT = [3, 3, 2, 2, 2, 2, 1];
    const DIR = { [N]: [0, -1], [EE]: [1, 0], [SS]: [0, 1], [WW]: [-1, 0] };
    const OPP = { [N]: SS, [SS]: N, [EE]: WW, [WW]: EE };
    let srcK = 0, level = 0, grid, queue, src, flow, need, count, delay, tileT, fast = false, st, stT, cur = [4, 3], T = 0, spill = null;
    const rndPiece = () => { let r = Math.random() * WEIGHT.reduce((a, b) => a + b, 0); for (let i = 0; i < PIECES.length; i++) { r -= WEIGHT[i]; if (r < 0) return PIECES[i]; } return PIECES[0]; };
    function load() {
      level++;
      grid = U.grid(C, R, () => null);
      const sx = U.ri(2, C - 3), sy = U.ri(1, R - 2), sd = U.pick([N, EE, SS, WW]);
      src = { x: sx, y: sy, d: sd }; grid[sy][sx] = { p: sd, src: true, lock: true, fill: [] };
      for (let i = 0; i < Math.min(8, level - 1); i++) { const x = U.ri(0, C - 1), y = U.ri(0, R - 1); if (!grid[y][x] && Math.abs(x - sx) + Math.abs(y - sy) > 2) grid[y][x] = { block: true }; }
      queue = U.range(5).map(rndPiece);
      need = 6 + level * 2; count = 0; delay = Math.max(8, 18 - level); tileT = Math.max(0.7, 2.1 * Math.pow(0.9, level - 1));
      flow = null; fast = false; st = 'build'; spill = null; srcK = 0;
      E.stat('Level', level); E.stat('Need', `0/${need}`);
      E.banner(`LEVEL ${level}`, `flow through ${need} pipes`, { color: '#4ade80', life: 1.3 });
    }
    load();
    function place(x, y) {
      if (st !== 'build' && st !== 'flow') return;
      const c = grid[y][x];
      if (c && (c.lock || c.block || c.src)) { E.sfx('error', 1.2, 0.5); return; }
      if (c) { E.score = Math.max(0, E.score - 25); E.pop(OX + x * S + S / 2, OY + y * S + S / 2, '-25', { color: '#f87171', size: 16 }); E.sfx('hit', 1.3, 0.4); }
      grid[y][x] = { p: queue.shift(), fill: [], pop: 1 }; queue.push(rndPiece());
      E.sfx('place', 1 + Math.random() * 0.1);
    }
    function enter(x, y, from) {
      // flow arrives at cell (x,y) through side `from`
      if (x < 0 || y < 0 || x >= C || y >= R) return end();
      const c = grid[y][x];
      if (!c || c.block || c.src || !(c.p & from)) return end(x, y);
      let out;
      if (c.p === 15) out = OPP[from]; else out = c.p & ~from;
      if (c.fill.length && (c.p !== 15 || c.fill.some((f) => f.from === from || f.to === from))) return end(x, y);
      if (c.p === 15 && c.fill.length) { E.score += 500; E.pop(OX + x * S + S / 2, OY + y * S + S / 2 - 20, 'CROSS +500', { color: '#fde047', size: 18 }); E.sfx('power', 1.2, 0.5); }
      c.lock = true; c.fill.push({ from, to: out, k: 0 });
      flow = { x, y, from, to: out, k: 0, f: c.fill[c.fill.length - 1] };
    }
    function end(x, y) {
      spill = x === undefined ? null : [x, y];
      if (count >= need) {
        st = 'clear'; stT = 2.2; const bonus = (count - need) * 100 + level * 200; E.score += bonus;
        E.sfx('win'); E.banner('LEVEL CLEAR', `${count} pipes · +${bonus}`, { color: '#4ade80', life: 2 });
      } else {
        st = 'spill'; E.sfx('splash'); E.sfx('lose'); E.shake(8);
        E.after(1.4, () => E.over({ title: 'Spilled!', msg: `Level ${level}: ${count} of ${need} pipes filled` }));
      }
    }
    return {
      update(dt) {
        T += dt;
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const c = grid[y][x]; if (c && c.pop) c.pop = Math.max(0, c.pop - dt * 5); }
        if (st === 'clear') { stT -= dt; if (stT <= 0) load(); return; }
        if (st === 'spill') return;
        if (E.hit('B', 'KeyF')) { fast = !fast; E.sfx('select'); }
        const sp = fast ? 6 : 1;
        if (st === 'build') { delay -= dt * (fast ? 8 : 1); E.stat('Flow in', Math.ceil(Math.max(0, delay))); if (delay <= 0) { st = 'flow'; E.sfx('splash', 0.6); flow = { src: true, k: 0 }; } }
        if (st === 'flow' && flow) {
          flow.k += (dt * sp) / (flow.src ? tileT * 0.6 : tileT);
          if (flow.f) flow.f.k = Math.min(1, flow.k);
          if (flow.k >= 1) {
            let nx, ny, from;
            if (flow.src) { const [dx, dy] = DIR[src.d]; nx = src.x + dx; ny = src.y + dy; from = OPP[src.d]; srcK = 1; }
            else { count++; E.score += 50; E.stat('Need', `${count}/${need}`); E.sfx('pop', 0.6 + Math.min(count, 30) * 0.03, 0.4); if (count === need) { E.sfx('coin'); E.pop(W / 2, 40, 'TARGET REACHED — keep going!', { color: '#4ade80', size: 20 }); } const [dx, dy] = DIR[flow.to]; nx = flow.x + dx; ny = flow.y + dy; from = OPP[flow.to]; }
            flow = null; enter(nx, ny, from);
          }
        }
        // input
        if (E.ptr.hit) { const x = Math.floor((E.ptr.x - OX) / S), y = Math.floor((E.ptr.y - OY) / S); if (x >= 0 && y >= 0 && x < C && y < R) { cur = [x, y]; place(x, y); } }
        if (E.hit('L')) cur[0] = Math.max(0, cur[0] - 1); if (E.hit('R')) cur[0] = Math.min(C - 1, cur[0] + 1); if (E.hit('U')) cur[1] = Math.max(0, cur[1] - 1); if (E.hit('D')) cur[1] = Math.min(R - 1, cur[1] + 1);
        if (E.hit('A')) place(cur[0], cur[1]);
      },
      draw(g) {
        const t = T;
        D.bg(g, W, H, '#0b1320', '#05080f');
        // board
        D.fillRR(g, OX - 10, OY - 10, C * S + 20, R * S + 20, 14, '#111c2e');
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          const px = OX + x * S, py = OY + y * S, c = grid[y][x];
          g.fillStyle = (x + y) % 2 ? '#1a2740' : '#17223a'; g.fillRect(px, py, S, S);
          g.strokeStyle = 'rgba(148,163,184,.06)'; g.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
          if (!c) continue;
          if (c.block) { D.tile(g, px + 6, py + 6, S - 12, S - 12, 8, '#475569', 5); D.line(g, px + 18, py + 18, px + S - 18, py + S - 22, 'rgba(0,0,0,.3)', 3); continue; }
          if (c.src) { drawSrc(g, px, py, c); continue; }
          const sc = 1 + (c.pop || 0) * 0.15;
          g.save(); g.translate(px + S / 2, py + S / 2); g.scale(sc, sc);
          drawPipe(g, c.p, c.lock ? '#64748b' : '#94a3b8');
          for (const f of c.fill) drawFill(g, f, c.p);
          g.restore();
        }
        if (spill) { const [x, y] = spill; D.glow(g, OX + x * S + S / 2, OY + y * S + S / 2, S, '#4ade80', 0.6 + 0.3 * Math.sin(t * 10)); }
        if (st !== 'spill' && st !== 'clear') D.strokeRR(g, OX + cur[0] * S + 2, OY + cur[1] * S + 2, S - 4, S - 4, 8, `rgba(250,204,21,${0.5 + 0.3 * Math.sin(t * 6)})`, 2.5);
        // hover preview
        if (E.ptr.type === 'mouse') { const x = Math.floor((E.ptr.x - OX) / S), y = Math.floor((E.ptr.y - OY) / S); if (x >= 0 && y >= 0 && x < C && y < R && (!grid[y][x] || (!grid[y][x].lock && !grid[y][x].block))) { g.save(); g.globalAlpha = 0.35; g.translate(OX + x * S + S / 2, OY + y * S + S / 2); drawPipe(g, queue[0], '#e2e8f0'); g.restore(); } }
        // queue
        D.text(g, 'NEXT', 120, 42, { size: 14, font: 'mono', color: 'rgba(255,255,255,.5)' });
        queue.forEach((p, i) => {
          const y = 112 + i * 88, s = i === 0 ? 1.15 : 0.9;
          D.fillRR(g, 120 - 40 * s, y - 40 * s, 80 * s, 80 * s, 12, i === 0 ? '#1e3a2f' : '#131d30');
          if (i === 0) D.strokeRR(g, 120 - 40 * s, y - 40 * s, 80 * s, 80 * s, 12, '#4ade80', 2);
          g.save(); g.translate(120, y); g.scale(s, s); drawPipe(g, p, '#94a3b8'); g.restore();
        });
        // progress
        const k = Math.min(1, count / need);
        D.fillRR(g, OX, OY + R * S + 22, C * S, 12, 6, 'rgba(255,255,255,.08)');
        D.fillRR(g, OX, OY + R * S + 22, C * S * k, 12, 6, count >= need ? '#4ade80' : '#38bdf8');
        D.text(g, `${count} / ${need}`, OX + C * S / 2, OY + R * S + 50, { size: 14, font: 'mono', color: '#e2e8f0' });
        if (st === 'build') D.text(g, `flow starts in ${Math.ceil(Math.max(0, delay))}`, OX + C * S / 2, 36, { size: 18, font: 'ui', weight: 600, color: delay < 4 ? '#f87171' : '#a7f3d0' });
        if (fast) D.text(g, '▶▶ FAST', W - 30, 36, { size: 16, align: 'right', color: '#fde047' });
      },
    };
    function drawPipe(g, p, col) {
      const w = 22, h = S / 2;
      g.lineCap = 'butt';
      const arms = [N, EE, SS, WW].filter((d) => p & d);
      for (const d of arms) { const [dx, dy] = DIR[d]; D.line(g, 0, 0, dx * h, dy * h, '#0f172a', w + 8); }
      for (const d of arms) { const [dx, dy] = DIR[d]; D.line(g, 0, 0, dx * h, dy * h, col, w); D.line(g, dx * 4, dy * 4 - (dx ? 5 : 0), dx * h, dy * h - (dx ? 5 : 0), 'rgba(255,255,255,.25)', 3); }
      if (p !== 15) D.circle(g, 0, 0, w / 2, col);
      else { D.fillRR(g, -w / 2 - 3, -w / 2 - 3, w + 6, w + 6, 4, U.shade(col, -0.2)); }
      for (const d of arms) { const [dx, dy] = DIR[d]; g.fillStyle = U.shade(col, -0.35); if (dx) g.fillRect(dx * h - dx * 6 - 3, -w / 2 - 4, 6, w + 8); else g.fillRect(-w / 2 - 4, dy * h - dy * 6 - 3, w + 8, 6); }
    }
    function drawFill(g, f, p) {
      const h = S / 2, w = 12;
      g.lineCap = 'round';
      const [ax, ay] = DIR[f.from], [bx, by] = DIR[f.to], k = f.k;
      const col = '#4ade80';
      // from edge to center, then center to exit edge
      const k1 = Math.min(1, k * 2), k2 = Math.max(0, k * 2 - 1);
      D.line(g, ax * h, ay * h, ax * h * (1 - k1), ay * h * (1 - k1), col, w);
      if (k2 > 0) D.line(g, 0, 0, bx * h * k2, by * h * k2, col, w);
      D.glow(g, k2 > 0 ? bx * h * k2 : ax * h * (1 - k1), k2 > 0 ? by * h * k2 : ay * h * (1 - k1), 16, '#86efac', 0.7);
      void p;
    }
    function drawSrc(g, px, py, c) {
      const cx = px + S / 2, cy = py + S / 2, [dx, dy] = DIR[c.p];
      D.line(g, cx, cy, cx + dx * S / 2, cy + dy * S / 2, '#0f172a', 30); D.line(g, cx, cy, cx + dx * S / 2, cy + dy * S / 2, '#a16207', 22);
      D.circle(g, cx, cy, 24, '#1e293b', '#fbbf24', 4);
      const k = st === 'build' ? 1 - delay / Math.max(8, 18 - level) : 1;
      g.fillStyle = '#4ade80'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + U.TAU * U.clamp(k, 0, 1)); g.fill();
      if (srcK > 0 || (flow && flow.src)) { const kk = flow && flow.src ? flow.k : 1; D.line(g, cx, cy, cx + dx * S / 2 * kk, cy + dy * S / 2 * kk, '#4ade80', 12); }
    }
  },
});

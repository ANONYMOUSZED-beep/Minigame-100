MG.add({
  id: 'minesweeper', name: 'Minesweeper', cat: 'Puzzle', color: '#10b981', color2: '#ef4444', score: 'low', fmt: 'time',
  desc: 'The logic classic, rebuilt: a safe first click, cascading reveals, chording and satisfying chain explosions.',
  how: ['Click / tap to reveal · right-click or long-press to flag', 'Numbers count the mines touching that square', 'Click a number whose mines are all flagged to clear around it', 'Keys: arrows move, <kbd>Space</kbd> reveal, <kbd>F</kbd> flag'],
  pad: 'LRUDAB', padLabels: { A: 'DIG', B: 'FLAG' },
  make(E) {
    const W = 960, H = 600, C = 18, R = 12, S = 42, MINES = 36, OX = (W - C * S) / 2, OY = 64;
    const NUMC = ['', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#9f1239', '#0d9488', '#111827', '#6b7280'];
    const b = U.grid(C, R, (x, y) => ({ x, y, mine: false, n: 0, open: false, flag: false, at: 0, wrong: false, boom: 0 }));
    let placed = false, time = 0, st = 'play', flags = 0, curX = Math.floor(C / 2), curY = Math.floor(R / 2), press = null, T = 0, opened = 0, loseAt = null;
    const nb = (x, y) => { const o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < C && ny < R) o.push(b[ny][nx]); } return o; };
    E.stat('Mines', MINES);
    function place(sx, sy) {
      const cells = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (Math.abs(x - sx) > 1 || Math.abs(y - sy) > 1) cells.push(b[y][x]);
      U.shuffle(cells).slice(0, MINES).forEach((c) => (c.mine = true));
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) b[y][x].n = nb(x, y).filter((c) => c.mine).length;
      placed = true;
    }
    function reveal(c0) {
      if (c0.open || c0.flag) return;
      if (!placed) place(c0.x, c0.y);
      if (c0.mine) { lose(c0); return; }
      // BFS cascade with staggered animation
      const q = [[c0, 0]]; c0.open = true; c0.at = T; opened++;
      let n = 0;
      while (q.length) {
        const [c, d] = q.shift(); n++;
        if (c.n === 0) for (const o of nb(c.x, c.y)) if (!o.open && !o.flag && !o.mine) { o.open = true; o.at = T + (d + 1) * 0.018; opened++; q.push([o, d + 1]); }
      }
      E.sfx(n > 6 ? 'whoosh' : 'click', n > 6 ? 1.3 : 1, n > 6 ? 0.5 : 0.6);
      if (opened === C * R - MINES) win();
    }
    function chord(c) {
      if (!c.open || !c.n) return;
      const ns = nb(c.x, c.y), f = ns.filter((o) => o.flag).length;
      if (f !== c.n) { for (const o of ns) if (!o.open && !o.flag) o.hint = 0.25; return; }
      for (const o of ns) if (!o.open && !o.flag) { reveal(o); if (st !== 'play') return; }
    }
    function flag(c) {
      if (c.open) return;
      c.flag = !c.flag; flags += c.flag ? 1 : -1; c.fl = 1;
      E.sfx(c.flag ? 'place' : 'tick', c.flag ? 1.2 : 0.8, 0.6);
      E.stat('Mines', MINES - flags);
    }
    function lose(c) {
      st = 'lost'; c.open = true; c.boom = 1; loseAt = c;
      E.sfx('explode'); E.shake(16); E.flash('#ef4444', 0.4); E.vibrate(250);
      const [x, y] = pos(c); E.burst(x + S / 2, y + S / 2, { n: 40, colors: ['#fde68a', '#f97316', '#111'], speed: 360 });
      const rest = [];
      for (let yy = 0; yy < R; yy++) for (let xx = 0; xx < C; xx++) { const o = b[yy][xx]; if (o.mine && o !== c && !o.flag) rest.push(o); if (o.flag && !o.mine) o.wrong = true; }
      rest.sort((a, q) => U.dist(a.x, a.y, c.x, c.y) - U.dist(q.x, q.y, c.x, c.y));
      rest.forEach((o, i) => E.after(0.25 + i * 0.05, () => { o.open = true; o.boom = 1; const [px, py] = pos(o); E.burst(px + S / 2, py + S / 2, { n: 10, colors: ['#f97316', '#111'], speed: 160 }); if (i % 3 === 0) E.sfx('hit', 0.6 + Math.random() * 0.3, 0.5); }));
      E.after(0.9 + rest.length * 0.05, () => E.over({ win: false, title: 'Boom!', msg: `${Math.round((opened / (C * R - MINES)) * 100)}% of the field cleared` }));
    }
    function win() {
      st = 'won'; E.score = time;
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const o = b[y][x]; if (o.mine && !o.flag) { o.flag = true; o.fl = 1; } }
      E.stat('Mines', 0); E.sfx('win');
      for (let i = 0; i < 6; i++) E.after(i * 0.15, () => E.burst(U.rand(OX, OX + C * S), U.rand(OY, OY + R * S), { n: 30, colors: ['#10b981', '#fde047', '#f472b6', '#fff'], speed: 300, grav: 300 }));
      E.after(1.4, () => E.over({ win: true, title: 'Field Cleared!', msg: `${MINES} mines on ${C}×${R} in ${U.fmtTime(time, 2)}s` }));
    }
    const pos = (c) => [OX + c.x * S, OY + c.y * S];
    const cellAt = (px, py) => { const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S); return x >= 0 && y >= 0 && x < C && y < R ? b[y][x] : null; };
    return {
      update(dt) {
        T += dt;
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const c = b[y][x]; if (c.fl) c.fl = Math.max(0, c.fl - dt * 5); if (c.hint) c.hint = Math.max(0, c.hint - dt); }
        if (st !== 'play') return;
        if (placed) { time += dt; E.score = time; }
        E.stat('Time', Math.floor(time));
        const p = E.ptr;
        if (p.hit) { const c = cellAt(p.x, p.y); press = c ? { c, t: 0, used: false } : null; if (c) { curX = c.x; curY = c.y; } }
        if (press && p.down) { press.t += dt; if (!press.used && press.t > 0.38 && p.type !== 'mouse') { press.used = true; if (press.c.open) chord(press.c); else flag(press.c); E.vibrate(30); } }
        if (press && p.up) { const c = cellAt(p.x, p.y); if (!press.used && c === press.c) { if (c.open) chord(c); else reveal(c); } press = null; }
        if (p.rhit) { const c = cellAt(p.x, p.y); if (c) { if (c.open) chord(c); else flag(c); } }
        if (E.hit('L')) curX = Math.max(0, curX - 1); if (E.hit('R')) curX = Math.min(C - 1, curX + 1);
        if (E.hit('U')) curY = Math.max(0, curY - 1); if (E.hit('D')) curY = Math.min(R - 1, curY + 1);
        if (E.hit('A') || E.hit('Enter')) { const c = b[curY][curX]; if (c.open) chord(c); else reveal(c); }
        if (E.hit('B') || E.hit('KeyF')) { const c = b[curY][curX]; if (c.open) chord(c); else flag(c); }
      },
      draw(g) {
        const t = T;
        D.bg(g, W, H, '#052e2b', '#021412');
        D.glow(g, W / 2, H / 2, 520, '#10b981', 0.1);
        D.shadow(g, W / 2, OY + R * S + 10, C * S * 0.5, 14, 0.5);
        D.fillRR(g, OX - 10, OY - 10, C * S + 20, R * S + 20, 14, '#064e3b');
        const hov = E.ptr.type === 'mouse' ? cellAt(E.ptr.x, E.ptr.y) : null;
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          const c = b[y][x], [px, py] = pos(c), alt = (x + y) % 2;
          const shown = c.open && t >= c.at;
          if (shown) {
            g.fillStyle = alt ? '#e7d8b8' : '#dccaa3'; g.fillRect(px, py, S, S);
            if (c.mine) {
              g.fillStyle = c === loseAt ? '#ef4444' : 'rgba(239,68,68,.35)'; g.fillRect(px, py, S, S);
              const cx = px + S / 2, cy = py + S / 2;
              for (let k = 0; k < 8; k++) { const a = (k / 8) * U.TAU; D.line(g, cx, cy, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, '#111827', 3); }
              D.orb(g, cx, cy, 10, '#1f2937', 0.5);
            } else if (c.n) {
              const k = Math.min(1, (t - c.at) * 10);
              D.text(g, c.n, px + S / 2, py + S / 2 + 1, { size: 24 * (0.6 + 0.4 * k), color: NUMC[c.n] });
            }
          } else {
            const lift = c.hint ? -2 : 0;
            g.fillStyle = alt ? '#34d399' : '#10b981'; g.fillRect(px, py, S, S);
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px, py, S, 3);
            g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px, py + S - 3, S, 3);
            if (hov === c && st === 'play') { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(px, py, S, S); }
            if (c.hint) { g.fillStyle = `rgba(250,204,21,${c.hint * 1.6})`; g.fillRect(px, py, S, S); }
            if (c.flag) {
              const s = 1 + Math.sin((c.fl || 0) * Math.PI) * 0.35, fx = px + S / 2, fy = py + S / 2 + lift;
              g.save(); g.translate(fx, fy); g.scale(s, s);
              D.line(g, -3, -12, -3, 12, '#1f2937', 3); D.fillRR(g, -10, 9, 16, 5, 2, '#1f2937');
              D.poly(g, [[-3, -13], [12, -6], [-3, 1]], c.wrong ? '#6b7280' : '#ef4444');
              g.restore();
              if (c.wrong) { D.line(g, px + 8, py + 8, px + S - 8, py + S - 8, '#111', 3); D.line(g, px + S - 8, py + 8, px + 8, py + S - 8, '#111', 3); }
            }
          }
        }
        // soft seams between revealed / hidden
        g.strokeStyle = 'rgba(6,78,59,.25)'; g.lineWidth = 1; g.strokeRect(OX + 0.5, OY + 0.5, C * S - 1, R * S - 1);
        if (st === 'play' && (E.ptr.type !== 'mouse' && E.ptr.type !== 'touch')) D.strokeRR(g, OX + curX * S + 2, OY + curY * S + 2, S - 4, S - 4, 6, `rgba(250,204,21,${0.6 + 0.4 * Math.sin(t * 6)})`, 3);
        // header
        for (let k = 0; k < 8; k++) { const a = (k / 8) * U.TAU; D.line(g, OX + 10, 32, OX + 10 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, '#fca5a5', 2); }
        D.circle(g, OX + 10, 32, 7, '#fca5a5');
        D.text(g, MINES - flags, OX + 30, 33, { size: 20, align: 'left', font: 'mono', color: '#fca5a5' });
        D.text(g, U.fmtTime(time, 1), OX + C * S, 32, { size: 20, align: 'right', font: 'mono', color: '#a7f3d0' });
        if (!placed) D.text(g, 'first click is always safe', W / 2, 32, { size: 14, font: 'mono', color: 'rgba(255,255,255,.45)' });
      },
    };
  },
});

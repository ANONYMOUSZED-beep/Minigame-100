MG.add({
  id: 'uttt', name: 'Ultimate Tic-Tac-Toe', cat: 'Board', color: '#22d3ee', color2: '#f472b6',
  desc: 'Tic-tac-toe inside tic-tac-toe. Where you play decides where your opponent must play next. Versus a Monte-Carlo tree search AI.',
  how: ['Win small boards by getting three in a row; win three small boards in a row to win the game', 'The square you pick sends your opponent to the matching small board', 'If that board is finished, they may play anywhere', 'Beat three AI levels · click / tap, or arrows + <kbd>Space</kbd>'],
  pad: 'LRUDA', padLabels: { A: 'PLACE' },
  make(E) {
    const W = 960, H = 600, S = 54, GAPB = 14, BS = 3 * S, BX = (W - (3 * BS + 2 * GAPB)) / 2 + 100, BY = (H - (3 * BS + 2 * GAPB)) / 2 + 10;
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const OPP = [{ name: 'Spark', iters: 250 }, { name: 'Circuit', iters: 1800 }, { name: 'Oracle', iters: 7000 }];
    let lv = 0, s, st, stT, T = 0, marks, last = -1, cur = 40, think = null, lastResult = null, first = 1;
    const newState = () => ({ c: new Int8Array(81), sm: new Int8Array(9), next: -1, turn: 1, win: 0, n: 0 });
    const clone = (q) => ({ c: q.c.slice(), sm: q.sm.slice(), next: q.next, turn: q.turn, win: q.win, n: q.n });
    function lineWin(get) { for (const [a, b, c] of LINES) { const v = get(a); if (v && v !== 3 && v === get(b) && v === get(c)) return v; } return 0; }
    function legal(q) {
      const out = [];
      if (q.win) return out;
      const boards = q.next >= 0 && !q.sm[q.next] ? [q.next] : U.range(9).filter((b) => !q.sm[b]);
      for (const b of boards) for (let k = 0; k < 9; k++) if (!q.c[b * 9 + k]) out.push(b * 9 + k);
      return out;
    }
    function play(q, m) {
      const b = (m / 9) | 0, k = m % 9;
      q.c[m] = q.turn; q.n++;
      if (!q.sm[b]) { const w = lineWin((i) => q.c[b * 9 + i]); if (w) q.sm[b] = w; else { let full = true; for (let i = 0; i < 9; i++) if (!q.c[b * 9 + i]) { full = false; break; } if (full) q.sm[b] = 3; } }
      const bw = lineWin((i) => q.sm[i]);
      if (bw) q.win = bw; else if (q.sm.every((v) => v)) q.win = 3;
      q.next = q.sm[k] ? -1 : k; q.turn = 3 - q.turn;
    }
    // ---------- MCTS (runs a slice of iterations per frame) ----------
    function mctsStart(root) {
      const node = { m: -1, p: null, ch: [], un: legal(root), w: 0, v: 0, pl: 3 - root.turn };
      return { root, node, it: 0 };
    }
    function mctsStep(M, n) {
      for (let i = 0; i < n; i++) {
        let nd = M.node; const q = clone(M.root);
        while (!nd.un.length && nd.ch.length) {
          let best = null, bv = -Infinity; const lg = Math.log(nd.v);
          for (const c of nd.ch) { const u = c.w / c.v + 1.35 * Math.sqrt(lg / c.v); if (u > bv) { bv = u; best = c; } }
          nd = best; play(q, nd.m);
        }
        if (nd.un.length) { const j = (Math.random() * nd.un.length) | 0, m = nd.un[j]; nd.un[j] = nd.un[nd.un.length - 1]; nd.un.pop(); const pl = q.turn; play(q, m); const c = { m, p: nd, ch: [], un: legal(q), w: 0, v: 0, pl }; nd.ch.push(c); nd = c; }
        // rollout
        let guard = 0;
        while (!q.win && guard++ < 90) { const L = legal(q); if (!L.length) { q.win = 3; break; } play(q, L[(Math.random() * L.length) | 0]); }
        for (let x = nd; x; x = x.p) { x.v++; if (q.win === x.pl) x.w += 1; else if (q.win === 3) x.w += 0.5; }
        M.it++;
      }
    }
    function reset() {
      s = newState(); s.turn = first; st = 'play'; last = -1; think = null; marks = []; lastResult = null;
      E.stat('Opponent', `${lv + 1}/3 ${OPP[lv].name}`);
    }
    reset();
    E.banner(OPP[0].name.toUpperCase(), 'You are X · you move first', { color: '#22d3ee', life: 1.6 });
    function move(m) {
      const pl = s.turn, b = (m / 9) | 0, before = s.sm[b];
      play(s, m); last = m; marks.push({ m, t: 0 });
      E.sfx('place', pl === 1 ? 1.2 : 0.9, 0.55);
      if (!before && s.sm[b] && s.sm[b] !== 3) { E.sfx('match', pl === 1 ? 1.1 : 0.8); const [x, y] = boardXY(b); E.burst(x + BS / 2, y + BS / 2, { n: 24, colors: [pl === 1 ? '#22d3ee' : '#f472b6', '#fff'], speed: 240 }); }
      if (s.win) {
        st = 'end'; stT = 2.6; lastResult = s.win;
        if (s.win === 1) { const pts = (lv + 1) * 1000 + Math.max(0, 81 - s.n) * 10; E.score += pts; E.sfx('win'); E.banner('YOU WIN!', `${OPP[lv].name} defeated · +${pts}`, { color: '#22d3ee', life: 2.4 }); }
        else if (s.win === 2) { E.sfx('lose'); E.banner('DEFEAT', `${OPP[lv].name} takes the board`, { color: '#f472b6', life: 2.4 }); }
        else { E.sfx('error'); E.banner('DRAW', 'Replaying', { color: '#94a3b8', life: 2 }); }
      }
    }
    const boardXY = (b) => [BX + (b % 3) * (BS + GAPB), BY + ((b / 3) | 0) * (BS + GAPB)];
    const cellXY = (m) => { const b = (m / 9) | 0, k = m % 9, [x, y] = boardXY(b); return [x + (k % 3) * S, y + ((k / 3) | 0) * S]; };
    return {
      update(dt) {
        T += dt; for (const mk of marks) mk.t += dt;
        if (st === 'end') {
          stT -= dt;
          if (stT <= 0) {
            if (lastResult === 1) { if (lv >= OPP.length - 1) { st = 'done'; E.over({ win: true, title: 'Ultimate Champion', msg: 'All three AIs beaten' }); return; } lv++; first = lv % 2 ? 2 : 1; reset(); E.banner(OPP[lv].name.toUpperCase(), first === 1 ? 'You move first' : 'They move first', { color: '#22d3ee', life: 1.6 }); }
            else if (lastResult === 2) { st = 'done'; E.over({ title: 'Outplayed', msg: `Lost to ${OPP[lv].name} · level ${lv + 1} of 3` }); }
            else { first = 3 - first; reset(); }
          }
          return;
        }
        if (st !== 'play') return;
        if (s.turn === 2) {
          if (!think) think = { M: mctsStart(clone(s)), t: 0 };
          think.t += dt;
          const t0 = performance.now();
          while (performance.now() - t0 < 9 && think.M.it < OPP[lv].iters) mctsStep(think.M, 25);
          if (think.M.it >= OPP[lv].iters && think.t > 0.5) {
            const best = think.M.node.ch.reduce((a, b) => (b.v > a.v ? b : a));
            think = null; move(best.m);
          }
          return;
        }
        const L = legal(s);
        if (E.ptr.hit) { for (const m of L) { const [x, y] = cellXY(m); if (U.ptInRect(E.ptr.x, E.ptr.y, x, y, S, S)) { cur = m; move(m); return; } } E.sfx('tick', 0.6, 0.3); }
        const gx = (m) => ((m / 9) | 0) % 3 * 3 + (m % 9) % 3, gy = (m) => (((m / 9) | 0) / 3 | 0) * 3 + (((m % 9) / 3) | 0);
        const toM = (x, y) => (((y / 3) | 0) * 3 + ((x / 3) | 0)) * 9 + (y % 3) * 3 + (x % 3);
        let x = gx(cur), y = gy(cur);
        if (E.hit('L')) x = (x + 8) % 9; if (E.hit('R')) x = (x + 1) % 9; if (E.hit('U')) y = (y + 8) % 9; if (E.hit('D')) y = (y + 1) % 9;
        cur = toM(x, y);
        if (E.hit('A')) { if (L.includes(cur)) move(cur); else E.sfx('error', 1.2, 0.4); }
      },
      draw(g) {
        const t = T, L = st === 'play' && s.turn === 1 ? new Set(legal(s)) : new Set();
        D.radialBg(g, W, H, '#1e1b4b', '#05030f');
        // ladder
        OPP.forEach((o, i) => {
          const y = 170 + i * 96, curO = i === lv;
          D.fillRR(g, 30, y - 34, 200, 68, 14, curO ? 'rgba(244,114,182,.18)' : 'rgba(255,255,255,.04)');
          if (curO) D.strokeRR(g, 30, y - 34, 200, 68, 14, '#f472b6', 2);
          D.text(g, o.name, 60, y - 8, { size: 18, align: 'left', color: curO ? '#fff' : 'rgba(255,255,255,.5)' });
          D.text(g, `${o.iters.toLocaleString()} simulations / move`, 60, y + 14, { size: 11, align: 'left', font: 'mono', color: 'rgba(255,255,255,.4)' });
          if (i < lv) D.text(g, '✓', 205, y, { size: 22, color: '#4ade80' });
        });
        for (let b = 0; b < 9; b++) {
          const [x, y] = boardXY(b), active = [...L].some((m) => ((m / 9) | 0) === b);
          D.fillRR(g, x - 6, y - 6, BS + 12, BS + 12, 12, active ? `rgba(34,211,238,${0.12 + 0.06 * Math.sin(t * 4)})` : 'rgba(255,255,255,.035)');
          if (active) D.strokeRR(g, x - 6, y - 6, BS + 12, BS + 12, 12, 'rgba(34,211,238,.6)', 2);
          for (let i = 1; i < 3; i++) { D.line(g, x + i * S, y + 6, x + i * S, y + BS - 6, 'rgba(255,255,255,.18)', 2); D.line(g, x + 6, y + i * S, x + BS - 6, y + i * S, 'rgba(255,255,255,.18)', 2); }
        }
        for (let m = 0; m < 81; m++) {
          const v = s.c[m]; if (!v) { if (L.has(m) && E.ptr.type === 'mouse') { const [x, y] = cellXY(m); if (U.ptInRect(E.ptr.x, E.ptr.y, x, y, S, S)) mark(g, x + S / 2, y + S / 2, 1, S * 0.3, 0.3, 1); } continue; }
          const [x, y] = cellXY(m), mk = marks.find((q) => q.m === m), k = mk ? Math.min(1, mk.t * 5) : 1;
          const dim = s.sm[(m / 9) | 0] ? 0.35 : 1;
          if (m === last) D.fillRR(g, x + 3, y + 3, S - 6, S - 6, 8, 'rgba(255,255,255,.08)');
          mark(g, x + S / 2, y + S / 2, v, S * 0.3, dim, k);
        }
        for (let b = 0; b < 9; b++) { const w = s.sm[b]; if (!w || w === 3) continue; const [x, y] = boardXY(b); mark(g, x + BS / 2, y + BS / 2, w, BS * 0.36, 1, 1, 10); }
        if (st === 'play' && E.ptr.type !== 'mouse' && E.ptr.type !== 'touch' && s.turn === 1) { const [x, y] = cellXY(cur); D.strokeRR(g, x + 3, y + 3, S - 6, S - 6, 8, '#fde047', 2.5); }
        if (st === 'play' && s.turn === 2) D.text(g, `${OPP[lv].name} is thinking${'.'.repeat(1 + (Math.floor(t * 3) % 3))}`, BX + (3 * BS + 2 * GAPB) / 2, BY - 22, { size: 15, font: 'ui', weight: 600, color: '#f9a8d4' });
        else if (st === 'play') D.text(g, 'Your move', BX + (3 * BS + 2 * GAPB) / 2, BY - 22, { size: 15, font: 'ui', weight: 600, color: '#67e8f9' });
      },
    };
    function mark(g, x, y, v, r, a, k, lw = 5) {
      g.globalAlpha = a; g.lineCap = 'round';
      if (v === 1) { const e = r * k; D.glow(g, x, y, r * 2, '#22d3ee', 0.3 * a); D.line(g, x - e, y - e, x + e, y + e, '#22d3ee', lw); D.line(g, x + e, y - e, x - e, y + e, '#22d3ee', lw); }
      else { D.glow(g, x, y, r * 2, '#f472b6', 0.3 * a); g.strokeStyle = '#f472b6'; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + U.TAU * k); g.stroke(); }
      g.globalAlpha = 1;
    }
  },
});

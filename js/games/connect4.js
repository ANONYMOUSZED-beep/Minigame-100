MG.add({
  id: 'connect4', name: 'Four in a Row', cat: 'Board', color: '#facc15', color2: '#ef4444',
  desc: 'Drop discs, connect four. Climb a ladder of four AI opponents, up to an alpha-beta Grandmaster that looks eight moves ahead.',
  how: ['Click / tap a column (or <kbd>1</kbd>–<kbd>7</kbd>, or arrows + <kbd>Space</kbd>) to drop a disc', 'Line up four in a row — across, down or diagonally', 'Beat each opponent to climb the ladder · a draw replays the round', 'Lose once and the run is over'],
  pad: 'LRA', padLabels: { A: 'DROP' },
  make(E) {
    const W = 960, H = 600, CO = 7, RO = 6, S = 72, BX = (W - CO * S) / 2 + 90, BY = 118;
    const OPP = [{ name: 'Rookie Rex', depth: 2, noise: 0.35 }, { name: 'Clever Cleo', depth: 4, noise: 0.1 }, { name: 'Master Mo', depth: 6, noise: 0 }, { name: 'Grandmaster Vex', depth: 8, noise: 0 }];
    // all 69 winning windows
    const WINS = [];
    for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const cells = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= RO || cc < 0 || cc >= CO) break; cells.push(rr * CO + cc); } if (cells.length === 4) WINS.push(cells); }
    const BY_CELL = U.range(RO * CO).map((i) => WINS.filter((w) => w.includes(i)));
    let opp = 0, board, heights, turn, st, stT, discs, winLine, hoverC = 3, T = 0, thinking = 0, first = 1, moveCount = 0;
    function reset() {
      board = new Array(RO * CO).fill(0); heights = new Array(CO).fill(0); discs = []; winLine = null; moveCount = 0;
      turn = first; st = 'play'; thinking = 0;
      E.stat('Opponent', `${opp + 1}/4 ${OPP[opp].name}`);
    }
    reset();
    E.banner(OPP[0].name.toUpperCase(), 'Round 1 · you are yellow', { color: '#facc15', life: 1.6 });
    const cellOf = (c) => (RO - 1 - heights[c]) * CO + c;
    function winAt(b, i, p) { for (const w of BY_CELL[i]) if (b[w[0]] === p && b[w[1]] === p && b[w[2]] === p && b[w[3]] === p) return w; return null; }
    function evalBoard(b) {
      let s = 0;
      for (const w of WINS) { let a = 0, h = 0; for (const i of w) { if (b[i] === 2) a++; else if (b[i] === 1) h++; } if (a && h) continue; if (a === 3) s += 50; else if (a === 2) s += 6; if (h === 3) s -= 60; else if (h === 2) s -= 6; }
      for (let r = 0; r < RO; r++) { if (b[r * CO + 3] === 2) s += 4; else if (b[r * CO + 3] === 1) s -= 4; }
      return s;
    }
    const ORDER = [3, 2, 4, 1, 5, 0, 6];
    function negamax(b, hts, depth, alpha, beta, p, ply) {
      let moves = 0;
      for (const c of ORDER) {
        if (hts[c] >= RO) continue; moves++;
        const i = (RO - 1 - hts[c]) * CO + c; b[i] = p;
        if (winAt(b, i, p)) { b[i] = 0; return 100000 - ply; }
        b[i] = 0;
      }
      if (!moves) return 0;
      if (depth === 0) return (p === 2 ? 1 : -1) * evalBoard(b);
      let best = -Infinity;
      for (const c of ORDER) {
        if (hts[c] >= RO) continue;
        const i = (RO - 1 - hts[c]) * CO + c; b[i] = p; hts[c]++;
        const v = -negamax(b, hts, depth - 1, -beta, -alpha, 3 - p, ply + 1);
        b[i] = 0; hts[c]--;
        if (v > best) best = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
      }
      return best;
    }
    function aiMove() {
      const o = OPP[opp], b = board.slice(), hts = heights.slice();
      const scored = [];
      for (const c of ORDER) {
        if (hts[c] >= RO) continue;
        const i = (RO - 1 - hts[c]) * CO + c; b[i] = 2;
        let v;
        if (winAt(b, i, 2)) v = 1e6; else { hts[c]++; v = -negamax(b, hts, o.depth - 1, -Infinity, Infinity, 1, 1); hts[c]--; }
        b[i] = 0; scored.push([c, v + (Math.random() - 0.5) * o.noise * 200]);
      }
      scored.sort((a, q) => q[1] - a[1]);
      return scored[0][0];
    }
    function drop(c, p) {
      if (heights[c] >= RO) return false;
      const i = cellOf(c); board[i] = p; heights[c]++; moveCount++;
      const r = (i / CO) | 0;
      discs.push({ c, r, p, y: BY - S, vy: 0, i, land: false });
      E.sfx('whoosh', 1.6, 0.25);
      const w = winAt(board, i, p);
      if (w) { winLine = w; st = 'end'; stT = 2.4; E.after(0.45, () => resultRound(p)); }
      else if (moveCount === RO * CO) { st = 'end'; stT = 2.2; E.after(0.45, () => resultRound(0)); }
      else turn = 3 - p;
      return true;
    }
    function resultRound(p) {
      if (p === 1) {
        const pts = (opp + 1) * 1000 + Math.max(0, 42 - moveCount) * 20; E.score += pts;
        E.sfx('win'); E.banner('YOU WIN!', `${OPP[opp].name} defeated · +${pts}`, { color: '#facc15', life: 2.2 });
        for (const i of winLine) E.burst(BX + (i % CO) * S + S / 2, BY + ((i / CO) | 0) * S + S / 2, { n: 16, colors: ['#facc15', '#fff'], speed: 220 });
      } else if (p === 2) { E.sfx('lose'); E.banner('DEFEAT', `${OPP[opp].name} connects four`, { color: '#ef4444', life: 2.2 }); }
      else { E.sfx('error'); E.banner('DRAW', 'Replaying the round', { color: '#94a3b8', life: 2 }); }
      st = 'end'; stT = 2.4; lastResult = p;
    }
    let lastResult = null;
    return {
      update(dt) {
        T += dt;
        for (const d of discs) if (!d.land) {
          const ty = BY + d.r * S; d.vy += 3200 * dt; d.y += d.vy * dt;
          if (d.y >= ty) { d.y = ty; if (d.vy > 500) { d.vy = -d.vy * 0.28; E.sfx('thud', 1.3 + d.r * 0.05, Math.min(0.6, d.vy / -600)); } else { d.vy = 0; d.land = true; } }
        }
        if (st === 'end') {
          stT -= dt;
          if (stT <= 0 && lastResult !== null) {
            const r = lastResult; lastResult = null;
            if (r === 1) { if (opp >= OPP.length - 1) { st = 'done'; E.over({ win: true, title: 'Grandmaster!', msg: 'All four opponents beaten' }); return; } opp++; first = 1 + (opp % 2); reset(); E.banner(OPP[opp].name.toUpperCase(), `Round ${opp + 1} · ${first === 1 ? 'you start' : 'they start'}`, { color: '#facc15', life: 1.6 }); }
            else if (r === 2) { st = 'done'; E.over({ title: 'Defeated', msg: `Lost to ${OPP[opp].name} · reached round ${opp + 1} of 4` }); }
            else { first = 3 - first; reset(); }
          }
          return;
        }
        if (st !== 'play') return;
        if (turn === 2) {
          thinking += dt;
          if (thinking > 0.45 && discs.every((d) => d.land)) { thinking = 0; drop(aiMove(), 2); }
          return;
        }
        if (E.ptr.moved || E.ptr.hit) { const c = Math.floor((E.ptr.x - BX) / S); if (c >= 0 && c < CO) hoverC = c; }
        if (E.hit('L')) hoverC = Math.max(0, hoverC - 1); if (E.hit('R')) hoverC = Math.min(CO - 1, hoverC + 1);
        for (let c = 0; c < CO; c++) if (E.hit('Digit' + (c + 1))) { hoverC = c; if (drop(c, 1)) return; }
        if ((E.ptr.hit && E.ptr.x > BX && E.ptr.x < BX + CO * S) || E.hit('A')) { if (!drop(hoverC, 1)) E.sfx('error', 1.2, 0.4); }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#1e3a8a', '#0b1026');
        // opponent ladder
        OPP.forEach((o, i) => {
          const y = 150 + i * 90, cur = i === opp;
          D.fillRR(g, 24, y - 32, 212, 64, 14, cur ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.04)');
          if (cur) D.strokeRR(g, 24, y - 32, 212, 64, 14, '#ef4444', 2);
          D.circle(g, 62, y, 18, i < opp ? '#4b5563' : '#ef4444', 'rgba(255,255,255,.3)', 2);
          if (i < opp) D.text(g, '✓', 62, y + 1, { size: 18, color: '#4ade80' });
          D.text(g, o.name, 92, y - 8, { size: 15, align: 'left', font: 'ui', weight: 700, color: cur ? '#fff' : 'rgba(255,255,255,.55)' });
          D.text(g, `looks ${o.depth} moves ahead`, 92, y + 12, { size: 11, align: 'left', font: 'mono', color: 'rgba(255,255,255,.4)' });
        });
        // hover disc
        if (st === 'play' && turn === 1) { const x = BX + hoverC * S + S / 2; disc(g, x, BY - S * 0.62, 1, 0.9); }
        if (st === 'play' && turn === 2) D.text(g, `${OPP[opp].name} is thinking${'.'.repeat(1 + (Math.floor(t * 3) % 3))}`, BX + (CO * S) / 2, BY - 50, { size: 16, font: 'ui', weight: 600, color: '#fca5a5' });
        // discs (behind board face)
        for (const d of discs) disc(g, BX + d.c * S + S / 2, d.y + S / 2, d.p, 1);
        // board with holes
        g.save();
        g.beginPath(); D.rr(g, BX - 12, BY - 12, CO * S + 24, RO * S + 24, 20);
        for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) { g.moveTo(BX + c * S + S / 2 + S * 0.4, BY + r * S + S / 2); g.arc(BX + c * S + S / 2, BY + r * S + S / 2, S * 0.4, 0, U.TAU, true); }
        const bg = g.createLinearGradient(0, BY, 0, BY + RO * S); bg.addColorStop(0, '#2563eb'); bg.addColorStop(1, '#1d4ed8');
        g.fillStyle = bg; g.fill('evenodd');
        g.restore();
        for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) D.circle(g, BX + c * S + S / 2, BY + r * S + S / 2, S * 0.4, null, 'rgba(0,0,0,.25)', 3);
        D.fillRR(g, BX - 24, BY + RO * S + 8, CO * S + 48, 16, 6, '#1e40af');
        if (winLine) for (const i of winLine) { const x = BX + (i % CO) * S + S / 2, y = BY + ((i / CO) | 0) * S + S / 2; D.circle(g, x, y, S * 0.3 + Math.sin(t * 8) * 3, null, '#fff', 4); }
        D.text(g, E.score, W - 40, 40, { size: 26, align: 'right', color: '#fff' });
      },
    };
    function disc(g, x, y, p, a) {
      g.globalAlpha = a;
      const col = p === 1 ? '#facc15' : '#ef4444';
      D.orb(g, x, y, S * 0.4, col, 0.4);
      D.circle(g, x, y, S * 0.27, null, U.shade(col, -0.25), 3);
      g.globalAlpha = 1;
    }
  },
});

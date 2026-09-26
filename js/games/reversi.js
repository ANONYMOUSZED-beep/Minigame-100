MG.add({
  id: 'reversi', name: 'Reversi', cat: 'Board', color: '#22c55e', color2: '#f8fafc',
  desc: 'Outflank and flip. Corners are gold, edges are traps — against an AI that knows both, at three strengths.',
  how: ['Pick a difficulty, then place a disc so it traps enemy discs in a straight line', 'Every trapped disc flips to your colour', 'No legal move? Your turn passes automatically', 'Most discs when the board locks up wins'],
  pad: false,
  make(E) {
    const W = 960, H = 600, S = 66, BX = (W - 8 * S) / 2 + 110, BY = (H - 8 * S) / 2;
    const LEVELS = [{ name: 'Casual', depth: 1, mult: 1, ms: 60 }, { name: 'Club', depth: 3, mult: 2, ms: 150 }, { name: 'Master', depth: 8, mult: 4, ms: 280 }];
    const PW = [
      100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5,
      5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100,
    ];
    const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    let b = new Int8Array(64), turn = 1, st = 'choose', level = 0, flips = new Array(64).fill(null), T = 0, thinkT = 0, last = -1, passMsg = null, deadline = 0;
    b[27] = b[36] = -1; b[28] = b[35] = 1;
    function flipsFor(bd, i, side) {
      if (bd[i]) return [];
      const out = [], r = i >> 3, c = i & 7;
      for (const [dr, dc] of DIRS) {
        const line = []; let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === -side) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
        if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === side) out.push(...line);
      }
      return out;
    }
    const legal = (bd, side) => { const o = []; for (let i = 0; i < 64; i++) if (!bd[i] && flipsFor(bd, i, side).length) o.push(i); return o; };
    function evaluate(bd, side) {
      let pos = 0, mine = 0, theirs = 0;
      for (let i = 0; i < 64; i++) { if (bd[i] === side) { pos += PW[i]; mine++; } else if (bd[i] === -side) { pos -= PW[i]; theirs++; } }
      const mob = legal(bd, side).length - legal(bd, -side).length;
      const empties = 64 - mine - theirs;
      return pos + mob * 8 + (empties < 12 ? (mine - theirs) * 12 : 0);
    }
    function negamax(bd, side, depth, alpha, beta, passed) {
      if (performance.now() > deadline) throw 'timeout';
      const ms = legal(bd, side);
      if (!ms.length) {
        if (passed) { let d = 0; for (let i = 0; i < 64; i++) d += bd[i] * side; return d * 1000; }
        return -negamax(bd, -side, depth, -beta, -alpha, true);
      }
      if (depth <= 0) return evaluate(bd, side);
      ms.sort((x, y) => PW[y] - PW[x]);
      let best = -Infinity;
      for (const m of ms) {
        const nb = bd.slice(); nb[m] = side; for (const f of flipsFor(bd, m, side)) nb[f] = side;
        const v = -negamax(nb, -side, depth - 1, -beta, -alpha, false);
        if (v > best) best = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
      }
      return best;
    }
    function aiChoose() {
      const ms = legal(b, -1).sort((x, y) => PW[y] - PW[x]); let best = ms[0];
      if (level === 0) return Math.random() < 0.5 ? U.pick(ms) : best;
      deadline = performance.now() + LEVELS[level].ms;
      for (let d = 1; d <= LEVELS[level].depth; d++) {
        let db = null, bv = -Infinity;
        try { for (const m of ms) { const nb = b.slice(); nb[m] = -1; for (const f of flipsFor(b, m, -1)) nb[f] = -1; const v = -negamax(nb, 1, d - 1, -Infinity, Infinity, false); if (v > bv) { bv = v; db = m; } } } catch (e) { if (e !== 'timeout') throw e; break; }
        best = db; ms.sort((x, y) => (x === db ? -1 : y === db ? 1 : 0));
      }
      return best;
    }
    function place(i, side) {
      const fl = flipsFor(b, i, side); if (!fl.length) return false;
      b[i] = side; last = i; flips[i] = { t: 0, from: side };
      const r0 = i >> 3, c0 = i & 7;
      for (const f of fl) { b[f] = side; flips[f] = { t: -Math.max(Math.abs((f >> 3) - r0), Math.abs((f & 7) - c0)) * 0.07, from: -side }; }
      E.sfx('place', side > 0 ? 1.2 : 0.9, 0.6);
      fl.forEach((_, k) => E.after(0.05 + k * 0.05, () => E.sfx('card', 1.4 + k * 0.03, 0.35)));
      if (side > 0 && fl.length >= 5) E.pop(BX + c0 * S + S / 2, BY + r0 * S, `${fl.length} flips!`, { color: '#86efac', size: 18 });
      turn = -side; updateStats(); checkPass();
      return true;
    }
    function updateStats() { const w = b.filter((v) => v > 0).length, k = b.filter((v) => v < 0).length; E.stat('Discs', `${w} – ${k}`); }
    function checkPass() {
      if (legal(b, turn).length) return;
      if (!legal(b, -turn).length) { finish(); return; }
      passMsg = { who: turn, t: 1.6 }; E.sfx('error', 1, 0.5); turn = -turn;
    }
    function finish() {
      st = 'end';
      const w = b.filter((v) => v > 0).length, k = b.filter((v) => v < 0).length, m = LEVELS[level].mult;
      if (w > k) { E.score = (1000 + (w - k) * 50) * m; E.sfx('win'); E.after(1.4, () => E.over({ win: true, title: 'Victory!', msg: `${w} – ${k} against the ${LEVELS[level].name} AI` })); }
      else if (w < k) { E.score = w * 10 * m; E.sfx('lose'); E.after(1.4, () => E.over({ title: 'Defeat', msg: `${w} – ${k} against the ${LEVELS[level].name} AI` })); }
      else { E.score = 500 * m; E.after(1.4, () => E.over({ title: 'Draw', msg: `${w} – ${k}` })); }
    }
    const btns = LEVELS.map((l, i) => ({ x: BX + 4 * S - 110, y: BY + 150 + i * 80, w: 220, h: 60, i }));
    updateStats();
    return {
      update(dt) {
        T += dt;
        for (let i = 0; i < 64; i++) if (flips[i]) { flips[i].t += dt / 0.28; if (flips[i].t >= 1) flips[i] = null; }
        if (passMsg) { passMsg.t -= dt; if (passMsg.t <= 0) passMsg = null; }
        if (st === 'choose') {
          if (E.ptr.hit) for (const bt of btns) if (U.ptInRect(E.ptr.x, E.ptr.y, bt.x, bt.y, bt.w, bt.h)) { level = bt.i; st = 'play'; E.sfx('select'); E.stat('AI', LEVELS[level].name); }
          for (let i = 0; i < 3; i++) if (E.hit('Digit' + (i + 1))) { level = i; st = 'play'; E.sfx('select'); E.stat('AI', LEVELS[level].name); }
          return;
        }
        if (st !== 'play') return;
        if (flips.some((f) => f)) return;
        if (turn === -1) { thinkT += dt; if (thinkT > 0.45) { thinkT = 0; const m = aiChoose(); if (m !== undefined && m !== null) place(m, -1); else checkPass(); } return; }
        if (E.ptr.hit) {
          const c = Math.floor((E.ptr.x - BX) / S), r = Math.floor((E.ptr.y - BY) / S);
          if (c >= 0 && r >= 0 && c < 8 && r < 8 && !place(r * 8 + c, 1)) E.sfx('error', 1.3, 0.3);
        }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#14532d', '#03140a');
        D.shadow(g, BX + 4 * S, BY + 8 * S + 12, 4 * S + 20, 16, 0.6);
        D.fillRR(g, BX - 16, BY - 16, 8 * S + 32, 8 * S + 32, 14, '#1f2937');
        const fg = g.createLinearGradient(0, BY, 0, BY + 8 * S); fg.addColorStop(0, '#15803d'); fg.addColorStop(1, '#166534'); g.fillStyle = fg; g.fillRect(BX, BY, 8 * S, 8 * S);
        for (let i = 0; i <= 8; i++) { D.line(g, BX + i * S, BY, BX + i * S, BY + 8 * S, 'rgba(0,0,0,.35)', 2, 'butt'); D.line(g, BX, BY + i * S, BX + 8 * S, BY + i * S, 'rgba(0,0,0,.35)', 2, 'butt'); }
        for (const [r, c] of [[2, 2], [2, 6], [6, 2], [6, 6]]) D.circle(g, BX + c * S, BY + r * S, 4, 'rgba(0,0,0,.45)');
        // legal hints
        if (st === 'play' && turn === 1 && !flips.some((f) => f)) {
          const hc = Math.floor((E.ptr.x - BX) / S), hr = Math.floor((E.ptr.y - BY) / S);
          for (const i of legal(b, 1)) {
            const x = BX + (i & 7) * S + S / 2, y = BY + (i >> 3) * S + S / 2;
            if (E.ptr.type === 'mouse' && hc === (i & 7) && hr === i >> 3) { g.globalAlpha = 0.45; disc(g, x, y, 1, 1); g.globalAlpha = 1; D.text(g, flipsFor(b, i, 1).length, x, y + 1, { size: 16, color: '#0f172a' }); }
            else D.circle(g, x, y, 7 + Math.sin(t * 4 + i) * 1.5, 'rgba(255,255,255,.3)');
          }
        }
        for (let i = 0; i < 64; i++) {
          if (!b[i]) continue;
          const x = BX + (i & 7) * S + S / 2, y = BY + (i >> 3) * S + S / 2, f = flips[i];
          if (f && f.t < 0) { disc(g, x, y, f.from, 1); continue; }
          if (f && f.from !== b[i]) { const k = f.t, sx = Math.abs(Math.cos(k * Math.PI)); disc(g, x, y - Math.sin(k * Math.PI) * 12, k < 0.5 ? f.from : b[i], sx); }
          else if (f) { const k = f.t; disc(g, x, y, b[i], 1, U.ease.outBack(Math.min(1, k)) ); }
          else disc(g, x, y, b[i], 1);
          if (i === last) D.circle(g, x, y, 5, '#ef4444');
        }
        // side panel
        const px = 150, w = b.filter((v) => v > 0).length, k = b.filter((v) => v < 0).length;
        D.text(g, 'REVERSI', px, 70, { size: 32, color: '#86efac' });
        D.text(g, st === 'choose' ? 'choose your opponent' : `vs ${LEVELS[level].name} AI`, px, 102, { size: 14, font: 'mono', color: 'rgba(255,255,255,.55)' });
        disc(g, px - 40, 190, 1, 1); D.text(g, w, px + 10, 192, { size: 34, align: 'left', color: '#fff' });
        disc(g, px - 40, 260, -1, 1); D.text(g, k, px + 10, 262, { size: 34, align: 'left', color: '#fff' });
        D.fillRR(g, px - 90, 310, 180, 10, 5, '#0f172a'); D.fillRR(g, px - 90, 310, (180 * w) / Math.max(1, w + k), 10, 5, '#f8fafc');
        if (st === 'play') D.text(g, turn === 1 ? 'Your move (white)' : 'AI thinking…', px, 360, { size: 17, font: 'ui', weight: 600, color: turn === 1 ? '#f8fafc' : '#94a3b8' });
        if (passMsg) D.text(g, passMsg.who === 1 ? 'No moves — you pass' : 'AI has no moves — passes', BX + 4 * S, BY - 24 + 8 * S + 44, { size: 18, font: 'ui', weight: 600, color: '#fde047', alpha: Math.min(1, passMsg.t * 2) });
        if (st === 'choose') {
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(BX, BY, 8 * S, 8 * S);
          D.text(g, 'Choose difficulty', BX + 4 * S, BY + 110, { size: 26, color: '#fff' });
          for (const bt of btns) { const hov = U.ptInRect(E.ptr.x, E.ptr.y, bt.x, bt.y, bt.w, bt.h); D.tile(g, bt.x, bt.y - (hov ? 2 : 0), bt.w, bt.h, 14, ['#16a34a', '#d97706', '#dc2626'][bt.i], 5); D.text(g, `${bt.i + 1}  ${LEVELS[bt.i].name}`, bt.x + bt.w / 2, bt.y + bt.h / 2 - 3 - (hov ? 2 : 0), { size: 20, color: '#fff' }); }
        }
      },
    };
    function disc(g, x, y, side, sx, sc = 1) {
      const r = S * 0.4 * sc;
      g.save(); g.translate(x, y); g.scale(Math.max(0.04, sx), 1);
      D.shadow(g, 2, 5, r, r * 0.55, 0.4);
      D.circle(g, 0, 3, r, side > 0 ? '#94a3b8' : '#020617');
      D.orb(g, 0, 0, r, side > 0 ? '#f8fafc' : '#1e293b', side > 0 ? 0.2 : 0.35);
      g.restore();
    }
  },
});

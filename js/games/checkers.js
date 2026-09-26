MG.add({
  id: 'checkers', name: 'Checkers', cat: 'Board', color: '#ef4444', color2: '#fbbf24',
  desc: 'Classic English draughts with forced captures, multi-jump chains and kings, against an alpha-beta AI at three strengths.',
  how: ['Pick a difficulty, then click a piece and its destination', 'Captures are mandatory · keep jumping while you can', 'Reach the far row to crown a king (moves both ways)', 'Take or block every enemy piece to win'],
  pad: false,
  make(E) {
    const W = 960, H = 600, S = 66, BX = (W - 8 * S) / 2 + 110, BY = (H - 8 * S) / 2;
    const LEVELS = [{ name: 'Casual', depth: 2, mult: 1 }, { name: 'Club', depth: 4, mult: 2 }, { name: 'Master', depth: 7, mult: 4 }];
    let b = new Int8Array(64), turn = 1, st = 'choose', level = 0, sel = -1, moves = [], anim = null, T = 0, quiet = 0, lastMove = null, thinkT = 0, capturedByMe = 0, capturedByAI = 0, ghosts = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2) { if (r < 3) b[r * 8 + c] = -1; else if (r > 4) b[r * 8 + c] = 1; }
    const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
    function gen(bd, side) {
      const jumps = [], steps = [];
      for (let i = 0; i < 64; i++) {
        const p = bd[i]; if (sign(p) !== side) continue;
        const king = Math.abs(p) === 2, dirs = king ? [-1, 1] : [side === 1 ? -1 : 1];
        const r = i >> 3, c = i & 7;
        // jumps (DFS)
        const dfs = (pos, path, caps, bb) => {
          const rr = pos >> 3, cc = pos & 7; let found = false;
          for (const dr of dirs) for (const dc of [-1, 1]) {
            const mr = rr + dr, mc = cc + dc, lr = rr + 2 * dr, lc = cc + 2 * dc;
            if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
            const mid = mr * 8 + mc, land = lr * 8 + lc;
            if (sign(bb[mid]) !== -side || bb[land] !== 0 || caps.includes(mid)) continue;
            found = true;
            const promo = !king && (lr === 0 || lr === 7);
            const nb = bb.slice(); nb[land] = bb[pos]; nb[pos] = 0;
            if (promo) jumps.push({ from: i, path: [...path, land], caps: [...caps, mid], promo: true });
            else dfs(land, [...path, land], [...caps, mid], nb);
          }
          if (!found && caps.length) jumps.push({ from: i, path, caps, promo: !king && ((path[path.length - 1] >> 3) === (side === 1 ? 0 : 7)) });
        };
        dfs(i, [], [], bd);
        for (const dr of dirs) for (const dc of [-1, 1]) {
          const nr = r + dr, nc = c + dc; if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          const t = nr * 8 + nc; if (bd[t] === 0) steps.push({ from: i, path: [t], caps: [], promo: !king && (nr === 0 || nr === 7) });
        }
      }
      return jumps.length ? jumps : steps;
    }
    function apply(bd, m) {
      const nb = bd.slice(), p = nb[m.from]; nb[m.from] = 0;
      for (const c of m.caps) nb[c] = 0;
      nb[m.path[m.path.length - 1]] = m.promo ? sign(p) * 2 : p;
      return nb;
    }
    function evaluate(bd, side) {
      let s = 0;
      for (let i = 0; i < 64; i++) {
        const p = bd[i]; if (!p) continue;
        const r = i >> 3, c = i & 7, adv = p > 0 ? 7 - r : r;
        let v = Math.abs(p) === 2 ? 165 : 100 + adv * 4;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 6;
        if (Math.abs(p) === 1 && (p > 0 ? r === 7 : r === 0)) v += 8; // back-row guard
        s += sign(p) * v;
      }
      return s * side;
    }
    let deadline = 0;
    function negamax(bd, side, depth, alpha, beta) {
      if (performance.now() > deadline) throw 'timeout';
      const ms = gen(bd, side);
      if (!ms.length) return -100000 - depth;
      if (depth <= 0 && !ms[0].caps.length) return evaluate(bd, side);
      if (depth <= -4) return evaluate(bd, side);
      let best = -Infinity;
      for (const m of ms) {
        const v = -negamax(apply(bd, m), -side, depth - 1, -beta, -alpha);
        if (v > best) best = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
      }
      return best;
    }
    function aiChoose() {
      // iterative deepening under a time budget so the frame never stalls for long
      const ms = U.shuffle(gen(b, -1)); let best = ms[0] || null;
      deadline = performance.now() + (level === 2 ? 350 : 150);
      for (let d = 1; d <= LEVELS[level].depth; d++) {
        let db = null, bv = -Infinity;
        try { for (const m of ms) { const v = -negamax(apply(b, m), 1, d - 1, -Infinity, Infinity) + (level === 0 ? U.rand(-40, 40) : 0); if (v > bv) { bv = v; db = m; } } } catch (e) { if (e !== 'timeout') throw e; break; }
        best = db; ms.sort((x, y) => (x === db ? -1 : y === db ? 1 : 0));
      }
      return best;
    }
    function start(m) {
      anim = { m, piece: b[m.from], hop: 0, t: 0, pos: m.from };
      b[m.from] = 0; lastMove = m; sel = -1; moves = [];
      E.sfx('card', 1.1, 0.6);
    }
    function finishMove() {
      const m = anim.m, side = sign(anim.piece);
      b[m.path[m.path.length - 1]] = m.promo ? side * 2 : anim.piece;
      if (m.promo) { E.sfx('power', 1.1); const t = m.path[m.path.length - 1]; E.burst(BX + (t & 7) * S + S / 2, BY + (t >> 3) * S + S / 2, { n: 24, colors: ['#fde047', '#fff'], speed: 200 }); }
      quiet = m.caps.length ? 0 : quiet + 1;
      anim = null; turn = -side;
      const next = gen(b, turn);
      const mine = b.filter((p) => p > 0).length, theirs = b.filter((p) => p < 0).length;
      E.stat('Pieces', `${mine} vs ${theirs}`);
      if (!next.length) end(turn === 1 ? 'lose' : 'win');
      else if (quiet >= 60) end('draw');
    }
    function end(res) {
      st = 'end';
      const mine = b.filter((p) => p > 0).length;
      if (res === 'win') { E.score = (1000 + mine * 150) * LEVELS[level].mult; E.sfx('win'); E.after(1.2, () => E.over({ win: true, title: 'Victory!', msg: `Beat the ${LEVELS[level].name} AI with ${mine} pieces left` })); }
      else if (res === 'lose') { E.score = capturedByMe * 60 * LEVELS[level].mult; E.sfx('lose'); E.after(1.2, () => E.over({ title: 'Defeat', msg: `The ${LEVELS[level].name} AI wins · you captured ${capturedByMe}` })); }
      else { E.score = (300 + capturedByMe * 60) * LEVELS[level].mult; E.after(1.2, () => E.over({ title: 'Draw', msg: '60 moves without a capture' })); }
    }
    const sq = (px, py) => { const c = Math.floor((px - BX) / S), r = Math.floor((py - BY) / S); return c >= 0 && r >= 0 && c < 8 && r < 8 ? r * 8 + c : -1; };
    const btns = LEVELS.map((l, i) => ({ x: BX + 4 * S - 110, y: BY + 150 + i * 80, w: 220, h: 60, i }));
    return {
      update(dt) {
        T += dt;
        for (const gh of ghosts) gh.t += dt; ghosts = ghosts.filter((gh) => gh.t < 0.5);
        if (st === 'choose') {
          if (E.ptr.hit) for (const bt of btns) if (U.ptInRect(E.ptr.x, E.ptr.y, bt.x, bt.y, bt.w, bt.h)) { level = bt.i; st = 'play'; E.sfx('select'); E.stat('AI', LEVELS[level].name); E.stat('Pieces', '12 vs 12'); }
          for (let i = 0; i < 3; i++) if (E.hit('Digit' + (i + 1))) { level = i; st = 'play'; E.sfx('select'); E.stat('AI', LEVELS[level].name); }
          return;
        }
        if (anim) {
          anim.t += dt / 0.2;
          if (anim.t >= 1) {
            const m = anim.m, cap = m.caps[anim.hop];
            if (cap !== undefined) { const p = b[cap]; b[cap] = 0; ghosts.push({ i: cap, p, t: 0 }); if (sign(anim.piece) > 0) capturedByMe++; else capturedByAI++; E.sfx('hit', 1.2, 0.6); E.shake(4); E.burst(BX + (cap & 7) * S + S / 2, BY + (cap >> 3) * S + S / 2, { n: 14, colors: p > 0 ? ['#ef4444', '#fca5a5'] : ['#1f2937', '#9ca3af'], speed: 200 }); }
            else E.sfx('place', 1, 0.5);
            anim.pos = m.path[anim.hop]; anim.hop++; anim.t = 0;
            if (anim.hop >= m.path.length) finishMove();
          }
          return;
        }
        if (st !== 'play') return;
        if (turn === -1) { thinkT += dt; if (thinkT > 0.5) { thinkT = 0; const m = aiChoose(); if (m) start(m); else end('win'); } return; }
        if (E.ptr.hit) {
          const i = sq(E.ptr.x, E.ptr.y);
          if (i < 0) return;
          const all = gen(b, 1);
          const mv = moves.find((m) => m.path[m.path.length - 1] === i);
          if (sel >= 0 && mv) { start(mv); return; }
          if (b[i] > 0) { const mine = all.filter((m) => m.from === i); if (mine.length) { sel = i; moves = mine; E.sfx('tick', 1.3, 0.4); } else { sel = -1; moves = []; E.sfx('error', 1.3, 0.3); if (all.length && all[0].caps.length) E.pop(E.ptr.x, E.ptr.y - 20, 'a capture is required!', { size: 14, color: '#fca5a5' }); } }
          else { sel = -1; moves = []; }
        }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#3f2a1d', '#120a05');
        D.shadow(g, BX + 4 * S, BY + 8 * S + 12, 4 * S + 20, 16, 0.6);
        D.fillRR(g, BX - 16, BY - 16, 8 * S + 32, 8 * S + 32, 12, '#5b3a1e'); D.strokeRR(g, BX - 16, BY - 16, 8 * S + 32, 8 * S + 32, 12, '#8b5a2b', 3);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 2 ? '#3b2a1a' : '#e8d3a8'; g.fillRect(BX + c * S, BY + r * S, S, S); }
        if (lastMove) { for (const i of [lastMove.from, ...lastMove.path]) { g.fillStyle = 'rgba(250,204,21,.16)'; g.fillRect(BX + (i & 7) * S, BY + (i >> 3) * S, S, S); } }
        // hints
        if (st === 'play' && turn === 1 && !anim) {
          const all = gen(b, 1), from = new Set(all.map((m) => m.from));
          for (const i of from) D.circle(g, BX + (i & 7) * S + S / 2, BY + (i >> 3) * S + S / 2, S * 0.44, null, i === sel ? '#fde047' : 'rgba(253,224,71,.35)', i === sel ? 3 : 2);
          for (const m of moves) { const e = m.path[m.path.length - 1]; D.circle(g, BX + (e & 7) * S + S / 2, BY + (e >> 3) * S + S / 2, 10 + Math.sin(t * 6) * 2, m.caps.length ? 'rgba(248,113,113,.8)' : 'rgba(74,222,128,.75)'); if (m.path.length > 1) { let prev = m.from; for (const p of m.path) { D.line(g, BX + (prev & 7) * S + S / 2, BY + (prev >> 3) * S + S / 2, BX + (p & 7) * S + S / 2, BY + (p >> 3) * S + S / 2, 'rgba(248,113,113,.4)', 3); prev = p; } } }
        }
        for (let i = 0; i < 64; i++) if (b[i]) piece(g, BX + (i & 7) * S + S / 2, BY + (i >> 3) * S + S / 2, b[i], 1);
        for (const gh of ghosts) { g.globalAlpha = 1 - gh.t / 0.5; piece(g, BX + (gh.i & 7) * S + S / 2, BY + (gh.i >> 3) * S + S / 2 - gh.t * 30, gh.p, 1 + gh.t); g.globalAlpha = 1; }
        if (anim) {
          const from = anim.pos, to = anim.m.path[anim.hop], k = U.ease.inOutQuad(Math.min(1, anim.t));
          const x = U.lerp(BX + (from & 7) * S, BX + (to & 7) * S, k) + S / 2, y = U.lerp(BY + (from >> 3) * S, BY + (to >> 3) * S, k) + S / 2 - Math.sin(k * Math.PI) * 24;
          piece(g, x, y, anim.piece, 1.08);
        }
        // side panel
        const px = 150;
        D.text(g, 'CHECKERS', px, 70, { size: 30, color: '#fbbf24' });
        D.text(g, st === 'choose' ? 'choose your opponent' : `vs ${LEVELS[level].name} AI`, px, 102, { size: 14, font: 'mono', color: 'rgba(255,255,255,.55)' });
        const mine = b.filter((p) => p > 0).length, theirs = b.filter((p) => p < 0).length;
        piece(g, px - 40, 190, 1, 0.8); D.text(g, mine, px + 10, 192, { size: 32, align: 'left', color: '#fff' });
        piece(g, px - 40, 260, -1, 0.8); D.text(g, theirs, px + 10, 262, { size: 32, align: 'left', color: '#fff' });
        if (st === 'play') D.text(g, turn === 1 ? 'Your move' : 'AI thinking…', px, 340, { size: 18, font: 'ui', weight: 600, color: turn === 1 ? '#fca5a5' : '#cbd5e1' });
        if (st === 'choose') {
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(BX, BY, 8 * S, 8 * S);
          D.text(g, 'Choose difficulty', BX + 4 * S, BY + 110, { size: 26, color: '#fff' });
          for (const bt of btns) { const hov = U.ptInRect(E.ptr.x, E.ptr.y, bt.x, bt.y, bt.w, bt.h); D.tile(g, bt.x, bt.y - (hov ? 2 : 0), bt.w, bt.h, 14, ['#16a34a', '#d97706', '#dc2626'][bt.i], 5); D.text(g, `${bt.i + 1}  ${LEVELS[bt.i].name}`, bt.x + bt.w / 2, bt.y + bt.h / 2 - 3 - (hov ? 2 : 0), { size: 20, color: '#fff' }); }
        }
      },
    };
    function piece(g, x, y, p, s) {
      const r = S * 0.38 * s, red = p > 0, col = red ? '#dc2626' : '#1f2937';
      D.shadow(g, x + 2, y + 5, r, r * 0.6, 0.45);
      D.circle(g, x, y + 4, r, U.shade(col, -0.35));
      D.orb(g, x, y, r, col, 0.35);
      D.circle(g, x, y, r * 0.72, null, red ? 'rgba(254,202,202,.45)' : 'rgba(148,163,184,.45)', 2);
      D.circle(g, x, y, r * 0.48, null, red ? 'rgba(254,202,202,.3)' : 'rgba(148,163,184,.3)', 1.5);
      if (Math.abs(p) === 2) { D.poly(g, [[x - r * 0.5, y + r * 0.25], [x - r * 0.55, y - r * 0.3], [x - r * 0.25, y - r * 0.05], [x, y - r * 0.4], [x + r * 0.25, y - r * 0.05], [x + r * 0.55, y - r * 0.3], [x + r * 0.5, y + r * 0.25]], '#fbbf24', '#78350f', 1.5); }
    }
  },
});

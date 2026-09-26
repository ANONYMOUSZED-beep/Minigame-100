MG.add({
  id: 'blockfall', name: 'Block Fall', cat: 'Arcade', color: '#a78bfa', color2: '#22d3ee',
  desc: 'Guideline-grade falling blocks: SRS rotation with kicks, hold, ghost, 7-bag, T-spins, combos and back-to-back.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> move · <kbd>↓</kbd> soft drop · <kbd>Space</kbd> hard drop', '<kbd>↑</kbd> / <kbd>X</kbd> rotate CW · <kbd>Z</kbd> rotate CCW · <kbd>C</kbd> / <kbd>Shift</kbd> hold', 'Touch: drag to move, tap to rotate, flick down to drop, flick up to hold', 'T-spins and back-to-back Tetrises score big'],
  w: 720, h: 760, pad: 'LRUDAB', padLabels: { A: 'DROP', B: 'HOLD' }, padKeys: { B: 'KeyC' },
  make(E) {
    const W = 720, H = 760, CW = 10, CH = 20, S = 34, BX = (W - CW * S) / 2, BY = 40;
    const COL = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#4ade80', Z: '#f43f5e', J: '#3b82f6', L: '#fb923c' };
    const SHAPES = {
      I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
      S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
    };
    const KICKS = { '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] };
    const KICKS_I = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]] };
    const board = U.grid(CW, CH + 2, null); // 2 hidden rows at top (index 0,1)
    let bag = [], queue = [], cur, hold = null, canHold = true, dropT = 0, lockT = 0, lockMoves = 0, level = 1, lines = 0, combo = -1, b2b = false, lastRot = false, das = { dir: 0, t: 0, arr: 0 }, clearing = null, dead = false, touch = { x: 0, moved: 0, t: 0 }, shakeX = 0, lastLabel = null;
    const next = () => { if (!bag.length) bag = U.shuffle(Object.keys(SHAPES)); return bag.pop(); };
    for (let i = 0; i < 5; i++) queue.push(next());
    function cells(p, rot = p.rot, x = p.x, y = p.y) {
      const n = p.t === 'I' ? 4 : p.t === 'O' ? 4 : 3;
      return SHAPES[p.t].map(([cx, cy]) => {
        let rx = cx, ry = cy;
        if (p.t !== 'O') for (let r = 0; r < rot; r++) { const t = rx; rx = n - 1 - ry; ry = t; }
        return [x + rx, y + ry];
      });
    }
    const fits = (p, rot, x, y) => cells(p, rot, x, y).every(([cx, cy]) => cx >= 0 && cx < CW && cy < CH + 2 && (cy < 0 || !board[cy][cx]));
    function spawn(t) {
      cur = { t: t || queue.shift(), rot: 0, x: 3, y: 0 };
      if (!t) queue.push(next());
      if (cur.t === 'O') cur.x = 3;
      canHold = t ? false : canHold;
      lockT = 0; lockMoves = 0; dropT = 0; lastRot = false;
      if (!fits(cur, 0, cur.x, cur.y)) { dead = true; E.sfx('lose'); E.shake(10); E.after(0.8, () => E.over({ msg: `${lines} lines · level ${level}` })); }
      else if (fits(cur, 0, cur.x, cur.y + 1)) cur.y++;
    }
    spawn();
    const gravity = () => Math.pow(0.8 - (level - 1) * 0.007, level - 1);
    function move(dx) {
      if (fits(cur, cur.rot, cur.x + dx, cur.y)) { cur.x += dx; lastRot = false; if (lockT > 0 && lockMoves < 15) { lockT = 0; lockMoves++; } E.sfx('tick', 1.2, 0.5); return true; }
      shakeX = dx * 3; return false;
    }
    function rotate(dir) {
      if (cur.t === 'O') return;
      const from = cur.rot, to = (cur.rot + dir + 4) % 4, table = (cur.t === 'I' ? KICKS_I : KICKS)[`${from}>${to}`];
      for (const [kx, ky] of table) if (fits(cur, to, cur.x + kx, cur.y - ky)) {
        cur.rot = to; cur.x += kx; cur.y -= ky; lastRot = true;
        if (lockT > 0 && lockMoves < 15) { lockT = 0; lockMoves++; }
        E.sfx('click', 1.3); return;
      }
      E.sfx('tick', 0.6, 0.4);
    }
    const ghostY = () => { let y = cur.y; while (fits(cur, cur.rot, cur.x, y + 1)) y++; return y; };
    function tSpin() {
      if (cur.t !== 'T' || !lastRot) return 0;
      const cx = cur.x + 1, cy = cur.y + 1;
      const corners = [[cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]].map(([x, y]) => x < 0 || x >= CW || y >= CH + 2 || (y >= 0 && board[y][x]));
      const filled = corners.filter(Boolean).length;
      if (filled < 3) return 0;
      const front = [[0, 1], [1, 3], [2, 3], [0, 2]][cur.rot];
      return corners[front[0]] && corners[front[1]] ? 2 : 1; // 2 = full, 1 = mini
    }
    function lock() {
      const ts = tSpin();
      let top = CH;
      for (const [x, y] of cells(cur)) { if (y < 0) continue; board[y][x] = { c: COL[cur.t], t: E.t }; top = Math.min(top, y); }
      if (cells(cur).every(([, y]) => y < 2)) { dead = true; E.sfx('lose'); E.after(0.8, () => E.over({ msg: `${lines} lines · level ${level}` })); return; }
      const full = [];
      for (let y = 0; y < CH + 2; y++) if (board[y].every(Boolean)) full.push(y);
      const n = full.length;
      let pts = 0, label = null;
      const diff = n === 4 || (ts && n > 0);
      if (ts === 2) { pts = [400, 800, 1200, 1600][n]; label = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'][n]; }
      else if (ts === 1) { pts = [100, 200, 400][n] || 400; label = n ? 'MINI T-SPIN' : null; }
      else { pts = [0, 100, 300, 500, 800][n]; label = [null, null, 'DOUBLE', 'TRIPLE', 'TETRIS'][n]; }
      if (n) {
        combo++;
        if (diff && b2b) { pts *= 1.5; label = 'B2B ' + label; }
        b2b = diff ? true : false;
        pts += combo > 0 ? 50 * combo : 0;
      } else combo = -1;
      E.score += Math.round(pts * level);
      if (label) { lastLabel = { text: label, t: 1.6, combo }; }
      else if (combo > 0) lastLabel = { text: `${combo} COMBO`, t: 1.2 };
      if (n) {
        clearing = { rows: full, t: 0 };
        E.sfx(n === 4 || ts ? 'power' : 'match', 1 + combo * 0.05);
        E.shake(n === 4 ? 12 : 3 + n * 2);
        if (n === 4) E.flash('#22d3ee', 0.25);
        full.forEach((y) => E.burst(BX + (CW * S) / 2, BY + (y - 2) * S + S / 2, { n: 30, colors: ['#fff', ...Object.values(COL)], speed: 420, angle: 0, spread: U.TAU, shape: 'square', size: 4, life: 0.8 }));
      } else { E.sfx('thud', 1.3, 0.6); E.shake(1.5); }
      if (!n) spawn();
    }
    function hardDrop() {
      const gy = ghostY(), dist = gy - cur.y;
      E.score += dist * 2;
      for (const [x, y] of cells(cur)) E.burst(BX + x * S + S / 2, BY + (y - 2) * S, { n: 1, color: COL[cur.t], speed: 40, vy: 400, life: 0.3, size: 3 });
      cur.y = gy; if (dist > 0) lastRot = false; lock();
    }
    function doHold() {
      if (!canHold) { E.sfx('error', 1.4, 0.4); return; }
      const t = cur.t; E.sfx('whoosh', 1.4, 0.6);
      if (hold) { const h = hold; hold = t; spawn(h); }
      else { hold = t; spawn(); canHold = false; }
      canHold = false;
    }
    function drawMino(g, x, y, c, s = S, alpha = 1) {
      g.globalAlpha = alpha;
      const gr = g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, U.shade(c, 0.35)); gr.addColorStop(1, U.shade(c, -0.15));
      D.fillRR(g, x + 1, y + 1, s - 2, s - 2, 5, gr);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 5, y + 4, s - 10, 3);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 4, y + s - 6, s - 8, 3);
      g.globalAlpha = 1;
    }
    function drawPiece(g, t, cx, cy, s) {
      const cs = SHAPES[t], minX = Math.min(...cs.map((c) => c[0])), maxX = Math.max(...cs.map((c) => c[0])), minY = Math.min(...cs.map((c) => c[1])), maxY = Math.max(...cs.map((c) => c[1]));
      const ox = cx - ((maxX - minX + 1) * s) / 2, oy = cy - ((maxY - minY + 1) * s) / 2;
      cs.forEach(([x, y]) => drawMino(g, ox + (x - minX) * s, oy + (y - minY) * s, COL[t], s));
    }
    return {
      update(dt) {
        if (dead) return;
        if (lastLabel) { lastLabel.t -= dt; if (lastLabel.t <= 0) lastLabel = null; }
        shakeX = U.damp(shakeX, 0, 20, dt);
        if (clearing) {
          clearing.t += dt;
          if (clearing.t > 0.28) {
            for (const y of clearing.rows) { board.splice(y, 1); board.unshift(Array(CW).fill(null)); }
            const before = Math.floor(lines / 10);
            lines += clearing.rows.length; E.stat('Lines', lines);
            if (Math.floor(lines / 10) > before) { level++; E.stat('Level', level); E.banner('LEVEL ' + level); E.sfx('win'); }
            clearing = null; spawn();
          }
          return;
        }
        // keyboard
        if (E.hit('KeyC', 'ShiftLeft', 'ShiftRight')) doHold();
        if (E.hit('ArrowUp', 'KeyX', 'KeyW')) rotate(1);
        if (E.hit('KeyZ', 'ControlLeft')) rotate(-1);
        if (E.hit('Space')) { hardDrop(); return; }
        const dir = (E.down('R') ? 1 : 0) - (E.down('L') ? 1 : 0);
        if (E.hit('L')) { move(-1); das = { dir: -1, t: 0, arr: 0 }; }
        else if (E.hit('R')) { move(1); das = { dir: 1, t: 0, arr: 0 }; }
        else if (dir && dir === das.dir) { das.t += dt; if (das.t > 0.16) { das.arr += dt; while (das.arr > 0.033) { das.arr -= 0.033; if (!move(dir)) break; } } }
        else das.dir = dir;
        // touch gestures
        const p = E.ptr;
        if (p.hit) touch = { x: p.x, y: p.y, moved: 0, t: 0, sy: p.y };
        if (p.down) {
          touch.t += dt;
          const cellsMoved = Math.round((p.x - touch.x) / (S * 0.9));
          if (cellsMoved) { move(Math.sign(cellsMoved)); touch.x += Math.sign(cellsMoved) * S * 0.9; touch.moved++; }
          if (p.y - touch.y > S * 1.2 && touch.t > 0.12) { if (fits(cur, cur.rot, cur.x, cur.y + 1)) { cur.y++; E.score += 1; } touch.y += S; touch.moved++; }
        }
        if (p.up) {
          const dy = p.y - touch.sy;
          if (touch.t < 0.25 && dy > 60) hardDrop();
          else if (touch.t < 0.3 && dy < -60) doHold();
          else if (!touch.moved && touch.t < 0.3) rotate(1);
          if (clearing || dead) return;
        }
        // gravity
        const soft = E.down('D');
        const g = soft ? Math.min(gravity(), 0.03) : gravity();
        dropT += dt;
        while (dropT >= g) {
          dropT -= g;
          if (fits(cur, cur.rot, cur.x, cur.y + 1)) { cur.y++; lastRot = false; if (soft) E.score += 1; lockT = 0; }
          else break;
        }
        if (!fits(cur, cur.rot, cur.x, cur.y + 1)) { lockT += dt; if (lockT > 0.5) lock(); }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#0f0a24', '#05030d');
        D.grid(g, W, H, 34, 'rgba(167,139,250,.04)');
        g.save(); g.translate(shakeX, 0);
        // well
        D.glow(g, BX + (CW * S) / 2, BY + (CH * S) / 2, 420, '#7c3aed', 0.12);
        D.fillRR(g, BX - 8, BY - 8, CW * S + 16, CH * S + 16, 12, 'rgba(10,6,24,.9)');
        D.strokeRR(g, BX - 8, BY - 8, CW * S + 16, CH * S + 16, 12, 'rgba(167,139,250,.45)', 2);
        g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1;
        for (let x = 1; x < CW; x++) { g.beginPath(); g.moveTo(BX + x * S, BY); g.lineTo(BX + x * S, BY + CH * S); g.stroke(); }
        for (let y = 1; y < CH; y++) { g.beginPath(); g.moveTo(BX, BY + y * S); g.lineTo(BX + CW * S, BY + y * S); g.stroke(); }
        // board
        for (let y = 2; y < CH + 2; y++) for (let x = 0; x < CW; x++) {
          const c = board[y][x]; if (!c) continue;
          const clear = clearing && clearing.rows.includes(y);
          if (clear) { const k = clearing.t / 0.28; g.globalAlpha = 1 - k; D.fillRR(g, BX + x * S + (S * k) / 2, BY + (y - 2) * S + (S * k) / 2, S * (1 - k), S * (1 - k), 5, '#fff'); g.globalAlpha = 1; continue; }
          drawMino(g, BX + x * S, BY + (y - 2) * S, c.c);
          const age = t - c.t; if (age < 0.2) { g.globalAlpha = 1 - age / 0.2; D.fillRR(g, BX + x * S + 1, BY + (y - 2) * S + 1, S - 2, S - 2, 5, '#fff'); g.globalAlpha = 1; }
        }
        if (!clearing && !dead && cur) {
          const gy = ghostY();
          for (const [x, y] of cells(cur, cur.rot, cur.x, gy)) if (y >= 2) { D.strokeRR(g, BX + x * S + 3, BY + (y - 2) * S + 3, S - 6, S - 6, 5, U.rgba(COL[cur.t], 0.6), 2); g.fillStyle = U.rgba(COL[cur.t], 0.08); g.fillRect(BX + x * S + 3, BY + (y - 2) * S + 3, S - 6, S - 6); }
          const lockFade = lockT > 0 ? 1 - (lockT / 0.5) * 0.4 : 1;
          for (const [x, y] of cells(cur)) if (y >= 2) { D.glow(g, BX + x * S + S / 2, BY + (y - 2) * S + S / 2, S, COL[cur.t], 0.25); drawMino(g, BX + x * S, BY + (y - 2) * S, COL[cur.t], S, lockFade); }
        }
        g.restore();
        // side panels
        const panel = (x, y, w, h, title) => { D.fillRR(g, x, y, w, h, 12, 'rgba(20,14,44,.8)'); D.strokeRR(g, x, y, w, h, 12, 'rgba(167,139,250,.25)', 1.5); D.text(g, title, x + w / 2, y + 18, { size: 12, font: 'mono', color: 'rgba(196,181,253,.8)' }); };
        panel(20, 40, 150, 120, 'HOLD');
        if (hold) { g.globalAlpha = canHold ? 1 : 0.35; drawPiece(g, hold, 95, 105, 26); g.globalAlpha = 1; }
        panel(W - 170, 40, 150, 360, 'NEXT');
        queue.slice(0, 5).forEach((q, i) => drawPiece(g, q, W - 95, 100 + i * 64, i === 0 ? 26 : 20));
        panel(20, 180, 150, 220, 'STATS');
        const st = [['LEVEL', level], ['LINES', lines], ['COMBO', Math.max(0, combo)], ['B2B', b2b ? 'ON' : '—']];
        st.forEach(([k, v], i) => { D.text(g, k, 36, 222 + i * 44, { size: 11, font: 'mono', color: 'rgba(196,181,253,.6)', align: 'left' }); D.text(g, v, 36, 242 + i * 44, { size: 20, align: 'left' }); });
        if (lastLabel) {
          const k = lastLabel.t, a = Math.min(1, k * 2);
          D.text(g, lastLabel.text, BX + (CW * S) / 2, BY + 150 - (1.6 - k) * 20, { size: lastLabel.text.includes('TETRIS') || lastLabel.text.includes('T-SPIN') ? 34 : 26, color: '#fff', glow: '#a855f7', alpha: a });
        }
        D.vignette(g, W, H, 0.4);
      },
    };
  },
});

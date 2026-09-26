MG.add({
  id: 'gemswap', name: 'Gem Swap', cat: 'Puzzle', color: '#e879f9', color2: '#fde047',
  desc: 'A 90-second match-three blitz with cascades, flame gems, star gems and the board-clearing hypercube.',
  how: ['Swap neighbouring gems (click-click or drag) to line up 3+', 'Match 4 → <b>flame gem</b> (3×3 blast) · L or T shape → <b>star gem</b> (row + column)', 'Match 5 → <b>hypercube</b>: swap it with any gem to clear that colour', 'Cascades multiply your points · keys: arrows + <kbd>Space</kbd>'],
  pad: 'LRUDA', padLabels: { A: 'PICK' },
  make(E) {
    const W = 960, H = 600, N = 8, S = 64, BX = 380, BY = 44, DUR = 90;
    const GEMS = [
      { c: '#ef4444', s: 'oct' }, { c: '#f97316', s: 'hex' }, { c: '#facc15', s: 'dia' }, { c: '#22c55e', s: 'rect' },
      { c: '#3b82f6', s: 'round' }, { c: '#a855f7', s: 'tri' }, { c: '#e5e7eb', s: 'star' },
    ];
    let board, st = 'idle', stT = 0, sel = null, swapA = null, swapB = null, combo = 0, time = DUR, idle = 0, hint = null, cur = [3, 3], drag = null, T = 0, over = false, bigCombo = 0;
    const gem = (t, x, y, fy) => ({ t, sp: null, x, y, fx: x, fy: fy ?? y, vy: 0, clr: 0, dead: false, pop: 0 });
    const at = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? board[y][x] : null);
    function fresh() {
      board = U.grid(N, N, (x, y) => null);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let t; do t = U.ri(0, GEMS.length - 1); while ((x > 1 && board[y][x - 1].t === t && board[y][x - 2].t === t) || (y > 1 && board[y - 1][x].t === t && board[y - 2][x].t === t));
        board[y][x] = gem(t, x, y, y - N - 2 - (N - y) * 0.3);
      }
      st = 'fall';
    }
    fresh();
    function findGroups() {
      const hRun = U.grid(N, N, 0), vRun = U.grid(N, N, 0), runs = [];
      for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const t = board[y][x].t; let e = x; while (e + 1 < N && board[y][e + 1].t === t && t >= 0) e++; if (e - x >= 2 && t >= 0) { const cells = []; for (let k = x; k <= e; k++) { cells.push([k, y]); hRun[y][k] = e - x + 1; } runs.push({ cells, dir: 'h', t }); } x = e + 1; } }
      for (let x = 0; x < N; x++) { let y = 0; while (y < N) { const t = board[y][x].t; let e = y; while (e + 1 < N && board[e + 1][x].t === t && t >= 0) e++; if (e - y >= 2 && t >= 0) { const cells = []; for (let k = y; k <= e; k++) { cells.push([x, k]); vRun[k][x] = e - y + 1; } runs.push({ cells, dir: 'v', t }); } y = e + 1; } }
      return { runs, hRun, vRun };
    }
    const hasMatch = () => findGroups().runs.length > 0;
    function swapCells(a, b) {
      const ga = board[a[1]][a[0]], gb = board[b[1]][b[0]];
      board[a[1]][a[0]] = gb; board[b[1]][b[0]] = ga;
      gb.x = a[0]; gb.y = a[1]; ga.x = b[0]; ga.y = b[1];
    }
    function trySwap(a, b) {
      if (st !== 'idle' || over) return;
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1 || !at(...b)) return;
      sel = null; hint = null; idle = 0; combo = 0;
      const ga = at(...a), gb = at(...b);
      swapCells(a, b); swapA = a; swapB = b; st = 'swap'; stT = 0.16; E.sfx('swish', 1.2, 0.4);
      if (ga.sp === 'cube' || gb.sp === 'cube') { st = 'cubeswap'; stT = 0.16; }
    }
    function resolve(first) {
      const { runs, hRun, vRun } = findGroups();
      if (!runs.length) return false;
      combo++;
      const kill = new Set(), make = [];
      const key = (x, y) => y * N + x;
      for (const r of runs) for (const [x, y] of r.cells) kill.add(key(x, y));
      // specials from shapes
      const used = new Set();
      for (const r of runs) {
        const len = r.cells.length;
        let spot = r.cells[Math.floor(len / 2)];
        if (first) for (const c of r.cells) if ((swapA && c[0] === swapA[0] && c[1] === swapA[1]) || (swapB && c[0] === swapB[0] && c[1] === swapB[1])) spot = c;
        const cross = r.cells.find(([x, y]) => hRun[y][x] >= 3 && vRun[y][x] >= 3);
        if (len >= 5) make.push({ at: spot, sp: 'cube', t: -1 });
        else if (cross && !used.has(key(...cross))) { used.add(key(...cross)); make.push({ at: cross, sp: 'star', t: r.t }); }
        else if (len === 4) make.push({ at: spot, sp: 'flame', t: r.t });
      }
      explode(kill, make);
      return true;
    }
    function explode(kill, make = []) {
      // chain special activations
      const key = (x, y) => y * N + x, queue = [...kill];
      const seen = new Set();
      while (queue.length) {
        const k = queue.pop(); if (seen.has(k)) continue; seen.add(k);
        const x = k % N, y = (k / N) | 0, g = board[y][x];
        if (!g || !g.sp) continue;
        if (g.sp === 'flame') { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) { kill.add(key(x + dx, y + dy)); queue.push(key(x + dx, y + dy)); } E.sfx('explode', 1.3, 0.5); E.shake(8); E.burst(BX + x * S + S / 2, BY + y * S + S / 2, { n: 40, colors: ['#fde047', '#f97316', '#fff'], speed: 380 }); }
        if (g.sp === 'star') { for (let i = 0; i < N; i++) { kill.add(key(i, y)); kill.add(key(x, i)); queue.push(key(i, y), key(x, i)); } E.sfx('laser', 0.8); E.shake(6); beams.push({ x, y, t: 0.4 }); }
        if (g.sp === 'cube') { const t = U.ri(0, GEMS.length - 1); for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) if (board[yy][xx].t === t) { kill.add(key(xx, yy)); queue.push(key(xx, yy)); } }
      }
      const mult = combo;
      let n = 0;
      for (const k of kill) { const x = k % N, y = (k / N) | 0, g = board[y][x]; if (!g || g.dead) continue; const keep = make.find((m) => key(...m.at) === k); if (keep) continue; g.dead = true; g.clr = 1; n++; }
      for (const m of make) { const g = board[m.at[1]][m.at[0]]; g.dead = false; g.clr = 0; g.sp = m.sp; g.pop = 1; if (m.sp === 'cube') g.t = -1; E.sfx('power', 1.1, 0.6); }
      const pts = n * 10 * mult + make.length * 100;
      E.score += pts;
      if (n) {
        const cx = [...kill].reduce((s, k) => s + (k % N), 0) / kill.size, cy = [...kill].reduce((s, k) => s + ((k / N) | 0), 0) / kill.size;
        E.pop(BX + cx * S + S / 2, BY + cy * S + S / 2, `+${pts}`, { color: mult > 1 ? '#fde047' : '#fff', size: 18 + Math.min(mult, 6) * 3 });
        E.sfx('match', 0.9 + Math.min(mult, 8) * 0.08);
        if (mult >= 3 && mult > bigCombo) { bigCombo = mult; }
        if (mult >= 3) E.pop(BX + N * S / 2, BY - 8 + 30, ['', '', '', 'GOOD!', 'EXCELLENT!', 'AWESOME!', 'SPECTACULAR!', 'UNBELIEVABLE!'][Math.min(7, mult)], { color: '#f0abfc', size: 30 });
      }
      st = 'clear'; stT = 0.22;
    }
    function collapse() {
      for (let x = 0; x < N; x++) {
        const col = [];
        for (let y = N - 1; y >= 0; y--) if (!board[y][x].dead) col.push(board[y][x]);
        let spawn = 0;
        for (let y = N - 1; y >= 0; y--) {
          const g = col[N - 1 - y];
          if (g) { board[y][x] = g; g.y = y; }
          else { spawn++; board[y][x] = gem(U.ri(0, GEMS.length - 1), x, y, -spawn - 0.3); }
        }
      }
      st = 'fall';
    }
    function findMove() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (!at(x + dx, y + dy)) continue;
        if (board[y][x].sp === 'cube' || board[y + dy][x + dx].sp === 'cube') return [[x, y], [x + dx, y + dy]];
        swapCells([x, y], [x + dx, y + dy]); const ok = hasMatch(); swapCells([x, y], [x + dx, y + dy]);
        if (ok) return [[x, y], [x + dx, y + dy]];
      }
      return null;
    }
    const beams = [];
    E.stat('Time', DUR);
    return {
      update(dt) {
        T += dt;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const g = board[y][x]; g.pop = Math.max(0, g.pop - dt * 3); g.fx = U.damp(g.fx, g.x, 20, dt); }
        for (const b of beams) b.t -= dt; while (beams.length && beams[0].t <= 0) beams.shift();
        if (!over) { time -= st === 'idle' || st === 'swap' ? dt : dt * 0.5; E.stat('Time', Math.ceil(Math.max(0, time))); }
        if (!over && time <= 0 && st === 'idle') { over = true; E.sfx('tada'); E.over({ title: 'Time Up!', msg: `Best cascade ×${bigCombo || combo}` }); return; }
        if (st === 'swap') { stT -= dt; if (stT <= 0) { if (!resolve(true)) { swapCells(swapA, swapB); st = 'unswap'; stT = 0.16; E.sfx('error', 1.4, 0.4); } } }
        else if (st === 'cubeswap') {
          stT -= dt;
          if (stT <= 0) {
            const a = at(...swapA), b = at(...swapB), cube = a.sp === 'cube' ? a : b, other = cube === a ? b : a;
            const kill = new Set([cube.y * N + cube.x]); combo = 1;
            if (other.sp === 'cube') { for (let i = 0; i < N * N; i++) kill.add(i); }
            else for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x].t === other.t) kill.add(y * N + x);
            cube.sp = null; E.sfx('laser', 1.4); E.flash('#f0abfc', 0.4); E.shake(10);
            for (const k of kill) { const g = board[(k / N) | 0][k % N]; beams.push({ x: g.x, y: g.y, t: 0.3, zap: [cube.x, cube.y] }); }
            explode(kill);
          }
        }
        else if (st === 'unswap') { stT -= dt; if (stT <= 0) st = 'idle'; }
        else if (st === 'clear') { stT -= dt; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x].dead) board[y][x].clr = Math.max(0, stT / 0.22); if (stT <= 0) collapse(); }
        else if (st === 'fall') {
          let moving = false;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const g = board[y][x]; if (g.fy < g.y) { g.vy += 40 * dt; g.fy = Math.min(g.y, g.fy + g.vy * dt); moving = true; if (g.fy >= g.y) { g.vy = 0; } } else { g.fy = g.y; g.vy = 0; } }
          if (!moving) { if (!resolve(false)) { st = 'idle'; if (combo > 1) E.sfx('coin', 1 + combo * 0.05, 0.5); if (!findMove()) { E.banner('NO MOVES', 'reshuffling…', { color: '#e879f9', life: 1 }); E.after(0.6, () => fresh()); st = 'wait'; } } }
        }
        if (st !== 'idle' || over) return;
        idle += dt; if (idle > 5 && !hint) hint = findMove();
        // input: click / drag
        const cell = (px, py) => { const x = Math.floor((px - BX) / S), y = Math.floor((py - BY) / S); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
        if (E.ptr.hit) {
          const c = cell(E.ptr.x, E.ptr.y);
          if (c) { if (sel && Math.abs(sel[0] - c[0]) + Math.abs(sel[1] - c[1]) === 1) { trySwap(sel, c); drag = null; } else { sel = c; drag = { c, x: E.ptr.x, y: E.ptr.y }; E.sfx('tick', 1.3, 0.4); } }
        }
        if (drag && E.ptr.down) { const dx = E.ptr.x - drag.x, dy = E.ptr.y - drag.y; if (Math.hypot(dx, dy) > S * 0.4) { const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; const c = drag.c; drag = null; trySwap(c, [c[0] + d[0], c[1] + d[1]]); } }
        if (!E.ptr.down) drag = null;
        for (const [k, d] of [['L', [-1, 0]], ['R', [1, 0]], ['U', [0, -1]], ['D', [0, 1]]]) if (E.hit(k)) { if (sel) trySwap(sel, [sel[0] + d[0], sel[1] + d[1]]); else cur = [U.clamp(cur[0] + d[0], 0, N - 1), U.clamp(cur[1] + d[1], 0, N - 1)]; }
        if (E.hit('A')) { sel = sel ? null : cur.slice(); E.sfx('tick', 1.3, 0.4); }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#3b0764', '#0a0314');
        for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(240,171,252,${0.15 + 0.15 * Math.sin(t + i)})`; g.fillRect((i * 97) % W, (i * 53 + t * 8 * (1 + (i % 3))) % H, 2, 2); }
        D.shadow(g, BX + N * S / 2, BY + N * S + 16, N * S * 0.5, 14, 0.5);
        D.fillRR(g, BX - 12, BY - 12, N * S + 24, N * S + 24, 18, 'rgba(15,5,30,.85)'); D.strokeRR(g, BX - 12, BY - 12, N * S + 24, N * S + 24, 18, 'rgba(232,121,249,.35)', 2);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)'; g.fillRect(BX + x * S, BY + y * S, S, S); }
        g.save(); g.beginPath(); g.rect(BX - 4, BY - 4, N * S + 8, N * S + 8); g.clip();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const gm = board[y][x]; if (gm.dead && gm.clr <= 0) continue;
          const px = BX + gm.fx * S + S / 2, py = BY + gm.fy * S + S / 2;
          let sc = gm.dead ? gm.clr : 1 + Math.sin(gm.pop * Math.PI) * 0.25;
          if (sel && sel[0] === x && sel[1] === y) sc *= 1.08 + Math.sin(t * 10) * 0.04;
          if (hint && hint.some(([hx, hy]) => hx === x && hy === y)) sc *= 1 + Math.abs(Math.sin(t * 5)) * 0.12;
          drawGem(g, gm, px, py, sc, t);
        }
        g.restore();
        for (const b of beams) {
          const k = b.t / 0.4;
          if (b.zap) { D.line(g, BX + b.zap[0] * S + S / 2, BY + b.zap[1] * S + S / 2, BX + b.x * S + S / 2, BY + b.y * S + S / 2, `rgba(240,171,252,${k})`, 3); continue; }
          g.fillStyle = `rgba(255,255,255,${k * 0.7})`; g.fillRect(BX, BY + b.y * S + S / 2 - 8 * k, N * S, 16 * k); g.fillRect(BX + b.x * S + S / 2 - 8 * k, BY, 16 * k, N * S);
        }
        if (sel) D.strokeRR(g, BX + sel[0] * S + 3, BY + sel[1] * S + 3, S - 6, S - 6, 10, '#fde047', 3);
        else if (E.ptr.type !== 'mouse' && E.ptr.type !== 'touch') D.strokeRR(g, BX + cur[0] * S + 3, BY + cur[1] * S + 3, S - 6, S - 6, 10, 'rgba(255,255,255,.5)', 2);
        // side panel
        const px = 170;
        D.text(g, 'GEM SWAP', px, 70, { size: 32, color: '#f0abfc', glow: '#e879f9', blur: 16 });
        D.text(g, E.score, px, 150, { size: 48, color: '#fff' });
        D.text(g, 'SCORE', px, 188, { size: 12, font: 'mono', color: 'rgba(255,255,255,.4)' });
        // circular timer
        const k = Math.max(0, time / DUR);
        g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(px, 300, 60, 0, U.TAU); g.stroke();
        g.strokeStyle = time < 10 ? '#ef4444' : '#fde047'; g.beginPath(); g.arc(px, 300, 60, -Math.PI / 2, -Math.PI / 2 + U.TAU * k); g.stroke();
        D.text(g, Math.ceil(Math.max(0, time)), px, 302, { size: 36, color: time < 10 ? '#fca5a5' : '#fff' });
        if (combo > 1 && st !== 'idle') D.text(g, `CASCADE ×${combo}`, px, 410, { size: 22, color: '#fde047', glow: '#f59e0b' });
        D.text(g, 'hint after 5 s idle', px, H - 40, { size: 12, font: 'mono', color: 'rgba(255,255,255,.3)' });
      },
    };
    function drawGem(g, gm, x, y, sc, t) {
      const r = S * 0.38 * sc;
      if (r <= 0.5) return;
      if (gm.sp === 'cube') {
        g.save(); g.translate(x, y); g.rotate(t * 1.5);
        D.glow(g, 0, 0, r * 2.2, '#f0abfc', 0.7);
        const cols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];
        for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i / 6) * U.TAU, ((i + 1) / 6) * U.TAU); g.fill(); }
        D.circle(g, 0, 0, r * 0.45, '#fff'); g.restore(); return;
      }
      const G = GEMS[gm.t], c = G.c;
      g.save(); g.translate(x, y);
      if (gm.sp) D.glow(g, 0, 0, r * 2.3, gm.sp === 'flame' ? '#f97316' : '#fff', 0.55 + 0.25 * Math.sin(t * 8));
      const path = () => {
        g.beginPath();
        if (G.s === 'round') g.arc(0, 0, r, 0, U.TAU);
        else if (G.s === 'rect') { D.rr(g, -r * 0.8, -r, r * 1.6, r * 2, r * 0.25); }
        else { const n = { oct: 8, hex: 6, dia: 4, tri: 3, star: 10 }[G.s]; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * U.TAU + (G.s === 'oct' ? Math.PI / 8 : 0), rr = G.s === 'star' ? (i % 2 ? r * 0.55 : r * 1.05) : G.s === 'tri' ? r * 1.15 : r; const py = G.s === 'tri' ? Math.sin(a) * rr + r * 0.2 : Math.sin(a) * rr * (G.s === 'dia' ? 1.1 : 1); i ? g.lineTo(Math.cos(a) * rr, py) : g.moveTo(Math.cos(a) * rr, py); } g.closePath(); }
      };
      path(); const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, U.shade(c, 0.45)); gr.addColorStop(0.5, c); gr.addColorStop(1, U.shade(c, -0.45)); g.fillStyle = gr; g.fill();
      g.strokeStyle = U.shade(c, -0.5); g.lineWidth = 2; g.stroke();
      // facet
      g.save(); path(); g.clip(); g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r * 0.2, -r); g.lineTo(-r * 0.2, 0); g.lineTo(-r, r * 0.1); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(r, r); g.lineTo(-r * 0.1, r); g.lineTo(r * 0.3, 0); g.lineTo(r, -r * 0.1); g.fill(); g.restore();
      D.circle(g, -r * 0.32, -r * 0.38, r * 0.13, 'rgba(255,255,255,.85)');
      if (gm.sp === 'star') { D.star(g, 0, 0, r * 0.5, r * 0.2, 4, t * 2, '#fff'); }
      if (gm.sp === 'flame') { g.globalAlpha = 0.8 + 0.2 * Math.sin(t * 20); D.circle(g, 0, 0, r * 1.1, null, '#fdba74', 3); g.globalAlpha = 1; }
      g.restore();
    }
  },
});

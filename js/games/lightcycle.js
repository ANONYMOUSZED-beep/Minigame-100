MG.add({
  id: 'lightcycle', name: 'Light Cycles', cat: 'Arcade', color: '#22d3ee', color2: '#f97316',
  desc: 'Four riders, one grid, walls of light. Box in three space-hungry AIs and be the last cycle running.',
  how: ['Turn with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd> or swipe', 'Hold <kbd>Space</kbd> to boost (meter refills)', 'Anything you touch — walls, trails — ends your run', 'Win 3 rounds to take the match'],
  pad: 'LRUDA', padLabels: { A: 'BOOST' },
  make(E) {
    const W = 960, H = 600, C = 6, GW = W / C, GH = (H - 30) / C, TOP = 30;
    const DIRS = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }, OPP = { L: 'R', R: 'L', U: 'D', D: 'U' };
    const COLORS = ['#22d3ee', '#f97316', '#e879f9', '#a3e635'];
    let grid, bikes, acc, round = 0, wins = [0, 0, 0, 0], state, stateT, queue = [], boost = 1, time = 0;
    function newRound() {
      round++; grid = new Uint8Array(GW * GH); acc = 0; time = 0; queue = []; boost = 1;
      const spots = [[20, GH / 2 | 0, 'R'], [GW - 21, GH / 2 | 0, 'L'], [GW / 2 | 0, 12, 'D'], [GW / 2 | 0, GH - 13, 'U']];
      bikes = spots.map(([x, y, d], i) => ({ id: i, x, y, dir: d, alive: true, trail: [[x, y]], ai: i > 0, speed: 1, t: 0, derez: 0 }));
      bikes.forEach((b) => (grid[b.y * GW + b.x] = b.id + 1));
      state = 'count'; stateT = 2.4;
    }
    newRound();
    const free = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !grid[y * GW + x];
    const seen = new Int32Array(GW * GH), stack = new Int32Array(GW * GH); let stamp = 0;
    function space(x, y, limit) {
      if (!free(x, y)) return 0;
      stamp++; let sp = 0, n = 0;
      stack[sp++] = y * GW + x; seen[y * GW + x] = stamp;
      while (sp && n < limit) {
        const k = stack[--sp], cx = k % GW, cy = (k / GW) | 0; n++;
        if (cx > 0 && !grid[k - 1] && seen[k - 1] !== stamp) { seen[k - 1] = stamp; stack[sp++] = k - 1; }
        if (cx < GW - 1 && !grid[k + 1] && seen[k + 1] !== stamp) { seen[k + 1] = stamp; stack[sp++] = k + 1; }
        if (cy > 0 && !grid[k - GW] && seen[k - GW] !== stamp) { seen[k - GW] = stamp; stack[sp++] = k - GW; }
        if (cy < GH - 1 && !grid[k + GW] && seen[k + GW] !== stamp) { seen[k + GW] = stamp; stack[sp++] = k + GW; }
      }
      return n;
    }
    function aiThink(b) {
      const opts = ['L', 'R', 'U', 'D'].filter((d) => d !== OPP[b.dir]);
      const me = bikes[0];
      let best = b.dir, bs = -1e9;
      for (const d of opts) {
        const [dx, dy] = DIRS[d]; const nx = b.x + dx, ny = b.y + dy;
        if (!free(nx, ny)) continue;
        let run = 0; while (run < 30 && free(b.x + dx * (run + 1), b.y + dy * (run + 1))) run++;
        let sc = space(nx, ny, 900) * 2 + run * 3 + (d === b.dir ? 12 : 0) + U.rand(0, 18);
        if (me.alive && b.id === 1) { const dd = Math.abs(nx + DIRS[me.dir][0] * 8 - me.x) + Math.abs(ny + DIRS[me.dir][1] * 8 - me.y); sc -= dd * 0.8; }
        if (sc > bs) { bs = sc; best = d; }
      }
      if (best !== b.dir) { b.dir = best; b.trail.push([b.x, b.y]); }
    }
    function crash(b) {
      b.alive = false; b.derez = 1;
      for (let i = 0; i < grid.length; i++) if (grid[i] === b.id + 1) grid[i] = 0;
      const px = b.x * C + C / 2, py = TOP + b.y * C + C / 2;
      E.burst(px, py, { n: 50, colors: [COLORS[b.id], '#fff'], speed: 320, shape: 'spark', life: 1 });
      E.ring(px, py, { color: COLORS[b.id], r: 90, lw: 5 });
      E.sfx('explode', b.id ? 1.3 : 0.9, b.id ? 0.5 : 1); E.shake(b.id ? 5 : 14);
      if (b.id === 0) { E.flash('#22d3ee', 0.3); E.vibrate(200); }
      else if (bikes[0].alive) { E.score += 50; E.pop(px, py - 20, '+50', { color: COLORS[b.id] }); }
    }
    function step(b) {
      if (!b.alive) return;
      if (b.ai) aiThink(b);
      else if (queue.length) { const d = queue.shift(); if (d !== OPP[b.dir] && d !== b.dir) { b.dir = d; b.trail.push([b.x, b.y]); E.sfx('tick', 1.5, 0.4); } }
      const [dx, dy] = DIRS[b.dir];
      const nx = b.x + dx, ny = b.y + dy;
      if (!free(nx, ny)) { b.trail.push([b.x, b.y]); crash(b); return; }
      b.x = nx; b.y = ny; grid[ny * GW + nx] = b.id + 1;
    }
    function endRound() {
      const alive = bikes.filter((b) => b.alive);
      const w = alive.length === 1 ? alive[0].id : -1;
      if (w >= 0) wins[w]++;
      if (w === 0) { E.score += 300 + Math.round(time * 5); E.sfx('win'); }
      else E.sfx('lose');
      E.stat('Wins', `${wins[0]} – ${Math.max(wins[1], wins[2], wins[3])}`);
      state = 'end'; stateT = 2.5;
      const title = w === 0 ? 'ROUND WON' : w < 0 ? 'DRAW' : 'DEREZZED';
      E.banner(title, `Round ${round} · you ${wins[0]} / best AI ${Math.max(wins[1], wins[2], wins[3])}`, { color: w >= 0 ? COLORS[w] : '#fff' });
    }
    E.stat('Wins', '0 – 0');
    return {
      update(dt) {
        for (const k of ['L', 'R', 'U', 'D']) if ((E.hit(k) || E.swipe === k) && queue.length < 3) queue.push(k);
        for (const b of bikes) if (b.derez > 0) b.derez = Math.max(0, b.derez - dt * 0.8);
        if (state === 'count') { stateT -= dt; if (Math.floor(stateT + dt) !== Math.floor(stateT) && stateT > 0) E.sfx('blip', stateT < 1 ? 1.5 : 1); if (stateT <= 0) { state = 'play'; E.sfx('charge', 1.2); } return; }
        if (state === 'end') {
          stateT -= dt;
          if (stateT <= 0) {
            const top = Math.max(...wins);
            if (top >= 3) { const won = wins[0] >= 3; if (won) E.score += 1000; E.over({ win: won, title: won ? 'Grid Champion' : 'Derezzed', msg: `Rounds won ${wins[0]} of ${round}` }); state = 'done'; }
            else newRound();
          }
          return;
        }
        if (state !== 'play') return;
        time += dt;
        const me = bikes[0];
        const boosting = E.down('A') && boost > 0.05 && me.alive;
        boost = boosting ? Math.max(0, boost - dt * 0.55) : Math.min(1, boost + dt * 0.2);
        const rate = 28 + Math.min(round, 5) * 1.5;
        acc += dt * rate;
        while (acc >= 1) {
          acc -= 1;
          for (const b of bikes) step(b);
          if (boosting) step(me);
          if (bikes[0].alive) E.score += 1;
          const alive = bikes.filter((b) => b.alive);
          if (!me.alive || alive.length <= 1) { endRound(); break; }
        }
        if (boosting && Math.random() < 0.5) E.sfx('engine', 2, 0.6);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#01030a', '#050b1c');
        // grid floor
        g.strokeStyle = 'rgba(34,211,238,.07)'; g.lineWidth = 1;
        for (let x = 0; x <= W; x += 30) { g.beginPath(); g.moveTo(x + 0.5, TOP); g.lineTo(x + 0.5, H); g.stroke(); }
        for (let y = TOP; y <= H; y += 30) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
        g.strokeStyle = 'rgba(34,211,238,.5)'; g.lineWidth = 2; g.strokeRect(1, TOP + 1, W - 2, H - TOP - 2);
        // trails
        g.lineCap = 'square'; g.lineJoin = 'miter';
        for (const b of bikes) {
          if (!b.alive && b.derez <= 0) continue;
          const pts = [...b.trail, [b.x, b.y]], col = COLORS[b.id];
          const a = b.alive ? 1 : b.derez;
          g.globalAlpha = a;
          const path = () => { g.beginPath(); pts.forEach(([x, y], i) => { const px = x * C + C / 2, py = TOP + y * C + C / 2; i ? g.lineTo(px, py) : g.moveTo(px, py); }); };
          path(); g.strokeStyle = U.rgba(col, 0.18); g.lineWidth = 12; g.stroke();
          path(); g.strokeStyle = col; g.lineWidth = 3.5; g.stroke();
          path(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke();
          g.globalAlpha = 1;
          if (b.alive) {
            const px = b.x * C + C / 2, py = TOP + b.y * C + C / 2, [dx, dy] = DIRS[b.dir];
            D.glow(g, px, py, 34, col, 0.9);
            g.save(); g.translate(px, py); g.rotate(Math.atan2(dy, dx));
            D.fillRR(g, -10, -4, 16, 8, 3, '#0b1020'); D.strokeRR(g, -10, -4, 16, 8, 3, col, 2); D.circle(g, 6, 0, 2.5, '#fff');
            g.restore();
          }
        }
        // top bar
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, TOP);
        bikes.forEach((b, i) => { const x = 16 + i * 150; D.circle(g, x, 15, 5, b.alive ? COLORS[i] : '#334155'); D.text(g, `${i === 0 ? 'YOU' : 'AI ' + i}  ${'●'.repeat(wins[i])}${'○'.repeat(3 - wins[i])}`, x + 12, 15, { size: 12, font: 'mono', align: 'left', color: COLORS[i] }); });
        D.text(g, 'BOOST', W - 150, 15, { size: 11, font: 'mono', color: '#94a3b8' });
        D.fillRR(g, W - 120, 10, 100, 10, 5, 'rgba(255,255,255,.1)'); D.fillRR(g, W - 120, 10, 100 * boost, 10, 5, boost > 0.25 ? '#22d3ee' : '#f87171');
        if (state === 'count') { const n = Math.ceil(stateT - 0.4); D.text(g, n > 0 ? n : 'GO', W / 2, H / 2, { size: 90, color: '#fff', glow: '#22d3ee', alpha: 0.9 }); D.text(g, `ROUND ${round}`, W / 2, H / 2 - 80, { size: 20, color: '#94a3b8', font: 'mono' }); }
        void t;
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

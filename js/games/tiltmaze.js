MG.add({
  id: 'tiltmaze', name: 'Tilt Maze', cat: 'Physics', color: '#2dd4bf', color2: '#facc15',
  desc: 'Rotate the whole labyrinth and let gravity roll the marble home. Mazes grow with every level.',
  how: ['Rotate the maze with <kbd>←</kbd> <kbd>→</kbd> or by dragging sideways', 'Gravity always pulls the marble toward the bottom of the screen', 'Grab the gems for bonus points, then drop into the glowing exit', 'Faster clears score higher'],
  pad: 'LR',
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2 + 10, SIZE = 470, BR = 9;
    let level = 0, N, cell, maze, ang = 0, angV = 0, ball, exit, gems, time, segs, state, stateT, dragX = null, T = 0;
    function gen() {
      level++; N = Math.min(14, 5 + level); cell = SIZE / N;
      const walls = U.grid(N, N, () => ({ r: true, b: true })), seen = U.grid(N, N, false), st = [[0, 0]]; seen[0][0] = true;
      while (st.length) {
        const [x, y] = st[st.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx]);
        if (!nb.length) { st.pop(); continue; }
        const [nx, ny, dx, dy] = U.pick(nb);
        if (dx === 1) walls[y][x].r = false; if (dx === -1) walls[ny][nx].r = false; if (dy === 1) walls[y][x].b = false; if (dy === -1) walls[ny][nx].b = false;
        seen[ny][nx] = true; st.push([nx, ny]);
      }
      // a few loops for flow
      for (let k = 0; k < N; k++) { const x = U.ri(0, N - 2), y = U.ri(0, N - 2); if (U.chance(0.5)) walls[y][x].r = false; else walls[y][x].b = false; }
      maze = walls;
      segs = [];
      const o = -SIZE / 2;
      segs.push([o, o, -o, o], [o, -o, -o, -o], [o, o, o, -o], [-o, o, -o, -o]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (walls[y][x].r && x < N - 1) segs.push([o + (x + 1) * cell, o + y * cell, o + (x + 1) * cell, o + (y + 1) * cell]); if (walls[y][x].b && y < N - 1) segs.push([o + x * cell, o + (y + 1) * cell, o + (x + 1) * cell, o + (y + 1) * cell]); }
      ball = { x: o + cell / 2, y: o + cell / 2, vx: 0, vy: 0 };
      exit = { x: o + (N - 0.5) * cell, y: o + (N - 0.5) * cell };
      gems = U.range(Math.min(6, 2 + level)).map(() => ({ x: o + (U.ri(1, N - 1) + 0.5) * cell, y: o + (U.ri(1, N - 1) + 0.5) * cell, got: false }));
      time = 0; state = 'play';
      E.stat('Level', level);
      E.banner(`MAZE ${level}`, `${N}×${N}`, { color: '#2dd4bf', life: 1.1 });
    }
    gen();
    return {
      update(dt) {
        T += dt;
        if (state === 'win') { stateT -= dt; ang = U.damp(ang, Math.round(ang / (Math.PI / 2)) * (Math.PI / 2), 4, dt); if (stateT <= 0) gen(); return; }
        time += dt; E.stat('Time', U.fmtTime(time, 1));
        let input = E.axis().x;
        if (E.ptr.hit) dragX = E.ptr.x;
        if (E.ptr.down && dragX !== null) { angV = U.damp(angV, ((E.ptr.x - dragX) / Math.max(dt, 1e-3)) * 0.006, 12, dt); dragX = E.ptr.x; input = 0; }
        else { dragX = null; angV = U.damp(angV, input * 2.4, 10, dt); }
        ang += angV * dt;
        // gravity in maze-local space
        const c = Math.cos(-ang), s = Math.sin(-ang), gx = -s * 900, gy = c * 900;
        const sub = 6, h = dt / sub;
        for (let k = 0; k < sub; k++) {
          ball.vx += gx * h; ball.vy += gy * h; ball.vx *= 0.999; ball.vy *= 0.999;
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          for (const [x1, y1, x2, y2] of segs) {
            const q = U.segDist(ball.x, ball.y, x1, y1, x2, y2), rr = BR + 3;
            if (q.d < rr && q.d > 1e-5) { const nx = (ball.x - q.x) / q.d, ny = (ball.y - q.y) / q.d, vn = ball.vx * nx + ball.vy * ny; ball.x = q.x + nx * rr; ball.y = q.y + ny * rr; if (vn < 0) { ball.vx -= 1.3 * vn * nx; ball.vy -= 1.3 * vn * ny; if (-vn > 160) E.sfx('tick', 1 + Math.random() * 0.3, Math.min(0.5, -vn / 900)); } }
          }
        }
        for (const gm of gems) if (!gm.got && U.dist(ball.x, ball.y, gm.x, gm.y) < cell * 0.4) { gm.got = true; E.score += 100; E.sfx('coin', 1.3); const [sx, sy] = toScreen(gm.x, gm.y); E.burst(sx, sy, { n: 14, colors: ['#facc15', '#fff'], speed: 140 }); }
        if (U.dist(ball.x, ball.y, exit.x, exit.y) < cell * 0.38) {
          state = 'win'; stateT = 1.6;
          const bonus = Math.max(0, Math.round(N * 60 - time * 10)) + 500;
          E.score += bonus; E.sfx('win'); E.pop(CX, CY, `CLEAR +${bonus}`, { color: '#2dd4bf', size: 32 });
          const [sx, sy] = toScreen(exit.x, exit.y); E.burst(sx, sy, { n: 40, colors: ['#2dd4bf', '#facc15', '#fff'], speed: 240 });
          if (level >= 10) E.after(1.5, () => E.over({ win: true, title: 'Labyrinth Master', msg: `10 mazes cleared` }));
        }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#0f2a2a', '#030a0c');
        g.save(); g.translate(CX, CY); g.rotate(ang);
        const o = -SIZE / 2;
        D.glow(g, 0, 0, SIZE * 0.8, '#2dd4bf', 0.1);
        D.fillRR(g, o - 16, o - 16, SIZE + 32, SIZE + 32, 22, '#134e4a');
        D.fillRR(g, o, o, SIZE, SIZE, 8, '#0b1f22');
        g.fillStyle = 'rgba(45,212,191,.05)'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) g.fillRect(o + x * cell, o + y * cell, cell, cell);
        // exit
        D.glow(g, exit.x, exit.y, cell, '#2dd4bf', 0.5 + 0.2 * Math.sin(t * 4)); D.circle(g, exit.x, exit.y, cell * 0.32, '#020617', '#5eead4', 3);
        for (const gm of gems) if (!gm.got) { g.save(); g.translate(gm.x, gm.y); g.rotate(-ang); D.poly(g, [[0, -9], [7, -2], [0, 9], [-7, -2]], '#facc15', '#fff', 1); g.restore(); }
        g.lineCap = 'round';
        for (const [x1, y1, x2, y2] of segs) { D.line(g, x1, y1, x2, y2, 'rgba(94,234,212,.25)', 9); D.line(g, x1, y1, x2, y2, '#5eead4', 4); }
        g.restore();
        // ball (drawn unrotated for correct highlight)
        const [bx, by] = toScreen(ball.x, ball.y);
        D.shadow(g, bx + 2, by + 4, BR, BR * 0.6, 0.4); D.orb(g, bx, by, BR, '#e2e8f0', 0.6);
        // gravity arrow
        D.poly(g, [[W - 60, H - 90], [W - 50, H - 70], [W - 70, H - 70]].map(([x, y]) => [x, y + 20]), 'rgba(250,204,21,.6)');
        D.text(g, 'g', W - 60, H - 90, { size: 14, font: 'mono', color: 'rgba(250,204,21,.7)' });
      },
    };
    function toScreen(x, y) { const c = Math.cos(ang), s = Math.sin(ang); return [CX + x * c - y * s, CY + x * s + y * c]; }
  },
});

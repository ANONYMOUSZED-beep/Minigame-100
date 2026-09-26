MG.add({
  id: 'sokoban', name: 'Sokoban', cat: 'Puzzle', color: '#f59e0b', color2: '#22c55e',
  desc: 'Ten warehouse puzzles, each verified solvable and rated against its optimal solution. Think before you push.',
  how: ['Move with <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd>, swipe, or tap a tile to walk there', 'Push every crate onto a glowing pad — you can\'t pull', '<kbd>Z</kbd> / <kbd>U</kbd> undo · <kbd>R</kbd> restart the level', 'Finishing near par (the optimal move count) scores more'],
  pad: 'LRUDAB', padLabels: { A: 'UNDO', B: 'RESET' },
  make(E) {
    const W = 960, H = 600;
    const LEVELS = [
      [3, '########\n#      #\n# @ $ .#\n#      #\n########'],
      [12, '#######\n#.    #\n#  $$ #\n#.  @ #\n#######'],
      [16, ' #####\n #   ##\n##$#  #\n# . $ #\n# .#@ #\n#   ###\n#####'],
      [26, '########\n#      #\n# $ $  #\n#  ## .#\n# @$ ..#\n#      #\n########'],
      [22, '#######\n#.   .#\n# $$$ #\n#  @  #\n# $.$ #\n#.   .#\n#######'],
      [29, ' ####\n##  ####\n#  $  .#\n# #$##.#\n# @ $ .#\n####   #\n   #####'],
      [41, '  ####\n###  ####\n#     $ #\n# #  #$ #\n# . .#@ #\n#########'],
      [41, '  ######\n  #    #\n### ## #\n# $ $  #\n# .. #@#\n##   $ #\n #  . ##\n ######'],
      [43, ' ######\n #    #\n # $$ ###\n # #    #\n## # ## #\n#  . . @#\n#   #####\n#####'],
      [33, '#########\n#       #\n# $ # $ #\n#  ...  #\n## #.# ##\n#  $ $  #\n#   @   #\n#########'],
    ];
    let lv = -1, map, Wd, Hd, TS, ox, oy, goals, boxes, pl, face = [0, 1], hist, moves, pushes, st = 'play', stT = 0, queue = [], stepT = 0, T = 0, par, bob = 0;
    const DIRS = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
    function load(next = true) {
      if (next) lv++;
      const rows = LEVELS[lv][1].split('\n'); par = LEVELS[lv][0];
      Hd = rows.length; Wd = Math.max(...rows.map((r) => r.length));
      map = []; goals = []; boxes = [];
      rows.forEach((r, y) => { map.push([]); [...r.padEnd(Wd)].forEach((c, x) => { map[y].push(c === '#' ? 1 : 0); if ('.*+'.includes(c)) goals.push([x, y]); if ('$*'.includes(c)) boxes.push({ x, y, fx: x, fy: y, id: boxes.length, on: 0 }); if ('@+'.includes(c)) pl = { x, y, fx: x, fy: y }; }); });
      // flood from player to mark interior floor (for pretty rendering)
      const inside = U.grid(Wd, Hd, false), q = [[pl.x, pl.y]]; inside[pl.y][pl.x] = true;
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < Wd && ny < Hd && !map[ny][nx] && !inside[ny][nx]) { inside[ny][nx] = true; q.push([nx, ny]); } } }
      map.inside = inside;
      TS = Math.floor(Math.min(820 / Wd, 470 / Hd, 64)); ox = Math.round((W - Wd * TS) / 2); oy = Math.round((H - Hd * TS) / 2) + 20;
      hist = []; moves = 0; pushes = 0; queue = []; st = 'play';
      E.stat('Level', `${lv + 1}/${LEVELS.length}`); E.stat('Moves', 0);
      if (next) E.banner(`LEVEL ${lv + 1}`, `par ${par} moves`, { color: '#f59e0b', life: 1.1 });
    }
    load();
    const boxAt = (x, y) => boxes.find((b) => b.x === x && b.y === y);
    const isGoal = (x, y) => goals.some(([gx, gy]) => gx === x && gy === y);
    function step(d) {
      const [dx, dy] = DIRS[d]; face = [dx, dy];
      const nx = pl.x + dx, ny = pl.y + dy;
      if (map[ny][nx]) { bump(); return false; }
      const b = boxAt(nx, ny);
      if (b) {
        const bx = nx + dx, by = ny + dy;
        if (map[by][bx] || boxAt(bx, by)) { bump(); return false; }
        hist.push({ p: [pl.x, pl.y], b: b.id, bp: [b.x, b.y], m: moves, pu: pushes });
        b.x = bx; b.y = by; pushes++;
        E.sfx('thud', 1.3, 0.35); E.noise({ dur: 0.08, vol: 0.08, ft: 'lowpass', f: 700 });
        if (isGoal(bx, by)) { b.on = 1; E.sfx('ding', 1.2, 0.5); E.burst(ox + bx * TS + TS / 2, oy + by * TS + TS / 2, { n: 12, colors: ['#4ade80', '#fef08a'], speed: 150 }); }
      } else hist.push({ p: [pl.x, pl.y], b: -1, m: moves, pu: pushes });
      pl.x = nx; pl.y = ny; moves++; bob = 1;
      E.sfx('tick', 1.6, 0.25);
      E.stat('Moves', moves);
      if (boxes.every((q) => isGoal(q.x, q.y))) win();
      return true;
    }
    function bump() { E.sfx('tick', 0.5, 0.3); queue = []; }
    function undo() {
      const h = hist.pop(); if (!h) return;
      pl.x = h.p[0]; pl.y = h.p[1]; moves = h.m; pushes = h.pu; queue = [];
      if (h.b >= 0) { const b = boxes[h.b]; b.x = h.bp[0]; b.y = h.bp[1]; }
      E.sfx('whoosh', 1.6, 0.3); E.stat('Moves', moves);
    }
    function win() {
      st = 'won'; stT = 1.8; queue = [];
      const pts = Math.round(200 + 800 * Math.min(1, par / moves));
      E.score += pts; E.sfx('win');
      E.banner(moves <= par ? 'PERFECT!' : 'SOLVED', `${moves} moves (par ${par}) · +${pts}`, { color: '#4ade80', life: 1.7 });
    }
    function pathTo(tx, ty) {
      const prev = new Map(), k = (x, y) => y * Wd + x, q = [[pl.x, pl.y]]; prev.set(k(pl.x, pl.y), null);
      while (q.length) {
        const [x, y] = q.shift();
        if (x === tx && y === ty) { const out = []; let c = k(x, y); while (prev.get(c)) { const [d, p] = prev.get(c); out.unshift(d); c = p; } return out; }
        for (const [d, [dx, dy]] of Object.entries(DIRS)) { const nx = x + dx, ny = y + dy; if (map[ny] && !map[ny][nx] && !boxAt(nx, ny) && !prev.has(k(nx, ny))) { prev.set(k(nx, ny), [d, k(x, y)]); q.push([nx, ny]); } }
      }
      return null;
    }
    return {
      update(dt) {
        T += dt; bob = Math.max(0, bob - dt * 6);
        pl.fx = U.damp(pl.fx, pl.x, 26, dt); pl.fy = U.damp(pl.fy, pl.y, 26, dt);
        for (const b of boxes) { b.fx = U.damp(b.fx, b.x, 26, dt); b.fy = U.damp(b.fy, b.y, 26, dt); b.on = isGoal(b.x, b.y) ? Math.min(1, b.on + dt * 4) : Math.max(0, b.on - dt * 4); }
        if (st === 'won') { stT -= dt; if (stT <= 0) { if (lv >= LEVELS.length - 1) { st = 'done'; E.over({ win: true, title: 'Warehouse Master', msg: `All ${LEVELS.length} levels solved` }); } else load(); } return; }
        if (st !== 'play') return;
        for (const d of ['L', 'R', 'U', 'D']) if (E.hit(d) || E.swipe === d) { queue = []; step(d); }
        if (E.hit('KeyZ', 'KeyU', 'Backspace') || E.hit('A')) undo();
        if (E.hit('KeyR') || E.hit('B')) { load(false); E.sfx('whoosh'); }
        if (E.ptr.hit) {
          const tx = Math.floor((E.ptr.x - ox) / TS), ty = Math.floor((E.ptr.y - oy) / TS);
          if (tx >= 0 && ty >= 0 && tx < Wd && ty < Hd) {
            const dx = tx - pl.x, dy = ty - pl.y;
            if (Math.abs(dx) + Math.abs(dy) === 1) { queue = []; step(dx === 1 ? 'R' : dx === -1 ? 'L' : dy === 1 ? 'D' : 'U'); }
            else { const p = pathTo(tx, ty); if (p) { queue = p; stepT = 0; } else E.sfx('tick', 0.5, 0.3); }
          }
        }
        if (queue.length) { stepT -= dt; if (stepT <= 0) { stepT = 0.075; step(queue.shift()); } }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#292524', '#0c0a09');
        g.fillStyle = 'rgba(255,255,255,.02)'; for (let i = 0; i < W; i += 48) g.fillRect(i, 0, 1, H);
        // floor
        for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (map.inside[y][x]) { g.fillStyle = (x + y) % 2 ? '#57534e' : '#524d49'; g.fillRect(ox + x * TS, oy + y * TS, TS, TS); }
        // goals
        for (const [x, y] of goals) { const cx = ox + x * TS + TS / 2, cy = oy + y * TS + TS / 2; D.glow(g, cx, cy, TS * 0.8, '#fde047', 0.35 + 0.1 * Math.sin(t * 3 + x)); D.circle(g, cx, cy, TS * 0.28, 'rgba(253,224,71,.12)', '#fde047', 2.5); D.circle(g, cx, cy, TS * 0.1, '#fde047'); }
        // walls with depth
        const dep = Math.max(6, TS * 0.22);
        for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
          if (!map[y][x]) continue;
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => map.inside[y + dy] && map.inside[y + dy][x + dx]);
          if (!near) continue;
          const px = ox + x * TS, py = oy + y * TS;
          g.fillStyle = '#44403c'; g.fillRect(px, py + TS - dep, TS, dep);
          g.fillStyle = '#78716c'; g.fillRect(px, py - dep, TS, TS);
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + TS / 2 - 1, py - dep, 2, TS / 2); g.fillRect(px, py - dep + TS / 2 - 1, TS, 2); g.fillRect(px + TS / 4, py - dep + TS / 2, 2, TS / 2);
          g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px, py - dep, TS, 3);
        }
        // entities sorted by y for overlap
        const ents = boxes.map((b) => ({ y: b.fy, b })).concat([{ y: pl.fy, p: true }]).sort((a, b) => a.y - b.y);
        for (const e of ents) {
          if (e.b) {
            const b = e.b, px = ox + b.fx * TS, py = oy + b.fy * TS, m = TS * 0.08;
            D.shadow(g, px + TS / 2, py + TS - 4, TS * 0.42, TS * 0.12, 0.4);
            const bc = U.mix('#b45309', '#15803d', b.on);
            D.fillRR(g, px + m, py + m - dep * 0.6 + dep * 0.35, TS - 2 * m, TS - 2 * m, 6, U.shade(bc, -0.35));
            D.fillRR(g, px + m, py + m - dep * 0.6, TS - 2 * m, TS - 2 * m, 6, bc);
            g.strokeStyle = U.shade(bc, -0.3); g.lineWidth = Math.max(2, TS * 0.06);
            const x0 = px + m + 4, y0 = py + m - dep * 0.6 + 4, s = TS - 2 * m - 8;
            g.strokeRect(x0, y0, s, s); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + s, y0 + s); g.moveTo(x0 + s, y0); g.lineTo(x0, y0 + s); g.stroke();
            if (b.on > 0) D.glow(g, px + TS / 2, py + TS / 2 - dep * 0.6, TS * 0.9, '#4ade80', b.on * 0.35);
          } else {
            const px = ox + pl.fx * TS + TS / 2, py = oy + pl.fy * TS + TS / 2 - dep * 0.4 - Math.sin(bob * Math.PI) * 4, r = TS * 0.34;
            D.shadow(g, px, oy + pl.fy * TS + TS - 5, r * 0.9, r * 0.3, 0.45);
            D.orb(g, px, py, r, '#38bdf8', 0.5);
            D.fillRR(g, px - r * 0.7, py - r * 0.35, r * 1.4, r * 0.62, r * 0.3, '#0f172a');
            for (const s of [-1, 1]) D.circle(g, px + s * r * 0.3 + face[0] * r * 0.18, py - r * 0.04 + face[1] * r * 0.12, r * 0.12, '#67e8f9');
            D.line(g, px, py - r, px, py - r * 1.35, '#94a3b8', 2); D.circle(g, px, py - r * 1.4, 3, '#f43f5e');
          }
        }
        // HUD
        D.text(g, `LEVEL ${lv + 1}`, 30, 34, { size: 20, align: 'left', color: '#fbbf24' });
        D.text(g, `moves ${moves} · pushes ${pushes} · par ${par}`, 30, 60, { size: 13, align: 'left', font: 'mono', color: 'rgba(255,255,255,.55)' });
        D.text(g, 'Z undo · R restart', W - 30, 34, { size: 13, align: 'right', font: 'mono', color: 'rgba(255,255,255,.4)' });
        const done = boxes.filter((b) => isGoal(b.x, b.y)).length;
        for (let i = 0; i < boxes.length; i++) D.fillRR(g, W - 30 - (boxes.length - i) * 22, 50, 16, 16, 4, i < done ? '#4ade80' : 'rgba(255,255,255,.12)');
      },
    };
  },
});

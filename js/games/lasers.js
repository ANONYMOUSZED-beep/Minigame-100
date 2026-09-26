MG.add({
  id: 'lasers', name: 'Laser Lab', cat: 'Puzzle', color: '#f43f5e', color2: '#22d3ee',
  desc: 'Place mirrors to bend the laser through every crystal at once. Ten generated labs, each with a guaranteed solution.',
  how: ['Click / tap an empty square to place a mirror — click again to flip it, a third time to remove', 'Right-click removes a mirror', 'Light every crystal at the same time to clear the lab', 'Keys: arrows + <kbd>Space</kbd> · spare mirrors left over score a bonus'],
  pad: 'LRUDA', padLabels: { A: 'MIRROR' },
  make(E) {
    const W = 960, H = 600, C = 11, R = 7, S = 68, OX = (W - C * S) / 2, OY = 80;
    let lv = 0, grid, emit, inv, used, lit, beams, st = 'play', stT = 0, T = 0, cur = [5, 3], allOn = false;
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const inside = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
    function gen(turns, nTargets, nWalls) {
      for (let attempt = 0; attempt < 400; attempt++) {
        const g = U.grid(C, R, () => null);
        const side = U.ri(0, 3);
        let x, y, d;
        if (side === 0) { x = 0; y = U.ri(1, R - 2); d = 0; } else if (side === 1) { x = C - 1; y = U.ri(1, R - 2); d = 2; } else if (side === 2) { x = U.ri(1, C - 2); y = 0; d = 1; } else { x = U.ri(1, C - 2); y = R - 1; d = 3; }
        const e = { x, y, d }; g[y][x] = { t: 'emit' };
        const visited = new Set([y * C + x]), path = [], mirrors = [];
        let ok = true;
        for (let k = 0; k <= turns && ok; k++) {
          const last = k === turns, steps = last ? 99 : U.ri(1, 4);
          let n = 0;
          while (n < steps) {
            const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
            if (!inside(nx, ny)) break;
            if (g[ny][nx]) { ok = !last ? false : ok; break; }
            x = nx; y = ny; n++; visited.add(y * C + x); path.push([x, y]);
          }
          if (!ok) break;
          if (last) break;
          if (n === 0) { ok = false; break; }
          // turn here with a mirror (the square must not have been crossed before)
          if (path.slice(0, -1).some(([px, py]) => px === x && py === y)) { ok = false; break; }
          const opts = [(d + 1) % 4, (d + 3) % 4].filter((nd) => inside(x + DIRS[nd][0], y + DIRS[nd][1]) && !g[y + DIRS[nd][1]][x + DIRS[nd][0]]);
          if (!opts.length) { ok = false; break; }
          const nd = U.pick(opts), [dx, dy] = DIRS[d], [ex, ey] = DIRS[nd];
          const m = -dy === ex && -dx === ey ? '/' : '\\';
          g[y][x] = { t: 'sol', m }; mirrors.push([x, y]); path.pop(); d = nd;
        }
        if (!ok || mirrors.length !== turns) continue;
        const cand = U.shuffle(path.filter(([px, py]) => !g[py][px]));
        if (cand.length < nTargets) continue;
        for (let i = 0; i < nTargets; i++) { const [tx, ty] = cand[i]; g[ty][tx] = { t: 'crystal' }; }
        // clear the solution mirrors, add walls off the beam
        for (const [mx, my] of mirrors) g[my][mx] = null;
        let w = 0, guard = 0;
        while (w < nWalls && guard++ < 200) { const wx = U.ri(0, C - 1), wy = U.ri(0, R - 1); if (!g[wy][wx] && !visited.has(wy * C + wx) && !mirrors.some(([a, b]) => a === wx && b === wy)) { g[wy][wx] = { t: 'wall' }; w++; } }
        // the empty level must not already be solved
        grid = g; emit = e;
        if (trace().every(Boolean) && nTargets) continue;
        return mirrors.length;
      }
      return 0;
    }
    function load() {
      lv++;
      const turns = Math.min(7, 1 + Math.floor(lv * 0.7)), nt = Math.min(5, 1 + Math.floor(lv / 2)), walls = Math.min(12, lv + 1);
      const k = gen(turns, nt, walls);
      inv = k + (lv > 6 ? 0 : 1); used = 0; st = 'play'; allOn = false;
      E.stat('Lab', `${lv}/10`); E.stat('Mirrors', inv);
      E.banner(`LAB ${lv}`, `${nt} crystal${nt > 1 ? 's' : ''} · ${inv} mirrors`, { color: '#f43f5e', life: 1.2 });
    }
    function trace() {
      beams = []; lit = new Set();
      let x = emit.x, y = emit.y, d = emit.d; const seen = new Set();
      const pts = [[x, y]];
      for (let i = 0; i < 200; i++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inside(nx, ny)) { pts.push([nx - DIRS[d][0] * 0.5, ny - DIRS[d][1] * 0.5]); break; }
        const c = grid[ny][nx]; x = nx; y = ny;
        const key = (y * C + x) * 4 + d; if (seen.has(key)) { pts.push([x, y]); break; } seen.add(key);
        if (c && (c.t === 'wall' || c.t === 'emit')) { pts.push([x - DIRS[d][0] * 0.5, y - DIRS[d][1] * 0.5]); break; }
        if (c && c.t === 'crystal') lit.add(y * C + x);
        if (c && c.t === 'mirror') { const [dx, dy] = DIRS[d]; const nd = c.m === '/' ? [-dy, -dx] : [dy, dx]; d = DIRS.findIndex(([a, b]) => a === nd[0] && b === nd[1]); pts.push([x, y]); }
      }
      if (pts.length === 1 || pts[pts.length - 1][0] !== x || pts[pts.length - 1][1] !== y) pts.push([x, y]);
      beams.push(pts);
      const crystals = []; for (let yy = 0; yy < R; yy++) for (let xx = 0; xx < C; xx++) if (grid[yy][xx] && grid[yy][xx].t === 'crystal') crystals.push(lit.has(yy * C + xx));
      return crystals;
    }
    load(); trace();
    function cycle(x, y, remove) {
      if (st !== 'play') return;
      const c = grid[y][x];
      if (c && c.t !== 'mirror') { E.sfx('tick', 0.6, 0.4); return; }
      if (remove) { if (c) { grid[y][x] = null; used--; E.sfx('tick', 0.8, 0.5); } }
      else if (!c) { if (used >= inv) { E.sfx('error', 1.2, 0.5); E.pop(OX + x * S + S / 2, OY + y * S, 'no mirrors left', { size: 14, color: '#fca5a5' }); return; } grid[y][x] = { t: 'mirror', m: '/', rot: 0 }; used++; E.sfx('place', 1.3, 0.5); }
      else if (c.m === '/') { c.m = '\\'; E.sfx('click', 1.2, 0.5); }
      else { grid[y][x] = null; used--; E.sfx('tick', 0.8, 0.5); }
      E.stat('Mirrors', inv - used);
      const cr = trace();
      if (cr.length && cr.every(Boolean)) {
        st = 'won'; stT = 2; allOn = true;
        const pts = 300 + lv * 50 + (inv - used) * 150; E.score += pts;
        E.sfx('win'); E.flash('#f43f5e', 0.25);
        E.banner('LAB CLEARED', `+${pts}${inv - used ? ` · ${inv - used} spare` : ''}`, { color: '#22d3ee', life: 1.8 });
      } else if (cr.filter(Boolean).length > 0) E.sfx('ding', 1 + cr.filter(Boolean).length * 0.12, 0.35);
    }
    return {
      update(dt) {
        T += dt;
        if (st === 'won') { stT -= dt; if (stT <= 0) { if (lv >= 10) { st = 'done'; E.over({ win: true, title: 'Head Scientist', msg: 'All ten labs cleared' }); } else { load(); trace(); } } return; }
        const p = E.ptr;
        const cell = (px, py) => { const x = Math.floor((px - OX) / S), y = Math.floor((py - OY) / S); return inside(x, y) ? [x, y] : null; };
        if (p.hit) { const c = cell(p.x, p.y); if (c) { cur = c; cycle(...c, false); } }
        if (p.rhit) { const c = cell(p.x, p.y); if (c) cycle(...c, true); }
        if (E.hit('L')) cur[0] = Math.max(0, cur[0] - 1); if (E.hit('R')) cur[0] = Math.min(C - 1, cur[0] + 1); if (E.hit('U')) cur[1] = Math.max(0, cur[1] - 1); if (E.hit('D')) cur[1] = Math.min(R - 1, cur[1] + 1);
        if (E.hit('A')) cycle(cur[0], cur[1], false);
        if (E.hit('KeyX', 'Backspace')) cycle(cur[0], cur[1], true);
      },
      draw(g) {
        const t = T;
        D.bg(g, W, H, '#0b0f19', '#05070c');
        D.fillRR(g, OX - 10, OY - 10, C * S + 20, R * S + 20, 14, '#111827');
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { g.fillStyle = (x + y) % 2 ? '#1c2740' : '#18223a'; g.fillRect(OX + x * S, OY + y * S, S, S); }
        g.save(); g.translate(OX, OY); D.grid(g, C * S, R * S, S, 'rgba(34,211,238,.12)'); g.restore();
        const cc = (x, y) => [OX + x * S + S / 2, OY + y * S + S / 2];
        // beam
        for (const pts of beams) {
          const flick = 0.85 + 0.15 * Math.sin(t * 40);
          g.lineCap = 'round'; g.lineJoin = 'round';
          for (const [lw, col] of [[14, 'rgba(244,63,94,.18)'], [7, 'rgba(244,63,94,.55)'], [2.5, '#fff1f2']]) {
            g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = cc(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); });
            g.strokeStyle = col; g.lineWidth = lw * flick; g.stroke();
          }
          const [ex, ey] = cc(...pts[pts.length - 1]); D.glow(g, ex, ey, 26, '#f43f5e', 0.8);
        }
        // cells
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          const c = grid[y][x]; if (!c) continue;
          const [px, py] = cc(x, y);
          if (c.t === 'wall') { D.tile(g, px - S / 2 + 4, py - S / 2 + 4, S - 8, S - 8, 8, '#374151', 6); D.line(g, px - 14, py - 14, px + 14, py + 10, 'rgba(0,0,0,.25)', 3); }
          else if (c.t === 'emit') {
            g.save(); g.translate(px, py); g.rotate(Math.atan2(DIRS[emit.d][1], DIRS[emit.d][0]));
            D.fillRR(g, -26, -22, 40, 44, 10, '#475569'); D.fillRR(g, 6, -10, 24, 20, 5, '#94a3b8'); D.circle(g, 28, 0, 6, '#f43f5e'); D.glow(g, 28, 0, 22, '#f43f5e', 0.8);
            g.restore();
          } else if (c.t === 'crystal') {
            const on = lit.has(y * C + x);
            if (on) D.glow(g, px, py, 52, '#22d3ee', 0.8 + 0.2 * Math.sin(t * 6));
            g.save(); g.translate(px, py); g.rotate(t * (on ? 1.5 : 0.3));
            D.poly(g, [[0, -24], [16, -6], [10, 20], [-10, 20], [-16, -6]], on ? '#67e8f9' : '#155e75', on ? '#ecfeff' : '#22d3ee', 2);
            D.poly(g, [[0, -24], [6, -6], [0, 20], [-6, -6]], on ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.12)');
            g.restore();
          } else if (c.t === 'mirror') {
            g.save(); g.translate(px, py); g.rotate(c.m === '/' ? -Math.PI / 4 : Math.PI / 4);
            D.fillRR(g, -30, -6, 60, 12, 4, '#94a3b8'); D.fillRR(g, -30, -6, 60, 5, 3, '#f1f5f9');
            g.restore(); D.circle(g, px, py, 5, '#475569');
          }
        }
        if (E.ptr.type !== 'mouse' && E.ptr.type !== 'touch' && st === 'play') D.strokeRR(g, OX + cur[0] * S + 3, OY + cur[1] * S + 3, S - 6, S - 6, 8, `rgba(250,204,21,${0.5 + 0.4 * Math.sin(t * 6)})`, 3);
        // HUD
        D.text(g, `LAB ${lv}`, OX, 40, { size: 22, align: 'left', color: '#fda4af' });
        for (let i = 0; i < inv; i++) { const x = OX + C * S - 20 - i * 30; g.save(); g.translate(x, 40); g.rotate(-Math.PI / 4); D.fillRR(g, -12, -3, 24, 6, 2, i < inv - used ? '#e2e8f0' : 'rgba(255,255,255,.12)'); g.restore(); }
        const cr = []; for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (grid[y][x] && grid[y][x].t === 'crystal') cr.push(lit.has(y * C + x));
        D.text(g, `${cr.filter(Boolean).length} / ${cr.length} crystals lit`, W / 2, 40, { size: 16, font: 'mono', color: allOn ? '#67e8f9' : 'rgba(255,255,255,.6)' });
      },
    };
  },
});

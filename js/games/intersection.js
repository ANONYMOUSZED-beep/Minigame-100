MG.add({
  id: 'intersection', name: 'Rush Hour', cat: 'Strategy', color: '#facc15', color2: '#ef4444', scoreLabel: 'Cars',
  desc: 'The traffic lights are out and you are the lights. Hold and release cars at a busy crossroads — no crashes, no road rage.',
  how: ['Click / tap a car to hold it at the stop line; tap again to let it go', 'Cars already in the junction can\'t stop', 'A car held too long gets furious — if the meter fills, it\'s gridlock', 'Every car through safely scores · traffic keeps getting heavier'],
  pad: false,
  make(E) {
    const W = 960, H = 600, CX = 480, CY = 300, RW = 104, LANE = RW / 4;
    const BOX = { x0: CX - RW / 2, x1: CX + RW / 2, y0: CY - RW / 2, y1: CY + RW / 2 };
    const LANES = {
      E: { len: W + 160, stop: BOX.x0 - 34 + 80, pos: (s) => [-80 + s, CY + LANE], dir: [1, 0] },
      W: { len: W + 160, stop: W + 80 - (BOX.x1 + 34), pos: (s) => [W + 80 - s, CY - LANE], dir: [-1, 0] },
      S: { len: H + 160, stop: BOX.y0 - 34 + 80, pos: (s) => [CX - LANE, -80 + s], dir: [0, 1] },
      N: { len: H + 160, stop: H + 80 - (BOX.y1 + 34), pos: (s) => [CX + LANE, H + 80 - s], dir: [0, -1] },
    };
    const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f8fafc', '#64748b'];
    const RAGE = 11;
    let cars = [], spawnT = { E: 1, W: 2.2, S: 1.6, N: 3 }, el = 0, st = 'play', T = 0, passed = 0, crashAt = null, streak = 0, streakT = 0;
    function spawn(l) {
      const truck = Math.random() < 0.15, bus = !truck && el > 30 && Math.random() < 0.08;
      const len = truck ? 62 : bus ? 74 : 40, max = (truck || bus ? 95 : 130) + U.rand(-10, 20) + Math.min(60, el * 0.6);
      const back = cars.filter((c) => c.l === l).reduce((m, c) => Math.min(m, c.s - c.len), Infinity);
      if (back < 20) return; // lane backed up to the spawn point
      cars.push({ l, s: 0, v: max * 0.8, max, len, w: truck || bus ? 26 : 22, hold: false, wait: 0, col: bus ? '#facc15' : U.pick(COLORS), truck, bus, brake: 0, id: Math.random() });
    }
    const rect = (c) => { const L = LANES[c.l], [fx, fy] = L.pos(c.s), [dx, dy] = L.dir, bx = fx - dx * c.len, by = fy - dy * c.len; return { x0: Math.min(fx, bx) - (dy ? c.w / 2 : 0), x1: Math.max(fx, bx) + (dy ? c.w / 2 : 0), y0: Math.min(fy, by) - (dx ? c.w / 2 : 0), y1: Math.max(fy, by) + (dx ? c.w / 2 : 0) }; };
    const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    function crash(a, b) {
      st = 'crash'; const ra = rect(a), rb = rect(b); crashAt = [(ra.x0 + ra.x1 + rb.x0 + rb.x1) / 4, (ra.y0 + ra.y1 + rb.y0 + rb.y1) / 4];
      E.sfx('explode'); E.sfx('hit', 0.6); E.shake(18); E.flash('#fff', 0.5);
      E.burst(crashAt[0], crashAt[1], { n: 50, colors: ['#fde68a', '#f97316', '#94a3b8', '#111'], speed: 320 });
      E.after(1.6, () => E.over({ title: 'Crash!', msg: `${passed} cars made it through` }));
    }
    return {
      update(dt) {
        T += dt;
        if (st !== 'play') return;
        el += dt;
        streakT -= dt; if (streakT <= 0) streak = 0;
        for (const l of Object.keys(LANES)) { spawnT[l] -= dt; if (spawnT[l] <= 0) { spawn(l); spawnT[l] = Math.max(1.1, 4.4 - el * 0.035) * U.rand(0.7, 1.5); } }
        // input: toggle hold
        if (E.ptr.hit) {
          let best = null, bd = 40;
          for (const c of cars) { const r = rect(c), cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, d = Math.max(0, Math.abs(E.ptr.x - cx) - (r.x1 - r.x0) / 2) + Math.max(0, Math.abs(E.ptr.y - cy) - (r.y1 - r.y0) / 2); if (d < bd) { bd = d; best = c; } }
          if (best) { best.hold = !best.hold; E.sfx(best.hold ? 'tick' : 'select', best.hold ? 0.9 : 1.2, 0.6); }
        }
        // movement
        for (const c of cars) {
          const L = LANES[c.l];
          let target = c.max;
          // car ahead in same lane
          const ahead = cars.filter((o) => o.l === c.l && o.s > c.s).sort((a, b) => a.s - b.s)[0];
          if (ahead) { const gap = ahead.s - ahead.len - c.s; if (gap < 16) target = 0; else if (gap < 70) target = Math.min(target, ahead.v * 0.9 + (gap - 16)); }
          // hold at stop line (only if not already past it)
          if (c.hold && c.s <= L.stop + 2) { const gap = L.stop - c.s; if (gap < 3) target = 0; else target = Math.min(target, gap * 3); }
          const acc = target > c.v ? 150 : 520;
          c.brake = target < c.v - 5 ? 1 : Math.max(0, c.brake - dt * 4);
          c.v = U.approach(c.v, target, acc * dt);
          c.s += c.v * dt;
          if (c.v < 8) { c.wait += dt; if (c.wait > RAGE * 0.6 && Math.random() < dt * 0.8) E.sfx('blip', 0.5 + Math.random() * 0.1, 0.4); }
          else c.wait = Math.max(0, c.wait - dt * 2);
          if (c.wait > RAGE) { st = 'rage'; E.sfx('lose'); const [x, y] = L.pos(c.s); E.pop(x, y - 30, '!!!', { color: '#ef4444', size: 36 }); E.shake(8); E.after(1.4, () => E.over({ title: 'Road Rage!', msg: `A driver waited too long · ${passed} cars got through` })); return; }
          if (c.s - c.len > L.len) { c.done = true; passed++; streak++; streakT = 2.5; E.score += 1 + (streak >= 5 ? 1 : 0); E.stat('Flow', streak >= 5 ? `×2 (${streak})` : streak); if (streak % 10 === 0) { E.sfx('coin'); E.pop(CX, 60, `${streak} STREAK — double points!`, { color: '#facc15', size: 22 }); } }
        }
        cars = cars.filter((c) => !c.done);
        // collisions between crossing streams
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i], b = cars[j];
          if ((a.l === 'E' || a.l === 'W') === (b.l === 'E' || b.l === 'W')) continue;
          if (overlap(rect(a), rect(b))) { crash(a, b); return; }
        }
      },
      draw(g) {
        const t = T;
        // blocks
        D.bg(g, W, H, '#1f2937', '#111827');
        const blocks = [[0, 0, BOX.x0 - 30, BOX.y0 - 30], [BOX.x1 + 30, 0, W, BOX.y0 - 30], [0, BOX.y1 + 30, BOX.x0 - 30, H], [BOX.x1 + 30, BOX.y1 + 30, W, H]];
        for (const [x0, y0, x1, y1] of blocks) {
          D.fillRR(g, x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 12, '#9ca3af');
          D.fillRR(g, x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16, 10, '#365314');
          for (let i = 0; i < 6; i++) { const bx = x0 + 20 + ((i * 97) % Math.max(40, x1 - x0 - 90)), by = y0 + 20 + ((i * 61) % Math.max(40, y1 - y0 - 90)); D.shadow(g, bx + 40, by + 44, 36, 10, 0.3); D.fillRR(g, bx, by, 70, 60, 6, ['#475569', '#64748b', '#334155'][i % 3]); D.fillRR(g, bx + 4, by + 4, 62, 8, 3, 'rgba(255,255,255,.15)'); }
          for (let i = 0; i < 5; i++) { const tx = x0 + 30 + ((i * 131) % Math.max(30, x1 - x0 - 60)), ty = y1 - 30 - ((i * 53) % 40); D.circle(g, tx, ty, 12, '#15803d'); D.circle(g, tx - 3, ty - 3, 6, '#22c55e'); }
        }
        // roads
        g.fillStyle = '#374151'; g.fillRect(0, BOX.y0, W, RW); g.fillRect(BOX.x0, 0, RW, H);
        g.setLineDash([22, 18]); D.line(g, 0, CY, BOX.x0 - 30, CY, '#facc15', 2, 'butt'); D.line(g, BOX.x1 + 30, CY, W, CY, '#facc15', 2, 'butt'); D.line(g, CX, 0, CX, BOX.y0 - 30, '#facc15', 2, 'butt'); D.line(g, CX, BOX.y1 + 30, CX, H, '#facc15', 2, 'butt'); g.setLineDash([]);
        // zebra crossings
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (let i = 0; i < 8; i++) { const o = BOX.y0 + 6 + i * 12.5; g.fillRect(BOX.x0 - 26, o, 18, 7); g.fillRect(BOX.x1 + 8, o, 18, 7); const p = BOX.x0 + 6 + i * 12.5; g.fillRect(p, BOX.y0 - 26, 7, 18); g.fillRect(p, BOX.y1 + 8, 7, 18); }
        // stop lines
        D.line(g, BOX.x0 - 30, CY, BOX.x0 - 30, BOX.y1, '#fff', 4, 'butt'); D.line(g, BOX.x1 + 30, BOX.y0, BOX.x1 + 30, CY, '#fff', 4, 'butt');
        D.line(g, BOX.x0, BOX.y0 - 30, CX, BOX.y0 - 30, '#fff', 4, 'butt'); D.line(g, CX, BOX.y1 + 30, BOX.x1, BOX.y1 + 30, '#fff', 4, 'butt');
        // cars
        for (const c of cars) {
          const L = LANES[c.l], [fx, fy] = L.pos(c.s), [dx, dy] = L.dir, a = Math.atan2(dy, dx);
          const cx = fx - dx * c.len / 2, cy = fy - dy * c.len / 2;
          g.save(); g.translate(cx, cy); g.rotate(a);
          D.shadow(g, 3, 5, c.len / 2, c.w / 2, 0.4);
          D.fillRR(g, -c.len / 2, -c.w / 2, c.len, c.w, 7, c.col);
          if (c.bus) { for (let k = 0; k < 5; k++) D.fillRR(g, -c.len / 2 + 8 + k * 12, -c.w / 2 + 3, 9, c.w - 6, 2, '#1e293b'); }
          else if (c.truck) { D.fillRR(g, -c.len / 2 + 3, -c.w / 2 + 3, c.len * 0.62, c.w - 6, 3, U.shade(c.col, -0.2)); D.fillRR(g, c.len / 2 - 14, -c.w / 2 + 4, 7, c.w - 8, 2, '#bae6fd'); }
          else { D.fillRR(g, -c.len * 0.2, -c.w / 2 + 3, c.len * 0.45, c.w - 6, 4, U.shade(c.col, -0.25)); D.fillRR(g, c.len * 0.12, -c.w / 2 + 4, 6, c.w - 8, 2, '#bae6fd'); }
          D.circle(g, c.len / 2 - 2, -c.w / 2 + 4, 2.5, '#fef9c3'); D.circle(g, c.len / 2 - 2, c.w / 2 - 4, 2.5, '#fef9c3');
          const bl = c.brake || c.v < 5 ? '#ef4444' : '#7f1d1d';
          g.fillStyle = bl; g.fillRect(-c.len / 2, -c.w / 2 + 2, 3, 5); g.fillRect(-c.len / 2, c.w / 2 - 7, 3, 5);
          if (c.brake || c.v < 5) D.glow(g, -c.len / 2, 0, 14, '#ef4444', 0.5);
          g.restore();
          // hold marker & rage meter
          if (c.hold) { D.circle(g, cx, cy - 26, 11, '#dc2626', '#fff', 2); D.fillRR(g, cx - 6, cy - 28, 12, 4, 1, '#fff'); }
          if (c.wait > 1.5) { const k = Math.min(1, c.wait / RAGE); D.fillRR(g, cx - 18, cy + 18, 36, 5, 2, 'rgba(0,0,0,.5)'); D.fillRR(g, cx - 18, cy + 18, 36 * k, 5, 2, k > 0.7 ? '#ef4444' : k > 0.4 ? '#f59e0b' : '#facc15'); if (k > 0.6 && Math.sin(t * 14) > 0) D.text(g, '!', cx + 24, cy + 20, { size: 14, color: '#ef4444' }); }
        }
        D.text(g, `${passed} cars`, 24, 32, { size: 22, align: 'left', color: '#fff', stroke: 'rgba(0,0,0,.5)', lw: 5 });
        if (streak >= 5) D.text(g, `flow ×2`, 24, 60, { size: 16, align: 'left', color: '#facc15' });
      },
    };
  },
});

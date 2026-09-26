MG.add({
  id: 'bubbleshooter', name: 'Bubble Pop', cat: 'Puzzle', color: '#38bdf8', color2: '#f472b6', w: 600, h: 860,
  desc: 'Aim, bank off the walls and pop clusters of three. Cut a bubble\'s anchor and everything hanging from it drops.',
  how: ['Aim with the mouse / finger and click or release to shoot', 'Keys: <kbd>←</kbd><kbd>→</kbd> aim · <kbd>Space</kbd> shoot · <kbd>X</kbd> swap bubble', 'Connect 3+ of a colour to pop · dropped bubbles score double', 'Every few misses the ceiling pushes down a new row'],
  pad: 'LRAB', padLabels: { A: 'FIRE', B: 'SWAP' },
  make(E) {
    const W = 600, H = 860, R = 23, COLS = 12, RH = R * Math.sqrt(3), X0 = (W - COLS * 2 * R - R) / 2, Y0 = 70, DEAD = 690, SX = W / 2, SY = 780;
    const COL = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    let rows = [], level = 0, ncol, shot = null, cur, next, aim = -Math.PI / 2, misses = 0, missMax, falling = [], popping = [], st = 'play', T = 0, shake = 0, dragging = false;
    const cellX = (r, c) => X0 + R + c * 2 * R + (rows[r] && rows[r].odd ? R : 0);
    const cellY = (r) => Y0 + R + r * RH;
    const rowLen = (odd) => (odd ? COLS - 1 : COLS);
    function load() {
      level++; ncol = Math.min(6, 3 + level); missMax = Math.max(3, 7 - level);
      rows = []; const n = Math.min(10, 4 + level);
      for (let r = 0; r < n; r++) { const odd = r % 2 === 1; rows.push({ odd, c: U.range(rowLen(odd)).map(() => ({ k: U.ri(0, ncol - 1), wob: 0 })) }); }
      misses = 0; cur = pickColor(); next = pickColor(); st = 'play';
      E.stat('Level', level);
      E.banner(`LEVEL ${level}`, `${ncol} colours`, { color: '#38bdf8', life: 1.2 });
    }
    function present() { const s = new Set(); for (const row of rows) for (const b of row.c) if (b) s.add(b.k); return [...s]; }
    function pickColor() { const p = present(); return p.length ? U.pick(p) : U.ri(0, ncol - 1); }
    load();
    const get = (r, c) => (rows[r] && rows[r].c[c]) || null;
    function neighbors(r, c) {
      const out = [], odd = rows[r] ? rows[r].odd : (rows[0].odd ? r % 2 === 0 : r % 2 === 1);
      out.push([r, c - 1], [r, c + 1]);
      const dc = odd ? [0, 1] : [-1, 0];
      for (const dr of [-1, 1]) for (const d of dc) out.push([r + dr, c + d]);
      return out.filter(([rr, cc]) => rr >= 0 && cc >= 0 && rows[rr] && cc < rowLen(rows[rr].odd));
    }
    function ensureRow(r) { while (rows.length <= r) { const odd = !rows[rows.length - 1].odd; rows.push({ odd, c: new Array(rowLen(odd)).fill(null) }); } }
    function snap(x, y) {
      let best = null, bd = 1e9;
      const maxR = Math.min(rows.length + 1, Math.ceil((y - Y0) / RH) + 2);
      for (let r = 0; r < maxR; r++) {
        const odd = rows[r] ? rows[r].odd : rows[r - 1] ? !rows[r - 1].odd : false;
        for (let c = 0; c < rowLen(odd); c++) {
          if (rows[r] && rows[r].c[c]) continue;
          const cx = X0 + R + c * 2 * R + (odd ? R : 0), cy = cellY(r), d = Math.hypot(cx - x, cy - y);
          if (d < bd) { bd = d; best = [r, c]; }
        }
      }
      return best;
    }
    function land(x, y, k) {
      const [r, c] = snap(x, y); ensureRow(r);
      rows[r].c[c] = { k, wob: 1 };
      for (const [nr, nc] of neighbors(r, c)) { const b = get(nr, nc); if (b) b.wob = 0.6; }
      E.sfx('thud', 1.6, 0.4);
      // match
      const group = [[r, c]], seen = new Set([r + ',' + c]);
      for (let i = 0; i < group.length; i++) for (const [nr, nc] of neighbors(...group[i])) { const b = get(nr, nc); if (b && b.k === k && !seen.has(nr + ',' + nc)) { seen.add(nr + ',' + nc); group.push([nr, nc]); } }
      if (group.length >= 3) {
        group.forEach(([gr, gc], i) => { popping.push({ x: cellX(gr, gc), y: cellY(gr), k: rows[gr].c[gc].k, t: -i * 0.03 }); rows[gr].c[gc] = null; });
        E.score += group.length * 10;
        E.sfx('pop', 1.1); E.pop(cellX(r, c), cellY(r), `+${group.length * 10}`, { color: COL[k], size: 18 });
        // drop floaters
        const anchored = new Set(), q = [];
        rows[0].c.forEach((b, cc) => { if (b) { anchored.add('0,' + cc); q.push([0, cc]); } });
        for (let i = 0; i < q.length; i++) for (const [nr, nc] of neighbors(...q[i])) if (get(nr, nc) && !anchored.has(nr + ',' + nc)) { anchored.add(nr + ',' + nc); q.push([nr, nc]); }
        let dropped = 0;
        rows.forEach((row, rr) => row.c.forEach((b, cc) => { if (b && !anchored.has(rr + ',' + cc)) { falling.push({ x: cellX(rr, cc), y: cellY(rr), vx: U.rand(-60, 60), vy: U.rand(-150, 0), k: b.k }); row.c[cc] = null; dropped++; } }));
        if (dropped) { const pts = dropped * 20 * (1 + Math.floor(dropped / 5)); E.score += pts; E.sfx('coin', 0.9 + Math.min(dropped, 20) * 0.02); E.pop(W / 2, 460, `DROP ×${dropped}  +${pts}`, { color: '#fde047', size: 24 }); }
        while (rows.length > 1 && rows[rows.length - 1].c.every((b) => !b)) rows.pop();
        if (!present().length) { st = 'clear'; E.sfx('win'); const bonus = 1000 * level; E.score += bonus; E.banner('BOARD CLEAR!', `+${bonus}`, { color: '#4ade80', life: 1.8 }); E.after(2, load); return; }
      } else {
        misses++;
        if (misses >= missMax) { misses = 0; pushRow(); }
      }
      checkDead();
    }
    function pushRow() {
      const odd = !rows[0].odd;
      rows.unshift({ odd, c: U.range(rowLen(odd)).map(() => ({ k: U.pick(present().length ? present() : [0]), wob: 0.5 })) });
      shake = 0.4; E.sfx('thud', 0.6); E.shake(6);
    }
    function checkDead() {
      for (let r = 0; r < rows.length; r++) if (rows[r].c.some((b) => b) && cellY(r) + R > DEAD) {
        st = 'dead'; E.sfx('lose'); E.shake(10);
        rows.forEach((row, rr) => row.c.forEach((b, cc) => { if (b) falling.push({ x: cellX(rr, cc), y: cellY(rr), vx: U.rand(-80, 80), vy: U.rand(-200, 0), k: b.k }); }));
        rows.forEach((row) => row.c.fill(null));
        E.after(1.4, () => E.over({ msg: `Level ${level}` }));
        return;
      }
    }
    // trajectory prediction
    function trace(a) {
      let x = SX, y = SY, vx = Math.cos(a), vy = Math.sin(a); const pts = [[x, y]];
      for (let i = 0; i < 900; i++) {
        x += vx * 4; y += vy * 4;
        if (x < X0 + R) { x = X0 + R; vx = -vx; pts.push([x, y]); }
        if (x > W - X0 - R) { x = W - X0 - R; vx = -vx; pts.push([x, y]); }
        if (y < Y0 + R) { pts.push([x, y]); return pts; }
        for (let r = 0; r < rows.length; r++) { if (Math.abs(cellY(r) - y) > 2 * R) continue; for (let c = 0; c < rows[r].c.length; c++) if (rows[r].c[c] && Math.hypot(cellX(r, c) - x, cellY(r) - y) < R * 1.7) { pts.push([x, y]); return pts; } }
      }
      pts.push([x, y]); return pts;
    }
    function fire() {
      if (shot || st !== 'play') return;
      shot = { x: SX, y: SY, vx: Math.cos(aim) * 1300, vy: Math.sin(aim) * 1300, k: cur };
      cur = next; next = pickColor(); E.sfx('shoot', 0.7, 0.6);
    }
    return {
      update(dt) {
        T += dt; shake = Math.max(0, shake - dt);
        for (const row of rows) for (const b of row.c) if (b) b.wob = Math.max(0, b.wob - dt * 3);
        for (const p of popping) p.t += dt; popping = popping.filter((p) => p.t < 0.3);
        for (const p of popping) if (p.t > 0 && !p.burst) { p.burst = true; E.burst(p.x, p.y, { n: 8, color: COL[p.k], speed: 180 }); }
        for (const f of falling) { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
        falling = falling.filter((f) => f.y < H + 40);
        if (st !== 'play') return;
        // aim
        const p = E.ptr;
        if (p.moved || p.down) { const a = Math.atan2(Math.min(p.y, SY - 20) - SY, p.x - SX); aim = U.clamp(a, -Math.PI + 0.12, -0.12); }
        if (E.down('L')) aim = Math.max(-Math.PI + 0.12, aim - dt * 1.6); if (E.down('R')) aim = Math.min(-0.12, aim + dt * 1.6);
        if (p.hit) dragging = p.type === 'touch' || p.y < SY - 30;
        if (p.hit && U.dist(p.x, p.y, SX + 70, SY + 20) < 34) { [cur, next] = [next, cur]; E.sfx('select'); dragging = false; }
        if (p.up && dragging) { fire(); dragging = false; }
        if (p.rhit || E.hit('B')) { [cur, next] = [next, cur]; E.sfx('select'); }
        if (E.hit('A')) fire();
        if (shot) {
          const sub = 8;
          for (let i = 0; i < sub && shot; i++) {
            shot.x += (shot.vx * dt) / sub; shot.y += (shot.vy * dt) / sub;
            if (shot.x < X0 + R) { shot.x = X0 + R; shot.vx = Math.abs(shot.vx); E.sfx('tick', 1.5, 0.4); }
            if (shot.x > W - X0 - R) { shot.x = W - X0 - R; shot.vx = -Math.abs(shot.vx); E.sfx('tick', 1.5, 0.4); }
            let hit = shot.y < Y0 + R;
            if (!hit) for (let r = 0; r < rows.length && !hit; r++) { if (Math.abs(cellY(r) - shot.y) > 2 * R) continue; for (let c = 0; c < rows[r].c.length; c++) if (rows[r].c[c] && Math.hypot(cellX(r, c) - shot.x, cellY(r) - shot.y) < R * 1.7) { hit = true; break; } }
            if (hit) { const s = shot; shot = null; land(s.x, s.y, s.k); }
          }
        }
      },
      draw(g) {
        const t = T;
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0c1445'); bg.addColorStop(1, '#3b0764'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 12; i++) D.glow(g, (i * 137) % W, (i * 263 + t * 10 * (i % 3 + 1)) % H, 50 + (i % 4) * 20, i % 2 ? '#38bdf8' : '#f472b6', 0.08);
        // ceiling
        const sy = Math.sin(shake * 40) * 4 * shake;
        g.fillStyle = '#1e1b4b'; g.fillRect(0, 0, W, Y0 - 4 + sy);
        g.fillStyle = '#6366f1'; g.fillRect(0, Y0 - 8 + sy, W, 4);
        for (let i = 0; i < missMax; i++) D.circle(g, 30 + i * 22, 34, 7, i < misses ? '#f87171' : 'rgba(255,255,255,.2)');
        D.text(g, 'misses until drop', 30 + missMax * 22 + 8, 35, { size: 12, font: 'mono', align: 'left', color: 'rgba(255,255,255,.4)' });
        D.text(g, E.score, W - 24, 36, { size: 26, align: 'right', color: '#fff' });
        // deadline
        g.setLineDash([10, 8]); D.line(g, 0, DEAD, W, DEAD, 'rgba(248,113,113,.45)', 2); g.setLineDash([]);
        // bubbles
        rows.forEach((row, r) => row.c.forEach((b, c) => { if (b) bubble(g, cellX(r, c), cellY(r) + sy + Math.sin(b.wob * 20) * b.wob * 3, b.k, 1); }));
        for (const p of popping) { const k = Math.max(0, p.t) / 0.3; if (p.t < 0) bubble(g, p.x, p.y, p.k, 1); else { g.globalAlpha = 1 - k; bubble(g, p.x, p.y, p.k, 1 + k * 0.6); g.globalAlpha = 1; } }
        for (const f of falling) bubble(g, f.x, f.y, f.k, 1);
        // aim guide
        if (st === 'play') {
          const pts = trace(aim);
          g.save(); g.setLineDash([2, 12]); g.lineCap = 'round'; g.strokeStyle = U.rgba(COL[cur], 0.8); g.lineWidth = 5; g.lineDashOffset = -t * 40;
          g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
          const [ex, ey] = pts[pts.length - 1]; D.circle(g, ex, ey, R, null, U.rgba(COL[cur], 0.5), 2);
        }
        if (shot) { D.glow(g, shot.x, shot.y, R * 2.2, COL[shot.k], 0.5); bubble(g, shot.x, shot.y, shot.k, 1); }
        // launcher
        g.fillStyle = '#1e1b4b'; g.fillRect(0, SY + 34, W, H - SY - 34);
        g.save(); g.translate(SX, SY); g.rotate(aim + Math.PI / 2);
        D.fillRR(g, -16, -70, 32, 70, 8, '#64748b'); D.fillRR(g, -16, -70, 32, 14, 6, '#94a3b8');
        g.restore();
        D.circle(g, SX, SY + 8, 44, '#312e81', '#6366f1', 3);
        if (!shot && st === 'play') bubble(g, SX, SY, cur, 1);
        D.circle(g, SX + 70, SY + 20, 30, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.2)', 2);
        bubble(g, SX + 70, SY + 20, next, 0.7);
        D.text(g, 'next', SX + 70, SY + 62, { size: 11, font: 'mono', color: 'rgba(255,255,255,.4)' });
      },
    };
    function bubble(g, x, y, k, s) {
      const r = R * s - 1;
      D.orb(g, x, y, r, COL[k], 0.55);
      D.circle(g, x - r * 0.35, y - r * 0.4, r * 0.22, 'rgba(255,255,255,.7)');
      // tiny symbol for colour-blind play
      g.fillStyle = 'rgba(255,255,255,.35)';
      const q = r * 0.3;
      if (k === 0) D.circle(g, x + q * 0.5, y + q * 0.5, q * 0.6, 'rgba(255,255,255,.3)');
      else if (k === 1) g.fillRect(x, y, q, q);
      else if (k === 2) D.poly(g, [[x + q * 0.5, y - q * 0.3], [x + q * 1.2, y + q], [x - q * 0.2, y + q]], 'rgba(255,255,255,.3)');
      else if (k === 3) D.poly(g, [[x + q * 0.5, y - q * 0.3], [x + q * 1.2, y + q * 0.4], [x + q * 0.5, y + q * 1.1], [x - q * 0.2, y + q * 0.4]], 'rgba(255,255,255,.3)');
      else if (k === 4) D.star(g, x + q * 0.5, y + q * 0.5, q * 0.8, q * 0.35, 5, 0, 'rgba(255,255,255,.3)');
      else D.heart(g, x + q * 0.5, y + q * 0.6, q * 1.3, 'rgba(255,255,255,.3)');
    }
  },
});

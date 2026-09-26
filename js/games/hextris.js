MG.add({
  id: 'hextris', name: 'Hex Stack', cat: 'Puzzle', color: '#f43f5e', color2: '#facc15',
  desc: 'Blocks rain in from six directions. Spin the hexagon so they stack into colour groups of three — before any side overflows.',
  how: ['Rotate with <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>, or tap the left / right half of the screen', 'Three or more touching blocks of one colour clear', 'Blocks touch along a side and across neighbouring sides', 'Quick successive clears build a multiplier · overflow the outer ring and it\'s over'],
  pad: 'LR',
  make(E) {
    const W = 960, H = 600, CX = 480, CY = 300, R0 = 64, BH = 24, MAXH = 8, TAN = Math.tan(Math.PI / 6);
    const COL = ['#f43f5e', '#facc15', '#38bdf8', '#4ade80'];
    const stacks = U.range(6).map(() => []); // stacks[side] = [{c, pop, y (visual height)}]
    let rot = 0, rv = 0, falling = [], waveT = 1.2, el = 0, speed = 85, mult = 1, multT = 0, T = 0, over = false, flashSide = -1, wave = 0;
    const sideAng = (i) => -Math.PI / 2 + i * (Math.PI / 3);
    function spawnWave() {
      wave++;
      const pat = U.pick(el < 20 ? ['one', 'one', 'two'] : ['one', 'two', 'opp', 'spiral', 'double']);
      const c = () => U.ri(0, COL.length - 1), L = U.ri(0, 5), far = 420;
      const add = (lane, delay, col) => falling.push({ lane, d: far + delay * speed, c: col ?? c() });
      if (pat === 'one') add(L, 0);
      else if (pat === 'two') { add(L, 0); add((L + U.ri(1, 5)) % 6, 0.4); }
      else if (pat === 'opp') { add(L, 0); add((L + 3) % 6, 0); }
      else if (pat === 'double') { const col = c(); add(L, 0, col); add(L, 0.35, col); }
      else if (pat === 'spiral') for (let i = 0; i < 4; i++) add((L + i) % 6, i * 0.45);
    }
    function heightOf(side) { return stacks[side].length; }
    function land(f) {
      const side = ((f.lane - rot) % 6 + 6) % 6;
      stacks[side].push({ c: f.c, pop: 1, vy: 0, y: stacks[side].length + 0.6 });
      E.sfx('place', 0.9 + stacks[side].length * 0.04, 0.4);
      resolve(side, stacks[side].length - 1);
      if (stacks.some((s) => s.length > MAXH)) {
        over = true; flashSide = stacks.findIndex((s) => s.length > MAXH);
        E.sfx('lose'); E.shake(12); E.flash('#f43f5e', 0.4);
        E.after(1.4, () => E.over({ msg: `Survived ${Math.round(el)}s · ${wave} waves` }));
      }
    }
    function resolve(s0, h0) {
      const key = (s, h) => s * 100 + h, c = stacks[s0][h0].c, seen = new Set([key(s0, h0)]), grp = [[s0, h0]];
      for (let i = 0; i < grp.length; i++) {
        const [s, h] = grp[i];
        for (const [ns, nh] of [[s, h - 1], [s, h + 1], [(s + 1) % 6, h], [(s + 5) % 6, h]]) {
          const b = stacks[ns][nh];
          if (b && b.c === c && !seen.has(key(ns, nh))) { seen.add(key(ns, nh)); grp.push([ns, nh]); }
        }
      }
      if (grp.length < 3) return;
      const pts = grp.length * 10 * mult;
      E.score += pts;
      for (const [s, h] of grp) { const [x, y] = blockCenter(s, h); E.burst(x, y, { n: 8, color: COL[c], speed: 220 }); stacks[s][h].dead = true; }
      const [px, py] = blockCenter(s0, h0);
      E.pop(px, py - 20, mult > 1 ? `×${mult}  +${pts}` : `+${pts}`, { color: COL[c], size: 18 + mult * 2 });
      E.sfx('match', 0.9 + mult * 0.08); E.shake(3);
      if (multT > 0) mult = Math.min(8, mult + 1); multT = 3;
      // compact stacks (blocks above fall) and re-check
      const moved = [];
      for (let s = 0; s < 6; s++) {
        const keep = stacks[s].filter((b) => !b.dead);
        if (keep.length !== stacks[s].length) { stacks[s] = keep; keep.forEach((b, h) => moved.push([s, h])); }
      }
      for (const [s, h] of moved) if (stacks[s][h]) resolve(s, h);
    }
    function blockCenter(side, h) {
      const a = sideAng(side) + rv * (Math.PI / 3), d = R0 + (h + 0.5) * BH;
      return [CX + Math.cos(a) * d, CY + Math.sin(a) * d];
    }
    function trap(g, a, d1, d2, col, alpha = 1, wd = Infinity) {
      const c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
      const w1 = Math.min(d1, wd) * TAN - 1.5, w2 = Math.min(d2, wd + BH) * TAN - 1.5;
      g.globalAlpha = alpha;
      g.beginPath();
      g.moveTo(CX + c * d1 + px * w1, CY + s * d1 + py * w1);
      g.lineTo(CX + c * d2 + px * w2, CY + s * d2 + py * w2);
      g.lineTo(CX + c * d2 - px * w2, CY + s * d2 - py * w2);
      g.lineTo(CX + c * d1 - px * w1, CY + s * d1 - py * w1);
      g.closePath(); g.fillStyle = col; g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
      g.globalAlpha = 1;
    }
    return {
      update(dt) {
        T += dt;
        rv = U.damp(rv, rot, 18, dt);
        for (const s of stacks) s.forEach((b, h) => { b.pop = Math.max(0, b.pop - dt * 4); if (b.y > h) b.y = Math.max(h, b.y - dt * 10); });
        if (over) return;
        el += dt; speed = Math.min(260, 85 + el * 1.6);
        multT -= dt; if (multT <= 0) mult = 1;
        E.stat('Multiplier', `×${mult}`);
        waveT -= dt; if (waveT <= 0) { spawnWave(); waveT = Math.max(0.55, 1.9 - el * 0.012); }
        // rotation input
        let r = 0;
        if (E.hit('L')) r = -1; if (E.hit('R')) r = 1;
        if (E.swipe === 'L') r = -1; if (E.swipe === 'R') r = 1;
        if (E.ptr.hit && !r) r = E.ptr.x < W / 2 ? -1 : 1;
        if (r) { rot += r; E.sfx('tick', 1.3, 0.4); }
        // falling
        for (const f of falling) {
          f.d -= speed * dt * (E.down('D') ? 3 : 1);
          const side = ((f.lane - rot) % 6 + 6) % 6, top = R0 + heightOf(side) * BH;
          if (f.d <= top) { f.done = true; land(f); if (over) break; }
        }
        falling = falling.filter((f) => !f.done);
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#1f1135', '#05030a');
        // spinning backdrop rays
        g.save(); g.translate(CX, CY); g.rotate(rv * (Math.PI / 3) * 0.3 + t * 0.03);
        for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.02)' : 'rgba(244,63,94,.03)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 700, (i / 6) * U.TAU, ((i + 1) / 6) * U.TAU); g.fill(); }
        g.restore();
        // limit ring
        const lim = R0 + MAXH * BH;
        g.beginPath(); for (let i = 0; i < 6; i++) { const a = sideAng(i) + rv * (Math.PI / 3) + Math.PI / 6, d = lim / Math.cos(Math.PI / 6); const x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
        const maxH = Math.max(...stacks.map((s) => s.length));
        g.strokeStyle = maxH >= MAXH - 1 ? `rgba(244,63,94,${0.5 + 0.4 * Math.sin(t * 12)})` : 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.stroke();
        // falling blocks (world space: lane angle not rotated)
        for (const f of falling) { const a = sideAng(f.lane); trap(g, a, f.d, f.d + BH, COL[f.c], 1, R0 + stacks[((f.lane - rot) % 6 + 6) % 6].length * BH); D.glow(g, CX + Math.cos(a) * (f.d + BH / 2), CY + Math.sin(a) * (f.d + BH / 2), 40, COL[f.c], 0.25); }
        // stacks (rotate with hexagon)
        for (let s = 0; s < 6; s++) {
          const a = sideAng(s) + rv * (Math.PI / 3);
          stacks[s].forEach((b) => { const d = R0 + b.y * BH; trap(g, a, d, d + BH, b.pop ? U.mix(COL[b.c], '#ffffff', b.pop * 0.5) : COL[b.c]); });
          if (over && s === flashSide && Math.sin(t * 20) > 0) trap(g, a, R0, R0 + stacks[s].length * BH, '#ffffff', 0.4);
        }
        // core hexagon
        g.beginPath(); for (let i = 0; i < 6; i++) { const a = sideAng(i) + rv * (Math.PI / 3) + Math.PI / 6, d = R0 / Math.cos(Math.PI / 6); const x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
        g.fillStyle = '#1e1b2e'; g.fill(); g.strokeStyle = '#f43f5e'; g.lineWidth = 3; g.stroke();
        D.text(g, E.score, CX, CY + 1, { size: String(E.score).length > 4 ? 18 : 24, color: '#fff' });
        if (mult > 1) { D.text(g, `×${mult}`, W - 40, 50, { size: 34, align: 'right', color: '#facc15', glow: '#f59e0b' }); D.fillRR(g, W - 140, 70, 100 * (multT / 3), 5, 2, '#facc15'); }
        D.text(g, '◀ tap', 60, H - 30, { size: 14, font: 'mono', color: 'rgba(255,255,255,.25)' });
        D.text(g, 'tap ▶', W - 60, H - 30, { size: 14, font: 'mono', color: 'rgba(255,255,255,.25)' });
      },
    };
  },
});

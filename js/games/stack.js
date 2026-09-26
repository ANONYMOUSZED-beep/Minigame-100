MG.add({
  id: 'stack', name: 'Stack Tower', cat: 'Physics', color: '#f472b6', color2: '#38bdf8',
  desc: 'Drop sliding slabs onto an isometric tower. Overhangs get sliced off — perfect drops ripple and regrow.',
  how: ['Tap, click or <kbd>Space</kbd> to drop the moving slab', 'Anything hanging over the edge is sliced away', 'Perfect drops keep the full size — chain them to grow the slab back', 'Miss completely and the tower is done'],
  w: 600, h: 860, pad: 'A', padLabels: { A: 'DROP' },
  make(E) {
    const W = 600, H = 860, CX = W / 2, BH = 26, SC = 1.25, C30 = Math.cos(Math.PI / 6), S30 = 0.5;
    let blocks = [{ x: 0, z: 0, w: 150, d: 150, y: 0, hue: 200 }], cur, axis = 'x', speed = 180, dir = 1, camY = 0, combo = 0, debris = [], ripples = [], hueBase = U.rand(360), dead = false, deadT = 0;
    const iso = (x, y, z) => [CX + (x - z) * C30 * SC, 560 + (x + z) * S30 * SC - (y - camY) * SC];
    function spawn() {
      const top = blocks[blocks.length - 1];
      axis = blocks.length % 2 ? 'x' : 'z';
      cur = { x: top.x, z: top.z, w: top.w, d: top.d, y: top.y + BH, hue: (hueBase + blocks.length * 7) % 360 };
      cur[axis] = -200; dir = 1;
      speed = Math.min(420, 170 + blocks.length * 6);
    }
    spawn();
    function drop() {
      if (dead) return;
      const top = blocks[blocks.length - 1], key = axis, size = axis === 'x' ? 'w' : 'd';
      const delta = cur[key] - top[key], over = top[size] - Math.abs(delta);
      if (over <= 0) { dead = true; debris.push({ ...cur, vy: 0, fall: 0 }); E.sfx('lose'); E.shake(10); E.after(1.2, () => E.over({ msg: `${blocks.length - 1} slabs high` })); return; }
      if (Math.abs(delta) < 4) {
        cur[key] = top[key]; combo++;
        if (combo >= 3 && combo % 2 === 1) { cur.w = Math.min(150, cur.w + 10); cur.d = Math.min(150, cur.d + 10); }
        ripples.push({ ...cur, t: 0, k: combo });
        E.score += 2 + Math.min(combo, 10);
        E.sfx('match', 1 + Math.min(combo, 12) * 0.06); E.pop(W / 2, 200, combo > 1 ? `PERFECT ×${combo}` : 'PERFECT', { color: '#fff', size: 26 });
      } else {
        combo = 0;
        const cutSize = Math.abs(delta), sign = Math.sign(delta);
        const piece = { ...cur, vy: 0, fall: 0 };
        piece[size] = cutSize; piece[key] = cur[key] + sign * (over / 2);
        cur[size] = over; cur[key] = top[key] + delta / 2;
        piece[key] = cur[key] + sign * (over / 2 + cutSize / 2);
        debris.push(piece);
        E.score += 1; E.sfx('slice', 0.9 + Math.random() * 0.2, 0.8); E.shake(2);
      }
      blocks.push({ ...cur });
      E.stat('Height', blocks.length - 1);
      spawn();
    }
    function drawBox(g, b, alpha = 1, glow = 0) {
      const { x, y, z, w, d } = b, hw = w / 2, hd = d / 2;
      const p = (px, py, pz) => iso(px, py, pz);
      const top = [p(x - hw, y + BH, z - hd), p(x + hw, y + BH, z - hd), p(x + hw, y + BH, z + hd), p(x - hw, y + BH, z + hd)];
      const left = [p(x - hw, y + BH, z + hd), p(x + hw, y + BH, z + hd), p(x + hw, y, z + hd), p(x - hw, y, z + hd)];
      const right = [p(x + hw, y + BH, z - hd), p(x + hw, y + BH, z + hd), p(x + hw, y, z + hd), p(x + hw, y, z - hd)];
      g.globalAlpha = alpha;
      D.poly(g, left, U.hsl(b.hue, 60, 42)); D.poly(g, right, U.hsl(b.hue, 60, 32)); D.poly(g, top, U.hsl(b.hue, 70, 62 + glow * 20));
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.beginPath(); top.forEach(([a, c], i) => (i ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); g.stroke();
      g.globalAlpha = 1;
    }
    return {
      update(dt) {
        camY = U.damp(camY, Math.max(0, (blocks.length - 6) * BH), 4, dt);
        for (const p of debris) { p.vy += 900 * dt; p.y -= p.vy * dt; p.fall += dt; }
        debris = debris.filter((p) => p.fall < 2.5);
        for (const r of ripples) r.t += dt; ripples = ripples.filter((r) => r.t < 0.8);
        if (dead) { deadT += dt; return; }
        cur[axis] += dir * speed * dt;
        if (cur[axis] > 230) { cur[axis] = 230; dir = -1; } if (cur[axis] < -230) { cur[axis] = -230; dir = 1; }
        if (E.hit('A', 'U') || E.ptr.hit) drop();
      },
      draw(g) {
        const hue = (hueBase + blocks.length * 7) % 360;
        D.bg(g, W, H, U.hsl(hue, 45, 22), U.hsl((hue + 40) % 360, 50, 10));
        D.glow(g, W / 2, 200, 400, U.hsl(hue, 80, 60), 0.15);
        const start = Math.max(0, blocks.length - 24);
        for (let i = start; i < blocks.length; i++) drawBox(g, blocks[i], 1, i === blocks.length - 1 && combo ? 0.4 : 0);
        for (const r of ripples) { const k = r.t / 0.8, grow = 1 + k * 0.35; g.globalAlpha = (1 - k) * 0.8; const [a1, b1] = iso(r.x - (r.w / 2) * grow, r.y + BH, r.z - (r.d / 2) * grow), [a2, b2] = iso(r.x + (r.w / 2) * grow, r.y + BH, r.z - (r.d / 2) * grow), [a3, b3] = iso(r.x + (r.w / 2) * grow, r.y + BH, r.z + (r.d / 2) * grow), [a4, b4] = iso(r.x - (r.w / 2) * grow, r.y + BH, r.z + (r.d / 2) * grow); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.lineTo(a3, b3); g.lineTo(a4, b4); g.closePath(); g.stroke(); g.globalAlpha = 1; }
        if (!dead) drawBox(g, cur);
        for (const p of debris) drawBox(g, p, Math.max(0, 1 - p.fall / 2.5));
        D.text(g, blocks.length - 1, W / 2, 110, { size: 90, color: 'rgba(255,255,255,.92)', weight: 700 });
        if (blocks.length === 1 && !dead) D.text(g, 'TAP TO DROP', W / 2, H - 70, { size: 20, color: 'rgba(255,255,255,.7)', alpha: 0.6 + 0.4 * Math.sin(E.t * 4) });
      },
    };
  },
});

MG.add({
  id: 'fireworks', name: 'Fireworks', cat: 'Physics', color: '#f472b6', color2: '#fde047',
  desc: 'Run the town\'s fireworks show. Detonate each rocket right at its peak for a PERFECT burst.',
  how: ['Click / tap a rocket to detonate it (one tap can catch several)', '<kbd>Space</kbd> detonates the rocket closest to its peak', 'The nearer the apex, the bigger the points — chain several for combos', 'Five duds and the show is over'],
  pad: 'A', padLabels: { A: 'BOOM' },
  make(E) {
    const W = 960, H = 600, WATER = 520;
    const TYPES = ['peony', 'ring', 'willow', 'crossette', 'heart', 'palm'];
    let rockets = [], sparks = [], duds = 0, t0 = 0, spawnT = 1, flash = 0, combo = 0, comboT = 0, T = 0;
    const city = U.range(40).map((i) => ({ x: i * 26, w: 22 + Math.random() * 10, h: 30 + Math.random() * 90 }));
    E.stat('Duds', '○○○○○');
    function launch() {
      const x = U.rand(120, W - 120), apexY = U.rand(90, 260), vy = -Math.sqrt(2 * 380 * (WATER - apexY));
      rockets.push({ x, y: WATER, vx: U.rand(-30, 30), vy, hue: U.rand(360), type: U.pick(TYPES), t: 0, trail: [] });
      E.sfx('whoosh', 1.4 + Math.random() * 0.3, 0.35);
    }
    function burst(r, quality) {
      const hue = r.hue, n = 70 + quality * 50, sp = 170 + quality * 120;
      const col = (k) => U.hsl((hue + k * 25) % 360, 95, 65);
      const add = (a, s, o = {}) => sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s + r.vx, vy: Math.sin(a) * s + r.vy * 0.2, life: o.life || U.rand(1.1, 1.8), max: o.life || 1.6, col: o.col || col(Math.random() < 0.5 ? 0 : 2), g: o.g ?? 120, drag: o.drag ?? 1.6, split: o.split, tw: Math.random() < 0.3 });
      if (r.type === 'peony' || r.type === 'palm') for (let i = 0; i < n; i++) add(U.rand(U.TAU), sp * Math.sqrt(Math.random()) * (r.type === 'palm' ? 1.2 : 1), { g: r.type === 'palm' ? 260 : 110 });
      else if (r.type === 'ring') { const tilt = U.rand(0.3, 1); for (let i = 0; i < n; i++) { const a = (i / n) * U.TAU; sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * tilt, life: 1.5, max: 1.5, col: col(1), g: 60, drag: 1.4 }); } }
      else if (r.type === 'willow') for (let i = 0; i < n; i++) add(U.rand(U.TAU), sp * 0.7 * Math.sqrt(Math.random()), { g: 90, drag: 2.2, life: U.rand(2.2, 3), col: U.hsl(45, 95, 70) });
      else if (r.type === 'crossette') for (let i = 0; i < 12; i++) add((i / 12) * U.TAU, sp * 0.8, { split: true, life: 0.7, col: col(0) });
      else if (r.type === 'heart') for (let i = 0; i < n; i++) { const tt = (i / n) * U.TAU, hx = 16 * Math.pow(Math.sin(tt), 3), hy = -(13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt)); sparks.push({ x: r.x, y: r.y, vx: hx * sp * 0.06, vy: hy * sp * 0.06, life: 1.6, max: 1.6, col: '#fb7185', g: 40, drag: 1.2 }); }
      flash = Math.max(flash, 0.25 + quality * 0.3);
      E.sfx('boom', 0.8 + Math.random() * 0.4, 0.4 + quality * 0.5); E.shake(2 + quality * 5);
    }
    function detonate(r) {
      const toApex = Math.abs(r.vy) / 380; // seconds from apex
      const q = U.clamp(1 - toApex / 0.9, 0, 1);
      const pts = Math.round(20 + q * q * 180);
      combo++; comboT = 0.6;
      E.score += pts * combo;
      E.pop(r.x, r.y - 40, q > 0.9 ? `PERFECT +${pts * combo}` : q > 0.6 ? `GREAT +${pts * combo}` : `+${pts * combo}`, { color: q > 0.9 ? '#fde047' : '#fff', size: q > 0.9 ? 26 : 18 });
      burst(r, q);
      rockets = rockets.filter((o) => o !== r);
    }
    return {
      update(dt) {
        T += dt; t0 += dt; flash = Math.max(0, flash - dt * 1.5);
        if (comboT > 0) { comboT -= dt; if (comboT <= 0) { if (combo >= 3) E.pop(W / 2, 80, `${combo}× SALVO!`, { color: '#f472b6', size: 30 }); combo = 0; } }
        spawnT -= dt;
        if (spawnT <= 0) { const n = t0 > 25 && Math.random() < 0.4 ? U.ri(2, 4) : 1; for (let i = 0; i < n; i++) launch(); spawnT = Math.max(0.45, 1.6 - t0 * 0.015) * U.rand(0.7, 1.3); }
        for (const r of rockets) {
          r.t += dt; r.vy += 380 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
          r.trail.push([r.x, r.y]); if (r.trail.length > 16) r.trail.shift();
          if (Math.random() < 0.6) sparks.push({ x: r.x, y: r.y + 6, vx: U.rand(-20, 20), vy: U.rand(20, 60), life: 0.4, max: 0.4, col: '#fde68a', g: 40, drag: 2 });
          if (r.vy > 160) { r.dud = true; }
        }
        for (const r of rockets.filter((o) => o.dud)) { duds++; E.stat('Duds', '●'.repeat(duds) + '○'.repeat(Math.max(0, 5 - duds))); E.sfx('error', 1.2, 0.5); E.pop(r.x, r.y, 'fizzle', { color: '#94a3b8', size: 16 }); for (let i = 0; i < 10; i++) sparks.push({ x: r.x, y: r.y, vx: U.rand(-40, 40), vy: U.rand(-20, 40), life: 0.6, max: 0.6, col: '#78716c', g: 200, drag: 1 }); if (duds >= 5) E.over({ msg: `Show ran ${Math.round(t0)}s` }); }
        rockets = rockets.filter((o) => !o.dud);
        // input
        if (E.ptr.hit) { const hits = rockets.filter((r) => U.dist(r.x, r.y, E.ptr.x, E.ptr.y) < 60); hits.forEach(detonate); if (!hits.length) E.sfx('tick', 0.8, 0.4); }
        if (E.hit('A') && rockets.length) { const r = rockets.reduce((b, o) => (Math.abs(o.vy) < Math.abs(b.vy) ? o : b)); detonate(r); }
        for (const s of sparks) {
          s.life -= dt; s.vy += s.g * dt; const d = Math.exp(-s.drag * dt); s.vx *= d; s.vy *= d; s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.split && s.life <= 0.05) { s.split = false; for (let k = 0; k < 4; k++) { const a = (k / 4) * U.TAU + 0.4; sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 1, max: 1, col: s.col, g: 90, drag: 1.5 }); } E.sfx('pop', 1.8, 0.2); }
        }
        sparks = sparks.filter((s) => s.life > 0);
        if (sparks.length > 3500) sparks.splice(0, sparks.length - 3500);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#020617', '#1e1b4b');
        if (flash > 0) { g.fillStyle = `rgba(253,224,71,${flash * 0.12})`; g.fillRect(0, 0, W, H); }
        g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { g.globalAlpha = 0.3 + 0.3 * Math.sin(t + i); g.fillRect((i * 137) % W, (i * 59) % 380, 1.5, 1.5); } g.globalAlpha = 1;
        // sparks (additive)
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const s of sparks) { const k = s.life / s.max; if (s.tw && Math.sin(T * 40 + s.x) > 0.3) continue; g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = s.col; g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); if (k > 0.5) D.glow(g, s.x, s.y, 8, s.col, 0.25); }
        g.restore(); g.globalAlpha = 1;
        for (const r of rockets) {
          g.lineCap = 'round'; for (let i = 1; i < r.trail.length; i++) { g.strokeStyle = `rgba(253,230,138,${(i / r.trail.length) * 0.6})`; g.lineWidth = (i / r.trail.length) * 3; g.beginPath(); g.moveTo(r.trail[i - 1][0], r.trail[i - 1][1]); g.lineTo(r.trail[i][0], r.trail[i][1]); g.stroke(); }
          const nearApex = Math.abs(r.vy) < 100;
          D.glow(g, r.x, r.y, nearApex ? 34 : 18, nearApex ? '#fde047' : U.hsl(r.hue, 90, 65), 0.9);
          D.circle(g, r.x, r.y, 3.5, '#fff');
          if (nearApex) { D.circle(g, r.x, r.y, 20 + Math.sin(T * 20) * 3, null, 'rgba(253,224,71,.6)', 2); }
        }
        // skyline
        g.fillStyle = '#0b0a1f'; for (const b of city) g.fillRect(b.x, WATER - b.h, b.w, b.h);
        g.fillStyle = 'rgba(253,224,71,.35)'; for (const b of city) for (let y = WATER - b.h + 6; y < WATER - 4; y += 10) for (let x = b.x + 4; x < b.x + b.w - 4; x += 8) if (((x * 7 + y * 3) | 0) % 5 === 0) g.fillRect(x, y, 3, 4);
        // water reflection
        g.fillStyle = '#050818'; g.fillRect(0, WATER, W, H - WATER);
        g.save(); g.globalAlpha = 0.25; g.globalCompositeOperation = 'lighter';
        for (const s of sparks) { if (s.y > WATER || s.y < 150) continue; g.fillStyle = s.col; g.fillRect(s.x + Math.sin(T * 4 + s.y) * 3, WATER + (WATER - s.y) * 0.35, 2, 2); }
        g.restore();
        for (let y = WATER + 6; y < H; y += 8) { g.fillStyle = 'rgba(148,163,184,.08)'; g.fillRect(0, y, W, 1); }
        for (let i = 0; i < 5; i++) D.circle(g, W - 30 - i * 22, 26, 7, i < duds ? '#ef4444' : 'rgba(255,255,255,.2)');
        if (combo > 1) D.text(g, `×${combo}`, 24, 34, { size: 26, align: 'left', color: '#f472b6' });
      },
    };
  },
});

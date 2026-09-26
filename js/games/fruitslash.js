MG.add({
  id: 'fruitslash', name: 'Fruit Slash', cat: 'Physics', color: '#fb7185', color2: '#facc15',
  desc: 'Slice flying fruit with swipes, chain multi-cuts for combos — and never, ever slice the bomb.',
  how: ['Swipe with the mouse or finger to slice', 'Slice three or more fruit in one swipe for a combo bonus', 'Dropping a fruit costs a life (3 lives)', 'Slicing a bomb ends the game instantly · starfruit freezes time'],
  make(E) {
    const W = 960, H = 600, G = 520;
    const FRUITS = [
      { name: 'apple', col: '#ef4444', in: '#fef3c7', r: 30 }, { name: 'orange', col: '#f97316', in: '#fdba74', r: 32 }, { name: 'lime', col: '#65a30d', in: '#d9f99d', r: 26 },
      { name: 'melon', col: '#15803d', in: '#f87171', r: 44 }, { name: 'plum', col: '#7e22ce', in: '#fde68a', r: 26 }, { name: 'banana', col: '#facc15', in: '#fef9c3', r: 30 }, { name: 'peach', col: '#fb923c', in: '#fed7aa', r: 30 },
    ];
    let items = [], halves = [], splats = [], blade = [], lives = 3, waveT = 1, level = 0, combo = [], comboT = 0, slow = 0, dead = false, T = 0;
    E.stat('Lives', '♥♥♥');
    function launch(n) {
      level++;
      const bombP = Math.min(0.28, 0.05 + level * 0.012);
      for (let i = 0; i < n; i++) E.after(i * U.rand(0.08, 0.35), () => {
        if (dead) return;
        const x = U.rand(160, W - 160), kind = Math.random() < bombP ? 'bomb' : Math.random() < 0.04 ? 'star' : 'fruit';
        const f = kind === 'fruit' ? U.pick(FRUITS) : null;
        items.push({ kind, f, x, y: H + 50, vx: (W / 2 - x) * U.rand(0.25, 0.6) + U.rand(-60, 60), vy: -U.rand(560, 700), rot: U.rand(6), vr: U.rand(-3, 3), r: f ? f.r : 28, sliced: false });
        E.sfx('whoosh', 0.6 + Math.random() * 0.2, 0.3);
      });
    }
    function slice(it, ang) {
      it.sliced = true;
      if (it.kind === 'bomb') {
        dead = true; E.sfx('boom'); E.flash('#fff', 0.9); E.shake(22); E.vibrate(300);
        E.burst(it.x, it.y, { n: 80, colors: ['#fde68a', '#f97316', '#fff', '#111'], speed: 500, life: 1.2 });
        E.after(1.4, () => E.over({ msg: `Boom! Level ${level}` }));
        return;
      }
      if (it.kind === 'star') { slow = 5; E.sfx('power'); E.flash('#a5f3fc', 0.3); E.pop(it.x, it.y - 30, 'TIME SLOW', { color: '#a5f3fc' }); }
      const f = it.f || { col: '#facc15', in: '#fef9c3', r: 28 };
      for (const s of [-1, 1]) halves.push({ f, x: it.x, y: it.y, vx: it.vx + Math.cos(ang + Math.PI / 2) * s * 120, vy: it.vy - 60, rot: ang, vr: s * U.rand(2, 5), side: s, r: it.r });
      splats.push({ x: it.x, y: it.y, col: f.in === '#f87171' ? '#ef4444' : f.col, r: it.r * U.rand(1.2, 1.8), a: 0.5, rot: U.rand(6) });
      E.burst(it.x, it.y, { n: 18, colors: [f.col, f.in], speed: 260, grav: 600, life: 0.7 });
      E.sfx('slice', 0.9 + Math.random() * 0.3); E.sfx('splash', 1.8, 0.3);
      E.score += 10; combo.push(it); comboT = 0.18;
    }
    return {
      update(rdt) {
        T += rdt; slow = Math.max(0, slow - rdt);
        const dt = rdt * (slow > 0 ? 0.45 : 1);
        for (const s of splats) s.a -= rdt * 0.08; splats = splats.filter((s) => s.a > 0);
        // blade
        const p = E.ptr;
        if (p.down) { blade.push({ x: p.x, y: p.y, t: 0 }); if (blade.length > 14) blade.shift(); } else if (blade.length) blade.shift();
        for (const b of blade) b.t += rdt;
        if (!dead && p.down && blade.length > 1) {
          const a = blade[blade.length - 2], b = blade[blade.length - 1], len = U.dist(a.x, a.y, b.x, b.y);
          if (len > 4) { if (Math.random() < 0.15) E.sfx('swish', 1.4 + Math.random() * 0.3, 0.25); for (const it of items) if (!it.sliced && U.segDist(it.x, it.y, a.x, a.y, b.x, b.y).d < it.r) slice(it, Math.atan2(b.y - a.y, b.x - a.x)); }
        }
        if (comboT > 0) { comboT -= rdt; if (comboT <= 0) { if (combo.length >= 3) { const bonus = combo.length * 10; E.score += bonus; const cx = combo.reduce((s, q) => s + q.x, 0) / combo.length, cy = combo.reduce((s, q) => s + q.y, 0) / combo.length; E.pop(cx, cy - 40, `${combo.length} FRUIT COMBO +${bonus}`, { color: '#facc15', size: 24 }); E.sfx('power'); } combo = []; } }
        if (dead) return;
        for (const it of items) { it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; }
        for (const hf of halves) { hf.vy += G * 1.4 * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.rot += hf.vr * dt; }
        halves = halves.filter((h) => h.y < H + 100);
        for (const it of items) if (!it.sliced && it.vy > 0 && it.y > H + 40) { it.sliced = true; if (it.kind === 'fruit') { lives--; E.stat('Lives', lives > 0 ? '♥'.repeat(lives) : '—'); E.sfx('error'); E.shake(4); E.pop(U.clamp(it.x, 60, W - 60), H - 40, '✕', { color: '#ef4444', size: 34 }); if (lives <= 0) { dead = true; E.after(0.8, () => E.over({ msg: `Dropped too many · level ${level}` })); } } }
        items = items.filter((it) => !it.sliced);
        waveT -= dt;
        if (waveT <= 0 && !items.length) { launch(U.ri(1, Math.min(7, 2 + Math.floor(level / 3)))); waveT = U.rand(0.8, 1.6); }
      },
      draw(g) {
        const t = E.t;
        // wooden board
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#78350f'); bg.addColorStop(1, '#451a03'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 60) { g.fillStyle = y % 120 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.03)'; g.fillRect(0, y, W, 60); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, W, 2); }
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const y = (i * 71) % H, x = (i * 173) % W; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y + 6, x + 80, y - 6, x + 120, y); g.stroke(); }
        for (const s of splats) { g.save(); g.globalAlpha = s.a; g.translate(s.x, s.y); g.rotate(s.rot); g.fillStyle = s.col; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * U.TAU, r = s.r * (k % 2 ? 0.55 : 1); k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); }
        if (slow > 0) { g.fillStyle = `rgba(165,243,252,${0.12 + 0.04 * Math.sin(t * 6)})`; g.fillRect(0, 0, W, H); }
        const drawFruit = (f, r) => {
          if (f.name === 'banana') { g.strokeStyle = '#facc15'; g.lineWidth = r * 0.7; g.lineCap = 'round'; g.beginPath(); g.arc(0, -r * 0.6, r * 1.1, 0.5, Math.PI - 0.5); g.stroke(); g.strokeStyle = '#78350f'; g.lineWidth = 4; g.beginPath(); g.arc(0, -r * 0.6, r * 1.1, 0.45, 0.55); g.stroke(); return; }
          D.orb(g, 0, 0, r, f.col, 0.35);
          if (f.name === 'melon') { g.strokeStyle = '#14532d'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(k * r * 0.3, 0, r * 0.12, r * 0.95, 0, 0, U.TAU); g.stroke(); } }
          D.line(g, 0, -r, 3, -r - 10, '#78350f', 3);
          if (f.name !== 'melon' && f.name !== 'lime') { g.fillStyle = '#22c55e'; g.beginPath(); g.ellipse(9, -r - 6, 9, 4, -0.4, 0, U.TAU); g.fill(); }
        };
        for (const hf of halves) {
          g.save(); g.translate(hf.x, hf.y); g.rotate(hf.rot);
          g.beginPath(); g.arc(0, 0, hf.r, hf.side > 0 ? 0 : Math.PI, hf.side > 0 ? Math.PI : U.TAU); g.closePath(); g.fillStyle = hf.f.col; g.fill();
          g.beginPath(); g.ellipse(0, 0, hf.r * 0.9, hf.r * 0.2, 0, 0, U.TAU); g.fillStyle = hf.f.in; g.fill();
          g.restore();
        }
        for (const it of items) {
          g.save(); g.translate(it.x, it.y); g.rotate(it.rot);
          if (it.kind === 'bomb') { D.glow(g, 0, 0, 60, '#ef4444', 0.35 + 0.2 * Math.sin(t * 12)); D.orb(g, 0, 0, it.r, '#1f2937', 0.25); D.line(g, 0, -it.r, 8, -it.r - 14, '#a16207', 4); D.glow(g, 8, -it.r - 16, 16, '#fde68a', 1); D.text(g, '✕', 0, 1, { size: 20, color: '#ef4444' }); }
          else if (it.kind === 'star') { D.glow(g, 0, 0, 60, '#a5f3fc', 0.6); D.star(g, 0, 0, it.r, it.r * 0.45, 5, 0, '#fde047', '#fff'); }
          else drawFruit(it.f, it.r);
          g.restore();
        }
        // blade
        if (blade.length > 1) {
          g.lineCap = 'round'; g.lineJoin = 'round';
          for (let i = 1; i < blade.length; i++) { const k = i / blade.length; g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = k * 10; g.beginPath(); g.moveTo(blade[i - 1].x, blade[i - 1].y); g.lineTo(blade[i].x, blade[i].y); g.stroke(); }
          const b = blade[blade.length - 1]; D.glow(g, b.x, b.y, 30, '#a5f3fc', 0.8);
        }
        for (let i = 0; i < 3; i++) D.text(g, '✕', W - 40 - i * 40, 40, { size: 30, color: i < 3 - lives ? '#ef4444' : 'rgba(255,255,255,.25)' });
        D.text(g, E.score, 30, 44, { size: 44, align: 'left', color: '#fde68a', stroke: 'rgba(0,0,0,.4)', lw: 6 });
        if (!items.length && level === 0) D.text(g, 'SWIPE TO SLICE', W / 2, H / 2, { size: 28, color: 'rgba(255,255,255,.7)' });
      },
    };
  },
});

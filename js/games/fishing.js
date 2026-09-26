MG.add({
  id: 'fishing', name: 'Deep Catch', cat: 'Sports', color: '#0ea5e9', color2: '#facc15',
  desc: 'Cast, sink, strike and fight. Manage line tension to land species from sardines to a golden legend.',
  how: ['Hold click / <kbd>Space</kbd> to charge a cast, release to throw', 'Hold to reel the lure in and up; let go to let it sink deeper', 'When a fish bites ( ! ) press quickly to strike', 'Fight: hold to reel — but keep the tension out of the red or the line snaps'],
  pad: 'A', padLabels: { A: 'REEL' },
  make(E) {
    const W = 960, H = 600, SEA = 160, BED = 575, BOAT = 150, ROD = { x: 176, y: 78 };
    const SPECIES = [
      { name: 'Sardine', col: '#cbd5e1', size: 14, depth: [180, 300], val: 10, str: 0.6, speed: 90 },
      { name: 'Mackerel', col: '#60a5fa', size: 20, depth: [200, 360], val: 25, str: 0.9, speed: 110 },
      { name: 'Snapper', col: '#f87171', size: 26, depth: [280, 450], val: 60, str: 1.2, speed: 80 },
      { name: 'Tuna', col: '#1e40af', size: 38, depth: [260, 470], val: 120, str: 1.9, speed: 140 },
      { name: 'Anglerfish', col: '#7c3aed', size: 30, depth: [460, 560], val: 150, str: 1.5, speed: 50 },
      { name: 'Golden Koi', col: '#facc15', size: 30, depth: [380, 540], val: 500, str: 2.3, speed: 160, rare: true },
    ];
    let fish = [], lure = null, state = 'idle', charge = 0, time = 120, catches = [], hooked = null, tension = 0, strikeT = 0, bubbles = [], T = 0, lineOut = 0, msg = null, reelT = 0;
    function spawnFish() {
      const roll = Math.random(), sp = roll < 0.03 ? SPECIES[5] : roll < 0.3 ? SPECIES[0] : roll < 0.52 ? SPECIES[1] : roll < 0.72 ? SPECIES[2] : roll < 0.87 ? SPECIES[3] : SPECIES[4];
      const dir = U.chance(0.5) ? 1 : -1;
      fish.push({ sp, x: dir > 0 ? -60 : W + 60, y: U.rand(...sp.depth), dir, t: U.rand(6), size: sp.size * U.rand(0.8, 1.3), interest: 0, bite: false });
    }
    for (let i = 0; i < 9; i++) { spawnFish(); fish[i].x = U.rand(250, W - 40); }
    const kelp = U.range(14).map(() => ({ x: U.rand(W), h: U.rand(60, 170), ph: U.rand(6) }));
    E.stat('Time', 120); E.stat('Catch', 0);
    function setMsg(t, c = '#fff', life = 1.8) { msg = { t, c, life }; }
    function landFish() {
      const f = hooked.f, val = Math.round(f.sp.val * (f.size / f.sp.size));
      catches.push(f.sp.name); E.score += val; E.stat('Catch', catches.length);
      setMsg(`${f.sp.name.toUpperCase()}  +${val}`, f.sp.rare ? '#facc15' : '#fff', 2.2);
      E.sfx(f.sp.rare ? 'win' : 'coin'); if (f.sp.rare) E.flash('#facc15', 0.3);
      E.burst(ROD.x + 40, SEA, { n: 30, colors: ['#e0f2fe', '#fff', f.sp.col], speed: 250, grav: 500 });
      fish = fish.filter((q) => q !== f); hooked = null; lure = null; state = 'idle'; tension = 0;
    }
    function lose(why) { setMsg(why, '#f87171'); E.sfx('lose', 1.3, 0.6); if (hooked) { hooked.f.bite = false; hooked.f.interest = -3; hooked.f.dir = hooked.f.x > ROD.x ? 1 : -1; } hooked = null; lure = null; state = 'idle'; tension = 0; }
    return {
      update(dt) {
        T += dt; if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
        time -= dt; E.stat('Time', Math.max(0, Math.ceil(time)));
        if (time <= 0 && state !== 'fight' && state !== 'done') { state = 'done'; E.sfx('win', 0.8); E.over({ title: 'Sunset', msg: catches.length ? `${catches.length} fish: ${[...new Set(catches)].join(', ')}` : 'Nothing biting today…' }); return; }
        const press = E.down('A', 'U') || E.ptr.down, hit = E.hit('A', 'U') || E.ptr.hit;
        // fish swim
        if (fish.length < 10 && Math.random() < dt * 0.8) spawnFish();
        for (const f of fish) {
          f.t += dt;
          if (hooked && hooked.f === f) continue;
          const sp = f.sp.speed * (f.interest > 0 ? 0.6 : 1);
          if (lure && state === 'sink' && !f.bite && f.interest >= 0) {
            const d = U.dist(f.x, f.y, lure.x, lure.y), likes = lure.y > f.sp.depth[0] - 40 && lure.y < f.sp.depth[1] + 60;
            if (d < 160 && likes) f.interest += dt * (1.2 - d / 200);
            if (f.interest > 1) { const a = U.ang(f.x, f.y, lure.x, lure.y); f.x += Math.cos(a) * sp * 0.8 * dt; f.y += Math.sin(a) * sp * 0.8 * dt; f.dir = Math.cos(a) > 0 ? 1 : -1; if (d < f.size * 0.6 + 6) { f.bite = true; state = 'bite'; strikeT = 0.55; hooked = { f }; E.sfx('blip', 1.8); E.shake(3); } continue; }
          }
          f.interest = Math.min(f.interest, 2) - (f.interest < 0 ? -dt * 0.5 : 0);
          f.x += f.dir * sp * dt; f.y += Math.sin(f.t * 1.4) * 12 * dt;
          f.y = U.clamp(f.y, SEA + 20, BED - 20);
        }
        fish = fish.filter((f) => f.x > -120 && f.x < W + 120 || (hooked && hooked.f === f));
        for (const b of bubbles) b.y -= b.v * dt; bubbles = bubbles.filter((b) => b.y > SEA);
        if (Math.random() < dt * 3) bubbles.push({ x: U.rand(W), y: BED, r: U.rand(2, 5), v: U.rand(30, 70) });
        if (state === 'idle') {
          if (press) { charge = Math.min(1, charge + dt * 0.8); } else if (charge > 0) { lure = { x: ROD.x, y: ROD.y, vx: 260 + charge * 620, vy: -300, fly: true }; state = 'cast'; E.sfx('whoosh', 1); charge = 0; }
        } else if (state === 'cast') {
          lure.vy += 900 * dt; lure.x += lure.vx * dt; lure.y += lure.vy * dt;
          if (lure.y >= SEA) { lure.y = SEA; lure.fly = false; state = 'sink'; E.sfx('splash', 1.6, 0.5); E.burst(lure.x, SEA, { n: 14, color: '#e0f2fe', speed: 120, angle: -Math.PI / 2, spread: 1.6, grav: 400 }); }
        } else if (state === 'sink') {
          if (press) { const a = U.ang(lure.x, lure.y, BOAT + 40, SEA); lure.x += Math.cos(a) * 170 * dt; lure.y += Math.sin(a) * 170 * dt - 20 * dt; reelT += dt; if (Math.random() < dt * 12) E.sfx('tick', 2.4, 0.15); }
          else { lure.y = Math.min(BED - 12, lure.y + 55 * dt); lure.x += Math.sin(T * 2) * 6 * dt; }
          if (lure.y <= SEA + 2 && lure.x < BOAT + 70) { lure = null; state = 'idle'; }
        } else if (state === 'bite') {
          strikeT -= dt;
          if (hit) { state = 'fight'; tension = 0.35; lineOut = U.dist(ROD.x, ROD.y, lure.x, lure.y); setMsg('HOOKED!', '#facc15', 1); E.sfx('power'); E.shake(6); }
          else if (strikeT <= 0) lose('It got away…');
        } else if (state === 'fight') {
          const f = hooked.f, str = f.sp.str * (0.8 + 0.4 * Math.sin(T * 2.3 + f.t) + (Math.random() < dt * 0.8 ? 1.2 : 0));
          // fish tries to swim away from the boat and down
          const away = U.ang(ROD.x, SEA, f.x, f.y);
          const pull = str * 80;
          f.x += Math.cos(away) * pull * dt; f.y += Math.sin(away) * pull * dt * 0.5 + Math.sin(T * 3) * 20 * dt;
          if (press) { const a = U.ang(f.x, f.y, BOAT + 40, SEA + 10); const reel = 150 - str * 30; f.x += Math.cos(a) * reel * dt; f.y += Math.sin(a) * reel * dt; tension += dt * (0.35 + str * 0.3); if (Math.random() < dt * 15) E.sfx('tick', 2, 0.2); }
          else tension -= dt * 0.55;
          tension = U.clamp(tension, 0, 1.2);
          f.x = U.clamp(f.x, BOAT + 20, W + 60); f.y = U.clamp(f.y, SEA + 10, BED - 10); f.dir = Math.cos(away) > 0 ? 1 : -1;
          lure.x = f.x; lure.y = f.y;
          const dist = U.dist(ROD.x, SEA, f.x, f.y);
          if (tension >= 1) lose('SNAP! Line broke');
          else if (dist > 820 || f.x > W + 40) lose('It swam off with the line');
          else if (f.y < SEA + 30 && f.x < BOAT + 90) landFish();
          if (Math.random() < dt * 6) E.burst(f.x, f.y, { n: 1, color: '#e0f2fe', speed: 40, life: 0.5, size: 2 });
        }
      },
      draw(g) {
        const t = E.t, dayK = U.clamp(1 - time / 120, 0, 1);
        D.bg(g, W, SEA, U.mix('#7dd3fc', '#f97316', dayK), U.mix('#e0f2fe', '#fde68a', dayK));
        D.glow(g, 800, 60 + dayK * 110, 90, '#fef3c7', 0.7); D.circle(g, 800, 60 + dayK * 110, 30, '#fef9c3');
        // water
        const wg = g.createLinearGradient(0, SEA, 0, H); wg.addColorStop(0, '#0ea5e9'); wg.addColorStop(0.45, '#0369a1'); wg.addColorStop(1, '#082f49'); g.fillStyle = wg; g.fillRect(0, SEA, W, H - SEA);
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 6; k++) { const x = (k * 190 + Math.sin(t * 0.3 + k) * 60) % W; const gr = g.createLinearGradient(x, SEA, x + 80, 500); gr.addColorStop(0, 'rgba(186,230,253,.12)'); gr.addColorStop(1, 'rgba(186,230,253,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, SEA); g.lineTo(x + 50, SEA); g.lineTo(x + 180, 520); g.lineTo(x + 80, 520); g.fill(); }
        g.restore();
        // seabed
        g.fillStyle = '#a16207'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 30) g.lineTo(x, BED + Math.sin(x * 0.02) * 8); g.lineTo(W, H); g.fill();
        for (const k of kelp) { g.strokeStyle = '#15803d'; g.lineWidth = 6; g.beginPath(); g.moveTo(k.x, BED); for (let y = 0; y < k.h; y += 10) g.lineTo(k.x + Math.sin(t * 1.5 + k.ph + y * 0.04) * y * 0.12, BED - y); g.stroke(); }
        for (const b of bubbles) D.circle(g, b.x + Math.sin(t * 3 + b.y * 0.05) * 3, b.y, b.r, null, 'rgba(224,242,254,.5)', 1);
        // depth markers
        for (let d = 100; d <= 400; d += 100) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(W - 40, SEA + d, 12, 2); D.text(g, `${d / 10}m`, W - 50, SEA + d, { size: 10, font: 'mono', color: 'rgba(255,255,255,.4)', align: 'right' }); }
        // fish
        for (const f of fish) {
          g.save(); g.translate(f.x, f.y); g.scale(f.dir, 1);
          const s = f.size, wag = Math.sin(f.t * 10) * 0.3;
          if (f.sp.rare) D.glow(g, 0, 0, s * 3, '#facc15', 0.5);
          if (f.sp.name === 'Anglerfish') { D.line(g, s * 0.3, -s * 0.5, s * 0.9, -s * 1.1, '#a78bfa', 2); D.glow(g, s * 0.9, -s * 1.1, 16, '#fde68a', 0.9); D.circle(g, s * 0.9, -s * 1.1, 3, '#fef9c3'); }
          g.save(); g.translate(-s * 0.8, 0); g.rotate(wag); D.poly(g, [[0, 0], [-s * 0.6, -s * 0.45], [-s * 0.6, s * 0.45]], U.shade(f.sp.col, -0.2)); g.restore();
          const gr = g.createLinearGradient(0, -s * 0.5, 0, s * 0.5); gr.addColorStop(0, U.shade(f.sp.col, 0.2)); gr.addColorStop(1, U.shade(f.sp.col, -0.3));
          g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, U.TAU); g.fill();
          D.circle(g, s * 0.55, -s * 0.12, Math.max(2, s * 0.12), '#fff'); D.circle(g, s * 0.58, -s * 0.12, Math.max(1, s * 0.06), '#111');
          g.restore();
          if (f.bite && state === 'bite') D.text(g, '!', f.x, f.y - f.size - 14, { size: 30, color: '#facc15', glow: '#facc15' });
        }
        // boat & fisher
        g.save(); g.translate(0, Math.sin(t * 1.5) * 3);
        D.poly(g, [[70, SEA - 20], [240, SEA - 20], [215, SEA + 18], [95, SEA + 18]], '#9a3412', '#7c2d12', 2);
        g.fillStyle = '#fef3c7'; g.fillRect(70, SEA - 26, 170, 8);
        D.fillRR(g, 120, SEA - 70, 22, 46, 8, '#1d4ed8'); D.circle(g, 131, SEA - 82, 12, '#fcd9b6'); g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(131, SEA - 90, 18, 6, 0, 0, U.TAU); g.fill(); g.fillRect(122, SEA - 102, 18, 12);
        const bend = state === 'fight' ? tension * 30 : 0;
        g.strokeStyle = '#78350f'; g.lineWidth = 4; g.beginPath(); g.moveTo(140, SEA - 50); g.quadraticCurveTo(160, ROD.y - 10 + bend * 0.5, ROD.x + bend * 0.3, ROD.y + bend); g.stroke();
        g.restore();
        // line
        if (lure) {
          g.strokeStyle = state === 'fight' ? U.mix('#e2e8f0', '#ef4444', U.clamp(tension, 0, 1)) : 'rgba(226,232,240,.8)'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(ROD.x, ROD.y); const mx = (ROD.x + lure.x) / 2, my = Math.max(ROD.y, lure.y) + (state === 'fight' ? -tension * 40 : 40); g.quadraticCurveTo(mx, my, lure.x, lure.y); g.stroke();
          if (state !== 'fight') { D.glow(g, lure.x, lure.y, 16, '#f472b6', 0.6); D.circle(g, lure.x, lure.y, 5, '#f472b6'); D.circle(g, lure.x, lure.y, 2, '#fff'); }
        }
        // HUD
        if (state === 'idle') { D.fillRR(g, 40, 30, 200, 14, 7, 'rgba(0,0,0,.3)'); D.fillRR(g, 40, 30, 200 * charge, 14, 7, '#facc15'); D.text(g, charge ? 'CAST POWER' : 'HOLD TO CAST', 140, 58, { size: 12, font: 'mono', color: '#1e3a8a' }); }
        if (state === 'fight') {
          const bx = W / 2 - 150, by = 30;
          D.fillRR(g, bx, by, 300, 18, 9, 'rgba(0,0,0,.4)');
          const gz = [0.25, 0.8]; g.fillStyle = 'rgba(74,222,128,.35)'; g.fillRect(bx + 300 * gz[0], by, 300 * (gz[1] - gz[0]), 18); g.fillStyle = 'rgba(239,68,68,.35)'; g.fillRect(bx + 300 * 0.8, by, 300 * 0.2, 18);
          D.fillRR(g, bx + 300 * U.clamp(tension, 0, 1) - 3, by - 4, 6, 26, 3, '#fff');
          D.text(g, `TENSION — ${hooked ? hooked.f.sp.name : ''}`, W / 2, by + 34, { size: 12, font: 'mono', color: '#0c4a6e' });
        }
        D.fillRR(g, W - 170, 16, 150, 40, 12, 'rgba(0,0,0,.3)'); D.text(g, `${Math.max(0, Math.ceil(time))}s`, W - 95, 36, { size: 22, font: 'mono', color: time < 20 ? '#fecaca' : '#fff' });
        if (msg) D.text(g, msg.t, W / 2, 110, { size: 30, color: msg.c, stroke: 'rgba(0,0,0,.35)', lw: 6, alpha: Math.min(1, msg.life * 2) });
      },
    };
  },
});

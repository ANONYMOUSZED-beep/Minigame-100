MG.add({
  id: 'knifehit', name: 'Knife Hit', cat: 'Sports', color: '#f59e0b', color2: '#ef4444',
  desc: 'Throw knives into a spinning log without hitting the blades already stuck in it. Bosses spin erratically.',
  how: ['Tap, click or <kbd>Space</kbd> to throw', 'Land every knife in the log to break it', 'Hit an embedded knife and it\'s over', 'Slice apples for bonus points · every 5th stage is a boss log'],
  w: 540, h: 860, pad: 'A', padLabels: { A: 'THROW' },
  make(E) {
    const W = 540, H = 860, CX = W / 2, CY = 300, LR = 110, KL = 90;
    let stage = 0, log, knives, apples, left, flying = null, ang = 0, spinFn, state = 'play', stateT = 0, shards = [], apl = 0, T = 0, shake = 0;
    const SPINS = [
      (t) => 2.2, (t) => -2.8, (t) => 2 + Math.sin(t * 1.3) * 1.8, (t) => (Math.sin(t * 0.9) > 0 ? 3.2 : -2.2),
      (t) => 3.4 * Math.sin(t * 0.7), (t) => 1.5 + (Math.floor(t * 0.8) % 2) * 3, (t) => -2.5 - Math.sin(t * 2.2) * 2,
    ];
    function newStage() {
      stage++; const boss = stage % 5 === 0;
      E.stat('Stage', stage);
      left = boss ? 12 : Math.min(10, 5 + Math.floor(stage / 2));
      const pre = boss ? U.ri(2, 4) : Math.min(4, Math.floor(stage / 2));
      knives = U.range(pre).map((i) => ({ a: (i / pre) * U.TAU + U.rand(-0.3, 0.3) }));
      apples = U.chance(boss ? 0.2 : 0.5) ? [{ a: U.rand(U.TAU), hit: false }] : [];
      spinFn = boss ? SPINS[4 + (stage / 5) % 3 | 0] : SPINS[U.ri(0, Math.min(SPINS.length - 1, 1 + Math.floor(stage / 2)))];
      log = { boss, hp: 1, flash: 0, t: 0 };
      state = 'play';
      E.banner(boss ? 'BOSS LOG' : `STAGE ${stage}`, `${left} knives`, { color: boss ? '#ef4444' : '#f59e0b', life: 1.1 });
    }
    newStage();
    E.stat('Apples', 0);
    function throwKnife() { if (flying || state !== 'play' || left <= 0) return; flying = { y: H - 150, vy: -2600 }; left--; E.sfx('swish', 1.2); }
    function stick() {
      const hitA = U.wrap(Math.PI / 2 - ang, 0, U.TAU);
      // collision with stuck knives (angular distance)
      for (const k of knives) if (Math.abs(U.angDiff(k.a, hitA)) < 0.16) return fail();
      knives.push({ a: hitA, wob: 1 });
      E.score += 10 + (log.boss ? 10 : 0); log.flash = 1; shake = 6;
      E.sfx('thud', 1.3 + Math.random() * 0.2, 0.8); E.burst(CX, CY + LR, { n: 10, colors: ['#d6a15b', '#8b5a2b'], speed: 180, angle: Math.PI / 2, spread: 2, shape: 'square', size: 3 });
      for (const a of apples) if (!a.hit && Math.abs(U.angDiff(a.a, hitA)) < 0.22) { a.hit = true; apl++; E.stat('Apples', apl); E.score += 50; E.sfx('slice'); E.pop(CX, CY + LR + 40, '+50 APPLE', { color: '#ef4444' }); E.burst(CX, CY + LR, { n: 20, colors: ['#ef4444', '#fca5a5', '#fef3c7'], speed: 200 }); }
      if (left <= 0) breakLog();
    }
    function breakLog() {
      state = 'break'; stateT = 1.3;
      E.score += log.boss ? 500 : 100;
      E.sfx(log.boss ? 'win' : 'explode', 1.2); E.shake(10); E.flash('#fef3c7', 0.3);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * U.TAU; shards.push({ x: CX + Math.cos(a) * 40, y: CY + Math.sin(a) * 40, vx: Math.cos(a) * U.rand(200, 400), vy: Math.sin(a) * U.rand(200, 400) - 200, rot: U.rand(6), vr: U.rand(-8, 8), a0: a }); }
      for (const k of knives) shards.push({ knife: true, x: CX + Math.cos(k.a + ang) * LR, y: CY + Math.sin(k.a + ang) * LR, vx: Math.cos(k.a + ang) * 300, vy: Math.sin(k.a + ang) * 300 - 300, rot: k.a + ang - Math.PI / 2, vr: U.rand(-10, 10) });
    }
    function fail() {
      state = 'fail'; stateT = 1.4;
      E.sfx('hurt'); E.sfx('tick', 0.6); E.shake(12); E.flash('#ef4444', 0.3); E.vibrate(200);
      shards.push({ knife: true, x: CX, y: CY + LR + 40, vx: U.rand(-200, 200), vy: 300, rot: -Math.PI / 2, vr: U.rand(-12, 12) });
      E.after(1.2, () => E.over({ msg: `Reached stage ${stage} · ${apl} apples` }));
    }
    function drawKnife(g, x, y, rot, s = 1) {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
      // blade points toward -y in local space (handle outward)
      const blade = g.createLinearGradient(-6, 0, 6, 0); blade.addColorStop(0, '#e2e8f0'); blade.addColorStop(0.5, '#f8fafc'); blade.addColorStop(1, '#94a3b8');
      g.fillStyle = blade; g.beginPath(); g.moveTo(0, -44); g.lineTo(7, -30); g.lineTo(7, 0); g.lineTo(-7, 0); g.lineTo(-7, -30); g.closePath(); g.fill();
      g.fillStyle = '#475569'; g.fillRect(-11, 0, 22, 6);
      D.fillRR(g, -6, 6, 12, 38, 5, '#7c2d12'); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(-4, 10, 3, 30);
      g.restore();
    }
    return {
      update(dt) {
        T += dt; shake = Math.max(0, shake - dt * 40);
        log.flash = Math.max(0, log.flash - dt * 5);
        for (const s of shards) { s.vy += 1400 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; }
        shards = shards.filter((s) => s.y < H + 100);
        for (const k of knives) if (k.wob) k.wob = Math.max(0, k.wob - dt * 5);
        if (state === 'break') { stateT -= dt; if (stateT <= 0) newStage(); return; }
        if (state === 'fail') return;
        log.t += dt; ang += spinFn(log.t) * dt;
        if (E.hit('A', 'U') || E.ptr.hit) throwKnife();
        if (flying) { flying.y += flying.vy * dt; if (flying.y - 44 <= CY + LR) { flying = null; stick(); } }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#3b1d4a', '#0c0612', CX, CY);
        g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
        g.save(); g.translate(U.rand(-shake, shake), U.rand(-shake, shake));
        // stuck knives (behind log)
        if (state !== 'break') for (const k of knives) { const a = k.a + ang, wob = Math.sin(t * 60) * k.wob * 0.08; drawKnife(g, CX + Math.cos(a) * (LR + 30), CY + Math.sin(a) * (LR + 30), a - Math.PI / 2 + wob); }
        // apples
        if (state !== 'break') for (const a of apples) if (!a.hit) { const aa = a.a + ang, x = CX + Math.cos(aa) * (LR + 16), y = CY + Math.sin(aa) * (LR + 16); D.orb(g, x, y, 15, '#ef4444'); D.line(g, x, y - 12, x + 3, y - 20, '#78350f', 3); g.fillStyle = '#22c55e'; g.beginPath(); g.ellipse(x + 8, y - 18, 7, 3, -0.5, 0, U.TAU); g.fill(); }
        // log
        if (state !== 'break') {
          g.save(); g.translate(CX, CY); g.rotate(ang);
          D.glow(g, 0, 0, LR * 1.6, log.boss ? '#ef4444' : '#f59e0b', 0.25);
          const lg = g.createRadialGradient(0, 0, 10, 0, 0, LR); lg.addColorStop(0, log.boss ? '#9f1239' : '#e8b46a'); lg.addColorStop(0.85, log.boss ? '#7f1d1d' : '#b77b3e'); lg.addColorStop(1, log.boss ? '#450a0a' : '#6b3f1d');
          D.circle(g, 0, 0, LR, lg);
          for (let r = 20; r < LR; r += 18) D.circle(g, 0, 0, r, null, 'rgba(90,50,20,.35)', 2);
          if (log.boss) { for (let k = 0; k < 8; k++) { const a = (k / 8) * U.TAU; D.poly(g, [[Math.cos(a) * (LR - 4), Math.sin(a) * (LR - 4)], [Math.cos(a + 0.12) * (LR + 12), Math.sin(a + 0.12) * (LR + 12)], [Math.cos(a + 0.24) * (LR - 4), Math.sin(a + 0.24) * (LR - 4)]], '#fbbf24'); } D.circle(g, -26, -16, 12, '#fef3c7'); D.circle(g, 26, -16, 12, '#fef3c7'); D.circle(g, -24, -14, 5, '#111'); D.circle(g, 28, -14, 5, '#111'); }
          else D.line(g, -LR * 0.6, 8, LR * 0.4, -20, 'rgba(90,50,20,.4)', 3);
          if (log.flash) { g.globalAlpha = log.flash * 0.5; D.circle(g, 0, 0, LR, '#fff'); g.globalAlpha = 1; }
          g.restore();
        }
        for (const s of shards) {
          if (s.knife) drawKnife(g, s.x, s.y, s.rot);
          else { g.save(); g.translate(s.x, s.y); g.rotate(s.rot); D.poly(g, [[0, 0], [60, -20], [70, 30], [20, 40]], '#c98a4a', '#6b3f1d', 2); g.restore(); }
        }
        // throwing knife
        if (state === 'play') drawKnife(g, CX, flying ? flying.y : H - 150 + Math.sin(t * 4) * 3, 0);
        g.restore();
        // remaining knives counter
        for (let i = 0; i < left; i++) { g.globalAlpha = 0.9; drawKnife(g, 40, H - 60 - i * 32, 0, 0.4); }
        g.globalAlpha = 1;
        D.text(g, `STAGE ${stage}`, W / 2, 60, { size: 26, color: '#fef3c7' });
        const dots = 5, cur = ((stage - 1) % 5); for (let i = 0; i < dots; i++) D.circle(g, W / 2 - 40 + i * 20, 92, i === 4 ? 7 : 5, i < cur ? '#f59e0b' : i === cur ? '#fff' : 'rgba(255,255,255,.2)', i === 4 ? '#ef4444' : null, 2);
        D.text(g, `● ${apl}`, W - 40, 60, { size: 20, color: '#ef4444', align: 'right' });
      },
    };
  },
});

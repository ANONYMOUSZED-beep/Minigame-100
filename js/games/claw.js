MG.add({
  id: 'claw', name: 'Claw Crane', cat: 'Physics', color: '#f472b6', color2: '#a78bfa',
  desc: 'The arcade claw machine — honest edition. Line up, drop, pray the grip holds all the way to the chute.',
  how: ['Move the claw with <kbd>←</kbd> <kbd>→</kbd> or by dragging', '<kbd>Space</kbd> / tap the button to drop', 'The claw grabs whatever sits between its prongs — small prizes hold better', 'Ten credits. Rare prizes are worth far more.'],
  pad: 'LRA', padLabels: { A: 'DROP' },
  make(E) {
    const W = 960, H = 600, X0 = 170, X1 = 800, TOP = 90, FLOOR = 520, CHUTE = [60, 170];
    const KINDS = [
      { name: 'Bear', col: '#d97706', r: 30, val: 50, grip: 0.8 }, { name: 'Bunny', col: '#f9a8d4', r: 26, val: 60, grip: 0.85 }, { name: 'Frog', col: '#4ade80', r: 24, val: 70, grip: 0.9 },
      { name: 'Octo', col: '#a78bfa', r: 28, val: 90, grip: 0.8 }, { name: 'Duck', col: '#fde047', r: 22, val: 80, grip: 0.95 }, { name: 'Golden Cat', col: '#fbbf24', r: 30, val: 500, grip: 0.55, rare: true },
      { name: 'Big Panda', col: '#f1f5f9', r: 40, val: 200, grip: 0.45 },
    ];
    let prizes = [], claw = { x: 480, y: TOP, open: 1, held: null, state: 'move', vy: 0, sway: 0 }, credits = 10, won = [], T = 0, msg = null, dragX = null;
    for (let i = 0; i < 26; i++) { const k = i === 0 ? 5 : i < 3 ? 6 : U.ri(0, 4); const K = KINDS[k]; prizes.push({ k: K, x: U.rand(X0 + 50, X1 - 30), y: U.rand(260, 480), vx: 0, vy: 0, rot: U.rand(-0.4, 0.4), r: K.r * U.rand(0.9, 1.1) }); }
    for (let i = 0; i < 300; i++) physics(1 / 60);
    E.stat('Credits', credits); E.stat('Prizes', 0);
    function physics(dt) {
      for (const p of prizes) {
        if (p === claw.held || p.fall) continue;
        p.vy += 900 * dt; p.vx *= Math.exp(-2 * dt); p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > FLOOR - p.r) { p.y = FLOOR - p.r; p.vy *= -0.2; p.vx *= 0.9; }
        if (p.x < X0 + p.r && !(p.fall)) { p.x = X0 + p.r; p.vx = Math.abs(p.vx) * 0.3; }
        if (p.x > X1 - p.r) { p.x = X1 - p.r; p.vx = -Math.abs(p.vx) * 0.3; }
      }
      for (let it = 0; it < 3; it++) for (let i = 0; i < prizes.length; i++) for (let j = i + 1; j < prizes.length; j++) {
        const a = prizes[i], b = prizes[j]; if (a === claw.held || b === claw.held || a.fall || b.fall) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r - 4;
        if (d < rr && d > 0.01) { const nx = dx / d, ny = dy / d, ov = (rr - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += nx * rv * 0.4; a.vy += ny * rv * 0.4; b.vx -= nx * rv * 0.4; b.vy -= ny * rv * 0.4; } }
      }
    }
    function drop() { if (claw.state !== 'move' || credits <= 0) return; credits--; E.stat('Credits', credits); claw.state = 'down'; E.sfx('charge', 0.6, 0.5); }
    return {
      update(dt) {
        T += dt; if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
        physics(dt);
        const c = claw;
        c.sway = U.damp(c.sway, 0, 3, dt);
        const btn = U.ptInRect(E.ptr.x, E.ptr.y, 840, 440, 100, 100);
        if (c.state === 'move') {
          const ax = E.axis().x; c.x += ax * 260 * dt; if (ax) c.sway -= ax * dt * 0.8;
          if (E.ptr.hit && !btn) dragX = E.ptr.x;
          if (E.ptr.down && dragX !== null) { const nx = U.damp(c.x, E.ptr.x, 6, dt); c.sway -= (nx - c.x) * 0.004; c.x = nx; }
          if (!E.ptr.down) dragX = null;
          c.x = U.clamp(c.x, X0 + 30, X1 - 30);
          if (E.hit('A') || (E.ptr.hit && btn)) drop();
          if (credits <= 0 && !prizes.some((p) => p.fall)) { c.state = 'done'; E.over({ win: won.length > 0, title: won.length ? 'Prize Haul!' : 'No Luck', msg: won.length ? won.join(', ') : 'The claw always wins…' }); }
        } else if (c.state === 'down') {
          c.y += 180 * dt; c.open = Math.min(1, c.open + dt * 2);
          const touch = prizes.some((p) => Math.abs(p.x - c.x) < p.r + 10 && c.y + 46 > p.y - p.r + 8);
          if (touch || c.y > FLOOR - 60) { c.state = 'close'; E.sfx('click', 0.6); }
        } else if (c.state === 'close') {
          c.open -= dt * 2.2;
          if (c.open <= 0) {
            c.open = 0;
            let best = null, bd = 1e9;
            for (const p of prizes) { const dx = Math.abs(p.x - c.x), dy = p.y - (c.y + 40); if (dx < 30 + p.r * 0.2 && dy > -p.r && dy < p.r + 30) { const d = dx + Math.abs(dy) * 0.5; if (d < bd) { bd = d; best = p; } } }
            const chance = best ? best.k.grip * (1 - Math.min(0.5, bd / 80)) : 0;
            if (best && Math.random() < chance) { c.held = best; best.hx = best.x - c.x; best.hy = best.y - c.y; E.sfx('thud', 1.4, 0.5); }
            else if (best) { best.vy -= 200; best.vx += U.rand(-60, 60); E.sfx('bounce', 0.8, 0.5); }
            c.state = 'up';
          }
        } else if (c.state === 'up') {
          c.y -= 150 * dt;
          if (c.held) { c.held.x = U.lerp(c.held.x, c.x, dt * 6); c.held.y = c.y + 60 + c.held.r * 0.6; c.held.vx = c.held.vy = 0; if (Math.random() < dt * (1 - c.held.k.grip) * 0.9) { const p = c.held; c.held = null; p.vy = 0; E.sfx('lose', 1.8, 0.4); msg = { t: 'It slipped!', life: 1.4 }; } }
          if (c.y <= TOP) { c.y = TOP; c.state = 'home'; }
        } else if (c.state === 'home') {
          const tx = (CHUTE[0] + CHUTE[1]) / 2 + 20;
          c.x = U.approach(c.x, tx, 240 * dt); c.sway = Math.sin(T * 6) * 0.05;
          if (c.held) { c.held.x = c.x; c.held.y = c.y + 60 + c.held.r * 0.6; if (Math.random() < dt * (1 - c.held.k.grip) * 0.6) { const p = c.held; c.held = null; E.sfx('lose', 1.8, 0.4); msg = { t: 'So close…', life: 1.4 }; void p; } }
          if (Math.abs(c.x - tx) < 1) {
            c.state = 'release'; c.open = 0;
          }
        } else if (c.state === 'release') {
          c.open = Math.min(1, c.open + dt * 2);
          if (c.held && c.open > 0.5) { const p = c.held; c.held = null; p.fall = true; p.vy = 0; }
          if (c.open >= 1) { c.state = 'return'; }
        } else if (c.state === 'return') { c.x = U.approach(c.x, 480, 300 * dt); if (Math.abs(c.x - 480) < 1) c.state = 'move'; }
        for (const p of prizes) if (p.fall) { p.vy += 900 * dt; p.y += p.vy * dt; if (p.y > H + 60 && !p.counted) { p.counted = true; won.push(p.k.name); E.score += p.k.val; E.stat('Prizes', won.length); msg = { t: `WON: ${p.k.name.toUpperCase()}  +${p.k.val}`, life: 2, c: p.k.rare ? '#fbbf24' : '#fff' }; E.sfx(p.k.rare ? 'win' : 'coin'); E.flash(p.k.rare ? '#fbbf24' : '#f472b6', 0.25); E.burst(110, 560, { n: 40, colors: ['#f472b6', '#fbbf24', '#fff'], speed: 300, angle: -Math.PI / 2, spread: 1.4 }); } }
        prizes = prizes.filter((p) => !p.counted);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#2e1065', '#0f0520');
        // cabinet
        D.fillRR(g, 20, 20, 920, 570, 26, '#be185d'); D.fillRR(g, 34, 34, 892, 542, 20, '#831843');
        for (let i = 0; i < 26; i++) { const x = 44 + i * 34, on = Math.floor(t * 4 + i) % 3 === 0; D.circle(g, x, 44, 5, on ? '#fde68a' : '#78350f'); D.circle(g, x, 580, 5, on ? '#fde68a' : '#78350f'); }
        // glass box interior
        const ig = g.createLinearGradient(0, TOP, 0, FLOOR); ig.addColorStop(0, '#1e1b4b'); ig.addColorStop(1, '#312e81'); g.fillStyle = ig; g.fillRect(CHUTE[0], TOP - 10, X1 - CHUTE[0], FLOOR - TOP + 10);
        // chute
        g.fillStyle = '#0f0520'; g.fillRect(CHUTE[0], 330, CHUTE[1] - CHUTE[0], FLOOR - 330 + 60);
        D.fillRR(g, CHUTE[0] - 6, 320, CHUTE[1] - CHUTE[0] + 12, 14, 4, '#f472b6');
        D.text(g, 'PRIZE', (CHUTE[0] + CHUTE[1]) / 2, 360, { size: 16, color: '#f9a8d4' });
        D.line(g, X0, 330, X0, FLOOR, '#94a3b8', 6);
        // prizes
        for (const p of prizes) {
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          const r = p.r, c = p.k.col;
          if (p.k.rare) D.glow(g, 0, 0, r * 2.2, '#fbbf24', 0.5 + 0.2 * Math.sin(t * 4));
          D.circle(g, -r * 0.62, -r * 0.7, r * 0.34, U.shade(c, -0.1)); D.circle(g, r * 0.62, -r * 0.7, r * 0.34, U.shade(c, -0.1));
          if (p.k.name === 'Bunny') { D.fillRR(g, -r * 0.55, -r * 1.7, r * 0.35, r, r * 0.17, c); D.fillRR(g, r * 0.2, -r * 1.7, r * 0.35, r, r * 0.17, c); }
          D.orb(g, 0, 0, r, c, 0.3);
          if (p.k.name === 'Big Panda') { D.circle(g, -r * 0.35, -r * 0.1, r * 0.25, '#111'); D.circle(g, r * 0.35, -r * 0.1, r * 0.25, '#111'); }
          D.circle(g, -r * 0.32, -r * 0.1, r * 0.11, '#fff'); D.circle(g, r * 0.32, -r * 0.1, r * 0.11, '#fff');
          D.circle(g, -r * 0.3, -r * 0.08, r * 0.06, '#111'); D.circle(g, r * 0.34, -r * 0.08, r * 0.06, '#111');
          g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, r * 0.2, r * 0.18, 0.2, Math.PI - 0.2); g.stroke();
          D.circle(g, -r * 0.55, r * 0.2, r * 0.1, 'rgba(244,114,182,.6)'); D.circle(g, r * 0.55, r * 0.2, r * 0.1, 'rgba(244,114,182,.6)');
          g.restore();
        }
        // rail + claw
        D.line(g, CHUTE[0], TOP - 20, X1, TOP - 20, '#cbd5e1', 6);
        const c = claw;
        D.fillRR(g, c.x - 24, TOP - 34, 48, 22, 6, '#94a3b8');
        g.save(); g.translate(c.x, TOP - 12); g.rotate(c.sway);
        const len = c.y - TOP + 30;
        D.line(g, 0, 0, 0, len, '#e2e8f0', 3);
        g.translate(0, len);
        D.fillRR(g, -16, -6, 32, 16, 6, '#f472b6');
        const spread = 0.25 + c.open * 0.65;
        for (const s of [-1, 1]) { g.save(); g.rotate(s * spread); g.strokeStyle = '#e2e8f0'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 8); g.lineTo(s * 8, 36); g.lineTo(s * 0, 52); g.stroke(); g.restore(); }
        g.restore();
        // glass glare
        g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(CHUTE[0], TOP); g.lineTo(CHUTE[0] + 160, TOP); g.lineTo(CHUTE[0] + 60, FLOOR); g.lineTo(CHUTE[0], FLOOR); g.fill();
        // control panel
        D.fillRR(g, 830, 110, 90, 300, 14, '#4c0519');
        D.text(g, 'CREDITS', 875, 140, { size: 12, font: 'mono', color: '#fbcfe8' });
        D.text(g, credits, 875, 180, { size: 40, color: '#fde68a', font: 'mono' });
        D.text(g, 'PRIZES', 875, 240, { size: 12, font: 'mono', color: '#fbcfe8' });
        D.text(g, won.length, 875, 280, { size: 40, color: '#fde68a', font: 'mono' });
        const ready = claw.state === 'move' && credits > 0;
        D.glow(g, 890, 490, 60, '#ef4444', ready ? 0.6 + 0.3 * Math.sin(t * 6) : 0.1);
        D.orb(g, 890, 490, 40, ready ? '#ef4444' : '#7f1d1d'); D.text(g, 'DROP', 890, 491, { size: 14, color: '#fff' });
        if (msg) D.text(g, msg.t, 480, 220, { size: 28, color: msg.c || '#fff', stroke: 'rgba(0,0,0,.4)', lw: 6, alpha: Math.min(1, msg.life * 2) });
      },
    };
  },
});

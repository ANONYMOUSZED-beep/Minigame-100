MG.add({
  id: 'whack', name: 'Whack-a-Mole', cat: 'Brain', color: '#84cc16', color2: '#f59e0b',
  desc: 'Sixty frantic seconds in the garden. Bonk moles, crack helmets, grab golden ones — leave the bombs alone.',
  how: ['Click / tap a mole to bonk it', 'Keyboard: <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd> or the numpad', 'Helmet moles need two hits · gold moles are worth 5×', 'Hitting a bomb costs 5 seconds and your combo'],
  make(E) {
    const W = 960, H = 600, DUR = 60;
    const ROWS = [{ y: 262, s: 0.8, dx: 232 }, { y: 378, s: 0.91, dx: 262 }, { y: 505, s: 1.03, dx: 296 }];
    const KEYS = [['KeyQ', 'Numpad7', 'Digit1'], ['KeyW', 'Numpad8', 'Digit2'], ['KeyE', 'Numpad9', 'Digit3'], ['KeyA', 'Numpad4', 'Digit4'], ['KeyS', 'Numpad5', 'Digit5'], ['KeyD', 'Numpad6', 'Digit6'], ['KeyZ', 'Numpad1', 'Digit7'], ['KeyX', 'Numpad2', 'Digit8'], ['KeyC', 'Numpad3', 'Digit9']];
    const holes = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const R = ROWS[r]; holes.push({ x: W / 2 + (c - 1) * R.dx, y: R.y, s: R.s, st: 'idle', h: 0, t: 0, kind: 'mole', hp: 1, wob: 0, dizzy: 0 }); }
    let time = DUR, el = 0, spawnT = 0.6, combo = 0, best = 0, hits = 0, swings = 0, hx = W / 2, hy = H / 2, swing = 1, over = false, T = 0;
    const clouds = U.range(5).map((i) => ({ x: i * 230 + U.rand(60), y: U.rand(30, 90), s: U.rand(0.7, 1.2) }));
    const flowers = U.range(40).map(() => ({ x: U.rand(W), y: U.rand(180, H), c: U.pick(['#f472b6', '#fde047', '#fff', '#c084fc', '#fb923c']), s: U.rand(3, 5) }));
    E.stat('Time', DUR); E.stat('Combo', '×1');
    const mult = () => 1 + Math.min(4, Math.floor(combo / 5));
    function spawn() {
      const idle = holes.filter((h) => h.st === 'idle');
      if (!idle.length) return;
      const h = U.pick(idle), r = Math.random();
      h.kind = el > 5 && r < 0.12 ? 'bomb' : r < 0.2 ? 'gold' : el > 10 && r < 0.34 ? 'helmet' : 'mole';
      h.hp = h.kind === 'helmet' ? 2 : 1; h.st = 'up'; h.t = Math.max(0.42, 1.05 - el * 0.011) * (h.kind === 'gold' ? 0.7 : 1) * U.rand(0.85, 1.2); h.dizzy = 0; h.wob = 0;
      E.sfx('hop', h.kind === 'gold' ? 1.6 : 0.8 + Math.random() * 0.2, 0.35);
    }
    function whack(i) {
      const h = holes[i]; swings++;
      hx = h.x; hy = h.y - 40 * h.s; swing = 0;
      if ((h.st === 'up' || h.st === 'hold') && h.h > 0.35) {
        const px = h.x, py = h.y - 55 * h.s * h.h;
        if (h.kind === 'bomb') {
          h.st = 'down'; h.kind = 'boom'; time = Math.max(0, time - 5); combo = 0;
          E.sfx('explode'); E.shake(18); E.flash('#fb923c', 0.5); E.vibrate(200);
          E.burst(px, py, { n: 50, colors: ['#fde68a', '#f97316', '#111', '#fff'], speed: 420, life: 0.9 });
          E.pop(px, py - 50, '−5 SEC', { color: '#f87171', size: 30 });
          return;
        }
        hits++;
        if (h.kind === 'helmet' && h.hp > 1) {
          h.hp--; h.wob = 1; E.sfx('hit', 1.6); E.shake(4);
          E.burst(px, py - 20 * h.s, { n: 12, colors: ['#e5e7eb', '#9ca3af', '#fff'], speed: 260, shape: 'spark' });
          E.pop(px, py - 60, 'CLANK', { color: '#e5e7eb', size: 18 });
          return;
        }
        combo++; best = Math.max(best, combo);
        const base = h.kind === 'gold' ? 50 : h.kind === 'helmet' ? 25 : 10, pts = base * mult();
        E.score += pts; E.freeze(0.035); E.shake(h.kind === 'gold' ? 9 : 5);
        E.sfx('thud', 1.1); E.sfx(h.kind === 'gold' ? 'coin' : 'pop', 0.9 + Math.min(combo, 20) * 0.03);
        E.burst(px, py, { n: h.kind === 'gold' ? 30 : 16, colors: h.kind === 'gold' ? ['#fde047', '#fff', '#f59e0b'] : ['#fde68a', '#fff', '#a3e635'], speed: 300, shape: 'spark' });
        E.ring(px, py, { r: 70 * h.s, color: h.kind === 'gold' ? '#fde047' : '#fff' });
        E.pop(px, py - 70 * h.s, `+${pts}`, { color: h.kind === 'gold' ? '#fde047' : '#fff', size: 22 + Math.min(combo, 20) * 0.5 });
        if (combo % 5 === 0 && combo <= 20) E.pop(W / 2, 120, `COMBO ×${mult()}`, { color: '#a3e635', size: 30 });
        h.st = 'hit'; h.t = 0.45; h.dizzy = 1;
      } else {
        E.sfx('thud', 0.7, 0.6); E.burst(h.x, h.y, { n: 10, colors: ['#78350f', '#a16207'], speed: 140, grav: 400 });
      }
    }
    return {
      start() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = 'none'; },
      destroy() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = ''; },
      update(dt) {
        T += dt;
        if (over) return;
        el += dt; time -= dt;
        const secs = Math.ceil(Math.max(0, time));
        if (secs !== Math.ceil(time + dt) && secs <= 5 && secs > 0) E.sfx('tick', 1, 0.8);
        E.stat('Time', secs); E.stat('Combo', `×${mult()}`);
        if (time <= 0) {
          over = true; E.sfx('tada');
          E.over({ title: 'Time!', msg: `${hits} bonks · best combo ${best} · accuracy ${swings ? Math.round((hits / swings) * 100) : 0}%` });
          return;
        }
        spawnT -= dt;
        if (spawnT <= 0) { spawn(); if (el > 20 && Math.random() < 0.35) spawn(); if (el > 40 && Math.random() < 0.3) spawn(); spawnT = Math.max(0.3, 0.85 - el * 0.009) * U.rand(0.7, 1.2); }
        for (const h of holes) {
          h.wob = Math.max(0, h.wob - dt * 4); h.dizzy = Math.max(0, h.dizzy - dt);
          if (h.st === 'up') { h.h = Math.min(1, h.h + dt * 7); if (h.h >= 1) h.st = 'hold'; }
          else if (h.st === 'hold') { h.t -= dt; if (h.t <= 0) { h.st = 'down'; if (h.kind !== 'bomb') { if (combo >= 3) E.pop(h.x, h.y - 60 * h.s, 'escaped', { color: '#94a3b8', size: 15 }); combo = 0; } } }
          else if (h.st === 'hit') { h.t -= dt; if (h.t <= 0.25) h.h = Math.max(0, h.h - dt * 5); if (h.t <= 0) h.st = 'down'; }
          else if (h.st === 'down') { h.h = Math.max(0, h.h - dt * 6); if (h.h <= 0) h.st = 'idle'; }
        }
        // input
        if (E.ptr.moved || E.ptr.hit) { hx = E.ptr.x; hy = E.ptr.y; }
        if (E.ptr.hit) {
          let bi = -1, bd = 1e9;
          holes.forEach((h, i) => {
            const cy = h.y - 55 * h.s * Math.max(h.h, 0.3), dx = (E.ptr.x - h.x) / (78 * h.s), dy = (E.ptr.y - cy) / (85 * h.s), d = dx * dx + dy * dy;
            if (d < 1 && d < bd) { bd = d; bi = i; }
          });
          if (bi >= 0) whack(bi); else { swing = 0; swings++; E.sfx('swish', 1.2, 0.5); }
        }
        KEYS.forEach((ks, i) => { if (E.hit(...ks)) whack(i); });
        swing = Math.min(1, swing + dt * 5);
      },
      draw(g) {
        const t = E.t;
        // sky & hills
        D.bg(g, W, 200, '#38bdf8', '#bae6fd');
        D.glow(g, 820, 60, 120, '#fef08a', 0.8); D.circle(g, 820, 60, 30, '#fef9c3');
        for (const c of clouds) { const x = U.wrap(c.x + T * 12 * c.s, -150, W + 150); g.fillStyle = 'rgba(255,255,255,.9)'; for (const [ox, oy, r] of [[0, 0, 26], [28, -10, 32], [58, 0, 24], [30, 8, 24]]) { g.beginPath(); g.arc(x + ox * c.s, c.y + oy * c.s, r * c.s, 0, U.TAU); g.fill(); } }
        g.fillStyle = '#65a30d'; g.beginPath(); g.moveTo(0, 170); for (let x = 0; x <= W; x += 20) g.lineTo(x, 150 + Math.sin(x * 0.008) * 22 + Math.sin(x * 0.021) * 8); g.lineTo(W, 200); g.lineTo(0, 200); g.fill();
        // fence
        for (let x = 10; x < W; x += 38) { D.fillRR(g, x, 150, 22, 58, 4, '#f5f5f4'); D.fillRR(g, x, 150, 22, 6, 3, '#fff'); }
        g.fillStyle = '#e7e5e4'; g.fillRect(0, 168, W, 8); g.fillRect(0, 192, W, 8);
        // lawn with mowing stripes
        const lg = g.createLinearGradient(0, 200, 0, H); lg.addColorStop(0, '#4d7c0f'); lg.addColorStop(1, '#3f6212'); g.fillStyle = lg; g.fillRect(0, 200, W, H - 200);
        for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)'; g.beginPath(); g.moveTo(W / 2 + (i - 6) * 40, 200); g.lineTo(W / 2 + (i - 5) * 40, 200); g.lineTo(W / 2 + (i - 5) * 140, H); g.lineTo(W / 2 + (i - 6) * 140, H); g.fill(); }
        for (const f of flowers) { g.fillStyle = f.c; for (let k = 0; k < 5; k++) { const a = (k / 5) * U.TAU; g.beginPath(); g.arc(f.x + Math.cos(a) * f.s, f.y + Math.sin(a) * f.s, f.s * 0.7, 0, U.TAU); g.fill(); } D.circle(g, f.x, f.y, f.s * 0.6, '#fde047'); }
        // holes & moles, back to front
        holes.forEach((h) => {
          const s = h.s, rx = 74 * s, ry = 26 * s;
          D.shadow(g, h.x, h.y + 6 * s, rx * 1.15, ry * 1.3, 0.25);
          g.fillStyle = '#78350f'; g.beginPath(); g.ellipse(h.x, h.y, rx * 1.12, ry * 1.25, 0, 0, U.TAU); g.fill();
          g.fillStyle = '#1c0a02'; g.beginPath(); g.ellipse(h.x, h.y, rx, ry, 0, 0, U.TAU); g.fill();
          if (h.h > 0.01) {
            g.save();
            g.beginPath(); g.rect(h.x - 120 * s, h.y - 220 * s, 240 * s, 220 * s); g.ellipse(h.x, h.y, rx, ry, 0, 0, Math.PI); g.clip();
            const by = h.y + (1 - U.ease.outBack(Math.min(1, h.h))) * 130 * s + 10 * s;
            drawMole(g, h, h.x + Math.sin(h.wob * 30) * 6 * h.wob, by, s, t);
            g.restore();
          }
          // front lip
          g.strokeStyle = '#a16207'; g.lineWidth = 7 * s; g.beginPath(); g.ellipse(h.x, h.y, rx * 1.06, ry * 1.18, 0, 0.05, Math.PI - 0.05); g.stroke();
          g.fillStyle = '#92400e'; for (let k = 0; k < 6; k++) { const a = 0.3 + k * 0.5; g.beginPath(); g.arc(h.x + Math.cos(a) * rx * 1.1, h.y + Math.sin(a) * ry * 1.2, 5 * s, 0, U.TAU); g.fill(); }
        });
        // timer bar
        const k = Math.max(0, time / DUR);
        D.fillRR(g, W / 2 - 200, 16, 400, 14, 7, 'rgba(0,0,0,.35)');
        D.fillRR(g, W / 2 - 200, 16, 400 * k, 14, 7, k < 0.15 ? (Math.sin(T * 16) > 0 ? '#ef4444' : '#fca5a5') : '#fde047');
        D.text(g, Math.ceil(Math.max(0, time)), W / 2, 48, { size: 22, color: '#fff', stroke: 'rgba(0,0,0,.5)', lw: 5 });
        if (combo >= 3) D.text(g, `${combo} COMBO  ×${mult()}`, 24, 34, { size: 22, align: 'left', color: '#d9f99d', stroke: 'rgba(0,0,0,.5)', lw: 5 });
        // hammer
        g.save(); g.translate(hx + 70, hy + 70); g.rotate(0.8 * U.ease.outCubic(swing));
        D.line(g, 0, 0, -70, -70, '#7c2d12', 11); D.line(g, 0, 0, -70, -70, '#b45309', 6);
        g.save(); g.translate(-70, -70); g.rotate(-Math.PI / 4);
        D.fillRR(g, -40, -22, 80, 44, 10, '#dc2626'); D.fillRR(g, -40, -22, 80, 14, 8, '#f87171');
        D.fillRR(g, -44, -24, 12, 48, 5, '#9ca3af'); D.fillRR(g, 32, -24, 12, 48, 5, '#9ca3af');
        g.restore(); g.restore();
      },
    };
    function drawMole(g, h, x, y, s, t) {
      const kind = h.kind;
      g.save(); g.translate(x, y); g.scale(s, s);
      if (kind === 'bomb' || kind === 'boom') {
        D.orb(g, 0, -70, 50, '#1f2937', 0.3);
        D.line(g, 10, -118, 24, -140, '#a16207', 6);
        if (kind === 'bomb') { D.glow(g, 26, -144, 26 + Math.sin(t * 30) * 6, '#fb923c', 1); D.circle(g, 26, -144, 5, '#fef3c7'); }
        D.text(g, '!', 0, -68, { size: 44, color: '#ef4444' });
        g.restore(); return;
      }
      const fur = kind === 'gold' ? '#f59e0b' : '#8b5a2b', belly = kind === 'gold' ? '#fde68a' : '#d6a370';
      if (kind === 'gold') D.glow(g, 0, -70, 110, '#fde047', 0.5 + 0.2 * Math.sin(t * 8));
      // body
      g.fillStyle = fur; g.beginPath(); g.ellipse(0, -40, 52, 80, 0, 0, U.TAU); g.fill();
      g.fillStyle = belly; g.beginPath(); g.ellipse(0, -10, 34, 50, 0, 0, U.TAU); g.fill();
      // paws on the rim
      for (const sx of [-1, 1]) { g.fillStyle = '#fca5a5'; g.beginPath(); g.ellipse(sx * 36, -22, 13, 9, sx * 0.3, 0, U.TAU); g.fill(); }
      // face
      const hurt = h.st === 'hit';
      if (hurt) { for (const sx of [-1, 1]) { D.line(g, sx * 20 - 7, -84, sx * 20 + 7, -72, '#111', 4); D.line(g, sx * 20 + 7, -84, sx * 20 - 7, -72, '#111', 4); } }
      else { for (const sx of [-1, 1]) { D.circle(g, sx * 19, -78, 9, '#fff'); D.circle(g, sx * 19 + 2, -77, 5, '#111'); D.circle(g, sx * 19 + 4, -80, 2, '#fff'); } }
      g.fillStyle = '#fbcfe8'; g.beginPath(); g.ellipse(0, -58, 22, 15, 0, 0, U.TAU); g.fill();
      D.circle(g, 0, -63, 8, '#be185d');
      D.fillRR(g, -7, -50, 6, 10, 2, '#fff'); D.fillRR(g, 1, -50, 6, 10, 2, '#fff');
      for (const sx of [-1, 1]) for (const dy of [-4, 3]) D.line(g, sx * 18, -58 + dy, sx * 40, -60 + dy * 2, 'rgba(0,0,0,.4)', 1.5);
      if (kind === 'helmet') {
        const dent = h.hp < 2;
        g.fillStyle = dent ? '#9ca3af' : '#cbd5e1'; g.beginPath(); g.arc(0, -96, 50, Math.PI, 0); g.closePath(); g.fill();
        D.fillRR(g, -58, -100, 116, 12, 5, dent ? '#6b7280' : '#94a3b8');
        D.circle(g, 0, -130, 8, '#ef4444');
        if (dent) { D.line(g, -10, -138, 4, -118, '#374151', 3); D.line(g, 4, -118, -6, -104, '#374151', 3); }
      }
      if (kind === 'gold') { D.star(g, 0, -122, 16, 7, 5, -Math.PI / 2, '#fde047', '#fff'); }
      if (h.dizzy > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + (i / 3) * U.TAU; D.star(g, Math.cos(a) * 40, -125 + Math.sin(a) * 10, 9, 4, 5, a, '#fde047'); }
      g.restore();
    }
  },
});

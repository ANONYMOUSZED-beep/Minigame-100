MG.add({
  id: 'skyhop', name: 'Sky Hopper', cat: 'Runner', color: '#4ade80', color2: '#60a5fa',
  desc: 'Bounce ever upward from cloud to cloud — through sunset, night and out into space.',
  how: ['Steer with <kbd>←</kbd> <kbd>→</kbd> or by moving the mouse / dragging', 'Tap or <kbd>Space</kbd> to shoot pellets upward', 'Brown clouds crumble · springs & jetpacks launch you', 'Stomp monsters from above — touching them from the side is fatal'],
  w: 540, h: 800, pad: 'LRA', padLabels: { A: 'SHOOT' },
  make(E) {
    const W = 540, H = 800, GRAV = 1500, JUMP = -880;
    const pl = { x: W / 2, y: 640, vx: 0, vy: JUMP, face: 1, squash: 0, jet: 0, dead: false, shoot: 0 };
    let plats = [], monsters = [], items = [], pellets = [], holes = [], cam = 0, topY = 700, best = 0, usePtr = false, clouds = [];
    for (let i = 0; i < 16; i++) clouds.push({ x: U.rand(W), y: U.rand(-4000, 800), s: U.rand(0.5, 1.4), p: U.rand(0.1, 0.4) });
    const stars = D.makeStars(160, W, H, 71);
    function addPlat(y) {
      const h = -y / 10, diff = Math.min(1, h / 5000);
      let type = 'normal';
      const r = Math.random();
      if (h > 150 && r < 0.12 + diff * 0.15) type = 'moving';
      else if (h > 300 && r < 0.22 + diff * 0.15) type = 'break';
      else if (h > 800 && r < 0.3 + diff * 0.1) type = 'vanish';
      const p = { x: U.rand(10, W - 90), y, w: 80, type, vx: type === 'moving' ? U.pick([-1, 1]) * U.rand(60, 120 + diff * 80) : 0, broken: 0, used: false };
      plats.push(p);
      if (type !== 'break') {
        if (Math.random() < 0.08) items.push({ kind: 'spring', p, ox: U.rand(10, 50) });
        else if (h > 400 && Math.random() < 0.015) items.push({ kind: 'jet', p, ox: 30 });
        else if (h > 250 && Math.random() < 0.06 + diff * 0.06) monsters.push({ x: p.x + 40, y: y - 60, t: 0, hp: 1, bob: U.rand(6), vx: U.chance(0.5) ? U.rand(40, 90) : 0 });
      }
      if (h > 1200 && Math.random() < 0.012) holes.push({ x: U.rand(60, W - 60), y: y - 140, t: 0 });
      // guarantee a reachable safe platform when breakables appear
      if (type === 'break') { const q = { x: U.rand(10, W - 90), y: y - U.rand(20, 50), w: 80, type: 'normal', vx: 0 }; plats.push(q); }
    }
    for (let y = 740; y > -200; y -= 70) addPlat(y);
    plats.push({ x: W / 2 - 40, y: 720, w: 80, type: 'normal', vx: 0 });
    topY = -200;
    function bounce(v) { pl.vy = v; pl.squash = 1; E.sfx(v < -1200 ? 'power' : 'jump', v < -1200 ? 1 : 1 + Math.random() * 0.1, 0.6); }
    function die(msg) { if (pl.dead) return; pl.dead = msg; E.sfx('lose'); E.vibrate(200); E.after(1.2, () => E.over({ msg: `Height ${best} · ${msg}` })); }
    return {
      update(dt) {
        // input
        const ax = E.axis().x;
        if (ax) { usePtr = false; pl.face = ax; }
        if (E.ptr.moved) usePtr = true;
        if (usePtr) { const dx = U.wrap(E.ptr.x - pl.x + W / 2, 0, W) - W / 2; pl.vx = U.clamp(dx * 7, -520, 520); if (Math.abs(dx) > 4) pl.face = Math.sign(dx); }
        else pl.vx = U.damp(pl.vx, ax * 440, 10, dt);
        pl.shoot -= dt;
        if ((E.hit('A', 'U') || (E.ptr.hit && E.ptr.y < H * 0.85)) && pl.shoot <= 0 && !pl.dead) { pellets.push({ x: pl.x, y: pl.y - 20, vy: -900 }); pl.shoot = 0.18; E.sfx('shoot', 1.8, 0.4); pl.face = 0; }
        // physics
        if (pl.jet > 0) { pl.jet -= dt; pl.vy = -1150; E.burst(pl.x, pl.y + 24, { n: 2, colors: ['#fde68a', '#f97316'], speed: 160, angle: Math.PI / 2, spread: 0.6, life: 0.4 }); if (Math.random() < 0.3) E.sfx('engine', 2, 1); }
        else pl.vy += GRAV * dt;
        pl.x = U.wrap(pl.x + pl.vx * dt, 0, W); pl.y += pl.vy * dt;
        pl.squash = U.damp(pl.squash, 0, 10, dt);
        // platforms
        for (const p of plats) {
          if (p.vx) { p.x += p.vx * dt; if (p.x < 0 || p.x + p.w > W) { p.vx = -p.vx; p.x = U.clamp(p.x, 0, W - p.w); } }
          if (p.broken) p.broken += dt;
          if (!pl.dead && pl.vy > 0 && !p.broken && !(p.type === 'vanish' && p.used) && pl.x > p.x - 12 && pl.x < p.x + p.w + 12 && pl.y + 22 >= p.y && pl.y + 22 - pl.vy * dt <= p.y + 6) {
            if (p.type === 'break') { p.broken = 0.01; E.sfx('thud', 1.3); E.burst(p.x + p.w / 2, p.y, { n: 10, color: '#a16207', shape: 'square', speed: 120, grav: 800 }); continue; }
            const spring = items.find((it) => it.kind === 'spring' && it.p === p && Math.abs(pl.x - (p.x + it.ox + 8)) < 20);
            if (spring) { spring.used = 0.2; bounce(-1650); }
            else bounce(JUMP);
            pl.y = p.y - 22;
            if (p.type === 'vanish') { p.used = true; E.burst(p.x + p.w / 2, p.y, { n: 16, color: '#fff', speed: 120 }); }
          }
        }
        // items
        for (const it of items) {
          if (it.kind === 'jet' && !it.taken && !pl.dead && U.dist(pl.x, pl.y, it.p.x + it.ox, it.p.y - 22) < 30) { it.taken = true; pl.jet = 2.6; E.sfx('charge', 1.2); E.pop(pl.x, pl.y - 40, 'JETPACK!', { color: '#fde68a' }); }
          if (it.used) it.used = Math.max(0, it.used - dt);
        }
        // monsters
        for (const m of monsters) {
          if (m.dead) { m.y += 600 * dt; continue; }
          m.t += dt; if (m.vx) { m.x += m.vx * dt; if (m.x < 30 || m.x > W - 30) m.vx = -m.vx; }
          const my = m.y + Math.sin(m.t * 3 + m.bob) * 6;
          if (!pl.dead && U.dist(pl.x, pl.y, m.x, my) < 34) {
            if (pl.vy > 0 && pl.y < my - 8 || pl.jet > 0) { m.dead = true; bounce(JUMP * 1.1); E.score += 100; E.pop(m.x, my - 20, '+100', { color: '#fde68a' }); E.burst(m.x, my, { n: 20, colors: ['#a855f7', '#fff'], speed: 220 }); }
            else { die('caught by a monster'); pl.vy = 200; }
          }
        }
        for (let i = pellets.length - 1; i >= 0; i--) {
          const b = pellets[i]; b.y += b.vy * dt;
          const m = monsters.find((m) => !m.dead && U.dist(b.x, b.y, m.x, m.y) < 30);
          if (m) { m.dead = true; pellets.splice(i, 1); E.score += 50; E.sfx('pop'); E.burst(m.x, m.y, { n: 20, colors: ['#a855f7', '#fff'], speed: 220 }); continue; }
          if (b.y < cam - 50) pellets.splice(i, 1);
        }
        for (const h of holes) { h.t += dt; const d = U.dist(pl.x, pl.y, h.x, h.y); if (!pl.dead && d < 120 && pl.jet <= 0) { pl.x += ((h.x - pl.x) / d) * 300 * dt; pl.y += ((h.y - pl.y) / d) * 300 * dt; if (d < 26) { die('lost in a black hole'); pl.sucked = h; E.sfx('whoosh', 0.5); } } }
        if (pl.sucked) { pl.x = U.damp(pl.x, pl.sucked.x, 6, dt); pl.y = U.damp(pl.y, pl.sucked.y, 6, dt); pl.vy = 0; }
        // camera
        const target = pl.y - H * 0.42;
        if (target < cam) cam = target;
        const h = Math.max(0, Math.round((700 - pl.y) / 10));
        if (h > best) { E.score += h - best; best = h; E.stat('Height', best); }
        while (topY > cam - 200) { const gap = U.rand(40, 70) + Math.min(125, best * 0.03); topY -= gap; addPlat(topY); }
        plats = plats.filter((p) => p.y < cam + H + 60 && !(p.broken > 1));
        monsters = monsters.filter((m) => m.y < cam + H + 80);
        items = items.filter((it) => it.p.y < cam + H + 60);
        holes = holes.filter((h) => h.y < cam + H + 150);
        if (!pl.dead && pl.y > cam + H + 30) { die('fell into the clouds'); E.sfx('whoosh', 0.4); }
      },
      draw(g) {
        const t = E.t, alt = Math.max(0, -cam);
        const k1 = U.clamp(alt / 12000, 0, 1), k2 = U.clamp((alt - 12000) / 12000, 0, 1), k3 = U.clamp((alt - 24000) / 14000, 0, 1);
        const top = k3 > 0 ? U.mix('#0b1026', '#020008', k3) : k2 > 0 ? U.mix('#7c3aed', '#0b1026', k2) : U.mix('#38bdf8', '#7c3aed', k1);
        const bot = k3 > 0 ? U.mix('#1e1b4b', '#0b0520', k3) : k2 > 0 ? U.mix('#fb923c', '#1e1b4b', k2) : U.mix('#bae6fd', '#fb923c', k1);
        D.bg(g, W, H, top, bot);
        if (k2 > 0.2) { g.globalAlpha = Math.min(1, k2 * 1.5); D.stars(g, stars, W, H, t, 0, -cam * 0.05); g.globalAlpha = 1; }
        for (const c of clouds) { const y = U.wrap(c.y - cam * c.p, -100, H + 100); g.globalAlpha = 0.3 * (1 - k2); for (let k = 0; k < 4; k++) D.circle(g, c.x + k * 24 * c.s, y + Math.sin(k * 2) * 6 * c.s, 22 * c.s, '#fff'); g.globalAlpha = 1; }
        g.save(); g.translate(0, -cam);
        for (const h of holes) { D.glow(g, h.x, h.y, 90, '#7c3aed', 0.6); D.circle(g, h.x, h.y, 30, '#000'); for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(167,139,250,${0.5 - k * 0.15})`; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, 34 + k * 8, h.t * (2 + k), h.t * (2 + k) + 4); g.stroke(); } }
        for (const p of plats) {
          if (p.type === 'vanish' && p.used) continue;
          const col = { normal: '#4ade80', moving: '#60a5fa', break: '#b45309', vanish: '#f8fafc' }[p.type];
          if (p.broken) { g.save(); g.globalAlpha = 1 - p.broken; D.fillRR(g, p.x - 4, p.y + p.broken * 300, p.w / 2, 16, 8, col); D.fillRR(g, p.x + p.w / 2 + 4, p.y + p.broken * 360, p.w / 2, 16, 8, col); g.restore(); continue; }
          D.fillRR(g, p.x, p.y + 4, p.w, 16, 8, U.shade(col, -0.35));
          D.fillRR(g, p.x, p.y, p.w, 16, 8, col);
          g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(p.x + 10, p.y + 3, p.w - 20, 3);
          if (p.type === 'break') { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x + 30, p.y); g.lineTo(p.x + 38, p.y + 8); g.lineTo(p.x + 34, p.y + 16); g.moveTo(p.x + 55, p.y); g.lineTo(p.x + 50, p.y + 16); g.stroke(); }
        }
        for (const it of items) {
          const x = it.p.x + it.ox, y = it.p.y;
          if (it.kind === 'spring') { const c = it.used ? 22 : 12; g.strokeStyle = '#94a3b8'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 4; k++) g.lineTo(x + (k % 2 ? 16 : 0), y - (k / 4) * c); g.stroke(); D.fillRR(g, x - 2, y - c - 4, 20, 5, 2, '#e2e8f0'); }
          else if (!it.taken) { D.glow(g, x, y - 22, 26, '#fde68a', 0.6); D.fillRR(g, x - 12, y - 40, 10, 26, 4, '#94a3b8'); D.fillRR(g, x + 2, y - 40, 10, 26, 4, '#94a3b8'); D.fillRR(g, x - 12, y - 42, 24, 6, 3, '#ef4444'); }
        }
        for (const m of monsters) {
          const my = m.y + Math.sin(m.t * 3 + m.bob) * 6;
          g.save(); g.translate(m.x, my); if (m.dead) g.rotate(t * 10);
          D.glow(g, 0, 0, 40, '#a855f7', 0.35);
          g.fillStyle = '#7c3aed'; g.beginPath(); g.ellipse(0, 0, 30, 20, 0, 0, U.TAU); g.fill();
          for (let k = -2; k <= 2; k++) D.poly(g, [[k * 11 - 5, 14], [k * 11, 26 + Math.sin(t * 10 + k) * 3], [k * 11 + 5, 14]], '#6d28d9');
          D.circle(g, -9, -4, 7, '#fff'); D.circle(g, 9, -4, 7, '#fff'); D.circle(g, -8, -3, 3, '#111'); D.circle(g, 10, -3, 3, '#111');
          D.poly(g, [[-8, 8], [-4, 12], [0, 8], [4, 12], [8, 8]], null, '#fff', 2);
          g.restore();
        }
        for (const b of pellets) { D.glow(g, b.x, b.y, 12, '#fde68a', 0.8); D.circle(g, b.x, b.y, 4, '#fef3c7'); }
        // player
        if (!(pl.dead && pl.sucked && U.dist(pl.x, pl.y, pl.sucked.x, pl.sucked.y) < 6)) {
          g.save(); g.translate(pl.x, pl.y);
          if (pl.sucked) g.rotate(t * 12);
          g.scale(1 + pl.squash * 0.25, 1 - pl.squash * 0.25);
          const f = pl.face || 1;
          if (pl.jet > 0) { D.fillRR(g, -f * 18 - 6, -8, 12, 22, 4, '#94a3b8'); D.glow(g, -f * 18, 20, 20, '#f97316', 0.9); }
          for (let k = -1; k <= 2; k++) D.fillRR(g, k * 8 - 6, 10, 4, 12, 2, '#15803d');
          D.fillRR(g, -18, -16, 36, 30, 12, '#4ade80');
          g.fillStyle = '#86efac'; g.fillRect(-12, -12, 24, 4);
          if (pl.face === 0) { D.fillRR(g, -5, -30, 10, 18, 4, '#4ade80'); D.circle(g, -7, -4, 3, '#111'); D.circle(g, 7, -4, 3, '#111'); }
          else { D.fillRR(g, f > 0 ? 10 : -26, -6, 16, 10, 4, '#22c55e'); D.circle(g, f * 4, -6, 5, '#fff'); D.circle(g, f * 6, -6, 2.5, '#111'); }
          g.restore();
        }
        E.fx.draw(g);
        g.restore();
        D.text(g, best, 24, 40, { size: 34, align: 'left', color: '#fff', stroke: 'rgba(0,0,0,.25)', lw: 6 });
      },
      manualFx: true,
    };
  },
});

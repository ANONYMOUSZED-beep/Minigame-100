MG.add({
  id: 'cityshield', name: 'City Shield', cat: 'Arcade', color: '#38bdf8', color2: '#f43f5e',
  desc: 'Missile Command reimagined. Paint the night sky with interceptor blasts and chain the destruction.',
  how: ['Click / tap the sky to launch an interceptor there', 'Blasts destroy anything they touch — and chain into more blasts', 'Three batteries, limited ammo per wave — the center one fires fastest', 'Keyboard: <kbd>←↑↓→</kbd> aim, <kbd>Space</kbd> fire'],
  make(E) {
    const W = 960, H = 600, GROUND = 548;
    const bats = [{ x: 70, ammo: 10, alive: true, sp: 420 }, { x: 480, ammo: 10, alive: true, sp: 720 }, { x: 890, ammo: 10, alive: true, sp: 420 }];
    const cities = [170, 255, 340, 620, 705, 790].map((x, i) => ({ x, alive: true, seed: i * 7 + 3 }));
    let wave = 0, enemies = [], shots = [], blasts = [], planes = [], toSpawn = 0, spawnT = 0, cross = { x: W / 2, y: 250 }, intermission = 0, bonusCity = 10000, over = false;
    const stars = D.makeStars(120, W, 380, 9);
    // skyline windows
    cities.forEach((c) => { const r = U.seeded(c.seed); c.blocks = Array.from({ length: 6 }, (_, i) => ({ x: -30 + i * 10 + r() * 3, w: 9 + r() * 5, h: 16 + r() * 30 })); c.win = Array.from({ length: 30 }, () => [r(), r(), r() < 0.6]); });
    function startWave() {
      wave++; E.stat('Wave', wave);
      bats.forEach((b) => { b.ammo = 10; b.alive = true; });
      toSpawn = 8 + wave * 3; spawnT = 1;
      E.banner('WAVE ' + wave, wave === 1 ? 'Defend the cities' : `${2 + Math.min(wave, 6)}× points`);
    }
    startWave();
    const mult = () => Math.min(1 + Math.floor((wave + 1) / 2), 6);
    function targets() { return [...cities.filter((c) => c.alive).map((c) => c.x), ...bats.filter((b) => b.alive).map((b) => b.x)]; }
    function spawnEnemy(x, y, tx, speed, kind = 'm') {
      const ty = GROUND;
      const d = Math.hypot(tx - x, ty - y);
      enemies.push({ x0: x, y0: y, x, y, tx, ty, vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, kind, split: kind === 'm' && wave > 1 && U.chance(0.18 + wave * 0.02) ? U.rand(150, 330) : 0 });
    }
    function fire(tx, ty) {
      if (over || intermission > 0) return;
      ty = Math.min(ty, GROUND - 40);
      let best = null, bd = 1e9;
      for (const b of bats) if (b.alive && b.ammo > 0) { const d = Math.abs(b.x - tx) * (b === bats[1] ? 0.8 : 1); if (d < bd) { bd = d; best = b; } }
      if (!best) { E.sfx('error', 1, 0.5); return; }
      best.ammo--;
      const sx = best.x, sy = GROUND - 22, d = Math.hypot(tx - sx, ty - sy);
      shots.push({ x: sx, y: sy, sx, sy, tx, ty, vx: ((tx - sx) / d) * best.sp, vy: ((ty - sy) / d) * best.sp, d, trav: 0 });
      E.sfx('shoot', 1.1, 0.7);
    }
    function blast(x, y, r = 50, color = null, chain = 0) { blasts.push({ x, y, r: 0, max: r, t: 0, chain, color }); E.sfx('explode', 1.3 + Math.random() * 0.3 - chain * 0.1, 0.5); E.shake(3); }
    function groundHit(x) {
      E.shake(14); E.flash('#f97316', 0.2);
      blast(x, GROUND - 8, 40, '#f97316');
      for (const c of cities) if (c.alive && Math.abs(c.x - x) < 36) { c.alive = false; E.sfx('boom'); E.burst(c.x, GROUND - 20, { n: 60, colors: ['#f97316', '#fbbf24', '#fff', '#78716c'], speed: 300, grav: 400, life: 1.3 }); E.vibrate(200); }
      for (const b of bats) if (b.alive && Math.abs(b.x - x) < 30) { b.alive = false; b.ammo = 0; E.burst(b.x, GROUND - 20, { n: 40, colors: ['#f97316', '#38bdf8'], speed: 260 }); }
      if (!cities.some((c) => c.alive) && !over) { over = true; E.after(1.5, () => E.over({ msg: `The last city fell on wave ${wave}` })); }
    }
    return {
      update(dt) {
        // aim
        if (E.ptr.moved || E.ptr.down) { cross.x = E.ptr.x; cross.y = E.ptr.y; }
        const a = E.axis(); cross.x = U.clamp(cross.x + a.x * 520 * dt, 10, W - 10); cross.y = U.clamp(cross.y + a.y * 520 * dt, 10, GROUND - 40);
        if (E.ptr.hit) fire(E.ptr.x, E.ptr.y);
        if (E.hit('A')) fire(cross.x, cross.y);
        // spawn
        if (intermission > 0) {
          intermission -= dt;
          if (intermission <= 0) startWave();
        } else if (!over) {
          spawnT -= dt;
          if (toSpawn > 0 && spawnT <= 0) {
            const burst = Math.min(toSpawn, U.ri(1, 2 + Math.floor(wave / 3)));
            const tg = targets();
            for (let i = 0; i < burst && tg.length; i++) { spawnEnemy(U.rand(20, W - 20), -10, U.pick(tg) + U.rand(-10, 10), 34 + wave * 7 + U.rand(0, 14)); toSpawn--; }
            spawnT = Math.max(0.6, 2.6 - wave * 0.18) * U.rand(0.6, 1.4);
            if (wave >= 2 && U.chance(0.12) && planes.length === 0) { const dir = U.chance(0.5) ? 1 : -1; planes.push({ x: dir > 0 ? -40 : W + 40, y: U.rand(90, 200), vx: dir * 90, drop: U.rand(1, 2.5), kind: U.chance(0.5) ? 'sat' : 'bomber' }); }
          }
          if (toSpawn <= 0 && !enemies.length && !planes.length && !blasts.length) {
            // tally
            const left = bats.reduce((s, b) => s + (b.alive ? b.ammo : 0), 0), alive = cities.filter((c) => c.alive).length;
            const bonus = (left * 5 + alive * 100) * mult();
            E.score += bonus; E.pop(W / 2, 300, `BONUS +${bonus}`, { color: '#fde68a', size: 30, life: 2 }); E.sfx('win');
            if (E.score >= bonusCity) { const dead = cities.find((c) => !c.alive); if (dead) { dead.alive = true; E.pop(dead.x, GROUND - 60, 'CITY REBUILT', { color: '#4ade80' }); } bonusCity += 10000; }
            intermission = 2.8;
          }
        }
        // planes
        for (let i = planes.length - 1; i >= 0; i--) {
          const p = planes[i]; p.x += p.vx * dt; p.drop -= dt;
          if (p.drop <= 0) { p.drop = U.rand(1.5, 3); const tg = targets(); if (tg.length) spawnEnemy(p.x, p.y, U.pick(tg), 40 + wave * 6); }
          if (blasts.some((b) => U.dist(b.x, b.y, p.x, p.y) < b.r + 14)) { E.score += 100 * mult(); E.pop(p.x, p.y, '+' + 100 * mult(), { color: '#fde68a' }); blast(p.x, p.y, 40, null, 1); planes.splice(i, 1); continue; }
          if (p.x < -60 || p.x > W + 60) planes.splice(i, 1);
        }
        // enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          const m = enemies[i];
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.split && m.y > m.split) {
            m.split = 0; const tg = targets(), n = U.ri(2, 3);
            for (let k = 0; k < n && tg.length; k++) spawnEnemy(m.x, m.y, U.pick(tg), Math.hypot(m.vx, m.vy));
            enemies.splice(i, 1); E.sfx('blip', 0.6); continue;
          }
          const hitB = blasts.find((b) => U.dist(b.x, b.y, m.x, m.y) < b.r);
          if (hitB) { E.score += 25 * mult(); blast(m.x, m.y, 34, null, hitB.chain + 1); if (hitB.chain + 1 >= 2) E.pop(m.x, m.y - 10, `CHAIN ×${hitB.chain + 1}`, { color: '#f0abfc', size: 16 }); enemies.splice(i, 1); continue; }
          if (m.y >= m.ty) { enemies.splice(i, 1); groundHit(m.x); }
        }
        // shots
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; const st = Math.hypot(s.vx, s.vy) * dt;
          s.trav += st; s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.trav >= s.d) { shots.splice(i, 1); blast(s.tx, s.ty, 52); }
        }
        for (let i = blasts.length - 1; i >= 0; i--) {
          const b = blasts[i]; b.t += dt;
          b.r = b.t < 0.45 ? b.max * U.ease.outCubic(b.t / 0.45) : b.t < 0.9 ? b.max : b.max * (1 - (b.t - 0.9) / 0.5);
          if (b.t > 1.4) blasts.splice(i, 1);
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#020617', '#1e1b4b');
        const hz = g.createLinearGradient(0, 300, 0, GROUND); hz.addColorStop(0, 'rgba(244,63,94,0)'); hz.addColorStop(1, 'rgba(244,63,94,.18)'); g.fillStyle = hz; g.fillRect(0, 300, W, GROUND - 300);
        D.stars(g, stars, W, 380, t);
        D.circle(g, 820, 90, 34, '#fef9c3'); D.circle(g, 834, 82, 30, '#0b1030'); D.glow(g, 820, 90, 100, '#fef9c3', 0.15);
        // enemy trails
        g.lineCap = 'round';
        for (const m of enemies) {
          const gr = g.createLinearGradient(m.x0, m.y0, m.x, m.y); gr.addColorStop(0, 'rgba(244,63,94,0)'); gr.addColorStop(1, 'rgba(244,63,94,.9)');
          g.strokeStyle = gr; g.lineWidth = 2.5; g.beginPath(); g.moveTo(m.x0, m.y0); g.lineTo(m.x, m.y); g.stroke();
          D.glow(g, m.x, m.y, 16, '#fda4af', 1); D.circle(g, m.x, m.y, 2.5, '#fff');
        }
        for (const s of shots) {
          D.line(g, s.sx, s.sy, s.x, s.y, 'rgba(56,189,248,.7)', 2);
          D.glow(g, s.x, s.y, 14, '#38bdf8', 1); D.circle(g, s.x, s.y, 2.5, '#fff');
          g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; const k = 5;
          g.beginPath(); g.moveTo(s.tx - k, s.ty - k); g.lineTo(s.tx + k, s.ty + k); g.moveTo(s.tx + k, s.ty - k); g.lineTo(s.tx - k, s.ty + k); g.stroke();
        }
        for (const p of planes) {
          g.save(); g.translate(p.x, p.y); g.scale(Math.sign(p.vx), 1);
          if (p.kind === 'sat') { D.fillRR(g, -10, -8, 20, 16, 4, '#94a3b8'); g.fillStyle = '#1d4ed8'; g.fillRect(-30, -4, 18, 8); g.fillRect(12, -4, 18, 8); D.circle(g, 0, 0, 3, Math.sin(t * 10) > 0 ? '#f43f5e' : '#fff'); }
          else { D.poly(g, [[-26, 0], [22, -4], [28, 0], [22, 4]], '#64748b'); D.poly(g, [[-2, 0], [-14, -16], [-6, -16], [8, 0]], '#475569'); D.poly(g, [[-2, 0], [-14, 16], [-6, 16], [8, 0]], '#475569'); D.circle(g, -26, 0, 2, Math.sin(t * 10) > 0 ? '#f43f5e' : '#fff'); }
          g.restore();
        }
        for (const b of blasts) {
          const hue = (t * 900 + b.x) % 360;
          const col = b.color || U.hsl(hue, 100, 65);
          D.glow(g, b.x, b.y, b.r * 2.2, col, 0.5);
          const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.r));
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, col); gr.addColorStop(1, U.rgba(b.color || '#a855f7', 0.1));
          g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, Math.max(0, b.r), 0, U.TAU); g.fill();
        }
        // ground
        g.fillStyle = '#0f172a';
        g.beginPath(); g.moveTo(0, H); g.lineTo(0, GROUND);
        for (let x = 0; x <= W; x += 20) { const bump = bats.some((b) => Math.abs(b.x - x) < 50) ? -18 * Math.cos(((x - bats.find((b) => Math.abs(b.x - x) < 50).x) / 50) * Math.PI / 2) : Math.sin(x * 0.03) * 3; g.lineTo(x, GROUND + bump); }
        g.lineTo(W, H); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(56,189,248,.35)'; g.lineWidth = 2; g.stroke();
        // cities
        for (const c of cities) {
          if (!c.alive) { g.fillStyle = '#1e293b'; for (let i = 0; i < 5; i++) g.fillRect(c.x - 26 + i * 11, GROUND - 6 - (i % 2) * 4, 9, 8); if (Math.random() < 0.3) E.burst(c.x + U.rand(-20, 20), GROUND - 8, { n: 1, color: 'rgba(120,113,108,.6)', speed: 20, vy: -40, life: 1.5, size: 5, glow: false, drag: 0.5 }); continue; }
          D.glow(g, c.x, GROUND - 20, 60, '#38bdf8', 0.12);
          for (const b of c.blocks) { g.fillStyle = '#1e3a5f'; g.fillRect(c.x + b.x, GROUND - b.h, b.w, b.h); }
          c.win.forEach(([u, v, on], i) => { if (!on) return; const b = c.blocks[i % 6]; g.fillStyle = (Math.sin(t * 0.5 + i) > -0.9) ? '#fde68a' : '#334155'; g.fillRect(c.x + b.x + 2 + ((u * (b.w - 4)) | 0), GROUND - b.h + 3 + ((v * (b.h - 6)) | 0), 2, 3); });
        }
        // batteries
        for (const b of bats) {
          const y = GROUND - 18;
          if (!b.alive) { D.text(g, 'X', b.x, y + 6, { size: 18, color: '#f43f5e' }); continue; }
          const ang = Math.atan2(cross.y - y, cross.x - b.x);
          g.save(); g.translate(b.x, y); g.rotate(ang); D.fillRR(g, 0, -4, 26, 8, 3, '#7dd3fc'); g.restore();
          D.circle(g, b.x, y, 13, '#0ea5e9'); D.circle(g, b.x, y - 3, 8, '#7dd3fc');
          for (let i = 0; i < b.ammo; i++) { const row = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3, inRow = [4, 3, 2, 1][row], k = i - [0, 4, 7, 9][row]; g.fillStyle = '#e0f2fe'; g.fillRect(b.x - inRow * 5 + k * 10 + 2, GROUND + 14 + row * 8, 5, 6); }
        }
        // crosshair
        const cx = cross.x, cy = cross.y;
        g.strokeStyle = '#e0f2fe'; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, 12, 0, U.TAU); g.moveTo(cx - 20, cy); g.lineTo(cx - 6, cy); g.moveTo(cx + 6, cy); g.lineTo(cx + 20, cy); g.moveTo(cx, cy - 20); g.lineTo(cx, cy - 6); g.moveTo(cx, cy + 6); g.lineTo(cx, cy + 20); g.stroke();
        D.text(g, `×${mult()}`, W - 20, 24, { size: 16, align: 'right', color: '#fde68a', font: 'mono' });
        D.vignette(g, W, H, 0.4);
      },
    };
  },
});

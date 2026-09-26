MG.add({
  id: 'coreguard', name: 'Core Guard', cat: 'Action', color: '#2dd4bf', color2: '#f472b6',
  desc: 'Radial pong-defense. Swing a shield around a fragile core, deflect fire back into the drones circling it.',
  how: ['Aim the shield with the mouse / touch, or rotate with <kbd>←</kbd> <kbd>→</kbd>', 'Deflected shots fly outward — steer them into drones for big points', 'Green orbs are repairs: let them reach the core', '<kbd>Space</kbd> triggers a shockwave when the charge is full'],
  pad: 'LRA', padLabels: { A: 'WAVE' },
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2, R = 92, CORE = 34;
    let shield = { a: -Math.PI / 2, w: 0.62, flash: 0 }, shots = [], drones = [], hp = 100, wave = 0, spawnT = 1, charge = 0, combo = 0, usePtr = false, pulse = 0, shock = 0, droneT = 0;
    const stars = D.makeStars(140, W, H, 8);
    function newWave() {
      wave++; E.stat('Wave', wave);
      const n = Math.min(2 + wave, 9);
      for (let i = 0; i < n; i++) drones.push({ a: (i / n) * U.TAU, r: 250 + (i % 2) * 40, sp: (0.25 + wave * 0.03) * (i % 2 ? -1 : 1), hp: 1 + Math.floor(wave / 4), cd: U.rand(1.5, 4), flash: 0 });
      E.banner('WAVE ' + wave, `${n} drones`, { color: '#2dd4bf' });
    }
    newWave();
    E.stat('Core', '100%');
    function fireAtCore(x, y, kind = 'shot') {
      const a = U.ang(x, y, CX, CY), sp = kind === 'fast' ? 260 + wave * 10 : kind === 'heal' ? 110 : 150 + wave * 8;
      shots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, out: false, hp: kind === 'heavy' ? 2 : 1, trail: [] });
    }
    function deflect(s, hitA) {
      const sp = Math.hypot(s.vx, s.vy) * 1.15 + 40;
      const n = hitA, off = U.angDiff(shield.a, hitA);
      const outA = n + off * 1.2;
      s.vx = Math.cos(outA) * sp; s.vy = Math.sin(outA) * sp; s.out = true;
      combo++; charge = Math.min(1, charge + 0.06);
      E.score += 10 * Math.min(combo, 10);
      shield.flash = 1;
      const x = CX + Math.cos(hitA) * R, y = CY + Math.sin(hitA) * R;
      E.burst(x, y, { n: 14, colors: ['#2dd4bf', '#fff'], speed: 220, angle: outA, spread: 1.2 });
      E.sfx('bounce', 1 + Math.min(combo, 15) * 0.04); E.shake(2);
      if (combo > 1 && combo % 5 === 0) E.pop(x, y - 20, `${combo} CHAIN`, { color: '#fde68a', size: 16 });
    }
    return {
      update(dt) {
        shield.flash = Math.max(0, shield.flash - dt * 4); pulse += dt; shock = Math.max(0, shock - dt * 1.5);
        const ax = E.axis().x;
        if (ax) { usePtr = false; shield.a += ax * 5 * dt; }
        if (E.ptr.moved || E.ptr.down) usePtr = true;
        if (usePtr) { const ta = U.ang(CX, CY, E.ptr.x, E.ptr.y); shield.a += U.clamp(U.angDiff(shield.a, ta), -14 * dt, 14 * dt); }
        if (E.hit('A') && charge >= 1) {
          charge = 0; shock = 1; E.sfx('boom', 1.2); E.flash('#2dd4bf', 0.35); E.shake(12);
          for (const s of shots) if (!s.out && s.kind !== 'heal') { const a = U.ang(CX, CY, s.x, s.y), sp = 380; s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.out = true; }
        }
        // drones orbit & shoot
        for (const d of drones) {
          d.a += d.sp * dt; d.flash = Math.max(0, d.flash - dt * 4); d.cd -= dt;
          if (d.cd <= 0) {
            d.cd = U.rand(2.2, 4.5) / (1 + wave * 0.08);
            const x = CX + Math.cos(d.a) * d.r, y = CY + Math.sin(d.a) * d.r;
            const roll = Math.random(); const kind = roll < 0.08 ? 'heal' : wave > 2 && roll < 0.25 ? 'fast' : wave > 4 && roll < 0.38 ? 'heavy' : 'shot';
            fireAtCore(x, y, kind); if (kind !== 'heal') E.sfx('laser', 1.4, 0.2);
          }
        }
        // stray meteors from off-screen too
        spawnT -= dt;
        if (spawnT <= 0) { spawnT = Math.max(0.7, 3 - wave * 0.2); const a = U.rand(U.TAU); fireAtCore(CX + Math.cos(a) * 560, CY + Math.sin(a) * 560, U.chance(0.1) ? 'heal' : 'shot'); }
        // shots
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          const px = s.x, py = s.y;
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.trail.push([s.x, s.y]); if (s.trail.length > 8) s.trail.shift();
          const d0 = U.dist(px, py, CX, CY), d1 = U.dist(s.x, s.y, CX, CY);
          if (!s.out && d0 >= R && d1 < R + 8 && s.kind !== 'heal') {
            const a = U.ang(CX, CY, s.x, s.y);
            if (Math.abs(U.angDiff(shield.a, a)) < shield.w / 2 + 0.05) {
              s.hp--;
              if (s.hp <= 0 || s.kind !== 'heavy') deflect(s, a);
              else { const na = a; s.vx = Math.cos(na) * 120; s.vy = Math.sin(na) * 120; s.hp = 1; s.kind = 'shot'; E.sfx('thud', 1.3, 0.6); shield.flash = 1; E.burst(CX + Math.cos(a) * R, CY + Math.sin(a) * R, { n: 10, color: '#f97316', speed: 160 }); }
              continue;
            }
          }
          if (!s.out && d1 < CORE) {
            shots.splice(i, 1);
            if (s.kind === 'heal') { hp = Math.min(100, hp + 15); E.sfx('power'); E.pop(CX, CY - 50, '+15', { color: '#4ade80' }); E.ring(CX, CY, { color: '#4ade80', r: 80 }); }
            else { const dmg = s.kind === 'heavy' ? 20 : 10; hp -= dmg; combo = 0; E.sfx('hurt'); E.shake(10); E.flash('#f472b6', 0.3); E.burst(CX, CY, { n: 30, colors: ['#f472b6', '#fff'], speed: 250 }); E.vibrate(100); }
            E.stat('Core', Math.max(0, hp) + '%');
            if (hp <= 0) { E.over({ msg: `Core breached on wave ${wave}` }); return; }
            continue;
          }
          if (s.out) {
            let hitD = false;
            for (const d of drones) { const dx = CX + Math.cos(d.a) * d.r, dy = CY + Math.sin(d.a) * d.r; if (U.dist(s.x, s.y, dx, dy) < 22) { d.hp--; d.flash = 1; hitD = true; E.sfx('hit'); E.burst(dx, dy, { n: 20, colors: ['#f472b6', '#fde68a'], speed: 200 }); if (d.hp <= 0) { d.dead = true; E.score += 250 * wave; E.pop(dx, dy - 20, `+${250 * wave}`, { color: '#fde68a', size: 20 }); E.ring(dx, dy, { color: '#f472b6', r: 60 }); E.sfx('explode'); E.shake(6); charge = Math.min(1, charge + 0.2); } break; } }
            if (hitD) { shots.splice(i, 1); continue; }
          }
          if (s.x < -600 || s.x > W + 600 || s.y < -600 || s.y > H + 600) shots.splice(i, 1);
        }
        drones = drones.filter((d) => !d.dead);
        if (!drones.length) { droneT += dt; if (droneT > 1.5) { droneT = 0; E.score += 500 * wave; E.sfx('win'); newWave(); } }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#0b2530', '#03060a');
        D.stars(g, stars, W, H, t);
        for (let k = 0; k < 3; k++) D.circle(g, CX, CY, 250 + k * 40 - 20 + 20, null, 'rgba(45,212,191,.06)', 1);
        // core
        const cp = 1 + Math.sin(pulse * 3) * 0.05, hk = hp / 100;
        D.glow(g, CX, CY, 150 * cp, U.mix('#f472b6', '#2dd4bf', hk), 0.45);
        D.orb(g, CX, CY, CORE * cp, U.mix('#be185d', '#0d9488', hk));
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(CX, CY, CORE * cp + 8, -Math.PI / 2, -Math.PI / 2 + hk * U.TAU); g.stroke();
        // shield orbit track
        D.circle(g, CX, CY, R, null, 'rgba(45,212,191,.12)', 1.5);
        g.lineCap = 'round';
        g.strokeStyle = U.rgba('#2dd4bf', 0.25 + shield.flash * 0.3); g.lineWidth = 18; g.beginPath(); g.arc(CX, CY, R, shield.a - shield.w / 2, shield.a + shield.w / 2); g.stroke();
        g.strokeStyle = shield.flash > 0.3 ? '#fff' : '#5eead4'; g.lineWidth = 7; g.beginPath(); g.arc(CX, CY, R, shield.a - shield.w / 2, shield.a + shield.w / 2); g.stroke();
        if (shock > 0) { g.globalAlpha = shock; D.circle(g, CX, CY, R + (1 - shock) * 500, null, '#2dd4bf', 10 * shock); g.globalAlpha = 1; }
        // drones
        for (const d of drones) {
          const x = CX + Math.cos(d.a) * d.r, y = CY + Math.sin(d.a) * d.r;
          D.glow(g, x, y, 40, '#f472b6', 0.5);
          g.save(); g.translate(x, y); g.rotate(d.a + Math.PI / 2 + t);
          D.poly(g, [[0, -14], [12, 7], [0, 3], [-12, 7]], d.flash > 0 ? '#fff' : '#f472b6', '#fbcfe8', 1.5);
          g.restore();
          for (let k = 0; k < d.hp; k++) D.circle(g, x - (d.hp - 1) * 4 + k * 8, y + 22, 2, '#fbcfe8');
        }
        for (const s of shots) {
          const col = s.kind === 'heal' ? '#4ade80' : s.out ? '#5eead4' : s.kind === 'fast' ? '#fde68a' : s.kind === 'heavy' ? '#f97316' : '#f472b6';
          for (let i = 1; i < s.trail.length; i++) { g.strokeStyle = U.rgba(col, (i / s.trail.length) * 0.5); g.lineWidth = (i / s.trail.length) * 6; g.beginPath(); g.moveTo(s.trail[i - 1][0], s.trail[i - 1][1]); g.lineTo(s.trail[i][0], s.trail[i][1]); g.stroke(); }
          D.glow(g, s.x, s.y, 18, col, 0.9); D.circle(g, s.x, s.y, s.kind === 'heavy' ? 8 : 5, col); D.circle(g, s.x, s.y, 2.5, '#fff');
          if (s.kind === 'heal') D.text(g, '+', s.x, s.y, { size: 12, color: '#052e16' });
        }
        // charge meter
        g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 6; g.beginPath(); g.arc(CX, CY, 56, 0, U.TAU); g.stroke();
        g.strokeStyle = charge >= 1 ? '#fde68a' : '#2dd4bf'; g.beginPath(); g.arc(CX, CY, 56, -Math.PI / 2, -Math.PI / 2 + charge * U.TAU); g.stroke();
        if (charge >= 1) D.text(g, 'SPACE: SHOCKWAVE', CX, CY + 130, { size: 14, font: 'mono', color: '#fde68a', alpha: 0.6 + 0.4 * Math.sin(t * 8) });
        D.vignette(g, W, H, 0.55);
      },
    };
  },
});

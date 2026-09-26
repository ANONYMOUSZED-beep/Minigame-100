MG.add({
  id: 'starstrike', name: 'Star Strike', cat: 'Action', color: '#60a5fa', color2: '#f472b6',
  desc: 'A vertical shmup with power-ups, bullet patterns, screen-clearing bombs and a three-phase boss.',
  how: ['Move with mouse / touch drag or <kbd>←↑↓→</kbd> — you fire automatically', 'Hold <kbd>Shift</kbd> for precise slow movement (hitbox is the glowing core)', '<kbd>X</kbd> / <kbd>Space</kbd> bomb clears bullets · grab <b>P</b> to power up', 'A boss arrives every stage'],
  w: 640, h: 800, pad: 'LRUDB', padLabels: { B: 'BOMB' },
  make(E) {
    const W = 640, H = 800;
    const pl = { x: W / 2, y: H - 110, pow: 1, inv: 2, cd: 0, mcd: 0, dead: 0 };
    let shots = [], foes = [], bullets = [], items = [], lives = 3, bombs = 2, stage = 1, t = 0, next = 2, boss = null, waveIdx = 0, graze = 0, scroll = 0, bombT = 0, ptrOff = null, mouseMode = false;
    const stars = [D.makeStars(70, W, H, 1), D.makeStars(40, W, H, 2), D.makeStars(20, W, H, 3)];
    E.stat('Lives', lives); E.stat('Bombs', bombs); E.stat('Stage', stage);
    const diff = () => 1 + (stage - 1) * 0.35;
    function enemy(type, x, y, path, o = {}) {
      const base = { fighter: { hp: 2, r: 14, pts: 100, col: '#f472b6' }, gunship: { hp: 14, r: 24, pts: 500, col: '#a78bfa' }, kami: { hp: 1, r: 12, pts: 150, col: '#fb923c' }, cruiser: { hp: 45, r: 40, pts: 2000, col: '#34d399' } }[type];
      foes.push(Object.assign({ type, x, y, t: 0, path, cd: U.rand(0.5, 1.5), ...base, maxhp: base.hp * diff() }, o, { hp: base.hp * diff() }));
    }
    const WAVES = [
      () => { const x0 = U.rand(120, W - 120); for (let i = 0; i < 6; i++) enemy('fighter', x0, -30 - i * 50, (f, dt) => { f.y += 170 * dt; f.x = x0 + Math.sin(f.t * 3) * 110; }); },
      () => { const s = U.chance(0.5) ? 1 : -1; for (let i = 0; i < 7; i++) enemy('fighter', s > 0 ? -30 - i * 45 : W + 30 + i * 45, 120, (f, dt) => { f.x += s * 240 * dt; f.y = 120 + Math.sin((f.x / W) * Math.PI) * 260; }); },
      () => { for (let i = 0; i < 2 + Math.min(stage, 3); i++) { const tx = 100 + i * ((W - 200) / Math.max(1, 1 + Math.min(stage, 3))); enemy('gunship', tx, -40 - i * 30, (f, dt) => { if (f.t < 2.2) f.y = U.lerp(f.y, 150 + (i % 2) * 70, dt * 2); else if (f.t > 9) f.y += 110 * dt; f.x = tx + Math.sin(f.t) * 30; }, { gun: 'aim3' }); } },
      () => { for (let i = 0; i < 5; i++) enemy('kami', U.rand(60, W - 60), -30 - i * 60, (f, dt) => { if (f.t < 0.8) f.y += 120 * dt; else { if (!f.vx) { const a = U.ang(f.x, f.y, pl.x, pl.y); f.vx = Math.cos(a) * 420; f.vy = Math.sin(a) * 420; } f.x += f.vx * dt; f.y += f.vy * dt; } }); },
      () => enemy('cruiser', W / 2, -80, (f, dt) => { if (f.t < 3) f.y = U.lerp(f.y, 170, dt * 1.3); else if (f.t > 14) f.y += 60 * dt; f.x = W / 2 + Math.sin(f.t * 0.6) * 150; }, { gun: 'ring' }),
    ];
    function fire(x, y, a, sp = 220, kind = 'orb') { bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, grazed: false }); }
    function spawnBoss() {
      boss = { x: W / 2, y: -140, hp: 380 * diff(), max: 380 * diff(), t: 0, phase: 0, cd: 1, spin: 0 };
      E.banner('WARNING', 'Dreadnought approaching', { color: '#ef4444', life: 2.2 }); E.sfx('charge', 0.5); E.sfx('lose', 0.5, 0.5);
    }
    function bomb() {
      if (bombs <= 0 || pl.dead) return;
      bombs--; E.stat('Bombs', bombs); bombT = 1;
      E.sfx('boom'); E.flash('#fff', 0.7); E.shake(16);
      bullets.forEach((b) => E.burst(b.x, b.y, { n: 2, color: '#f9a8d4', speed: 80, size: 2 })); bullets = [];
      foes.forEach((f) => (f.hp -= 25)); if (boss) boss.hp -= 30;
      pl.inv = Math.max(pl.inv, 1.5);
    }
    function hitPlayer() {
      if (pl.inv > 0 || pl.dead) return;
      lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('explode', 0.8); E.shake(18); E.flash('#f472b6', 0.4); E.freeze(0.1); E.vibrate(220);
      E.burst(pl.x, pl.y, { n: 70, colors: ['#fff', '#60a5fa', '#f472b6'], speed: 380, shape: 'spark', life: 1.2 });
      if (pl.pow > 1) items.push({ x: pl.x, y: pl.y - 40, kind: 'P', vy: -60 });
      pl.pow = Math.max(1, pl.pow - 1); pl.dead = 1.5; bullets = [];
      if (lives <= 0) E.after(1.2, () => E.over({ msg: `Stage ${stage}` }));
    }
    function killFoe(f) {
      f.dead = true; E.score += f.pts;
      E.burst(f.x, f.y, { n: f.r > 30 ? 60 : 20, colors: [f.col, '#fde68a', '#fff'], speed: f.r > 30 ? 380 : 240, shape: 'spark' });
      E.sfx('explode', f.r > 30 ? 0.8 : 1.5, f.r > 30 ? 0.9 : 0.35); E.shake(f.r > 30 ? 10 : 3);
      if (f.type === 'gunship' || f.type === 'cruiser' || U.chance(0.04)) items.push({ x: f.x, y: f.y, kind: 'P', vy: -80 });
      const medals = f.type === 'cruiser' ? 8 : f.type === 'gunship' ? 3 : 1;
      for (let i = 0; i < medals; i++) items.push({ x: f.x + U.rand(-20, 20), y: f.y + U.rand(-20, 20), kind: 'M', vy: U.rand(-160, -60) });
    }
    return {
      update(dt) {
        t += dt; scroll += dt * 120;
        bombT = Math.max(0, bombT - dt);
        // player
        if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0 && lives > 0) { pl.dead = 0; pl.x = W / 2; pl.y = H - 110; pl.inv = 2.5; } }
        else {
          const slow = E.down('ShiftLeft', 'ShiftRight');
          const a = E.axis(), sp = slow ? 170 : 380;
          pl.x += a.x * sp * dt; pl.y += a.y * sp * dt;
          if (E.ptr.hit) ptrOff = [pl.x - E.ptr.x, pl.y - E.ptr.y];
          if (E.ptr.down && ptrOff) { const tx = E.ptr.x + ptrOff[0], ty = E.ptr.y + ptrOff[1]; pl.x = U.damp(pl.x, tx, 22, dt); pl.y = U.damp(pl.y, ty, 22, dt); }
          else if (E.ptr.type === 'mouse' && E.ptr.moved && !E.ptr.down) ptrOff = null;
          if (a.x || a.y) mouseMode = false; else if (E.ptr.type === 'mouse' && E.ptr.moved) mouseMode = true;
          if (mouseMode && !E.ptr.down) { pl.x = U.damp(pl.x, E.ptr.x, 14, dt); pl.y = U.damp(pl.y, E.ptr.y, 14, dt); }
          pl.x = U.clamp(pl.x, 16, W - 16); pl.y = U.clamp(pl.y, 40, H - 24);
          pl.inv -= dt; pl.cd -= dt; pl.mcd -= dt;
          if (pl.cd <= 0) {
            pl.cd = 0.075;
            const p = pl.pow;
            shots.push({ x: pl.x - 6, y: pl.y - 16, vx: 0, vy: -1000, dmg: 1 }, { x: pl.x + 6, y: pl.y - 16, vx: 0, vy: -1000, dmg: 1 });
            if (p >= 2) for (const s of [-1, 1]) shots.push({ x: pl.x + s * 12, y: pl.y - 8, vx: s * 170, vy: -950, dmg: 0.8 });
            if (p >= 4) for (const s of [-1, 1]) shots.push({ x: pl.x + s * 16, y: pl.y, vx: s * 330, vy: -880, dmg: 0.7 });
            if (Math.random() < 0.35) E.sfx('shoot', 2, 0.18);
          }
          if (pl.pow >= 3 && pl.mcd <= 0) { pl.mcd = 0.45; for (const s of [-1, 1]) shots.push({ x: pl.x + s * 18, y: pl.y, vx: s * 120, vy: -300, dmg: 2.5, homing: true }); }
          if (E.hit('B', 'Space')) bomb();
        }
        // spawn schedule
        if (!boss) {
          next -= dt;
          if (next <= 0 && t < 55 * (1 + (stage - 1) * 0.1)) { WAVES[U.ri(0, Math.min(4, 1 + stage + Math.floor(t / 15)))](); waveIdx++; next = Math.max(1.6, 3.2 - stage * 0.3) * U.rand(0.8, 1.2); }
          if (t >= 58 * (1 + (stage - 1) * 0.1) && !foes.length) spawnBoss();
        }
        // boss
        if (boss) {
          const b = boss; b.t += dt;
          b.y = b.t < 3 ? U.lerp(-140, 150, U.ease.outCubic(b.t / 3)) : 150 + Math.sin(b.t * 0.7) * 20;
          b.x = W / 2 + (b.t > 3 ? Math.sin(b.t * 0.45) * 170 : 0);
          b.phase = b.hp > b.max * 0.66 ? 0 : b.hp > b.max * 0.33 ? 1 : 2;
          if (b.t > 3) {
            b.cd -= dt; b.spin += dt * (b.phase === 1 ? 2.2 : 1.2);
            if (b.cd <= 0) {
              if (b.phase === 0) { b.cd = 1.1 / diff(); const n = 11; for (let i = 0; i < n; i++) fire(b.x, b.y + 50, Math.PI / 2 + (i - (n - 1) / 2) * 0.16, 200); for (const s of [-1, 1]) fire(b.x + s * 70, b.y + 20, U.ang(b.x + s * 70, b.y + 20, pl.x, pl.y), 300, 'needle'); E.sfx('laser', 0.7, 0.4); }
              else if (b.phase === 1) { b.cd = 0.09 / Math.sqrt(diff()); for (let k = 0; k < 3; k++) fire(b.x, b.y + 30, b.spin + (k * U.TAU) / 3, 190); if (Math.random() < 0.2) E.sfx('blip', 0.8, 0.2); }
              else { b.cd = 0.5 / diff(); for (let i = 0; i < 18; i++) fire(b.x, b.y + 30, (i / 18) * U.TAU + b.spin, 170, 'orb'); fire(b.x, b.y + 40, U.ang(b.x, b.y, pl.x, pl.y), 360, 'needle'); E.sfx('laser', 0.6, 0.4); }
            }
          }
          if (b.hp <= 0) {
            E.score += 20000 * stage; E.pop(b.x, b.y, `+${20000 * stage}`, { color: '#fde68a', size: 34, life: 2 });
            for (let i = 0; i < 8; i++) E.after(i * 0.12, () => { E.burst(b.x + U.rand(-90, 90), b.y + U.rand(-50, 50), { n: 40, colors: ['#fde68a', '#f97316', '#fff', '#ef4444'], speed: 420, shape: 'spark' }); E.sfx('explode', 0.7 + Math.random() * 0.4); E.shake(14); });
            E.flash('#fff', 0.8); bullets = [];
            for (let i = 0; i < 20; i++) items.push({ x: b.x + U.rand(-80, 80), y: b.y + U.rand(-40, 40), kind: 'M', vy: U.rand(-200, -40) });
            boss = null; stage++; t = 0; waveIdx = 0; next = 4; E.stat('Stage', stage); bombs = Math.min(bombs + 1, 5); E.stat('Bombs', bombs);
            E.after(1.5, () => E.banner('STAGE ' + stage, 'The fleet grows bolder'));
          }
        }
        // foes
        for (const f of foes) {
          f.t += dt; f.path(f, dt);
          if (f.gun && f.y > 20 && f.y < H * 0.6) {
            f.cd -= dt;
            if (f.cd <= 0) {
              if (f.gun === 'aim3') { f.cd = 1.3 / diff(); const a = U.ang(f.x, f.y, pl.x, pl.y); for (const o of [-0.2, 0, 0.2]) fire(f.x, f.y + 16, a + o, 230); }
              else { f.cd = 1.6 / diff(); for (let i = 0; i < 16; i++) fire(f.x, f.y, (i / 16) * U.TAU + f.t, 160); }
            }
          } else if (f.type === 'fighter' && U.chance(dt * 0.25 * diff()) && f.y < H * 0.5 && f.y > 0) fire(f.x, f.y, U.ang(f.x, f.y, pl.x, pl.y), 240);
          if (f.hp <= 0 && !f.dead) killFoe(f);
          if (!f.dead && !pl.dead && U.dist(f.x, f.y, pl.x, pl.y) < f.r + 4) { hitPlayer(); if (f.type !== 'cruiser') f.hp = 0; }
        }
        foes = foes.filter((f) => !f.dead && f.y < H + 80 && f.x > -120 && f.x < W + 120);
        // shots
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          if (s.homing) {
            let tgt = boss, bd = boss ? U.dist2(s.x, s.y, boss.x, boss.y) : 1e12;
            for (const f of foes) { const d = U.dist2(s.x, s.y, f.x, f.y); if (d < bd) { bd = d; tgt = f; } }
            if (tgt) { const a = U.ang(s.x, s.y, tgt.x, tgt.y), sp = 620; s.vx = U.damp(s.vx, Math.cos(a) * sp, 6, dt); s.vy = U.damp(s.vy, Math.sin(a) * sp, 6, dt); }
            if (Math.random() < 0.5) E.burst(s.x, s.y, { n: 1, color: '#93c5fd', speed: 20, life: 0.25, size: 2, glow: false });
          }
          s.x += s.vx * dt; s.y += s.vy * dt;
          let hit = false;
          for (const f of foes) if (!f.dead && Math.abs(s.x - f.x) < f.r && Math.abs(s.y - f.y) < f.r) { f.hp -= s.dmg; f.flash = 0.06; hit = true; if (Math.random() < 0.3) E.burst(s.x, s.y, { n: 2, color: '#fff', speed: 100, size: 2, life: 0.2 }); break; }
          if (!hit && boss && boss.t > 2 && Math.abs(s.x - boss.x) < 100 && Math.abs(s.y - boss.y) < 50) { boss.hp -= s.dmg; boss.flash = 0.05; hit = true; E.score += 2; if (Math.random() < 0.2) E.burst(s.x, s.y, { n: 3, color: '#fde68a', speed: 120, size: 2, life: 0.25 }); }
          if (hit || s.y < -20 || s.x < -20 || s.x > W + 20) shots.splice(i, 1);
        }
        // enemy bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt;
          const d = U.dist(b.x, b.y, pl.x, pl.y);
          if (!pl.dead) {
            if (d < 5) { bullets.splice(i, 1); hitPlayer(); continue; }
            if (d < 22 && !b.grazed) { b.grazed = true; graze++; E.score += 20; E.burst(pl.x, pl.y, { n: 3, color: '#e0f2fe', speed: 150, size: 1.5, life: 0.3 }); E.sfx('tick', 2.2, 0.3); }
          }
          if (b.x < -20 || b.y < -20 || b.x > W + 20 || b.y > H + 20) bullets.splice(i, 1);
        }
        // items
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i]; it.vy = Math.min(it.vy + 300 * dt, 160); it.y += it.vy * dt;
          const d = U.dist(it.x, it.y, pl.x, pl.y);
          if (!pl.dead && (d < 90 || pl.y < 250)) { it.x = U.damp(it.x, pl.x, 10, dt); it.y = U.damp(it.y, pl.y, 10, dt); }
          if (!pl.dead && d < 22) {
            if (it.kind === 'P') { if (pl.pow < 5) { pl.pow++; E.pop(pl.x, pl.y - 30, 'POWER UP', { color: '#60a5fa' }); } else { E.score += 1000; E.pop(pl.x, pl.y - 30, '+1000', { color: '#60a5fa' }); } E.sfx('power'); }
            else { E.score += 100; E.sfx('coin', 1.6, 0.3); }
            items.splice(i, 1); continue;
          }
          if (it.y > H + 20) items.splice(i, 1);
        }
        E.stat('Power', pl.pow);
      },
      draw(g) {
        const tt = E.t;
        D.bg(g, W, H, '#050a1f', '#10062a');
        const neb = g.createRadialGradient(W * 0.3, ((scroll * 0.2) % (H * 2)) - H * 0.5, 10, W * 0.3, ((scroll * 0.2) % (H * 2)) - H * 0.5, 400);
        neb.addColorStop(0, 'rgba(96,165,250,.18)'); neb.addColorStop(1, 'rgba(96,165,250,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H);
        stars.forEach((s, i) => D.stars(g, s, W, H, tt, 0, scroll * (0.3 + i * 0.5)));
        // side rails
        g.fillStyle = 'rgba(96,165,250,.06)';
        for (let y = -((scroll * 1.6) % 80); y < H; y += 80) { g.fillRect(0, y, 22, 50); g.fillRect(W - 22, y, 22, 50); }
        for (const it of items) {
          if (it.kind === 'P') { D.glow(g, it.x, it.y, 26, '#60a5fa', 0.8); D.fillRR(g, it.x - 11, it.y - 11, 22, 22, 6, '#1d4ed8'); D.text(g, 'P', it.x, it.y + 1, { size: 15, color: '#fff' }); }
          else { const sx = Math.abs(Math.cos(tt * 6 + it.x)); g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(it.x, it.y, 6 * sx + 1, 7, 0, 0, U.TAU); g.fill(); }
        }
        for (const f of foes) {
          g.save(); g.translate(f.x, f.y);
          D.glow(g, 0, 0, f.r * 2.4, f.col, 0.3);
          const c = f.flash > 0 ? '#fff' : f.col; f.flash = (f.flash || 0) - 1 / 60;
          if (f.type === 'fighter') { D.poly(g, [[0, 16], [-14, -8], [-5, -4], [0, -14], [5, -4], [14, -8]], c); D.circle(g, 0, 2, 4, '#fff'); }
          else if (f.type === 'kami') { g.rotate(f.vx || f.vy ? Math.atan2(f.vy, f.vx) - Math.PI / 2 : 0); D.poly(g, [[0, 16], [-10, -10], [0, -4], [10, -10]], c); D.glow(g, 0, -10, 14, '#f97316', 0.9); }
          else if (f.type === 'gunship') { D.poly(g, [[-26, -10], [26, -10], [18, 16], [-18, 16]], c); D.fillRR(g, -10, -18, 20, 16, 5, U.shade(f.col, -0.3)); D.circle(g, 0, 8, 6, '#fde68a'); }
          else { D.poly(g, [[0, 44], [-44, 0], [-30, -30], [30, -30], [44, 0]], c); D.poly(g, [[0, 28], [-24, 0], [0, -18], [24, 0]], U.shade(f.col, -0.4)); D.circle(g, 0, 0, 9 + Math.sin(tt * 8) * 2, '#fff'); const w = 80 * (f.hp / f.maxhp); g.fillStyle = '#34d399'; g.fillRect(-40, -44, w, 4); }
          g.restore();
        }
        if (boss) {
          const b = boss, c = b.flash > 0 ? '#fff' : '#ef4444'; b.flash = (b.flash || 0) - 1 / 60;
          g.save(); g.translate(b.x, b.y);
          D.glow(g, 0, 0, 200, '#ef4444', 0.25);
          D.poly(g, [[-120, -20], [-60, -60], [60, -60], [120, -20], [90, 30], [40, 55], [-40, 55], [-90, 30]], '#3b0a1a', c, 3);
          D.poly(g, [[-60, -30], [60, -30], [40, 30], [-40, 30]], '#7f1d1d');
          for (const s of [-1, 1]) { D.fillRR(g, s * 70 - 10, 0, 20, 34, 6, '#991b1b'); D.circle(g, s * 70, 30, 6, '#fde68a'); }
          D.orb(g, 0, 10, 18 + Math.sin(tt * 6) * 3, ['#fde68a', '#f97316', '#ef4444'][b.phase]);
          g.restore();
          D.fillRR(g, 40, 14, W - 80, 10, 5, 'rgba(255,255,255,.12)');
          D.fillRR(g, 40, 14, (W - 80) * Math.max(0, b.hp / b.max), 10, 5, '#ef4444');
          D.text(g, 'DREADNOUGHT', W / 2, 36, { size: 12, font: 'mono', color: '#fca5a5' });
        }
        for (const s of shots) {
          if (s.homing) { D.glow(g, s.x, s.y, 14, '#93c5fd', 0.9); D.circle(g, s.x, s.y, 3.5, '#fff'); }
          else { D.fillRR(g, s.x - 2, s.y - 9, 4, 18, 2, '#bfdbfe'); D.glow(g, s.x, s.y, 10, '#60a5fa', 0.6); }
        }
        if (!pl.dead && (pl.inv <= 0 || Math.sin(tt * 30) > 0)) {
          const x = pl.x, y = pl.y;
          const fl = 12 + Math.random() * 8;
          D.glow(g, x, y + 20, 22, '#f97316', 0.9); D.poly(g, [[x - 5, y + 14], [x, y + 14 + fl], [x + 5, y + 14]], '#fde68a');
          D.poly(g, [[x, y - 22], [x - 7, y - 4], [x - 22, y + 10], [x - 20, y + 16], [x - 6, y + 12], [x, y + 16], [x + 6, y + 12], [x + 20, y + 16], [x + 22, y + 10], [x + 7, y - 4]], '#e0f2fe', '#60a5fa', 2);
          D.poly(g, [[x, y - 14], [x - 4, y - 2], [x, y + 2], [x + 4, y - 2]], '#1d4ed8');
          D.glow(g, x, y, 12, '#fff', 0.9); D.circle(g, x, y, 3, '#fff');
        }
        for (const b of bullets) {
          if (b.kind === 'needle') { D.glow(g, b.x, b.y, 12, '#fb7185', 0.8); g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx)); D.fillRR(g, -9, -3, 18, 6, 3, '#fecdd3'); g.restore(); }
          else { D.glow(g, b.x, b.y, 16, '#f472b6', 0.9); D.circle(g, b.x, b.y, 6, '#f472b6'); D.circle(g, b.x, b.y, 3.2, '#fff'); }
        }
        if (bombT > 0) { g.globalAlpha = bombT * 0.5; D.circle(g, pl.x, pl.y, (1 - bombT) * 900, null, '#fff', 30 * bombT); g.globalAlpha = 1; }
        for (let i = 0; i < lives; i++) D.poly(g, [[20 + i * 22, H - 32], [14 + i * 22, H - 18], [26 + i * 22, H - 18]], '#93c5fd');
        for (let i = 0; i < bombs; i++) D.circle(g, W - 20 - i * 20, H - 24, 6, '#f472b6');
        D.text(g, `GRAZE ${graze}`, W - 16, H - 50, { size: 11, font: 'mono', align: 'right', color: 'rgba(224,242,254,.5)' });
        D.vignette(g, W, H, 0.4);
      },
    };
  },
});

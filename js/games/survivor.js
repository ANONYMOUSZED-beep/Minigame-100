MG.add({
  id: 'survivor', name: 'Night Survivor', cat: 'Action', color: '#a3e635', color2: '#8b5cf6',
  desc: 'A bullet-heaven roguelite. Your weapons fire themselves — you pick upgrades and outlast the endless night.',
  how: ['Move with <kbd>WASD</kbd> / <kbd>←↑↓→</kbd> or drag — weapons fire automatically', 'Collect XP crystals to level up and choose 1 of 3 upgrades', 'Pick with click or <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>', 'Build synergies: orbit blades + aura + lightning…'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600;
    const pl = { x: 0, y: 0, hp: 100, max: 100, spd: 170, magnet: 70, dmg: 1, cdr: 1, regen: 0, inv: 0, face: 1, walk: 0, area: 1 };
    const WEP = {
      bolt: { name: 'Arcane Bolt', desc: 'Fires at the nearest foe', max: 6 },
      orbit: { name: 'Orbit Blades', desc: 'Blades circle around you', max: 6 },
      aura: { name: 'Hallowed Aura', desc: 'Burns everything nearby', max: 6 },
      bolt2: { name: 'Chain Lightning', desc: 'Strikes random foes', max: 6 },
      nova: { name: 'Frost Nova', desc: 'Periodic freezing ring', max: 6 },
      axe: { name: 'Hurled Axe', desc: 'Arcs high, pierces all', max: 6 },
    };
    const PAS = {
      spd: { name: 'Swift Boots', desc: '+12% move speed', apply: () => (pl.spd *= 1.12) },
      hp: { name: 'Hollow Heart', desc: '+25 max HP, heal 25', apply: () => { pl.max += 25; pl.hp = Math.min(pl.max, pl.hp + 25); } },
      mag: { name: 'Lodestone', desc: '+40% pickup range', apply: () => (pl.magnet *= 1.4) },
      dmg: { name: 'Spellbook', desc: '+15% damage', apply: () => (pl.dmg *= 1.15) },
      cdr: { name: 'Hourglass', desc: '−10% cooldowns', apply: () => (pl.cdr *= 0.9) },
      regen: { name: 'Troll Blood', desc: '+1 HP/sec regen', apply: () => (pl.regen += 1) },
      area: { name: 'Candelabra', desc: '+15% area', apply: () => (pl.area *= 1.15) },
    };
    const lv = { bolt: 1 };
    const cds = {};
    let foes = [], shots = [], gems = [], fx = [], time = 0, kills = 0, xp = 0, xpNeed = 5, level = 1, spawnT = 0, choosing = null, orbitA = 0, sel = 0, bossT = 90, hash = new Map();
    const FOES = {
      bat: { hp: 4, sp: 95, r: 10, dmg: 8, col: '#a78bfa', xp: 1 },
      zombie: { hp: 12, sp: 55, r: 13, dmg: 12, col: '#84cc16', xp: 2 },
      skull: { hp: 24, sp: 70, r: 13, dmg: 15, col: '#e5e7eb', xp: 3 },
      ghost: { hp: 18, sp: 120, r: 12, dmg: 14, col: '#67e8f9', xp: 3 },
      brute: { hp: 140, sp: 45, r: 24, dmg: 30, col: '#f97316', xp: 15 },
      reaper: { hp: 1600, sp: 70, r: 34, dmg: 45, col: '#ef4444', xp: 80 },
    };
    const deco = [];
    const rng = U.seeded(4);
    for (let i = 0; i < 900; i++) deco.push({ x: rng() * 2400, y: rng() * 2400, k: rng() < 0.08 ? 'grave' : rng() < 0.5 ? 'tuft' : 'flower', c: rng() });
    function spawn(type, a) {
      const d = FOES[type], r = Math.hypot(W, H) / 2 + 40, ang = a === undefined ? U.rand(U.TAU) : a;
      const hpScale = 1 + time / 150;
      foes.push({ type, x: pl.x + Math.cos(ang) * r, y: pl.y + Math.sin(ang) * r, hp: d.hp * hpScale, max: d.hp * hpScale, t: U.rand(3), flash: 0, slow: 0, kx: 0, ky: 0 });
    }
    function damage(f, amt, kb = 0, fromX, fromY) {
      amt *= pl.dmg; f.hp -= amt; f.flash = 0.1;
      if (kb && fromX !== undefined) { const a = U.ang(fromX, fromY, f.x, f.y); f.kx += Math.cos(a) * kb; f.ky += Math.sin(a) * kb; }
      if (Math.random() < 0.35 || amt > 20) E.pop(f.x, f.y - 14, Math.round(amt), { size: amt > 20 ? 18 : 13, color: amt > 20 ? '#fde68a' : '#fff', life: 0.5, vy: -80 });
      if (f.hp <= 0 && !f.dead) {
        f.dead = true; kills++; E.stat('Kills', kills);
        const d = FOES[f.type];
        gems.push({ x: f.x, y: f.y, v: d.xp, big: d.xp >= 10 });
        if (Math.random() < 0.012) gems.push({ x: f.x + 10, y: f.y, heal: true });
        E.burst(f.x, f.y, { n: f.type === 'brute' || f.type === 'reaper' ? 30 : 7, color: d.col, speed: 140, life: 0.45, size: 3 });
        if (f.type === 'reaper') { E.shake(16); E.sfx('boom'); E.flash('#fff', 0.4); E.pop(f.x, f.y - 40, 'REAPER SLAIN', { color: '#fde68a', size: 26 }); E.score += 5000; }
        else if (Math.random() < 0.3) E.sfx('pop', 0.7 + Math.random() * 0.6, 0.25);
      }
    }
    function offer() {
      const opts = [];
      for (const k in WEP) if ((lv[k] || 0) < WEP[k].max && (lv[k] || Object.keys(lv).filter((x) => WEP[x]).length < 5)) opts.push({ k, kind: 'w' });
      for (const k in PAS) opts.push({ k, kind: 'p' });
      U.shuffle(opts);
      // bias toward weapons you have
      opts.sort((a, b) => (b.kind === 'w' && lv[b.k] ? 0.5 : 0) + Math.random() - ((a.kind === 'w' && lv[a.k] ? 0.5 : 0) + Math.random()));
      choosing = opts.slice(0, 3); sel = 0;
      E.sfx('power');
    }
    function pick(i) {
      const o = choosing[i]; if (!o) return;
      if (o.kind === 'w') lv[o.k] = (lv[o.k] || 0) + 1; else { PAS[o.k].apply(); lv[o.k] = (lv[o.k] || 0) + 1; }
      choosing = null; E.sfx('select'); E.flash('#a3e635', 0.15);
      pl.inv = Math.max(pl.inv, 0.6);
    }
    function nearest(maxD = 500) { let b = null, bd = maxD * maxD; for (const f of foes) { const d = U.dist2(f.x, f.y, pl.x, pl.y); if (d < bd) { bd = d; b = f; } } return b; }
    let curDt = 0;
    const cd = (k, base) => { cds[k] = (cds[k] || 0) - curDt; if (cds[k] <= 0) { cds[k] = base * pl.cdr; return true; } return false; };
    return {
      manualFx: true,
      update(dt) {
        if (choosing) {
          for (const [i, k] of [[0, 'Digit1'], [1, 'Digit2'], [2, 'Digit3']]) if (E.hit(k)) return pick(i);
          if (E.hit('L', 'U')) sel = (sel + 2) % 3; if (E.hit('R', 'D')) sel = (sel + 1) % 3;
          if (E.hit('Space', 'Enter')) return pick(sel);
          if (E.ptr.hit) { for (let i = 0; i < 3; i++) { const x = W / 2 - 330 + i * 230; if (U.ptInRect(E.ptr.x, E.ptr.y, x, 170, 200, 260)) return pick(i); } }
          return;
        }
        time += dt; curDt = dt; E.stat('Time', U.fmtTime(time, 0));
        // move
        let a = E.axis();
        if (E.ptr.down) { const dx = E.ptr.x - W / 2, dy = E.ptr.y - H / 2, d = Math.hypot(dx, dy); if (d > 24) a = { x: dx / d, y: dy / d }; }
        const l = Math.hypot(a.x, a.y) || 1;
        pl.x += (a.x / l) * pl.spd * dt; pl.y += (a.y / l) * pl.spd * dt;
        if (a.x) pl.face = Math.sign(a.x);
        if (a.x || a.y) pl.walk += dt * 10;
        pl.inv -= dt; pl.hp = Math.min(pl.max, pl.hp + pl.regen * dt);
        // spawning — waves ramp up
        spawnT -= dt;
        const rate = 1.2 + time * 0.045;
        if (spawnT <= 0) {
          spawnT = 1 / rate;
          const pool = time < 40 ? ['bat'] : time < 90 ? ['bat', 'zombie'] : time < 160 ? ['bat', 'zombie', 'skull', 'ghost'] : ['zombie', 'skull', 'ghost', 'ghost', 'skull'];
          spawn(U.pick(pool));
          if (time > 60 && Math.random() < 0.02) spawn('brute');
          if (Math.random() < 0.004 * (1 + time / 60)) { const a0 = U.rand(U.TAU); for (let k = 0; k < 12; k++) spawn('bat', a0 + k * 0.05); }
        }
        bossT -= dt;
        if (bossT <= 0) { bossT = 120; spawn('reaper'); E.banner('THE REAPER COMES', null, { color: '#ef4444' }); E.sfx('lose', 0.6); }
        // spatial hash for separation
        hash.clear();
        for (const f of foes) { const k = ((f.x / 40) | 0) + ',' + ((f.y / 40) | 0); let b = hash.get(k); if (!b) hash.set(k, (b = [])); b.push(f); }
        for (const f of foes) {
          const d = FOES[f.type]; f.t += dt; f.flash -= dt; f.slow -= dt;
          const dx = pl.x - f.x, dy = pl.y - f.y, dist = Math.hypot(dx, dy) || 1;
          let sp = d.sp * (f.slow > 0 ? 0.35 : 1);
          let vx = (dx / dist) * sp, vy = (dy / dist) * sp;
          if (f.type === 'bat') { vx += Math.cos(f.t * 5) * 40; vy += Math.sin(f.t * 5) * 40; }
          const cx = (f.x / 40) | 0, cy = (f.y / 40) | 0;
          for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const b = hash.get(cx + ox + ',' + (cy + oy)); if (!b) continue; for (const o of b) { if (o === f) continue; const ex = f.x - o.x, ey = f.y - o.y, ed = Math.hypot(ex, ey), rr = d.r + FOES[o.type].r; if (ed < rr && ed > 0.01) { vx += (ex / ed) * 80; vy += (ey / ed) * 80; } } }
          f.x += (vx + f.kx) * dt; f.y += (vy + f.ky) * dt; f.kx *= Math.exp(-8 * dt); f.ky *= Math.exp(-8 * dt);
          if (dist < d.r + 12 && pl.inv <= 0) {
            pl.hp -= d.dmg * dt * 2.2;
            if (Math.random() < dt * 6) { E.sfx('hit', 1.2, 0.3); E.shake(3); E.flash('#ef4444', 0.08); }
          }
          if (dist > 1100 && f.type !== 'reaper') { f.x = pl.x - dx * 0.9; f.y = pl.y - dy * 0.9; }
        }
        if (pl.hp <= 0) { E.score += Math.round(time * 5) + level * 100; E.sfx('lose'); E.over({ msg: `Survived ${U.fmtTime(time, 0)} · level ${level} · ${kills} kills` }); return; }
        // weapons
        if (lv.bolt && cd('bolt', 0.9 - lv.bolt * 0.08)) { const n = 1 + Math.floor(lv.bolt / 2); for (let i = 0; i < n; i++) { const tg = nearest(); if (!tg) break; const a2 = U.ang(pl.x, pl.y, tg.x, tg.y) + (i - (n - 1) / 2) * 0.18; shots.push({ k: 'bolt', x: pl.x, y: pl.y, vx: Math.cos(a2) * 520, vy: Math.sin(a2) * 520, life: 1.2, dmg: 8 + lv.bolt * 3, pierce: lv.bolt >= 5 ? 2 : 0, hit: new Set() }); } E.sfx('shoot', 1.8, 0.2); }
        if (lv.axe && cd('axe', 1.6 - lv.axe * 0.12)) { for (let i = 0; i < Math.ceil(lv.axe / 2); i++) shots.push({ k: 'axe', x: pl.x, y: pl.y, vx: U.rand(-120, 120) + pl.face * 60, vy: -520, life: 2.2, dmg: 20 + lv.axe * 8, pierce: 99, hit: new Set(), rot: 0, grav: 900 }); E.sfx('swish', 0.8, 0.4); }
        if (lv.bolt2 && cd('bolt2', 1.8 - lv.bolt2 * 0.15)) {
          const cand = foes.filter((f) => Math.abs(f.x - pl.x) < W / 2 && Math.abs(f.y - pl.y) < H / 2);
          for (let i = 0; i < 1 + lv.bolt2 && cand.length; i++) { const f = U.pick(cand); damage(f, 18 + lv.bolt2 * 7); fx.push({ k: 'zap', x: f.x, y: f.y, t: 0.25 }); }
          E.sfx('laser', 0.6, 0.35); E.shake(2);
        }
        if (lv.nova && cd('nova', 3.2 - lv.nova * 0.25)) { fx.push({ k: 'nova', x: pl.x, y: pl.y, t: 0, r: (110 + lv.nova * 20) * pl.area }); E.sfx('whoosh', 0.8, 0.6); for (const f of foes) if (U.dist(f.x, f.y, pl.x, pl.y) < (110 + lv.nova * 20) * pl.area) { damage(f, 10 + lv.nova * 4, 220, pl.x, pl.y); f.slow = 1.5; } }
        if (lv.aura) { const r = (55 + lv.aura * 12) * pl.area; if (cd('aura', 0.35)) for (const f of foes) if (U.dist(f.x, f.y, pl.x, pl.y) < r + FOES[f.type].r) damage(f, 3 + lv.aura * 1.5, 60, pl.x, pl.y); }
        orbitA += dt * (2.4 + (lv.orbit || 0) * 0.2);
        if (lv.orbit) {
          const n = 1 + lv.orbit, R = 70 * pl.area;
          for (let i = 0; i < n; i++) { const a2 = orbitA + (i / n) * U.TAU, bx = pl.x + Math.cos(a2) * R, by = pl.y + Math.sin(a2) * R; for (const f of foes) if (U.dist2(bx, by, f.x, f.y) < (FOES[f.type].r + 12) ** 2 && (f.orbCd || 0) < time) { f.orbCd = time + 0.35; damage(f, 9 + lv.orbit * 3, 160, pl.x, pl.y); } }
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.life -= dt; if (s.grav) s.vy += s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.rot !== undefined) s.rot += dt * 14;
          for (const f of foes) { if (f.dead || s.hit.has(f)) continue; if (U.dist2(s.x, s.y, f.x, f.y) < (FOES[f.type].r + 8) ** 2) { damage(f, s.dmg, 120, s.x, s.y); s.hit.add(f); if (s.hit.size > s.pierce) { s.life = 0; break; } } }
          if (s.life <= 0) shots.splice(i, 1);
        }
        foes = foes.filter((f) => !f.dead);
        for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 0.45) fx.splice(i, 1); }
        // gems
        for (let i = gems.length - 1; i >= 0; i--) {
          const gm = gems[i], d = U.dist(gm.x, gm.y, pl.x, pl.y);
          if (d < pl.magnet || gm.pull) { gm.pull = true; const sp = 500 + (gm.sp = (gm.sp || 0) + dt * 900); gm.x += ((pl.x - gm.x) / d) * sp * dt; gm.y += ((pl.y - gm.y) / d) * sp * dt; }
          if (d < 14) {
            gems.splice(i, 1);
            if (gm.heal) { pl.hp = Math.min(pl.max, pl.hp + 30); E.sfx('power', 1.3, 0.5); E.pop(pl.x, pl.y - 30, '+30 HP', { color: '#f87171' }); continue; }
            xp += gm.v; E.score += gm.v * 10; E.sfx('coin', 1.8 + Math.random() * 0.3, 0.12);
            if (xp >= xpNeed) { xp -= xpNeed; level++; xpNeed = Math.round(xpNeed * 1.28 + 3); E.stat('Level', level); offer(); }
          }
        }
        if (gems.length > 500) gems.splice(0, gems.length - 500);
      },
      draw(g) {
        const t = E.t, ox = W / 2 - pl.x, oy = H / 2 - pl.y;
        D.radialBg(g, W, H, '#1f3324', '#0c160f');
        g.save(); g.translate(ox, oy);
        // tiled ground decoration
        const tx0 = Math.floor((pl.x - W / 2) / 2400), ty0 = Math.floor((pl.y - H / 2) / 2400);
        for (let ti = tx0; ti <= tx0 + 1; ti++) for (let tj = ty0; tj <= ty0 + 1; tj++) for (const d of deco) {
          const x = d.x + ti * 2400, y = d.y + tj * 2400;
          if (x < pl.x - W / 2 - 30 || x > pl.x + W / 2 + 30 || y < pl.y - H / 2 - 40 || y > pl.y + H / 2 + 30) continue;
          if (d.k === 'tuft') { g.strokeStyle = '#2f5236'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 6, y - 7); g.moveTo(x, y); g.lineTo(x, y - 9); g.moveTo(x + 4, y); g.lineTo(x + 6, y - 7); g.stroke(); }
          else if (d.k === 'flower') D.circle(g, x, y, 2.5, d.c < 0.5 ? '#6d5b9c' : '#3f6c52');
          else { D.fillRR(g, x - 11, y - 26, 22, 28, 8, '#3a4a42'); D.fillRR(g, x - 11, y - 26, 22, 6, 3, '#4b5d53'); g.fillStyle = '#2a3530'; g.fillRect(x - 5, y - 18, 10, 2); g.fillRect(x - 1, y - 22, 2, 10); }
        }
        // aura
        if (lv.aura) { const r = (55 + lv.aura * 12) * pl.area; D.glow(g, pl.x, pl.y, r * 1.4, '#fde68a', 0.22); D.circle(g, pl.x, pl.y, r, 'rgba(253,230,138,.06)', `rgba(253,230,138,${0.2 + 0.1 * Math.sin(t * 6)})`, 2); }
        for (const f of fx) if (f.k === 'nova') { const k = f.t / 0.45; g.globalAlpha = 1 - k; D.circle(g, f.x, f.y, f.r * U.ease.outCubic(k), 'rgba(147,197,253,.15)', '#bfdbfe', 4); g.globalAlpha = 1; }
        for (const gm of gems) { if (gm.heal) { D.heart(g, gm.x, gm.y + 3, 11, '#f87171'); continue; } const c = gm.big ? '#f472b6' : gm.v > 1 ? '#22d3ee' : '#a3e635'; D.glow(g, gm.x, gm.y, 10, c, 0.6); D.poly(g, [[gm.x, gm.y - 6], [gm.x + 4, gm.y], [gm.x, gm.y + 6], [gm.x - 4, gm.y]], c); }
        // foes (sorted by y for depth)
        foes.sort((a, b) => a.y - b.y);
        for (const f of foes) {
          const d = FOES[f.type], c = f.flash > 0 ? '#fff' : f.slow > 0 ? '#93c5fd' : d.col, x = f.x, y = f.y;
          if (x < pl.x - W / 2 - 50 || x > pl.x + W / 2 + 50 || y < pl.y - H / 2 - 50 || y > pl.y + H / 2 + 50) continue;
          D.shadow(g, x, y + d.r, d.r, d.r * 0.35, 0.3);
          if (f.type === 'bat') { const w = Math.sin(f.t * 16) * 8; D.poly(g, [[x, y], [x - 16, y - 6 + w], [x - 8, y + 2]], c); D.poly(g, [[x, y], [x + 16, y - 6 + w], [x + 8, y + 2]], c); D.circle(g, x, y, 6, c); D.circle(g, x - 2, y - 1, 1.3, '#ef4444'); D.circle(g, x + 2, y - 1, 1.3, '#ef4444'); }
          else if (f.type === 'ghost') { g.globalAlpha = 0.85; g.fillStyle = c; g.beginPath(); g.arc(x, y - 3, 11, Math.PI, 0); for (let k = 0; k <= 4; k++) g.lineTo(x + 11 - k * 5.5, y + 9 + ((k + Math.floor(f.t * 6)) % 2) * 3); g.fill(); g.globalAlpha = 1; D.circle(g, x - 4, y - 4, 2, '#0f172a'); D.circle(g, x + 4, y - 4, 2, '#0f172a'); }
          else if (f.type === 'skull') { D.circle(g, x, y - 3, 11, c); D.fillRR(g, x - 7, y + 2, 14, 8, 3, c); D.circle(g, x - 4, y - 3, 3, '#111'); D.circle(g, x + 4, y - 3, 3, '#111'); }
          else if (f.type === 'zombie') { const bob = Math.sin(f.t * 6) * 1.5; D.fillRR(g, x - 9, y - 6 + bob, 18, 18, 5, '#3f6212'); D.circle(g, x, y - 10 + bob, 8, c); D.circle(g, x - 3, y - 11 + bob, 1.6, '#ef4444'); D.circle(g, x + 3, y - 11 + bob, 1.6, '#ef4444'); g.fillStyle = c; g.fillRect(x + (pl.x > x ? 6 : -16), y - 4 + bob, 10, 4); }
          else if (f.type === 'brute' || f.type === 'reaper') {
            const r = d.r; D.glow(g, x, y, r * 2.4, d.col, 0.35);
            D.orb(g, x, y, r, c);
            if (f.type === 'reaper') { g.fillStyle = '#111'; g.beginPath(); g.arc(x, y - 4, r * 0.6, 0, U.TAU); g.fill(); D.circle(g, x - 7, y - 6, 4, '#ef4444'); D.circle(g, x + 7, y - 6, 4, '#ef4444'); D.line(g, x + r, y - r, x + r + 10, y + r, '#d1d5db', 3); D.poly(g, [[x + r, y - r], [x + r - 26, y - r - 12], [x + r - 8, y - r + 4]], '#d1d5db'); }
            else { D.circle(g, x - 7, y - 5, 3.5, '#111'); D.circle(g, x + 7, y - 5, 3.5, '#111'); }
            g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - r, y - r - 10, r * 2, 4); g.fillStyle = '#ef4444'; g.fillRect(x - r, y - r - 10, r * 2 * Math.max(0, f.hp / f.max), 4);
          }
        }
        for (const s of shots) {
          if (s.k === 'bolt') { D.glow(g, s.x, s.y, 16, '#c084fc', 0.9); D.circle(g, s.x, s.y, 4, '#f5d0fe'); }
          else { g.save(); g.translate(s.x, s.y); g.rotate(s.rot); g.fillStyle = '#9ca3af'; g.fillRect(-2, -12, 4, 24); D.poly(g, [[2, -12], [14, -8], [14, 2], [2, -2]], '#e5e7eb'); g.restore(); }
        }
        for (const f of fx) if (f.k === 'zap') { g.globalAlpha = 1 - f.t / 0.45; g.strokeStyle = '#e0f2fe'; g.lineWidth = 3; g.beginPath(); let yy = f.y - 300; g.moveTo(f.x, yy); while (yy < f.y) { yy += 30; g.lineTo(f.x + U.rand(-14, 14), Math.min(yy, f.y)); } g.stroke(); D.glow(g, f.x, f.y, 40, '#93c5fd', 1); g.globalAlpha = 1; }
        // player
        const bob = Math.sin(pl.walk) * 2;
        D.shadow(g, pl.x, pl.y + 14, 13, 5, 0.4);
        if (pl.inv <= 0 || Math.sin(t * 30) > 0) {
          g.save(); g.translate(pl.x, pl.y + bob); g.scale(pl.face, 1);
          D.poly(g, [[-10, 12], [0, -8], [10, 12]], '#5b21b6');
          D.circle(g, 0, -10, 8, '#fcd9b6'); g.fillStyle = '#4c1d95'; g.beginPath(); g.moveTo(-10, -12); g.lineTo(2, -30); g.lineTo(10, -12); g.fill();
          D.circle(g, 3, -10, 1.5, '#111'); D.line(g, 10, 4, 16, -14, '#a16207', 2.5); D.glow(g, 16, -16, 12, '#c084fc', 0.9);
          g.restore();
        }
        if (lv.orbit) { const n = 1 + lv.orbit, R = 70 * pl.area; for (let i = 0; i < n; i++) { const a2 = orbitA + (i / n) * U.TAU, bx = pl.x + Math.cos(a2) * R, by = pl.y + Math.sin(a2) * R; D.glow(g, bx, by, 20, '#22d3ee', 0.6); g.save(); g.translate(bx, by); g.rotate(a2 * 3); D.star(g, 0, 0, 10, 3, 4, 0, '#e0f2fe'); g.restore(); } }
        E.fx.draw(g);
        g.restore();
        // HUD
        D.fillRR(g, 0, 0, W, 10, 0, 'rgba(0,0,0,.6)'); g.fillStyle = '#22d3ee'; g.fillRect(0, 0, W * (xp / xpNeed), 10);
        D.text(g, `LV ${level}`, W / 2, 24, { size: 14, font: 'mono', color: '#a5f3fc' });
        D.fillRR(g, W / 2 - 22, H / 2 + 22, 44, 5, 2, 'rgba(0,0,0,.6)'); g.fillStyle = pl.hp / pl.max < 0.3 ? '#ef4444' : '#4ade80'; g.fillRect(W / 2 - 22, H / 2 + 22, 44 * Math.max(0, pl.hp / pl.max), 5);
        let ix = 14;
        for (const k of Object.keys(lv)) { if (!WEP[k]) continue; D.fillRR(g, ix, H - 36, 26, 26, 6, 'rgba(0,0,0,.5)'); D.text(g, WEP[k].name[0], ix + 13, H - 23, { size: 14, color: '#fde68a' }); D.text(g, lv[k], ix + 22, H - 14, { size: 10, font: 'mono', color: '#fff' }); ix += 30; }
        D.vignette(g, W, H, 0.6, '5,0,20');
        if (choosing) {
          g.fillStyle = 'rgba(5,3,15,.75)'; g.fillRect(0, 0, W, H);
          D.text(g, 'LEVEL UP!', W / 2, 110, { size: 44, color: '#fff', glow: '#a3e635' });
          D.text(g, 'Choose an upgrade', W / 2, 146, { size: 16, font: 'ui', color: '#cbd5e1' });
          choosing.forEach((o, i) => {
            const x = W / 2 - 330 + i * 230, y = 170, hov = sel === i || U.ptInRect(E.ptr.x, E.ptr.y, x, y, 200, 260);
            if (U.ptInRect(E.ptr.x, E.ptr.y, x, y, 200, 260) && E.ptr.moved) sel = i;
            const def = o.kind === 'w' ? WEP[o.k] : PAS[o.k], cur = lv[o.k] || 0;
            D.fillRR(g, x, y - (hov ? 8 : 0), 200, 260, 16, hov ? '#1f2a14' : '#141225');
            D.strokeRR(g, x, y - (hov ? 8 : 0), 200, 260, 16, hov ? '#a3e635' : 'rgba(255,255,255,.15)', 2);
            D.text(g, `${i + 1}`, x + 20, y + 22 - (hov ? 8 : 0), { size: 14, font: 'mono', color: '#94a3b8' });
            D.glow(g, x + 100, y + 80 - (hov ? 8 : 0), 60, o.kind === 'w' ? '#a3e635' : '#8b5cf6', 0.4);
            D.text(g, o.kind === 'w' ? '⚔' : '✦', x + 100, y + 80 - (hov ? 8 : 0), { size: 40, color: '#fff', font: 'ui' });
            D.text(g, def.name, x + 100, y + 150 - (hov ? 8 : 0), { size: 19, color: '#fff' });
            D.text(g, def.desc, x + 100, y + 180 - (hov ? 8 : 0), { size: 13, font: 'ui', weight: 500, color: '#cbd5e1' });
            D.text(g, cur ? `LV ${cur} → ${cur + 1}` : 'NEW!', x + 100, y + 222 - (hov ? 8 : 0), { size: 14, font: 'mono', color: cur ? '#a3e635' : '#fde68a' });
          });
        }
      },
    };
  },
});

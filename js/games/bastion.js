MG.add({
  id: 'bastion', name: 'Bastion TD', cat: 'Action', color: '#4ade80', color2: '#facc15',
  desc: 'Tower defense with five tower types, three upgrade tiers, splash, slow, chain lightning and 30 waves.',
  how: ['Pick a tower on the right (or keys <kbd>1</kbd>–<kbd>5</kbd>), then click a grass tile to build', 'Click a tower to upgrade (<kbd>U</kbd>) or sell (<kbd>S</kbd>) it', 'Start waves with the button or <kbd>N</kbd> — early calls earn bonus gold', 'Mix damage types: armored brutes shrug off small guns'],
  make(E) {
    const W = 960, H = 600, C = 40, GW = 20, GH = 15, PX = 800;
    const WP = [[-1, 2], [4, 2], [4, 11], [9, 11], [9, 4], [14, 4], [14, 12], [18, 12], [18, 7], [20, 7]];
    const path = [], onPath = U.grid(GW, GH, false);
    for (let i = 0; i < WP.length - 1; i++) { const [x1, y1] = WP[i], [x2, y2] = WP[i + 1]; const n = Math.abs(x2 - x1) + Math.abs(y2 - y1); for (let k = 0; k < n; k++) { const x = x1 + Math.sign(x2 - x1) * k, y = y1 + Math.sign(y2 - y1) * k; path.push([x, y]); if (x >= 0 && x < GW) onPath[y][x] = true; } }
    path.push(WP[WP.length - 1]);
    const pts = path.map(([x, y]) => [(x + 0.5) * C, (y + 0.5) * C]);
    const segLen = []; let total = 0; for (let i = 0; i < pts.length - 1; i++) { const l = U.dist(...pts[i], ...pts[i + 1]); segLen.push(l); total += l; }
    function posAt(d) { for (let i = 0; i < segLen.length; i++) { if (d <= segLen[i]) { const k = d / segLen[i]; return [U.lerp(pts[i][0], pts[i + 1][0], k), U.lerp(pts[i][1], pts[i + 1][1], k)]; } d -= segLen[i]; } return pts[pts.length - 1]; }
    const TW = {
      gun: { name: 'Gatling', col: '#60a5fa', cost: 50, lv: [{ r: 110, rate: 0.32, dmg: 7 }, { r: 120, rate: 0.24, dmg: 11 }, { r: 135, rate: 0.16, dmg: 16 }] },
      cannon: { name: 'Mortar', col: '#f97316', cost: 90, lv: [{ r: 125, rate: 1.3, dmg: 26, splash: 46 }, { r: 135, rate: 1.1, dmg: 42, splash: 54 }, { r: 150, rate: 0.9, dmg: 70, splash: 64 }] },
      frost: { name: 'Frost', col: '#67e8f9', cost: 70, lv: [{ r: 100, rate: 0.9, dmg: 3, slow: 0.45, splash: 36 }, { r: 110, rate: 0.8, dmg: 6, slow: 0.55, splash: 44 }, { r: 125, rate: 0.7, dmg: 10, slow: 0.65, splash: 54 }] },
      laser: { name: 'Prism', col: '#e879f9', cost: 140, lv: [{ r: 140, dps: 36 }, { r: 150, dps: 60 }, { r: 165, dps: 100 }] },
      tesla: { name: 'Tesla', col: '#facc15', cost: 160, lv: [{ r: 115, rate: 1.05, dmg: 22, chain: 3 }, { r: 125, rate: 0.9, dmg: 34, chain: 4 }, { r: 140, rate: 0.75, dmg: 52, chain: 6 }] },
    };
    const KEYS = Object.keys(TW);
    const ET = {
      creep: { hp: 30, sp: 52, col: '#a3e635', r: 10, gold: 4, armor: 0 },
      runner: { hp: 20, sp: 100, col: '#fbbf24', r: 8, gold: 4, armor: 0 },
      brute: { hp: 120, sp: 34, col: '#f87171', r: 15, gold: 10, armor: 4 },
      swarm: { hp: 10, sp: 75, col: '#c084fc', r: 6, gold: 1, armor: 0 },
      boss: { hp: 900, sp: 28, col: '#ef4444', r: 22, gold: 80, armor: 8 },
    };
    let towers = [], foes = [], shots = [], zaps = [], gold = 200, lives = 20, wave = 0, spawnQ = [], spawnT = 0, sel = 'gun', picked = null, hover = null, auto = 0, waveActive = false, won = false;
    const occupied = U.grid(GW, GH, null);
    const hudUpdate = () => { E.stat('Gold', gold); E.stat('Lives', lives); E.stat('Wave', `${wave}/30`); };
    hudUpdate();
    function startWave() {
      if (waveActive || wave >= 30) return;
      wave++; waveActive = true;
      const n = 8 + wave;
      spawnQ = [];
      for (let i = 0; i < n; i++) {
        let t = 'creep';
        if (wave >= 3 && i % 3 === 1) t = 'runner';
        if (wave >= 5 && i % 5 === 4) t = 'brute';
        if (wave >= 7 && i % 4 === 2) for (let k = 0; k < 3; k++) spawnQ.push('swarm');
        spawnQ.push(t);
      }
      if (wave % 10 === 0) spawnQ.push('boss');
      if (wave % 5 === 0 && wave % 10) spawnQ.push('brute', 'brute');
      const early = Math.max(0, Math.round(auto));
      if (wave > 1 && early > 0) { gold += early; E.pop(PX / 2, 60, `EARLY CALL +${early}g`, { color: '#facc15' }); }
      auto = 0; spawnT = 0.5; hudUpdate();
      E.banner(wave % 10 === 0 ? `WAVE ${wave} — BOSS` : `WAVE ${wave}`, null, { color: wave % 10 === 0 ? '#ef4444' : '#4ade80', life: 1.2 });
      E.sfx('charge', 0.8);
    }
    function spawn(t) { const d = ET[t], hp = d.hp * Math.pow(1 + wave * 0.22, 1.3); foes.push({ t, d: 0, hp, max: hp, slow: 0, slowK: 0, x: pts[0][0], y: pts[0][1], wob: U.rand(6) }); }
    function damage(f, dmg, type) {
      const armor = ET[f.t].armor, eff = type === 'laser' || type === 'tesla' ? dmg : Math.max(dmg * 0.25, dmg - armor);
      f.hp -= eff;
      if (f.hp <= 0 && !f.dead) {
        f.dead = true; const g0 = ET[f.t].gold; gold += g0; E.score += Math.round(ET[f.t].hp / 3) + wave * 2; hudUpdate();
        E.burst(f.x, f.y, { n: f.t === 'boss' ? 50 : 10, colors: [ET[f.t].col, '#fff'], speed: 160, life: 0.5, size: 3 });
        E.pop(f.x, f.y - 10, `+${g0}g`, { color: '#facc15', size: 13, life: 0.6 });
        if (Math.random() < 0.5) E.sfx('pop', 0.8 + Math.random() * 0.5, 0.3);
        if (f.t === 'boss') { E.shake(12); E.sfx('boom'); }
      }
    }
    function tStats(t) { return TW[t.type].lv[t.lv]; }
    function place(cx, cy) {
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || onPath[cy][cx]) return false;
      if (occupied[cy][cx]) { picked = occupied[cy][cx]; E.sfx('click'); return true; }
      const T = TW[sel];
      if (gold < T.cost) { E.sfx('error'); E.pop((cx + 0.5) * C, cy * C, 'Not enough gold', { color: '#f87171', size: 14 }); return false; }
      gold -= T.cost; hudUpdate();
      const tw = { type: sel, lv: 0, x: (cx + 0.5) * C, y: (cy + 0.5) * C, cx, cy, cd: 0, a: -Math.PI / 2, spent: T.cost, beam: null, heat: 0, kick: 0 };
      towers.push(tw); occupied[cy][cx] = tw; picked = tw;
      E.sfx('place'); E.ring(tw.x, tw.y, { color: T.col, r: 40 }); E.burst(tw.x, tw.y + 10, { n: 12, color: '#a8a29e', speed: 90, glow: false });
      return true;
    }
    function upgrade(tw) {
      if (!tw || tw.lv >= 2) return;
      const cost = Math.round(TW[tw.type].cost * (tw.lv === 0 ? 0.8 : 1.4));
      if (gold < cost) { E.sfx('error'); return; }
      gold -= cost; tw.spent += cost; tw.lv++; hudUpdate();
      E.sfx('power'); E.ring(tw.x, tw.y, { color: '#facc15', r: 50 }); E.burst(tw.x, tw.y, { n: 20, colors: ['#facc15', '#fff'], speed: 150 });
    }
    function sell(tw) {
      if (!tw) return;
      const back = Math.round(tw.spent * 0.7); gold += back; hudUpdate();
      towers = towers.filter((t) => t !== tw); occupied[tw.cy][tw.cx] = null; picked = null;
      E.sfx('coin'); E.pop(tw.x, tw.y - 20, `+${back}g`, { color: '#facc15' });
    }
    // panel layout
    const BTN = KEYS.map((k, i) => ({ k, x: PX + 12, y: 16 + i * 72, w: 136, h: 64 }));
    const WAVE_BTN = { x: PX + 12, y: 540, w: 136, h: 46 };
    return {
      update(dt) {
        // input
        KEYS.forEach((k, i) => { if (E.hit('Digit' + (i + 1))) { sel = k; picked = null; E.sfx('click'); } });
        if (E.hit('KeyN') || E.hit('Space')) startWave();
        if (E.hit('KeyU')) upgrade(picked);
        if (E.hit('KeyS', 'Delete', 'Backspace')) sell(picked);
        if (E.hit('Escape')) picked = null;
        const p = E.ptr;
        hover = p.x < PX ? [Math.floor(p.x / C), Math.floor(p.y / C)] : null;
        if (p.hit) {
          if (p.x < PX) { const [cx, cy] = hover; if (!place(cx, cy)) picked = null; }
          else {
            for (const b of BTN) if (U.ptInRect(p.x, p.y, b.x, b.y, b.w, b.h)) { sel = b.k; picked = null; E.sfx('click'); }
            if (U.ptInRect(p.x, p.y, WAVE_BTN.x, WAVE_BTN.y, WAVE_BTN.w, WAVE_BTN.h)) startWave();
            if (picked) {
              if (U.ptInRect(p.x, p.y, PX + 12, 392, 66, 36)) upgrade(picked);
              if (U.ptInRect(p.x, p.y, PX + 82, 392, 66, 36)) sell(picked);
            }
          }
        }
        if (!waveActive && wave > 0) auto = Math.max(0, auto - dt * 2);
        // spawn
        if (spawnQ.length) { spawnT -= dt; if (spawnT <= 0) { spawn(spawnQ.shift()); spawnT = spawnQ[0] === 'swarm' ? 0.18 : wave > 15 ? 0.5 : 0.75; } }
        // foes
        for (const f of foes) {
          const d = ET[f.t]; f.slow -= dt;
          f.d += d.sp * (f.slow > 0 ? 1 - f.slowK : 1) * dt; f.wob += dt * 8;
          [f.x, f.y] = posAt(f.d);
          if (f.d >= total) {
            f.dead = true; f.leaked = true; lives -= f.t === 'boss' ? 5 : 1; hudUpdate();
            E.sfx('hurt'); E.shake(8); E.flash('#ef4444', 0.25);
            if (lives <= 0) { lives = 0; hudUpdate(); E.over({ msg: `Held until wave ${wave}` }); return; }
          }
        }
        // towers
        for (const tw of towers) {
          const S = tStats(tw); tw.cd -= dt; tw.kick = Math.max(0, tw.kick - dt * 6);
          let target = null, best = -1;
          for (const f of foes) { if (f.dead) continue; if (U.dist2(f.x, f.y, tw.x, tw.y) <= S.r * S.r && f.d > best) { best = f.d; target = f; } }
          if (!target) { tw.beam = null; tw.heat = Math.max(0, tw.heat - dt); continue; }
          tw.a = U.ang(tw.x, tw.y, target.x, target.y);
          if (tw.type === 'laser') {
            if (tw.beam !== target) tw.heat = 0; tw.beam = target; tw.heat = Math.min(2, tw.heat + dt);
            damage(target, S.dps * (0.6 + tw.heat * 0.4) * dt, 'laser');
            if (Math.random() < 0.2) E.burst(target.x, target.y, { n: 1, color: '#f5d0fe', speed: 60, size: 2, life: 0.3 });
            continue;
          }
          if (tw.cd > 0) continue;
          tw.cd = S.rate; tw.kick = 1;
          if (tw.type === 'gun') { shots.push({ kind: 'bullet', x: tw.x + Math.cos(tw.a) * 18, y: tw.y + Math.sin(tw.a) * 18, t: target, sp: 700, dmg: S.dmg }); if (Math.random() < 0.4) E.sfx('shoot', 2.2, 0.15); }
          else if (tw.type === 'cannon') { shots.push({ kind: 'shell', x: tw.x, y: tw.y, sx: tw.x, sy: tw.y, tx: target.x, ty: target.y, k: 0, dur: 0.55, dmg: S.dmg, splash: S.splash }); E.sfx('thud', 1.2, 0.4); }
          else if (tw.type === 'frost') { shots.push({ kind: 'frost', x: tw.x, y: tw.y, t: target, sp: 420, dmg: S.dmg, splash: S.splash, slow: S.slow }); E.sfx('blip', 1.6, 0.2); }
          else if (tw.type === 'tesla') {
            const hit = [target]; let cur = target;
            for (let k = 1; k < S.chain; k++) { let nx = null, nd = 90 * 90; for (const f of foes) if (!f.dead && !hit.includes(f)) { const d = U.dist2(f.x, f.y, cur.x, cur.y); if (d < nd) { nd = d; nx = f; } } if (!nx) break; hit.push(nx); cur = nx; }
            zaps.push({ pts: [[tw.x, tw.y - 14], ...hit.map((f) => [f.x, f.y])], t: 0.2 });
            hit.forEach((f, i) => damage(f, S.dmg * Math.pow(0.8, i), 'tesla'));
            E.sfx('laser', 0.9, 0.3);
          }
        }
        // shots
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          if (s.kind === 'shell') {
            s.k += dt / s.dur; const k = Math.min(1, s.k);
            s.x = U.lerp(s.sx, s.tx, k); s.y = U.lerp(s.sy, s.ty, k) - Math.sin(k * Math.PI) * 60;
            if (k >= 1) { for (const f of foes) if (!f.dead && U.dist(f.x, f.y, s.tx, s.ty) < s.splash) damage(f, s.dmg, 'cannon'); E.burst(s.tx, s.ty, { n: 18, colors: ['#fdba74', '#f97316', '#fff'], speed: 160, life: 0.4 }); E.ring(s.tx, s.ty, { color: '#fdba74', r: s.splash }); E.sfx('explode', 1.5, 0.35); E.shake(2); shots.splice(i, 1); }
            continue;
          }
          const tx = s.t.x, ty = s.t.y, d = U.dist(s.x, s.y, tx, ty);
          if (d < 10 || s.t.dead) {
            if (!s.t.dead || s.kind === 'frost') {
              if (s.kind === 'frost') { for (const f of foes) if (!f.dead && U.dist(f.x, f.y, tx, ty) < s.splash) { damage(f, s.dmg, 'frost'); f.slowK = Math.max(f.slow > 0 ? f.slowK : 0, s.slow); f.slow = 1.6; } E.burst(tx, ty, { n: 10, colors: ['#cffafe', '#67e8f9'], speed: 90, life: 0.4 }); }
              else damage(s.t, s.dmg, 'gun');
            }
            shots.splice(i, 1); continue;
          }
          s.x += ((tx - s.x) / d) * s.sp * dt; s.y += ((ty - s.y) / d) * s.sp * dt;
        }
        for (let i = zaps.length - 1; i >= 0; i--) { zaps[i].t -= dt; if (zaps[i].t <= 0) zaps.splice(i, 1); }
        foes = foes.filter((f) => !f.dead);
        if (waveActive && !spawnQ.length && !foes.length) {
          waveActive = false; const bonus = 20 + wave * 3; gold += bonus; auto = 20 + wave; E.score += 100 * wave; hudUpdate();
          E.pop(PX / 2, 80, `WAVE CLEARED +${bonus}g`, { color: '#4ade80', size: 22 }); E.sfx('coin');
          if (wave >= 30 && !won) { won = true; E.score += lives * 500 + gold; E.sfx('win'); E.over({ win: true, title: 'Bastion Holds!', msg: `All 30 waves repelled with ${lives} lives left` }); }
        }
      },
      draw(g) {
        const t = E.t;
        // grass
        g.fillStyle = '#3f7d3a'; g.fillRect(0, 0, PX, H);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if ((x + y) % 2) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x * C, y * C, C, C); } }
        const rng = U.seeded(3); g.fillStyle = 'rgba(20,60,20,.35)'; for (let i = 0; i < 160; i++) { const x = rng() * PX, y = rng() * H; g.fillRect(x, y, 2, 5); g.fillRect(x + 3, y + 1, 2, 4); }
        // path
        g.lineCap = 'round'; g.lineJoin = 'round';
        const drawPath = (w, col) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
        drawPath(C + 6, '#6b5a3c'); drawPath(C - 4, '#b59b6a'); drawPath(C - 16, '#c7ae7c');
        g.setLineDash([2, 14]); drawPath(3, 'rgba(90,70,40,.4)'); g.setLineDash([]);
        // castle at exit
        const [ex, ey] = pts[pts.length - 1];
        D.fillRR(g, ex - 30, ey - 34, 34, 60, 4, '#64748b'); g.fillStyle = '#475569'; for (let i = 0; i < 3; i++) g.fillRect(ex - 30 + i * 12, ey - 42, 8, 10);
        D.poly(g, [[ex - 14, ey - 60], [ex - 14, ey - 44], [ex + 2, ey - 52]], '#ef4444');
        // hover
        if (hover && !picked) {
          const [cx, cy] = hover;
          if (cx >= 0 && cy >= 0 && cx < GW && cy < GH && !onPath[cy][cx] && !occupied[cy][cx]) {
            const S = TW[sel].lv[0];
            D.circle(g, (cx + 0.5) * C, (cy + 0.5) * C, S.r, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.35)', 1.5);
            g.fillStyle = gold >= TW[sel].cost ? 'rgba(255,255,255,.25)' : 'rgba(239,68,68,.35)'; g.fillRect(cx * C + 2, cy * C + 2, C - 4, C - 4);
          }
        }
        if (picked) { const S = tStats(picked); D.circle(g, picked.x, picked.y, S.r, 'rgba(250,204,21,.08)', 'rgba(250,204,21,.6)', 2); }
        // foes
        for (const f of foes) {
          const d = ET[f.t], bob = Math.sin(f.wob) * 1.5;
          D.shadow(g, f.x, f.y + d.r * 0.8, d.r, d.r * 0.35, 0.3);
          const c = f.slow > 0 ? U.mix(d.col, '#67e8f9', 0.55) : d.col;
          if (f.t === 'brute' || f.t === 'boss') { D.fillRR(g, f.x - d.r, f.y - d.r + bob, d.r * 2, d.r * 2, 6, c); D.fillRR(g, f.x - d.r + 3, f.y - d.r + 3 + bob, d.r * 2 - 6, 6, 3, 'rgba(255,255,255,.3)'); }
          else D.orb(g, f.x, f.y + bob, d.r, c);
          D.circle(g, f.x - d.r * 0.3, f.y - 2 + bob, Math.max(1.5, d.r * 0.18), '#111'); D.circle(g, f.x + d.r * 0.3, f.y - 2 + bob, Math.max(1.5, d.r * 0.18), '#111');
          if (f.hp < f.max) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(f.x - d.r, f.y - d.r - 8, d.r * 2, 4); g.fillStyle = '#4ade80'; g.fillRect(f.x - d.r, f.y - d.r - 8, d.r * 2 * Math.max(0, f.hp / f.max), 4); }
        }
        // towers
        for (const tw of towers) {
          const T = TW[tw.type];
          D.shadow(g, tw.x, tw.y + 14, 17, 6, 0.35);
          D.fillRR(g, tw.x - 16, tw.y - 12, 32, 28, 7, '#475569'); D.fillRR(g, tw.x - 16, tw.y - 12, 32, 10, 5, '#64748b');
          for (let i = 0; i <= tw.lv; i++) D.circle(g, tw.x - 8 + i * 8, tw.y + 10, 2.5, '#facc15');
          g.save(); g.translate(tw.x, tw.y - 6); g.rotate(tw.a);
          const kb = tw.kick * 3;
          if (tw.type === 'gun') { D.fillRR(g, 2 - kb, -5, 18, 4, 2, '#1e293b'); D.fillRR(g, 2 - kb, 1, 18, 4, 2, '#1e293b'); D.circle(g, 0, 0, 10, T.col); }
          else if (tw.type === 'cannon') { D.fillRR(g, -2 - kb, -6, 20, 12, 5, '#1e293b'); D.circle(g, 0, 0, 11, T.col); }
          else if (tw.type === 'frost') { D.star(g, 0, 0, 12, 5, 6, t, T.col, '#fff'); }
          else if (tw.type === 'laser') { D.poly(g, [[16, 0], [-8, -9], [-8, 9]], T.col, '#fff', 1.5); D.glow(g, 10, 0, 14 + tw.heat * 6, T.col, 0.7); }
          else { g.rotate(-tw.a); D.fillRR(g, -4, -16, 8, 18, 3, '#94a3b8'); D.circle(g, 0, -18, 7, T.col); D.glow(g, 0, -18, 18, T.col, 0.5 + 0.3 * Math.sin(t * 10)); }
          g.restore();
          if (tw.beam && !tw.beam.dead) { g.strokeStyle = T.col; g.lineWidth = 3 + tw.heat * 2; g.globalAlpha = 0.85; D.line(g, tw.x, tw.y - 6, tw.beam.x, tw.beam.y, T.col, 2 + tw.heat * 2); D.line(g, tw.x, tw.y - 6, tw.beam.x, tw.beam.y, '#fff', 1); g.globalAlpha = 1; D.glow(g, tw.beam.x, tw.beam.y, 20, T.col, 0.8); }
        }
        for (const s of shots) {
          if (s.kind === 'bullet') D.circle(g, s.x, s.y, 3, '#dbeafe');
          else if (s.kind === 'shell') { D.circle(g, s.x, s.y, 6, '#1f2937'); D.glow(g, s.x, s.y, 12, '#f97316', 0.5); }
          else { D.glow(g, s.x, s.y, 14, '#67e8f9', 0.9); D.circle(g, s.x, s.y, 4, '#ecfeff'); }
        }
        for (const z of zaps) { g.globalAlpha = z.t / 0.2; g.strokeStyle = '#fef08a'; g.lineWidth = 2.5; g.beginPath(); z.pts.forEach(([x, y], i) => { if (!i) g.moveTo(x, y); else { const [px, py] = z.pts[i - 1]; for (let k = 1; k <= 4; k++) g.lineTo(U.lerp(px, x, k / 4) + (k < 4 ? U.rand(-8, 8) : 0), U.lerp(py, y, k / 4) + (k < 4 ? U.rand(-8, 8) : 0)); } }); g.stroke(); g.globalAlpha = 1; }
        // panel
        g.save(); g.beginPath(); g.rect(PX, 0, W - PX, H); g.clip();
        D.bg(g, W, H, '#111827', '#030712');
        BTN.forEach((b, i) => {
          const T = TW[b.k], on = sel === b.k && !picked, afford = gold >= T.cost;
          D.fillRR(g, b.x, b.y, b.w, b.h, 10, on ? U.rgba(T.col, 0.25) : 'rgba(255,255,255,.04)');
          D.strokeRR(g, b.x, b.y, b.w, b.h, 10, on ? T.col : 'rgba(255,255,255,.1)', 2);
          D.circle(g, b.x + 24, b.y + b.h / 2, 13, T.col);
          D.text(g, `${i + 1}`, b.x + 24, b.y + b.h / 2 + 1, { size: 12, color: '#0f172a' });
          D.text(g, T.name, b.x + 46, b.y + 22, { size: 15, align: 'left', color: afford ? '#fff' : '#64748b' });
          D.text(g, `${T.cost}g`, b.x + 46, b.y + 44, { size: 13, align: 'left', font: 'mono', color: afford ? '#facc15' : '#7f1d1d' });
        });
        if (picked) {
          const T = TW[picked.type], S = tStats(picked);
          D.fillRR(g, PX + 8, 380 - 22, 144, 150, 12, 'rgba(250,204,21,.07)');
          D.text(g, `${T.name} · LV ${picked.lv + 1}`, PX + 80, 374, { size: 13, color: '#facc15' });
          const up = picked.lv < 2 ? Math.round(T.cost * (picked.lv === 0 ? 0.8 : 1.4)) : null;
          D.fillRR(g, PX + 12, 392, 66, 36, 8, up && gold >= up ? '#16a34a' : '#334155'); D.text(g, up ? `▲ ${up}` : 'MAX', PX + 45, 410, { size: 13, color: '#fff' });
          D.fillRR(g, PX + 82, 392, 66, 36, 8, '#7f1d1d'); D.text(g, `$ ${Math.round(picked.spent * 0.7)}`, PX + 115, 410, { size: 13, color: '#fff' });
          D.text(g, `Range ${S.r}${S.dmg ? ' · Dmg ' + S.dmg : ''}${S.dps ? ' · DPS ' + S.dps : ''}`, PX + 80, 448, { size: 11, font: 'ui', color: '#cbd5e1' });
          D.text(g, 'U upgrade · S sell', PX + 80, 468, { size: 10, font: 'mono', color: '#64748b' });
        }
        const wbOn = !waveActive && wave < 30;
        D.fillRR(g, WAVE_BTN.x, WAVE_BTN.y, WAVE_BTN.w, WAVE_BTN.h, 12, wbOn ? '#16a34a' : '#1f2937');
        D.text(g, wbOn ? (wave === 0 ? 'START ▶' : `WAVE ${wave + 1} ▶`) : 'IN PROGRESS', WAVE_BTN.x + WAVE_BTN.w / 2, WAVE_BTN.y + 18, { size: 15, color: wbOn ? '#fff' : '#64748b' });
        if (wbOn && wave > 0) D.text(g, `early +${Math.round(auto)}g`, WAVE_BTN.x + WAVE_BTN.w / 2, WAVE_BTN.y + 34, { size: 10, font: 'mono', color: '#bbf7d0' });
        g.restore();
        D.vignette(g, PX, H, 0.3);
      },
    };
  },
});

MG.add({
  id: 'bullet', name: 'Bullet Ballet', cat: 'Action', color: '#f0abfc', color2: '#67e8f9',
  desc: 'Pure dodging. Survive a choreographed bullet-hell recital, one named movement after another.',
  how: ['Move with mouse / touch or <kbd>←↑↓→</kbd>', 'Hold <kbd>Shift</kbd> to move precisely — only your tiny core can be hit', 'Brushing past bullets (grazing) scores bonus points', 'Three hits and the curtain falls'],
  pad: 'LRUDB', padLabels: { B: 'SLOW' },
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2 - 20;
    const pl = { x: CX, y: H - 110, hp: 3, inv: 0, trail: [] };
    let bullets = [], lasers = [], time = 0, mvIdx = -1, mvT = 0, beatT = 0, beat = 0, grazes = 0, usePtr = false, pause = 1.5, name = '', spin = 0;
    const BPM = 124, BEAT = 60 / BPM;
    const lvl = () => 1 + time / 60;
    function shoot(x, y, a, sp, o = {}) { bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.r || 6, col: o.col || '#f0abfc', home: o.home || 0, life: o.life || 12, acc: o.acc || 0, grazed: false, curve: o.curve || 0 }); }
    const MOVES = [
      { name: 'Spiral Waltz', beat(b) { const arms = 3 + Math.min(2, Math.floor(lvl() - 1)); for (let k = 0; k < arms; k++) shoot(CX, CY, spin + (k / arms) * U.TAU, 150 * Math.sqrt(lvl()), { col: '#f0abfc' }); }, sub: 4, tick(dt) { spin += dt * 1.6; } },
      { name: 'Blooming Flower', beat(b) { if (b % 2) return; const n = 18 + Math.floor(lvl() * 4), off = (b % 4) * 0.08; for (let k = 0; k < n; k++) shoot(CX, CY, off + (k / n) * U.TAU, 120 * Math.sqrt(lvl()), { col: '#67e8f9', curve: b % 4 ? 0.5 : -0.5 }); } , sub: 1 },
      { name: 'Autumn Rain', beat() { for (let k = 0; k < 3 + lvl(); k++) shoot(U.rand(W), -10, Math.PI / 2 + U.rand(-0.2, 0.2), U.rand(140, 220) * Math.sqrt(lvl()), { col: '#fcd34d', r: 5, acc: 60 }); }, sub: 2 },
      { name: 'Crossfire', beat(b) { const side = b % 2 ? 0 : W; const y = pl.y + U.rand(-60, 60); for (let k = -2; k <= 2; k++) shoot(side, y + k * 22, side ? Math.PI : 0, 260 * Math.sqrt(lvl()), { col: '#a3e635', r: 5 }); }, sub: 1 },
      { name: 'Laser Lattice', beat(b) { if (b % 2) return; const vert = b % 4 === 0; const pos = vert ? U.clamp(pl.x + U.rand(-120, 120), 30, W - 30) : U.clamp(pl.y + U.rand(-90, 90), 30, H - 30); lasers.push({ vert, pos, t: 0, warn: Math.max(0.55, 0.9 - time * 0.003), dur: 0.5 }); if (lvl() > 1.5) lasers.push({ vert: !vert, pos: vert ? U.rand(40, H - 40) : U.rand(40, W - 40), t: 0, warn: 0.9, dur: 0.5 }); }, sub: 1 },
      { name: 'Hunting Moths', beat(b) { if (b % 2) return; for (const [x, y] of [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]]) shoot(x, y, U.ang(x, y, pl.x, pl.y), 120, { col: '#fb7185', r: 8, home: 1.6, life: 5 }); }, sub: 1 },
      { name: 'Closing Circle', beat(b) { if (b % 4) return; const n = 36, gap = U.rand(U.TAU); for (let k = 0; k < n; k++) { const a = (k / n) * U.TAU; if (Math.abs(U.angDiff(a, gap)) < 0.38) continue; shoot(pl.x + Math.cos(a) * 320, pl.y + Math.sin(a) * 320, a + Math.PI, 110 * Math.sqrt(lvl()), { col: '#c4b5fd', life: 4 }); } }, sub: 1 },
      { name: 'Double Helix', beat() { for (const s of [-1, 1]) shoot(CX, CY, spin * s, 190 * Math.sqrt(lvl()), { col: s > 0 ? '#67e8f9' : '#f0abfc', r: 5 }); }, sub: 8, tick(dt) { spin += dt * 2.6; } },
    ];
    const order = U.shuffle(U.range(MOVES.length));
    function nextMove() {
      mvIdx++; mvT = 0; pause = 1.4;
      const m = MOVES[order[mvIdx % order.length]];
      name = m.name;
      E.banner(m.name, `Movement ${mvIdx + 1}`, { color: '#f0abfc', life: 1.6 });
      if (mvIdx > 0) { E.score += 250 * mvIdx; E.sfx('power', 1, 0.6); }
    }
    nextMove();
    E.stat('HP', '♥♥♥');
    return {
      update(dt) {
        time += dt; E.score += Math.round(dt * 60);
        E.stat('Time', U.fmtTime(time, 0));
        // player
        const slow = E.down('ShiftLeft', 'ShiftRight', 'B');
        const a = E.axis();
        if (a.x || a.y) usePtr = false; else if (E.ptr.moved || E.ptr.down) usePtr = true;
        if (usePtr) { const f = slow ? 8 : 18; pl.x = U.damp(pl.x, E.ptr.x, f, dt); pl.y = U.damp(pl.y, E.ptr.y, f, dt); }
        else { const sp = slow ? 150 : 330, l = Math.hypot(a.x, a.y) || 1; pl.x += (a.x / l) * sp * dt; pl.y += (a.y / l) * sp * dt; }
        pl.x = U.clamp(pl.x, 8, W - 8); pl.y = U.clamp(pl.y, 8, H - 8);
        pl.trail.push([pl.x, pl.y]); if (pl.trail.length > 14) pl.trail.shift();
        pl.inv -= dt;
        // choreography
        const m = MOVES[order[mvIdx % order.length]];
        if (pause > 0) pause -= dt;
        else {
          mvT += dt; m.tick && m.tick(dt);
          beatT += dt;
          const sub = BEAT / (m.sub || 1);
          while (beatT >= sub) { beatT -= sub; beat++; m.beat(beat); if (beat % (m.sub || 1) === 0) E.tone({ f: beat % 4 === 0 ? 110 : 165, dur: 0.05, type: 'sine', vol: 0.12 }); }
          if (mvT > 9.5) nextMove();
        }
        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.life -= dt;
          if (b.home) { const ang = U.ang(b.x, b.y, pl.x, pl.y), sp = Math.hypot(b.vx, b.vy); const cur = Math.atan2(b.vy, b.vx); const na = cur + U.clamp(U.angDiff(cur, ang), -b.home * dt, b.home * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
          if (b.curve) { const ca = Math.atan2(b.vy, b.vx) + b.curve * dt, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(ca) * sp; b.vy = Math.sin(ca) * sp; }
          if (b.acc) b.vy += b.acc * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          const d = U.dist(b.x, b.y, pl.x, pl.y);
          if (d < b.r * 0.7 + 2.5 && pl.inv <= 0) { hit(); bullets.splice(i, 1); continue; }
          if (d < b.r + 16 && !b.grazed) { b.grazed = true; grazes++; E.score += 15; E.stat('Graze', grazes); E.sfx('tick', 2.4, 0.25); E.burst(pl.x, pl.y, { n: 2, color: '#fff', speed: 90, size: 1.5, life: 0.25 }); }
          if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > W + 40 || b.y > H + 40) bullets.splice(i, 1);
        }
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i]; l.t += dt;
          if (l.t > l.warn && !l.fired) { l.fired = true; E.sfx('laser', 0.5, 0.5); E.shake(4); }
          if (l.fired && pl.inv <= 0 && Math.abs((l.vert ? pl.x : pl.y) - l.pos) < 14) hit();
          if (l.t > l.warn + l.dur) lasers.splice(i, 1);
        }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1a0f2e', '#05030c', CX, CY);
        // stage floor rings pulsing on beat
        const pulse = 1 - (beatT / BEAT) % 1;
        for (let k = 1; k <= 6; k++) D.circle(g, CX, CY, k * 70 + pulse * 6, null, `rgba(240,171,252,${0.05 + (k === 1 ? pulse * 0.1 : 0)})`, 1.5);
        D.glow(g, CX, CY, 70 + pulse * 20, '#f0abfc', 0.25);
        D.star(g, CX, CY, 16, 7, 6, spin, 'rgba(240,171,252,.7)');
        for (const l of lasers) {
          if (!l.fired) { g.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(l.t * 20)); g.fillStyle = '#fda4af'; if (l.vert) g.fillRect(l.pos - 1, 0, 2, H); else g.fillRect(0, l.pos - 1, W, 2); g.globalAlpha = 1; }
          else { const k = 1 - (l.t - l.warn) / l.dur, w = 26 * k + 4; g.fillStyle = 'rgba(251,113,133,.35)'; if (l.vert) g.fillRect(l.pos - w, 0, w * 2, H); else g.fillRect(0, l.pos - w, W, w * 2); g.fillStyle = '#fff'; if (l.vert) g.fillRect(l.pos - w * 0.3, 0, w * 0.6, H); else g.fillRect(0, l.pos - w * 0.3, W, w * 0.6); }
        }
        for (const b of bullets) { D.glow(g, b.x, b.y, b.r * 3, b.col, 0.55); D.circle(g, b.x, b.y, b.r, b.col); D.circle(g, b.x, b.y, b.r * 0.5, '#fff'); }
        // player
        g.lineCap = 'round';
        for (let i = 1; i < pl.trail.length; i++) { g.strokeStyle = `rgba(103,232,249,${(i / pl.trail.length) * 0.5})`; g.lineWidth = (i / pl.trail.length) * 8; g.beginPath(); g.moveTo(pl.trail[i - 1][0], pl.trail[i - 1][1]); g.lineTo(pl.trail[i][0], pl.trail[i][1]); g.stroke(); }
        if (pl.inv <= 0 || Math.sin(t * 30) > 0) {
          D.glow(g, pl.x, pl.y, 40, '#67e8f9', 0.8);
          D.heart(g, pl.x, pl.y + 3, 14, '#e0f7ff');
          D.circle(g, pl.x, pl.y, 3, '#f43f5e');
          if (E.down('ShiftLeft', 'ShiftRight', 'B')) D.circle(g, pl.x, pl.y, 16, null, 'rgba(255,255,255,.4)', 1);
        }
        D.text(g, name, 20, 26, { size: 15, align: 'left', color: 'rgba(240,171,252,.7)', font: 'display' });
        g.fillStyle = 'rgba(240,171,252,.5)'; g.fillRect(20, 40, 150 * Math.min(1, mvT / 9.5), 2);
        for (let i = 0; i < 3; i++) D.heart(g, W - 30 - i * 26, 26, 11, i < pl.hp ? '#fb7185' : 'rgba(255,255,255,.15)');
        D.vignette(g, W, H, 0.5);
      },
    };
    function hit() {
      pl.hp--; pl.inv = 1.8;
      E.stat('HP', pl.hp > 0 ? '♥'.repeat(pl.hp) : '—');
      E.sfx('hurt'); E.shake(12); E.flash('#fb7185', 0.35); E.freeze(0.08); E.vibrate(150);
      E.burst(pl.x, pl.y, { n: 40, colors: ['#fb7185', '#fff', '#67e8f9'], speed: 300 });
      bullets = bullets.filter((b) => U.dist(b.x, b.y, pl.x, pl.y) > 120);
      if (pl.hp <= 0) E.over({ msg: `Survived ${U.fmtTime(time, 1)} · ${grazes} grazes · ${mvIdx} movements` });
    }
  },
});

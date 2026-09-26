MG.add({
  id: 'pulse', name: 'Pulse Dash', cat: 'Runner', color: '#22d3ee', color2: '#a3e635',
  desc: 'A one-button rhythm runner. Jump spikes, ride pads, tap orbs mid-air and reach 100%.',
  how: ['<kbd>Space</kbd> / <kbd>↑</kbd> / click to jump — hold to keep jumping on landing', 'Yellow pads launch you · tap inside a yellow ring for a mid-air jump', 'Land on blocks, never hit their sides', 'Three attempts per run — your best % is your score'],
  pad: 'A', padLabels: { A: 'JUMP' }, unit: '%', music: false,
  make(E) {
    const W = 960, H = 600, C = 44, GROUND = 460, SPEED = 10.4 * C, BPM = 130;
    const r = U.seeded(20260926);
    // level built from chunks (grid units: x in cells, y cells above ground)
    const objs = [];
    let x = 18;
    const CH = [
      () => { objs.push({ t: 'spike', x, y: 0 }); x += 7; },
      () => { objs.push({ t: 'spike', x, y: 0 }, { t: 'spike', x: x + 1, y: 0 }); x += 8; },
      () => { objs.push({ t: 'spike', x, y: 0 }, { t: 'spike', x: x + 1, y: 0 }, { t: 'spike', x: x + 2, y: 0 }); x += 9; },
      () => { objs.push({ t: 'block', x, y: 0 }, { t: 'block', x: x + 1, y: 0 }, { t: 'block', x: x + 2, y: 1 }, { t: 'block', x: x + 3, y: 1 }, { t: 'spike', x: x + 4, y: 0 }, { t: 'spike', x: x + 5, y: 0 }); x += 10; },
      () => { for (let k = 0; k < 3; k++) objs.push({ t: 'block', x: x + k * 4, y: k }, { t: 'block', x: x + k * 4 + 1, y: k }); objs.push({ t: 'spike', x: x + 2, y: 0 }, { t: 'spike', x: x + 6, y: 0 }, { t: 'spike', x: x + 7, y: 0 }); x += 14; },
      () => { objs.push({ t: 'pad', x, y: 0 }); for (let k = 3; k < 8; k++) objs.push({ t: 'spike', x: x + k, y: 0 }); x += 12; },
      () => { objs.push({ t: 'spike', x, y: 0 }, { t: 'orb', x: x + 4, y: 2.4 }, { t: 'spike', x: x + 5, y: 0 }, { t: 'spike', x: x + 6, y: 0 }, { t: 'spike', x: x + 7, y: 0 }, { t: 'spike', x: x + 8, y: 0 }); x += 13; },
      () => { for (let k = 0; k < 6; k++) objs.push({ t: 'block', x: x + k, y: 1 }); objs.push({ t: 'spike', x: x + 2, y: 2 }); for (let k = 0; k < 6; k++) objs.push({ t: 'spike', x: x + k, y: 0, small: true }); x += 11; },
      () => { objs.push({ t: 'block', x, y: 0 }, { t: 'spike', x: x + 1, y: 0 }, { t: 'spike', x: x + 2, y: 0 }, { t: 'block', x: x + 3, y: 0 }, { t: 'block', x: x + 3, y: 1 }); x += 9; },
    ];
    const order = [0, 0, 1, 0, 3, 1, 5, 0, 2, 4, 6, 1, 3, 7, 2, 5, 8, 4, 6, 2, 3, 5, 7, 8, 6, 4, 2, 1, 6, 5, 8, 7, 3, 2, 6, 4, 5, 8, 7, 2, 6, 6, 3, 8, 5, 7, 4, 2];
    for (const i of order) { CH[i](); if (r() < 0.25) x += 2; }
    const END = x + 12;
    let pl, attempt = 0, best = 0, state, stateT, camX, beatT = 0, pulse = 0, trail = [], particlesT = 0;
    function reset() {
      attempt++; E.stat('Attempt', `${attempt}/3`);
      pl = { x: 4 * C, y: 0, vy: 0, rot: 0, ground: true, dead: false, orbUsed: null };
      camX = 0; state = 'run'; trail = [];
      E.sfx('select');
    }
    reset();
    const gridX = (cx) => cx * C, worldY = (cy) => GROUND - cy * C;
    const progress = () => U.clamp((pl.x / C - 4) / (END - 4), 0, 1);
    function die() {
      if (pl.dead) return;
      pl.dead = true; state = 'dead'; stateT = 0.9;
      const p = Math.floor(progress() * 100); if (p > best) { best = p; E.score = best; }
      E.sfx('explode', 1.2); E.shake(12); E.flash('#fff', 0.4); E.vibrate(150);
      E.burst(180, GROUND - pl.y - C / 2, { n: 50, colors: ['#22d3ee', '#a3e635', '#fff'], speed: 380, shape: 'square', size: 4 });
      E.pop(W / 2, 160, `${p}%`, { color: '#fff', size: 48, life: 1 });
    }
    return {
      update(dt) {
        beatT += dt; if (beatT > 60 / BPM) { beatT -= 60 / BPM; pulse = 1; E.tone({ f: 55, f2: 40, dur: 0.12, type: 'sine', vol: 0.35 }); }
        pulse = Math.max(0, pulse - dt * 4);
        if (state === 'dead') { stateT -= dt; if (stateT <= 0) { if (attempt >= 3) { state = 'over'; E.over({ msg: `Best ${best}% · ${attempt} attempts` }); } else reset(); } return; }
        if (state === 'win') { stateT -= dt; if (stateT <= 0) { state = 'over'; E.over({ win: true, title: 'Level Complete!', msg: `Finished on attempt ${attempt}` }); } return; }
        if (state !== 'run') return;
        const press = E.hit('A', 'U') || E.ptr.hit, hold = E.down('A', 'U') || E.ptr.down;
        pl.x += SPEED * dt;
        pl.vy -= 2900 * dt; // pixels/s, y up
        const py0 = pl.y;
        pl.y += pl.vy * dt;
        pl.ground = false;
        const px = pl.x, size = C * 0.9;
        const pxL = px - size / 2, pxR = px + size / 2;
        // ground
        if (pl.y <= 0) { pl.y = 0; pl.vy = 0; pl.ground = true; }
        // objects
        for (const o of objs) {
          const ox = gridX(o.x), oy = o.y * C;
          if (ox > px + C * 2 || ox + C < px - C * 2) continue;
          if (o.t === 'block') {
            if (pxR > ox + 2 && pxL < ox + C - 2) {
              if (py0 >= oy + C - 4 && pl.y <= oy + C) { pl.y = oy + C; pl.vy = 0; pl.ground = true; }
              else if (pl.y < oy + C - 6 && pl.y + size > oy + 4) { die(); return; }
            }
          } else if (o.t === 'spike') {
            const h = o.small ? C * 0.45 : C * 0.8, cx = ox + C / 2;
            if (Math.abs(px - cx) < C * 0.32 && pl.y < oy + h * 0.7 && pl.y + size > oy + 4) { die(); return; }
          } else if (o.t === 'pad') {
            if (Math.abs(px - (ox + C / 2)) < C * 0.6 && pl.y <= oy + 8 && pl.vy <= 0) { pl.vy = 1320; pl.ground = false; E.sfx('bounce', 1.6); E.burst(ox + C / 2 - camX + 180 - 4 * C, GROUND - 6, { n: 14, color: '#facc15', speed: 200, angle: -Math.PI / 2, spread: 1 }); }
          } else if (o.t === 'orb') {
            const cx = ox + C / 2, cy = oy + C / 2;
            if (U.dist(px, pl.y + size / 2, cx, cy) < C * 0.95 && press && pl.orbUsed !== o) { pl.orbUsed = o; pl.vy = 980; E.sfx('power', 1.4, 0.5); E.ring(cx - camX + 180 - 4 * C, GROUND - cy, { color: '#facc15', r: 60 }); }
          }
        }
        if (pl.ground && (press || hold)) { pl.vy = 900; pl.ground = false; E.sfx('jump', 1.2, 0.35); }
        // rotation: spin in air, snap on ground
        if (!pl.ground) pl.rot += dt * 7.2;
        else pl.rot = U.damp(pl.rot, Math.round(pl.rot / (Math.PI / 2)) * (Math.PI / 2), 25, dt);
        camX = pl.x - 4 * C;
        trail.push([pl.x, pl.y]); if (trail.length > 14) trail.shift();
        particlesT -= dt;
        if (pl.ground && particlesT <= 0) { particlesT = 0.03; E.burst(180 - size / 2, GROUND - pl.y, { n: 1, color: '#22d3ee', speed: 80, angle: Math.PI + 0.4, spread: 0.6, life: 0.35, size: 2.5 }); }
        const p = Math.floor(progress() * 100); E.stat('Progress', p + '%');
        if (pl.x / C >= END) { state = 'win'; stateT = 1.8; best = 100; E.score = 100 + (4 - attempt) * 50; E.sfx('win'); E.flash('#a3e635', 0.4); E.banner('100%', 'LEVEL COMPLETE', { color: '#a3e635' }); }
      },
      draw(g) {
        const t = E.t, hue = 190 + progress() * 140;
        const bg1 = U.hsl(hue % 360, 70, 16), bg2 = U.hsl((hue + 40) % 360, 70, 8);
        D.bg(g, W, H, bg1, bg2);
        // parallax squares
        g.save(); g.globalAlpha = 0.08 + pulse * 0.06; g.strokeStyle = U.hsl(hue % 360, 90, 70); g.lineWidth = 2;
        for (let i = 0; i < 12; i++) { const s = 60 + (i % 3) * 40, xx = U.wrap(i * 150 - camX * 0.2, -200, W + 200), yy = 80 + (i * 97) % 300; g.strokeRect(xx, yy, s, s); }
        g.restore();
        const ox = 180 - 4 * C - camX + 4 * C - 4 * C; // screen x of world 0
        const sx = (wx) => wx - camX + 180 - 4 * C;
        // ground
        const gg = g.createLinearGradient(0, GROUND, 0, H); gg.addColorStop(0, U.hsl(hue % 360, 70, 22)); gg.addColorStop(1, U.hsl(hue % 360, 70, 10));
        g.fillStyle = gg; g.fillRect(0, GROUND, W, H - GROUND);
        D.line(g, 0, GROUND, W, GROUND, '#fff', 3); D.glow(g, W / 2, GROUND, 500, U.hsl(hue % 360, 90, 60), 0.12 + pulse * 0.1);
        g.strokeStyle = 'rgba(255,255,255,.08)'; for (let gx = -((camX) % C); gx < W; gx += C) { g.beginPath(); g.moveTo(gx, GROUND); g.lineTo(gx, H); g.stroke(); }
        void ox;
        for (const o of objs) {
          const x = sx(gridX(o.x)); if (x < -C || x > W + C) continue;
          const y = worldY(o.y);
          if (o.t === 'block') { D.fillRR(g, x + 1, y - C + 1, C - 2, C - 2, 4, 'rgba(0,0,0,.55)'); D.strokeRR(g, x + 2, y - C + 2, C - 4, C - 4, 4, '#fff', 2.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 6, y - C + 6, C - 12, C - 12); }
          else if (o.t === 'spike') { const h = o.small ? C * 0.45 : C * 0.8; D.poly(g, [[x + 4, y], [x + C / 2, y - h], [x + C - 4, y]], 'rgba(0,0,0,.7)', '#fff', 2.5); }
          else if (o.t === 'pad') { D.glow(g, x + C / 2, y - 4, 30, '#facc15', 0.8); D.fillRR(g, x + 6, y - 8, C - 12, 8, 4, '#facc15'); }
          else if (o.t === 'orb') { const cy = y - C / 2; D.glow(g, x + C / 2, cy, 40, '#facc15', 0.5 + pulse * 0.3); D.circle(g, x + C / 2, cy, 14 + pulse * 3, null, '#facc15', 4); D.circle(g, x + C / 2, cy, 6, '#fff'); }
        }
        // finish
        const fx = sx(END * C); if (fx < W + 50) { for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#fff' : '#111'; g.fillRect(fx, GROUND - (k + 1) * 30, 16, 30); } }
        // trail + player
        if (!pl.dead) {
          const size = C * 0.9;
          g.lineCap = 'round';
          for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(163,230,53,${(i / trail.length) * 0.5})`; g.lineWidth = (i / trail.length) * 16; g.beginPath(); g.moveTo(sx(trail[i - 1][0]), GROUND - trail[i - 1][1] - size / 2); g.lineTo(sx(trail[i][0]), GROUND - trail[i][1] - size / 2); g.stroke(); }
          g.save(); g.translate(sx(pl.x), GROUND - pl.y - size / 2); g.rotate(pl.rot);
          D.glow(g, 0, 0, 50, '#a3e635', 0.5);
          D.fillRR(g, -size / 2, -size / 2, size, size, 5, '#a3e635');
          D.fillRR(g, -size / 2 + 6, -size / 2 + 6, size - 12, size - 12, 3, '#22d3ee');
          g.fillStyle = '#0f172a'; g.fillRect(-10, -8, 6, 6); g.fillRect(4, -8, 6, 6); g.fillRect(-10, 4, 20, 4);
          g.restore();
        }
        // progress bar
        D.fillRR(g, W / 2 - 200, 16, 400, 10, 5, 'rgba(255,255,255,.12)');
        D.fillRR(g, W / 2 - 200, 16, 400 * progress(), 10, 5, '#a3e635');
        D.text(g, Math.floor(progress() * 100) + '%', W / 2 + 230, 21, { size: 16, font: 'mono', align: 'left' });
        D.text(g, `ATTEMPT ${attempt}`, 24, 26, { size: 16, align: 'left', color: 'rgba(255,255,255,.7)' });
        if (best) D.text(g, `BEST ${best}%`, W - 24, 26, { size: 14, font: 'mono', align: 'right', color: '#a3e635' });
      },
    };
  },
});

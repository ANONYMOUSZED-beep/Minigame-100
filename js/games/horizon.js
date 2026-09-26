MG.add({
  id: 'horizon', name: 'Horizon Racer', cat: 'Sports', color: '#fb7185', color2: '#fbbf24',
  desc: 'A sunset pseudo-3D arcade racer. Weave through traffic, carve curves and beat the checkpoint clock.',
  how: ['Steer with <kbd>←</kbd> <kbd>→</kbd> (or hold the left / right side) — the car accelerates itself', '<kbd>↓</kbd> brakes · <kbd>Space</kbd> fires nitro (refills at checkpoints)', 'Grass slows you down; roadside objects stop you dead', 'Each checkpoint adds time — reach as many as you can'],
  pad: 'LRDA', padLabels: { A: 'NITRO' },
  make(E) {
    const W = 960, H = 600, SEG = 200, ROAD = 2000, LANES = 3, CAM_H = 1000, DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180), DRAW = 220, RUMBLE = 3;
    const MAXS = SEG * 60, ACC = MAXS / 5, BRK = -MAXS, DEC = -MAXS / 5, OFF_DEC = -MAXS / 2, OFF_LIM = MAXS / 4, CENT = 0.3;
    const segs = [];
    const lastY = () => (segs.length ? segs[segs.length - 1].p2.wy : 0);
    function addSeg(curve, y) { const n = segs.length; segs.push({ i: n, curve, p1: { wy: lastY(), wz: n * SEG }, p2: { wy: y, wz: (n + 1) * SEG }, sprites: [], cars: [], color: Math.floor(n / RUMBLE) % 2 }); }
    const easeIn = (a, b, p) => a + (b - a) * Math.pow(p, 2), easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
    function addRoad(enter, hold, leave, curve, hill) {
      const sy = lastY(), ey = sy + hill * SEG, tot = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
      for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(sy, ey, (enter + n) / tot));
      for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
    }
    addRoad(25, 25, 25, 0, 0);
    for (let k = 0; k < 36; k++) {
      const len = U.pick([25, 50, 75]), curve = U.pick([0, 0, 2, -2, 4, -4, 6, -6]), hill = U.pick([0, 0, 20, -20, 40, -40, 60]);
      addRoad(len, len, len, curve, hill);
    }
    addRoad(50, 50, 50, 0, -lastY() / SEG);
    const LEN = segs.length * SEG;
    // sprites
    const spr = {};
    function mk(name, w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); spr[name] = c; }
    mk('palm', 200, 420, (g, w, h) => {
      g.strokeStyle = '#7c4a2a'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(w / 2 + 10, h); g.quadraticCurveTo(w / 2 - 30, h * 0.5, w / 2, 70); g.stroke();
      g.strokeStyle = '#5b341c'; g.lineWidth = 4; for (let y = 120; y < h; y += 26) { g.beginPath(); g.moveTo(w / 2 - 20 + (y / h) * 20, y); g.lineTo(w / 2 + 6 + (y / h) * 20, y + 6); g.stroke(); }
      g.fillStyle = '#15803d';
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.55; g.save(); g.translate(w / 2, 70); g.rotate(a); g.beginPath(); g.ellipse(50, 0, 60, 14, 0.25, 0, U.TAU); g.fill(); g.restore(); }
    });
    mk('bill', 360, 260, (g, w, h) => { g.fillStyle = '#334155'; g.fillRect(w / 2 - 70, 140, 16, 120); g.fillRect(w / 2 + 54, 140, 16, 120); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#f43f5e'); gr.addColorStop(1, '#f59e0b'); g.fillStyle = gr; g.fillRect(0, 0, w, 150); g.fillStyle = '#fff'; g.font = '900 64px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('MG·100', w / 2, 95); g.font = '700 22px Arial'; g.fillText('100 GAMES · ZERO DOWNLOADS', w / 2, 130); });
    mk('rock', 220, 150, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a8a29e'); gr.addColorStop(1, '#44403c'); g.fillStyle = gr; g.beginPath(); g.moveTo(10, h); g.quadraticCurveTo(0, 40, 80, 20); g.quadraticCurveTo(160, 0, 200, 60); g.quadraticCurveTo(220, 120, 210, h); g.fill(); });
    mk('post', 60, 300, (g, w, h) => { g.fillStyle = '#e2e8f0'; g.fillRect(20, 0, 20, h); g.fillStyle = '#ef4444'; for (let y = 0; y < h; y += 60) g.fillRect(20, y, 20, 30); });
    mk('check', 1400, 300, (g, w, h) => { g.fillStyle = '#1e293b'; g.fillRect(0, 0, 40, h); g.fillRect(w - 40, 0, 40, h); for (let x = 40; x < w - 40; x += 40) { g.fillStyle = (x / 40) % 2 ? '#fff' : '#111'; g.fillRect(x, 0, 40, 30); g.fillStyle = (x / 40) % 2 ? '#111' : '#fff'; g.fillRect(x, 30, 40, 30); } g.fillStyle = '#fde68a'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('CHECKPOINT', w / 2, 110); });
    const CAR_COLS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#e5e7eb'];
    CAR_COLS.forEach((c, i) => mk('car' + i, 260, 150, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(w / 2, h - 10, w / 2 - 6, 12, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#111'; g.fillRect(24, h - 44, 44, 38); g.fillRect(w - 68, h - 44, 44, 38);
      const gr = g.createLinearGradient(0, 30, 0, h); gr.addColorStop(0, U.shade(c, 0.3)); gr.addColorStop(1, U.shade(c, -0.35)); g.fillStyle = gr;
      g.beginPath(); g.moveTo(14, h - 26); g.lineTo(20, 64); g.lineTo(60, 30); g.lineTo(w - 60, 30); g.lineTo(w - 20, 64); g.lineTo(w - 14, h - 26); g.closePath(); g.fill();
      g.fillStyle = '#1e293b'; g.beginPath(); g.moveTo(66, 38); g.lineTo(w - 66, 38); g.lineTo(w - 36, 66); g.lineTo(36, 66); g.closePath(); g.fill();
      g.fillStyle = '#f87171'; g.fillRect(24, 80, 40, 12); g.fillRect(w - 64, 80, 40, 12);
      g.fillStyle = '#e5e7eb'; g.fillRect(w / 2 - 26, 96, 52, 16);
    }));
    // populate
    for (let n = 30; n < segs.length; n += U.ri(3, 8)) {
      const k = Math.random(), side = U.chance(0.5) ? -1 : 1;
      const s = k < 0.55 ? 'palm' : k < 0.7 ? 'bill' : k < 0.85 ? 'rock' : 'post';
      segs[n].sprites.push({ s, off: side * U.rand(1.25, 2.6) });
      if (Math.random() < 0.3) segs[n].sprites.push({ s: 'palm', off: -side * U.rand(1.3, 3) });
    }
    const CP = 700;
    for (let n = CP; n < segs.length; n += CP) segs[n].sprites.push({ s: 'check', off: 0, check: true });
    const cars = [];
    for (let i = 0; i < 38; i++) { const z = U.rand(20, segs.length) * SEG, car = { off: U.pick([-0.66, 0, 0.66]) + U.rand(-0.1, 0.1), z, speed: MAXS * U.rand(0.25, 0.55), spr: 'car' + U.ri(0, 5), percent: 0 }; cars.push(car); }
    let pos = 0, speed = 0, px = 0, time = 45, dist = 0, nitro = 3, nitroT = 0, skyOff = 0, hillOff = 0, lastSeg = 0, bump = 0, crashT = 0, laps = 0, cps = 0, shake = 0, done = false;
    E.stat('Time', 45); E.stat('Nitro', '●●●');
    const findSeg = (z) => segs[Math.floor(z / SEG) % segs.length];
    function project(p, camX, camY, camZ) {
      const cx = (p.wx || 0) - camX, cy = p.wy - camY, cz = p.wz - camZ;
      p.scale = DEPTH / cz; p.sx = Math.round(W / 2 + p.scale * cx * W / 2); p.sy = Math.round(H / 2 - p.scale * cy * H / 2); p.sw = Math.round(p.scale * ROAD * W / 2);
    }
    function poly(g, x1, y1, x2, y2, x3, y3, x4, y4, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); g.fill(); }
    return {
      update(dt) {
        if (done) { speed = Math.max(0, speed - MAXS * dt); pos = (pos + speed * dt) % LEN; return; }
        const seg = findSeg(pos + CAM_H * DEPTH), sp = speed / MAXS;
        let steer = E.axis().x;
        if (E.ptr.down) steer = U.clamp((E.ptr.x - W / 2) / 200, -1, 1);
        const dx = dt * 2 * sp;
        px += steer * dx * 1.1;
        px -= dx * sp * seg.curve * CENT;
        if (E.hit('A') && nitro > 0 && nitroT <= 0) { nitro--; nitroT = 2.2; E.stat('Nitro', '●'.repeat(nitro) || '—'); E.sfx('charge', 1.4); E.flash('#fde68a', 0.15); }
        nitroT -= dt;
        const top = nitroT > 0 ? MAXS * 1.35 : MAXS;
        if (E.down('D')) speed += BRK * dt; else speed += (speed < top ? ACC : DEC) * dt * (nitroT > 0 ? 2 : 1);
        if ((px < -1 || px > 1)) { if (speed > OFF_LIM) speed += OFF_DEC * dt; if (Math.random() < 0.3) E.burst(W / 2 + U.rand(-60, 60), H - 20, { n: 1, color: '#65a30d', speed: 120, angle: -Math.PI / 2, spread: 1, glow: false, size: 3, life: 0.5 }); bump = Math.sin(E.t * 40) * 3; }
        else bump = Math.sin(E.t * 20) * sp * 0.8;
        // roadside collisions
        const pseg = findSeg(pos + CAM_H * DEPTH);
        if (px < -1 || px > 1) for (const s of pseg.sprites) { if (s.check) continue; const sw = spr[s.s].width * 3.2 / ROAD * 0.5; if (Math.abs(px - s.off) < 0.3 + sw * 0.2) { speed = MAXS / 6; pos = (pos - SEG * 2 + LEN) % LEN; E.sfx('hit'); E.shake(14); E.flash('#ef4444', 0.25); E.vibrate(150); break; } }
        // traffic
        for (const c of cars) {
          const oldZ = c.z; c.z = (c.z + c.speed * dt) % LEN;
          if (speed > c.speed) {
            let dz = c.z - (pos + CAM_H * DEPTH); if (dz < -LEN / 2) dz += LEN;
            if (dz > 0 && dz < SEG * 1.2 && Math.abs(px - c.off) < 0.45) { speed = c.speed * 0.7; pos = (c.z - CAM_H * DEPTH - SEG * 1.3 + LEN) % LEN; E.sfx('hit', 0.8); E.shake(10); E.vibrate(80); }
          }
          void oldZ;
        }
        speed = U.clamp(speed, 0, MAXS * 1.4); px = U.clamp(px, -2.5, 2.5);
        const before = pos;
        pos = (pos + speed * dt) % LEN;
        if (pos < before) laps++;
        dist += speed * dt;
        skyOff += 0.001 * seg.curve * sp * dt * 60; hillOff += 0.002 * seg.curve * sp * dt * 60;
        // checkpoints
        const segIdx = Math.floor(pos / SEG);
        if (Math.floor(segIdx / CP) !== Math.floor(lastSeg / CP) && segIdx % CP < 20 && segIdx > 0) { cps++; const add = Math.max(10, 22 - cps); time += add; nitro = Math.min(3, nitro + 1); E.stat('Nitro', '●'.repeat(nitro)); E.sfx('win'); E.banner('CHECKPOINT', `+${add} seconds`, { color: '#fde68a' }); E.score += 1000; }
        lastSeg = segIdx;
        time -= dt; E.stat('Time', Math.max(0, Math.ceil(time)));
        E.score = Math.floor(dist / 100) + cps * 1000;
        E.stat('Speed', Math.round(sp * 300) + ' km/h');
        if (Math.random() < 0.25) E.sfx('engine', 0.6 + sp * 1.8, 0.8);
        if (time <= 0) { done = true; E.sfx('lose'); E.over({ title: 'Time Up', msg: `${(dist / 100000).toFixed(2)} km · ${cps} checkpoints` }); }
      },
      draw(g) {
        const t = E.t;
        // sky
        D.bg(g, W, H, '#1e1b4b', '#fb7185');
        const sunX = W / 2 - (skyOff * 400) % W;
        const sg = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, 260); sg.addColorStop(0, 'rgba(254,240,138,1)'); sg.addColorStop(0.25, 'rgba(251,146,60,.8)'); sg.addColorStop(1, 'rgba(251,113,133,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H);
        D.circle(g, W / 2, H * 0.45, 70, '#fef08a');
        g.fillStyle = '#fb7185'; for (let y = H * 0.45; y < H * 0.45 + 70; y += 10) g.fillRect(W / 2 - 80, y + (y - H * 0.45) * 0.1, 160, 3 + (y - H * 0.45) * 0.05);
        void sunX;
        for (let l = 0; l < 2; l++) {
          g.fillStyle = l ? '#4c1d95' : '#6b21a8'; const off = (l ? hillOff : skyOff) * 1200;
          g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W; x += 16) { const wx = x + off; g.lineTo(x, H * 0.55 - Math.abs(Math.sin(wx * 0.006 + l)) * (70 - l * 20) - Math.sin(wx * 0.025) * 8); }
          g.lineTo(W, H); g.fill();
        }
        // road
        const base = findSeg(pos), basePct = (pos % SEG) / SEG, playerSeg = findSeg(pos + CAM_H * DEPTH), playerPct = ((pos + CAM_H * DEPTH) % SEG) / SEG;
        const playerY = U.lerp(playerSeg.p1.wy, playerSeg.p2.wy, playerPct);
        let maxy = H, x = 0, dx = -(base.curve * basePct);
        const drawn = [];
        for (let n = 0; n < DRAW; n++) {
          const s = segs[(base.i + n) % segs.length], looped = s.i < base.i;
          s.clip = maxy;
          s.p1.wx = 0; s.p2.wx = 0;
          project(s.p1, px * ROAD - x, playerY + CAM_H, pos - (looped ? LEN : 0));
          project(s.p2, px * ROAD - x - dx, playerY + CAM_H, pos - (looped ? LEN : 0));
          x += dx; dx += s.curve;
          if (s.p1.scale <= 0 || s.p2.sy >= s.p1.sy || s.p2.sy >= maxy) { drawn.push(null); continue; }
          const p1 = s.p1, p2 = s.p2, fog = U.clamp(n / DRAW, 0, 1);
          const grass = s.color ? '#16a34a' : '#15803d', rumble = s.color ? '#f8fafc' : '#ef4444', road = s.color ? '#3f3f52' : '#44445a';
          g.fillStyle = grass; g.fillRect(0, p2.sy, W, p1.sy - p2.sy);
          const r1 = p1.sw / 6, r2 = p2.sw / 6;
          poly(g, p1.sx - p1.sw - r1, p1.sy, p1.sx - p1.sw, p1.sy, p2.sx - p2.sw, p2.sy, p2.sx - p2.sw - r2, p2.sy, rumble);
          poly(g, p1.sx + p1.sw + r1, p1.sy, p1.sx + p1.sw, p1.sy, p2.sx + p2.sw, p2.sy, p2.sx + p2.sw + r2, p2.sy, rumble);
          poly(g, p1.sx - p1.sw, p1.sy, p1.sx + p1.sw, p1.sy, p2.sx + p2.sw, p2.sy, p2.sx - p2.sw, p2.sy, road);
          if (s.color) { const l1 = p1.sw / 40, l2 = p2.sw / 40; for (let ln = 1; ln < LANES; ln++) { const lx1 = p1.sx - p1.sw + (p1.sw * 2 / LANES) * ln, lx2 = p2.sx - p2.sw + (p2.sw * 2 / LANES) * ln; poly(g, lx1 - l1 / 2, p1.sy, lx1 + l1 / 2, p1.sy, lx2 + l2 / 2, p2.sy, lx2 - l2 / 2, p2.sy, '#e2e8f0'); } }
          if (fog > 0.3) { g.fillStyle = `rgba(251,113,133,${(fog - 0.3) * 0.7})`; g.fillRect(0, p2.sy, W, p1.sy - p2.sy); }
          maxy = p1.sy >= maxy ? maxy : p2.sy;
          drawn.push(s);
        }
        // sprites & cars back to front
        for (let n = DRAW - 1; n > 0; n--) {
          const s = drawn[n]; if (!s) continue;
          const sc = s.p1.scale;
          for (const sp of s.sprites) {
            const img = spr[sp.s], w = img.width * sc * W / 2 * 3.2, h = img.height * sc * W / 2 * 3.2;
            const sx = s.p1.sx + sc * sp.off * ROAD * W / 2, sy = s.p1.sy;
            const dx0 = sp.check ? sx - w / 2 : sp.off < 0 ? sx - w : sx;
            const clipH = Math.max(0, sy - s.clip);
            if (h - clipH <= 0) continue;
            g.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / h), dx0, sy - h, w, h - clipH);
          }
          for (const c of cars) {
            if (Math.floor(c.z / SEG) % segs.length !== s.i) continue;
            const img = spr[c.spr], w = img.width * sc * W / 2 * 2.4, h = img.height * sc * W / 2 * 2.4;
            const sx = s.p1.sx + sc * c.off * ROAD * W / 2 - w / 2, sy = s.p1.sy;
            const clipH = Math.max(0, sy - s.clip); if (h - clipH <= 0) continue;
            g.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / h), sx, sy - h, w, h - clipH);
          }
        }
        // player car
        const steer = E.axis().x || (E.ptr.down ? U.clamp((E.ptr.x - W / 2) / 200, -1, 1) : 0);
        g.save(); g.translate(W / 2, H - 16 + bump); g.transform(1, 0, -steer * 0.12, 1, 0, 0); g.scale(1.25, 1.25);
        g.drawImage(spr.car0, -130, -150);
        if (nitroT > 0) { for (const s of [-1, 1]) { D.glow(g, s * 60, -40, 40, '#60a5fa', 0.9); D.poly(g, [[s * 60 - 10, -44], [s * 60, -44 + 30 + Math.random() * 20], [s * 60 + 10, -44]], '#bfdbfe'); } }
        if (E.down('D')) { g.fillStyle = '#fecaca'; g.fillRect(-106, -70, 40, 12); g.fillRect(66, -70, 40, 12); D.glow(g, -86, -64, 30, '#ef4444', 0.9); D.glow(g, 86, -64, 30, '#ef4444', 0.9); }
        g.restore();
        // HUD
        const spd = Math.round((speed / MAXS) * 300);
        D.fillRR(g, 20, H - 74, 190, 54, 14, 'rgba(0,0,0,.45)');
        D.text(g, spd, 110, H - 46, { size: 34, align: 'right', color: '#fff', font: 'mono' });
        D.text(g, 'km/h', 118, H - 40, { size: 13, align: 'left', font: 'mono', color: '#fda4af' });
        D.fillRR(g, W / 2 - 60, 14, 120, 50, 14, 'rgba(0,0,0,.45)');
        D.text(g, Math.max(0, Math.ceil(time)), W / 2, 40, { size: 32, color: time < 10 ? '#f87171' : '#fde68a', font: 'mono' });
        void t;
      },
    };
  },
});

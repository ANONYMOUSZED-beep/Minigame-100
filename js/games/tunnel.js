MG.add({
  id: 'tunnel', name: 'Tunnel Rush', cat: 'Runner', color: '#22d3ee', color2: '#f43f5e',
  desc: 'Hurtle down a neon tunnel at ever-rising speed. Roll the world to line up with the gaps.',
  how: ['Hold <kbd>←</kbd> / <kbd>→</kbd> (or the left / right half of the screen) to roll', 'You are the glowing marker at the bottom — keep it in the open lanes', 'Some barriers spin — read their motion', 'Speed rises every few seconds'],
  pad: 'LR', fmt: 'time', scoreLabel: 'Time',
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2 + 20, N = 10, SEC = U.TAU / N;
    let rot = 0, rotV = 0, obs = [], z0 = 3, speed = 5, time = 0, dead = false, hue = 190, rings = U.range(16).map((i) => i * 0.8), nextZ = 6, tilt = 0;
    const rZ = (z) => 470 / (1 + Math.max(-0.35, z) * 0.95);
    function add(z) {
      const r = Math.random(), lvl = Math.min(1, time / 70);
      let blocked = [], spin = 0;
      if (r < 0.3) { const gap = U.ri(0, N - 1), w = lvl > 0.5 ? 1 : 2; blocked = U.range(N).filter((k) => !U.range(w).some((q) => (gap + q) % N === k)); }
      else if (r < 0.5) { const s = U.ri(0, N - 1); blocked = U.range(5).map((k) => (s + k) % N); }
      else if (r < 0.68) { const o = U.ri(0, 1); blocked = U.range(N).filter((k) => k % 2 === o); spin = U.pick([-1, 1]) * (0.6 + lvl); }
      else if (r < 0.84) { const s = U.ri(0, N - 1); blocked = U.range(N).filter((k) => (k - s + N) % N !== 0 && (k - s + N) % N !== 5); }
      else { const s = U.ri(0, N - 1); blocked = U.range(7).map((k) => (s + k) % N); spin = U.pick([-1, 1]) * (0.9 + lvl * 0.8); }
      obs.push({ z, blocked: new Set(blocked), a: 0, spin, dz: 0.8 });
    }
    for (let z = 6; z < 22; z += 4) add(z);
    nextZ = 22;
    function die() {
      dead = true; E.sfx('boom', 1.3); E.shake(20); E.flash('#fff', 0.8); E.vibrate(250);
      E.burst(CX, CY + rZ(0) * 0.78, { n: 60, colors: ['#fff', U.hsl(hue, 90, 60)], speed: 420 });
      E.after(1, () => E.over({ msg: `Survived ${U.fmtTime(time, 2)}s at ${speed.toFixed(1)}× speed` }));
    }
    return {
      update(dt) {
        if (dead) { speed *= Math.exp(-dt * 3); return; }
        time += dt; E.score = time;
        speed = 5 + time * 0.09;
        hue = (hue + dt * 20) % 360;
        let dir = E.axis().x; if (E.ptr.down) dir = E.ptr.x < W / 2 ? -1 : 1;
        rotV = U.damp(rotV, dir * 4.6, 18, dt);
        rot += rotV * dt; tilt = U.damp(tilt, -dir * 0.05, 6, dt);
        const dz = speed * dt;
        for (const o of obs) { o.z -= dz; o.a += o.spin * dt; }
        for (let i = 0; i < rings.length; i++) { rings[i] -= dz; if (rings[i] < -0.3) rings[i] += 12.8; }
        nextZ -= dz;
        if (nextZ < 22) { add(nextZ + U.rand(3.4, 4.6) * (1 + Math.min(0.4, time * 0.004))); nextZ = obs[obs.length - 1].z; }
        // collision at player plane
        const pAng = U.wrap(Math.PI / 2 - rot, 0, U.TAU);
        for (const o of obs) {
          if (o.z < 0.15 && o.z + o.dz > -0.05 && !o.passed) {
            const local = U.wrap(pAng - o.a, 0, U.TAU), k = Math.floor(local / SEC), frac = local / SEC - k;
            const edgeNear = frac < 0.12 ? (k + N - 1) % N : frac > 0.88 ? (k + 1) % N : k;
            if (o.blocked.has(k) || (o.blocked.has(edgeNear) && (frac < 0.06 || frac > 0.94))) { die(); return; }
          }
          if (o.z + o.dz < -0.05 && !o.passed) { o.passed = true; E.sfx('tick', 1.6, 0.25); }
        }
        obs = obs.filter((o) => o.z + o.dz > -0.4);
        if (Math.floor(time) !== Math.floor(time - dt) && Math.floor(time) % 10 === 0) { E.sfx('power', 1, 0.5); E.pop(CX, 120, `${Math.floor(time)}s`, { color: '#fff', size: 30 }); }
      },
      draw(g) {
        const t = E.t, c1 = U.hsl(hue, 85, 55), c2 = U.hsl((hue + 180) % 360, 85, 60);
        g.fillStyle = '#020108'; g.fillRect(0, 0, W, H);
        g.save(); g.translate(CX, CY); g.rotate(tilt);
        const sectorPoly = (k, a, z1, z2) => {
          const a0 = k * SEC + a + rot, a1 = (k + 1) * SEC + a + rot, r1 = rZ(z1), r2 = rZ(z2);
          return [[Math.cos(a0) * r1, Math.sin(a0) * r1], [Math.cos(a1) * r1, Math.sin(a1) * r1], [Math.cos(a1) * r2, Math.sin(a1) * r2], [Math.cos(a0) * r2, Math.sin(a0) * r2]];
        };
        // tunnel walls
        for (let k = 0; k < N; k++) D.poly(g, sectorPoly(k, 0, -0.35, 30), k % 2 ? U.hsl(hue, 60, 9) : U.hsl(hue, 60, 13));
        for (let k = 0; k < N; k++) { const a = k * SEC + rot; D.line(g, Math.cos(a) * rZ(-0.35), Math.sin(a) * rZ(-0.35), Math.cos(a) * rZ(30), Math.sin(a) * rZ(30), U.rgba(c1, 0.25), 1.5); }
        for (const z of rings) { const r = rZ(z); g.globalAlpha = U.clamp(1 - z / 12, 0, 1) * 0.5; g.strokeStyle = c1; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= N; k++) { const a = k * SEC + rot; k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.globalAlpha = 1; }
        D.glow(g, 0, 0, 90, c2, 0.4);
        // obstacles far → near
        const sorted = [...obs].sort((a, b) => b.z - a.z);
        for (const o of sorted) {
          const fade = U.clamp(1 - o.z / 22, 0, 1);
          for (const k of o.blocked) {
            g.globalAlpha = fade;
            D.poly(g, sectorPoly(k, o.a, o.z, o.z + o.dz), U.hsl((hue + 180) % 360, 80, 30 + fade * 25));
            D.poly(g, sectorPoly(k, o.a, o.z, o.z + 0.02), null, c2, 2);
          }
          g.globalAlpha = 1;
        }
        // player marker at bottom
        if (!dead) {
          const r = rZ(0.02) * 0.93;
          const y = r * Math.sin(Math.PI / 2), x = 0;
          D.glow(g, x, y - 10, 50, '#fff', 0.7);
          D.poly(g, [[x - 16, y - 2], [x, y - 26], [x + 16, y - 2]], '#fff');
        }
        g.restore();
        // speed lines
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
        for (let i = 0; i < 20; i++) { const a = (i / 20) * U.TAU + t * 0.3, r0 = 200 + ((t * speed * 60 + i * 50) % 400); g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); g.lineTo(CX + Math.cos(a) * (r0 + 40), CY + Math.sin(a) * (r0 + 40)); g.stroke(); }
        D.fillRR(g, W - 190, 14, 176, 44, 10, 'rgba(0,0,0,.45)');
        D.text(g, U.fmtTime(time, 2), W - 26, 36, { size: 26, align: 'right', color: '#fff', font: 'mono' });
        D.text(g, `${speed.toFixed(1)}×`, 26, 36, { size: 20, align: 'left', color: c1, font: 'mono' });
        D.vignette(g, W, H, 0.6);
      },
    };
  },
});

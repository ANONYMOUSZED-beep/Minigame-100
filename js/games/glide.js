MG.add({
  id: 'glide', name: 'Tiny Glide', cat: 'Runner', color: '#f9a8d4', color2: '#fde68a',
  desc: 'Dive down hills, release on the upslope and soar. Chain perfect slides before the sun goes down.',
  how: ['Hold click / <kbd>Space</kbd> to become heavy and dive', 'Dive into valleys, release as you climb to launch skyward', 'Land smoothly along a slope for a PERFECT slide boost', 'Reach each new island before nightfall to earn extra time'],
  pad: 'A', padLabels: { A: 'DIVE' },
  make(E) {
    const W = 960, H = 600, BASE = 470;
    const keys = [];
    let kx = -400, top = true;
    const ISLAND = 5200;
    function extend(to) {
      while (kx < to) {
        const island = Math.floor(kx / ISLAND), inIsland = kx - island * ISLAND;
        const amp = 60 + Math.min(160, island * 25) + U.rand(0, 60), wlen = U.rand(170, 290) + island * 18;
        if (inIsland > ISLAND - 500) { keys.push({ x: kx, y: BASE - 200, island }); kx += 260; keys.push({ x: kx, y: BASE + 180, island, water: true }); kx += 240; top = true; continue; }
        keys.push({ x: kx, y: top ? BASE - amp * 0.8 : BASE + amp * 0.4, island });
        kx += wlen; top = !top;
      }
    }
    extend(3000);
    function ter(x) {
      let lo = 0, hi = keys.length - 2;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (keys[m].x <= x) lo = m; else hi = m - 1; }
      const a = keys[lo], b = keys[lo + 1] || a, span = b.x - a.x || 1, t = U.clamp((x - a.x) / span, 0, 1);
      const y = a.y + (b.y - a.y) * (1 - Math.cos(Math.PI * t)) / 2;
      const dy = ((b.y - a.y) * Math.PI * Math.sin(Math.PI * t)) / (2 * span);
      return { y, dy, i: lo, water: b.water && t > 0.6 };
    }
    const bird = { x: 100, y: 200, vx: 260, vy: 0, ground: false, perfect: 0, fever: 0, rot: 0, flap: 0 };
    let time = 50, dist = 0, island = 0, cam = { x: 0, y: 0, z: 1 }, coins = [], coinX = 600, perfectStreak = 0, state = 'play', airT = 0, sleeping = 0;
    function addCoins(to) { while (coinX < to) { const n = U.ri(4, 8); for (let k = 0; k < n; k++) { const x = coinX + k * 28; coins.push({ x, y: ter(x).y - 26, got: false }); } coinX += U.rand(700, 1300); } }
    const stars = D.makeStars(80, W, H, 3);
    const clouds = U.range(8).map(() => ({ x: U.rand(W * 2), y: U.rand(40, 220), s: U.rand(0.6, 1.4) }));
    E.stat('Time', 50);
    return {
      update(dt) {
        if (state === 'night') { sleeping += dt; bird.vx *= Math.exp(-dt); bird.x += bird.vx * dt; const t0 = ter(bird.x); bird.y = t0.y - 14; if (sleeping > 2) { state = 'done'; E.over({ msg: `${Math.round(dist / 10)} m · island ${island + 1}` }); } return; }
        time -= dt; E.stat('Time', Math.max(0, Math.ceil(time)));
        if (time <= 0) { state = 'night'; E.sfx('lose', 0.8); E.banner('NIGHTFALL', 'Sweet dreams…', { color: '#a78bfa' }); return; }
        const hold = E.down('A', 'U') || E.ptr.down;
        extend(bird.x + 3000); addCoins(bird.x + 2000);
        const t0 = ter(bird.x);
        bird.flap = Math.max(0, bird.flap - dt * 3);
        if (bird.ground) {
          // slide along slope
          const ang = Math.atan(t0.dy);
          let sp = Math.hypot(bird.vx, bird.vy) * Math.sign(bird.vx || 1);
          const gAlong = 900 * Math.sin(ang) * (hold ? 1.9 : 1);
          sp += gAlong * dt;
          if (hold && t0.dy < 0) sp -= 140 * dt;
          sp = U.clamp(sp, 120, 1500 + bird.fever * 300);
          bird.vx = Math.cos(ang) * sp; bird.vy = Math.sin(ang) * sp;
          bird.x += bird.vx * dt;
          const t1 = ter(bird.x);
          // launch when the terrain drops away faster than our trajectory (convex crest)
          const predicted = bird.y + bird.vy * dt;
          if (!hold && t1.y > predicted + 1.5 && t0.dy < 0.1 && sp > 300) { bird.ground = false; bird.y = predicted; airT = 0; }
          else bird.y = t1.y - 14;
          bird.rot = ang;
          if (t1.water) { bird.ground = false; bird.vy = -Math.abs(bird.vx) * 0.5; }
        } else {
          airT += dt;
          bird.vy += (hold ? 2100 : 560) * dt;
          bird.vx = Math.max(160, bird.vx - 12 * dt);
          bird.x += bird.vx * dt; bird.y += bird.vy * dt;
          bird.rot = U.damp(bird.rot, Math.atan2(bird.vy, bird.vx), 8, dt);
          const t1 = ter(bird.x);
          if (bird.y >= t1.y - 14) {
            // landing quality: velocity angle vs slope angle
            const va = Math.atan2(bird.vy, bird.vx), sa = Math.atan(t1.dy), diff = Math.abs(va - sa);
            bird.y = t1.y - 14; bird.ground = true;
            if (airT > 0.35) {
              if (diff < 0.32 && t1.dy > -0.05) {
                perfectStreak++; bird.fever = Math.min(3, perfectStreak >= 3 ? bird.fever + 1 : bird.fever);
                const sp = Math.hypot(bird.vx, bird.vy) + 90;
                bird.vx = Math.cos(sa) * sp; bird.vy = Math.sin(sa) * sp;
                E.score += 50 * perfectStreak; E.pop((bird.x - cam.x) * cam.z, (bird.y - cam.y) * cam.z - 30, perfectStreak > 2 ? `PERFECT ×${perfectStreak}` : 'PERFECT', { color: '#fde68a', size: 20 });
                E.sfx('coin', 1 + Math.min(perfectStreak, 8) * 0.06); E.burst((bird.x - cam.x) * cam.z, (bird.y - cam.y) * cam.z, { n: 12, colors: ['#fde68a', '#fff'], speed: 160 });
                if (perfectStreak === 3) { E.banner('FEVER!', 'Speed up', { color: '#f472b6', life: 1.2 }); E.sfx('power'); }
              } else {
                perfectStreak = 0; bird.fever = 0;
                const sp = Math.hypot(bird.vx, bird.vy) * (1 - Math.min(0.6, diff * 0.7));
                bird.vx = Math.cos(sa) * sp; bird.vy = Math.sin(sa) * sp;
                E.sfx('thud', 1.2, 0.5); E.shake(3); E.burst((bird.x - cam.x) * cam.z, (bird.y - cam.y) * cam.z + 10, { n: 8, color: '#fbcfe8', speed: 100, glow: false });
              }
            }
          }
        }
        if (hold && !bird.ground && Math.random() < 0.3) bird.flap = 0;
        // islands
        const isl = Math.floor(bird.x / ISLAND);
        if (isl > island) { island = isl; time += 12; E.score += 500 * island; E.banner(`ISLAND ${island + 1}`, '+12 seconds', { color: '#86efac' }); E.sfx('win'); }
        // coins
        for (const c of coins) if (!c.got && U.dist(c.x, c.y, bird.x, bird.y) < 26) { c.got = true; E.score += 5; E.sfx('blip', 1.8, 0.3); }
        coins = coins.filter((c) => c.x > bird.x - 400);
        dist = bird.x - 100;
        E.stat('Distance', Math.round(dist / 10) + ' m');
        if (Math.floor(dist / 100) !== Math.floor((dist - bird.vx * dt) / 100)) E.score += 1;
        // camera: zoom out with altitude
        const alt = Math.max(0, t0.y - bird.y);
        const z = U.clamp(1.1 - alt / 900, 0.45, 1);
        cam.z = U.damp(cam.z, z, 3, dt);
        cam.x = bird.x - (W * 0.3) / cam.z;
        const ty = Math.min(bird.y - 160 / cam.z, BASE + 80 - H / cam.z);
        cam.y = U.damp(cam.y, ty, 5, dt);
        if (bird.fever > 0 && Math.random() < 0.5) E.burst((bird.x - cam.x) * cam.z, (bird.y - cam.y) * cam.z, { n: 1, colors: ['#f472b6', '#fde68a'], speed: 60, life: 0.5, size: 4 });
      },
      draw(g) {
        const t = E.t, dayK = U.clamp(1 - time / 60, 0, 1);
        const top = U.mix('#7dd3fc', '#1e1b4b', dayK), bot = U.mix('#fef3c7', '#f472b6', Math.min(1, dayK * 1.4));
        D.bg(g, W, H, top, bot);
        if (dayK > 0.6) { g.globalAlpha = (dayK - 0.6) * 2.5; D.stars(g, stars, W, H, t); g.globalAlpha = 1; }
        const sunY = 80 + dayK * 480;
        D.glow(g, W * 0.75, sunY, 160, '#fde68a', 0.5); D.circle(g, W * 0.75, sunY, 44, U.mix('#fef9c3', '#fb923c', dayK));
        for (const c of clouds) { const x = U.wrap(c.x - cam.x * 0.08, -150, W + 150); g.globalAlpha = 0.6; for (let k = 0; k < 3; k++) D.circle(g, x + k * 26 * c.s, c.y + (k === 1 ? -10 : 0), 22 * c.s, '#fff'); g.globalAlpha = 1; }
        g.save(); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
        const x0 = cam.x - 20, x1 = cam.x + W / cam.z + 20;
        // water under islands
        g.fillStyle = '#38bdf8'; g.fillRect(x0, BASE + 150, x1 - x0, 2000);
        // hills: each segment between valleys gets its own striped palette
        const PAL = [['#f9a8d4', '#f472b6'], ['#a7f3d0', '#6ee7b7'], ['#fde68a', '#fcd34d'], ['#c4b5fd', '#a78bfa'], ['#fdba74', '#fb923c'], ['#bae6fd', '#7dd3fc']];
        let si = ter(x0).i;
        while (keys[si] && keys[si].x < x1) {
          const a = keys[si], b = keys[si + 1]; if (!b) break;
          const pal = PAL[(si >> 1) % PAL.length];
          g.save(); g.beginPath(); g.moveTo(a.x, 3000);
          for (let x = a.x; x <= b.x + 1; x += 6) g.lineTo(x, ter(Math.min(x, b.x - 0.01)).y);
          g.lineTo(b.x, 3000); g.closePath();
          g.fillStyle = pal[0]; g.fill(); g.clip();
          g.strokeStyle = pal[1]; g.lineWidth = 16;
          for (let k = a.x - 600; k < b.x + 600; k += 44) { g.beginPath(); g.moveTo(k, BASE - 400); g.lineTo(k + 700, BASE + 400); g.stroke(); }
          g.restore();
          si++;
        }
        g.beginPath(); for (let x = x0; x <= x1; x += 6) { const y = ter(x).y; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4 / cam.z; g.stroke();
        for (const c of coins) if (!c.got) { D.glow(g, c.x, c.y, 16, '#fde68a', 0.6); D.star(g, c.x, c.y, 8, 3.5, 5, t, '#fde047'); }
        // bird
        g.save(); g.translate(bird.x, bird.y); g.rotate(bird.rot);
        const hold = E.down('A', 'U') || E.ptr.down;
        if (bird.fever) D.glow(g, 0, 0, 50, '#f472b6', 0.6);
        D.orb(g, 0, 0, 15, state === 'night' ? '#a78bfa' : '#60a5fa', 0.4);
        g.fillStyle = '#e0f2fe'; g.beginPath(); g.ellipse(4, 5, 9, 6, 0, 0, U.TAU); g.fill();
        if (!hold && !bird.ground) { g.save(); g.rotate(-0.6 + Math.sin(t * 20) * 0.5); g.fillStyle = '#3b82f6'; g.beginPath(); g.ellipse(-8, -8, 12, 5, -0.4, 0, U.TAU); g.fill(); g.restore(); }
        if (state === 'night') { D.line(g, 3, -5, 9, -5, '#1e1b4b', 2); D.text(g, 'z', 16, -20 - (sleeping * 10) % 20, { size: 14, color: '#fff' }); }
        else { D.circle(g, 6, -5, 4.5, '#fff'); D.circle(g, 7.5, -5, 2.2, '#111'); }
        D.poly(g, [[13, 0], [21, 3], [13, 6]], '#fb923c');
        g.restore();
        g.restore();
        // HUD time arc
        D.fillRR(g, W / 2 - 150, 14, 300, 12, 6, 'rgba(255,255,255,.3)');
        D.fillRR(g, W / 2 - 150, 14, 300 * U.clamp(time / 60, 0, 1), 12, 6, time < 10 ? '#f87171' : '#fde68a');
        D.text(g, `${Math.max(0, Math.ceil(time))}s`, W / 2 + 170, 20, { size: 14, font: 'mono', align: 'left', color: '#fff' });
        if (perfectStreak > 1) D.text(g, `×${perfectStreak}`, 24, 30, { size: 26, align: 'left', color: '#fde68a', stroke: 'rgba(0,0,0,.2)' });
      },
    };
  },
});

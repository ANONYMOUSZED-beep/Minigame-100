MG.add({
  id: 'ropeswing', name: 'Rope Swing', cat: 'Runner', color: '#f59e0b', color2: '#22d3ee',
  desc: 'Grapple through a neon skyline. Hold to hook the next anchor, release at the top of the arc to fly.',
  how: ['Hold click / <kbd>Space</kbd> to shoot a grapple at the nearest anchor ahead', 'Release to let go — momentum is everything', 'Fly through boost rings, grab coins, never touch the street', 'Anchors get sparser the further you go'],
  pad: 'A', padLabels: { A: 'HOOK' },
  make(E) {
    const W = 960, H = 600, GRAV = 1300, FLOOR = 560;
    const p = { x: 140, y: 200, px: 140 - 5, py: 200, hooked: null, len: 0, dead: false, rot: 0 };
    let anchors = [], rings = [], coins = [], nextX = 300, cam = 0, best = 0, rope = 0, started = false;
    const bld = [0, 1].map((l) => U.range(40).map((i) => ({ x: i * (70 + l * 40), w: 50 + Math.random() * (40 + l * 30), h: 120 + Math.random() * (200 + l * 80) })));
    function gen(upto) {
      while (nextX < upto) {
        const d = Math.min(1, nextX / 20000);
        const y = U.rand(90, 260);
        anchors.push({ x: nextX, y, pulse: 0 });
        if (Math.random() < 0.25) rings.push({ x: nextX + U.rand(120, 200), y: y + U.rand(80, 200), got: false });
        for (let k = 0; k < 3; k++) if (Math.random() < 0.5) coins.push({ x: nextX + 60 + k * 36, y: y + 160 + Math.sin(k) * 20, got: false });
        nextX += U.rand(230, 330) + d * 150;
      }
    }
    gen(1600);
    anchors.unshift({ x: 200, y: 120, pulse: 0 });
    function hook() {
      if (p.hooked || p.dead) return;
      const vx = p.x - p.px;
      let best = null, bd = 1e9;
      for (const a of anchors) {
        const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy);
        if (d > 430 || a.y > p.y + 60 || dx < -60) continue;
        const score = d - dx * 0.6 - (vx > 0 && dx > 0 ? 40 : 0);
        if (score < bd) { bd = score; best = a; }
      }
      if (!best) { E.sfx('error', 1.6, 0.3); return; }
      p.hooked = best; p.len = Math.max(90, U.dist(p.x, p.y, best.x, best.y) * 0.95); rope = 0; best.pulse = 1;
      E.sfx('shoot', 0.7, 0.6); started = true;
    }
    function release() { if (!p.hooked) return; p.hooked = null; E.sfx('whoosh', 1.3, 0.5); }
    function die() {
      if (p.dead) return;
      p.dead = true; E.sfx('hurt'); E.shake(12); E.flash('#f97316', 0.3); E.vibrate(150);
      E.burst(p.x - cam, p.y, { n: 40, colors: ['#f59e0b', '#fff', '#22d3ee'], speed: 300 });
      E.after(1, () => E.over({ msg: `${best} m swung` }));
    }
    return {
      update(dt) {
        const hold = E.down('A', 'U') || E.ptr.down;
        if ((E.hit('A', 'U') || E.ptr.hit)) hook();
        if (!hold && p.hooked) release();
        if (!started) { p.px = p.x - 3; p.py = p.y; p.y = 200 + Math.sin(E.t * 3) * 8; if (!hold) return; }
        if (p.dead) return;
        // verlet
        const sub = 3, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          let vx = (p.x - p.px), vy = (p.y - p.py);
          vx *= 0.9995; vy *= 0.9995;
          p.px = p.x; p.py = p.y;
          p.x += vx; p.y += vy + GRAV * h * h;
          if (p.hooked) {
            const a = p.hooked, dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy);
            if (d > p.len) { p.x = a.x + (dx / d) * p.len; p.y = a.y + (dy / d) * p.len; }
            p.len = Math.max(80, p.len - 40 * h);
          }
        }
        const vx = (p.x - p.px) / h, vy = (p.y - p.py) / h;
        p.rot += (p.hooked ? 0 : vx * 0.012) * dt;
        rope = Math.min(1, rope + dt * 10);
        if (p.y > FLOOR - 12) die();
        if (p.y < -200) { p.y = -200; p.py = Math.min(p.py, p.y); }
        // pickups
        for (const r of rings) if (!r.got && U.dist(p.x, p.y, r.x, r.y) < 44) { r.got = true; const sp = Math.hypot(vx, vy) || 1; p.px -= (vx / sp) * 220 * h; p.py -= (vy / sp) * 80 * h; E.score += 50; E.sfx('power', 1.2, 0.6); E.ring(r.x - cam, r.y, { color: '#22d3ee', r: 80 }); E.pop(r.x - cam, r.y - 40, 'BOOST', { color: '#22d3ee' }); }
        for (const c of coins) if (!c.got && U.dist(p.x, p.y, c.x, c.y) < 26) { c.got = true; E.score += 10; E.sfx('coin', 1.5, 0.3); E.burst(c.x - cam, c.y, { n: 8, color: '#facc15', speed: 120 }); }
        const m = Math.floor((p.x - 140) / 20);
        if (m > best) { E.score += m - best; best = m; E.stat('Distance', best + ' m'); }
        cam = U.damp(cam, p.x - W * 0.35, 6, dt);
        gen(cam + W * 2);
        anchors = anchors.filter((a) => a.x > cam - 300 || a === p.hooked);
        rings = rings.filter((r) => r.x > cam - 100); coins = coins.filter((c) => c.x > cam - 100);
        for (const a of anchors) a.pulse = Math.max(0, a.pulse - dt * 2);
        if (Math.hypot(vx, vy) > 700 && Math.random() < 0.5) E.burst(p.x - cam, p.y, { n: 1, color: '#fde68a', speed: 30, life: 0.3, size: 2 });
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#0b1026', '#3b0764');
        D.glow(g, 780, 120, 180, '#f0abfc', 0.25); D.circle(g, 780, 120, 40, '#fdf4ff');
        bld.forEach((layer, li) => {
          const par = li ? 0.35 : 0.15, span = layer.length * (70 + li * 40);
          g.fillStyle = li ? '#1e0b3a' : '#2a1250';
          for (const b of layer) {
            const x = U.wrap(b.x - cam * par, -150, span - 150);
            if (x > W + 100) continue;
            g.fillRect(x, FLOOR - b.h * (li ? 0.9 : 1.1), b.w, b.h * 1.2);
            if (li) { g.fillStyle = 'rgba(244,114,182,.35)'; for (let wy = FLOOR - b.h * 0.9 + 12; wy < FLOOR; wy += 18) for (let wx = x + 8; wx < x + b.w - 8; wx += 14) if (((wx + wy * 3) | 0) % 7 < 2) g.fillRect(wx, wy, 5, 7); g.fillStyle = '#1e0b3a'; }
          }
        });
        // street glow
        const sg = g.createLinearGradient(0, FLOOR, 0, H); sg.addColorStop(0, '#f97316'); sg.addColorStop(1, '#7c2d12'); g.fillStyle = sg; g.fillRect(0, FLOOR, W, H - FLOOR);
        D.glow(g, W / 2, FLOOR, 600, '#f97316', 0.2);
        g.save(); g.translate(-cam, 0);
        for (const r of rings) if (!r.got) { D.glow(g, r.x, r.y, 50, '#22d3ee', 0.4); g.strokeStyle = '#67e8f9'; g.lineWidth = 5; g.beginPath(); g.ellipse(r.x, r.y, 16, 38, 0, 0, U.TAU); g.stroke(); }
        for (const c of coins) if (!c.got) { const sx = Math.abs(Math.cos(t * 5 + c.x)); g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(c.x, c.y, 8 * sx + 1, 9, 0, 0, U.TAU); g.fill(); }
        for (const a of anchors) {
          const inRange = !p.hooked && U.dist(a.x, a.y, p.x, p.y) < 430 && a.x > p.x - 60 && a.y < p.y + 60;
          D.glow(g, a.x, a.y, 30 + a.pulse * 30, inRange ? '#fde68a' : '#f59e0b', 0.5 + a.pulse * 0.5);
          D.circle(g, a.x, a.y, 9, '#1f2937', inRange ? '#fde68a' : '#f59e0b', 3);
          D.line(g, a.x, a.y - 9, a.x, a.y - 80, 'rgba(245,158,11,.25)', 2);
        }
        if (p.hooked) {
          const a = p.hooked, k = rope;
          g.strokeStyle = '#fde68a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(U.lerp(p.x, a.x, k), U.lerp(p.y, a.y, k)); g.stroke();
          D.glow(g, a.x, a.y, 20, '#fff', 0.6);
        }
        // player
        g.save(); g.translate(p.x, p.y);
        const ang = p.hooked ? Math.atan2(p.hooked.y - p.y, p.hooked.x - p.x) + Math.PI / 2 : p.rot;
        g.rotate(ang);
        if (!p.dead) {
          D.glow(g, 0, 0, 30, '#22d3ee', 0.4);
          D.fillRR(g, -8, -10, 16, 22, 6, '#111827');
          D.circle(g, 0, -14, 8, '#111827'); g.fillStyle = '#ef4444'; g.fillRect(-8, -16, 16, 4);
          D.line(g, -8, -15, -18, -12 + Math.sin(t * 20) * 3, '#ef4444', 3);
          D.circle(g, 3, -14, 1.8, '#fff');
        }
        g.restore();
        g.restore();
        if (!started) D.text(g, 'HOLD TO GRAPPLE', W / 2, 360, { size: 28, color: '#fff', glow: '#f59e0b' });
        D.text(g, `${best} m`, W - 24, 34, { size: 26, align: 'right', color: '#fde68a' });
      },
    };
  },
});

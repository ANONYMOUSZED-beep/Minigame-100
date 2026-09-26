MG.add({
  id: 'hillrider', name: 'Hill Rider', cat: 'Runner', color: '#84cc16', color2: '#f97316',
  desc: 'Physics dirt-biking over endless hills. Throttle, lean, land flips and watch your fuel.',
  how: ['<kbd>→</kbd> / <kbd>D</kbd> throttle · <kbd>←</kbd> / <kbd>A</kbd> brake & reverse', 'In the air, throttle tilts you back and brake tilts you forward', 'Land flips for bonus points — land on your head and it\'s over', 'Grab fuel cans before the tank runs dry'],
  pad: 'LR',
  make(E) {
    const W = 960, H = 600, GRAV = 900, R = 17;
    // rigid body bike: COM position/velocity, angle/angular velocity; wheels & head are body-space offsets
    const bike = { x: 236, y: 290, vx: 0, vy: 0, a: 0, w: 0 };
    const OFF = { A: [-36, 16], B: [36, 16], C: [-2, -40] }, INERTIA = 1900;
    const A = { x: 0, y: 0 }, B = { x: 0, y: 0 }, C = { x: 0, y: 0 };
    function place() { const c = Math.cos(bike.a), s = Math.sin(bike.a); for (const [k, P] of [['A', A], ['B', B], ['C', C]]) { const [ox, oy] = OFF[k]; P.x = bike.x + ox * c - oy * s; P.y = bike.y + ox * s + oy * c; } }
    place();
    let fuel = 100, dead = false, cam = { x: 0, y: 0, z: 1 }, wheelRot = 0, airT = 0, spin = 0, lastAng = 0, flips = 0, best = 0, cans = [], canX = 1400, coins = [], coinX = 600, crashT = 0, outT = 0;
    function ter(x) {
      const d = Math.max(0, x - 400) / 1000;
      const amp = Math.min(2.2, 0.35 + d * 0.1);
      return 380 - Math.sin(x * 0.004) * 60 * amp - Math.sin(x * 0.011 + 1) * 30 * amp - Math.sin(x * 0.023) * 10 * Math.min(1.5, amp) + Math.max(0, 400 - x) * 0;
    }
    const slope = (x) => (ter(x + 1) - ter(x - 1)) / 2;
    function spawnStuff(to) {
      while (canX < to) { cans.push({ x: canX, got: false }); canX += U.rand(1400, 2200) + canX * 0.05; }
      while (coinX < to) { const n = U.ri(3, 7); for (let k = 0; k < n; k++) coins.push({ x: coinX + k * 34, got: false, up: U.rand(30, 60) }); coinX += U.rand(500, 900); }
    }
    E.stat('Fuel', '100%');
    function crash(msg) {
      if (dead) return; dead = true; crashT = 0;
      E.sfx('hurt'); E.shake(14); E.flash('#ef4444', 0.3); E.vibrate(200);
      E.burst((C.x - cam.x) * cam.z, (C.y - cam.y) * cam.z, { n: 40, colors: ['#f97316', '#fff', '#84cc16'], speed: 280 });
      E.after(1.4, () => E.over({ msg: `${best} m · ${flips} flip${flips === 1 ? '' : 's'} · ${msg}` }));
    }
    return {
      update(dt) {
        spawnStuff(A.x + 2000);
        const ax = dead ? 0 : E.axis().x + (E.ptr.down ? (E.ptr.x > W / 2 ? 1 : -1) : 0);
        const gas = ax > 0 && fuel > 0, brake = ax < 0;
        const sub = 6, h = dt / sub;
        let groundA = false, groundB = false;
        for (let st = 0; st < sub; st++) {
          bike.vy += GRAV * h;
          bike.x += bike.vx * h; bike.y += bike.vy * h; bike.a += bike.w * h;
          place();
          for (const [P, isA] of [[A, true], [B, false]]) {
            const sl = slope(P.x), nl = Math.hypot(sl, 1), nx = sl / nl, ny = -1 / nl, tx = 1 / nl, ty = sl / nl;
            const dist = (ter(P.x) - P.y) / nl;
            if (dist > R + 1.5) continue;
            if (isA) groundA = true; else groundB = true;
            const rx = P.x - bike.x, ry = P.y - bike.y;
            const pvx = bike.vx - bike.w * ry, pvy = bike.vy + bike.w * rx;
            const vn = pvx * nx + pvy * ny, rn = rx * ny - ry * nx;
            if (vn < 0) { const j = -vn * 1.05 / (1 + (rn * rn) / INERTIA); bike.vx += j * nx; bike.vy += j * ny; bike.w += (rn * j) / INERTIA; }
            const pen = R - dist; if (pen > 0) { bike.x += nx * pen * 0.8; bike.y += ny * pen * 0.8; }
            // traction: drive / brake along the tangent, applied at the COM (no loop-inducing torque)
            const vt = bike.vx * tx + bike.vy * ty;
            let jt = -vt * 0.003;
            if (gas && vt < 1100) jt += 1500 * h * 0.5 * (1 + Math.max(0, -ty) * 0.9);
            if (brake) jt += vt > 30 ? -vt * 0.06 : -620 * h * 0.5;
            bike.vx += jt * tx; bike.vy += jt * ty;
            if (gas && isA && vt < 250) bike.w -= 0.9 * h; // a hint of wheelie at low speed
          }
          if (groundA && groundB) bike.w *= Math.exp(-6 * h);
          else if (!groundA && !groundB) { if (ax && airT > 0.2) { bike.w += -ax * 3.4 * h; bike.w = U.clamp(bike.w, -3.2, 3.2); } else { bike.w *= Math.exp(-0.25 * h); bike.w += U.angDiff(bike.a, 0) * 0.9 * h; } }
          else { bike.w *= Math.exp(-2.5 * h); bike.w += U.angDiff(bike.a, Math.atan(slope(bike.x))) * 7 * h; }
        }
        place();
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        const vx = bike.vx;
        wheelRot += (vx / R) * dt;
        const grounded = groundA || groundB;
        if (!grounded) { airT += dt; spin += U.angDiff(lastAng, ang); }
        else {
          if (airT > 0.5 && Math.abs(spin) > 5.5) { const n = Math.floor((Math.abs(spin) + 0.8) / U.TAU); if (n > 0) { flips += n; E.score += 250 * n; E.pop(W / 2, 150, n > 1 ? `${n}× FLIP!` : spin < 0 ? 'BACKFLIP!' : 'FRONTFLIP!', { color: '#fde68a', size: 30 }); E.sfx('power'); E.stat('Flips', flips); } }
          if (airT > 0.8) E.burst((A.x - cam.x) * cam.z, (A.y + R - cam.y) * cam.z, { n: 10, color: '#a16207', speed: 120, glow: false, angle: -Math.PI / 2, spread: 2 });
          airT = 0; spin = 0;
        }
        lastAng = ang;
        // head / flipped checks
        if (!dead && C.y + 6 > ter(C.x)) crash('head first');
        if (!dead && grounded && Math.abs(U.angDiff(0, ang)) > 2.4) crash('upside down');
        if (gas) { fuel = Math.max(0, fuel - dt * 3.6); if (Math.random() < 0.4) E.burst((A.x - cam.x - 20) * cam.z, (A.y - 6 - cam.y) * cam.z, { n: 1, color: 'rgba(148,163,184,.8)', speed: 50, angle: Math.PI, spread: 0.6, life: 0.6, size: 4, glow: false }); if (Math.random() < 0.2) E.sfx('engine', 1 + Math.min(1.5, Math.abs(vx) / 400), 0.9); }
        E.stat('Fuel', Math.ceil(fuel) + '%');
        if (fuel <= 0 && Math.abs(vx) < 10 && !dead) { outT += dt; if (outT > 1.5) { dead = true; E.sfx('lose'); E.over({ msg: `${best} m · out of fuel · ${flips} flips` }); } }
        for (const c of cans) if (!c.got && Math.abs(c.x - (A.x + B.x) / 2) < 40 && Math.abs(ter(c.x) - 26 - C.y) < 90) { c.got = true; fuel = 100; E.sfx('power'); E.pop(W / 2, 200, 'FUEL!', { color: '#4ade80', size: 26 }); }
        for (const c of coins) if (!c.got && U.dist(c.x, ter(c.x) - c.up, (A.x + B.x) / 2, (A.y + B.y) / 2 - 20) < 36) { c.got = true; E.score += 20; E.sfx('coin', 1.6, 0.3); }
        const m = Math.floor((A.x - 200) / 20);
        if (m > best) { E.score += m - best; best = m; E.stat('Distance', best + ' m'); }
        const sp = Math.abs(vx);
        cam.z = U.damp(cam.z, U.clamp(1.1 - sp / 2200, 0.7, 1.05), 1.5, dt);
        cam.x = U.damp(cam.x, (A.x + B.x) / 2 - (W * 0.4) / cam.z + vx * 0.25, 5, dt);
        cam.y = U.damp(cam.y, (A.y + B.y) / 2 - (H * 0.58) / cam.z, 5, dt);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#38bdf8', '#e0f2fe');
        D.glow(g, 800, 110, 150, '#fef3c7', 0.6); D.circle(g, 800, 110, 40, '#fef9c3');
        for (let l = 0; l < 2; l++) {
          g.fillStyle = l ? '#65a30d' : '#a3c96c'; g.globalAlpha = l ? 0.55 : 0.5;
          g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W; x += 20) { const wx = x + cam.x * (0.2 + l * 0.2); g.lineTo(x, 330 + l * 60 - Math.sin(wx * 0.004) * 60 - Math.sin(wx * 0.013) * 20); }
          g.lineTo(W, H); g.fill(); g.globalAlpha = 1;
        }
        g.save(); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
        const x0 = cam.x - 40, x1 = cam.x + W / cam.z + 40;
        g.beginPath(); g.moveTo(x0, cam.y + H / cam.z + 50);
        for (let x = x0; x <= x1; x += 8) g.lineTo(x, ter(x));
        g.lineTo(x1, cam.y + H / cam.z + 50); g.closePath();
        const dg = g.createLinearGradient(0, 250, 0, 700); dg.addColorStop(0, '#92400e'); dg.addColorStop(1, '#451a03'); g.fillStyle = dg; g.fill();
        g.beginPath(); for (let x = x0; x <= x1; x += 8) (x === x0 ? g.moveTo(x, ter(x)) : g.lineTo(x, ter(x)));
        g.strokeStyle = '#65a30d'; g.lineWidth = 12; g.stroke(); g.strokeStyle = '#84cc16'; g.lineWidth = 4; g.stroke();
        for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 20, ter(x + 20) + 20, 10, 6); }
        for (let m = Math.max(2000, Math.ceil(x0 / 2000) * 2000); m < x1; m += 2000) { const y = ter(m); D.fillRR(g, m - 2, y - 60, 4, 60, 2, '#fff'); D.fillRR(g, m - 30, y - 80, 60, 24, 6, '#f97316'); D.text(g, `${Math.round((m - 200) / 20)}m`, m, y - 68, { size: 12, color: '#fff' }); }
        for (const c of cans) if (!c.got) { const y = ter(c.x); D.glow(g, c.x, y - 26, 30, '#4ade80', 0.5); D.fillRR(g, c.x - 12, y - 44, 24, 30, 5, '#dc2626'); D.fillRR(g, c.x - 6, y - 50, 12, 8, 2, '#991b1b'); D.text(g, 'F', c.x, y - 28, { size: 14, color: '#fff' }); }
        for (const c of coins) if (!c.got) { const y = ter(c.x) - c.up, sx = Math.abs(Math.cos(t * 5 + c.x)); g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(c.x, y, 9 * sx + 1, 10, 0, 0, U.TAU); g.fill(); }
        // bike
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        for (const w of [A, B]) {
          g.save(); g.translate(w.x, w.y); g.rotate(wheelRot);
          D.circle(g, 0, 0, R, '#111827'); D.circle(g, 0, 0, R - 5, '#374151'); D.circle(g, 0, 0, 4, '#9ca3af');
          for (let k = 0; k < 6; k++) { const a = (k / 6) * U.TAU; D.line(g, 0, 0, Math.cos(a) * (R - 5), Math.sin(a) * (R - 5), '#9ca3af', 1.2); }
          g.restore();
        }
        g.save(); g.translate(A.x, A.y); g.rotate(ang);
        g.strokeStyle = '#f97316'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -26); g.lineTo(58, -24); g.lineTo(72, 0); g.stroke();
        D.fillRR(g, 18, -34, 30, 10, 4, '#1f2937'); D.fillRR(g, 30, -30, 26, 14, 5, '#f97316');
        g.restore();
        // rider
        const hx = C.x, hy = C.y, sx0 = A.x + (B.x - A.x) * 0.42, sy0 = A.y + (B.y - A.y) * 0.42 - 28;
        D.line(g, sx0, sy0, hx, hy + 10, '#1d4ed8', 7);
        D.line(g, hx, hy + 12, A.x + (B.x - A.x) * 0.8, A.y + (B.y - A.y) * 0.8 - 30, '#1d4ed8', 4);
        D.circle(g, hx, hy, 11, '#f8fafc'); D.circle(g, hx, hy, 11, null, '#1e293b', 2);
        g.fillStyle = '#0ea5e9'; g.beginPath(); g.arc(hx + Math.cos(ang) * 4, hy + Math.sin(ang) * 4, 6, ang - 0.9, ang + 0.9); g.fill();
        g.restore();
        // fuel gauge
        D.fillRR(g, 20, 20, 180, 16, 8, 'rgba(0,0,0,.25)');
        D.fillRR(g, 20, 20, 180 * (fuel / 100), 16, 8, fuel < 25 ? '#ef4444' : '#22c55e');
        D.text(g, 'FUEL', 30, 28, { size: 11, font: 'mono', align: 'left', color: '#fff' });
        D.text(g, `${best} m`, W - 24, 34, { size: 26, align: 'right', color: '#1e293b' });
        if (fuel < 25 && Math.sin(t * 8) > 0 && !dead) D.text(g, 'LOW FUEL', 110, 54, { size: 13, font: 'mono', color: '#b91c1c' });
      },
    };
  },
});

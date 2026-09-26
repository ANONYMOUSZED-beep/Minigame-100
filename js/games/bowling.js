MG.add({
  id: 'bowling', name: 'Strike Lane', cat: 'Sports', color: '#60a5fa', color2: '#f87171',
  desc: 'Ten frames of glossy 3D bowling. Swipe to throw — curve your swipe to hook into the pocket.',
  how: ['Drag the ball up the lane and release — speed and direction follow your swipe', 'Curve your swipe to add hook spin (the pocket is just right of the head pin)', 'Keyboard: <kbd>←</kbd> <kbd>→</kbd> position · <kbd>Space</kbd> power · <kbd>Z</kbd>/<kbd>X</kbd> spin', 'Full scoring: strikes, spares and a 10th-frame bonus'],
  pad: 'LRA', padLabels: { A: 'BOWL' },
  make(E) {
    const W = 960, H = 600, LW = 0.53, LEN = 18.3, BR = 0.109, PR = 0.06, F = 620, CAMY = 1.05;
    const PINS0 = []; { const sp = 0.3048; for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) PINS0.push([(i - row / 2) * sp, LEN + row * sp * 0.866]); }
    let pins, ball, frame = 0, roll = 0, rolls = [], cam = { z: -2.2, x: 0 }, state = 'setup', stateT = 0, posX = 0, swipe = null, power = 0, powDir = 1, spin = 0, kbPhase = 0, msg = null, standing = [];
    function resetPins() { pins = PINS0.map(([x, z], i) => ({ n: i + 1, x, z, vx: 0, vz: 0, down: false, tilt: 0, tdir: 0, a: 0 })); }
    function newBall() { ball = { x: posX, z: 0, vx: 0, vz: 0, spin: 0, rolling: false, gutter: false, rot: 0, t: 0 }; }
    resetPins(); newBall();
    // scoring
    function frameScores() {
      const out = []; let i = 0, total = 0;
      for (let f = 0; f < 10; f++) {
        if (i >= rolls.length) break;
        if (f < 9) {
          if (rolls[i] === 10) { if (rolls[i + 2] === undefined) break; total += 10 + rolls[i + 1] + rolls[i + 2]; i += 1; }
          else { if (rolls[i + 1] === undefined) break; const s = rolls[i] + rolls[i + 1]; if (s === 10) { if (rolls[i + 2] === undefined) break; total += 10 + rolls[i + 2]; } else total += s; i += 2; }
        } else { const r = rolls.slice(i); const need = r[0] === 10 || r[0] + r[1] === 10 ? 3 : 2; if (r.length < need) break; total += r.slice(0, need).reduce((a, b) => a + b, 0); }
        out.push(total);
      }
      return out;
    }
    function frameMarks() {
      const marks = []; let i = 0;
      for (let f = 0; f < 10; f++) {
        const m = [];
        if (f < 9) { if (i >= rolls.length) { marks.push(m); continue; } if (rolls[i] === 10) { m.push('X'); i++; } else { m.push(rolls[i] || '-'); if (rolls[i + 1] !== undefined) m.push(rolls[i] + rolls[i + 1] === 10 ? '/' : rolls[i + 1] || '-'); i += 2; } }
        else {
          const [r0, r1, r2] = rolls.slice(i), f = (v) => (v === 10 ? 'X' : v || '-');
          if (r0 !== undefined) m.push(f(r0));
          if (r1 !== undefined) m.push(r0 === 10 ? f(r1) : r0 + r1 === 10 ? '/' : r1 || '-');
          if (r2 !== undefined) m.push(r0 === 10 && r1 !== 10 ? (r1 + r2 === 10 ? '/' : r2 || '-') : f(r2));
        }
        marks.push(m);
      }
      return marks;
    }
    function throwBall(dirA, spd, sp) {
      ball.vz = Math.cos(dirA) * spd; ball.vx = Math.sin(dirA) * spd; ball.spin = sp; ball.rolling = true; state = 'rolling'; stateT = 0;
      E.sfx('whoosh', 0.6, 0.8);
    }
    function proj(x, z, y = 0) { const dz = Math.max(0.3, z - cam.z); return [W / 2 + ((x - cam.x) / dz) * F, 150 + ((CAMY - y) / dz) * F, F / dz]; }
    function settle() {
      const fullRack = pins.every((p) => !p.gone);
      const knocked = pins.filter((p) => !p.gone && p.down).length;
      pins.forEach((p) => { if (p.down) p.gone = true; });
      const score = knocked, tenth = frame === 9;
      rolls.push(score);
      const left = pins.filter((p) => !p.gone).length;
      let text;
      if (fullRack && left === 0) { text = 'STRIKE!'; E.sfx('win'); E.flash('#fde68a', 0.3); for (let i = 0; i < 3; i++) E.after(i * 0.15, () => E.burst(W / 2 + U.rand(-120, 120), 200, { n: 30, colors: ['#fde68a', '#f87171', '#60a5fa', '#fff'], speed: 300 })); }
      else if (left === 0) { text = 'SPARE!'; E.sfx('power'); }
      else if (score === 0 && ball.gutter) { text = 'GUTTER'; E.sfx('lose', 1.4, 0.5); }
      else text = `${score} PIN${score === 1 ? '' : 'S'}`;
      msg = { t: text, life: 1.6 };
      // advance
      const fs = frameScores(); E.score = fs.length ? fs[fs.length - 1] : 0;
      if (!tenth) {
        if (roll === 0 && left > 0) { roll = 1; }
        else { frame++; roll = 0; resetPins(); }
      } else {
        const r = rolls.slice(rolls.length - (roll + 1));
        const bonus = r[0] === 10 || (r.length >= 2 && r[0] + r[1] === 10);
        if ((roll === 1 && !bonus) || roll === 2) { state = 'done'; const fin = frameScores(); const t = fin[fin.length - 1] || 0; E.score = t; E.after(1.6, () => E.over({ win: true, title: t >= 200 ? 'Legendary!' : t >= 150 ? 'Great Game!' : 'Game Complete', msg: `Final score ${t}` })); return; }
        roll++; if (left === 0) resetPins();
      }
      E.stat('Frame', `${Math.min(frame + 1, 10)}/10`);
      standing = [];
      newBall(); state = 'setup'; kbPhase = 0; power = 0;
    }
    E.stat('Frame', '1/10');
    return {
      update(dt) {
        if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
        if (state === 'setup') {
          cam.z = U.damp(cam.z, -2.2, 4, dt); cam.x = U.damp(cam.x, 0, 4, dt);
          const ax = E.axis().x;
          if (kbPhase === 0) { posX = U.clamp(posX + ax * 0.6 * dt, -LW + BR, LW - BR); ball.x = posX; }
          if (E.hit('KeyZ')) spin = Math.max(-1, spin - 0.5); if (E.hit('KeyX')) spin = Math.min(1, spin + 0.5);
          if (E.hit('Space')) { if (kbPhase === 0) { kbPhase = 1; power = 0; powDir = 1; } else { throwBall(-ax * 0.03, 5 + power * 5, spin); kbPhase = 0; } }
          if (kbPhase === 1) { power += powDir * dt * 1.2; if (power > 1 || power < 0) { powDir = -powDir; power = U.clamp(power, 0, 1); } }
          // swipe
          const [bx, by] = proj(ball.x, ball.z, BR);
          if (E.ptr.hit && E.ptr.sy > H * 0.45) swipe = { pts: [[E.ptr.sx, E.ptr.sy, E.t - 1 / 60]] };
          if (swipe && E.ptr.down) { swipe.pts.push([E.ptr.x, E.ptr.y, E.t]); if (swipe.pts.length < 4 && Math.abs(E.ptr.y - swipe.pts[0][1]) < 20) { posX = U.clamp(posX + (E.ptr.x - swipe.pts[swipe.pts.length - 2][0]) / 300, -LW + BR, LW - BR); ball.x = posX; } }
          if (swipe && E.ptr.up) {
            const P = swipe.pts; swipe = null; P.push([E.ptr.x, E.ptr.y, E.t + 1 / 60]);
            if (P.length >= 2) {
              const [x0, y0, t0] = P[0], [x1, y1, t1] = P[P.length - 1], dy = y0 - y1;
              if (dy > 50) {
                const dtS = Math.max(0.08, t1 - t0), spd = U.clamp(dy / dtS / 140, 4.5, 10.5);
                const dir = Math.atan2(x1 - x0, dy) * 0.12;
                const mid = P[Math.floor(P.length / 2)], lx = U.lerp(x0, x1, (y0 - mid[1]) / dy);
                const sp = U.clamp((mid[0] - lx) / -60, -1.2, 1.2);
                throwBall(dir, spd, sp);
              }
            }
          }
          void bx; void by;
          return;
        }
        if (state === 'rolling' || state === 'pins') {
          stateT += dt;
          const sub = 6, h = dt / sub;
          for (let s = 0; s < sub; s++) {
            if (ball.rolling) {
              if (!ball.gutter) { if (ball.z > 6) ball.vx += ball.spin * 0.55 * h * Math.min(1, (ball.z - 6) / 4); if (E.axis().x && ball.z < 7) ball.vx += E.axis().x * 0.5 * h; }
              ball.x += ball.vx * h; ball.z += ball.vz * h; ball.rot += (ball.vz / BR) * h;
              if (!ball.gutter && Math.abs(ball.x) > LW) { ball.gutter = true; ball.x = Math.sign(ball.x) * (LW + 0.12); ball.vx = 0; ball.spin = 0; E.sfx('thud', 0.6, 0.5); }
              if (ball.z > LEN + 1.6) { ball.rolling = false; }
            }
            // ball vs pins
            if (!ball.gutter && ball.rolling) for (const p of pins) {
              if (p.gone) continue;
              const dx = p.x - ball.x, dz = p.z - ball.z, d = Math.hypot(dx, dz);
              if (d < BR + PR) { const nx = dx / d, nz = dz / d, rv = (ball.vx - p.vx) * nx + (ball.vz - p.vz) * nz; if (rv > 0) { const j = (2 * rv) / (1 + 1.5 / 7); p.vx += nx * j * 0.95; p.vz += nz * j * 0.95; ball.vx -= nx * j * (1.5 / 7); ball.vz -= nz * j * (1.5 / 7); p.x = ball.x + nx * (BR + PR); p.z = ball.z + nz * (BR + PR); knock(p, nx, nz, rv); } }
            }
            // pins vs pins
            for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
              const a = pins[i], b = pins[j]; if (a.gone || b.gone) continue;
              const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), rr = PR * 2 * (a.down || b.down ? 1.7 : 1);
              if (d < rr && d > 1e-4) { const nx = dx / d, nz = dz / d, rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; const ov = rr - d; a.x -= nx * ov / 2; a.z -= nz * ov / 2; b.x += nx * ov / 2; b.z += nz * ov / 2; if (rv > 0) { a.vx -= nx * rv * 0.9; a.vz -= nz * rv * 0.9; b.vx += nx * rv * 0.9; b.vz += nz * rv * 0.9; if (rv > 0.35) { knock(a, -nx, -nz, rv); knock(b, nx, nz, rv); } } }
            }
            for (const p of pins) { if (p.gone) continue; p.x += p.vx * h; p.z += p.vz * h; if (p.z > LEN + 2.1) { p.down = true; p.pit = true; p.vx = p.vz = 0; } const fr = Math.exp(-(p.down ? 1.6 : 3) * h); p.vx *= fr; p.vz *= fr; if (p.down) p.tilt = Math.min(1, p.tilt + h * 5); if (Math.abs(p.x) > LW + 0.3) { p.down = true; p.vx *= 0.5; } }
          }
          // camera follows the ball down the lane, TV-style
          const tz = ball.rolling ? Math.min(ball.z - 2.6, LEN - 4.2) : LEN - 4.2;
          cam.z = U.damp(cam.z, tz, 3, dt); cam.x = U.damp(cam.x, ball.rolling ? ball.x * 0.4 : 0, 3, dt);
          if (Math.random() < 0.2 && ball.rolling) E.sfx('engine', 0.35, 0.6);
          const stillMoving = pins.some((p) => !p.gone && Math.hypot(p.vx, p.vz) > 0.05);
          if (!ball.rolling && (!stillMoving || stateT > 6) && stateT > 1) { state = 'settle'; stateT = 0.9; }
        }
        if (state === 'settle') { stateT -= dt; if (stateT <= 0) settle(); }
      },
      draw(g) {
        const t = E.t;
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1026'); bg.addColorStop(1, '#1e1b4b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // back wall & neon
        const [, wy] = proj(0, LEN + 1.4, 1.2);
        g.fillStyle = '#111827'; g.fillRect(0, 0, W, wy + 40);
        const [lx0] = proj(-3, LEN + 1.4), [lx1] = proj(3, LEN + 1.4);
        const neon = g.createLinearGradient(lx0, 0, lx1, 0); neon.addColorStop(0, '#60a5fa'); neon.addColorStop(0.5, '#f472b6'); neon.addColorStop(1, '#facc15');
        g.fillStyle = neon; g.globalAlpha = 0.8; g.fillRect(0, wy - 30, W, 4); g.globalAlpha = 1;
        D.text(g, 'STRIKE LANE', W / 2, Math.max(96, wy - 60), { size: U.clamp(30 * (F / (LEN + 1.4 - cam.z)) / 60, 12, 26), color: '#fff', glow: '#f472b6' });
        // lane
        const quad = (x0, x1, z0, z1, fill) => { const a = proj(x0, z0), b = proj(x1, z0), c = proj(x1, z1), d = proj(x0, z1); D.poly(g, [[a[0], a[1]], [b[0], b[1]], [c[0], c[1]], [d[0], d[1]]], fill); };
        quad(-LW - 0.4, LW + 0.4, cam.z + 0.3, LEN + 2.4, '#1f2937'); quad(-LW - 0.4, LW + 0.4, LEN + 1.6, LEN + 2.4, '#030712');
        quad(-LW - 0.24, -LW, cam.z + 0.3, LEN + 1.6, '#374151'); quad(LW, LW + 0.24, cam.z + 0.3, LEN + 1.6, '#374151');
        const lg = g.createLinearGradient(0, proj(0, LEN)[1], 0, H); lg.addColorStop(0, '#d9a066'); lg.addColorStop(1, '#f3c98b');
        quad(-LW, LW, Math.max(cam.z + 0.3, -1), LEN + 1.6, lg);
        for (let k = -19; k <= 19; k += 2) { const a = proj((k / 39) * LW * 2, Math.max(cam.z + 0.3, -1)), b = proj((k / 39) * LW * 2, LEN + 1.6); D.line(g, a[0], a[1], b[0], b[1], 'rgba(120,70,30,.18)', 1); }
        // arrows & foul line
        for (let k = -3; k <= 3; k++) { const z = 4.6 + Math.abs(k) * 0.3, x = k * 0.13; const [ax, ay, s] = proj(x, z); if (z > cam.z + 0.4) D.poly(g, [[ax, ay - s * 0.06], [ax - s * 0.025, ay + s * 0.03], [ax + s * 0.025, ay + s * 0.03]], '#7c2d12'); }
        const f0 = proj(-LW, 0), f1 = proj(LW, 0); if (cam.z < -0.3) D.line(g, f0[0], f0[1], f1[0], f1[1], '#991b1b', 3);
        // shine
        g.save(); g.globalAlpha = 0.15; quad(-0.12, 0.12, Math.max(cam.z + 0.3, -1), LEN, '#fff'); g.restore();
        // pins (far to near) + ball ordering
        const draws = [];
        for (const p of pins) if (!p.gone && !p.pit) draws.push({ z: p.z, fn: () => drawPin(g, p) });
        draws.push({ z: ball.z, fn: () => drawBall(g) });
        draws.sort((a, b) => b.z - a.z).forEach((d) => d.fn());
        // aim guide in setup
        if (state === 'setup') {
          for (let z = 0.6; z < 8; z += 0.6) { const [x, y, s] = proj(ball.x, z); g.globalAlpha = 1 - z / 8; D.circle(g, x, y, s * 0.012, '#fff'); } g.globalAlpha = 1;
          if (kbPhase === 1) { D.fillRR(g, W - 60, 180, 22, 260, 11, 'rgba(0,0,0,.4)'); D.fillRR(g, W - 60, 180 + 260 * (1 - power), 22, 260 * power, 11, U.mix('#4ade80', '#ef4444', power)); }
          D.text(g, spin ? `SPIN ${spin > 0 ? '→' : '←'} ${Math.abs(spin) * 100 | 0}%` : 'NO SPIN', W - 50, 460, { size: 11, font: 'mono', color: '#cbd5e1' });
          if (!swipe) D.text(g, 'SWIPE UP TO BOWL', W / 2, H - 30, { size: 16, font: 'ui', weight: 700, color: 'rgba(255,255,255,.6)' });
        }
        if (swipe && swipe.pts.length > 1) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); swipe.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        // scorecard
        const fs = frameScores(), mk = frameMarks();
        const cw = 64, sx = W / 2 - cw * 5, sy = 16;
        D.fillRR(g, sx - 6, sy - 6, cw * 10 + 12, 58, 10, 'rgba(0,0,0,.55)');
        for (let f = 0; f < 10; f++) {
          const x = sx + f * cw;
          D.strokeRR(g, x + 2, sy, cw - 4, 46, 6, f === frame && state !== 'done' ? '#facc15' : 'rgba(255,255,255,.15)', 1.5);
          (mk[f] || []).forEach((m, k) => D.text(g, m, x + cw - 12 - ((mk[f].length - 1 - k) * 16), sy + 12, { size: 12, font: 'mono', color: m === 'X' || m === '/' ? '#facc15' : '#e2e8f0' }));
          if (fs[f] !== undefined) D.text(g, fs[f], x + cw / 2, sy + 33, { size: 15, color: '#fff' });
          D.text(g, f + 1, x + 10, sy + 12, { size: 9, font: 'mono', color: '#64748b' });
        }
        if (msg) D.text(g, msg.t, W / 2, 250, { size: 56, color: '#fff', glow: msg.t.includes('STRIKE') ? '#facc15' : '#60a5fa', alpha: Math.min(1, msg.life * 2) });
        void t;
      },
    };
    function knock(p, nx, nz, rv) { if (!p.down && rv > 0.25) { p.down = true; p.tdir = Math.atan2(nz, nx); E.sfx('hit', 1.3 + Math.random() * 0.4, Math.min(0.9, rv / 4)); if (rv > 1) E.shake(Math.min(6, rv)); } }
    function drawPin(g, p) {
      const [x, y, s] = proj(p.x, p.z);
      const h = 0.38 * s, w = 0.12 * s;
      D.shadow(g, x, y, w * 0.8, w * 0.25, 0.35);
      g.save(); g.translate(x, y);
      if (p.down) { const k = p.tilt; g.rotate(Math.cos(p.tdir) * k * 1.4); g.scale(1, 1 - k * 0.55); }
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.moveTo(-w * 0.3, 0); g.bezierCurveTo(-w * 0.62, -h * 0.25, -w * 0.5, -h * 0.5, -w * 0.18, -h * 0.66); g.bezierCurveTo(-w * 0.12, -h * 0.72, -w * 0.3, -h * 0.9, -w * 0.18, -h * 0.98); g.quadraticCurveTo(0, -h * 1.06, w * 0.18, -h * 0.98);
      g.bezierCurveTo(w * 0.3, -h * 0.9, w * 0.12, -h * 0.72, w * 0.18, -h * 0.66); g.bezierCurveTo(w * 0.5, -h * 0.5, w * 0.62, -h * 0.25, w * 0.3, 0); g.closePath(); g.fill();
      g.fillStyle = '#dc2626'; g.fillRect(-w * 0.2, -h * 0.76, w * 0.4, h * 0.035); g.fillRect(-w * 0.19, -h * 0.71, w * 0.38, h * 0.035);
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(w * 0.05, -h * 0.9, w * 0.3, h * 0.85);
      g.restore();
    }
    function drawBall(g) {
      if (ball.z > LEN + 1.5) return;
      const [x, y, s] = proj(ball.x, ball.z), r = BR * s;
      D.shadow(g, x, y, r * 0.9, r * 0.3, 0.4);
      const cy = y - r;
      const gr = g.createRadialGradient(x - r * 0.35, cy - r * 0.4, r * 0.1, x, cy, r); gr.addColorStop(0, '#93c5fd'); gr.addColorStop(0.4, '#2563eb'); gr.addColorStop(1, '#1e1b4b');
      g.fillStyle = gr; g.beginPath(); g.arc(x, cy, r, 0, U.TAU); g.fill();
      g.save(); g.beginPath(); g.arc(x, cy, r, 0, U.TAU); g.clip(); g.globalAlpha = 0.25; g.strokeStyle = '#f472b6'; g.lineWidth = r * 0.2; g.beginPath(); g.arc(x + Math.sin(ball.rot) * r * 0.3, cy, r * 0.8, 0, U.TAU); g.stroke(); g.restore();
      const hy = cy - Math.cos(ball.rot) * r * 0.45; if (Math.cos(ball.rot) > -0.2) for (const [ox, oy] of [[-0.18, 0], [0.18, 0], [0, 0.22]]) D.circle(g, x + ox * r, hy + oy * r, r * 0.08, '#0f172a');
    }
  },
});

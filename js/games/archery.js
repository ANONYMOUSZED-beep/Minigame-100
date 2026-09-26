MG.add({
  id: 'archery', name: 'Bow Master', cat: 'Sports', color: '#eab308', color2: '#22c55e',
  desc: 'Target archery across a windy valley. Draw, read the breeze, loose — the camera rides with the arrow.',
  how: ['Drag back anywhere to draw the bow; release to loose', 'Or <kbd>↑</kbd> <kbd>↓</kbd> aim · hold <kbd>Space</kbd> to draw, release to shoot', 'Watch the wind flag — gusts push arrows sideways and down', 'Five ends of three arrows; targets move further away (and start to sway)'],
  pad: 'UDA', padLabels: { A: 'DRAW' },
  make(E) {
    const W = 960, H = 600, GROUND = 500, AX = 110, AY = GROUND - 70;
    const ENDS = [{ dist: 700, move: 0 }, { dist: 1000, move: 0 }, { dist: 1300, move: 0 }, { dist: 1500, move: 60 }, { dist: 1800, move: 90 }];
    let end = 0, arrowN = 0, arrows = [], flying = null, cam = 0, aim = -0.08, draw = 0, drawing = false, drag = null, wind = 0, state = 'aim', stateT = 0, total = 0, endScores = [], target, zoom = null, T = 0, bird = null;
    function setupEnd() { target = { x: AX + ENDS[end].dist, y: GROUND - 120, r: 60, move: ENDS[end].move, ph: U.rand(6), hits: [] }; wind = U.rand(-1, 1) * (0.4 + end * 0.3); E.stat('End', `${end + 1}/5`); E.banner(`END ${end + 1}`, `${Math.round(ENDS[end].dist / 10)} m${target.move ? ' · moving target' : ''}`, { color: '#eab308' }); }
    setupEnd();
    E.stat('Arrow', '1/3');
    const tgtY = () => target.y + (target.move ? Math.sin(T * 1.2 + target.ph) * target.move : 0);
    function loose() {
      const p = U.clamp(draw, 0.15, 1), sp = 700 + p * 1100;
      flying = { x: AX + 20, y: AY - 10, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp, a: aim, trail: [] };
      state = 'fly'; draw = 0; drawing = false;
      E.sfx('whoosh', 1.6, 0.7); E.sfx('thud', 2, 0.3);
    }
    function ringScore(dy) { const d = Math.abs(dy) / target.r; return d > 1 ? 0 : Math.max(1, 10 - Math.floor(d * 10)); }
    return {
      update(dt) {
        T += dt;
        if (bird) { bird.x += bird.vx * dt; bird.t += dt; if (bird.x > cam + W + 100 || bird.x < cam - 100) bird = null; }
        else if (Math.random() < dt * 0.05) bird = { x: cam + (U.chance(0.5) ? -50 : W + 50), y: U.rand(80, 200), vx: 0, t: 0 }, (bird.vx = bird.x < cam ? 120 : -120);
        if (state === 'aim') {
          cam = U.damp(cam, 0, 4, dt);
          const ay = E.axis().y; aim = U.clamp(aim + ay * 0.5 * dt, -0.9, 0.35);
          if (E.hit('A')) { drawing = true; E.sfx('charge', 0.8, 0.3); }
          if (drawing) { draw = Math.min(1, draw + dt * 0.9); if (E.up('A')) loose(); }
          if (E.ptr.hit) { drag = { x: E.ptr.x, y: E.ptr.y }; E.sfx('charge', 0.8, 0.3); }
          if (drag && E.ptr.down) { const dx = drag.x - E.ptr.x, dy = drag.y - E.ptr.y, d = Math.hypot(dx, dy); if (d > 6) { aim = U.clamp(Math.atan2(dy, Math.max(20, dx)), -0.9, 0.35); draw = U.clamp(d / 240, 0, 1); } }
          if (drag && E.ptr.up) { drag = null; if (draw > 0.12) loose(); else draw = 0; }
        } else if (state === 'fly') {
          const f = flying, sub = 4, h = dt / sub;
          for (let s = 0; s < sub; s++) {
            f.vy += 700 * h; f.vx += wind * 60 * h * 0.25; f.vy += Math.abs(wind) * 10 * h;
            f.x += f.vx * h; f.y += f.vy * h; f.a = Math.atan2(f.vy, f.vx);
            const ty = tgtY();
            if (f.x >= target.x - 6 && f.x - f.vx * h < target.x + 6 && Math.abs(f.y - ty) < target.r) {
              const pts = ringScore(f.y - ty);
              f.x = target.x; f.stuck = true; f.dy = f.y - ty;
              arrows.push(f); target.hits.push(f.dy);
              total += pts; E.score = total; endScores[end] = (endScores[end] || 0) + pts;
              zoom = { pts, dy: f.dy, t: 1.8 };
              E.sfx(pts >= 9 ? 'win' : pts >= 6 ? 'coin' : 'thud', 1, 0.8); E.shake(pts === 10 ? 6 : 2);
              E.pop(W * 0.7, 160, pts === 10 ? 'BULLSEYE! 10' : `${pts}`, { color: pts >= 9 ? '#facc15' : '#fff', size: pts === 10 ? 40 : 32 });
              state = 'result'; stateT = 1.8; break;
            }
            if (bird && !bird.hit && U.dist(f.x, f.y, bird.x, bird.y) < 24) { bird.hit = true; total += 5; E.score = total; E.pop(bird.x - cam, bird.y - 30, 'BIRD +5', { color: '#fde68a' }); E.sfx('pop'); E.burst(bird.x - cam, bird.y, { n: 16, colors: ['#fff', '#94a3b8'], speed: 150 }); }
            if (f.y >= GROUND) { f.y = GROUND; f.stuck = true; arrows.push(f); zoom = { pts: 0, miss: true, t: 1.2 }; E.sfx('thud', 1.4, 0.5); state = 'result'; stateT = 1.4; E.pop(W / 2, 160, 'MISS', { color: '#f87171', size: 32 }); break; }
            if (f.x > target.x + 800) { f.stuck = true; state = 'result'; stateT = 1; zoom = { pts: 0, miss: true, t: 1 }; E.pop(W / 2, 160, 'MISS', { color: '#f87171', size: 32 }); break; }
          }
          f.trail.push([f.x, f.y]); if (f.trail.length > 12) f.trail.shift();
          cam = U.damp(cam, U.clamp(f.x - W * 0.45, 0, target.x - W * 0.6), 6, dt);
        } else if (state === 'result') {
          stateT -= dt; if (zoom) zoom.t -= dt;
          if (stateT <= 0) {
            flying = null; zoom = null; arrowN++;
            if (arrowN >= 3) {
              arrowN = 0; end++; arrows = [];
              if (end >= ENDS.length) { state = 'done'; E.over({ win: true, title: total >= 120 ? 'Master Archer!' : 'Tournament Over', msg: `Ends: ${endScores.map((s) => s || 0).join(' · ')}  —  ${total} / 150` }); return; }
              setupEnd();
            }
            E.stat('Arrow', `${arrowN + 1}/3`);
            state = 'aim'; wind = U.clamp(wind + U.rand(-0.3, 0.3), -1.6, 1.6);
          }
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#7dd3fc', '#e0f2fe');
        // parallax hills
        for (let l = 0; l < 3; l++) {
          g.fillStyle = ['#a7c7a0', '#7fb069', '#5a9a4a'][l]; g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W; x += 20) { const wx = x + cam * (0.15 + l * 0.25); g.lineTo(x, 330 + l * 45 - Math.abs(Math.sin(wx * 0.004 + l * 2)) * (90 - l * 20) - Math.sin(wx * 0.017) * 10); }
          g.lineTo(W, H); g.fill();
        }
        g.save(); g.translate(-cam, 0);
        // ground
        g.fillStyle = '#4d7c0f'; g.fillRect(cam - 10, GROUND, W + 20, H - GROUND);
        g.fillStyle = '#65a30d'; g.fillRect(cam - 10, GROUND, W + 20, 6);
        for (let x = Math.floor(cam / 100) * 100; x < cam + W + 100; x += 100) { D.text(g, `${Math.round((x - AX) / 10)}m`, x, GROUND + 22, { size: 11, font: 'mono', color: 'rgba(255,255,255,.4)' }); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x - 1, GROUND, 2, 8); }
        // wind flag near target & near archer
        const flag = (fx) => { D.line(g, fx, GROUND, fx, GROUND - 110, '#e5e7eb', 3); const len = 30 + Math.abs(wind) * 30, dir = Math.sign(wind) || 1; g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(fx, GROUND - 110); for (let k = 0; k <= 6; k++) g.lineTo(fx + dir * (k / 6) * len, GROUND - 110 + Math.sin(t * 8 + k) * 3 * Math.abs(wind) + k * (1 - Math.abs(wind) / 1.6) * 2); g.lineTo(fx, GROUND - 92); g.fill(); };
        flag(AX + 200); flag(target.x - 160);
        // target
        const ty = tgtY();
        D.line(g, target.x + 10, ty + target.r * 0.6, target.x + 30, GROUND, '#78350f', 6); D.line(g, target.x + 10, ty + target.r * 0.6, target.x - 10, GROUND, '#78350f', 6);
        const RC = ['#f8fafc', '#f8fafc', '#111827', '#111827', '#3b82f6', '#3b82f6', '#ef4444', '#ef4444', '#facc15', '#facc15'];
        g.save(); g.translate(target.x, ty); g.scale(0.28, 1);
        for (let k = 0; k < 10; k++) D.circle(g, 0, 0, target.r * (1 - k / 10), RC[k], 'rgba(0,0,0,.25)', 2);
        g.restore();
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(target.x + 8, ty - target.r, 6, target.r * 2);
        for (const a of arrows) if (a.stuck && a.dy !== undefined) { const ay = tgtY() + a.dy; D.line(g, a.x - 40, ay - Math.sin(a.a) * 40, a.x, ay, '#78350f', 3); D.poly(g, [[a.x - 40, ay - Math.sin(a.a) * 40], [a.x - 52, ay - Math.sin(a.a) * 40 - 6], [a.x - 48, ay - Math.sin(a.a) * 40], [a.x - 52, ay - Math.sin(a.a) * 40 + 6]], '#ef4444'); }
        for (const a of arrows) if (a.stuck && a.dy === undefined) { D.line(g, a.x - Math.cos(a.a) * 40, a.y - Math.sin(a.a) * 40, a.x, a.y, '#78350f', 3); }
        // bird
        if (bird) { const fl = Math.sin(bird.t * 14) * 8; g.save(); g.translate(bird.x, bird.y + (bird.hit ? bird.t * 60 : 0)); g.scale(Math.sign(bird.vx), 1); g.strokeStyle = '#334155'; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, fl); g.quadraticCurveTo(-6, -6, 0, 0); g.quadraticCurveTo(6, -6, 14, fl); g.stroke(); g.restore(); }
        // archer
        g.save(); g.translate(AX, AY);
        D.shadow(g, 0, 70, 26, 6, 0.3);
        g.fillStyle = '#1e3a8a'; g.fillRect(-8, 20, 7, 50); g.fillRect(3, 20, 7, 50);
        D.fillRR(g, -12, -20, 24, 44, 8, '#166534');
        D.circle(g, 0, -32, 12, '#fcd9b6'); g.fillStyle = '#14532d'; g.beginPath(); g.moveTo(-14, -34); g.lineTo(0, -58); g.lineTo(14, -34); g.fill(); D.line(g, 0, -58, 10, -64, '#ef4444', 2);
        g.rotate(aim);
        const pull = draw * 34;
        D.line(g, 0, -4, 24, -4, '#fcd9b6', 6);
        g.strokeStyle = '#78350f'; g.lineWidth = 4; g.beginPath(); g.arc(20, -4, 46, -1.1 - draw * 0.2, 1.1 + draw * 0.2); g.stroke();
        const tipY1 = -4 + Math.sin(-1.1 - draw * 0.2) * 46, tipY2 = -4 + Math.sin(1.1 + draw * 0.2) * 46, tipX = 20 + Math.cos(1.1 + draw * 0.2) * 46;
        g.strokeStyle = '#e5e7eb'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tipX, tipY1); g.lineTo(20 - 46 * 0 + (-pull) + 6, -4); g.lineTo(tipX, tipY2); g.stroke();
        if (state === 'aim') { D.line(g, 6 - pull, -4, 60, -4, '#78350f', 3); D.poly(g, [[60, -4], [52, -8], [52, 0]], '#94a3b8'); D.poly(g, [[6 - pull, -4], [-6 - pull, -10], [-2 - pull, -4], [-6 - pull, 2]], '#ef4444'); }
        g.restore();
        // flying arrow
        if (flying && !flying.stuck) {
          const f = flying;
          g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); f.trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
          g.save(); g.translate(f.x, f.y); g.rotate(f.a); D.line(g, -44, 0, 0, 0, '#78350f', 3); D.poly(g, [[4, 0], [-6, -4], [-6, 4]], '#94a3b8'); D.poly(g, [[-44, 0], [-54, -6], [-50, 0], [-54, 6]], '#ef4444'); g.restore();
        }
        g.restore();
        // HUD: wind, draw meter, zoom inset
        D.fillRR(g, 20, 20, 190, 50, 12, 'rgba(15,23,42,.55)');
        D.text(g, 'WIND', 36, 36, { size: 11, font: 'mono', align: 'left', color: '#cbd5e1' });
        D.line(g, 110, 46, 110 + wind * 50, 46, '#fde68a', 4); if (Math.abs(wind) > 0.05) D.poly(g, [[110 + wind * 50 + Math.sign(wind) * 9, 46], [110 + wind * 50, 40], [110 + wind * 50, 52]], '#fde68a');
        D.text(g, `${Math.abs(wind * 10).toFixed(1)} m/s`, 36, 56, { size: 12, font: 'mono', align: 'left', color: '#fde68a' });
        if (state === 'aim') { D.fillRR(g, AX - 40 - cam, AY + 90, 80, 8, 4, 'rgba(0,0,0,.4)'); D.fillRR(g, AX - 40 - cam, AY + 90, 80 * draw, 8, 4, U.mix('#4ade80', '#ef4444', draw)); }
        if (zoom && !zoom.miss) {
          const zx = W - 170, zy = 110;
          D.fillRR(g, zx - 90, zy - 90, 180, 180, 20, 'rgba(15,23,42,.7)');
          for (let k = 0; k < 10; k++) D.circle(g, zx, zy, 76 * (1 - k / 10), RC[k], 'rgba(0,0,0,.2)', 1);
          target.hits.forEach((dy, i) => { const hx = zx + ((i * 37) % 23 - 11) * 0.6, hy = zy + (dy / target.r) * 76; D.circle(g, hx, hy, 5, '#111', '#fff', 2); });
          D.text(g, zoom.pts, zx, zy + 104, { size: 20, color: '#fff' });
        }
        D.fillRR(g, W / 2 - 120, 14, 240, 36, 10, 'rgba(15,23,42,.55)');
        D.text(g, `END ${end + 1}  ·  ${endScores[end] || 0} pts  ·  arrow ${Math.min(3, arrowN + 1)}/3`, W / 2, 32, { size: 13, font: 'mono', color: '#fff' });
      },
    };
  },
});

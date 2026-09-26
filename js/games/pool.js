MG.add({
  id: 'pool', name: 'Pocket Rush', cat: 'Sports', color: '#22c55e', color2: '#facc15',
  desc: '8-ball against a shot-planning AI. Ghost-ball aiming guides, spin-free physics, fouls and ball-in-hand.',
  how: ['Aim with the mouse, then drag back and release to shoot (the further, the harder)', 'Keyboard: <kbd>←</kbd> <kbd>→</kbd> aim (hold <kbd>Shift</kbd> for fine) · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>Space</kbd> shoot', 'Pot your group (solids or stripes), then the 8-ball to win', 'Scratch or miss your group = opponent gets ball in hand'],
  pad: 'LRUDA', padLabels: { A: 'SHOOT' },
  make(E) {
    const W = 960, H = 600, X0 = 110, Y0 = 130, X1 = 850, Y1 = 500, R = 11, PR = 21;
    const COL = ['#f8fafc', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d', '#111827', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d'];
    const pockets = [[X0, Y0], [(X0 + X1) / 2, Y0 - 6], [X1, Y0], [X0, Y1], [(X0 + X1) / 2, Y1 + 6], [X1, Y1]];
    let balls = [], turn = 'me', group = { me: null, ai: null }, state = 'aim', aim = { a: 0, p: 0.5 }, drag = null, shot = null, ballInHand = false, msg = null, aiPlan = null, aiT = 0, potted = [], shots = 0, T = 0, fine = false;
    function rack() {
      balls = [{ n: 0, x: X0 + (X1 - X0) * 0.25, y: (Y0 + Y1) / 2, vx: 0, vy: 0, in: false, rot: 0 }];
      const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
      const ox = X0 + (X1 - X0) * 0.72, oy = (Y0 + Y1) / 2;
      let k = 0;
      for (let col = 0; col < 5; col++) for (let row = 0; row <= col; row++) balls.push({ n: order[k++], x: ox + col * R * 1.75, y: oy + (row - col / 2) * R * 2.02, vx: 0, vy: 0, in: false, rot: 0 });
    }
    rack();
    const cue = () => balls[0];
    const typeOf = (n) => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solids' : 'stripes');
    const moving = () => balls.some((b) => !b.in && (Math.abs(b.vx) > 1 || Math.abs(b.vy) > 1));
    const remaining = (grp) => balls.filter((b) => !b.in && typeOf(b.n) === grp).length;
    function setMsg(t, c = '#fff') { msg = { t, c, life: 2.2 }; }
    function hudTurn() { E.stat('Turn', turn === 'me' ? 'YOU' : 'AI'); E.stat('You', group.me ? `${group.me} ${7 - remaining(group.me)}/7` : '—'); }
    hudTurn();
    function strike(a, p) {
      const c = cue(), sp = 120 + p * 1250;
      c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp;
      shot = { first: null, potted: [], scratch: false, by: turn, cushion: false };
      state = 'roll'; ballInHand = false; shots++;
      E.sfx('hit', 0.8 + p * 0.4, 0.4 + p * 0.6); E.shake(p * 4);
    }
    function physics(dt) {
      const sub = 8, h = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (const b of balls) {
          if (b.in) continue;
          b.x += b.vx * h; b.y += b.vy * h;
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > 0) { const n = Math.max(0, sp - (sp * 0.35 + 28) * h); b.vx *= n / sp; b.vy *= n / sp; b.rot += (sp * h) / R; }
          // pockets
          for (const [px, py] of pockets) if (U.dist(b.x, b.y, px, py) < PR) { b.in = true; b.vx = b.vy = 0; b.sinkT = 1; b.px = px; b.py = py; shot && shot.potted.push(b.n); if (b.n === 0 && shot) shot.scratch = true; E.sfx('thud', 1.1, 0.7); E.burst(px, py, { n: 10, color: COL[b.n], speed: 90 }); break; }
          if (b.in) continue;
          // cushions (with pocket mouths)
          const nearCornerX = b.x < X0 + 30 || b.x > X1 - 30, nearMid = Math.abs(b.x - (X0 + X1) / 2) < 24, nearCornerY = b.y < Y0 + 30 || b.y > Y1 - 30;
          if (b.x < X0 + R && !nearCornerY) { b.x = X0 + R; b.vx = Math.abs(b.vx) * 0.78; cush(b); }
          if (b.x > X1 - R && !nearCornerY) { b.x = X1 - R; b.vx = -Math.abs(b.vx) * 0.78; cush(b); }
          if (b.y < Y0 + R && !nearCornerX && !nearMid) { b.y = Y0 + R; b.vy = Math.abs(b.vy) * 0.78; cush(b); }
          if (b.y > Y1 - R && !nearCornerX && !nearMid) { b.y = Y1 - R; b.vy = -Math.abs(b.vy) * 0.78; cush(b); }
          b.x = U.clamp(b.x, X0 - 20, X1 + 20); b.y = U.clamp(b.y, Y0 - 20, Y1 + 20);
        }
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j]; if (a.in || b.in) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 4 * R * R && d2 > 0.0001) {
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = 2 * R - d;
            a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              const j2 = -rv * 0.96; a.vx -= nx * j2; a.vy -= ny * j2; b.vx += nx * j2; b.vy += ny * j2;
              if (shot && !shot.first && (a.n === 0 || b.n === 0)) shot.first = a.n === 0 ? b.n : a.n;
              const v = Math.min(1, -rv / 900); if (v > 0.03) E.tone({ f: 1800 + Math.random() * 400, dur: 0.03, type: 'sine', vol: 0.25 * v });
            }
          }
        }
      }
    }
    function cush(b) { if (shot) shot.cushion = true; const v = Math.hypot(b.vx, b.vy); if (v > 60) E.sfx('thud', 1.8, Math.min(0.5, v / 1500)); }
    function resolve() {
      const s = shot, me = s.by, opp = me === 'me' ? 'ai' : 'me';
      let foul = false, keep = false, why = '';
      const own = group[me];
      if (s.scratch) { foul = true; why = 'Scratch!'; }
      else if (!s.first) { foul = true; why = 'No ball hit'; }
      else if (own && typeOf(s.first) !== own && !(typeOf(s.first) === 'eight' && remaining(own) === 0)) { foul = true; why = 'Wrong ball first'; }
      const pottedTypes = s.potted.filter((n) => n !== 0).map(typeOf);
      if (s.potted.includes(8)) {
        const cleared = own && remaining(own) === 0;
        const win = (me === 'me') === (cleared && !foul);
        return endGame(win, cleared && !foul ? `${me === 'me' ? 'You' : 'AI'} sank the 8-ball` : `${me === 'me' ? 'You' : 'AI'} potted the 8 early`);
      }
      if (!group.me && pottedTypes.length && !foul) {
        const t = pottedTypes[0]; group[me] = t; group[opp] = t === 'solids' ? 'stripes' : 'solids';
        setMsg(`${me === 'me' ? 'You are' : 'AI is'} ${t.toUpperCase()}`, '#facc15');
      }
      if (!foul && group[me] && pottedTypes.includes(group[me])) keep = true;
      if (!foul && !group[me] && pottedTypes.length) keep = true;
      for (const n of s.potted) if (n) { potted.push(n); if (me === 'me' && group.me && typeOf(n) === group.me) E.score += 100; }
      if (s.scratch) { const c = cue(); c.in = false; c.x = X0 + (X1 - X0) * 0.25; c.y = (Y0 + Y1) / 2; c.vx = c.vy = 0; c.sinkT = 0; }
      if (foul) { setMsg(`${why} Ball in hand`, '#f87171'); E.sfx('error'); turn = opp; ballInHand = true; }
      else if (!keep) turn = opp;
      else if (me === 'me') { E.sfx('coin'); }
      hudTurn();
      state = turn === 'me' ? 'aim' : 'ai'; aiPlan = null; aiT = 0.9;
      if (turn === 'me') aim.a = U.ang(cue().x, cue().y, (X0 + X1) / 2, (Y0 + Y1) / 2);
    }
    function endGame(win, text) {
      state = 'over';
      if (win) E.score += 1000 + Math.max(0, 40 - shots) * 25;
      E.sfx(win ? 'win' : 'lose');
      E.after(1.2, () => E.over({ win, title: win ? 'You Win!' : 'AI Wins', msg: text }));
    }
    function pathClear(x1, y1, x2, y2, skip) { for (const b of balls) { if (b.in || skip.includes(b)) continue; if (U.segDist(b.x, b.y, x1, y1, x2, y2).d < R * 2 - 1) return false; } return true; }
    function planAI() {
      const c = cue(), own = group.ai, targets = balls.filter((b) => !b.in && b.n && (own ? (remaining(own) ? typeOf(b.n) === own : b.n === 8) : b.n !== 8));
      let best = null;
      for (const b of targets) for (const [px, py] of pockets) {
        const da = U.ang(b.x, b.y, px, py), gx = b.x - Math.cos(da) * R * 2, gy = b.y - Math.sin(da) * R * 2;
        const ca = U.ang(c.x, c.y, gx, gy), cut = Math.abs(U.angDiff(ca, da));
        if (cut > 1.25) continue;
        if (!pathClear(c.x, c.y, gx, gy, [c, b]) || !pathClear(b.x, b.y, px, py, [b, c])) continue;
        const d1 = U.dist(c.x, c.y, gx, gy), d2 = U.dist(b.x, b.y, px, py);
        const score = cut * 300 + d1 * 0.25 + d2 * 0.4;
        if (!best || score < best.score) best = { a: ca, p: U.clamp((d1 + d2 * 1.6) / 1100 + cut * 0.15, 0.25, 0.95), score };
      }
      if (!best) { const b = U.pick(targets.length ? targets : balls.filter((q) => !q.in && q.n)); best = { a: U.ang(c.x, c.y, b.x, b.y), p: 0.45 }; }
      const err = 0.022 * (1 - Math.min(0.6, potted.length * 0.03));
      best.a += U.rand(-err, err);
      return best;
    }
    function placeCue(x, y) { const c = cue(); x = U.clamp(x, X0 + R, X1 - R); y = U.clamp(y, Y0 + R, Y1 - R); if (balls.every((b) => b === c || b.in || U.dist(b.x, b.y, x, y) > 2 * R + 1)) { c.x = x; c.y = y; } }
    // ghost ball prediction for the aim guide
    function predict(a) {
      const c = cue(), dx = Math.cos(a), dy = Math.sin(a);
      let bestT = 2000, hit = null;
      for (const b of balls) { if (b === c || b.in) continue; const fx = b.x - c.x, fy = b.y - c.y, t = fx * dx + fy * dy; if (t <= 0) continue; const d2 = fx * fx + fy * fy - t * t; if (d2 > 4 * R * R) continue; const tt = t - Math.sqrt(4 * R * R - d2); if (tt < bestT) { bestT = tt; hit = b; } }
      // cushion distance
      const tx = dx > 0 ? (X1 - R - c.x) / dx : dx < 0 ? (X0 + R - c.x) / dx : 1e9, ty = dy > 0 ? (Y1 - R - c.y) / dy : dy < 0 ? (Y0 + R - c.y) / dy : 1e9;
      const tw = Math.min(tx, ty);
      if (!hit || tw < bestT) return { x: c.x + dx * tw, y: c.y + dy * tw, hit: null };
      return { x: c.x + dx * bestT, y: c.y + dy * bestT, hit };
    }
    return {
      update(dt) {
        T += dt;
        if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
        for (const b of balls) if (b.in && b.sinkT > 0) b.sinkT = Math.max(0, b.sinkT - dt * 3);
        if (state === 'roll') { physics(dt); if (!moving()) { for (const b of balls) { b.vx = b.vy = 0; } resolve(); } return; }
        if (state === 'aim') {
          fine = E.down('ShiftLeft', 'ShiftRight');
          const c = cue();
          if (ballInHand && E.ptr.down && !drag && U.dist(E.ptr.x, E.ptr.y, c.x, c.y) < 30) { placeCue(E.ptr.x, E.ptr.y); return; }
          const ax = E.axis();
          aim.a += ax.x * (fine ? 0.12 : 0.9) * dt; aim.p = U.clamp(aim.p - ax.y * 0.6 * dt, 0.05, 1);
          if (E.ptr.moved && !E.ptr.down) aim.a = U.ang(c.x, c.y, E.ptr.x, E.ptr.y);
          if (E.ptr.hit) { if (E.ptr.type !== 'mouse') aim.a = U.ang(c.x, c.y, E.ptr.x, E.ptr.y); drag = { x: E.ptr.x, y: E.ptr.y, a: aim.a }; }
          if (drag && E.ptr.down) { const back = (E.ptr.x - drag.x) * -Math.cos(drag.a) + (E.ptr.y - drag.y) * -Math.sin(drag.a); aim.p = U.clamp(back / 200, 0, 1); }
          if (drag && E.ptr.up) { const p = aim.p; drag = null; if (p > 0.04) strike(aim.a, p); else aim.p = 0.5; }
          if (E.hit('A')) strike(aim.a, aim.p);
          return;
        }
        if (state === 'ai') {
          aiT -= dt;
          if (!aiPlan) {
            if (ballInHand) { let bx, by, k = 0; do { bx = U.rand(X0 + 40, X0 + 260); by = U.rand(Y0 + 40, Y1 - 40); k++; } while (k < 40 && balls.some((b) => b.n && !b.in && U.dist(b.x, b.y, bx, by) < 3 * R)); placeCue(bx, by); ballInHand = false; }
            aiPlan = planAI(); aim.p = 0;
          }
          aim.a += U.angDiff(aim.a, aiPlan.a) * Math.min(1, dt * 4);
          if (aiT < 0.5) aim.p = U.lerp(aim.p, aiPlan.p, Math.min(1, dt * 6));
          if (aiT <= 0) { aim.a = aiPlan.a; strike(aiPlan.a, aiPlan.p); }
        }
      },
      draw(g) {
        g.fillStyle = '#0a0a12'; g.fillRect(0, 0, W, H);
        D.glow(g, W / 2, H / 2, 520, '#fde68a', 0.08);
        // rails
        D.fillRR(g, X0 - 44, Y0 - 44, X1 - X0 + 88, Y1 - Y0 + 88, 26, '#5b2b0f');
        D.fillRR(g, X0 - 38, Y0 - 38, X1 - X0 + 76, Y1 - Y0 + 76, 22, '#7c3f16');
        for (const [x, y] of [[X0 + 185, Y0 - 26], [X0 + 370 - 0, Y0 - 26], [X1 - 185, Y0 - 26], [X0 + 185, Y1 + 26], [X1 - 185, Y1 + 26], [X0 - 26, (Y0 + Y1) / 2], [X1 + 26, (Y0 + Y1) / 2]]) D.poly(g, [[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], '#fde68a');
        const felt = g.createRadialGradient((X0 + X1) / 2, (Y0 + Y1) / 2, 50, (X0 + X1) / 2, (Y0 + Y1) / 2, 500); felt.addColorStop(0, '#15803d'); felt.addColorStop(1, '#0f5c2c');
        D.fillRR(g, X0 - 14, Y0 - 14, X1 - X0 + 28, Y1 - Y0 + 28, 10, '#0e4d25');
        g.fillStyle = felt; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        D.line(g, X0 + (X1 - X0) * 0.25, Y0, X0 + (X1 - X0) * 0.25, Y1, 'rgba(255,255,255,.12)', 1.5);
        D.circle(g, X0 + (X1 - X0) * 0.72, (Y0 + Y1) / 2, 3, 'rgba(255,255,255,.25)');
        for (const [px, py] of pockets) { D.circle(g, px, py, PR + 4, '#1c1917'); D.circle(g, px, py, PR, '#000'); }
        // balls
        for (const b of balls) {
          if (b.in) { if (b.sinkT > 0) { g.globalAlpha = b.sinkT; D.circle(g, b.px, b.py, R * b.sinkT, COL[b.n]); g.globalAlpha = 1; } continue; }
          D.shadow(g, b.x + 3, b.y + 4, R, R * 0.8, 0.45);
          if (b.n > 8) { D.orb(g, b.x, b.y, R, '#f8fafc', 0.2); g.save(); g.beginPath(); g.arc(b.x, b.y, R, 0, U.TAU); g.clip(); g.fillStyle = COL[b.n]; g.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1); g.restore(); const gr = g.createRadialGradient(b.x - 4, b.y - 5, 1, b.x, b.y, R); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, R, 0, U.TAU); g.fill(); }
          else D.orb(g, b.x, b.y, R, COL[b.n], 0.35);
          if (b.n) { D.circle(g, b.x, b.y, 5, '#fff'); D.text(g, b.n, b.x, b.y + 0.5, { size: 7, color: '#111', font: 'ui', weight: 800 }); }
        }
        // cue + guide
        if (state === 'aim' || state === 'ai') {
          const c = cue(), a = aim.a, pr = predict(a);
          if (state === 'aim') {
            g.setLineDash([5, 7]); D.line(g, c.x, c.y, pr.x, pr.y, 'rgba(255,255,255,.55)', 1.5); g.setLineDash([]);
            D.circle(g, pr.x, pr.y, R, null, 'rgba(255,255,255,.7)', 1.5);
            if (pr.hit) { const oa = U.ang(pr.x, pr.y, pr.hit.x, pr.hit.y); D.line(g, pr.hit.x, pr.hit.y, pr.hit.x + Math.cos(oa) * 80, pr.hit.y + Math.sin(oa) * 80, 'rgba(250,204,21,.8)', 2); const ta = oa + (U.angDiff(oa, a) > 0 ? Math.PI / 2 : -Math.PI / 2); D.line(g, pr.x, pr.y, pr.x + Math.cos(ta) * 50, pr.y + Math.sin(ta) * 50, 'rgba(255,255,255,.35)', 1.5); }
          }
          const back = 18 + aim.p * 80;
          g.save(); g.translate(c.x, c.y); g.rotate(a);
          const cg = g.createLinearGradient(-back - 380, 0, -back, 0); cg.addColorStop(0, '#3f1d0b'); cg.addColorStop(0.7, '#c08457'); cg.addColorStop(0.97, '#f5f5f4'); cg.addColorStop(1, '#60a5fa');
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-back - 380, 3, 380, 7);
          g.fillStyle = cg; g.beginPath(); g.moveTo(-back, -2.5); g.lineTo(-back - 380, -5.5); g.lineTo(-back - 380, 5.5); g.lineTo(-back, 2.5); g.fill();
          g.restore();
          if (ballInHand && state === 'aim') D.text(g, 'BALL IN HAND — drag the cue ball to place it', W / 2, Y1 + 70, { size: 14, font: 'ui', color: '#fde68a' });
        }
        // power bar
        D.fillRR(g, 30, Y0, 16, Y1 - Y0, 8, 'rgba(255,255,255,.08)');
        const ph = (Y1 - Y0) * aim.p; D.fillRR(g, 30, Y1 - ph, 16, ph, 8, U.mix('#4ade80', '#ef4444', aim.p));
        // header: groups & potted
        const drawGroup = (x, who, label) => {
          D.text(g, label, x, 36, { size: 15, align: x < W / 2 ? 'left' : 'right', color: turn === who ? '#facc15' : '#94a3b8' });
          const grp = group[who];
          const list = grp ? balls.filter((b) => typeOf(b.n) === grp) : [];
          list.forEach((b, i) => { const bx = x + (x < W / 2 ? 1 : -1) * (i * 26 + 12); if (b.in) g.globalAlpha = 0.25; D.orb(g, bx, 66, 10, b.n > 8 ? '#f8fafc' : COL[b.n]); if (b.n > 8) { D.circle(g, bx, 66, 5, COL[b.n]); } g.globalAlpha = 1; });
          if (!grp) D.text(g, 'open table', x, 66, { size: 12, align: x < W / 2 ? 'left' : 'right', font: 'ui', color: '#64748b' });
        };
        drawGroup(60, 'me', `YOU${group.me ? ' · ' + group.me : ''}`); drawGroup(W - 60, 'ai', `${group.ai ? group.ai + ' · ' : ''}AI`);
        if (msg) D.text(g, msg.t, W / 2, 50, { size: 22, color: msg.c, alpha: Math.min(1, msg.life * 2) });
        if (state === 'ai') D.text(g, 'AI is lining up a shot…', W / 2, Y1 + 70, { size: 14, font: 'ui', color: '#94a3b8' });
      },
    };
  },
});

MG.add({
  id: 'curling', name: 'Curling', cat: 'Sports', color: '#60a5fa', color2: '#ef4444',
  desc: 'Four ends of chess on ice. Set the line, weight and curl — then sweep like your score depends on it.',
  how: ['Aim with the mouse (or <kbd>↑</kbd> <kbd>↓</kbd>); pick curl with <kbd>Z</kbd>/<kbd>X</kbd> or the curl button', 'Drag back and release to throw — the drag length is the weight (or hold <kbd>Space</kbd>)', 'While it slides, hold <kbd>Space</kbd> / hold the mouse to SWEEP: it travels further and curls less', 'Closest stones to the button score · 4 ends vs the AI skip'],
  pad: 'UDA', padLabels: { A: 'THROW' },
  make(E) {
    const W = 960, H = 600, LEN = 2600, SW = 360, OY = 140, R = 14, HX = 2240, HY = SW / 2, HOUSE = 92, HACK = 110, HOG = 1780, BACK = 2420, FR = 118, FR_SWEEP = 78;
    let stones = [], end = 0, turn = 0, starter = 'me', score = [0, 0], cur = null, cam = HX - W * 0.55, aim = { y: HY, w: 0.62, spin: 1 }, drag = null, state = 'aim', stateT = 0, sweeping = false, charge = null, aiPlan = null, msg = null, T = 0, endPts = [];
    const whoseTurn = () => (turn % 2 === 0 ? starter : starter === 'me' ? 'ai' : 'me');
    const v0 = (w) => Math.sqrt(2 * FR * (HX - HACK)) * (0.78 + w * 0.36);
    function sim(list, dt, sweep) {
      for (const s of list) {
        if (!s.moving) continue;
        const sp = Math.hypot(s.vx, s.vy);
        if (sp < 3) { s.vx = s.vy = 0; s.moving = false; continue; }
        const fr = s === cur && sweep ? FR_SWEEP : FR, ns = Math.max(0, sp - fr * dt);
        s.vx *= ns / sp; s.vy *= ns / sp;
        // curl: the velocity vector rotates, faster as the stone slows (sweeping straightens it)
        const turn = ((s.spin * (s === cur && sweep ? 0.45 : 1) * 9) / Math.max(ns, 60)) * dt, c = Math.cos(turn), sn = Math.sin(turn);
        const vx = s.vx * c - s.vy * sn; s.vy = s.vx * sn + s.vy * c; s.vx = vx;
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt * 1.2;
        if (s.y < R || s.y > SW - R || s.x > BACK + R) { s.out = true; s.moving = false; }
      }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]; if (a.out || b.out) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * R && d > 0.01) {
          const nx = dx / d, ny = dy / d, ov = 2 * R - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const j2 = -rv * 0.93; a.vx -= nx * j2; a.vy -= ny * j2; b.vx += nx * j2; b.vy += ny * j2; a.moving = b.moving = true; if (list === stones) { E.sfx('thud', 1.6, Math.min(1, -rv / 300)); E.shake(Math.min(5, -rv / 80)); } }
        }
      }
    }
    function throwStone(team, y, w, spin) {
      const sp = v0(w), ang = Math.atan2(y - HY, HX - HACK);
      cur = { team, x: HACK, y: HY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 1, spin, moving: true, rot: 0, out: false };
      stones.push(cur); state = 'slide'; E.sfx('whoosh', 0.5, 0.6);
    }
    function after() {
      // hog rule
      if (cur && !cur.out && cur.x < HOG) { cur.out = true; msg = { t: 'HOGGED', c: '#f87171', life: 1.4 }; }
      stones = stones.filter((s) => !s.out);
      turn++; cur = null; aiPlan = null;
      if (turn >= 8) return scoreEnd();
      state = whoseTurn() === 'me' ? 'aim' : 'ai'; stateT = 1;
    }
    function scoreEnd() {
      const dist = (s) => U.dist(s.x, s.y, HX, HY);
      const inH = stones.filter((s) => dist(s) < HOUSE + R).sort((a, b) => dist(a) - dist(b));
      let pts = 0, team = null;
      if (inH.length) { team = inH[0].team; for (const s of inH) { if (s.team !== team) break; pts++; } }
      if (team) score[team === 'me' ? 0 : 1] += pts;
      endPts.push(team ? (team === 'me' ? pts : -pts) : 0);
      E.stat('Score', `${score[0]} – ${score[1]}`);
      if (team === 'me') { E.score += pts * 250; E.sfx('win'); }
      else if (team) E.sfx('lose');
      E.banner(team ? `${team === 'me' ? 'YOU' : 'AI'} SCORE ${pts}` : 'BLANK END', `End ${end + 1} · ${score[0]} – ${score[1]}`, { color: team === 'me' ? '#facc15' : '#ef4444' });
      state = 'endwait'; stateT = 2.6; starter = team === 'me' ? 'ai' : team === 'ai' ? 'me' : starter;
    }
    function aiPick() {
      const best = { v: -1e9 };
      const opp = stones.filter((s) => s.team === 'me'), dist = (s) => U.dist(s.x, s.y, HX, HY);
      for (let k = 0; k < 70; k++) {
        const target = opp.length && U.chance(0.45) ? U.pick(opp) : null;
        const y = target ? target.y + U.rand(-24, 24) : HY + U.rand(-60, 60), w = target ? U.rand(0.55, 1) : U.rand(0.35, 0.75), spin = U.pick([-1, 1]);
        const copy = stones.map((s) => ({ ...s, moving: false }));
        const sp = v0(w), ang = Math.atan2(y - HY, HX - HACK), me2 = { team: 'ai', x: HACK, y: HY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, spin, moving: true, rot: 0, out: false };
        copy.push(me2); const saveCur = cur; cur = me2;
        for (let i = 0; i < 900 && copy.some((s) => s.moving); i++) sim(copy, 1 / 60, false);
        cur = saveCur;
        const live = copy.filter((s) => !s.out && !(s === me2 && s.x < HOG));
        const inH = live.filter((s) => dist(s) < HOUSE + R).sort((a, b) => dist(a) - dist(b));
        let v = 0; let lead = null;
        for (const s of inH) { if (lead === null) lead = s.team; if (s.team !== lead) break; v += lead === 'ai' ? 1 : -1; }
        v *= 100; if (inH[0]) v += (inH[0].team === 'ai' ? 1 : -1) * (HOUSE - dist(inH[0]));
        v -= live.filter((s) => s.team === 'me' && dist(s) < HOUSE + R).length * 20;
        if (v > best.v) Object.assign(best, { v, y, w, spin });
      }
      best.y += U.rand(-6, 6); best.w += U.rand(-0.03, 0.03);
      return best;
    }
    E.stat('End', '1/4'); E.stat('Score', '0 – 0');
    const toS = (x, y) => [x - cam, OY + y];
    return {
      update(dt) {
        T += dt;
        if (msg) { msg.life -= dt; if (msg.life <= 0) msg = null; }
        if (state === 'endwait') {
          stateT -= dt;
          if (stateT <= 0) {
            end++; stones = []; turn = 0;
            if (end >= 4) { const win = score[0] > score[1]; state = 'done'; if (win) E.score += 1000; E.over({ win, title: win ? 'You Win!' : score[0] === score[1] ? 'Draw' : 'AI Wins', msg: `Ends: ${endPts.map((p) => (p > 0 ? '+' + p : p)).join(' · ')}  —  ${score[0]} – ${score[1]}` }); return; }
            E.stat('End', `${end + 1}/4`);
            state = whoseTurn() === 'me' ? 'aim' : 'ai'; stateT = 1;
          }
          return;
        }
        if (state === 'aim') {
          cam = U.damp(cam, HX - W * 0.62, 4, dt);
          const ay = E.axis().y; aim.y = U.clamp(aim.y + ay * 120 * dt, 30, SW - 30);
          if (E.hit('KeyZ')) aim.spin = -1; if (E.hit('KeyX')) aim.spin = 1;
          if (E.ptr.moved && !E.ptr.down) { const [, sy] = [0, E.ptr.y - OY]; if (E.ptr.y > OY && E.ptr.y < OY + SW) aim.y = U.clamp(sy, 30, SW - 30); }
          if (E.ptr.hit) {
            if (U.ptInRect(E.ptr.x, E.ptr.y, 20, H - 70, 150, 50)) { aim.spin = -aim.spin; E.sfx('click'); }
            else drag = { x: E.ptr.x, y: E.ptr.y };
          }
          if (drag && E.ptr.down) aim.w = U.clamp((drag.x - E.ptr.x) / 260 + 0.5, 0, 1);
          if (drag && E.ptr.up) { const d = Math.abs(drag.x - E.ptr.x); drag = null; if (d > 12) throwStone('me', aim.y, aim.w, aim.spin); }
          if (E.hit('A')) charge = { w: 0, dir: 1 };
          if (charge) { charge.w += charge.dir * dt * 0.7; if (charge.w > 1 || charge.w < 0) { charge.dir *= -1; charge.w = U.clamp(charge.w, 0, 1); } aim.w = charge.w; if (E.up('A')) { throwStone('me', aim.y, aim.w, aim.spin); charge = null; } }
        } else if (state === 'ai') {
          cam = U.damp(cam, HX - W * 0.62, 4, dt);
          stateT -= dt;
          if (!aiPlan && stateT < 0.6) aiPlan = aiPick();
          if (aiPlan && stateT <= 0) throwStone('ai', aiPlan.y, aiPlan.w, aiPlan.spin);
        } else if (state === 'slide') {
          sweeping = cur.team === 'me' ? E.down('A') || E.ptr.down : cur.x > 900 && cur.x < HX - 60 && Math.hypot(cur.vx, cur.vy) < 330 && aiPlan && aiPlan.w < 0.5;
          if (sweeping && Math.random() < 0.5) E.noise({ dur: 0.06, vol: 0.12, ft: 'bandpass', f: 2600, q: 1 });
          for (let s = 0; s < 3; s++) sim(stones, dt / 3, sweeping);
          cam = U.damp(cam, U.clamp(cur.x - W * 0.4, 0, HX - W * 0.62), 5, dt);
          if (!stones.some((s) => s.moving)) { state = 'settle'; stateT = 0.8; }
        } else if (state === 'settle') { stateT -= dt; if (stateT <= 0) after(); }
      },
      draw(g) {
        g.fillStyle = '#0b1120'; g.fillRect(0, 0, W, H);
        // sheet
        const [sx0, sy0] = toS(0, 0);
        const ice = g.createLinearGradient(0, sy0, 0, sy0 + SW); ice.addColorStop(0, '#dbeafe'); ice.addColorStop(0.5, '#f8fafc'); ice.addColorStop(1, '#dbeafe');
        g.fillStyle = ice; g.fillRect(sx0, sy0, LEN, SW);
        g.fillStyle = 'rgba(148,163,184,.18)'; for (let i = 0; i < 400; i++) { const x = (i * 131) % LEN, y = (i * 71) % SW; const [px, py] = toS(x, y); if (px > -5 && px < W + 5) g.fillRect(px, py, 2, 2); }
        g.strokeStyle = '#64748b'; g.lineWidth = 3; g.strokeRect(sx0, sy0, LEN, SW);
        // lines
        for (const [x, c, w] of [[HOG, '#ef4444', 5], [600, '#ef4444', 5], [HX, '#1e3a8a', 2], [BACK, '#1e3a8a', 2]]) { const [px] = toS(x, 0); D.line(g, px, sy0, px, sy0 + SW, c, w, 'butt'); }
        D.line(g, sx0, sy0 + HY, sx0 + LEN, sy0 + HY, 'rgba(30,58,138,.35)', 2, 'butt');
        // house
        const [hx, hy] = toS(HX, HY);
        D.circle(g, hx, hy, HOUSE, '#2563eb'); D.circle(g, hx, hy, HOUSE * 0.66, '#f8fafc'); D.circle(g, hx, hy, HOUSE * 0.33, '#dc2626'); D.circle(g, hx, hy, 8, '#f8fafc');
        const [kx] = toS(HACK, 0); D.fillRR(g, kx - 26, sy0 + HY - 10, 16, 20, 4, '#111827');
        // aim guide
        if (state === 'aim') {
          const [ax, ay] = toS(HX, aim.y), [fx, fy] = toS(HACK, HY);
          g.setLineDash([8, 10]); D.line(g, Math.max(fx, 0), U.lerp(fy, ay, (Math.max(fx, 0) - fx) / (ax - fx)), ax, ay, 'rgba(30,58,138,.5)', 2); g.setLineDash([]);
          D.circle(g, ax, ay, 12, null, '#1e3a8a', 2.5); D.circle(g, ax, ay, 3, '#1e3a8a');
          g.strokeStyle = '#facc15'; g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 22, aim.spin > 0 ? -0.5 : Math.PI - 0.5, aim.spin > 0 ? 1.2 : Math.PI + 1.2); g.stroke();
        }
        // stones
        for (const s of stones) {
          const [px, py] = toS(s.x, s.y); if (px < -30 || px > W + 30) continue;
          D.shadow(g, px + 3, py + 4, R + 2, R, 0.3);
          D.circle(g, px, py, R + 2, '#6b7280'); D.orb(g, px, py, R, s.team === 'me' ? '#facc15' : '#ef4444', 0.35);
          g.save(); g.translate(px, py); g.rotate(s.rot); D.fillRR(g, -3, -R + 3, 6, R, 3, '#1f2937'); g.restore();
          if (s === cur && sweeping) { for (const o of [-1, 1]) { const bx = px + 40 + Math.sin(T * 30 + o) * 10; D.line(g, bx - 10, py + o * 22, bx + 10, py + o * 18, '#334155', 8); } }
        }
        // HUD
        const weightName = (w) => (w < 0.3 ? 'guard' : w < 0.55 ? 'draw' : w < 0.75 ? 'hack' : w < 0.9 ? 'takeout' : 'peel');
        D.fillRR(g, 20, 20, 250, 70, 12, 'rgba(15,23,42,.75)');
        D.text(g, `END ${end + 1}/4 · stone ${Math.min(8, turn + 1)}/8`, 34, 38, { size: 13, font: 'mono', align: 'left', color: '#cbd5e1' });
        D.text(g, whoseTurn() === 'me' ? 'YOUR THROW' : 'AI THROWING', 34, 64, { size: 18, align: 'left', color: whoseTurn() === 'me' ? '#facc15' : '#ef4444' });
        D.fillRR(g, W - 190, 20, 170, 70, 12, 'rgba(15,23,42,.75)');
        D.text(g, `${score[0]}`, W - 150, 55, { size: 34, color: '#facc15' }); D.text(g, '–', W - 105, 55, { size: 26, color: '#fff' }); D.text(g, `${score[1]}`, W - 60, 55, { size: 34, color: '#ef4444' });
        const mine = (t) => 4 - stones.filter((s) => s.team === t).length - Math.floor((turn - stones.length) / 2);
        for (let i = 0; i < 8; i++) { const thrown = i < turn; D.circle(g, 300 + i * 22, 44, 8, thrown ? 'rgba(255,255,255,.15)' : (i % 2 === 0) === (starter === 'me') ? '#facc15' : '#ef4444'); }
        void mine;
        if (state === 'aim') {
          D.fillRR(g, 20, H - 70, 150, 50, 12, 'rgba(15,23,42,.75)'); D.text(g, `CURL ${aim.spin > 0 ? '↻ IN' : '↺ OUT'}`, 95, H - 45, { size: 15, color: '#facc15' });
          D.fillRR(g, W / 2 - 150, H - 60, 300, 16, 8, 'rgba(15,23,42,.6)'); D.fillRR(g, W / 2 - 150, H - 60, 300 * aim.w, 16, 8, U.mix('#60a5fa', '#ef4444', aim.w));
          D.text(g, `WEIGHT: ${weightName(aim.w).toUpperCase()}`, W / 2, H - 30, { size: 13, font: 'mono', color: '#e2e8f0' });
        }
        if (state === 'slide' && cur && cur.team === 'me') D.text(g, sweeping ? 'SWEEP! SWEEP!' : 'hold to sweep', W / 2, H - 36, { size: 20, color: sweeping ? '#facc15' : 'rgba(255,255,255,.6)' });
        if (msg) D.text(g, msg.t, W / 2, 110, { size: 30, color: msg.c, alpha: Math.min(1, msg.life * 2) });
      },
    };
  },
});

MG.add({
  id: 'topgp', name: 'Top-Down GP', cat: 'Sports', color: '#ef4444', color2: '#facc15',
  desc: 'Three-lap micro-machine racing against three AI drivers. Handbrake into drifts and leave rubber on the tarmac.',
  how: ['<kbd>↑</kbd> accelerate · <kbd>↓</kbd> brake / reverse · <kbd>←</kbd> <kbd>→</kbd> steer', 'Hold <kbd>Space</kbd> for the handbrake — drift through corners', 'Touch: hold anywhere — the car drives toward your finger', 'Grass is slow. Win for the big points.'],
  pad: 'LRUDA', padLabels: { A: 'DRIFT' },
  make(E) {
    const W = 960, H = 600, WW = 2600, WH = 1700, ROADW = 150, LAPS = 3;
    const CP = [[400, 300], [1300, 220], [2100, 300], [2350, 700], [2000, 950], [1450, 820], [1150, 1050], [1400, 1400], [2200, 1350], [2300, 1520], [900, 1560], [300, 1400], [220, 800]];
    // Catmull-Rom sample of closed track
    const path = [];
    for (let i = 0; i < CP.length; i++) {
      const p0 = CP[(i - 1 + CP.length) % CP.length], p1 = CP[i], p2 = CP[(i + 1) % CP.length], p3 = CP[(i + 2) % CP.length];
      for (let k = 0; k < 24; k++) { const t = k / 24, t2 = t * t, t3 = t2 * t; path.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    const N = path.length;
    const curv = path.map((p, i) => { const a = path[(i - 3 + N) % N], b = path[(i + 3) % N]; const a1 = U.ang(a[0], a[1], p[0], p[1]), a2 = U.ang(p[0], p[1], b[0], b[1]); return U.angDiff(a1, a2); });
    // pre-render world
    const world = document.createElement('canvas'); world.width = WW; world.height = WH;
    const wg = world.getContext('2d');
    wg.fillStyle = '#3f7d3a'; wg.fillRect(0, 0, WW, WH);
    for (let x = 0; x < WW; x += 60) { wg.fillStyle = (x / 60) % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)'; wg.fillRect(x, 0, 60, WH); }
    const r0 = U.seeded(8); for (let i = 0; i < 400; i++) { wg.fillStyle = 'rgba(20,60,20,.3)'; wg.beginPath(); wg.arc(r0() * WW, r0() * WH, r0() * 6 + 2, 0, U.TAU); wg.fill(); }
    const stroke = (w, c, dash) => { wg.beginPath(); path.forEach(([x, y], i) => (i ? wg.lineTo(x, y) : wg.moveTo(x, y))); wg.closePath(); wg.lineWidth = w; wg.strokeStyle = c; wg.lineJoin = 'round'; if (dash) wg.setLineDash(dash); wg.stroke(); wg.setLineDash([]); };
    stroke(ROADW + 34, '#d6d3d1'); stroke(ROADW + 20, '#dc2626', [26, 26]); stroke(ROADW, '#44444c'); stroke(ROADW - 8, '#4a4a53'); stroke(3, 'rgba(255,255,255,.6)', [30, 30]);
    // start line
    const s0 = path[0], s1 = path[1], sa = U.ang(s0[0], s0[1], s1[0], s1[1]);
    wg.save(); wg.translate(s0[0], s0[1]); wg.rotate(sa); for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) { wg.fillStyle = (i + j) % 2 ? '#111' : '#fff'; wg.fillRect(j * 10 - 10, -ROADW / 2 + i * (ROADW / 10), 10, ROADW / 10); } wg.restore();
    // trees & tyre stacks
    for (let i = 0; i < 90; i++) { const x = r0() * WW, y = r0() * WH; let near = false; for (let k = 0; k < N; k += 4) if (U.dist(x, y, path[k][0], path[k][1]) < ROADW + 60) { near = true; break; } if (near) continue; wg.fillStyle = 'rgba(0,0,0,.25)'; wg.beginPath(); wg.arc(x + 8, y + 8, 26, 0, U.TAU); wg.fill(); wg.fillStyle = '#166534'; wg.beginPath(); wg.arc(x, y, 26, 0, U.TAU); wg.fill(); wg.fillStyle = '#22c55e'; wg.beginPath(); wg.arc(x - 6, y - 6, 16, 0, U.TAU); wg.fill(); }
    const skid = world.getContext('2d');
    // cars
    const COLS = ['#3b82f6', '#ef4444', '#facc15', '#a855f7'];
    const cars = COLS.map((col, i) => {
      const p = path[(N - 4 - i * 5) % N], q = path[(N - 3 - i * 5) % N], a = U.ang(p[0], p[1], q[0], q[1]), side = i % 2 ? 1 : -1;
      return { col, x: p[0] + Math.cos(a + Math.PI / 2) * side * 34, y: p[1] + Math.sin(a + Math.PI / 2) * side * 34, a, vx: 0, vy: 0, steer: 0, ai: i > 0, prog: -1 - i * 0.01, idx: (N - 4 - i * 5) % N, lap: 0, done: false, finishT: 0, skill: [0, 0.94, 0.9, 0.86][i], line: U.rand(-30, 30), drift: 0 };
    });
    const me = cars[0];
    let state = 'count', countT = 3.4, raceT = 0, lapT = 0, bestLap = null, cam = { x: me.x, y: me.y }, finishOrder = [];
    function nearestIdx(c) { let bi = c.idx, bd = 1e9; for (let k = -12; k <= 30; k++) { const i = (c.idx + k + N) % N, d = U.dist2(c.x, c.y, path[i][0], path[i][1]); if (d < bd) { bd = d; bi = i; } } return [bi, Math.sqrt(bd)]; }
    function carPhys(c, thr, steer, hand, dt) {
      const [idx, off] = nearestIdx(c);
      if (idx < c.idx - N / 2) { c.lap++; if (c === me && state === 'race') lapDone(); }
      if (idx > c.idx + N / 2) c.lap--;
      c.idx = idx; c.prog = c.lap + idx / N;
      const onRoad = off < ROADW / 2 + 6;
      const fx = Math.cos(c.a), fy = Math.sin(c.a);
      const fwd = c.vx * fx + c.vy * fy, lat = -c.vx * fy + c.vy * fx;
      const maxF = onRoad ? 560 : 250;
      let accel = thr > 0 ? 520 * thr : thr < 0 ? (fwd > 20 ? -900 : -300) : -fwd * 0.6;
      if (fwd > maxF && thr > 0) accel = -(fwd - maxF) * 3;
      const newF = fwd + accel * dt;
      const grip = hand ? 1.6 : onRoad ? 9 : 5;
      const newL = lat * Math.exp(-grip * dt);
      c.vx = fx * newF - fy * newL; c.vy = fy * newF + fx * newL;
      const turn = steer * U.clamp(Math.abs(fwd) / 180, 0, 1) * (hand ? 3.6 : 2.6) * Math.sign(fwd || 1);
      c.a += turn * dt;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.x = U.clamp(c.x, 20, WW - 20); c.y = U.clamp(c.y, 20, WH - 20);
      c.drift = Math.abs(newL);
      if (c.drift > 90 && onRoad) {
        for (const s of [-1, 1]) { const bx = c.x - fx * 14 + -fy * s * 9, by = c.y - fy * 14 + fx * s * 9; skid.fillStyle = 'rgba(20,20,24,.35)'; skid.fillRect(bx - 2, by - 2, 4, 4); }
        if (c === me && Math.random() < 0.5) E.burst(W / 2 + (c.x - cam.x), H / 2 + (c.y - cam.y), { n: 1, color: 'rgba(214,211,209,.7)', speed: 40, life: 0.6, size: 6, glow: false });
      }
      if (!onRoad && Math.abs(fwd) > 120 && Math.random() < 0.4 && c === me) E.burst(W / 2 + (c.x - cam.x), H / 2 + (c.y - cam.y), { n: 1, color: '#65a30d', speed: 80, life: 0.4, size: 3, glow: false });
      return fwd;
    }
    function lapDone() {
      if (me.lap <= 1) { lapT = 0; return; } // crossing the line at the start begins lap 1
      const lt = lapT; lapT = 0;
      if (!bestLap || lt < bestLap) bestLap = lt;
      E.stat('Lap', `${Math.min(me.lap, LAPS)}/${LAPS}`);
      if (me.lap > LAPS) finish(me);
      else { E.banner(me.lap === LAPS ? 'FINAL LAP' : `LAP ${me.lap}`, U.fmtTime(lt, 2), { color: '#facc15' }); E.sfx('coin'); }
    }
    function finish(c) {
      if (c.done) return; c.done = true; finishOrder.push(c);
      if (c === me) {
        const place = finishOrder.length;
        const pts = [3000, 2000, 1200, 600][place - 1] + Math.max(0, Math.round(3000 - raceT * 20));
        E.score = pts; state = 'finished';
        E.sfx(place === 1 ? 'win' : 'lose');
        E.banner(['1ST!', '2ND', '3RD', '4TH'][place - 1], `Race time ${U.fmtTime(raceT, 2)}`, { color: place === 1 ? '#facc15' : '#fff' });
        E.after(2.2, () => E.over({ win: place === 1, title: place === 1 ? 'Victory!' : `Finished ${['1st', '2nd', '3rd', '4th'][place - 1]}`, msg: `Race ${U.fmtTime(raceT, 2)} · best lap ${bestLap ? U.fmtTime(bestLap, 2) : '—'}` }));
      }
    }
    E.stat('Lap', `1/${LAPS}`); E.stat('Pos', '—');
    return {
      manualFx: false,
      update(dt) {
        if (state === 'count') { const before = Math.ceil(countT); countT -= dt; if (Math.ceil(countT) !== before && countT > 0) E.sfx('blip', countT < 1 ? 1.6 : 1); if (countT <= 0) { state = 'race'; E.sfx('power'); } }
        const racing = state === 'race' || state === 'finished';
        if (racing) { raceT += dt; lapT += dt; }
        // player controls
        let thr = 0, steer = 0;
        if (racing && !me.done) {
          thr = E.down('U') ? 1 : E.down('D') ? -1 : 0; steer = E.axis().x;
          if (E.ptr.down) { const tx = cam.x + (E.ptr.x - W / 2), ty = cam.y + (E.ptr.y - H / 2), ta = U.ang(me.x, me.y, tx, ty), d = U.angDiff(me.a, ta); steer = U.clamp(d * 2, -1, 1); thr = 1; }
        }
        const fwd = carPhys(me, me.done ? 0 : thr, steer, racing && E.down('A'), dt);
        if (racing && Math.random() < 0.3) E.sfx('engine', 0.8 + Math.abs(fwd) / 350, 0.7);
        // AI
        for (const c of cars) {
          if (!c.ai) continue;
          if (!racing) { carPhys(c, 0, 0, false, dt); continue; }
          const look = 10 + Math.floor(Math.hypot(c.vx, c.vy) / 60);
          const ti = (c.idx + look) % N, tp = path[ti], np = path[(ti + 1) % N], na = U.ang(tp[0], tp[1], np[0], np[1]);
          const tx = tp[0] + Math.cos(na + Math.PI / 2) * c.line, ty = tp[1] + Math.sin(na + Math.PI / 2) * c.line;
          const ta = U.ang(c.x, c.y, tx, ty), d = U.angDiff(c.a, ta);
          let bend = 0; for (let k = 4; k < 30; k += 3) bend = Math.max(bend, Math.abs(curv[(c.idx + k) % N]));
          const want = (560 - bend * 900) * c.skill, sp = Math.hypot(c.vx, c.vy);
          // rubber-band a little so races stay close
          const gap = me.prog - c.prog, rb = U.clamp(1 + gap * 0.25, 0.9, 1.12);
          carPhys(c, c.done ? 0 : sp < want * rb ? 1 : -0.3, U.clamp(d * 2.2, -1, 1), false, dt);
          if (c.lap > LAPS && !c.done) finish(c);
        }
        // car-car collisions
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i], b = cars[j], d = U.dist(a.x, a.y, b.x, b.y);
          if (d < 30 && d > 0.1) { const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, push = (30 - d) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += nx * rv * 0.6; a.vy += ny * rv * 0.6; b.vx -= nx * rv * 0.6; b.vy -= ny * rv * 0.6; if ((a === me || b === me) && rv < -60) { E.sfx('thud', 1, 0.6); E.shake(4); } } }
        }
        const order = [...cars].sort((a, b) => (b.done && a.done ? finishOrder.indexOf(a) - finishOrder.indexOf(b) : b.done ? 1 : a.done ? -1 : b.prog - a.prog));
        const pos = order.indexOf(me) + 1; E.stat('Pos', `${pos}/4`);
        cam.x = U.damp(cam.x, me.x + me.vx * 0.3, 5, dt); cam.y = U.damp(cam.y, me.y + me.vy * 0.3, 5, dt);
        cam.x = U.clamp(cam.x, W / 2, WW - W / 2); cam.y = U.clamp(cam.y, H / 2, WH - H / 2);
      },
      draw(g) {
        g.drawImage(world, cam.x - W / 2, cam.y - H / 2, W, H, 0, 0, W, H);
        g.save(); g.translate(W / 2 - cam.x, H / 2 - cam.y);
        for (const c of cars) {
          g.save(); g.translate(c.x, c.y); g.rotate(c.a);
          D.fillRR(g, -15, -9, 34, 22, 6, 'rgba(0,0,0,.3)');
          g.fillStyle = '#111'; g.fillRect(-12, -12, 9, 5); g.fillRect(-12, 7, 9, 5); g.fillRect(8, -12, 9, 5); g.fillRect(8, 7, 9, 5);
          D.fillRR(g, -17, -9, 34, 18, 6, c.col);
          D.fillRR(g, -4, -7, 12, 14, 3, '#1e293b');
          g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-15, -2, 10, 4);
          D.circle(g, 16, -6, 2, '#fef9c3'); D.circle(g, 16, 6, 2, '#fef9c3');
          g.restore();
          if (c === me) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c.x, c.y, 26, 0, U.TAU); g.stroke(); }
        }
        g.restore();
        // minimap
        const mw = 180, mh = mw * (WH / WW), mx = W - mw - 16, my = 16;
        D.fillRR(g, mx - 6, my - 6, mw + 12, mh + 12, 10, 'rgba(0,0,0,.45)');
        g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(mx + (x / WW) * mw, my + (y / WH) * mh) : g.moveTo(mx + (x / WW) * mw, my + (y / WH) * mh))); g.closePath(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
        for (const c of cars) D.circle(g, mx + (c.x / WW) * mw, my + (c.y / WH) * mh, c === me ? 5 : 4, c.col, c === me ? '#fff' : null, 1.5);
        D.fillRR(g, 16, 16, 200, 58, 12, 'rgba(0,0,0,.45)');
        D.text(g, `LAP ${Math.min(LAPS, Math.max(1, me.lap))}/${LAPS}`, 30, 34, { size: 16, align: 'left', font: 'mono', color: '#facc15' });
        D.text(g, U.fmtTime(lapT, 2), 30, 58, { size: 20, align: 'left', font: 'mono' });
        if (bestLap) D.text(g, `best ${U.fmtTime(bestLap, 2)}`, 200, 58, { size: 12, align: 'right', font: 'mono', color: '#94a3b8' });
        if (state === 'count') { const n = Math.ceil(countT); D.text(g, n > 3 ? '' : n, W / 2, H / 2 - 40, { size: 120, color: '#fff', glow: '#ef4444' }); }
        if (state === 'race' && raceT < 0.8) D.text(g, 'GO!', W / 2, H / 2 - 40, { size: 110, color: '#4ade80', alpha: 1 - raceT / 0.8 });
        const sp = Math.hypot(me.vx, me.vy);
        D.fillRR(g, 16, H - 60, 150, 44, 12, 'rgba(0,0,0,.45)');
        D.text(g, Math.round(sp / 3), 90, H - 38, { size: 26, font: 'mono', align: 'right' }); D.text(g, 'km/h', 96, H - 34, { size: 12, font: 'mono', align: 'left', color: '#fca5a5' });
      },
    };
  },
});

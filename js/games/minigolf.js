MG.add({
  id: 'minigolf', name: 'Mini Golf', cat: 'Sports', color: '#4ade80', color2: '#f8fafc',
  desc: 'Nine handcrafted holes: bank shots, sand, water, bumpers, a spinning windmill and an island green.',
  how: ['Drag back from the ball and release to putt (like a slingshot)', 'Or <kbd>←</kbd> <kbd>→</kbd> aim · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>Space</kbd> putt', 'Sand is slow, water costs a stroke, bumpers kick', 'Lowest total over nine holes wins'],
  score: 'low', unit: 'strokes', scoreLabel: 'Strokes', pad: 'LRUDA', padLabels: { A: 'PUTT' },
  make(E) {
    const W = 960, H = 600, BR = 7, CUPR = 12;
    const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const oct = (cx, cy, r) => U.range(10).map((i) => [cx + Math.cos((i / 10) * U.TAU) * r, cy + Math.sin((i / 10) * U.TAU) * r]);
    const HOLES = [
      { par: 2, fair: [rect(130, 220, 700, 160)], tee: [190, 300], cup: [770, 300] },
      { par: 3, fair: [[[120, 120], [640, 120], [640, 500], [470, 500], [470, 290], [120, 290]]], tee: [180, 205], cup: [555, 440] },
      { par: 2, fair: [rect(100, 150, 760, 300)], blocks: [rect(430, 225, 100, 150)], bumpers: [[300, 200, 22], [650, 400, 22], [650, 200, 16]], tee: [160, 300], cup: [800, 300] },
      { par: 3, fair: [rect(100, 120, 760, 360)], sand: [rect(360, 220, 180, 170)], water: [rect(600, 120, 110, 220)], tee: [160, 420], cup: [800, 190] },
      { par: 3, fair: [rect(80, 230, 800, 140)], mill: { x: 480, y: 300, len: 68, sp: 1.6 }, tee: [140, 300], cup: [820, 300] },
      { par: 4, fair: [rect(100, 100, 760, 400)], blocks: [rect(292, 100, 16, 280), rect(512, 220, 16, 280), rect(712, 100, 16, 280)], tee: [190, 160], cup: [800, 160] },
      { par: 3, fair: [rect(100, 160, 760, 280)], slope: { poly: rect(330, 160, 300, 280), fx: 0, fy: 260 }, mover: { x: 690, y0: 170, y1: 350, w: 24, h: 90, sp: 1.3 }, tee: [150, 300], cup: [810, 300] },
      { par: 3, fair: [rect(100, 240, 200, 120), rect(300, 286, 320, 28), oct(720, 300, 115)], island: true, tee: [160, 300], cup: [740, 300] },
      { par: 3, fair: [rect(90, 90, 780, 420)], bumpers: [[330, 200, 20], [450, 300, 20], [570, 400, 20], [330, 400, 20], [570, 200, 20], [700, 300, 20], [450, 150, 14], [450, 450, 14]], tee: [160, 160], cup: [800, 440] },
    ];
    let hole = -1, ball, strokes = 0, total = 0, card = [], aim = { a: 0, p: 0.5 }, drag = null, state, stateT, last, millA = 0, moverY = 0, sinkT = 0, T = 0;
    let walls = [];
    function edgesOf(poly) { return poly.map((p, i) => [p, poly[(i + 1) % poly.length]]); }
    function loadHole() {
      hole++;
      const h = HOLES[hole];
      walls = [];
      if (!h.island) for (const f of h.fair) walls.push(...edgesOf(f));
      else walls.push(...edgesOf([[20, 20], [940, 20], [940, 580], [20, 580]]));
      for (const b of h.blocks || []) walls.push(...edgesOf(b));
      ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0, moving: false, sunk: false };
      last = { x: ball.x, y: ball.y };
      strokes = 0; aim.a = U.ang(ball.x, ball.y, h.cup[0], h.cup[1]); aim.p = 0.45;
      state = 'aim';
      E.stat('Hole', `${hole + 1}/9`); E.stat('Par', h.par); E.stat('Strokes', 0);
      E.banner(`HOLE ${hole + 1}`, `Par ${h.par}`, { color: '#4ade80' });
    }
    loadHole();
    const inPoly = (x, y, poly) => U.ptInPoly(x, y, poly);
    function shoot(a, p) {
      const sp = 60 + p * 880;
      ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.moving = true;
      strokes++; E.stat('Strokes', strokes);
      last = { x: ball.x, y: ball.y };
      state = 'roll';
      E.sfx('click', 0.7 + p * 0.3); E.burst(ball.x, ball.y, { n: 8, color: '#fff', speed: 100, angle: a + Math.PI, spread: 1, glow: false, size: 2 });
    }
    function collideSeg(a, b, bounce = 0.78) {
      const s = U.segDist(ball.x, ball.y, a[0], a[1], b[0], b[1]);
      if (s.d < BR && s.d > 0.0001) {
        const nx = (ball.x - s.x) / s.d, ny = (ball.y - s.y) / s.d, vn = ball.vx * nx + ball.vy * ny;
        ball.x = s.x + nx * BR; ball.y = s.y + ny * BR;
        if (vn < 0) { ball.vx -= (1 + bounce) * vn * nx; ball.vy -= (1 + bounce) * vn * ny; if (-vn > 60) { E.sfx('tick', 1 + Math.min(1, -vn / 600), Math.min(1, -vn / 500)); } return true; }
      }
      return false;
    }
    function millBlades() { const h = HOLES[hole]; if (!h.mill) return []; const m = h.mill; return U.range(4).map((k) => { const a = millA + (k * Math.PI) / 2; return [[m.x, m.y], [m.x + Math.cos(a) * m.len, m.y + Math.sin(a) * m.len]]; }); }
    function moverRect() { const m = HOLES[hole].mover; return m ? rect(m.x, moverY, m.w, m.h) : null; }
    function finishHole() {
      const h = HOLES[hole], diff = strokes - h.par;
      card.push(strokes); total += strokes; E.score = total;
      const name = strokes === 1 ? 'HOLE IN ONE!' : ({ '-3': 'ALBATROSS', '-2': 'EAGLE', '-1': 'BIRDIE', 0: 'PAR', 1: 'BOGEY', 2: 'DOUBLE BOGEY' })[diff] || `+${diff}`;
      E.banner(name, `${strokes} stroke${strokes === 1 ? '' : 's'}`, { color: diff < 0 ? '#facc15' : diff === 0 ? '#4ade80' : '#f87171' });
      E.sfx(diff <= 0 ? 'win' : 'coin');
      if (strokes === 1) { E.flash('#facc15', 0.3); for (let i = 0; i < 4; i++) E.after(i * 0.2, () => E.burst(h.cup[0], h.cup[1], { n: 40, colors: ['#facc15', '#4ade80', '#fff', '#f472b6'], speed: 320 })); }
      state = 'sunk'; stateT = 2.2;
    }
    return {
      update(dt) {
        T += dt; millA += (HOLES[hole].mill ? HOLES[hole].mill.sp : 0) * dt;
        const m = HOLES[hole].mover; if (m) moverY = U.lerp(m.y0, m.y1, (Math.sin(T * m.sp) + 1) / 2);
        const h = HOLES[hole];
        if (state === 'sunk') {
          sinkT += dt; stateT -= dt;
          if (stateT <= 0) {
            sinkT = 0;
            if (hole >= HOLES.length - 1) { const par = HOLES.reduce((s, q) => s + q.par, 0), d = total - par; state = 'done'; E.over({ win: true, title: d < 0 ? 'Under Par!' : d === 0 ? 'Level Par' : 'Round Complete', msg: `Card: ${card.join(' · ')}  —  ${total} (${d > 0 ? '+' : ''}${d === 0 ? 'E' : d})` }); }
            else loadHole();
          }
          return;
        }
        if (state === 'aim') {
          const ax = E.axis();
          aim.a += ax.x * 1.8 * dt; aim.p = U.clamp(aim.p - ax.y * 0.6 * dt, 0.05, 1);
          if (E.ptr.hit && U.dist(E.ptr.x, E.ptr.y, ball.x, ball.y) < 400) drag = { x: E.ptr.x, y: E.ptr.y };
          if (drag && E.ptr.down) { const dx = ball.x - E.ptr.x, dy = ball.y - E.ptr.y, d = Math.hypot(dx, dy); if (d > 6) { aim.a = Math.atan2(dy, dx); aim.p = U.clamp(d / 170, 0.05, 1); } }
          if (drag && E.ptr.up) { const d = Math.hypot(ball.x - E.ptr.x, ball.y - E.ptr.y); drag = null; if (d > 14) shoot(aim.a, aim.p); }
          if (E.hit('A')) shoot(aim.a, aim.p);
          return;
        }
        // rolling
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          const sdt = dt / steps;
          let fr = 0.85, dec = 55;
          if ((h.sand || []).some((p) => inPoly(ball.x, ball.y, p))) { fr = 5; dec = 180; }
          if (h.slope && inPoly(ball.x, ball.y, h.slope.poly)) { ball.vx += h.slope.fx * sdt; ball.vy += h.slope.fy * sdt; dec = 20; }
          const sp = Math.hypot(ball.vx, ball.vy);
          if (sp > 0) { const nsp = Math.max(0, sp * Math.exp(-fr * sdt) - dec * sdt); ball.vx *= nsp / sp; ball.vy *= nsp / sp; }
          ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
          for (const [a, b] of walls) collideSeg(a, b);
          for (const [a, b] of millBlades()) if (collideSeg(a, b, 0.9)) { const bx = ball.x - h.mill.x, by = ball.y - h.mill.y; ball.vx += -by * h.mill.sp * 1.2; ball.vy += bx * h.mill.sp * 1.2; }
          const mr = moverRect(); if (mr) for (const [a, b] of edgesOf(mr)) collideSeg(a, b, 0.9);
          for (const [bx, by, r] of h.bumpers || []) { const d = U.dist(ball.x, ball.y, bx, by); if (d < r + BR) { const nx = (ball.x - bx) / d, ny = (ball.y - by) / d, vn = ball.vx * nx + ball.vy * ny; ball.x = bx + nx * (r + BR); ball.y = by + ny * (r + BR); if (vn < 0) { ball.vx -= 2.3 * vn * nx; ball.vy -= 2.3 * vn * ny; E.sfx('bounce', 1.4); E.ring(bx, by, { color: '#f472b6', r: r + 16 }); } } }
          // cup
          const dc = U.dist(ball.x, ball.y, h.cup[0], h.cup[1]), spd = Math.hypot(ball.vx, ball.vy);
          if (dc < CUPR) {
            if (spd < 380) { ball.sunk = true; ball.x = h.cup[0]; ball.y = h.cup[1]; ball.vx = ball.vy = 0; E.sfx('ding'); E.burst(h.cup[0], h.cup[1], { n: 18, colors: ['#fff', '#4ade80'], speed: 150 }); finishHole(); return; }
            ball.vx += ((h.cup[0] - ball.x) / dc) * 900 * sdt; ball.vy += ((h.cup[1] - ball.y) / dc) * 900 * sdt;
          }
          // water / off the island
          const wet = (h.water || []).some((p) => inPoly(ball.x, ball.y, p)) || (h.island && !h.fair.some((p) => inPoly(ball.x, ball.y, p)));
          if (wet) {
            E.sfx('splash'); E.burst(ball.x, ball.y, { n: 24, colors: ['#bae6fd', '#fff'], speed: 160, grav: 400 }); E.ring(ball.x, ball.y, { color: '#e0f2fe', r: 30 });
            strokes++; E.stat('Strokes', strokes); E.pop(ball.x, ball.y - 20, '+1 WATER', { color: '#7dd3fc' });
            Object.assign(ball, { x: last.x, y: last.y, vx: 0, vy: 0 }); state = 'aim'; return;
          }
        }
        if (Math.hypot(ball.vx, ball.vy) < 4) { ball.vx = ball.vy = 0; state = 'aim'; aim.a = U.ang(ball.x, ball.y, h.cup[0], h.cup[1]); if (strokes >= 10) { E.pop(ball.x, ball.y - 30, 'Max strokes', { color: '#f87171' }); strokes = 10; finishHole(); } }
      },
      draw(g) {
        const h = HOLES[hole];
        D.bg(g, W, H, h.island ? '#0c4a6e' : '#14532d', h.island ? '#082f49' : '#052e16');
        if (h.island) { g.strokeStyle = 'rgba(186,230,253,.12)'; for (let y = 0; y < H; y += 24) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + T * 2 + y) * 3); g.stroke(); } }
        else { g.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 60; i++) g.fillRect((i * 173) % W, (i * 97) % H, 3, 3); }
        // fairway with mowing stripes
        for (const f of h.fair) {
          g.save(); g.beginPath(); f.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
          g.fillStyle = '#3fae4f'; g.fill(); g.clip();
          g.fillStyle = 'rgba(255,255,255,.06)'; for (let x = -H; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x + 30 + H, H); g.lineTo(x + H, H); g.fill(); }
          g.restore();
        }
        for (const s of h.sand || []) { D.poly(g, s, '#e9d5a1'); g.fillStyle = 'rgba(160,120,60,.2)'; for (let i = 0; i < 40; i++) { const [x0, y0] = s[0], [x2, y2] = s[2]; g.fillRect(x0 + ((i * 37) % (x2 - x0)), y0 + ((i * 53) % (y2 - y0)), 2, 2); } }
        for (const w of h.water || []) { D.poly(g, w, '#0ea5e9'); g.save(); g.beginPath(); w.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.3)'; for (let y = w[0][1]; y < w[2][1]; y += 14) { g.beginPath(); for (let x = w[0][0]; x <= w[1][0]; x += 10) g.lineTo(x, y + Math.sin(x * 0.1 + T * 3) * 2); g.stroke(); } g.restore(); }
        if (h.slope) { g.save(); g.globalAlpha = 0.35; D.poly(g, h.slope.poly, '#16a34a'); for (let y = h.slope.poly[0][1] + 20; y < h.slope.poly[2][1]; y += 50) for (let x = h.slope.poly[0][0] + 30; x < h.slope.poly[1][0]; x += 60) D.poly(g, [[x - 10, y - 8 + ((T * 30) % 20)], [x + 10, y - 8 + ((T * 30) % 20)], [x, y + 8 + ((T * 30) % 20)]], '#bbf7d0'); g.restore(); }
        // walls
        g.lineCap = 'round';
        for (const [a, b] of walls) { if (h.island) continue; D.line(g, a[0], a[1] + 3, b[0], b[1] + 3, 'rgba(0,0,0,.35)', 12); D.line(g, a[0], a[1], b[0], b[1], '#92400e', 12); D.line(g, a[0], a[1] - 2, b[0], b[1] - 2, '#d97706', 4); }
        for (const b of h.blocks || []) { D.poly(g, b, '#78350f'); }
        for (const [bx, by, r] of h.bumpers || []) { D.shadow(g, bx + 3, by + 4, r, r * 0.8, 0.3); D.orb(g, bx, by, r, '#ec4899'); D.circle(g, bx, by, r * 0.45, '#fbcfe8'); }
        const mr = moverRect(); if (mr) { D.poly(g, mr.map(([x, y]) => [x + 3, y + 4]), 'rgba(0,0,0,.3)'); D.poly(g, mr, '#64748b', '#cbd5e1', 2); }
        // cup & flag
        const [cx, cy] = h.cup;
        D.circle(g, cx, cy, CUPR + 3, '#2f8f3f'); D.circle(g, cx, cy, CUPR, '#0b0b0b');
        if (!ball.sunk) { D.line(g, cx, cy, cx, cy - 60, '#e5e7eb', 2.5); g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(cx, cy - 60); g.lineTo(cx + 28 + Math.sin(T * 5) * 3, cy - 52); g.lineTo(cx, cy - 44); g.fill(); }
        // windmill
        if (h.mill) { const m = h.mill; D.circle(g, m.x, m.y, 16, '#7c2d12'); for (const [a, b] of millBlades()) { D.line(g, a[0], a[1], b[0], b[1], '#fef3c7', 9); D.line(g, a[0], a[1], b[0], b[1], '#b45309', 4); } D.circle(g, m.x, m.y, 7, '#fde68a'); }
        // aim guide
        if (state === 'aim') {
          const len = 30 + aim.p * 150;
          g.setLineDash([4, 8]); D.line(g, ball.x, ball.y, ball.x + Math.cos(aim.a) * len, ball.y + Math.sin(aim.a) * len, 'rgba(255,255,255,.8)', 2.5); g.setLineDash([]);
          const col = U.mix('#4ade80', '#ef4444', aim.p);
          D.circle(g, ball.x + Math.cos(aim.a) * len, ball.y + Math.sin(aim.a) * len, 5, col);
          D.fillRR(g, ball.x - 30, ball.y + 16, 60, 6, 3, 'rgba(0,0,0,.4)'); D.fillRR(g, ball.x - 30, ball.y + 16, 60 * aim.p, 6, 3, col);
        }
        if (!ball.sunk || sinkT < 0.3) { D.shadow(g, ball.x + 2, ball.y + 3, BR, BR * 0.7, 0.35); D.orb(g, ball.x, ball.y, BR * (ball.sunk ? 1 - sinkT * 3 : 1), '#ffffff', 0.2); }
        // scorecard strip
        D.fillRR(g, 16, H - 40, 9 * 34 + 12, 28, 8, 'rgba(0,0,0,.45)');
        HOLES.forEach((q, i) => { const done = card[i] !== undefined, c = done ? (card[i] < q.par ? '#facc15' : card[i] === q.par ? '#4ade80' : '#f87171') : i === hole ? '#fff' : '#475569'; D.text(g, done ? card[i] : i === hole ? '●' : '·', 38 + i * 34, H - 26, { size: 14, font: 'mono', color: c }); });
        D.text(g, `TOTAL ${total}`, 16 + 9 * 34 + 26, H - 26, { size: 13, font: 'mono', align: 'left', color: '#e2e8f0' });
      },
    };
  },
});

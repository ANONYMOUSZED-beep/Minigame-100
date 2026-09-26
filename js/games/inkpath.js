MG.add({
  id: 'inkpath', name: 'Ink Path', cat: 'Physics', color: '#818cf8', color2: '#fbbf24',
  desc: 'Draw ramps, funnels and walls with limited ink, then drop the ball and watch physics do the rest.',
  how: ['Drag to draw ink lines (the ink bar is limited)', '<kbd>Space</kbd> or the ▶ button drops the ball · <kbd>R</kbd> resets the ball', '<kbd>Backspace</kbd> / right-click undoes your last stroke', 'Collect stars on the way into the cup — leftover ink is bonus'],
  make(E) {
    const W = 960, H = 600, BR = 12, G = 820;
    const LEVELS = [
      { ball: [140, 90], cup: [800, 520], ink: 900, stars: [[330, 300], [520, 400], [700, 470]], walls: [] },
      { ball: [120, 80], cup: [810, 520], ink: 1000, stars: [[300, 200], [480, 150], [700, 380]], walls: [[480, 240, 480, 600]] },
      { ball: [860, 80], cup: [150, 300], ink: 1100, stars: [[700, 260], [480, 360], [260, 300]], walls: [[60, 340, 260, 340]], spikes: [[300, 580, 900, 580]] },
      { ball: [480, 60], cup: [480, 540], ink: 900, stars: [[300, 250], [660, 330], [480, 460]], walls: [[380, 200, 580, 200], [200, 420, 420, 420], [540, 420, 760, 420]], spikes: [[60, 580, 360, 580], [600, 580, 900, 580]] },
      { ball: [100, 80], cup: [860, 160], ink: 1400, stars: [[300, 480], [600, 520], [780, 330]], walls: [[700, 220, 960, 220]], spikes: [[200, 590, 800, 590]], bouncers: [[640, 470, 26]] },
      { ball: [150, 70], cup: [820, 520], ink: 1100, stars: [[330, 330], [560, 250], [700, 430]], walls: [], spinner: { x: 480, y: 360, len: 150, sp: 1.2 } },
      { ball: [480, 60], cup: [120, 520], ink: 800, stars: [[640, 240], [320, 360], [200, 460]], walls: [[300, 150, 660, 150], [660, 150, 660, 300]], spikes: [[300, 590, 960, 590]] },
      { ball: [80, 70], cup: [880, 540], ink: 1300, stars: [[250, 400], [480, 180], [720, 420]], walls: [[380, 260, 380, 600], [580, 0, 580, 330]], bouncers: [[250, 540, 24]], spikes: [[600, 590, 800, 590]] },
    ];
    let lvl = -1, L, strokes = [], cur = null, ink, ball, state, stateT, stars, got, T = 0, total = 0, attempts = 0, spinA = 0;
    function load() {
      lvl++; L = LEVELS[lvl]; strokes = []; cur = null; ink = L.ink; attempts = 0;
      stars = L.stars.map(([x, y]) => ({ x, y, got: false }));
      resetBall();
      E.stat('Level', `${lvl + 1}/${LEVELS.length}`);
      E.banner(`LEVEL ${lvl + 1}`, 'Draw a path, then press play', { color: '#818cf8', life: 1.2 });
    }
    function resetBall() { ball = { x: L.ball[0], y: L.ball[1], vx: 0, vy: 0, rot: 0 }; state = 'draw'; got = 0; stars && stars.forEach((s) => (s.got = false)); }
    load();
    const inkUsed = () => strokes.reduce((s, st) => s + st.len, 0) + (cur ? cur.len : 0);
    function allSegs() {
      const out = [];
      for (const st of [...strokes, ...(cur ? [cur] : [])]) for (let i = 0; i < st.pts.length - 1; i++) out.push([...st.pts[i], ...st.pts[i + 1], 'ink']);
      for (const w of L.walls) out.push([...w, 'wall']);
      if (L.spinner) { const s = L.spinner; for (const k of [0, Math.PI]) { const a = spinA + k; out.push([s.x, s.y, s.x + Math.cos(a) * s.len, s.y + Math.sin(a) * s.len, 'spin']); } }
      return out;
    }
    function fail(why) { if (state !== 'run') return; state = 'fail'; stateT = 1; E.sfx('lose', 1.2, 0.6); E.pop(ball.x, ball.y - 30, why, { color: '#f87171', size: 18 }); E.burst(ball.x, ball.y, { n: 20, colors: ['#fbbf24', '#fff'], speed: 200 }); }
    return {
      update(dt) {
        T += dt; spinA += (L.spinner ? L.spinner.sp : 0) * dt;
        if (state === 'win') { stateT -= dt; if (stateT <= 0) { if (lvl >= LEVELS.length - 1) { state = 'done'; E.over({ win: true, title: 'Masterpiece!', msg: `${total} of ${LEVELS.length * 3} stars` }); } else load(); } return; }
        if (state === 'fail') { stateT -= dt; if (stateT <= 0) resetBall(); return; }
        // drawing (allowed while running too)
        const p = E.ptr;
        const playBtn = U.ptInRect(p.x, p.y, W - 170, H - 60, 70, 44), undoBtn = U.ptInRect(p.x, p.y, W - 90, H - 60, 70, 44);
        if (p.hit && playBtn) { if (state === 'draw') { state = 'run'; attempts++; E.sfx('select'); } else resetBall(); }
        else if (p.hit && undoBtn) { strokes.pop(); E.sfx('click'); }
        else if (p.hit && inkUsed() < L.ink) { cur = { pts: [[p.x, p.y]], len: 0 }; }
        if (p.down && cur) {
          const [lx, ly] = cur.pts[cur.pts.length - 1], d = U.dist(lx, ly, p.x, p.y);
          if (d > 7 && inkUsed() + d <= L.ink) { cur.pts.push([p.x, p.y]); cur.len += d; if (Math.random() < 0.3) E.sfx('tick', 2.4, 0.1); }
        }
        if (!p.down && cur) { if (cur.pts.length > 1) strokes.push(cur); cur = null; }
        if (p.rhit || E.hit('Backspace')) { strokes.pop(); E.sfx('click'); }
        if (E.hit('Space', 'Enter')) { if (state === 'draw') { state = 'run'; attempts++; E.sfx('select'); } }
        if (E.hit('KeyR')) resetBall();
        ink = L.ink - inkUsed();
        E.stat('Ink', Math.round((ink / L.ink) * 100) + '%');
        if (state !== 'run') return;
        const segs = allSegs(), sub = 6, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
          for (const [x1, y1, x2, y2, kind] of segs) {
            const q = U.segDist(ball.x, ball.y, x1, y1, x2, y2), rr = BR + (kind === 'ink' ? 3 : 4);
            if (q.d < rr && q.d > 1e-4) {
              const nx = (ball.x - q.x) / q.d, ny = (ball.y - q.y) / q.d, vn = ball.vx * nx + ball.vy * ny;
              ball.x = q.x + nx * rr; ball.y = q.y + ny * rr;
              if (vn < 0) { ball.vx -= 1.25 * vn * nx; ball.vy -= 1.25 * vn * ny; if (-vn > 120) E.sfx('tick', 1, Math.min(0.6, -vn / 700)); }
              if (kind === 'spin') { const sx = -L.spinner.sp * (q.y - L.spinner.y), sy = L.spinner.sp * (q.x - L.spinner.x); ball.vx += sx * 0.05; ball.vy += sy * 0.05; }
              const tx = -ny, ty = nx, vt = ball.vx * tx + ball.vy * ty; ball.vx -= tx * vt * 0.002; ball.vy -= ty * vt * 0.002;
            }
          }
          for (const [bx, by, r] of L.bouncers || []) { const d = U.dist(ball.x, ball.y, bx, by); if (d < r + BR) { const nx = (ball.x - bx) / d, ny = (ball.y - by) / d, vn = ball.vx * nx + ball.vy * ny; ball.x = bx + nx * (r + BR); ball.y = by + ny * (r + BR); if (vn < 0) { ball.vx -= 2.2 * vn * nx; ball.vy -= 2.2 * vn * ny; E.sfx('bounce', 1.3); E.ring(bx, by, { color: '#f472b6', r: r + 20 }); } } }
          for (const [x1, y1, x2, y2] of L.spikes || []) if (U.segDist(ball.x, ball.y, x1, y1, x2, y2).d < BR + 8) { fail('Spiked!'); return; }
          if (ball.y > H + 40 || ball.x < -40 || ball.x > W + 40) { fail('Lost the ball'); return; }
        }
        ball.rot += ball.vx * dt * 0.08;
        for (const st of stars) if (!st.got && U.dist(ball.x, ball.y, st.x, st.y) < 30) { st.got = true; got++; E.sfx('coin', 1 + got * 0.15); E.burst(st.x, st.y, { n: 16, colors: ['#fbbf24', '#fff'], speed: 160 }); }
        const [cx, cy] = L.cup;
        if (Math.abs(ball.x - cx) < 30 && ball.y > cy - 20 && ball.y < cy + 16) {
          state = 'win'; stateT = 2; total += got;
          const pts = 500 + got * 300 + Math.round((ink / L.ink) * 500) - (attempts - 1) * 50;
          E.score += Math.max(100, pts); E.sfx('win'); E.flash('#fbbf24', 0.2);
          E.pop(cx, cy - 60, `${'★'.repeat(got)}${'☆'.repeat(3 - got)}  +${Math.max(100, pts)}`, { color: '#fbbf24', size: 26, life: 1.8 });
          E.burst(cx, cy, { n: 40, colors: ['#818cf8', '#fbbf24', '#fff'], speed: 260 });
        }
        if (state === 'run' && Math.hypot(ball.vx, ball.vy) < 3 && (T % 1) < dt) { ball.stuck = (ball.stuck || 0) + 1; if (ball.stuck > 2) { ball.stuck = 0; fail('Stuck — adjust your path'); } }
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#fbf7ef'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(129,140,248,.12)'; g.lineWidth = 1; for (let y = 30; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.strokeStyle = 'rgba(244,114,182,.25)'; g.beginPath(); g.moveTo(60, 0); g.lineTo(60, H); g.stroke();
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [x1, y1, x2, y2] of L.walls) { D.line(g, x1, y1, x2, y2, '#334155', 10); D.line(g, x1, y1, x2, y2, '#64748b', 4); }
        for (const [x1, y1, x2, y2] of L.spikes || []) { const n = Math.max(1, Math.floor(U.dist(x1, y1, x2, y2) / 18)); for (let k = 0; k < n; k++) { const x = U.lerp(x1, x2, (k + 0.5) / n), y = U.lerp(y1, y2, (k + 0.5) / n); D.poly(g, [[x - 9, y + 6], [x, y - 14], [x + 9, y + 6]], '#ef4444'); } }
        for (const [bx, by, r] of L.bouncers || []) { D.orb(g, bx, by, r, '#f472b6'); D.circle(g, bx, by, r * 0.45, '#fdf2f8'); }
        if (L.spinner) { const s = L.spinner; for (const k of [0, Math.PI]) { const a = spinA + k; D.line(g, s.x, s.y, s.x + Math.cos(a) * s.len, s.y + Math.sin(a) * s.len, '#0f172a', 9); } D.circle(g, s.x, s.y, 10, '#fbbf24'); }
        // cup
        const [cx, cy] = L.cup;
        D.glow(g, cx, cy, 70, '#fbbf24', 0.3 + 0.15 * Math.sin(t * 4));
        D.poly(g, [[cx - 36, cy - 24], [cx + 36, cy - 24], [cx + 26, cy + 26], [cx - 26, cy + 26]], '#818cf8', '#4338ca', 3);
        D.line(g, cx - 40, cy - 24, cx + 40, cy - 24, '#4338ca', 5);
        // stars
        for (const st of stars) if (!st.got) D.star(g, st.x, st.y + Math.sin(t * 3 + st.x) * 3, 15, 7, 5, t, '#fbbf24', '#b45309');
        // ink strokes
        for (const st of [...strokes, ...(cur ? [cur] : [])]) {
          g.beginPath(); st.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.strokeStyle = 'rgba(30,27,75,.18)'; g.lineWidth = 10; g.stroke();
          g.strokeStyle = '#1e1b4b'; g.lineWidth = 5; g.stroke();
        }
        // ball
        const [bx0, by0] = L.ball;
        if (state === 'draw') { g.setLineDash([4, 6]); D.circle(g, bx0, by0, BR + 8, null, 'rgba(129,140,248,.6)', 2); g.setLineDash([]); }
        g.save(); g.translate(ball.x, ball.y); g.rotate(ball.rot);
        D.orb(g, 0, 0, BR, '#f59e0b', 0.4); D.line(g, -BR * 0.6, 0, BR * 0.6, 0, 'rgba(0,0,0,.25)', 2);
        g.restore();
        // ink bar & buttons
        D.fillRR(g, 20, H - 44, 260, 16, 8, 'rgba(30,27,75,.12)');
        D.fillRR(g, 20, H - 44, 260 * (ink / L.ink), 16, 8, ink / L.ink < 0.2 ? '#ef4444' : '#4338ca');
        D.text(g, 'INK', 30, H - 58, { size: 11, font: 'mono', align: 'left', color: '#4338ca' });
        D.fillRR(g, W - 170, H - 60, 70, 44, 12, state === 'draw' ? '#16a34a' : '#f59e0b'); D.text(g, state === 'draw' ? '▶' : '⟲', W - 135, H - 38, { size: 22, font: 'ui', color: '#fff' });
        D.fillRR(g, W - 90, H - 60, 70, 44, 12, '#64748b'); D.text(g, 'UNDO', W - 55, H - 38, { size: 13, color: '#fff' });
        D.text(g, `LEVEL ${lvl + 1}`, 80, 30, { size: 18, align: 'left', color: '#4338ca' });
      },
    };
  },
});

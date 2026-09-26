MG.add({
  id: 'orbital', name: 'Orbital Golf', cat: 'Physics', color: '#a78bfa', color2: '#22d3ee',
  desc: 'Golf across the solar system. Planets bend your shot — slingshot around moons to reach the hole.',
  how: ['Drag back from the ball and release to shoot (slingshot)', 'Or <kbd>←</kbd> <kbd>→</kbd> aim · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>Space</kbd> shoot', 'Every planet pulls — bigger planets pull harder', 'Land on the flagged planet near the hole · 9 holes, lowest strokes wins'],
  score: 'low', unit: 'strokes', scoreLabel: 'Strokes', pad: 'LRUDA', padLabels: { A: 'SHOOT' },
  make(E) {
    const W = 960, H = 600, BR = 6, GK = 26000;
    const HOLES = [
      { par: 2, planets: [[200, 380, 60], [720, 260, 70]], start: [0, -1.4], hole: [1, -2.4] },
      { par: 2, planets: [[160, 300, 55], [480, 200, 40, 1], [800, 360, 60]], start: [0, 0], hole: [2, Math.PI] },
      { par: 3, planets: [[140, 450, 60], [460, 300, 90], [830, 150, 45]], start: [0, -0.8], hole: [2, 2.4] },
      { par: 3, planets: [[130, 130, 50], [480, 320, 45, 1], [830, 480, 55], [500, 540, 30]], start: [0, 0.6], hole: [2, -2.2] },
      { par: 3, planets: [[480, 300, 110], [120, 520, 45], [860, 80, 45]], start: [1, -1.2], hole: [2, 2.0] },
      { par: 3, planets: [[140, 300, 55], [380, 150, 35], [380, 460, 35], [620, 300, 60, 1], [860, 300, 40]], start: [0, 0], hole: [4, Math.PI] },
      { par: 4, planets: [[120, 120, 45], [360, 420, 70], [620, 160, 55], [860, 470, 45]], start: [0, 0.6], hole: [3, -2.4], moon: { of: 1, r: 150, pr: 18, sp: 0.8 } },
      { par: 3, planets: [[480, 300, 70], [140, 110, 40], [820, 490, 40]], start: [1, 0.2], hole: [2, -2.6], moon: { of: 0, r: 160, pr: 22, sp: -0.6 } },
      { par: 4, planets: [[100, 500, 50], [300, 200, 45], [520, 420, 60, 1], [760, 160, 50], [880, 480, 35]], start: [0, -0.9], hole: [4, -1.9], moon: { of: 2, r: 130, pr: 16, sp: 1.1 } },
    ];
    let hole = -1, planets, ball, aim = { a: -0.5, p: 0.5 }, strokes = 0, total = 0, state, stateT, drag = null, moonA = 0, trail = [], card = [], T = 0, sink = 0;
    const stars = D.makeStars(200, W, H, 31);
    const PAL = ['#f97316', '#22d3ee', '#a78bfa', '#4ade80', '#f472b6', '#facc15', '#60a5fa'];
    function surfacePos(pi, ang, lift = 0) { const p = planets[pi]; return [p.x + Math.cos(ang) * (p.r + BR + lift), p.y + Math.sin(ang) * (p.r + BR + lift)]; }
    function load() {
      hole++; const Hh = HOLES[hole];
      planets = Hh.planets.map(([x, y, r, ring], i) => ({ x, y, r, ring, col: PAL[(i + hole) % PAL.length], m: r * r }));
      if (Hh.moon) planets.push({ moon: Hh.moon, x: 0, y: 0, r: Hh.moon.pr, col: '#cbd5e1', m: Hh.moon.pr * Hh.moon.pr * 1.4 });
      moonA = 0; placeMoon();
      const [sx, sy] = surfacePos(Hh.start[0], Hh.start[1]);
      ball = { x: sx, y: sy, vx: 0, vy: 0, on: Hh.start[0], ang: Hh.start[1] };
      strokes = 0; state = 'aim'; trail = []; sink = 0;
      aim.a = Hh.start[1]; aim.p = 0.5;
      E.stat('Hole', `${hole + 1}/9`); E.stat('Par', Hh.par); E.stat('Strokes', 0);
      E.banner(`HOLE ${hole + 1}`, `Par ${Hh.par}`, { color: '#a78bfa', life: 1.3 });
    }
    function placeMoon() { for (const p of planets) if (p.moon) { const c = planets[p.moon.of]; p.x = c.x + Math.cos(moonA) * p.moon.r; p.y = c.y + Math.sin(moonA) * p.moon.r; } }
    load();
    function holePos() { const Hh = HOLES[hole]; return surfacePos(Hh.hole[0], Hh.hole[1], -BR); }
    function shoot(a, p) {
      const sp = 60 + p * 420;
      ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.on = -1;
      strokes++; E.stat('Strokes', strokes); state = 'fly'; stateT = 0; trail = [];
      E.sfx('click', 0.8 + p * 0.3); E.sfx('whoosh', 1.4, 0.4);
    }
    function sim(x, y, vx, vy, steps, cb) {
      for (let i = 0; i < steps; i++) {
        let ax = 0, ay = 0;
        for (const p of planets) { const dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); if (d < p.r) return i; const f = (GK * p.m) / (d2 * 100) ; ax += (dx / d) * f; ay += (dy / d) * f; }
        vx += ax / 60; vy += ay / 60; x += vx / 60; y += vy / 60;
        if (cb) cb(x, y, i);
      }
      return steps;
    }
    return {
      update(dt) {
        T += dt;
        const Hh = HOLES[hole];
        if (Hh.moon) { moonA += Hh.moon.sp * dt; placeMoon(); }
        if (state === 'sunk') { sink += dt; stateT -= dt; if (stateT <= 0) { if (hole >= HOLES.length - 1) { const par = HOLES.reduce((s, q) => s + q.par, 0), d = total - par; state = 'done'; E.over({ win: true, title: d < 0 ? 'Under Par!' : d === 0 ? 'Level Par' : 'Round Complete', msg: `${card.join(' · ')}  —  ${total} (${d > 0 ? '+' : ''}${d === 0 ? 'E' : d})` }); } else load(); } return; }
        if (state === 'aim') {
          if (ball.on >= 0) { const p = planets[ball.on]; ball.x = p.x + Math.cos(ball.ang) * (p.r + BR); ball.y = p.y + Math.sin(ball.ang) * (p.r + BR); }
          const ax = E.axis(); aim.a += ax.x * 1.3 * dt; aim.p = U.clamp(aim.p - ax.y * 0.5 * dt, 0.03, 1);
          if (E.ptr.hit) drag = { x: E.ptr.x, y: E.ptr.y };
          if (drag && E.ptr.down) { const dx = drag.x - E.ptr.x, dy = drag.y - E.ptr.y, d = Math.hypot(dx, dy); if (d > 6) { aim.a = Math.atan2(dy, dx); aim.p = U.clamp(d / 200, 0.03, 1); } }
          if (drag && E.ptr.up) { const d = Math.hypot(drag.x - E.ptr.x, drag.y - E.ptr.y); drag = null; if (d > 12) shoot(aim.a, aim.p); }
          if (E.hit('A')) shoot(aim.a, aim.p);
          return;
        }
        // flight
        stateT += dt;
        const sub = 4, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          let ax = 0, ay = 0;
          for (const p of planets) { const dx = p.x - ball.x, dy = p.y - ball.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2); const f = (GK * p.m) / (d2 * 100); ax += (dx / d) * f; ay += (dy / d) * f; }
          ball.vx += ax * h; ball.vy += ay * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
          for (let pi = 0; pi < planets.length; pi++) {
            const p = planets[pi], d = U.dist(ball.x, ball.y, p.x, p.y);
            if (d < p.r + BR) {
              const nx = (ball.x - p.x) / d, ny = (ball.y - p.y) / d, vn = ball.vx * nx + ball.vy * ny;
              ball.x = p.x + nx * (p.r + BR); ball.y = p.y + ny * (p.r + BR);
              if (vn < -90) { ball.vx -= 1.45 * vn * nx; ball.vy -= 1.45 * vn * ny; ball.vx *= 0.8; ball.vy *= 0.8; E.sfx('thud', 1.5, Math.min(0.6, -vn / 400)); }
              else {
                // settle on the surface
                ball.on = pi; ball.ang = Math.atan2(ny, nx); ball.vx = ball.vy = 0; state = 'aim';
                const [hx, hy] = holePos();
                if (pi === HOLES[hole].hole[0] && U.dist(ball.x, ball.y, hx, hy) < 26) {
                  state = 'sunk'; stateT = 2; card.push(strokes); total += strokes; E.score = total;
                  const diff = strokes - HOLES[hole].par, nm = strokes === 1 ? 'HOLE IN ONE!' : ({ '-2': 'EAGLE', '-1': 'BIRDIE', 0: 'PAR', 1: 'BOGEY' })[diff] || `+${diff}`;
                  E.banner(nm, `${strokes} stroke${strokes === 1 ? '' : 's'}`, { color: diff < 0 ? '#facc15' : '#a78bfa' }); E.sfx(diff <= 0 ? 'win' : 'coin'); E.burst(hx, hy, { n: 40, colors: ['#facc15', '#a78bfa', '#fff'], speed: 220 });
                } else if (strokes >= 8) { state = 'sunk'; stateT = 1.4; card.push(9); total += 9; E.score = total; E.pop(ball.x, ball.y - 30, 'Max strokes', { color: '#f87171' }); }
                aim.a = ball.ang; return;
              }
            }
          }
        }
        trail.push([ball.x, ball.y]); if (trail.length > 160) trail.shift();
        if (ball.x < -300 || ball.x > W + 300 || ball.y < -300 || ball.y > H + 300 || stateT > 12) {
          strokes++; E.stat('Strokes', strokes); E.pop(W / 2, 80, 'LOST IN SPACE  +1', { color: '#f87171', size: 22 }); E.sfx('lose', 1.4, 0.5);
          const Hh2 = HOLES[hole]; ball.on = Hh2.start[0]; ball.ang = Hh2.start[1]; state = 'aim';
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#05030f', '#0f0a24');
        D.stars(g, stars, W, H, t);
        const neb = g.createRadialGradient(700, 150, 10, 700, 150, 400); neb.addColorStop(0, 'rgba(167,139,250,.12)'); neb.addColorStop(1, 'rgba(167,139,250,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H);
        // gravity wells
        for (const p of planets) { g.setLineDash([2, 8]); D.circle(g, p.x, p.y, p.r * 2.2, null, 'rgba(255,255,255,.06)', 1); g.setLineDash([]); }
        if (HOLES[hole].moon) { const m = planets.find((p) => p.moon), c = planets[m.moon.of]; D.circle(g, c.x, c.y, m.moon.r, null, 'rgba(255,255,255,.08)', 1); }
        // trail
        g.strokeStyle = 'rgba(34,211,238,.5)'; g.lineWidth = 2; g.beginPath(); trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        // planets
        for (const p of planets) {
          D.glow(g, p.x, p.y, p.r * 1.8, p.col, 0.25);
          if (p.ring) { g.save(); g.translate(p.x, p.y); g.rotate(-0.4); g.strokeStyle = U.rgba(p.col, 0.5); g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, p.r * 1.7, p.r * 0.45, 0, Math.PI, U.TAU); g.stroke(); g.restore(); }
          D.orb(g, p.x, p.y, p.r, p.col, 0.35);
          g.save(); g.beginPath(); g.arc(p.x, p.y, p.r, 0, U.TAU); g.clip(); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(p.x - p.r * 0.3 + k * p.r * 0.4, p.y - p.r * 0.2 + k * p.r * 0.25, p.r * 0.18, p.r * 0.12, 0, 0, U.TAU); g.fill(); } g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(p.x + p.r * 0.5, p.y + p.r * 0.4, p.r, 0, U.TAU); g.fill(); g.restore();
          if (p.ring) { g.save(); g.translate(p.x, p.y); g.rotate(-0.4); g.strokeStyle = U.rgba(p.col, 0.7); g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, p.r * 1.7, p.r * 0.45, 0, 0, Math.PI); g.stroke(); g.restore(); }
        }
        // hole & flag
        const Hh = HOLES[hole], hp = planets[Hh.hole[0]], ha = Hh.hole[1];
        const [hx, hy] = [hp.x + Math.cos(ha) * hp.r, hp.y + Math.sin(ha) * hp.r];
        D.circle(g, hx, hy, 8, '#020617');
        const fx = hp.x + Math.cos(ha) * (hp.r + 44), fy = hp.y + Math.sin(ha) * (hp.r + 44);
        D.line(g, hx, hy, fx, fy, '#e2e8f0', 2);
        g.save(); g.translate(fx, fy); g.rotate(ha + Math.PI / 2); g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(0, 0); g.lineTo(22, 6 + Math.sin(t * 5) * 2); g.lineTo(0, 12); g.fill(); g.restore();
        D.glow(g, hx, hy, 40, '#facc15', 0.3 + 0.2 * Math.sin(t * 4));
        // aim preview
        if (state === 'aim') {
          const sp = 60 + aim.p * 420; let n = 0;
          sim(ball.x, ball.y, Math.cos(aim.a) * sp, Math.sin(aim.a) * sp, 70, (x, y, i) => { if (i % 3 === 0) { g.globalAlpha = 1 - i / 70; D.circle(g, x, y, 2.2, '#fff'); g.globalAlpha = 1; } n = i; });
          void n;
          D.fillRR(g, ball.x - 30, ball.y + 16, 60, 6, 3, 'rgba(0,0,0,.5)'); D.fillRR(g, ball.x - 30, ball.y + 16, 60 * aim.p, 6, 3, U.mix('#4ade80', '#ef4444', aim.p));
        }
        if (!(state === 'sunk' && sink > 0.3)) { D.glow(g, ball.x, ball.y, 20, '#e0f2fe', 0.7); D.circle(g, ball.x, ball.y, BR, '#f8fafc'); }
        // scorecard
        D.fillRR(g, 16, H - 40, 9 * 30 + 12, 28, 8, 'rgba(0,0,0,.45)');
        HOLES.forEach((q, i) => D.text(g, card[i] !== undefined ? card[i] : i === hole ? '●' : '·', 36 + i * 30, H - 26, { size: 14, font: 'mono', color: card[i] !== undefined ? (card[i] <= q.par ? '#facc15' : '#f87171') : '#94a3b8' }));
        D.text(g, `TOTAL ${total}`, 16 + 9 * 30 + 24, H - 26, { size: 13, font: 'mono', align: 'left', color: '#e2e8f0' });
      },
    };
  },
});

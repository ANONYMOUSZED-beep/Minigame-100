MG.add({
  id: 'lander', name: 'Lunar Lander', cat: 'Arcade', color: '#e2e8f0', color2: '#fbbf24',
  desc: 'Feather the throttle, kill your drift and kiss the pad. Smaller pads pay bigger multipliers.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> rotate · <kbd>↑</kbd> / <kbd>Space</kbd> thrust', 'Touch down upright with low speed on a lit pad', 'The camera zooms in close to the surface', 'Crashes cost fuel — the mission ends when the tank is dry'],
  pad: 'LRA', padLabels: { A: 'BURN' },
  make(E) {
    const W = 960, H = 600, WW = 2400, G = 20, THRUST = 52;
    let terr, pads, lander, fuel = 1000, landings = 0, cam = { x: 0, y: 0, z: 1 }, state, stateT, debris = [], msg = null;
    const stars = D.makeStars(160, W, H, 17);
    function genTerrain() {
      const pts = [], n = 120;
      let y = 470;
      pads = [];
      const padAt = new Map();
      const cands = U.shuffle(U.range(n - 8).map((i) => i + 4)).slice(0, 5);
      cands.sort((a, b) => a - b);
      const mults = U.shuffle([2, 2, 3, 4, 5]);
      let last = -99;
      cands.forEach((c, i) => { if (c - last > 10) { padAt.set(c, mults[i]); last = c; } });
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * WW;
        if (padAt.has(i - 1) || padAt.has(i - 2) && padAt.get(i - 2) < 4) { pts.push([x, y]); continue; }
        y += U.rand(-55, 55) + (Math.sin(i * 0.3) * 12);
        y = U.clamp(y, 250, 570);
        pts.push([x, y]);
        if (padAt.has(i)) {
          const m = padAt.get(i), segs = m >= 4 ? 1 : 2;
          pads.push({ x1: x, x2: ((i + segs) / n) * WW, y, m });
        }
      }
      pts[n][1] = pts[0][1];
      terr = pts;
    }
    function groundY(x) {
      x = U.wrap(x, 0, WW);
      const seg = WW / (terr.length - 1), i = Math.min(terr.length - 2, Math.floor(x / seg)), k = (x - i * seg) / seg;
      return U.lerp(terr[i][1], terr[i + 1][1], k);
    }
    function reset() {
      genTerrain();
      lander = { x: U.rand(200, WW - 200), y: 70, vx: U.rand(-40, 40), vy: 5, a: 0, thr: 0 };
      state = 'fly'; stateT = 0;
      cam.x = lander.x; cam.y = H / 2; cam.z = 1;
    }
    reset();
    E.stat('Fuel', fuel);
    function legPts() {
      const c = Math.cos(lander.a), s = Math.sin(lander.a), tf = (x, y) => [lander.x + x * c - y * s, lander.y + x * s + y * c];
      return [tf(-11, 12), tf(11, 12)];
    }
    function crash() {
      state = 'crash'; stateT = 2.2;
      E.sfx('boom'); E.shake(20); E.flash('#fff', 0.5); E.freeze(0.08); E.vibrate(250);
      E.burst(lander.x, lander.y, { n: 70, colors: ['#fbbf24', '#f97316', '#fff', '#94a3b8'], speed: 260, grav: G * 4, life: 1.6 });
      for (let i = 0; i < 9; i++) debris.push({ x: lander.x, y: lander.y, vx: U.rand(-90, 90), vy: U.rand(-140, -20), a: U.rand(6), va: U.rand(-8, 8), len: U.rand(5, 12), life: 3 });
      fuel = Math.max(0, fuel - 200); E.stat('Fuel', Math.round(fuel));
      msg = { t: 'DESTROYED', s: '−200 fuel', c: '#f87171' };
    }
    return {
      manualFx: true,
      update(dt) {
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.vy += G * 2 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt; d.life -= dt;
          const gy = groundY(d.x); if (d.y > gy) { d.y = gy; d.vy *= -0.3; d.vx *= 0.6; d.va *= 0.5; }
          if (d.life <= 0) debris.splice(i, 1);
        }
        if (state !== 'fly') {
          stateT -= dt;
          if (stateT <= 0) { if (fuel <= 0) { state = 'done'; E.over({ msg: `${landings} landings · out of fuel` }); } else { reset(); msg = null; } }
          return;
        }
        const L = lander;
        const rot = E.axis().x;
        L.a = U.clamp(L.a + rot * 2.3 * dt, -Math.PI / 2, Math.PI / 2);
        const burning = (E.down('U') || E.down('A')) && fuel > 0;
        L.thr = U.damp(L.thr, burning ? 1 : 0, 14, dt);
        if (burning) {
          fuel = Math.max(0, fuel - 42 * dt);
          L.vx += Math.sin(L.a) * THRUST * dt; L.vy -= Math.cos(L.a) * THRUST * dt;
          const ex = L.x - Math.sin(L.a) * 14, ey = L.y + Math.cos(L.a) * 14;
          E.burst(ex, ey, { n: 2, colors: ['#fde68a', '#fb923c', '#fff'], speed: 120, angle: L.a + Math.PI / 2, spread: 0.5, life: 0.45, size: 2.5, vx: L.vx, vy: L.vy, drag: 1.5 });
          if (Math.random() < 0.35) E.noise({ dur: 0.12, vol: 0.12, f: 700, f2: 300 });
          const gy = groundY(L.x);
          if (gy - L.y < 90 && Math.random() < 0.7) E.burst(L.x + U.rand(-20, 20), gy - 2, { n: 1, color: '#a8a29e', speed: 110, angle: U.chance(0.5) ? -0.2 : Math.PI + 0.2, spread: 0.6, life: 0.9, size: 3, glow: false, grav: 30 });
        }
        if (Math.floor(fuel / 5) !== Math.floor((fuel + 42 * dt) / 5)) E.stat('Fuel', Math.round(fuel));
        L.vy += G * dt;
        L.x = U.wrap(L.x + L.vx * dt, 0, WW); L.y += L.vy * dt;
        if (L.y < -200) L.vy = Math.max(L.vy, 0);
        // contact
        const legs = legPts();
        const touch = legs.some(([x, y]) => y >= groundY(x)) || L.y + 6 >= groundY(L.x);
        if (touch) {
          const pad = pads.find((p) => legs.every(([x]) => { const xx = U.wrap(x, 0, WW); return xx >= p.x1 - 1 && xx <= p.x2 + 1; }));
          const sp = Math.hypot(L.vx, L.vy), upright = Math.abs(L.a) < 0.22;
          if (pad && upright && L.vy < 34 && Math.abs(L.vx) < 16) {
            const soft = L.vy < 16 && Math.abs(L.vx) < 7;
            const pts = pad.m * (soft ? 50 : 25) + (soft ? 50 : 0);
            E.score += pts; landings++; E.stat('Landings', landings);
            const bonus = soft ? 60 : 20; fuel += bonus; E.stat('Fuel', Math.round(fuel));
            L.y = pad.y - 12; L.vx = L.vy = 0; L.a = 0;
            state = 'landed'; stateT = 2.4;
            msg = { t: soft ? 'PERFECT LANDING' : 'HARD LANDING', s: `+${pts} pts · +${bonus} fuel`, c: soft ? '#4ade80' : '#fbbf24' };
            E.sfx(soft ? 'win' : 'coin'); E.burst(L.x, pad.y, { n: 30, color: '#a8a29e', speed: 120, angle: -Math.PI / 2, spread: 2.6, glow: false, life: 1 });
          } else { void sp; crash(); }
        }
        // camera
        const alt = groundY(L.x) - L.y;
        const tz = alt < 150 ? 2 : 1;
        cam.z = U.damp(cam.z, tz, 3, dt);
        let dx = L.x - cam.x; if (dx > WW / 2) dx -= WW; if (dx < -WW / 2) dx += WW;
        cam.x = U.wrap(cam.x + dx * Math.min(1, dt * 5), 0, WW);
        const ty = cam.z > 1.05 ? L.y + 40 : H / 2;
        cam.y = U.damp(cam.y, ty, 5, dt);
      },
      draw(g) {
        const t = E.t, L = lander;
        g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
        D.stars(g, stars, W, H, t, -cam.x * 0.05, 0);
        // earth
        D.glow(g, 780, 110, 110, '#60a5fa', 0.3);
        D.orb(g, 780, 110, 42, '#3b82f6', 0.35);
        g.fillStyle = 'rgba(74,222,128,.7)'; g.beginPath(); g.ellipse(768, 100, 16, 10, 0.6, 0, U.TAU); g.ellipse(795, 124, 10, 7, -0.3, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(780, 110, 42, -1.2, 1.9); g.fill();
        g.save();
        g.translate(W / 2, H / 2); g.scale(cam.z, cam.z);
        const ox = -cam.x, oy = -cam.y;
        g.translate(0, oy);
        const drawAt = (offset) => {
          g.save(); g.translate(ox + offset, 0);
          // terrain
          const gr = g.createLinearGradient(0, 250, 0, 700); gr.addColorStop(0, '#475569'); gr.addColorStop(1, '#0f172a');
          g.beginPath(); g.moveTo(terr[0][0], 900);
          terr.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(WW, 900); g.closePath();
          g.fillStyle = gr; g.fill();
          g.beginPath(); terr.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.strokeStyle = 'rgba(226,232,240,.85)'; g.lineWidth = 1.6 / cam.z + 0.6; g.lineJoin = 'round'; g.stroke();
          for (const p of pads) {
            const blink = 0.6 + 0.4 * Math.sin(t * 5 + p.x1);
            D.glow(g, (p.x1 + p.x2) / 2, p.y, (p.x2 - p.x1) * 0.8, '#fbbf24', 0.3 * blink);
            D.line(g, p.x1, p.y, p.x2, p.y, '#fbbf24', 3, 'butt');
            D.circle(g, p.x1 + 2, p.y - 4, 2, blink > 0.8 ? '#f87171' : '#7f1d1d'); D.circle(g, p.x2 - 2, p.y - 4, 2, blink > 0.8 ? '#f87171' : '#7f1d1d');
            D.text(g, `×${p.m}`, (p.x1 + p.x2) / 2, p.y + 14, { size: 13, color: '#fde68a', font: 'mono' });
          }
          g.restore();
        };
        drawAt(0); drawAt(WW); drawAt(-WW);
        g.translate(ox, 0);
        let lx = L.x; let dx = lx - cam.x; if (dx > WW / 2) lx -= WW; if (dx < -WW / 2) lx += WW;
        for (const d of debris) {
          let x = d.x; const ddx = x - cam.x; if (ddx > WW / 2) x -= WW; if (ddx < -WW / 2) x += WW;
          g.globalAlpha = Math.min(1, d.life); D.line(g, x - Math.cos(d.a) * d.len / 2, d.y - Math.sin(d.a) * d.len / 2, x + Math.cos(d.a) * d.len / 2, d.y + Math.sin(d.a) * d.len / 2, '#cbd5e1', 1.5); g.globalAlpha = 1;
        }
        g.save(); g.translate(lx - L.x, 0); E.fx.draw(g); g.restore();
        if (state !== 'crash') {
          g.save(); g.translate(lx, L.y); g.rotate(L.a);
          if (L.thr > 0.05) {
            const fl = (12 + Math.random() * 10) * L.thr;
            D.glow(g, 0, 18 + fl * 0.5, 22 * L.thr + 6, '#fb923c', 0.9);
            D.poly(g, [[-5, 12], [0, 14 + fl], [5, 12]], '#fde68a');
          }
          g.strokeStyle = '#e2e8f0'; g.lineWidth = 1.5; g.lineJoin = 'round';
          g.fillStyle = '#1e293b';
          g.beginPath(); g.arc(0, -4, 8, 0, U.TAU); g.fill(); g.stroke();
          D.circle(g, 0, -5, 3.5, '#38bdf8');
          g.beginPath(); g.rect(-9, 3, 18, 7); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(-8, 10); g.lineTo(-12, 16); g.moveTo(8, 10); g.lineTo(12, 16); g.moveTo(-15, 16); g.lineTo(-9, 16); g.moveTo(9, 16); g.lineTo(15, 16); g.moveTo(-3, 10); g.lineTo(-4, 13); g.lineTo(4, 13); g.lineTo(3, 10); g.stroke();
          g.restore();
        }
        g.restore();
        // instruments
        const alt = Math.max(0, groundY(L.x) - L.y - 12);
        const panel = (x, label, val, warn) => {
          D.text(g, label, x, 22, { size: 11, font: 'mono', color: 'rgba(226,232,240,.55)', align: 'left' });
          D.text(g, val, x, 42, { size: 18, font: 'mono', color: warn ? '#f87171' : '#e2e8f0', align: 'left' });
        };
        panel(20, 'ALTITUDE', Math.round(alt) + ' m');
        panel(140, 'H-SPEED', (L.vx >= 0 ? '→ ' : '← ') + Math.abs(L.vx).toFixed(0), Math.abs(L.vx) > 16);
        panel(260, 'V-SPEED', (L.vy >= 0 ? '↓ ' : '↑ ') + Math.abs(L.vy).toFixed(0), L.vy > 34);
        panel(380, 'ANGLE', Math.round((L.a * 180) / Math.PI) + '°', Math.abs(L.a) > 0.22);
        D.fillRR(g, 20, 56, 200, 6, 3, 'rgba(255,255,255,.1)');
        D.fillRR(g, 20, 56, 200 * Math.min(1, fuel / 1000), 6, 3, fuel < 200 ? '#f87171' : '#fbbf24');
        if (msg) { D.text(g, msg.t, W / 2, 200, { size: 40, color: msg.c, glow: msg.c }); D.text(g, msg.s, W / 2, 240, { size: 18, font: 'ui', color: '#e2e8f0' }); }
        if (fuel < 150 && fuel > 0 && state === 'fly' && Math.sin(t * 10) > 0) D.text(g, 'LOW FUEL', W / 2, 90, { size: 18, color: '#f87171', font: 'mono' });
        D.vignette(g, W, H, 0.45);
      },
    };
  },
});

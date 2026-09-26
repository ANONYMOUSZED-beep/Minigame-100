MG.add({
  id: 'shepherd', name: 'Shepherd', cat: 'Strategy', color: '#a3e635', color2: '#f5f5f4',
  desc: 'You are the sheepdog. The flock thinks for itself — flee, bunch up, scatter — so steer it gently through the gate.',
  how: ['Move the dog with the mouse / finger (or <kbd>WASD</kbd> / arrows)', 'Sheep run from the dog and stick together as a flock', '<kbd>Space</kbd> or right-click barks — a big scare, with a cooldown', 'Get every sheep inside the pen at the same time · faster pens score more'],
  pad: 'LRUDA', padLabels: { A: 'BARK' },
  make(E) {
    const W = 960, H = 600;
    const LEVELS = [
      { n: 6, pen: [700, 200, 200, 200], gate: 'L', gw: 110, trees: [], pond: null },
      { n: 10, pen: [80, 60, 220, 180], gate: 'B', gw: 100, trees: [[520, 300, 36]], pond: null },
      { n: 14, pen: [640, 380, 240, 170], gate: 'T', gw: 90, trees: [[420, 200, 40], [300, 420, 34]], pond: null },
      { n: 18, pen: [370, 30, 220, 160], gate: 'B', gw: 84, trees: [[160, 460, 38], [800, 460, 38]], pond: [480, 400, 90, 55] },
      { n: 24, pen: [720, 60, 200, 200], gate: 'L', gw: 72, trees: [[420, 120, 36], [420, 480, 36], [600, 300, 30]], pond: [230, 300, 70, 110] },
    ];
    let lv = -1, L, sheep, segs, dog = { x: 120, y: 520, vx: 0, vy: 0, a: 0 }, bark = 0, barkCd = 0, time = 0, st = 'play', stT = 0, T = 0, baaT = 2, grass;
    function load() {
      lv++; L = LEVELS[lv]; const [px, py, pw, ph] = L.pen;
      // pen walls with a gate gap on one side
      segs = [];
      const side = (x1, y1, x2, y2, gap) => { if (!gap) { segs.push([x1, y1, x2, y2]); return; } const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len; segs.push([x1, y1, mx - ux * L.gw / 2, my - uy * L.gw / 2], [mx + ux * L.gw / 2, my + uy * L.gw / 2, x2, y2]); };
      side(px, py, px + pw, py, L.gate === 'T'); side(px + pw, py, px + pw, py + ph, L.gate === 'R'); side(px, py + ph, px + pw, py + ph, L.gate === 'B'); side(px, py, px, py + ph, L.gate === 'L');
      sheep = [];
      const inPen = (x, y) => x > px - 60 && x < px + pw + 60 && y > py - 60 && y < py + ph + 60;
      const cx = px < W / 2 ? U.rand(600, 800) : U.rand(160, 360), cy = U.rand(200, 400);
      while (sheep.length < L.n) {
        const x = cx + U.rand(-120, 120), y = cy + U.rand(-100, 100);
        if (x < 30 || x > W - 30 || y < 30 || y > H - 30 || inPen(x, y) || blocked(x, y, 20)) continue;
        sheep.push({ x, y, vx: 0, vy: 0, a: U.rand(U.TAU), graze: U.rand(3), black: lv >= 3 && Math.random() < 0.2, step: U.rand(6), penned: false });
      }
      dog.x = px < W / 2 ? W - 80 : 80; dog.y = H - 80;
      time = 0; st = 'play';
      E.stat('Pen', `${lv + 1}/${LEVELS.length}`);
      E.banner(`FIELD ${lv + 1}`, `${L.n} sheep`, { color: '#a3e635', life: 1.2 });
    }
    function blocked(x, y, r) {
      for (const [tx, ty, tr] of L.trees) if (U.dist(x, y, tx, ty) < tr + r) return true;
      if (L.pond) { const [ox, oy, rx, ry] = L.pond; if (((x - ox) / (rx + r)) ** 2 + ((y - oy) / (ry + r)) ** 2 < 1) return true; }
      return false;
    }
    load();
    grass = U.range(260).map(() => ({ x: U.rand(W), y: U.rand(H), h: U.rand(4, 9), c: Math.random() < 0.04 ? U.pick(['#fde047', '#f9fafb', '#f472b6']) : null }));
    function collide(o, r) {
      for (const [x1, y1, x2, y2] of segs) { const q = U.segDist(o.x, o.y, x1, y1, x2, y2); if (q.d < r && q.d > 1e-4) { const nx = (o.x - q.x) / q.d, ny = (o.y - q.y) / q.d; o.x = q.x + nx * r; o.y = q.y + ny * r; const vn = o.vx * nx + o.vy * ny; if (vn < 0) { o.vx -= vn * nx; o.vy -= vn * ny; } } }
      for (const [tx, ty, tr] of L.trees) { const d = U.dist(o.x, o.y, tx, ty); if (d < tr + r) { const nx = (o.x - tx) / d, ny = (o.y - ty) / d; o.x = tx + nx * (tr + r); o.y = ty + ny * (tr + r); } }
      if (L.pond) { const [ox, oy, rx, ry] = L.pond; const k = ((o.x - ox) / (rx + r)) ** 2 + ((o.y - oy) / (ry + r)) ** 2; if (k < 1) { const a = Math.atan2((o.y - oy) / (ry + r), (o.x - ox) / (rx + r)); o.x = ox + Math.cos(a) * (rx + r); o.y = oy + Math.sin(a) * (ry + r); } }
      o.x = U.clamp(o.x, r, W - r); o.y = U.clamp(o.y, r, H - r);
    }
    return {
      update(dt) {
        T += dt; bark = Math.max(0, bark - dt * 2); barkCd = Math.max(0, barkCd - dt);
        if (st === 'won') { stT -= dt; if (stT <= 0) { if (lv >= LEVELS.length - 1) { st = 'done'; E.over({ win: true, title: 'Champion Sheepdog', msg: `All ${LEVELS.length} flocks penned` }); } else load(); } }
        if (st === 'play') time += dt;
        // dog
        const ax = E.axis();
        let tx = dog.x, ty = dog.y;
        if (ax.x || ax.y) { tx = dog.x + ax.x * 60; ty = dog.y + ax.y * 60; } else if (E.ptr.type) { tx = E.ptr.x; ty = E.ptr.y; }
        const dx = tx - dog.x, dy = ty - dog.y, dd = Math.hypot(dx, dy), sp = Math.min(330, dd * 5);
        const wantVx = dd > 1 ? (dx / dd) * sp : 0, wantVy = dd > 1 ? (dy / dd) * sp : 0;
        dog.vx = U.damp(dog.vx, wantVx, 10, dt); dog.vy = U.damp(dog.vy, wantVy, 10, dt);
        dog.x += dog.vx * dt; dog.y += dog.vy * dt; collide(dog, 14);
        if (Math.hypot(dog.vx, dog.vy) > 20) dog.a = Math.atan2(dog.vy, dog.vx);
        if ((E.hit('A') || E.ptr.rhit) && !barkCd) { bark = 1; barkCd = 1.8; E.tone({ f: 330, f2: 180, dur: 0.12, type: 'sawtooth', vol: 0.25, lp: 1400 }); E.after(0.14, () => E.tone({ f: 360, f2: 200, dur: 0.1, type: 'sawtooth', vol: 0.2, lp: 1400 })); E.ring(dog.x, dog.y, { r: 220, color: 'rgba(255,255,255,.6)', life: 0.5 }); }
        // flock
        const [px, py, pw, ph] = L.pen;
        let penned = 0;
        for (const s of sheep) {
          let fx = 0, fy = 0, cxs = 0, cys = 0, avx = 0, avy = 0, n = 0;
          for (const o of sheep) {
            if (o === s) continue;
            const ddx = s.x - o.x, ddy = s.y - o.y, d = Math.hypot(ddx, ddy);
            if (d < 26 && d > 0) { fx += (ddx / d) * (26 - d) * 14; fy += (ddy / d) * (26 - d) * 14; }
            if (d < 110) { cxs += o.x; cys += o.y; avx += o.vx; avy += o.vy; n++; }
          }
          const ddog = U.dist(s.x, s.y, dog.x, dog.y), fear = (bark ? 240 : 140) * (s.black ? 1.25 : 1);
          let scared = 0;
          if (ddog < fear) { scared = 1 - ddog / fear; fx += ((s.x - dog.x) / ddog) * scared * 900; fy += ((s.y - dog.y) / ddog) * scared * 900; }
          if (n) { fx += (cxs / n - s.x) * (0.6 + scared * 2.2); fy += (cys / n - s.y) * (0.6 + scared * 2.2); fx += (avx / n - s.vx) * 0.8 * scared; fy += (avy / n - s.vy) * 0.8 * scared; }
          // grazing wander
          s.graze -= dt; if (s.graze <= 0) { s.graze = U.rand(1.5, 4); s.a = U.rand(U.TAU); }
          if (!scared) { fx += Math.cos(s.a) * 25; fy += Math.sin(s.a) * 25; }
          // soft world edges
          fx += (s.x < 40 ? 400 : 0) - (s.x > W - 40 ? 400 : 0); fy += (s.y < 40 ? 400 : 0) - (s.y > H - 40 ? 400 : 0);
          s.vx += fx * dt; s.vy += fy * dt;
          const maxs = scared ? (s.black ? 210 : 165) : 32, v = Math.hypot(s.vx, s.vy);
          if (v > maxs) { s.vx *= maxs / v; s.vy *= maxs / v; }
          s.vx *= Math.exp(-dt * (scared ? 0.6 : 2.5)); s.vy *= Math.exp(-dt * (scared ? 0.6 : 2.5));
          s.x += s.vx * dt; s.y += s.vy * dt; collide(s, 13);
          s.step += Math.hypot(s.vx, s.vy) * dt * 0.15;
          const inside = s.x > px + 8 && s.x < px + pw - 8 && s.y > py + 8 && s.y < py + ph - 8;
          if (inside && !s.penned) { E.tone({ f: 520, f2: 470, dur: 0.25, type: 'triangle', vol: 0.12 }); }
          s.penned = inside; if (inside) penned++;
        }
        baaT -= dt; if (baaT <= 0) { baaT = U.rand(2, 5); E.tone({ f: U.rand(380, 460), f2: U.rand(330, 380), dur: 0.45, type: 'sawtooth', vol: 0.05, lp: 1200 }); }
        E.stat('Penned', `${penned}/${sheep.length}`); E.stat('Time', U.fmtTime(time, 0));
        if (st === 'play' && penned === sheep.length) {
          st = 'won'; stT = 2.4;
          const pts = Math.max(150, Math.round((L.n * 25 + 60) * 10 - time * 12)); E.score += pts;
          E.sfx('win'); E.banner('ALL PENNED!', `${U.fmtTime(time, 1)}s · +${pts}`, { color: '#a3e635', life: 2.2 });
          E.burst(px + pw / 2, py + ph / 2, { n: 50, colors: ['#a3e635', '#fff', '#fde047'], speed: 300 });
        }
      },
      draw(g) {
        const t = T;
        D.bg(g, W, H, '#4d7c0f', '#3f6212');
        for (const b of grass) { if (b.c) { D.circle(g, b.x, b.y, 3, b.c); continue; } D.line(g, b.x, b.y, b.x + Math.sin(t + b.x) * 1.5, b.y - b.h, 'rgba(163,230,53,.35)', 1.5); }
        // pond
        if (L.pond) { const [ox, oy, rx, ry] = L.pond; g.fillStyle = '#65a30d'; g.beginPath(); g.ellipse(ox, oy, rx + 8, ry + 8, 0, 0, U.TAU); g.fill(); const gr = g.createRadialGradient(ox, oy, 0, ox, oy, rx); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(1, '#0369a1'); g.fillStyle = gr; g.beginPath(); g.ellipse(ox, oy, rx, ry, 0, 0, U.TAU); g.fill(); for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(ox, oy, rx * (0.3 + ((t * 0.2 + k / 3) % 1) * 0.6), ry * (0.3 + ((t * 0.2 + k / 3) % 1) * 0.6), 0, 0, U.TAU); g.stroke(); } }
        // pen floor
        const [px, py, pw, ph] = L.pen;
        g.fillStyle = 'rgba(120,53,15,.25)'; g.fillRect(px, py, pw, ph);
        // fences
        for (const [x1, y1, x2, y2] of segs) {
          D.line(g, x1 + 3, y1 + 4, x2 + 3, y2 + 4, 'rgba(0,0,0,.25)', 6);
          D.line(g, x1, y1, x2, y2, '#92400e', 5); D.line(g, x1, y1 - 6, x2, y2 - 6, '#b45309', 3);
          const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(len / 30));
          for (let k = 0; k <= n; k++) { const x = x1 + ((x2 - x1) * k) / n, y = y1 + ((y2 - y1) * k) / n; D.fillRR(g, x - 3, y - 12, 6, 16, 2, '#78350f'); }
        }
        // entities sorted by y
        const ents = sheep.map((s) => ({ y: s.y, s })).concat([{ y: dog.y, d: 1 }], L.trees.map((tr) => ({ y: tr[1], tr })));
        ents.sort((a, b) => a.y - b.y);
        for (const e of ents) {
          if (e.tr) { const [x, y, r] = e.tr; D.shadow(g, x + 8, y + r * 0.6, r, r * 0.4, 0.35); D.fillRR(g, x - 6, y - 4, 12, r * 0.7, 3, '#78350f'); D.circle(g, x, y - r * 0.4, r, '#166534'); D.circle(g, x - r * 0.3, y - r * 0.7, r * 0.55, '#15803d'); D.circle(g, x + r * 0.25, y - r * 0.55, r * 0.45, '#16a34a'); continue; }
          if (e.d) {
            D.shadow(g, dog.x, dog.y + 10, 16, 6, 0.35);
            g.save(); g.translate(dog.x, dog.y); const fl = Math.cos(dog.a) < 0 ? -1 : 1; g.scale(fl * 1.25, 1.25);
            const run = Math.min(1, Math.hypot(dog.vx, dog.vy) / 200), leg = Math.sin(t * 22) * 5 * run;
            for (const [lx, ph2] of [[-8, 0], [8, 1]]) D.line(g, lx, 2, lx + (ph2 ? leg : -leg), 10, '#451a03', 3);
            D.fillRR(g, -14, -8, 28, 14, 7, '#92400e'); D.fillRR(g, -6, -8, 14, 8, 4, '#f5f5f4');
            D.circle(g, 14, -9, 8, '#92400e'); D.circle(g, 18, -8, 3.5, '#f5f5f4'); D.circle(g, 21, -9, 2, '#111'); D.circle(g, 15, -12, 1.8, '#111');
            D.poly(g, [[9, -15], [12, -21], [15, -15]], '#451a03');
            D.line(g, -14, -4, -20, -12 + Math.sin(t * 18) * 4, '#92400e', 3);
            g.restore();
            if (barkCd > 0) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath(); g.arc(dog.x, dog.y - 28, 7, -Math.PI / 2, -Math.PI / 2 + U.TAU * (1 - barkCd / 1.8)); g.stroke(); }
            continue;
          }
          const s = e.s, wool = s.black ? '#374151' : '#f5f5f4', moving = Math.hypot(s.vx, s.vy) > 20;
          D.shadow(g, s.x, s.y + 12, 16, 6, 0.3);
          g.save(); g.translate(s.x, s.y); const fl = s.vx < -2 ? -1 : 1; g.scale(fl * 1.3, 1.3);
          const lg = moving ? Math.sin(s.step * 3) * 3 : 0;
          for (const [lx, sg] of [[-6, 1], [6, -1]]) D.line(g, lx, 3, lx + lg * sg, 10, '#1f2937', 2.5);
          for (const [ox, oy, r] of [[-6, -2, 7], [0, -5, 8], [6, -2, 7], [0, 1, 8]]) D.circle(g, ox, oy + (moving ? Math.abs(Math.sin(s.step * 3)) * -1.5 : 0), r, wool);
          D.fillRR(g, 7, -8, 9, 8, 4, '#1f2937'); D.circle(g, 14, -6, 1.3, '#fff');
          g.restore();
          if (s.penned) D.circle(g, s.x, s.y - 16, 2.5, '#a3e635');
        }
        if (bark > 0) { g.globalAlpha = bark * 0.5; D.circle(g, dog.x, dog.y, 240 * (1 - bark) + 20, null, '#fff', 3); g.globalAlpha = 1; }
        D.text(g, `${sheep.filter((s) => s.penned).length} / ${sheep.length} penned`, 24, 30, { size: 20, align: 'left', color: '#fff', stroke: 'rgba(0,0,0,.35)', lw: 5 });
        D.text(g, `${U.fmtTime(time, 1)}s`, W - 24, 30, { size: 18, align: 'right', font: 'mono', color: '#fff', stroke: 'rgba(0,0,0,.35)', lw: 5 });
      },
    };
  },
});

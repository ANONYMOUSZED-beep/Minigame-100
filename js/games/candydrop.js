MG.add({
  id: 'candydrop', name: 'Candy Drop', cat: 'Physics', color: '#4ade80', color2: '#f472b6',
  desc: 'Cut-the-rope physics puzzles. Slice ropes, pop bubbles and puff air to feed the hungry monster.',
  how: ['Swipe across a rope to cut it', 'Collect the three stars on the way down for a perfect level', 'Bubbles float candy upward — tap them to pop', 'Glowing hooks grab passing candy · tap air cushions to puff · avoid spikes'],
  w: 540, h: 860, score: 'high',
  make(E) {
    const W = 540, H = 860, SEG = 13, CR = 17;
    const LEVELS = [
      { candy: [270, 330], ropes: [[270, 110]], mon: [270, 740], stars: [[270, 440], [270, 540], [270, 640]] },
      { candy: [270, 300], ropes: [[110, 140], [430, 140]], mon: [410, 740], stars: [[300, 420], [360, 520], [400, 620]] },
      { candy: [150, 360], ropes: [[80, 110]], mon: [440, 720], stars: [[200, 520], [320, 560], [430, 470]] },
      { candy: [270, 620], ropes: [[270, 470]], mon: [270, 170], bubble: [270, 700], stars: [[270, 520], [270, 400], [270, 280]], spikes: [[60, 740, 480, 740]] },
      { candy: [150, 260], ropes: [[120, 100], [240, 100]], mon: [420, 740], hooks: [[380, 420, 150]], stars: [[260, 380], [400, 560], [300, 480]], spikes: [[60, 620, 260, 620]] },
      { candy: [120, 300], ropes: [[70, 120]], mon: [440, 740], air: [[40, 600, 1]], stars: [[180, 470], [300, 620], [430, 640]], spikes: [[150, 800, 330, 800]] },
      { candy: [270, 260], ropes: [[140, 110], [400, 110], [270, 80]], mon: [110, 740], hooks: [[140, 520, 130]], stars: [[200, 380], [150, 620], [280, 500]], spikes: [[300, 700, 500, 700]] },
      { candy: [420, 640], ropes: [[420, 500]], mon: [120, 170], bubble: [420, 720], air: [[510, 420, -1]], stars: [[420, 540], [300, 380], [150, 300]], spikes: [[60, 800, 480, 800], [300, 250, 480, 250]] },
    ];
    let lvl = -1, pts, ropes, candy, stars, bubble, hooks, airs, spikes, mon, state, stateT, swipe = [], got = 0, total = 0, eatT = 0, blinkT = 0, T = 0;
    function makeRope(ax, ay, cx, cy) {
      const n = Math.max(3, Math.ceil(U.dist(ax, ay, cx, cy) / SEG)), list = [];
      for (let i = 0; i <= n; i++) { const x = U.lerp(ax, cx, i / n), y = U.lerp(ay, cy, i / n); list.push({ x, y, px: x, py: y, pin: i === 0 }); }
      list[n] = candy;
      return { pts: list, len: U.dist(ax, ay, cx, cy) / n * 1.02, anchor: [ax, ay] };
    }
    function load() {
      lvl++;
      const L = LEVELS[lvl];
      candy = { x: L.candy[0], y: L.candy[1], px: L.candy[0], py: L.candy[1], candy: true };
      ropes = L.ropes.map(([ax, ay]) => makeRope(ax, ay, candy.x, candy.y));
      stars = L.stars.map(([x, y]) => ({ x, y, got: false }));
      bubble = L.bubble ? { x: L.bubble[0], y: L.bubble[1], on: false, popped: false } : null;
      hooks = (L.hooks || []).map(([x, y, r]) => ({ x, y, r, used: false }));
      airs = (L.air || []).map(([x, y, dir]) => ({ x, y, dir, puff: 0 }));
      spikes = L.spikes || [];
      mon = { x: L.mon[0], y: L.mon[1], open: 0 };
      state = 'play'; got = 0; eatT = 0;
      E.stat('Level', `${lvl + 1}/${LEVELS.length}`); E.stat('Stars', '☆☆☆');
      E.banner(`LEVEL ${lvl + 1}`, null, { color: '#4ade80', life: 1 });
    }
    load();
    function allPts() { const s = new Set(); for (const r of ropes) for (const p of r.pts) s.add(p); s.add(candy); return [...s]; }
    function cutAt(x1, y1, x2, y2) {
      for (let ri = ropes.length - 1; ri >= 0; ri--) {
        const r = ropes[ri];
        for (let i = 0; i < r.pts.length - 1; i++) {
          const a = r.pts[i], b = r.pts[i + 1];
          if (U.segIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) {
            // keep the part attached to the candy as a dangling tail (no anchor)
            const tail = r.pts.slice(i + 1), head = r.pts.slice(0, i + 1);
            ropes.splice(ri, 1);
            ropes.push({ pts: head, len: r.len, anchor: r.anchor, dead: true }, { pts: tail, len: r.len, dead: true, tail: true });
            E.sfx('slice', 1.2); E.burst(a.x, a.y, { n: 8, color: '#a16207', speed: 90, size: 2 });
            return true;
          }
        }
      }
      return false;
    }
    function lose(why) { if (state !== 'play') return; state = 'lost'; stateT = 1.3; E.sfx('lose'); E.pop(W / 2, 400, why, { color: '#f87171', size: 26 }); }
    return {
      update(dt) {
        T += dt; blinkT -= dt; if (blinkT < -3) blinkT = 0.15;
        if (state === 'won') { stateT -= dt; eatT += dt; if (stateT <= 0) { if (lvl >= LEVELS.length - 1) { state = 'done'; E.over({ win: true, title: 'All Fed!', msg: `${total} of ${LEVELS.length * 3} stars` }); } else load(); } return; }
        if (state === 'lost') { stateT -= dt; if (stateT <= 0) { lvl--; load(); } return; }
        // input: swipe cuts, taps pop bubble / puff air
        if (E.ptr.hit) { swipe = [[E.ptr.x, E.ptr.y]]; if (bubble && bubble.on && U.dist(E.ptr.x, E.ptr.y, candy.x, candy.y) < 40) { bubble.on = false; bubble.popped = true; E.sfx('pop'); E.burst(candy.x, candy.y, { n: 16, color: '#bae6fd', speed: 160 }); } for (const a of airs) if (U.dist(E.ptr.x, E.ptr.y, a.x, a.y) < 40) { a.puff = 0.35; E.sfx('whoosh', 1.6, 0.6); if (Math.abs(candy.y - a.y) < 140) { candy.px -= a.dir * 9; } } }
        if (E.ptr.down && swipe.length) { const last = swipe[swipe.length - 1]; if (U.dist(last[0], last[1], E.ptr.x, E.ptr.y) > 4) { cutAt(last[0], last[1], E.ptr.x, E.ptr.y); swipe.push([E.ptr.x, E.ptr.y]); if (swipe.length > 12) swipe.shift(); } }
        if (!E.ptr.down && swipe.length) swipe.shift();
        if (E.hit('A')) { const live = ropes.filter((r) => !r.dead); if (live.length) { const r = live[0], a = r.pts[Math.floor(r.pts.length / 2)], b = r.pts[Math.floor(r.pts.length / 2) + 1]; cutAt(a.x - 20, a.y - 20, b.x + 20, b.y + 20); } }
        // verlet
        const P = allPts(), sub = 2, h = dt / sub;
        for (let s = 0; s < sub; s++) {
          for (const p of P) {
            if (p.pin) continue;
            const vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995;
            p.px = p.x; p.py = p.y;
            let gy = 1100;
            if (p.candy && bubble && bubble.on) gy = -260;
            p.x += vx; p.y += vy + gy * h * h;
          }
          for (let it = 0; it < 14; it++) for (const r of ropes) for (let i = 0; i < r.pts.length - 1; i++) {
            const a = r.pts[i], b = r.pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - r.len) / d;
            if (diff < 0) continue; // ropes don't push
            const wa = a.pin ? 0 : b.pin ? 1 : a.candy ? 0.1 : b.candy ? 0.9 : 0.5;
            a.x += dx * diff * wa; a.y += dy * diff * wa; b.x -= dx * diff * (1 - wa); b.y -= dy * diff * (1 - wa);
          }
        }
        // interactions
        for (const st of stars) if (!st.got && U.dist(candy.x, candy.y, st.x, st.y) < 34) { st.got = true; got++; E.score += 100; E.sfx('coin', 1 + got * 0.15); E.burst(st.x, st.y, { n: 20, colors: ['#facc15', '#fff'], speed: 180 }); E.stat('Stars', '★'.repeat(got) + '☆'.repeat(3 - got)); }
        if (bubble && !bubble.on && !bubble.popped && U.dist(candy.x, candy.y, bubble.x, bubble.y) < 40) { bubble.on = true; E.sfx('bounce', 1.6); }
        for (const hk of hooks) if (!hk.used && U.dist(candy.x, candy.y, hk.x, hk.y) < hk.r) { hk.used = true; ropes.push(makeRope(hk.x, hk.y, candy.x, candy.y)); ropes[ropes.length - 1].len *= 0.92; E.sfx('click', 0.8); }
        for (const a of airs) a.puff = Math.max(0, a.puff - dt);
        for (const [x1, y1, x2, y2] of spikes) if (U.segDist(candy.x, candy.y, x1, y1, x2, y2).d < CR + 6) { lose('Ouch — spikes!'); E.burst(candy.x, candy.y, { n: 30, colors: ['#f472b6', '#fff'], speed: 220 }); }
        if (candy.y > H + 40 || candy.y < -60 || candy.x < -60 || candy.x > W + 60) lose('The candy got away');
        const dm = U.dist(candy.x, candy.y, mon.x, mon.y);
        mon.open = U.damp(mon.open, dm < 150 ? 1 : 0, 10, dt);
        if (dm < 38 && state === 'play') {
          state = 'won'; stateT = 1.8; total += got; E.score += 300 + got * 100;
          E.sfx('win'); E.flash('#4ade80', 0.2); E.burst(mon.x, mon.y, { n: 40, colors: ['#4ade80', '#f472b6', '#facc15'], speed: 260 });
          E.pop(W / 2, 360, got === 3 ? '★★★ PERFECT!' : `${'★'.repeat(got)}${'☆'.repeat(3 - got)}`, { color: '#facc15', size: 34, life: 1.6 });
          ropes = []; candy.x = -999;
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#fdf2f8', '#fbcfe8');
        g.fillStyle = 'rgba(244,114,182,.08)'; for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) g.fillRect(x, y, 20, 20);
        // cardboard frame
        g.strokeStyle = '#d6a36a'; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
        // spikes
        for (const [x1, y1, x2, y2] of spikes) { const n = Math.floor(U.dist(x1, y1, x2, y2) / 18); for (let k = 0; k < n; k++) { const x = U.lerp(x1, x2, (k + 0.5) / n), y = U.lerp(y1, y2, (k + 0.5) / n); D.poly(g, [[x - 9, y + 8], [x, y - 12], [x + 9, y + 8]], '#94a3b8', '#475569', 1.5); } D.line(g, x1, y1 + 8, x2, y2 + 8, '#475569', 5); }
        // monster
        const bob = Math.sin(t * 3) * 3 + (state === 'won' ? Math.sin(eatT * 30) * 4 : 0);
        D.fillRR(g, mon.x - 44, mon.y + 22, 88, 30, 8, '#b45309');
        g.save(); g.translate(mon.x, mon.y + bob);
        D.orb(g, 0, 0, 40, '#4ade80', 0.3);
        D.circle(g, -24, -30, 10, '#4ade80'); D.circle(g, 24, -30, 10, '#4ade80');
        const eyeOpen = blinkT > 0 ? 0.15 : 1;
        for (const s of [-1, 1]) { g.save(); g.translate(s * 14, -12); g.scale(1, eyeOpen); D.circle(g, 0, 0, 9, '#fff'); D.circle(g, s * 2 + (candy.x - mon.x) * 0.01, 1 + (candy.y - mon.y) * 0.01, 4.5, '#111'); g.restore(); }
        g.fillStyle = '#7f1d1d'; g.beginPath(); g.ellipse(0, 14, 18, 3 + mon.open * 14, 0, 0, U.TAU); g.fill();
        if (mon.open > 0.3) { g.fillStyle = '#fff'; g.fillRect(-10, 14 - mon.open * 12, 6, 6); g.fillRect(4, 14 - mon.open * 12, 6, 6); }
        g.restore();
        // stars
        for (const st of stars) if (!st.got) { D.glow(g, st.x, st.y, 36, '#facc15', 0.5); D.star(g, st.x, st.y + Math.sin(t * 3 + st.x) * 3, 18, 8, 5, t * 0.8, '#facc15', '#b45309'); }
        // hooks & air
        for (const hk of hooks) { g.setLineDash([6, 8]); D.circle(g, hk.x, hk.y, hk.r, null, hk.used ? 'rgba(0,0,0,.08)' : 'rgba(74,222,128,.5)', 2); g.setLineDash([]); D.circle(g, hk.x, hk.y, 9, '#78350f', '#fde68a', 3); }
        for (const a of airs) { g.save(); g.translate(a.x, a.y); g.scale(a.dir, 1); D.fillRR(g, -30, -26, 40, 52, 12, '#60a5fa'); D.fillRR(g, 6, -12, 14, 24, 5, '#1e3a8a'); if (a.puff > 0) { g.globalAlpha = a.puff * 2; for (let k = 0; k < 3; k++) D.circle(g, 30 + k * 26 * (1 - a.puff), (k - 1) * 12, 10 + k * 4, '#e0f2fe'); g.globalAlpha = 1; } g.restore(); }
        // ropes
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const r of ropes) {
          g.beginPath(); r.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
          g.strokeStyle = '#78350f'; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#d6a36a'; g.lineWidth = 3; g.setLineDash([5, 5]); g.stroke(); g.setLineDash([]);
          if (r.anchor) D.circle(g, r.anchor[0], r.anchor[1], 9, '#78350f', '#fde68a', 3);
        }
        // candy
        if (candy.x > -500) {
          if (bubble && bubble.on) { D.circle(g, candy.x, candy.y, 34, 'rgba(186,230,253,.35)', 'rgba(255,255,255,.8)', 2); D.circle(g, candy.x - 12, candy.y - 14, 6, 'rgba(255,255,255,.7)'); }
          g.save(); g.translate(candy.x, candy.y); g.rotate((candy.x - candy.px) * 0.1);
          D.poly(g, [[-CR, 0], [-CR - 12, -10], [-CR - 12, 10]], '#f472b6'); D.poly(g, [[CR, 0], [CR + 12, -10], [CR + 12, 10]], '#f472b6');
          D.orb(g, 0, 0, CR, '#ef4444', 0.3);
          g.strokeStyle = '#fff'; g.lineWidth = 4; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(0, 0, CR - 3, k * 1.6, k * 1.6 + 0.8); g.stroke(); }
          g.restore();
        }
        if (bubble && !bubble.on && !bubble.popped) { D.circle(g, bubble.x, bubble.y, 30 + Math.sin(t * 3) * 2, 'rgba(186,230,253,.3)', 'rgba(255,255,255,.8)', 2); D.circle(g, bubble.x - 10, bubble.y - 12, 5, 'rgba(255,255,255,.7)'); }
        // swipe trail
        if (swipe.length > 1) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); swipe.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        D.text(g, `${lvl + 1}`, 40, 46, { size: 26, color: '#be185d' });
      },
    };
  },
});

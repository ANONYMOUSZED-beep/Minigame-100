MG.add({
  id: 'chroma', name: 'Chroma Hop', cat: 'Runner', color: '#f472b6', color2: '#facc15',
  desc: 'Hop through spinning gates — but only through the colour that matches your ball.',
  how: ['Tap, click or <kbd>Space</kbd> to hop upward', 'Pass only through segments of your own colour', 'Colour orbs change your colour · stars are points', 'Gates get faster, bigger and trickier'],
  w: 540, h: 800, pad: 'A', padLabels: { A: 'HOP' },
  make(E) {
    const W = 540, H = 800, COLS = ['#f472b6', '#facc15', '#22d3ee', '#a855f7'];
    const ball = { y: 620, vy: 0, col: 0, r: 12, dead: false };
    let cam = 0, gates = [], topY = 380, started = false, stars = 0, pops = [];
    function addGate(y) {
      const lvl = gates.length;
      const kinds = ['ring', 'ring', 'bar', 'cross', 'double', 'square'];
      const kind = lvl < 2 ? 'ring' : U.pick(kinds.slice(0, Math.min(kinds.length, 2 + Math.floor(lvl / 2))));
      const sp = (1.2 + Math.min(1.8, lvl * 0.08)) * (U.chance(0.5) ? 1 : -1);
      gates.push({ kind, y, a: U.rand(U.TAU), sp, star: true, sw: true, r: kind === 'double' ? 110 : 95 + Math.min(40, lvl * 2), t: 0 });
      topY = y - (kind === 'double' ? 440 : 380);
    }
    addGate(260);
    for (let i = 0; i < 3; i++) addGate(topY);
    function segColorAt(g, x, y) {
      // returns colour index of the gate at world point, or -1 if empty
      const dx = x - W / 2, dy = y - g.y;
      if (g.kind === 'ring' || g.kind === 'double') {
        const rings = g.kind === 'double' ? [[g.r, 1, 0], [g.r - 36, -1, 1]] : [[g.r, 1, 0]];
        for (const [r, s, off] of rings) {
          const d = Math.hypot(dx, dy);
          if (Math.abs(d - r) < 9 + ball.r) { const a = U.wrap(Math.atan2(dy, dx) - g.a * s, 0, U.TAU); return (Math.floor(a / (U.TAU / 4)) + off) % 4; }
        }
        return -1;
      }
      if (g.kind === 'bar') {
        if (Math.abs(dy) > 9 + ball.r) return -1;
        const off = g.t * 160 * Math.sign(g.sp);
        return Math.floor(U.wrap(W / 2 + dx + off, 0, W) / (W / 4)) % 4;
      }
      if (g.kind === 'cross') {
        const cx = W / 2 + (g.sp > 0 ? -70 : 70), ddx = x - cx, d = Math.hypot(ddx, dy);
        if (d > g.r) return -1;
        for (let k = 0; k < 4; k++) { const a = g.a + (k * Math.PI) / 2, px = Math.cos(a), py = Math.sin(a); const along = ddx * px + dy * py, perp = Math.abs(-ddx * py + dy * px); if (along > 0 && along < g.r && perp < 9 + ball.r) return k; }
        return -1;
      }
      if (g.kind === 'square') {
        const s = g.r * 0.9, c = Math.cos(-g.a), sn = Math.sin(-g.a), lx = dx * c - dy * sn, ly = dx * sn + dy * c;
        const inner = Math.max(Math.abs(lx), Math.abs(ly));
        if (Math.abs(inner - s) > 9 + ball.r) return -1;
        if (Math.abs(ly) > Math.abs(lx)) return ly < 0 ? 0 : 2; return lx > 0 ? 1 : 3;
      }
      return -1;
    }
    function die() {
      if (ball.dead) return; ball.dead = true;
      E.sfx('explode', 1.3); E.shake(12); E.flash(COLS[ball.col], 0.35); E.vibrate(150);
      E.burst(W / 2, ball.y - cam, { n: 60, colors: COLS, speed: 380 });
      E.after(1, () => E.over({ msg: `${stars} star${stars === 1 ? '' : 's'}` }));
    }
    return {
      update(dt) {
        if (ball.dead) return;
        if (E.hit('A', 'U') || E.ptr.hit) { ball.vy = -470; started = true; E.sfx('hop', 1.3, 0.5); }
        if (!started) return;
        ball.vy += 1300 * dt; ball.y += ball.vy * dt;
        const target = ball.y - H * 0.55; if (target < cam) cam = target;
        if (ball.y - cam > H + 20) die();
        for (const gt of gates) {
          gt.t += dt; gt.a += gt.sp * dt;
          const c = segColorAt(gt, W / 2, ball.y);
          if (c >= 0 && c !== ball.col) { die(); return; }
          if (gt.star && Math.abs(ball.y - gt.y) < 20) { gt.star = false; stars++; E.score = stars; E.sfx('coin', 1.2); E.pop(W / 2, gt.y - cam - 30, '+1', { color: '#fde68a' }); E.burst(W / 2, gt.y - cam, { n: 16, colors: ['#fde68a', '#fff'], speed: 160 }); }
          const swY = gt.y - (gt.kind === 'double' ? 220 : 190);
          if (gt.sw && Math.abs(ball.y - swY) < 18) { gt.sw = false; let n; do { n = U.ri(0, 3); } while (n === ball.col); ball.col = n; E.sfx('power', 1.3, 0.5); E.ring(W / 2, swY - cam, { color: COLS[n], r: 60 }); }
        }
        if (topY > cam - 200) addGate(topY);
        gates = gates.filter((gt) => gt.y - cam < H + 300);
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#16121f'; g.fillRect(0, 0, W, H);
        g.save(); g.translate(0, -cam); g.lineCap = 'butt';
        for (const gt of gates) {
          const cx = W / 2, cy = gt.y;
          if (gt.kind === 'ring' || gt.kind === 'double') {
            const rings = gt.kind === 'double' ? [[gt.r, 1, 0], [gt.r - 36, -1, 1]] : [[gt.r, 1, 0]];
            for (const [r, s, off] of rings) for (let k = 0; k < 4; k++) { g.strokeStyle = COLS[(k + off) % 4]; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, r, gt.a * s + (k * Math.PI) / 2, gt.a * s + ((k + 1) * Math.PI) / 2); g.stroke(); }
          } else if (gt.kind === 'bar') {
            const off = gt.t * 160 * Math.sign(gt.sp);
            for (let k = 0; k < 8; k++) { const x = U.wrap(k * (W / 4) - off, -W / 4, W * 2 - W / 4); if (x > W) continue; g.fillStyle = COLS[(8 + k) % 4]; g.fillRect(x, cy - 9, W / 4, 18); }
          } else if (gt.kind === 'cross') {
            const ccx = W / 2 + (gt.sp > 0 ? -70 : 70);
            for (let k = 0; k < 4; k++) { const a = gt.a + (k * Math.PI) / 2; g.strokeStyle = COLS[k]; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(ccx + Math.cos(a) * 10, cy + Math.sin(a) * 10); g.lineTo(ccx + Math.cos(a) * gt.r, cy + Math.sin(a) * gt.r); g.stroke(); }
            g.lineCap = 'butt';
          } else if (gt.kind === 'square') {
            const s = gt.r * 0.9;
            g.save(); g.translate(cx, cy); g.rotate(gt.a); g.lineWidth = 18;
            const sides = [[[-s, -s], [s, -s]], [[s, -s], [s, s]], [[s, s], [-s, s]], [[-s, s], [-s, -s]]];
            sides.forEach(([[x1, y1], [x2, y2]], k) => { g.strokeStyle = COLS[k]; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
            g.restore();
          }
          if (gt.star) { D.glow(g, cx, cy, 30, '#fff', 0.4); D.star(g, cx, cy, 14, 6, 5, t, '#fff'); }
          if (gt.sw) { const sy = gt.y - (gt.kind === 'double' ? 220 : 190); for (let k = 0; k < 4; k++) { g.fillStyle = COLS[k]; g.beginPath(); g.moveTo(cx, sy); g.arc(cx, sy, 13, t * 2 + (k * Math.PI) / 2, t * 2 + ((k + 1) * Math.PI) / 2); g.fill(); } }
        }
        if (!ball.dead) { D.glow(g, W / 2, ball.y, 40, COLS[ball.col], 0.6); D.circle(g, W / 2, ball.y, ball.r, COLS[ball.col]); D.circle(g, W / 2 - 4, ball.y - 4, 3.5, 'rgba(255,255,255,.6)'); }
        g.restore();
        D.text(g, stars, 30, 40, { size: 38, align: 'left', color: '#fff' });
        if (!started) D.text(g, 'TAP TO HOP', W / 2, H - 90, { size: 26, color: '#fff', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
      },
    };
  },
});

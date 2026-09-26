MG.add({
  id: 'duet', name: 'Duet', cat: 'Runner', color: '#ef4444', color2: '#3b82f6',
  desc: 'Two orbs, one orbit. Spin the pair to slip both through a cascade of falling shapes.',
  how: ['Hold <kbd>←</kbd> / <kbd>→</kbd> (or the left / right half of the screen) to spin', 'Neither orb may touch an obstacle', 'Obstacles slide, spin and speed up as chapters advance', 'Three hits and the song ends'],
  w: 540, h: 800, pad: 'LR',
  make(E) {
    const W = 540, H = 800, CX = W / 2, CY = 640, RAD = 92, OR = 11;
    let ang = 0, obs = [], nextY = 0, speed = 250, passed = 0, lives = 3, inv = 0, chapter = 1, trailR = [], trailB = [], hitFx = 0, patIdx = 0;
    const P = [
      () => [{ x: 60, w: 200, h: 34 }],
      () => [{ x: W - 260, w: 200, h: 34 }],
      () => [{ x: CX - 60, w: 120, h: 34 }],
      () => [{ x: 40, w: 150, h: 34 }, { x: W - 190, w: 150, h: 34, dy: 180 }],
      () => [{ x: CX - 90, w: 180, h: 30, spin: 1.6 }],
      () => [{ x: 60, w: 160, h: 34, slide: 150 }],
      () => [{ x: CX - 20, w: 40, h: 170 }],
      () => [{ x: 30, w: 170, h: 30 }, { x: W - 200, w: 170, h: 30 }],
      () => [{ x: CX - 110, w: 220, h: 26, spin: -1.2 }],
      () => [{ x: 70, w: 120, h: 34, slide: 170 }, { x: W - 190, w: 120, h: 34, slide: -170, dy: 200 }],
    ];
    function spawnPattern() {
      const pool = Math.min(P.length, 4 + chapter * 2);
      const list = P[U.ri(0, pool - 1)]();
      for (const o of list) obs.push({ x: o.x, y: -60 - (o.dy || 0), w: o.w, h: o.h, spin: o.spin || 0, slide: o.slide || 0, a: 0, bx: o.x, t: U.rand(6), counted: false });
      nextY = 260 - Math.min(90, chapter * 12);
      patIdx++;
      if (patIdx % 12 === 0) { chapter++; E.stat('Chapter', chapter); E.banner(`CHAPTER ${chapter}`, null, { color: '#fff', life: 1.2 }); E.sfx('power', 1, 0.6); }
    }
    E.stat('Chapter', 1); E.stat('Lives', '●●●');
    function orbPos(k) { const a = ang + k * Math.PI; return [CX + Math.cos(a) * RAD, CY + Math.sin(a) * RAD]; }
    function hitsRect(px, py, o) {
      // rotate point into rect space
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, c = Math.cos(-o.a), s = Math.sin(-o.a);
      const lx = (px - cx) * c - (py - cy) * s, ly = (px - cx) * s + (py - cy) * c;
      const nx = U.clamp(lx, -o.w / 2, o.w / 2), ny = U.clamp(ly, -o.h / 2, o.h / 2);
      return (lx - nx) ** 2 + (ly - ny) ** 2 < OR * OR;
    }
    return {
      update(dt) {
        let dir = E.axis().x;
        if (E.ptr.down) dir = E.ptr.x < W / 2 ? -1 : 1;
        ang += dir * 5.6 * dt;
        inv = Math.max(0, inv - dt); hitFx = Math.max(0, hitFx - dt * 2);
        speed = 250 + chapter * 22 + passed * 0.6;
        nextY -= speed * dt;
        if (nextY <= 0) spawnPattern();
        for (const o of obs) {
          o.t += dt; o.y += speed * dt;
          if (o.spin) o.a += o.spin * dt;
          if (o.slide) o.x = o.bx + Math.sin(o.t * 2.2) * Math.abs(o.slide) * Math.sign(o.slide) * 0.8;
          if (!o.counted && o.y > CY + RAD + 30) { o.counted = true; passed++; E.score = passed * 10 + (chapter - 1) * 50; E.stat('Passed', passed); if (passed % 10 === 0) E.sfx('coin', 1.3, 0.5); }
        }
        obs = obs.filter((o) => o.y < H + 200);
        const [rx, ry] = orbPos(0), [bx, by] = orbPos(1);
        trailR.push([rx, ry]); trailB.push([bx, by]); if (trailR.length > 16) { trailR.shift(); trailB.shift(); }
        if (inv <= 0) for (const o of obs) {
          const hr = hitsRect(rx, ry, o), hb = hitsRect(bx, by, o);
          if (hr || hb) {
            lives--; inv = 1.4; hitFx = 1;
            E.stat('Lives', '●'.repeat(Math.max(0, lives)));
            const [x, y] = hr ? [rx, ry] : [bx, by];
            E.burst(x, y, { n: 40, colors: [hr ? '#ef4444' : '#3b82f6', '#fff'], speed: 300 });
            E.sfx('hurt'); E.shake(10); E.flash(hr ? '#ef4444' : '#3b82f6', 0.35); E.freeze(0.08); E.vibrate(120);
            obs = obs.filter((q) => q.y > CY + 60 || q.y < CY - 360);
            if (lives <= 0) E.over({ msg: `${passed} obstacles · chapter ${chapter}` });
            break;
          }
        }
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#05050a'; g.fillRect(0, 0, W, H);
        const gr = g.createRadialGradient(CX, CY, 20, CX, CY, 500); gr.addColorStop(0, 'rgba(99,102,241,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        if (hitFx > 0) { g.fillStyle = `rgba(255,255,255,${hitFx * 0.08})`; g.fillRect(0, 0, W, H); }
        // guide orbit
        g.setLineDash([3, 9]); D.circle(g, CX, CY, RAD, null, 'rgba(255,255,255,.18)', 1.5); g.setLineDash([]);
        for (const o of obs) {
          g.save(); g.translate(o.x + o.w / 2, o.y + o.h / 2); g.rotate(o.a);
          D.glow(g, 0, 0, Math.max(o.w, o.h) * 0.8, '#e2e8f0', 0.12);
          D.fillRR(g, -o.w / 2, -o.h / 2, o.w, o.h, 4, '#f1f5f9');
          g.restore();
        }
        g.lineCap = 'round';
        for (const [tr, col] of [[trailR, '#ef4444'], [trailB, '#3b82f6']]) {
          for (let i = 1; i < tr.length; i++) { g.strokeStyle = U.rgba(col, (i / tr.length) * 0.6); g.lineWidth = (i / tr.length) * OR * 2; g.beginPath(); g.moveTo(tr[i - 1][0], tr[i - 1][1]); g.lineTo(tr[i][0], tr[i][1]); g.stroke(); }
        }
        const blink = inv > 0 && Math.sin(t * 30) > 0;
        if (!blink) for (const [k, col] of [[0, '#ef4444'], [1, '#3b82f6']]) { const [x, y] = orbPos(k); D.glow(g, x, y, 40, col, 0.8); D.circle(g, x, y, OR, col); D.circle(g, x - 3, y - 3, 3.5, 'rgba(255,255,255,.7)'); }
        D.text(g, passed, W / 2, 80, { size: 64, color: 'rgba(255,255,255,.9)', font: 'display', weight: 600 });
        for (let i = 0; i < 3; i++) D.circle(g, W / 2 - 20 + i * 20, 124, 5, i < lives ? (i % 2 ? '#3b82f6' : '#ef4444') : 'rgba(255,255,255,.15)');
      },
    };
  },
});

MG.add({
  id: 'hexa', name: 'Hexa Escape', cat: 'Action', color: '#f43f5e', color2: '#facc15',
  desc: 'A spinning, pulsing hexagonal gauntlet. Thread the gaps for as long as your reflexes last.',
  how: ['Rotate around the center with <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>', 'Or hold the left / right half of the screen', 'Walls close in from every side — find the gap', 'Ranks: Point → Line → Triangle → Square → Pentagon → Hexagon'],
  pad: 'LR', score: 'high', fmt: 'time', scoreLabel: 'Time',
  make(E) {
    const W = 960, H = 600, CX = W / 2, CY = H / 2, PR = 62;
    const RANKS = [[0, 'POINT'], [10, 'LINE'], [20, 'TRIANGLE'], [30, 'SQUARE'], [45, 'PENTAGON'], [60, 'HEXAGON']];
    let pa = 0, walls = [], rot = 0, rotSp = 1.2, rotT = 4, time = 0, nextPat = 0, speed = 290, beat = 0, beatT = 0, rank = 0, hue = 350, dead = false, zoom = 1, flip = 1;
    const sectorOf = (a) => ((Math.floor(U.wrap(a, 0, U.TAU) / (U.TAU / 6)) % 6) + 6) % 6;
    function add(sectors, r, th = 22) { for (const s of sectors) walls.push({ s: ((s % 6) + 6) % 6, r, th }); }
    const PATTERNS = [
      (r) => { const gap = U.ri(0, 5); add(U.range(6).filter((k) => k !== gap), r); return 190; },
      (r) => { const o = U.ri(0, 1); add([o, o + 2, o + 4], r); add([o + 1, o + 3, o + 5], r + 170); return 340; },
      (r) => { const s = U.ri(0, 5), d = U.chance(0.5) ? 1 : -1; for (let k = 0; k < 6; k++) add(U.range(6).filter((q) => q !== ((s + k * d) % 6 + 6) % 6 && q !== ((s + k * d + 1) % 6 + 6) % 6), r + k * 95, 18); return 6 * 95 + 110; },
      (r) => { const s = U.ri(0, 5); add([s, s + 1, s + 3, s + 4], r); add([s + 1, s + 2, s + 4, s + 5], r + 190); add([s, s + 1, s + 3, s + 4], r + 380); return 470; },
      (r) => { const s = U.ri(0, 5); for (let k = 0; k < 4; k++) add([s + (k % 2 ? 3 : 0), s + (k % 2 ? 4 : 1), s + (k % 2 ? 5 : 2)].map((x) => x + 0), r + k * 150, 20); return 4 * 150 + 80; },
      (r) => { const s = U.ri(0, 5); add([s, s + 1, s + 2, s + 3, s + 4], r); add([s + 3, s + 4, s + 5, s + 0, s + 1], r + 210); return 330; },
    ];
    const rankName = () => RANKS[rank][1];
    E.stat('Rank', rankName());
    function spawnPattern() {
      const far = 620;
      const p = PATTERNS[U.ri(0, Math.min(PATTERNS.length - 1, 1 + Math.floor(time / 8)))];
      nextPat = p(far) * (0.9 - Math.min(0.25, time * 0.004));
    }
    spawnPattern();
    function die() {
      dead = true; E.sfx('boom', 1.4); E.flash('#fff', 0.8); E.shake(18); E.vibrate(250);
      const px = CX + Math.cos(pa + rot) * PR, py = CY + Math.sin(pa + rot) * PR;
      E.burst(px, py, { n: 60, colors: ['#fff', U.hsl(hue, 90, 60)], speed: 400 });
      E.after(1, () => E.over({ title: 'Game Over', msg: `Reached ${rankName()} · ${U.fmtTime(time, 2)}s` }));
    }
    return {
      update(dt) {
        if (dead) { rotSp *= Math.exp(-dt * 2); rot += rotSp * dt; return; }
        time += dt; E.score = time;
        beatT += dt; if (beatT > 0.46) { beatT = 0; beat++; zoom = 1.06; E.tone({ f: beat % 2 ? 98 : 131, dur: 0.12, type: 'triangle', vol: 0.25 }); }
        zoom = U.damp(zoom, 1, 8, dt);
        const nr = RANKS.filter(([s]) => time >= s).length - 1;
        if (nr !== rank) { rank = nr; E.stat('Rank', rankName()); E.banner(rankName(), null, { color: '#fff', life: 1.2 }); E.sfx('power'); }
        speed = 290 + time * 3.2;
        rotT -= dt;
        if (rotT <= 0) { rotT = U.rand(3, 6); flip = -flip; rotSp = flip * (1 + time * 0.03 + U.rand(0, 0.8)); if (time > 20 && U.chance(0.3)) rotSp *= 1.6; }
        rot += rotSp * dt;
        hue = (hue + dt * 12) % 360;
        // input
        let dir = E.axis().x;
        if (E.ptr.down) dir = E.ptr.x < W / 2 ? -1 : 1;
        const move = dir * 9.2 * dt, na = pa + move;
        const sNow = sectorOf(pa), sNew = sectorOf(na);
        const blocked = sNew !== sNow && walls.some((w) => w.s === sNew && w.r < PR + 6 && w.r + w.th > PR - 6);
        if (!blocked) pa = na;
        // walls
        for (const w of walls) { w.r -= speed * dt; }
        walls = walls.filter((w) => w.r + w.th > 12);
        for (const w of walls) if (w.s === sectorOf(pa) && w.r < PR + 5 && w.r + w.th > PR - 5) { die(); return; }
        nextPat -= speed * dt;
        if (nextPat <= 0) spawnPattern();
      },
      draw(g) {
        const c1 = U.hsl(hue, 70, 14), c2 = U.hsl(hue, 70, 20), wc = U.hsl(hue, 90, 62), dark = U.hsl(hue, 60, 8);
        g.fillStyle = dark; g.fillRect(0, 0, W, H);
        g.save(); g.translate(CX, CY); g.scale(zoom, zoom * 0.88); g.rotate(rot);
        const far = 900;
        for (let k = 0; k < 6; k++) { const a0 = (k / 6) * U.TAU, a1 = ((k + 1) / 6) * U.TAU; D.poly(g, [[0, 0], [Math.cos(a0) * far, Math.sin(a0) * far], [Math.cos(a1) * far, Math.sin(a1) * far]], k % 2 ? c1 : c2); }
        // walls
        for (const w of walls) {
          const a0 = (w.s / 6) * U.TAU, a1 = ((w.s + 1) / 6) * U.TAU, r0 = Math.max(0, w.r), r1 = Math.max(0, w.r + w.th);
          D.poly(g, [[Math.cos(a0) * r0, Math.sin(a0) * r0], [Math.cos(a1) * r0, Math.sin(a1) * r0], [Math.cos(a1) * r1, Math.sin(a1) * r1], [Math.cos(a0) * r1, Math.sin(a0) * r1]], wc);
        }
        // center hex
        const hr = 44 + (zoom - 1) * 80;
        const hex = U.range(6).map((k) => [Math.cos((k / 6) * U.TAU) * hr, Math.sin((k / 6) * U.TAU) * hr]);
        D.poly(g, hex, dark, wc, 5);
        // player
        if (!dead) {
          const px = Math.cos(pa) * PR, py = Math.sin(pa) * PR;
          g.save(); g.translate(px, py); g.rotate(pa);
          D.poly(g, [[9, 0], [-5, -7], [-5, 7]], wc); g.restore();
        }
        g.restore();
        // HUD
        D.fillRR(g, W - 190, 14, 176, 44, 10, 'rgba(0,0,0,.45)');
        D.text(g, U.fmtTime(time, 2), W - 26, 36, { size: 26, align: 'right', color: '#fff', font: 'mono' });
        D.fillRR(g, 14, 14, 180, 44, 10, 'rgba(0,0,0,.45)');
        D.text(g, rankName(), 30, 36, { size: 20, align: 'left', color: wc });
        const nxt = RANKS[rank + 1];
        if (nxt) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(30, 50, 150, 3); g.fillStyle = wc; g.fillRect(30, 50, 150 * ((time - RANKS[rank][0]) / (nxt[0] - RANKS[rank][0])), 3); }
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

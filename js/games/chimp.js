MG.add({
  id: 'chimp', name: 'Chimp Test', cat: 'Brain', color: '#fb923c', color2: '#38bdf8',
  desc: 'Famous for beating humans: numbers flash on a grid, then vanish. Tap them back in order. Are you smarter than a chimp?',
  how: ['Memorize where the numbers are', 'Tap <b>1</b> — every other number hides', 'Tap the hidden tiles in ascending order', 'One more number each round · three strikes and you\'re out'],
  scoreLabel: 'Numbers',
  make(E) {
    const W = 960, H = 600, C = 8, R = 5, S = 84, GAP = 10, OX = (W - (C * S + (C - 1) * GAP)) / 2, OY = 70;
    let n = 3, tiles = [], next = 1, hidden = false, strikes = 0, st = 'play', stT = 0, T = 0, wrong = null, clearT = 0;
    E.stat('Strikes', '○○○');
    function deal() {
      n++; next = 1; hidden = false; wrong = null;
      const cells = U.shuffle(U.range(C * R)).slice(0, n);
      tiles = cells.map((c, i) => ({ num: i + 1, cx: c % C, cy: Math.floor(c / C), done: false, pop: 0, born: i * 0.035 }));
      st = 'play'; E.stat('Round', n);
    }
    deal();
    const pos = (t) => [OX + t.cx * (S + GAP), OY + t.cy * (S + GAP)];
    function tap(t) {
      if (t.num === next) {
        t.done = true; t.pop = 1; next++;
        E.sfx('pop', 0.8 + next * 0.05);
        const [x, y] = pos(t); E.burst(x + S / 2, y + S / 2, { n: 10, colors: ['#fb923c', '#fff', '#fde68a'], speed: 160 });
        if (next === 2) { hidden = true; E.sfx('whoosh', 1.4, 0.4); }
        if (next > n) {
          E.score = n; st = 'clear'; stT = 0.9; clearT = 0;
          E.sfx(n % 5 === 0 ? 'power' : 'match');
          E.pop(W / 2, H - 50, n >= 9 ? `${n}! Chimp-level memory` : `${n} ✓`, { color: '#4ade80', size: 28 });
        }
      } else {
        strikes++; wrong = t; st = 'reveal'; stT = 1.8;
        E.stat('Strikes', '●'.repeat(strikes) + '○'.repeat(3 - strikes));
        E.sfx('error'); E.shake(8); E.flash('#7f1d1d', 0.3);
        if (strikes >= 3) E.after(1.6, () => E.over({ msg: `You held ${E.score} numbers in your head · chimps average about 9` }));
      }
    }
    return {
      update(dt) {
        T += dt;
        for (const t of tiles) { t.pop = Math.max(0, t.pop - dt * 4); t.born -= dt; }
        if (st === 'clear') { stT -= dt; clearT += dt; if (stT <= 0) deal(); return; }
        if (st === 'reveal') { stT -= dt; if (stT <= 0 && strikes < 3) { n--; deal(); } return; }
        if (E.ptr.hit) for (const t of tiles) { if (t.done) continue; const [x, y] = pos(t); if (U.ptInRect(E.ptr.x, E.ptr.y, x, y, S, S)) { tap(t); break; } }
      },
      draw(g) {
        const t0 = E.t;
        D.radialBg(g, W, H, '#1c2541', '#070b16');
        // empty grid sockets
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) D.fillRR(g, OX + x * (S + GAP), OY + y * (S + GAP), S, S, 14, 'rgba(255,255,255,.035)');
        for (const t of tiles) {
          if (t.born > 0) continue;
          const [x, y] = pos(t), k = Math.min(1, -t.born * 6), sc = U.ease.outBack(k) * (1 + t.pop * 0.12);
          if (t.done && t.pop <= 0) continue;
          g.save(); g.translate(x + S / 2, y + S / 2); g.scale(sc, sc); if (t.done) g.globalAlpha = t.pop;
          const showNum = !hidden || st === 'reveal' || t.done;
          const isWrong = wrong === t, isNextMiss = st === 'reveal' && t.num === next;
          const col = isWrong ? '#ef4444' : isNextMiss ? '#4ade80' : showNum ? '#fb923c' : '#e2e8f0';
          D.glow(g, 0, 0, S * 0.9, col, showNum ? 0.35 : 0.15);
          D.tile(g, -S / 2, -S / 2, S, S, 14, col, 6);
          if (showNum) D.text(g, t.num, 0, -3, { size: 40, color: isWrong || isNextMiss ? '#fff' : '#1c1917' });
          else { D.fillRR(g, -S / 2 + 10, -S / 2 + 8, S - 20, 8, 4, 'rgba(255,255,255,.6)'); }
          g.restore();
        }
        if (st === 'clear') { g.globalAlpha = Math.max(0, 1 - clearT * 1.5); D.text(g, '✓', W / 2, OY + (R * (S + GAP)) / 2, { size: 160, color: '#4ade80', glow: '#4ade80' }); g.globalAlpha = 1; }
        D.text(g, hidden ? `Next: ${Math.min(next, n)}` : 'Memorize, then tap 1', W / 2, 38, { size: 18, font: 'ui', weight: 600, color: 'rgba(255,255,255,.75)' });
        for (let i = 0; i < 3; i++) D.circle(g, W - 90 + i * 26, 38, 8, i < strikes ? '#ef4444' : 'rgba(255,255,255,.15)');
        D.text(g, `${n} numbers`, 30, 38, { size: 16, align: 'left', font: 'mono', color: '#fb923c' });
        void t0;
      },
    };
  },
});

MG.add({
  id: 'pairs', name: 'Pairs', cat: 'Brain', color: '#a78bfa', color2: '#fbbf24',
  desc: 'A memory match with real card-flip feel. Peek, memorize, then clear four ever-bigger boards against the clock.',
  how: ['Click / tap two cards to flip them', 'Matching pairs stay open · consecutive matches build a combo', 'You get a short peek at every board — use it', 'Keyboard: arrows to move, <kbd>Space</kbd> to flip'],
  pad: 'LRUDA', padLabels: { A: 'FLIP' },
  make(E) {
    const W = 960, H = 600;
    const LEVELS = [[4, 3, 50], [4, 4, 70], [5, 4, 90], [6, 5, 140]];
    const ICONS = [
      ['star', '#facc15'], ['heart', '#f43f5e'], ['moon', '#c4b5fd'], ['sun', '#fb923c'], ['bolt', '#22d3ee'], ['drop', '#3b82f6'], ['leaf', '#4ade80'], ['crown', '#fbbf24'],
      ['gem', '#e879f9'], ['note', '#f472b6'], ['anchor', '#60a5fa'], ['key', '#fcd34d'], ['bell', '#fde047'], ['flame', '#f97316'], ['clover', '#22c55e'], ['planet', '#a78bfa'], ['fish', '#2dd4bf'],
    ];
    let lv = -1, cards, cols, rows, cw, ch, ox, oy, open = [], wait = 0, combo = 0, time = 0, limit = 0, peek = 0, st = 'play', stT = 0, cur = 0, moves = 0, T = 0, matched = 0;
    function load() {
      lv++; const [c, r, lim] = LEVELS[lv]; cols = c; rows = r; limit = lim; time = lim;
      const n = (c * r) / 2, ids = U.shuffle(U.range(ICONS.length)).slice(0, n), deck = U.shuffle([...ids, ...ids]);
      const gapX = 14, gapY = 14, aw = 880, ah = 480;
      cw = Math.min(130, (aw - gapX * (c - 1)) / c); ch = Math.min(cw * 1.3, (ah - gapY * (r - 1)) / r); cw = Math.min(cw, ch / 1.3);
      ox = W / 2 - (c * cw + (c - 1) * gapX) / 2; oy = 70 + (ah - (r * ch + (r - 1) * gapY)) / 2;
      cards = deck.map((id, i) => ({ id, x: ox + (i % c) * (cw + gapX), y: oy + Math.floor(i / c) * (ch + gapY), f: 0, up: true, done: false, deal: i * 0.04, shake: 0, pulse: 0 }));
      open = []; wait = 0; combo = 0; matched = 0; peek = 1.2 + n * 0.12; st = 'peek'; cur = 0;
      E.stat('Board', `${lv + 1}/4`); E.stat('Moves', moves);
      E.banner(`BOARD ${lv + 1}`, `${n} pairs · memorize!`, { color: '#a78bfa', life: 1.2 });
      E.sfx('shuffle');
    }
    load();
    function flip(i) {
      const cd = cards[i];
      if (st !== 'play' || cd.done || cd.up) return;
      if (open.length === 2) { for (const j of open) cards[j].up = false; open = []; wait = 0; }
      cd.up = true; open.push(i); E.sfx('card', 1 + Math.random() * 0.2);
      if (open.length === 2) {
        moves++; E.stat('Moves', moves);
        const [a, b] = open.map((j) => cards[j]);
        if (a.id === b.id) {
          combo++; matched++;
          const pts = 100 * combo; E.score += pts;
          a.done = b.done = true; a.pulse = b.pulse = 1; open = [];
          E.sfx('match', 1 + Math.min(combo, 8) * 0.06);
          for (const c of [a, b]) { E.burst(c.x + cw / 2, c.y + ch / 2, { n: 16, colors: [ICONS[c.id][1], '#fff'], speed: 220 }); }
          E.pop((a.x + b.x) / 2 + cw / 2, (a.y + b.y) / 2 + ch / 2 - 20, combo > 1 ? `${combo}× COMBO +${pts}` : `+${pts}`, { color: ICONS[a.id][1], size: 20 + Math.min(combo, 6) * 2 });
          if (matched * 2 === cards.length) {
            const bonus = Math.round(time * 20) + (lv + 1) * 200; E.score += bonus;
            st = 'clear'; stT = 2; E.sfx('win');
            E.banner('BOARD CLEAR', `+${bonus} time bonus`, { color: '#4ade80', life: 1.8 });
          }
        } else { combo = 0; wait = 0.8; a.shake = b.shake = 0.4; E.sfx('error', 1.4, 0.5); }
      }
    }
    return {
      update(dt) {
        T += dt;
        for (const c of cards) {
          if (c.deal > 0) { c.deal -= dt; continue; }
          c.f = U.approach(c.f, c.up || c.done ? 1 : 0, dt * 6.5);
          c.shake = Math.max(0, c.shake - dt); c.pulse = Math.max(0, c.pulse - dt * 1.5);
        }
        if (st === 'peek') { peek -= dt; if (peek <= 0) { st = 'play'; for (const c of cards) c.up = false; E.sfx('shuffle', 1.2, 0.6); } return; }
        if (st === 'clear') { stT -= dt; if (stT <= 0) { if (lv >= LEVELS.length - 1) { st = 'done'; E.over({ win: true, title: 'Total Recall', msg: `All four boards cleared in ${moves} moves` }); } else load(); } return; }
        if (st !== 'play') return;
        time -= dt; E.stat('Time', Math.ceil(Math.max(0, time)));
        if (time <= 0) { st = 'done'; E.sfx('lose'); for (const c of cards) c.up = true; E.over({ title: 'Out of Time', msg: `Board ${lv + 1}: ${matched} of ${cards.length / 2} pairs found` }); return; }
        if (wait > 0) { wait -= dt; if (wait <= 0 && open.length === 2) { for (const j of open) cards[j].up = false; open = []; } }
        if (E.ptr.hit) cards.forEach((c, i) => { if (U.ptInRect(E.ptr.x, E.ptr.y, c.x, c.y, cw, ch)) { cur = i; flip(i); } });
        const a = (E.hit('R') ? 1 : 0) - (E.hit('L') ? 1 : 0), b = (E.hit('D') ? 1 : 0) - (E.hit('U') ? 1 : 0);
        if (a || b) { const cx = U.wrap((cur % cols) + a, 0, cols), cy = U.wrap(Math.floor(cur / cols) + b, 0, rows); cur = cy * cols + cx; E.sfx('tick', 1.4, 0.4); }
        if (E.hit('A', 'E')) flip(cur);
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#2e1065', '#0c0718');
        g.save(); g.globalAlpha = 0.06; for (let i = 0; i < 14; i++) D.star(g, (i * 211) % W, (i * 137) % H, 30, 12, 4, t * 0.1 + i, '#fff'); g.restore();
        // time bar
        const k = st === 'peek' ? 1 : Math.max(0, time / limit);
        D.fillRR(g, W / 2 - 220, 22, 440, 10, 5, 'rgba(255,255,255,.08)');
        D.fillRR(g, W / 2 - 220, 22, 440 * k, 10, 5, k < 0.2 ? '#f43f5e' : '#a78bfa');
        if (st === 'peek') D.text(g, `MEMORIZE  ${peek.toFixed(1)}`, W / 2, 50, { size: 15, font: 'mono', color: '#fbbf24' });
        cards.forEach((c, i) => {
          if (c.deal > 0) return;
          const sx = Math.abs(Math.cos(c.f * Math.PI)), face = c.f > 0.5, pul = 1 + Math.sin(c.pulse * Math.PI) * 0.08;
          const x = c.x + cw / 2 + Math.sin(c.shake * 60) * 6 * c.shake, y = c.y + ch / 2 - Math.sin(c.f * Math.PI) * 10;
          g.save(); g.translate(x, y); g.scale(Math.max(0.02, sx) * pul, pul);
          D.shadow(g, 0, ch / 2 + 4 + Math.sin(c.f * Math.PI) * 8, cw * 0.45, 6, 0.4);
          if (face) {
            const col = ICONS[c.id][1];
            D.fillRR(g, -cw / 2, -ch / 2, cw, ch, 12, c.done ? '#1e1b4b' : '#f8fafc');
            if (c.done) { D.glow(g, 0, 0, cw * 0.9, col, 0.35); D.strokeRR(g, -cw / 2, -ch / 2, cw, ch, 12, col, 2); }
            icon(g, ICONS[c.id][0], 0, 0, cw * 0.3, col, c.done);
          } else {
            const bg = g.createLinearGradient(0, -ch / 2, 0, ch / 2); bg.addColorStop(0, '#7c3aed'); bg.addColorStop(1, '#4c1d95');
            D.fillRR(g, -cw / 2, -ch / 2, cw, ch, 12, bg);
            D.strokeRR(g, -cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12, 8, 'rgba(251,191,36,.55)', 2);
            g.save(); D.rr(g, -cw / 2 + 8, -ch / 2 + 8, cw - 16, ch - 16, 7); g.clip();
            g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
            for (let d = -ch; d < ch; d += 12) { g.beginPath(); g.moveTo(-cw, d); g.lineTo(cw, d + cw); g.stroke(); g.beginPath(); g.moveTo(cw, d); g.lineTo(-cw, d + cw); g.stroke(); }
            g.restore();
            D.star(g, 0, 0, cw * 0.16, cw * 0.07, 4, 0, '#fbbf24');
          }
          g.restore();
          if (i === cur && st === 'play' && E.ptr.type !== 'touch') D.strokeRR(g, c.x - 5, c.y - 5, cw + 10, ch + 10, 15, `rgba(251,191,36,${0.5 + 0.4 * Math.sin(t * 6)})`, 3);
        });
        if (combo > 1) D.text(g, `COMBO ×${combo}`, W - 24, 30, { size: 18, align: 'right', color: '#fbbf24' });
      },
    };
    function icon(g, name, x, y, s, col, done) {
      g.save(); g.translate(x, y);
      g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
      if (!done) { g.shadowColor = U.rgba(col, 0.5); g.shadowBlur = 8; }
      const P = (pts) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * s, b * s) : g.moveTo(a * s, b * s))); g.closePath(); g.fill(); };
      switch (name) {
        case 'star': D.star(g, 0, 0, s, s * 0.45, 5, -Math.PI / 2, col); break;
        case 'heart': D.heart(g, 0, s * 0.25, s * 1.5, col); break;
        case 'moon': g.beginPath(); g.arc(0, 0, s, 0.9, U.TAU - 0.9 + 0.001, false); g.arc(s * 0.55, -s * 0.05, s * 0.72, U.TAU - 1.35, 1.35, true); g.closePath(); g.fill(); break;
        case 'sun': D.circle(g, 0, 0, s * 0.55, col); g.lineWidth = s * 0.16; for (let k = 0; k < 8; k++) { const a = (k / 8) * U.TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke(); } break;
        case 'bolt': P([[0.15, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.2, 1], [0.55, -0.15], [0.05, -0.15]]); break;
        case 'drop': g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.5, -s * 0.35, s * 0.72, 0, s * 0.72, s * 0.3); g.arc(0, s * 0.3, s * 0.72, 0, Math.PI); g.bezierCurveTo(-s * 0.72, 0, -s * 0.5, -s * 0.35, 0, -s); g.fill(); break;
        case 'leaf': g.beginPath(); g.moveTo(-s * 0.8, s * 0.8); g.quadraticCurveTo(-s * 0.9, -s * 0.8, s * 0.9, -s * 0.9); g.quadraticCurveTo(s * 0.8, s * 0.9, -s * 0.8, s * 0.8); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(-s * 0.9, s * 0.9); g.lineTo(s * 0.6, -s * 0.6); g.stroke(); break;
        case 'crown': P([[-1, 0.6], [-1, -0.5], [-0.5, 0.05], [0, -0.8], [0.5, 0.05], [1, -0.5], [1, 0.6]]); D.circle(g, 0, -0.8 * s - s * 0.12, s * 0.13, col); break;
        case 'gem': P([[-0.9, -0.3], [-0.45, -0.8], [0.45, -0.8], [0.9, -0.3], [0, 0.95]]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(-0.9 * s, -0.3 * s); g.lineTo(0.9 * s, -0.3 * s); g.moveTo(-0.3 * s, -0.3 * s); g.lineTo(0, 0.95 * s); g.lineTo(0.3 * s, -0.3 * s); g.stroke(); break;
        case 'note': g.beginPath(); g.ellipse(-s * 0.35, s * 0.6, s * 0.35, s * 0.26, -0.4, 0, U.TAU); g.fill(); g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(-s * 0.05, s * 0.55); g.lineTo(-s * 0.05, -s * 0.9); g.quadraticCurveTo(s * 0.5, -s * 0.6, s * 0.55, -s * 0.2); g.stroke(); break;
        case 'anchor': g.lineWidth = s * 0.16; g.beginPath(); g.moveTo(0, -s * 0.55); g.lineTo(0, s * 0.9); g.moveTo(-s * 0.4, -s * 0.3); g.lineTo(s * 0.4, -s * 0.3); g.moveTo(-s * 0.8, s * 0.3); g.quadraticCurveTo(-s * 0.6, s * 0.95, 0, s * 0.9); g.quadraticCurveTo(s * 0.6, s * 0.95, s * 0.8, s * 0.3); g.stroke(); g.beginPath(); g.arc(0, -s * 0.72, s * 0.18, 0, U.TAU); g.stroke(); break;
        case 'key': g.lineWidth = s * 0.18; g.beginPath(); g.arc(-s * 0.45, 0, s * 0.35, 0, U.TAU); g.stroke(); g.beginPath(); g.moveTo(-s * 0.1, 0); g.lineTo(s * 0.95, 0); g.moveTo(s * 0.55, 0); g.lineTo(s * 0.55, s * 0.35); g.moveTo(s * 0.85, 0); g.lineTo(s * 0.85, s * 0.3); g.stroke(); break;
        case 'bell': g.beginPath(); g.moveTo(-s * 0.8, s * 0.55); g.quadraticCurveTo(-s * 0.55, s * 0.35, -s * 0.55, -s * 0.2); g.quadraticCurveTo(-s * 0.5, -s * 0.8, 0, -s * 0.8); g.quadraticCurveTo(s * 0.5, -s * 0.8, s * 0.55, -s * 0.2); g.quadraticCurveTo(s * 0.55, s * 0.35, s * 0.8, s * 0.55); g.closePath(); g.fill(); D.circle(g, 0, s * 0.72, s * 0.17, col); D.circle(g, 0, -s * 0.88, s * 0.12, col); break;
        case 'flame': g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.8, s, 0, s); g.bezierCurveTo(-s * 0.8, s, -s * 0.9, -s * 0.1, -s * 0.2, -s * 0.4); g.quadraticCurveTo(-s * 0.1, 0, 0, -s); g.fill(); g.fillStyle = '#fde047'; g.beginPath(); g.ellipse(0, s * 0.45, s * 0.3, s * 0.45, 0, 0, U.TAU); g.fill(); break;
        case 'clover': for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k / 3) * U.TAU; D.circle(g, Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42 - s * 0.1, s * 0.38, col); } g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.1, s * 0.6, s * 0.4, s); g.stroke(); break;
        case 'planet': D.circle(g, 0, 0, s * 0.6, col); g.lineWidth = s * 0.12; g.beginPath(); g.ellipse(0, 0, s, s * 0.3, -0.35, 0.2, Math.PI - 0.2); g.stroke(); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(0, 0, s, s * 0.3, -0.35, Math.PI + 0.35, U.TAU - 0.35); g.stroke(); g.globalAlpha = 1; break;
        case 'fish': g.beginPath(); g.ellipse(-s * 0.1, 0, s * 0.7, s * 0.45, 0, 0, U.TAU); g.fill(); P([[0.5, 0], [1, -0.5], [1, 0.5]]); D.circle(g, -s * 0.45, -s * 0.08, s * 0.09, '#0f172a'); break;
      }
      g.restore();
    }
  },
});

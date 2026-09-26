MG.add({
  id: 'solitaire', name: 'Solitaire', cat: 'Board', color: '#16a34a', color2: '#f8fafc',
  desc: 'Klondike, done properly: drag-and-drop or tap-to-move, unlimited undo, auto-complete — and the bouncing-card victory lap.',
  how: ['Build four foundations from Ace to King, one per suit', 'Tableau: stack down in alternating colours · empty columns take Kings', 'Drag cards, or just tap one to send it to the best legal spot', 'Click the stock to draw · <kbd>Z</kbd> undo · <kbd>Space</kbd> draws a card'],
  pad: false,
  make(E) {
    const W = 960, H = 600, CW = 84, CH = 118, GAP = 36, X0 = (W - (7 * CW + 6 * GAP)) / 2, TY = 22, BY0 = 170;
    const SUITS = ['♠', '♥', '♦', '♣'], RED = [false, true, true, false], RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    // ---------- card art (pre-rendered) ----------
    const art = {};
    const mk = () => { const c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const x = c.getContext('2d'); x.scale(2, 2); return [c, x]; };
    function face(s, r) {
      const k = s * 13 + r; if (art[k]) return art[k];
      const [c, x] = mk(), col = RED[s] ? '#dc2626' : '#111827';
      D.fillRR(x, 0, 0, CW, CH, 8, '#fdfdf8'); D.strokeRR(x, 0.5, 0.5, CW - 1, CH - 1, 8, 'rgba(0,0,0,.25)', 1);
      D.text(x, RANK[r], 11, 14, { size: 17, color: col, font: 'display' }); D.text(x, SUITS[s], 11, 31, { size: 15, color: col, font: 'ui' });
      x.save(); x.translate(CW, CH); x.rotate(Math.PI); D.text(x, RANK[r], 11, 14, { size: 17, color: col, font: 'display' }); D.text(x, SUITS[s], 11, 31, { size: 15, color: col, font: 'ui' }); x.restore();
      if (r > 10) {
        D.fillRR(x, 22, 20, CW - 44, CH - 40, 6, RED[s] ? 'rgba(220,38,38,.08)' : 'rgba(17,24,39,.07)'); D.strokeRR(x, 22, 20, CW - 44, CH - 40, 6, col, 1.2);
        D.poly(x, [[CW / 2 - 14, 52], [CW / 2 - 16, 38], [CW / 2 - 7, 46], [CW / 2, 34], [CW / 2 + 7, 46], [CW / 2 + 16, 38], [CW / 2 + 14, 52]], '#eab308', '#92400e', 1);
        D.text(x, RANK[r], CW / 2, 70, { size: 26, color: col, font: 'display' }); D.text(x, SUITS[s], CW / 2, 90, { size: 14, color: col, font: 'ui' });
      } else if (r === 1) D.text(x, SUITS[s], CW / 2, CH / 2 + 2, { size: 46, color: col, font: 'ui' });
      else {
        const P = { 2: [[0.5, 0.2], [0.5, 0.8]], 3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]], 4: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.8], [0.7, 0.8]], 5: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.5], [0.3, 0.8], [0.7, 0.8]], 6: [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]], 7: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]], 8: [[0.3, 0.2], [0.7, 0.2], [0.5, 0.35], [0.3, 0.5], [0.7, 0.5], [0.5, 0.65], [0.3, 0.8], [0.7, 0.8]], 9: [[0.3, 0.18], [0.7, 0.18], [0.3, 0.39], [0.7, 0.39], [0.5, 0.5], [0.3, 0.61], [0.7, 0.61], [0.3, 0.82], [0.7, 0.82]], 10: [[0.3, 0.18], [0.7, 0.18], [0.5, 0.29], [0.3, 0.39], [0.7, 0.39], [0.3, 0.61], [0.7, 0.61], [0.5, 0.71], [0.3, 0.82], [0.7, 0.82]] }[r];
        for (const [px, py] of P) { const X = 12 + px * (CW - 24), Y = 10 + py * (CH - 20); x.save(); x.translate(X, Y); if (py > 0.55) x.rotate(Math.PI); D.text(x, SUITS[s], 0, 0, { size: 17, color: col, font: 'ui' }); x.restore(); }
      }
      return (art[k] = c);
    }
    function back() {
      if (art.back) return art.back;
      const [c, x] = mk();
      const gr = x.createLinearGradient(0, 0, CW, CH); gr.addColorStop(0, '#1d4ed8'); gr.addColorStop(1, '#1e3a8a');
      D.fillRR(x, 0, 0, CW, CH, 8, '#f8fafc'); D.fillRR(x, 4, 4, CW - 8, CH - 8, 6, gr);
      x.save(); D.rr(x, 4, 4, CW - 8, CH - 8, 6); x.clip(); x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.5;
      for (let d = -CH; d < CW + CH; d += 9) { x.beginPath(); x.moveTo(d, 0); x.lineTo(d - CH, CH); x.stroke(); x.beginPath(); x.moveTo(d - CH, 0); x.lineTo(d, CH); x.stroke(); }
      x.restore(); D.star(x, CW / 2, CH / 2, 14, 6, 4, 0, '#fbbf24');
      return (art.back = c);
    }
    // ---------- state ----------
    let deck = [], stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false, px: X0, py: TY, flip: 0, delay: 0 });
    U.shuffle(deck);
    let di = 0;
    for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) { const c = deck[di++]; c.delay = di * 0.025; if (i === j) c.up = true; tab[j].push(c); }
    while (di < 52) stock.push(deck[di++]);
    let drag = null, hist = [], moves = 0, time = 0, st = 'play', T = 0, auto = false, autoT = 0, win = null, started = false;
    E.stat('Moves', 0);
    const snap = () => ({ stock: stock.slice(), waste: waste.slice(), found: found.map((f) => f.slice()), tab: tab.map((t) => t.slice()), up: deck.map((c) => c.up), score: E.score });
    function undo() { const h = hist.pop(); if (!h) return; stock = h.stock; waste = h.waste; found = h.found; tab = h.tab; deck.forEach((c, i) => (c.up = h.up[i])); E.score = h.score; moves++; E.stat('Moves', moves); E.sfx('whoosh', 1.3, 0.4); }
    const top = (p) => p[p.length - 1];
    const canFound = (c, f) => (f.length ? top(f).s === c.s && top(f).r === c.r - 1 : c.r === 1);
    const canTab = (c, t) => (t.length ? top(t).up && RED[top(t).s] !== RED[c.s] && top(t).r === c.r + 1 : c.r === 13);
    function pileOf(c) {
      if (waste.includes(c)) return waste; if (stock.includes(c)) return stock;
      for (const f of found) if (f.includes(c)) return f; for (const t of tab) if (t.includes(c)) return t; return null;
    }
    function moveCards(cards, from, to) {
      hist.push(snap());
      from.splice(from.length - cards.length, cards.length); to.push(...cards);
      moves++; E.stat('Moves', moves); started = true;
      if (found.includes(to)) { E.score += 10; E.sfx('place', 0.9 + to.length * 0.05, 0.6); if (to.length === 13) { E.sfx('coin'); E.burst(fx(found.indexOf(to)) + CW / 2, TY + CH / 2, { n: 24, colors: [RED[top(to).s] ? '#ef4444' : '#e5e7eb', '#fde047'], speed: 220 }); } }
      else { if (from === waste) E.score += 5; if (found.includes(from)) E.score = Math.max(0, E.score - 15); E.sfx('card', 1.1, 0.6); }
      const tf = tab.find((t) => t === from);
      if (tf && tf.length && !top(tf).up) { top(tf).up = true; top(tf).flip = 1; E.score += 5; E.sfx('card', 1.4, 0.5); }
      checkWin();
    }
    function draw1() {
      if (st !== 'play') return;
      hist.push(snap()); started = true;
      if (stock.length) { const c = stock.pop(); c.up = true; c.flip = 1; waste.push(c); E.sfx('card', 1.2, 0.6); }
      else if (waste.length) { stock = waste.reverse().map((c) => ((c.up = false), c)); waste = []; E.score = Math.max(0, E.score - 50); E.sfx('shuffle', 1.2, 0.6); }
      else { hist.pop(); return; }
      moves++; E.stat('Moves', moves);
    }
    function smartMove(c) {
      const from = pileOf(c); if (!from || !c.up) return false;
      const idx = from.indexOf(c), cards = from.slice(idx);
      if (cards.length === 1 && !found.includes(from)) for (const f of found) if (canFound(c, f)) { moveCards(cards, from, f); return true; }
      const cand = tab.filter((t) => t !== from && canTab(c, t)).sort((a, b) => b.length - a.length);
      if (cand.length && !(c.r === 13 && idx === 0 && tab.includes(from))) { moveCards(cards, from, cand[0]); return true; }
      return false;
    }
    function checkWin() {
      if (found.every((f) => f.length === 13)) { st = 'won'; winStart(); return; }
      if (!auto && !stock.length && !waste.length && tab.every((t) => t.every((c) => c.up))) { auto = true; autoT = 0.3; }
    }
    // ---------- layout ----------
    const fx = (i) => X0 + (3 + i) * (CW + GAP);
    const tx = (i) => X0 + i * (CW + GAP);
    function spread(t) { const n = t.length, downs = t.filter((c) => !c.up).length, avail = H - BY0 - CH - 10; let dn = 12, upg = 28; const need = downs * dn + (n - downs - 1) * upg; if (need > avail && n - downs > 1) upg = Math.max(12, (avail - downs * dn) / (n - downs - 1)); return [dn, upg]; }
    function targets() {
      stock.forEach((c, i) => ((c.tx = X0 + Math.min(i, 3) * 0.6), (c.ty = TY - Math.min(i, 3) * 0.6)));
      waste.forEach((c, i) => ((c.tx = X0 + CW + GAP + Math.max(0, i - (waste.length - 3)) * 20), (c.ty = TY)));
      found.forEach((f, k) => f.forEach((c) => ((c.tx = fx(k)), (c.ty = TY))));
      tab.forEach((t, k) => { const [dn, upg] = spread(t); let y = BY0; t.forEach((c) => { c.tx = tx(k); c.ty = y; y += c.up ? upg : dn; }); });
    }
    function cardAt(px, py) {
      for (let k = 0; k < 7; k++) { const t = tab[k]; for (let i = t.length - 1; i >= 0; i--) { const c = t[i]; if (U.ptInRect(px, py, c.tx, c.ty, CW, i === t.length - 1 ? CH : Math.max(12, t[i + 1].ty - c.ty))) return c.up ? c : null; } }
      if (waste.length && U.ptInRect(px, py, top(waste).tx, TY, CW, CH)) return top(waste);
      for (const f of found) if (f.length && U.ptInRect(px, py, fx(found.indexOf(f)), TY, CW, CH)) return top(f);
      return null;
    }
    function dropTarget(cards) {
      const c = cards[0], cx = c.px + CW / 2, cy = c.py + CH / 2; let best = null, bd = 1e9;
      for (let k = 0; k < 7; k++) { const t = tab[k], last = top(t), yy = last ? last.ty + CH / 2 : BY0 + CH / 2, d = Math.hypot(cx - (tx(k) + CW / 2), cy - yy); if (d < bd && d < 110 && canTab(c, t) && !t.includes(c)) { bd = d; best = t; } }
      if (cards.length === 1) for (let k = 0; k < 4; k++) { const d = Math.hypot(cx - (fx(k) + CW / 2), cy - (TY + CH / 2)); if (d < bd && d < 100 && canFound(c, found[k])) { bd = d; best = found[k]; } }
      return best;
    }
    // ---------- win cascade ----------
    let trail = null, trailX = null, bouncers = [], bi = 0, nextB = 0;
    function winStart() {
      const pts = Math.max(0, Math.round(3000 - time * 4)); E.score += pts;
      E.sfx('tada'); E.banner('YOU WIN!', `${moves} moves · ${U.fmtTime(time, 0)}s · +${pts} time bonus`, { color: '#fde047', life: 3 });
      trail = document.createElement('canvas'); trail.width = W; trail.height = H; trailX = trail.getContext('2d');
      E.after(9, () => E.over({ win: true, title: 'Solitaire Solved!', msg: `${moves} moves in ${U.fmtTime(time, 0)}s` }));
    }
    return {
      update(dt) {
        T += dt;
        targets();
        for (const c of deck) {
          if (c.delay > 0) { c.delay -= dt; continue; }
          if (drag && drag.cards.includes(c)) continue;
          c.px = U.damp(c.px, c.tx, 16, dt); c.py = U.damp(c.py, c.ty, 16, dt); c.flip = Math.max(0, c.flip - dt * 5);
        }
        if (st === 'won') {
          nextB -= dt;
          if (nextB <= 0 && bi < 52) { const f = found[bi % 4], c = f[f.length - 1 - Math.floor(bi / 4)]; if (c) bouncers.push({ c, x: fx(bi % 4), y: TY, vx: U.pick([-1, 1]) * U.rand(120, 260), vy: -U.rand(0, 200) }); bi++; nextB = 0.12; }
          for (const b of bouncers) { b.vy += 1300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > H - CH) { b.y = H - CH; b.vy *= -0.78; E.sfx('tick', 1.2, 0.15); } if (trailX && b.x > -CW && b.x < W) trailX.drawImage(face(b.c.s, b.c.r), b.x, b.y, CW, CH); }
          return;
        }
        if (st !== 'play') return;
        if (started) time += dt;
        E.stat('Time', U.fmtTime(time, 0));
        if (auto) {
          autoT -= dt;
          if (autoT <= 0) { autoT = 0.09; let done = false; for (const src of [...tab, waste]) { const c = top(src); if (!c) continue; for (const f of found) if (canFound(c, f)) { moveCards([c], src, f); done = true; break; } if (done) break; } if (!done) auto = false; }
          return;
        }
        const p = E.ptr;
        if (p.hit) {
          if (U.ptInRect(p.x, p.y, X0, TY, CW, CH)) { draw1(); return; }
          const c = cardAt(p.x, p.y);
          if (c) { const from = pileOf(c), cards = from.slice(from.indexOf(c)); drag = { cards, from, ox: p.x - c.px, oy: p.y - c.py, sx: p.x, sy: p.y, moved: false }; }
        }
        if (drag) {
          if (p.down) {
            if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
            if (drag.moved) drag.cards.forEach((c, i) => { c.px = p.x - drag.ox; c.py = p.y - drag.oy + i * 28; });
          } else {
            const d = drag; drag = null;
            if (!d.moved) { if (!smartMove(d.cards[0])) { E.sfx('tick', 0.6, 0.3); d.cards.forEach((c) => (c.shake = 0.3)); } }
            else { const tgt = dropTarget(d.cards); if (tgt && tgt !== d.from) moveCards(d.cards, d.from, tgt); else E.sfx('tick', 0.7, 0.3); }
          }
        }
        for (const c of deck) if (c.shake) c.shake = Math.max(0, c.shake - dt);
        if (E.hit('KeyZ', 'Backspace')) undo();
        if (E.hit('Space')) draw1();
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#15803d', '#052e16');
        g.globalAlpha = 0.05; for (let i = 0; i < 2000; i += 7) { g.fillStyle = i % 2 ? '#000' : '#fff'; g.fillRect((i * 37) % W, (i * 91) % H, 2, 2); } g.globalAlpha = 1;
        // slots
        const slot = (x, y, label) => { D.strokeRR(g, x + 1, y + 1, CW - 2, CH - 2, 8, 'rgba(255,255,255,.22)', 2); if (label) D.text(g, label, x + CW / 2, y + CH / 2, { size: 30, color: 'rgba(255,255,255,.14)', font: 'ui' }); };
        slot(X0, TY, stock.length ? '' : '↻'); slot(X0 + CW + GAP, TY, '');
        for (let k = 0; k < 4; k++) slot(fx(k), TY, SUITS[k]);
        for (let k = 0; k < 7; k++) slot(tx(k), BY0, 'K');
        if (trail) g.drawImage(trail, 0, 0);
        // draw order: stock, waste, foundations, tableau, dragged on top
        const order = [...stock, ...waste, ...found.flat(), ...tab.flat()].filter((c) => !(drag && drag.moved && drag.cards.includes(c)));
        if (drag && drag.moved) order.push(...drag.cards);
        for (const c of order) {
          if (st === 'won' && found.flat().includes(c) && bouncers.some((b) => b.c === c)) continue;
          const sx = c.shake ? Math.sin(c.shake * 60) * 4 : 0, lifted = drag && drag.moved && drag.cards.includes(c);
          if (lifted) D.shadow(g, c.px + CW / 2 + 6, c.py + CH / 2 + 10, CW * 0.55, CH * 0.5, 0.3);
          const f = c.flip, sxs = f > 0 ? Math.abs(Math.cos(f * Math.PI)) : 1, show = c.up && !(f > 0.5);
          g.save(); g.translate(c.px + CW / 2 + sx, c.py + CH / 2); g.scale(Math.max(0.05, sxs), 1);
          g.drawImage(show || (c.up && f <= 0.5) ? face(c.s, c.r) : back(), -CW / 2, -CH / 2, CW, CH);
          g.restore();
        }
        for (const b of bouncers) g.drawImage(face(b.c.s, b.c.r), b.x, b.y, CW, CH);
        if (st === 'play') {
          D.text(g, `${E.score}`, W - 20, H - 18, { size: 16, align: 'right', font: 'mono', color: 'rgba(255,255,255,.6)' });
          D.text(g, `${moves} moves · ${U.fmtTime(time, 0)}s · Z undo`, 20, H - 18, { size: 13, align: 'left', font: 'mono', color: 'rgba(255,255,255,.45)' });
        }
        void t;
      },
    };
  },
});

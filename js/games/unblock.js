MG.add({
  id: 'unblock', name: 'Unblock', cat: 'Puzzle', color: '#ef4444', color2: '#38bdf8',
  desc: 'Rush-hour gridlock: slide cars and trucks along their lanes to free the red car. Twelve puzzles, each rated by its optimal solution.',
  how: ['Drag vehicles along their lane (cars only move forward / back)', 'Get the red car out through the exit on the right', 'Keys: <kbd>Tab</kbd> / <kbd>Space</kbd> selects a vehicle, arrows slide it · <kbd>Z</kbd> undo · <kbd>R</kbd> reset', 'Solving in par moves (the optimum) scores the most'],
  pad: false,
  make(E) {
    const W = 960, H = 600, S = 80, GX = (W - 6 * S) / 2, GY = 58;
    const LEVELS = [
      [3, '.HHEE....BBBAAF.G..CF.G..C.....C.DD.'], [4, '...CC..GG.D...AADH...BBH.......FFEE.'], [5, '...CDD...CF...AAFG...HHG..BBB..EEII.'],
      [7, '.CCCBB..JJEG..AAEG...DDF...HHF..II..'], [9, '..JJ..CC...BE.AAFBE.H.F.D.HIF.DKKIGG'], [11, '..G.F...G.FB..AAFB.EEHHB.IICDD...C..'],
      [13, 'EEEK....CKDDAACG..BJJGFLBIHHFL.I....'], [15, '.CC.BBF....GFAAEIGHHHEIK..JDDK..J...'], [17, 'FGJEEHFGJI.HAACIDK..CBDK...BD....B..'],
      [19, 'J.BBB.J.HHHDAAI.ED..IKECL.GK.CL.GKFF'], [21, 'B..DCCBGGDE.B.AAEFIIK.EF.LKJJM.LHHHM'], [23, '..C..MHHC.EM.IAAEMKI.DGGKLLDBB.JJFF.'],
    ];
    const PAL = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#ec4899', '#eab308', '#6366f1', '#84cc16', '#06b6d4', '#f97316', '#8b5cf6', '#10b981'];
    let lv = -1, cars, par, moves, hist, drag = null, sel = 0, st = 'play', stT = 0, T = 0, exitX = 0;
    function load(next = true) {
      if (next) lv++;
      const [p, s] = LEVELS[lv]; par = p;
      const m = {};
      [...s].forEach((ch, i) => { if (ch !== '.') (m[ch] = m[ch] || []).push(i); });
      cars = Object.keys(m).sort().map((ch, k) => {
        const cells = m[ch], h = cells.length > 1 && cells[1] - cells[0] === 1;
        return { id: ch, h, len: cells.length, row: Math.floor(cells[0] / 6), col: cells[0] % 6, fx: 0, red: ch === 'A', color: ch === 'A' ? '#ef4444' : PAL[k % PAL.length], truck: cells.length === 3 };
      });
      for (const c of cars) { c.f = c.h ? c.col : c.row; }
      moves = 0; hist = []; drag = null; sel = 0; st = 'play'; exitX = 0;
      E.stat('Puzzle', `${lv + 1}/${LEVELS.length}`); E.stat('Moves', 0);
      if (next) E.banner(`PUZZLE ${lv + 1}`, `par ${par} moves`, { color: '#ef4444', life: 1.1 });
    }
    load();
    const occ = (except) => { const o = new Array(36).fill(null); for (const c of cars) if (c !== except) for (let j = 0; j < c.len; j++) o[c.h ? c.row * 6 + c.col + j : (c.row + j) * 6 + c.col] = c; return o; };
    function range(c) {
      const o = occ(c); let lo = c.h ? c.col : c.row, hi = lo;
      const cell = (v) => (c.h ? c.row * 6 + v : v * 6 + c.col);
      while (lo - 1 >= 0 && !o[cell(lo - 1)]) lo--;
      while (hi + c.len < 6 && !o[cell(hi + c.len)]) hi++;
      return [lo, hi];
    }
    function commit(c, v) {
      const old = c.h ? c.col : c.row;
      if (v === old) return;
      hist.push({ c, v: old }); if (c.h) c.col = v; else c.row = v;
      moves++; E.stat('Moves', moves); E.sfx('thud', 1.4, 0.35);
      if (c.red && c.col === 4) win();
    }
    function win() {
      st = 'won'; stT = 2; drag = null;
      const pts = Math.round(200 + 800 * Math.min(1, par / moves)); E.score += pts;
      E.sfx('engine', 1.4, 1.5); E.after(0.2, () => E.sfx('whoosh', 1.2)); E.sfx('win');
      E.banner(moves <= par ? 'PERFECT!' : 'UNBLOCKED', `${moves} moves (par ${par}) · +${pts}`, { color: '#4ade80', life: 1.8 });
    }
    const carAt = (px, py) => cars.find((c) => { const x = GX + (c.h ? c.f : c.col) * S, y = GY + (c.h ? c.row : c.f) * S, w = c.h ? c.len * S : S, h = c.h ? S : c.len * S; return U.ptInRect(px, py, x, y, w, h); });
    return {
      update(dt) {
        T += dt;
        for (const c of cars) { if (drag && drag.c === c) continue; c.f = U.damp(c.f, c.h ? c.col : c.row, 20, dt); }
        if (st === 'won') { exitX += dt * 900 * Math.min(1, (2 - stT) * 2); stT -= dt; if (stT <= 0) { if (lv >= LEVELS.length - 1) { st = 'done'; E.over({ win: true, title: 'Gridlock Cleared', msg: `All ${LEVELS.length} puzzles solved` }); } else load(); } return; }
        if (st !== 'play') return;
        const p = E.ptr;
        if (p.hit) { const c = carAt(p.x, p.y); if (c) { const [lo, hi] = range(c); drag = { c, lo, hi, start: c.h ? p.x : p.y, f0: c.f }; sel = cars.indexOf(c); E.sfx('tick', 1.3, 0.3); } }
        if (drag) {
          const c = drag.c, d = ((c.h ? p.x : p.y) - drag.start) / S;
          c.f = U.clamp(drag.f0 + d, drag.lo, drag.hi);
          if (!p.down) { const v = Math.round(c.f); drag = null; commit(c, v); }
        }
        // keyboard
        if (E.hit('Tab') || E.hit('Space')) { sel = (sel + 1) % cars.length; E.sfx('tick', 1.3, 0.3); }
        const c = cars[sel];
        if (c && !drag) {
          const [lo, hi] = range(c), v = c.h ? c.col : c.row;
          if (c.h) { if (E.hit('L') && v > lo) commit(c, v - 1); if (E.hit('R') && v < hi) commit(c, v + 1); }
          else { if (E.hit('U') && v > lo) commit(c, v - 1); if (E.hit('D') && v < hi) commit(c, v + 1); }
        }
        if (E.hit('KeyZ', 'Backspace') && hist.length) { const h = hist.pop(); if (h.c.h) h.c.col = h.v; else h.c.row = h.v; moves++; E.stat('Moves', moves); E.sfx('whoosh', 1.4, 0.3); }
        if (E.hit('KeyR')) { load(false); E.sfx('whoosh'); }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#1f2937', '#030712');
        // lot
        D.shadow(g, W / 2, GY + 6 * S + 14, 3 * S + 20, 14, 0.5);
        D.fillRR(g, GX - 16, GY - 16, 6 * S + 32, 6 * S + 32, 18, '#52525b');
        D.fillRR(g, GX - 6, GY - 6, 6 * S + 12, 6 * S + 12, 10, '#27272a');
        // exit gap
        g.fillStyle = '#27272a'; g.fillRect(GX + 6 * S, GY + 2 * S + 6, 30, S - 12);
        for (let i = 0; i < 3; i++) { const a = 0.3 + 0.5 * Math.max(0, Math.sin(t * 4 - i)); D.poly(g, [[GX + 6 * S + 36 + i * 16, GY + 2.5 * S - 10], [GX + 6 * S + 46 + i * 16, GY + 2.5 * S], [GX + 6 * S + 36 + i * 16, GY + 2.5 * S + 10]], `rgba(74,222,128,${a})`); }
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; g.strokeRect(GX + x * S + 4, GY + y * S + 4, S - 8, S - 8); }
        g.setLineDash([12, 10]); D.line(g, GX, GY + 2.5 * S, GX + 6 * S, GY + 2.5 * S, 'rgba(250,204,21,.15)', 3); g.setLineDash([]);
        // cars
        for (const c of cars) {
          const x = GX + (c.h ? c.f : c.col) * S + (c.red ? exitX : 0), y = GY + (c.h ? c.row : c.f) * S, w = c.h ? c.len * S : S, h = c.h ? S : c.len * S;
          vehicle(g, c, x, y, w, h, t);
          if (cars[sel] === c && st === 'play' && E.ptr.type !== 'mouse' && E.ptr.type !== 'touch') D.strokeRR(g, x + 4, y + 4, w - 8, h - 8, 12, `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 6)})`, 3);
        }
        D.text(g, `PUZZLE ${lv + 1}`, 40, 40, { size: 20, align: 'left', color: '#fca5a5' });
        D.text(g, `moves ${moves} · par ${par}`, 40, 66, { size: 13, align: 'left', font: 'mono', color: 'rgba(255,255,255,.5)' });
        D.text(g, 'Z undo · R reset', W - 40, 40, { size: 13, align: 'right', font: 'mono', color: 'rgba(255,255,255,.4)' });
      },
    };
    function vehicle(g, c, x, y, w, h, t) {
      const m = 8;
      g.save(); g.translate(x + w / 2, y + h / 2); if (!c.h) g.rotate(Math.PI / 2);
      const L = (c.h ? w : h) - 2 * m, Wd = S - 2 * m - 6;
      D.shadow(g, 3, 6, L / 2, Wd / 2, 0.45);
      // wheels
      g.fillStyle = '#0a0a0a'; for (const sx of [-1, 1]) for (const sy of [-1, 1]) D.fillRR(g, sx * (L / 2 - 20) - 9, sy * (Wd / 2) - 5, 18, 10, 3, '#0a0a0a');
      const body = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); body.addColorStop(0, U.shade(c.color, 0.35)); body.addColorStop(0.5, c.color); body.addColorStop(1, U.shade(c.color, -0.35));
      D.fillRR(g, -L / 2, -Wd / 2, L, Wd, 14, body);
      if (c.truck) {
        D.fillRR(g, -L / 2 + 6, -Wd / 2 + 6, L * 0.62, Wd - 12, 6, U.shade(c.color, -0.15));
        for (let i = 1; i < 5; i++) D.line(g, -L / 2 + 6 + (L * 0.62 * i) / 5, -Wd / 2 + 8, -L / 2 + 6 + (L * 0.62 * i) / 5, Wd / 2 - 8, 'rgba(0,0,0,.15)', 2);
        D.fillRR(g, L / 2 - L * 0.3, -Wd / 2 + 8, L * 0.12, Wd - 16, 4, '#bae6fd');
      } else {
        D.fillRR(g, -L * 0.28, -Wd / 2 + 7, L * 0.56, Wd - 14, 8, U.shade(c.color, -0.2));
        D.fillRR(g, L * 0.14, -Wd / 2 + 9, L * 0.12, Wd - 18, 4, '#bae6fd');
        D.fillRR(g, -L * 0.28, -Wd / 2 + 9, L * 0.09, Wd - 18, 4, '#7dd3fc');
      }
      D.circle(g, L / 2 - 5, -Wd / 2 + 8, 4, '#fef9c3'); D.circle(g, L / 2 - 5, Wd / 2 - 8, 4, '#fef9c3');
      D.fillRR(g, -L / 2 + 1, -Wd / 2 + 6, 4, 8, 2, '#dc2626'); D.fillRR(g, -L / 2 + 1, Wd / 2 - 14, 4, 8, 2, '#dc2626');
      if (c.red) { D.glow(g, 0, 0, L * 0.7, '#ef4444', 0.25 + 0.1 * Math.sin(t * 4)); D.star(g, -L * 0.05, 0, 9, 4, 5, -Math.PI / 2, '#fde047'); }
      g.restore();
    }
  },
});

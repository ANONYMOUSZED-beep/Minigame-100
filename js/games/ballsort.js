MG.add({
  id: 'ballsort', name: 'Ball Sort', cat: 'Puzzle', color: '#a78bfa', color2: '#f472b6',
  desc: 'Sort the coloured balls so each tube holds one colour. Every level is solver-checked, so there is always a way.',
  how: ['Click / tap a tube to lift its top ball, then tap another tube to drop it', 'A ball can only land on the same colour, or in an empty tube', '<kbd>Z</kbd> undo · <kbd>R</kbd> restart · one extra tube per level with <kbd>T</kbd>', 'Keys: <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd>, <kbd>-</kbd> select tubes'],
  pad: false,
  make(E) {
    const W = 960, H = 600, CAP = 4, BR = 22;
    const PAL = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#e5e7eb', '#78350f'];
    const COLS = [3, 4, 5, 5, 6, 7, 7, 8, 9, 9];
    let lv = -1, tubes, start, sel = -1, hist, moves, extraUsed, flying = null, st = 'play', stT = 0, T = 0, doneT = [];
    function solvable(tb) {
      const seen = new Set(); let nodes = 0;
      const key = (s) => s.map((t) => t.join('')).sort().join('|');
      const solved = (s) => s.every((t) => t.length === 0 || (t.length === CAP && t.every((b) => b === t[0])));
      function dfs(s) {
        if (solved(s)) return true;
        if (++nodes > 40000) return false;
        const k = key(s); if (seen.has(k)) return false; seen.add(k);
        for (let i = 0; i < s.length; i++) {
          const a = s[i]; if (!a.length) continue;
          const top = a[a.length - 1], uniform = a.every((b) => b === top);
          if (uniform && a.length === CAP) continue;
          let emptyTried = false;
          for (let j = 0; j < s.length; j++) {
            if (i === j) continue;
            const b = s[j];
            if (b.length >= CAP) continue;
            if (b.length && b[b.length - 1] !== top) continue;
            if (!b.length) { if (uniform || emptyTried) continue; emptyTried = true; }
            const n = s.map((t) => t.slice()); n[j].push(n[i].pop());
            if (dfs(n)) return true;
          }
        }
        return false;
      }
      return dfs(tb.map((t) => t.slice()));
    }
    function load(next = true) {
      if (next) {
        lv++;
        const nc = COLS[Math.min(lv, COLS.length - 1)];
        for (let tries = 0; tries < 60; tries++) {
          const balls = U.shuffle(U.range(nc).flatMap((c) => [c, c, c, c]));
          const tb = U.range(nc).map((i) => balls.slice(i * CAP, i * CAP + CAP)).concat([[], []]);
          if (tb.some((t) => t.length === CAP && t.every((b) => b === t[0]))) continue;
          start = tb; if (solvable(tb)) break;
        }
      }
      tubes = start.map((t) => t.slice()); sel = -1; hist = []; moves = 0; extraUsed = false; st = 'play'; flying = null; doneT = tubes.map(() => 0);
      E.stat('Level', `${lv + 1}/${COLS.length}`); E.stat('Moves', 0);
      if (next) E.banner(`LEVEL ${lv + 1}`, `${COLS[Math.min(lv, COLS.length - 1)]} colours`, { color: '#a78bfa', life: 1.1 });
    }
    load();
    const layout = () => {
      const n = tubes.length, perRow = n > 9 ? Math.ceil(n / 2) : n, rows = Math.ceil(n / perRow), tw = 70, gap = Math.min(40, (W - 100 - perRow * tw) / Math.max(1, perRow - 1));
      const th = CAP * BR * 2 + 34;
      return tubes.map((_, i) => { const r = Math.floor(i / perRow), c = i % perRow, cnt = Math.min(perRow, n - r * perRow), x0 = (W - (cnt * tw + (cnt - 1) * gap)) / 2; return { x: x0 + c * (tw + gap), y: rows === 1 ? 180 : 70 + r * (th + 50), w: tw, h: th }; });
    };
    const complete = (t) => t.length === CAP && t.every((b) => b === t[0]);
    function tap(i) {
      if (st !== 'play' || flying) return;
      if (sel < 0) { if (tubes[i].length && !complete(tubes[i])) { sel = i; E.sfx('tick', 1.4, 0.5); } else if (tubes[i].length) E.sfx('tick', 0.7, 0.3); return; }
      if (sel === i) { sel = -1; E.sfx('tick', 0.9, 0.4); return; }
      const a = tubes[sel], b = tubes[i], top = a[a.length - 1];
      if (b.length >= CAP || (b.length && b[b.length - 1] !== top)) { E.sfx('error', 1.3, 0.4); sel = i === sel ? -1 : (tubes[i].length && !complete(tubes[i]) ? i : -1); return; }
      const L = layout(), from = L[sel], to = L[i];
      hist.push(tubes.map((t) => t.slice()));
      a.pop(); flying = { c: top, from: sel, to: i, t: 0, x0: from.x + from.w / 2, y0: from.y - 30, x1: to.x + to.w / 2, y1: to.y + to.h - 18 - BR - b.length * BR * 2 };
      sel = -1; moves++; E.stat('Moves', moves); E.sfx('whoosh', 1.6, 0.3);
    }
    function land() {
      const f = flying; tubes[f.to].push(f.c); flying = null;
      E.sfx('click', 1 + tubes[f.to].length * 0.1, 0.6);
      if (complete(tubes[f.to])) { doneT[f.to] = 1; E.sfx('match', 1.1); const L = layout()[f.to]; E.burst(L.x + L.w / 2, L.y + 10, { n: 20, colors: [PAL[f.c], '#fff'], speed: 200 }); }
      if (tubes.every((t) => !t.length || complete(t))) {
        st = 'won'; stT = 1.8;
        const nc = COLS[Math.min(lv, COLS.length - 1)], pts = nc * 100 + Math.max(0, 300 - moves * 5) + (extraUsed ? 0 : 150);
        E.score += pts; E.sfx('win'); E.banner('SORTED!', `${moves} moves · +${pts}`, { color: '#4ade80', life: 1.6 });
      }
    }
    return {
      update(dt) {
        T += dt; for (let i = 0; i < doneT.length; i++) doneT[i] = Math.max(0, doneT[i] - dt * 0.8);
        if (flying) { flying.t += dt / 0.32; if (flying.t >= 1) land(); }
        if (st === 'won') { stT -= dt; if (stT <= 0) { if (lv >= COLS.length - 1) { st = 'done'; E.over({ win: true, title: 'Perfectly Sorted', msg: `All ${COLS.length} levels solved` }); } else load(); } return; }
        if (st !== 'play') return;
        if (E.ptr.hit) layout().forEach((r, i) => { if (U.ptInRect(E.ptr.x, E.ptr.y, r.x - 10, r.y - 40, r.w + 20, r.h + 50)) tap(i); });
        const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];
        KEYS.forEach((k, i) => { if (i < tubes.length && E.hit(k)) tap(i); });
        if (E.hit('KeyZ', 'KeyU', 'Backspace') && hist.length && !flying) { tubes = hist.pop(); sel = -1; moves++; E.stat('Moves', moves); E.sfx('whoosh', 0.8, 0.4); }
        if (E.hit('KeyR')) { load(false); E.sfx('whoosh'); }
        if (E.hit('KeyT') && !extraUsed) { extraUsed = true; tubes.push([]); doneT.push(0); E.sfx('power'); E.pop(W / 2, 540, 'extra tube', { color: '#a78bfa', size: 18 }); }
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#2e1065', '#0b0616');
        const L = layout();
        tubes.forEach((tb, i) => {
          const r = L[i], lift = sel === i;
          D.shadow(g, r.x + r.w / 2, r.y + r.h + 6, r.w * 0.55, 8, 0.4);
          if (doneT[i] > 0) D.glow(g, r.x + r.w / 2, r.y + r.h / 2, r.h * 0.7, PAL[tb[0]] || '#fff', doneT[i] * 0.6);
          // glass
          g.save(); D.rr(g, r.x, r.y, r.w, r.h, 30); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); g.strokeStyle = complete(tb) ? 'rgba(134,239,172,.8)' : 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(r.x + 8, r.y + 10, 6, r.h - 40);
          g.restore();
          D.fillRR(g, r.x - 6, r.y - 6, r.w + 12, 10, 5, 'rgba(255,255,255,.25)');
          tb.forEach((c, k) => {
            let y = r.y + r.h - 18 - BR - k * BR * 2, x = r.x + r.w / 2;
            if (lift && k === tb.length - 1) y = r.y - 30 + Math.sin(t * 6) * 3;
            ball(g, x, y, c);
          });
          D.text(g, i < 9 ? i + 1 : i === 9 ? 0 : i === 10 ? '-' : '=', r.x + r.w / 2, r.y + r.h + 22, { size: 12, font: 'mono', color: 'rgba(255,255,255,.25)' });
        });
        if (flying) { const k = U.ease.inOutQuad(Math.min(1, flying.t)); const x = U.lerp(flying.x0, flying.x1, k), y = U.lerp(flying.y0, flying.y1, k) - Math.sin(k * Math.PI) * 80; ball(g, x, y, flying.c); }
        D.text(g, `LEVEL ${lv + 1}`, 30, 34, { size: 20, align: 'left', color: '#c4b5fd' });
        D.text(g, 'Z undo · R restart · T extra tube', W - 30, 34, { size: 13, align: 'right', font: 'mono', color: extraUsed ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.5)' });
      },
    };
    function ball(g, x, y, c) { D.shadow(g, x + 2, y + 4, BR * 0.9, BR * 0.4, 0.25); D.orb(g, x, y, BR - 1, PAL[c], 0.55); D.circle(g, x - BR * 0.35, y - BR * 0.4, BR * 0.2, 'rgba(255,255,255,.7)'); }
  },
});

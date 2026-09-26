MG.add({
  id: 'untangle', name: 'Untangle', cat: 'Puzzle', color: '#4ade80', color2: '#f43f5e',
  desc: 'A knot of crossing lines hides a perfectly flat graph. Drag the nodes until no two lines cross.',
  how: ['Drag the nodes around', 'Red lines are crossing something · green lines are clear', 'Remove every crossing to solve the graph', 'Every graph is guaranteed solvable — five of them, each bigger than the last'],
  pad: false,
  make(E) {
    const W = 960, H = 600, NL = [4, 5, 6, 7, 8];
    let lv = -1, V, Ed, drag = null, crossE, crossN = 0, st = 'play', stT = 0, time = 0, T = 0, hover = -1, solvedT = 0;
    function load() {
      lv++; const n = NL[lv];
      // n random lines in general position; vertices at pairwise intersections, edges between neighbours along each line
      let lines, pts, ok;
      do {
        lines = U.range(n).map(() => { const a = U.rand(Math.PI); return { px: U.rand(-1, 1), py: U.rand(-1, 1), dx: Math.cos(a), dy: Math.sin(a) }; });
        pts = []; ok = true;
        const onLine = lines.map(() => []);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = lines[i], b = lines[j], den = a.dx * b.dy - a.dy * b.dx;
          if (Math.abs(den) < 0.08) { ok = false; break; }
          const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / den, u = ((b.px - a.px) * a.dy - (b.py - a.py) * a.dx) / den;
          const id = pts.length; pts.push([a.px + a.dx * t, a.py + a.dy * t]); onLine[i].push([t, id]); onLine[j].push([u, id]);
        }
        if (ok) { Ed = []; for (const L of onLine) { L.sort((p, q) => p[0] - q[0]); for (let k = 0; k + 1 < L.length; k++) Ed.push([L[k][1], L[k + 1][1]]); } }
      } while (!ok);
      const order = U.shuffle(U.range(pts.length)), R = 230;
      V = pts.map((_, i) => { const a = (order[i] / pts.length) * U.TAU - Math.PI / 2; const x = W / 2 + Math.cos(a) * R * 1.35, y = H / 2 + 10 + Math.sin(a) * R; return { x, y, tx: x, ty: y, pop: 0 }; });
      // start from the centre and fly out
      for (const v of V) { v.x = W / 2; v.y = H / 2; }
      time = 0; st = 'play'; solvedT = 0;
      E.stat('Graph', `${lv + 1}/${NL.length}`);
      E.banner(`GRAPH ${lv + 1}`, `${V.length} nodes · ${Ed.length} lines`, { color: '#4ade80', life: 1.2 });
    }
    load();
    function crossings() {
      crossE = new Array(Ed.length).fill(false); let c = 0;
      for (let i = 0; i < Ed.length; i++) for (let j = i + 1; j < Ed.length; j++) {
        const [a, b] = Ed[i], [p, q] = Ed[j];
        if (a === p || a === q || b === p || b === q) continue;
        if (U.segIntersect(V[a].tx, V[a].ty, V[b].tx, V[b].ty, V[p].tx, V[p].ty, V[q].tx, V[q].ty)) { crossE[i] = crossE[j] = true; c++; }
      }
      return c;
    }
    crossN = crossings();
    return {
      update(dt) {
        T += dt;
        for (const v of V) { v.x = U.damp(v.x, v.tx, drag && V[drag.i] === v ? 40 : 9, dt); v.y = U.damp(v.y, v.ty, drag && V[drag.i] === v ? 40 : 9, dt); v.pop = Math.max(0, v.pop - dt * 4); }
        if (st === 'won') { solvedT += dt; stT -= dt; if (stT <= 0) { if (lv >= NL.length - 1) { st = 'done'; E.over({ win: true, title: 'Untangled!', msg: `All ${NL.length} graphs flattened` }); } else { load(); crossN = crossings(); } } return; }
        time += dt;
        const p = E.ptr;
        hover = -1; let bd = 26;
        V.forEach((v, i) => { const d = U.dist(p.x, p.y, v.tx, v.ty); if (d < bd) { bd = d; hover = i; } });
        if (p.hit && hover >= 0) { drag = { i: hover, ox: V[hover].tx - p.x, oy: V[hover].ty - p.y }; V[hover].pop = 1; E.sfx('tick', 1.4, 0.4); }
        if (drag) {
          const v = V[drag.i]; v.tx = U.clamp(p.x + drag.ox, 20, W - 20); v.ty = U.clamp(p.y + drag.oy, 20, H - 20);
          const c = crossings();
          if (c < crossN) E.tone({ f: 500 + Math.max(0, 20 - c) * 30, dur: 0.05, type: 'triangle', vol: 0.1 });
          crossN = c;
          if (!p.down) {
            drag = null; E.sfx('place', 1.2, 0.4);
            if (crossN === 0) {
              st = 'won'; stT = 2.2;
              const pts = V.length * 50 + Math.max(0, Math.round((V.length * 8 - time) * 10));
              E.score += pts; E.sfx('win');
              E.banner('UNTANGLED!', `${Math.round(time)}s · +${pts}`, { color: '#4ade80', life: 2 });
              for (const v of V) E.burst(v.x, v.y, { n: 6, colors: ['#4ade80', '#fff'], speed: 120 });
            }
          }
        }
        E.stat('Crossings', crossN);
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#10231a', '#030806');
        D.grid(g, W, H, 40, 'rgba(74,222,128,.04)');
        // edges
        g.lineCap = 'round';
        Ed.forEach(([a, b], i) => {
          const bad = crossE[i], hl = drag && (a === drag.i || b === drag.i);
          const col = st === 'won' ? `hsl(${(t * 120 + i * 12) % 360},80%,60%)` : bad ? '#f43f5e' : '#4ade80';
          D.line(g, V[a].x, V[a].y, V[b].x, V[b].y, U.rgba(bad ? '#f43f5e' : '#4ade80', 0.18), 9);
          D.line(g, V[a].x, V[a].y, V[b].x, V[b].y, col, hl ? 4 : 2.5);
        });
        // nodes
        V.forEach((v, i) => {
          const r = 13 * (1 + v.pop * 0.3) + (hover === i && !drag ? 2 : 0);
          D.glow(g, v.x, v.y, r * 2.4, drag && drag.i === i ? '#fde047' : '#4ade80', 0.35);
          D.orb(g, v.x, v.y, r, drag && drag.i === i ? '#facc15' : '#e2e8f0', 0.6);
        });
        D.text(g, st === 'won' ? 'FLAT!' : `${crossN} crossing${crossN === 1 ? '' : 's'}`, 30, 36, { size: 22, align: 'left', color: crossN ? '#fda4af' : '#86efac' });
        D.text(g, `${U.fmtTime(time, 0)}s`, W - 30, 36, { size: 18, align: 'right', font: 'mono', color: 'rgba(255,255,255,.6)' });
      },
    };
  },
});

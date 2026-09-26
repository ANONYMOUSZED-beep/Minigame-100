MG.add({
  id: 'flightctl', name: 'Flight Control', cat: 'Strategy', color: '#38bdf8', color2: '#f43f5e',
  desc: 'You are the tower. Draw flight paths to bring every aircraft down on its matching runway — and never let two collide.',
  how: ['Drag from an aircraft to draw its flight path', 'Red jets → red runway · yellow props → yellow runway · blue choppers → helipad', 'Runways must be entered from the arrow end · helicopters land from any side', 'Warning rings mean two aircraft are too close — reroute fast!'],
  pad: false, scoreLabel: 'Landed',
  make(E) {
    const W = 960, H = 600;
    const PADS = [
      { type: 0, x: 400, y: 300, ang: 0, len: 270, w: 40, col: '#f43f5e' },
      { type: 1, x: 600, y: 180, ang: Math.PI / 2 + 0.5, len: 200, w: 32, col: '#facc15' },
      { type: 2, x: 700, y: 420, r: 34, col: '#38bdf8', heli: true },
    ];
    const KIND = [{ col: '#f43f5e', sp: 42, r: 15 }, { col: '#facc15', sp: 58, r: 12 }, { col: '#38bdf8', sp: 30, r: 12 }];
    let planes = [], spawnT = 2, el = 0, drawing = null, st = 'play', T = 0, incoming = [], crashAt = null, landed = 0;
    const fields = U.range(16).map((i) => ({ x: (i * 211 + 60) % W, y: (i * 137 + 40) % H, w: U.rand(90, 170), h: U.rand(60, 120), a: U.rand(-0.3, 0.3), c: U.pick(['#65a30d', '#4d7c0f', '#84cc16', '#a16207', '#ca8a04']) }));
    const clouds = U.range(7).map(() => ({ x: U.rand(W), y: U.rand(H), s: U.rand(0.6, 1.4), v: U.rand(4, 10) }));
    function entryPoint() {
      const side = U.ri(0, 3), m = 40;
      if (side === 0) return [U.rand(m, W - m), -30, Math.PI / 2 + U.rand(-0.5, 0.5)];
      if (side === 1) return [W + 30, U.rand(m, H - m), Math.PI + U.rand(-0.5, 0.5)];
      if (side === 2) return [U.rand(m, W - m), H + 30, -Math.PI / 2 + U.rand(-0.5, 0.5)];
      return [-30, U.rand(m, H - m), U.rand(-0.5, 0.5)];
    }
    function spawn() {
      const type = el < 20 ? U.ri(0, 1) : U.ri(0, 2), [x, y, a] = entryPoint();
      incoming.push({ x: U.clamp(x, 18, W - 18), y: U.clamp(y, 18, H - 18), t: 2, plane: { type, x, y, a, path: [], landing: 0, id: Math.random() } });
      E.sfx('blip', 0.8, 0.4);
    }
    function runwayEnd(p) { return [p.x - Math.cos(p.ang) * p.len / 2, p.y - Math.sin(p.ang) * p.len / 2]; }
    function inLanding(pl, x, y) {
      const pad = PADS[pl.type];
      if (pad.heli) return U.dist(x, y, pad.x, pad.y) < pad.r;
      const [ex, ey] = runwayEnd(pad);
      return U.dist(x, y, ex, ey) < 26;
    }
    function crash(a, b) {
      st = 'crash'; crashAt = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      E.sfx('boom'); E.shake(20); E.flash('#f97316', 0.6);
      E.burst(crashAt[0], crashAt[1], { n: 80, colors: ['#fde68a', '#f97316', '#ef4444', '#111'], speed: 380, life: 1.2 });
      E.after(1.8, () => E.over({ title: 'Mid-Air Collision', msg: `${landed} aircraft landed safely` }));
    }
    return {
      update(dt) {
        T += dt;
        for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 100) c.x = -100; }
        if (st !== 'play') return;
        el += dt;
        spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(2.2, 7 - el * 0.05) * U.rand(0.7, 1.2); }
        for (const inc of incoming) { inc.t -= dt; if (inc.t <= 0) planes.push(inc.plane); }
        incoming = incoming.filter((i) => i.t > 0);
        // drawing paths
        const p = E.ptr;
        if (p.hit) { let best = null, bd = 42; for (const pl of planes) { if (pl.landing) continue; const d = U.dist(p.x, p.y, pl.x, pl.y); if (d < bd) { bd = d; best = pl; } } if (best) { drawing = best; best.path = [[p.x, p.y]]; best.ok = false; E.sfx('tick', 1.3, 0.4); } }
        if (drawing && p.down) {
          const pl = drawing, last = pl.path[pl.path.length - 1];
          if (!pl.ok && U.dist(last[0], last[1], p.x, p.y) > 10) {
            pl.path.push([p.x, p.y]);
            if (inLanding(pl, p.x, p.y)) { pl.ok = true; const pad = PADS[pl.type]; if (!pad.heli) { const [ex, ey] = runwayEnd(pad); pl.path.push([ex, ey], [pad.x + Math.cos(pad.ang) * pad.len * 0.3, pad.y + Math.sin(pad.ang) * pad.len * 0.3]); } else pl.path.push([pad.x, pad.y]); E.sfx('select', 1.2, 0.5); }
          }
        }
        if (!p.down) drawing = null;
        // flight
        for (const pl of planes) {
          const k = KIND[pl.type];
          if (pl.landing) { pl.landing += dt; const pad = PADS[pl.type]; if (!pad.heli) { pl.x += Math.cos(pl.a) * k.sp * 0.7 * dt; pl.y += Math.sin(pl.a) * k.sp * 0.7 * dt; } if (pl.landing > 1.6) pl.gone = true; continue; }
          if (pl.path.length) {
            const [tx, ty] = pl.path[0], d = U.dist(pl.x, pl.y, tx, ty);
            if (d < 8) { pl.path.shift(); if (!pl.path.length && pl.ok) { pl.landing = 0.001; landed++; E.score = landed; E.sfx('coin', 1 + (landed % 5) * 0.08); E.pop(pl.x, pl.y - 26, '+1', { color: KIND[pl.type].col, size: 20 }); } }
            else { const want = Math.atan2(ty - pl.y, tx - pl.x); pl.a += U.clamp(U.angDiff(pl.a, want), -4 * dt, 4 * dt); }
          } else {
            // keep aircraft on screen by turning back inward
            if ((pl.x < 20 && Math.cos(pl.a) < 0) || (pl.x > W - 20 && Math.cos(pl.a) > 0)) pl.a = Math.PI - pl.a;
            if ((pl.y < 20 && Math.sin(pl.a) < 0) || (pl.y > H - 20 && Math.sin(pl.a) > 0)) pl.a = -pl.a;
          }
          pl.x += Math.cos(pl.a) * k.sp * dt; pl.y += Math.sin(pl.a) * k.sp * dt;
        }
        planes = planes.filter((q) => !q.gone);
        // proximity
        for (const a of planes) a.warn = false;
        for (let i = 0; i < planes.length; i++) for (let j = i + 1; j < planes.length; j++) {
          const a = planes[i], b = planes[j]; if (a.landing || b.landing) continue;
          const d = U.dist(a.x, a.y, b.x, b.y);
          if (d < KIND[a.type].r + KIND[b.type].r - 2) { crash(a, b); return; }
          if (d < 70) { a.warn = b.warn = true; }
        }
        if (planes.some((q) => q.warn) && Math.floor(T * 4) !== Math.floor((T - dt) * 4)) E.sfx('blip', 1.6, 0.3);
        E.stat('Airborne', planes.filter((q) => !q.landing).length);
      },
      draw(g) {
        const t = T;
        // terrain
        D.bg(g, W, H, '#3f6212', '#365314');
        for (const f of fields) { g.save(); g.translate(f.x, f.y); g.rotate(f.a); g.fillStyle = f.c; g.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; for (let k = -f.w / 2 + 8; k < f.w / 2; k += 10) { g.beginPath(); g.moveTo(k, -f.h / 2); g.lineTo(k, f.h / 2); g.stroke(); } g.strokeStyle = 'rgba(20,83,45,.6)'; g.lineWidth = 3; g.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h); g.restore(); }
        g.strokeStyle = '#a8a29e'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 540); g.bezierCurveTo(300, 500, 500, 580, W, 520); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5; g.setLineDash([10, 10]); g.stroke(); g.setLineDash([]);
        // airport grounds
        D.fillRR(g, 230, 110, 580, 380, 40, 'rgba(77,124,15,.94)'); D.strokeRR(g, 230, 110, 580, 380, 40, 'rgba(255,255,255,.25)', 2);
        D.fillRR(g, 430, 350, 170, 70, 10, '#64748b'); D.fillRR(g, 440, 356, 150, 12, 4, '#94a3b8'); D.text(g, 'TOWER', 515, 395, { size: 12, font: 'mono', color: 'rgba(255,255,255,.6)' });
        // runways
        for (const pad of PADS) {
          if (pad.heli) {
            D.circle(g, pad.x, pad.y, pad.r + 10, '#334155'); D.circle(g, pad.x, pad.y, pad.r, '#1e293b', pad.col, 3);
            D.text(g, 'H', pad.x, pad.y + 2, { size: 30, color: pad.col });
            continue;
          }
          g.save(); g.translate(pad.x, pad.y); g.rotate(pad.ang);
          D.fillRR(g, -pad.len / 2 - 6, -pad.w / 2 - 6, pad.len + 12, pad.w + 12, 6, '#475569');
          D.fillRR(g, -pad.len / 2, -pad.w / 2, pad.len, pad.w, 4, '#1e293b');
          g.fillStyle = '#e2e8f0'; for (let x = -pad.len / 2 + 30; x < pad.len / 2 - 20; x += 26) g.fillRect(x, -1.5, 14, 3);
          g.fillStyle = pad.col; g.fillRect(-pad.len / 2, -pad.w / 2, 10, pad.w);
          for (let k = 0; k < 3; k++) { const a = 0.35 + 0.5 * Math.max(0, Math.sin(t * 4 - k)); D.poly(g, [[-pad.len / 2 - 44 + k * 12, -8], [-pad.len / 2 - 34 + k * 12, 0], [-pad.len / 2 - 44 + k * 12, 8]], U.rgba(pad.col, a)); }
          g.restore();
          const [ex, ey] = runwayEnd(pad); D.circle(g, ex, ey, 26, null, U.rgba(pad.col, 0.25), 2);
        }
        // paths
        for (const pl of planes) {
          if (!pl.path.length) continue;
          g.save(); g.setLineDash([6, 8]); g.lineDashOffset = -t * 30; g.lineCap = 'round';
          g.beginPath(); g.moveTo(pl.x, pl.y); for (const [x, y] of pl.path) g.lineTo(x, y);
          g.strokeStyle = pl.ok ? U.rgba(KIND[pl.type].col, 0.9) : 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.stroke(); g.restore();
        }
        // aircraft (shadow then body)
        for (const pl of planes) {
          const k = KIND[pl.type], land = pl.landing ? Math.min(1, pl.landing / 1.6) : 0, sc = 1 - land * 0.45, alt = (1 - land) * 10;
          D.shadow(g, pl.x + alt, pl.y + alt, k.r * sc, k.r * 0.5 * sc, 0.3);
          g.save(); g.translate(pl.x, pl.y); g.rotate(pl.a); g.scale(sc, sc); g.globalAlpha = pl.landing ? 1 - Math.max(0, land - 0.7) / 0.3 : 1;
          if (pl.type === 2) { D.fillRR(g, -12, -7, 22, 14, 7, k.col); D.line(g, -12, 0, -24, 0, k.col, 3); const rr = t * 30; D.line(g, Math.cos(rr) * 18, Math.sin(rr) * 18, -Math.cos(rr) * 18, -Math.sin(rr) * 18, 'rgba(226,232,240,.8)', 2.5); D.line(g, Math.cos(rr + 1.57) * 18, Math.sin(rr + 1.57) * 18, -Math.cos(rr + 1.57) * 18, -Math.sin(rr + 1.57) * 18, 'rgba(226,232,240,.8)', 2.5); }
          else {
            const r = k.r;
            D.poly(g, [[r * 1.3, 0], [r * 0.6, -r * 0.22], [-r * 1.1, -r * 0.22], [-r * 1.3, 0], [-r * 1.1, r * 0.22], [r * 0.6, r * 0.22]], k.col, '#0f172a', 1.5);
            D.poly(g, [[r * 0.3, 0], [-r * 0.2, -r * 1.2], [-r * 0.5, -r * 1.2], [-r * 0.3, 0], [-r * 0.5, r * 1.2], [-r * 0.2, r * 1.2]], U.shade(k.col, -0.15), '#0f172a', 1.5);
            D.poly(g, [[-r * 0.9, 0], [-r * 1.2, -r * 0.5], [-r * 1.35, -r * 0.5], [-r * 1.25, 0], [-r * 1.35, r * 0.5], [-r * 1.2, r * 0.5]], U.shade(k.col, -0.2));
          }
          g.restore(); g.globalAlpha = 1;
          if (pl.warn) D.circle(g, pl.x, pl.y, 30 + Math.sin(t * 16) * 3, null, '#ef4444', 2.5);
          if (drawing === pl) D.circle(g, pl.x, pl.y, 26, null, '#fff', 2);
        }
        // incoming indicators
        for (const inc of incoming) { const k = KIND[inc.plane.type]; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 10); D.circle(g, inc.x, inc.y, 14, 'rgba(0,0,0,.4)', k.col, 2.5); D.text(g, '!', inc.x, inc.y + 1, { size: 16, color: k.col }); g.globalAlpha = 1; }
        // clouds
        for (const c of clouds) { g.fillStyle = 'rgba(255,255,255,.16)'; for (const [ox, oy, r] of [[0, 0, 40], [34, -10, 30], [60, 4, 36]]) { g.beginPath(); g.arc(c.x + ox * c.s, c.y + oy * c.s, r * c.s, 0, U.TAU); g.fill(); } }
        D.text(g, `${landed} landed`, 24, 32, { size: 20, align: 'left', color: '#fff', stroke: 'rgba(0,0,0,.4)', lw: 5 });
      },
    };
  },
});

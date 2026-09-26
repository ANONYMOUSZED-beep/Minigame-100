MG.add({
  id: 'cells', name: 'Cells', cat: 'Strategy', color: '#22d3ee', color2: '#a3e635', scoreLabel: 'Mass',
  desc: 'Eat or be eaten in a petri-dish arena of hungry AI cells. Split to strike, hide under viruses, and grow to the top of the board.',
  how: ['Your cell swims toward the mouse / finger (or steer with <kbd>WASD</kbd>)', 'Eat pellets and any cell clearly smaller than you', '<kbd>Space</kbd> splits you in two to lunge at prey — pieces re-merge after a while', 'Green viruses shatter big cells · lose every piece and it\'s over'],
  pad: 'LRUDA', padLabels: { A: 'SPLIT' },
  make(E) {
    const W = 960, H = 600, WS = 2800;
    const NAMES = ['Blobby', 'Nom', 'Zyg0te', 'Plasma', 'Mitosis', 'Amoeba', 'Pac', 'Gloop', 'Orbit', 'Virion', 'Cytosol', 'Tardi', 'Spore', 'Petri', 'Ribo', 'Vesicle', 'Flagella', 'Nucleus'];
    const HUES = [0, 30, 50, 90, 140, 180, 200, 220, 260, 290, 320, 340];
    const rOf = (m) => 4 + Math.sqrt(m) * 4.2;
    const speedOf = (m) => 270 / Math.pow(rOf(m), 0.32) * 2.2;
    let pellets = [], viruses = [], bots = [], me = [], ejects = [], T = 0, camX = WS / 2, camY = WS / 2, zoom = 1, over = false, maxMass = 20, splitCd = 0, eaten = 0;
    const pellet = () => ({ x: U.rand(20, WS - 20), y: U.rand(20, WS - 20), c: U.hsl(U.pick(HUES), 85, 60), r: U.rand(4, 6) });
    for (let i = 0; i < 650; i++) pellets.push(pellet());
    for (let i = 0; i < 14; i++) viruses.push({ x: U.rand(200, WS - 200), y: U.rand(200, WS - 200), m: 100, rot: U.rand(6) });
    const farSpot = () => { for (let k = 0; k < 30; k++) { const x = U.rand(100, WS - 100), y = U.rand(100, WS - 100); if (!me.length || me.every((c) => U.dist(c.x, c.y, x, y) > 650)) return [x, y]; } return [U.rand(100, WS - 100), U.rand(100, WS - 100)]; };
    const newBot = (m) => ({ ...(([x, y]) => ({ x, y }))(farSpot()), vx: 0, vy: 0, m: m || U.rand(12, 140), name: U.pick(NAMES), hue: U.pick(HUES), tx: WS / 2, ty: WS / 2, think: 0, bot: true });
    me.push({ x: WS / 2, y: WS / 2, vx: 0, vy: 0, m: 20, merge: 0, me: true });
    for (let i = 0; i < 20; i++) bots.push(newBot());
    const total = () => me.reduce((s, c) => s + c.m, 0);
    function move(c, tx, ty, dt) {
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), sp = speedOf(c.m) * Math.min(1, d / (rOf(c.m) * 1.5 + 20));
      const wvx = d > 1 ? (dx / d) * sp : 0, wvy = d > 1 ? (dy / d) * sp : 0;
      c.vx = U.damp(c.vx, wvx, 5, dt); c.vy = U.damp(c.vy, wvy, 5, dt);
      if (c.boost) { c.x += c.boost.x * dt; c.y += c.boost.y * dt; c.boost.x *= Math.exp(-dt * 5); c.boost.y *= Math.exp(-dt * 5); if (Math.hypot(c.boost.x, c.boost.y) < 20) c.boost = null; }
      c.x = U.clamp(c.x + c.vx * dt, 0, WS); c.y = U.clamp(c.y + c.vy * dt, 0, WS);
    }
    function split(tx, ty) {
      if (splitCd > 0 || me.length >= 12) return;
      const add = [];
      for (const c of me) {
        if (c.m < 34 || me.length + add.length >= 12) continue;
        c.m /= 2; const a = Math.atan2(ty - c.y, tx - c.x), r = rOf(c.m);
        add.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: c.vx, vy: c.vy, m: c.m, merge: 10 + c.m * 0.02, me: true, boost: { x: Math.cos(a) * 900, y: Math.sin(a) * 900 } });
        c.merge = 10 + c.m * 0.02;
      }
      if (add.length) { me.push(...add); splitCd = 0.5; E.sfx('pop', 0.7, 0.7); E.sfx('whoosh', 1.3, 0.4); }
    }
    function pop(c) { // virus shatters a big cell
      const pieces = Math.min(8, 12 - me.length + 1), each = c.m / pieces;
      c.m = each; c.merge = 14;
      for (let i = 1; i < pieces; i++) { const a = (i / pieces) * U.TAU; me.push({ x: c.x, y: c.y, vx: 0, vy: 0, m: each, merge: 14, me: true, boost: { x: Math.cos(a) * 700, y: Math.sin(a) * 700 } }); }
      E.sfx('explode', 1.4, 0.7); E.shake(8);
    }
    return {
      update(dt) {
        T += dt; splitCd = Math.max(0, splitCd - dt);
        if (over) return;
        // player target in world space
        let tx, ty; const ax = E.axis();
        const cx = me.reduce((s, c) => s + c.x * c.m, 0) / total(), cy = me.reduce((s, c) => s + c.y * c.m, 0) / total();
        if (ax.x || ax.y) { tx = cx + ax.x * 400; ty = cy + ax.y * 400; } else if (E.ptr.type) { tx = camX + (E.ptr.x - W / 2) / zoom; ty = camY + (E.ptr.y - H / 2) / zoom; } else { tx = cx; ty = cy; }
        if (E.hit('A')) split(tx, ty);
        for (const c of me) { move(c, tx, ty, dt); c.merge = Math.max(0, c.merge - dt); if (c.m > 60) c.m -= c.m * 0.0035 * dt; }
        // own cells: push apart while merge cooldown, merge afterwards
        for (let i = 0; i < me.length; i++) for (let j = i + 1; j < me.length; j++) {
          const a = me[i], b = me[j], d = U.dist(a.x, a.y, b.x, b.y), rr = rOf(a.m) + rOf(b.m);
          if (a.merge > 0 || b.merge > 0) { if (d < rr && d > 0.01 && !a.boost && !b.boost) { const push = (rr - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; } }
          else if (d < Math.max(rOf(a.m), rOf(b.m)) * 0.8) { a.m += b.m; b.m = 0; E.sfx('match', 0.8, 0.4); }
        }
        me = me.filter((c) => c.m > 0);
        // bots
        const all = () => me.concat(bots);
        for (const b of bots) {
          b.think -= dt;
          if (b.think <= 0) {
            b.think = U.rand(0.2, 0.4);
            let threat = null, prey = null, td = 1e9, pd = 1e9;
            for (const o of all()) { if (o === b) continue; const d = U.dist(b.x, b.y, o.x, o.y) - rOf(o.m); if (o.m > b.m * 1.25 && d < 380 && d < td) { td = d; threat = o; } if (b.m > o.m * 1.3 && d < 420 && d < pd) { pd = d; prey = o; } }
            if (threat) { b.tx = b.x + (b.x - threat.x) * 3; b.ty = b.y + (b.y - threat.y) * 3; }
            else if (prey) { b.tx = prey.x + prey.vx * 0.3; b.ty = prey.y + prey.vy * 0.3; }
            else { let best = null, bd = 1e9; for (let k = 0; k < pellets.length; k += 3) { const p = pellets[k], d = (p.x - b.x) ** 2 + (p.y - b.y) ** 2; if (d < bd) { bd = d; best = p; } } if (best) { b.tx = best.x; b.ty = best.y; } }
          }
          move(b, b.tx, b.ty, dt); if (b.m > 60) b.m -= b.m * 0.003 * dt;
        }
        // eating
        const cellsAll = all();
        for (const c of cellsAll) {
          const r = rOf(c.m);
          for (let k = pellets.length - 1; k >= 0; k--) { const p = pellets[k]; if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < r * r) { c.m += 1; pellets[k] = pellet(); if (c.me && Math.random() < 0.3) E.sfx('tick', 1.6 + Math.random() * 0.4, 0.15); } }
          for (const v of viruses) if (c.m > 125 && U.dist(c.x, c.y, v.x, v.y) < r - 20) { if (c.me) { pop(c); v.x = U.rand(200, WS - 200); v.y = U.rand(200, WS - 200); } else { c.m *= 0.55; v.x = U.rand(200, WS - 200); v.y = U.rand(200, WS - 200); } }
        }
        for (const a of cellsAll) for (const b of cellsAll) {
          if (a === b || a.m <= 0 || b.m <= 0 || (a.me && b.me)) continue;
          if (a.m > b.m * 1.25 && U.dist(a.x, a.y, b.x, b.y) < rOf(a.m) - rOf(b.m) * 0.4) {
            a.m += b.m;
            if (a.me) { eaten++; E.sfx('pop', 0.9); E.burst(W / 2 + (b.x - camX) * zoom, H / 2 + (b.y - camY) * zoom, { n: 16, color: U.hsl(b.hue || 180, 85, 60), speed: 200 }); E.pop(W / 2 + (a.x - camX) * zoom, H / 2 + (a.y - camY) * zoom - 30, `+${Math.round(b.m)}`, { color: '#a3e635', size: 20 }); }
            if (b.me) { E.sfx('hurt'); E.shake(10); }
            b.m = 0;
          }
        }
        me = me.filter((c) => c.m > 0);
        bots = bots.filter((c) => c.m > 0);
        while (bots.length < 20) bots.push(newBot(U.rand(12, 60 + T * 0.8)));
        if (!me.length) { over = true; E.sfx('lose'); E.over({ title: 'Eaten!', msg: `Peak mass ${Math.round(maxMass)} · ${eaten} cells eaten` }); return; }
        const tm = total(); maxMass = Math.max(maxMass, tm); E.score = Math.round(maxMass);
        E.stat('Now', Math.round(tm));
        // camera
        const ccx = me.reduce((s, c) => s + c.x * c.m, 0) / tm, ccy = me.reduce((s, c) => s + c.y * c.m, 0) / tm;
        camX = U.damp(camX, ccx, 6, dt); camY = U.damp(camY, ccy, 6, dt);
        const spread = Math.max(...me.map((c) => U.dist(c.x, c.y, ccx, ccy) + rOf(c.m)));
        zoom = U.damp(zoom, U.clamp(Math.min(1.15 - rOf(tm) / 500, 260 / spread), 0.35, 1.15), 2, dt);
        for (const v of viruses) v.rot += dt * 0.3;
      },
      draw(g) {
        const t = T;
        g.fillStyle = '#0b1120'; g.fillRect(0, 0, W, H);
        g.save(); g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-camX, -camY);
        // arena
        g.fillStyle = '#111a2e'; g.fillRect(0, 0, WS, WS);
        const x0 = camX - W / 2 / zoom, y0 = camY - H / 2 / zoom, x1 = camX + W / 2 / zoom, y1 = camY + H / 2 / zoom;
        g.strokeStyle = 'rgba(148,163,184,.08)'; g.lineWidth = 1 / zoom;
        g.beginPath(); for (let x = Math.max(0, Math.floor(x0 / 50) * 50); x <= Math.min(WS, x1); x += 50) { g.moveTo(x, Math.max(0, y0)); g.lineTo(x, Math.min(WS, y1)); } for (let y = Math.max(0, Math.floor(y0 / 50) * 50); y <= Math.min(WS, y1); y += 50) { g.moveTo(Math.max(0, x0), y); g.lineTo(Math.min(WS, x1), y); } g.stroke();
        g.strokeStyle = 'rgba(34,211,238,.35)'; g.lineWidth = 6; g.strokeRect(0, 0, WS, WS);
        const vis = (x, y, r) => x + r > x0 && x - r < x1 && y + r > y0 && y - r < y1;
        for (const p of pellets) if (vis(p.x, p.y, 8)) { g.fillStyle = p.c; g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * U.TAU; k ? g.lineTo(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r) : g.moveTo(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r); } g.fill(); }
        // cells sorted by mass so big ones draw on top
        const cellsAll = me.concat(bots).sort((a, b) => a.m - b.m);
        for (const c of cellsAll) {
          const r = rOf(c.m); if (!vis(c.x, c.y, r)) continue;
          const col = c.me ? '#22d3ee' : U.hsl(c.hue, 80, 58), edge = c.me ? '#0e7490' : U.hsl(c.hue, 70, 38);
          g.beginPath();
          const n = 40, wob = Math.min(3, r * 0.04);
          for (let k = 0; k <= n; k++) { const a = (k / n) * U.TAU, rr = r + Math.sin(a * 6 + t * 4 + c.x * 0.01) * wob; k ? g.lineTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr) : g.moveTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr); }
          g.fillStyle = col; g.fill(); g.strokeStyle = edge; g.lineWidth = Math.max(3, r * 0.08); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(c.x - r * 0.3, c.y - r * 0.35, r * 0.35, 0, U.TAU); g.fill();
          if (r > 18) { D.text(g, c.me ? 'You' : c.name, c.x, c.y - (r > 40 ? r * 0.12 : 0), { size: Math.max(10, r * 0.34), font: 'ui', weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.5)', lw: Math.max(2, r * 0.05) }); if (r > 40) D.text(g, Math.round(c.m), c.x, c.y + r * 0.28, { size: Math.max(9, r * 0.2), font: 'mono', color: 'rgba(255,255,255,.85)' }); }
        }
        for (const v of viruses) {
          if (!vis(v.x, v.y, 70)) continue;
          const r = 52; g.beginPath();
          for (let k = 0; k <= 40; k++) { const a = (k / 40) * U.TAU + v.rot, rr = r + (k % 2 ? 7 : 0); k ? g.lineTo(v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr) : g.moveTo(v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr); }
          g.fillStyle = 'rgba(74,222,128,.75)'; g.fill(); g.strokeStyle = '#15803d'; g.lineWidth = 4; g.stroke();
        }
        g.restore();
        // leaderboard
        const board = bots.map((b) => ({ n: b.name, m: b.m })).concat([{ n: 'You', m: total(), me: true }]).sort((a, b) => b.m - a.m);
        D.fillRR(g, W - 200, 12, 186, 150, 12, 'rgba(2,6,23,.6)');
        D.text(g, 'Leaderboard', W - 107, 30, { size: 14, font: 'ui', weight: 700, color: '#e2e8f0' });
        board.slice(0, 6).forEach((e, i) => D.text(g, `${i + 1}. ${e.n}`, W - 190, 54 + i * 18, { size: 13, align: 'left', font: 'ui', weight: e.me ? 800 : 500, color: e.me ? '#22d3ee' : 'rgba(255,255,255,.75)' }));
        const rank = board.findIndex((e) => e.me) + 1;
        if (rank > 6) D.text(g, `${rank}. You`, W - 190, 54 + 6 * 18, { size: 13, align: 'left', font: 'ui', weight: 800, color: '#22d3ee' });
        // minimap
        const mm = 110, mx = W - mm - 14, my = H - mm - 14;
        D.fillRR(g, mx, my, mm, mm, 8, 'rgba(2,6,23,.6)');
        for (const b of bots) D.circle(g, mx + (b.x / WS) * mm, my + (b.y / WS) * mm, Math.max(1.5, rOf(b.m) / WS * mm), 'rgba(255,255,255,.35)');
        for (const c of me) D.circle(g, mx + (c.x / WS) * mm, my + (c.y / WS) * mm, Math.max(2.5, rOf(c.m) / WS * mm), '#22d3ee');
        D.text(g, `mass ${Math.round(total())}`, 20, H - 24, { size: 18, align: 'left', font: 'mono', color: '#e2e8f0' });
        if (me.length > 1) D.text(g, `${me.length} pieces · re-merge in ${Math.ceil(Math.max(...me.map((c) => c.merge)))}s`, 20, H - 50, { size: 13, align: 'left', font: 'mono', color: 'rgba(255,255,255,.5)' });
      },
    };
  },
});

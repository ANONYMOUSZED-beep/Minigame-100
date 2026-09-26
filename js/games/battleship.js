MG.add({
  id: 'battleship', name: 'Battleship', cat: 'Board', color: '#38bdf8', color2: '#f97316',
  desc: 'Deploy your fleet, then trade missile strikes with an admiral AI that hunts with a probability map. Sink all five ships first.',
  how: ['Setup: drag ships to move them, click a ship to rotate it, or hit SHUFFLE', 'Press START, then click enemy waters to fire', 'A hit shows fire · sink every ship to win', 'The enemy admiral reasons about where ships could still fit — fire smart'],
  pad: false,
  make(E) {
    const W = 960, H = 600, N = 10, ES = 42, EX = 420, EY = 96, PS = 30, PX = 40, PY = 170;
    const FLEET = [['Carrier', 5], ['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2]];
    let st = 'setup', turn = 1, mine, theirs, myShots, aiShots, missile = null, T = 0, drag = null, shots = 0, msg = null, fires = [];
    function randomFleet() {
      const ships = [];
      for (const [name, len] of FLEET) {
        for (let k = 0; k < 500; k++) {
          const h = Math.random() < 0.5, x = U.ri(0, h ? N - len : N - 1), y = U.ri(0, h ? N - 1 : N - len);
          const s = { name, len, x, y, h, hits: 0 };
          if (fits(ships, s)) { ships.push(s); break; }
        }
      }
      return ships;
    }
    const cellsOf = (s) => U.range(s.len).map((i) => (s.h ? [s.x + i, s.y] : [s.x, s.y + i]));
    function fits(ships, s, ignore) {
      for (const [x, y] of cellsOf(s)) { if (x < 0 || y < 0 || x >= N || y >= N) return false; for (const o of ships) if (o !== s && o !== ignore) for (const [ox, oy] of cellsOf(o)) if (Math.abs(ox - x) + Math.abs(oy - y) === 0) return false; }
      return true;
    }
    const shipAt = (ships, x, y) => ships.find((s) => cellsOf(s).some(([a, b]) => a === x && b === y));
    mine = randomFleet(); theirs = randomFleet();
    myShots = U.grid(N, N, 0); aiShots = U.grid(N, N, 0); // 0 unknown, 1 miss, 2 hit, 3 sunk
    const aiSunkLens = [];
    function aiPick() {
      const remaining = FLEET.map((f) => f[1]); for (const l of aiSunkLens) remaining.splice(remaining.indexOf(l), 1);
      const hits = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (aiShots[y][x] === 2) hits.push([x, y]);
      const dens = U.grid(N, N, 0);
      for (const L of remaining) for (const h of [true, false]) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const cs = U.range(L).map((i) => (h ? [x + i, y] : [x, y + i]));
        if (cs.some(([a, b]) => a >= N || b >= N || aiShots[b][a] === 1 || aiShots[b][a] === 3)) continue;
        const cover = cs.filter(([a, b]) => aiShots[b][a] === 2).length;
        if (hits.length && !cover) continue;
        const w = hits.length ? cover * cover * 20 : 1;
        for (const [a, b] of cs) if (aiShots[b][a] === 0) dens[b][a] += w + ((a + b) % 2 === 0 && !hits.length ? 0.4 : 0);
      }
      let best = [], bv = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (aiShots[y][x]) continue; const v = dens[y][x]; if (v > bv + 1e-9) { bv = v; best = [[x, y]]; } else if (Math.abs(v - bv) < 1e-9) best.push([x, y]); }
      return U.pick(best.length ? best : [[U.ri(0, N - 1), U.ri(0, N - 1)]]);
    }
    function fire(side, x, y) {
      const tx = side === 1 ? EX + x * ES + ES / 2 : PX + x * PS + PS / 2, ty = side === 1 ? EY + y * ES + ES / 2 : PY + y * PS + PS / 2;
      const sx = side === 1 ? PX + (N * PS) / 2 : EX + (N * ES) / 2, sy = side === 1 ? PY + N * PS : EY + N * ES;
      missile = { side, x, y, sx, sy, tx, ty, t: 0 };
      E.sfx('whoosh', 0.8, 0.6);
    }
    function impact() {
      const { side, x, y, tx, ty } = missile; missile = null;
      const ships = side === 1 ? theirs : mine, grid = side === 1 ? myShots : aiShots, s = shipAt(ships, x, y);
      if (side === 1) shots++;
      if (s) {
        grid[y][x] = 2; s.hits++;
        E.sfx('explode', 1.2, 0.8); E.shake(side === 1 ? 8 : 5);
        E.burst(tx, ty, { n: 30, colors: ['#fde68a', '#f97316', '#ef4444', '#111'], speed: 260 });
        fires.push({ x: tx, y: ty, s: side === 1 ? 1 : 0.7 });
        if (s.hits === s.len) {
          for (const [a, b] of cellsOf(s)) grid[b][a] = 3;
          s.sunk = true; E.sfx('boom', 1, 0.8); E.flash(side === 1 ? '#f97316' : '#ef4444', 0.3);
          msg = { text: side === 1 ? `You sank their ${s.name}!` : `They sank your ${s.name}!`, t: 2, col: side === 1 ? '#4ade80' : '#f87171' };
          if (side === 2) aiSunkLens.push(s.len);
          if (ships.every((q) => q.sunk)) return end(side === 1);
        } else msg = { text: side === 1 ? 'HIT!' : 'You\'ve been hit!', t: 1.2, col: side === 1 ? '#fde047' : '#fca5a5' };
      } else {
        grid[y][x] = 1; E.sfx('splash', 1, 0.7); E.ring(tx, ty, { r: 30, color: '#e0f2fe', life: 0.5 });
        E.burst(tx, ty, { n: 12, colors: ['#e0f2fe', '#7dd3fc'], speed: 160, grav: 500 });
        msg = { text: side === 1 ? 'Miss' : 'They missed', t: 1, col: '#bae6fd' };
      }
      turn = 3 - side; st = 'battle'; aiWait = 0.7;
    }
    let aiWait = 0;
    function end(won) {
      st = 'end';
      const left = mine.reduce((a, s) => a + s.len - s.hits, 0);
      if (won) { E.score = 1000 + Math.max(0, 100 - shots) * 20 + left * 60; E.sfx('win'); E.after(1.6, () => E.over({ win: true, title: 'Fleet Destroyed!', msg: `Victory in ${shots} shots with ${left} hull squares intact` })); }
      else { const hits = myShots.flat().filter((v) => v >= 2).length; E.score = hits * 25; E.sfx('lose'); E.after(1.6, () => E.over({ title: 'Your Fleet Is Sunk', msg: `You landed ${hits} hits in ${shots} shots` })); }
    }
    const BTN = { shuffle: { x: PX, y: PY + N * PS + 26, w: 140, h: 50 }, start: { x: PX + 160, y: PY + N * PS + 26, w: 140, h: 50 } };
    return {
      update(dt) {
        T += dt;
        if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
        const p = E.ptr;
        if (st === 'setup') {
          if (p.hit) {
            if (U.ptInRect(p.x, p.y, BTN.shuffle.x, BTN.shuffle.y, BTN.shuffle.w, BTN.shuffle.h)) { mine = randomFleet(); E.sfx('shuffle'); return; }
            if (U.ptInRect(p.x, p.y, BTN.start.x, BTN.start.y, BTN.start.w, BTN.start.h)) { st = 'battle'; turn = 1; E.sfx('power'); E.banner('BATTLE STATIONS', 'Fire on enemy waters', { color: '#38bdf8', life: 1.4 }); return; }
            const cx = Math.floor((p.x - PX) / PS), cy = Math.floor((p.y - PY) / PS), s = shipAt(mine, cx, cy);
            if (s) drag = { s, ox: cx - s.x, oy: cy - s.y, moved: false, x0: s.x, y0: s.y };
          }
          if (drag && p.down) {
            const cx = Math.floor((p.x - PX) / PS) - drag.ox, cy = Math.floor((p.y - PY) / PS) - drag.oy;
            if (cx !== drag.s.x || cy !== drag.s.y) { const old = [drag.s.x, drag.s.y]; drag.s.x = cx; drag.s.y = cy; if (!fits(mine, drag.s)) { drag.s.x = old[0]; drag.s.y = old[1]; } else { drag.moved = true; E.sfx('tick', 1.2, 0.3); } }
          }
          if (drag && !p.down) {
            if (!drag.moved) { drag.s.h = !drag.s.h; if (!fits(mine, drag.s)) { drag.s.h = !drag.s.h; E.sfx('error', 1.2, 0.4); } else E.sfx('click'); }
            drag = null;
          }
          if (E.hit('Enter', 'Space')) { st = 'battle'; turn = 1; E.sfx('power'); }
          return;
        }
        if (missile) {
          missile.t += dt / 0.55;
          if (missile.t >= 1) impact();
          return;
        }
        if (st !== 'battle') return;
        if (turn === 2) { aiWait -= dt; if (aiWait <= 0) { const [x, y] = aiPick(); fire(2, x, y); st = 'firing'; } return; }
        if (p.hit) {
          const x = Math.floor((p.x - EX) / ES), y = Math.floor((p.y - EY) / ES);
          if (x >= 0 && y >= 0 && x < N && y < N) { if (myShots[y][x]) E.sfx('error', 1.2, 0.3); else { fire(1, x, y); st = 'firing'; } }
        }
      },
      draw(g) {
        const t = T;
        D.bg(g, W, H, '#082f49', '#020617');
        // player waters
        sea(g, PX, PY, PS, t);
        for (const s of mine) ship(g, s, PX, PY, PS, true, st === 'setup' && drag && drag.s === s);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) mark(g, aiShots[y][x], PX + x * PS + PS / 2, PY + y * PS + PS / 2, PS, t);
        D.text(g, 'YOUR FLEET', PX + (N * PS) / 2, PY - 22, { size: 16, color: '#7dd3fc' });
        // enemy waters
        sea(g, EX, EY, ES, t);
        for (const s of theirs) if (s.sunk) ship(g, s, EX, EY, ES, false, false);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) mark(g, myShots[y][x], EX + x * ES + ES / 2, EY + y * ES + ES / 2, ES, t);
        if (st === 'battle' && turn === 1 && !missile && E.ptr.type === 'mouse') {
          const x = Math.floor((E.ptr.x - EX) / ES), y = Math.floor((E.ptr.y - EY) / ES);
          if (x >= 0 && y >= 0 && x < N && y < N && !myShots[y][x]) { const cx = EX + x * ES + ES / 2, cy = EY + y * ES + ES / 2; D.circle(g, cx, cy, ES * 0.36, null, '#f97316', 2); D.line(g, cx - ES * 0.5, cy, cx + ES * 0.5, cy, 'rgba(249,115,22,.6)', 1.5); D.line(g, cx, cy - ES * 0.5, cx, cy + ES * 0.5, 'rgba(249,115,22,.6)', 1.5); }
        }
        const letters = 'ABCDEFGHIJ';
        for (let i = 0; i < N; i++) { D.text(g, letters[i], EX + i * ES + ES / 2, EY - 12, { size: 12, font: 'mono', color: 'rgba(186,230,253,.5)' }); D.text(g, i + 1, EX - 14, EY + i * ES + ES / 2, { size: 12, font: 'mono', color: 'rgba(186,230,253,.5)' }); }
        D.text(g, 'ENEMY WATERS', EX + (N * ES) / 2, EY - 40, { size: 18, color: '#fdba74' });
        // enemy fleet status
        FLEET.forEach(([name, len], i) => {
          const s = theirs[i], x = EX + N * ES + 20, y = EY + 20 + i * 44;
          D.text(g, name, x, y, { size: 11, align: 'left', font: 'mono', color: s.sunk ? 'rgba(248,113,113,.7)' : 'rgba(255,255,255,.55)' });
          for (let k = 0; k < len; k++) D.fillRR(g, x + k * 12, y + 10, 10, 8, 2, s.sunk ? '#7f1d1d' : '#64748b');
        });
        // fires & smoke on hits
        for (const f of fires) { const fl = 0.7 + 0.3 * Math.sin(t * 20 + f.x); D.glow(g, f.x, f.y - 4, 16 * f.s * fl, '#f97316', 0.8); g.fillStyle = `rgba(30,30,30,${0.25})`; for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; g.beginPath(); g.arc(f.x + Math.sin(q * 6 + f.y) * 4, f.y - 8 - q * 30 * f.s, (4 + q * 8) * f.s, 0, U.TAU); g.fill(); } }
        // missile
        if (missile) {
          const k = missile.t, x = U.lerp(missile.sx, missile.tx, k), y = U.lerp(missile.sy, missile.ty, k) - Math.sin(k * Math.PI) * 180;
          const k2 = Math.max(0, k - 0.05), x2 = U.lerp(missile.sx, missile.tx, k2), y2 = U.lerp(missile.sy, missile.ty, k2) - Math.sin(k2 * Math.PI) * 180;
          D.line(g, x2, y2, x, y, 'rgba(255,255,255,.6)', 3); D.glow(g, x, y, 20, '#fde68a', 0.9); D.circle(g, x, y, 4, '#fff');
          D.circle(g, missile.tx, missile.ty, 14 * (1 - k) + 4, null, 'rgba(248,113,113,.7)', 2);
        }
        // setup UI
        if (st === 'setup') {
          for (const [key, label, col] of [['shuffle', 'SHUFFLE', '#0369a1'], ['start', 'START ▶', '#ea580c']]) { const bt = BTN[key]; const hov = U.ptInRect(E.ptr.x, E.ptr.y, bt.x, bt.y, bt.w, bt.h); D.tile(g, bt.x, bt.y - (hov ? 2 : 0), bt.w, bt.h, 12, col, 5); D.text(g, label, bt.x + bt.w / 2, bt.y + bt.h / 2 - 3 - (hov ? 2 : 0), { size: 17, color: '#fff' }); }
          D.text(g, 'drag to move · click to rotate', PX + (N * PS) / 2, PY - 48, { size: 12, font: 'mono', color: 'rgba(255,255,255,.45)' });
          g.fillStyle = 'rgba(2,6,23,.55)'; g.fillRect(EX, EY, N * ES, N * ES);
          D.text(g, 'Deploy your fleet', EX + (N * ES) / 2, EY + (N * ES) / 2, { size: 26, color: '#fff' });
        } else {
          const tt = turn === 1 && !missile ? 'Your turn — fire!' : missile ? (missile.side === 1 ? 'Missile away…' : 'Incoming!') : 'Enemy is aiming…';
          D.text(g, tt, PX + (N * PS) / 2, PY + N * PS + 50, { size: 17, font: 'ui', weight: 600, color: turn === 1 ? '#fdba74' : '#fca5a5' });
          D.text(g, `${shots} shots fired`, PX + (N * PS) / 2, PY + N * PS + 78, { size: 12, font: 'mono', color: 'rgba(255,255,255,.4)' });
        }
        if (msg) D.text(g, msg.text, EX + (N * ES) / 2, EY + N * ES + 36, { size: 24, color: msg.col, alpha: Math.min(1, msg.t * 2), glow: msg.col, blur: 10 });
      },
    };
    function sea(g, x0, y0, s, t) {
      const gr = g.createLinearGradient(0, y0, 0, y0 + N * s); gr.addColorStop(0, '#0c4a6e'); gr.addColorStop(1, '#075985'); g.fillStyle = gr; g.fillRect(x0, y0, N * s, N * s);
      g.strokeStyle = 'rgba(186,230,253,.12)'; g.lineWidth = 1.5;
      for (let i = 0; i < N * 1.5; i++) { const y = y0 + ((i * s * 0.66 + t * 8) % (N * s)); g.beginPath(); for (let x = 0; x <= N * s; x += 8) { const yy = y + Math.sin((x + t * 30 + i * 40) * 0.05) * 2; x ? g.lineTo(x0 + x, yy) : g.moveTo(x0 + x, yy); } g.stroke(); }
      g.strokeStyle = 'rgba(186,230,253,.18)'; g.lineWidth = 1;
      for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(x0 + i * s, y0); g.lineTo(x0 + i * s, y0 + N * s); g.moveTo(x0, y0 + i * s); g.lineTo(x0 + N * s, y0 + i * s); g.stroke(); }
      D.strokeRR(g, x0 - 3, y0 - 3, N * s + 6, N * s + 6, 6, 'rgba(125,211,252,.5)', 2);
    }
    function ship(g, s, x0, y0, cs, own, lifted) {
      const x = x0 + s.x * cs, y = y0 + s.y * cs, w = s.h ? s.len * cs : cs, h = s.h ? cs : s.len * cs, m = cs * 0.14;
      g.save(); g.translate(x + w / 2, y + h / 2 - (lifted ? 4 : 0)); if (!s.h) g.rotate(Math.PI / 2);
      const L = (s.h ? w : h) - 2 * m, Wd = cs - 2 * m;
      const col = s.sunk ? '#44403c' : own ? '#94a3b8' : '#64748b';
      g.beginPath(); g.moveTo(-L / 2 + Wd * 0.3, -Wd / 2); g.lineTo(L / 2 - Wd * 0.6, -Wd / 2); g.quadraticCurveTo(L / 2, -Wd / 2, L / 2, 0); g.quadraticCurveTo(L / 2, Wd / 2, L / 2 - Wd * 0.6, Wd / 2); g.lineTo(-L / 2 + Wd * 0.3, Wd / 2); g.quadraticCurveTo(-L / 2, Wd / 2, -L / 2, 0); g.quadraticCurveTo(-L / 2, -Wd / 2, -L / 2 + Wd * 0.3, -Wd / 2); g.closePath();
      g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(15,23,42,.6)'; g.lineWidth = 2; g.stroke();
      D.fillRR(g, -L * 0.18, -Wd * 0.28, L * 0.3, Wd * 0.56, 3, U.shade(col, -0.25));
      for (let k = 0; k < s.len - 1; k++) D.circle(g, -L / 2 + (k + 0.8) * (L / s.len), 0, Wd * 0.14, U.shade(col, 0.2));
      g.restore();
    }
    function mark(g, v, x, y, s, t) {
      if (v === 1) { D.circle(g, x, y, s * 0.12, 'rgba(224,242,254,.85)'); D.circle(g, x, y, s * 0.24 + Math.sin(t * 2 + x) * 1, null, 'rgba(224,242,254,.25)', 1.5); }
      else if (v === 2 || v === 3) { const r = s * 0.26; D.line(g, x - r, y - r, x + r, y + r, v === 3 ? '#7f1d1d' : '#ef4444', 4); D.line(g, x + r, y - r, x - r, y + r, v === 3 ? '#7f1d1d' : '#ef4444', 4); }
    }
  },
});

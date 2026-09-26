MG.add({
  id: 'hopper', name: 'Road Hopper', cat: 'Arcade', color: '#84cc16', color2: '#facc15',
  desc: 'Endless voxel crossing. Hop through traffic, ride logs over rivers and never ignore a train signal.',
  how: ['Hop with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd>, tap to hop forward, or swipe', 'Ride logs and lily pads across water — don\'t drift off-screen', 'Red flashing light = train incoming', 'Dawdle too long and the hawk takes you'],
  w: 640, h: 800, pad: 'LRUD',
  make(E) {
    const W = 640, H = 800, C = 64, COLS = 10, DEPTH = 14;
    const lanes = new Map();
    let genRow = 0, lastType = 'grass', streak = 0;
    const pl = { col: 4.5, row: 0, fromCol: 4.5, fromRow: 0, hop: 1, face: 'U', dead: null, deadT: 0, onLog: null, squash: 0 };
    let cam = -C * 3, best = 0, idle = 0, queue = [], hawk = null, bonus = 0;
    function genLane(r) {
      let type;
      if (r < 3) type = 'grass';
      else {
        const diff = Math.min(1, r / 150);
        if (streak <= 0) {
          const roll = Math.random();
          type = lastType !== 'grass' && roll < 0.35 ? 'grass' : roll < 0.62 ? 'road' : roll < 0.84 ? 'river' : 'rail';
          if (type === lastType && type !== 'road') type = 'grass';
          streak = type === 'road' ? U.ri(1, 2 + Math.round(diff * 3)) : type === 'river' ? U.ri(1, 2 + Math.round(diff * 2)) : type === 'rail' ? U.ri(1, 2) : U.ri(1, 2);
        } else type = lastType;
      }
      streak--; lastType = type;
      const lane = { type, r, items: [], dir: U.chance(0.5) ? 1 : -1 };
      const diff = Math.min(1, r / 160);
      if (type === 'grass') {
        const dense = r < 3 ? 0 : 0.18 + diff * 0.12;
        for (let c = 0; c < COLS; c++) if ((r > 0 || c < 3 || c > 6) && Math.random() < (r === 0 ? 0.5 : dense) && !(r < 3 && c > 2 && c < 7)) lane.items.push({ c, kind: U.chance(0.7) ? 'tree' : 'rock', h: U.ri(1, 3) });
        // outer edge decoration trees
        if (r % 2 === 0) { lane.items.push({ c: -1, kind: 'tree', h: 2 }); lane.items.push({ c: COLS, kind: 'tree', h: 2 }); }
        if (r > 3 && Math.random() < 0.12) { const c = U.ri(0, COLS - 1); if (!lane.items.some((i) => i.c === c)) lane.gem = c; }
      } else if (type === 'road') {
        lane.speed = U.rand(70, 120) + diff * 150;
        const truck = U.chance(0.3);
        const len = truck ? 2.2 : 1.3, gap = U.rand(2.4, 4.5) - diff * 0.8;
        let x = U.rand(0, 3);
        const col = U.pick(['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ec4899', '#f97316']);
        while (x < COLS + 6) { lane.items.push({ x, len, kind: truck ? 'truck' : 'car', col: truck ? '#e5e7eb' : col }); x += len + gap + U.rand(0, 2); }
        lane.span = x;
      } else if (type === 'river') {
        if (U.chance(0.25) && diff < 0.8) { lane.lily = true; lane.speed = 0; for (let c = 0; c < COLS; c++) if (Math.random() < 0.45) lane.items.push({ x: c, len: 1, kind: 'lily' }); if (!lane.items.length) lane.items.push({ x: 4, len: 1, kind: 'lily' }); }
        else {
          lane.speed = U.rand(50, 90) + diff * 70;
          let x = U.rand(0, 2); const len0 = U.ri(2, 4) - (diff > 0.6 ? 1 : 0);
          while (x < COLS + 6) { const len = Math.max(2, len0 + U.ri(-1, 1)); lane.items.push({ x, len, kind: 'log' }); x += len + U.rand(1.4, 2.6) + diff; }
          lane.span = x;
        }
      } else if (type === 'rail') { lane.trainT = U.rand(2, 6); lane.train = null; lane.warn = 0; }
      lanes.set(r, lane);
    }
    const back = new Map();
    function lane(r) {
      if (r < 0) {
        if (!back.has(r)) back.set(r, { type: 'grass', r, items: U.range(COLS).filter(() => Math.random() < 0.55).map((c) => ({ c, kind: 'tree', h: U.ri(1, 3) })) });
        return back.get(r);
      }
      while (genRow <= r) genLane(genRow++); return lanes.get(r);
    }
    for (let r = 0; r < 20; r++) lane(r);
    const blocked = (c, r) => { const L = lane(r); if (c < 0 || c > COLS - 1) return true; return L.type === 'grass' && L.items.some((i) => i.c === Math.round(c) && i.kind !== 'gem'); };
    function kill(kind) {
      if (pl.dead) return;
      pl.dead = kind; pl.deadT = 0;
      const [sx, sy] = toScreen(pl.col, pl.row);
      if (kind === 'car') { E.sfx('hit'); E.shake(12); E.burst(sx, sy, { n: 30, colors: ['#fff', '#fca5a5', '#fbbf24'], shape: 'square', speed: 280 }); E.flash('#ef4444', 0.25); }
      if (kind === 'water') { E.sfx('splash'); E.burst(sx, sy, { n: 36, colors: ['#bae6fd', '#fff', '#38bdf8'], speed: 220, grav: 700, life: 0.8 }); E.ring(sx, sy, { color: '#e0f2fe', r: 50 }); }
      if (kind === 'train') { E.sfx('explode'); E.shake(20); E.burst(sx, sy, { n: 50, colors: ['#fff', '#fca5a5'], shape: 'square', speed: 420 }); E.flash('#fff', 0.4); }
      if (kind === 'hawk') { E.sfx('hurt'); }
      E.vibrate(150);
      E.after(1.4, () => E.over({ msg: `${best} rows crossed` }));
    }
    function tryHop(d) {
      if (pl.dead || pl.hop < 1) { if (queue.length < 2) queue.push(d); return; }
      const dc = d === 'L' ? -1 : d === 'R' ? 1 : 0, dr = d === 'U' ? 1 : d === 'D' ? -1 : 0;
      pl.face = d;
      let nc = Math.round(pl.col + dc), nr = pl.row + dr;
      if (nr < 0) { pl.squash = 0.6; E.sfx('thud', 1.4, 0.4); return; }
      const L = lane(nr);
      if (L.type !== 'river') nc = U.clamp(nc, 0, COLS - 1);
      if (nr < best - 4 || blocked(nc, nr) && L.type === 'grass') { pl.squash = 0.6; E.sfx('thud', 1.4, 0.4); return; }
      pl.fromCol = pl.col; pl.fromRow = pl.row; pl.col = L.type === 'river' ? pl.col + dc : nc; pl.row = nr; pl.hop = 0; idle = 0;
      if (L.type !== 'river') pl.col = nc;
      pl.onLog = null;
      E.sfx('hop', 0.9 + Math.random() * 0.2, 0.7);
    }
    function landed() {
      const L = lane(pl.row);
      if (pl.row > best) { E.score += pl.row - best; best = pl.row; E.stat('Rows', best); }
      if (L.type === 'grass' && L.gem !== undefined && Math.round(pl.col) === L.gem) {
        L.gem = undefined; E.score += 10; bonus += 10; E.sfx('coin'); const [sx, sy] = toScreen(pl.col, pl.row);
        E.pop(sx, sy - 40, '+10', { color: '#facc15' }); E.burst(sx, sy - 20, { n: 16, colors: ['#facc15', '#fff'] });
      }
      if (L.type === 'river') {
        const it = L.items.find((i) => pl.col + 0.5 > i.x - 0.05 && pl.col + 0.5 < i.x + i.len + 0.05);
        if (!it) kill('water');
        else { pl.onLog = it; if (it.kind === 'lily') pl.col = Math.round(it.x); it.bob = 1; E.sfx('thud', 1.8, 0.3); }
      }
    }
    function toScreen(col, row) { return [col * C + C / 2, H - 150 - (row * C - cam) - C / 2]; }
    const wrapX = (L, i) => { const span = Math.max(L.span, COLS + 6); if (L.dir > 0 && i.x > COLS + 1) i.x -= span; if (L.dir < 0 && i.x + i.len < -1) i.x += span; };
    function box(g, x, y, w, h, d, top, front) {
      g.fillStyle = front; g.fillRect(x, y + h - 0.5, w, d);
      g.fillStyle = top; g.fillRect(x, y, w, h);
    }
    return {
      update(dt) {
        // lanes
        const lo = Math.floor(cam / C) - 2, hi = lo + 18;
        for (let r = Math.max(0, lo); r < hi; r++) {
          const L = lane(r);
          if ((L.type === 'road' || (L.type === 'river' && !L.lily))) for (const i of L.items) { i.x += (L.speed * L.dir * dt) / C; wrapX(L, i); }
          if (L.type === 'rail') {
            if (!L.train) { L.trainT -= dt; if (L.trainT < 1.2 && L.trainT > 0) { L.warn = 1; if (Math.abs(r - pl.row) < 6 && Math.floor(L.trainT * 6) !== Math.floor((L.trainT + dt) * 6)) E.sfx('blip', 1.6, 0.5); } if (L.trainT <= 0) { L.train = { x: L.dir > 0 ? -14 : COLS + 1, len: 13 }; L.warn = 1; if (Math.abs(r - pl.row) < 7) { E.sfx('whoosh', 0.5, 1.2); E.shake(6); } } }
            else { L.train.x += (1500 * L.dir * dt) / C; if (L.train.x > COLS + 16 || L.train.x < -16) { L.train = null; L.warn = 0; L.trainT = U.rand(3, 7); } }
          }
          if (L.items) for (const i of L.items) if (i.bob) i.bob = Math.max(0, i.bob - dt * 4);
        }
        // input
        if (!pl.dead) {
          for (const k of ['U', 'D', 'L', 'R']) if (E.hit(k) || E.swipe === k) tryHop(k);
          if (E.ptr.up && Math.hypot(E.ptr.x - E.ptr.sx, E.ptr.y - E.ptr.sy) < 20) tryHop('U');
        }
        // hop progress
        if (pl.hop < 1) {
          pl.hop = Math.min(1, pl.hop + dt / 0.13);
          if (pl.hop >= 1) { landed(); pl.squash = 0.35; if (queue.length && !pl.dead) tryHop(queue.shift()); }
        }
        pl.squash = U.damp(pl.squash, 0, 14, dt);
        const L = lane(pl.row);
        if (!pl.dead && pl.hop >= 1) {
          if (pl.onLog && L.type === 'river' && !L.lily) { pl.col += (L.speed * L.dir * dt) / C; if (pl.col < -0.6 || pl.col > COLS - 0.4) kill('water'); }
          if (L.type === 'road') for (const i of L.items) if (pl.col + 0.5 > i.x + 0.12 && pl.col + 0.5 < i.x + i.len - 0.08) { kill('car'); break; }
        }
        if (!pl.dead && L.type === 'road' && pl.hop < 1 && pl.hop > 0.5) for (const i of L.items) if (pl.col + 0.5 > i.x + 0.15 && pl.col + 0.5 < i.x + i.len - 0.1) { kill('car'); break; }
        if (!pl.dead && L.type === 'rail' && L.train && pl.col + 0.5 > L.train.x && pl.col + 0.5 < L.train.x + L.train.len) kill('train');
        // camera: follows player, creeps forward on its own
        idle += dt;
        const target = pl.row * C - C * 2;
        const creep = cam + dt * (18 + Math.min(best, 200) * 0.25);
        cam = Math.max(U.damp(cam, target, 4, dt), creep, cam);
        if (!pl.dead && (toScreen(pl.col, pl.row)[1] > H + 10 || idle > 9)) { hawk = { t: 0 }; kill('hawk'); }
        if (pl.dead === 'car' || pl.dead === 'train') { pl.deadT += dt; }
        if (hawk) { hawk.t += dt; if (hawk.t > 0.5 && !hawk.grab) { hawk.grab = true; E.sfx('whoosh'); } }
        if (pl.dead === 'train' && L.train) pl.col = L.train.x + 1;
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#1b3a1b'; g.fillRect(0, 0, W, H);
        const lo = Math.floor(cam / C) - 2, hi = lo + 17;
        // ground pass (far to near)
        for (let r = hi; r >= lo; r--) {
          const L = lane(r), y = H - 150 - (r * C - cam) - C;
          if (L.type === 'grass') {
            g.fillStyle = r % 2 ? '#7ccf4a' : '#86d854'; g.fillRect(0, y, W, C);
            g.fillStyle = 'rgba(0,0,0,.05)'; for (let c = 0; c < COLS; c += 2) g.fillRect(c * C + ((r % 2) * C), y, C, C);
          } else if (L.type === 'road') {
            g.fillStyle = '#3a3f4b'; g.fillRect(0, y, W, C);
            const nxt = lanes.get(r + 1);
            if (nxt && nxt.type === 'road') { g.fillStyle = '#e5e7eb'; for (let x = 12; x < W; x += 64) g.fillRect(x, y - 2, 34, 4); }
            g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, y + C - 6, W, 6);
          } else if (L.type === 'river') {
            g.fillStyle = '#38bdf8'; g.fillRect(0, y, W, C);
            g.fillStyle = 'rgba(255,255,255,.35)';
            for (let k = 0; k < 6; k++) { const xx = U.wrap(k * 120 + t * 30 * (L.dir || 1) + r * 37, -60, W + 60); g.fillRect(xx, y + 14 + (k % 3) * 16, 26, 3); }
            g.fillStyle = 'rgba(2,132,199,.5)'; g.fillRect(0, y, W, 6);
          } else if (L.type === 'rail') {
            g.fillStyle = '#8b8b7a'; g.fillRect(0, y, W, C);
            g.fillStyle = '#6b4f3a'; for (let x = 4; x < W; x += 22) g.fillRect(x, y + 10, 10, C - 20);
            g.fillStyle = '#cbd5e1'; g.fillRect(0, y + 17, W, 5); g.fillRect(0, y + C - 22, W, 5);
          }
        }
        // objects pass (far to near so fronts overlap correctly)
        for (let r = hi; r >= lo; r--) {
          const L = lane(r), y = H - 150 - (r * C - cam) - C;
          if (L.type === 'grass') {
            if (L.gem !== undefined) { const gx = L.gem * C + C / 2, gy = y + C / 2 - 10 + Math.sin(t * 4 + r) * 4; D.glow(g, gx, gy, 30, '#facc15', 0.6); D.star(g, gx, gy, 12, 5, 4, t * 2, '#fde047', '#a16207'); }
            for (const it of L.items) {
              const x = it.c * C;
              if (it.kind === 'tree') {
                D.shadow(g, x + C / 2 + 6, y + C - 12, 24, 8, 0.25);
                box(g, x + 24, y + C - 30 - DEPTH, 16, 26, DEPTH, '#8b5a2b', '#5c3a1b');
                const th = 18 + it.h * 16;
                box(g, x + 8, y + C - 30 - th - DEPTH, 48, th, DEPTH, it.h === 3 ? '#15803d' : '#22a04b', '#14532d');
                g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 8, y + C - 30 - th - DEPTH, 48, 6);
              } else { box(g, x + 12, y + 18, 40, 26, DEPTH, '#a8a29e', '#57534e'); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 12, y + 18, 40, 5); }
            }
          } else if (L.type === 'road') {
            for (const it of L.items) {
              const x = it.x * C, w = it.len * C;
              if (x > W + 10 || x + w < -10) continue;
              D.shadow(g, x + w / 2, y + C - 10, w / 2, 7, 0.35);
              const col = it.col;
              if (it.kind === 'truck') {
                const cab = L.dir > 0 ? x + w - 40 : x;
                box(g, x + (L.dir > 0 ? 0 : 40), y + 4, w - 42, 40, DEPTH, '#f1f5f9', '#94a3b8');
                box(g, cab, y + 10, 40, 34, DEPTH, '#dc2626', '#7f1d1d');
                g.fillStyle = '#bae6fd'; g.fillRect(cab + (L.dir > 0 ? 26 : 4), y + 14, 10, 24);
              } else {
                box(g, x + 4, y + 12, w - 8, 32, DEPTH, col, U.shade(col, -0.45));
                box(g, x + 18, y + 4, w - 36, 22, 8, U.shade(col, 0.15), U.shade(col, -0.3));
                g.fillStyle = '#1e293b'; g.fillRect(x + 22, y + 8, w - 44, 12);
                g.fillStyle = L.dir > 0 ? '#fde68a' : '#fecaca'; g.fillRect(L.dir > 0 ? x + w - 8 : x + 4, y + 16, 4, 8);
              }
              g.fillStyle = '#111'; [x + 14, x + w - 22].forEach((wx) => g.fillRect(wx, y + 42 + DEPTH - 6, 10, 6));
            }
          } else if (L.type === 'river') {
            for (const it of L.items) {
              const x = it.x * C, w = it.len * C, sink = (it.bob || 0) * 4;
              if (it.kind === 'lily') { g.fillStyle = '#15803d'; g.beginPath(); g.ellipse(x + C / 2, y + C / 2 + 4 + sink, 26, 20, 0, 0.3, U.TAU - 0.3); g.lineTo(x + C / 2, y + C / 2 + 4 + sink); g.fill(); g.fillStyle = '#22c55e'; g.beginPath(); g.ellipse(x + C / 2, y + C / 2 + sink, 26, 20, 0, 0.3, U.TAU - 0.3); g.lineTo(x + C / 2, y + C / 2 + sink); g.fill(); continue; }
              box(g, x + 2, y + 10 + sink, w - 4, 34, 10, '#a0673a', '#6b4226');
              g.fillStyle = '#b97a47'; for (let k = 0; k < it.len; k++) g.fillRect(x + 10 + k * C, y + 18 + sink, C - 20, 3);
              g.fillStyle = '#d6a47a'; g.fillRect(L.dir > 0 ? x + w - 10 : x + 2, y + 10 + sink, 8, 34);
            }
          } else if (L.type === 'rail') {
            const px = W - 30, blink = L.warn && Math.floor(t * 8) % 2;
            box(g, px, y - 20, 8, 50, 6, '#475569', '#1e293b');
            D.circle(g, px + 4, y - 26, 8, blink ? '#ef4444' : '#450a0a');
            if (blink) D.glow(g, px + 4, y - 26, 50, '#ef4444', 0.9);
            if (L.train) {
              const x = L.train.x * C, w = L.train.len * C;
              for (let k = 0; k < L.train.len; k += 3.3) {
                const cx = x + k * C;
                box(g, cx + 2, y + 2, 3.3 * C - 8, 44, DEPTH, k === 0 ? '#ef4444' : '#dbeafe', k === 0 ? '#7f1d1d' : '#64748b');
                g.fillStyle = '#1e3a8a'; for (let wdw = 0; wdw < 4; wdw++) g.fillRect(cx + 16 + wdw * 50, y + 10, 30, 14);
              }
              void w;
            }
          }
          // player drawn in its row
          if (r === pl.row && !(pl.dead === 'water' && pl.deadT > 0) && !(hawk && hawk.t > 0.6)) {
            const k = pl.hop, col = U.lerp(pl.fromCol, pl.col, k), row = U.lerp(pl.fromRow, pl.row, k);
            const px = col * C + C / 2, py = H - 150 - (row * C - cam) - C / 2 + 8;
            const lift = Math.sin(k * Math.PI) * 26;
            const flat = pl.dead === 'car' || pl.dead === 'train';
            const sq = flat ? 0.25 : 1 - pl.squash * 0.45 + (k < 1 ? 0.15 : 0), sw = flat ? 1.5 : 1 + pl.squash * 0.3;
            D.shadow(g, px, py + 12, 20, 8, 0.35);
            g.save(); g.translate(px, py + 12 - lift); g.scale(sw, sq);
            box(g, -17, -40, 34, 30, 12, '#ffffff', '#cbd5e1');
            g.fillStyle = '#ef4444'; g.fillRect(-5, -48, 10, 9);
            const fx = pl.face === 'L' ? -1 : pl.face === 'R' ? 1 : 0, fy = pl.face === 'D' ? 1 : 0;
            if (pl.face !== 'U') { g.fillStyle = '#f97316'; g.fillRect(-4 + fx * 14, -24 + fy * 6, 8, 6); g.fillStyle = '#111'; g.fillRect(-9 + fx * 8, -32, 4, 4); g.fillRect(5 + fx * 8, -32, 4, 4); }
            g.fillStyle = '#f97316'; g.fillRect(-12, -2, 6, 4); g.fillRect(6, -2, 6, 4);
            g.restore();
          }
          if (pl.dead === 'water' && r === pl.row) pl.deadT += 1 / 60;
        }
        if (hawk) {
          const [px, py] = toScreen(pl.col, pl.row), k = Math.min(1, hawk.t / 0.6);
          const hx = px, hy = U.lerp(-80, py - 20, U.ease.inQuad(k)) - (hawk.t > 0.6 ? (hawk.t - 0.6) * 900 : 0);
          g.save(); g.translate(hx, hy);
          const flap = Math.sin(t * 30) * 12;
          D.poly(g, [[0, 0], [-70, -20 + flap], [-30, 10]], '#57534e'); D.poly(g, [[0, 0], [70, -20 + flap], [30, 10]], '#57534e');
          box(g, -14, -18, 28, 40, 8, '#78716c', '#44403c'); g.fillStyle = '#fbbf24'; g.fillRect(-5, 20, 10, 10);
          if (hawk.t > 0.6) box(g, -12, 30, 24, 22, 8, '#fff', '#cbd5e1');
          g.restore();
        }
        // distance marker
        D.text(g, best, W / 2, 52, { size: 54, color: '#fff', stroke: 'rgba(0,0,0,.35)', lw: 8 });
        const idleWarn = idle > 6 && !pl.dead;
        if (idleWarn) D.text(g, 'HURRY!', W / 2, 100, { size: 22, color: '#fca5a5', alpha: 0.5 + 0.5 * Math.sin(t * 12) });
        const vg = g.createLinearGradient(0, 0, 0, 120); vg.addColorStop(0, 'rgba(0,0,0,.35)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, W, 120);
      },
    };
  },
});

MG.add({
  id: 'serpent', name: 'Neon Serpent', cat: 'Arcade', color: '#39ff88', color2: '#22d3ee',
  desc: 'The classic, electrified. Chain fruit for combo multipliers while the arena closes in.',
  how: ['Steer with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd> or swipe', 'Eat quickly to build a combo (up to ×5)', 'Golden fruit is worth 50 — grab it before it fades', 'Every 6 fruit the arena adds new walls'],
  pad: 'LRUD',
  make(E) {
    const S = 30, C = 32, R = 20;
    const DIRS = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
    let snake, prev, dir, queue, acc, food, gold, walls, eaten, combo, comboT, dying, dieT, grow, level;
    const occupied = (x, y) => snake.some((s) => s.x === x && s.y === y) || walls.some((w) => w.x === x && w.y === y);
    function freeCell(minDist = 0) {
      for (let k = 0; k < 500; k++) {
        const x = U.ri(1, C - 2), y = U.ri(1, R - 2);
        if (!occupied(x, y) && (!food || food.x !== x || food.y !== y) && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) >= minDist) return { x, y };
      }
      return { x: 1, y: 1 };
    }
    function reset() {
      snake = []; for (let i = 0; i < 5; i++) snake.push({ x: 10 - i, y: 10 });
      prev = snake.map((s) => ({ ...s }));
      dir = 'R'; queue = []; acc = 0; walls = []; eaten = 0; combo = 1; comboT = 0; dying = false; dieT = 0; grow = 0; level = 1;
      food = null; food = freeCell(4); gold = null;
    }
    reset();
    const interval = () => Math.max(0.052, 0.118 - snake.length * 0.0012 - level * 0.002);
    function addWalls() {
      const n = 3 + level;
      for (let i = 0; i < n; i++) {
        const c = freeCell(6); const horiz = U.chance(0.5), len = U.ri(2, 4);
        for (let j = 0; j < len; j++) {
          const x = c.x + (horiz ? j : 0), y = c.y + (horiz ? 0 : j);
          if (x > 0 && y > 0 && x < C - 1 && y < R - 1 && !occupied(x, y) && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) > 4) walls.push({ x, y, born: E.t });
        }
      }
    }
    function die() {
      dying = true; dieT = 0;
      E.sfx('hurt'); E.shake(14); E.flash('#ff3366', 0.35); E.freeze(0.08); E.vibrate(120);
    }
    function tick() {
      prev = snake.map((s) => ({ ...s }));
      while (queue.length) {
        const nd = queue.shift();
        const [dx, dy] = DIRS[nd], [cx, cy] = DIRS[dir];
        if (dx !== -cx || dy !== -cy) { if (nd !== dir) { dir = nd; E.sfx('tick', 1.2, 0.6); } break; }
      }
      const [dx, dy] = DIRS[dir];
      const hx = snake[0].x + dx, hy = snake[0].y + dy;
      const tailWillMove = grow === 0;
      const hitSelf = snake.some((s, i) => s.x === hx && s.y === hy && !(tailWillMove && i === snake.length - 1));
      if (hx < 0 || hy < 0 || hx >= C || hy >= R || hitSelf || walls.some((w) => w.x === hx && w.y === hy)) return die();
      snake.unshift({ x: hx, y: hy });
      if (grow > 0) { grow--; prev.push({ ...prev[prev.length - 1] }); } else snake.pop();
      const px = hx * S + S / 2, py = hy * S + S / 2;
      if (food && hx === food.x && hy === food.y) {
        combo = comboT > 0 ? Math.min(5, combo + 1) : 1; comboT = 3;
        const pts = 10 * combo; E.score += pts; eaten++; grow += 2;
        E.burst(px, py, { n: 22, color: '#ff4fa3', colors: ['#ff4fa3', '#ffd166', '#fff'], speed: 260 });
        E.ring(px, py, { color: '#ff4fa3', r: 50 });
        E.pop(px, py - 16, combo > 1 ? `+${pts} ×${combo}` : `+${pts}`, { color: combo > 1 ? '#ffd166' : '#fff' });
        E.sfx('coin', 1 + combo * 0.08); E.shake(3);
        food = freeCell(3);
        if (!gold && U.chance(0.18)) gold = { ...freeCell(5), t: 7 };
        if (eaten % 6 === 0) { level++; addWalls(); E.banner('LEVEL ' + level, 'The arena shifts…'); E.sfx('power'); }
      }
      if (gold && hx === gold.x && hy === gold.y) {
        E.score += 50; grow += 3;
        E.burst(px, py, { n: 40, colors: ['#ffd166', '#fff3b0', '#ffb703'], speed: 340, shape: 'spark' });
        E.ring(px, py, { color: '#ffd166', r: 80, lw: 6 });
        E.pop(px, py - 16, '+50', { color: '#ffd166', size: 30 });
        E.sfx('power'); E.flash('#ffd166', 0.18); E.shake(6);
        gold = null;
      }
      E.stat('Length', snake.length); E.stat('Combo', '×' + combo);
    }
    const stars = D.makeStars(80, 960, 600, 3);
    return {
      thumb() {
        snake = [];
        const path = [[20, 6], [19, 6], [18, 6], [17, 6], [16, 6], [16, 7], [16, 8], [16, 9], [15, 9], [14, 9], [13, 9], [12, 9], [12, 10], [12, 11], [12, 12], [13, 12], [14, 12], [15, 12]];
        path.forEach(([x, y]) => snake.push({ x, y })); prev = snake.map((s) => ({ ...s })); dir = 'R';
        food = { x: 24, y: 6 }; gold = { x: 8, y: 14, t: 5 }; walls = [{ x: 26, y: 13 }, { x: 26, y: 14 }, { x: 26, y: 15 }];
      },
      update(dt) {
        if (dying) {
          dieT += dt;
          const idx = Math.floor(dieT / 0.035);
          if (idx < snake.length && !snake[idx].gone) {
            const s = snake[idx]; s.gone = true;
            E.burst(s.x * S + S / 2, s.y * S + S / 2, { n: 8, color: U.hsl(150 + idx * 3, 100, 60), speed: 200 });
            E.sfx('pop', 1 + idx * 0.02, 0.5);
          }
          if (dieT > snake.length * 0.035 + 0.5 && E.state === 'play') E.over({ msg: `Length ${snake.length} · Level ${level}` });
          return;
        }
        const sw = E.swipe;
        for (const k of ['L', 'R', 'U', 'D']) if (E.hit(k) || sw === k) { if (queue.length < 3 && queue[queue.length - 1] !== k) queue.push(k); }
        comboT = Math.max(0, comboT - dt);
        if (comboT === 0 && combo > 1) { combo = 1; E.stat('Combo', '×1'); }
        if (gold) { gold.t -= dt; if (gold.t <= 0) { E.burst(gold.x * S + 15, gold.y * S + 15, { n: 12, color: '#ffd166', speed: 90 }); gold = null; } }
        acc += dt;
        const iv = interval();
        while (acc >= iv && !dying) { acc -= iv; tick(); }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, 960, 600, '#0b1a1a', '#04070a');
        D.stars(g, stars, 960, 600, t, 0, 0, '#7fffd4');
        // checker floor + dots
        g.fillStyle = 'rgba(80,255,190,0.028)';
        for (let x = 0; x < C; x++) for (let y = 0; y < R; y++) if ((x + y) % 2) g.fillRect(x * S, y * S, S, S);
        g.fillStyle = 'rgba(80,255,190,0.12)';
        for (let x = 1; x < C; x++) for (let y = 1; y < R; y++) g.fillRect(x * S - 1, y * S - 1, 2, 2);
        // border
        g.strokeStyle = 'rgba(57,255,136,.5)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 957, 597);
        // walls
        for (const w of walls) {
          const k = w.born !== undefined ? U.clamp((t - w.born) * 3, 0, 1) : 1, s = U.ease.outBack(k);
          const cx = w.x * S + S / 2, cy = w.y * S + S / 2, hs = (S / 2 - 2) * s;
          D.glow(g, cx, cy, 26, '#7c3aed', 0.5);
          D.fillRR(g, cx - hs, cy - hs, hs * 2, hs * 2, 5, '#6d28d9');
          D.fillRR(g, cx - hs + 3, cy - hs + 3, hs * 2 - 6, hs * 2 - 10, 3, '#8b5cf6');
        }
        // food
        if (food) {
          const fx = food.x * S + S / 2, fy = food.y * S + S / 2, pul = 1 + Math.sin(t * 6) * 0.12;
          D.glow(g, fx, fy, 38 * pul, '#ff4fa3', 0.9);
          D.orb(g, fx, fy, 9 * pul, '#ff4fa3');
          D.line(g, fx + 1, fy - 9, fx + 4, fy - 14, '#39ff88', 2.5);
        }
        if (gold) {
          const fx = gold.x * S + S / 2, fy = gold.y * S + S / 2, blink = gold.t < 2 ? (Math.sin(t * 25) > 0 ? 1 : 0.3) : 1;
          g.globalAlpha = blink;
          D.glow(g, fx, fy, 50, '#ffd166', 1);
          D.star(g, fx, fy, 13, 6, 5, t * 2, '#ffd166', '#fff3b0');
          g.strokeStyle = '#ffd166'; g.lineWidth = 2.5; g.beginPath(); g.arc(fx, fy, 19, -Math.PI / 2, -Math.PI / 2 + (gold.t / 7) * U.TAU); g.stroke();
          g.globalAlpha = 1;
        }
        // snake (interpolated)
        const k = dying ? 1 : U.clamp(acc / interval(), 0, 1);
        const pts = snake.map((s, i) => {
          const p = prev[i] || s;
          return [U.lerp(p.x, s.x, k) * S + S / 2, U.lerp(p.y, s.y, k) * S + S / 2, s.gone];
        });
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          for (let i = pts.length - 1; i > 0; i--) {
            if (pts[i][2] || pts[i - 1][2]) continue;
            const hue = 150 + (i / pts.length) * 60, w = pass === 0 ? 26 : 18 - (i / pts.length) * 6;
            g.strokeStyle = pass === 0 ? U.hsl(hue, 100, 30, 0.9) : U.hsl(hue, 100, 58);
            g.lineWidth = w;
            g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i - 1][0], pts[i - 1][1]); g.stroke();
          }
        }
        for (let i = 0; i < pts.length; i += 3) if (!pts[i][2]) D.glow(g, pts[i][0], pts[i][1], 30, U.hsl(150 + (i / pts.length) * 60, 100, 55), 0.28);
        if (!pts[0][2]) {
          const [hx, hy] = pts[0], [dx, dy] = DIRS[dir];
          D.circle(g, hx, hy, 13, '#b6ffd9');
          D.glow(g, hx, hy, 44, '#39ff88', 0.6);
          const ox = -dy, oy = dx;
          for (const sgn of [-1, 1]) {
            const ex = hx + dx * 4 + ox * 6 * sgn, ey = hy + dy * 4 + oy * 6 * sgn;
            D.circle(g, ex, ey, 4, '#fff'); D.circle(g, ex + dx * 1.6, ey + dy * 1.6, 2, '#032');
          }
        }
        if (combo > 1) {
          D.text(g, `COMBO ×${combo}`, 480, 30, { size: 20, color: '#ffd166', alpha: 0.4 + comboT / 5 });
          g.fillStyle = 'rgba(255,209,102,.5)'; g.fillRect(430, 44, 100 * (comboT / 3), 3);
        }
        D.vignette(g, 960, 600, 0.5);
      },
    };
  },
});

MG.add({
  id: 'muncher', name: 'Maze Muncher', cat: 'Arcade', color: '#facc15', color2: '#f472b6',
  desc: 'An original widescreen maze with four ghosts who each hunt differently. Chomp, flee, turn the tables.',
  how: ['Steer with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd> or swipe — turns are buffered', 'Eat every pellet to clear the maze', 'Power pellets make ghosts edible: 200 → 400 → 800 → 1600', 'Red chases, pink ambushes, cyan flanks, orange is shy'],
  pad: 'LRUD',
  make(E) {
    const HALF = [
      '###################', '#o........#........', '#.###.###.#.######.', '#.###.###.#.######.', '#..................',
      '#.###.#.#######.###', '#.....#....#....#..', '#####.####.#.####.#', '#####.#............', '#####.#.####.#####-',
      'T.......####.#GGGGG', '#####.#.####.######', '#####.#............', '#####.#.#######.###', '#.........#........',
      '#.###.###.#.###.#.#', '#o..#...........#..', '###.#.#.######.##.#', '#.....#....#.......', '#.########.#.#####.',
      '#..................', '###################',
    ];
    const MAP = HALF.map((r) => r + [...r.slice(0, 18)].reverse().join(''));
    const COLS = MAP[0].length, ROWS = MAP.length, T = 24, OX = (960 - COLS * T) / 2, OY = 56;
    const DIR = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }, OPP = { L: 'R', R: 'L', U: 'D', D: 'U' };
    const wall = (x, y) => { if (y < 0 || y >= ROWS) return true; x = ((x % COLS) + COLS) % COLS; const c = MAP[y][x]; return c === '#'; };
    const isDoor = (x, y) => MAP[y] && MAP[y][((x % COLS) + COLS) % COLS] === '-';
    const isHouse = (x, y) => MAP[y] && MAP[y][((x % COLS) + COLS) % COLS] === 'G';
    const DOOR = { x: 18, y: 8 };
    let pellets, level = 1, lives = 3, pac, ghosts, mode, modeT, modeIdx, fright, eatChain, dotsEaten, totalDots, fruit, state, stateT, flashT;
    const SCHED = [7, 20, 7, 20, 5, 20, 5, 1e9];
    // pre-rendered maze
    const mazeCv = document.createElement('canvas'); mazeCv.width = COLS * T * 2; mazeCv.height = ROWS * T * 2;
    function renderMaze(col, inner) {
      const g = mazeCv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, COLS * T, ROWS * T);
      const pass = (inset, fill) => {
        g.fillStyle = fill;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (MAP[y][x] !== '#') continue;
          D.rr(g, x * T + inset, y * T + inset, T - inset * 2, T - inset * 2, 6); g.fill();
          if (x + 1 < COLS && MAP[y][x + 1] === '#') g.fillRect(x * T + T / 2, y * T + inset, T, T - inset * 2);
          if (y + 1 < ROWS && MAP[y + 1][x] === '#') g.fillRect(x * T + inset, y * T + T / 2, T - inset * 2, T);
          if (x + 1 < COLS && y + 1 < ROWS && MAP[y][x + 1] === '#' && MAP[y + 1][x] === '#' && MAP[y + 1][x + 1] === '#') g.fillRect(x * T + T / 2, y * T + T / 2, T, T);
        }
      };
      pass(3, col); pass(6, inner);
      g.fillStyle = '#f9a8d4'; g.fillRect(18 * T, 9 * T + T / 2 - 2, T, 4);
    }
    function initPellets() {
      pellets = new Map(); totalDots = 0; dotsEaten = 0;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = MAP[y][x]; if (c === '.' || c === 'o') { pellets.set(y * COLS + x, c); totalDots++; } }
    }
    function resetActors() {
      pac = { x: 18, y: 12, dir: 'L', want: 'L', moving: true, mouth: 0, face: 'L', dead: 0 };
      const mk = (name, col, x, y, st, corner, delay) => ({ name, col, x, y, dir: 'L', st, corner, delay, bob: 0 });
      ghosts = [
        mk('blinky', '#ff4d4d', 18, 8, 'active', [COLS - 2, -2], 0),
        mk('pinky', '#ff9ee6', 18, 10, 'house', [1, -2], 1.2),
        mk('inky', '#4dd9ff', 16, 10, 'house', [COLS - 1, ROWS + 1], 5),
        mk('clyde', '#ffb347', 20, 10, 'house', [0, ROWS + 1], 9),
      ];
      mode = 'scatter'; modeT = SCHED[0]; modeIdx = 0; fright = 0; eatChain = 0; fruit = null;
      state = 'ready'; stateT = 2.2;
    }
    initPellets(); resetActors(); renderMaze('#3b82f6', '#0b1133');
    E.stat('Lives', lives); E.stat('Level', level);
    const spd = () => ({ pac: 7.6 + Math.min(level, 8) * 0.25, ghost: 7.0 + Math.min(level, 8) * 0.3, fright: 4.6, tunnel: 3.8, eyes: 15 });
    const tileOf = (e) => [Math.round(e.x), Math.round(e.y)];
    const open = (x, y, d, ghost) => { const [dx, dy] = DIR[d], nx = x + dx, ny = y + dy; if (wall(nx, ny)) return false; if (isDoor(nx, ny) && !ghost) return false; if (isHouse(nx, ny) && !ghost) return false; return true; };
    // move along grid; onCenter(e, tx, ty) may change e.dir; returns false to stop
    function advance(e, d, onCenter) {
      let guard = 0;
      while (d > 1e-6 && guard++ < 20) {
        const [dx, dy] = DIR[e.dir];
        const pos = dx ? e.x : e.y, dirSign = dx || dy;
        const target = dirSign > 0 ? Math.floor(pos + 1e-6) + 1 : Math.ceil(pos - 1e-6) - 1;
        const onC = Math.abs(pos - Math.round(pos)) < 1e-6;
        if (onC) {
          e.x = Math.round(e.x); e.y = Math.round(e.y);
          if (onCenter(e, e.x, e.y) === false) return;
        }
        const [ddx, ddy] = DIR[e.dir];
        const p2 = ddx ? e.x : e.y, s2 = ddx || ddy;
        const nextC = s2 > 0 ? Math.floor(p2 + 1e-6) + 1 : Math.ceil(p2 - 1e-6) - 1;
        const toC = Math.abs(nextC - p2) || 1;
        const step = Math.min(d, toC);
        e.x += ddx * step; e.y += ddy * step; d -= step;
        if (e.x < -0.5) e.x += COLS; if (e.x > COLS - 0.5) e.x -= COLS;
        void target;
      }
    }
    function ghostTarget(gh) {
      const [px, py] = tileOf(pac), [dx, dy] = DIR[pac.face];
      if (mode === 'scatter') return gh.corner;
      if (gh.name === 'blinky') return [px, py];
      if (gh.name === 'pinky') return [px + dx * 4, py + dy * 4];
      if (gh.name === 'inky') { const b = ghosts[0], ax = px + dx * 2, ay = py + dy * 2; return [ax * 2 - Math.round(b.x), ay * 2 - Math.round(b.y)]; }
      return U.dist(gh.x, gh.y, px, py) > 8 ? [px, py] : gh.corner;
    }
    function ghostChoose(gh, x, y) {
      let target;
      if (gh.st === 'eyes') {
        if (x === DOOR.x && y === DOOR.y) { gh.st = 'enter'; gh.dir = 'D'; return false; }
        target = [DOOR.x, DOOR.y];
      } else target = ghostTarget(gh);
      const opts = ['U', 'L', 'D', 'R'].filter((d) => d !== OPP[gh.dir] && open(x, y, d, true) && !(isDoor(x + DIR[d][0], y + DIR[d][1])));
      if (!opts.length) { gh.dir = OPP[gh.dir]; return; }
      if (gh.st === 'active' && fright > 0 && !gh.caught) { gh.dir = U.pick(opts); return; }
      let best = opts[0], bd = 1e9;
      for (const d of opts) { const nx = x + DIR[d][0], ny = y + DIR[d][1], dd = U.dist2(nx, ny, target[0], target[1]); if (dd < bd) { bd = dd; best = d; } }
      gh.dir = best;
    }
    function die() {
      state = 'dying'; stateT = 1.8; pac.dead = 0;
      E.sfx('lose'); E.shake(8); E.vibrate(200);
      lives--; E.stat('Lives', Math.max(0, lives));
    }
    function eatGhost(gh) {
      eatChain++; const pts = 200 * Math.pow(2, eatChain - 1);
      E.score += pts; gh.st = 'eyes'; gh.caught = true;
      const cx = OX + gh.x * T + T / 2, cy = OY + gh.y * T + T / 2;
      E.pop(cx, cy - 10, '' + pts, { color: '#4dd9ff', size: 22 }); E.burst(cx, cy, { n: 24, colors: [gh.col, '#fff', '#3b82f6'], speed: 240 });
      E.sfx('power', 1.2); E.freeze(0.35); E.shake(5);
    }
    return {
      update(dt) {
        pac.mouth += dt * 16;
        if (state === 'ready') { stateT -= dt; if (stateT <= 0) state = 'play'; return; }
        if (state === 'dying') {
          stateT -= dt; pac.dead = Math.min(1, pac.dead + dt / 1.2);
          if (stateT <= 0) { if (lives <= 0) { state = 'done'; E.over({ msg: `Level ${level} · ${dotsEaten} of ${totalDots} pellets` }); } else resetActors(); }
          return;
        }
        if (state === 'clear') {
          stateT -= dt; flashT = stateT;
          renderMaze(Math.floor(stateT * 5) % 2 ? '#ffffff' : '#3b82f6', '#0b1133');
          if (stateT <= 0) { level++; E.stat('Level', level); renderMaze('#3b82f6', '#0b1133'); initPellets(); resetActors(); E.banner('LEVEL ' + level); }
          return;
        }
        if (state !== 'play') return;
        const S = spd();
        // input
        for (const k of ['L', 'R', 'U', 'D']) if (E.hit(k) || E.swipe === k) pac.want = k;
        for (const k of ['L', 'R', 'U', 'D']) if (E.down(k)) pac.want = k;
        if (pac.want === OPP[pac.dir] && pac.moving) { pac.dir = pac.want; pac.face = pac.dir; }
        if (!pac.moving) {
          const [tx, ty] = tileOf(pac);
          if (open(tx, ty, pac.want)) { pac.dir = pac.want; pac.face = pac.dir; pac.moving = true; }
        }
        if (pac.moving) {
          advance(pac, S.pac * dt, (e, x, y) => {
            const key = y * COLS + x;
            if (pellets.has(key)) {
              const kind = pellets.get(key); pellets.delete(key); dotsEaten++;
              if (kind === 'o') {
                E.score += 50; fright = Math.max(2.5, 7.5 - level * 0.6); eatChain = 0;
                ghosts.forEach((gh) => { gh.caught = false; if (gh.st === 'active') gh.dir = OPP[gh.dir]; });
                E.sfx('power', 0.7); E.flash('#3b82f6', 0.15);
                E.ring(OX + x * T + T / 2, OY + y * T + T / 2, { color: '#facc15', r: 90 });
              } else { E.score += 10; E.tone({ f: dotsEaten % 2 ? 520 : 390, f2: dotsEaten % 2 ? 390 : 520, dur: 0.06, type: 'triangle', vol: 0.12 }); }
              if (dotsEaten === 70 || dotsEaten === 170) fruit = { t: 9, pts: 100 * level + (dotsEaten > 100 ? 200 : 0) };
              if (!pellets.size) { state = 'clear'; stateT = 2; E.sfx('win'); E.score += 1000 * level; return false; }
            }
            if (open(x, y, pac.want)) { pac.dir = pac.want; pac.face = pac.dir; }
            else if (!open(x, y, pac.dir)) { pac.moving = false; return false; }
          });
        }
        const [ptx, pty] = tileOf(pac);
        if (fruit) {
          fruit.t -= dt; if (fruit.t <= 0) fruit = null;
          else if (ptx === 18 && pty === 12) { E.score += fruit.pts; E.pop(OX + 18 * T + 12, OY + 12 * T, '+' + fruit.pts, { color: '#f472b6', size: 22 }); E.sfx('coin'); E.burst(OX + 18 * T + 12, OY + 12 * T + 12, { n: 20, colors: ['#ef4444', '#4ade80'] }); fruit = null; }
        }
        // modes
        if (fright > 0) { fright -= dt; if (fright <= 0) eatChain = 0; }
        else {
          modeT -= dt;
          if (modeT <= 0) { modeIdx = Math.min(modeIdx + 1, SCHED.length - 1); modeT = SCHED[modeIdx]; mode = modeIdx % 2 ? 'chase' : 'scatter'; ghosts.forEach((gh) => { if (gh.st === 'active') gh.dir = OPP[gh.dir]; }); }
        }
        // ghosts
        for (const gh of ghosts) {
          gh.bob += dt * 8;
          if (gh.st === 'house') { gh.delay -= dt; if (gh.delay <= 0) gh.st = 'leave'; continue; }
          if (gh.st === 'leave') {
            const sp = 4 * dt;
            if (Math.abs(gh.x - 18) > 0.01) gh.x = U.approach(gh.x, 18, sp);
            else { gh.x = 18; gh.y = U.approach(gh.y, 8, sp); if (gh.y <= 8) { gh.y = 8; gh.st = 'active'; gh.dir = U.chance(0.5) ? 'L' : 'R'; gh.caught = gh.caught && fright > 0; } }
            continue;
          }
          if (gh.st === 'enter') { gh.y = U.approach(gh.y, 10, 8 * dt); if (gh.y >= 10) { gh.st = 'leave'; gh.caught = true; } continue; }
          const inTunnel = gh.y === 10 && (gh.x < 6 || gh.x > COLS - 7);
          const sp = gh.st === 'eyes' ? S.eyes : fright > 0 && !gh.caught ? S.fright : inTunnel ? S.tunnel : S.ghost * (gh.name === 'blinky' && pellets.size < 40 ? 1.08 : 1);
          advance(gh, sp * dt, (e, x, y) => ghostChoose(e, x, y));
          if (gh.st === 'active' && U.dist(gh.x, gh.y, pac.x, pac.y) < 0.7) {
            if (fright > 0 && !gh.caught) eatGhost(gh); else { die(); return; }
          }
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, 960, 600, '#050716', '#0a0620');
        g.drawImage(mazeCv, OX, OY, COLS * T, ROWS * T);
        // pellets
        for (const [key, kind] of pellets) {
          const x = OX + (key % COLS) * T + T / 2, y = OY + Math.floor(key / COLS) * T + T / 2;
          if (kind === 'o') { const p = 1 + Math.sin(t * 8) * 0.2; D.glow(g, x, y, 22 * p, '#fde68a', 0.8); D.circle(g, x, y, 6 * p, '#fef3c7'); }
          else { g.fillStyle = '#fcd9b8'; g.fillRect(x - 2, y - 2, 4, 4); }
        }
        if (fruit) {
          const x = OX + 18 * T + T / 2, y = OY + 12 * T + T / 2 + Math.sin(t * 4) * 2;
          D.glow(g, x, y, 30, '#ef4444', 0.6);
          D.circle(g, x - 4, y + 2, 6, '#ef4444'); D.circle(g, x + 4, y + 3, 6, '#dc2626');
          g.strokeStyle = '#4ade80'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y - 3); g.quadraticCurveTo(x, y - 12, x + 5, y - 9); g.lineTo(x + 4, y - 2); g.stroke();
        }
        // ghosts
        for (const gh of ghosts) {
          const x = OX + gh.x * T + T / 2, y = OY + gh.y * T + T / 2 + (gh.st === 'house' ? Math.sin(gh.bob) * 3 : 0);
          const fr = fright > 0 && !gh.caught && gh.st !== 'eyes' && gh.st !== 'enter';
          if (gh.st !== 'eyes' && gh.st !== 'enter') {
            const flashing = fr && fright < 2 && Math.floor(t * 6) % 2;
            const col = fr ? (flashing ? '#f8fafc' : '#2563eb') : gh.col;
            D.glow(g, x, y, 36, col, 0.45);
            g.fillStyle = col; g.beginPath();
            g.arc(x, y - 2, 10.5, Math.PI, 0);
            g.lineTo(x + 10.5, y + 10);
            for (let i = 0; i <= 4; i++) { const wx = x + 10.5 - i * 5.25, wy = y + 10 - ((i + Math.floor(t * 8)) % 2 ? 3.5 : 0); g.lineTo(wx, wy); }
            g.closePath(); g.fill();
            if (fr) {
              const fc = flashing ? '#ef4444' : '#fde68a';
              D.circle(g, x - 4, y - 3, 1.8, fc); D.circle(g, x + 4, y - 3, 1.8, fc);
              g.strokeStyle = fc; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 5; i++) g.lineTo(x - 6 + i * 3, y + 4 + (i % 2 ? -2 : 0)); g.stroke();
              continue;
            }
          }
          const [dx, dy] = DIR[gh.dir];
          for (const s of [-1, 1]) { D.circle(g, x + s * 4.2, y - 3, 3.6, '#fff'); D.circle(g, x + s * 4.2 + dx * 1.8, y - 3 + dy * 1.8, 1.9, '#1e3a8a'); }
        }
        // pac
        const px = OX + pac.x * T + T / 2, py = OY + pac.y * T + T / 2;
        const ang = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[pac.face];
        let m = pac.moving || state !== 'play' ? (Math.sin(pac.mouth) * 0.5 + 0.5) * 0.8 + 0.05 : 0.35;
        if (state === 'dying') m = 0.05 + pac.dead * Math.PI * 0.98;
        if (state === 'ready') m = 0.4;
        if (!(state === 'dying' && pac.dead >= 1)) {
          D.glow(g, px, py, 40, '#facc15', 0.5);
          g.fillStyle = '#facc15'; g.beginPath(); g.moveTo(px, py);
          g.arc(px, py, 11 * (state === 'dying' ? 1 - pac.dead * 0.3 : 1), ang + m, ang + U.TAU - m); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(px - 3, py - 5, 3, 0, U.TAU); g.fill();
        }
        if (state === 'ready') D.text(g, 'READY!', OX + 18 * T + T / 2, OY + 12 * T + T / 2 - 1, { size: 20, color: '#facc15', glow: '#facc15' });
        // lives
        for (let i = 0; i < lives - 1; i++) { g.fillStyle = '#facc15'; g.beginPath(); g.moveTo(OX + 12 + i * 26, 32); g.arc(OX + 12 + i * 26, 32, 9, 0.5 + Math.PI, Math.PI * 3 - 0.5); g.closePath(); g.fill(); }
        D.text(g, 'LEVEL ' + level, 960 - OX - 4, 32, { size: 16, align: 'right', color: '#93c5fd' });
        D.vignette(g, 960, 600, 0.4);
      },
    };
  },
});

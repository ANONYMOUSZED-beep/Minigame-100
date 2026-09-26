MG.add({
  id: 'gemdigger', name: 'Gem Digger', cat: 'Arcade', color: '#22d3ee', color2: '#f59e0b',
  desc: 'Boulder Dash-style cave crawling: dig, dodge falling rocks, crush fireflies and escape with the gems.',
  how: ['Dig with <kbd>←↑↓→</kbd> / <kbd>WASD</kbd> or swipe · push single boulders sideways', 'Rocks and gems fall — and roll off anything round', 'Collect the required gems, then reach the glowing exit', 'Drop a rock on a butterfly and it bursts into gems'],
  pad: 'LRUD',
  make(E) {
    const COLS = 40, ROWS = 22, T = 24, OX = 0, OY = 72;
    const EMPTY = 0, DIRT = 1, WALL = 2, STEEL = 3, ROCK = 4, GEM = 5, EXIT = 6, FIRE = 7, BUTTER = 8, BOOM = 9;
    let map, fall, level = 0, need, got, timeLeft, tick = 0, pl, want = null, exitOpen = false, state, stateT, enemies, facing = 1, tapDir = null;
    const spr = {};
    function mkSpr(k, fn) { const c = document.createElement('canvas'); c.width = c.height = T * 2; const g = c.getContext('2d'); g.scale(2, 2); fn(g); spr[k] = c; }
    const rng = U.seeded(99);
    mkSpr(DIRT, (g) => { g.fillStyle = '#6b3f1d'; g.fillRect(0, 0, T, T); for (let i = 0; i < 26; i++) { g.fillStyle = rng() < 0.5 ? '#7c4a24' : '#553015'; g.fillRect((rng() * T) | 0, (rng() * T) | 0, 2 + ((rng() * 3) | 0), 2); } g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, T - 2, T, 2); });
    mkSpr(WALL, (g) => { g.fillStyle = '#4b5563'; g.fillRect(0, 0, T, T); g.fillStyle = '#6b7280'; for (let r = 0; r < 3; r++) for (let c = -1; c < 3; c++) g.fillRect(c * 12 + (r % 2) * 6 + 1, r * 8 + 1, 10, 6); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, T, 1); });
    mkSpr(STEEL, (g) => { const gr = g.createLinearGradient(0, 0, T, T); gr.addColorStop(0, '#94a3b8'); gr.addColorStop(1, '#334155'); g.fillStyle = gr; g.fillRect(0, 0, T, T); g.strokeStyle = '#1e293b'; g.strokeRect(0.5, 0.5, T - 1, T - 1); g.fillStyle = '#cbd5e1'; [[4, 4], [T - 6, 4], [4, T - 6], [T - 6, T - 6]].forEach(([x, y]) => g.fillRect(x, y, 2, 2)); });
    mkSpr(ROCK, (g) => { const gr = g.createRadialGradient(9, 8, 2, 12, 12, 12); gr.addColorStop(0, '#d6d3d1'); gr.addColorStop(0.6, '#78716c'); gr.addColorStop(1, '#3f3a36'); g.fillStyle = gr; g.beginPath(); g.moveTo(3, 14); g.quadraticCurveTo(2, 3, 12, 2); g.quadraticCurveTo(22, 3, 22, 13); g.quadraticCurveTo(21, 22, 12, 22); g.quadraticCurveTo(3, 22, 3, 14); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(9, 15); g.lineTo(13, 12); g.stroke(); });
    function drawGem(g, x, y, t) {
      const s = 0.85 + 0.15 * Math.sin(t * 4 + x * 0.1);
      D.glow(g, x + T / 2, y + T / 2, 20, '#22d3ee', 0.35);
      g.save(); g.translate(x + T / 2, y + T / 2); g.scale(s, 1);
      D.poly(g, [[0, -10], [9, -3], [0, 10], [-9, -3]], '#22d3ee'); D.poly(g, [[0, -10], [9, -3], [0, -1], [-9, -3]], '#a5f3fc'); D.poly(g, [[0, -1], [9, -3], [0, 10]], '#0891b2');
      g.restore();
      if (Math.sin(t * 3 + x + y) > 0.95) D.star(g, x + T / 2 + 5, y + 6, 4, 1, 4, 0, '#fff');
    }
    function gen() {
      level++; E.stat('Cave', level);
      const r = Math.random;
      map = U.grid(COLS, ROWS, () => (r() < 0.12 + level * 0.008 ? ROCK : r() < 0.06 ? GEM : r() < 0.04 ? EMPTY : DIRT));
      fall = U.grid(COLS, ROWS, 0);
      // walls
      for (let k = 0; k < 4 + level; k++) { const y = U.ri(3, ROWS - 4), x = U.ri(2, COLS - 14), len = U.ri(6, 12); for (let i = 0; i < len; i++) map[y][x + i] = WALL; }
      for (let x = 0; x < COLS; x++) { map[0][x] = STEEL; map[ROWS - 1][x] = STEEL; }
      for (let y = 0; y < ROWS; y++) { map[y][0] = STEEL; map[y][COLS - 1] = STEEL; }
      pl = { x: 2, y: 2, dead: false, anim: 0 };
      for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) map[y][x] = DIRT;
      map[2][2] = EMPTY; map[1][2] = DIRT;
      // enemies in carved rooms
      enemies = [];
      const nEn = Math.min(2 + level, 7);
      for (let k = 0; k < nEn; k++) {
        const x = U.ri(8, COLS - 4), y = U.ri(4, ROWS - 4), horiz = U.chance(0.5), len = U.ri(3, 6);
        for (let i = -1; i <= len; i++) { const xx = horiz ? x + i : x, yy = horiz ? y : y + i; if (map[yy] && map[yy][xx] !== STEEL && xx > 0 && xx < COLS - 1 && yy > 0 && yy < ROWS - 1) map[yy][xx] = EMPTY; }
        // keep rocks from instantly crushing: clear above
        if (horiz) for (let i = 0; i < len; i++) if (map[y - 1][x + i] === ROCK || map[y - 1][x + i] === GEM) map[y - 1][x + i] = DIRT;
        const kind = U.chance(0.4) ? BUTTER : FIRE;
        enemies.push({ x, y, kind, dir: U.ri(0, 3), anim: U.rand(6) });
      }
      // exit
      let ex, ey; do { ex = U.ri(COLS - 8, COLS - 2); ey = U.ri(ROWS - 8, ROWS - 2); } while (map[ey][ex] === STEEL);
      map[ey][ex] = EXIT;
      let gems = 0; for (const row of map) for (const c of row) if (c === GEM) gems++;
      need = Math.max(8, Math.min(Math.floor(gems * 0.55), 10 + level * 3));
      got = 0; exitOpen = false; timeLeft = 150; state = 'play'; tick = 0; want = null;
      E.stat('Gems', `0/${need}`);
      E.banner('CAVE ' + level, `Collect ${need} gems`);
    }
    gen();
    const at = (x, y) => (map[y] ? map[y][x] : STEEL);
    const round = (c) => c === ROCK || c === GEM || c === WALL;
    const enemyAt = (x, y) => enemies.find((e) => !e.dead && e.x === x && e.y === y);
    function explode(cx, cy, toGems) {
      E.sfx('explode', toGems ? 1.3 : 1, 0.8); E.shake(10); E.flash(toGems ? '#22d3ee' : '#f97316', 0.2);
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (at(x, y) === STEEL || at(x, y) === EXIT) continue;
        if (pl.x === x && pl.y === y && !pl.dead) killPlayer(false);
        const en = enemyAt(x, y); if (en) en.dead = true;
        map[y][x] = BOOM; fall[y][x] = toGems ? 2 : 1;
        E.burst(OX + x * T + T / 2, OY + y * T + T / 2, { n: 6, colors: toGems ? ['#22d3ee', '#fff'] : ['#f97316', '#fde68a', '#fff'], speed: 120 });
      }
    }
    function killPlayer(expl = true) {
      if (pl.dead) return;
      pl.dead = true; E.vibrate(200);
      if (expl) explode(pl.x, pl.y, false);
      state = 'dead'; stateT = 1.6;
      E.sfx('hurt');
    }
    function physics() {
      // booms resolve
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === BOOM) { fall[y][x] ? (map[y][x] = fall[y][x] === 2 ? GEM : EMPTY) : 0; if (map[y][x] === BOOM) map[y][x] = EMPTY; fall[y][x] = 0; }
      const moved = U.grid(COLS, ROWS, false);
      for (let y = ROWS - 2; y >= 1; y--) for (let x = 1; x < COLS - 1; x++) {
        const c = map[y][x];
        if ((c !== ROCK && c !== GEM) || moved[y][x]) continue;
        const below = map[y + 1][x], plBelow = pl.x === x && pl.y === y + 1, enBelow = enemyAt(x, y + 1);
        if (below === EMPTY && !plBelow && !enBelow) { map[y + 1][x] = c; map[y][x] = EMPTY; fall[y + 1][x] = 1; fall[y][x] = 0; moved[y + 1][x] = true; continue; }
        if (fall[y][x] && (plBelow || enBelow)) {
          if (plBelow && !pl.dead) { killPlayer(); return; }
          if (enBelow) { explode(x, y + 1, enBelow.kind === BUTTER); map[y][x] = EMPTY; fall[y][x] = 0; enBelow.dead = true; E.score += enBelow.kind === BUTTER ? 50 : 25; continue; }
        }
        if (fall[y][x] && below !== EMPTY) { E.sfx(c === ROCK ? 'thud' : 'ding', c === ROCK ? 1.3 + Math.random() * 0.3 : 1.2 + Math.random() * 0.4, c === ROCK ? 0.35 : 0.12); }
        if (round(below) && !plBelow) {
          for (const dx of [-1, 1]) {
            if (map[y][x + dx] === EMPTY && map[y + 1][x + dx] === EMPTY && !(pl.x === x + dx && (pl.y === y || pl.y === y + 1)) && !enemyAt(x + dx, y)) {
              map[y][x + dx] = c; map[y][x] = EMPTY; fall[y][x + dx] = 1; fall[y][x] = 0; moved[y][x + dx] = true; break;
            }
          }
          if (map[y][x] === c) fall[y][x] = 0;
        } else if (map[y][x] === c && below !== EMPTY) fall[y][x] = 0;
      }
      // enemies: fireflies wall-follow left, butterflies right
      const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
      for (const e of enemies) {
        if (e.dead) continue;
        // touching player explodes
        if (!pl.dead && Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) === 1) { explode(pl.x, pl.y, e.kind === BUTTER); pl.dead = true; state = 'dead'; stateT = 1.6; E.sfx('hurt'); return; }
        const turn = e.kind === FIRE ? 3 : 1;
        const pref = (e.dir + turn) % 4;
        const free = (d) => map[e.y + DY[d]][e.x + DX[d]] === EMPTY && !(pl.x === e.x + DX[d] && pl.y === e.y + DY[d]) && !enemyAt(e.x + DX[d], e.y + DY[d]);
        if (free(pref)) { e.dir = pref; }
        else if (!free(e.dir)) { e.dir = (e.dir + (e.kind === FIRE ? 1 : 3)) % 4; continue; }
        e.x += DX[e.dir]; e.y += DY[e.dir];
      }
      enemies = enemies.filter((e) => !e.dead);
    }
    function playerStep() {
      if (!want || pl.dead) return;
      const dx = want === 'L' ? -1 : want === 'R' ? 1 : 0, dy = want === 'U' ? -1 : want === 'D' ? 1 : 0;
      if (dx) facing = dx;
      const nx = pl.x + dx, ny = pl.y + dy, c = at(nx, ny);
      if (enemyAt(nx, ny)) return;
      if (c === EMPTY || c === DIRT || c === GEM || (c === EXIT && exitOpen)) {
        if (c === DIRT) E.sfx('tick', 0.6 + Math.random() * 0.2, 0.25);
        if (c === GEM) {
          got++; E.score += got > need ? 20 : 10; E.stat('Gems', `${got}/${need}`);
          E.sfx('coin', 1 + (got % 5) * 0.08, 0.7); E.burst(OX + nx * T + T / 2, OY + ny * T + T / 2, { n: 12, colors: ['#22d3ee', '#fff'], speed: 150 });
          if (got === need) { exitOpen = true; E.sfx('power'); E.flash('#fff', 0.3); E.banner('EXIT OPEN'); }
        }
        if (c === EXIT) { state = 'win'; stateT = 2; const bonus = Math.ceil(timeLeft) * 5; E.score += bonus + 250; E.sfx('win'); E.pop(OX + nx * T, OY + ny * T - 20, `+${bonus + 250}`, { color: '#fde68a', size: 26 }); }
        map[ny][nx] = EMPTY; fall[ny][nx] = 0; pl.x = nx; pl.y = ny; pl.anim++;
      } else if (c === ROCK && dy === 0 && at(nx + dx, ny) === EMPTY && !enemyAt(nx + dx, ny) && !fall[ny][nx] && Math.random() < 0.6) {
        map[ny][nx + dx] = ROCK; map[ny][nx] = EMPTY; pl.x = nx; pl.anim++; E.sfx('thud', 0.8, 0.4);
      }
    }
    return {
      update(dt) {
        for (const k of ['L', 'R', 'U', 'D']) if (E.hit(k) || E.swipe === k) tapDir = k;
        let dirNow = ['L', 'R', 'U', 'D'].find((k) => E.down(k)) || null;
        if (E.ptr.down && !pl.dead && !dirNow) {
          const px = OX + pl.x * T + T / 2, py = OY + pl.y * T + T / 2, dx = E.ptr.x - px, dy = E.ptr.y - py;
          if (Math.hypot(dx, dy) > T * 0.7) dirNow = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        }
        if (state === 'dead' || state === 'win') {
          stateT -= dt; tick += dt; if (tick > 0.11) { tick = 0; physics(); }
          if (stateT <= 0) { if (state === 'win') gen(); else { state = 'over'; E.over({ msg: `Cave ${level} · ${got}/${need} gems` }); } }
          return;
        }
        timeLeft -= dt; E.stat('Time', Math.ceil(timeLeft));
        if (timeLeft <= 0) { killPlayer(); return; }
        tick += dt;
        if (tick >= 0.11) {
          tick = 0;
          want = dirNow || tapDir || null; tapDir = null;
          playerStep();
          physics();
        }
      },
      draw(g) {
        const t = E.t;
        g.fillStyle = '#0c0806'; g.fillRect(0, 0, 960, 600);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const c = map[y][x], px = OX + x * T, py = OY + y * T;
          if (c === DIRT || c === WALL || c === STEEL || c === ROCK) g.drawImage(spr[c], px, py, T, T);
          else if (c === GEM) drawGem(g, px, py, t);
          else if (c === EXIT) {
            g.fillStyle = exitOpen ? '#16a34a' : '#334155'; g.fillRect(px + 2, py + 2, T - 4, T - 4);
            if (exitOpen) { D.glow(g, px + T / 2, py + T / 2, 40 + Math.sin(t * 6) * 8, '#4ade80', 0.9); D.text(g, '▲', px + T / 2, py + T / 2, { size: 14, color: '#fff' }); }
            else g.drawImage(spr[STEEL], px, py, T, T);
          } else if (c === BOOM) { D.glow(g, px + T / 2, py + T / 2, 30, fall[y][x] === 2 ? '#22d3ee' : '#f97316', 1); }
        }
        for (const e of enemies) {
          const px = OX + e.x * T + T / 2, py = OY + e.y * T + T / 2; e.anim += 0.15;
          if (e.kind === FIRE) {
            D.glow(g, px, py, 26, '#f97316', 0.8);
            g.save(); g.translate(px, py); g.rotate(t * 5);
            D.strokeRR(g, -8, -8, 16, 16, 3, '#fbbf24', 2.5); D.strokeRR(g, -4, -4, 8, 8, 2, '#ef4444', 2); g.restore();
          } else {
            D.glow(g, px, py, 26, '#e879f9', 0.7);
            const w = Math.abs(Math.sin(t * 10)) * 9 + 2;
            g.fillStyle = '#e879f9'; g.beginPath(); g.ellipse(px - w / 2 - 1, py - 2, w / 2 + 1, 7, 0, 0, U.TAU); g.ellipse(px + w / 2 + 1, py - 2, w / 2 + 1, 7, 0, 0, U.TAU); g.fill();
            g.fillStyle = '#a21caf'; g.fillRect(px - 1.5, py - 8, 3, 16);
          }
        }
        if (!pl.dead && state !== 'win' || state === 'win' && Math.sin(t * 20) > 0) {
          const px = OX + pl.x * T + T / 2, py = OY + pl.y * T + T / 2;
          D.glow(g, px, py, 60, '#fde68a', 0.18);
          g.save(); g.translate(px, py); g.scale(facing, 1);
          const bob = pl.anim % 2 ? -1 : 0;
          D.fillRR(g, -6, -2 + bob, 12, 11, 3, '#2563eb');
          D.circle(g, 0, -5 + bob, 6, '#fcd9b6');
          g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(0, -7 + bob, 7, Math.PI, 0); g.fill(); g.fillRect(-7, -8 + bob, 15, 2);
          D.circle(g, 5, -9 + bob, 2, '#fff'); D.glow(g, 8, -8 + bob, 12, '#fef08a', 0.8);
          D.circle(g, 2.5, -5 + bob, 1.2, '#111');
          g.fillStyle = '#1e293b'; g.fillRect(-5, 9, 4, 3 - bob); g.fillRect(1, 9, 4, 3 + bob);
          g.restore();
        }
        // header
        D.fillRR(g, 8, 10, 944, 52, 12, 'rgba(0,0,0,.35)');
        for (let i = 0; i < Math.min(need, 30); i++) { const x = 30 + i * 22, y = 36; g.globalAlpha = i < got ? 1 : 0.2; D.poly(g, [[x, y - 9], [x + 8, y - 2], [x, y + 9], [x - 8, y - 2]], i < got ? '#22d3ee' : '#94a3b8'); g.globalAlpha = 1; }
        D.text(g, `${got} / ${need}`, 700, 36, { size: 22, color: exitOpen ? '#4ade80' : '#e2e8f0', align: 'left' });
        const tcol = timeLeft < 20 ? '#f87171' : '#fde68a';
        D.text(g, `⏱ ${Math.max(0, Math.ceil(timeLeft))}`, 935, 36, { size: 22, color: tcol, align: 'right' });
        D.vignette(g, 960, 600, 0.35);
      },
    };
  },
});

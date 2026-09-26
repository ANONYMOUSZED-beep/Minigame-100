MG.add({
  id: 'invaders', name: 'Star Invaders', cat: 'Arcade', color: '#4ade80', color2: '#22d3ee',
  desc: 'The marching horde returns in glowing pixel form. Hold the line behind crumbling bunkers.',
  how: ['<kbd>←</kbd> <kbd>→</kbd> move · <kbd>Space</kbd> fire', 'The fleet speeds up as it shrinks', 'Bunkers absorb shots from both sides — use them wisely', 'Snipe the mystery saucer for up to 300 points'],
  pad: 'LRA', padLabels: { A: 'FIRE' },
  make(E) {
    const W = 960, H = 600, PX = 3;
    const SPR = {
      squid: [['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'], ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.']],
      crab: [['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'], ['..#.....#..', '#..#...#..#', '#.#######.#', '###.###.###', '###########', '.#########.', '..#.....#..', '.#.......#.']],
      octo: [['....####....', '.##########.', '############', '###..##..###', '############', '...##..##...', '..##.##.##..', '##........##'], ['....####....', '.##########.', '############', '###..##..###', '############', '..###..###..', '.##..##..##.', '..##....##..']],
      ufo: [['......######......', '...############...', '..##############..', '.##.##.##.##.##.##.', '##################', '...###..##..###...', '....#........#....']],
      cannon: [['......#......', '.....###.....', '.....###.....', '.###########.', '#############', '#############', '#############']],
    };
    const cache = {};
    function sprite(name, frame, color) {
      const key = name + frame + color;
      if (cache[key]) return cache[key];
      const rows = SPR[name][frame], c = document.createElement('canvas');
      c.width = rows[0].length * PX; c.height = rows.length * PX;
      const x = c.getContext('2d'); x.fillStyle = color;
      rows.forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && x.fillRect(i * PX, j * PX, PX, PX)));
      return (cache[key] = c);
    }
    const ROWS = [['squid', '#f472b6', 30], ['crab', '#22d3ee', 20], ['crab', '#22d3ee', 20], ['octo', '#4ade80', 10], ['octo', '#4ade80', 10]];
    let aliens, dir, stepT, frame, wave = 0, lives = 3, shot = null, bombs = [], bunkers = [], ufo = null, ufoT = 16, dead = 0, dropNext = false, march = 0, clearing = false;
    const pl = { x: W / 2, y: 552, w: 39 };
    const stars = D.makeStars(90, W, H, 5);
    function buildBunkers() {
      bunkers = [];
      const shape = ['....############....', '..################..', '.##################.', '####################', '####################', '####################', '####################', '######........######', '#####..........#####', '####............####'];
      for (let b = 0; b < 4; b++) {
        const ox = 150 + b * 200, oy = 460;
        shape.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') bunkers.push({ x: ox + i * 4, y: oy + j * 4, a: true }); }));
      }
    }
    function newWave() {
      wave++; E.stat('Wave', wave);
      aliens = []; dir = 1; stepT = 0; frame = 0; dropNext = false; clearing = false;
      const top = 90 + Math.min(wave - 1, 5) * 18;
      ROWS.forEach(([type, col, pts], r) => { for (let c = 0; c < 11; c++) aliens.push({ type, col, pts, x: 190 + c * 54, y: top + r * 44, alive: true, r, c, w: SPR[type][0][0].length * PX, h: 24 }); });
      bombs = []; shot = null;
      if (wave === 1 || wave % 3 === 1) buildBunkers();
      if (wave > 1) E.banner('WAVE ' + wave, 'They are getting faster');
    }
    newWave();
    E.stat('Lives', lives);
    const alive = () => aliens.filter((a) => a.alive);
    function erode(x, y, rad) {
      let any = false;
      for (const b of bunkers) if (b.a && Math.abs(b.x + 2 - x) < rad && Math.abs(b.y + 2 - y) < rad && Math.random() < 0.75) { b.a = false; any = true; }
      if (any) E.burst(x, y, { n: 6, color: '#4ade80', speed: 90, size: 2, shape: 'square', glow: false });
      return any;
    }
    const bunkerAt = (x, y) => bunkers.some((b) => b.a && x >= b.x && x < b.x + 4 && y >= b.y && y < b.y + 4);
    function hitPlayer() {
      lives--; E.stat('Lives', Math.max(0, lives));
      E.sfx('explode', 0.9); E.shake(16); E.flash('#f43f5e', 0.35); E.freeze(0.1); E.vibrate(160);
      E.burst(pl.x, pl.y, { n: 50, colors: ['#4ade80', '#fff', '#fde68a'], speed: 300 });
      pl.dead = 1.4; bombs = [];
      if (lives <= 0) E.after(1, () => E.over({ msg: `Fell on wave ${wave}` }));
    }
    return {
      update(dt) {
        const list = alive();
        // player
        if (pl.dead > 0) { pl.dead -= dt; }
        else {
          if (E.ptr.down) pl.x = U.approach(pl.x, E.ptr.x, 380 * dt); else pl.x += E.axis().x * 360 * dt;
          pl.x = U.clamp(pl.x, 30, W - 30);
          if ((E.hit('A', 'U') || E.ptr.hit || (E.down('A') && !shot)) && !shot) { shot = { x: pl.x, y: pl.y - 14 }; E.sfx('shoot', 1.3, 0.8); }
        }
        if (shot) {
          shot.y -= 820 * dt;
          if (shot.y < 30) { E.burst(shot.x, 30, { n: 5, color: '#fff', speed: 80, size: 2 }); shot = null; }
          else if (bunkerAt(shot.x, shot.y)) { erode(shot.x, shot.y, 7); shot = null; }
          else {
            for (const a of list) if (U.ptInRect(shot.x, shot.y, a.x, a.y, a.w, a.h)) {
              a.alive = false; shot = null; dead++;
              const pts = a.pts * (1 + Math.floor((wave - 1) / 2));
              E.score += pts;
              E.burst(a.x + a.w / 2, a.y + 12, { n: 18, colors: [a.col, '#fff'], speed: 220, shape: 'square', size: 3 });
              E.pop(a.x + a.w / 2, a.y, '+' + pts, { color: a.col, size: 16 });
              E.sfx('hit', 1.2, 0.6); E.shake(3);
              break;
            }
            if (shot && ufo && Math.abs(shot.x - ufo.x) < 27 && Math.abs(shot.y - ufo.y) < 12) {
              const pts = U.pick([50, 100, 150, 300]); E.score += pts;
              E.pop(ufo.x, ufo.y, '+' + pts, { color: '#f43f5e', size: 24 }); E.burst(ufo.x, ufo.y, { n: 40, colors: ['#f43f5e', '#fde68a', '#fff'], speed: 300, shape: 'spark' });
              E.sfx('explode', 1.3); E.shake(8); ufo = null; shot = null;
            }
          }
        }
        // march
        if (!clearing && list.length) {
          const iv = Math.max(0.035, (list.length / 55) * 0.62 - wave * 0.015);
          stepT += dt;
          if (stepT >= iv) {
            stepT = 0; frame ^= 1; march = (march + 1) % 4;
            E.tone({ f: [98, 87, 78, 73][march], dur: 0.09, type: 'square', vol: 0.18, lp: 600 });
            if (dropNext) { list.forEach((a) => (a.y += 18)); dir = -dir; dropNext = false; }
            else {
              list.forEach((a) => (a.x += dir * 9));
              const minX = Math.min(...list.map((a) => a.x)), maxX = Math.max(...list.map((a) => a.x + a.w));
              if (maxX > W - 24 || minX < 24) dropNext = true;
            }
            list.forEach((a) => { if (a.y + a.h > 452) erode(a.x + a.w / 2, a.y + a.h, 22); });
            if (list.some((a) => a.y + a.h >= pl.y - 10) && lives > 0) { lives = 1; hitPlayer(); }
          }
          // alien bombs
          const rate = 0.7 + wave * 0.25 + (55 - list.length) * 0.02;
          if (Math.random() < rate * dt && bombs.length < 3 + wave && pl.dead <= 0) {
            const cols = {}; list.forEach((a) => { if (!cols[a.c] || cols[a.c].y < a.y) cols[a.c] = a; });
            const cands = Object.values(cols);
            const target = U.chance(0.5) ? cands.reduce((b, a) => (Math.abs(a.x - pl.x) < Math.abs(b.x - pl.x) ? a : b), cands[0]) : U.pick(cands);
            bombs.push({ x: target.x + target.w / 2, y: target.y + target.h, t: 0, kind: U.ri(0, 1), vy: 220 + wave * 15 });
          }
        }
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i]; b.y += b.vy * dt; b.t += dt;
          if (bunkerAt(b.x, b.y + 6)) { erode(b.x, b.y + 6, 8); bombs.splice(i, 1); continue; }
          if (pl.dead <= 0 && Math.abs(b.x - pl.x) < pl.w / 2 && b.y > pl.y - 12 && b.y < pl.y + 10) { bombs.splice(i, 1); hitPlayer(); continue; }
          if (shot && Math.abs(shot.x - b.x) < 6 && Math.abs(shot.y - b.y) < 12) { E.burst(b.x, b.y, { n: 8, color: '#fde68a', speed: 120 }); bombs.splice(i, 1); shot = null; E.score += 5; continue; }
          if (b.y > H) bombs.splice(i, 1);
        }
        // ufo
        ufoT -= dt;
        if (!ufo && ufoT <= 0 && list.length > 8) { const d = U.chance(0.5) ? 1 : -1; ufo = { x: d > 0 ? -40 : W + 40, y: 58, vx: d * 140 }; ufoT = U.rand(18, 28); }
        if (ufo) { ufo.x += ufo.vx * dt; if (Math.random() < dt * 10) E.tone({ f: 600 + Math.sin(E.t * 20) * 200, dur: 0.06, type: 'sine', vol: 0.08 }); if (ufo.x < -60 || ufo.x > W + 60) ufo = null; }
        if (!list.length && !clearing) { clearing = true; E.sfx('win'); E.score += 500 * wave; E.pop(W / 2, H / 2 + 40, `+${500 * wave} WAVE BONUS`, { color: '#fde68a', size: 26 }); E.after(1.8, newWave); }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#02030a', '#0a0a1f');
        D.stars(g, stars, W, H, t, 0, t * 6);
        // ground
        g.fillStyle = 'rgba(74,222,128,.7)'; g.fillRect(0, 578, W, 2);
        D.glow(g, W / 2, 579, 400, '#4ade80', 0.08);
        for (const b of bunkers) if (b.a) { g.fillStyle = '#4ade80'; g.fillRect(b.x, b.y, 4, 4); }
        for (const a of aliens) if (a.alive) {
          const s = sprite(a.type, frame, a.col);
          D.glow(g, a.x + a.w / 2, a.y + 12, 34, a.col, 0.28);
          g.drawImage(s, Math.round(a.x), Math.round(a.y));
        }
        if (ufo) { D.glow(g, ufo.x, ufo.y, 50, '#f43f5e', 0.6); g.drawImage(sprite('ufo', 0, '#f43f5e'), ufo.x - 27, ufo.y - 10); }
        if (shot) { D.glow(g, shot.x, shot.y, 14, '#fff', 0.8); g.fillStyle = '#fff'; g.fillRect(shot.x - 1.5, shot.y - 8, 3, 14); }
        for (const b of bombs) {
          D.glow(g, b.x, b.y, 14, '#fde68a', 0.7);
          g.strokeStyle = '#fde68a'; g.lineWidth = 3; g.beginPath();
          for (let k = 0; k < 4; k++) { const yy = b.y - 12 + k * 4, xx = b.x + (b.kind ? ((k + Math.floor(b.t * 20)) % 2 ? 3 : -3) : 0); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
          g.stroke();
        }
        if (pl.dead <= 0 || (pl.dead < 0.6 && Math.sin(t * 40) > 0)) {
          if (pl.dead <= 0) { D.glow(g, pl.x, pl.y, 40, '#4ade80', 0.4); g.drawImage(sprite('cannon', 0, '#86efac'), pl.x - 19.5, pl.y - 10); }
        }
        for (let i = 0; i < lives; i++) g.drawImage(sprite('cannon', 0, '#4ade80'), 18 + i * 46, H - 17, 26, 14);
        // CRT scanlines
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
        D.vignette(g, W, H, 0.55);
      },
    };
  },
});

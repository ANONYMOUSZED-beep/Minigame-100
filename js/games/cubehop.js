MG.add({
  id: 'cubehop', name: 'Cube Hop', cat: 'Arcade', color: '#fb923c', color2: '#a855f7',
  desc: 'Hop down an isometric pyramid flipping every cube to the target colour — while a snake hunts you.',
  how: ['Hop diagonally: <kbd>↑</kbd> up-right · <kbd>→</kbd> down-right · <kbd>↓</kbd> down-left · <kbd>←</kbd> up-left', 'Or tap/click toward the cube you want', 'Flip every top to the target colour · later rounds need two hits or toggle back', 'Lure the snake off the edge by riding a spinning disc · green balls freeze enemies'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600, N = 7, CX = 480, CY = 96, SX = 38, SY = 60;
    const PALS = [['#3b82f6', '#facc15'], ['#14b8a6', '#f472b6'], ['#8b5cf6', '#4ade80'], ['#ef4444', '#e2e8f0'], ['#0ea5e9', '#fb923c', '#a3e635']];
    let round = 0, lives = 4, cubes, discs, q, enemies, spawnT, freezeT, state, stateT, target, steps, toggle, pal, curse = null, flashT = 0;
    const pos = (r, c) => [CX + (2 * c - r) * SX, CY + r * SY];
    const onPyr = (r, c) => r >= 0 && r < N && c >= 0 && c <= r;
    const MOVES = { U: [-1, 0], R: [1, 1], D: [1, 0], L: [-1, -1] };
    function newRound() {
      round++; E.stat('Round', round);
      const lvl = Math.floor((round - 1) / 2);
      pal = PALS[Math.min(lvl, PALS.length - 1)];
      steps = lvl >= 4 ? 2 : lvl % 2 === 1 ? 2 : 1; toggle = lvl >= 2 && lvl % 2 === 0;
      if (lvl >= 4) toggle = true;
      target = steps;
      cubes = []; for (let r = 0; r < N; r++) for (let c = 0; c <= r; c++) cubes.push({ r, c, s: 0, pulse: 0 });
      const rows = U.shuffle([2, 3, 4, 5]).slice(0, 2);
      discs = [{ r: rows[0], c: -1, used: false }, { r: rows[1], c: rows[1] + 1, used: false }];
      resetActors();
      E.banner(`ROUND ${round}`, steps === 2 ? (toggle ? 'Two hits · they toggle back!' : 'Two hits per cube') : toggle ? 'Careful — hops toggle cubes back' : 'Flip every cube');
    }
    function resetActors() {
      q = { r: 0, c: 0, fr: 0, fc: 0, t: 1, dir: 'D', disc: null, falling: 0 };
      enemies = []; spawnT = 2.5; freezeT = 0; state = 'play';
    }
    const cube = (r, c) => cubes.find((k) => k.r === r && k.c === c);
    function landQ() {
      const k = cube(q.r, q.c); if (!k) return;
      if (k.s < target) { k.s++; E.score += 25; k.pulse = 1; E.sfx('blip', 1 + k.s * 0.2, 0.6); const [x, y] = pos(q.r, q.c); E.burst(x, y, { n: 10, color: pal[k.s] || pal[pal.length - 1], speed: 160, angle: -Math.PI / 2, spread: 2.4 }); }
      else if (toggle && k.s === target) { k.s--; k.pulse = 1; E.sfx('error', 1.4, 0.4); }
      else E.sfx('tick', 1, 0.4);
      if (cubes.every((k) => k.s === target)) {
        state = 'won'; stateT = 2; E.sfx('win'); E.score += 1000 + round * 250; E.pop(CX, 70, `ROUND BONUS +${1000 + round * 250}`, { color: '#fde68a', size: 24 });
        enemies = [];
      }
    }
    function hopQ(dir) {
      if (q.t < 1 || state !== 'play' || q.disc || q.falling) return;
      const [dr, dc] = MOVES[dir];
      q.fr = q.r; q.fc = q.c; q.r += dr; q.c += dc; q.t = 0; q.dir = dir;
      E.sfx('hop', 0.8, 0.5);
    }
    function die(kind) {
      if (state !== 'play') return;
      state = 'dead'; stateT = 2; lives--; E.stat('Lives', Math.max(0, lives));
      curse = kind === 'fall' ? null : { t: 1.8 };
      E.sfx(kind === 'fall' ? 'whoosh' : 'hurt'); E.shake(10); E.vibrate(160);
      if (kind === 'fall') E.after(0.5, () => E.sfx('thud', 0.6));
    }
    newRound();
    E.stat('Lives', lives);
    function hopEnemy(e) {
      if (e.kind === 'coily') {
        // pick move toward q (or toward disc target when q escaped)
        const tr = q.disc ? q.escR : q.r, tc = q.disc ? q.escC : q.c;
        let best = null, bd = 1e9;
        for (const d of ['U', 'R', 'D', 'L']) {
          const [dr, dc] = MOVES[d], nr = e.r + dr, nc = e.c + dc;
          const [x1, y1] = pos(nr, nc), [x2, y2] = pos(tr, tc), dd = U.dist(x1, y1, x2, y2);
          if ((onPyr(nr, nc) || (q.disc && nr === tr && nc === tc)) && dd < bd) { bd = dd; best = [nr, nc]; }
        }
        if (best) { e.fr = e.r; e.fc = e.c; e.r = best[0]; e.c = best[1]; e.t = 0; }
      } else {
        e.fr = e.r; e.fc = e.c; e.r += 1; e.c += U.chance(0.5) ? 1 : 0; e.t = 0;
      }
    }
    function drawCube(g, k) {
      const [x, y] = pos(k.r, k.c), p = k.pulse;
      const top = pal[k.s];
      const h = 41, ht = 19;
      g.fillStyle = '#1e1b4b'; g.beginPath(); g.moveTo(x - SX, y); g.lineTo(x, y + ht); g.lineTo(x, y + ht + h); g.lineTo(x - SX, y + h); g.closePath(); g.fill();
      g.fillStyle = '#312e81'; g.beginPath(); g.moveTo(x + SX, y); g.lineTo(x, y + ht); g.lineTo(x, y + ht + h); g.lineTo(x + SX, y + h); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + ht); g.lineTo(x, y + ht + h); g.stroke();
      const gr = g.createLinearGradient(x, y - ht, x, y + ht);
      gr.addColorStop(0, U.shade(top, 0.35 + p * 0.4)); gr.addColorStop(1, U.shade(top, p * 0.3));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - ht); g.lineTo(x + SX, y); g.lineTo(x, y + ht); g.lineTo(x - SX, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.stroke();
      if (k.s === target) D.glow(g, x, y, 40, top, 0.2);
    }
    function actorXY(a) {
      const k = U.clamp(a.t, 0, 1);
      const [x1, y1] = pos(a.fr, a.fc), [x2, y2] = pos(a.r, a.c);
      const arc = Math.sin(k * Math.PI) * (y2 < y1 ? 60 : 36);
      return [U.lerp(x1, x2, k), U.lerp(y1, y2, k) - arc - 16 + (a.fall || 0)];
    }
    function drawQ(g) {
      let [x, y] = q.disc ? [q.disc.x, q.disc.y - 20] : actorXY(q);
      if (q.falling) y += q.falling;
      const face = q.dir === 'U' || q.dir === 'R' ? 1 : -1, up = q.dir === 'U' || q.dir === 'L';
      D.shadow(g, x, pos(q.r, q.c)[1], 16, 6, q.falling || q.disc ? 0 : 0.35);
      g.save(); g.translate(x, y); g.scale(face, 1);
      D.orb(g, 0, 0, 16, '#fb923c');
      g.fillStyle = '#ea580c'; g.save(); g.translate(10, up ? -4 : 4); g.rotate(up ? -0.5 : 0.5); D.fillRR(g, 0, -5, 16, 10, 5, '#f97316'); D.circle(g, 16, 0, 5, '#111'); g.restore();
      D.circle(g, 2, -6, 5, '#fff'); D.circle(g, 3.5 + (up ? 1 : 0), -6 + (up ? -1.5 : 1.5), 2.4, '#111');
      D.circle(g, -6, -5, 4.5, '#fff'); D.circle(g, -5, -5 + (up ? -1.5 : 1.5), 2.1, '#111');
      g.fillStyle = '#9a3412'; g.fillRect(-9, 14, 7, 6); g.fillRect(3, 14, 7, 6);
      g.restore();
      if (curse && state === 'dead') {
        D.fillRR(g, x + 10, y - 70, 96, 38, 12, '#fff');
        D.poly(g, [[x + 22, y - 34], [x + 12, y - 18], [x + 36, y - 34]], '#fff');
        D.text(g, '@!#?@!', x + 58, y - 51, { size: 20, color: '#111' });
      }
    }
    return {
      update(dt) {
        flashT = Math.max(0, flashT - dt);
        for (const k of cubes) k.pulse = Math.max(0, k.pulse - dt * 3);
        if (state === 'won') { stateT -= dt; flashT = 0.1; if (stateT <= 0) newRound(); return; }
        if (state === 'dead') {
          stateT -= dt;
          if (q.falling) q.falling += dt * 500 * (q.falling / 100 + 1);
          if (stateT <= 0) { if (lives <= 0) { state = 'over'; E.over({ msg: `Reached round ${round}` }); } else { resetActors(); } }
          return;
        }
        // input
        let dir = null;
        for (const k of ['U', 'R', 'D', 'L']) if (E.hit(k) || E.down(k)) dir = k;
        if (E.ptr.hit || (E.ptr.down && q.t >= 1)) {
          const [x, y] = actorXY(q), dx = E.ptr.x - x, dy = E.ptr.y - (y + 16);
          if (Math.hypot(dx, dy) > 20) dir = dy < 0 ? (dx > 0 ? 'U' : 'L') : dx > 0 ? 'R' : 'D';
        }
        if (dir) hopQ(dir);
        // q movement
        if (q.disc) {
          const d = q.disc; d.t += dt / 1.8;
          const [sx, sy] = pos(d.r, d.c), [tx, ty] = pos(0, 0);
          d.x = U.lerp(sx, tx, U.ease.inOutQuad(Math.min(1, d.t))); d.y = U.lerp(sy, ty - 70, U.ease.inOutQuad(Math.min(1, d.t)));
          if (d.t >= 1) { q.disc = null; q.r = 0; q.c = 0; q.fr = -1; q.fc = 0; q.t = 0.3; d.gone = true; }
        } else if (q.t < 1) {
          q.t = Math.min(1, q.t + dt / 0.32);
          if (q.t >= 1) {
            if (onPyr(q.r, q.c)) landQ();
            else {
              const d = discs.find((d) => !d.used && d.r === q.r && d.c === q.c);
              if (d) { d.used = true; d.t = 0; q.disc = d; q.escR = q.r; q.escC = q.c; E.sfx('charge', 1.5); E.score += 50; enemies = enemies.filter((e) => e.kind === 'coily'); }
              else { q.falling = 1; die('fall'); return; }
            }
          }
        }
        // enemies
        if (freezeT > 0) freezeT -= dt;
        spawnT -= dt;
        if (spawnT <= 0 && !q.disc) {
          spawnT = Math.max(1.4, 4.2 - round * 0.25) * U.rand(0.8, 1.2);
          const hasCoily = enemies.some((e) => e.kind === 'coily' || e.kind === 'egg');
          const roll = Math.random();
          const kind = !hasCoily && roll < 0.35 ? 'egg' : roll < 0.12 ? 'green' : 'red';
          enemies.push({ kind, r: 1, c: U.ri(0, 1), fr: -1, fc: 0, t: 0, wait: 0.4, fall: 0 });
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.dead) { e.fall += dt * 700; if (e.fall > 700) enemies.splice(i, 1); continue; }
          if (freezeT > 0 && e.kind !== 'green') continue;
          if (e.t < 1) {
            e.t = Math.min(1, e.t + dt / (e.kind === 'coily' ? 0.4 : 0.34));
            if (e.t >= 1) {
              E.sfx('tick', e.kind === 'coily' ? 0.5 : 0.8, 0.35);
              if (!onPyr(e.r, e.c)) {
                e.dead = true;
                if (e.kind === 'coily') { E.score += 500; E.pop(pos(e.r, e.c)[0], pos(e.r, e.c)[1] - 40, '+500', { color: '#c084fc', size: 26 }); E.sfx('lose', 1.5); }
                continue;
              }
              e.wait = e.kind === 'coily' ? 0.25 : 0.28;
              if (e.kind === 'egg' && e.r === N - 1) { e.kind = 'coily'; e.wait = 0.6; E.sfx('charge', 0.7); }
            }
          } else {
            e.wait -= dt;
            if (e.wait <= 0) { if (e.kind !== 'coily' && e.r >= N - 1) { e.fr = e.r; e.fc = e.c; e.r++; e.t = 0; } else hopEnemy(e); }
          }
          // collision: both near same cube
          if (!q.disc && !q.falling && q.t > 0.75 && e.t > 0.75 && e.r === q.r && e.c === q.c && onPyr(q.r, q.c)) {
            if (e.kind === 'green') { freezeT = 3.5; enemies.splice(i, 1); E.score += 100; E.sfx('power'); E.flash('#4ade80', 0.25); E.pop(...pos(q.r, q.c), 'FREEZE!', { color: '#4ade80' }); continue; }
            die('hit'); return;
          }
        }
        if (q.disc) { const c = enemies.find((e) => e.kind === 'coily'); if (!c) spawnT = Math.max(spawnT, 1); }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1e1b4b', '#050313', CX, 260);
        g.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
        for (const k of cubes) drawCube(g, k);
        // discs
        for (const d of discs) {
          if (d.gone) continue;
          const [x, y] = d.t !== undefined && q.disc === d ? [d.x, d.y] : pos(d.r, d.c);
          const hue = (t * 200) % 360;
          D.glow(g, x, y, 40, U.hsl(hue, 90, 60), 0.6);
          g.fillStyle = U.hsl(hue, 90, 65); g.beginPath(); g.ellipse(x, y, 24, 9, 0, 0, U.TAU); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 24 * Math.abs(Math.cos(t * 6)), 9, 0, 0, U.TAU); g.stroke();
        }
        // enemies behind / in front sorted by row
        const actors = enemies.map((e) => ({ e, y: actorXY(e)[1] }));
        actors.sort((a, b) => a.y - b.y);
        for (const { e } of actors) {
          let [x, y] = actorXY(e); y += e.fall;
          if (e.fr < 0) y -= (1 - e.t) * 200;
          const frozen = freezeT > 0 && e.kind !== 'green';
          if (e.kind === 'coily') {
            D.shadow(g, x, pos(e.r, e.c)[1], 14, 5, 0.3);
            g.fillStyle = frozen ? '#93c5fd' : '#a855f7';
            for (let s = 3; s >= 0; s--) D.circle(g, x + Math.sin(t * 8 + s) * 3, y + 8 - s * 7, 10 - s, s === 0 ? g.fillStyle : U.shade(frozen ? '#93c5fd' : '#a855f7', -0.1 * s));
            D.circle(g, x, y - 22, 11, frozen ? '#93c5fd' : '#c084fc');
            D.circle(g, x - 4, y - 24, 3.5, '#fff'); D.circle(g, x + 4, y - 24, 3.5, '#fff'); D.circle(g, x - 4, y - 23, 1.6, '#111'); D.circle(g, x + 4, y - 23, 1.6, '#111');
            D.line(g, x, y - 14, x + (Math.sin(t * 12) > 0 ? 6 : 4), y - 8, '#f43f5e', 2);
          } else {
            const col = e.kind === 'red' ? '#ef4444' : e.kind === 'green' ? '#4ade80' : '#a855f7';
            D.shadow(g, x, pos(e.r, e.c)[1], 11, 4, 0.3);
            D.glow(g, x, y, 26, col, 0.35);
            D.orb(g, x, y + 4, e.kind === 'egg' ? 11 : 10, frozen ? '#93c5fd' : col);
          }
        }
        drawQ(g);
        // HUD: target colour + compass
        D.text(g, 'TARGET', 66, 30, { size: 12, font: 'mono', color: 'rgba(255,255,255,.6)' });
        pal.slice(0, target + 1).forEach((c, i) => { const x = 40 + i * 30, y = 58; g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 14, y); g.lineTo(x, y + 10); g.lineTo(x - 14, y); g.closePath(); g.fill(); if (i < target) D.text(g, '›', x + 15, y, { size: 16, color: '#fff' }); });
        const cx = W - 70, cy = 60;
        D.circle(g, cx, cy, 36, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.15)', 1.5);
        [['↑', 1, -1], ['→', 1, 1], ['↓', -1, 1], ['←', -1, -1]].forEach(([k, dx, dy]) => D.text(g, k, cx + dx * 18, cy + dy * 18, { size: 16, color: '#fde68a' }));
        for (let i = 0; i < lives - 1; i++) D.orb(g, 30 + i * 26, H - 30, 9, '#fb923c');
        if (freezeT > 0) { g.fillStyle = `rgba(147,197,253,${0.08 + 0.04 * Math.sin(t * 10)})`; g.fillRect(0, 0, W, H); }
        if (flashT > 0 && state === 'won') { cubes.forEach((k) => (k.pulse = Math.floor(t * 10) % 2)); }
        D.vignette(g, W, H, 0.45);
      },
    };
  },
});

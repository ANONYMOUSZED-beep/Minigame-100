MG.add({
  id: 'breakout', name: 'Brick Blitz', cat: 'Arcade', color: '#ff9f1c', color2: '#ff4d6d',
  desc: 'Shatter walls of neon glass. Catch capsules for multiball, lasers, fireballs and more.',
  how: ['Move with mouse / touch or <kbd>←</kbd> <kbd>→</kbd>', 'Click or <kbd>Space</kbd> to launch — and to fire lasers', 'Paddle edges send the ball at steeper angles', 'Gold bricks explode · steel bricks only break to a fireball'],
  pad: 'LRA',
  make(E) {
    const W = 960, H = 600, BW = 72, BH = 24, GAP = 4, COLS = 12, OX = (W - COLS * (BW + GAP) + GAP) / 2, OY = 62;
    const PAL = ['#ff4d6d', '#ff9f1c', '#ffd166', '#06d6a0', '#4cc9f0', '#a78bfa', '#f472b6', '#ff4d6d'];
    const CAPS = { multi: ['#4cc9f0', 'M'], wide: ['#06d6a0', 'W'], laser: ['#ff4d6d', 'L'], slow: ['#a78bfa', 'S'], life: ['#f472b6', '♥'], fire: ['#ff9f1c', 'F'] };
    const PATTERNS = [
      (c, r) => (r < 6 ? { hp: r < 2 ? 2 : 1 } : null),
      (c, r) => (r < 7 && Math.abs(c - 5.5) < r + 0.6 ? { hp: r < 3 ? 2 : 1, type: r === 6 && c % 5 === 3 ? 'gold' : 'n' } : null),
      (c, r) => (r < 8 && (c + r) % 2 === 0 ? { hp: 1 + (r % 3 === 0 ? 1 : 0) } : null),
      (c, r) => { const d = Math.abs(c - 5.5) + Math.abs(r - 3.5); return d < 5.5 ? { hp: d < 2 ? 3 : d < 3.5 ? 2 : 1, type: d < 1 ? 'gold' : 'n' } : null; },
      (c, r) => (r < 7 ? (r === 3 && c % 3 !== 1 ? { type: 'steel' } : { hp: 1 + (r < 3 ? 1 : 0), type: r === 5 && c % 4 === 1 ? 'gold' : 'n' }) : null),
      (c, r) => (r < 8 && (c < 2 || c > 9 || r % 3 === 0) ? { hp: 1 + (r % 3 === 0 ? 1 : 0), type: r === 0 && (c === 3 || c === 8) ? 'gold' : 'n' } : null),
      (c, r) => (r < 8 && Math.sin(c * 0.9 + r * 0.6) > -0.2 ? { hp: 1 + ((c + r) % 3 === 0 ? 1 : 0), type: (c * 7 + r * 3) % 17 === 0 ? 'gold' : 'n' } : null),
      (c, r) => (r < 8 && (r === 0 || r === 7 || c === 0 || c === 11) ? { type: r === 7 && c > 3 && c < 8 ? 'n' : 'steel', hp: 1 } : r > 1 && r < 6 && c > 1 && c < 10 ? { hp: 2 + (r % 2), type: r === 3 && (c === 5 || c === 6) ? 'gold' : 'n' } : null),
    ];
    let level = 0, lives = 3, bricks = [], balls = [], caps = [], lasers = [], combo = 0, shotCd = 0, clearT = -1, usePtr = false;
    const pad = { x: W / 2, w: 120, tw: 120, y: 560, h: 16, squash: 0 };
    const T = { wide: 0, laser: 0, slow: 0, fire: 0 };
    const bg = D.makeStars(60, W, H, 11);

    function buildLevel() {
      bricks = [];
      const pat = PATTERNS[level % PATTERNS.length], extra = Math.floor(level / PATTERNS.length);
      for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) {
        const b = pat(c, r); if (!b) continue;
        const type = b.type || 'n', hp = type === 'steel' ? 99 : Math.min(4, (b.hp || 1) + extra);
        bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), w: BW, h: BH, hp, max: hp, type, color: PAL[r], hitT: 0, born: E.t + (c + r) * 0.02 });
      }
    }
    function resetBall() {
      balls = [{ x: pad.x, y: pad.y - 12, vx: 0, vy: 0, r: 8, stuck: true, trail: [] }];
    }
    const baseSpeed = () => Math.min(760, 430 + level * 32);
    buildLevel(); resetBall();
    E.stat('Lives', '♥'.repeat(lives)); E.stat('Level', 1);

    function launch() {
      for (const b of balls) if (b.stuck) {
        b.stuck = false; const a = -Math.PI / 2 + U.rand(-0.35, 0.35), sp = baseSpeed();
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; E.sfx('bounce', 1.3);
      }
    }
    function destroy(br, ball) {
      if (br.dead) return;
      br.dead = true;
      combo++;
      const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
      const pts = (br.type === 'gold' ? 100 : 50) * Math.min(combo, 8);
      E.score += pts;
      E.burst(cx, cy, { n: 14, colors: [br.color, U.shade(br.color, 0.5), '#fff'], shape: 'square', speed: 260, size: 4, grav: 600, life: 0.8 });
      if (combo > 2) E.pop(cx, cy, `+${pts}`, { color: '#ffd166', size: 18 });
      E.sfx('pop', 0.8 + Math.min(combo, 12) * 0.07);
      E.shake(br.type === 'gold' ? 12 : 3);
      if (br.type === 'gold') {
        E.sfx('explode', 1.2, 0.6); E.flash('#ffd166', 0.25); E.ring(cx, cy, { color: '#ffd166', r: 130, lw: 8 });
        E.burst(cx, cy, { n: 40, colors: ['#ffd166', '#ff9f1c', '#fff'], speed: 420, shape: 'spark' });
        E.after(0.08, () => bricks.forEach((o) => { if (!o.dead && o.type !== 'steel' && Math.abs(o.x - br.x) <= BW + GAP + 1 && Math.abs(o.y - br.y) <= BH + GAP + 1) hurt(o, 99); }));
      }
      if (U.chance(0.14) && caps.length < 3) {
        const k = U.pick(Object.keys(CAPS).filter((k) => k !== 'life' || U.chance(0.4)));
        caps.push({ x: cx, y: cy, k, vy: 140 });
      }
    }
    function hurt(br, dmg, ball) {
      if (br.dead) return;
      if (br.type === 'steel' && dmg < 99) { br.hitT = 1; E.sfx('click', 0.6); return; }
      br.hp -= dmg; br.hitT = 1;
      if (br.hp <= 0) destroy(br, ball); else { E.sfx('click', 1 + br.hp * 0.2); E.burst(br.x + br.w / 2, br.y + br.h / 2, { n: 5, color: '#fff', speed: 120, size: 2 }); }
    }
    function catchCap(c) {
      const [col] = CAPS[c.k];
      E.sfx('power'); E.ring(c.x, pad.y, { color: col, r: 80 });
      E.pop(c.x, pad.y - 30, { multi: 'MULTIBALL', wide: 'WIDE', laser: 'LASERS', slow: 'SLOW-MO', life: '+1 LIFE', fire: 'FIREBALL' }[c.k], { color: col, size: 20 });
      if (c.k === 'multi') {
        const src = balls.filter((b) => !b.stuck);
        const base = src.length ? src : balls;
        base.slice(0, 3).forEach((b) => { for (const s of [-1, 1]) { const a = Math.atan2(b.vy || -1, b.vx) + s * 0.45, sp = Math.max(baseSpeed(), Math.hypot(b.vx, b.vy)); balls.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, stuck: false, trail: [] }); } });
      } else if (c.k === 'life') { lives = Math.min(6, lives + 1); E.stat('Lives', '♥'.repeat(lives)); }
      else T[c.k] = c.k === 'fire' ? 7 : 12;
    }

    return {
      update(dt) {
        const slow = T.slow > 0 ? 0.6 : 1;
        for (const k in T) T[k] = Math.max(0, T[k] - dt);
        pad.tw = T.wide > 0 ? 190 : 120;
        pad.w = U.damp(pad.w, pad.tw, 12, dt);
        pad.squash = U.damp(pad.squash, 0, 10, dt);
        // input
        if (E.ptr.moved) usePtr = true;
        const ax = E.axis().x;
        if (ax) usePtr = false;
        if (usePtr) pad.x = U.damp(pad.x, E.ptr.x, 30, dt);
        else pad.x += ax * 780 * dt;
        pad.x = U.clamp(pad.x, pad.w / 2 + 4, W - pad.w / 2 - 4);
        const fire = E.hit('A', 'U') || E.ptr.hit;
        if (fire) launch();
        shotCd -= dt;
        if (T.laser > 0 && (E.down('A') || E.ptr.down) && shotCd <= 0 && !balls.some((b) => b.stuck)) {
          shotCd = 0.22; lasers.push({ x: pad.x - pad.w / 2 + 10, y: pad.y - 10 }, { x: pad.x + pad.w / 2 - 10, y: pad.y - 10 }); E.sfx('laser', 1.4, 0.6);
        }
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i]; l.y -= 900 * dt;
          const hit = bricks.find((b) => !b.dead && U.ptInRect(l.x, l.y, b.x, b.y, b.w, b.h));
          if (hit) { hurt(hit, 1); E.burst(l.x, l.y, { n: 6, color: '#ff4d6d', speed: 160, size: 2 }); lasers.splice(i, 1); }
          else if (l.y < 0) lasers.splice(i, 1);
        }
        // balls
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          if (b.stuck) { b.x = pad.x; b.y = pad.y - pad.h / 2 - b.r - 1; b.trail.length = 0; continue; }
          const sp = Math.hypot(b.vx, b.vy), steps = Math.ceil((sp * dt * slow) / 5);
          const sdt = (dt * slow) / steps;
          for (let s = 0; s < steps; s++) {
            const px = b.x, py = b.y;
            b.x += b.vx * sdt; b.y += b.vy * sdt;
            if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); E.sfx('tick', 0.8, 0.5); }
            if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); E.sfx('tick', 0.8, 0.5); }
            if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); E.sfx('tick', 0.8, 0.5); }
            // paddle
            if (b.vy > 0 && b.y + b.r >= pad.y - pad.h / 2 && b.y < pad.y + pad.h / 2 && Math.abs(b.x - pad.x) < pad.w / 2 + b.r) {
              const rel = U.clamp((b.x - pad.x) / (pad.w / 2), -1, 1), a = -Math.PI / 2 + rel * 1.05;
              const nsp = Math.min(baseSpeed() + 140, Math.hypot(b.vx, b.vy) + 6);
              b.vx = Math.cos(a) * nsp; b.vy = Math.sin(a) * nsp; b.y = pad.y - pad.h / 2 - b.r;
              pad.squash = 1; combo = 0;
              E.sfx('bounce', 0.9 + Math.abs(rel) * 0.3); E.burst(b.x, b.y + b.r, { n: 6, color: '#ffd166', speed: 140, angle: -Math.PI / 2, spread: 2, size: 2.5 });
            }
            // bricks
            for (const br of bricks) {
              if (br.dead || !U.circRect(b.x, b.y, b.r, br.x, br.y, br.w, br.h)) continue;
              if (T.fire > 0) { hurt(br, 99, b); continue; }
              const wasX = px < br.x || px > br.x + br.w, wasY = py < br.y || py > br.y + br.h;
              if (wasY || !wasX) { b.vy = -b.vy; b.y = py; } else { b.vx = -b.vx; b.x = px; }
              if (wasX && wasY) { b.vx = -b.vx; b.x = px; }
              hurt(br, 1, b);
              break;
            }
          }
          // keep ball from going too horizontal
          const ang = Math.atan2(b.vy, b.vx), spd = Math.hypot(b.vx, b.vy);
          if (Math.abs(Math.sin(ang)) < 0.22) { const s = Math.sign(b.vy) || -1; b.vy = s * spd * 0.25; b.vx = Math.sign(b.vx) * spd * 0.968; }
          b.trail.push([b.x, b.y]); if (b.trail.length > 10) b.trail.shift();
          if (b.y > H + 20) balls.splice(i, 1);
        }
        if (!balls.length && clearT < 0) {
          lives--; E.stat('Lives', lives > 0 ? '♥'.repeat(lives) : '—');
          E.sfx('hurt'); E.shake(12); E.flash('#ff4d6d', 0.3);
          for (const k in T) T[k] = 0;
          if (lives <= 0) { E.over({ msg: `Reached level ${level + 1}` }); return; }
          resetBall();
        }
        // capsules
        for (let i = caps.length - 1; i >= 0; i--) {
          const c = caps[i]; c.y += c.vy * dt;
          if (c.y > pad.y - 16 && c.y < pad.y + 16 && Math.abs(c.x - pad.x) < pad.w / 2 + 16) { catchCap(c); caps.splice(i, 1); }
          else if (c.y > H + 20) caps.splice(i, 1);
        }
        for (const br of bricks) br.hitT = Math.max(0, br.hitT - dt * 5);
        bricks = bricks.filter((b) => !b.dead);
        if (clearT < 0 && !bricks.some((b) => b.type !== 'steel')) {
          clearT = 1.6; E.sfx('win'); E.banner('WALL CLEARED', `+${1000 * (level + 1)} bonus`); E.score += 1000 * (level + 1);
          balls.forEach((b) => E.burst(b.x, b.y, { n: 20, color: '#fff', speed: 200 })); balls = []; caps = []; lasers = [];
        }
        if (clearT >= 0) {
          clearT -= dt;
          if (clearT < 0) { level++; E.stat('Level', level + 1); buildLevel(); resetBall(); for (const k in T) T[k] = 0; }
        }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#1a0b2e', '#07040f');
        D.stars(g, bg, W, H, t, 0, t * 12, '#ffcf9f');
        g.save(); g.globalAlpha = 0.06; g.strokeStyle = '#ff9f1c'; g.lineWidth = 1;
        for (let x = -H; x < W; x += 40) { g.beginPath(); g.moveTo(x + ((t * 20) % 40), H); g.lineTo(x + H + ((t * 20) % 40), 0); g.stroke(); }
        g.restore();
        // bricks
        for (const b of bricks) {
          const appear = U.clamp((t - b.born) * 4, 0, 1); if (appear <= 0) continue;
          const s = U.ease.outBack(appear), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
          if (b.type === 'steel') {
            const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, '#d9e2ec'); gr.addColorStop(0.5, '#7b8794'); gr.addColorStop(1, '#3e4c59');
            D.fillRR(g, b.x, b.y, b.w, b.h, 5, gr);
            g.fillStyle = 'rgba(0,0,0,.35)'; [8, b.w - 8].forEach((ox) => { g.beginPath(); g.arc(b.x + ox, b.y + b.h / 2, 2.5, 0, 6.3); g.fill(); });
          } else {
            const col = b.type === 'gold' ? '#ffd166' : b.max > 1 ? U.mix(b.color, '#ffffff', 0.12 * (b.hp - 1)) : b.color;
            if (b.type === 'gold') D.glow(g, cx, cy, 60, '#ffd166', 0.35 + 0.15 * Math.sin(t * 5));
            D.tile(g, b.x, b.y, b.w, b.h, 6, col, 5);
            g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(b.x + 6, b.y + 3, b.w - 12, 2);
            if (b.type === 'gold') D.star(g, cx, cy - 2, 7, 3, 4, t, '#fff8');
            if (b.hp < b.max) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(b.x + 20, b.y + 2); g.lineTo(b.x + 30, b.y + 10); g.lineTo(b.x + 26, b.y + 18); if (b.hp < b.max - 1) { g.moveTo(b.x + 50, b.y + 3); g.lineTo(b.x + 44, b.y + 12); g.lineTo(b.x + 52, b.y + 17); } g.stroke(); }
            if (b.max > 1) for (let i = 0; i < b.hp; i++) D.circle(g, b.x + b.w - 9 - i * 6, b.y + b.h - 10, 1.8, 'rgba(255,255,255,.7)');
          }
          if (b.hitT > 0) { g.globalAlpha = b.hitT; D.fillRR(g, b.x, b.y, b.w, b.h - 5, 6, '#fff'); g.globalAlpha = 1; }
          g.restore();
        }
        // capsules
        for (const c of caps) {
          const [col, ch] = CAPS[c.k];
          D.glow(g, c.x, c.y, 34, col, 0.6);
          D.fillRR(g, c.x - 20, c.y - 10, 40, 20, 10, col);
          D.fillRR(g, c.x - 17, c.y - 8, 34, 7, 4, 'rgba(255,255,255,.35)');
          D.text(g, ch, c.x, c.y + 1, { size: 14, color: '#140b1f' });
        }
        // lasers
        for (const l of lasers) { D.line(g, l.x, l.y, l.x, l.y + 18, '#ff4d6d', 4); D.glow(g, l.x, l.y + 9, 16, '#ff4d6d', 0.8); }
        // paddle
        const pw = pad.w * (1 + pad.squash * 0.12), ph = pad.h * (1 - pad.squash * 0.3);
        D.glow(g, pad.x, pad.y, pw * 0.8, T.fire > 0 ? '#ff6b1c' : '#ff9f1c', 0.35);
        const pg = g.createLinearGradient(0, pad.y - ph / 2, 0, pad.y + ph / 2); pg.addColorStop(0, '#ffe8c2'); pg.addColorStop(0.5, '#ff9f1c'); pg.addColorStop(1, '#c2410c');
        D.fillRR(g, pad.x - pw / 2, pad.y - ph / 2, pw, ph, ph / 2, pg);
        if (T.laser > 0) for (const s of [-1, 1]) D.fillRR(g, pad.x + s * (pw / 2 - 10) - 4, pad.y - ph / 2 - 8, 8, 12, 2, '#ff4d6d');
        // balls
        for (const b of balls) {
          const col = T.fire > 0 ? '#ff6b1c' : '#bdf4ff';
          b.trail.forEach(([x, y], i) => { g.globalAlpha = (i / b.trail.length) * 0.45; D.circle(g, x, y, b.r * (i / b.trail.length), col); });
          g.globalAlpha = 1;
          D.glow(g, b.x, b.y, T.fire > 0 ? 44 : 30, col, 0.9);
          D.circle(g, b.x, b.y, b.r, '#fff');
        }
        if (balls.some((b) => b.stuck) && clearT < 0) D.text(g, 'CLICK OR SPACE TO LAUNCH', W / 2, 470, { size: 16, font: 'ui', weight: 600, color: 'rgba(255,255,255,.55)' });
        // active timers
        let ix = 16;
        for (const k of ['wide', 'laser', 'slow', 'fire']) if (T[k] > 0) {
          const [col, ch] = CAPS[k];
          D.fillRR(g, ix, H - 30, 60, 18, 9, U.rgba(col, 0.25)); D.fillRR(g, ix, H - 30, 60 * (T[k] / 12), 18, 9, col);
          D.text(g, ch, ix + 30, H - 21, { size: 12, color: '#140b1f' }); ix += 68;
        }
        D.vignette(g, W, H, 0.45);
      },
    };
  },
});

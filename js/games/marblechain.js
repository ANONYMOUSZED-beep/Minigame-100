MG.add({
  id: 'marblechain', name: 'Marble Chain', cat: 'Puzzle', color: '#facc15', color2: '#22c55e',
  desc: 'A marble chain spirals toward the pit. Shoot marbles into it to make threes; gaps snap shut for combo chains.',
  how: ['Aim with the mouse and click to shoot (or <kbd>←</kbd><kbd>→</kbd> + <kbd>Space</kbd>)', 'Insert marbles to make 3+ of a colour and pop them', 'Matching colours either side of a gap pull together — chain reactions!', 'Right-click or <kbd>X</kbd> swaps your marble · don\'t let the chain reach the pit'],
  pad: 'LRAB', padLabels: { A: 'FIRE', B: 'SWAP' },
  make(E) {
    const W = 960, H = 600, CX = 480, CY = 305, BR = 16, DD = BR * 2;
    const COL = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#f8fafc'];
    // spiral path
    const P = [], cum = [0];
    const TURNS = 3.3 * Math.PI, NPT = 1400;
    for (let i = 0; i <= NPT; i++) { const k = i / NPT, th = -Math.PI / 2 + k * TURNS, r = 268 - k * 160; P.push([CX + Math.cos(th) * r * 1.55, CY + Math.sin(th) * r]); if (i) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); }
    const L = cum[cum.length - 1];
    function posAt(s) {
      s = U.clamp(s, 0, L);
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
      const k = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
      return [P[lo][0] + (P[hi][0] - P[lo][0]) * k, P[lo][1] + (P[hi][1] - P[lo][1]) * k];
    }
    let level = 0, balls, spawnLeft, ncol, speed, rush, aim = 0, cur, next, shots = [], pops = [], combo = 0, st = 'play', T = 0, danger = 0, sinkT = 0;
    function load() {
      level++; ncol = Math.min(6, 3 + Math.ceil(level / 2)); spawnLeft = 30 + level * 12; speed = 34 + level * 5; rush = 1; balls = []; combo = 0; st = 'play';
      cur = U.ri(0, ncol - 1); next = U.ri(0, ncol - 1);
      E.stat('Level', level);
      E.banner(`LEVEL ${level}`, `${spawnLeft} marbles · ${ncol} colours`, { color: '#facc15', life: 1.4 });
    }
    load();
    const colorsLeft = () => { const s = new Set(balls.map((b) => b.c)); return s.size ? [...s] : U.range(ncol); };
    function newBall() {
      // avoid long same-colour runs at spawn
      let c = U.ri(0, ncol - 1);
      if (balls.length > 1 && balls[0].c === balls[1].c && c === balls[0].c && Math.random() < 0.8) c = (c + 1 + U.ri(0, ncol - 2)) % ncol;
      return { c, s: 0, rs: 0, pop: 0 };
    }
    function runAt(i) {
      const c = balls[i].c; let a = i, b = i;
      while (a > 0 && balls[a - 1].c === c && balls[a].s - balls[a - 1].s <= DD + 1) a--;
      while (b < balls.length - 1 && balls[b + 1].c === c && balls[b + 1].s - balls[b].s <= DD + 1) b++;
      return [a, b];
    }
    function tryPop(i, chain) {
      if (i < 0 || i >= balls.length) return false;
      const [a, b] = runAt(i);
      if (b - a + 1 < 3) return false;
      combo = chain ? combo + 1 : 1;
      const n = b - a + 1, pts = n * 10 * combo;
      E.score += pts;
      for (let k = a; k <= b; k++) { const [x, y] = posAt(balls[k].rs); pops.push({ x, y, c: balls[k].c, t: 0 }); E.burst(x, y, { n: 6, color: COL[balls[k].c], speed: 160 }); }
      const [mx, my] = posAt(balls[Math.floor((a + b) / 2)].rs);
      E.pop(mx, my - 26, combo > 1 ? `COMBO ×${combo}  +${pts}` : `+${pts}`, { color: combo > 1 ? '#fde047' : '#fff', size: 18 + combo * 3 });
      E.sfx('pop', 0.9 + combo * 0.1); if (combo > 1) E.sfx('coin', 0.9 + combo * 0.1, 0.6);
      balls.splice(a, n);
      return true;
    }
    function fire() {
      if (st !== 'play') return;
      shots.push({ x: CX + Math.cos(aim) * 50, y: CY + Math.sin(aim) * 50, vx: Math.cos(aim) * 950, vy: Math.sin(aim) * 950, c: cur });
      cur = next; const cl = colorsLeft(); next = U.pick(cl);
      if (!cl.includes(cur)) cur = U.pick(cl);
      E.sfx('shoot', 0.8, 0.5);
    }
    return {
      update(dt) {
        T += dt;
        for (const p of pops) p.t += dt; pops = pops.filter((p) => p.t < 0.3);
        if (st === 'sink') { sinkT += dt; for (const b of balls) b.s += 900 * dt; for (const b of balls) b.rs = b.s; if (sinkT > 1.2 && st === 'sink') { st = 'dead'; E.over({ msg: `Level ${level} · the chain reached the pit` }); } return; }
        if (st !== 'play') return;
        // aim
        if (E.ptr.moved || E.ptr.hit) aim = Math.atan2(E.ptr.y - CY, E.ptr.x - CX);
        if (E.down('L')) aim -= dt * 3; if (E.down('R')) aim += dt * 3;
        if (E.ptr.hit || E.hit('A')) fire();
        if (E.ptr.rhit || E.hit('B')) { [cur, next] = [next, cur]; E.sfx('select'); }
        // pusher / spawning
        const head = balls.length ? balls[balls.length - 1].s : 0;
        if (rush && head > L * 0.28) rush = 0;
        const v = rush ? 320 : speed * (head > L * 0.85 ? 0.6 : 1);
        if (spawnLeft > 0 && (!balls.length || balls[0].s >= DD)) { const b = newBall(); b.s = balls.length ? balls[0].s - DD : 0; b.rs = b.s; balls.unshift(b); spawnLeft--; }
        if (balls.length) balls[0].s += v * dt; // only the segment touching the pusher moves forward
        for (let i = 1; i < balls.length; i++) if (balls[i].s < balls[i - 1].s + DD) balls[i].s = balls[i - 1].s + DD;
        // magnet: matching colours across a gap pull the front segment back
        for (let i = 1; i < balls.length; i++) {
          const gap = balls[i].s - balls[i - 1].s - DD;
          if (gap > 0.5 && balls[i].c === balls[i - 1].c) {
            let j = i; while (j + 1 < balls.length && balls[j + 1].s - balls[j].s <= DD + 1) j++;
            const back = Math.min(gap, 520 * dt);
            for (let k = i; k <= j; k++) balls[k].s -= back;
            if (gap - back <= 0.5) { E.sfx('thud', 1.4, 0.5); if (!tryPop(i, true)) combo = 0; }
          }
        }
        for (const b of balls) { b.rs = U.damp(b.rs, b.s, 18, dt); b.pop = Math.max(0, b.pop - dt * 4); }
        // shots
        for (const sh of shots) {
          const sub = 4;
          for (let q = 0; q < sub && !sh.done; q++) {
            sh.x += (sh.vx * dt) / sub; sh.y += (sh.vy * dt) / sub;
            if (sh.x < -40 || sh.x > W + 40 || sh.y < -40 || sh.y > H + 40) { sh.done = true; break; }
            for (let j = 0; j < balls.length; j++) {
              const [bx, by] = posAt(balls[j].rs);
              if (Math.hypot(bx - sh.x, by - sh.y) < DD - 2) {
                // insert before or after depending on which side of the ball we hit
                const [fx, fy] = posAt(balls[j].rs + 4), after = (sh.x - bx) * (fx - bx) + (sh.y - by) * (fy - by) > 0;
                const idx = after ? j + 1 : j;
                const nb = { c: sh.c, s: after ? balls[j].s + DD : balls[j].s, rs: after ? balls[j].rs + DD : balls[j].rs, pop: 1 };
                balls.splice(idx, 0, nb);
                for (let k = idx + 1; k < balls.length; k++) if (balls[k].s < balls[k - 1].s + DD) balls[k].s = balls[k - 1].s + DD; else break;
                sh.done = true; E.sfx('click', 0.8, 0.6);
                if (!tryPop(idx, false)) combo = 0;
                break;
              }
            }
          }
        }
        shots = shots.filter((s) => !s.done);
        danger = balls.length ? U.clamp((balls[balls.length - 1].s / L - 0.75) / 0.25, 0, 1) : 0;
        if (danger > 0.5 && Math.floor(T * (2 + danger * 4)) !== Math.floor((T - dt) * (2 + danger * 4))) E.sfx('thud', 0.5, 0.3 * danger);
        if (balls.length && balls[balls.length - 1].s >= L) { st = 'sink'; sinkT = 0; E.sfx('lose'); E.shake(10); }
        if (!balls.length && spawnLeft === 0 && st === 'play') { st = 'clear'; const bonus = 500 * level; E.score += bonus; E.sfx('win'); E.banner('CHAIN CLEARED', `+${bonus}`, { color: '#4ade80', life: 1.8 }); E.after(2.2, load); }
        E.stat('Left', spawnLeft + balls.length);
      },
      draw(g) {
        const t = T;
        D.radialBg(g, W, H, '#14532d', '#022c22');
        g.save(); g.globalAlpha = 0.07; for (let i = 0; i < 18; i++) D.star(g, (i * 211) % W, (i * 97) % H, 30, 10, 6, i, '#fde047'); g.restore();
        if (danger > 0) { g.fillStyle = `rgba(239,68,68,${danger * 0.15 * (0.6 + 0.4 * Math.sin(t * 8))})`; g.fillRect(0, 0, W, H); }
        // track
        g.lineCap = 'round'; g.lineJoin = 'round';
        const trackPath = () => { g.beginPath(); for (let i = 0; i < P.length; i += 4) i ? g.lineTo(P[i][0], P[i][1]) : g.moveTo(P[i][0], P[i][1]); g.lineTo(P[P.length - 1][0], P[P.length - 1][1]); };
        trackPath(); g.strokeStyle = '#052e16'; g.lineWidth = DD + 14; g.stroke();
        trackPath(); g.strokeStyle = '#78350f'; g.lineWidth = DD + 6; g.stroke();
        trackPath(); g.strokeStyle = '#451a03'; g.lineWidth = DD - 2; g.stroke();
        // pit
        const [hx, hy] = P[P.length - 1];
        D.glow(g, hx, hy, 60, '#ef4444', 0.3 + danger * 0.5);
        D.circle(g, hx, hy, 26, '#000', '#fbbf24', 4);
        D.text(g, '☠', hx, hy + 1, { size: 26, color: `rgba(254,202,202,${0.6 + danger * 0.4})`, font: 'ui' });
        // start portal
        const [sx, sy] = P[0]; D.glow(g, sx, sy, 50, '#a855f7', 0.6); D.circle(g, sx, sy, 20, '#1e1b4b', '#c084fc', 3);
        // balls
        for (const b of balls) { const [x, y] = posAt(b.rs); marble(g, x, y, b.c, 1 + Math.sin(b.pop * Math.PI) * 0.2, b.rs * 0.08); }
        for (const p of pops) { g.globalAlpha = 1 - p.t / 0.3; marble(g, p.x, p.y, p.c, 1 + p.t * 2, 0); g.globalAlpha = 1; }
        for (const sh of shots) marble(g, sh.x, sh.y, sh.c, 1, T * 10);
        // aim line
        g.save(); g.setLineDash([4, 10]); D.line(g, CX + Math.cos(aim) * 60, CY + Math.sin(aim) * 60, CX + Math.cos(aim) * 900, CY + Math.sin(aim) * 900, U.rgba(COL[cur], 0.35), 2); g.restore();
        // frog shooter
        g.save(); g.translate(CX, CY); g.rotate(aim);
        D.shadow(g, 4, 8, 50, 44, 0.4);
        D.circle(g, 0, 0, 46, '#15803d'); D.circle(g, 0, 0, 40, '#22c55e');
        g.fillStyle = '#86efac'; g.beginPath(); g.ellipse(-6, 0, 26, 30, 0, 0, U.TAU); g.fill();
        for (const s of [-1, 1]) { D.circle(g, 22, s * 24, 13, '#16a34a'); D.circle(g, 25, s * 24, 9, '#fff'); D.circle(g, 28, s * 24, 5, '#111'); }
        marble(g, 40, 0, cur, 0.95, 0);
        marble(g, -30, 0, next, 0.6, 0);
        g.restore();
        D.text(g, `LEVEL ${level}`, 24, 30, { size: 18, align: 'left', color: '#fde047' });
        D.text(g, E.score, W - 24, 30, { size: 24, align: 'right', color: '#fff' });
      },
    };
    function marble(g, x, y, c, s, spin) {
      const r = BR * s;
      D.orb(g, x, y, r, COL[c], 0.6);
      g.save(); g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.clip();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x + Math.cos(spin) * r * 0.3, y + Math.sin(spin) * r * 0.3, r * 0.7, 0, Math.PI); g.stroke();
      g.restore();
      D.circle(g, x - r * 0.35, y - r * 0.38, r * 0.22, 'rgba(255,255,255,.75)');
    }
  },
});

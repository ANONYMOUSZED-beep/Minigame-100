MG.add({
  id: 'artillery', name: 'Artillery Duel', cat: 'Action', color: '#f97316', color2: '#38bdf8',
  desc: 'Turn-based tank duels on destructible terrain. Read the wind, dial in the arc, carve the hillside.',
  how: ['Drag back from anywhere to aim (slingshot style) and release to fire', 'Or <kbd>←</kbd> <kbd>→</kbd> angle · <kbd>↑</kbd> <kbd>↓</kbd> power · <kbd>Space</kbd> fire', '<kbd>1</kbd> Shell · <kbd>2</kbd> Heavy · <kbd>3</kbd> Cluster (limited ammo)', 'Beat a chain of increasingly sharp AI gunners'],
  pad: 'LRUDA', padLabels: { A: 'FIRE' },
  make(E) {
    const W = 960, H = 600, GRAV = 260;
    let hm, me, ai, turn, wind, proj = [], state, stateT, round = 0, aim = { a: -Math.PI / 4, p: 0.62 }, dragging = null, weapon = 0, ammo, aiGuess, clouds, sunset;
    const WEAPONS = [{ name: 'Shell', r: 36, dmg: 42 }, { name: 'Heavy', r: 64, dmg: 60 }, { name: 'Cluster', r: 26, dmg: 26 }];
    function genTerrain() {
      hm = new Float32Array(W);
      const a = [U.rand(0.004, 0.009), U.rand(0.01, 0.02), U.rand(0.03, 0.05)], ph = [U.rand(6), U.rand(6), U.rand(6)], amp = [U.rand(60, 110), U.rand(20, 45), U.rand(4, 10)];
      for (let x = 0; x < W; x++) hm[x] = 400 - a.reduce((s, f, i) => s + Math.sin(x * f + ph[i]) * amp[i], 0);
      for (let x = 0; x < W; x++) hm[x] = U.clamp(hm[x], 170, 560);
    }
    const tank = (x, col, hp) => ({ x, y: 0, hp, max: hp, col, vy: 0, a: 0, flash: 0 });
    function settle(t) { const x = U.clamp(Math.round(t.x), 0, W - 1); t.y = hm[x]; const l = hm[U.clamp(x - 8, 0, W - 1)], r = hm[U.clamp(x + 8, 0, W - 1)]; t.a = Math.atan2(r - l, 16); }
    function newRound() {
      round++; E.stat('Round', round);
      genTerrain();
      me = tank(U.rand(80, 200), '#38bdf8', 100); ai = tank(U.rand(W - 200, W - 80), '#f97316', 80 + round * 20);
      for (const t of [me, ai]) { const x = Math.round(t.x); for (let k = -18; k <= 18; k++) if (hm[x + k]) hm[x + k] = U.lerp(hm[x + k], hm[x], 0.8 * (1 - Math.abs(k) / 18) + 0.2); settle(t); }
      ammo = [Infinity, 2, 2];
      turn = 'me'; wind = U.rand(-60, 60); state = 'aim'; aiGuess = null;
      clouds = U.range(6).map(() => ({ x: U.rand(W), y: U.rand(40, 170), s: U.rand(0.6, 1.4) }));
      sunset = U.rand(0, 1);
      E.banner(`DUEL ${round}`, `Enemy armor ${ai.max}`);
    }
    newRound();
    function fireShot(from, a, p, w, isMe) {
      const sp = 240 + p * 560;
      const x = from.x + Math.cos(a) * 22, y = from.y - 14 + Math.sin(a) * 22;
      proj.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w, trail: [], cluster: w === 2, owner: isMe ? me : ai });
      E.sfx('explode', 1.8, 0.5); E.shake(4);
      E.burst(x, y, { n: 14, colors: ['#fde68a', '#f97316', '#a8a29e'], speed: 160, angle: a, spread: 0.8 });
      state = 'flight';
      if (isMe && w > 0) { ammo[w]--; if (ammo[weapon] <= 0) weapon = 0; }
    }
    function explode(x, y, w) {
      const W0 = WEAPONS[w], r = W0.r;
      for (let i = Math.max(0, Math.floor(x - r)); i < Math.min(W, Math.ceil(x + r)); i++) {
        const dx = i - x, s = Math.sqrt(r * r - dx * dx), overlap = Math.max(0, y + s - Math.max(hm[i], y - s));
        hm[i] = Math.min(H + 20, hm[i] + overlap);
      }
      for (const t of [me, ai]) {
        const d = U.dist(x, y, t.x, t.y - 10);
        if (d < r + 16) {
          const dmg = Math.round(W0.dmg * (1 - Math.max(0, d - 10) / (r + 16)));
          t.hp = Math.max(0, t.hp - dmg); t.flash = 1;
          E.pop(t.x, t.y - 50, '-' + dmg, { color: '#fca5a5', size: 24 });
          if (t === ai) E.score += dmg * 10;
        }
      }
      E.burst(x, y, { n: 30 + r, colors: ['#fde68a', '#f97316', '#ef4444', '#fff'], speed: 200 + r * 3, life: 0.9 });
      E.burst(x, y, { n: 20, colors: ['#78350f', '#a16207', '#57534e'], speed: 260, grav: 500, shape: 'square', size: 3, life: 1.2, glow: false });
      E.ring(x, y, { color: '#fde68a', r: r * 1.6, lw: 6 });
      E.sfx(r > 40 ? 'boom' : 'explode', 1, 0.9); E.shake(r / 3); E.flash('#fde68a', 0.15);
    }
    function aiTurn() {
      // search for a good shot by simulation; accuracy improves each round & turn
      const target = me.x;
      let best = null, bd = 1e9;
      for (let k = 0; k < 220; k++) {
        const a = -Math.PI / 2 - U.rand(0.15, 1.25), p = U.rand(0.25, 1);
        const land = simulate(ai, a, p);
        const d = Math.abs(land - target);
        if (d < bd) { bd = d; best = { a, p }; }
      }
      const err = Math.max(0.01, 0.16 - round * 0.025 - (aiGuess ? 0.05 : 0));
      aiGuess = { a: best.a + U.rand(-err, err) * 0.5, p: U.clamp(best.p + U.rand(-err, err), 0.2, 1) };
      const w = ai.hp < 40 && U.chance(0.5) ? 1 : U.chance(0.2) ? 2 : 0;
      state = 'aiaim'; stateT = 1.2; ai.aimA = -Math.PI / 2; ai.pending = { ...aiGuess, w };
    }
    function simulate(from, a, p) {
      const sp = 240 + p * 560; let x = from.x + Math.cos(a) * 22, y = from.y - 14 + Math.sin(a) * 22, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
      for (let i = 0; i < 600; i++) { const dt = 1 / 60; vy += GRAV * dt; vx += wind * dt; x += vx * dt; y += vy * dt; if (x < 0 || x >= W) return x; if (y >= hm[Math.floor(x)]) return x; }
      return x;
    }
    function endShot() {
      if (me.hp <= 0 || ai.hp <= 0) {
        state = 'end'; stateT = 2.4;
        if (ai.hp <= 0) { E.score += 1000 * round; E.sfx('win'); E.banner('ENEMY DESTROYED', `+${1000 * round}`, { color: '#38bdf8' }); explode(ai.x, ai.y - 10, 1); }
        else { E.sfx('lose'); explode(me.x, me.y - 10, 1); }
        return;
      }
      turn = turn === 'me' ? 'ai' : 'me';
      wind = U.clamp(wind + U.rand(-25, 25), -90, 90);
      if (turn === 'ai') { state = 'wait'; stateT = 0.8; } else state = 'aim';
    }
    function drawTank(g, t, aimA) {
      g.save(); g.translate(t.x, t.y); g.rotate(t.a);
      D.shadow(g, 0, 2, 22, 5, 0.3);
      g.save(); g.rotate(-t.a); g.translate(0, -14);
      g.rotate(aimA); D.fillRR(g, 0, -3, 26, 6, 2, U.shade(t.col, -0.4)); g.restore();
      const c = t.flash > 0 ? '#fff' : t.col;
      D.fillRR(g, -20, -10, 40, 10, 4, U.shade(c, -0.35));
      g.fillStyle = c; g.beginPath(); g.arc(0, -10, 12, Math.PI, 0); g.fill();
      D.fillRR(g, -22, -4, 44, 8, 4, '#1f2937');
      for (let i = -3; i <= 3; i++) D.circle(g, i * 6, 0, 2.2, '#6b7280');
      g.restore();
      const w = 50;
      D.fillRR(g, t.x - w / 2, t.y - 52, w, 6, 3, 'rgba(0,0,0,.5)');
      D.fillRR(g, t.x - w / 2, t.y - 52, w * (t.hp / t.max), 6, 3, t.hp / t.max < 0.3 ? '#ef4444' : t.col);
    }
    return {
      update(dt) {
        for (const t of [me, ai]) { t.flash = Math.max(0, t.flash - dt * 3); const target = hm[U.clamp(Math.round(t.x), 0, W - 1)]; if (t.y < target - 1) { t.vy += GRAV * dt; t.y = Math.min(target, t.y + t.vy * dt); if (t.y >= target) { if (t.vy > 180) { const d = Math.round((t.vy - 180) / 8); t.hp = Math.max(0, t.hp - d); E.pop(t.x, t.y - 40, '-' + d, { color: '#fca5a5' }); } t.vy = 0; E.sfx('thud', 1, 0.5); } } else { t.y = target; t.vy = 0; } const x = Math.round(t.x); t.a = Math.atan2(hm[U.clamp(x + 8, 0, W - 1)] - hm[U.clamp(x - 8, 0, W - 1)], 16); }
        for (const c of clouds) { c.x += wind * 0.3 * dt * c.s; if (c.x > W + 100) c.x = -100; if (c.x < -100) c.x = W + 100; }
        if (state === 'aim' && turn === 'me') {
          for (const [k, i] of [['Digit1', 0], ['Digit2', 1], ['Digit3', 2]]) if (E.hit(k) && ammo[i] > 0) { weapon = i; E.sfx('click'); }
          if (E.hit('KeyQ', 'KeyE')) { do { weapon = (weapon + 1) % 3; } while (ammo[weapon] <= 0); E.sfx('click'); }
          const ax = E.axis();
          aim.a = U.clamp(aim.a + ax.x * 1.1 * dt, -Math.PI + 0.05, -0.05);
          aim.p = U.clamp(aim.p - ax.y * 0.5 * dt, 0.1, 1);
          if (E.ptr.hit) dragging = { x: E.ptr.x, y: E.ptr.y };
          if (dragging && E.ptr.down) {
            const dx = dragging.x - E.ptr.x, dy = dragging.y - E.ptr.y, d = Math.hypot(dx, dy);
            if (d > 10) { aim.a = U.clamp(Math.atan2(dy, dx), -Math.PI + 0.05, -0.05); aim.p = U.clamp(d / 220, 0.1, 1); }
          }
          if (dragging && E.ptr.up) { const d = Math.hypot(dragging.x - E.ptr.x, dragging.y - E.ptr.y); dragging = null; if (d > 30) fireShot(me, aim.a, aim.p, weapon, true); }
          if (E.hit('Space', 'Enter')) fireShot(me, aim.a, aim.p, weapon, true);
        } else if (state === 'wait') { stateT -= dt; if (stateT <= 0) aiTurn(); }
        else if (state === 'aiaim') {
          stateT -= dt;
          ai.aimA = U.lerp(ai.aimA, ai.pending.a, Math.min(1, dt * 4));
          if (stateT <= 0) fireShot(ai, ai.pending.a, ai.pending.p, ai.pending.w, false);
        } else if (state === 'end') {
          stateT -= dt;
          if (stateT <= 0) { if (me.hp <= 0) { state = 'over'; E.over({ msg: `Won ${round - 1} duel${round - 1 === 1 ? '' : 's'}` }); } else newRound(); }
        }
        // projectiles
        for (let i = proj.length - 1; i >= 0; i--) {
          const p = proj[i];
          p.vy += GRAV * dt; p.vx += wind * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          p.trail.push([p.x, p.y]); if (p.trail.length > 40) p.trail.shift();
          if (p.cluster && p.vy > 0 && !p.split) {
            p.split = true;
            for (let k = -2; k <= 2; k++) proj.push({ x: p.x, y: p.y, vx: p.vx + k * 60, vy: p.vy * 0.5, w: 2, trail: [], cluster: false, owner: p.owner, mini: true });
            proj.splice(i, 1); E.sfx('pop', 0.8); continue;
          }
          const xi = Math.floor(p.x);
          if (p.x < -50 || p.x > W + 50 || p.y > H + 30) { proj.splice(i, 1); if (!proj.length) endShot(); continue; }
          const hitTank = [me, ai].find((t) => U.dist(p.x, p.y, t.x, t.y - 10) < 18);
          if (hitTank || (xi >= 0 && xi < W && p.y >= hm[xi])) {
            explode(p.x, p.y, p.w); proj.splice(i, 1);
            if (!proj.length) E.after(0.7, endShot);
          }
        }
      },
      draw(g) {
        const t = E.t;
        const top = U.mix('#1e1b4b', '#0c4a6e', sunset), bot = U.mix('#fb923c', '#fda4af', sunset);
        D.bg(g, W, H, top, bot);
        D.glow(g, 720, 330, 260, '#fde68a', 0.3); D.circle(g, 720, 330, 50, '#fef3c7');
        g.fillStyle = 'rgba(76,29,149,.35)'; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 30) g.lineTo(x, 330 - Math.abs(Math.sin(x * 0.006 + 1)) * 110 - Math.sin(x * 0.03) * 12);
        g.lineTo(W, H); g.fill();
        for (const c of clouds) { g.globalAlpha = 0.5; for (let k = 0; k < 4; k++) D.circle(g, c.x + k * 22 * c.s, c.y + Math.sin(k) * 6, 20 * c.s, '#fff'); g.globalAlpha = 1; }
        // terrain
        const gr = g.createLinearGradient(0, 170, 0, H); gr.addColorStop(0, '#65a30d'); gr.addColorStop(0.08, '#4d7c0f'); gr.addColorStop(0.1, '#78350f'); gr.addColorStop(1, '#3b1a08');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x < W; x += 2) g.lineTo(x, hm[x]);
        g.lineTo(W, hm[W - 1]); g.lineTo(W, H); g.closePath(); g.fill();
        g.strokeStyle = '#a3e635'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < W; x += 2) x ? g.lineTo(x, hm[x]) : g.moveTo(x, hm[x]); g.stroke();
        // aim preview (partial)
        if (state === 'aim' && turn === 'me') {
          const sp = 240 + aim.p * 560; let x = me.x + Math.cos(aim.a) * 22, y = me.y - 14 + Math.sin(aim.a) * 22, vx = Math.cos(aim.a) * sp, vy = Math.sin(aim.a) * sp;
          for (let i = 0; i < 22; i++) { for (let k = 0; k < 3; k++) { const dt = 1 / 60; vy += GRAV * dt; x += vx * dt; y += vy * dt; } g.globalAlpha = 1 - i / 22; D.circle(g, x, y, 3, '#fff'); }
          g.globalAlpha = 1;
        }
        drawTank(g, me, state === 'aim' ? aim.a : aim.a);
        drawTank(g, ai, ai.aimA !== undefined ? ai.aimA : -Math.PI * 0.75);
        for (const p of proj) {
          g.lineCap = 'round';
          for (let i = 1; i < p.trail.length; i++) { g.strokeStyle = `rgba(255,237,213,${(i / p.trail.length) * 0.6})`; g.lineWidth = (i / p.trail.length) * 4; g.beginPath(); g.moveTo(p.trail[i - 1][0], p.trail[i - 1][1]); g.lineTo(p.trail[i][0], p.trail[i][1]); g.stroke(); }
          D.glow(g, p.x, p.y, 18, '#fde68a', 0.9); D.circle(g, p.x, p.y, p.mini ? 3 : p.w === 1 ? 7 : 5, '#1f2937');
        }
        // HUD
        D.fillRR(g, W / 2 - 110, 12, 220, 44, 12, 'rgba(0,0,0,.35)');
        D.text(g, 'WIND', W / 2, 24, { size: 11, font: 'mono', color: 'rgba(255,255,255,.7)' });
        const wl = (wind / 90) * 90; D.line(g, W / 2, 42, W / 2 + wl, 42, '#e0f2fe', 4); if (Math.abs(wl) > 4) D.poly(g, [[W / 2 + wl + Math.sign(wl) * 8, 42], [W / 2 + wl, 36], [W / 2 + wl, 48]], '#e0f2fe');
        D.text(g, `${Math.abs(Math.round(wind))}`, W / 2 + (wind > 0 ? -30 : 30), 42, { size: 12, font: 'mono', color: '#e0f2fe' });
        if (turn === 'me' && state === 'aim') {
          D.fillRR(g, 16, 12, 260, 70, 12, 'rgba(0,0,0,.35)');
          D.text(g, `ANGLE ${Math.round((-aim.a * 180) / Math.PI)}°   POWER ${Math.round(aim.p * 100)}`, 30, 30, { size: 13, font: 'mono', align: 'left' });
          WEAPONS.forEach((w0, i) => { const x = 30 + i * 82; D.fillRR(g, x - 6, 44, 76, 26, 8, i === weapon ? '#38bdf8' : 'rgba(255,255,255,.1)'); D.text(g, `${i + 1} ${w0.name}${ammo[i] !== Infinity ? ' ×' + ammo[i] : ''}`, x + 32, 57, { size: 11, font: 'ui', weight: 700, color: i === weapon ? '#082f49' : ammo[i] > 0 ? '#fff' : '#64748b' }); });
        }
        const msg = state === 'aim' ? 'YOUR TURN' : state === 'aiaim' || state === 'wait' ? 'ENEMY AIMING…' : '';
        if (msg) D.text(g, msg, W - 24, 30, { size: 16, align: 'right', color: turn === 'me' ? '#38bdf8' : '#f97316' });
        void t;
      },
    };
  },
});

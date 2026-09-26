MG.add({
  id: 'chain', name: 'Chain Reaction', cat: 'Physics', color: '#fbbf24', color2: '#a855f7',
  desc: 'One click per level. Start a single blast and watch it ripple through the drifting orbs.',
  how: ['Click / tap once to set off a blast', 'Orbs caught in a blast explode too — chain them all', 'Reach each level\'s target to advance', 'Twelve levels, fewer misses allowed each time'],
  pad: 'A', padLabels: { A: 'BLAST' },
  make(E) {
    const W = 960, H = 600;
    const LV = [[5, 1], [10, 2], [15, 3], [20, 5], [25, 7], [30, 10], [35, 15], [40, 21], [45, 27], [50, 33], [55, 44], [60, 55]];
    let level = -1, orbs, blasts, used, popped, state, stateT, T = 0, aimX = W / 2, aimY = H / 2, chainMax = 0;
    function load() {
      level++; const [n, need] = LV[level];
      orbs = U.range(n).map(() => { const a = U.rand(U.TAU), sp = U.rand(40, 90); return { x: U.rand(30, W - 30), y: U.rand(30, H - 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, hue: U.rand(360), dead: false }; });
      blasts = []; used = false; popped = 0; state = 'play'; chainMax = 0;
      E.stat('Level', `${level + 1}/12`); E.stat('Goal', `0/${need}`);
      E.banner(`LEVEL ${level + 1}`, `Pop ${need} of ${n}`, { color: '#fbbf24', life: 1.3 });
    }
    load();
    function blast(x, y, chain, hue) {
      blasts.push({ x, y, r: 0, t: 0, hue, chain });
      E.tone({ f: 220 * Math.pow(2, Math.min(chain, 24) / 12), dur: 0.35, type: 'sine', vol: 0.18, echo: true });
    }
    return {
      update(dt) {
        T += dt;
        for (const o of orbs) { if (o.dead) continue; o.x += o.vx * dt; o.y += o.vy * dt; if (o.x < o.r || o.x > W - o.r) o.vx *= -1; if (o.y < o.r || o.y > H - o.r) o.vy *= -1; }
        if (E.ptr.moved) { aimX = E.ptr.x; aimY = E.ptr.y; }
        const a = E.axis(); aimX = U.clamp(aimX + a.x * 400 * dt, 0, W); aimY = U.clamp(aimY + a.y * 400 * dt, 0, H);
        if (state === 'play' && !used && (E.ptr.hit || E.hit('A'))) { used = true; if (E.ptr.hit) { aimX = E.ptr.x; aimY = E.ptr.y; } blast(aimX, aimY, 0, 50); E.sfx('pop', 0.6); }
        for (const b of blasts) {
          b.t += dt; b.r = b.t < 0.35 ? 46 * U.ease.outBack(b.t / 0.35) : b.t < 2.2 ? 46 : 46 * (1 - (b.t - 2.2) / 0.4);
          for (const o of orbs) if (!o.dead && U.dist(o.x, o.y, b.x, b.y) < b.r + o.r) {
            o.dead = true; popped++; chainMax = Math.max(chainMax, b.chain + 1);
            E.score += 10 * (b.chain + 1);
            E.burst(o.x, o.y, { n: 12, color: U.hsl(o.hue, 90, 65), speed: 150 });
            if (b.chain + 1 >= 3) E.pop(o.x, o.y - 14, `+${10 * (b.chain + 1)}`, { size: 13, color: U.hsl(o.hue, 90, 75), life: 0.6 });
            blast(o.x, o.y, b.chain + 1, o.hue);
            E.stat('Goal', `${popped}/${LV[level][1]}`);
          }
        }
        blasts = blasts.filter((b) => b.t < 2.6);
        if (state === 'play' && used && !blasts.length) {
          const need = LV[level][1];
          if (popped >= need) { state = 'next'; stateT = 1.8; const bonus = (popped - need) * 50 + 200; E.score += bonus; E.sfx('win'); E.banner(popped === orbs.length ? 'PERFECT CHAIN!' : 'LEVEL CLEAR', `${popped} popped · +${bonus}`, { color: '#4ade80' }); }
          else { state = 'fail'; E.sfx('lose'); E.over({ msg: `Level ${level + 1}: popped ${popped} of the ${need} needed` }); }
        }
        if (state === 'next') { stateT -= dt; if (stateT <= 0) { if (level >= LV.length - 1) { state = 'done'; E.over({ win: true, title: 'Total Chain!', msg: 'All twelve levels cleared' }); } else load(); } }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1e1033', '#050208');
        for (const b of blasts) { const c = U.hsl(b.hue, 90, 60); D.glow(g, b.x, b.y, b.r * 1.9, c, 0.5); g.globalAlpha = 0.55; D.circle(g, b.x, b.y, Math.max(0, b.r), c); g.globalAlpha = 1; D.circle(g, b.x, b.y, Math.max(0, b.r), null, 'rgba(255,255,255,.6)', 2); }
        for (const o of orbs) if (!o.dead) { const c = U.hsl(o.hue, 90, 65); D.glow(g, o.x, o.y, 24, c, 0.6); D.circle(g, o.x, o.y, o.r, c); D.circle(g, o.x - 3, o.y - 3, 3, 'rgba(255,255,255,.7)'); }
        if (!used && state === 'play') { D.circle(g, aimX, aimY, 46, 'rgba(251,191,36,.08)', 'rgba(251,191,36,.6)', 2); D.circle(g, aimX, aimY, 4, '#fbbf24'); }
        const need = LV[level][1];
        D.fillRR(g, W / 2 - 150, H - 36, 300, 14, 7, 'rgba(255,255,255,.1)');
        D.fillRR(g, W / 2 - 150, H - 36, 300 * Math.min(1, popped / need), 14, 7, popped >= need ? '#4ade80' : '#fbbf24');
        D.text(g, `${popped} / ${need}`, W / 2, H - 52, { size: 16, font: 'mono', color: '#fff' });
        if (chainMax > 2) D.text(g, `CHAIN ×${chainMax}`, W - 24, 34, { size: 20, align: 'right', color: '#fbbf24' });
        void t;
      },
    };
  },
});

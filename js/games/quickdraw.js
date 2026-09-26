MG.add({
  id: 'quickdraw', name: 'Quick Draw', cat: 'Brain', color: '#f97316', color2: '#fde68a',
  desc: 'High noon, ten outlaws, one rule: don\'t touch that trigger until the word is DRAW.',
  how: ['Wait for <b>DRAW!</b> — then click, tap or hit <kbd>Space</kbd> instantly', 'Beat the outlaw\'s reaction time to collect the bounty', 'Draw early and it\'s a foul · watch for fake-outs', 'Three lives. Ten outlaws. Each one faster than the last'],
  pad: 'A', padLabels: { A: 'DRAW' },
  make(E) {
    const W = 960, H = 600, GY = 468, PX = 190, OX = 770;
    const OUTLAWS = [
      ['Dusty Pete', 640, '#7c2d12', 0], ['Slim Jenkins', 560, '#365314', 1], ['Rattlesnake Rosa', 500, '#831843', 2], ['One-Eyed Jack', 450, '#1e3a8a', 0],
      ['Mad Dog Morgan', 410, '#3f3f46', 1], ['Calamity Kate', 375, '#9a3412', 2], ['The Undertaker', 345, '#18181b', 1], ['Black Bart', 320, '#0f172a', 0],
      ['Doc Holloway', 295, '#4c1d95', 2], ['The Stranger', 270, '#171717', 1],
    ];
    const FAKES = ['DRAT!', 'DRAWL', 'DREW?', 'DRAMA', 'DRAKE', 'DRIP'];
    let idx = 0, lives = 3, st = 'intro', stT = 2.4, waitT = 0, fakeT = 0, fake = null, oMs = 0, drawEl = 0, drawPerf = 0, lastIn = 0, pArm = 0, oArm = 0, pFall = 0, oFall = 0, winner = null, msShown = 0, flashT = 0, beatT = 0, windT = 0, T = 0, best = null;
    const weeds = [], dust = U.range(60).map(() => ({ x: U.rand(W), y: U.rand(GY - 40, H), v: U.rand(10, 40), s: U.rand(1, 2.5) }));
    const town = U.range(14).map((i) => ({ x: i < 7 ? i * 44 - 40 : W - (i - 7) * 44 - 10, w: U.rand(36, 60), h: U.rand(70, 150), sign: Math.random() < 0.4 }));
    const onKey = (e) => { if (['Space', 'KeyZ', 'KeyJ'].includes(e.code) && !e.repeat) lastIn = performance.now(); };
    const onPtr = () => { lastIn = performance.now(); };
    E.stat('Outlaw', `1/${OUTLAWS.length}`); E.stat('Lives', '★★★');
    function nextDuel() {
      const o = OUTLAWS[idx];
      st = 'intro'; stT = 2.4; pArm = oArm = pFall = oFall = 0; winner = null; fake = null;
      E.stat('Outlaw', `${idx + 1}/${OUTLAWS.length}`);
      oMs = o[1] + U.rand(-25, 25);
    }
    function startWait() { st = 'wait'; waitT = U.rand(1.8, 4.8); fakeT = idx >= 3 ? U.rand(0.8, waitT - 0.6) : 99; E.sfx('ding', 0.25, 0.7); }
    function shot(fromX, toX) { E.sfx('boom', 2.4, 0.6); E.sfx('hit', 0.6); E.shake(10); flashT = 0.08; E.burst(fromX, GY - 108, { n: 14, colors: ['#fde68a', '#fff', '#f97316'], speed: 260, angle: toX > fromX ? 0 : Math.PI, spread: 0.6, shape: 'spark' }); }
    function lifeLost(msg) {
      lives--; E.stat('Lives', '★'.repeat(Math.max(0, lives)) || '—');
      if (lives <= 0) E.after(1.6, () => E.over({ msg: `${msg} · ${idx} outlaw${idx === 1 ? '' : 's'} brought in${best ? ` · fastest ${best} ms` : ''}` }));
    }
    function resolve(playerMs) {
      if (st !== 'draw') return;
      st = 'result'; stT = 2.6; msShown = playerMs;
      if (playerMs <= oMs) {
        winner = 'p'; pArm = 1; shot(PX + 40, OX); oFall = 0.001;
        best = best === null ? Math.round(playerMs) : Math.min(best, Math.round(playerMs));
        const bounty = (idx + 1) * 100 + Math.max(0, Math.round(450 - playerMs));
        E.score += bounty;
        E.after(0.5, () => { E.sfx('coin'); E.pop(OX, GY - 200, `BOUNTY $${bounty}`, { color: '#fde68a', size: 28, life: 1.4 }); });
        idx++;
      } else {
        winner = 'o'; oArm = 1; shot(OX - 40, PX); pFall = 0.001; E.flash('#7f1d1d', 0.5);
        lifeLost(`Outdrawn by ${OUTLAWS[idx][0]}`);
      }
    }
    nextDuel();
    return {
      start() { window.addEventListener('keydown', onKey, true); const cv = document.getElementById('screen'); if (cv) cv.addEventListener('pointerdown', onPtr, true); },
      destroy() { window.removeEventListener('keydown', onKey, true); const cv = document.getElementById('screen'); if (cv) cv.removeEventListener('pointerdown', onPtr, true); },
      update(dt) {
        T += dt; flashT = Math.max(0, flashT - dt);
        const pressed = E.ptr.hit || E.hit('A');
        windT -= dt; if (windT <= 0) { windT = U.rand(2, 4); if (st !== 'result') E.noise({ dur: 2.2, vol: 0.06, ft: 'bandpass', f: 500, f2: 900, q: 3, a: 0.8 }); if (Math.random() < 0.5) weeds.push({ x: -40, y: GY + U.rand(0, 60), r: U.rand(14, 22), v: U.rand(80, 160), a: 0 }); }
        for (const w of weeds) { w.x += w.v * dt; w.a += (w.v / w.r) * dt; } for (let i = weeds.length - 1; i >= 0; i--) if (weeds[i].x > W + 60) weeds.splice(i, 1);
        for (const d of dust) { d.x += d.v * dt; if (d.x > W) d.x = 0; }
        if (st === 'intro') { stT -= dt; if (stT <= 0) startWait(); if (pressed && stT < 1.9) startWait(); return; }
        if (st === 'wait') {
          waitT -= dt; beatT -= dt;
          if (beatT <= 0) { beatT = 0.75; E.sfx('thud', 0.55, 0.45); E.after(0.18, () => st === 'wait' && E.sfx('thud', 0.5, 0.3)); }
          fakeT -= dt; if (fakeT <= 0 && !fake) { fake = { word: U.pick(FAKES), t: 0.55 }; E.sfx('blip', 0.6, 0.5); }
          if (fake) { fake.t -= dt; if (fake.t <= 0) fake = { word: '', t: 99 }; }
          if (pressed) {
            st = 'result'; stT = 2.4; winner = 'foul'; E.sfx('error'); E.shake(4);
            lifeLost('Fouled — drew before the call');
            return;
          }
          if (waitT <= 0) { st = 'draw'; drawEl = 0; drawPerf = performance.now(); lastIn = 0; E.tone({ f: 880, f2: 1320, dur: 0.18, type: 'square', vol: 0.18 }); E.flash('#fde68a', 0.25); }
          return;
        }
        if (st === 'draw') {
          drawEl += dt;
          if (pressed) { let ms = lastIn > drawPerf ? lastIn - drawPerf : drawEl * 1000; if (ms > drawEl * 1000 + 60) ms = drawEl * 1000; resolve(Math.max(90, ms)); return; }
          if (drawEl * 1000 >= oMs) resolve(1e9);
          return;
        }
        if (st === 'result') {
          if (winner === 'p') oFall = Math.min(1, oFall + dt * 2.2);
          if (winner === 'o') pFall = Math.min(1, pFall + dt * 2.2);
          stT -= dt;
          if (stT <= 0 && lives > 0) {
            if (idx >= OUTLAWS.length) { st = 'done'; E.sfx('win'); E.over({ win: true, title: 'Fastest in the West', msg: `All ten outlaws brought in · fastest ${best} ms` }); }
            else if (winner === 'p') nextDuel();
            else { pFall = 0; pArm = 0; oArm = 0; winner = null; startWait(); }
          }
        }
      },
      draw(g) {
        const t = E.t, o = OUTLAWS[Math.min(idx, OUTLAWS.length - 1)], tense = st === 'wait' ? 1 : 0;
        // sky
        const sk = g.createLinearGradient(0, 0, 0, GY); sk.addColorStop(0, '#1e1b4b'); sk.addColorStop(0.45, '#9d174d'); sk.addColorStop(0.8, '#f97316'); sk.addColorStop(1, '#fde68a'); g.fillStyle = sk; g.fillRect(0, 0, W, GY);
        D.glow(g, W / 2, GY - 40, 300, '#fde68a', 0.6); D.circle(g, W / 2, GY - 30, 70, '#fef3c7');
        for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(249,115,22,.35)'; g.fillRect(W / 2 - 90, GY - 70 + i * 14, 180, 3); }
        // mesas
        g.fillStyle = '#7c2d12'; g.beginPath(); g.moveTo(0, GY - 60); g.lineTo(120, GY - 60); g.lineTo(150, GY - 110); g.lineTo(310, GY - 110); g.lineTo(340, GY - 60); g.lineTo(620, GY - 60); g.lineTo(650, GY - 95); g.lineTo(760, GY - 95); g.lineTo(790, GY - 60); g.lineTo(W, GY - 60); g.lineTo(W, GY); g.lineTo(0, GY); g.fill();
        // town silhouettes
        g.fillStyle = '#2a0f0a';
        for (const b of town) { g.fillRect(b.x, GY - b.h, b.w, b.h); if (b.sign) g.fillRect(b.x - 4, GY - b.h - 14, b.w + 8, 16); }
        g.fillStyle = 'rgba(253,230,138,.5)'; for (const b of town) for (let y = GY - b.h + 16; y < GY - 30; y += 34) g.fillRect(b.x + 10, y, 8, 12);
        // ground
        const gg = g.createLinearGradient(0, GY, 0, H); gg.addColorStop(0, '#c2410c'); gg.addColorStop(1, '#7c2d12'); g.fillStyle = gg; g.fillRect(0, GY, W, H - GY);
        g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 20; i++) g.fillRect((i * 97) % W, GY + 10 + ((i * 37) % 110), 40, 2);
        // long shadows
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(PX - 110, GY + 8, 130, 10, 0, 0, U.TAU); g.fill(); g.beginPath(); g.ellipse(OX + 110, GY + 8, 130, 10, 0, 0, U.TAU); g.fill();
        for (const w of weeds) { g.save(); g.translate(w.x, w.y - w.r - Math.abs(Math.sin(w.a * 0.6)) * 18); g.rotate(w.a); g.strokeStyle = '#78350f'; g.lineWidth = 2; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(Math.cos(k) * 4, Math.sin(k * 2) * 4, w.r * (0.5 + (k % 3) * 0.2), k, k + 4); g.stroke(); } g.restore(); }
        figure(g, PX, 1, '#451a03', 0, pArm, pFall, t);
        figure(g, OX, -1, o[2], o[3], oArm, oFall, t);
        if (flashT > 0) { g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, 0, W, H); }
        g.fillStyle = 'rgba(253,230,138,.25)'; for (const d of dust) g.fillRect(d.x, d.y, d.s, d.s);
        // letterbox for tension
        const lb = 30 + tense * 26; g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb);
        // cards
        if (st === 'intro') {
          const k = Math.min(1, (2.4 - stT) * 3);
          g.save(); g.translate(W / 2, 220); g.rotate(-0.03); g.scale(k, k);
          D.fillRR(g, -170, -110, 340, 220, 6, '#fef3c7'); D.strokeRR(g, -160, -100, 320, 200, 4, '#78350f', 3);
          D.text(g, 'WANTED', 0, -66, { size: 40, color: '#7c2d12', font: 'display' });
          D.text(g, o[0].toUpperCase(), 0, -18, { size: 24, color: '#1c1917', font: 'display' });
          D.text(g, `REWARD $${(idx + 1) * 100}+`, 0, 20, { size: 20, color: '#9a3412' });
          D.text(g, `draws in ~${o[1]} ms`, 0, 56, { size: 15, font: 'mono', color: '#57534e' });
          g.restore();
          D.text(g, `DUEL ${idx + 1} OF ${OUTLAWS.length}`, W / 2, 80, { size: 18, font: 'mono', color: 'rgba(255,255,255,.7)' });
        }
        if (st === 'wait') {
          D.text(g, 'steady…', W / 2, 150, { size: 26, font: 'ui', weight: 500, color: `rgba(255,255,255,${0.35 + 0.25 * Math.sin(t * 3)})` });
          if (fake && fake.word) D.text(g, fake.word, W / 2, 230, { size: 70, color: '#a8a29e', stroke: 'rgba(0,0,0,.5)', lw: 8 });
        }
        if (st === 'draw') D.text(g, 'DRAW!', W / 2, 230, { size: 110, color: '#fff', glow: '#f97316', blur: 30, stroke: '#7c2d12', lw: 10 });
        if (st === 'result') {
          if (winner === 'foul') { D.text(g, 'FOUL!', W / 2, 200, { size: 80, color: '#f87171', stroke: '#450a0a', lw: 10 }); D.text(g, 'You drew before the call', W / 2, 260, { size: 20, font: 'ui', color: '#fff' }); }
          else if (winner === 'p') { D.text(g, `${Math.round(msShown)} ms`, W / 2, 200, { size: 70, color: '#fde68a', stroke: '#7c2d12', lw: 10 }); D.text(g, `${OUTLAWS[idx - 1][0]} was ${Math.round(oMs)} ms`, W / 2, 256, { size: 18, font: 'ui', color: '#fff' }); }
          else if (winner === 'o') { D.text(g, 'TOO SLOW', W / 2, 200, { size: 70, color: '#f87171', stroke: '#450a0a', lw: 10 }); D.text(g, `${OUTLAWS[idx][0]} drew in ${Math.round(oMs)} ms`, W / 2, 256, { size: 18, font: 'ui', color: '#fff' }); }
        }
        for (let i = 0; i < 3; i++) D.star(g, 30 + i * 30, H - 30, 11, 5, 5, -Math.PI / 2, i < lives ? '#fde68a' : 'rgba(255,255,255,.15)');
        D.vignette(g, W, H, 0.5 + tense * 0.2);
      },
    };
    function figure(g, x, dir, coat, hat, arm, fall, t) {
      g.save(); g.translate(x, GY);
      if (fall > 0) g.rotate(-dir * U.ease.inQuad(fall) * 1.45);
      const breathe = Math.sin(t * 2 + x) * 1.5;
      g.fillStyle = '#0c0a09';
      // legs & boots
      g.fillRect(-16, -70, 12, 70); g.fillRect(4, -70, 12, 70);
      g.fillRect(-20 + (dir > 0 ? 0 : -4), -8, 20, 8); g.fillRect(2 + (dir > 0 ? 0 : -4), -8, 20, 8);
      // coat / poncho
      g.fillStyle = coat; g.beginPath(); g.moveTo(-26, -150 + breathe); g.lineTo(26, -150 + breathe); g.lineTo(32, -64); g.lineTo(-32, -64); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-26, -86, 52, 7);
      D.fillRR(g, dir > 0 ? 16 : -28, -86, 12, 20, 3, '#1c1917');
      // gun arm
      const ang = arm > 0 ? 0 : Math.PI / 2 - 0.15;
      g.save(); g.translate(dir * 20, -140 + breathe); g.scale(dir, 1); g.rotate(ang);
      g.fillStyle = coat; g.fillRect(0, -6, 46, 12); g.fillStyle = '#d6a370'; g.fillRect(44, -6, 10, 11);
      if (arm > 0) { g.fillStyle = '#44403c'; g.fillRect(50, -10, 30, 8); g.fillRect(50, -6, 8, 14); }
      g.restore();
      // other arm
      g.fillStyle = coat; g.save(); g.translate(-dir * 22, -140 + breathe); g.rotate(dir * 0.25); g.fillRect(-6, 0, 12, 50); g.restore();
      // head & hat
      g.fillStyle = '#d6a370'; g.beginPath(); g.arc(0, -166 + breathe, 16, 0, U.TAU); g.fill();
      g.fillStyle = '#0c0a09'; g.fillRect(dir * 2, -170 + breathe, dir * 10, 3);
      if (hat === 1) g.fillRect(-12 * dir, -158 + breathe, 24 * dir, 4);
      const hy = -176 + breathe - (fall > 0.2 ? (fall - 0.2) * 80 : 0);
      g.fillStyle = '#1c1917';
      if (hat === 2) { g.beginPath(); g.ellipse(0, hy, 34, 6, 0, 0, U.TAU); g.fill(); g.beginPath(); g.arc(0, hy - 2, 16, Math.PI, 0); g.fill(); }
      else { g.beginPath(); g.ellipse(0, hy, 30, 6, 0, 0, U.TAU); g.fill(); g.fillRect(-15, hy - 22, 30, 22); g.fillStyle = coat; g.fillRect(-15, hy - 6, 30, 4); }
      g.restore();
    }
  },
});

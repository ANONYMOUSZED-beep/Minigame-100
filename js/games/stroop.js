MG.add({
  id: 'stroop', name: 'Color Clash', cat: 'Brain', color: '#e879f9', color2: '#22d3ee',
  desc: 'Your brain reads words faster than it sees colours. Fight the Stroop effect for 45 seconds — and watch for the rule flip.',
  how: ['Answer with the <b>INK colour</b> of the word, not what it says', 'When the rule flips to <b>MEANING</b>, answer what the word says', 'Click / tap the buttons or use <kbd>1</kbd>–<kbd>4</kbd> or <kbd>←</kbd><kbd>↓</kbd><kbd>↑</kbd><kbd>→</kbd>', 'Streaks multiply points · mistakes cost 2 seconds'],
  pad: 'LRUD',
  make(E) {
    const W = 960, H = 600, DUR = 45;
    const COLS = [['RED', '#ef4444'], ['BLUE', '#3b82f6'], ['GREEN', '#22c55e'], ['YELLOW', '#facc15'], ['PURPLE', '#a855f7'], ['ORANGE', '#f97316']];
    const KEYS = [['Digit1', 'Numpad1', 'ArrowLeft', 'KeyA'], ['Digit2', 'Numpad2', 'ArrowDown', 'KeyS'], ['Digit3', 'Numpad3', 'ArrowUp', 'KeyW'], ['Digit4', 'Numpad4', 'ArrowRight', 'KeyD']];
    const BW = 190, BH = 76, BY = 430;
    let time = DUR, el = 0, q = null, opts = [], rule = 'ink', ruleT = 0, streak = 0, best = 0, right = 0, wrong = 0, qT = 0, over = false, anim = 0, shakeW = 0, flashBtn = [-1, 0, ''], T = 0, rts = [];
    E.stat('Time', DUR); E.stat('Streak', 0);
    function newQ() {
      const pool = el > 20 ? COLS : COLS.slice(0, 4);
      opts = U.shuffle(pool.slice()).slice(0, 4);
      const word = U.pick(opts), ink = U.pick(opts.filter((c) => c !== word || Math.random() < 0.15));
      q = { word, ink, tilt: el > 25 ? U.rand(-0.15, 0.15) : 0, size: el > 30 ? U.rand(64, 110) : 92 };
      if (el > 12 && Math.random() < 0.18) { rule = rule === 'ink' ? 'meaning' : 'ink'; ruleT = 1; E.sfx('whoosh', 1.2, 0.5); }
      anim = 0; qT = 0;
    }
    newQ();
    function answer(i) {
      const target = rule === 'ink' ? q.ink : q.word, ok = opts[i] === target;
      rts.push(qT);
      if (ok) {
        right++; streak++; best = Math.max(best, streak);
        const mult = 1 + Math.floor(streak / 5), pts = Math.round((50 + Math.max(0, 100 - qT * 60)) * mult);
        E.score += pts; E.sfx('select', 1 + Math.min(streak, 15) * 0.03);
        E.pop(W / 2, 250, `+${pts}`, { color: q.ink[1], size: 22 });
        if (streak % 10 === 0) { E.sfx('power'); E.pop(W / 2, 120, `${streak} STREAK!`, { color: '#fde047', size: 30 }); time += 2; E.pop(W / 2, 160, '+2 sec', { color: '#4ade80', size: 18 }); }
        flashBtn = [i, 0.3, '#4ade80'];
      } else {
        wrong++; streak = 0; time -= 2; shakeW = 1;
        E.sfx('error'); E.shake(6);
        E.pop(W / 2, 250, '−2 sec', { color: '#f87171', size: 24 });
        flashBtn = [i, 0.4, '#ef4444'];
      }
      E.stat('Streak', streak);
      newQ();
    }
    return {
      update(dt) {
        T += dt;
        if (over) return;
        el += dt; time -= dt; qT += dt; anim = Math.min(1, anim + dt * 8); ruleT = Math.max(0, ruleT - dt * 1.5); shakeW = Math.max(0, shakeW - dt * 3); flashBtn[1] = Math.max(0, flashBtn[1] - dt);
        E.stat('Time', Math.ceil(Math.max(0, time)));
        if (time <= 0) {
          over = true; E.sfx('tada');
          const avg = rts.length ? Math.round((rts.reduce((a, b) => a + b, 0) / rts.length) * 1000) : 0;
          E.over({ title: 'Time!', msg: `${right} right · ${wrong} wrong · ${avg} ms average · best streak ${best}` });
          return;
        }
        KEYS.forEach((ks, i) => { if (E.hit(...ks)) answer(i); });
        if (E.ptr.hit) for (let i = 0; i < 4; i++) { const x = bx(i); if (U.ptInRect(E.ptr.x, E.ptr.y, x, BY, BW, BH)) answer(i); }
      },
      draw(g) {
        const t = E.t;
        D.radialBg(g, W, H, '#1a1033', '#06040c');
        // soft colour clouds behind
        for (let i = 0; i < 6; i++) D.glow(g, W / 2 + Math.cos(t * 0.3 + i) * 330, 280 + Math.sin(t * 0.4 + i * 2) * 140, 220, COLS[i][1], 0.08);
        // rule chip
        const inkRule = rule === 'ink', pulse = 1 + ruleT * 0.35;
        g.save(); g.translate(W / 2, 74); g.scale(pulse, pulse);
        D.fillRR(g, -170, -24, 340, 48, 24, inkRule ? 'rgba(34,211,238,.15)' : 'rgba(232,121,249,.18)');
        D.strokeRR(g, -170, -24, 340, 48, 24, inkRule ? '#22d3ee' : '#e879f9', 2);
        D.text(g, inkRule ? 'TAP THE INK COLOUR' : 'TAP THE WORD\'S MEANING', 0, 1, { size: 20, color: inkRule ? '#67e8f9' : '#f0abfc' });
        g.restore();
        if (ruleT > 0) D.text(g, 'RULE FLIP!', W / 2, 124, { size: 18, font: 'mono', color: `rgba(253,224,71,${ruleT})` });
        // the word
        g.save(); g.translate(W / 2 + Math.sin(shakeW * 40) * 14 * shakeW, 260); g.rotate(q.tilt); const s = U.ease.outBack(anim); g.scale(s, s);
        D.text(g, q.word[0], 0, 0, { size: q.size, color: q.ink[1], glow: q.ink[1], blur: 22, stroke: 'rgba(0,0,0,.35)', lw: 6 });
        g.restore();
        // question timer bar (speed bonus window)
        const qk = Math.max(0, 1 - qT / 1.6);
        D.fillRR(g, W / 2 - 120, 340, 240, 6, 3, 'rgba(255,255,255,.08)'); D.fillRR(g, W / 2 - 120, 340, 240 * qk, 6, 3, 'rgba(255,255,255,.45)');
        // buttons
        for (let i = 0; i < 4; i++) {
          const x = bx(i), fl = flashBtn[0] === i && flashBtn[1] > 0, hov = E.ptr.type === 'mouse' && U.ptInRect(E.ptr.x, E.ptr.y, x, BY, BW, BH);
          D.tile(g, x, BY - (hov ? 3 : 0), BW, BH, 16, fl ? flashBtn[2] : hov ? '#3b3363' : '#2a2447', 6);
          D.text(g, opts[i][0], x + BW / 2, BY + BH / 2 - 4 - (hov ? 3 : 0), { size: 26, color: '#f8fafc' });
          D.text(g, ['1 ←', '2 ↓', '3 ↑', '4 →'][i], x + BW / 2, BY + BH + 16, { size: 12, font: 'mono', color: 'rgba(255,255,255,.3)' });
        }
        // time
        const k = Math.max(0, time / DUR);
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6; g.beginPath(); g.arc(W - 60, 60, 30, 0, U.TAU); g.stroke();
        g.strokeStyle = time < 8 ? '#ef4444' : '#e879f9'; g.beginPath(); g.arc(W - 60, 60, 30, -Math.PI / 2, -Math.PI / 2 + U.TAU * Math.min(1, k)); g.stroke();
        D.text(g, Math.ceil(Math.max(0, time)), W - 60, 61, { size: 20, color: '#fff' });
        if (streak >= 5) D.text(g, `×${1 + Math.floor(streak / 5)}`, 60, 60, { size: 30, color: '#fde047', glow: '#f97316' });
      },
    };
    function bx(i) { return W / 2 - (4 * BW + 3 * 20) / 2 + i * (BW + 20); }
  },
});

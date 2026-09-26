MG.add({
  id: 'circlebeat', name: 'Circle Beat', cat: 'Rhythm', color: '#f472b6', color2: '#38bdf8', music: false,
  desc: 'Aim-and-timing rhythm: click circles as their rings close in, ride the sliders, and flow with a brand-new track every run.',
  how: ['Click / tap each circle as its outer ring meets the edge', 'Or aim with the mouse and tap <kbd>Z</kbd> / <kbd>X</kbd>', 'Sliders: press on the head, then hold and follow the ball', 'Numbers show the order · misses drain your life bar'],
  pad: false,
  make(E) {
    const W = 960, H = 600, R = 40, AR = 0.95, FADE = 0.3;
    const COMBO = ['#f472b6', '#38bdf8', '#a3e635', '#fbbf24'];
    const song = MG.Song.make((Math.random() * 1e9) | 0, { plan: [['intro', 2], ['A', 8], ['B', 8], ['A', 8], ['B', 8], ['outro', 2]] });
    const player = MG.Song.player(E, song);
    // ---- beatmap ----
    const objs = [];
    let x = W / 2, y = H / 2, ang = U.rand(U.TAU), lastT = -9, busyUntil = -9, cidx = 0, num = 0, lastBar = -1;
    // walk the playfield: keep flowing in roughly the same direction, never overlapping recent notes
    const clear = (nx, ny) => nx >= 90 && nx <= W - 90 && ny >= 110 && ny <= H - 80 && objs.slice(-4).every((o) => U.dist(o.x, o.y, nx, ny) > R * 2.5 && (!o.sl || (U.dist(o.sl.x2, o.sl.y2, nx, ny) > R * 2.5 && U.dist(o.sl.cx, o.sl.cy, nx, ny) > R * 2)));
    function place(dist) {
      for (let k = 0; k < 16; k++) {
        const a = ang + (k < 4 ? U.rand(-0.9, 0.9) : U.rand(-Math.PI, Math.PI));
        const nx = x + Math.cos(a) * dist, ny = y + Math.sin(a) * dist;
        if (clear(nx, ny)) { ang = a; x = nx; y = ny; return; }
      }
      ang = Math.atan2(H / 2 - y, W / 2 - x) + U.rand(-0.5, 0.5); x = U.clamp(x + Math.cos(ang) * dist, 90, W - 90); y = U.clamp(y + Math.sin(ang) * dist, 110, H - 80);
    }
    for (const e of song.events) {
      const intro = e.type === 'kick' && e.sec === 'intro' && e.bar === 1;
      if (!intro && e.type !== 'lead') continue;
      if (e.t < busyUntil + 0.12 || e.t - lastT < song.st * 1.9) continue;
      const gap = e.t - lastT;
      if (gap > song.spb * 2.5 || (e.bar !== lastBar && e.bar % 2 === 0 && e.s === 0)) { cidx = (cidx + 1) % COMBO.length; num = 0; }
      if (lastT >= 0) place(U.clamp((gap / song.spb) * 150, 115, 260));
      const o = { t: e.t, x, y, n: ++num, c: cidx };
      if (!intro && e.len >= 6) {
        const len = U.clamp((e.dur / song.spb) * 110, 110, 260), a2 = ang + U.rand(-0.8, 0.8);
        let x2 = x + Math.cos(a2) * len, y2 = y + Math.sin(a2) * len;
        x2 = U.clamp(x2, 90, W - 90); y2 = U.clamp(y2, 110, H - 80);
        const mx = (x + x2) / 2, my = (y + y2) / 2, nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1, bend = U.rand(-0.35, 0.35);
        o.sl = { x2, y2, cx: mx + (nx / nl) * len * bend, cy: my + (ny / nl) * len * bend, end: e.t + e.dur * 0.9, track: 0, total: 0 };
        busyUntil = o.sl.end; x = x2; y = y2; ang = Math.atan2(y2 - o.y, x2 - o.x);
      } else busyUntil = e.t;
      objs.push(o); lastT = e.t; lastBar = e.bar;
    }
    const total = objs.length + objs.filter((o) => o.sl).length;
    const kicks = song.events.filter((e) => e.type === 'kick').map((e) => e.t);
    let songT = -2, ki = 0, pulse = 0, hp = 1, combo = 0, maxC = 0, cnt = { 300: 0, 100: 0, 50: 0, 0: 0 }, over = false, T = 0, lat = 0;
    let cx = W / 2, cy = H / 2;
    const trail = [], judges = [];
    E.stat('Combo', 0); E.stat('Acc', '100%');
    const bez = (o, k) => { const s = o.sl, u = 1 - k; return [u * u * o.x + 2 * u * k * s.cx + k * k * s.x2, u * u * o.y + 2 * u * k * s.cy + k * k * s.y2]; };
    function acc() { const n = cnt[300] + cnt[100] + cnt[50] + cnt[0]; return n ? (cnt[300] * 300 + cnt[100] * 100 + cnt[50] * 50) / (n * 300) : 1; }
    function result(v, px, py) {
      cnt[v]++;
      if (v) { combo++; maxC = Math.max(maxC, combo); hp = Math.min(1, hp + (v === 300 ? 0.05 : 0.02)); E.score += Math.round(v * (1 + combo / 25)); }
      else { if (combo >= 10) E.sfx('error', 0.9, 0.4); combo = 0; hp -= 0.1; }
      judges.push({ x: px, y: py, v, t: 0.7 });
      E.stat('Combo', combo); E.stat('Acc', `${(acc() * 100).toFixed(1)}%`);
      if (hp <= 0 && !over) { over = true; E.sfx('lose'); E.over({ title: 'Failed', msg: `${song.title} · ${Math.round((songT / song.length) * 100)}% through · max combo ${maxC}` }); }
    }
    function click(t) {
      for (const o of objs) {
        if (o.j !== undefined) continue;
        if (o.t - t > AR) break;
        if (U.dist(cx, cy, o.x, o.y) > R * 1.05) continue;
        const d = Math.abs(t - o.t);
        if (t < o.t - 0.16) { o.shake = 0.25; E.sfx('tick', 0.6, 0.4); return; }
        const v = d <= 0.055 ? 300 : d <= 0.11 ? 100 : 50;
        o.j = v; o.jt = t; result(v, o.x, o.y);
        E.sfx('tick', 1.6, 0.5); E.noise({ dur: 0.05, vol: 0.12, ft: 'highpass', f: 4000 });
        E.ring(o.x, o.y, { r: R * 1.8, color: COMBO[o.c], lw: 5, life: 0.3 });
        return;
      }
    }
    return {
      start() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = 'none'; if (window.Sound && Sound.ctx) lat = Math.min(0.08, Sound.ctx.outputLatency || Sound.ctx.baseLatency || 0); },
      destroy() { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = ''; },
      update(dt) {
        T += dt;
        if (E.ptr.moved || E.ptr.hit) { cx = E.ptr.x; cy = E.ptr.y; }
        trail.push([cx, cy]); if (trail.length > 12) trail.shift();
        for (const j of judges) j.t -= dt; while (judges.length && judges[0].t <= 0) judges.shift();
        if (over) return;
        songT += dt; player.update(songT);
        const t = songT - lat;
        while (ki < kicks.length && kicks[ki] <= t) { ki++; pulse = 1; }
        pulse = Math.max(0, pulse - dt * 4);
        if (t > 0) hp = Math.max(0.001, hp - dt * 0.012);
        if (E.ptr.hit || E.hit('KeyZ', 'KeyX')) click(t);
        const holding = E.ptr.down || E.down('KeyZ', 'KeyX');
        for (const o of objs) {
          if (o.t - t > AR) break;
          if (o.shake) o.shake = Math.max(0, o.shake - dt);
          if (o.j === undefined && t - o.t > 0.16) { o.j = 0; o.jt = t; result(0, o.x, o.y); }
          if (o.sl && !o.sl.done && t >= o.t) {
            const s = o.sl;
            if (t < s.end) {
              const [bx, by] = bez(o, (t - o.t) / (s.end - o.t));
              s.total += dt; if (holding && U.dist(cx, cy, bx, by) < R * 2.4) { s.track += dt; s.on = true; } else s.on = false;
            } else {
              s.done = true; const k = s.total ? s.track / s.total : 0;
              const v = k > 0.85 ? 300 : k > 0.55 ? 100 : k > 0.25 ? 50 : 0;
              result(v, s.x2, s.y2); if (v) E.sfx('tick', 2, 0.4);
            }
          }
        }
        if (songT > song.length + 1 && !over) {
          over = true; const a = acc();
          const grade = cnt[0] === 0 && cnt[100] + cnt[50] === 0 ? 'SS' : a >= 0.93 && cnt[0] === 0 ? 'S' : a >= 0.9 ? 'A' : a >= 0.8 ? 'B' : a >= 0.7 ? 'C' : 'D';
          E.sfx('tada');
          E.over({ win: true, title: `Rank ${grade}`, msg: `${song.title} · ${(a * 100).toFixed(2)}% · ${cnt[300]}×300 ${cnt[100]}×100 ${cnt[50]}×50 ${cnt[0]} miss · max combo ${maxC}/${total}` });
        }
      },
      draw(g) {
        const t = songT - lat;
        D.radialBg(g, W, H, '#1e1238', '#05030c');
        // beat-reactive backdrop
        D.glow(g, W / 2, H / 2, 380 + pulse * 40, '#7c3aed', 0.18 + pulse * 0.12);
        g.strokeStyle = `rgba(244,114,182,${0.06 + pulse * 0.1})`; g.lineWidth = 2;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(W / 2, H / 2, 120 + i * 90 + pulse * 10, 0, U.TAU); g.stroke(); }
        // follow points
        for (let i = 0; i < objs.length - 1; i++) {
          const a = objs[i], b = objs[i + 1];
          if (b.t - t > AR || (a.sl ? a.sl.end : a.t) < t - 0.1) { if (a.t - t > AR) break; continue; }
          const ax = a.sl ? a.sl.x2 : a.x, ay = a.sl ? a.sl.y2 : a.y, d = U.dist(ax, ay, b.x, b.y);
          if (d < R * 2.6 || a.c !== b.c) continue;
          const n = Math.floor((d - R * 2) / 26);
          for (let k = 1; k <= n; k++) { const f = (R + k * 26) / d; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(ax + (b.x - ax) * f - 2, ay + (b.y - ay) * f - 1, 4, 2); }
        }
        // objects (latest first so earlier ones are on top)
        const vis = objs.filter((o) => o.t - t <= AR && (o.sl ? o.sl.end + FADE : o.t + 0.16 + FADE) > t && !(o.j !== undefined && !o.sl && t - o.jt > 0.2));
        for (let i = vis.length - 1; i >= 0; i--) {
          const o = vis[i], col = COMBO[o.c], appear = U.clamp((AR - (o.t - t)) / (AR * 0.4), 0, 1);
          let alpha = appear;
          if (o.sl && t > o.sl.end) alpha = Math.max(0, 1 - (t - o.sl.end) / FADE);
          g.globalAlpha = alpha;
          const sx = o.shake ? Math.sin(o.shake * 80) * 6 : 0;
          if (o.sl) {
            const s = o.sl;
            g.lineCap = 'round'; g.lineJoin = 'round';
            g.beginPath(); g.moveTo(o.x, o.y); g.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
            g.strokeStyle = '#fff'; g.lineWidth = R * 2; g.stroke();
            g.strokeStyle = U.shade(col, -0.6); g.lineWidth = R * 2 - 8; g.stroke();
            g.strokeStyle = U.rgba(col, 0.25); g.lineWidth = R * 1.2; g.stroke();
            D.circle(g, s.x2, s.y2, R - 4, null, 'rgba(255,255,255,.7)', 3);
            if (t >= o.t && t <= s.end) {
              const [bx, by] = bez(o, (t - o.t) / (s.end - o.t));
              if (s.on) D.circle(g, bx, by, R * 2.4, null, U.rgba(col, 0.7), 3);
              D.glow(g, bx, by, R * 2, col, 0.6); D.circle(g, bx, by, R * 0.8, col, '#fff', 4);
            }
          }
          if (o.j === undefined || (o.sl && t < o.t + 0.05)) {
            // hit circle
            D.circle(g, o.x + sx, o.y, R, U.shade(col, -0.25));
            const gr = g.createRadialGradient(o.x + sx, o.y - R * 0.4, 2, o.x + sx, o.y, R); gr.addColorStop(0, U.shade(col, 0.35)); gr.addColorStop(1, U.shade(col, -0.35));
            D.circle(g, o.x + sx, o.y, R - 5, gr);
            D.circle(g, o.x + sx, o.y, R - 2, null, '#fff', 4);
            D.text(g, o.n, o.x + sx, o.y + 1, { size: 26, color: '#fff', stroke: 'rgba(0,0,0,.35)', lw: 4 });
            // approach circle
            const k = U.clamp((o.t - t) / AR, 0, 1);
            if (o.j === undefined && k > 0) D.circle(g, o.x, o.y, R * (1 + k * 2.2), null, col, 3);
          } else if (!o.sl && o.j) {
            const k = (t - o.jt) / 0.2; g.globalAlpha = Math.max(0, 1 - k);
            D.circle(g, o.x, o.y, R * (1 + k * 0.4), null, '#fff', 4);
          }
          g.globalAlpha = 1;
        }
        // judgements
        for (const j of judges) { const k = j.t / 0.7, c = { 300: '#7dd3fc', 100: '#86efac', 50: '#fde68a', 0: '#f87171' }[j.v]; D.text(g, j.v ? j.v : '✕', j.x, j.y + 44 - (1 - k) * 10, { size: j.v ? 22 : 34, color: c, alpha: Math.min(1, k * 2) }); }
        // HUD
        D.fillRR(g, 20, 18, 300, 10, 5, 'rgba(255,255,255,.1)'); D.fillRR(g, 20, 18, 300 * Math.max(0, hp), 10, 5, hp < 0.3 ? '#f87171' : '#f472b6');
        const pr = U.clamp(songT / song.length, 0, 1);
        g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(W - 36, 34, 16, 0, U.TAU); g.fill();
        g.fillStyle = '#38bdf8'; g.beginPath(); g.moveTo(W - 36, 34); g.arc(W - 36, 34, 16, -Math.PI / 2, -Math.PI / 2 + U.TAU * pr); g.fill();
        D.text(g, `♪ ${song.title} · ${song.bpm} BPM`, W / 2, 24, { size: 13, font: 'mono', color: 'rgba(255,255,255,.55)' });
        if (combo > 1) D.text(g, `${combo}×`, 24, H - 36, { size: 40 + pulse * 3, align: 'left', color: '#fff' });
        D.text(g, `${(acc() * 100).toFixed(2)}%`, W - 24, 70, { size: 16, font: 'mono', align: 'right', color: 'rgba(255,255,255,.7)' });
        if (songT < 0) D.text(g, Math.ceil(-songT), W / 2, H / 2, { size: 90, color: '#fff', glow: '#f472b6', alpha: 0.85 });
        // cursor
        for (let i = 0; i < trail.length; i++) { const [px, py] = trail[i]; g.globalAlpha = (i / trail.length) * 0.4; D.circle(g, px, py, 6 + (i / trail.length) * 6, '#fde68a'); }
        g.globalAlpha = 1;
        D.glow(g, cx, cy, 30, '#fde68a', 0.6); D.circle(g, cx, cy, 10, '#fef3c7', '#f59e0b', 3);
      },
    };
  },
});

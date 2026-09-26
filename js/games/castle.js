MG.add({
  id: 'castle', name: 'Castle Crash', cat: 'Physics', color: '#f97316', color2: '#84cc16',
  desc: 'Slingshot siege on a real rigid-body sim: glass shatters, wood splinters, stone topples onto the gremlins.',
  how: ['Drag back from the slingshot and release to launch', 'Keyboard: <kbd>↑</kbd> <kbd>↓</kbd> angle · hold <kbd>Space</kbd> for power, release to fire', 'Glass breaks easily, wood takes a few hits, stone is tough', 'Clear every gremlin — unused shots are bonus points'],
  pad: 'UDA', padLabels: { A: 'FIRE' },
  make(E) {
    const W = 960, H = 600, GROUND = 540, G = 900, SLING = { x: 150, y: 430 };
    const MAT = { glass: { col: '#a5f3fc', hp: 18, dens: 0.6, fr: 0.3, pts: 300 }, wood: { col: '#d97706', hp: 45, dens: 1, fr: 0.6, pts: 500 }, stone: { col: '#94a3b8', hp: 110, dens: 2.4, fr: 0.8, pts: 800 }, gremlin: { col: '#84cc16', hp: 12, dens: 0.8, fr: 0.5, pts: 5000 }, ball: { col: '#ef4444', hp: 1e9, dens: 3, fr: 0.5, pts: 0 } };
    const LEVELS = [
      { shots: 3, parts: [['wood', 640, 480, 20, 100], ['wood', 760, 480, 20, 100], ['wood', 700, 420, 160, 20], ['g', 700, 510, 18], ['glass', 700, 380, 20, 60], ['g', 700, 330, 16]] },
      { shots: 3, parts: [['stone', 600, 500, 40, 80], ['stone', 820, 500, 40, 80], ['wood', 710, 450, 260, 20], ['glass', 650, 400, 20, 80], ['glass', 770, 400, 20, 80], ['wood', 710, 350, 160, 20], ['g', 710, 420, 18], ['g', 710, 320, 16], ['g', 710, 520, 18]] },
      { shots: 4, parts: [['wood', 560, 490, 20, 100], ['wood', 640, 490, 20, 100], ['wood', 600, 430, 110, 20], ['wood', 720, 490, 20, 100], ['wood', 800, 490, 20, 100], ['wood', 760, 430, 110, 20], ['glass', 600, 390, 20, 60], ['glass', 760, 390, 20, 60], ['stone', 680, 350, 240, 20], ['g', 600, 520, 16], ['g', 760, 520, 16], ['g', 680, 320, 18]] },
      { shots: 4, parts: [['stone', 700, 510, 200, 60], ['wood', 630, 440, 20, 80], ['wood', 770, 440, 20, 80], ['glass', 700, 390, 180, 20], ['wood', 660, 340, 20, 80], ['wood', 740, 340, 20, 80], ['wood', 700, 290, 120, 20], ['g', 700, 450, 18], ['g', 700, 355, 16], ['g', 700, 260, 16], ['glass', 850, 500, 20, 80], ['g', 850, 445, 14]] },
      { shots: 4, parts: [['wood', 560, 470, 20, 140], ['stone', 620, 470, 20, 140], ['wood', 590, 390, 90, 20], ['g', 590, 520, 16], ['glass', 700, 500, 20, 80], ['glass', 780, 500, 20, 80], ['wood', 740, 450, 110, 20], ['g', 740, 520, 16], ['stone', 860, 460, 20, 160], ['wood', 820, 370, 110, 20], ['g', 830, 340, 16], ['g', 590, 360, 16]] },
      { shots: 5, parts: [['stone', 620, 500, 20, 80], ['stone', 700, 500, 20, 80], ['stone', 780, 500, 20, 80], ['stone', 860, 500, 20, 80], ['wood', 660, 450, 100, 20], ['wood', 820, 450, 100, 20], ['glass', 740, 450, 60, 20], ['wood', 660, 400, 20, 80], ['wood', 820, 400, 20, 80], ['stone', 740, 350, 220, 20], ['glass', 700, 310, 20, 60], ['glass', 780, 310, 20, 60], ['wood', 740, 270, 120, 20], ['g', 660, 520, 16], ['g', 820, 520, 16], ['g', 740, 520, 16], ['g', 740, 310, 16], ['g', 740, 240, 14]] },
    ];
    let settling = false, bodies = [], lvl = -1, shots = 0, ball = null, aim = { a: -0.6, p: 0.7 }, drag = null, charge = null, state = 'aim', stateT = 0, T = 0, trailDots = [], lastTrail = [], clouds = U.range(5).map(() => ({ x: U.rand(W), y: U.rand(40, 200), s: U.rand(0.6, 1.3) }));
    function body(shape, mat, x, y, a, b, isStatic) {
      const m = MAT[mat];
      const o = { shape, mat, x, y, a: 0, vx: 0, vy: 0, w: 0, hp: m.hp, maxhp: m.hp, asleep: !isStatic, sleepT: 0, dead: false, static: !!isStatic };
      if (shape === 'box') { o.hw = a / 2; o.hh = b / 2; const mass = isStatic ? 0 : (a * b * m.dens) / 400; o.invM = mass ? 1 / mass : 0; o.invI = mass ? 1 / ((mass * (a * a + b * b)) / 12) : 0; }
      else { o.r = a; const mass = isStatic ? 0 : (Math.PI * a * a * m.dens) / 400; o.invM = mass ? 1 / mass : 0; o.invI = mass ? 1 / (0.5 * mass * a * a) : 0; }
      o.fr = m.fr; bodies.push(o); return o;
    }
    function load() {
      lvl++; const L = LEVELS[lvl % LEVELS.length];
      bodies = []; body('box', 'stone', W / 2, GROUND + 60, W * 3, 120, true);
      for (const p of L.parts) { if (p[0] === 'g') body('circle', 'gremlin', p[1], p[2], p[3]); else body('box', p[0], p[1], p[2], p[3], p[4]); }
      // let the authored layout settle into a physically resting pose, then freeze it asleep
      settling = true;
      for (const b of bodies) if (!b.static) b.asleep = false;
      for (let i = 0; i < 400; i++) step(1 / 120);
      for (const b of bodies) if (!b.static) { b.asleep = true; b.vx = b.vy = b.w = 0; b.hp = b.maxhp; }
      settling = false;
      shots = L.shots + (lvl >= LEVELS.length ? 1 : 0); state = 'aim'; ball = null; lastTrail = trailDots; trailDots = [];
      E.stat('Level', lvl + 1); E.stat('Shots', shots);
      E.banner(`LEVEL ${lvl + 1}`, `${L.parts.filter((p) => p[0] === 'g').length} gremlins`, { color: '#f97316', life: 1.2 });
    }
    const cross = (ax, ay, bx, by) => ax * by - ay * bx;
    function verts(b) { const c = Math.cos(b.a), s = Math.sin(b.a); return [[-b.hw, -b.hh], [b.hw, -b.hh], [b.hw, b.hh], [-b.hw, b.hh]].map(([x, y]) => [b.x + x * c - y * s, b.y + x * s + y * c]); }
    function inBox(b, px, py, m = 0.5) { const c = Math.cos(-b.a), s = Math.sin(-b.a), lx = (px - b.x) * c - (py - b.y) * s, ly = (px - b.x) * s + (py - b.y) * c; return Math.abs(lx) <= b.hw + m && Math.abs(ly) <= b.hh + m; }
    function collide(A, B) {
      if (A.shape === 'circle' && B.shape === 'circle') {
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d >= A.r + B.r || d < 1e-6) return null;
        return { n: [dx / d, dy / d], depth: A.r + B.r - d, pts: [[A.x + (dx / d) * A.r, A.y + (dy / d) * A.r]] };
      }
      if (A.shape === 'circle') { const c = collide(B, A); if (!c) return null; c.n = [-c.n[0], -c.n[1]]; return c; }
      if (B.shape === 'circle') {
        const c = Math.cos(-A.a), s = Math.sin(-A.a), lx = (B.x - A.x) * c - (B.y - A.y) * s, ly = (B.x - A.x) * s + (B.y - A.y) * c;
        const cx = U.clamp(lx, -A.hw, A.hw), cy = U.clamp(ly, -A.hh, A.hh);
        let nx = lx - cx, ny = ly - cy, d = Math.hypot(nx, ny), depth;
        if (d < 1e-6) { const px = A.hw - Math.abs(lx), py = A.hh - Math.abs(ly); if (px < py) { nx = Math.sign(lx); ny = 0; depth = px + B.r; } else { nx = 0; ny = Math.sign(ly); depth = py + B.r; } }
        else { if (d >= B.r) return null; nx /= d; ny /= d; depth = B.r - d; }
        const c2 = Math.cos(A.a), s2 = Math.sin(A.a), wx = nx * c2 - ny * s2, wy = nx * s2 + ny * c2;
        return { n: [wx, wy], depth, pts: [[B.x - wx * B.r, B.y - wy * B.r]] };
      }
      const va = verts(A), vb = verts(B), axes = [[Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)], [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)]];
      let best = 1e9, bn = null;
      for (const ax of axes) {
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        for (const [x, y] of va) { const p = x * ax[0] + y * ax[1]; a0 = Math.min(a0, p); a1 = Math.max(a1, p); }
        for (const [x, y] of vb) { const p = x * ax[0] + y * ax[1]; b0 = Math.min(b0, p); b1 = Math.max(b1, p); }
        const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return null;
        if (o < best) { best = o; bn = ax; }
      }
      let n = bn; if ((B.x - A.x) * n[0] + (B.y - A.y) * n[1] < 0) n = [-n[0], -n[1]];
      const pts = [];
      for (const v of vb) if (inBox(A, v[0], v[1], 1)) pts.push(v);
      for (const v of va) if (inBox(B, v[0], v[1], 1)) pts.push(v);
      if (!pts.length) { let md = 1e9, mv = null; for (const v of vb) { const p = v[0] * n[0] + v[1] * n[1]; if (p < md) { md = p; mv = v; } } pts.push(mv); }
      return { n, depth: best, pts: pts.slice(0, 4) };
    }
    const rad = (b) => (b.shape === 'box' ? Math.hypot(b.hw, b.hh) : b.r);
    function wake(b) {
      if (!b.asleep) return;
      const q = [b]; b.asleep = false; b.sleepT = 0;
      while (q.length) { const c = q.pop(); for (const o of bodies) if (o.asleep && !o.dead && U.dist(o.x, o.y, c.x, c.y) < rad(o) + rad(c) + 6) { o.asleep = false; o.sleepT = 0; q.push(o); } }
    }
    function damage(b, imp) {
      if (settling || b.static || b.mat === 'ball') return;
      const dmg = imp * (b.mat === 'gremlin' ? 1.6 : 1);
      if (dmg < 4) return;
      b.hp -= dmg;
      if (b.hp <= 0 && !b.dead) {
        b.dead = true; const m = MAT[b.mat]; E.score += m.pts;
        E.pop(b.x, b.y - 20, `+${m.pts}`, { color: b.mat === 'gremlin' ? '#bef264' : '#fff', size: b.mat === 'gremlin' ? 24 : 16 });
        E.burst(b.x, b.y, { n: b.mat === 'gremlin' ? 30 : 16, colors: b.mat === 'gremlin' ? ['#84cc16', '#d9f99d', '#fff'] : [m.col, U.shade(m.col, -0.3)], speed: 220, shape: b.mat === 'gremlin' ? 'circle' : 'square', size: 4, grav: 600 });
        E.sfx(b.mat === 'glass' ? 'slice' : b.mat === 'gremlin' ? 'pop' : 'hit', b.mat === 'glass' ? 1.6 : 0.9, 0.8); E.shake(b.mat === 'stone' ? 6 : 3);
        for (const o of bodies) if (!o.static && U.dist(o.x, o.y, b.x, b.y) < 140) wake(o);
      }
    }
    function step(dt) {
      for (const b of bodies) {
        if (b.static || b.asleep || b.dead) continue;
        b.vy += G * dt; b.vx *= 0.999; b.vy *= 0.999; b.w *= 0.995;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      }
      const live = bodies.filter((b) => !b.dead);
      const contacts = [];
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const A = live[i], B = live[j];
        if ((A.static || A.asleep) && (B.static || B.asleep)) continue;
        const ra = A.shape === 'box' ? Math.hypot(A.hw, A.hh) : A.r, rb = B.shape === 'box' ? Math.hypot(B.hw, B.hh) : B.r;
        if (Math.abs(A.x - B.x) > ra + rb || Math.abs(A.y - B.y) > ra + rb) continue;
        const c = collide(A, B); if (!c) continue;
        // wake sleepers hit by fast movers
        const rel = Math.hypot(A.vx - B.vx, A.vy - B.vy);
        if (A.asleep && rel > 40) wake(A); if (B.asleep && rel > 40) wake(B);
        contacts.push({ A, B, ...c, maxImp: 0 });
      }
      for (let it = 0; it < 10; it++) for (const c of contacts) {
        const { A, B, n } = c;
        const iA = A.asleep ? 0 : A.invM, iB = B.asleep ? 0 : B.invM, IA = A.asleep ? 0 : A.invI, IB = B.asleep ? 0 : B.invI;
        if (!iA && !iB) continue;
        for (const [px, py] of c.pts) {
          const rax = px - A.x, ray = py - A.y, rbx = px - B.x, rby = py - B.y;
          const vax = A.vx - A.w * ray, vay = A.vy + A.w * rax, vbx = B.vx - B.w * rby, vby = B.vy + B.w * rbx;
          const rvx = vbx - vax, rvy = vby - vay, vn = rvx * n[0] + rvy * n[1];
          if (vn > 0) continue;
          const rnA = cross(rax, ray, n[0], n[1]), rnB = cross(rbx, rby, n[0], n[1]);
          const k = iA + iB + rnA * rnA * IA + rnB * rnB * IB;
          const e = Math.abs(vn) > 200 ? 0.15 : 0;
          const j = (-(1 + e) * vn) / k / c.pts.length;
          c.maxImp = Math.max(c.maxImp, j);
          A.vx -= n[0] * j * iA; A.vy -= n[1] * j * iA; A.w -= rnA * j * IA;
          B.vx += n[0] * j * iB; B.vy += n[1] * j * iB; B.w += rnB * j * IB;
          // friction
          const tx = -n[1], ty = n[0], vt = rvx * tx + rvy * ty, rtA = cross(rax, ray, tx, ty), rtB = cross(rbx, rby, tx, ty);
          const kt = iA + iB + rtA * rtA * IA + rtB * rtB * IB;
          let jt = -vt / kt / c.pts.length; const mu = (A.fr + B.fr) / 2; jt = U.clamp(jt, -j * mu * 1.2, j * mu * 1.2);
          A.vx -= tx * jt * iA; A.vy -= ty * jt * iA; A.w -= rtA * jt * IA;
          B.vx += tx * jt * iB; B.vy += ty * jt * iB; B.w += rtB * jt * IB;
        }
      }
      for (const c of contacts) {
        const { A, B, n } = c, iA = A.asleep ? 0 : A.invM, iB = B.asleep ? 0 : B.invM;
        if (!iA && !iB) continue;
        const corr = (Math.max(0, c.depth - 0.5) * 0.35) / (iA + iB);
        A.x -= n[0] * corr * iA; A.y -= n[1] * corr * iA; B.x += n[0] * corr * iB; B.y += n[1] * corr * iB;
        if (c.maxImp > 30) { damage(A, c.maxImp / 40); damage(B, c.maxImp / 40); }
        if (!settling && c.maxImp > 90 && (A.mat === 'ball' || B.mat === 'ball')) E.sfx('thud', 1.2, Math.min(0.8, c.maxImp / 800));
      }
      for (const b of bodies) {
        if (b.static || b.asleep || b.dead || b.mat === 'ball') continue;
        if (!settling && Math.hypot(b.vx, b.vy) < 8 && Math.abs(b.w) < 0.15) { b.sleepT += dt; if (b.sleepT > 0.8) { b.asleep = true; b.vx = b.vy = b.w = 0; } } else b.sleepT = 0;
        if (b.y > H + 100 || b.x < -200 || b.x > W + 300) { b.dead = true; if (b.mat === 'gremlin' && !settling) { E.score += MAT.gremlin.pts; E.pop(U.clamp(b.x, 40, W - 40), H - 60, '+5000', { color: '#bef264' }); } }
      }
    }
    function launch(a, p) {
      const sp = 380 + p * 720;
      ball = body('circle', 'ball', SLING.x, SLING.y, 16); ball.asleep = false; ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
      shots--; E.stat('Shots', shots); state = 'fly'; stateT = 0; lastTrail = trailDots; trailDots = [];
      E.sfx('whoosh', 0.9); E.sfx('bounce', 0.6, 0.6);
    }
    const gremlinsLeft = () => bodies.filter((b) => b.mat === 'gremlin' && !b.dead).length;
    load();
    return {
      update(dt) {
        T += dt;
        for (const c of clouds) { c.x += 8 * c.s * dt; if (c.x > W + 100) c.x = -100; }
        if (state === 'aim') {
          const a = E.axis(); aim.a = U.clamp(aim.a + a.y * 1.2 * dt, -1.4, 0.4);
          if (E.hit('A')) charge = 0; if (charge !== null) { charge = Math.min(1, charge + dt * 0.8); aim.p = charge; if (E.up('A')) { launch(aim.a, aim.p); charge = null; } }
          if (E.ptr.hit && U.dist(E.ptr.x, E.ptr.y, SLING.x, SLING.y) < 160) drag = true;
          if (drag && E.ptr.down) { const dx = SLING.x - E.ptr.x, dy = SLING.y - E.ptr.y, d = Math.min(110, Math.hypot(dx, dy)); if (d > 5) { aim.a = Math.atan2(dy, dx); aim.p = d / 110; } }
          if (drag && E.ptr.up) { drag = false; if (aim.p > 0.15) launch(aim.a, aim.p); }
        }
        for (let s = 0; s < 3; s++) step(dt / 3);
        if (state === 'fly') {
          stateT += dt;
          if (ball && !ball.dead && stateT % 0.05 < dt) trailDots.push([ball.x, ball.y]);
          const moving = bodies.some((b) => !b.static && !b.asleep && !b.dead && Math.hypot(b.vx, b.vy) > 20);
          if ((stateT > 2.5 && !moving) || stateT > 9) {
            if (ball) ball.dead = true; ball = null;
            if (!gremlinsLeft()) { state = 'clear'; stateT = 2; const bonus = shots * 2000; E.score += bonus; E.sfx('win'); E.banner('CASTLE CLEARED', bonus ? `+${bonus} for unused shots` : null, { color: '#84cc16' }); }
            else if (shots <= 0) { state = 'over'; E.sfx('lose'); E.over({ msg: `Fell at level ${lvl + 1} · ${gremlinsLeft()} gremlin${gremlinsLeft() > 1 ? 's' : ''} left` }); }
            else state = 'aim';
          }
        } else if (state === 'clear') { stateT -= dt; if (stateT <= 0) load(); }
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#7dd3fc', '#fef3c7');
        for (const c of clouds) { g.globalAlpha = 0.8; for (let k = 0; k < 3; k++) D.circle(g, c.x + k * 28 * c.s, c.y + (k === 1 ? -10 : 0), 24 * c.s, '#fff'); g.globalAlpha = 1; }
        g.fillStyle = '#86b36a'; g.beginPath(); g.moveTo(0, GROUND); for (let x = 0; x <= W; x += 30) g.lineTo(x, GROUND - 80 - Math.abs(Math.sin(x * 0.006)) * 90); g.lineTo(W, GROUND); g.fill();
        g.fillStyle = '#65a30d'; g.fillRect(0, GROUND, W, H - GROUND); g.fillStyle = '#4d7c0f'; g.fillRect(0, GROUND, W, 6);
        // slingshot back arm
        D.line(g, SLING.x - 4, GROUND, SLING.x - 4, SLING.y + 20, '#7c2d12', 12); D.line(g, SLING.x - 4, SLING.y + 20, SLING.x - 16, SLING.y - 12, '#7c2d12', 9);
        for (const [x, y] of lastTrail) D.circle(g, x, y, 2.5, 'rgba(255,255,255,.35)');
        for (const [x, y] of trailDots) D.circle(g, x, y, 3, 'rgba(255,255,255,.8)');
        // bodies
        for (const b of bodies) {
          if (b.dead || b.static) continue;
          const m = MAT[b.mat];
          if (b.shape === 'box') {
            g.save(); g.translate(b.x, b.y); g.rotate(b.a);
            const dmg = 1 - b.hp / b.maxhp;
            if (b.mat === 'glass') { g.fillStyle = 'rgba(165,243,252,.55)'; g.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2); g.strokeStyle = '#e0f2fe'; g.lineWidth = 2; g.strokeRect(-b.hw + 1, -b.hh + 1, b.hw * 2 - 2, b.hh * 2 - 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-b.hw + 3, -b.hh + 3, Math.min(6, b.hw), b.hh * 2 - 6); }
            else { const gr = g.createLinearGradient(0, -b.hh, 0, b.hh); gr.addColorStop(0, U.shade(m.col, 0.2)); gr.addColorStop(1, U.shade(m.col, -0.25)); g.fillStyle = gr; g.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2); g.strokeStyle = U.shade(m.col, -0.45); g.lineWidth = 2; g.strokeRect(-b.hw + 1, -b.hh + 1, b.hw * 2 - 2, b.hh * 2 - 2); if (b.mat === 'wood') { g.strokeStyle = 'rgba(120,53,15,.35)'; g.lineWidth = 1.5; for (let k = -b.hh + 6; k < b.hh; k += 8) { g.beginPath(); g.moveTo(-b.hw + 3, k); g.lineTo(b.hw - 3, k + 2); g.stroke(); } } else { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-b.hw + 4, -b.hh + 4, b.hw, 4); } }
            if (dmg > 0.3) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-b.hw * 0.4, -b.hh); g.lineTo(0, 0); g.lineTo(-b.hw * 0.2, b.hh); if (dmg > 0.6) { g.moveTo(b.hw * 0.5, -b.hh); g.lineTo(b.hw * 0.1, b.hh * 0.3); } g.stroke(); }
            g.restore();
          } else if (b.mat === 'gremlin') {
            g.save(); g.translate(b.x, b.y); g.rotate(b.a * 0.3);
            D.orb(g, 0, 0, b.r, b.hp < b.maxhp * 0.5 ? '#a3a33a' : '#84cc16', 0.3);
            D.circle(g, -b.r * 0.35, -b.r * 0.2, b.r * 0.28, '#fff'); D.circle(g, b.r * 0.35, -b.r * 0.2, b.r * 0.28, '#fff');
            D.circle(g, -b.r * 0.3, -b.r * 0.15, b.r * 0.12, '#111'); D.circle(g, b.r * 0.4, -b.r * 0.15, b.r * 0.12, '#111');
            g.fillStyle = '#3f6212'; g.beginPath(); g.ellipse(0, b.r * 0.35, b.r * 0.3, b.r * 0.12 + Math.sin(t * 4) * 1, 0, 0, U.TAU); g.fill();
            D.circle(g, -b.r * 0.8, -b.r * 0.8, b.r * 0.2, '#65a30d'); D.circle(g, b.r * 0.8, -b.r * 0.8, b.r * 0.2, '#65a30d');
            g.restore();
          } else { g.save(); g.translate(b.x, b.y); g.rotate(b.a); D.orb(g, 0, 0, b.r, '#ef4444', 0.35); D.circle(g, 5, -4, 5, '#fff'); D.circle(g, 7, -4, 2.5, '#111'); g.fillStyle = '#7f1d1d'; g.fillRect(-2, -14, 12, 4); g.restore(); }
        }
        // band + loaded ball
        if (state === 'aim') {
          const pull = aim.p * 110, bx = SLING.x - Math.cos(aim.a) * pull, by = SLING.y - Math.sin(aim.a) * pull;
          D.line(g, SLING.x - 16, SLING.y - 12, bx, by, '#451a03', 5);
          D.orb(g, bx, by, 16, '#ef4444', 0.35); D.circle(g, bx + 5, by - 4, 5, '#fff'); D.circle(g, bx + 7, by - 4, 2.5, '#111');
          D.line(g, bx, by, SLING.x + 14, SLING.y - 12, '#451a03', 5);
          const sp = 380 + aim.p * 720; let x = SLING.x, y = SLING.y, vx = Math.cos(aim.a) * sp, vy = Math.sin(aim.a) * sp;
          for (let i = 0; i < 18; i++) { for (let k = 0; k < 4; k++) { vy += G / 120; x += vx / 120; y += vy / 120; } g.globalAlpha = 1 - i / 18; D.circle(g, x, y, 3.5, '#fff'); }
          g.globalAlpha = 1;
        }
        D.line(g, SLING.x + 6, GROUND, SLING.x + 6, SLING.y + 20, '#9a3412', 12); D.line(g, SLING.x + 6, SLING.y + 20, SLING.x + 14, SLING.y - 12, '#9a3412', 9);
        for (let i = 0; i < shots - (state === 'aim' ? 1 : 0); i++) D.orb(g, 40 + i * 30, GROUND + 26, 11, '#ef4444');
        D.text(g, `${gremlinsLeft()} gremlin${gremlinsLeft() === 1 ? '' : 's'} left`, W - 20, 30, { size: 16, align: 'right', color: '#365314' });
      },
    };
  },
});

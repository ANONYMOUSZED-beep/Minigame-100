/* MINIGAME·100 — game engine: registry, session loop, input, FX, HUD bridge. */
(function () {
  'use strict';
  const MG = (window.MG = window.MG || {});
  MG.games = [];
  MG.byId = {};

  // Game definition:
  // { id, name, cat, desc, how:[...], w, h, color, color2, pad:'LRUDAB', score:'high'|'low', fmt:'int'|'time',
  //   unit, music:{..}|false, make(E) -> { update(dt), draw(g), ... } }
  MG.add = function (def) {
    def.w = def.w || 960; def.h = def.h || 600;
    def.color = def.color || '#22d3ee';
    def.color2 = def.color2 || '#e879f9';
    def.score = def.score || 'high';
    def.fmt = def.fmt || 'int';
    def.num = MG.games.length + 1;
    MG.games.push(def);
    MG.byId[def.id] = def;
  };

  MG.fmtScore = function (def, v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (def.fmt === 'time') return U.fmtTime(v, 2);
    if (def.fmt === 'ms') return Math.round(v) + ' ms';
    return U.fmtNum(v) + (def.unit ? ' ' + def.unit : '');
  };

  /* ---------------- persistent storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mg100:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mg100:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  MG.store = store;
  MG.best = (id) => store.get('best:' + id, null);
  MG.isBetter = (def, a, b) => (b === null || b === undefined ? true : def.score === 'low' ? a < b : a > b);

  /* ---------------- input ---------------- */
  const ALIAS = {
    L: ['ArrowLeft', 'KeyA'], R: ['ArrowRight', 'KeyD'], U: ['ArrowUp', 'KeyW'], D: ['ArrowDown', 'KeyS'],
    A: ['Space', 'KeyZ', 'KeyJ'], B: ['KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight'], E: ['Enter', 'NumpadEnter'],
  };
  const Input = {
    keys: new Set(), pressed: new Set(), released: new Set(), typed: [],
    ptr: { x: 0, y: 0, down: false, hit: false, up: false, moved: false, id: null, sx: 0, sy: 0, rhit: false, rdown: false },
    swipe: null, wheel: 0, _sw: null, active: false,
  };
  MG.Input = Input;
  const expand = (k) => ALIAS[k] || [k];
  const anyIn = (set, k) => expand(k).some((c) => set.has(c));

  const BLOCK = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);
  window.addEventListener('keydown', (e) => {
    if (!Input.active) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (BLOCK.has(e.code)) e.preventDefault();
    if (!e.repeat) { Input.keys.add(e.code); Input.pressed.add(e.code); }
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) Input.typed.push(e.key);
    else if (e.key === 'Backspace' || e.key === 'Enter') Input.typed.push(e.key);
    if (e.key === 'Backspace') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { Input.keys.delete(e.code); Input.released.add(e.code); });
  window.addEventListener('blur', () => { Input.keys.clear(); Input.ptr.down = false; });

  // virtual buttons (touch pad) feed the same key set
  MG.vpress = (code, down) => {
    if (down) { if (!Input.keys.has(code)) Input.pressed.add(code); Input.keys.add(code); }
    else { Input.keys.delete(code); Input.released.add(code); }
  };

  MG.bindCanvas = function (canvas, getSession) {
    const toLocal = (e) => {
      const s = getSession(); if (!s) return [0, 0];
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * s.def.w, ((e.clientY - r.top) / r.height) * s.def.h];
    };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      const p = Input.ptr;
      if (p.id !== null && p.id !== e.pointerId && p.down) return; // single primary pointer
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      const [x, y] = toLocal(e);
      p.x = x; p.y = y; p.sx = x; p.sy = y; p.id = e.pointerId; p.type = e.pointerType;
      if (e.button === 2) { p.rhit = true; p.rdown = true; return; }
      p.down = true; p.hit = true;
      Input._sw = { x, y };
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = Input.ptr;
      if (p.id !== null && p.id !== e.pointerId && p.down) return;
      const [x, y] = toLocal(e);
      p.x = x; p.y = y; p.moved = true; p.type = e.pointerType;
      if (p.down && Input._sw) {
        const dx = x - Input._sw.x, dy = y - Input._sw.y, s = getSession();
        const th = s ? Math.min(s.def.w, s.def.h) * 0.045 : 24;
        if (Math.hypot(dx, dy) > th) {
          Input.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
          Input._sw = { x, y };
        }
      }
    });
    const end = (e) => {
      const p = Input.ptr;
      if (p.id !== e.pointerId) return;
      if (e.button === 2 || p.rdown) { p.rdown = false; }
      if (p.down) { p.down = false; p.up = true; }
      Input._sw = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { Input.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  };

  function endFrameInput() {
    Input.pressed.clear(); Input.released.clear(); Input.typed.length = 0;
    const p = Input.ptr; p.hit = false; p.up = false; p.moved = false; p.rhit = false;
    Input.swipe = null; Input.wheel = 0;
  }

  /* ---------------- particles & floating text ---------------- */
  class FX {
    constructor() { this.p = []; this.txt = []; this.rings = []; }
    clear() { this.p.length = 0; this.txt.length = 0; this.rings.length = 0; }
    // burst(x, y, {n, color|colors, speed, spread, angle, life, size, grav, drag, shape, glow})
    burst(x, y, o = {}) {
      const n = o.n || 16;
      for (let i = 0; i < n; i++) {
        const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
        const sp = (o.speed || 220) * (0.25 + Math.random() * 0.85);
        const life = (o.life || 0.7) * (0.6 + Math.random() * 0.6);
        this.p.push({
          x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), life, max: life,
          size: (o.size || 4) * (0.6 + Math.random() * 0.8), color: o.colors ? U.pick(o.colors) : o.color || '#fff',
          grav: o.grav ?? 0, drag: o.drag ?? 2.2, shape: o.shape || 'circle', glow: o.glow ?? true,
          rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, shrink: o.shrink ?? true,
        });
      }
      if (this.p.length > 2400) this.p.splice(0, this.p.length - 2400);
    }
    ring(x, y, o = {}) { this.rings.push({ x, y, r: o.r0 || 4, r1: o.r || 60, life: o.life || 0.45, max: o.life || 0.45, color: o.color || '#fff', lw: o.lw || 4 }); }
    text(x, y, str, o = {}) {
      this.txt.push({ x, y, str: String(str), life: o.life || 0.9, max: o.life || 0.9, color: o.color || '#fff', size: o.size || 22, vy: o.vy ?? -60 });
    }
    update(dt) {
      const P = this.p;
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i];
        q.life -= dt;
        if (q.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
        const d = Math.exp(-q.drag * dt);
        q.vx *= d; q.vy = q.vy * d + q.grav * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      }
      for (let i = this.txt.length - 1; i >= 0; i--) { const t = this.txt[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-2.5 * dt); if (t.life <= 0) this.txt.splice(i, 1); }
      for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.life -= dt; if (r.life <= 0) this.rings.splice(i, 1); }
    }
    draw(g) {
      for (const r of this.rings) {
        const k = 1 - r.life / r.max, rad = r.r + (r.r1 - r.r) * U.ease.outCubic(k);
        g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = r.lw * (1 - k) + 0.5;
        g.beginPath(); g.arc(r.x, r.y, rad, 0, 6.2832); g.stroke();
      }
      g.globalAlpha = 1;
      for (const q of this.p) {
        const k = q.life / q.max, s = q.shrink ? q.size * k : q.size;
        g.globalAlpha = Math.min(1, k * 1.6);
        g.fillStyle = q.color;
        if (q.shape === 'square') { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillRect(-s, -s, s * 2, s * 2); g.restore(); }
        else if (q.shape === 'spark') {
          g.strokeStyle = q.color; g.lineWidth = Math.max(1, s * 0.6); g.lineCap = 'round';
          g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); g.stroke();
        } else { g.beginPath(); g.arc(q.x, q.y, s, 0, 6.2832); g.fill(); }
        if (q.glow && s > 1.2) D.glow(g, q.x, q.y, s * 4, q.color, 0.35 * k);
      }
      g.globalAlpha = 1;
      for (const t of this.txt) {
        const k = t.life / t.max, pop = 1 + 0.35 * U.ease.outBack(Math.min(1, (1 - k) * 6)) - 0.35;
        D.text(g, t.str, t.x, t.y, { size: t.size * pop, color: t.color, alpha: Math.min(1, k * 2.5), stroke: 'rgba(0,0,0,.55)', lw: 4 });
      }
    }
  }
  MG.FX = FX;

  /* ---------------- session: one running game instance ---------------- */
  class Session {
    constructor(def, canvas, hooks = {}) {
      this.def = def; this.canvas = canvas; this.g = canvas.getContext('2d');
      this.hooks = hooks; this.state = 'ready'; this.fx = new FX();
      this.shakeMag = 0; this.flashA = 0; this.flashC = '#fff'; this.freezeT = 0; this.timers = [];
      this.banners = []; this.stats = {}; this._score = 0; this.time = 0; this.headless = !!hooks.headless;
      this.E = this.makeAPI();
      this.game = def.make(this.E) || {};
    }
    makeAPI() {
      const S = this, def = this.def;
      const E = {
        w: def.w, h: def.h, def, t: 0, dt: 0,
        get state() { return S.state; },
        down: (...k) => k.some((x) => anyIn(Input.keys, x)),
        hit: (...k) => k.some((x) => anyIn(Input.pressed, x)),
        up: (...k) => k.some((x) => anyIn(Input.released, x)),
        get typed() { return Input.typed; },
        ptr: Input.ptr,
        get swipe() { return Input.swipe; },
        get wheel() { return Input.wheel; },
        // dir from arrows/WASD: {x,y}
        axis() { return { x: (E.down('R') ? 1 : 0) - (E.down('L') ? 1 : 0), y: (E.down('D') ? 1 : 0) - (E.down('U') ? 1 : 0) }; },
        get score() { return S._score; },
        set score(v) { S._score = v; S.hooks.score && S.hooks.score(v); },
        stat(name, value) { if (S.stats[name] !== value) { S.stats[name] = value; S.hooks.stat && S.hooks.stat(name, value); } },
        over(o = {}) { if (S.state === 'over') return; if (o.score !== undefined) E.score = o.score; S.state = 'over'; S.hooks.over && S.hooks.over(Object.assign({ score: S._score }, o)); },
        get best() { return MG.best(def.id); },
        sfx: (name, p, v) => { if (!S.headless) Sound.play(name, p, v); },
        tone: (o) => { if (!S.headless) Sound.tone(o); },
        noise: (o) => { if (!S.headless) Sound.noise(o); },
        note: (m, d, t, v, dl, echo) => { if (!S.headless) Sound.note(m, d, t, v, dl, echo); },
        burst: (x, y, o) => S.fx.burst(x, y, o),
        ring: (x, y, o) => S.fx.ring(x, y, o),
        pop: (x, y, str, o) => S.fx.text(x, y, str, o),
        fx: S.fx,
        shake: (m) => { S.shakeMag = Math.max(S.shakeMag, m); },
        flash: (c = '#fff', a = 0.5) => { S.flashC = c; S.flashA = Math.max(S.flashA, a); },
        freeze: (sec) => { S.freezeT = Math.max(S.freezeT, sec); },
        after: (sec, fn) => { S.timers.push({ t: sec, fn }); },
        banner: (text, sub, o = {}) => { S.banners.push({ text, sub, life: o.life || 1.6, max: o.life || 1.6, color: o.color || def.color }); },
        data: { get: (k, d) => store.get(def.id + ':' + k, d), set: (k, v) => store.set(def.id + ':' + k, v) },
        vibrate: (ms) => { if (!S.headless && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
      };
      return E;
    }
    start() { this.state = 'play'; this.game.start && this.game.start(); }
    step(dt) {
      if (this.state !== 'play') return;
      this.E.dt = dt;
      if (this.freezeT > 0) { this.freezeT -= dt; return; }
      this.time += dt; this.E.t = this.time;
      for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
      this.game.update && this.game.update(dt);
      this.fx.update(dt);
      for (let i = this.banners.length - 1; i >= 0; i--) { this.banners[i].life -= dt; if (this.banners[i].life <= 0) this.banners.splice(i, 1); }
    }
    render(scale) {
      const g = this.g, def = this.def;
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.save();
      if (this.shakeMag > 0.3) {
        const m = this.shakeMag;
        g.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2);
      }
      g.imageSmoothingEnabled = true;
      this.game.draw && this.game.draw(g);
      if (!this.game.manualFx) this.fx.draw(g);
      g.restore();
      // banners
      for (const b of this.banners) {
        const k = 1 - b.life / b.max;
        const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
        const sc = k < 0.15 ? U.ease.outBack(k / 0.15) : 1;
        g.save(); g.globalAlpha = a; g.translate(def.w / 2, def.h * 0.42); g.scale(sc, sc);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-def.w, -46, def.w * 2, b.sub ? 96 : 76);
        D.text(g, b.text, 0, -6, { size: Math.min(56, def.w / 12), color: '#fff', glow: b.color, blur: 18 });
        if (b.sub) D.text(g, b.sub, 0, 34, { size: 18, font: 'ui', weight: 500, color: 'rgba(255,255,255,.8)' });
        g.restore();
      }
      if (this.flashA > 0.01) { g.globalAlpha = this.flashA; g.fillStyle = this.flashC; g.fillRect(0, 0, def.w, def.h); g.globalAlpha = 1; }
    }
    decay(dt) {
      this.shakeMag *= Math.exp(-dt * 14); if (this.shakeMag < 0.3) this.shakeMag = 0;
      this.flashA *= Math.exp(-dt * 9);
    }
    destroy() { this.game.destroy && this.game.destroy(); this.timers.length = 0; }
  }
  MG.Session = Session;
  MG.endFrameInput = endFrameInput;

  /* ---------------- runner: owns the RAF loop for the visible session ---------------- */
  const Runner = { session: null, raf: 0, last: 0, scale: 1 };
  MG.Runner = Runner;
  Runner.run = function (session) {
    Runner.session = session;
    Runner.last = performance.now();
    cancelAnimationFrame(Runner.raf);
    const frame = (now) => {
      Runner.raf = requestAnimationFrame(frame);
      const s = Runner.session; if (!s) return;
      let dt = (now - Runner.last) / 1000; Runner.last = now;
      if (dt > 0.05) dt = 0.05; // clamp after tab switches
      if (s.state === 'play') s.step(dt);
      s.decay(dt);
      s.render(Runner.scale);
      endFrameInput();
    };
    Runner.raf = requestAnimationFrame(frame);
  };
  Runner.stop = function () { cancelAnimationFrame(Runner.raf); Runner.session = null; };

  // Render a still preview of a game into a canvas (used for thumbnails).
  MG.renderThumb = function (def, canvas) {
    const s = new Session(def, canvas, { headless: true });
    s.state = 'play';
    const warm = def.thumbWarm === undefined ? 0.5 : def.thumbWarm;
    const saved = Math.random;
    let n = Math.round(warm * 60);
    s.game.thumb && s.game.thumb();
    while (n-- > 0 && s.state === 'play') { s.step(1 / 60); s.decay(1 / 60); }
    s.shakeMag = 0; s.flashA = 0; s.banners.length = 0;
    const sc = canvas.width / def.w;
    s.render(sc);
    Math.random = saved;
    s.destroy();
  };
})();

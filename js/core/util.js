/* MINIGAME·100 — shared math + drawing helpers (global U and D) */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  const U = {
    TAU,
    rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    ri: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    chance: (p) => Math.random() < p,
    sign: (v) => (v < 0 ? -1 : v > 0 ? 1 : 0),
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    invLerp: (a, b, v) => (v - a) / (b - a),
    remap: (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c),
    damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    dist2: (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1),
    ang: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    wrap: (v, lo, hi) => { const r = hi - lo; return ((((v - lo) % r) + r) % r) + lo; },
    angDiff: (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
    approach: (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target)),
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    },
    range: (n) => Array.from({ length: n }, (_, i) => i),
    grid: (w, h, fn) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (typeof fn === 'function' ? fn(x, y) : fn))),
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    seeded(seed) {
      let a = seed >>> 0;
      return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    },
    hsl: (h, s = 80, l = 60, a = 1) => `hsla(${h},${s}%,${l}%,${a})`,
    fmtTime(sec, dec = 1) {
      sec = Math.max(0, sec);
      const m = Math.floor(sec / 60), s = sec - m * 60;
      const ss = s.toFixed(dec).padStart(dec ? 3 + dec : 2, '0');
      return m ? `${m}:${ss}` : ss.replace(/^0(?=\d)/, '');
    },
    fmtNum: (n) => Math.round(n).toLocaleString('en-US'),
    // collisions
    rectsHit: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    circRect(cx, cy, r, rx, ry, rw, rh) {
      const nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
      return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
    },
    ptInRect: (px, py, x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h,
    ptInPoly(px, py, pts) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    // closest point on segment + distance
    segDist(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
      let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
      t = U.clamp(t, 0, 1);
      const cx = x1 + t * dx, cy = y1 + t * dy;
      return { d: Math.hypot(px - cx, py - cy), x: cx, y: cy, t };
    },
    segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(d) < 1e-9) return null;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t, u };
      return null;
    },
  };

  U.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce(t) {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };

  /* ---------- colour ---------- */
  const _cc = {};
  function parse(c) {
    if (_cc[c]) return _cc[c];
    let r = 255, g = 255, b = 255, a = 1;
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
      if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
    } else {
      const m = c.match(/[\d.]+/g);
      if (m && c.startsWith('rgb')) { r = +m[0]; g = +m[1]; b = +m[2]; if (m[3] !== undefined) a = +m[3]; }
      else if (m && c.startsWith('hsl')) {
        const h = +m[0] / 360, s = +m[1] / 100, l = +m[2] / 100; if (m[3] !== undefined) a = +m[3];
        const f = (n) => { const k = (n + h * 12) % 12, q = s * Math.min(l, 1 - l); return l - q * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
        r = Math.round(f(0) * 255); g = Math.round(f(8) * 255); b = Math.round(f(4) * 255);
      }
    }
    return (_cc[c] = [r, g, b, a]);
  }
  U.rgb = parse;
  U.rgba = (c, a) => { const p = parse(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  U.shade = (c, amt) => {
    const p = parse(c);
    const f = (v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return `rgb(${f(p[0])},${f(p[1])},${f(p[2])})`;
  };
  U.mix = (c1, c2, t) => {
    const a = parse(c1), b = parse(c2);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  };

  /* ---------- drawing ---------- */
  const FONTS = {
    display: '"Chakra Petch", "Outfit", system-ui, sans-serif',
    ui: '"Outfit", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  };
  const glowCache = new Map();

  const D = {
    FONTS,
    rr(g, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    },
    fillRR(g, x, y, w, h, r, fill) { D.rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); },
    strokeRR(g, x, y, w, h, r, stroke, lw = 2) { D.rr(g, x, y, w, h, r); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); },
    circle(g, x, y, r, fill, stroke, lw = 2) {
      g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
    },
    line(g, x1, y1, x2, y2, color, lw = 2, cap = 'round') {
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
      g.strokeStyle = color; g.lineWidth = lw; g.lineCap = cap; g.stroke();
    },
    poly(g, pts, fill, stroke, lw = 2) {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
    },
    star(g, x, y, r1, r2, n, rot, fill, stroke) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      D.poly(g, pts, fill, stroke);
    },
    font(size, kind = 'display', weight = 700) { return `${weight} ${size}px ${FONTS[kind] || kind}`; },
    text(g, str, x, y, o = {}) {
      const size = o.size || 20;
      g.save();
      g.font = D.font(size, o.font || 'display', o.weight || 700);
      g.textAlign = o.align || 'center';
      g.textBaseline = o.base || 'middle';
      if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
      if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || size * 0.6; }
      if (o.shadow) { g.fillStyle = o.shadow; g.fillText(str, x + (o.sx || 0), y + (o.sy || Math.max(2, size * 0.08))); }
      if (o.stroke) { g.lineWidth = o.lw || Math.max(2, size * 0.12); g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(str, x, y); }
      g.fillStyle = o.color || '#fff';
      g.fillText(str, x, y);
      g.restore();
    },
    // pre-rendered radial glow sprite — fast additive glows without shadowBlur
    glowSprite(color) {
      let c = glowCache.get(color);
      if (c) return c;
      c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, U.rgba(color, 1)); gr.addColorStop(0.25, U.rgba(color, 0.55)); gr.addColorStop(0.6, U.rgba(color, 0.14)); gr.addColorStop(1, U.rgba(color, 0));
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      glowCache.set(color, c);
      return c;
    },
    glow(g, x, y, r, color, alpha = 1) {
      const s = D.glowSprite(color);
      const op = g.globalCompositeOperation, ga = g.globalAlpha;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * alpha;
      g.drawImage(s, x - r, y - r, r * 2, r * 2);
      g.globalCompositeOperation = op; g.globalAlpha = ga;
    },
    bg(g, w, h, top, bottom) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, top); gr.addColorStop(1, bottom || top);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    },
    radialBg(g, w, h, inner, outer, cx = w / 2, cy = h / 2) {
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) * 0.6);
      gr.addColorStop(0, inner); gr.addColorStop(1, outer);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    },
    vignette(g, w, h, strength = 0.55, color = '0,0,0') {
      const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
      gr.addColorStop(0, `rgba(${color},0)`); gr.addColorStop(1, `rgba(${color},${strength})`);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    },
    grid(g, w, h, step, color, ox = 0, oy = 0, lw = 1) {
      g.beginPath();
      for (let x = ((ox % step) + step) % step; x <= w; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); }
      for (let y = ((oy % step) + step) % step; y <= h; y += step) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); }
      g.strokeStyle = color; g.lineWidth = lw; g.stroke();
    },
    // a starfield generated once and scrolled
    makeStars(n, w, h, seed = 7) {
      const r = U.seeded(seed);
      return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, z: 0.2 + r() * 0.8, tw: r() * TAU }));
    },
    stars(g, stars, w, h, t = 0, dx = 0, dy = 0, color = '#fff') {
      g.fillStyle = color;
      for (const s of stars) {
        const x = U.wrap(s.x + dx * s.z, 0, w), y = U.wrap(s.y + dy * s.z, 0, h);
        g.globalAlpha = (0.35 + 0.65 * s.z) * (0.75 + 0.25 * Math.sin(t * 3 + s.tw));
        const sz = s.z * 2;
        g.fillRect(x, y, sz, sz);
      }
      g.globalAlpha = 1;
    },
    // soft drop shadow ellipse
    shadow(g, x, y, rx, ry, a = 0.35) {
      g.save(); g.globalAlpha *= a; g.fillStyle = '#000';
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.restore();
    },
    // glossy orb
    orb(g, x, y, r, color, hi = 0.5) {
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      gr.addColorStop(0, U.shade(color, hi)); gr.addColorStop(0.55, color); gr.addColorStop(1, U.shade(color, -0.45));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    },
    // bevelled tile
    tile(g, x, y, w, h, r, color, depth = 4) {
      D.fillRR(g, x, y + depth, w, h - depth, r, U.shade(color, -0.4));
      const gr = g.createLinearGradient(0, y, 0, y + h - depth);
      gr.addColorStop(0, U.shade(color, 0.18)); gr.addColorStop(1, color);
      D.fillRR(g, x, y, w, h - depth, r, gr);
    },
    heart(g, x, y, s, fill) {
      g.beginPath();
      g.moveTo(x, y + s * 0.35);
      g.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.4);
      g.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
      g.fillStyle = fill; g.fill();
    },
  };

  window.U = U;
  window.D = D;
})();

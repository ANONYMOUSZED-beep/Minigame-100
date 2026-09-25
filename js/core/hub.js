/* MINIGAME·100 — hub (library grid) + player shell */
(function () {
  'use strict';
  const MG = window.MG;
  const $ = (s) => document.querySelector(s);
  const store = MG.store;

  const CATS = [
    ['Arcade', '#22d3ee'], ['Action', '#f43f5e'], ['Runner', '#fb923c'], ['Sports', '#4ade80'],
    ['Physics', '#a3e635'], ['Brain', '#f472b6'], ['Rhythm', '#e879f9'], ['Puzzle', '#a855f7'],
    ['Board', '#fbbf24'], ['Strategy', '#60a5fa'],
  ];
  const CAT_COLOR = Object.fromEntries(CATS);
  MG.CAT_COLOR = CAT_COLOR;

  const ICON = {
    sfxOn: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    sfxOff: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
    musOn: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    musOff: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
  };

  const H = { cat: 'All', q: '', favOnly: false, sort: store.get('sort', 'num'), session: null, def: null, cards: new Map() };
  MG.hub = H;

  /* ---------------- stats helpers ---------------- */
  const favs = () => new Set(store.get('favs', []));
  function toggleFav(id) {
    const f = favs(); f.has(id) ? f.delete(id) : f.add(id);
    store.set('favs', [...f]);
    return f.has(id);
  }
  function plays(id) { return store.get('plays:' + id, 0); }
  function recent() { return store.get('recent', []); }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800);
  }

  function syncAudioButtons() {
    for (const id of ['#hub-sfx', '#p-sfx']) { const b = $(id); b.innerHTML = Sound.sfxOn ? ICON.sfxOn : ICON.sfxOff; b.classList.toggle('off', !Sound.sfxOn); }
    for (const id of ['#hub-music', '#p-music']) { const b = $(id); b.innerHTML = Sound.musicOn ? ICON.musOn : ICON.musOff; b.classList.toggle('off', !Sound.musicOn); }
  }
  function toggleSfx() { Sound.init(); Sound.setSfx(!Sound.sfxOn); syncAudioButtons(); toast(Sound.sfxOn ? 'Sound on' : 'Sound muted'); }
  function toggleMusic() {
    Sound.init(); Sound.setMusic(!Sound.musicOn); syncAudioButtons();
    if (Sound.musicOn && H.session && H.session.state === 'play') startMusic(H.def); else if (!Sound.musicOn) Sound.music.stop();
    toast(Sound.musicOn ? 'Music on' : 'Music off');
  }
  function startMusic(def) {
    if (!Sound.musicOn || def.music === false) return;
    Sound.music.start(U.hash(def.id) ^ 0x5bd1e995, def.music || {});
  }

  /* ---------------- hub ---------------- */
  function renderStats() {
    const played = MG.games.filter((g) => plays(g.id) > 0).length;
    const recs = MG.games.filter((g) => MG.best(g.id) !== null).length;
    const secs = MG.games.reduce((a, g) => a + store.get('time:' + g.id, 0), 0);
    const f = favs().size;
    const tStr = secs < 3600 ? Math.round(secs / 60) + 'm' : (secs / 3600).toFixed(1) + 'h';
    $('#hero-stats').innerHTML = `
      <div class="stat"><b>${played}<small style="font-size:.5em;color:var(--mut)"> / ${MG.games.length}</small></b><span>Games discovered</span><div class="meter"><i style="width:${(played / MG.games.length) * 100}%"></i></div></div>
      <div class="stat"><b>${recs}</b><span>Personal records</span></div>
      <div class="stat"><b>${tStr}</b><span>Time played</span></div>
      <div class="stat"><b>${f}</b><span>Favorites</span></div>`;
    const r = recent()[0];
    const btn = $('#btn-continue');
    if (r && MG.byId[r]) { btn.hidden = false; btn.innerHTML = `${ICON.play.replace('<path', '<path fill="currentColor" stroke="none"')}Continue: ${MG.byId[r].name}`; btn.onclick = () => go(r); }
    else btn.hidden = true;
  }

  function buildChips() {
    const counts = {}; MG.games.forEach((g) => (counts[g.cat] = (counts[g.cat] || 0) + 1));
    const el = $('#chips');
    const mk = (name, color, n) => `<button class="chip${H.cat === name ? ' on' : ''}" data-cat="${name}">${color ? `<span class="dot" style="background:${color}"></span>` : ''}${name}<small>${n}</small></button>`;
    el.innerHTML = mk('All', null, MG.games.length) + CATS.filter(([c]) => counts[c]).map(([c, col]) => mk(c, col, counts[c])).join('');
    el.onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      H.cat = b.dataset.cat; el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
      Sound.play('click'); filterGrid();
    };
  }

  function card(def) {
    const el = document.createElement('div');
    el.className = 'card-g'; el.tabIndex = 0; el.setAttribute('role', 'button');
    el.dataset.id = def.id;
    el.style.setProperty('--gc', def.color);
    el.setAttribute('aria-label', `${def.name} — ${def.cat}`);
    const tw = 360, th = Math.round((tw * def.h) / def.w);
    el.innerHTML = `
      <div class="thumb"><canvas width="${tw}" height="${th}"></canvas>
        <span class="num">#${String(def.num).padStart(3, '0')}</span>
        <button class="fav" aria-label="Favorite">${ICON.star}</button>
        <span class="play-pill">${ICON.play}PLAY</span>
      </div>
      <div class="meta"><h3></h3><p></p>
        <div class="row2"><span class="tag"><i></i>${def.cat}</span><span class="bst"></span></div>
      </div>`;
    el.querySelector('h3').textContent = def.name;
    el.querySelector('p').textContent = def.desc;
    el.style.animationDelay = Math.min(def.num * 12, 600) + 'ms';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.fav')) {
        e.stopPropagation();
        const on = toggleFav(def.id); e.target.closest('.fav').classList.toggle('on', on);
        Sound.play(on ? 'coin' : 'click'); toast(on ? `★ ${def.name} added to favorites` : 'Removed from favorites');
        renderStats(); if (H.favOnly) filterGrid();
        return;
      }
      go(def.id);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(def.id); } });
    el.addEventListener('mouseenter', () => Sound.play('tick', 1.5, 0.35));
    H.cards.set(def.id, el);
    updateCard(def);
    return el;
  }
  function updateCard(def) {
    const el = H.cards.get(def.id); if (!el) return;
    const b = MG.best(def.id), bs = el.querySelector('.bst');
    bs.textContent = b === null ? 'New' : '★ ' + MG.fmtScore(def, b);
    bs.classList.toggle('has', b !== null);
    el.querySelector('.fav').classList.toggle('on', favs().has(def.id));
  }

  function buildGrid() {
    const grid = $('#grid'); grid.innerHTML = '';
    MG.games.forEach((d) => grid.appendChild(card(d)));
    // lazy thumbnails
    const queue = [];
    let busy = false;
    const pump = () => {
      if (busy) return; busy = true;
      const next = () => {
        const job = queue.shift();
        if (!job) { busy = false; return; }
        try { MG.renderThumb(job.def, job.canvas); job.canvas.classList.add('ready'); }
        catch (err) { console.warn('thumb failed', job.def.id, err); job.canvas.classList.add('ready'); }
        (window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 60 }) : (f) => setTimeout(f, 8))(next);
      };
      next();
    };
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const def = MG.byId[en.target.dataset.id];
        queue.push({ def, canvas: en.target.querySelector('canvas') });
      });
      pump();
    }, { rootMargin: '300px' });
    H.cards.forEach((el) => io.observe(el));
    filterGrid();
  }

  function filterGrid() {
    const q = H.q.trim().toLowerCase(), f = favs();
    let list = MG.games.filter((g) => (H.cat === 'All' || g.cat === H.cat) && (!H.favOnly || f.has(g.id)) &&
      (!q || (g.name + ' ' + g.desc + ' ' + g.cat + ' ' + (g.tags || '') + ' ' + g.num).toLowerCase().includes(q)));
    if (H.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (H.sort === 'recent') { const r = recent(); const idx = (id) => { const i = r.indexOf(id); return i < 0 ? 1e9 : i; }; list.sort((a, b) => idx(a.id) - idx(b.id) || a.num - b.num); }
    else if (H.sort === 'plays') list.sort((a, b) => plays(b.id) - plays(a.id) || a.num - b.num);
    const grid = $('#grid'), set = new Set(list.map((g) => g.id));
    H.cards.forEach((el, id) => { el.hidden = !set.has(id); });
    list.forEach((g) => grid.appendChild(H.cards.get(g.id)));
    $('#empty').hidden = list.length > 0;
    H.visible = list;
  }

  /* ---------------- player ---------------- */
  const canvas = $('#screen');
  MG.bindCanvas(canvas, () => H.session);

  function go(id) { location.hash = '#/play/' + id; }

  function open(id) {
    const def = MG.byId[id]; if (!def) { location.hash = '#/'; return; }
    close(true);
    H.def = def;
    document.documentElement.style.setProperty('--acc', def.color);
    document.documentElement.style.setProperty('--acc2', def.color2);
    $('#hub').hidden = true; $('#play').hidden = false;
    document.title = `${def.name} · MINIGAME·100`;
    $('#p-num').textContent = '#' + String(def.num).padStart(3, '0');
    $('#p-name').textContent = def.name;
    $('#p-cat').textContent = def.cat;
    buildPad(def);
    MG.Input.active = true;
    newSession();
    showTitle();
    resize();
    window.scrollTo(0, 0);
  }

  function newSession() {
    if (H.session) H.session.destroy();
    const def = H.def;
    $('#hud').innerHTML = '';
    H.hud = {};
    hudSet('score', def.scoreLabel || 'Score', 0);
    const b = MG.best(def.id);
    hudSet('best', 'Best', b === null ? '—' : MG.fmtScore(def, b));
    let s;
    try {
      s = new MG.Session(def, canvas, {
        score: (v) => hudSet('score', def.scoreLabel || 'Score', def.fmt === 'time' ? U.fmtTime(v, 1) : U.fmtNum(v), true),
        stat: (k, v) => hudSet('s:' + k, k, v, true),
        over: (res) => setTimeout(() => gameOver(res), res.delay === undefined ? 700 : res.delay * 1000),
      });
    } catch (err) {
      console.error(err); toast('This game failed to load: ' + err.message); throw err;
    }
    H.session = s;
    H.playStart = 0;
    MG.Runner.run(s);
    if (def.hideScore) $('#hud').querySelector('[data-k="score"]').hidden = true;
  }

  function hudSet(key, label, val, bump) {
    let el = H.hud[key];
    if (!el) {
      el = document.createElement('div'); el.className = 'h'; el.dataset.k = key;
      el.innerHTML = '<span></span><b></b>'; el.firstChild.textContent = label;
      $('#hud').appendChild(el); H.hud[key] = el;
    }
    const b = el.lastChild, s = String(val);
    if (b.textContent !== s) {
      b.textContent = s;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }
  }

  function howList(el, def) {
    el.innerHTML = '';
    (def.how || []).forEach((line) => { const li = document.createElement('li'); li.innerHTML = line; el.appendChild(li); });
  }

  function showTitle() {
    const def = H.def;
    hideOverlays();
    $('#t-num').textContent = '#' + String(def.num).padStart(3, '0');
    $('#t-cat').textContent = def.cat;
    $('#t-name').textContent = def.name;
    $('#t-desc').textContent = def.desc;
    howList($('#t-how'), def);
    const b = MG.best(def.id);
    $('#t-best').innerHTML = b === null ? 'No record yet — set the first one.' : `Personal best <b>${MG.fmtScore(def, b)}</b> · played ${plays(def.id)}×`;
    $('#ov-title').hidden = false;
    setTimeout(() => $('#t-play').focus({ preventScroll: true }), 50);
  }
  function hideOverlays() { ['#ov-title', '#ov-pause', '#ov-over'].forEach((s) => ($(s).hidden = true)); }

  function startPlay() {
    Sound.init();
    const s = H.session; if (!s || s.state !== 'ready') return;
    hideOverlays();
    Sound.play('select');
    s.start();
    H.playStart = performance.now();
    store.set('plays:' + H.def.id, plays(H.def.id) + 1);
    const r = recent().filter((x) => x !== H.def.id); r.unshift(H.def.id); store.set('recent', r.slice(0, 30));
    startMusic(H.def);
    canvas.focus && canvas.focus();
  }
  function logTime() {
    if (H.playStart && H.def) {
      const sec = (performance.now() - H.playStart) / 1000;
      store.set('time:' + H.def.id, store.get('time:' + H.def.id, 0) + Math.min(sec, 3600));
      H.playStart = 0;
    }
  }
  function pause() {
    const s = H.session; if (!s || s.state !== 'play') return;
    s.state = 'paused'; Sound.music.stop(); logTime();
    howList($('#pa-how'), H.def);
    $('#ov-pause').hidden = false;
    setTimeout(() => $('#pa-resume').focus({ preventScroll: true }), 30);
  }
  function resume() {
    const s = H.session; if (!s || s.state !== 'paused') return;
    hideOverlays(); s.state = 'play'; H.playStart = performance.now(); MG.Runner.last = performance.now();
    startMusic(H.def);
  }
  function restart() {
    logTime(); Sound.music.stop();
    newSession(); hideOverlays();
    H.session.state = 'ready';
    startPlay();
  }
  function gameOver(res) {
    const s = H.session, def = H.def; if (!s || s.state !== 'over' || !def) return;
    logTime(); Sound.music.stop();
    const score = res.score;
    const prev = MG.best(def.id);
    const valid = score !== null && score !== undefined && !Number.isNaN(score) && res.record !== false && !(def.score === 'low' && res.win === false);
    const isRec = valid && MG.isBetter(def, score, prev);
    if (isRec) store.set('best:' + def.id, score);
    $('#o-title').textContent = res.title || (res.win ? 'Victory!' : 'Game Over');
    $('#o-msg').textContent = res.msg || '';
    $('#o-msg').hidden = !res.msg;
    $('#o-record').hidden = !(isRec && prev !== null);
    const best = MG.best(def.id);
    $('#o-best').innerHTML = best === null ? '' : isRec ? (prev === null ? 'First record set!' : `Previous best ${MG.fmtScore(def, prev)}`) : `Best <b>${MG.fmtScore(def, best)}</b>`;
    hudSet('best', 'Best', best === null ? '—' : MG.fmtScore(def, best));
    // count-up
    const el = $('#o-score');
    const target = Number(score) || 0, t0 = performance.now(), dur = 900;
    const fmt = (v) => (score === null || score === undefined ? '—' : MG.fmtScore(def, v));
    if (def.fmt === 'int' && Math.abs(target) > 1) {
      const tick = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = fmt(Math.round(target * U.ease.outCubic(k))); if (k < 1 && !$('#ov-over').hidden) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    } else el.textContent = fmt(target);
    $('#ov-over').hidden = false;
    if (isRec && prev !== null) setTimeout(() => Sound.play('tada'), 300);
    updateCard(def);
    setTimeout(() => $('#o-retry').focus({ preventScroll: true }), 50);
  }
  function nextGame() {
    const list = H.visible && H.visible.length ? H.visible : MG.games;
    let i = list.findIndex((g) => g.id === H.def.id);
    const nx = list[(i + 1) % list.length] || MG.games[(H.def.num) % MG.games.length];
    go(nx.id);
  }

  function close(keepView) {
    logTime(); Sound.music.stop();
    if (H.session) { H.session.destroy(); H.session = null; }
    MG.Runner.stop();
    MG.Input.active = false; MG.Input.keys.clear();
    if (!keepView) {
      $('#play').hidden = true; $('#hub').hidden = false;
      document.title = 'MINIGAME·100 — a hundred handcrafted browser games';
      document.documentElement.style.setProperty('--acc', '#22d3ee');
      document.documentElement.style.setProperty('--acc2', '#a855f7');
      if (H.def) updateCard(H.def);
      renderStats(); filterGrid();
      const el = H.def && H.cards.get(H.def.id);
      if (el) setTimeout(() => { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }, 30);
      H.def = null;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }

  function resize() {
    if (!H.def) return;
    const def = H.def, stage = $('#stage');
    const cs = getComputedStyle(stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    let aw = stage.clientWidth - padX, ah = stage.clientHeight - padY;
    const padEl = $('#pad');
    if (!padEl.hidden) {
      const portrait = window.innerHeight > window.innerWidth;
      if (portrait) ah -= Math.min(200, ah * 0.3);
    }
    const ar = def.w / def.h;
    let w = Math.min(aw, ah * ar), h = w / ar;
    w = Math.floor(w); h = Math.floor(h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    MG.Runner.scale = canvas.width / def.w;
    const fr = $('#frame'); fr.style.width = w + 'px'; fr.style.height = h + 'px';
    if (!padEl.hidden && window.innerHeight > window.innerWidth) stage.style.alignItems = 'start'; else stage.style.alignItems = '';
  }
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 50));

  /* ---------------- touch pad ---------------- */
  const PADMAP = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown', A: 'Space', B: 'KeyX' };
  function buildPad(def) {
    const el = $('#pad');
    const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (!def.pad || !touch) { el.hidden = true; el.innerHTML = ''; return; }
    const p = def.pad, labels = def.padLabels || {};
    let left = '';
    const hasUD = p.includes('U') || p.includes('D');
    if (hasUD) {
      const cell = (k, sym) => (p.includes(k) ? `<button data-k="${k}">${sym}</button>` : '<span></span>');
      left = `<div class="cluster dpad"><span></span>${cell('U', '▲')}<span></span>${cell('L', '◀')}<span></span>${cell('R', '▶')}<span></span>${cell('D', '▼')}<span></span></div>`;
    } else if (p.includes('L')) left = `<div class="cluster lr"><button data-k="L">◀</button><button data-k="R">▶</button></div>`;
    else left = '<span></span>';
    let right = '<div class="cluster ab">';
    if (p.includes('B')) right += `<button class="b2" data-k="B">${labels.B || 'B'}</button>`;
    if (p.includes('A')) right += `<button data-k="A">${labels.A || 'A'}</button>`;
    right += '</div>';
    el.innerHTML = left + right; el.hidden = false;
    el.querySelectorAll('button').forEach((b) => {
      const code = PADMAP[b.dataset.k];
      const on = (e) => { e.preventDefault(); b.classList.add('on'); MG.vpress(code, true); Sound.init(); };
      const off = (e) => { e.preventDefault(); b.classList.remove('on'); MG.vpress(code, false); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
  }

  /* ---------------- routing & keys ---------------- */
  function route() {
    const m = location.hash.match(/^#\/play\/([\w-]+)/);
    if (m) open(m[1]);
    else { if (H.def) close(); }
  }

  function bind() {
    window.addEventListener('hashchange', route);
    $('#q').addEventListener('input', (e) => { H.q = e.target.value; filterGrid(); });
    $('#sort').value = H.sort;
    $('#sort').addEventListener('change', (e) => { H.sort = e.target.value; store.set('sort', H.sort); filterGrid(); });
    $('#fav-only').addEventListener('click', (e) => {
      H.favOnly = !H.favOnly; e.currentTarget.setAttribute('aria-pressed', H.favOnly); filterGrid();
      if (H.favOnly && !favs().size) toast('Tap ★ on any game to favorite it');
    });
    $('#btn-random').addEventListener('click', () => {
      const pool = MG.games.filter((g) => plays(g.id) === 0);
      go(U.pick(pool.length ? pool : MG.games).id);
    });
    $('#hub-sfx').onclick = $('#p-sfx').onclick = toggleSfx;
    $('#hub-music').onclick = $('#p-music').onclick = toggleMusic;
    $('#p-back').onclick = () => (location.hash = '#/');
    $('#p-restart').onclick = restart;
    $('#p-pause').onclick = () => (H.session && H.session.state === 'paused' ? resume() : pause());
    $('#p-fs').onclick = toggleFs;
    $('#t-play').onclick = startPlay;
    $('#pa-resume').onclick = resume;
    $('#pa-restart').onclick = restart;
    $('#pa-quit').onclick = () => (location.hash = '#/');
    $('#o-retry').onclick = restart;
    $('#o-next').onclick = nextGame;
    $('#o-menu').onclick = () => (location.hash = '#/');
    // clicking the dimmed title backdrop also starts
    $('#ov-title').addEventListener('pointerdown', (e) => { if (e.target.id === 'ov-title') startPlay(); });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
      if (!H.def) {
        if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
        if (e.key === 'Escape' && document.activeElement === $('#q')) { $('#q').blur(); }
        return;
      }
      const s = H.session; if (!s) return;
      const k = e.key.toLowerCase();
      if (s.state === 'ready') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startPlay(); }
        else if (e.key === 'Escape') location.hash = '#/';
      } else if (s.state === 'play') {
        if (e.key === 'Escape' || (k === 'p' && !H.def.typing)) { e.preventDefault(); pause(); }
      } else if (s.state === 'paused') {
        if (e.key === 'Escape' || k === 'p') { e.preventDefault(); resume(); }
        else if (k === 'r') restart();
        else if (k === 'q') location.hash = '#/';
      } else if (s.state === 'over' && !$('#ov-over').hidden) {
        if (e.key === 'Enter' || k === 'r') { e.preventDefault(); restart(); }
        else if (k === 'n') nextGame();
        else if (e.key === 'Escape') location.hash = '#/';
      }
      if (!H.def.typing || s.state !== 'play') {
        if (k === 'm' && !e.repeat) toggleSfx();
        if (k === 'f' && !e.repeat && !H.def.noFsKey) toggleFs();
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  }
  function toggleFs() {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => toast('Fullscreen not available'));
    else document.exitFullscreen();
  }

  H.init = function () {
    syncAudioButtons();
    buildChips();
    renderStats();
    const start = () => buildGrid();
    const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
    fontsReady.then(start);
    bind();
    route();
  };
  H.open = open; H.close = close; H.start = startPlay; H.restart = restart; H.pause = pause;
})();

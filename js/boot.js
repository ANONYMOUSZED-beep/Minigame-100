/* MINIGAME·100 — boot: stream in every game cartridge, then start the hub. */
(function () {
  'use strict';
  const list = window.MG.manifest || [];
  const fill = document.getElementById('ld-fill'), txt = document.getElementById('ld-txt');
  let done = 0, failed = [];
  const finish = () => {
    // keep manifest order even if scripts registered in a different order
    const order = new Map(list.map((id, i) => [id, i]));
    MG.games.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    MG.games.forEach((g, i) => (g.num = i + 1));
    if (failed.length) console.warn('Failed to load:', failed);
    txt.textContent = `${MG.games.length} games ready`;
    MG.hub.init();
    setTimeout(() => document.getElementById('loader').classList.add('done'), 250);
  };
  if (!list.length) return finish();
  list.forEach((id) => {
    const s = document.createElement('script');
    s.src = `js/games/${id}.js`;
    s.async = false;
    s.onload = s.onerror = (e) => {
      if (e.type === 'error') failed.push(id);
      done++;
      fill.style.width = (done / list.length) * 100 + '%';
      txt.textContent = `Loading cartridge ${String(done).padStart(3, '0')} / ${list.length}`;
      if (done === list.length) finish();
    };
    document.body.appendChild(s);
  });
})();

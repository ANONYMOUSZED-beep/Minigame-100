MG.add({
  id: 'pianotiles', name: 'Piano Tiles', cat: 'Rhythm', color: '#f8fafc', color2: '#f43f5e', w: 540, h: 860, music: false,
  desc: 'Tap only the black tiles and you play the classics — Beethoven, Bach, Pachelbel. It never stops speeding up.',
  how: ['Tap the lowest black tile, in order', 'Keys: <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> for the four columns', 'Every tile plays the next note of the melody', 'Touch a white tile or let a black one slip by and it\'s over'],
  pad: false, scoreLabel: 'Tiles',
  make(E) {
    const W = 540, H = 860, COLS = 4, CW = W / COLS, RH = H / 4;
    const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midi = (s) => { const m = s.match(/^([A-G])(#|b)?(\d)$/); return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
    const SONGS = [
      ['Ode to Joy', 'Beethoven', 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4 D4 D4 E4 C4 D4 E4 F4 E4 C4 D4 E4 F4 E4 D4 C4 D4 G3 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4'],
      ['Für Elise', 'Beethoven', 'E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 G#4 B4 C5 E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 C5 B4 A4'],
      ['Canon in D', 'Pachelbel', 'F#5 E5 D5 C#5 B4 A4 B4 C#5 D5 C#5 B4 A4 G4 F#4 G4 E4 D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4 F#4 D4 E4 C#5 D5 F#5 A5 A4 B4 G4 A4 F#4 D4 D5 D5 C#5'],
      ['Mountain King', 'Grieg', 'A3 B3 C4 D4 E4 C4 E4 D#4 B3 D#4 D4 A#3 D4 A3 B3 C4 D4 E4 C4 E4 A4 G4 E4 C4 E4 G4 E4 F4 G4 A4 B4 G4 B4 A#4 F#4 A#4 A4 F4 A4 E4 F4 G4 A4 B4 G4 B4 C5 B4 A4 B4 C5'],
      ['Minuet in G', 'Petzold', 'D5 G4 A4 B4 C5 D5 G4 G4 E5 C5 D5 E5 F#5 G5 G4 G4 C5 D5 C5 B4 A4 B4 C5 B4 A4 G4 F#4 G4 A4 B4 G4 A4'],
      ['Twinkle Twinkle', 'Traditional', 'C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4 G4 G4 F4 F4 E4 E4 D4 G4 G4 F4 F4 E4 E4 D4 C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'],
      ['Jingle Bells', 'Pierpont', 'E4 E4 E4 E4 E4 E4 E4 G4 C4 D4 E4 F4 F4 F4 F4 F4 E4 E4 E4 E4 D4 D4 E4 D4 G4 E4 E4 E4 E4 E4 E4 E4 G4 C4 D4 E4 F4 F4 F4 F4 F4 E4 E4 E4 G4 G4 F4 D4 C4'],
    ].map(([name, by, s]) => ({ name, by, notes: s.split(' ').map(midi) }));
    let songI = U.ri(0, SONGS.length - 1), noteI = 0, rows = [], pos = 0, speed = 3.1, started = false, dead = false, deadCell = null, back = 0, T = 0, flashT = 0;
    let lastCol = -1;
    function addRow() {
      let c; do c = U.ri(0, 3); while (c === lastCol && Math.random() < 0.6);
      lastCol = c;
      const song = SONGS[songI], m = song.notes[noteI];
      const row = { col: c, done: 0, m, newSong: noteI === 0 ? song : null };
      noteI++; if (noteI >= song.notes.length) { noteI = 0; songI = (songI + 1) % SONGS.length; }
      rows.push(row);
    }
    const firstSong = SONGS[songI];
    for (let i = 0; i < 8; i++) addRow();
    rows[0].start = true;
    const target = () => rows.findIndex((r) => !r.done);
    function piano(m) {
      const f = MG.Song.mtof(m);
      E.tone({ f, dur: 1.1, type: 'triangle', vol: 0.26, a: 0.003 });
      E.tone({ f: f * 2, dur: 0.45, type: 'sine', vol: 0.07, a: 0.003 });
      E.tone({ f: f / 2, dur: 0.9, type: 'sine', vol: 0.09, a: 0.004 });
    }
    function rowY(i) { return H - (i - pos) * RH - RH; } // top of row i
    function hit(i) {
      const r = rows[i]; r.done = 1; piano(r.m);
      E.score += 1; E.stat('Speed', `${(speed / 3.1).toFixed(2)}×`);
      if (!started) started = true;
      E.burst(r.col * CW + CW / 2, rowY(i) + RH / 2, { n: 8, colors: ['#94a3b8', '#e2e8f0'], speed: 160, size: 3 });
      if (r.newSong && i > 0) E.banner(r.newSong.name, r.newSong.by, { color: '#f43f5e', life: 1.4 });
      if (E.score % 50 === 0) E.pop(W / 2, H * 0.35, `${E.score}!`, { color: '#f43f5e', size: 40 });
      speed = Math.min(9.5, speed + 0.035);
    }
    function die(cell, missed) {
      if (dead) return;
      dead = true; deadCell = cell; flashT = 0;
      E.sfx('error'); E.tone({ f: 110, dur: 0.6, type: 'sawtooth', vol: 0.18, lp: 900 }); E.shake(8); E.vibrate(200);
      if (missed) back = Math.max(0, (pos - (cell.row - 0.3))); // scroll the missed tile back into view
      E.after(1.5, () => E.over({ msg: `${E.score} tiles · top speed ${(speed / 3.1).toFixed(2)}×` }));
    }
    return {
      update(dt) {
        T += dt; flashT += dt;
        if (dead) { if (back > 0) { const d = Math.min(back, dt * 8); pos -= d; back -= d; } return; }
        if (started) pos += speed * dt;
        while (rows.length < pos + 8) addRow();
        for (const r of rows) if (r.done) r.done = Math.min(2, r.done + dt * 4);
        const ti = target();
        // missed?
        if (started && ti >= 0 && rowY(ti) > H) { die({ row: ti, col: rows[ti].col, missed: true }, true); return; }
        // input
        let col = -1, py = null;
        ['KeyD', 'KeyF', 'KeyJ', 'KeyK'].forEach((k, c) => { if (E.hit(k)) col = c; });
        if (col < 0 && E.hit('ArrowLeft')) col = 0; if (col < 0 && E.hit('ArrowDown')) col = 1; if (col < 0 && E.hit('ArrowUp')) col = 2; if (col < 0 && E.hit('ArrowRight')) col = 3;
        if (E.ptr.hit) { col = U.clamp(Math.floor(E.ptr.x / CW), 0, 3); py = E.ptr.y; }
        if (col >= 0 && ti >= 0) {
          const r = rows[ti], y0 = rowY(ti);
          if (py === null) { if (col === r.col) hit(ti); else die({ row: ti, col }, false); }
          else {
            if (col === r.col && py >= y0 - RH * 0.35 && py <= y0 + RH + 20) hit(ti);
            else {
              // which row was tapped?
              const ri = Math.floor(pos + (H - py) / RH);
              const other = rows[ri];
              if (other && other.col === col && !other.done) { /* tapped a later black tile early: ignore */ }
              else if (ri >= ti) die({ row: ri, col }, false);
            }
          }
        }
      },
      draw(g) {
        g.fillStyle = '#f8fafc'; g.fillRect(0, 0, W, H);
        // subtle stage light gradient
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgba(244,63,94,.05)'); bg.addColorStop(1, 'rgba(59,130,246,.05)'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (let c = 1; c < COLS; c++) D.line(g, c * CW, 0, c * CW, H, 'rgba(15,23,42,.1)', 1.5);
        const first = Math.max(0, Math.floor(pos) - 1);
        for (let i = first; i < rows.length && i < pos + 5; i++) {
          const r = rows[i], y = rowY(i), x = r.col * CW;
          D.line(g, 0, y + RH, W, y + RH, 'rgba(15,23,42,.06)', 1);
          if (r.done) {
            const k = Math.min(1, (r.done - 1) * 1);
            g.fillStyle = `rgba(148,163,184,${0.55 - k * 0.3})`; g.fillRect(x + 1, y + 1, CW - 2, RH - 2);
            continue;
          }
          const gr = g.createLinearGradient(0, y, 0, y + RH); gr.addColorStop(0, '#1e293b'); gr.addColorStop(0.85, '#020617'); gr.addColorStop(1, '#0f172a');
          g.fillStyle = gr; g.fillRect(x + 1, y + 1, CW - 2, RH - 2);
          g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 6, y + 6, CW - 12, 10);
          if (dead && deadCell && deadCell.missed && deadCell.row === i && Math.sin(flashT * 18) > 0) { g.fillStyle = 'rgba(239,68,68,.6)'; g.fillRect(x + 1, y + 1, CW - 2, RH - 2); }
          if (r.start) D.text(g, 'START', x + CW / 2, y + RH / 2, { size: 22, color: '#fff' });
          if (r.newSong && i > 0) D.text(g, '♪', x + CW / 2, y + RH / 2, { size: 30, color: 'rgba(244,63,94,.8)' });
        }
        if (dead && deadCell && rows[deadCell.row] && rows[deadCell.row].col !== deadCell.col) {
          const y = rowY(deadCell.row);
          if (Math.sin(flashT * 18) > -0.3) { g.fillStyle = 'rgba(239,68,68,.75)'; g.fillRect(deadCell.col * CW + 1, y + 1, CW - 2, RH - 2); }
        }
        D.text(g, E.score, W / 2, 70, { size: 64, color: '#f43f5e', stroke: '#fff', lw: 8 });
        if (!started) {
          D.text(g, `♪ ${firstSong.name} — ${firstSong.by}`, W / 2, 150, { size: 17, font: 'ui', weight: 600, color: 'rgba(15,23,42,.6)' });
          D.text(g, 'tap START', W / 2, 180, { size: 15, font: 'mono', color: 'rgba(15,23,42,.4)' });
        }
      },
    };
  },
});

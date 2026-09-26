MG.add({
  id: 'typedef', name: 'Type Defense', cat: 'Action', color: '#38bdf8', color2: '#fb7185',
  desc: 'Words descend on your station. Type them to lock on and fire — speed and accuracy are your ammo.',
  how: ['Just type: the first letter locks onto a word, the rest fire at it', '<kbd>Backspace</kbd> releases your lock', '<kbd>Enter</kbd> fires an EMP that clears the sky (one per wave)', 'Clean streaks raise your multiplier — typos reset it'],
  typing: true, noFsKey: true,
  make(E) {
    const W = 960, H = 600, BX = W / 2, BY = H - 40;
    const WORDS = ('ace aim arc arm art axe bay bit bug cab cog cue dam den dew dim dot dye elf elm fan fig fin fox fry gap gem gum hex hub ice ion ivy jam jet jot keg key kin lab lap lid log map mix mob mop net nib nod oak oar orb owl pan pig pin pod pry ram ray rig rod rum rye saw sky sly sow spy tab tag tan tar tip ton toy tug urn van vat vex wax web wig yak yam zap zen zip ' +
      'atom axis beam bolt byte chip claw code core dash data disk dock dome drum echo edge fern flux foam fuse gale gate gear glow grid gust halo hawk helm hive horn husk iris jade jolt kelp kite knot lamp lava leaf lens lime link loop lynx mask maze mesh mint mist moon moss moth nest node nova opal orca oven pact palm peak pine pixel plum pond port pulse quad quay raft rail reef ring rock rune rust sail sand scan seed shed silk slab snow sock sole spark spin star stem surf swan tank tide tile toad tram tree tuna vale vent vine void volt wand warp wave wing wolf yarn yeti zinc zone ' +
      'amber anvil arrow audio badge baker blade blaze bloom board brick cabin candy cargo cedar chalk charm chess cider cloud cobra comet coral crane crown crypt cyber delta demon diner drift eagle ember epoch fable feast flame flask fleet flint frost ghost giant glass globe grain grape gravy guard hatch haven heart honey hover index ivory jelly jewel joker karma knife lemon light lotus lunar magic mango maple march medal melon metal minor mirth mocha motor noble ocean olive omega onion orbit otter panda patch pearl pedal piano pilot pixie plaza polar prism proxy pulse quake queen quest radar radio raven relay rider river robot rover ruler salsa scout shard shell siege sigil skull slate solar sonic spark spice spoon squad steam stone storm sugar swirl sword table tango thorn tiger toast token tower trail tulip ultra umbra unity vapor vault vigor vinyl viper vista vivid voice waltz whale wheat wraith yacht zebra ' +
      'anchor archer arctic backup bamboo banner barrel beacon bishop bolter branch bridge bronze bucket buffer button cactus candle canyon carbon castle cellar cinema circus cobalt comedy copper cosmic cotton crater crayon cursor dagger debris desert device dragon engine falcon fathom fiddle filter forest fossil fractal galaxy garden garnet gecko glider goblin gospel gravel hammer harbor helium hermit hollow hornet hunter iguana insect island jacket jaguar jigsaw jungle kernel kettle lagoon laptop lizard magnet marble market meteor mirror module monkey mortar nebula needle neuron nickel oracle orchid oxygen packet parrot pebble pepper photon pickle pirate planet plasma pocket portal puzzle quartz rabbit radish ranger reactor rhythm ribbon rocket saddle safari salmon scroll sensor shadow shield signal silver sketch socket sphinx spiral sponge squash stereo stream subway sultan summit sunset switch symbol tablet temple thread throne ticket timber toggle tomato tunnel turtle turret vacuum valley velvet vessel violet vortex walnut wizard wombat zenith zircon ' +
      'absolute adrenaline algorithm amplifier asteroid astronaut backpack blizzard boomerang calculus carnival catapult champion chemical chimera chipmunk chocolate cinnamon compiler constant corridor crescent crossbow crystal cyclone daybreak diamond dinosaur dolphin dynamite eclipse electron elephant emerald envelope equation evolution explorer firework flamingo frontier function gargoyle generator gladiator gravity guardian harmonica hedgehog heritage horizon hurricane iceberg infinity interface journey kangaroo keyboard labyrinth lighthouse lightning magnitude mainframe mechanic meridian midnight monolith mosquito mountain mushroom mystery narrator navigator nightfall notebook obsidian octopus overdrive paradox parallel particle pendulum penguin phantom pineapple platinum porcupine processor pyramid quantum quicksand radiance raindrop rainforest satellite scorpion sequence skeleton snowflake spectrum sprinkler stardust strategy submarine sunflower supernova symphony telescope thunder tornado treasure triangle trombone umbrella universe variable velocity vineyard volcano waterfall whirlpool wildfire windmill wireless').split(' ');
    const byLen = (a, b) => WORDS.filter((w) => w.length >= a && w.length <= b);
    let words = [], bullets = [], lock = null, wave = 0, spawnQ = [], spawnT = 0, lives = 3, combo = 0, mult = 1, typed = 0, errors = 0, emp = 1, t0 = 0, waveBreak = 0, empFx = 0, turretA = -Math.PI / 2;
    const stars = D.makeStars(120, W, H, 13);
    function newWave() {
      wave++; E.stat('Wave', wave); emp = 1;
      const n = 6 + wave * 2;
      const pools = [byLen(3, 4), byLen(4, 6), byLen(5, 7), byLen(6, 9), byLen(8, 12)];
      spawnQ = U.range(n).map((i) => { const tier = U.clamp(Math.floor(wave / 2) + (i % 4 === 3 ? 1 : 0) - (i % 3 === 0 ? 1 : 0), 0, 4); return U.pick(pools[tier]); });
      spawnT = 1;
      E.banner('WAVE ' + wave, `${n} incoming`, { color: '#38bdf8' });
    }
    newWave();
    E.stat('Lives', lives);
    function spawn(text) {
      const used = new Set(words.map((w) => w.text[0]));
      if (used.has(text[0])) { const alt = WORDS.filter((w) => !used.has(w[0]) && Math.abs(w.length - text.length) <= 1); if (alt.length) text = U.pick(alt); }
      const x = U.rand(80, W - 80);
      const sp = (26 + wave * 3.2) * (1.2 - Math.min(0.5, text.length * 0.04));
      words.push({ text, x, y: -20, sx: x, prog: 0, sp, t: U.rand(6), hit: 0, wob: U.rand(0.5, 1.5) });
    }
    function kill(w) {
      words = words.filter((o) => o !== w);
      const pts = w.text.length * 10 * mult; E.score += pts;
      E.burst(w.x, w.y, { n: 30 + w.text.length * 3, colors: ['#38bdf8', '#fff', '#fb7185'], speed: 280, shape: 'spark' });
      E.ring(w.x, w.y, { color: '#38bdf8', r: 60 }); E.pop(w.x, w.y - 24, `+${pts}`, { color: '#fde68a' });
      E.sfx('explode', 1.4, 0.5); E.shake(4);
      if (lock === w) lock = null;
    }
    function onKey(ch) {
      if (ch === 'Backspace') { if (lock) { lock = null; E.sfx('click', 0.6); } return; }
      if (ch === 'Enter') { if (emp > 0) { emp--; empFx = 1; E.sfx('boom', 1.3); E.flash('#38bdf8', 0.5); E.shake(10); for (const w of [...words]) if (w.y > 60) kill(w); } else E.sfx('error'); return; }
      ch = ch.toLowerCase(); if (!/^[a-z]$/.test(ch)) return;
      if (!lock) {
        const cands = words.filter((w) => w.text[w.prog] === ch && w.prog === 0).sort((a, b) => b.y - a.y);
        if (cands.length) lock = cands[0];
      }
      if (lock && lock.text[lock.prog] === ch) {
        lock.prog++; typed++; combo++; mult = 1 + Math.floor(combo / 15); E.stat('×', mult);
        const w = lock;
        turretA = U.ang(BX, BY - 20, w.x, w.y);
        bullets.push({ x: BX + Math.cos(turretA) * 30, y: BY - 20 + Math.sin(turretA) * 30, w, last: w.prog >= w.text.length });
        E.sfx('shoot', 1.3 + (w.prog / w.text.length) * 0.6, 0.4);
        w.y -= 3;
        if (w.prog >= w.text.length) lock = null;
      } else {
        errors++; combo = 0; mult = 1; E.stat('×', 1); E.sfx('error', 1.5, 0.4); E.shake(3);
        if (lock) lock.hit = 0.3;
      }
    }
    return {
      update(dt) {
        t0 += dt; empFx = Math.max(0, empFx - dt * 2);
        for (const ch of E.typed) onKey(ch);
        const acc = typed + errors ? Math.round((typed / (typed + errors)) * 100) : 100;
        E.stat('Acc', acc + '%');
        if (waveBreak > 0) { waveBreak -= dt; if (waveBreak <= 0) newWave(); }
        spawnT -= dt;
        if (spawnQ.length && spawnT <= 0) { spawn(spawnQ.shift()); spawnT = Math.max(0.9, 2.6 - wave * 0.15) * U.rand(0.7, 1.2); }
        for (const w of [...words]) {
          w.t += dt; w.hit = Math.max(0, w.hit - dt);
          const ang = U.ang(w.x, w.y, BX, BY);
          w.y += Math.sin(ang) * w.sp * dt; w.x += Math.cos(ang) * w.sp * dt * 0.6 + Math.sin(w.t * w.wob) * 12 * dt;
          if (U.dist(w.x, w.y, BX, BY) < 44) {
            words = words.filter((o) => o !== w); if (lock === w) lock = null;
            lives--; E.stat('Lives', Math.max(0, lives)); combo = 0; mult = 1;
            E.sfx('hurt'); E.shake(16); E.flash('#fb7185', 0.4); E.burst(BX, BY, { n: 50, colors: ['#fb7185', '#fff'], speed: 300 });
            if (lives <= 0) { const wpm = Math.round(typed / 5 / (t0 / 60)); E.over({ msg: `Wave ${wave} · ${wpm} WPM · ${acc}% accuracy` }); return; }
          }
        }
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i], w = b.w;
          const d = U.dist(b.x, b.y, w.x, w.y);
          if (d < 14 || !words.includes(w)) {
            bullets.splice(i, 1);
            if (words.includes(w)) { E.burst(b.x, b.y, { n: 5, color: '#bae6fd', speed: 120, size: 2 }); w.y -= 4; if (b.last) kill(w); }
            continue;
          }
          const sp = 1400 * dt; b.x += ((w.x - b.x) / d) * Math.min(sp, d); b.y += ((w.y - b.y) / d) * Math.min(sp, d);
        }
        if (!spawnQ.length && !words.length && waveBreak <= 0) { waveBreak = 2; E.score += 200 * wave; E.sfx('win'); E.pop(W / 2, H / 2, `WAVE CLEAR +${200 * wave}`, { color: '#4ade80', size: 28 }); }
        if (lock) turretA = U.damp(turretA, turretA + U.angDiff(turretA, U.ang(BX, BY - 20, lock.x, lock.y)), 12, dt);
      },
      draw(g) {
        const t = E.t;
        D.bg(g, W, H, '#020617', '#0c1a33');
        D.stars(g, stars, W, H, t, 0, t * 20);
        D.grid(g, W, H, 60, 'rgba(56,189,248,.04)', 0, t * 20);
        // base
        D.glow(g, BX, BY, 160, '#38bdf8', 0.2);
        g.fillStyle = '#0f2744'; g.beginPath(); g.arc(BX, BY + 30, 80, Math.PI, 0); g.fill();
        g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.stroke();
        g.save(); g.translate(BX, BY - 20); g.rotate(turretA); D.fillRR(g, 0, -6, 34, 12, 4, '#7dd3fc'); g.restore();
        D.circle(g, BX, BY - 20, 16, '#0ea5e9'); D.circle(g, BX, BY - 20, 8, '#e0f2fe');
        if (empFx > 0) { g.globalAlpha = empFx; D.circle(g, BX, BY, (1 - empFx) * 900, null, '#38bdf8', 20 * empFx); g.globalAlpha = 1; }
        // lock line
        if (lock) { g.setLineDash([6, 8]); D.line(g, BX, BY - 20, lock.x, lock.y, 'rgba(251,113,133,.5)', 1.5); g.setLineDash([]); }
        for (const b of bullets) { D.glow(g, b.x, b.y, 12, '#38bdf8', 1); D.circle(g, b.x, b.y, 3, '#fff'); }
        // words
        g.font = D.font(22, 'mono', 700);
        for (const w of words) {
          const isLock = w === lock;
          const tw = g.measureText(w.text).width, x = w.x - tw / 2, y = w.y;
          D.glow(g, w.x, y, 50, isLock ? '#fb7185' : '#38bdf8', isLock ? 0.35 : 0.15);
          D.fillRR(g, x - 10, y - 17, tw + 20, 32, 9, isLock ? 'rgba(76,5,25,.85)' : 'rgba(8,20,40,.8)');
          D.strokeRR(g, x - 10, y - 17, tw + 20, 32, 9, isLock ? '#fb7185' : 'rgba(56,189,248,.35)', isLock ? 2 : 1);
          g.textAlign = 'left'; g.textBaseline = 'middle';
          const done = w.text.slice(0, w.prog), rest = w.text.slice(w.prog);
          g.fillStyle = '#fb7185'; g.fillText(done, x, y);
          const dw = g.measureText(done).width;
          g.fillStyle = w.hit > 0 ? '#fca5a5' : '#e0f2fe'; g.fillText(rest, x + dw, y);
          if (isLock && rest) { g.fillStyle = '#fde68a'; g.fillRect(x + dw, y + 12, g.measureText(rest[0]).width, 2); }
        }
        // hud
        D.text(g, `×${mult}`, 24, 30, { size: 26, align: 'left', color: '#fde68a' });
        g.fillStyle = 'rgba(253,230,138,.5)'; g.fillRect(24, 48, ((combo % 15) / 15) * 80, 3);
        D.text(g, emp ? 'EMP READY ⏎' : 'EMP USED', W - 20, 30, { size: 13, font: 'mono', align: 'right', color: emp ? '#38bdf8' : '#475569' });
        for (let i = 0; i < 3; i++) D.circle(g, W / 2 - 20 + i * 20, H - 12, 5, i < lives ? '#38bdf8' : 'rgba(255,255,255,.15)');
        D.vignette(g, W, H, 0.5);
      },
    };
  },
});

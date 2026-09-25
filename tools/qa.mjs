// Headless QA: loads the hub, opens each game, fuzzes input, collects errors + screenshots.
// usage: node tools/qa.mjs [id,id,...] [--shots] [--secs=4]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const shots = args.includes('--shots');
const secs = +(args.find((a) => a.startsWith('--secs=')) || '--secs=4').split('=')[1];
const outDir = process.env.QA_OUT || path.join(root, '.qa');
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
let cur = 'hub';
page.on('pageerror', (e) => errors.push(`[${cur}] ${e.message}\n${(e.stack || '').split('\n').slice(0, 3).join('\n')}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`[${cur}] console: ${m.text()}`); });
await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.MG && MG.hub && document.querySelector('#loader.done'), null, { timeout: 20000 });
await page.waitForTimeout(1500);
if (shots) await page.screenshot({ path: path.join(outDir, '_hub.png') });
const ids = only ? only.split(',') : await page.evaluate(() => MG.games.map((g) => g.id));
const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyZ', 'KeyX', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
const report = [];
for (const id of ids) {
  cur = id;
  const before = errors.length;
  await page.evaluate((id) => { location.hash = '#/play/' + id; }, id);
  await page.waitForTimeout(250);
  if (shots) await page.screenshot({ path: path.join(outDir, id + '-0title.png') });
  await page.evaluate(() => MG.hub.start());
  const box = await page.locator('#screen').boundingBox();
  const t0 = Date.now();
  let shot1 = false;
  while (Date.now() - t0 < secs * 1000) {
    const r = Math.random();
    if (r < 0.45) { const k = keys[(Math.random() * keys.length) | 0]; await page.keyboard.down(k); await page.waitForTimeout(30 + Math.random() * 120); await page.keyboard.up(k); }
    else if (r < 0.85) {
      const x = box.x + Math.random() * box.width, y = box.y + Math.random() * box.height;
      await page.mouse.move(x, y, { steps: 3 });
      await page.mouse.down();
      await page.mouse.move(x + (Math.random() - 0.5) * 200, y + (Math.random() - 0.5) * 200, { steps: 4 });
      await page.mouse.up();
    } else await page.waitForTimeout(100);
    if (shots && !shot1 && Date.now() - t0 > secs * 500) { shot1 = true; await page.screenshot({ path: path.join(outDir, id + '-1play.png') }); }
    // if the game ended, restart to keep fuzzing
    const st = await page.evaluate(() => MG.hub.session && MG.hub.session.state);
    if (st === 'over') { await page.waitForTimeout(800); if (shots && !fs.existsSync(path.join(outDir, id + '-2over.png'))) await page.screenshot({ path: path.join(outDir, id + '-2over.png') }); await page.evaluate(() => MG.hub.restart()); }
  }
  const st = await page.evaluate(() => MG.hub.session && MG.hub.session.state);
  report.push({ id, errors: errors.length - before, state: st });
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(100);
}
cur = 'hub-end';
if (shots) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800); await page.screenshot({ path: path.join(outDir, '_hub2.png'), fullPage: false }); }
console.log(report.map((r) => `${r.errors ? '✗' : '✓'} ${r.id.padEnd(14)} errors=${r.errors} state=${r.state}`).join('\n'));
if (errors.length) { console.log('\nERRORS:'); console.log([...new Set(errors)].slice(0, 60).join('\n')); }
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);

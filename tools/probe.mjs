// Probe one game with scripted input. usage: node tools/probe.mjs <id> "<script>" [shot.png]
// script: comma-separated steps like "hold:ArrowRight:3000,wait:500,press:Space,click:480:300,eval:expr"
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [id, script = '', shot] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'log') console.log('LOG', m.text()); });
await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.goto(`http://localhost:${server.address().port}/index.html#/play/${id}`);
await page.waitForFunction(() => window.MG && MG.hub && MG.hub.session && document.querySelector('#loader.done'), null, { timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate(() => MG.hub.start());
const box = await page.locator('#screen').boundingBox();
const def = await page.evaluate(() => ({ w: MG.hub.def.w, h: MG.hub.def.h }));
const toPx = (x, y) => [box.x + (x / def.w) * box.width, box.y + (y / def.h) * box.height];
for (const step of script.split(',').filter(Boolean)) {
  const [cmd, ...a] = step.split(':');
  if (cmd === 'hold') { await page.keyboard.down(a[0]); await page.waitForTimeout(+a[1]); await page.keyboard.up(a[0]); }
  else if (cmd === 'down') await page.keyboard.down(a[0]);
  else if (cmd === 'up') await page.keyboard.up(a[0]);
  else if (cmd === 'press') await page.keyboard.press(a[0]);
  else if (cmd === 'wait') await page.waitForTimeout(+a[0]);
  else if (cmd === 'click') { const [x, y] = toPx(+a[0], +a[1]); await page.mouse.click(x, y); }
  else if (cmd === 'drag') { const [x1, y1] = toPx(+a[0], +a[1]), [x2, y2] = toPx(+a[2], +a[3]); await page.mouse.move(x1, y1); await page.mouse.down(); for (let k = 1; k <= 10; k++) { await page.mouse.move(x1 + ((x2 - x1) * k) / 10, y1 + ((y2 - y1) * k) / 10); await page.waitForTimeout(+(a[4] || 20)); } await page.mouse.up(); }
  else if (cmd === 'mhold') { const [x, y] = toPx(+a[0], +a[1]); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(+a[2]); await page.mouse.up(); }
  else if (cmd === 'type') await page.keyboard.type(a.join(':'), { delay: 40 });
  else if (cmd === 'shot') await page.locator('#frame').screenshot({ path: a[0] });
  else if (cmd === 'eval') console.log(a.join(':'), '=>', JSON.stringify(await page.evaluate(a.join(':'))));
}
const st = await page.evaluate(() => ({ state: MG.hub.session.state, score: MG.hub.session._score, stats: MG.hub.session.stats }));
console.log(JSON.stringify(st));
if (shot) await page.locator('#frame').screenshot({ path: shot });
await browser.close(); server.close();

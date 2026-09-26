// combine images horizontally at half size: node tools/montage.mjs out.png a.png b.png ...
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, ...ins] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 300 } });
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${Math.min(ins.length, 4)},1fr);gap:4px;width:1600px">${ins.map((f) => `<img style="width:100%" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('')}</body>`);
await p.waitForTimeout(100);
await p.screenshot({ path: out, fullPage: true });
await b.close();

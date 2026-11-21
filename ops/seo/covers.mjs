// Обложки 1200×630 для превью ссылок (Open Graph): node ops/seo/covers.mjs
// Рисует обложку статьи как страницу и снимает её Chrome без окна → frontend/public/og/<slug>.png.
// Перерисовывает только изменившиеся обложки (хеш в frontend/public/og/.hashes.json).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { POSTS } = await import(pathToFileURL(join(root, 'frontend/src/blogPosts.js')).href);
const { meshCSS, coverArt } = await import(pathToFileURL(join(root, 'frontend/src/mesh.js')).href);
const GHOST = 'M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z';
const out = join(root, 'frontend/public/og');
mkdirSync(out, { recursive: true });

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  .find((p) => existsSync(p));
if (!CHROME) { console.log('Chrome не найден — обложки не перерисованы (CHROME=путь)'); process.exit(0); }

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = (c, title, slug) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box} html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:Onest,sans-serif;color:#fff;position:relative;background:${meshCSS(slug)}}
.art{position:absolute;right:0;bottom:0;width:600px;height:630px;filter:drop-shadow(0 30px 60px rgba(26,26,46,.35))}.art svg{width:100%;height:100%}
.gh path{stroke:rgba(255,255,255,.55);stroke-width:3}.gh ellipse{fill:#1A1A2E}
.n{position:absolute;inset:0;opacity:.16;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}, ${c.to})}
.g{display:none;position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px);background-size:40px 40px;
-webkit-mask-image:radial-gradient(80% 90% at 75% 25%,#000 20%,transparent 75%)}
.in{position:absolute;left:72px;right:540px;bottom:72px;display:flex;flex-direction:column;gap:18px}
.k{font:500 22px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.88}
.w{font-weight:700;font-size:${c.word.length > 22 ? 76 : 92}px;line-height:1.02;letter-spacing:-.04em;text-shadow:0 4px 40px rgba(0,0,0,.18)}
.s{font-size:30px;opacity:.92;max-width:900px;line-height:1.3}
.b{position:absolute;top:60px;left:72px;display:flex;align-items:center;gap:14px;font-weight:600;font-size:28px;letter-spacing:-.02em}
.b i{width:34px;height:34px;border-radius:9px;background:#fff;display:block;position:relative}
.b i:after{content:"";position:absolute;inset:9px;border-radius:3px;background:#4A90E2}
.u{position:absolute;top:66px;right:72px;font:500 20px 'JetBrains Mono',monospace;opacity:.8}
</style></head><body><div class="n"></div><div class="art">${coverArt(slug)}</div>
<div class="b"><svg width="30" height="38" viewBox="0 0 231 289"><defs><radialGradient id="lg" cx=".22" cy=".18" r=".95"><stop offset="0" stop-color="#FFB3D9"/><stop offset=".45" stop-color="#87CEEB"/><stop offset=".78" stop-color="#4A90E2"/><stop offset="1" stop-color="#2C3E50"/></radialGradient></defs><path d="${GHOST}" fill="url(#lg)" stroke="#fff" stroke-width="8"/><ellipse cx="80" cy="120" rx="20" ry="30" fill="#1A1A2E"/><ellipse cx="150" cy="120" rx="20" ry="30" fill="#1A1A2E"/></svg>KadBest</div>
<div class="in">${c.kicker ? `<div class="k">${esc(c.kicker)}</div>` : ''}<div class="w">${esc(c.word)}</div>${c.sub ? `<div class="s">${esc(c.sub)}</div>` : ''}</div>
</body></html>`;

const site = { slug: 'kadbest', cover: { from: '#0070f3', via: '#4f46e5', to: '#7c3aed', kicker: 'Для юристов', word: 'KadBest', sub: 'Судебные дела, проверка компаний и законодательство — в одном поиске' } };
const hashFile = join(out, '.hashes.json');
const hashes = existsSync(hashFile) ? JSON.parse(readFileSync(hashFile, 'utf8')) : {};
let made = 0;
for (const p of [site, ...POSTS]) {
  if (!p.cover) continue;
  const page = html(p.cover, p.title, p.slug);
  const h = createHash('sha1').update(page).digest('hex').slice(0, 12);
  const png = join(out, p.slug + '.png');
  if (hashes[p.slug] === h && existsSync(png)) continue;
  const f = join(tmpdir(), `kb-cover-${p.slug}.html`);
  writeFileSync(f, page);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--virtual-time-budget=4000',
    '--window-size=1200,630', `--screenshot=${png}`, pathToFileURL(f).href], { stdio: 'ignore' });
  rmSync(f, { force: true });
  hashes[p.slug] = h;
  made++;
}
writeFileSync(hashFile, JSON.stringify(hashes, null, 1));
console.log(`обложки: перерисовано ${made}, всего ${Object.keys(hashes).length}`);

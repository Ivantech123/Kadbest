// Обложки в стиле Буквоеда: палитра персонажа, у каждой статьи свой тон и своя сцена с Буквоедом по теме.
// Обычный JS без зависимостей: используется и сайтом (BlogCharts.jsx → Cover), и генератором картинок ops/seo/covers.mjs.
export const PALETTE = ['#FFB3D9', '#87CEEB', '#4A90E2', '#2C3E50', '#1A1A2E'];
const [PINK, SKY, BLUE, SLATE, NIGHT] = PALETTE;

function rnd(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

// тона: какие цвета палитры главные и какой фон под пятнами
const THEMES = {
  dawn: { blobs: [PINK, PINK, SKY, BLUE], base: [`${PINK}`, `${BLUE}`, SLATE] },
  sky: { blobs: [SKY, SKY, PINK, BLUE], base: [SKY, BLUE, SLATE] },
  deep: { blobs: [PINK, BLUE, SLATE, NIGHT], base: [SLATE, NIGHT, NIGHT] },
  aurora: { blobs: [PINK, SKY, PINK, BLUE], base: [BLUE, SLATE, NIGHT] },
  ocean: { blobs: [BLUE, SKY, PINK, SLATE], base: [BLUE, BLUE, SLATE] },
  dusk: { blobs: [PINK, SLATE, SKY, NIGHT], base: [SLATE, '#3b2f52', NIGHT] },
  night: { blobs: [BLUE, PINK, SKY, NIGHT], base: [NIGHT, SLATE, NIGHT] },
};

// у каждой статьи — свой тон и своя сцена; новые статьи получают их по хешу slug
const ART = {
  'o-velikij-russkij': ['dawn', 'letters'],
  'poisk-ponimaet-obychnyj-yazyk': ['sky', 'bubble'],
  'proverka-kontragenta': ['deep', 'magnifier'],
  'odin-poisk': ['aurora', 'search'],
  'normy-v-odin-klik': ['ocean', 'paragraph'],
  'raspisanie-i-podsudnost': ['dusk', 'calendar'],
  'ii-assistent-mcp': ['night', 'duo'],
  kadbest: ['aurora', 'hero'],
};
const SCENES = ['letters', 'bubble', 'magnifier', 'search', 'paragraph', 'calendar', 'duo', 'hero'];

export function artFor(slug = 'kadbest') {
  if (ART[slug]) return ART[slug];
  const r = rnd(slug);
  const t = Object.keys(THEMES);
  return [t[Math.floor(r() * t.length)], SCENES[Math.floor(r() * SCENES.length)]];
}

// meshCSS — CSS-фон обложки: пятна палитры по тону статьи, раскладка — по slug.
export function meshCSS(seed = 'kadbest') {
  const [theme] = artFor(seed);
  const T = THEMES[theme] || THEMES.aurora;
  const r = rnd(seed);
  const p = (lo, hi) => Math.round(lo + r() * (hi - lo));
  const [a, b, c, d] = T.blobs;
  return [
    `radial-gradient(${p(45, 70)}% ${p(55, 80)}% at ${p(5, 35)}% ${p(5, 35)}%, ${a} 0%, transparent 70%)`,
    `radial-gradient(${p(40, 60)}% ${p(50, 70)}% at ${p(50, 85)}% ${p(5, 40)}%, ${b} 0%, transparent 70%)`,
    `radial-gradient(${p(50, 75)}% ${p(55, 80)}% at ${p(15, 60)}% ${p(55, 95)}%, ${c} 0%, transparent 72%)`,
    `radial-gradient(${p(45, 70)}% ${p(55, 80)}% at ${p(70, 100)}% ${p(60, 100)}%, ${d} 0%, transparent 70%)`,
    `linear-gradient(${p(120, 170)}deg, ${T.base[0]} 0%, ${T.base[1]} 55%, ${T.base[2]} 100%)`,
  ].join(', ');
}

const GHOST = 'M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z';

// Буквоед в SVG: x, y — левый верхний угол, s — масштаб, rot — наклон, look — куда смотрят глаза, id — для градиента
function ghost({ x, y, s = 1, rot = 0, look = [0, 0], id = 'g', fill, sleepy = false }) {
  const eyes = [80, 150].map((cx) => sleepy
    ? `<path d="M${cx - 20 + look[0]} ${122 + look[1]} q20 14 40 0" stroke="${NIGHT}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${cx + look[0]}" cy="${120 + look[1]}" rx="20" ry="30" fill="${NIGHT}"/><circle cx="${cx + look[0] + 7}" cy="${108 + look[1]}" r="5" fill="#fff" opacity=".85"/>`).join('');
  return `<g transform="translate(${x} ${y}) rotate(${rot} ${115 * s} ${144 * s}) scale(${s})">
<path d="${GHOST}" fill="${fill || `url(#${id})`}" stroke="rgba(255,255,255,.6)" stroke-width="${3 / s}"/>${eyes}</g>`;
}

const grad = (id, a = PINK, b = SKY, c = BLUE, d = SLATE) => `<radialGradient id="${id}" cx=".22" cy=".18" r=".95"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset=".78" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
const glass = 'fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.55)" stroke-width="3"';

// coverArt — сцена для правой части обложки (viewBox 600×630): Буквоед и предмет по теме статьи.
export function coverArt(slug = 'kadbest') {
  const [, scene] = artFor(slug);
  const id = 'ga' + String(slug).replace(/[^a-z0-9]/gi, '');
  let body = '';
  const defs = grad(id) + grad(id + 'b', SKY, PINK, BLUE, SLATE);
  switch (scene) {
    case 'letters': {
      const L = [['А', 70, 150, -14, 120], ['Б', 470, 110, 12, 96], ['В', 110, 470, 8, 84], ['Я', 500, 430, -10, 110], ['ё', 300, 80, 6, 70]];
      body = L.map(([t, x, y, r, f]) => `<text x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" font-family="Onest, sans-serif" font-weight="700" font-size="${f}" fill="rgba(255,255,255,.75)">${t}</text>`).join('')
        + ghost({ x: 190, y: 190, s: 1.15, look: [-6, -8], id });
      break;
    }
    case 'bubble':
      body = `<path d="M150 70h300a46 46 0 0 1 46 46v90a46 46 0 0 1-46 46H290l-50 46v-46h-90a46 46 0 0 1-46-46v-90a46 46 0 0 1 46-46z" ${glass}/>
<text x="300" y="198" text-anchor="middle" font-family="Onest, sans-serif" font-weight="700" font-size="92" fill="#fff">?!</text>`
        + ghost({ x: 230, y: 300, s: 1.05, look: [4, -10], id });
      break;
    case 'magnifier':
      body = ghost({ x: 300, y: 160, s: 1.45, rot: -12, look: [-10, 2], id })
        + `<circle cx="300" cy="300" r="105" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="16"/><path d="M226 374 140 460" stroke="#fff" stroke-width="30" stroke-linecap="round"/>`;
      break;
    case 'search':
      body = `<rect x="40" y="120" width="520" height="96" rx="48" ${glass}/>
<circle cx="102" cy="168" r="20" fill="none" stroke="#fff" stroke-width="7"/><path d="m117 183 16 16" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
<text x="150" y="182" font-family="JetBrains Mono, monospace" font-size="38" fill="#fff">ст. 330 ГК</text><rect x="398" y="146" width="4" height="44" fill="${PINK}"/>`
        + ghost({ x: 250, y: 270, s: 1.05, look: [-8, -14], id });
      break;
    case 'paragraph':
      body = `<text x="235" y="480" text-anchor="middle" font-family="Onest, sans-serif" font-weight="700" font-size="560" fill="rgba(255,255,255,.42)" stroke="rgba(255,255,255,.7)" stroke-width="4">§</text>`
        + ghost({ x: 330, y: 330, s: 0.92, rot: 8, look: [-12, -8], id });
      break;
    case 'calendar': {
      let cells = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells += `<rect x="${78 + c * 66}" y="${178 + r * 58}" width="52" height="44" rx="10" fill="${r === 2 && c === 3 ? PINK : 'rgba(255,255,255,.22)'}"/>`;
      body = `<rect x="56" y="100" width="370" height="370" rx="34" ${glass}/><rect x="56" y="100" width="370" height="60" rx="30" fill="rgba(255,255,255,.3)"/>${cells}`
        + ghost({ x: 330, y: 300, s: 0.95, rot: -8, look: [-12, -6], id });
      break;
    }
    case 'duo':
      body = ghost({ x: 40, y: 230, s: 0.95, rot: -6, look: [10, -4], id })
        + ghost({ x: 330, y: 150, s: 1.05, rot: 8, look: [-10, 2], id: id + 'b' })
        + `<path d="M250 330 C 290 300, 300 300, 340 290" stroke="#fff" stroke-width="8" stroke-dasharray="4 16" stroke-linecap="round" fill="none"/>
<rect x="88" y="110" width="150" height="70" rx="35" ${glass}/><text x="163" y="157" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="30" fill="#fff">MCP</text>`;
      break;
    default:
      body = ghost({ x: 170, y: 150, s: 1.35, look: [-6, -4], id });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 630" preserveAspectRatio="xMaxYMax meet"><defs>${defs}</defs>${body}</svg>`;
}

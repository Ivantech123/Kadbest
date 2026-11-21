// Статичные страницы блога для поисковиков: node ops/seo/prerender.mjs (после vite build; входит в npm run build).
// Для каждой статьи — web/blog/<slug>/index.html с полным текстом в HTML (поисковику не нужно выполнять JS),
// мета-описанием, каноническим адресом, Open Graph / Twitter, разметкой Schema.org (BlogPosting, BreadcrumbList).
// Плюс web/blog/index.html, web/sitemap.xml и web/robots.txt. Сайт поверх загружается как обычно (React заменяет разметку).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const web = join(root, 'backend', 'web');
const SITE = process.env.SITE || 'https://kadbest.online';
const { POSTS } = await import(pathToFileURL(join(root, 'frontend/src/blogPosts.js')).href);
const { CHANGELOG } = await import(pathToFileURL(join(root, 'frontend/src/changelog.js')).href);
const tpl = readFileSync(join(web, 'index.html'), 'utf8');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h.startsWith('#/') ? '/' + h : h}">${t}</a>`);

// подписи графиков — те же, что на сайте (BlogCharts.jsx); в статичной версии — описание вместо рисунка
const CHART = {
  mascot: ['Знакомьтесь: Буквоед', 'Персонаж версии 2.0. Читает законы до последней буквы, знает все падежи и не обижается на опечатки.'],
  pipeline: ['Путь одного запроса', 'Вы написали «неустойкка по ДКП» → исправлена опечатка → раскрыто сокращение (договор купли-продажи) → основы слов → синонимы (пеня, штраф) → поиск по разделам параллельно → ранжирование BM25 → ответ по частям.'],
  stems: ['Десяток форм — одно слово', 'неустойка, неустойки, неустойку, неустойкой → «неустойк»; договор, договора, договорами → «договор»; расторжение, расторжения, расторжением → «расторжен».'],
  idf: ['Редкие слова важнее частых', 'Запрос «неустойка по договору подряда», 20 найденных документов: «договор» есть в 18 (вес 0,13), «неустойка» — в 6 (1,17), «подряд» — в 4 (1,54).'],
  weights: ['Из чего складывается место в выдаче', 'Точная фраза в названии +6, кодекс +3, федеральный закон и Пленум ВС +2,5, найдена конкретная статья +2, слово в названии ×1,6, принят с 2020 года +0,8, слово в описании ×0,6, синоним ×0,5, письмо −0,5, закрытый текст −1, утратил силу −9.'],
  stream: ['Когда вы видите каждый раздел ответа', 'Медианы по журналу сервиса: статьи 2,6 с, проекты актов 3,5 с, ключевые нормы 4,0 с, опубликованные акты 4,8 с, законодательство 5,4 с. Раньше весь ответ показывался через 5,4 с, теперь первый раздел — через 2,6 с.'],
};

function body(md, post) {
  const out = [];
  let list = null, ordered = false;
  const flush = () => { if (list) { out.push(`<${ordered ? 'ol' : 'ul'}>${list.join('')}</${ordered ? 'ol' : 'ul'}>`); list = null; } };
  for (const raw of md.split('\n')) {
    const l = raw.trim();
    const ul = /^[-*] /.test(l), ol = /^\d+\. /.test(l);
    if (ul || ol) {
      if (list && ordered !== ol) flush();
      ordered = ol;
      (list ||= []).push(`<li>${inline(l.replace(/^([-*]|\d+\.) /, ''))}</li>`);
      continue;
    }
    flush();
    if (!l) continue;
    const ch = /^::chart (\w+)$/.exec(l);
    if (ch) {
      if (ch[1] === 'quality') {
        const m = post.metrics;
        if (m?.before && m?.after) {
          const row = (k, f) => `<tr><td>${k}</td><td>${Math.round(m.before[f] * 100)}%</td><td><b>${Math.round(m.after[f] * 100)}%</b></td></tr>`;
          out.push(`<figure><figcaption>Качество на ${m.n} эталонных запросах</figcaption><table><thead><tr><th></th><th>Версия 1.9</th><th>Версия 2.0</th></tr></thead><tbody>${row('Верно понят запрос', 'intentAcc')}${row('Нужное на 1-м месте', 'top1')}${row('Нужное в первой тройке', 'top3')}${row('Нужное в первой десятке', 'top10')}</tbody></table></figure>`);
        }
      } else if (CHART[ch[1]]) out.push(`<figure><figcaption>${esc(CHART[ch[1]][0])}</figcaption><p>${esc(CHART[ch[1]][1])}</p></figure>`);
      continue;
    }
    if (l.startsWith('> ')) out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`);
    else if (l.startsWith('### ')) out.push(`<h3>${inline(l.slice(4))}</h3>`);
    else if (l.startsWith('## ')) out.push(`<h2>${inline(l.slice(3))}</h2>`);
    else out.push(`<p>${inline(l)}</p>`);
  }
  flush();
  return out.join('\n');
}

const plain = (md) => md.replace(/::chart \w+/g, '').replace(/[*`#>]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const words = (md) => plain(md).split(/\s+/).filter(Boolean).length;
const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const describe = (p) => p.description || (p.lead.length > 158 ? p.lead.slice(0, 155).replace(/\s+\S*$/, '') + '…' : p.lead);
const ogImage = (slug) => (existsSync(join(web, 'og', slug + '.png')) ? `${SITE}/og/${slug}.png` : `${SITE}/og/kadbest.png`);

function page({ title, description, url, image, type = 'website', extraHead = '', content, jsonld }) {
  const head = `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:site_name" content="KadBest">
<meta property="og:locale" content="ru_RU">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<link rel="alternate" type="application/rss+xml" title="Блог KadBest" href="${SITE}/blog/rss.xml">
${extraHead}
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`;
  return tpl
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, '') // мета главной страницы — у статьи свои
    .replace('</head>', head + '\n</head>')
    .replace(/<div id="root">(?:<!--boot-->[\s\S]*?<!--\/boot-->)?<\/div>/, `<div id="root">${content}</div>`);
}

const org = { '@type': 'Organization', name: 'KadBest', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/og/kadbest.png` } };
const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

for (const p of sorted) {
  const url = `${SITE}/blog/${p.slug}/`;
  const image = ogImage(p.slug);
  const modified = p.updated || p.date;
  const related = sorted.filter((x) => x !== p).slice(0, 3);
  const content = `<article class="page legal post seo">
<nav aria-label="Навигация"><a href="/">KadBest</a> › <a href="/blog/">Блог</a></nav>
${p.cover ? `<img src="/og/${p.slug}.png" alt="${esc(p.title)}" width="1200" height="630" style="width:100%;height:auto;border-radius:14px">` : ''}
<p class="eyebrow"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.minutes} мин чтения</p>
<h1>${esc(p.title)}</h1>
<p class="post-lead">${esc(p.lead)}</p>
${body(p.body, p)}
<aside><h2>Читайте также</h2><ul>${related.map((r) => `<li><a href="/blog/${r.slug}/">${esc(r.title)}</a></li>`).join('')}</ul></aside>
<p><a href="/#/app">Открыть KadBest — 10 поисков бесплатно</a></p>
</article>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting', headline: p.title, description: describe(p), image: [image], datePublished: p.date, dateModified: modified,
        author: { '@type': 'Organization', name: 'Редакция KadBest', url: SITE }, publisher: org, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        inLanguage: 'ru-RU', wordCount: words(p.body), keywords: (p.tags || []).join(', '), articleSection: (p.tags || [])[0], url,
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'KadBest', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Блог', item: SITE + '/blog/' },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ] },
    ],
  };
  const extra = `<meta property="article:published_time" content="${p.date}">
<meta property="article:modified_time" content="${modified}">
${(p.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}`;
  mkdirSync(join(web, 'blog', p.slug), { recursive: true });
  writeFileSync(join(web, 'blog', p.slug, 'index.html'), page({ title: `${p.title} — блог KadBest`, description: describe(p), url, image, type: 'article', extraHead: extra, content, jsonld: ld }));
}

// список статей
const listUrl = `${SITE}/blog/`;
writeFileSync(join(web, 'blog', 'index.html'), page({
  title: 'Блог KadBest — судебная практика, проверка контрагентов, законодательство',
  description: 'Практика работы с судебными делами и нормами: как быстрее проверять контрагентов, искать дела, читать законы и подключать ИИ-ассистента.',
  url: listUrl, image: `${SITE}/og/kadbest.png`,
  content: `<div class="page"><h1>Блог KadBest</h1><p>Практика работы с делами и нормами.</p><ul>${sorted.map((p) => `<li><a href="/blog/${p.slug}/">${esc(p.title)}</a> — ${esc(describe(p))}</li>`).join('')}</ul></div>`,
  jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Блог KadBest', url: listUrl, inLanguage: 'ru-RU', publisher: org,
    blogPost: sorted.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date })) },
}));

// RSS — его читают агрегаторы и Яндекс
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Блог KadBest</title><link>${listUrl}</link><description>Судебная практика, проверка контрагентов и законодательство</description><language>ru</language>
${sorted.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(describe(p))}</description></item>`).join('\n')}
</channel></rss>`;
writeFileSync(join(web, 'blog', 'rss.xml'), rss);

// карта сайта и правила для роботов
const latest = sorted[0].updated || sorted[0].date;
const urls = [[SITE + '/', CHANGELOG[0].date.length > 7 ? CHANGELOG[0].date : latest, '1.0'], [listUrl, latest, '0.8'],
  ...sorted.map((p) => [`${SITE}/blog/${p.slug}/`, p.updated || p.date, '0.7'])];
writeFileSync(join(web, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d, pr]) => `<url><loc>${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}
</urlset>`);
writeFileSync(join(web, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /v1/
Disallow: /mcp

Sitemap: ${SITE}/sitemap.xml
`);
console.log(`пререндер: ${sorted.length} статей, /blog/, rss.xml, sitemap.xml, robots.txt`);

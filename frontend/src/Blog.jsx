// Блог: список статей и страница статьи (тексты — blogPosts.js).
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { POSTS } from './blogPosts.js';
import { fadeUp, soft } from './ui.jsx';
import { CHARTS, Cover } from './BlogCharts.jsx';

// Блог: #/blog — список, #/blog/<slug> — статья. Текст — простой Markdown (##, списки, **жирный**, `код`).
const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function inline(s, k) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const key = k + '-' + m.index;
    out.push(m[1] ? <b key={key}>{m[1]}</b> : m[2] ? <code key={key}>{m[2]}</code> : <a key={key} href={m[4]}>{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

// Кроме обычного Markdown: «::chart имя» — график из BlogCharts, «> текст» — врезка, «1. » — нумерованный список.
function Markdown({ text, post }) {
  const blocks = [];
  let list = null, ordered = false;
  const flush = (i) => { if (list) { blocks.push(ordered ? <ol key={'o' + i}>{list}</ol> : <ul key={'u' + i}>{list}</ul>); list = null; } };
  text.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    const ul = /^[-*] /.test(l), ol = /^\d+\. /.test(l);
    if (ul || ol) {
      if (list && ordered !== ol) flush(i);
      ordered = ol;
      (list ||= []).push(<li key={i}>{inline(l.replace(/^([-*]|\d+\.) /, ''), i)}</li>);
      return;
    }
    flush(i);
    if (!l) return;
    const chart = /^::chart (\w+)$/.exec(l);
    if (chart) { const C = CHARTS[chart[1]]; if (C) blocks.push(<C key={i} m={post?.metrics} />); return; }
    if (l.startsWith('> ')) blocks.push(<blockquote key={i} className="callout">{inline(l.slice(2), i)}</blockquote>);
    else if (l.startsWith('### ')) blocks.push(<h3 key={i}>{inline(l.slice(4), i)}</h3>);
    else if (l.startsWith('## ')) blocks.push(<h2 key={i}>{inline(l.slice(3), i)}</h2>);
    else blocks.push(<p key={i}>{inline(l, i)}</p>);
  });
  flush('end');
  return <div className="post-body">{blocks}</div>;
}

export default function Blog() {
  const slug = (location.hash || location.pathname.replace(/\/$/, '')).replace(/^#/, '').split('/')[2];
  const post = slug && POSTS.find((p) => p.slug === slug);
  useEffect(() => { document.title = post ? `${post.title} — блог KadBest` : 'Блог KadBest — судебная практика, проверка контрагентов, законодательство'; }, [post]);
  if (post) {
    const i = POSTS.indexOf(post), next = POSTS[i + 1] || POSTS[0];
    return (
      <article className="page legal post">
        <a href="/blog/" className="c2" style={{ fontSize: 14, textDecoration: 'none' }}>← Все статьи</a>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
          {post.cover && <div style={{ marginTop: 18 }}><Cover c={post.cover} big slug={post.slug} /></div>}
          <div className="eyebrow" style={{ marginTop: 22 }}>{fmtDate(post.date)} · {post.minutes} мин</div>
          <h1>{post.title}</h1>
          <p className="post-lead">{post.lead}</p>
        </motion.div>
        <Markdown text={post.body} post={post} />
        <div className="card spot post-cta">
          <div><b>Попробуйте на своём деле</b><div className="c2" style={{ fontSize: 14 }}>10 поисков бесплатно, без карты.</div></div>
          <a className="btn pri" href="#/app" style={{ textDecoration: 'none' }}>Открыть KadBest →</a>
        </div>
        {next !== post && <a className="card spot post-next" href={`/blog/${next.slug}/`}><span className="eyebrow">Читать дальше</span><b>{next.title}</b></a>}
      </article>
    );
  }
  return (
    <div className="page">
      <div className="ph"><div><div className="eyebrow">Блог</div><h1>Практика работы с делами и нормами</h1><p>Как юристу быстрее проверять контрагентов, искать дела и читать законы.</p></div></div>
      <div className="blog-grid">
        {POSTS.map((p, i) => (
          <motion.a key={p.slug} href={`/blog/${p.slug}/`} className={'card spot blog-card' + (i === 0 ? ' wide' : '')} variants={fadeUp} custom={i} initial="hidden" animate="show" whileHover={{ y: -3 }}>
            {p.cover && <Cover c={p.cover} big={false} slug={p.slug} />}
            <div className="eyebrow">{fmtDate(p.date)} · {p.minutes} мин</div>
            <h2>{p.title}</h2>
            <p className="c2">{p.lead}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>{(p.tags || []).map((t) => <span key={t} className="pill">{t}</span>)}</div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

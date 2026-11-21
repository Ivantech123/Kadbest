// Отрисовка Markdown-ответов: ссылки на источники [n], ссылки на нормы, эффект печати, карточки источников.
import { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Gavel, Globe, Library, Newspaper, Scale, ScrollText } from 'lucide-react';

// Ответ ИИ в Markdown (заголовки, списки, жирный, курсив, код) со ссылками [n] на источники.

export const KIND = {
  laws: [ScrollText, 'Закон'], norm: [Scale, 'Статья'], cases: [Gavel, 'Дело'], articles: [BookOpen, 'Публикация'],
  published: [Newspaper, 'Опубликовано'], drafts: [FileText, 'Проект'], web: [Globe, 'Интернет'], company: [Library, 'Компания'],
};

// куда ведёт источник: внутри сервиса — новой вкладкой, чтобы чат остался открыт
export function openSource(s) {
  if (!s) return;
  if (s.url) { window.open(s.url, '_blank', 'noopener'); return; }
  if (s.ref?.startsWith('q:')) { window.open('#/app?q=' + encodeURIComponent(s.ref.slice(2)), '_blank'); return; }
  if (s.ref) window.open('#/app?o=' + encodeURIComponent(s.ref), '_blank');
}

function Cite({ n, src }) {
  const [hov, setHov] = useState(false);
  if (!src) return null;
  const [I] = KIND[src.kind] || KIND.laws;
  return (
    <span className="cite-w" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <button type="button" className="cite" onClick={() => openSource(src)} aria-label={`Источник ${n}: ${src.title}`}>{n}</button>
      {hov && (
        <span className="cite-pop" role="tooltip">
          <span className="cite-pop-h"><I size={13} />{(KIND[src.kind] || KIND.laws)[1]}{src.sub ? ' · ' + src.sub : ''}</span>
          <b>{src.title}</b>
        </span>
      )}
    </span>
  );
}

function inline(text, srcs, key) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`|\[(\d{1,3})\]/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = key + '-' + i++;
    if (m[1]) out.push(<b key={k}>{inline(m[1], srcs, k)}</b>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else if (m[3]) out.push(<code key={k}>{m[3]}</code>);
    else { const n = +m[4]; out.push(<Cite key={k} n={n} src={srcs?.find((s) => s.n === n)} />); }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text = '', sources = [] }) {
  const blocks = [];
  let list = null, kind = '';
  const flush = (i) => { if (list) { blocks.push(kind === 'ol' ? <ol key={'l' + i}>{list}</ol> : <ul key={'l' + i}>{list}</ul>); list = null; } };
  text.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    const ul = /^[-*•] /.test(l), ol = /^\d+[.)] /.test(l);
    if (ul || ol) {
      const k = ol ? 'ol' : 'ul';
      if (list && kind !== k) flush(i);
      kind = k;
      (list ||= []).push(<li key={i}>{inline(l.replace(/^([-*•]|\d+[.)]) /, ''), sources, 'li' + i)}</li>);
      return;
    }
    flush(i);
    if (!l) return;
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { const T = h[1].length <= 2 ? 'h3' : 'h4'; blocks.push(<T key={i}>{inline(h[2], sources, 'h' + i)}</T>); return; }
    if (/^>\s?/.test(l)) { blocks.push(<blockquote key={i}>{inline(l.replace(/^>\s?/, ''), sources, 'q' + i)}</blockquote>); return; }
    if (/^---+$/.test(l)) { blocks.push(<hr key={i} />); return; }
    blocks.push(<p key={i}>{inline(l, sources, 'p' + i)}</p>);
  });
  flush('end');
  return <div className="md">{blocks}</div>;
}

// Текст «печатается»: быстро и плавно, по словам; reduce — сразу целиком.
export function useTypewriter(text, on = true) {
  // печать без рывков: текст может дописываться потоком — продолжаем с того места, где остановились,
  // а скорость подстраивается под отставание (догоняем за ~⅓ секунды, но не быстрее строки за кадр)
  const [n, setN] = useState(on ? 0 : text.length);
  const pos = useRef(on ? 0 : text.length);
  const prev = useRef('');
  const target = useRef(text);
  const raf = useRef(0);
  useEffect(() => {
    target.current = text;
    if (!on || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { pos.current = text.length; setN(text.length); return; }
    if (!text.startsWith(prev.current.slice(0, pos.current))) pos.current = Math.min(pos.current, commonPrefix(prev.current, text));
    prev.current = text;
    if (raf.current) return;
    const tick = () => {
      const left = target.current.length - pos.current;
      if (left <= 0) { raf.current = 0; setN(target.current.length); return; }
      pos.current += Math.max(1, Math.min(120, Math.ceil(left / 20)));
      setN(pos.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [text, on]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return text.slice(0, Math.min(n, text.length));
}

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export function Sources({ items }) {
  if (!items?.length) return null;
  return (
    <div className="srcs" role="list" aria-label="Источники">
      {items.slice(0, 8).map((s, i) => {
        const [I, label] = KIND[s.kind] || KIND.laws;
        return (
          <button key={s.n} type="button" role="listitem" className="src-card" style={{ '--i': i }} onClick={() => openSource(s)} title={s.title}>
            <span className="src-top"><span className="src-n mono">{s.n}</span><I size={13} /><span className="c3">{s.kind === 'web' && s.sub ? s.sub : label}</span></span>
            <span className="src-t">{s.title}</span>
          </button>
        );
      })}
      {items.length > 8 && <span className="src-more c3">+{items.length - 8}</span>}
    </div>
  );
}

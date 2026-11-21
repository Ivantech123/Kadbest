// Читалка законов: оглавление, текст статьи, переходы по ссылкам на нормы.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { api } from './api.js';
import { ErrorBox, Loading, SearchIcon, Skeleton, soft, spring, useAsync } from './ui.jsx';
import { donePrintWindow, fillPrintWindow, openPrintWindow, progressPrintWindow, saveDocx, saveTxt } from './exporter.js';
import { RichText, plain } from './lawlinks.jsx';

// Читалка документа: колонка ~68 знаков, пункты отдельными абзацами с номерами на полях,
// служебные пометки приглушены, оглавление сбоку, ← → листают статьи.
const SIZES = [16, 17.5, 19, 21];
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

// Разбор плоского текста статьи на блоки.
function blocks(text, title) {
  const lines = text.replace(title, '').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    if (/^\((в ред\.|см\.|введен|утратил|абзац|часть|пункт)/i.test(l) || /^\(.*(ред\.|редакции|Федерального закона).*\)$/i.test(l)) return { t: 'note', s: l };
    if (/^(КонсультантПлюс|Позиции высших судов|Путеводитель|Вопросы? (и|по))/i.test(l)) return { t: 'skip' };
    const m = /^(\d{1,3}(?:\.\d+)?[.)]|[а-яё]\))\s+(.*)$/i.exec(l);
    if (m) return { t: 'item', n: m[1], s: m[2] };
    return { t: 'p', s: l };
  }).filter((b) => b.t !== 'skip');
}

function Header({ text }) {
  const [open, setOpen] = useState(false);
  const i = text.indexOf('Список изменяющих документов');
  const main = i > 0 ? text.slice(0, i) : text;
  const tail = i > 0 ? text.slice(i) : '';
  return (
    <div className="r-head">
      {main.split('\n').filter(Boolean).slice(0, 12).map((l, k) => <RichText as="p" key={k}>{l}</RichText>)}
      {tail && (
        <>
          <button className="btn link" onClick={() => setOpen(!open)}>{open ? 'Скрыть' : 'Показать'} список изменяющих документов</button>
          <AnimatePresence>{open && (
            <motion.div className="r-note" style={{ overflow: 'hidden' }} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {tail.split('\n').filter(Boolean).map((l, k) => <RichText as="div" key={k}>{l}</RichText>)}
            </motion.div>
          )}</AnimatePresence>
        </>
      )}
    </div>
  );
}

export default function Reader({ id, part: part0, article, showToc, onPart }) {
  const doc = useAsync(), part = useAsync();
  const [sel, setSel] = useState(part0 || '');
  useEffect(() => { if (part0 && part0 !== sel) setSel(part0); }, [part0]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tf, setTf] = useState('');
  const [toc, setToc] = useState(() => showToc || window.innerWidth > 980);
  const [size, setSize] = useState(() => store.get('lexReadSize', 1));
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 140px', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  useEffect(() => { doc.run((sig) => api(`/v1/law/doc/${id}`, {}, sig)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sel) part.run((sig) => api(`/v1/law/doc/${id}/part/${sel}`, {}, sig)); else part.reset(); }, [id, sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { store.set('lexReadSize', size); }, [size]);
  const d = doc.data, p = part.data;
  // ссылка «на статью N»: находим её в оглавлении, когда документ загрузился
  useEffect(() => {
    if (!d || !article) return;
    const t = d.toc.find((x) => x.title.startsWith(`Статья ${article}.`));
    if (t) { setSel(t.part); onPart?.(t.part); }
  }, [d, article]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (x) => { if (!x) return; setSel(x); onPart?.(x); window.scrollTo({ top: 0, behavior: 'smooth' }); if (window.innerWidth <= 980) setToc(false); };
  useEffect(() => {
    const k = (e) => {
      if (e.target.closest('input,textarea,select')) return;
      if (e.key === 'ArrowRight' && p?.next) go(p.next);
      if (e.key === 'ArrowLeft' && p?.prev) go(p.prev);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => (d ? d.toc.filter((t) => !tf || t.title.toLowerCase().includes(tf.toLowerCase())) : []), [d, tf]);
  const body = useMemo(() => (p ? blocks(p.md || p.text, p.title) : []), [p]);
  const tocTitle = d?.toc.find((t) => t.part === sel)?.title;
  const copy = () => {
    const txt = `${p.title}\n\n${body.map((b) => plain(b.t === 'item' ? `${b.n} ${b.s}` : b.s)).join('\n')}\n\n${d.title}`;
    navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  if (doc.error) return <ErrorBox error={doc.error} />;
  if (!d) return <div className="card" style={{ padding: 24 }}><Loading stages={[[0, 'Открываем документ…'], [3, 'Загружаем оглавление…'], [8, 'Большой документ, ещё немного…']]} /></div>;
  return (
    <div className={'reader-wrap' + (toc ? ' with-toc' : '')}>
      <div className="r-bar">
        <motion.div className="r-progress" style={{ scaleX: progress }} />
        <button className="btn ghost" onClick={() => setToc(!toc)} aria-pressed={toc} title="Оглавление">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 3.5h12M2 8h12M2 12.5h8" strokeLinecap="round" /></svg>
          <span className="hide-sm">Оглавление</span>
        </button>
        <div className="r-title"><div className="c3" style={{ fontSize: 12 }}>{d.title}</div><div className="r-cur">{p?.title || tocTitle || 'Реквизиты и редакции'}</div></div>
        <div className="r-tools">
          <div className="seg" title="Размер текста">
            <button type="button" onClick={() => setSize(Math.max(0, size - 1))} disabled={size === 0} aria-label="Меньше"><span style={{ fontSize: 12 }}>A</span></button>
            <button type="button" onClick={() => setSize(Math.min(SIZES.length - 1, size + 1))} disabled={size === SIZES.length - 1} aria-label="Больше"><span style={{ fontSize: 16 }}>A</span></button>
          </div>
          {p && <button className="btn ghost hide-xs" onClick={copy}>{copied ? 'Скопировано' : 'Копировать'}</button>}
          {d && <DownloadMenu d={d} id={id} p={p} body={body} />}
          <button className="btn ghost" disabled={!p?.prev} onClick={() => go(p?.prev)} title="Предыдущая (←)">‹</button>
          <button className="btn ghost" disabled={!p?.next && !!p} onClick={() => go(p ? p.next : d.toc[0]?.part)} title="Следующая (→)">›</button>
        </div>
      </div>

      <div className="r-body">
        <AnimatePresence initial={false}>
          {toc && (
            <motion.aside className="r-toc" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}>
              <label className="search" style={{ height: 36 }}><SearchIcon /><input value={tf} onChange={(e) => setTf(e.target.value)} placeholder="Статья, глава…" /></label>
              <nav className="toc">
                {items.map((t) => (
                  <a key={t.part} className={(sel === t.part ? 'on ' : '') + (/^Статья/.test(t.title) ? '' : 'grp')} onClick={() => go(t.part)} style={{ paddingLeft: 10 + Math.max(0, t.level - 1) * 12 }}>
                    {sel === t.part && <motion.span layoutId="toc-sel" className="sel" transition={spring} />}<span>{t.title}</span>
                  </a>
                ))}
                {!items.length && <div className="c3" style={{ padding: 10, fontSize: 13 }}>Ничего не найдено</div>}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        <article ref={ref} className="r-page" style={{ '--rs': SIZES[size] + 'px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={sel || 'head'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={soft}>
              {!sel ? (
                <>
                  <h1 className="r-h1">{d.title}</h1>
                  <Header text={d.headerMd || d.header} />
                  {d.toc[0] && <button className="btn pri" style={{ marginTop: 28 }} onClick={() => go(d.toc.find((t) => /^Статья/.test(t.title))?.part || d.toc[0].part)}>Начать чтение →</button>}
                </>
              ) : part.loading || !p ? <Skeleton n={4} /> : part.error ? <ErrorBox error={part.error} /> : (
                <>
                  <h1 className="r-h1">{p.title.replace(/^[А-ЯЁ]{2,4} РФ\s+/, '')}</h1>
                  <div className="r-text">
                    {body.map((b, i) => b.t === 'note' ? <RichText as="p" key={i} className="r-note">{b.s}</RichText>
                      : b.t === 'item' ? <p key={i} className="r-item"><span className="r-n">{b.n}</span><RichText>{b.s}</RichText></p>
                        : <RichText as="p" key={i}>{b.s}</RichText>)}
                  </div>
                  <div className="r-nav">
                    {p.prev ? <button className="r-navb" onClick={() => go(p.prev)}><span className="c3">← Предыдущая</span>{d.toc.find((t) => t.part === p.prev)?.title}</button> : <span />}
                    {p.next && <button className="r-navb" style={{ textAlign: 'right' }} onClick={() => go(p.next)}><span className="c3">Следующая →</span>{d.toc.find((t) => t.part === p.next)?.title}</button>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </article>
      </div>
    </div>
  );
}

// Меню «Скачать»: эта статья или весь документ — Word, PDF или TXT.
function DownloadMenu({ d, id, p, body }) {
  const [open, setOpen] = useState(false);
  const [prog, setProg] = useState(null); // { done, total, fmt, label } — идёт загрузка всего документа
  const [ready, setReady] = useState(null); // формат готового файла — показываем «Готово»
  const stop = useRef(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off); return () => document.removeEventListener('mousedown', off);
  }, [open]);

  const one = () => [{ h: p.title, paras: body.map((b) => plain(b.t === 'item' ? `${b.n} ${b.s}` : b.s)) }];
  const say = (fmt) => { setReady(fmt); setTimeout(() => setReady(null), 4500); };
  const finish = (fmt, title, sections, win) => {
    say(fmt);
    if (fmt === 'docx') { saveDocx(title, sections); donePrintWindow(win, title + '.docx'); }
    else if (fmt === 'txt') { saveTxt(title, sections); donePrintWindow(win, title + '.txt'); }
    else if (!fillPrintWindow(win, title, sections)) alert('Разрешите всплывающие окна для сайта, чтобы сохранить PDF.');
  };
  const get = (fmt, whole) => {
    setOpen(false);
    const win = fmt === 'pdf' || whole ? openPrintWindow(whole ? d.title : `${d.title} — ${p.title}`, fmt) : null; // вкладка подготовки — для PDF и для всего документа
    if (!whole) { finish(fmt, `${d.title} — ${p.title}`, one(), win); return; }
    setReady(null);
    stop.current = false;
    const parts = d.toc.filter((t) => t.part);
    const sections = new Array(parts.length);
    let next = 0, done = 0;
    setProg({ done: 0, total: parts.length, fmt, label: '' });
    if (win) progressPrintWindow(win, 0, parts.length, '');
    const worker = async () => {
      while (!stop.current && next < parts.length) {
        if (win && win.closed) { stop.current = true; break; } // закрыли окно — отмена
        const i = next++;
        try {
          const r = await api(`/v1/law/doc/${id}/part/${parts[i].part}`);
          sections[i] = { h: parts[i].title, paras: blocks(r.md || r.text, r.title).map((b) => plain(b.t === 'item' ? `${b.n} ${b.s}` : b.s)) };
        } catch { sections[i] = { h: parts[i].title, paras: ['(текст этой части не удалось загрузить)'] }; }
        done += 1; setProg({ done, total: parts.length, fmt, label: parts[i].title }); if (win) progressPrintWindow(win, done, parts.length, parts[i].title);
      }
    };
    Promise.all(Array.from({ length: 6 }, worker)).then(() => {
      setProg(null);
      if (stop.current) { win?.close(); return; }
      finish(fmt, d.title, sections.filter(Boolean), win);
    });
  };
  const fmts = [['docx', 'Word (.docx)'], ['pdf', 'PDF'], ['txt', 'Текст (.txt)']];
  return (
    <div className="dl" ref={box}>
      {prog ? (
        <button className="btn ghost dl-busy" onClick={() => { stop.current = true; }} title="Отменить"><span className="dl-spin" />Готовим {Math.round((prog.done / prog.total) * 100)}% · отмена</button>
      ) : (
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>Скачать ▾</button>
      )}
      {(prog || ready) && createPortal(
        <div className="dl-toast" role="status" aria-live="polite">
          {prog ? (
            <>
              <div className="dl-t"><span className="dl-spin big" />Начали готовить документ</div>
              <div className="dl-s">{d.title} · {{ docx: 'Word', pdf: 'PDF', txt: 'TXT' }[prog.fmt]}</div>
              <div className="dl-bar"><i style={{ width: Math.max(3, Math.round((prog.done / prog.total) * 100)) + '%' }} /></div>
              <div className="dl-row"><span>загружено {prog.done} из {prog.total}</span><span>{Math.round((prog.done / prog.total) * 100)}%</span></div>
              {prog.label && <div className="dl-cur">{prog.label}</div>}
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => { stop.current = true; }}>Отменить</button>
            </>
          ) : (
            <div className="dl-t"><span className="dl-ok">✓</span>{ready === 'pdf' ? 'Готово — откроется окно печати' : 'Готово — файл скачан'}</div>
          )}
        </div>, document.body)}
      {open && (
        <div className="dl-menu">
          {p && <><div className="dl-h">Эта статья</div>{fmts.map(([f, t]) => <button key={'o' + f} className="menu-it" onClick={() => get(f, false)}>{t}</button>)}</>}
          <div className="dl-h">Весь документ <span className="c3">· {d.toc.filter((t) => t.part).length} частей</span></div>
          {fmts.map(([f, t]) => <button key={'w' + f} className="menu-it" onClick={() => get(f, true)}>{t}</button>)}
        </div>
      )}
    </div>
  );
}

// Страница поиска: выдача по разделам (арбитраж, суды, законы, публикации), карточки, справка ИИ.
import { useEffect, useMemo, useRef, useState } from 'react';
import SearchBox, { intentOf } from './SearchBox.jsx';
import Face from './Face.jsx';
import Tour, { tourSeen } from './Tour.jsx';
import { Icon } from './icons.jsx';
import { Mic, Paperclip, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiStream, api, fmt } from './api.js';
import Mascot from './Mascot.jsx';
import { react } from './react.js';
import { DropCatcher, ReadingTalk, DoneTalk } from './DocPlay.jsx';
import FileThumb from './FileThumb.jsx';
import ModelPick, { useModel } from './ModelPick.jsx';
import GhostMini from './GhostMini.jsx';
import { WideThinking } from './ThinkingPill.jsx';
import { ChartCard, CountUp, Empty, ErrorBox, HBars, KindPill, LineChart, List, Loading, Pending, Row, Segmented, Skeleton, fadeUp, kinds, spring, useAsync } from './ui.jsx';
import { ArbitrCase, CourtCase, Jurisdiction } from './panels.jsx';
import Reader from './Reader.jsx';
import { RichText } from './lawlinks.jsx';
import CourtPicker, { lastCourt, rememberCourt } from './CourtPicker.jsx';
import { useAccount } from './account.jsx';

// Единая страница сервиса. Состояние живёт в адресе (#/app?q=&s=&o=), поэтому
// «Назад» в браузере и ссылки работают: о= — что раскрыто (дело, закон, суд).
const SCOPES = [['all', 'Всё'], ['arbitr', 'Арбитраж'], ['courts', 'Суды'], ['law', 'Законы']];

export function readState() {
  const [, qs = ''] = location.hash.split('?');
  const p = new URLSearchParams(qs);
  let def = 'all';
  try { def = JSON.parse(localStorage.getItem('kbScope')) || 'all'; } catch { /* нет хранилища */ }
  return { q: p.get('q') || '', s: p.get('s') || def, o: p.get('o') || '' };
}
function writeState(st, push = true) {
  const p = new URLSearchParams(Object.entries(st).filter(([, v]) => v && v !== 'all'));
  const url = location.pathname + location.search + '#/app' + (p.size ? '?' + p : '');
  push ? history.pushState(null, '', url) : history.replaceState(null, '', url);
}

// Что за запрос: ИНН/ОГРН, номер арбитражного дела или свободный текст.
export function classify(q) {
  const d = q.replace(/\s/g, '');
  if (/^\d{10}$|^\d{12}$|^\d{13}$|^\d{15}$/.test(d)) return { kind: 'company', id: d };
  if (/^[AА]\d{2,3}-\d+\/\d{4}$/i.test(d)) return { kind: 'case', number: d.replace(/^A/i, 'А') };
  return { kind: 'text' };
}

// Недавние запросы: последние 8, только в этом браузере.
const RECENT = 'kb-recent';
const recentGet = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
const recentAdd = (q) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...recentGet().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8))); } catch { /* приватный режим */ }
};
const recentClear = () => { try { localStorage.removeItem(RECENT); } catch { /* приватный режим */ } };

const names = (a) => (a || []).map((p) => p.name).join(', ');

export default function Service() {
  const { user } = useAccount();
  const [st, setSt] = useState(readState);
  const [input, setInput] = useState(st.q);
  const [busy, setBusy] = useState(false);
  const dir = useRef(0), prevScope = useRef(st.s);
  const si = SCOPES.findIndex(([v]) => v === st.s);
  if (prevScope.current !== st.s) { dir.current = si - SCOPES.findIndex(([v]) => v === prevScope.current) > 0 ? 1 : -1; prevScope.current = st.s; }
  const [tour, setTour] = useState(false);
  useEffect(() => { if (!tourSeen()) { const t = setTimeout(() => setTour(true), 1200); return () => clearTimeout(t); } return undefined; }, []);
  const [doc, setDoc] = useState(null); // загруженный документ: { st, name, img, data, error }
  const [att, setAtt] = useState([]); // прикреплённые документы — уходят вместе с вопросом по «Найти»
  const attach = (fs) => {
    const ok = [], bad = [];
    fs.forEach((f) => (f.size > 10 * 1024 * 1024 ? bad.push(f.name) : ok.push(f)));
    setAtt((a) => [...a, ...ok].slice(0, 5));
    if (ok.length) react('chomp');
    if (bad.length) setDoc({ st: 'error', names: bad, error: 'Больше 10 МБ: ' + bad.join(', ') });
    else if (att.length + ok.length > 5) setDoc({ st: 'error', names: [], error: 'Не больше 5 документов за раз — лишние не добавлены' });
  };
  const readFiles = async (fs, q) => {
    const names = fs.map((f) => f.name || 'фото');
    const imgs = fs.map((f) => (f.type.startsWith('image/') ? (f._url || URL.createObjectURL(f)) : ''));
    setDoc({ st: 'loading', names, imgs, q });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fd = new FormData();
    fs.forEach((f) => fd.append('file', f, f.name || 'photo.png'));
    if (q) fd.append('q', q);
    try {
      const r = await fetch('/v1/answer/file?' + new URLSearchParams({ q: 'file:' + names.join('|') + ':' + fs.reduce((n, f) => n + f.size, 0) }), { method: 'POST', body: fd });
      const b = await r.json().catch(() => ({}));
      if (r.status === 401) { window.dispatchEvent(new Event('lex:401')); setDoc(null); return; }
      if (r.status === 402) { window.dispatchEvent(new Event('lex:402')); setDoc(null); return; }
      if (!r.ok) throw new Error(b.error || 'Не удалось прочитать документы');
      window.dispatchEvent(new Event('lex:charged'));
      setDoc({ st: 'done', names, imgs, q, data: b });
      const next = b.case || b.query;
      if (next) { setInput(next); nav({ q: next, o: '' }); }
    } catch (e) { setDoc({ st: 'error', names, imgs, error: e.message }); }
  };
  const find = (q) => { if (att.length) { const fs = att; setAtt([]); readFiles(fs, q); return; } setDoc(null); setBusy(true); setTimeout(() => setBusy(false), 1400); nav({ q, o: '' }); };
  useEffect(() => {
    const home = () => { setInput(''); };
    window.addEventListener('kb:home', home);
    return () => window.removeEventListener('kb:home', home);
  }, []);
  useEffect(() => {
    const h = () => { const n = readState(); setSt(n); setInput(n.q); };
    window.addEventListener('popstate', h); window.addEventListener('hashchange', h);
    return () => { window.removeEventListener('popstate', h); window.removeEventListener('hashchange', h); };
  }, []);
  const nav = (patch, push = true) => { const n = { ...st, ...patch }; if (patch.q !== undefined && n.q) recentAdd(n.q); setSt(n); writeState(n, push); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const open = (o) => nav({ o });
  const back = () => history.back();

  const submit = (e) => { e?.preventDefault(); nav({ q: input.trim(), o: '' }); };
  const crumbs = [st.q && { label: `«${st.q}»`, go: () => nav({ o: '' }) }, st.o && { label: { case: 'Дело', law: 'Документ', court: 'Заседания', cc: 'Дело СОЮ', addr: 'Подсудность' }[st.o.split(':')[0]] }].filter(Boolean);

  const centered = !st.q && !st.o && st.s !== 'courts';
  const help = (
    <>
      <motion.button className="help-fab" onClick={() => setTour(true)} aria-label="Как пользоваться" title="Как пользоваться" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}>?</motion.button>
      <Tour open={tour} onClose={() => setTour(false)} />
    </>
  );
  const catcher = <DropCatcher onFiles={attach} />;
  if (centered && !doc) return <>{catcher}<Center input={input} setInput={setInput} find={find} readFile={attach} att={att} setAtt={setAtt} st={st} nav={nav} />{help}</>;
  return (
    <>
      {catcher}
      <div className={'svc-bar' + (st.o ? ' off' : '')}>
        <div className="svc-in">
          <motion.div layoutId="sbox" layout="position" transition={{ type: 'spring', stiffness: 520, damping: 42 }} style={{ flex: 1, minWidth: 0 }}>
            <SearchBox value={input} onChange={setInput} onSubmit={find} onFile={attach} files={att} onRemoveFile={(i) => setAtt((a) => a.filter((_, k) => k !== i))} recent={recentGet()} busy={busy || doc?.st === 'loading'} autoFocus={!st.q && !doc} size="md" />
          </motion.div>
        </div>
        <div className="svc-in" style={{ paddingTop: 0, justifyContent: 'space-between' }}>
          <motion.div layoutId="stabs" layout="position" transition={{ type: 'spring', stiffness: 520, damping: 42 }}><ScopeTabs value={st.s} onChange={(s) => nav({ s, o: '' }, false)} /></motion.div>
          <AnimatePresence>
            {crumbs.length > 1 && (
              <motion.nav className="crumbs" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <button className="btn ghost" onClick={back}>← Назад</button>
                {crumbs.map((c, i) => <span key={i}>{i > 0 && <span className="c3"> / </span>}{c.go ? <button className="btn link" onClick={c.go}>{c.label}</button> : <span>{c.label}</span>}</span>)}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 26 }}>
        {doc && !st.o && <DocCard doc={doc} onClose={() => setDoc(null)} find={(q) => { setInput(q); find(q); }} />}
        <AnimatePresence mode="wait">
          <motion.div key={(user?.id || '') + (st.o ? 'o:' + st.o.split(':').slice(0, 2).join(':') : 'r:' + st.s + st.q)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 } }} exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}>
            {st.o ? <Detail o={st.o} open={open} nav={nav} /> : st.s === 'courts' ? <CourtsScope open={open} q={st.q} /> : st.q ? <Results st={st} open={open} nav={nav} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
      {help}
    </>
  );
}

// ---------- старт: поиск по центру экрана ----------
function Center({ input, setInput, find, readFile, att, setAtt, st, nav }) {
  const [mood, setMood] = useState('idle');
  return (
    <section className="center">
      <div className="gridbg" /><div className="glow" />
      <div className="center-in">
        <LiveTitle mood={mood} input={input} />
        <motion.div layoutId="sbox" layout="position" transition={{ type: 'spring', stiffness: 520, damping: 42 }} style={{ width: '100%' }}>
          <SearchBox value={input} onChange={setInput} onSubmit={(q) => { setMood('happy'); setTimeout(() => find(q), 380); }} onFile={readFile} files={att} onRemoveFile={(i) => setAtt((a) => a.filter((_, k) => k !== i))} onMood={(m) => setMood((o) => (o === 'happy' ? o : m))} recent={recentGet()} autoFocus />

        </motion.div>
        <div className="c3 center-tip"><span><Mic size={14} strokeWidth={1.75} />Скажите голосом</span><span className="dot">·</span><span><Paperclip size={14} strokeWidth={1.75} />прикрепите фото, PDF или Word — ИИ прочитает и найдёт практику</span></div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <motion.div layoutId="stabs" layout="position" transition={{ type: 'spring', stiffness: 520, damping: 42 }}><ScopeTabs value={st.s} onChange={(s) => nav({ s }, false)} /></motion.div>
        </div>
        <div style={{ marginTop: 56, width: '100%' }}><Start nav={nav} setInput={setInput} /></div>
      </div>
    </section>
  );
}

function Start({ nav, setInput }) {
  const [rec, setRec] = useState(recentGet);
  const ex = [
    ['7707083893', 'Профиль компании по ИНН', 'ПАО Сбербанк'],
    ['А40-1/2026', 'Карточка дела по номеру', 'Арбитражный суд г. Москвы'],
    ['ст. 330 ГК', 'Статья кодекса', 'Текст статьи сразу в выдаче'],
    ['159', 'Несколько толкований', 'Закон № 159-ФЗ и статьи 159 кодексов'],
  ];
  return (
    <>
      {rec.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="sect"><span className="eyebrow">Недавние запросы</span><button className="btn link" style={{ fontSize: 12.5 }} onClick={() => { recentClear(); setRec([]); }}>Очистить</button></div>
          <div className="chips" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
            {rec.map((q) => <button key={q} className="chip" onClick={() => { setInput(q); nav({ q, o: '' }); }}>{q}</button>)}
          </div>
        </div>
      )}
      <div className="eyebrow" style={{ marginBottom: 12 }}>С чего начать</div>
      <div className="cols4">
        {ex.map(([q, t, d, s], i) => (
          <motion.button key={t} className="spot tile" variants={fadeUp} custom={i} initial="hidden" animate="show" whileHover={{ y: -2 }}
            onClick={() => { setInput(q); nav({ q, s: s || 'all', o: '' }); }}>
            <div className="mono c3" style={{ fontSize: 12 }}>{q || 'суды'}</div>
            <div style={{ fontWeight: 600, fontSize: 16, margin: '26px 0 4px', letterSpacing: '-.02em' }}>{t} →</div>
            <div className="c2" style={{ fontSize: 13.5 }}>{d}</div>
          </motion.button>
        ))}
      </div>
    </>
  );
}

// ---------- выдача: сервер понимает запрос и отдаёт несколько ответов ----------
function Results({ st, open, nav }) {
  if (st.s === 'arbitr') return <ArbList q={st.q} kind={classify(st.q).kind} open={open} wide />;
  if (st.s === 'law') return <LawList q={st.q} open={open} wide />;
  return <Answers q={st.q} open={open} nav={nav} />;
}

const AI_KINDS = { L: 'laws', A: 'articles', P: 'published', D: 'drafts' };

// Краткая справка ИИ над выдачей: опирается только на найденные материалы, метки [L2] превращаются в ссылки.
function AiBrief({ ai, answers, open }) {
  if (ai === false) return null;
  if (ai === null) return <WideThinking text="Буквоед читает найденное" h={46} />;
  // K — ключевые нормы: отдельные карточки статей над документами
  const find = (lab, n) => (lab === 'K'
    ? answers.filter((a) => a.type === 'article' && a.title.startsWith('Ключевая норма'))[n - 1]?.data
    : answers.find((a) => a.type === AI_KINDS[lab])?.data?.[n - 1]);
  const parts = ai.summary.split(/(\[[LAPDK]\d+\])/g);
  const go = (lab, n) => {
    const x = find(lab, n); if (!x) return;
    if (lab === 'K') open('law:' + x.part.id + ':' + x.part.part);
    else if (lab === 'L') open('law:' + x.id + (x.part ? ':' + x.part : ''));
    else if (x.url) window.open(x.url, '_blank', 'noopener');
  };
  return (
    <motion.div className="ai-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="ai-h"><Sparkles size={15} />Кратко<span style={{ marginLeft: 'auto' }}><ModelPick compact /></span></div>
      <p className="ai-t">{parts.map((t, i) => {
        const m = /^\[([LAPDK])(\d+)\]$/.exec(t);
        if (!m) return t;
        const x = find(m[1], +m[2]);
        return x ? <button key={i} className="ai-ref" title={x.title || x.part?.title} onClick={() => go(m[1], +m[2])}>{m[1] === 'K' ? 'ст. ' + (/Статья\s+(\d+(?:\.\d+)?)/.exec(x.part?.title || '')?.[1] || m[2]) : m[1] === 'L' ? (x.number ? '№ ' + x.number : 'документ ' + m[2]) : m[1] === 'A' ? 'публикация ' + m[2] : 'акт ' + m[2]}</button> : null;
      })}</p>
      {ai.cites?.length > 0 && (
        <div className="ai-cites">
          <span className="eyebrow">Нормы из справки</span>
          {ai.cites.map((c) => (
            <a key={c.ref} href={'#/app?q=' + encodeURIComponent(c.ref)} className={'ai-cite' + (c.verified ? '' : ' bad')} title={c.verified ? 'Норма найдена — открыть' : 'Такой нормы не нашлось — проверьте ссылку'}>
              <b>{c.verified ? '✓' : '?'}</b>{c.ref}{c.verified && c.title ? <span className="c3"> — {c.title.replace(/^Статья\s+[\d.]+\.\s*/, '')}</span> : !c.verified && <span> — не подтверждена</span>}
            </a>
          ))}
        </div>
      )}
      <div className="c3 ai-n">Справка составлена ИИ по найденным материалам, нормы сверены с текстами закона — всё равно проверяйте по документам.</div>
    </motion.div>
  );
}

// «кто ты», «буквоед», «привет» — Буквоед представляется (без запроса к базам и без списания)
const WHO = /^(кто ты|ты кто|буквоед|привет|здравствуй(те)?)[?!. ]*$/i;
function Hello() {
  return (
    <motion.div className="hello" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Face size={120} />
      <div>
        <div className="eyebrow">Это я</div>
        <h2>Привет! Я Буквоед</h2>
        <p className="c2">Читаю законы до последней буквы, знаю все падежи и не обижаюсь на опечатки. Найду дело по номеру, компанию по ИНН, статью кодекса или ответ на вопрос обычными словами.</p>
        <div className="alt-chips">{['ст. 330 ГК', '7707083893', 'неустойка по договору поставки'].map((x) => <a key={x} className="alt-chip" href={'#/app?q=' + encodeURIComponent(x)}>{x}</a>)}</div>
      </div>
    </motion.div>
  );
}

// ничего не нашлось: отдельные слова запроса как запасные варианты
function Alternatives({ q }) {
  const words = q.replace(/[«»"]/g, '').split(/\s+/).filter((w) => w.length >= 5).slice(0, 3);
  const alts = [...new Set([...(words.length > 1 ? words : []), q.split(/\s+/).slice(0, 2).join(' ')])].filter((x) => x && x !== q).slice(0, 4);
  if (!alts.length) return null;
  return <div className="alt-chips" style={{ marginTop: 10 }}><span className="c3" style={{ fontSize: 12.5 }}>Поискать отдельно:</span>{alts.map((x) => <a key={x} className="alt-chip" href={'#/app?q=' + encodeURIComponent(x)}>{x}</a>)}</div>;
}

// Ответы и справки ИИ помним 10 минут: вернулись из документа в выдачу — ничего не пересчитываем и не списываем.
const memoAns = new Map();
const memoAi = new Map();
const fresh = (m, k) => { const e = m.get(k); return e && Date.now() - e.t < 600000 ? e : null; };

function Answers({ q, open, nav }) {
  const s = useAsync();
  const [part, setPart] = useState(null); // блоки, пришедшие до конца ответа
  const [model] = useModel();
  const [ai, setAi] = useState(false);
  useEffect(() => {
    const r = s.data;
    if (!r || !r.answers.some((a) => ['laws', 'articles', 'published', 'drafts', 'company'].includes(a.type))) { setAi(false); return undefined; }
    let dead = false;
    const mk = q + '|' + model;
    const mem = fresh(memoAi, mk);
    if (mem) { setAi(mem.v); return undefined; }
    setAi(null);
    api('/v1/answer/ai', { q, model }).then((x) => { const v = x?.enabled && x.summary ? x : false; memoAi.set(mk, { v, t: Date.now() }); if (!dead) setAi(v); }, () => { if (!dead) setAi(false); });
    return () => { dead = true; };
  }, [s.data, q, model]); // eslint-disable-line react-hooks/exhaustive-deps
  const hello = WHO.test(q.trim());
  // вкладка в фоне: «Ищем…», по готовности — «Ответ готов», пока не вернётесь
  useEffect(() => {
    if (hello) return undefined;
    if (s.loading) { document.title = 'Ищем… — KadBest'; return undefined; }
    if (!s.data) return undefined;
    react('jump');
    if (!document.hidden) { document.title = 'Поиск — KadBest'; return undefined; }
    document.title = 'Ответ готов — KadBest';
    const back = () => { if (!document.hidden) { document.title = 'Поиск — KadBest'; document.removeEventListener('visibilitychange', back); } };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [s.loading, s.data, hello]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (WHO.test(q.trim())) return;
    const hit = fresh(memoAns, q);
    setPart(null);
    const onEv = (ev, d) => {
      if (ev === 'intents') setPart({ q, intents: d, answers: [] });
      else if (ev === 'answer') setPart((p) => (p && p.q === q ? { ...p, answers: [...p.answers, d] } : p));
    };
    s.run((sig) => (hit ? Promise.resolve(hit.v) : apiStream('/v1/answer/stream', { q }, sig, onEv).then((v) => { memoAns.set(q, { v, t: Date.now() }); return v; }))).then((r) => {
      const c = r?.answers?.find((x) => x.type === 'case');
      if (c && r.answers.length === 1) nav({ o: 'case:' + (c.data.guid || c.data.card?.guid) }, false); // номер дела — сразу в карточку
    });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (hello) return <Hello />;
  if (s.error) return <ErrorBox error={s.error} />;
  const streaming = s.loading && part && part.q === q && part.answers.length > 0;
  if ((s.loading || !s.data) && !streaming) return <Pending n={5} stages={[[0, 'Разбираем запрос…'], [2, 'Ищем в законах и судебных делах…'], [6, 'Собираем ответы из нескольких источников…'], [15, 'Источники отвечают медленно, ещё немного…']]} />;
  const r = streaming ? part : s.data;
  const multi = r.intents.length > 1;
  return (
    <>
      {!(r.intents.length === 1 && r.intents[0].note === 'Поиск по тексту') && <motion.div className="intents" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="eyebrow">{multi ? 'Возможные толкования' : 'Поняли запрос как'}</span>
        {r.intents.map((i, k) => <span key={k} className="pill">{i.note}</span>)}
        {r.intents[0]?.orig && <a className="asis" href={'#/app?q=' + encodeURIComponent('!' + r.intents[0].orig)}>Искать как написано: «{r.intents[0].orig}»</a>}
      </motion.div>}
      {!r.answers.length ? <div className="list"><div className="mascot-empty"><Mascot size={84} label="Буквоед ничего не нашёл" /><div><b>Буквоед ничего не нашёл</b><div className="c2">Попробуйте другие слова, номер дела, ИНН или «ст. 330 ГК».</div><Alternatives q={q} /></div></div></div> : (
        <div className="answers">
          <SectionNav answers={r.answers} ai={ai} />
          {streaming && <WideThinking text="Догружаем остальные разделы" h={40} />}
          <div id="ans-ai"><AiBrief ai={ai} answers={r.answers} open={open} /></div>
          {(() => {
            const keys = r.answers.filter(isKey);
            let keyDone = false;
            return r.answers.map((a, i) => {
              if (isKey(a)) {
                if (keyDone) return null;
                keyDone = true;
                return <KeyNorms key="keys" items={keys} open={open} i={i} />;
              }
              const o = ai && ai.order && ai.order[a.type];
              const b = o && o.length && Array.isArray(a.data) ? { ...a, data: [...o.map((k) => a.data[k]).filter(Boolean), ...a.data.filter((_, k) => !o.includes(k))], picked: o.length } : a;
              return <div key={a.type + i} id={'ans-' + a.type}><AnswerBlock a={b} i={i} open={open} /></div>;
            });
          })()}
        </div>
      )}
      {!streaming && s.data && (
        <div className="to-ai">
          {ai?.followups?.length > 0 && <div className="sugg"><span className="eyebrow">Спросите дальше в ИИ-чате</span>{ai.followups.map((x) => <a key={x} className="sugg-b" href={'#/ai?q=' + encodeURIComponent(x)}>{x}</a>)}</div>}
          <a className="to-ai-b" href={'#/ai?q=' + encodeURIComponent(q)}><GhostMini size={30} /><span><b>Продолжить в ИИ-чате</b><small className="c3">Буквоед сам поищет по базе и в интернете и ответит со ссылками</small></span><span className="to-ai-go">→</span></a>
        </div>
      )}
    </>
  );
}

function AnswerBlock({ a, i, open }) {
  // какой результат открыли и на каком месте он стоял — для настройки ранжирования (без данных пользователя)
  const logClick = (e) => {
    const row = e.target.closest('.row, tr.c, .ai-cite');
    if (!row) return;
    const rows = [...e.currentTarget.querySelectorAll('.row, tr.c')];
    const q = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
    if (!q) return;
    const body = JSON.stringify({ q, type: a.type, pos: Math.max(0, rows.indexOf(row)), item: (row.innerText || '').split('\n').find((l) => l.trim().length > 12) || '' });
    try { navigator.sendBeacon('/v1/click', new Blob([body], { type: 'application/json' })); } catch { /* не важно */ }
  };
  const wrap = (children, cls = '') => (
    <motion.section className={'ans ' + cls} variants={fadeUp} custom={i} initial="hidden" animate="show" onClickCapture={logClick}>{children}</motion.section>
  );
  const d = a.data;
  switch (a.type) {
    case 'law':
      return wrap(
        <div className="card spot lawhero">
          <div className="eyebrow">{a.title}</div>
          <h2>{(d.title || '').replace(/^"|"$/g, '')}</h2>
          {d.edition && <div className="c2" style={{ fontSize: 14 }}>{d.edition}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn pri" onClick={() => open('law:' + d.id)}>Читать →</button>
            <button className="btn sec" onClick={() => open('law:' + d.id + ':toc')}>Оглавление</button>
          </div>
        </div>,
      );
    case 'article': {
      const p = d.part;
      const lines = (p.md || p.text).replace(p.title, '').split('\n').map((l) => l.trim()).filter((l) => l && !/^(ст\.|КонсультантПлюс|>>>)/.test(l)).slice(0, 6);
      return wrap(
        <div className="card spot artcard">
          <div className="eyebrow">{a.title} · {d.doc.title}</div>
          <h2>{p.title.replace(/^[А-ЯЁ]{2,4} РФ\s+/, '')}</h2>
          <div className="artprev">{lines.map((l, k) => <RichText as="p" key={k}>{l}</RichText>)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn pri" onClick={() => open(`law:${p.id}:${p.part}`)}>Читать статью полностью →</button>
            <button className="btn sec" onClick={() => open(`law:${p.id}:toc`)}>Весь документ</button>
          </div>
        </div>,
      );
    }
    case 'company':
      return wrap(<><Company id={d.id} open={open} /><div style={{ marginTop: 24 }}><ArbList q={d.id} kind="company" open={open} wide /></div></>);
    case 'cases':
      return wrap(<><div className="sect"><span className="eyebrow">{a.title} · {fmt(d.total)}</span></div><CaseRows cases={d.cases} open={open} /></>);
    case 'laws':
      return wrap(
        <>
          <div className="sect"><span className="eyebrow">{a.title} · {d.length}</span></div>
          <LawRows items={d} open={open} />
        </>,
      );
    case 'articles':
      return wrap(<Articles a={a} open={open} />);
    case 'articles-old':
      return wrap(
        <>
          <div className="sect"><span className="eyebrow">{a.title} · {d.length}</span></div>
          <List>{d.map((x, k) => (
            <Row key={(x.doi || x.title) + k} i={k} onClick={x.url ? () => window.open(x.url, '_blank', 'noopener') : undefined} static={!x.url}>
              <div className="h" style={{ marginBottom: 2 }}>
                <span className="pill">{x.kind || (x.open ? 'Полный текст' : 'Статья')}</span>
                <span className="mono c3" style={{ fontSize: 12 }}>{[x.journal, x.year, x.pages && 'с. ' + x.pages].filter(Boolean).join(' · ')}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{x.title}</div>
              {x.authors?.length > 0 && <div className="c2" style={{ fontSize: 13 }}>{x.authors.slice(0, 3).join(', ')}{x.authors.length > 3 ? ' и др.' : ''}</div>}
              {x.abstract && <div className="c3 abstract">{x.abstract}</div>}
              {x.doi && <div className="mono c3" style={{ fontSize: 12, marginTop: 4 }}>DOI {x.doi}</div>}
            </Row>
          ))}</List>
        </>,
      );
    case 'published':
      return wrap(
        <>
          <div className="sect"><span className="eyebrow">{a.title} · {d.length}</span></div>
          <List>{d.map((x, k) => (
            <Row key={x.url + k} i={k} onClick={() => window.open(x.url, '_blank', 'noopener')}>
              <div className="h" style={{ marginBottom: 2 }}>
                <span className="pill">{x.kind || 'Акт'}</span>
                <span className="mono c3" style={{ fontSize: 12 }}>{[x.number && '№ ' + x.number, x.date, x.published && 'опубл. ' + x.published].filter(Boolean).join(' · ')}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{x.title}</div>
            </Row>
          ))}</List>
        </>,
      );
    case 'hearings':
      return wrap(
        <>
          <div className="sect"><span className="eyebrow">{a.title} · {d.items.length}</span></div>
          {!d.items.length ? <div className="list"><Empty>На эту дату заседаний не назначено.</Empty></div> : (
            <List>{d.items.slice(0, 40).map((h, k) => (
              <Row key={h.caseUid + k} i={k} onClick={() => open('cc:' + btoa(JSON.stringify({ court: d.court, caseId: h.caseId, caseUid: h.caseUid, deloId: h.deloId })))}>
                <div className="h" style={{ marginBottom: 2 }}>
                  <span className="pill blue">{h.time || 'время не указано'}</span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--blue)' }}>{h.number}</span>
                  {h.judge && <span className="c3" style={{ fontSize: 12.5 }}>{h.judge}</span>}
                </div>
                <div style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{h.info}</div>
              </Row>
            ))}</List>
          )}
          {d.items.length > 40 && <button className="btn sec" style={{ marginTop: 10 }} onClick={() => { location.hash = '#/app?s=courts'; }}>Все {d.items.length} заседаний в разделе «Суды» →</button>}
        </>,
      );
    case 'drafts':
      return wrap(
        <>
          <div className="sect"><span className="eyebrow">{a.title} · {d.length}</span></div>
          <List>{d.map((x, k) => (
            <Row key={x.url + k} i={k} onClick={() => window.open(x.url, '_blank', 'noopener')}>
              <div className="h" style={{ marginBottom: 2 }}>
                <span className="pill">{x.status || 'Проект'}</span>
                <span className="mono c3" style={{ fontSize: 12 }}>{[x.department, x.discussionTo && 'до ' + x.discussionTo].filter(Boolean).join(' · ')}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{x.title}</div>
            </Row>
          ))}</List>
        </>,
      );
    case 'chat':
      return wrap(
        <div className="ai-card chat-card">
          <div className="ai-h"><Sparkles size={15} />Ответ</div>
          {String(d.text).split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l, k) => {
            const li = /^([-*•]|\d+[.)])\s+/.test(l);
            const body = l.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/^#+\s*/, '').split(/(\*\*[^*]+\*\*)/g)
              .map((t, j) => (/^\*\*[^*]+\*\*$/.test(t) ? <b key={j}>{t.slice(2, -2)}</b> : t));
            return (
              <motion.p key={k} className={'ai-t' + (li ? ' ai-li' : '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.05 }}>{body}</motion.p>
            );
          })}
          <div className="c3 ai-n">Это общий вопрос, поэтому отвечает ИИ без поиска по судам и законам. Для правового вопроса уточните запрос, например «неустойка по договору поставки» или «ст. 330 ГК».</div>
        </div>,
      );
    case 'hint':
      return wrap(
        <div className="card spot lawhero">
          <div className="eyebrow">{a.title}</div>
          <p style={{ margin: '8px 0 14px', fontSize: 15 }}>{d.text}</p>
          {d.action === 'courts' && <button className="btn pri" onClick={() => { location.hash = '#/app?s=courts' + (d.num ? '&q=' + encodeURIComponent(d.num) : ''); }}>{d.num ? `Найти ${d.num} в расписании →` : 'Открыть расписание судов →'}</button>}
        </div>,
      );
    case 'case':
      return wrap(<div className="card spot lawhero"><div className="eyebrow">{a.title}</div><h2 className="mono">{d.number}</h2>
        <button className="btn pri" style={{ marginTop: 12 }} onClick={() => open('case:' + (d.guid || d.card?.guid))}>Открыть дело →</button></div>);
    default:
      return null;
  }
}

function CaseRows({ cases, open }) {
  return (
    <List>
      {cases?.length ? cases.map((c, i) => (
        <Row key={c.guid} i={i} onClick={() => open('case:' + c.guid)}>
          <div className="h"><span className="num">{c.number}</span><KindPill kind={c.caseType} /><span className="mono c3" style={{ fontSize: 12 }}>{c.regDate}</span></div>
          <div className="c2" style={{ fontSize: 13, marginTop: 3 }}>{c.court}{c.judge ? ' · ' + c.judge : ''}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{names(c.plaintiffs) || '—'} <span className="c3">vs</span> {names(c.respondents) || '—'}</div>
        </Row>
      )) : <Empty>Дел не найдено</Empty>}
    </List>
  );
}

function LawRows({ items, open, limit = 12 }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  return (
    <>
      <List>{shown.length ? shown.map((h, i) => (
        <Row key={h.id + i} i={i} onClick={() => open('law:' + h.id + (h.part ? ':' + h.part : ''))}>
          {(h.kind || h.date) && <div className="h" style={{ marginBottom: 2 }}>{h.kind && <span className="pill">{h.kind}</span>}<span className="mono c3" style={{ fontSize: 12 }}>{[h.number && '№ ' + h.number, h.date].filter(Boolean).join(' · ')}</span></div>}
          <div style={{ fontWeight: 500, fontSize: 14 }}>{h.title}</div>
          <div className="c3" style={{ fontSize: 12.5 }}>{h.edition}</div>
          {h.available === false && <div className="lock-note" title="В будни с 20:00 до 24:00 по Москве, в выходные и праздники — в любое время">🕗 Может быть недоступен днём — открывается по расписанию</div>}
          {h.snippet && <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 2 }}>{h.part ? '→ ' : ''}{h.snippet}</div>}
        </Row>
      )) : <Empty>Ничего не найдено</Empty>}</List>
      {items.length > limit && !all && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setAll(true)}>Показать все {items.length} →</button>}
    </>
  );
}

function ArbList({ q, kind, open, wide }) {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const s = useAsync();
  const params = kind === 'company' ? { side: q.replace(/\s/g, '') } : { side: q };
  useEffect(() => { s.run((sig) => api('/v1/arbitr/search', { ...params, caseType: type, page }, sig)); }, [q, page, type]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = s.data;
  return (
    <div>
      <div className="sect">
        <span className="eyebrow">Судебные дела {r ? `· ${fmt(r.total)}` : ''}</span>
        {wide && <Segmented id="atype" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[['', 'Все'], ['A', 'Споры'], ['B', 'Банкротство']]} />}
      </div>
      {s.error ? <ErrorBox error={s.error} /> : s.loading ? <Pending n={5} stages={[[0, 'Ищем по арбитражным судам…'], [4, 'Собираем дела всех инстанций…'], [12, 'Картотека отвечает медленно, ждём…']]} /> : (
        <List key={page + type}>
          {r?.cases?.length ? r.cases.map((c, i) => (
            <Row key={c.guid} i={i} onClick={() => open('case:' + c.guid)}>
              <div className="h"><span className="num">{c.number}</span><KindPill kind={c.caseType} /><span className="mono c3" style={{ fontSize: 12 }}>{c.regDate}</span></div>
              <div className="c2" style={{ fontSize: 13, marginTop: 3 }}>{c.court}{c.judge ? ' · ' + c.judge : ''}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{names(c.plaintiffs) || '—'} <span className="c3">vs</span> {names(c.respondents) || '—'}</div>
            </Row>
          )) : <Empty>Дел не найдено</Empty>}
        </List>
      )}
      {r?.pages > 1 && (
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="mono c3" style={{ fontSize: 12 }}>стр. {r.page} / {r.pages}</span>
          <span><button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Назад</button><button className="btn ghost" disabled={page >= r.pages} onClick={() => setPage(page + 1)}>Далее →</button></span>
        </div>
      )}
    </div>
  );
}

function LawList({ q, open }) { // eslint-disable-line no-unused-vars
  const s = useAsync();
  useEffect(() => { s.run((sig) => api('/v1/law/search', { q }, sig)); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = (s.data?.items || []).filter((h) => h.id);
  return (
    <div>
      <div className="sect"><span className="eyebrow">Законодательство {s.data ? `· ${items.length}` : ''}</span></div>
      {s.error ? <ErrorBox error={s.error} /> : s.loading ? <Pending n={5} stages={[[0, 'Ищем в законодательстве…'], [3, 'Подбираем документы и редакции…'], [10, 'Большая выдача, ещё немного…']]} /> : (
        <List>{items.length ? items.slice(0, 30).map((h, i) => (
          <Row key={h.id + i} i={i} onClick={() => open('law:' + h.id)}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{h.title}</div>
            <div className="c3" style={{ fontSize: 12.5 }}>{h.edition}</div>
            {h.snippet && <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 2 }}>{h.snippet}</div>}
          </Row>
        )) : <Empty>Ничего не найдено</Empty>}</List>
      )}
    </div>
  );
}

// ---------- профиль компании (появляется сам, если ввели ИНН/ОГРН) ----------
const count = (arr, key) => { const m = new Map(); arr.forEach((x) => { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]); };
function Company({ id, open }) {
  const s = useAsync();
  useEffect(() => {
    s.run(async (sig) => {
      const first = await api('/v1/arbitr/search', { side: id, page: 1 }, sig);
      const rest = await Promise.all([2, 3, 4].filter((p) => p <= first.pages).map((p) => api('/v1/arbitr/search', { side: id, page: p }, sig).catch(() => ({ cases: [] }))));
      return { first, cases: [first, ...rest].flatMap((r) => r.cases) };
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useMemo(() => {
    if (!s.data?.cases.length) return null;
    const { cases, first } = s.data;
    const isMe = (x) => x.inn === id;
    const me = cases.flatMap((c) => [...(c.plaintiffs || []), ...(c.respondents || [])]).find(isMe);
    const mon = (d) => { const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(d || ''); return m ? `${m[3]}-${m[2]}` : ''; };
    const day = (d) => { const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(d || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
    let series = count(cases, (c) => mon(c.regDate)), unit = 'месяцам';
    if (series.length < 2) { series = count(cases, (c) => day(c.regDate)); unit = 'дням'; }
    return {
      name: me?.name || 'Компания', address: me?.address, first, cases,
      asPl: cases.filter((c) => (c.plaintiffs || []).some(isMe)).length, asRe: cases.filter((c) => (c.respondents || []).some(isMe)).length,
      byMonth: series.sort((x, y) => x[0].localeCompare(y[0])), unit,
      courts: count(cases, (c) => c.court), types: count(cases, (c) => kinds[c.caseType]?.[0]),
      counter: count(cases.flatMap((c) => [...(c.plaintiffs || []), ...(c.respondents || [])].filter((x) => !isMe(x))), (x) => x.name),
    };
  }, [s.data, id]);
  if (s.error) return <ErrorBox error={s.error} />;
  if (s.loading || !s.data) return <div className="card" style={{ padding: 22 }}><Loading stages={[[0, 'Строим профиль компании…'], [4, 'Анализируем последние дела…'], [10, 'Считаем контрагентов и суды…']]} /></div>;
  if (!a) return null;
  const pct = (n) => Math.round((n / a.cases.length) * 100);
  return (
    <motion.section initial="hidden" animate="show">
      <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
        <div className="eyebrow">Профиль компании · ИНН {id}</div>
        <h2 style={{ fontSize: 30, letterSpacing: '-.04em', margin: '6px 0 2px', lineHeight: 1.1 }}>{a.name}</h2>
        {a.address && <div className="c2" style={{ fontSize: 14 }}>{a.address}</div>}
      </motion.div>
      <div className="cols4">
        {[['Всего дел', a.first.total, ''], ['Истец', pct(a.asPl), '%', `${a.asPl} из ${a.cases.length} последних`], ['Ответчик', pct(a.asRe), '%', `${a.asRe} из ${a.cases.length} последних`], ['Банкротных', a.cases.filter((c) => c.caseType === 'B').length, '', 'в последних делах']].map(([l, v, suf, sub], i) => (
          <motion.div key={l} className="kpi spot" style={{ position: 'relative' }} variants={fadeUp} custom={i}>
            <div className="eyebrow">{l}</div><div className="v"><CountUp value={v} suffix={suf} /></div><div className="mono c3" style={{ fontSize: 12 }}>{sub}</div>
          </motion.div>
        ))}
      </div>
      <div className="cols3" style={{ marginTop: 16 }}>
        <ChartCard i={0} title="Динамика" sub={`Новые дела по ${a.unit}`}><LineChart rows={a.byMonth} /></ChartCard>
        <ChartCard i={1} title={a.courts[0] ? `Чаще всего — ${a.courts[0][0]}` : 'Суды'} sub={`${a.courts.length} судов`}><HBars rows={a.courts} n={5} /></ChartCard>
        <ChartCard i={2} title={a.counter[0] ? `Главный контрагент — ${a.counter[0][0]}` : 'Контрагенты'} sub="С кем судится чаще всего"><HBars rows={a.counter} n={5} /></ChartCard>
      </div>
    </motion.section>
  );
}

// ---------- суды общей юрисдикции ----------
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
function CourtsScope({ open, q }) {
  const [court, setCourt] = useState(lastCourt);
  const [date, setDate] = useState(today());
  const [flt, setFlt] = useState(q);
  const s = useAsync();
  const load = () => court && s.run((sig) => api('/v1/courts/hearings', { court: court.code, date: date.split('-').reverse().join('.') }, sig));
  useEffect(() => { load(); }, [court?.code, date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setFlt(q), [q]);
  const items = s.data?.items || [];
  const rows = items.filter((h) => !flt || (h.info + h.number + h.judge).toLowerCase().includes(flt.toLowerCase()));
  let sec = '';
  return (
    <>
      <div className="filters" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}><CourtPicker value={court} onChange={setCourt} /></div>
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ height: 46 }} />
        <button type="button" className="btn sec" style={{ height: 46 }} onClick={() => { const a = prompt('Адрес: город, улица, дом'); if (a) open('addr:' + a); }}>Суд по адресу</button>
      </div>
      {!court ? <div className="list"><Empty>Выберите суд — покажем заседания на выбранную дату.</Empty></div> : <>
      <div className="meta">
        <span className="eyebrow">{s.data ? `Заседания · ${rows.length}${flt ? ' из ' + items.length : ''}` : 'Заседания'}</span>
        <input className="field" value={flt} onChange={(e) => setFlt(e.target.value)} placeholder="Фильтр: фамилия, компания" style={{ width: 260, height: 34 }} />
      </div>
      {s.loading && <Loading compact stages={[[0, 'Связываемся с судом…'], [4, 'Загружаем расписание…'], [12, 'Сайт суда отвечает медленно…']]} />}
      {s.error ? <ErrorBox error={s.error} /> : (
        <div className="card spot tbl-scroll" style={{ overflow: 'auto' }}>
          <table>
            <thead><tr>{['Время', 'Дело', 'Существо и стороны', 'Судья'].map((h) => <th key={h} className="eyebrow" style={{ top: 0 }}>{h}</th>)}</tr></thead>
            <tbody>
              {s.loading ? <tr><td colSpan={4} style={{ padding: 0 }}><Skeleton n={3} /></td></tr> : !rows.length ? <tr><td colSpan={4}><Empty>Заседаний не найдено</Empty></td></tr> :
                rows.flatMap((h, i) => {
                  const out = [];
                  if (h.section !== sec) out.push(<tr key={'s' + i} className="s"><td colSpan={4}><span className="eyebrow">{(sec = h.section)}</span></td></tr>);
                  out.push(
                    <motion.tr key={h.caseUid + i} className="c" variants={fadeUp} custom={i} initial="hidden" animate="show"
                      onClick={() => open('cc:' + btoa(JSON.stringify({ court: court.code, caseId: h.caseId, caseUid: h.caseUid, deloId: h.deloId })))}>
                      <td className="mono">{h.time}</td><td className="num" style={{ color: 'var(--blue)' }}>{h.number}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{h.info}</td><td>{h.judge}</td>
                    </motion.tr>);
                  return out;
                })}
            </tbody>
          </table>
        </div>
      )}
      </>}
    </>
  );
}

// ---------- раскрытый объект ----------
function Detail({ o, open, nav }) {
  const [type, ...rest] = o.split(':');
  const id = rest.join(':');
  if (type === 'case') return <div className="detail"><ArbitrCase guid={id} /></div>;
  if (type === 'law') {
    const [doc, part = ''] = id.split(':');
    return <Reader id={doc} part={/^[0-9a-f]{40}$/.test(part) ? part : ''} article={part.startsWith('art') ? part.slice(3) : ''} showToc={part === 'toc'}
      onPart={(p) => nav({ o: `law:${doc}:${p}` }, false)} />;
  }
  if (type === 'lawref') return <LawRef id={id} nav={nav} />;
  if (type === 'cc') { const p = JSON.parse(atob(id)); return <div className="detail"><CourtCase court={p.court || p.site} params={p} /></div>; }
  if (type === 'addr') return (
    <div className="detail"><Jurisdiction address={id} onPick={(c) => { rememberCourt(c); nav({ s: 'courts', o: '', q: '' }); }} /></div>
  );
  return <Empty>Не найдено</Empty>;
}

// Ссылка на норму из текста дела: кодекс — по таблице, «N 127-ФЗ» — через умный поиск.
function LawRef({ id, nav }) {
  const [doc, art] = id.split(':');
  const s = useAsync();
  useEffect(() => {
    s.run(async (sig) => {
      if (!doc.startsWith('fz')) return doc;
      const r = await api('/v1/answer', { q: `${doc.slice(2)}-ФЗ` }, sig);
      return r.answers.find((a) => a.type === 'law')?.data?.id || null;
    }).then((d) => { if (d) nav({ o: `law:${d}${art ? ':art' + art : ''}` }, false); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (s.error) return <ErrorBox error={s.error} />;
  if (s.data === null) return <div className="list"><Empty>Документ не найден</Empty></div>;
  return <Loading stages={[[0, 'Открываем норму…'], [3, 'Ищем статью в документе…']]} />;
}

const isKey = (a) => a.type === 'article' && a.title.startsWith('Ключевая норма');
const SECT = { ai: 'Кратко', keys: 'Нормы', company: 'Компания', cases: 'Дела', laws: 'Документы', articles: 'Статьи', published: 'Опубликовано', drafts: 'Проекты' };

// Быстрые переходы по разделам ответа
function SectionNav({ answers, ai }) {
  const ids = [];
  if (ai) ids.push(['ai', 'ans-ai']);
  if (answers.some(isKey)) ids.push(['keys', 'ans-keys']);
  answers.forEach((a) => { if (SECT[a.type] && !ids.some(([k]) => k === a.type)) ids.push([a.type, 'ans-' + a.type]); });
  if (ids.length < 3) return null;
  return (
    <motion.nav className="snav" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
      {ids.map(([k, id], i) => (
        <motion.button key={k} type="button" className="snav-b" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {SECT[k]}
          {k !== 'ai' && k !== 'keys' && Array.isArray(answers.find((a) => a.type === k)?.data) && <span>{answers.find((a) => a.type === k).data.length}</span>}
        </motion.button>
      ))}
    </motion.nav>
  );
}

// Ключевые нормы — компактные карточки рядом, текст раскрывается по клику
function KeyNorms({ items, open, i }) {
  const [full, setFull] = useState(-1);
  return (
    <motion.section id="ans-keys" className="ans" variants={fadeUp} custom={i} initial="hidden" animate="show">
      <div className="sect"><span className="eyebrow">Ключевые нормы · {items.length}</span></div>
      <div className="keys">
        {items.map((a, k) => {
          const p = a.data.part;
          const lines = (p.md || p.text).replace(p.title, '').split('\n').map((l) => l.trim()).filter((l) => l && !/^(ст\.|КонсультантПлюс|>>>|\(в ред|\(см\.)/.test(l));
          const num = /Статья\s+(\d+(?:\.\d+)?)/.exec(p.title)?.[1];
          return (
            <motion.article key={p.part} layout className={'keyc' + (full === k ? ' on' : '')} whileHover={{ y: -2 }} transition={spring}>
              <div className="keyc-top"><span className="keyc-n">ст. {num}</span><span className="c3">{a.title.replace(/^Ключевая норма — ст\. [\d.]+ /, '')}</span></div>
              <h3>{p.title.replace(/^[А-ЯЁ]{2,4} РФ\s+/, '').replace(/^Статья\s+[\d.]+\.\s*/, '')}</h3>
              <div className={'keyc-t' + (full === k ? ' open' : '')}>{lines.slice(0, full === k ? 20 : 3).map((l, j) => <RichText as="p" key={j}>{l}</RichText>)}</div>
              <div className="keyc-act">
                {lines.length > 3 && <button className="btn link" onClick={() => setFull(full === k ? -1 : k)}>{full === k ? 'Свернуть' : 'Развернуть'}</button>}
                <button className="btn link" onClick={() => open(`law:${p.id}:${p.part}`)}>Открыть статью →</button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

// Статьи и публикации: сначала отобранные по смыслу, остальное — по кнопке
function Articles({ a }) {
  const d = a.data;
  const base = a.picked ? Math.min(Math.max(a.picked, 3), 8) : 6;
  const [all, setAll] = useState(false);
  const shown = all ? d : d.slice(0, base);
  return (
    <>
      <div className="sect"><span className="eyebrow">{a.title} · {d.length}</span>{a.picked ? <span className="pill green">по смыслу вопроса</span> : null}</div>
      <List>{shown.map((x, k) => (
        <Row key={(x.doi || x.title) + k} i={k} onClick={x.url ? () => window.open(x.url, '_blank', 'noopener') : undefined} static={!x.url}>
          <div className="h" style={{ marginBottom: 2 }}>
            <span className={'pill' + (x.open ? ' green' : '')}>{x.open ? 'Полный текст' : 'Статья'}</span>
            <span className="c3" style={{ fontSize: 12.5 }}>{[x.journal, x.year].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="art-t">{x.title}</div>
          {x.authors?.length > 0 && <div className="c2" style={{ fontSize: 13 }}>{x.authors.slice(0, 3).join(', ')}{x.authors.length > 3 ? ' и др.' : ''}</div>}
          {x.abstract && <div className="c3 abstract">{x.abstract}</div>}
        </Row>
      ))}</List>
      {d.length > base && <button className="btn ghost more-b" onClick={() => setAll(!all)}>{all ? 'Свернуть' : `Ещё ${d.length - base} публикаций`}</button>}
    </>
  );
}

const SCOPE_IC = { all: 'search', arbitr: 'arbitr', courts: 'courts', law: 'law' };
const SCOPE_TIPS = {
  all: 'Ищет везде сразу: компании, дела, законы и статьи. Сам поймёт, что вы ввели.',
  arbitr: 'Арбитражные дела по ИНН, названию компании или номеру дела (А40-…).',
  courts: 'Суды общей юрисдикции: расписание заседаний и подсудность по адресу.',
  law: 'Кодексы и законы: статьи, главы, действующие редакции.',
};
// Вкладки разделов поиска: подчёркивание переезжает к выбранной, при наведении — подсказка
function ScopeTabs({ value, onChange }) {
  const [tip, setTip] = useState(null);
  return (
    <div className="stabs" role="tablist" onMouseLeave={() => setTip(null)}>
      {SCOPES.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={v === value} className={'stab' + (v === value ? ' on' : '')} onClick={() => onChange(v)}
          onMouseEnter={() => setTip(v)} onFocus={() => setTip(v)} onBlur={() => setTip(null)} aria-describedby={tip === v ? 'stab-tip' : undefined}>
          <Icon name={SCOPE_IC[v]} size={16} className="stab-i" />{label}
          {v === value && <motion.span layoutId="stab-ul" className="stab-ul" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <AnimatePresence>
            {tip === v && (
              <motion.span id="stab-tip" role="tooltip" className="stab-tip" initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.16, delay: 0.25 }}>
                {SCOPE_TIPS[v]}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      ))}
    </div>
  );
}

// Разбор загруженного документа: что это, суть, ответ на вопрос; дальше — поиск практики по сути.
function DocCard({ doc, onClose, find }) {
  const d = doc.data;
  const names = doc.names || [doc.name];
  const many = names.length > 1;
  const ext = (n) => ((n || '').split('.').pop() || 'файл').slice(0, 4).toUpperCase();
  return (
    <motion.div className="ai-card doc-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="doc-head">
        <div className="doc-thumbs">
          {names.slice(0, 3).map((n, i) => <FileThumb key={i} name={n} src={doc.imgs?.[i]} size={44} />)}
          {names.length > 3 && <span className="fthumb more">+{names.length - 3}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ai-h" style={{ margin: 0 }}><Sparkles size={15} />{doc.st === 'loading' ? (many ? `Читаем документы · ${names.length}` : 'Читаем документ') : doc.st === 'error' ? 'Документы' : d.kind || 'Документ'}</div>
          <div style={{ fontWeight: 600, fontSize: 15.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d?.title || names.join(', ')}</div>
          {doc.q && <div className="c3" style={{ fontSize: 12.5, marginTop: 2 }}>Вопрос: {doc.q}</div>}
        </div>
        <button className="btn ghost" onClick={onClose} aria-label="Закрыть">✕</button>
      </div>
      {doc.st === 'loading' && <ReadingTalk names={names} />}
      {doc.st === 'loading' && <Loading compact stages={many
        ? [[0, 'Загружаем документы…'], [3, 'Буквоед читает каждый документ…'], [12, 'Сверяет суммы, даты и стороны между документами…'], [30, 'Документов много, ещё немного…']]
        : [[0, 'Загружаем файл…'], [2, 'Буквоед читает документ…'], [8, 'Разбирает стороны, суммы и требования…'], [20, 'Большой документ, ещё немного…']]} />}
      {doc.st === 'error' && <div className="err">{doc.error}</div>}
      {doc.st === 'done' && (
        <>
          <DoneTalk d={d} many={many} />
          {d.answer && <p className="ai-t" style={{ fontWeight: 500 }}>{d.answer}</p>}
          {d.summary && <p className={'ai-t' + (d.answer ? ' c2' : '')} style={d.answer ? { fontSize: 15, marginTop: 8 } : undefined}>{d.summary}</p>}
          {d.docs?.length > 0 && (
            <ol className="doc-list">
              {d.docs.map((x, i) => (
                <li key={i}><span className="doc-n mono">{i + 1}</span><div><div className="doc-li-h"><b>{x.title || x.name}</b><span className="pill">{x.kind}</span></div><div className="c2">{x.summary}</div><div className="c3 mono" style={{ fontSize: 11.5, marginTop: 2 }}>{x.name}</div></div></li>
              ))}
            </ol>
          )}
          <div className="doc-meta">
            {d.case && <button className="ai-ref" onClick={() => find(d.case)}>дело {d.case}</button>}
            {(d.parties || []).slice(0, 4).map((x) => <button key={x} className="ai-ref" onClick={() => find(/(?:^|\D)(\d{10}(?:\d{2})?)(?!\d)/.exec(x)?.[1] || x.replace(/,.*$/, ''))}>{x}</button>)}
          </div>
          {(d.case || d.query) && <div className="c3 ai-n">Ниже — {d.case ? 'дело и практика' : 'практика и нормы'} по запросу «{d.case || d.query}». Нажмите на сторону, чтобы проверить её дела.</div>}
        </>
      )}
    </motion.div>
  );
}

const IDLE_TITLES = ['Что ищем?', 'Чем помочь?', 'Спросите как есть', 'Найдём за секунды'];
const TYPING_TITLES = { 'ИНН — профиль компании': 'О, ИНН! Найду компанию', 'ОГРН — профиль компании': 'ОГРН — найду компанию', 'Арбитражное дело': 'Номер дела — открою карточку', 'Дело суда общей юрисдикции': 'Дело — подскажу, где искать', 'Статья закона': 'Статья — покажу текст', 'Статья — выберите кодекс': 'Какой кодекс?', 'Закон или акт': 'Найду закон', 'Вопрос — ответит ИИ': 'Хороший вопрос…' };

// Заголовок с мордочкой: меняется по набору, диктовке и поиску, буквы появляются волной.
// Если долго ничего не происходит — мордочка ждёт, потом гуляет, потом засыпает; движение мыши её будит.
const IDLE_MOOD_TITLES = { wait: 'Жду ваш вопрос…', walk: 'Прогуляюсь, пока думаете', sleep: 'Zzz… разбудите меня запросом', surprised: 'Ой! Я тут!' };

function useIdleMood(active) {
  const [m, setM] = useState('idle');
  const last = useRef(Date.now());
  const cur = useRef('idle');
  cur.current = m;
  useEffect(() => {
    if (!active) { setM('idle'); return undefined; }
    const wake = () => {
      last.current = Date.now();
      if (cur.current === 'sleep' || cur.current === 'walk') { setM('surprised'); setTimeout(() => setM('idle'), 1100); }
      else if (cur.current === 'wait') setM('idle');
    };
    const evs = ['pointermove', 'keydown', 'scroll', 'pointerdown'];
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    const t = setInterval(() => {
      const idle = (Date.now() - last.current) / 1000;
      if (cur.current === 'surprised') return;
      setM(idle > 40 ? 'sleep' : idle > 22 ? 'walk' : idle > 9 ? 'wait' : 'idle');
    }, 500);
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, wake)); };
  }, [active]);
  return m;
}

function LiveTitle({ mood: busyMood, input }) {
  const [k, setK] = useState(0);
  const idleMood = useIdleMood(busyMood === 'idle');
  const mood = busyMood === 'idle' ? idleMood : busyMood;
  useEffect(() => { if (mood !== 'idle') return undefined; const t = setInterval(() => setK((x) => (x + 1) % IDLE_TITLES.length), 3800); return () => clearInterval(t); }, [mood]);
  const text = IDLE_MOOD_TITLES[mood] || (mood === 'listening' ? 'Слушаю вас…' : mood === 'happy' ? 'Ищу!' : mood === 'thinking' ? 'Думаю…'
    : mood === 'typing' ? (TYPING_TITLES[intentOf(input)?.label] || 'Так-так…') : IDLE_TITLES[k]);
  // прогулка: уходит вправо, разворачивается, возвращается
  const [dir, setDir] = useState(1);
  useEffect(() => { if (mood !== 'walk') return undefined; const t = setInterval(() => setDir((d) => -d), 3000); return () => clearInterval(t); }, [mood]);
  return (
    <div className="live-title">
      <motion.div className="face-walk" animate={mood === 'walk' ? { x: dir > 0 ? 140 : -140 } : { x: 0 }} transition={mood === 'walk' ? { duration: 3, ease: 'easeInOut' } : { type: 'spring', stiffness: 160, damping: 18 }}>
        <Face mood={mood} size={84} dir={dir} />
      </motion.div>
      <h1 className={'center-h' + (text.length > 16 ? ' long' : '')} aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span key={text} style={{ display: 'inline-block' }} exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.15 } }}>
            {text.split(' ').map((w, wi, arr) => {
              const off = arr.slice(0, wi).join(' ').length + (wi ? 1 : 0);
              return (
                <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {[...w].map((ch, i) => (
                    <motion.span key={i} style={{ display: 'inline-block' }} initial={{ opacity: 0, y: 14, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22, delay: (off + i) * 0.022 }}>{ch}</motion.span>
                  ))}
                  {wi < arr.length - 1 && '\u00a0'}
                </span>
              );
            })}
          </motion.span>
        </AnimatePresence>
      </h1>
    </div>
  );
}

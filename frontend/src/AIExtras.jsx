// Дополнения ИИ-чата: меню «+» (файлы, умения, интернет, коннекторы), настройки размышления и усилия, голосовой ввод, текстовый статус работы, карточка документа, окно коннекторов.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings2, Check, ChevronRight, Download, ExternalLink, FileText, Globe, Paperclip, Plug, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { api } from './api.js';
import { Md } from './Md.jsx';

// Дополнения ИИ-чата: меню «+» (файлы, умения, интернет, коннекторы), настройки размышления,
// текстовый статус работы, карточка документа и окно коннекторов.

const EASE = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] };
const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } };

// уровни усилия (как у Claude): сколько шагов поиска и проверки
export const EFFORTS = [
  ['low', 'Низкое', 'Простые вопросы — быстро и экономно', 'Низк.'],
  ['medium', 'Среднее', 'Рутинные задачи', 'Сред.'],
  ['high', 'Высокое', 'Лучший баланс — по умолчанию', 'Выс.'],
  ['xhigh', 'Очень высокое', 'Сложные споры и документы', 'Оч. выс.'],
  ['max', 'Максимум', 'Самый тщательный поиск — дольше', 'Макс.'],
];
export const openAISettings = (tab) => window.dispatchEvent(new CustomEvent('kb:aisettings', { detail: tab || 'profile' }));

// настройки чата, общие для меню модели и «+»
export function useChatPrefs() {
  const [prefs, setPrefs] = useState(() => ({ think: read('kb.think', '1') === '1', effort: read('kb.effort', 'high'), web: read('kb.web', '1') === '1' }));
  useEffect(() => { const on = () => setPrefs({ think: read('kb.think', '1') === '1', effort: read('kb.effort', 'high'), web: read('kb.web', '1') === '1' }); window.addEventListener('kb:prefs', on); return () => window.removeEventListener('kb:prefs', on); }, []);
  const set = (k, v) => { write('kb.' + k, typeof v === 'boolean' ? (v ? '1' : '0') : v); window.dispatchEvent(new Event('kb:prefs')); };
  return [prefs, set];
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={'tgl' + (on ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onChange(!on); }}>
      <motion.i animate={{ x: on ? 15 : 0 }} initial={false} transition={{ type: 'spring', stiffness: 600, damping: 36 }} />
    </button>
  );
}

// блок настроек размышления — внизу меню модели
export function ThinkSettings() {
  const [p, set] = useChatPrefs();
  return (
    <div className="ts">
      <div className="ts-r">
        <span className="ts-t"><b>Размышление</b><small>Модель сначала думает — ответ точнее, ход мыслей виден</small></span>
        <Toggle on={p.think} onChange={(v) => set('think', v)} label="Размышление" />
      </div>
      <div className="ts-r">
        <span className="ts-t"><b>Усилие · {(EFFORTS.find((e) => e[0] === p.effort) || EFFORTS[2])[1]}</b><small>{(EFFORTS.find((e) => e[0] === p.effort) || EFFORTS[2])[2]}</small></span>
      </div>
      <div className="seg full sm" role="radiogroup" aria-label="Усилие">
        {EFFORTS.map(([k, , , l]) => (
          <button key={k} type="button" role="radio" aria-checked={p.effort === k} aria-selected={p.effort === k} onClick={() => set('effort', k)}>
            {p.effort === k && <motion.span layoutId="seg-effort" className="thumb" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
            <span>{l}</span>
          </button>
        ))}
      </div>
      <button type="button" className="ts-all" onClick={() => openAISettings('model')}>Все настройки ИИ →</button>
    </div>
  );
}

let skillCache = null;
export function useSkills() {
  const [list, setList] = useState(skillCache || []);
  useEffect(() => { if (!skillCache) api('/v1/skills').then((r) => { skillCache = r.skills; setList(r.skills); }, () => {}); }, []);
  return list;
}

// меню «+»: файлы, умения, интернет, коннекторы
export function PlusMenu({ onFiles, skill, setSkill, onConnectors }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState('');
  const [p, set] = useChatPrefs();
  const skills = useSkills();
  const [cons, setCons] = useState(null);
  const box = useRef(null);
  useEffect(() => { const on = (e) => { if (e.detail !== 'plus') setOpen(false); }; window.addEventListener('kb:pop', on); return () => window.removeEventListener('kb:pop', on); }, []);
  useEffect(() => { if (open) window.dispatchEvent(new CustomEvent('kb:pop', { detail: 'plus' })); }, [open]);
  useEffect(() => { if (!open) return undefined; const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); box.current?.querySelector('.aim-attach')?.focus(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [open]);
  useEffect(() => {
    if (!open) { setSub(''); return undefined; }
    api('/v1/connectors').then((r) => setCons(r.connectors), () => setCons([]));
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  const toggleCon = (c) => { setCons((cs) => cs.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x))); fetch('/v1/connectors/' + c.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: !c.on }) }); };
  return (
    <div className="pm" ref={box}>
      <button type="button" className={'aim-attach' + (open ? ' on' : '')} aria-label="Добавить" aria-haspopup="menu" aria-expanded={open} title="Файлы, умения, интернет, коннекторы" onClick={() => setOpen((o) => !o)}>
        <Plus size={17} style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="pm-pop" initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={EASE}>
            <AnimatePresence mode="wait" initial={false}>
              {!sub ? (
                <motion.div key="main" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={EASE}>
                  <button type="button" className="pm-it" onClick={() => { setOpen(false); onFiles(); }}><Paperclip size={16} /><span>Прикрепить файлы<small>PDF, Word, фото — до 5</small></span></button>
                  <button type="button" className="pm-it" onClick={() => setSub('skills')}><Sparkles size={16} /><span>Умения<small>{skill ? 'Включено: ' + (skills.find((s) => s.id === skill)?.name || '') : 'Шаблоны задач: претензия, иск, отзыв, проверка договора'}</small></span><ChevronRight size={15} className="pm-go" /></button>
                  <div className="pm-it static"><Globe size={16} /><span>Поиск в интернете<small>Новости, сайты ведомств, сведения о компаниях</small></span><Toggle on={p.web} onChange={(v) => set('web', v)} label="Поиск в интернете" /></div>
                  <button type="button" className="pm-it" onClick={() => { setOpen(false); openAISettings('profile'); }}><Settings2 size={16} /><span>Настройки ИИ<small>Инструкция, стиль, умения, память</small></span></button>
                  <button type="button" className="pm-it" onClick={() => setSub('cons')}><Plug size={16} /><span>Коннекторы<small>{cons?.length ? `Подключено: ${cons.filter((c) => c.on).length} из ${cons.length}` : 'Подключить свои системы: CRM, базу договоров'}</small></span><ChevronRight size={15} className="pm-go" /></button>
                </motion.div>
              ) : sub === 'skills' ? (
                <motion.div key="skills" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={EASE}>
                  <button type="button" className="pm-back" onClick={() => setSub('')}>← Умения</button>
                  {skills.filter((s) => s.on !== false).map((s) => (
                    <button key={s.id} type="button" className={'pm-it' + (skill === s.id ? ' sel' : '')} onClick={() => { setSkill(skill === s.id ? '' : s.id); setOpen(false); }}>
                      <span className="pm-sk">{s.name.slice(0, 1)}</span><span>{s.name}<small>{s.desc}</small></span>{skill === s.id && <Check size={15} className="pm-go" />}
                    </button>
                  ))}
                  <button type="button" className="pm-it" onClick={() => { setOpen(false); openAISettings('skills'); }}><Plus size={16} /><span>Создать или настроить умения</span></button>
                  <div className="pm-note">Буквоед и сам берёт нужное умение — включайте, чтобы задать его явно.</div>
                </motion.div>
              ) : (
                <motion.div key="cons" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={EASE}>
                  <button type="button" className="pm-back" onClick={() => setSub('')}>← Коннекторы</button>
                  {cons?.map((c) => (
                    <div key={c.id} className="pm-it static"><Plug size={16} /><span>{c.name}<small>{c.host} · инструментов: {c.tools}</small></span><Toggle on={c.on} onChange={() => toggleCon(c)} label={c.name} /></div>
                  ))}
                  {cons && !cons.length && <div className="pm-note">Подключите свой MCP-сервер — CRM, базу договоров, календарь — и Буквоед сможет им пользоваться.</div>}
                  <button type="button" className="pm-it" onClick={() => { setOpen(false); onConnectors(); }}><Plus size={16} /><span>Управлять коннекторами</span></button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// окно коннекторов
export function ConnectorsModal({ onClose }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ name: '', url: '', header: '', secret: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(null);
  const load = () => api('/v1/connectors').then((r) => setList(r.connectors), () => setList([]));
  useEffect(() => { load(); const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const add = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setOk(null);
    const r = await fetch('/v1/connectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const b = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(b.error || 'Не удалось подключить'); return; }
    setOk(b); setF({ name: '', url: '', header: '', secret: '' }); load();
  };
  const del = (id) => fetch('/v1/connectors/' + id, { method: 'DELETE' }).then(load);
  return (
    <motion.div className="cm-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="cm" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
        <div className="cm-h"><b>Коннекторы</b><button type="button" className="act" onClick={onClose} aria-label="Закрыть"><X size={17} /></button></div>
        <p className="c2 cm-p">Подключите внешний сервер по протоколу MCP (Streamable HTTP) — его инструменты станут доступны Буквоеду в чате. Ключ доступа хранится на сервере и не показывается.</p>
        <div className="cm-list">
          {list?.map((c) => (
            <div key={c.id} className="cm-it"><Plug size={16} /><span><b>{c.name}</b><small className="c3">{c.host} · инструментов: {c.tools}{c.auth ? ' · с ключом' : ''}</small></span>
              <button type="button" className="act" title="Удалить" onClick={() => del(c.id)}><Trash2 size={15} /></button></div>
          ))}
          {list && !list.length && <div className="c3 cm-empty">Пока нет коннекторов</div>}
        </div>
        <form className="cm-f" onSubmit={add}>
          <input placeholder="Название, например «CRM»" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="https://example.com/mcp" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required />
          <div className="cm-row">
            <input placeholder="Заголовок (Authorization)" value={f.header} onChange={(e) => setF({ ...f, header: e.target.value })} />
            <input placeholder="Ключ доступа" type="password" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} autoComplete="off" />
          </div>
          {err && <div className="err">{err}</div>}
          {ok && <div className="cm-ok"><Check size={15} />Подключено: инструментов {ok.connector.tools}{ok.tool_names?.length ? ' — ' + ok.tool_names.slice(0, 6).join(', ') : ''}</div>}
          <button className="btn pri" disabled={busy}>{busy ? 'Проверяю связь…' : 'Подключить'}</button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// текстовый статус работы: сейчас — мерцающая строка, после — сводка, по щелчку список шагов
export function WorkLine({ steps, done, think }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const cur = [...steps].reverse().find((s) => !s.done) || steps[steps.length - 1];
  const found = steps.reduce((n, s) => n + (s.found || 0), 0);
  const word = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'шаг' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'шага' : 'шагов');
  return (
    <div className="wl">
      {done
        ? <button type="button" className="wl-h" onClick={() => setOpen((o) => !o)}>Ход работы: {steps.length} {word(steps.length)}{found ? `, найдено ${found}` : ''}<ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} /></button>
        : <AnimatePresence mode="wait"><motion.span key={cur.id} className="shim wl-cur" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.2 }}>{cur.text}</motion.span></AnimatePresence>}
      <AnimatePresence initial={false}>
        {open && done && (
          <motion.ol className="wl-l" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={EASE}>
            {steps.map((s) => <li key={s.id} className={s.parent ? 'sub' : ''}>{s.text}{s.found > 0 && <span className="c3"> · {s.found}</span>}</li>)}
            {think && <li className="wl-think"><span className="c3">Размышления:</span> {think}</li>}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

// карточка документа: пока пишется — живой черновик; готов — скачать и открыть
export function DocCard({ doc, draft }) {
  const [view, setView] = useState(false);
  const [md, setMd] = useState('');
  const pv = useRef(null);
  useEffect(() => { if (draft && pv.current) pv.current.scrollTop = pv.current.scrollHeight; }, [draft?.md]); // eslint-disable-line react-hooks/exhaustive-deps
  const openView = () => { setView(true); if (!md && doc) api('/v1/docs/' + doc.id + '?format=md').then((r) => setMd(r.markdown), () => setMd('Не удалось открыть документ')); };
  if (draft && !doc) {
    return (
      <motion.div className="dc live" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
        <div className="dc-h"><span className="dc-ic"><FileText size={18} /></span><span className="dc-t"><b>{draft.title || 'Документ'}</b><small className="shim">Составляю…</small></span></div>
        <div className="dc-pv" ref={pv}><Md text={draft.md || ' '} /></div>
      </motion.div>
    );
  }
  return (
    <>
      <motion.div className="dc" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
        <div className="dc-h">
          <span className="dc-ic doc"><FileText size={18} /></span>
          <button type="button" className="dc-t link" onClick={openView}><b>{doc.title}</b><small className="c3">Word · {doc.kind || 'документ'}{doc.words ? ` · ${doc.words} слов` : ''}</small></button>
          <button type="button" className="act" onClick={openView} title="Открыть"><ExternalLink size={15} /><span>Открыть</span></button>
          <a className="act dl" href={'/v1/docs/' + doc.id} download title="Скачать .docx"><Download size={15} /><span>.docx</span></a>
        </div>
      </motion.div>
      <AnimatePresence>
        {view && (
          <motion.div className="cm-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setView(false)}>
            <motion.div className="dv" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
              <div className="cm-h"><b>{doc.title}</b><span style={{ flex: 1 }} /><a className="act" href={'/v1/docs/' + doc.id} download><Download size={15} /><span>Скачать .docx</span></a><button type="button" className="act" onClick={() => setView(false)} aria-label="Закрыть"><X size={17} /></button></div>
              <div className="dv-page">{md ? <Md text={md.replace(/^>\s?/gm, '')} /> : <span className="shim">Открываю…</span>}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// стартовые кнопки по видам запросов: щелчок раскрывает готовые варианты
export const STARTERS = [
  { id: 'doc', label: 'Составить документ', icon: FileText, skill: '', items: [
    ['Составь претензию поставщику о просрочке поставки и неустойке', 'pretension'],
    ['Подготовь исковое заявление о взыскании долга по договору подряда', 'claim'],
    ['Напиши отзыв на иск о взыскании неустойки с ходатайством по ст. 333 ГК', 'response'],
    ['Составь ходатайство об отложении судебного заседания', 'motion'],
  ] },
  { id: 'law', label: 'Найти практику', icon: Sparkles, items: [
    ['Как суды снижают неустойку по ст. 333 ГК между предпринимателями?', ''],
    ['Срок исковой давности по договору подряда при скрытых недостатках', ''],
    ['Когда директора привлекают к субсидиарной ответственности?', 'memo'],
    ['Что изменилось в банкротстве физлиц в 2026 году?', ''],
  ] },
  { id: 'company', label: 'Проверить компанию', icon: Globe, items: [
    ['Проверь контрагента ИНН 7707083893', 'counterparty'],
    ['Есть ли у компании дела о банкротстве и крупные споры? ИНН ', 'counterparty'],
    ['Подготовь справку о проверке контрагента для служебной записки. ИНН ', 'counterparty'],
  ] },
  { id: 'contract', label: 'Разобрать договор', icon: Paperclip, items: [
    ['Проверь прикреплённый договор на риски для покупателя', 'contract'],
    ['Составь протокол разногласий к прикреплённому договору', 'contract'],
    ['Какие условия обязательно включить в договор поставки?', ''],
  ] },
];

// голосовой ввод: распознавание речи браузером (русский), текст дописывается в поле по мере речи
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canVoice = !!SR;
export function useVoice(onText) {
  const [on, setOn] = useState(false);
  const rec = useRef(null);
  const base = useRef('');
  const stop = () => rec.current?.stop();
  const start = (current) => {
    if (!SR) return;
    if (on) { stop(); return; }
    const r = new SR();
    r.lang = 'ru-RU'; r.interimResults = true; r.continuous = true;
    base.current = current ? current.replace(/\s*$/, ' ') : '';
    r.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      onText((base.current + txt).replace(/\s+/g, ' ').trimStart());
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r; setOn(true);
    try { r.start(); } catch { setOn(false); }
  };
  useEffect(() => () => rec.current?.abort?.(), []);
  return { on, start, stop };
}

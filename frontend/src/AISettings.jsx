// Окно «Настройки ИИ»: профиль и личная инструкция, стиль и длина ответов, модель и усилие, возможности, умения, коннекторы, долгая память.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Check, Cpu, FileText, Globe, Pencil, Plug, Plus, Sparkles, Trash2, User, X } from 'lucide-react';
import { api } from './api.js';
import { Toggle, useChatPrefs, ConnectorsModal, EFFORTS } from './AIExtras.jsx';
import { useModel } from './ModelPick.jsx';
import { ProviderMark } from './ModelMenu.jsx';

// Настройки ИИ (как в Claude): профиль и личная инструкция, ответы, модель, возможности, умения, коннекторы, память.
// Серверные настройки сохраняются сами через полсекунды после правки; модель и тщательность — в браузере.

const MemoryPanel = lazy(() => import('./MemoryPanel.jsx').catch(() => ({ default: () => <p className="c3">Память скоро появится.</p> })));

const TABS = [
  ['profile', 'Профиль', User], ['answers', 'Ответы', FileText], ['model', 'Модель', Cpu], ['caps', 'Возможности', Globe],
  ['skills', 'Умения', Sparkles], ['cons', 'Коннекторы', Plug], ['memory', 'Память', Brain],
];
const ROLES = ['Юрист в компании', 'Адвокат', 'Судебный представитель', 'Юрист-консультант', 'Руководитель юридического отдела', 'Нотариус', 'Студент-юрист', 'Предприниматель'];
const STYLES = [
  ['normal', 'Обычный', 'Прямой ответ, разделы и ссылки на источники'],
  ['concise', 'Кратко', 'Только суть — 3–6 предложений'],
  ['detailed', 'С объяснениями', 'Почему так, как толкуют суды, альтернативы'],
  ['formal', 'Официально', 'Стиль правового заключения'],
  ['custom', 'Свой', 'Опишите, как отвечать'],
];

function useServerSettings() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState('');
  const timer = useRef(0);
  useEffect(() => { api('/v1/ai/settings').then(setS, () => setS({})); }, []);
  const set = (patch) => {
    setS((x) => ({ ...x, ...patch }));
    setSaved('Сохраняю…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch('/v1/ai/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
        .then((r) => setSaved(r.ok ? 'Сохранено' : 'Не сохранилось'), () => setSaved('Не сохранилось'));
    }, 450);
  };
  return [s, set, saved];
}

function Row({ title, hint, children }) {
  return <div className="as-row"><div className="as-row-t"><b>{title}</b>{hint && <small>{hint}</small>}</div><div className="as-row-c">{children}</div></div>;
}

function Choice({ items, value, onChange, cols = 1 }) {
  return (
    <div className="as-choice" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="radiogroup">
      {items.map(([k, t, d]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          <span><b>{t}</b>{d && <small>{d}</small>}</span>{value === k && <motion.i layoutId={'as-ch-' + items[0][0]} className="as-ch-ok" transition={{ type: 'spring', stiffness: 520, damping: 38 }}><Check size={13} /></motion.i>}
        </button>
      ))}
    </div>
  );
}

function Skills() {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null); // {id?, name, desc, text}
  const [err, setErr] = useState('');
  const load = () => api('/v1/skills').then((r) => setList(r.skills), () => setList([]));
  useEffect(() => { load(); }, []);
  const toggle = (s) => { setList((l) => l.map((x) => (x.id === s.id ? { ...x, on: !x.on } : x))); fetch('/v1/skills/' + s.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: !s.on }) }); };
  const save = async () => {
    setErr('');
    const r = edit.id
      ? await fetch('/v1/skills/' + edit.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) })
      : await fetch('/v1/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    if (!r.ok) { const b = await r.json().catch(() => ({})); setErr(b.error || 'Не удалось сохранить'); return; }
    setEdit(null); load();
  };
  const del = (s) => fetch('/v1/skills/' + s.id, { method: 'DELETE' }).then(load);
  if (edit) {
    return (
      <motion.div className="as-sk-edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
        <button type="button" className="pm-back" onClick={() => setEdit(null)}>← Умения</button>
        <input className="as-in" placeholder="Название, например «Отзыв на иск по 44-ФЗ»" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <input className="as-in" placeholder="Когда применять — одной строкой (это видит модель при выборе умения)" value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} />
        <textarea className="as-in as-ta" rows={10} placeholder={'Порядок работы и требования к результату. Например:\n1) Найди нормы 44-ФЗ о… и прочитай их.\n2) Проверь практику ФАС и арбитражных судов.\n3) Составь документ: шапка…, разделы…, просительная часть…'} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
        {err && <div className="err">{err}</div>}
        <div className="as-actions"><button type="button" className="act" onClick={() => setEdit(null)}>Отмена</button><button type="button" className="btn pri" onClick={save}>Сохранить умение</button></div>
      </motion.div>
    );
  }
  return (
    <div className="as-sec">
      <p className="as-p">Умения — готовые сценарии работы. Буквоед сам выбирает подходящее; выключенные он не использует. Свои умения работают так же, как встроенные.</p>
      <button type="button" className="as-add" onClick={() => setEdit({ name: '', desc: '', text: '' })}><Plus size={16} />Создать умение</button>
      <div className="as-list">
        {list?.map((s) => (
          <div key={s.id} className={'as-li' + (s.on ? '' : ' off')}>
            <span className="pm-sk">{s.name.slice(0, 1)}</span>
            <span className="as-li-t"><b>{s.name}{s.own && <em>своё</em>}</b><small>{s.desc}</small></span>
            {s.own && <button type="button" className="act ic" title="Изменить" onClick={() => setEdit({ id: s.id, name: s.name, desc: s.desc, text: s.text || '' })}><Pencil size={14} /></button>}
            {s.own && <button type="button" className="act ic" title="Удалить" onClick={() => del(s)}><Trash2 size={14} /></button>}
            <Toggle on={s.on} onChange={() => toggle(s)} label={s.name} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Models() {
  const [m, setM] = useModel();
  const [p, set] = useChatPrefs();
  const [list, setList] = useState([]);
  useEffect(() => { api('/v1/models').then((r) => setList(r.models), () => {}); }, []);
  return (
    <div className="as-sec">
      <Row title="Модель по умолчанию" hint="Её можно сменить в любом сообщении">
        <select className="as-in as-sel" value={m} onChange={(e) => setM(e.target.value)}>
          {list.filter((x) => x.available).map((x) => <option key={x.id} value={x.id}>{x.title} · {x.provider} · ×{x.cost}</option>)}
        </select>
        <span className="as-mk">{list.find((x) => x.id === m) && <ProviderMark provider={list.find((x) => x.id === m).provider} size={18} />}</span>
      </Row>
      <Row title="Размышление" hint="Модель сначала думает — ответ точнее, ход мыслей виден"><Toggle on={p.think} onChange={(v) => set('think', v)} label="Размышление" /></Row>
      <div className="as-row col"><div className="as-row-t"><b>Усилие</b><small>Сколько шагов поиска и проверки делает Буквоед</small></div>
        <Choice items={EFFORTS} value={EFFORTS.some((e) => e[0] === p.effort) ? p.effort : 'high'} onChange={(v) => set('effort', v)} />
      </div>
    </div>
  );
}

export default function AISettings({ onClose, tab: tab0 = 'profile' }) {
  const [tab, setTab] = useState(tab0);
  useEffect(() => { setTab(tab0); }, [tab0]);
  const [s, set, saved] = useServerSettings();
  const [cons, setCons] = useState(false);
  const dlg = useRef(null);
  useEffect(() => { const t = setTimeout(() => dlg.current?.querySelector('.as-tab.on')?.focus(), 60); return () => clearTimeout(t); }, []);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !cons) onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [cons]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div className="cm-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="as" role="dialog" aria-modal="true" aria-labelledby="as-title" ref={dlg} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        <nav className="as-nav" role="tablist" aria-orientation="vertical">
          <b className="as-title" id="as-title">Настройки ИИ</b>
          {TABS.map(([k, l, I]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={'as-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
              {tab === k && <motion.span layoutId="as-tab" className="as-tab-bg" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
              <I size={15} /><span>{l}</span>
            </button>
          ))}
        </nav>
        <section className="as-body">
          <div className="as-h"><b>{TABS.find((t) => t[0] === tab)[1]}</b><span className="as-saved c3">{saved}</span><button type="button" className="act ic" onClick={onClose} aria-label="Закрыть"><X size={17} /></button></div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="as-scroll" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              {!s ? <span className="shim">Загружаю…</span> : tab === 'profile' ? (
                <div className="as-sec">
                  <Row title="Как к вам обращаться"><input className="as-in" value={s.name || ''} placeholder="Например, Анна" onChange={(e) => set({ name: e.target.value })} /></Row>
                  <Row title="Чем вы занимаетесь" hint="Буквоед подстроит глубину и термины">
                    <input className="as-in" list="as-roles" value={s.role || ''} placeholder="Юрист в компании" onChange={(e) => set({ role: e.target.value })} />
                    <datalist id="as-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
                  </Row>
                  <div className="as-row col"><div className="as-row-t"><b>Личная инструкция</b><small>Что Буквоеду учитывать всегда: специализация, регион, клиенты, требования к оформлению</small></div>
                    <textarea className="as-in as-ta" rows={7} value={s.instructions || ''} placeholder={'Например:\n— Работаю в арбитраже Московского округа, чаще на стороне ответчика.\n— Ссылайся на позиции ВС РФ в первую очередь.\n— Суммы пиши цифрами и прописью.'} onChange={(e) => set({ instructions: e.target.value })} />
                    <small className="c3 as-count">{(s.instructions || '').length} / 2000</small>
                  </div>
                </div>
              ) : tab === 'answers' ? (
                <div className="as-sec">
                  <div className="as-row col"><div className="as-row-t"><b>Стиль</b></div><Choice items={STYLES} value={s.style || 'normal'} onChange={(v) => set({ style: v })} cols={2} /></div>
                  <AnimatePresence>{s.style === 'custom' && <motion.textarea initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="as-in as-ta" rows={4} value={s.style_text || ''} placeholder="Например: сначала вывод одной фразой, затем нормы списком, затем риски. Без вводных слов." onChange={(e) => set({ style_text: e.target.value })} />}</AnimatePresence>
                  <div className="as-row col"><div className="as-row-t"><b>Длина ответа</b></div><Choice items={[['short', 'Короткий', 'до 150 слов'], ['normal', 'Обычный', 'до 350 слов'], ['long', 'Подробный', 'до 900 слов']]} value={s.length || 'normal'} onChange={(v) => set({ length: v })} cols={3} /></div>
                  <Row title="Только по источникам" hint="Каждое утверждение — со ссылкой; без общих рассуждений"><Toggle on={!!s.strict} onChange={(v) => set({ strict: v })} label="Только по источникам" /></Row>
                </div>
              ) : tab === 'model' ? <Models /> : tab === 'caps' ? (
                <div className="as-sec">
                  <Row title="Поиск в интернете" hint="Новости, сайты ведомств, сведения о компаниях"><Toggle on={s.web !== false} onChange={(v) => set({ web: v })} label="Поиск в интернете" /></Row>
                  <Row title="Создание файлов" hint="Документы Word: претензии, иски, заключения"><Toggle on={s.files !== false} onChange={(v) => set({ files: v })} label="Создание файлов" /></Row>
                  <Row title="Долгая память" hint="Буквоед помнит важное о вас и ваших делах между чатами"><Toggle on={s.memory !== false} onChange={(v) => set({ memory: v })} label="Долгая память" /></Row>
                </div>
              ) : tab === 'skills' ? <Skills /> : tab === 'cons' ? (
                <div className="as-sec">
                  <p className="as-p">Подключите свой сервер по протоколу MCP — CRM, базу договоров, календарь дел — и Буквоед сможет им пользоваться.</p>
                  <button type="button" className="as-add" onClick={() => setCons(true)}><Plug size={16} />Управлять коннекторами</button>
                </div>
              ) : (
                <Suspense fallback={<span className="shim">Загружаю…</span>}><MemoryPanel /></Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </motion.div>
      <AnimatePresence>{cons && <ConnectorsModal onClose={() => setCons(false)} />}</AnimatePresence>
    </motion.div>
  );
}

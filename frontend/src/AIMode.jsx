// ИИ-режим: чат с Буквоедом — боковая панель чатов и папок, стартовый экран, сообщения с потоком ответа, источниками и документами, строка ввода.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Download, Mic, RotateCcw, Settings2, ThumbsDown, ThumbsUp, Check, ChevronDown, ChevronRight, Copy, Folder, FolderPlus, MoreHorizontal, PanelLeft, Pencil, Pin, PinOff, Plus, Search, Sparkles, Square, Trash2, CornerDownRight } from 'lucide-react';
import { api, apiStream } from './api.js';
import { Md, Sources, useTypewriter } from './Md.jsx';
import { useModel } from './ModelPick.jsx';
import ModelMenu, { ProviderMark, modelProvider, modelTitle } from './ModelMenu.jsx';
import { ConnectorsModal, DocCard, PlusMenu, STARTERS, WorkLine, useChatPrefs, useSkills, openAISettings, useVoice, canVoice } from './AIExtras.jsx';
import AISettings from './AISettings.jsx';
import GhostMini from './GhostMini.jsx';
import Face from './Face.jsx';
import FileThumb from './FileThumb.jsx';
import { Thinking } from './ThinkingPill.jsx';
import { Avatar, useAccount } from './account.jsx';
import { Logo } from './icons.jsx';
import { react } from './react.js';
import { DropCatcher } from './DocPlay.jsx';

// ИИ-режим: чат с Буквоедом, который сам ищет по базе и в интернете, с помощниками-субагентами, папками и закреплёнными чатами.

const hashParams = () => new URLSearchParams(location.hash.split('?')[1] || '');
const setChatInHash = (id) => history.replaceState(null, '', '#/ai' + (id ? '?c=' + id : ''));

// ходы чата с сервера → сообщения; незаконченный ответ показывается как «ещё отвечает» и догружается
const turnsToMsgs = (c) => (c.turns || []).flatMap((t, i) => [
  { id: 'u' + i, role: 'user', q: t.q },
  t.pending
    ? { id: 'a' + i, role: 'ai', st: 'thinking', pending: true, steps: [], sources: [], md: '', followups: [], model: t.model }
    : t.error && !t.answer
      ? { id: 'a' + i, role: 'ai', st: 'error', error: t.error, steps: [], sources: [], md: '', followups: [], old: true, model: t.model }
      : { id: 'a' + i, role: 'ai', st: 'done', steps: [], sources: t.sources || [], md: t.answer, followups: t.followups || [], old: true, model: t.model, docs: t.docs || [], unchecked: t.unchecked || [] },
]);

function group(chats) {
  const now = new Date(), day = 864e5;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const g = [['Сегодня', []], ['Вчера', []], ['7 дней', []], ['30 дней', []], ['Раньше', []]];
  chats.forEach((c) => {
    const t = new Date(c.updated).getTime();
    const i = t >= start ? 0 : t >= start - day ? 1 : t >= start - 7 * day ? 2 : t >= start - 30 * day ? 3 : 4;
    g[i][1].push(c);
  });
  return g.filter(([, l]) => l.length);
}

// ---------- боковая панель ----------
function ChatItem({ c, active, folders, onOpen, onPatch, onDelete }) {
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [sub, setSub] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) { setMenu(false); setSub(false); } };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [menu]);
  const save = () => { setEdit(false); if (title.trim() && title !== c.title) onPatch(c.id, { title: title.trim() }); };
  return (
    <div ref={ref} className={'ci' + (active ? ' on' : '')} draggable onDragStart={(e) => { e.dataTransfer.setData('text/kb-chat', c.id); e.dataTransfer.effectAllowed = 'move'; }}>
      {active && <motion.span layoutId="ci-active" className="ci-bg" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
      {edit ? (
        <input className="ci-edit" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTitle(c.title); setEdit(false); } }} />
      ) : (
        <button type="button" className="ci-b" onClick={() => onOpen(c.id)} onDoubleClick={() => setEdit(true)} title={c.title}>
          {c.pinned && <Pin size={12} className="ci-pin" />}<span>{c.title || 'Без названия'}</span>{c.pending && <i className="ci-live" title="Буквоед ещё отвечает" />}
        </button>
      )}
      <button type="button" className="ci-more" aria-label="Действия с чатом" onClick={() => setMenu((m) => !m)}><MoreHorizontal size={15} /></button>
      <AnimatePresence>
        {menu && (
          <motion.div className="ci-menu" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <button onClick={() => { setMenu(false); onPatch(c.id, { pinned: !c.pinned }); }}>{c.pinned ? <><PinOff size={14} />Открепить</> : <><Pin size={14} />Закрепить</>}</button>
            <button onClick={() => { setMenu(false); setEdit(true); }}><Pencil size={14} />Переименовать</button>
            <button onClick={() => setSub((x) => !x)}><Folder size={14} />В папку<ChevronRight size={13} style={{ marginLeft: 'auto' }} /></button>
            {sub && (
              <div className="ci-sub">
                <button onClick={() => { setMenu(false); onPatch(c.id, { folder: '' }); }} className={!c.folder ? 'on' : ''}>Без папки</button>
                {folders.map((f) => <button key={f.id} className={c.folder === f.id ? 'on' : ''} onClick={() => { setMenu(false); onPatch(c.id, { folder: f.id }); }}>{f.name}</button>)}
              </div>
            )}
            <button className="danger" onClick={() => { setMenu(false); if (confirm('Удалить чат «' + c.title + '»? Это нельзя отменить.')) onDelete(c.id); }}><Trash2 size={14} />Удалить</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderRow({ f, chats, active, folders, onOpen, onPatch, onDelete, onRename, onRemove }) {
  const [open, setOpen] = useState(true);
  const [over, setOver] = useState(false);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(f.name);
  return (
    <div className={'fr' + (over ? ' over' : '')}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('text/kb-chat')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const id = e.dataTransfer.getData('text/kb-chat'); if (id) onPatch(id, { folder: f.id }); }}>
      <div className="fr-h">
        <button type="button" className="fr-t" onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={13} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
          <Folder size={14} />
          {edit
            ? <input className="ci-edit" autoFocus value={name} onClick={(e) => e.stopPropagation()} onChange={(e) => setName(e.target.value)}
              onBlur={() => { setEdit(false); if (name.trim()) onRename(f.id, name.trim()); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
            : <span onDoubleClick={() => setEdit(true)}>{f.name}</span>}
          <span className="c3 fr-n">{chats.length}</span>
        </button>
        <button type="button" className="ci-more" title="Удалить папку" aria-label="Удалить папку" onClick={() => { if (confirm('Удалить папку «' + f.name + '»? Чаты из неё останутся.')) onRemove(f.id); }}><Trash2 size={13} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="fr-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {chats.length ? chats.map((c) => <ChatItem key={c.id} c={c} active={active === c.id} folders={folders} onOpen={onOpen} onPatch={onPatch} onDelete={onDelete} />)
              : <div className="c3 fr-empty">Перетащите сюда чат</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({ data, active, onOpen, onNew, reload, mobileOpen, onClose }) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [fname, setFname] = useState('');
  const chats = data.chats.filter((c) => !q || (c.title + ' ' + c.last).toLowerCase().includes(q.toLowerCase()));
  const send = async (method, path, body) => { await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }); reload(); };
  const patch = (id, b) => send('PATCH', '/v1/chats/' + id, b);
  const del = (id) => { send('DELETE', '/v1/chats/' + id); if (id === active) onNew(); };
  const pinned = chats.filter((c) => c.pinned);
  const loose = chats.filter((c) => !c.pinned && !c.folder);
  const common = { active, folders: data.folders, onOpen, onPatch: patch, onDelete: del };
  return (
    <aside className={'aisb' + (mobileOpen ? ' open' : '')} aria-label="Чаты">
      <div className="aisb-in">
      <div className="aisb-brand">
        <a className="aisb-logo" href="#/app"><Logo />KadBest</a>
        <button type="button" className="btn ghost aisb-x" onClick={onClose} aria-label="Скрыть панель" title="Скрыть панель · Ctrl+B"><PanelLeft size={17} /></button>
      </div>
      <div className="aisb-mode" role="tablist" aria-label="Режим">
        <a role="tab" aria-selected="false" href="#/app" className="aisb-mode-b"><Search size={14} />Поиск</a>
        <a role="tab" aria-selected="true" href="#/ai" className="aisb-mode-b on"><Sparkles size={14} />ИИ</a>
      </div>
      <div className="aisb-top">
        <button type="button" className="aisb-new" onClick={onNew} title="Новый чат · Ctrl+Shift+O"><span className="aisb-new-ic"><Plus size={15} /></span>Новый чат<kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⇧⌘O' : 'Ctrl+Shift+O'}</kbd></button>
      </div>
      <label className="aisb-search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по чатам" /></label>
      <div className="aisb-scroll">
        {pinned.length > 0 && <div className="aisb-sec"><div className="aisb-cap"><Pin size={12} />Закреплённые</div>{pinned.map((c) => <ChatItem key={c.id} c={c} {...common} active={active === c.id} />)}</div>}
        <div className="aisb-sec">
          <div className="aisb-cap">Папки<button type="button" className="aisb-add" title="Новая папка" aria-label="Новая папка" onClick={() => setAdding(true)}><FolderPlus size={14} /></button></div>
          {adding && (
            <input className="ci-edit" autoFocus placeholder="Название папки" value={fname} onChange={(e) => setFname(e.target.value)}
              onBlur={() => { setAdding(false); if (fname.trim()) send('POST', '/v1/folders', { name: fname.trim() }); setFname(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setFname(''); setAdding(false); } }} />
          )}
          {data.folders.map((f) => (
            <FolderRow key={f.id} f={f} chats={chats.filter((c) => c.folder === f.id && !c.pinned)} {...common}
              onRename={(id, name) => send('PATCH', '/v1/folders/' + id, { name })} onRemove={(id) => send('DELETE', '/v1/folders/' + id)} />
          ))}
          {!data.folders.length && !adding && <button type="button" className="aisb-hint c3" onClick={() => setAdding(true)}>Создайте папку для дела или клиента</button>}
        </div>
        {group(loose).map(([t, list]) => (
          <div key={t} className="aisb-sec"><div className="aisb-cap">{t}</div>{list.map((c) => <ChatItem key={c.id} c={c} {...common} active={active === c.id} />)}</div>
        ))}
        {!data.chats.length && <div className="aisb-empty c3"><GhostMini size={40} /><span>Здесь будут ваши чаты</span></div>}
      </div>
      <Me />
      </div>
    </aside>
  );
}

function Me() {
  const { user } = useAccount();
  if (!user) return null;
  const ai = user.usage?.ai?.session;
  return (
    <div className="aisb-me-w">
    <button type="button" className="aisb-gear act ic" title="Настройки ИИ" aria-label="Настройки ИИ" onClick={() => openAISettings('profile')}><Settings2 size={16} /></button>
    <a className="aisb-me" href="#/account" title="Профиль и лимиты">
      <Avatar user={user} size={32} />
      <span className="aisb-me-t"><b>{user.name || user.handle}</b><small className="c3">«{user.plan.name}»{ai?.limit ? ` · ИИ ${ai.pct}%` : ''}</small>
        {ai?.limit > 0 && <span className="aisb-me-bar"><i style={{ width: Math.max(2, ai.pct) + '%' }} /></span>}
      </span>
    </a>
    </div>
  );
}

const EASE = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

// размышления модели вживую: последние строки, сверху тают; после ответа — свёрнуты
const secs = (ms) => { const s = Math.max(1, Math.round(ms / 1000)); return s < 60 ? s + ' с' : Math.floor(s / 60) + ' мин ' + (s % 60) + ' с'; };

function Think({ text, live, t0, ms }) {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const box = useRef(null);
  useEffect(() => { if (live && box.current) box.current.scrollTop = box.current.scrollHeight; }, [text, live]);
  useEffect(() => { if (!live) return undefined; const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, [live]);
  if (!text) return null;
  return (
    <div className="think-wrap">
      {live
        ? <span className="shim think-lbl">Думает{t0 ? ' · ' + secs(Date.now() - t0) : ''}</span>
        : <ThinkDone text={text} open={open} setOpen={setOpen} ms={ms} />}
      <AnimatePresence initial={false}>
        {live && <motion.div key="live" className="think think-live" ref={box} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>{text}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

function ThinkDone({ text, open, setOpen, ms }) {
  return (
    <div className="think-done">
      <button type="button" className="think-h" onClick={() => setOpen((o) => !o)}>{ms ? 'Думал ' + secs(ms) : 'Размышления'}<ChevronDown size={13} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} /></button>
      <AnimatePresence initial={false}>{open && <motion.div className="think" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{text}</motion.div>}</AnimatePresence>
    </div>
  );
}

// оценка ответа: «полезно» — одним щелчком; «не то» — с причиной (неверная норма, неверное дело…)
const BAD = ['Неверная норма', 'Неверное дело или практика', 'Неточный расчёт', 'Не по вопросу', 'Слишком общо', 'Другое'];
function Rate({ m }) {
  const [v, setV] = useState(m.rate || '');
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState([]);
  const [note, setNote] = useState('');
  const [thx, setThx] = useState(false);
  const send = (rate, reasons = [], text = '') => {
    setV(rate); setOpen(false); setThx(true); setTimeout(() => setThx(false), 1600);
    fetch('/v1/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rate, reasons, note: text, model: m.model, answer: (m.md || '').slice(0, 4000), chat: new URLSearchParams(location.hash.split('?')[1] || '').get('c') || '' }) }).catch(() => {});
    if (rate === 'up') react('jump');
  };
  return (
    <span className="rate">
      <button type="button" className={'act ic' + (v === 'up' ? ' on' : '')} title="Полезно" aria-pressed={v === 'up'} onClick={() => send('up')}><ThumbsUp size={15} /></button>
      <button type="button" className={'act ic' + (v === 'down' ? ' on' : '')} title="Не то" aria-pressed={v === 'down'} onClick={() => setOpen((o) => !o)}><ThumbsDown size={15} /></button>
      <AnimatePresence>
        {open && (
          <motion.div className="rate-pop" initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.16 }}>
            <b>Что не так?</b>
            <div className="rate-chips">{BAD.map((r) => <button key={r} type="button" className={why.includes(r) ? 'on' : ''} onClick={() => setWhy((w) => (w.includes(r) ? w.filter((x) => x !== r) : [...w, r]))}>{r}</button>)}</div>
            <textarea rows={2} placeholder="Подробнее — по желанию" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="rate-f"><button type="button" className="act" onClick={() => setOpen(false)}>Отмена</button><button type="button" className="btn pri" onClick={() => send('down', why, note)}>Отправить</button></div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{thx && <motion.span className="rate-ok c3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Спасибо!</motion.span>}</AnimatePresence>
    </span>
  );
}

// заголовок чата: двойной щелчок — переименовать
function HeadTitle({ title, editable, onRename }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(title);
  useEffect(() => setV(title), [title]);
  if (edit) {
    return <input className="aim-title-in" autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { setEdit(false); onRename(v); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(title); setEdit(false); } }} />;
  }
  return (
    <AnimatePresence mode="wait">
      <motion.span key={title} className={'aim-title' + (editable ? ' ed' : '')} title={editable ? 'Дважды щёлкните, чтобы переименовать' : undefined} onDoubleClick={() => editable && setEdit(true)}
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{title}</motion.span>
    </AnimatePresence>
  );
}

// меню чата в шапке
function HeadMenu({ onExport, onDelete }) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) { setSure(false); return undefined; }
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  return (
    <div className="hm" ref={box}>
      <button type="button" className="act" aria-label="Действия с чатом" onClick={() => setOpen((o) => !o)}><MoreHorizontal size={17} /></button>
      <AnimatePresence>
        {open && (
          <motion.div className="hm-pop" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            <button type="button" onClick={() => { setOpen(false); onExport(); }}><Download size={15} />Скачать в Markdown</button>
            <button type="button" onClick={() => { navigator.clipboard.writeText(location.href); setOpen(false); }}><Copy size={15} />Копировать ссылку</button>
            <button type="button" className="danger" onClick={() => (sure ? (setOpen(false), onDelete()) : setSure(true))}><Trash2 size={15} />{sure ? 'Точно удалить?' : 'Удалить чат'}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Answer({ m, onAsk, live, onRetry, onRegen, onExport }) {
  const shown = useTypewriter(m.md || '', live);
  const [copied, setCopied] = useState(false);
  const typing = live && shown.length < (m.md || '').length;
  // пока текст пишется — незакрытое выделение не показываем сырыми звёздочками
  const safe = (t) => { let x = t; if ((x.match(/\*\*/g) || []).length % 2) x = x.replace(/\*\*(?!.*\*\*)/s, ''); if ((x.match(/`/g) || []).length % 2) x = x.replace(/`(?!.*`)/s, ''); return x; };
  return (
    <motion.div className={'msg ai' + (m.old ? ' old' : '')} initial={m.old ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
      <div className="msg-body">
        <div className="msg-who">
          <span className="msg-av"><GhostMini size={24} /></span>
          <b>Буквоед</b>
          {m.model && <span className="who-model"><ProviderMark provider={modelProvider(m.model)} size={14} />{modelTitle(m.model)}</span>}
        </div>
        <AnimatePresence initial={false}>
          {m.st === 'thinking' && !m.md && (
            <motion.div key="pill" className="think-pill" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
              {!m.steps.length && !m.think && <span className="shim">{m.pending ? 'Буквоед ещё отвечает — ответ появится здесь' : 'Думает'}</span>}
            </motion.div>
          )}
        </AnimatePresence>
        <Think text={m.think} live={m.st === 'thinking' && !m.md} t0={m.t0} ms={m.thinkMs} />
        <WorkLine steps={m.steps} done={m.st !== 'thinking'} />
        {m.skill && <div className="who-skill c3">Умение: {m.skill}</div>}
        {(m.docs || []).map((d) => <DocCard key={d.id} doc={d} />)}
        {m.draft && !(m.docs || []).some((d) => d.title === m.draft.title) && m.st === 'thinking' && <DocCard draft={m.draft} />}
        {m.sources?.length > 0 && <><div className="msg-cap"><span>Источники</span></div><Sources items={m.sources} /></>}
        {m.st === 'error' && (
          <motion.div className="ans-err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <span>{m.error}</span>
            {onRetry && <button type="button" className="btn ghost" onClick={onRetry}><RotateCcw size={14} />Повторить</button>}
          </motion.div>
        )}
        {m.md && (
          <motion.div className={'ans' + (typing || (m.st === 'thinking' && m.md) ? ' live' : '')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
            <div className="msg-cap"><span>Ответ</span></div>
            <Md text={typing || m.st === 'thinking' ? safe(shown) : shown} sources={m.sources} />
            {(typing || (m.st === 'thinking' && m.md)) && <span className="caret-blink" />}
          </motion.div>
        )}
        {m.st === 'done' && m.unchecked?.length > 0 && (
          <div className="unchk" role="note">
            <span className="unchk-h">Не сверено с текстом статьи — проверьте:</span>
            {m.unchecked.map((c) => <button key={c} type="button" title="Попросить Буквоеда прочитать статью и проверить ответ" onClick={() => onAsk('Прочитай ' + c + ' и проверь, верно ли ты её применил в ответе выше')}>{c}</button>)}
          </div>
        )}
        {m.st === 'done' && (
          <div className="msg-act">
            <button type="button" className="act" title="Копировать ответ" onClick={() => { navigator.clipboard.writeText(m.md.replace(/\[(\d+)\]/g, '')); setCopied(true); react('tilt'); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}<span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
            {onRegen && <button type="button" className="act" title="Ответить заново выбранной моделью" onClick={onRegen}><RotateCcw size={15} /><span>Заново</span></button>}
            {onExport && <button type="button" className="act" title="Сохранить весь чат в Markdown" onClick={onExport}><Download size={15} /><span>Скачать чат</span></button>}
            <Rate m={m} />
            {m.ms > 0 && <span className="act-ms c3 mono">{(m.ms / 1000).toFixed(m.ms < 10000 ? 1 : 0)} с</span>}
          </div>
        )}
        {m.st === 'done' && m.followups?.length > 0 && !typing && (
          <div className="related">
            <div className="msg-cap"><span>Спросите дальше</span></div>
            {m.followups.map((f, i) => (
              <motion.button key={f} type="button" className="rel" onClick={() => onAsk(f)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <CornerDownRight size={14} />{f}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const WI = { h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

function Welcome({ fill, composer }) {
  const [cat, setCat] = useState('');
  return (
    <motion.div className="ai-welcome" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}>
      <motion.div className="aw-ghost" variants={{ h: { opacity: 0, scale: 0.6, y: 10 }, s: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } } }}><span className="aw-halo" /><Face size={96} /></motion.div>
      <motion.h1 variants={WI}>Чем помочь<span className="aw-q">?</span></motion.h1>
      <motion.p className="c2" variants={WI}>Буквоед сам поищет в законах, делах, публикациях и в интернете — и ответит со ссылками на источники.</motion.p>
      <motion.div className="aw-compw" variants={WI}>{composer}</motion.div>
      <motion.div className="aw-quick" variants={WI}>
        {STARTERS.map((s) => (
          <button key={s.id} type="button" className={'aw-chip' + (cat === s.id ? ' on' : '')} onClick={() => setCat(cat === s.id ? '' : s.id)}><s.icon size={15} />{s.label}</button>
        ))}
      </motion.div>
      <AnimatePresence mode="wait">
        {cat && (
          <motion.div key={cat} className="aw-list" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {STARTERS.find((s) => s.id === cat).items.map(([q, sk], i) => (
              <motion.button key={q} type="button" className="aw-li" onClick={() => { fill(q, sk); setCat(''); }} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>{q}</motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- режим целиком ----------
export default function AIMode() {
  const [data, setData] = useState({ chats: [], folders: [] });
  const [chatId, setChatId] = useState(hashParams().get('c') || '');
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [skill, setSkill] = useState('');
  const [conModal, setConModal] = useState(false);
  const voice = useVoice(setText);
  const [setTab, setSetTab] = useState('');
  useEffect(() => { const on = (e) => setSetTab(e.detail || 'profile'); window.addEventListener('kb:aisettings', on); return () => window.removeEventListener('kb:aisettings', on); }, []);
  const [prefs] = useChatPrefs();
  const skillList = useSkills();
  const [model] = useModel();
  const [sb, setSb] = useState(false);
  const [fold, setFoldS] = useState(() => { try { return localStorage.getItem('kb_aisb_fold') === '1'; } catch { return false; } });
  const setFold = (v) => { setFoldS(v); try { localStorage.setItem('kb_aisb_fold', v ? '1' : '0'); } catch { /* приватный режим */ } };
  const wide = () => window.innerWidth > 860;
  const toggleSb = () => (wide() ? setFold(!fold) : setSb(!sb));
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyB') { e.preventDefault(); toggleSb(); }
      if (e.key === 'Escape' && busy && !document.querySelector('.ci-menu, .ci-edit, .mm-pop, .pm-pop, .cm-wrap')) { stopNow(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyO') { e.preventDefault(); newChat(); }
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); ta.current?.focus(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const [loadingChat, setLoadingChat] = useState(false);
  const ctl = useRef(null);
  const end = useRef(null);
  const sc = useRef(null);
  const col = useRef(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  const onScroll = () => { const el = sc.current; if (!el) return; const gap = el.scrollHeight - el.scrollTop - el.clientHeight; stick.current = gap < 90; setAway(gap > 240 && el.scrollHeight > el.clientHeight + 80); };
  const toBottom = (smooth = true) => { const el = sc.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); stick.current = true; };
  useEffect(() => {
    const el = col.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => { if (stick.current) toBottom(false); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chatId]);
  const ta = useRef(null);
  const fileIn = useRef(null);

  const reload = useCallback(() => api('/v1/chats').then((r) => setData({ chats: r.chats || [], folders: r.folders || [] }), () => {}), []);
  useEffect(() => { reload(); }, [reload]);
  // пришли из поиска с вопросом (#/ai?q=…) — сразу спрашиваем в новом чате
  useEffect(() => {
    const q0 = hashParams().get('q');
    if (q0) { setChatInHash(''); setTimeout(() => send(q0), 150); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // открыть чат по ссылке
  useEffect(() => {
    if (!chatId) { setMsgs([]); return; }
    if (msgs.length) return; // это только что начатый чат
    setLoadingChat(true);
    api('/v1/chats/' + chatId).then((c) => {
      setMsgs(turnsToMsgs(c));
      setTimeout(() => end.current?.scrollIntoView({ block: 'end' }), 50);
    }, () => { setChatId(''); setChatInHash(''); }).finally(() => setLoadingChat(false));
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const h = () => { const c = hashParams().get('c') || ''; if (c !== chatId) { setMsgs([]); setChatId(c); } }; window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, [chatId]);

  const openChat = (id) => { if (ctl.current) ctl.current.abort(); setMsgs([]); setChatId(id); setChatInHash(id); setSb(false); };
  const newChat = () => { if (ctl.current) ctl.current.abort(); setMsgs([]); setChatId(''); setChatInHash(''); setSb(false); setTimeout(() => ta.current?.focus(), 50); };

  const busy = msgs.some((m) => m.role === 'ai' && m.st === 'thinking');
  const upd = (id, f) => setMsgs((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  const send = async (raw) => {
    voice.stop();
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    setText('');
    const fs = files; setFiles([]);
    const uid = 'u' + Date.now(), aid = 'a' + Date.now();
    setMsgs((ms) => [...ms, { id: uid, role: 'user', q, files: fs.map((f) => f.name) }, { id: aid, role: 'ai', st: 'thinking', steps: [], sources: [], md: '', followups: [], model }]);
    stick.current = true;
    setTimeout(() => toBottom(), 60);
    const c = (ctl.current = new AbortController());
    try {
      let context = '';
      if (fs.length) { // документы: сначала Буквоед их читает, потом отвечает на вопрос с их учётом
        upd(aid, (m) => ({ ...m, steps: [{ id: 'docs', tool: 'read_web', text: `Читаю документы: ${fs.length}`, done: false }] }));
        const fd = new FormData();
        fs.forEach((f) => fd.append('file', f, f.name || 'photo.png'));
        fd.append('q', q);
        const r = await fetch('/v1/answer/file', { method: 'POST', body: fd, signal: c.signal });
        const b = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 402) window.dispatchEvent(new Event('lex:' + r.status));
        if (!r.ok) throw new Error(b.error || 'Не удалось прочитать документы');
        context = [b.title, b.summary, b.answer, ...(b.docs || []).map((d, i) => `Документ ${i + 1} «${d.name}» (${d.kind}): ${d.summary}`)].filter(Boolean).join('\n');
        upd(aid, (m) => ({ ...m, steps: m.steps.map((s) => (s.id === 'docs' ? { ...s, done: true, found: fs.length } : s)) }));
      }
      const sk = skill; setSkill('');
      await streamChat({ q, chat_id: chatId, context, model, signal: c.signal, skill: sk, thinking: prefs.think, effort: prefs.effort, web: prefs.web }, (ev, d) => {
        if (ev === 'step') upd(aid, (m) => ({ ...m, steps: [...m.steps, { id: d.id, tool: d.tool, text: d.text, parent: d.parent || '', done: false }] }));
        else if (ev === 'step_done') upd(aid, (m) => ({ ...m, steps: m.steps.map((s) => (s.id === d.id ? { ...s, done: true, found: d.found } : s)) }));
        else if (ev === 'start') { if (d.chat?.id && d.chat.id !== chatId) { setChatId(d.chat.id); setChatInHash(d.chat.id); } reload(); }
        else if (ev === 'think') upd(aid, (m) => ({ ...m, t0: m.t0 || Date.now(), think: ((m.think || '') + d.t).slice(-6000) }));
        else if (ev === 'delta') upd(aid, (m) => ({ ...m, md: d.md, thinkMs: m.thinkMs || (m.t0 && d.md ? Date.now() - m.t0 : 0) }));
        else if (ev === 'skill') upd(aid, (m) => ({ ...m, skill: d.name }));
        else if (ev === 'docdraft') upd(aid, (m) => ({ ...m, draft: d }));
        else if (ev === 'doc') upd(aid, (m) => ({ ...m, docs: [...(m.docs || []), d], draft: null }));
        else if (ev === 'answer') { upd(aid, (m) => ({ ...m, thinkMs: m.thinkMs || (m.t0 ? Date.now() - m.t0 : 0), md: d.markdown, sources: d.sources || [], followups: d.followups || [], unchecked: d.unchecked || [], docs: d.docs?.length ? d.docs : m.docs })); }
        else if (ev === 'error') throw new Error(d.error);
        else if (ev === 'done') {
          upd(aid, (m) => ({ ...m, st: 'done', ms: d.ms, steps: m.steps.map((s) => ({ ...s, done: true })) }));
          if (d.chat?.id && d.chat.id !== chatId) { setChatId(d.chat.id); setChatInHash(d.chat.id); }
          reload();
          react('jump');
          window.dispatchEvent(new Event('lex:charged'));
        }
      });
    } catch (e) {
      if (e.name === 'AbortError') upd(aid, (m) => ({ ...m, st: m.md ? 'done' : 'error', error: 'Остановлено', steps: m.steps.map((s) => ({ ...s, done: true })) }));
      else { upd(aid, (m) => ({ ...m, st: 'error', error: e.message })); react('shake'); }
    } finally { ctl.current = null; }
  };

  const exportChat = () => {
    const name = (title || 'Чат KadBest').replace(/[\\/:*?"<>|]+/g, ' ').trim();
    const body = ['# ' + name, ''].concat(msgs.flatMap((m) => (m.role === 'user' ? ['## Вопрос', '', m.q, ''] : m.md ? ['## Ответ Буквоеда' + (m.model ? ' · ' + modelTitle(m.model) : ''), '', m.md, '', ...(m.sources?.length ? ['**Источники:**', ...m.sources.map((s) => `${s.n}. ${s.title}${s.url ? ' — ' + s.url : ''}`), ''] : [])] : []))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/markdown;charset=utf-8' }));
    a.download = name + '.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const renameChat = (t) => { if (!chatId || !t.trim() || t === title) return; fetch('/v1/chats/' + chatId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t.trim() }) }).then(reload); };
  const deleteChat = () => { if (!chatId) return; fetch('/v1/chats/' + chatId, { method: 'DELETE' }).then(reload); newChat(); };

  // остановить ответ: и на сервере (он пишет ответ, даже если уйти со страницы), и поток в браузере
  const stopNow = () => {
    const id = new URLSearchParams(location.hash.split('?')[1] || '').get('c') || chatId;
    if (id) fetch('/v1/chats/' + id + '/stop', { method: 'POST' }).then(() => setTimeout(reload, 400));
    if (ctl.current) ctl.current.abort();
    else setMsgs((ms) => ms.map((m) => (m.pending ? { ...m, pending: false, st: 'error', error: 'Остановлено' } : m)));
  };

  // ответ ещё пишется на сервере (ушли и вернулись) — догружаем, пока не закончится
  const waiting = msgs.some((m) => m.pending);
  useEffect(() => {
    if (!waiting || !chatId) return undefined;
    const t = setInterval(() => {
      api('/v1/chats/' + chatId).then((c) => {
        const last = (c.turns || [])[c.turns.length - 1];
        if (last && !last.pending) { setMsgs(turnsToMsgs(c)); reload(); react('jump'); }
      }, () => {});
    }, 2500);
    return () => clearInterval(t);
  }, [waiting, chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = (i) => { const q = msgs[i - 1]?.q; if (!q) return; setMsgs((ms) => ms.slice(0, i - 1)); setTimeout(() => send(q), 0); };

  // автоподстройка высоты поля
  useEffect(() => { const t = ta.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(200, t.scrollHeight) + 'px'; } }, [text]);
  const addFiles = (fs) => { setFiles((a) => [...a, ...fs].slice(0, 5)); react('chomp'); };
  const title = useMemo(() => data.chats.find((c) => c.id === chatId)?.title || '', [data, chatId]);
  useEffect(() => { document.title = (title || 'ИИ-чат') + ' — KadBest'; }, [title]);

  const composer = (
        <motion.form layoutId="aim-comp" transition={{ type: 'spring', stiffness: 260, damping: 30 }} className={'aim-comp' + (busy ? ' busy' : '') + (!msgs.length ? ' home' : '')} onSubmit={(e) => { e.preventDefault(); send(); }}>
          {files.length > 0 && (
            <div className="aim-files">
              {files.map((f, i) => (
                <span key={f.name + i} className="att"><FileThumb name={f.name} src={f.type.startsWith('image/') ? (f._url || (f._url = URL.createObjectURL(f))) : ''} size={30} />
                  <span className="att-t"><b>{f.name}</b></span><button type="button" className="att-x" onClick={() => setFiles((a) => a.filter((_, k) => k !== i))}>×</button></span>
              ))}
            </div>
          )}
          <textarea id="composer" ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={msgs.length ? 'Спросите дальше…' : 'Спросите Буквоеда о законе, деле, компании или документе'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Сообщение" />
          <div className="aim-row">
            <PlusMenu onFiles={() => fileIn.current?.click()} skill={skill} setSkill={setSkill} onConnectors={() => setConModal(true)} />
            <AnimatePresence>{skill && <motion.button key={skill} type="button" className="sk-chip" title="Убрать умение" onClick={() => setSkill('')} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}><Sparkles size={13} />{skillList.find((x) => x.id === skill)?.name}<span>×</span></motion.button>}</AnimatePresence>
            <ModelMenu />
            <input ref={fileIn} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.txt" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
            <span style={{ flex: 1 }} />
            <AnimatePresence>
              {canVoice && !busy && (
                <motion.button key="mic" type="button" className={'aim-mic' + (voice.on ? ' on' : '')} title={voice.on ? 'Остановить запись' : 'Сказать голосом'} aria-label="Голосовой ввод"
                  onClick={() => voice.start(text)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.16 }}>
                  {voice.on ? <><span className="mic-wave"><i /><i /><i /><i /></span></> : <Mic size={17} />}
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button type={busy ? 'button' : 'submit'} className={'aim-send' + (busy ? ' stop' : '')} disabled={!busy && !text.trim()} aria-label={busy ? 'Остановить · Esc' : 'Отправить'}
              title={busy ? 'Остановить · Esc' : 'Отправить · Enter'} onClick={busy ? (e) => { e.preventDefault(); stopNow(); } : undefined}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={busy ? 'stop' : 'go'} className="aim-send-ic" initial={{ opacity: 0, scale: 0.4, rotate: busy ? -90 : 90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                  {busy ? <Square size={13} fill="currentColor" /> : <ArrowUp size={18} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.form>
  );

  return (
    <div className={'aim' + (fold ? ' fold' : '')}>
      <a className="skip" href="#composer" onClick={(e) => { e.preventDefault(); ta.current?.focus(); }}>К полю ввода</a>
      <DropCatcher onFiles={addFiles} />
      <Sidebar data={data} active={chatId} onOpen={openChat} onNew={newChat} reload={reload} mobileOpen={sb} onClose={() => (wide() ? setFold(true) : setSb(false))} />
      {sb && <div className="aisb-scrim" onClick={() => setSb(false)} />}
      <section className="aim-main">
        <div className="aim-head">
          <button type="button" className="btn ghost aim-sbbtn" onClick={toggleSb} aria-label="Показать чаты" title="Чаты · Ctrl+B"><PanelLeft size={18} /></button>
          <AnimatePresence>{fold && <motion.button key="nc" type="button" className="btn ghost aim-newmini" onClick={newChat} title="Новый чат" initial={{ opacity: 0, scale: 0.8, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }}><Plus size={17} /></motion.button>}</AnimatePresence>
          <HeadTitle key={chatId || 'new'} title={title || (msgs.length ? 'Новый чат' : '')} editable={!!chatId} onRename={renameChat} />
          {chatId && msgs.length > 0 && <HeadMenu onExport={exportChat} onDelete={deleteChat} />}
        </div>
        <div className="aim-scroll" ref={sc} onScroll={onScroll}>
          <motion.div className="aim-col" ref={col} key={chatId || 'new'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
            {loadingChat ? <Thinking text="Открываю чат" h={36} /> : !msgs.length ? <Welcome composer={composer} fill={(x, sk) => { setText(x); if (sk !== undefined) setSkill(sk); setTimeout(() => { const t = ta.current; if (t) { t.focus(); t.setSelectionRange(x.length, x.length); } }, 30); }} /> : msgs.map((m, i) => (
              m.role === 'user'
                ? <motion.div key={m.id} className="msg me" initial={msgs.length > 2 && i < msgs.length - 2 ? false : { opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ transformOrigin: '100% 100%' }}>
                  <div className="me-b">{m.q}{m.files?.length > 0 && <div className="me-files">{m.files.map((n) => <span key={n}><FileThumb name={n} size={22} />{n}</span>)}</div>}</div>
                  <div className="me-act">
                    <button type="button" className="act" title="Копировать вопрос" onClick={() => navigator.clipboard.writeText(m.q)}><Copy size={14} /></button>
                    <button type="button" className="act" title="Вставить в поле и поправить" onClick={() => { setText(m.q); setTimeout(() => ta.current?.focus(), 30); }}><Pencil size={14} /></button>
                  </div>
                </motion.div>
                : <Answer key={m.id} m={m} live={!m.old && i === msgs.length - 1} onAsk={send} onRetry={m.st === 'error' && i === msgs.length - 1 ? () => retry(i) : null}
                  onRegen={m.st === 'done' && i === msgs.length - 1 && !busy ? () => retry(i) : null} onExport={i === msgs.length - 1 ? exportChat : null} />
            ))}
            <div ref={end} style={{ height: 1 }} />
          </motion.div>
        </div>
        <AnimatePresence>
          {away && msgs.length > 0 && (
            <motion.button key="down" type="button" className="aim-down" onClick={() => toBottom()} aria-label="К последнему сообщению"
              initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.8 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
              <ArrowDown size={16} />{busy && <span className="aim-down-dot" />}
            </motion.button>
          )}
        </AnimatePresence>
        {msgs.length > 0 || loadingChat ? composer : null}
        {msgs.length > 0 && <div className="aim-note c3">Буквоед ищет по базе и в интернете и может ошибаться — проверяйте по источникам.</div>}
      </section>
      <AnimatePresence>{conModal && <ConnectorsModal onClose={() => setConModal(false)} />}</AnimatePresence>
      <AnimatePresence>{setTab && <AISettings key="as" tab={setTab} onClose={() => { setSetTab(''); window.dispatchEvent(new Event('kb:prefs')); }} />}</AnimatePresence>
    </div>
  );
}

// поток ответа ИИ-чата (SSE через fetch: нужен POST с телом)
async function streamChat({ q, chat_id, context, model, signal, skill, thinking, effort, web }, onEvent) {
  return apiStream('/v1/ai/chat', { model }, signal, onEvent, { method: 'POST', body: JSON.stringify({ q, chat_id, context, skill, thinking, effort, web }) });
}

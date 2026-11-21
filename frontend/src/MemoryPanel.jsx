// Раздел «Память» в настройках ИИ: что Буквоед помнит о пользователе — просмотр, правка, удаление.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, KEY } from './api.js';

// Долгая память ИИ: факты о пользователе и его делах, которые Буквоед учитывает в новых чатах.
// Раздел окна настроек: автосохранение, поиск, правка, удаление, добавление вручную и очистка.

const EASE = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] };
const MAX = 300;

async function send(path, method, body) {
  const r = await fetch(path, {
    method,
    headers: { ...(KEY ? { 'X-API-Key': KEY } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const b = await r.json().catch(() => ({}));
  if (r.status === 401) window.dispatchEvent(new Event('lex:401'));
  if (!r.ok) throw new Error(b.error || 'Не получилось сохранить. Повторите попытку.');
  return b;
}

const when = (at) => {
  const d = new Date(at);
  return isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

function MemItem({ it, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(it.text);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => { if (edit) { done.current = false; ref.current?.focus(); ref.current?.select(); } }, [edit]);
  useEffect(() => { if (!edit) setText(it.text); }, [it.text, edit]);
  const save = () => {
    if (done.current) return;
    done.current = true;
    setEdit(false);
    const t = text.trim();
    if (t && t !== it.text) onSave(it, t);
    else setText(it.text);
  };
  return (
    <motion.div layout="position" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE} style={{ overflow: 'hidden' }}>
      <div className="cm-it mem-it">
        <span>
          {edit
            ? <input ref={ref} className="mem-edit" value={text} maxLength={MAX} aria-label="Текст записи" onChange={(e) => setText(e.target.value)} onBlur={save}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { done.current = true; setText(it.text); setEdit(false); } }} />
            : <b className="mem-t" onDoubleClick={() => setEdit(true)}>{it.text}</b>}
          <small className="c3">{it.auto ? 'авто' : 'вручную'}{when(it.at) ? ' · ' + when(it.at) : ''}</small>
        </span>
        {!edit && <button type="button" className="act" title="Изменить" aria-label="Изменить" onClick={() => setEdit(true)}><Pencil size={14} /></button>}
        <button type="button" className="act" title="Удалить" aria-label="Удалить" onMouseDown={(e) => e.preventDefault()} onClick={() => onDelete(it)}><Trash2 size={15} /></button>
      </div>
    </motion.div>
  );
}

export default function MemoryPanel() {
  const [items, setItems] = useState(null);
  const [auto, setAuto] = useState(true);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = () => api('/v1/memory').then((r) => { setItems(r.items || []); setAuto(r.autosave !== false); setErr(''); }, (e) => { setItems([]); setErr(e.message); });
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 4000); return () => clearTimeout(t); }, [confirm]);

  const fail = (e) => { setErr(e.message); load(); };

  const toggle = () => {
    const v = !auto;
    setAuto(v);
    send('/v1/memory/settings', 'PUT', { autosave: v }).catch((e) => { setAuto(!v); setErr(e.message); });
  };

  const add = async (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await send('/v1/memory', 'POST', { text: t });
      if (r.dup) setErr('Это уже есть в памяти');
      else setItems((xs) => [r.item, ...(xs || [])]);
      setDraft('');
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  const save = (it, text) => {
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, text, auto: false } : x)));
    send('/v1/memory/' + encodeURIComponent(it.id), 'PATCH', { text }).then((r) => setItems((xs) => xs.map((x) => (x.id === it.id ? r.item : x))), fail);
  };

  const del = (it) => {
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    send('/v1/memory/' + encodeURIComponent(it.id), 'DELETE').catch(fail);
  };

  const clear = () => {
    if (!confirm) { setConfirm(true); return; }
    setConfirm(false);
    setItems([]);
    send('/v1/memory', 'DELETE').catch(fail);
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items || []).filter((x) => !s || x.text.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <section className="mem">
      <p className="c2 cm-p">Буквоед запоминает то, что пригодится в следующих разговорах: кто вы, ваши клиенты и дела, пожелания к ответам. Ответы от этого точнее, а повторять одно и то же не нужно. Пароли и платёжные данные не сохраняются.</p>

      <div className="mem-r">
        <span className="mem-rt"><b>Сохранять память автоматически</b><small className="c3">После ответа Буквоед сам выбирает, что стоит запомнить</small></span>
        <button type="button" role="switch" aria-checked={auto} aria-label="Сохранять память автоматически" className={'tgl' + (auto ? ' on' : '')} onClick={toggle}><i /></button>
      </div>

      {items?.length > 0 && (
        <label className="mem-q">
          <Search size={15} className="c3" />
          <input type="search" placeholder="Поиск по памяти" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      )}

      <div className="cm-list mem-list">
        <AnimatePresence initial={false}>
          {shown.map((it) => <MemItem key={it.id} it={it} onSave={save} onDelete={del} />)}
        </AnimatePresence>
        {items && !items.length && <div className="c3 cm-empty">Пока ничего не запомнено. Расскажите о себе в чате или добавьте запись вручную.</div>}
        {items?.length > 0 && !shown.length && <div className="c3 cm-empty">Ничего не найдено</div>}
        {!items && <div className="c3 cm-empty">Загружаю…</div>}
      </div>

      <form className="cm-f mem-add" onSubmit={add}>
        <input placeholder="Например: «Я юрист застройщика, веду споры с дольщиками»" value={draft} maxLength={MAX} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn pri" disabled={busy || !draft.trim()}><Plus size={15} />Добавить</button>
      </form>

      {err && <div className="err">{err}</div>}

      {items?.length > 0 && (
        <button type="button" className={'act mem-clear' + (confirm ? ' on' : '')} onClick={clear}><Trash2 size={14} />{confirm ? 'Точно очистить?' : 'Очистить всю память'}</button>
      )}
    </section>
  );
}

// Быстрый переход по Ctrl+K: страницы, недавние запросы, действия.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api.js';
import { spring } from './ui.jsx';
import { Icon } from './icons.jsx';

// Командная палитра ⌘K: переходы по разделам + живой поиск дел и законов.
export default function Cmdk({ open, onClose }) {
  const to = (h) => { location.hash = h; };
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ cases: [], law: [] });
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState(0);
  const inp = useRef(null);

  useEffect(() => { if (open) { setQ(''); setRes({ cases: [], law: [] }); setAct(0); setTimeout(() => inp.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 3) { setRes({ cases: [], law: [] }); return; }
    const c = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api('/v1/search', { q: q.trim() }, c.signal);
        setRes({ cases: (r.arbitr?.cases || []).slice(0, 5), law: (r.law || []).filter((h) => h.id).slice(0, 5) });
      } catch { /* палитра молчит об ошибках */ }
      if (!c.signal.aborted) setBusy(false);
    }, 280);
    return () => { clearTimeout(t); c.abort(); };
  }, [q]);

  const nav = [
    ['#/app', 'Поиск', 'search'], ['#/app?s=arbitr', 'Арбитраж', 'arbitr'], ['#/app?s=courts', 'Суды общей юрисдикции', 'courts'],
    ['#/app?s=law', 'Законодательство', 'law'], ['#/integrations', 'Интеграции', 'api'], ['#/', 'О сервисе', 'about'],
  ];
  const app = (o) => to('#/app?' + new URLSearchParams({ q: q.trim(), o }));
  const items = useMemo(() => {
    const f = q.toLowerCase();
    return [
      ...nav.filter(([, l]) => !f || l.toLowerCase().includes(f)).map(([v, l, ic]) => ({ grp: 'Разделы', ic, label: l, run: () => to(v) })),
      ...res.cases.map((c) => ({ grp: 'Дела', ic: 'arbitr', label: c.number, sub: (c.plaintiffs?.[0]?.name || '') + ' — ' + (c.respondents?.[0]?.name || ''), run: () => app('case:' + c.guid) })),
      ...res.law.map((h) => ({ grp: 'Законодательство', ic: 'law', label: h.title, sub: h.snippet || h.edition, run: () => app('law:' + h.id) })),
      ...(q.trim() ? [{ grp: 'Действия', ic: 'search', label: `Искать везде «${q.trim()}»`, run: () => to('#/app?' + new URLSearchParams({ q: q.trim() })) }] : []),
    ];
  }, [q, res]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && items[act]) { items[act].run(); onClose(); }
    if (e.key === 'Escape') onClose();
  };
  let last = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="cmdk-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="cmdk" initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring}>
            <input ref={inp} value={q} onChange={(e) => { setQ(e.target.value); setAct(0); }} onKeyDown={key} placeholder="Дело, ИНН, закон или раздел…" />
            <div className="res">
              {items.map((it, i) => {
                const head = it.grp !== last ? <div key={'g' + i} className="grp eyebrow">{(last = it.grp)}</div> : null;
                return [head, (
                  <div key={i} className="it" onMouseEnter={() => setAct(i)} onClick={() => { it.run(); onClose(); }}>
                    {act === i && <motion.span layoutId="cmdk-hl" className="hl" transition={spring} />}
                    <span className="ic"><Icon name={it.ic} size={15} /></span>
                    <span style={{ minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
                      {it.sub && <div className="c3" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub}</div>}
                    </span>
                  </div>
                )];
              })}
              {busy && <div className="c3" style={{ padding: '10px 12px', fontSize: 13 }}>Ищем…</div>}
            </div>
            <div className="foot"><span><span className="kbd">↑↓</span> выбор</span><span><span className="kbd">↵</span> открыть</span><span><span className="kbd">Esc</span> закрыть</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

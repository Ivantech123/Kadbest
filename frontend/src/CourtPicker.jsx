// Выбор суда общей юрисдикции: регион, тип, поиск по названию и адресу.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api.js';
import { spring } from './ui.jsx';
import { Icon } from './icons.jsx';

// Выбор суда из всех судов общей юрисдикции страны: поиск по названию, городу, региону,
// недавние суды сверху, управление с клавиатуры.
const RECENT = 'kbCourts';
const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
export const rememberCourt = (c) => {
  try { localStorage.setItem(RECENT, JSON.stringify([c, ...recent().filter((x) => x.code !== c.code)].slice(0, 6))); } catch { /* приватный режим */ }
};
export const lastCourt = () => recent()[0] || null;

const LEVEL = { district: 'районный', regional: 'областной', appeal: 'апелляционный', cassation: 'кассационный', magistrate: 'мировой', garrison_military: 'гарнизонный военный', district_military: 'окружной военный', appeal_military: 'апелляционный военный', cassation_military: 'кассационный военный' };

export default function CourtPicker({ value, onChange }) {
  const [open, setOpen] = useState(!value);
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ total: 0, items: [] });
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef(null), inp = useRef(null);
  const rec = recent();

  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 30); }, [open]);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (value && !box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open, value]);
  useEffect(() => {
    if (!open || q.trim().length < 2) { setRes({ total: 0, items: [] }); return; }
    const c = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await api('/v1/courts/list', { q: q.trim(), limit: 40 }, c.signal); setRes(r); setAct(0); } catch { /* тихо */ }
      if (!c.signal.aborted) setBusy(false);
    }, 180);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, open]);

  const items = q.trim().length >= 2 ? res.items : rec;
  const pick = (c) => { rememberCourt(c); onChange(c); setOpen(false); setQ(''); };
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && items[act]) { e.preventDefault(); pick(items[act]); }
    if (e.key === 'Escape' && value) setOpen(false);
  };
  let lastRegion = '';

  return (
    <div className="cpick" ref={box}>
      {!open && value ? (
        <button type="button" className="cpick-cur" onClick={() => setOpen(true)}>
          <span className="cpick-ic"><Icon name="courts" size={18} /></span>
          <span style={{ minWidth: 0, textAlign: 'left' }}>
            <span className="cpick-name">{value.name}</span>
            <span className="c3 cpick-sub">{[value.region, LEVEL[value.level]].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="btn ghost" style={{ marginLeft: 'auto' }}>Сменить суд</span>
        </button>
      ) : (
        <div className="cpick-open">
          <label className="search" style={{ height: 46 }}>
            <Icon name="search" size={16} />
            <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Город, район или название суда — например «Казань» или «Чкаловский»" />
            {busy && <span className="spin" style={{ color: 'var(--fg3)' }} />}
            {value && <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Отмена</button>}
          </label>
          <AnimatePresence>
            <motion.div className="cpick-list" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              {q.trim().length < 2 && (
                <div className="cpick-hint">
                  {rec.length ? <span className="eyebrow">Недавние суды</span> : <span className="c3">Введите хотя бы 2 буквы: город, район или название. В справочнике — все районные и областные суды России.</span>}
                </div>
              )}
              {q.trim().length >= 2 && !busy && !items.length && <div className="cpick-hint c3">Ничего не нашли — попробуйте город или регион.</div>}
              {items.map((c, i) => {
                const head = q.trim().length >= 2 && c.region !== lastRegion ? <div key={'r' + c.code} className="cpick-region eyebrow">{(lastRegion = c.region)}</div> : null;
                return [head, (
                  <button type="button" key={c.code} className={'cpick-it' + (i === act ? ' on' : '')} onMouseEnter={() => setAct(i)} onClick={() => pick(c)}>
                    <span className="cpick-name">{c.name}</span>
                    <span className="c3 cpick-sub">{c.address || c.region}</span>
                  </button>
                )];
              })}
              {res.total > res.items.length && q.trim().length >= 2 && <div className="cpick-hint c3">Показаны {res.items.length} из {res.total} — уточните запрос.</div>}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

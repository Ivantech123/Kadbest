// Общие элементы интерфейса: кнопки, сегменты, скелетоны, ошибки, анимации.
import { react } from './react.js';
import GhostMini from './GhostMini.jsx';
import { WideThinking } from './ThinkingPill.jsx';
import { useEffect, useRef, useState } from 'react';
import { motion, animate, useInView } from 'motion/react';

// Пружины в духе системных анимаций Apple: быстрые, без «резиновости».
export const spring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
export const soft = { type: 'spring', stiffness: 260, damping: 32 };

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { ...soft, delay: Math.min(i, 12) * 0.03 } }),
};

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  );
}

export function Chevron() {
  return (
    <svg className="chev" width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m1.5 1.5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Skeleton({ n = 4 }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk" />
      ))}
    </div>
  );
}

export function ErrorBox({ error }) {
  useEffect(() => { react('shake'); }, [error]);
  return (
    <motion.div className="err bq-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
      <GhostMini size={34} sad blink={false} />
      <span>{error?.message || String(error)}</span>
    </motion.div>
  );
}

export const kinds = { A: ['Экономический спор', 'blue'], B: ['Банкротство', 'red'], G: ['Гражданское', 'green'] };

export function Pill({ color, children }) {
  return <span className={'pill ' + (color || '')}>{children}</span>;
}

export function KindPill({ kind }) {
  const k = kinds[kind];
  return k ? <Pill color={k[1]}>{k[0]}</Pill> : null;
}

// Сгруппированный список: строки появляются каскадом.
export function List({ children, style }) {
  return (
    <motion.div className="list spot" style={style} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function Row({ i = 0, onClick, children, static: isStatic }) {
  return (
    <motion.div
      className="row"
      variants={fadeUp}
      custom={i}
      onClick={onClick}
      whileTap={isStatic ? undefined : { scale: 0.995 }}
      style={isStatic ? { cursor: 'default', paddingRight: 16 } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
      {!isStatic && <Chevron />}
    </motion.div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Сегментированный контрол: «ползунок» переезжает за выбранным сегментом.
export function Segmented({ value, onChange, options, id }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="tab" aria-selected={v === value} onClick={() => onChange(v)}>
          {v === value && <motion.span layoutId={'seg-' + id} className="thumb" transition={spring} />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// Число «докручивается» до значения при появлении.
export function CountUp({ value, format = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)), suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView || typeof value !== 'number') return;
    const c = animate(0, value, { duration: 0.8, ease: [0.2, 0.8, 0.2, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{typeof value === 'number' ? format(v) + suffix : value}</span>;
}

// Горизонтальные столбцы от нуля; подпись — над полосой, значение — справа.
export function HBars({ rows, n = 7 }) {
  if (!rows.length) return <div className="t-foot c2">Нет данных</div>;
  const max = rows[0][1] || 1;
  return (
    <div className="hb" role="list">
      {rows.slice(0, n).map(([k, v], i) => (
        <div key={k} style={{ display: 'contents' }} role="listitem" aria-label={`${k}: ${v}`}>
          <div className="lab" title={k}>{k}</div>
          <div className="n">{v}</div>
          <div className="track">
            <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: v / max }} transition={{ ...soft, delay: i * 0.05 }} style={{ width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Линейный график по месяцам: сетка в три линии, подписи справа, линия «прорисовывается».
export function LineChart({ rows }) {
  if (rows.length < 2) return <div className="t-foot c2">Недостаточно данных для динамики</div>;
  const W = 600, H = 170;
  const max = Math.max(...rows.map((r) => r[1]));
  const top = Math.ceil(max / 5) * 5 || 5;
  const step = (W - 30) / (rows.length - 1);
  const y = (v) => H - 20 - (v / top) * (H - 34);
  const pts = rows.map(([, v], i) => [i * step, y(v)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
  const lbl = (r) => {
    const [yy, mm, dd] = r[0].split('-');
    return dd ? `${dd}.${mm}` : new Date(+yy, +mm - 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  };
  return (
    <svg className="line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Новые дела по месяцам">
      {[0, top / 2, top].map((v) => (
        <g key={v}>
          <line x1="0" x2={W - 30} y1={y(v)} y2={y(v)} stroke="var(--sep)" />
          <text x={W - 24} y={y(v) + 4}>{v}</text>
        </g>
      ))}
      <motion.path d={d} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
      {pts.map((p, i) => (
        <motion.circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--card)" stroke="var(--blue)" strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.3 + i * 0.03 }}>
          <title>{`${lbl(rows[i])}: ${rows[i][1]} дел`}</title>
        </motion.circle>
      ))}
      <text x="0" y={H - 2}>{lbl(rows[0])}</text>
      <text x={W - 30} y={H - 2} textAnchor="end">{lbl(rows.at(-1))}</text>
    </svg>
  );
}

export function ChartCard({ title, sub, children, i = 0 }) {
  return (
    <motion.div className="card chart spot" variants={fadeUp} custom={i} initial="hidden" animate="show">
      <h3 className="t-head">{title}</h3>
      <p className="t-foot c2">{sub}</p>
      {children}
    </motion.div>
  );
}

// Простой хук запроса: { data, error, loading, run }.
export function useAsync() {
  const [st, set] = useState({ loading: false, data: null, error: null });
  const ctl = useRef(null);
  const run = async (fn) => {
    ctl.current?.abort();
    const c = (ctl.current = new AbortController());
    set((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn(c.signal);
      if (!c.signal.aborted) set({ loading: false, data, error: null });
      return data;
    } catch (error) {
      if (!c.signal.aborted) set({ loading: false, data: null, error });
    }
  };
  return { ...st, run, reset: () => set({ loading: false, data: null, error: null }) };
}

// Прелоадер долгих операций: бегущая полоса + сменяющиеся этапы, чтобы ожидание
// в 10–40 секунд не выглядело зависанием. stages: [[секунда, текст], ...].
export function Loading({ stages = [[0, 'Загружаем…']], compact }) {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  const cur = [...stages].reverse().find(([s]) => t >= s)?.[1];
  return <div role="status" aria-live="polite"><WideThinking text={cur} h={compact ? 46 : 56} /></div>;
}

// Ожидание ответа: сразу живой градиент со статусом — без скелетонов и прочего.
export function Pending({ stages = [[0, 'Ищем…']] }) {
  return <Loading stages={stages} compact />;
}

// Скачивание текста файлом (UTF-8 с BOM — Word и Блокнот открывают без «кракозябр»).
export function saveText(name, text, type = 'text/plain') {
  const safe = String(name || 'документ').replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'документ';
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = safe + (/\.\w{2,4}$/.test(safe) ? '' : '.txt');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

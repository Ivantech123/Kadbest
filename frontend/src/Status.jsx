// Страница статуса источников за 30 дней.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { fadeUp, soft, Segmented } from './ui.jsx';
import { Icon } from './icons.jsx';
import { Thinking } from './ThinkingPill.jsx';

// Статус служб: состояние сейчас и история (сервер проверяет службы каждые 5 минут и хранит 30 дней).
// Сайт и MCP дополнительно проверяются из браузера в момент открытия страницы.
const ICONS = { arbitr: 'arbitr', courts: 'courts', law: 'law', articles: 'law', acts: 'law', site: 'search', mcp: 'ai' };

const pct = (u) => (u < 0 ? '—' : u === 1 ? '100%' : (Math.floor(u * 10000) / 100).toFixed(2) + '%');
const ms = (v) => (v == null ? '' : v < 1000 ? `${v} мс` : `${(v / 1000).toFixed(1)} с`);
const tone = (u) => (u < 0 ? 'none' : u >= 0.995 ? 'ok' : u >= 0.9 ? 'warn' : 'bad');
const when = (t, hours) => new Date(t * 1000).toLocaleString('ru-RU', hours
  ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  : { day: 'numeric', month: 'long' });

async function live() {
  const out = {};
  const t = performance.now();
  try {
    const r = await fetch('/v1/status');
    const data = await r.json();
    out.site = { ok: r.ok, ms: Math.round(performance.now() - t) };
    out.data = data;
  } catch { out.site = { ok: false }; }
  try {
    const t2 = performance.now();
    const r = await fetch('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"ping"}' });
    out.mcp = { ok: r.status === 200 || r.status === 401, ms: Math.round(performance.now() - t2) }; // 401 — сервис жив, просто нужен ключ
  } catch { out.mcp = { ok: false }; }
  return out;
}

function Bars({ items, hours }) {
  return (
    <div className={'ubars' + (hours ? ' h' : '')}>
      {items.map((b) => (
        <span key={b.t} className={'ub ' + tone(b.uptime)}
          title={`${when(b.t, hours)} · ${b.uptime < 0 ? 'нет данных' : pct(b.uptime) + (b.fails ? ` · сбоев: ${b.fails}` : '') + (b.ms ? ` · ${ms(b.ms)}` : '')}`} />
      ))}
    </div>
  );
}

export default function Status() {
  const [st, setSt] = useState(null);
  const [at, setAt] = useState(null);
  const [range, setRange] = useState('days');
  useEffect(() => {
    let alive = true;
    const run = () => live().then((r) => { if (alive) { setSt(r); setAt(new Date()); } });
    run();
    const i = setInterval(run, 60000);
    return () => { alive = false; clearInterval(i); };
  }, []);

  const svcs = st?.data?.services || [];
  const nowOk = (s) => (s.now ? s.now.ok : null);
  const down = !st ? 0 : svcs.filter((s) => nowOk(s) === false).length + (st.site.ok ? 0 : 1) + (st.mcp.ok ? 0 : 1);
  const incidents = svcs.flatMap((s) => (s.incidents || []).map((p) => ({ ...p, name: s.name }))).sort((a, b) => b.t - a.t).slice(0, 8);
  const known = svcs.filter((s) => s.uptime30d >= 0);
  const avg30 = known.length ? known.reduce((a, s) => a + s.uptime30d, 0) / known.length : -1;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <motion.div className={'status-hero ' + (!st ? '' : down ? 'warn' : 'ok')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
        <span className="status-big"><i /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">Статус KadBest</div>
          <h1>{!st ? <Thinking text="Буквоед проверяет службы" h={44} /> : down ? `Часть служб работает с задержкой (${down})` : 'Все системы работают'}</h1>
          <p className="c3 mono" style={{ fontSize: 12.5, margin: 0 }}>{at ? `Обновлено в ${at.toLocaleTimeString('ru-RU')} · службы проверяются каждые 5 минут` : ''}</p>
        </div>
        {avg30 >= 0 && <div className="status-kpi"><div className="mono">{pct(avg30)}</div><div className="c3">доступность за 30 дней</div></div>}
      </motion.div>

      <div className="status-tools">
        <span className="eyebrow">Службы</span>
        <Segmented id="st-range" value={range} onChange={setRange} options={[['days', '30 дней'], ['hours', '24 часа']]} />
      </div>

      <div className="list">
        {[['site', 'Сайт и API', 'Поиск, аккаунты, REST API'], ['mcp', 'Подключение ИИ-ассистентов', 'MCP для Claude, Cursor и других']].map(([k, name, sub], i) => {
          const s = st?.[k];
          return (
            <motion.div key={k} className="row svc-row" variants={fadeUp} custom={i} initial="hidden" animate="show">
              <span className="svc-ic"><Icon name={ICONS[k]} size={18} /></span>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }}>{name}</div><div className="c3" style={{ fontSize: 13 }}>{sub}</div></div>
              <div className="svc-state">
                {s?.ok && <span className="mono c3" style={{ fontSize: 12 }}>{ms(s.ms)}</span>}
                {!s ? <Thinking text="Проверяем" h={24} /> : <span className={'pill ' + (s.ok ? 'green' : 'orange')}>{s.ok ? 'работает' : 'с задержкой'}</span>}
              </div>
            </motion.div>
          );
        })}
        {svcs.map((s, i) => {
          const ok = nowOk(s);
          const bars = range === 'days' ? s.days : s.hours;
          return (
            <motion.div key={s.key} className="row svc-row svc-hist" variants={fadeUp} custom={i + 2} initial="hidden" animate="show">
              <span className="svc-ic"><Icon name={ICONS[s.key] || 'search'} size={18} /></span>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }}>{s.name}</div><div className="c3" style={{ fontSize: 13 }}>{s.sub}</div></div>
              <div className="svc-state">
                {ok && <span className="mono c3" style={{ fontSize: 12 }}>{ms(s.now.ms)}</span>}
                <span className={'pill ' + (ok == null ? '' : ok ? 'green' : 'orange')}>{ok == null ? 'нет данных' : ok ? 'работает' : 'с задержкой'}</span>
              </div>
              <div className="svc-bars">
                <Bars items={bars} hours={range === 'hours'} />
                <div className="ubars-legend c3 mono">
                  <span>{range === 'days' ? '30 дней назад' : '24 часа назад'}</span>
                  <span>{pct(range === 'days' ? s.uptime30d : s.uptime24h)} доступность</span>
                  <span>сейчас</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="status-tools" style={{ marginTop: 28 }}><span className="eyebrow">Последние сбои</span></div>
      {incidents.length === 0
        ? <div className="card" style={{ padding: 18 }}><span className="c2">Сбоев за последние 30 дней не было.</span></div>
        : (
          <div className="list">
            {incidents.map((p, k) => (
              <div key={k} className="row svc-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div><div style={{ fontWeight: 500 }}>{p.name}</div><div className="c3" style={{ fontSize: 13 }}>Служба не ответила при проверке. Остальные разделы поиска продолжали работать.</div></div>
                <span className="mono c3" style={{ fontSize: 12 }}>{when(p.t, true)}</span>
              </div>
            ))}
          </div>
        )}

      <p className="c3" style={{ fontSize: 13, marginTop: 16 }}>
        Если служба работает с задержкой, поиск всё равно отвечает: недоступный раздел просто временно не попадает в выдачу.
        {st?.data?.version && <> Версия {st.data.version} · <a href="#/changelog">что нового</a>.</>}
      </p>
    </div>
  );
}

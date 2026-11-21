// Лимиты: полосы расхода по пулам «Поиск» и «ИИ», таблица стоимости действий.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

// Лимиты как в Claude: окно сессии (5 часов с первого запроса) и неделя — проценты и время до обновления.

function left(iso) {
  if (!iso) return '';
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'обновляется';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return 'обновится ' + new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return 'обновится через ' + (h ? `${h} ч ` : '') + `${m} мин`;
}

function Bar({ label, sub, w }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const pct = w?.pct ?? 0;
  const tone = pct >= 90 ? 'red' : pct >= 70 ? 'amber' : '';
  return (
    <div className={'ubar ' + tone}>
      <div className="ubar-top"><b>{label}</b><span className="mono">{pct}%</span></div>
      <div className="ubar-t"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
      <div className="ubar-sub c3">{w?.resets ? left(w.resets) : sub}</div>
    </div>
  );
}

export function UsageBars({ user, compact }) {
  const u = user?.usage;
  if (!u || !u.session?.limit) return null;
  return (
    <div className={'usage2 pools' + (compact ? ' compact' : '')}>
      <div className="pool"><div className="pool-h">Поиск</div>
        <Bar label="Сессия" sub="5 часов с первого запроса" w={u.session} />
        <Bar label="Неделя" sub="7 дней с первого запроса" w={u.week} />
      </div>
      {u.ai?.session?.limit > 0 && (
        <div className="pool ai"><div className="pool-h">ИИ</div>
          <Bar label="Сессия" sub="5 часов с первого сообщения" w={u.ai.session} />
          <Bar label="Неделя" sub="7 дней с первого сообщения" w={u.ai.week} />
        </div>
      )}
    </div>
  );
}

// худший процент по всем окнам — для кружка в шапке
export const worstPct = (u) => Math.max(u?.session?.pct ?? 0, u?.week?.pct ?? 0, u?.ai?.session?.pct ?? 0, u?.ai?.week?.pct ?? 0);

// Сколько стоят действия — в единицах лимита.
export const COSTS = [
  ['Поиск', 'номер дела, ИНН, статья, закон или вопрос словами', '1', 'search'],
  ['Карточки дел, тексты статей, страницы выдачи', 'внутри найденного', '0', 'search'],
  ['Сообщение в ИИ-чате или справка — «Быстрая»', 'Буквоед сам ищет по базе и в интернете', '1', 'ai'],
  ['То же — «Умная»', 'глубже разбирает вопрос', '4', 'ai'],
  ['То же — «Максимум»', 'самая сильная модель', '12', 'ai'],
  ['Чтение документа', 'за каждый файл', '3', 'ai'],
];

export function CostTable() {
  return (
    <div className="costs">
      {['search', 'ai'].map((pool) => (
        <div key={pool} className="cost-g">
          <div className="cost-gh">{pool === 'ai' ? 'Лимит «ИИ»' : 'Лимит «Поиск»'}</div>
          {COSTS.filter((x) => x[3] === pool).map(([t, d, c]) => (
            <div key={t} className="cost-r"><div><b>{t}</b><span className="c3">{d}</span></div><span className={'cost-v mono' + (c === '0' ? ' free' : '')}>{c === '0' ? 'бесплатно' : c}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Короткая сводка лимитов для меню профиля: по строке на пул — полоса сессии и процент недели.
export function MiniUsage({ user }) {
  const u = user?.usage;
  if (!u || !u.session?.limit) return null;
  const rows = [['Поиск', u.session, u.week]];
  if (u.ai?.session?.limit > 0) rows.push(['ИИ', u.ai.session, u.ai.week]);
  return (
    <div className="mu">
      {rows.map(([name, ses, wk]) => {
        const pct = ses?.pct ?? 0;
        const tone = Math.max(pct, wk?.pct ?? 0) >= 90 ? 'red' : Math.max(pct, wk?.pct ?? 0) >= 70 ? 'amber' : '';
        return (
          <div key={name} className={'mu-r ' + tone} title={ses?.resets ? left(ses.resets) : ''}>
            <span className="mu-n">{name}</span>
            <span className="mu-t"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(0.02, pct / 100) }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} /></span>
            <span className="mu-p mono">{pct}%</span>
            <span className="mu-w c3">нед. {wk?.pct ?? 0}%</span>
          </div>
        );
      })}
    </div>
  );
}

// Страница тарифов: лимиты, калькулятор расхода, сравнение, вопросы.
import { useState } from 'react';
import { motion } from 'motion/react';
import { Brain, Clock, FileText, Gem, Hash, MessageCircle, Repeat, Search, Zap } from 'lucide-react';
import { Pricing, useAccount } from './account.jsx';
import { CostTable, UsageBars } from './Usage.jsx';
import Mascot from './Mascot.jsx';
import GhostMini from './GhostMini.jsx';

// Страница тарифов: тарифы, как работают лимиты (окно сессии и неделя), сколько стоит действие,
// калькулятор расхода, модели ИИ, сравнение и вопросы. Числа — из /v1/plans (accounts.Plans) и Usage.jsx.

const inView = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { type: 'spring', stiffness: 110, damping: 20 } };
const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
const AI = { fast: 1, smart: 4, max: 12 };

// Схема окон: сессия на 5 часов от первого запроса, затем обновление.
function Windows() {
  const marks = [[0, 'Первый запрос — окно сессии началось'], [36, 'Работаете: расход копится'], [100, 'Через 5 часов — лимит сессии снова 100%']];
  return (
    <div className="pw-diag">
      <div className="pw-row">
        <span className="pw-lab"><Clock size={15} />Сессия · 5 часов</span>
        <div className="pw-track">
          <motion.i className="pw-fill" initial={{ width: 0 }} whileInView={{ width: '72%' }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut' }} />
          {marks.map(([x, t]) => <span key={x} className="pw-mark" style={{ left: x + '%' }}><b />{t}</span>)}
        </div>
      </div>
      <div className="pw-row">
        <span className="pw-lab"><Repeat size={15} />Неделя · 7 дней</span>
        <div className="pw-track week">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => (
            <motion.span key={d} className="pw-day" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}
              style={{ height: [60, 85, 40, 95, 70, 15, 5][i] + '%' }}><em>{d}</em></motion.span>
          ))}
        </div>
      </div>
      <p className="c2 pw-note">Оба окна начинаются с вашего первого запроса. Действие проходит, если хватает и лимита сессии, и недельного. Кончилась сессия — подождите, пока она обновится, или перейдите на тариф побольше. Кончилась неделя — то же самое, но обновится через 7 дней от её начала.</p>
    </div>
  );
}

// Примеры из жизни юриста
const CASES = [
  [Hash, 'Проверить контрагента', 'ИНН → профиль компании, открыть 3 карточки дел', [['ИНН', 1, 'поиск'], ['3 карточки дел', 0, 'поиск']]],
  [FileText, 'Разобрать претензию с договором', '2 документа с вопросом в ИИ-чате, потом 2 уточнения', [['2 документа', 6, 'ИИ'], ['3 сообщения', 3, 'ИИ']]],
  [MessageCircle, 'Подготовиться к спору', 'Вопрос и 3 уточнения в ИИ-чате на «Умной» модели', [['4 сообщения', 16, 'ИИ']]],
  [Search, 'День в суде', '10 номеров дел и 5 статей кодексов', [['10 номеров дел', 10, 'поиск'], ['5 статей', 5, 'поиск']]],
];

function Calc({ plans }) {
  const [v, setV] = useState({ searches: 15, chats: 6, docs: 2, model: 'fast', days: 5 });
  const set = (k) => (e) => setV({ ...v, [k]: +e.target.value || 0 });
  const sDay = v.searches, aDay = v.chats * AI[v.model] + v.docs * 3;
  const sWeek = sDay * v.days, aWeek = aDay * v.days;
  const ok = (p) => p.week >= sWeek && p.aiWeek >= aWeek && p.session >= Math.min(sDay, p.session) && (v.model !== 'smart' || p.id !== 'free') && (v.model !== 'max' || p.id === 'business');
  const fit = plans.find(ok);
  const rows = [['searches', 'Поисков в день', 'номер дела, ИНН, статья, вопрос', 0, 80], ['chats', 'Сообщений в ИИ-чате в день', '', 0, 60], ['docs', 'Документов в день', '', 0, 20], ['days', 'Рабочих дней в неделю', '', 1, 7]];
  return (
    <div className="calc">
      <div className="calc-in">
        {rows.map(([k, t, d, lo, hi]) => (
          <label key={k} className="calc-r">
            <span><b>{t}</b>{d && <small className="c3"> · {d}</small>}</span>
            <input type="range" min={lo} max={hi} value={v[k]} onChange={set(k)} />
            <span className="mono calc-n">{v[k]}</span>
          </label>
        ))}
        <div className="calc-r">
          <span><b>Модель ИИ</b></span>
          <div className="mpick">
            {[['fast', 'Быстрая'], ['smart', 'Умная'], ['max', 'Максимум']].map(([id, n]) => (
              <button key={id} type="button" className={'mpick-b' + (v.model === id ? ' on' : '')} onClick={() => setV({ ...v, model: id })}>
                {v.model === id && <motion.span layoutId="calc-m" className="mpick-thumb" />}<span className="mpick-in">{n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="calc-out">
        <GhostMini size={52} />
        <div className="calc-big">Поиск: <span className="mono">{fmt(sWeek)}</span> · ИИ: <span className="mono">{fmt(aWeek)}</span> ед. в неделю</div>
        {plans.map((p) => {
          const ps = Math.min(100, Math.round((sWeek / p.week) * 100)), pa = Math.min(100, Math.round((aWeek / p.aiWeek) * 100));
          return (
            <div key={p.id} className={'calc-p' + (fit?.id === p.id ? ' fit' : '')}>
              <div className="calc-p-top"><b>{p.name}</b><span className="mono">{ps >= 100 || pa >= 100 ? 'не хватит' : `поиск ${ps}% · ИИ ${pa}%`}</span></div>
              <div className="ubar-t"><motion.i animate={{ scaleX: Math.max(ps, pa) / 100 }} style={{ transformOrigin: 'left' }} /></div>
            </div>
          );
        })}
        <div className="calc-verdict">{fit ? <>Вам подойдёт <b>«{fit.name}»</b>{fit.price ? ` — ${fmt(fit.price)} ₽ в месяц` : ' — бесплатно'}.</> : <>Нужен объём больше «Бизнеса» — напишите нам, подберём условия.</>}</div>
      </div>
    </div>
  );
}

const MODELS = [
  [Zap, 'Быстрая', 'Отвечает за секунды. Хватает для большинства вопросов: найти норму, кратко объяснить, подсказать, что открыть.', '+0', 'Все тарифы'],
  [Brain, 'Умная', 'Глубже разбирает вопрос, точнее сопоставляет нормы и практику, лучше держит длинный диалог.', '+4', 'С «Про»'],
  [Gem, 'Максимум', 'Самая сильная модель — для сложных споров, многих документов и тонких вопросов толкования.', '+12', '«Бизнес»'],
];

const FAQ = [
  ['Что будет, когда лимит закончится?', 'Поиск подскажет, какое окно исчерпано и во сколько оно обновится. Можно подождать или перейти на тариф побольше — новый лимит начнёт действовать сразу после подключения.'],
  ['Повторный поиск тоже списывается?', 'Нет. Тот же поиск в течение 30 минут — бесплатно: вернулись из карточки в выдачу, обновили страницу — ничего не списалось. Карточки дел, тексты статей и страницы выдачи бесплатны всегда.'],
  ['Остаток переносится?', 'Нет — окно просто начинается заново. Зато лимит обновляется часто: каждые 5 часов и каждую неделю, без ожидания конца месяца.'],
  ['Запросы ИИ-ассистента через MCP и API считаются?', 'Да, из того же лимита: каждый поиск инструментами — 1 единица. Справки ИИ внутри ассистента не тарифицируются — их делает ваш ассистент.'],
  ['Почему вопрос словами дороже номера дела?', 'Номер дела, ИНН или статья — точный запрос в одну базу. Вопрос словами ищется сразу по нормам, законам, статьям, актам и проектам, а Буквоед ещё пишет краткую справку.'],
  ['Как оплатить?', 'Выберите тариф и нажмите «Оформить» — менеджер напишет вам в Telegram и подключит тариф после оплаты. Для юрлиц — счёт и закрывающие документы.'],
  ['Есть пробный период?', 'Первым новым пользователям «Про» на 7 дней бесплатно. И «Старт» бесплатен всегда — лимит просто меньше.'],
];

export default function PricingPage() {
  const { user, plans = [] } = useAccount();
  return (
    <div className="page pricing-page">
      <motion.section className="pp-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="eyebrow">Тарифы</div>
          <h1>Платите за работу, а не за доступ</h1>
          <p className="c2">Отдельные лимиты на поиск и на ИИ-чат, обновляются каждые 5 часов и каждую неделю. Поиск по базе — 1 единица, сообщение ИИ — от 1 до 12 по модели, карточки дел и тексты статей бесплатны.</p>
          {user && <div className="pp-mine"><div className="eyebrow" style={{ marginBottom: 8 }}>Ваш расход · «{user.plan.name}»</div><UsageBars user={user} /></div>}
        </div>
        <div className="pp-mascot"><Mascot size={170} /></div>
      </motion.section>

      <Pricing compact />

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Как работают лимиты</div>
        <h2>Два лимита — «Поиск» и «ИИ», у каждого сессия и неделя</h2>
        <Windows />
      </motion.section>

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Сколько стоит действие</div>
        <h2>Единицы лимита</h2>
        <div className="pp-two">
          <CostTable />
          <div className="pp-cases">
            {CASES.map(([I, t, d, items]) => (
              <div key={t} className="pp-case">
                <div className="pp-case-h"><span className="pp-ic"><I size={16} /></span><b>{t}</b></div>
                <div className="c3" style={{ fontSize: 12.5, margin: '2px 0 6px' }}>{d}</div>
                <div className="pp-items">{items.map(([n, c, pool]) => <span key={n}>{n} <b className="mono">{c || 'бесплатно'}</b>{c ? <small className="c3"> · {pool}</small> : null}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Калькулятор</div>
        <h2>Сколько нужно именно вам</h2>
        {plans.length > 0 && <Calc plans={plans} />}
      </motion.section>

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Модели ИИ</div>
        <h2>Быстрая, умная или максимум</h2>
        <div className="pp-models">
          {MODELS.map(([I, n, d, c, p]) => (
            <div key={n} className="pp-model"><span className="pp-ic big"><I size={20} /></span><b>{n}</b><p className="c2">{d}</p><div className="pp-model-f"><span className="cost-v mono">{c}</span><span className="c3">{p}</span></div></div>
          ))}
        </div>
        <p className="c3" style={{ fontSize: 13, marginTop: 10 }}>Модель выбирается переключателем рядом со справкой и в строке диалога. Доплата — к справке или ответу в диалоге.</p>
      </motion.section>

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Сравнение</div>
        <h2>Что входит в тарифы</h2>
        <div className="pp-table-w">
          <table className="pp-table">
            <thead><tr><th />{plans.map((p) => <th key={p.id}>{p.name}<div className="c3">{p.price ? fmt(p.price) + ' ₽/мес' : 'бесплатно'}</div></th>)}</tr></thead>
            <tbody>
              {[
                ['Поиск: сессия, 5 часов', (p) => fmt(p.session)],
                ['Поиск: неделя', (p) => fmt(p.week)],
                ['ИИ: сессия, 5 часов', (p) => fmt(p.aiSession)],
                ['ИИ: неделя', (p) => fmt(p.aiWeek)],
                ['ИИ-чат: агенты, субагенты, поиск в интернете', () => '✓'],
                ['Поиск по делам, судам и законам', () => '✓'],
                ['Профиль компании по ИНН', () => '✓'],
                ['Документы и диалог', () => '✓'],
                ['Модель «Быстрая»', () => '✓'],
                ['Модель «Умная»', (p) => (p.id === 'free' ? '—' : '✓')],
                ['Модель «Максимум»', (p) => (p.id === 'business' ? '✓' : '—')],
                ['API и MCP для ассистентов', () => '✓'],
                ['Командный доступ', (p) => (p.id === 'business' ? '✓' : '—')],
              ].map(([t, f]) => <tr key={t}><td>{t}</td>{plans.map((p) => <td key={p.id} className={f(p) === '—' ? 'c3' : ''}>{f(p)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section className="pp-sec" {...inView}>
        <div className="eyebrow">Вопросы</div>
        <h2>Частые вопросы о тарифах</h2>
        <div className="list faq">{FAQ.map(([q, a]) => <details key={q} className="row"><summary>{q}</summary><p className="c2">{a}</p></details>)}</div>
      </motion.section>
    </div>
  );
}

// Учётная запись: вход через Telegram, меню профиля, акция, модальные окна тарифов.
import { UsageBars, CostTable, worstPct, MiniUsage } from './Usage.jsx';
import GhostMini from './GhostMini.jsx';
import Mascot from './Mascot.jsx';
import { MeshGradient } from '@paper-design/shaders-react';
import { meshCSS, PALETTE } from './mesh.js';
import { WideThinking } from './ThinkingPill.jsx';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Gem, Gift, KeyRound, LogOut, Shield, ShieldCheck, UserRound, Zap } from 'lucide-react';
import { spring, soft } from './ui.jsx';
import { Logo } from './icons.jsx';

// Состояние пользователя (общее для всего приложения) и события «нужен вход» / «кончились запросы».
// Вход и регистрация — только через Telegram.
let state = { loading: true, user: null, modal: null, plan: null, promo: null, telegram: true };
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const useAccount = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || 'Сервис временно недоступен');
  return b;
}
export async function refresh() {
  try {
    const r = await (await fetch('/v1/auth/me')).json();
    set({ loading: false, user: r.authenticated ? r.user : null, admin: !!r.admin });
  } catch { set({ loading: false }); }
}
export const openAuth = (_mode, reason = '') => {
  const cur = location.hash || '#/app';
  const next = cur.startsWith('#/login') ? (new URLSearchParams(cur.split('?')[1]).get('next') || '#/app') : cur;
  set({ modal: null, reason });
  location.hash = '#/login?' + new URLSearchParams({ next });
};
export const openPlans = () => set({ modal: 'plans' });
export const closeModal = () => set({ modal: null });
export async function logout() { await post('/v1/auth/logout'); set({ user: null, admin: false }); location.hash = '#/'; }

// Вход: уходим в Telegram и возвращаемся на эту же страницу.
export const loginWithTelegram = () => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const next = q.get('next') || '#/app';
  location.href = '/v1/auth/telegram/start?' + new URLSearchParams({ next: next.startsWith('#/login') ? '#/app' : next });
};

// api.js сообщает об отказах: 401 — нужен вход, 402 — закончились запросы
window.addEventListener('lex:401', () => openAuth('auth', state.user ? 'Сессия истекла — войдите снова' : 'Чтобы искать, войдите — это бесплатно'));
window.addEventListener('lex:402', () => { refresh(); openPlans(); });
window.addEventListener('lex:charged', () => refresh());

// Возврат из Telegram: #/…?auth=new|ok|cancel|… — показываем приветствие или причину ошибки и убираем метку из адреса.
const AUTH_ERRORS = {
  cancel: 'Вход отменён в Telegram.',
  expired: 'Ссылка входа устарела — попробуйте ещё раз.',
  state: 'Не удалось подтвердить вход — попробуйте ещё раз.',
  telegram: 'Telegram не подтвердил вход. Попробуйте ещё раз через минуту.',
  rate: 'Слишком много попыток входа. Подождите несколько минут.',
  unavailable: 'Вход через Telegram временно недоступен.',
};
function readAuthFlag() {
  const [path, qs = ''] = location.hash.split('?');
  const p = new URLSearchParams(qs);
  const flag = p.get('auth');
  if (!flag) return;
  p.delete('auth');
  history.replaceState(null, '', location.pathname + location.search + path + (p.size ? '?' + p : ''));
  if (flag === 'new') refresh().then(() => set({ modal: 'welcome' }));
  else if (AUTH_ERRORS[flag]) { set({ authError: AUTH_ERRORS[flag] }); location.hash = '#/login?' + new URLSearchParams({ next: path.startsWith('#/login') ? '#/app' : path || '#/app' }); }
}
readAuthFlag();
refresh();
fetch('/v1/plans').then((r) => r.json()).then((r) => set({ promo: r.promo || null, plans: r.plans || [], telegram: r.telegram !== false }), () => {});

const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

// Плашка акции: «Первым 50 — Про на 7 дней бесплатно, осталось N мест».
export function PromoBanner({ style }) {
  const { promo, user } = useAccount();
  if (!promo || promo.left <= 0 || user) return null;
  return (
    <motion.button className="promo" style={style} onClick={() => openAuth()} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
      <span className="promo-dot" />
      Первым {promo.seats} клиентам — «Про» на {promo.days} дней бесплатно · осталось <b>{promo.left}</b> {plural(promo.left, 'место', 'места', 'мест')} →
    </motion.button>
  );
}

export function TgIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M21.4 4.2 18.3 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.2 12.8 1.6 11.3c-1-.3-1-1 .2-1.5L20 2.8c.8-.3 1.6.2 1.4 1.4Z" />
    </svg>
  );
}

export function Avatar({ user, size = 26 }) {
  const [broken, setBroken] = useState(false);
  const letter = (user.name || user.username || '?').trim()[0]?.toUpperCase();
  return user.photo && !broken
    ? <img className="avatar" src={user.photo} alt="" width={size} height={size} style={{ width: size, height: size }} onError={() => setBroken(true)} referrerPolicy="no-referrer" />
    : <span className="avatar ghost-av" title={letter} style={{ width: size, height: size, background: meshCSS('u' + (user.id || user.username || user.name || '')) }}><GhostMini size={Math.round(size * 0.66)} /></span>;
}

export function QuotaChip() {
  const { user, loading, admin } = useAccount();
  const [menu, setMenu] = useState(false);
  const box = useRef(null);
  // меню закрывается кликом мимо него или Esc (не при уходе мыши — иначе гаснет в зазоре)
  useEffect(() => {
    if (!menu) return;
    const off = (e) => { if (!box.current?.contains(e.target)) setMenu(false); };
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [menu]);
  if (loading) return null;
  if (!user) return (
    <button className="btn tg" style={{ marginLeft: 'auto', height: 34 }} onClick={() => openAuth()}><TgIcon size={16} />Войти</button>
  );
  const sp = user.usage?.session?.pct ?? 0, ap = user.usage?.ai?.session?.pct ?? 0;
  const worst = worstPct(user.usage);
  const close = () => setMenu(false);
  return (
    <div className="acct" ref={box}>
      <button className="acct-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
        <span className="quota" title={`Поиск: ${sp}% сессии · ИИ: ${ap}% сессии`}>
          <svg viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="8" fill="none" stroke="var(--line2)" strokeWidth="2.5" />
            <motion.circle cx="10" cy="10" r="8" fill="none" stroke={worst >= 90 ? 'var(--red)' : worst >= 70 ? 'var(--amber)' : 'var(--blue)'} strokeWidth="2.5" strokeLinecap="round"
              style={{ rotate: -90, transformOrigin: '50% 50%' }} initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.001, worst / 100) }} transition={soft} /></svg>
          <span className="mono">{worst}%</span>
        </span>
        <Avatar user={user} />
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div className="acct-menu" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={spring} style={{ transformOrigin: 'top right' }}>
            <a className="am-head" href="#/account" onClick={close}>
              <Avatar user={user} size={38} />
              <span className="am-id"><b>{user.name || user.handle}</b>{user.username && <small className="c3">@{user.username}</small>}</span>
              <span className="am-plan">{user.plan.name}</span>
            </a>
            {user.trialUntil && <div className="am-trial c3">Бесплатно до {user.trialUntil}</div>}
            <MiniUsage user={user} />
            <div className="am-sep" />
            <a className="menu-it" href="#/account" onClick={close}><UserRound size={15} />Профиль и настройки</a>
            <button className="menu-it" onClick={() => { close(); openPlans(); }}><Gem size={15} />Тарифы и лимиты</button>
            <a className="menu-it" href="#/integrations" onClick={close}><KeyRound size={15} />API-ключ и MCP</a>
            {admin && <a className="menu-it" href="#/admin" onClick={close}><Shield size={15} />Админка</a>}
            <div className="am-sep" />
            <button className="menu-it am-out" onClick={() => { close(); logout(); }}><LogOut size={15} />Выйти</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Отдельный экран входа и регистрации: одна кнопка «Войти через Telegram».
export function LoginPage() {
  const { promo, reason, authError, telegram, user, loading } = useAccount();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    const next = new URLSearchParams(location.hash.split('?')[1] || '').get('next') || '#/app';
    location.hash = next.startsWith('#/login') ? '#/app' : next;
  }, [user]);
  const back = () => { const n = new URLSearchParams(location.hash.split('?')[1] || '').get('next'); location.hash = n && !n.startsWith('#/login') ? n : '#/'; };
  const perks = [[Zap, 'Профиль компании и все дела — за секунды'], [ShieldCheck, 'Без паролей: Telegram передаёт только имя и ник'], [Gift, 'Бесплатно: лимит обновляется каждые 5 часов']];
  const steps = [['Нажмите кнопку', 'Откроется Telegram'], ['Подтвердите вход', 'Одно нажатие в Telegram'], ['Готово', 'Буквоед ждёт ваш первый вопрос']];
  return (
    <div className="login v2">
      <aside className="login-side v2">
        <div className="ls-bg" aria-hidden><MeshGradient colors={PALETTE} speed={0.3} style={{ width: '100%', height: '100%' }} /></div>
        <div className="ls-veil" aria-hidden />
        <a className="logo" href="#/" style={{ textDecoration: 'none', position: 'relative', color: '#fff' }}><Logo />KadBest</a>
        <div className="ls-mid">
          <motion.div className="ls-bubble" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: 0.4 }}>
            Привет! Я Буквоед. Войдите — и я начну читать законы и дела за вас.
          </motion.div>
          <Mascot size={210} />
        </div>
        <ul className="login-perks v2">{perks.map(([I, t], i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.08 }}><span className="ficon"><I size={16} strokeWidth={2} /></span>{t}</motion.li>
        ))}</ul>
      </aside>
      <main className="login-main">
        <button className="btn ghost login-back" onClick={back}><ArrowLeft size={16} />Назад</button>
        <motion.div className="login-card v2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className="lc-ghost"><GhostMini size={58} /></div>
          <div className="eyebrow" style={{ textAlign: 'center' }}>{reason || 'Вход и регистрация'}</div>
          <h1 className="login-t">Войдите через Telegram</h1>
          <p className="c2 sub2" style={{ textAlign: 'center' }}>Без паролей и почты. Нет аккаунта — он создастся сам при первом входе.</p>
          <AnimatePresence>{authError && <motion.div className="err" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{authError}</motion.div>}</AnimatePresence>
          {busy ? <WideThinking text="Открываем Telegram" h={52} /> : (
            <button className="btn tg big" disabled={loading || !telegram} onClick={() => { setBusy(true); set({ authError: '' }); loginWithTelegram(); }}>
              <TgIcon size={20} />Войти через Telegram
            </button>
          )}
          {!telegram && <p className="c3 tiny" style={{ textAlign: 'center' }}>Вход временно недоступен — загляните чуть позже.</p>}
          <ol className="lc-steps">{steps.map(([t, d], i) => <li key={t}><span>{i + 1}</span><div><b>{t}</b><small>{d}</small></div></li>)}</ol>
          {promo?.left > 0 && <div className="lc-promo"><span className="lc-promo-ic"><Gift size={18} strokeWidth={2} /></span><div><b>«Про» на {promo.days} дней бесплатно</b><small>Новым пользователям · осталось мест: {promo.left}</small></div></div>}
          <div className="lc-trust"><ShieldCheck size={15} />Telegram передаёт нам только имя и ник — ни телефона, ни переписки.</div>
          <p className="c3 tiny" style={{ textAlign: 'center', marginTop: 14 }}>Входя, вы принимаете <a href="#/terms">соглашение</a> и <a href="#/privacy">политику конфиденциальности</a>.</p>
        </motion.div>
      </main>
    </div>
  );
}

const STARTERS = [['7707083893', 'Проверить компанию по ИНН'], ['ст. 330 ГК', 'Открыть статью кодекса'], ['закон о банкротстве', 'Найти закон по названию']];

// Приветствие после первого входа: что досталось и с чего начать.
function Welcome() {
  const { user } = useAccount();
  if (!user) return null;
  const start = (q) => { closeModal(); location.hash = '#/app' + (q ? '?' + new URLSearchParams({ q }) : ''); };
  return (
    <div className="auth" style={{ textAlign: 'center' }}>
      <motion.div className="okmark" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={spring}>✓</motion.div>
      <h2>Добро пожаловать{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h2>
      <p className="c2 sub2">{user.trialUntil
        ? <>Вам достался тариф <b>«{user.plan.name}»</b> бесплатно до {user.trialUntil}: {user.plan.limit} поисков.</>
        : <>Тариф «{user.plan.name}»: <b>{user.left} поисков</b> бесплатно.</>} Карточки дел и тексты законов не расходуют запросы.</p>
      <div className="eyebrow" style={{ margin: '18px 0 8px' }}>С чего начать</div>
      <div className="starters">{STARTERS.map(([q, t]) => <button key={q} type="button" className="starter" onClick={() => start(q)}><span className="mono">{q}</span><span className="c3">{t} →</span></button>)}</div>
      <button className="btn pri big" onClick={() => start('')}>Начать поиск</button>
    </div>
  );
}

export function Pricing({ compact }) {
  const { user, plans = [] } = useAccount();
  const choose = (p) => {
    if (!user) return openAuth('auth', 'Чтобы оформить тариф, войдите');
    if (p.price === 0 || p.id === user.plan.id) return closeModal();
    set({ modal: 'checkout', plan: p });
  };
  return (
    <>
      <PromoBanner style={{ marginBottom: 16 }} />
      <div className={'pricing' + (compact ? ' compact' : '')}>
        {plans.map((p, i) => {
          const cur = user?.plan.id === p.id, hot = p.id === 'pro';
          return (
            <motion.div key={p.id} className={'card spot plan' + (hot ? ' hot' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: i * 0.06 }}>
              {hot && <span className="badge-hot">Популярный</span>}
              <div className="eyebrow">{p.name}</div>
              <div className="price">{p.price ? <>{new Intl.NumberFormat('ru-RU').format(p.price)} ₽<span className="c3">/мес</span></> : 'Бесплатно'}</div>
              <div className="plan-lim"><span>Поиск: <b>{p.session}</b> за 5 ч · <b>{new Intl.NumberFormat('ru-RU').format(p.week)}</b> в неделю</span><span>ИИ: <b>{p.aiSession}</b> за 5 ч · <b>{new Intl.NumberFormat('ru-RU').format(p.aiWeek)}</b> в неделю</span></div>
              <ul>{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
              <button className={'btn ' + (hot ? 'pri' : 'sec')} style={{ width: '100%' }} disabled={cur} onClick={() => choose(p)}>
                {cur ? 'Текущий тариф' : user?.requested === p.id ? 'Заявка отправлена' : p.price ? 'Оформить' : 'Начать бесплатно'}
              </button>
              {user?.requested === p.id && <div className="c2" style={{ fontSize: 12.5, marginTop: 8 }}>Менеджер напишет вам в Telegram, чтобы подключить тариф.</div>}
            </motion.div>
          );
        })}
      </div>
      {!compact && <><div className="eyebrow" style={{ margin: '26px 0 10px' }}>Сколько стоит действие</div><CostTable /><p className="c3" style={{ fontSize: 12.5, marginTop: 10 }}>Два отдельных лимита — «Поиск» и «ИИ», как в Claude: сессия обновляется через 5 часов после первого запроса, неделя — через 7 дней. Повтор того же поиска в течение 30 минут не списывается.</p></>}
    </>
  );
}

export function Modals() {
  const { modal, user } = useAccount();
  useEffect(() => { const k = (e) => e.key === 'Escape' && closeModal(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return (
    <AnimatePresence>
      {modal && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <motion.div className={'modal ' + (modal === 'plans' ? 'wide' : '')} key={modal} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring}>
            <button className="btn ghost modal-x" onClick={closeModal} aria-label="Закрыть">✕</button>
            {modal === 'plans' ? (
              <>
                <div className="eyebrow">{user && user.left === 0 ? 'Лимит исчерпан' : 'Тарифы'}</div>
                <h2 style={{ margin: '8px 0 14px', fontSize: 28, letterSpacing: '-.04em' }}>{user && user.left === 0 ? 'Продолжите на тарифе побольше' : 'Выберите тариф'}</h2>
                {user && <div style={{ marginBottom: 18 }}><UsageBars user={user} /></div>}
                <Pricing compact />
              </>
            ) : modal === 'checkout' ? <Checkout /> : modal === 'welcome' ? <Welcome /> : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Оформление подписки: ник уже известен из Telegram — заявка сразу уходит менеджеру.
function Checkout() {
  const { plan, user } = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  if (!plan || !user) return null;
  const submit = async () => {
    setBusy(true); setErr('');
    try { const me = await post('/v1/auth/upgrade', { plan: plan.id }); set({ user: me }); setDone(true); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  if (done) return (
    <div className="auth" style={{ textAlign: 'center' }}>
      <motion.div className="okmark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>✓</motion.div>
      <h2>Заявка принята</h2>
      <p className="c2 sub2">Менеджер напишет вам в Telegram{user.username ? <> <b>@{user.username}</b></> : ''} в течение рабочего дня, пришлёт счёт и подключит тариф «{plan.name}».</p>
      <button className="btn pri big" onClick={closeModal}>Готово</button>
    </div>
  );
  return (
    <div className="auth">
      <div className="eyebrow">Оформление</div>
      <h2>Тариф «{plan.name}»</h2>
      <div className="card" style={{ padding: '14px 16px', margin: '6px 0 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="c2">{plan.perks[0]}</span>
        <b style={{ fontSize: 20, letterSpacing: '-.03em' }}>{new Intl.NumberFormat('ru-RU').format(plan.price)} ₽<span className="c3" style={{ fontSize: 13, fontWeight: 400 }}>/мес</span></b>
      </div>
      <div className="email-chip"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Avatar user={user} size={22} />{user.handle}</span><span className="c3" style={{ fontSize: 12.5 }}>свяжемся здесь</span></div>
      <p className="c3 tiny">Менеджер напишет вам в Telegram, пришлёт счёт и подключит тариф после оплаты.</p>
      <AnimatePresence>{err && <motion.div className="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{err}</motion.div>}</AnimatePresence>
      <button className="btn pri big" disabled={busy} onClick={submit}>{busy ? <><span className="spin" />Отправляем…</> : 'Отправить заявку'}</button>
    </div>
  );
}

// Профиль: тариф и лимиты, история вопросов, сессии, удаление аккаунта.
import { UsageBars, CostTable } from './Usage.jsx';
import { meshCSS } from './mesh.js';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, TgIcon, logout, openAuth, openPlans, refresh, useAccount } from './account.jsx';
import { Segmented, Skeleton, fadeUp, saveText, soft } from './ui.jsx';

// Профиль и настройки: кто вы, тариф и расход, внешний вид, безопасность, удаление аккаунта.
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

// Тема: system | light | dark — атрибут на <html>, CSS подхватывает.
export function applyTheme(t = store.get('kbTheme', 'system')) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
applyTheme();

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || 'Не получилось, попробуйте ещё раз');
  return b;
}

function Section({ title, sub, children, i = 0 }) {
  return (
    <motion.section className="card set-sec" variants={fadeUp} custom={i} initial="hidden" animate="show">
      <div className="set-head"><h2>{title}</h2>{sub && <p className="c3">{sub}</p>}</div>
      <div className="set-body">{children}</div>
    </motion.section>
  );
}
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  if (m < 1440) return `${Math.round(m / 60)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

// История вопросов: повторить, убрать, скачать таблицей.
function History({ flash }) {
  const [items, setItems] = useState(null);
  useEffect(() => { fetch('/v1/auth/history').then((r) => r.json()).then((r) => setItems(r.items || []), () => setItems([])); }, []);
  const drop = async (q) => { try { const r = await post('/v1/auth/history/remove', { q }); setItems(r.items || []); } catch (e) { flash(e.message); } };
  const csv = () => {
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    saveText('История вопросов KadBest.csv', ['Вопрос;Когда;Раз', ...items.map((h) => [esc(h.q), esc(new Date(h.at).toLocaleString('ru-RU')), h.n].join(';'))].join('\r\n'), 'text/csv');
  };
  if (items === null) return <Skeleton n={2} />;
  if (!items.length) return <p className="c3 set-hint">Здесь появятся ваши вопросы — чтобы вернуться к ним в один клик.</p>;
  return (
    <>
      <ul className="hist">
        {items.slice(0, 30).map((h) => (
          <li key={h.q}>
            <a href={'#/app?' + new URLSearchParams({ q: h.q })} className="hist-q" title="Повторить запрос">{h.q}</a>
            <span className="c3 hist-m">{h.n > 1 ? `${h.n} раз · ` : ''}{ago(h.at)}</span>
            <button className="btn ghost hist-x" onClick={() => drop(h.q)} aria-label="Убрать из истории">✕</button>
          </li>
        ))}
      </ul>
      <div className="hist-act">
        <button className="btn sec" onClick={csv}>Скачать историю (CSV)</button>
        <button className="btn ghost" onClick={() => { if (window.confirm('Очистить всю историю вопросов?')) drop(''); }}>Очистить</button>
        {items.length > 30 && <span className="c3 set-hint">Показаны 30 из {items.length}; в файле — все</span>}
      </div>
    </>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div><div className="set-label">{label}</div>{hint && <div className="c3 set-hint">{hint}</div>}</div>
      <div className="set-ctl">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { user, loading } = useAccount();
  const [theme, setTheme] = useState(store.get('kbTheme', 'system'));
  const [scope, setScope] = useState(store.get('kbScope', 'all'));
  const [size, setSize] = useState(store.get('lexReadSize', 1));
  const [note, setNote] = useState('');
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { store.set('kbTheme', theme); applyTheme(theme); }, [theme]);
  useEffect(() => { store.set('kbScope', scope); }, [scope]);
  useEffect(() => { store.set('lexReadSize', size); }, [size]);
  const flash = (t) => { setNote(t); setTimeout(() => setNote(''), 2500); };

  if (loading) return <div className="page"><Skeleton n={4} /></div>;
  if (!user) return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="card set-sec" style={{ textAlign: 'center', padding: 32 }}>
        <h2 style={{ margin: '0 0 8px' }}>Профиль</h2>
        <p className="c2">Войдите, чтобы открыть настройки аккаунта.</p>
        <button className="btn tg big" onClick={() => openAuth('auth', 'Вход в профиль')}><TgIcon />Войти через Telegram</button>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <motion.div className="profile-hero v2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={soft} style={{ '--ph-bg': meshCSS('u' + (user.id || user.username || '')) }}>
        <div className="ph-av"><Avatar user={user} size={84} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Профиль</div>
          <h1>{user.name || user.handle}</h1>
          <div className="c2" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
            {user.username && <a className="lawref" href={`https://t.me/${user.username}`} target="_blank" rel="noopener">@{user.username}</a>}
            <span>с нами с {user.created}</span>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>{note && <motion.div className="toast" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{note}</motion.div>}</AnimatePresence>

      <Section i={0} title="Тариф и запросы">
        <Row label={`Тариф «${user.plan.name}»`} hint={user.trialUntil ? `Бесплатно по акции до ${user.trialUntil}, затем — «Старт»` : user.renews ? `Новый месяц с ${user.renews}` : user.plan.monthly ? '' : 'Разовый пакет'}>
          <button className="btn sec" onClick={openPlans}>{user.plan.price ? 'Сменить тариф' : 'Выбрать тариф'}</button>
        </Row>
        <div className="usage">
          <UsageBars user={user} />
          <details className="cost-more"><summary>Сколько стоит каждое действие</summary><CostTable /></details>
          <p className="c3 set-hint">Лимит сессии обновляется через 5 часов после первого запроса, недельный — через 7 дней. Карточки дел, тексты статей и страницы выдачи внутри поиска бесплатны.</p>
        </div>
        {user.requested && <Row label="Заявка на тариф" hint="Менеджер напишет вам в Telegram и подключит после оплаты."><span className="pill blue">ждёт подтверждения</span></Row>}
      </Section>

      <Section i={1} title="История вопросов" sub="Видите только вы. Хранятся последние 100.">
        <History flash={flash} />
      </Section>

      <Section i={2} title="Внешний вид и поиск">
        <Row label="Тема" hint="Системная — как в настройках устройства">
          <Segmented id="theme" value={theme} onChange={setTheme} options={[['system', 'Системная'], ['light', 'Светлая'], ['dark', 'Тёмная']]} />
        </Row>
        <Row label="Поиск по умолчанию" hint="Какой раздел открыт в начале">
          <Segmented id="scope" value={scope} onChange={setScope} options={[['all', 'Всё'], ['arbitr', 'Арбитраж'], ['courts', 'Суды'], ['law', 'Законы']]} />
        </Row>
        <Row label="Текст в читалке" hint="Размер шрифта статей и законов">
          <Segmented id="rsize" value={String(size)} onChange={(v) => setSize(+v)} options={[['0', 'Мельче'], ['1', 'Обычный'], ['2', 'Крупнее'], ['3', 'Крупный']]} />
        </Row>
      </Section>

      <Section i={3} title="Безопасность" sub="Вход — через ваш Telegram, паролей нет.">
        <Row label="Активные входы" hint={`Устройств, где вы вошли: ${user.sessions}`}>
          <button className="btn sec" disabled={user.sessions < 2} onClick={async () => {
            try { const r = await post('/v1/auth/logout-others'); await refresh(); flash(r.closed ? `Закрыто входов: ${r.closed}` : 'Других входов нет'); } catch (e) { setErr(e.message); }
          }}>Выйти на других устройствах</button>
        </Row>
        <Row label="API-ключ" hint="Для подключения к ИИ-ассистентам и своим системам">
          <a className="btn sec" href="#/integrations" style={{ textDecoration: 'none' }}>Открыть ключ</a>
        </Row>
        <Row label="Выйти из аккаунта" hint="На этом устройстве">
          <button className="btn ghost" onClick={logout}>Выйти</button>
        </Row>
      </Section>

      <Section i={4} title="Удаление аккаунта">
        {!del ? (
          <Row label="Удалить аккаунт и данные" hint="Ключ и входы перестанут работать. Это нельзя отменить.">
            <button className="btn danger" onClick={() => setDel(true)}>Удалить…</button>
          </Row>
        ) : (
          <div className="del-box">
            <p className="c2" style={{ margin: '0 0 10px' }}>Введите слово <b>удалить</b>, чтобы подтвердить.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="удалить" autoFocus style={{ flex: '1 1 200px' }} />
              <button className="btn danger" disabled={confirm.trim().toLowerCase() !== 'удалить'} onClick={async () => {
                try { await post('/v1/auth/delete', { confirm }); await refresh(); location.hash = '#/'; } catch (e) { setErr(e.message); }
              }}>Удалить навсегда</button>
              <button className="btn ghost" onClick={() => { setDel(false); setConfirm(''); }}>Отмена</button>
            </div>
          </div>
        )}
        {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
      </Section>
    </div>
  );
}

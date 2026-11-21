// Админка: заявки на платные тарифы, включение тарифа, список пользователей (доступ — только админам).
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Empty, ErrorBox, Segmented, Skeleton, fadeUp, soft } from './ui.jsx';
import { useAccount } from './account.jsx';

// Админка: заявки на покупку (ник Telegram), включение тарифа, все пользователи.
async function call(method, path, body) {
  const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || 'ошибка');
  return b;
}
const dt = (s) => (s && !s.startsWith('0001') ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

export default function Admin() {
  const { admin, loading } = useAccount();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('requests');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const load = () => call('GET', '/v1/admin/users').then(setData, setErr);
  useEffect(() => { if (admin) load(); }, [admin]);
  const act = async (id, fn) => { setBusy(id); try { await fn(); await load(); } catch (e) { setErr(e); } setBusy(''); };
  const planName = useMemo(() => Object.fromEntries((data?.plans || []).map((p) => [p.id, p.name])), [data]);

  if (loading) return <div className="page"><Skeleton n={3} /></div>;
  if (!admin) return <div className="page"><div className="list"><Empty>Нет доступа. Войдите под аккаунтом администратора.</Empty></div></div>;
  const rows = (data?.users || []).filter((u) => (tab === 'requests' ? u.requested : true) && (!q || (u.handle + ' ' + (u.username || '')).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="page">
      <div className="ph">
        <div><div className="eyebrow">Админка</div><h1>Заявки и клиенты</h1>
          <p>{data ? `Заявок: ${data.pending} · пользователей: ${data.users.length} · мест в акции: ${data.promoLeft}` : 'Загружаем…'}</p></div>
        <Segmented id="adm" value={tab} onChange={setTab} options={[['requests', `Заявки${data?.pending ? ' · ' + data.pending : ''}`], ['users', 'Все пользователи']]} />
      </div>
      {err && <ErrorBox error={err} />}
      <div className="filters"><input className="field" style={{ flex: '1 1 300px' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Имя или ник Telegram" /><button className="btn sec" onClick={load}>Обновить</button></div>
      {!data ? <div className="list"><Skeleton n={4} /></div> : !rows.length ? <div className="list"><Empty>{tab === 'requests' ? 'Новых заявок нет' : 'Никого не нашли'}</Empty></div> : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead><tr>{['Клиент', 'Telegram', 'Хочет', 'Сейчас', 'Заявка', ''].map((h) => <th key={h} className="eyebrow" style={{ top: 0 }}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((u, i) => (
                  <motion.tr key={u.id} variants={fadeUp} custom={i} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                    <td><div style={{ fontWeight: 500 }}>{u.handle}</div><div className="c3 mono" style={{ fontSize: 12 }}>с {dt(u.created)}</div></td>
                    <td>{u.username ? <a className="lawref" href={`https://t.me/${u.username}`} target="_blank" rel="noopener">Написать @{u.username}</a> : <span className="c3">ника нет</span>}</td>
                    <td>{u.requested ? <span className="pill blue">{planName[u.requested] || u.requested}</span> : <span className="c3">—</span>}</td>
                    <td><span className="pill">{planName[u.plan] || u.plan}</span>
                      <div className="c3 mono" style={{ fontSize: 12, marginTop: 4 }}>{u.left < 0 ? 'без лимита' : `осталось ${u.left}`}{u.trialUntil ? ` · пробный до ${u.trialUntil}` : ''}</div></td>
                    <td className="mono c2" style={{ fontSize: 13 }}>{dt(u.requestedAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {u.requested ? (
                        <>
                          <button className="btn pri" style={{ height: 32 }} disabled={busy === u.id} onClick={() => act(u.id, () => call('POST', '/v1/admin/plan', { id: u.id, plan: u.requested }))}>Включить «{planName[u.requested]}»</button>
                          <button className="btn ghost" disabled={busy === u.id} onClick={() => act(u.id, () => call('POST', '/v1/admin/decline', { id: u.id }))}>Отклонить</button>
                        </>
                      ) : (
                        <select className="field" style={{ height: 32 }} value={u.plan} disabled={busy === u.id}
                          onChange={(e) => act(u.id, () => call('POST', '/v1/admin/plan', { id: u.id, plan: e.target.value }))}>
                          {(data.plans || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
      <motion.p className="c3" style={{ fontSize: 12.5, marginTop: 14 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={soft}>
        «Включить» ставит тариф с сегодняшнего дня, обнуляет счётчик и закрывает заявку. Оплату принимайте до включения.
      </motion.p>
    </div>
  );
}

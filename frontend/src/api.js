// Доступ к API KadBest: ключ клиента из ?key= или сохранённый в браузере.
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
};

export const KEY = new URLSearchParams(location.search).get('key') || store.get('lexKey');
if (KEY) store.set('lexKey', KEY);

const headers = () => (KEY ? { 'X-API-Key': KEY } : {});

export async function api(path, params = {}, signal) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  const r = await fetch(path + (q.size ? `?${q}` : ''), { headers: headers(), signal });
  const b = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 402) window.dispatchEvent(new Event('lex:' + r.status));
  if (!r.ok) throw new Error(b.error || 'Сервис временно недоступен. Повторите попытку.');
  if (METERED.some((m) => path.startsWith(m))) window.dispatchEvent(new Event('lex:charged'));
  return b;
}

// apiStream — ответ потоком (Server-Sent Events): onEvent(имя, данные) на каждое событие; возвращает данные события done.
export async function apiStream(path, params, signal, onEvent, init = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  const r = await fetch(path + `?${q}`, { ...init, headers: { ...headers(), Accept: 'text/event-stream', ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal });
  if (!r.ok || !(r.headers.get('content-type') || '').includes('event-stream')) {
    const b = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 402) window.dispatchEvent(new Event('lex:' + r.status));
    throw new Error(b.error || 'Сервис временно недоступен. Повторите попытку.');
  }
  const rd = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let done = null;
  for (;;) {
    const { value, done: end } = await rd.read();
    if (value) buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (!ev || data == null) continue;
      const v = JSON.parse(data);
      if (ev === 'done') done = v;
      onEvent?.(ev, v);
    }
    if (end) break;
  }
  if (!done) throw new Error('Ответ прервался. Повторите попытку.');
  window.dispatchEvent(new Event('lex:charged'));
  return done;
}

const METERED = ['/v1/answer', '/v1/search', '/v1/arbitr/search', '/v1/law/search', '/v1/law/articles', '/v1/law/published', '/v1/law/drafts', '/v1/courts/hearings', '/v1/courts/by-address'];

export async function mcp(method, params) {
  const r = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers() },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  if (!r.ok) throw new Error('Нет доступа — проверьте ключ');
  return (await r.json()).result;
}

export const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
export const kadDate = (s) => {
  const m = /Date\((\d+)/.exec(s || '');
  return m ? new Date(+m[1]).toLocaleDateString('ru-RU') : s || '';
};

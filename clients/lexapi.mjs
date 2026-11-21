// Клиент Lex API для Node 18+ и браузера (fetch, без зависимостей).
//
//   import { Lex } from './lexapi.mjs';
//   const lex = new Lex('https://lex.example.ru', { key: 'lex_...' });
//   const r = await lex.answer('ст. 330 ГК');          // несколько блоков ответа
//   const art = await lex.lawArticle('330', { code: 'ГК' });
//   Lex.links(art.part.md);                            // [{ label, id, part }]
//
// Ошибки: AuthError (401), QuotaError (402), LexError — прочее. 429/5xx и сбои сети повторяются.

export class LexError extends Error {
  constructor(status, body) {
    super(`${status}: ${body?.error ?? 'ошибка'}`);
    this.status = status;
    this.body = body;
    this.code = body?.code;
  }
}
export class AuthError extends LexError {}
export class QuotaError extends LexError {}

const MD = /\[([^\]]+)\]\(law:([A-Z]+_\d+)(?:\/([0-9a-f]{40}))?\)/g;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Lex {
  constructor(base = 'http://127.0.0.1:8090', { key, timeoutMs = 150000, retries = 3 } = {}) {
    this.base = base.replace(/\/$/, '');
    this.key = key;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
  }

  async request(method, path, params = {}, body) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    const headers = { Accept: 'application/json', ...(this.key ? { 'X-API-Key': this.key } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) };
    let last;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const res = await fetch(this.base + path + (q.size ? `?${q}` : ''), {
          method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(this.timeoutMs),
        });
        const data = await res.json().catch(() => ({ error: res.statusText }));
        if (res.ok) return data;
        if (res.status === 401) throw new AuthError(401, data);
        if (res.status === 402) throw new QuotaError(402, data);
        last = new LexError(res.status, data);
        if (![429, 500, 502, 503, 504].includes(res.status)) throw last;
      } catch (e) {
        if (e instanceof LexError && !(e.status >= 429)) throw e;
        if (e instanceof AuthError || e instanceof QuotaError) throw e;
        last = e instanceof LexError ? e : new LexError(0, { error: String(e) });
      }
      await sleep(1500 * (attempt + 1));
    }
    throw last;
  }

  get(path, params) { return this.request('GET', path, params); }

  // умный поиск
  answer(q) { return this.get('/v1/answer', { q }); }
  search(q) { return this.get('/v1/search', { q }); }
  health() { return this.get('/v1/health'); }
  me() { return this.get('/v1/auth/me'); }

  // арбитраж
  arbitrSearch(filters) { return this.get('/v1/arbitr/search', filters); }
  async arbitrPages(filters, pages = 4) {
    const first = await this.arbitrSearch({ ...filters, page: 1 });
    const rest = await Promise.all(Array.from({ length: Math.max(0, Math.min(pages, first.pages || 1) - 1) }, (_, i) => this.arbitrSearch({ ...filters, page: i + 2 })));
    return [first, ...rest].flatMap((r) => r.cases || []);
  }
  arbitrCase(guid, part = 'all') { return this.get(`/v1/arbitr/case/${guid}${part ? `/${part}` : ''}`); }
  arbitrByNumber(number) { return this.get('/v1/arbitr/case/by-number', { number }); }
  arbitrDocText(caseId, docId) { return this.get(`/v1/arbitr/doc/${caseId}/${docId}/text`); }
  arbitrCourts() { return this.get('/v1/arbitr/courts'); }

  // суды общей юрисдикции
  courtsHearings(site, date) { return this.get('/v1/courts/hearings', { site, date }); }
  courtsCase({ site, caseId, caseUid, deloId }) { return this.get('/v1/courts/case', { site, caseId, caseUid, deloId }); }
  courtsByAddress(address) { return this.get('/v1/courts/by-address', { address }); }
  courtsByFias(fias) { return this.get(`/v1/courts/by-fias/${fias}`); }

  // законодательство
  lawSearch(q) { return this.get('/v1/law/search', { q }); }
  lawDoc(id) { return this.get(`/v1/law/doc/${id}`); }
  lawPart(id, part) { return this.get(`/v1/law/doc/${id}/part/${part}`); }
  async lawArticle(art, { code, law } = {}) {
    if (!code && !law) throw new Error('укажите code или law');
    const q = `ст. ${art} ` + (code || `${String(law).toUpperCase().replace(/-ФЗ$/, '')}-ФЗ`);
    const r = await this.answer(q);
    const a = (r.answers || []).find((x) => x.type === 'article');
    if (!a) throw new LexError(404, { error: `статья не найдена: ${q}`, code: 'not_found' });
    return a.data;
  }

  /** Ссылки из поля md: [{ label, id, part }] — для lawDoc / lawPart. */
  static links(md) { return [...String(md || '').matchAll(MD)].map((m) => ({ label: m[1], id: m[2], part: m[3] || null })); }
  /** md → обычный текст. */
  static plain(md) { return String(md || '').replace(MD, '$1'); }
}

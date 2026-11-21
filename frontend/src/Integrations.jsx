// Страница «API-ключ и MCP»: ключ, подключение ассистентов (Claude, ChatGPT, Cursor…), инструкции.
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { mcp } from './api.js';
import { openAuth, refresh, useAccount, TgIcon } from './account.jsx';
import { soft, spring } from './ui.jsx';
import { GUIDES, PROMPTS, TROUBLE, SECURITY } from './connectGuides.js';
import GhostMini from './GhostMini.jsx';
import { WideThinking } from './ThinkingPill.jsx';
import { BRAND_ICONS } from './brandIcons.js';

// Подключение KadBest к ИИ-ассистентам — наглядно: схема, три шага, макет окна программы с уже
// заполненными полями (у каждого поля — «Скопировать»), шаги с галочками и прогрессом, проверка ключа.

function Copy({ text, label = 'Скопировать', className = 'btn sec', small }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={className + (ok ? ' copied' : '')} style={{ height: small ? 28 : 32 }} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? 'Скопировано ✓' : label}
    </button>
  );
}

function inline(s, k) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[1] ? <b key={k + m.index}>{m[1]}</b> : <code key={k + m.index}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

// шаг: текст; если в нём «Скопировать адрес/ключ» — кнопка копирования прямо в шаге
function Step({ text, i, url, urlKey, kk }) {
  if (text.trim().startsWith('```')) {
    const code = text.trim().replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    return <Terminal code={code} title={code.startsWith('{') ? 'mcp_config.json' : 'Терминал'} />;
  }
  const btn = /Скопировать адрес с ключом/.test(text) ? [urlKey, 'Скопировать адрес с ключом']
    : /Скопировать адрес/.test(text) ? [url, 'Скопировать адрес']
      : /Скопировать ключ/.test(text) ? [kk, 'Скопировать ключ'] : null;
  return (
    <div>
      {text.split('\n').map((l, j) => <p key={j} style={{ margin: j ? '6px 0 0' : 0 }}>{inline(l, i + '-' + j)}</p>)}
      {btn && <div style={{ marginTop: 8 }}><Copy text={btn[0]} label={btn[1]} className="btn pri" small /></div>}
    </div>
  );
}

function Terminal({ code, title = 'Терминал' }) {
  return (
    <div className="term">
      <div className="term-bar"><i /><i /><i /><span className="mono">{title}</span><Copy text={code} label="Скопировать" className="btn ghost" small /></div>
      <pre className="mono">{code}</pre>
    </div>
  );
}

// Макет окна программы: какие поля заполнить и чем — значения уже подставлены
const MOCKS = {
  claude: { win: 'Claude · Connectors', title: 'Add custom connector', fields: [['Name', 'KadBest', 1], ['Remote MCP server URL', '{{URL}}', 1], ['Authentication', 'No sign in', 0, 'select'], ['Request header', 'X-API-Key', 1], ['Header value', '{{KEY}}', 1, 'secret']], btn: 'Add' },
  chatgpt: { win: 'ChatGPT · Plugins', title: 'Add custom MCP server', fields: [['Name', 'KadBest', 1], ['Description', 'Поиск судебных дел, компаний и законодательства', 1], ['Server URL', '{{URL_WITH_KEY}}', 1, 'secret'], ['Authentication', 'No authentication', 0, 'select'], ['I understand and want to continue', '', 0, 'check']], btn: 'Create as a plugin' },
};
const mask = (v) => (v.length > 18 ? v.slice(0, Math.max(10, v.length - 22)) + '•'.repeat(10) + v.slice(-4) : v);

function MockWindow({ app, fill }) {
  const m = MOCKS[app];
  if (!m) return null;
  return (
    <motion.div className="mock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
      <div className="mock-bar"><i /><i /><i /><span>{m.win}</span></div>
      <div className="mock-body">
        <div className="mock-title">{m.title}</div>
        {m.fields.map(([label, raw, copy, kind], i) => {
          const v = fill(raw);
          return (
            <motion.div key={label} className={'mock-f ' + (kind || '')} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...soft, delay: 0.08 * i }}>
              {kind === 'check' ? (
                <label className="mock-check"><span className="mock-box">✓</span>{label}</label>
              ) : (
                <>
                  <div className="mock-l">{label}</div>
                  <div className="mock-in">
                    <span className="mono">{kind === 'secret' ? mask(v) : v}</span>
                    {kind === 'select' && <span className="c3">▾</span>}
                    {copy ? <Copy text={v} label="Скопировать" className="btn ghost" small /> : null}
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
        <div className="mock-btn"><span>{m.btn}</span><span className="mock-cursor" aria-hidden>↖</span></div>
      </div>
    </motion.div>
  );
}

// Схема: ассистент ↔ Буквоед ↔ данные
function Flow() {
  return (
    <div className="flow" aria-hidden>
      <div className="flow-n">
        <div className="flow-apps icons">{['claude', 'chatgpt', 'cursor', 'vscode'].map((a) => <Mono key={a} a={a} size={34} />)}</div>
        <b>Ваш ассистент</b>
      </div>
      <div className="flow-line"><i /><i /><i /><span className="mono">MCP</span></div>
      <div className="flow-n mid"><GhostMini size={64} /><b>KadBest</b></div>
      <div className="flow-line"><i /><i /><i /></div>
      <div className="flow-n">
        <div className="flow-data">{['Дела', 'Компании', 'Законы', 'Статьи'].map((a) => <span key={a}>{a}</span>)}</div>
        <b>Данные</b>
      </div>
    </div>
  );
}

const APPS = {
  cursor: { name: 'Cursor', note: 'Редактор с ИИ-агентом', bg: '#0b0b0b', fg: '#fff' },
  vscode: { name: 'VS Code', note: 'С GitHub Copilot', bg: '#24292f', fg: '#fff' },
  lmstudio: { name: 'LM Studio', note: 'Локальные модели, 0.3.17+', bg: '#4f46e5', fg: '#fff' },
  claude: { name: 'Claude', note: 'Сайт, приложение и телефон', bg: '#f4efe6', open: ['https://claude.ai', 'Открыть Claude'] },
  chatgpt: { name: 'ChatGPT', note: 'Сайт chatgpt.com', bg: '#0b0b0b', fg: '#fff', open: ['https://chatgpt.com/plugins', 'Открыть ChatGPT'] },
  claudecode: { name: 'Claude Code', note: 'Терминал, для продвинутых', bg: '#f4efe6' },
  windsurf: { name: 'Windsurf / Devin', note: 'Ручная настройка', bg: '#0b100f', fg: '#58e5bb' },
};
const ONE_CLICK = ['cursor', 'vscode', 'lmstudio'];
const MANUAL = ['claude', 'chatgpt', 'claudecode', 'windsurf'];

const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
function installLink(app, url, key) {
  const cfg = { url, headers: { 'X-API-Key': key } };
  if (app === 'cursor') return 'cursor://anysphere.cursor-deeplink/mcp/install?name=kadbest&config=' + encodeURIComponent(b64(cfg));
  if (app === 'vscode') return 'vscode:mcp/install?' + encodeURIComponent(JSON.stringify({ name: 'kadbest', type: 'http', ...cfg }));
  if (app === 'lmstudio') return 'lmstudio://add_mcp?name=kadbest&config=' + encodeURIComponent(b64(cfg));
  return '';
}

const Mono = ({ a, size }) => <span className="app-mono" style={{ background: APPS[a].bg, color: APPS[a].fg, ...(size ? { width: size, height: size } : null) }} dangerouslySetInnerHTML={{ __html: BRAND_ICONS[a] }} />;

export default function Integrations() {
  const { user } = useAccount();
  const [open, setOpen] = useState('claude');
  const [tools, setTools] = useState([]);
  const [test, setTest] = useState(null);
  const [done, setDone] = useState({});
  const base = location.origin;
  const key = user?.apiKey || 'ВАШ_КЛЮЧ';
  const url = `${base}/mcp`, urlKey = `${base}/mcp?key=${key}`;
  const fill = (s) => s.replaceAll('{{URL_WITH_KEY}}', urlKey).replaceAll('{{URL}}', url).replaceAll('{{KEY}}', key);
  useEffect(() => { if (user) mcp('tools/list').then((r) => setTools(r.tools), () => {}); }, [user]);
  useEffect(() => setDone({}), [open]);

  const check = async () => {
    setTest({ s: 'run' }); const t = performance.now();
    try {
      const r = await mcp('tools/call', { name: 'law_article', arguments: { art: '330', code: 'ГК' } });
      if (r.isError) throw new Error(r.content[0].text);
      setTest({ s: 'ok', ms: Math.round(performance.now() - t) });
    } catch (e) { setTest({ s: 'err', m: e.message }); }
  };
  const needLogin = () => openAuth('auth', 'Ключ появится сразу после входа');
  const g = GUIDES[open];
  const nDone = Object.values(done).filter(Boolean).length;
  const steps3 = useMemo(() => [
    ['Войдите', 'Через Telegram — ключ появится сам', !!user],
    ['Выберите программу', 'Где можно — установка в один клик', false],
    ['Проверьте', 'Кнопка «Проверить» внизу страницы', test?.s === 'ok'],
  ], [user, test]);

  return (
    <div className="page integ" style={{ maxWidth: 980 }}>
      <motion.div className="integ-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
        <div className="eyebrow">Интеграции</div>
        <h1>Буквоед внутри вашего ИИ-ассистента</h1>
        <p className="c2">Ассистент сам найдёт дела, проверит компанию и процитирует статью закона — по настоящим данным, а не по памяти.</p>
        <Flow />
      </motion.div>

      <div className="three">
        {steps3.map(([t, d, ok], i) => (
          <motion.div key={t} className={'three-c' + (ok ? ' ok' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.1 + i * 0.07 }}>
            <span className="three-n">{ok ? '✓' : i + 1}</span>
            <div><b>{t}</b><div className="c2">{d}</div></div>
          </motion.div>
        ))}
      </div>

      {!user && (
        <div className="card spot keyrow">
          <div><div className="eyebrow">Шаг 1 · Войдите</div><div className="c2" style={{ marginTop: 6 }}>После входа ваш личный ключ сам подставится во все кнопки, макеты и команды на этой странице.</div></div>
          <button className="btn tg" onClick={needLogin}><TgIcon size={16} />Войти через Telegram</button>
        </div>
      )}

      <div className="sec-h"><span className="eyebrow">Установить в один клик</span><span className="badge-1">1 клик</span></div>
      <div className="apps">
        {ONE_CLICK.map((a, i) => (
          <motion.div key={a} className="card spot app big" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: i * 0.05 }}>
            <div className="app-top"><Mono a={a} /><div><div className="app-name">{APPS[a].name}</div><div className="c3" style={{ fontSize: 13 }}>{APPS[a].note}</div></div></div>
            {user
              ? <a className="btn pri" href={installLink(a, url, key)} style={{ textDecoration: 'none', marginTop: 14 }}>Установить в {APPS[a].name}</a>
              : <button className="btn pri" style={{ marginTop: 14 }} onClick={needLogin}>Установить в {APPS[a].name}</button>}
            <button className="btn link app-how" onClick={() => setOpen(a)}>Что произойдёт?</button>
          </motion.div>
        ))}
      </div>
      <p className="c3" style={{ fontSize: 12.5, margin: '8px 2px 0' }}>Программа должна быть установлена. Браузер спросит «Открыть приложение?» — нажмите «Открыть», затем «Install» в самой программе.</p>

      <div className="sec-h"><span className="eyebrow">Подключить по инструкции</span><span className="badge-3">≈ 3 минуты</span></div>
      <div className="apps">
        {MANUAL.map((a) => (
          <button key={a} className={'card spot app sel' + (open === a ? ' on' : '')} onClick={() => setOpen(a)}>
            <div className="app-top"><Mono a={a} /><div><div className="app-name">{APPS[a].name}</div><div className="c3" style={{ fontSize: 13 }}>{APPS[a].note}</div></div></div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {g && (
          <motion.div key={open} className="card guide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={spring}>
            <div className="guide-head">
              <div className="app-top"><Mono a={open} /><div><h2 style={{ margin: 0 }}>{g.title}</h2><div className="c3" style={{ fontSize: 13 }}>{g.time}</div></div></div>
              <div className="guide-quick">
                {APPS[open]?.open && <a className="btn pri" href={APPS[open].open[0]} target="_blank" rel="noopener" style={{ textDecoration: 'none', height: 34 }}>{APPS[open].open[1]} ↗</a>}
                {ONE_CLICK.includes(open) && user && <a className="btn pri" href={installLink(open, url, key)} style={{ textDecoration: 'none', height: 34 }}>Установить</a>}
              </div>
            </div>
            {g.plans && <p className="c2 guide-plans">{g.plans}</p>}

            <div className={'guide-grid' + (MOCKS[open] ? '' : ' solo')}>
              <div>
                <div className="g-prog">
                  <div className="g-prog-t"><motion.i animate={{ width: `${(nDone / g.steps.length) * 100}%` }} transition={soft} /></div>
                  <span className="mono c3">{nDone} из {g.steps.length} · отмечайте шаги</span>
                </div>
                <ol className="steps v2">
                  {g.steps.map((s, i) => (
                    <li key={i} className={done[i] ? 'done' : ''}>
                      <button type="button" className="stepn" aria-label={done[i] ? 'Снять отметку' : 'Отметить шаг'} onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}>{done[i] ? '✓' : i + 1}</button>
                      <Step text={fill(s)} i={i} url={url} urlKey={urlKey} kk={key} />
                    </li>
                  ))}
                </ol>
                {nDone === g.steps.length && <motion.div className="g-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}><GhostMini size={44} /><div><b>Готово!</b><div className="c2">Проверьте подключение кнопкой ниже и задайте ассистенту первый вопрос.</div></div></motion.div>}
              </div>
              {MOCKS[open] && (
                <div className="guide-side">
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Так должно выглядеть окно</div>
                  <MockWindow app={open} fill={fill} />
                </div>
              )}
            </div>
            {g.tips?.length > 0 && <div className="tips v2">{g.tips.map((t, i) => <p key={i}>{inline(fill(t), 't' + i)}</p>)}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={'card checkrow v2' + (test?.s === 'ok' ? ' ok' : test?.s === 'err' ? ' err' : '')}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <GhostMini size={46} sad={test?.s === 'err'} blink={test?.s !== 'err'} />
          <div><b>Проверить, что ключ работает</b><div className="c2" style={{ fontSize: 13.5 }}>Тестовый запрос — статья 330 ГК. Запросы не расходуются.</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', flexWrap: 'wrap' }}>
          {test?.s === 'ok' && <span className="mono" style={{ color: 'var(--green)', fontSize: 13 }}>✓ работает · {test.ms} мс</span>}
          {test?.s === 'err' && <span style={{ color: 'var(--red)', fontSize: 13 }}>{test.m}</span>}
          <button className="btn pri" style={{ height: 36 }} disabled={!user || test?.s === 'run'} onClick={check}>Проверить</button>
        </div>
      </div>
      {test?.s === 'run' && <div style={{ marginTop: 10 }}><WideThinking text="Буквоед открывает статью 330 ГК" h={42} /></div>}

      {user && (
        <div className="card spot keyrow" style={{ marginTop: 16 }}>
          <div style={{ minWidth: 0 }}><div className="eyebrow">Ваш ключ</div><div className="mono" style={{ fontSize: 14, marginTop: 6, wordBreak: 'break-all' }}>{mask(user.apiKey)}</div>
            <div className="c3" style={{ fontSize: 12.5, marginTop: 4 }}>Уже подставлен в кнопки, макеты и команды. Запросы ассистента идут в ваш лимит: сессия {user.usage?.session?.pct ?? 0}%, неделя {user.usage?.week?.pct ?? 0}%.</div></div>
          <div style={{ display: 'flex', gap: 8 }}><Copy text={user.apiKey} label="Скопировать ключ" />
            <button className="btn ghost" onClick={async () => { if (confirm('Выпустить новый ключ? Старый перестанет работать — его придётся заменить во всех программах.')) { await fetch('/v1/auth/key', { method: 'POST' }); refresh(); } }}>Новый ключ</button></div>
        </div>
      )}

      <div className="sec-h"><span className="eyebrow">Что спросить у ассистента</span></div>
      <div className="prompts v2">{PROMPTS.map((p, i) => (
        <motion.div key={p} className="bubble" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...soft, delay: (i % 4) * 0.05 }}>
          <span>{p}</span><Copy text={p} label="Копировать" className="btn ghost" small />
        </motion.div>
      ))}</div>

      <div className="sec-h"><span className="eyebrow">Если не работает</span></div>
      <div className="list faq">{TROUBLE.map(([q, a]) => <details key={q} className="row"><summary>{q}</summary><p className="c2">{inline(fill(a), q)}</p></details>)}</div>

      <div className="sec-h"><span className="eyebrow">Безопасность ключа</span></div>
      <div className="card tips v2" style={{ padding: '14px 18px' }}>{SECURITY.map((t, i) => <p key={i}>{inline(t, 's' + i)}</p>)}</div>

      {tools.length > 0 && (
        <>
          <div className="sec-h"><span className="eyebrow">Что умеет ассистент с KadBest · {tools.length}</span></div>
          <div className="tools-grid">{tools.map((t) => <div key={t.name} className="tool"><div className="mono">{t.name}</div><div className="c2">{t.description}</div></div>)}</div>
        </>
      )}
    </div>
  );
}

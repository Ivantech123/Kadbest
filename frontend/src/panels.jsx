// Карточки дел: арбитражное дело и дело суда общей юрисдикции (стороны, движение, документы).
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, kadDate } from './api.js';
import { ErrorBox, KindPill, Loading, Pill, Skeleton, fadeUp, soft } from './ui.jsx';
import { fillPrintWindow, openPrintWindow, saveDocx, saveTxt } from './exporter.js';
import { LawText } from './lawlinks.jsx';

function useLoad(fn, deps) {
  const [st, set] = useState({ data: null, error: null });
  useEffect(() => {
    const c = new AbortController();
    set({ data: null, error: null });
    fn(c.signal).then((data) => set({ data, error: null }), (error) => !c.signal.aborted && set({ data: null, error }));
    return () => c.abort();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}

const Section = ({ children, n }) => (
  <div className="sect" style={{ marginTop: 28 }}>
    <span className="eyebrow">{children}</span>
    {n != null && <span className="mono c3" style={{ fontSize: 12 }}>{n}</span>}
  </div>
);

function DocText({ caseId, docId, name }) {
  const label = `${name || 'документ'}`.replace(/\.\w{2,4}$/, '');
  const [st, set] = useState('idle');
  const [text, setText] = useState('');
  const load = async () => {
    set('loading');
    try {
      const t = await api(`/v1/arbitr/doc/${caseId}/${docId}/text`, { name, ...(/\.docx?$/i.test(name) ? { kind: 'doc' } : {}) });
      setText(t.text || '');
      set('done');
    } catch (e) {
      setText(e.message);
      set('error');
    }
  };
  if (st === 'idle') return <button className="btn link" style={{ marginTop: 6, fontSize: 13 }} onClick={load}>Читать документ →</button>;
  if (st === 'loading') return <div style={{ marginTop: 10 }}><Loading compact stages={[[0, 'Запрашиваем документ в суде…'], [4, 'Получаем файл…'], [10, 'Распознаём текст…'], [22, 'Большой документ, ещё немного…']]} /></div>;
  if (st === 'error') return <div className="err" style={{ marginTop: 8 }}>{text} <button className="btn link" onClick={load}>Повторить</button></div>;
  return (
    <>
    <motion.div className="card reader" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={soft}
      style={{ marginTop: 10, padding: 16, maxHeight: '60vh', overflow: 'auto', fontSize: 14 }}>
      <LawText>{text}</LawText>
    </motion.div>
    <div style={{ marginTop: 6, fontSize: 13, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="c3">Скачать:</span>
      <button className="btn link" onClick={() => saveDocx(label, [{ h: '', paras: text.split(/\n+/).filter(Boolean) }])}>Word</button>
      <button className="btn link" onClick={() => { const w = openPrintWindow(label); fillPrintWindow(w, label, [{ h: '', paras: text.split(/\n+/).filter(Boolean) }]); }}>PDF</button>
      <button className="btn link" onClick={() => saveTxt(label, [{ h: '', paras: text.split(/\n+/).filter(Boolean) }])}>TXT</button>
    </div>
    </>
  );
}

export function ArbitrCase({ guid }) {
  const { data: d, error } = useLoad((s) => api(`/v1/arbitr/case/${guid}/all`, {}, s), [guid]);
  if (error) return <ErrorBox error={error} />;
  if (!d) return <><Loading stages={[[0, 'Открываем дело…'], [3, 'Собираем стороны и хронологию…'], [10, 'Суд отвечает медленно, ждём…']]} /><Skeleton n={5} /></>;
  const c = d.card || {}, s = d.sides?.Result || {}, items = d.docs?.Result?.Items || [];
  const party = (t, a) => a?.length ? (
    <>
      <Section n={a.length}>{t}</Section>
      {a.map((p, i) => (
        <motion.div key={p.Id || i} className="party" variants={fadeUp} custom={i} initial="hidden" animate="show">
          <div style={{ fontWeight: 500 }}>{p.Name}</div>
          <div className="c2" style={{ fontSize: 13 }}>{p.INN ? <span className="mono">ИНН {p.INN} · </span> : null}{p.Address}</div>
        </motion.div>
      ))}
    </>
  ) : null;
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><KindPill kind={c.kind} />{c.status && <Pill color="orange">{c.status}</Pill>}</div>
      <h2 className="mono" style={{ fontSize: 28, letterSpacing: '-.03em', margin: '14px 0 4px' }}>{c.number}</h2>
      <LawText as="div" className="c2">{c.category}</LawText>
      <dl className="kv" style={{ marginTop: 20 }}>
        <dt>Регистрация</dt><dd>{c.regDate}</dd>
        {(c.instances || []).map((i) => [<dt key={i.instanceId + 'l'}>{i.level}</dt>, <dd key={i.instanceId}>{i.courtName}</dd>])}
        {d.hearings?.next?.date && (<><dt>Ближайшее заседание</dt><dd>{d.hearings.next.date} {d.hearings.next.place || ''}</dd></>)}
        {(d.hearings?.judges || []).length > 0 && (<><dt>Судьи</dt><dd>{d.hearings.judges.map((j) => j.name || j).join(', ')}</dd></>)}
      </dl>
      {party('Истцы', s.Plaintiffs)}{party('Ответчики', s.Defendants)}{party('Третьи лица', s.Third)}{party('Иные лица', s.Others)}
      <Section n={items.length}>Хронология</Section>
      <ul className="tl">
        {items.map((it, i) => (
          <motion.li key={it.Id || i} className={it.IsAct ? 'act' : ''} variants={fadeUp} custom={i} initial="hidden" animate="show">
            <div className="mono c3" style={{ fontSize: 12 }}>{it.DisplayDate || kadDate(it.Date)}</div>
            <div style={{ fontWeight: 500 }}>{it.DocumentTypeName}</div>
            <LawText as="div" className="c2" style={{ fontSize: 13 }}>{(it.ContentTypes || []).join('; ')}</LawText>
            {it.AdditionalInfo && <LawText as="div" className="c3" style={{ fontSize: 13 }}>{it.AdditionalInfo}</LawText>}
            {it.Id && it.FileName && <DocText caseId={it.CaseId} docId={it.Id} name={it.FileName} />}
          </motion.li>
        ))}
      </ul>
    </>
  );
}

export function CourtCase({ court, params }) {
  const { caseId, caseUid, deloId } = params;
  const { data: c, error } = useLoad((s) => api('/v1/courts/case', { court, caseId, caseUid, deloId }, s), [court, caseId]);
  if (error) return <ErrorBox error={error} />;
  if (!c) return <><Loading stages={[[0, 'Запрашиваем карточку в суде…'], [4, 'Сайт суда отвечает медленно…'], [12, 'Почти готово…']]} /><Skeleton n={5} /></>;
  return (
    <>
      <h2 className="mono" style={{ fontSize: 28, letterSpacing: '-.03em', margin: '0 0 18px' }}>{c.number}</h2>
      <dl className="kv">{Object.entries(c.info).map(([k, v]) => [<dt key={k + 'k'}>{k}</dt>, <dd key={k}><LawText>{v}</LawText></dd>])}</dl>
      {c.tables.filter((t) => t.rows.length).map((t, ti) => {
        const cols = [...new Set(t.rows.flatMap(Object.keys))];
        return (
          <div key={ti}>
            <Section n={t.rows.length}>{t.title || 'Сведения'}</Section>
            <div className="card" style={{ overflow: 'auto' }}>
              <table>
                <thead><tr>{cols.map((k) => <th key={k} className="eyebrow" style={{ top: 0 }}>{k}</th>)}</tr></thead>
                <tbody>{t.rows.map((r, i) => <tr key={i}>{cols.map((k) => <td key={k}><LawText>{r[k] || ''}</LawText></td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Jurisdiction({ address, onPick }) {
  const { data: r, error } = useLoad((s) => api('/v1/courts/by-address', { address }, s), [address]);
  if (error) return <ErrorBox error={{ message: 'Не удалось определить суд по адресу. Попробуйте позже или выберите суд из списка.' }} />;
  if (!r) return <><Loading stages={[[0, 'Определяем адрес…'], [3, 'Ищем суды всех инстанций…']]} /><Skeleton n={3} /></>;
  return (
    <>
      <h2 style={{ fontSize: 28, letterSpacing: '-.03em', margin: '0 0 4px' }}>Подсудность</h2>
      <div className="c2" style={{ marginBottom: 18 }}>{r.address.value}</div>
      <div className="list">
        <AnimatePresence>
          {r.courts.map((c, i) => (
            <motion.div key={c.code} className="row" style={{ cursor: 'default', paddingRight: 18 }} variants={fadeUp} custom={i} initial="hidden" animate="show">
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div className="c2" style={{ fontSize: 13 }}>{c.address}</div>
              {c.code && c.level !== 'magistrate' && <button className="btn link" style={{ marginTop: 6, fontSize: 13 }} onClick={() => onPick({ code: c.code, name: c.name, region: '', level: c.level, address: c.address })}>Заседания этого суда →</button>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

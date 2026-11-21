// Строка поиска: подсказки, голосовой ввод, прикрепление файлов.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import FileThumb from './FileThumb.jsx';
import { ArrowUpRight, BookOpen, Building2, CalendarClock, Clock, CornerDownLeft, Gavel, Mic, Paperclip, Scale, Search, Sparkles } from 'lucide-react';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const FILE_TYPES = 'image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.txt';

const CODES = [['ГК', 'Гражданский кодекс'], ['УК', 'Уголовный кодекс'], ['ТК', 'Трудовой кодекс'], ['КОАП', 'КоАП'], ['НК', 'Налоговый кодекс'], ['АПК', 'АПК'], ['ГПК', 'ГПК'], ['ЖК', 'Жилищный кодекс'], ['СК', 'Семейный кодекс'], ['КАС', 'КАС']];
const EXAMPLES = ['7707083893', 'можно ли взыскать неустойку после расторжения договора', 'ст. 330 ГК', 'А40-118204/2026', 'закон о банкротстве', 'субсидиарная ответственность директора'];
const POPULAR = [
  ['неустойка по договору поставки', 'Вопрос'], ['ст. 15 ГК', 'Статья кодекса'], ['127-ФЗ', 'Закон'],
  ['банкротство физических лиц', 'Вопрос'], ['ст. 81 ТК', 'Статья кодекса'], ['взыскание судебных расходов', 'Вопрос'],
];

// Что за запрос — видно ещё до поиска.
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`", RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const layout = (t) => (/[а-яё]/i.test(t) || (t.match(/[a-z]/gi) || []).length < 2 ? '' : [...t.toLowerCase()].map((c) => { const i = EN.indexOf(c); return i >= 0 ? RU[i] : c; }).join(''));
const ABBR = { ДКП: 'договор купли-продажи', ДДУ: 'договор долевого участия', НДФЛ: 'налог на доходы физлиц', НДС: 'налог на добавленную стоимость', ОСАГО: 'страхование автогражданской ответственности', ЕГРН: 'реестр недвижимости', ЕГРЮЛ: 'реестр юрлиц', МКД: 'многоквартирный дом', СНТ: 'садовое товарищество', ТСЖ: 'товарищество собственников жилья', ГПХ: 'гражданско-правовой договор', ФССП: 'служба приставов', МРОТ: 'минимальный размер оплаты труда' };
const DATE = /(\d{1,2}\.\d{1,2}(\.\d{2,4})?|\d{1,2}\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)|сегодня|завтра|вчера)/i;

export function intentOf(q) {
  const t = q.trim().replace(/[–—‑]/g, '-');
  if (!t) return null;
  const lay = layout(t);
  if (lay && /^(ст|стать)/.test(lay)) return { icon: Scale, label: 'Раскладка: ' + lay };
  if (/суд/i.test(t) && !/арбитраж/i.test(t) && DATE.test(t)) return { icon: CalendarClock, label: 'Расписание заседаний на дату' };
  const ab = t.match(/(?:^|[^А-ЯЁ])(ДКП|ДДУ|НДФЛ|НДС|ОСАГО|ЕГРН|ЕГРЮЛ|МКД|СНТ|ТСЖ|ГПХ|ФССП|МРОТ)(?![А-ЯЁ])/);
  if (ab && t.split(/\s+/).length > 1) return { icon: Sparkles, label: ab[1] + ' — ' + ABBR[ab[1]] };
  const d = t.replace(/^(дело|делу)?\s*(№|N)?\s*/i, '').replace(/^(инн|огрн|огрнип)\s*:?\s*/i, '').replace(/\s/g, '');
  if (/^\d{2}[a-zа-я]{2}\d{4}-\d{2}-\d{4}-\d{5,7}-\d{2}$/i.test(d)) return { icon: Gavel, label: 'УИД — дело суда общей юрисдикции' };
  if (/^[AА]\d{2,3}-\d+\/\d{2}$/i.test(d)) return { icon: Gavel, label: 'Арбитражное дело ' + d.replace(/\/(\d{2})$/, '/20$1') };
  if (/^\d{10}$|^\d{12}$/.test(d)) return { icon: Building2, label: 'ИНН — профиль компании' };
  if (/^\d{13}$|^\d{15}$/.test(d)) return { icon: Building2, label: 'ОГРН — профиль компании' };
  if (/^\d{1,9}$/.test(d)) return { icon: Search, label: d.length < 10 && d.length > 4 ? 'Ещё цифры — похоже на ИНН' : 'Номер закона или статьи' };
  if (/^[AА]\d{2,3}-\d+\/\d{4}$/i.test(d)) return { icon: Gavel, label: 'Арбитражное дело' };
  if (/^\d{1,2}[а-яa-z]{0,2}-\d+\/\d{4}/i.test(d) || /^[мm]-\d+\/\d{4}$/i.test(d)) return { icon: Gavel, label: 'Дело суда общей юрисдикции' };
  if (/ст(\.|атья)?\s*\d/i.test(t) && /(гк|ук|тк|коап|нк|апк|гпк|жк|ск|кас|зк|бк|фз)/i.test(t)) return { icon: Scale, label: 'Статья закона' };
  if (/^ст(\.|атья)?\s*\d/i.test(t)) return { icon: Scale, label: 'Статья — выберите кодекс' };
  if (/\d{1,4}\s*-?\s*фз/i.test(t) || /^(закон|кодекс|приказ|постановлени|указ|письм)/i.test(t)) return { icon: BookOpen, label: 'Закон или акт' };
  if (t.split(/\s+/).length >= 3) return { icon: Sparkles, label: 'Вопрос — ответит ИИ' };
  return { icon: Search, label: 'Компания, тема или ФИО' };
}

function mark(text, q) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<b>{text.slice(i, i + q.length)}</b>{text.slice(i + q.length)}</>;
}

function suggestions(q, recent) {
  const t = q.trim(), lt = t.toLowerCase(), out = [];
  const add = (v, hint, icon, kind = 'go') => { if (v && !out.some((x) => x.v.toLowerCase() === v.toLowerCase())) out.push({ v, hint, icon, kind }); };
  if (!t) {
    recent.slice(0, 5).forEach((r) => add(r, 'Недавний', Clock, 'recent'));
    POPULAR.forEach(([v, h]) => add(v, h, ArrowUpRight));
    return out.slice(0, 8);
  }
  const d = t.replace(/\s/g, '');
  // «ст 330» → варианты по кодексам
  const art = /^(?:ст(?:атья)?\.?\s*)?(\d{1,4}(?:\.\d{1,2})?)\s*([а-яё]*)$/i.exec(t);
  if (art && (/^ст/i.test(t) || art[2])) {
    CODES.filter(([c]) => !art[2] || c.toLowerCase().startsWith(art[2].toLowerCase())).slice(0, 4)
      .forEach(([c, n]) => add(`ст. ${art[1]} ${c}`, n, Scale));
  }
  if (/^\d{1,4}$/.test(d) && !/^ст/i.test(t)) { add(`${d}-ФЗ`, 'Федеральный закон', BookOpen); add(`ст. ${d} ГК`, 'Статья ГК', Scale); }
  recent.filter((r) => r.toLowerCase().includes(lt) && r.toLowerCase() !== lt).slice(0, 4).forEach((r) => add(r, 'Недавний', Clock, 'recent'));
  POPULAR.filter(([v]) => v.includes(lt) && v !== lt).slice(0, 3).forEach(([v, h]) => add(v, h, ArrowUpRight));
  return out.slice(0, 7);
}

export default function SearchBox({ value, onChange, onSubmit, onFile, onMood, recent = [], placeholder, autoFocus, size = 'lg', busy, files = [], onRemoveFile }) {
  const [focus, setFocus] = useState(false);
  const [touched, setTouched] = useState(false); // подсказки — только когда человек сам взаимодействует со строкой
  const [sel, setSel] = useState(-1);
  const [ex, setEx] = useState(0);
  const [pulse, setPulse] = useState(0);
  const box = useRef(null), input = useRef(null), fileIn = useRef(null), rec = useRef(null);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0); // громкость голоса 0…1
  const audio = useRef(null);
  const stopMeter = () => {
    const a = audio.current; audio.current = null;
    if (!a) return;
    cancelAnimationFrame(a.raf); a.stream.getTracks().forEach((t) => t.stop()); a.ctx.close().catch(() => {});
    setLevel(0);
  };
  const startMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const a = { stream, ctx, raf: 0 };
      audio.current = a;
      let sm = 0;
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        sm = sm * 0.7 + Math.min(1, Math.sqrt(sum / buf.length) * 5) * 0.3;
        setLevel(sm);
        a.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* без доступа к микрофону — анимация по таймеру */ }
  };
  useEffect(() => stopMeter, []);
  const [drag, setDrag] = useState(false);
  // диктовка: текст появляется по мере речи, по окончании фразы — поиск
  const dictate = () => {
    if (listening) { rec.current?.stop(); return; }
    const r = new SR();
    r.lang = 'ru-RU'; r.interimResults = true; r.continuous = false;
    let fin = '';
    r.onresult = (e) => {
      let t = '';
      for (const res of e.results) t += res[0].transcript;
      fin = t; onChange(t);
    };
    r.onend = () => { setListening(false); stopMeter(); if (fin.trim()) go(fin); };
    r.onerror = () => { setListening(false); stopMeter(); };
    rec.current = r; setListening(true); setFocus(false); startMeter();
    try { r.start(); } catch { setListening(false); }
  };
  useEffect(() => { onMood?.(listening ? 'listening' : busy ? 'thinking' : value.trim() ? 'typing' : 'idle'); }, [listening, busy, value]); // eslint-disable-line react-hooks/exhaustive-deps
  // файлы не отправляются сразу: встают карточками под строкой, вопрос можно дописать и нажать «Найти»
  const takeFile = (list) => { const fs = [...(list || [])].filter(Boolean); if (fs.length && onFile) { setFocus(false); onFile(fs); input.current?.focus(); } };
  const list = useMemo(() => suggestions(value, recent), [value, recent]);
  const intent = intentOf(value);
  const open = focus && touched && list.length > 0;

  // примеры в пустой строке сменяют друг друга
  useEffect(() => { if (value || focus) return undefined; const t = setInterval(() => setEx((x) => (x + 1) % EXAMPLES.length), 2600); return () => clearInterval(t); }, [value, focus]);
  useEffect(() => { setSel(-1); }, [value]);
  useEffect(() => {
    const k = (e) => { if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName)) { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const go = (q) => { const v = (q ?? value).trim(); if (!v && !files.length) return; onChange(v); setFocus(false); input.current?.blur(); setPulse((x) => x + 1); onSubmit(v); };
  const key = (e) => {
    if (e.key === 'ArrowDown' && !open) { setTouched(true); return; }
    if (e.key === 'Escape' && !open) { if (value) onChange(''); else input.current?.blur(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % list.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s <= 0 ? list.length - 1 : s - 1)); }
    else if (e.key === 'Tab' && sel >= 0) { e.preventDefault(); onChange(list[sel].v); }
    else if (e.key === 'Escape') { setFocus(false); }
  };

  return (
    <div className={'sbox ' + size + (drag ? ' drag' : '')} ref={box} onBlur={(e) => { if (!box.current.contains(e.relatedTarget)) setFocus(false); }}
      onDragOver={(e) => { if (onFile && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={(e) => { if (!box.current.contains(e.relatedTarget)) setDrag(false); }}
      onDrop={(e) => { if (!onFile) return; e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files); }}
      onPaste={(e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length && onFile) { e.preventDefault(); takeFile(fs); } }}>
      <form onSubmit={(e) => { e.preventDefault(); go(sel >= 0 ? list[sel].v : undefined); }}>
        <motion.label className={'search lg sbox-in' + (open ? ' open' : '')}>
          <Search size={18} className="sbox-ic" />
          <div className="sbox-field">
            <input ref={input} value={value} onChange={(e) => { setTouched(true); onChange(e.target.value); }} onFocus={() => setFocus(true)} onPointerDown={() => { setTouched(true); setFocus(true); }} onKeyDown={key}
              autoFocus={autoFocus} aria-label="Поиск" aria-autocomplete="list" aria-expanded={open} placeholder={placeholder || ''} spellCheck={false} />
            {listening && !value && <span className="sbox-ph sbox-listen">Говорите — слушаю…</span>}
            {!value && !placeholder && !listening && (
              <AnimatePresence mode="wait">
                <motion.span key={ex} className="sbox-ph" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  Например: {EXAMPLES[ex]}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          <AnimatePresence>
            {intent && (
              <motion.span className="sbox-intent" key={intent.label} initial={{ opacity: 0, scale: 0.9, x: 6 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}>
                <intent.icon size={13} />{intent.label}
              </motion.span>
            )}
          </AnimatePresence>
          {value && <button type="button" className="btn ghost" onClick={() => { onChange(''); input.current?.focus(); }} aria-label="Очистить">✕</button>}
          {onFile && (
            <>
              <span className="sbox-sep" />
              <button type="button" className="sbox-tool" title="Прикрепить фото или документ (PDF, Word) — ИИ прочитает и найдёт практику" aria-label="Прикрепить файл" onClick={() => fileIn.current?.click()}><Paperclip size={18} strokeWidth={1.9} /></button>
              <input ref={fileIn} type="file" accept={FILE_TYPES} multiple hidden onChange={(e) => { takeFile(e.target.files); e.target.value = ''; }} />
            </>
          )}
          {listening && <span className={'eq' + (audio.current ? ' eq-live' : '')} aria-hidden>{[0.55, 0.85, 1, 0.8, 0.5].map((k, i) => <i key={i} style={audio.current ? { transform: `scaleY(${Math.max(0.2, Math.min(1, level * k * 3.2 + (i % 2) * 0.06))})` } : { animationDelay: i * 0.12 + 's' }} />)}</span>}
          {SR && (
            <button type="button" className={'sbox-tool mic' + (listening ? ' rec' : '')} title={listening ? 'Остановить' : 'Сказать голосом'} aria-label="Голосовой ввод" onClick={dictate}
              style={{ '--lv': level }}>
              {listening && <><span className="mic-ring r1" /><span className="mic-ring r2" /></>}
              <Mic size={18} strokeWidth={1.9} />
            </button>
          )}
          <button className="btn pri sbox-go" disabled={busy}>{busy ? <span className="spin" /> : 'Найти'}</button>
          {busy && <span className="sbox-scan" />}
        </motion.label>
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div className="sbox-att" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="sbox-att-list">
                {files.map((f, i) => (
                  <motion.div key={f.name + f.size + i} className="att" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <FileThumb name={f.name} src={f.type.startsWith('image/') ? (f._url || (f._url = URL.createObjectURL(f))) : ''} size={36} />
                    <div className="att-t"><b title={f.name}>{f.name || 'фото'}</b><small>{f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(f.size / 1024)) + ' КБ'}</small></div>
                    <button type="button" className="att-x" aria-label={'Убрать ' + f.name} onClick={() => onRemoveFile?.(i)}>×</button>
                  </motion.div>
                ))}
                {files.length < 5 && <button type="button" className="att add" onClick={() => fileIn.current?.click()}><Paperclip size={15} />Ещё документ</button>}
              </div>
              <div className="sbox-att-hint c3">{files.length === 1 ? 'Документ прикреплён' : `Документов: ${files.length} из 5`} · напишите вопрос к {files.length === 1 ? 'нему' : 'ним'} или просто нажмите «Найти»</div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
      <AnimatePresence>
        {open && (
          <motion.ul className="sbox-list" role="listbox" initial={{ opacity: 0, y: -6, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            {!value.trim() && <li className="sbox-cap">{recent.length ? 'Недавние и популярные' : 'Популярные запросы'}</li>}
            {list.map((s, i) => (
              <motion.li key={s.v} role="option" aria-selected={i === sel} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); go(s.v); }}>
                {i === sel && <motion.span layoutId="sbox-sel" className="sbox-sel" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                <s.icon size={15} className="sbox-li" />
                <span className="sbox-v">{mark(s.v, value.trim())}</span>
                <span className="sbox-h">{s.hint}</span>
              </motion.li>
            ))}
            <li className="sbox-foot"><span><kbd>↑</kbd><kbd>↓</kbd> выбор</span><span><kbd>Tab</kbd> подставить</span><span><kbd><CornerDownLeft size={11} /></kbd> найти</span><span><kbd>/</kbd> к поиску</span></li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

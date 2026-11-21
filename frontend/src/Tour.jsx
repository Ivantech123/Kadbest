// Обучающий тур по сайту для новых пользователей.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import Face from './Face.jsx';

const DONE = 'kb-tour-done';
export const tourSeen = () => { try { return !!localStorage.getItem(DONE); } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(DONE, '1'); } catch { /* приватный режим */ } };

// Шаги тура: что подсветить и что сказать. Отсутствующие на странице элементы пропускаются.
const STEPS = [
  { sel: '.live-title', mood: 'happy', title: 'Привет! Я помощник KadBest', text: 'Покажу, как здесь всё устроено. Это займёт полминуты — обещаю не занудничать.' },
  { sel: '.sbox-in', mood: 'typing', title: 'Одна строка для всего', text: 'Пишите что угодно: ИНН, номер дела, «ст. 330 ГК» или вопрос обычными словами. Я пойму, что это, и подскажу ещё до поиска.' },
  { sel: '.sbox-tool.mic', mood: 'listening', title: 'Можно голосом', text: 'Нажмите на микрофон и скажите вопрос — поиск запустится сам, когда договорите.' },
  { sel: '.sbox-tool[aria-label="Прикрепить файл"]', mood: 'thinking', title: 'Фото и документы', text: 'Прикрепите иск, претензию или договор — фото, PDF или Word. Я прочитаю документ, найду стороны и подберу практику. Можно просто перетащить файл на строку.' },
  { sel: '.stabs', mood: 'idle', title: 'Разделы', text: '«Всё» ищет везде сразу. Остальные вкладки сужают поиск: арбитраж, суды общей юрисдикции или законы. Наведите на вкладку — подскажу, что в ней.' },
  { sel: '.acct', mood: 'happy', title: 'Ваш профиль', text: 'Здесь остаток запросов, история вопросов, тарифы и ключ для подключения к ИИ-ассистентам.' },
  { sel: '.help-fab', mood: 'wait', title: 'Если что — я тут', text: 'Кнопка «?» запускает этот тур снова. Удачного поиска!' },
];

const PAD = 8;

export default function Tour({ open, onClose }) {
  const [steps, setSteps] = useState([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [bye, setBye] = useState(null); // тур закрывается: куда маскот летит обратно

  useEffect(() => {
    if (!open) return;
    setBye(null);
    setSteps(STEPS.filter((s) => document.querySelector(s.sel)));
    setI(0);
  }, [open]);

  const step = steps[i];
  // положение подсветки: пересчитываем при прокрутке и изменении окна
  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    const el = document.querySelector(step.sel);
    if (!el) return undefined;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const upd = () => { const r = el.getBoundingClientRect(); setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }); };
    upd();
    const t = setInterval(upd, 120); // следим, пока идёт прокрутка и анимации
    window.addEventListener('resize', upd);
    return () => { clearInterval(t); window.removeEventListener('resize', upd); };
  }, [open, step]);

  // возвращение: маскот летит обратно в свою мордочку на странице (или ныряет в кнопку «?»), потом тур закрывается
  const finish = () => {
    if (bye) return;
    markSeen();
    const face = document.querySelector('.live-title .face')?.getBoundingClientRect();
    const fab = document.querySelector('.help-fab')?.getBoundingClientRect();
    const t = face ? { x: face.left, y: face.top, s: face.width } : fab ? { x: fab.left + fab.width / 2, y: fab.top + fab.height / 2, s: 0, fab: true } : { x: window.innerWidth / 2, y: -120, s: 0 };
    setBye(t);
    setTimeout(() => { setBye(null); onClose(); }, 950);
  };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const prev = () => setI(Math.max(0, i - 1));
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
      if (typing) { if (e.key.length === 1) finish(); return; } // человек начал печатать — не мешаем
      if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight' || e.key === 'Enter') next(); if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // маскот вылетает из своей мордочки на странице и дальше перелетает по дуге
  const from = useRef(null);
  useEffect(() => {
    if (!open) { from.current = null; document.body.classList.remove('touring'); return undefined; }
    const f = document.querySelector('.live-title .face')?.getBoundingClientRect();
    from.current = f ? { x: f.left, y: f.top } : { x: window.innerWidth / 2 - 40, y: window.innerHeight };
    document.body.classList.add('touring');
    return () => document.body.classList.remove('touring');
  }, [open]);
  const pos = useRef(null);

  if (!open || !step || !rect) return null;
  // карточка — под подсвеченным элементом, а если места нет — над ним
  const vw = window.innerWidth, vh = window.innerHeight, M = vw < 640 ? 64 : 88, cw = Math.min(380, vw - 24);
  const lift = M * 0.62; // маскот сидит сверху на облачке
  const below = rect.y + rect.h + 16 + lift + 220 < vh;
  const cx = Math.min(Math.max(12, rect.x + rect.w / 2 - cw / 2), vw - cw - 12);
  const cy = below ? rect.y + rect.h + 16 + lift : Math.max(12 + lift, rect.y - 16 - 220);
  const mx = cx + 22, my = cy - lift;
  if (!pos.current || pos.current.i !== i) pos.current = { i, dir: Math.sign(mx - (pos.current?.x ?? from.current?.x ?? mx)) || 1, x: mx };
  const dirX = pos.current.dir;

  return createPortal(
    <div className="tour" role="dialog" aria-label="Знакомство с KadBest">
      <motion.div className="tour-dim" animate={{ opacity: bye ? 0 : 1 }} transition={{ duration: 0.45, delay: bye ? 0.25 : 0 }}>
      <div className="tour-catch" onClick={finish} />
      <motion.div className="tour-spot" initial={false} animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
      </motion.div>
      <motion.div className="tour-mascot" style={{ width: M, height: M }}
        initial={{ left: (from.current || { x: mx }).x, top: (from.current || { y: vh }).y }}
        animate={bye ? { left: bye.fab ? bye.x - M / 2 : bye.x - (M - bye.s) / 2, top: bye.fab ? bye.y - M / 2 : bye.y - (M - bye.s) / 2, scale: bye.fab ? 0.2 : bye.s / M, opacity: bye.fab ? 0 : 1 } : { left: mx, top: my, scale: 1, opacity: 1 }}
        transition={bye ? { duration: 0.85, ease: [0.45, 0, 0.2, 1] } : { type: 'spring', stiffness: 70, damping: 15, mass: 0.9 }}>
        <motion.div key={bye ? 'home' : 'arc' + i} animate={bye ? { y: [0, -90, 0], rotate: [0, 360] } : { y: [0, -110, 0], rotate: [0, 16 * dirX, -6 * dirX, 0], scale: [1, 0.86, 1.05, 1] }} transition={{ duration: 0.8, ease: 'easeInOut' }}>
          <Face mood={bye ? 'happy' : step.mood} size={M} />
          <motion.span key={'tr' + i} className="tour-trail" initial={{ opacity: 0.7, scale: 1 }} animate={{ opacity: 0, scale: 2.4 }} transition={{ duration: 0.8 }} />
        </motion.div>
      </motion.div>
      <AnimatePresence mode="wait">
        {!bye && <motion.div key={i} className="tour-card" style={{ width: cw, left: cx, top: cy }}
          initial={{ opacity: 0, y: -10, scale: 0.9, transformOrigin: '60px 0' }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.45 }}>
          <button className="tour-x" onClick={finish} aria-label="Закрыть тур"><X size={16} /></button>
          <span className="tour-tail" />
          <div className="tour-head"><div><div className="tour-n">Шаг {i + 1} из {steps.length}</div><div className="tour-t">{step.title}</div></div></div>
          <p className="tour-p">{step.text}</p>
          <div className="tour-foot">
            <div className="tour-dots">{steps.map((_, k) => <motion.i key={k} animate={{ width: k === i ? 18 : 6, opacity: k === i ? 1 : 0.35 }} onClick={() => setI(k)} />)}</div>
            {i > 0 && <button className="btn ghost" onClick={prev}><ArrowLeft size={15} />Назад</button>}
            <button className="btn pri" onClick={next}>{i < steps.length - 1 ? <>Далее<ArrowRight size={15} /></> : 'Начать поиск'}</button>
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

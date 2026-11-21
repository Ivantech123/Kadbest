// Перетаскивание документов на страницу и реакции Буквоеда на это.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Face from './Face.jsx';
import GhostMini from './GhostMini.jsx';
import { react } from './react.js';

// Отыгрыш Буквоеда на документы: он же Буквоед — документы он ест (и читает).

const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
const docsWord = (n) => (n === 1 ? 'документ' : n + ' ' + plural(n, 'документ', 'документа', 'документов'));
const NUM = ['', 'Один', 'Два', 'Три', 'Четыре', 'Пять'];
const extOf = (n) => ((n || '').split('.').pop() || 'файл').slice(0, 4).toUpperCase();

// Перетаскивание файлов над страницей: большой Буквоед ловит документы.
export function DropCatcher({ onFiles, enabled = true }) {
  const [over, setOver] = useState(false);
  const [count, setCount] = useState(0);
  const [fly, setFly] = useState(null); // { x, y, names } — летящие в Буквоеда карточки
  const [say, setSay] = useState('');
  const depth = useRef(0);
  const center = useRef(null);
  const cb = useRef(onFiles);
  cb.current = onFiles;

  useEffect(() => {
    if (!enabled) return undefined;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const enter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true); setCount(e.dataTransfer.items?.length || 0); setSay(''); };
    const overF = (e) => { if (hasFiles(e)) e.preventDefault(); };
    const leave = (e) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); };
    const drop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); e.stopPropagation();
      depth.current = 0;
      const fs = [...(e.dataTransfer.files || [])];
      if (!fs.length) { setOver(false); return; }
      setFly({ x: e.clientX, y: e.clientY, names: fs.slice(0, 5).map((f) => f.name) });
      setSay(fs.length > 5 ? 'Ого! Возьму первые пять — больше за раз не съем' : `Ням! ${NUM[fs.length] || fs.length} ${plural(fs.length, 'документ', 'документа', 'документов')}`);
      setTimeout(() => react('chomp'), 450);
      setTimeout(() => { cb.current(fs); }, 700);
      setTimeout(() => { setOver(false); setFly(null); }, 1700);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', overF);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop, true);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', overF);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop, true);
    };
  }, [enabled]);

  const c = center.current?.getBoundingClientRect();
  const cx = c ? c.left + c.width / 2 : window.innerWidth / 2, cy = c ? c.top + c.height / 2 : window.innerHeight / 2;
  return (
    <AnimatePresence>
      {over && (
        <motion.div className="catch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="catch-ring" />
          <div className="catch-in" ref={center}>
            <AnimatePresence mode="wait">
              <motion.div key={say || 'wait'} className="catch-say" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                {say || (count > 1 ? `Вижу ${docsWord(count)}! Бросайте — съем и прочитаю` : 'Бросайте документ — съем и прочитаю')}
              </motion.div>
            </AnimatePresence>
            <motion.div animate={say ? {} : { y: [0, -10, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
              <Face size={200} />
            </motion.div>
            <div className="catch-hint c3">PDF, Word, фото или текст · до 5 файлов, по 10 МБ</div>
          </div>
          {fly && fly.names.map((n, i) => (
            <motion.div key={i} className="catch-file" initial={{ x: fly.x - 30 + i * 14, y: fly.y - 36 + i * 6, scale: 1, opacity: 1, rotate: -8 + i * 6 }}
              animate={{ x: cx - 30, y: cy - 10, scale: 0.15, opacity: 0, rotate: 30 }} transition={{ duration: 0.55, delay: i * 0.08, ease: [0.5, 0, 0.75, 0] }}>
              <span className="mono">{extOf(n)}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Реплика Буквоеда, пока он читает документы — по типам файлов.
export function ReadingTalk({ names = [] }) {
  const lines = [];
  const types = names.map(extOf);
  if (names.length > 1) lines.push(`Читаю ${docsWord(names.length)}…`);
  if (types.some((t) => /PNG|JPG|JPEG|WEBP|HEIC|GIF/.test(t))) lines.push('Разглядываю фото — буква за буквой');
  if (types.includes('PDF')) lines.push('Открываю PDF, листаю страницы');
  if (types.includes('DOCX')) lines.push('Листаю Word, ищу суммы и сроки');
  lines.push('Выписываю стороны и требования');
  if (names.length > 1) lines.push('Сверяю суммы, даты и стороны между документами');
  lines.push('Почти дочитал…');
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 3200); return () => clearInterval(t); }, [lines.length]);
  return (
    <div className="talk">
      <motion.div className="talk-g" animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <GhostMini size={42} look={{ x: 0, y: 8 }} />
        <span className="talk-paper" />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span key={i} className="talk-b" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{lines[i]}</motion.span>
      </AnimatePresence>
    </div>
  );
}

// Реплика после чтения: нашёл расхождения или всё сходится.
export function DoneTalk({ d, many }) {
  const text = `${d?.summary || ''} ${d?.answer || ''}`.toLowerCase();
  const diff = /расхожд|противореч|не совпада|не сходит|разные суммы|больше цены|меньше цены/.test(text);
  useEffect(() => { react(diff ? 'jump' : 'tilt'); }, [diff]);
  return (
    <div className={'talk done' + (diff ? ' warn' : '')}>
      <GhostMini size={36} look={{ x: 6, y: diff ? 4 : -4 }} sad={false} />
      <span className="talk-b">{diff ? 'Нашёл расхождения — смотрите ниже' : many ? 'Прочитал все документы. Вот главное' : 'Прочитал. Вот главное'}</span>
    </div>
  );
}

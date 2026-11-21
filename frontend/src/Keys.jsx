// Горячие клавиши сайта и окно-подсказка с их списком.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import GhostMini from './GhostMini.jsx';

// Шпаргалка горячих клавиш: «?» в любом месте, кроме полей ввода. Esc — закрыть.
const KEYS = [
  [['/'], 'Перейти в строку поиска'],
  [['Ctrl', 'K'], 'Быстрые команды'],
  [['↑', '↓'], 'Выбрать подсказку'],
  [['Tab'], 'Подставить подсказку в строку'],
  [['Enter'], 'Найти'],
  [['Esc'], 'Закрыть подсказки, очистить строку'],
  [['?'], 'Эта шпаргалка'],
];

export default function Keys() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const k = (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key === '?' && !typing) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="keys" role="dialog" aria-label="Горячие клавиши" initial={{ y: 16, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }} onClick={(e) => e.stopPropagation()}>
            <div className="keys-h"><GhostMini size={40} /><div><b>Горячие клавиши</b><div className="c3">Буквоед любит, когда без мышки</div></div></div>
            <ul>
              {KEYS.map(([ks, t]) => (
                <li key={t}><span>{t}</span><span className="keys-k">{ks.map((k) => <kbd key={k}>{k === 'Ctrl' && mac ? '⌘' : k}</kbd>)}</span></li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

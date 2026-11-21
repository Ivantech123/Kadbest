// Буквоед с реакциями (подпрыгнуть, вздрогнуть, кивнуть) — обёртка над Mascot.jsx.
import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import Mascot from './Mascot.jsx';
import { REACTIONS, isNight } from './react.js';

// Персонаж сайта — Буквоед (см. Mascot.jsx). Прежний API сохранён: size — высота в пикселях.
// Сам Буквоед не меняется; реакции — движение всего персонажа (react.js): подпрыгивает, когда ответ готов,
// вздрагивает на ошибку, кивает на копирование, делает сальто по пасхалке; ночью рядом с ним плывут «z».
export default function Face({ size = 72, mood }) {
  const ctl = useAnimationControls();
  const reduce = useReducedMotion();
  const [night, setNight] = useState(isNight());
  useEffect(() => {
    const on = (e) => { const r = REACTIONS[e.detail]; if (r && !reduce) { const { transition, ...kf } = r; ctl.start({ ...kf, transition }); } };
    window.addEventListener('kb:react', on);
    const t = setInterval(() => setNight(isNight()), 60000);
    return () => { window.removeEventListener('kb:react', on); clearInterval(t); };
  }, [ctl, reduce]);
  const sleepy = night && (!mood || mood === 'idle' || mood === 'sleep');
  return (
    <motion.div className="face-wrap" animate={ctl} style={{ position: 'relative', display: 'inline-block', transformOrigin: 'bottom center' }}>
      <Mascot size={Math.round((size * 231) / 289)} />
      {sleepy && size >= 50 && <span className="zzz" aria-hidden><i>z</i><i>z</i><i>z</i></span>}
    </motion.div>
  );
}

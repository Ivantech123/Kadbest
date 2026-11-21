// Точка входа: шрифты, стили, подсветка карточек за курсором, монтирование App.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
// шрифты — со своего сервера (не с Google): Onest для интерфейса, JetBrains Mono для цифр и кода, Literata для документов
import '@fontsource-variable/onest/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@fontsource-variable/literata/opsz.css';
import './styles.css';

// «Спотлайт»: карточки с классом .spot подсвечиваются за курсором.
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest?.('.spot');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);

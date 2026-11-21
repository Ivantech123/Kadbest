// Реакции Буквоеда на события сайта: одно событие на весь сайт, на него отвечает каждый видимый Буквоед.
// jump — ответ готов, shake — ошибка, tilt — что-то скопировали, spin — пасхалка (5 кликов по логотипу).
export function react(type) {
  try { window.dispatchEvent(new CustomEvent('kb:react', { detail: type })); } catch { /* старый браузер */ }
}

export const REACTIONS = {
  jump: { y: [0, -26, 0, -8, 0], scaleY: [1, 0.9, 1.06, 0.98, 1], transition: { duration: 0.75, ease: 'easeOut' } },
  shake: { x: [0, -8, 8, -6, 6, -3, 0], rotate: [0, -4, 4, -3, 3, 0, 0], transition: { duration: 0.55 } },
  tilt: { rotate: [0, -14, 6, 0], scale: [1, 1.08, 1, 1], transition: { duration: 0.6 } },
  chomp: { scaleY: [1, 0.8, 1.08, 0.84, 1.04, 1], scaleX: [1, 1.1, 0.95, 1.08, 0.98, 1], transition: { duration: 0.7, ease: 'easeInOut' } },
  spin: { rotate: [0, 360], y: [0, -40, 0], transition: { duration: 0.9, ease: 'easeInOut' } },
};

// ночь (23:00–6:00) — Буквоед дремлет
export const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };

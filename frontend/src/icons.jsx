// Значки разделов и логотип.
import GhostMini from './GhostMini.jsx';
import { CalendarClock, Info, Layers, Radar, ScrollText, Search, Sparkles, Webhook } from 'lucide-react';

// Иконки разделов — по смыслу работы, без «весов» и «молотков».
export const SECTION = {
  search: Search, // общий поиск
  arbitr: Layers, // стопка дел
  courts: CalendarClock, // расписание заседаний
  law: ScrollText, // текст нормы
  profile: Radar, // профиль компании
  ai: Sparkles, // ИИ-ассистенты
  api: Webhook, // интеграции
  about: Info,
};

export function Icon({ name, size = 18, ...p }) {
  const C = SECTION[name] || Info;
  return <C size={size} strokeWidth={1.75} aria-hidden {...p} />;
}

// Логотип: монограмма K в скруглённом квадрате и акцентная точка — «найдено».
// Логотип — маленький Буквоед (статичный SVG его палитры, моргает).
export function Logo({ size = 24 }) {
  return <GhostMini size={size + 2} title="KadBest" />;
}

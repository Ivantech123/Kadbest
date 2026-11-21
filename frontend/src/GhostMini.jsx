// Маленький Буквоед без шейдера: чистый SVG с градиентом его палитры. Для логотипа, значков, прелоадеров
// и сообщений — там, где живой градиент (WebGL) избыточен. Глаза моргают так же, как у большого.
import { useId } from 'react';

export const GHOST_PATH = 'M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z';

export default function GhostMini({ size = 24, eyes = true, blink = true, look = { x: 0, y: 0 }, sad = false, title, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={'ghost-mini ' + className} width={(size * 231) / 289} height={size} viewBox="0 0 231 289" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={'gm-a' + id} cx="0.22" cy="0.18" r="0.9">
          <stop offset="0" stopColor="#FFB3D9" />
          <stop offset="0.45" stopColor="#87CEEB" />
          <stop offset="0.75" stopColor="#4A90E2" />
          <stop offset="1" stopColor="#2C3E50" />
        </radialGradient>
        <radialGradient id={'gm-b' + id} cx="0.85" cy="0.9" r="0.7">
          <stop offset="0" stopColor="#1A1A2E" stopOpacity="0.85" />
          <stop offset="1" stopColor="#1A1A2E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={GHOST_PATH} fill={`url(#gm-a${id})`} />
      <path d={GHOST_PATH} fill={`url(#gm-b${id})`} />
      {eyes && [80, 150].map((cx) => (
        <ellipse key={cx} cx={cx + look.x} cy={(sad ? 132 : 120) + look.y} rx="20" ry={sad ? 22 : 30} fill="#1A1A2E" className={blink ? 'animate-blink' : undefined} />
      ))}
    </svg>
  );
}

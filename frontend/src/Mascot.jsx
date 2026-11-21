// Буквоед — персонаж сайта (SVG-компонент, поведение не менять).
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MeshGradient } from '@paper-design/shaders-react';

// Буквоед — персонаж KadBest. Перенос компонента MeshGradientSVG (shader-svg.tsx) без изменений поведения:
// те же цвета, форма, «дыхание» (y −8, scaleY 1,08, 2,8 с), глаза 20×30 цветом текста, моргание раз в 3 с,
// слежение за курсором (×0,08, не больше 8). Отличия только технические: size — ширина в пикселях
// (оригинал тянется на ширину блока до max-w-sm), шейдер на паузе, пока персонаж вне экрана.
const SHAPE = 'M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z';
const W = 231, H = 289;
const colors = [
  '#FFB3D9', // Pastel pink
  '#87CEEB', // Sky blue
  '#4A90E2', // Medium blue
  '#2C3E50', // Dark blue-gray
  '#1A1A2E', // Very dark blue
];

export default function Mascot({ size = 231, label = 'Буквоед — персонаж KadBest', className = '' }) {
  const svg = useRef(null);
  const box = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const rect = svg.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (mousePosition.x - centerX) * 0.08;
      const deltaY = (mousePosition.y - centerY) * 0.08;
      const maxOffset = 8;
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
      });
    }
  }, [mousePosition]);

  useEffect(() => { // пауза шейдера вне экрана
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scale = size / W;
  return (
    <motion.div
      ref={box}
      role="img"
      aria-label={label}
      className={'mascot ' + className}
      style={{ width: size, transformOrigin: 'top center' }}
      animate={{ y: [0, -8 * Math.min(1, size / 100), 0], scaleY: [1, 1.08, 1] }} // маленьким (<100 px) — подъём пропорционально росту
      transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
    >
      <div style={{ width: size, height: H * scale, position: 'relative' }}>
        <div className="mascot-body" style={{ width: W, height: H, transform: `scale(${scale})`, clipPath: `path('${SHAPE}')` }}>
          <MeshGradient colors={colors} speed={visible ? 1 : 0} style={{ width: W, height: H }} />
        </div>
        <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={size} height={H * scale} className="mascot-eyes" aria-hidden>
          {[80, 150].map((cx) => (
            <motion.ellipse key={cx} rx="20" ry="30" fill="currentColor" className="animate-blink"
              initial={{ cx, cy: 120 }}
              animate={{ cx: cx + eyeOffset.x, cy: 120 + eyeOffset.y }}
              transition={{ type: 'spring', stiffness: 150, damping: 15 }} />
          ))}
        </svg>
      </div>
    </motion.div>
  );
}

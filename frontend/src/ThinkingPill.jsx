// ThinkingPill — стеклянная «пилюля» с живым градиентом для состояний «думает / ищет / загружается».
// Перенос компонента Thinking Pill (Louis Studios, studios.lou15.com) с TypeScript на JSX; шейдер и поведение
// без изменений. Наши отличия: цвета по умолчанию — палитра Буквоеда, шрифт — шрифт сайта.
import * as React from 'react';

// палитра Буквоеда, разложенная слева направо и замкнутая на розовый — градиент течёт без шва
export const BUKVOED_COLORS = ['#FFB3D9', '#c9a6f0', '#87CEEB', '#4A90E2', '#2C3E50', '#4A90E2', '#87CEEB', '#FFB3D9'];

const LOOP = 12;
const STOPS = 10;
const FONT = 0.34;
const TAU = Math.PI * 2;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uPx;
uniform float uPh;
uniform float uOn;
uniform vec3 uCol[${STOPS}];

const float TAU = 6.2831853;

vec3 palette(float x) {
  x = clamp(x, 0.0, 1.0) * ${STOPS - 1}.0;
  vec3 c = uCol[0];
  for (int i = 1; i < ${STOPS}; i++) {
    float f = clamp(x - float(i - 1), 0.0, 1.0);
    c = mix(c, uCol[i], f * f * (3.0 - 2.0 * f));
  }
  return c;
}

float crest(float u, float ph) {
  float e = 0.4873
    + 0.1265 * sin(TAU * 0.6 * u - 2.6533)
    + 0.2222 * sin(TAU * 1.1 * u - 0.4660)
    + 0.1004 * sin(TAU * 1.7 * u + 0.2938)
    + 0.0232 * sin(TAU * 2.4 * u - 2.7535)
    + 0.040 * exp(-pow((u - 0.14) / 0.075, 2.0))
    + 0.015 * exp(-pow((u - 0.8) / 0.1, 2.0));
  float r = 0.060 * (sin(TAU * 1.15 * u - 3.0 * ph + 0.7) - sin(TAU * 1.15 * u + 0.7))
          + 0.040 * (sin(TAU * 1.9 * u + 4.0 * ph + 1.9) - sin(TAU * 1.9 * u + 1.9))
          + 0.018 * (sin(TAU * 3.1 * u - 6.0 * ph + 2.5) - sin(TAU * 3.1 * u + 2.5))
          + 0.020 * (sin(ph + 0.4) - sin(0.4));
  return e + r;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float H = uRes.y;
  float u = fc.x / uRes.x;
  float y = fc.y / H;
  float ph = uPh;

  float R = 0.5 * H;
  vec2 q = abs(fc - 0.5 * uRes) - vec2(0.5 * uRes.x - R, 0.0);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - R;
  float din = max(-sd, 0.0) / H;

  float e = crest(u, ph);
  float d = y - e;
  float mid = exp(-pow((u - 0.5) / 0.15, 2.0));
  float hx = u + mid * (0.04 - 0.17 * smoothstep(0.0, 0.22, d))
    + 0.070 * (sin(TAU * 0.8 * u - ph + 1.0) - sin(TAU * 0.8 * u + 1.0))
    + 0.035 * (sin(TAU * 1.7 * u + 2.0 * ph + 0.3) - sin(TAU * 1.7 * u + 0.3))
    + 0.030 * (sin(TAU * 1.15 * u - 3.0 * ph + 0.7) - sin(TAU * 1.15 * u + 0.7));
  vec3 c = palette(hx);
  c *= 1.0 + 0.15 * (sin(TAU * 1.4 * u - 3.0 * ph) - sin(TAU * 1.4 * u))
           + 0.07 * (sin(TAU * 2.3 * u + 4.0 * ph + 1.2) - sin(TAU * 2.3 * u + 1.2));

  vec3 ink = vec3(0.055, 0.020, 0.133);
  vec3 col = ink;

  float haze = exp(-pow((u - 0.52) / 0.09, 2.0));
  float up = max(-d, 0.0) / (1.0 + 1.6 * haze);
  col += uOn * pow(c, vec3(2.6)) * 1.0 * exp(-up / 0.03);
  col += uOn * c * (0.06 + 0.05 * haze) * exp(-up / 0.07);

  float body = smoothstep(0.004 - 0.034 * haze, 0.045 + 0.04 * haze, d);
  float frost = 1.0 - (1.0 - smoothstep(0.03, 0.4, d)) * (1.0 - 0.85 * smoothstep(0.6, 0.76, y));
  float lum = mix(0.53, 0.60, smoothstep(0.65, 0.9, y)) + 0.03 * sin(ph * 2.0 + 0.5) * smoothstep(0.4, 0.9, y);
  vec3 chroma = c / max(dot(c, vec3(0.3333)), 0.06);
  float stain = mix(0.24, 0.06, smoothstep(0.72, 0.97, y)) * (1.0 + 0.9 * smoothstep(0.6, 0.95, u));
  vec3 milk = lum * mix(vec3(1.0), chroma, stain);
  vec3 band = mix(c, milk, frost);
  float rib = d - 0.11 - 0.035 * sin(TAU * 1.6 * u + 3.0 * ph + 0.8) - 0.02 * sin(TAU * 2.7 * u - 5.0 * ph);
  band += c * 0.11 * exp(-rib * rib / 0.0025) * (0.6 + 0.4 * sin(TAU * 0.9 * u - 2.0 * ph + 2.0));
  col = mix(col, band, body * uOn);

  vec3 rest = mix(ink, vec3(0.20, 0.19, 0.24), smoothstep(0.35, 1.0, y) * 0.5);
  col = mix(rest, col, uOn);

  float low = smoothstep(0.4, 0.95, y);
  vec3 rimTint = mix(vec3(0.44, 0.43, 0.53), vec3(0.98), low);
  float inner = exp(-din / mix(0.035, 0.065, low)) * mix(0.42, 0.75, low);
  col = mix(col, rimTint, clamp(inner, 0.0, 1.0));
  float line = exp(-max(-sd, 0.0) / (1.0 * uPx));
  col = mix(col, mix(vec3(0.34, 0.33, 0.44), vec3(0.95), low), line * 0.8);

  col += (hash(fc) - 0.5) * (2.5 / 255.0);
  col = clamp(col, 0.0, 1.0);
  float a = clamp(0.5 - sd, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) console.error(gl.getShaderInfoLog(s));
  return s;
}

const released = new WeakMap();

function readColor(css, ctx) {
  const hex = css.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  if (!ctx) return [0.5, 0.5, 0.5];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

function resample(colors) {
  let ctx = null;
  if (colors.some((c) => !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim()))) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    ctx = cv.getContext('2d', { willReadFrequently: true });
  }
  const src = (colors.length ? colors : BUKVOED_COLORS).map((c) => readColor(c, ctx));
  if (src.length === 1) src.push(src[0]);
  const out = new Float32Array(STOPS * 3);
  for (let i = 0; i < STOPS; i++) {
    const x = (i / (STOPS - 1)) * (src.length - 1);
    const a = Math.floor(x);
    const b = Math.min(a + 1, src.length - 1);
    const f = x - a;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = src[a][k] * (1 - f) + src[b][k] * f;
  }
  return out;
}

/** Стеклянная пилюля с живым градиентом для состояний «думает». */
export function ThinkingPill({
  label = 'Думаю',
  dots = true,
  width = 360,
  height,
  speed = 1,
  colors = BUKVOED_COLORS,
  active = true,
  shimmer = true,
  className,
  style,
  ...props
}) {
  const h = height ?? Math.round(width * 0.3);
  const canvasRef = React.useRef(null);
  const textRef = React.useRef(null);
  const labelRef = React.useRef(null);
  const dotRefs = React.useRef([]);
  const activeRef = React.useRef(active);
  const kickRef = React.useRef(() => {});
  const releaseRef = React.useRef(undefined);
  const [fallback, setFallback] = React.useState(false);
  const colorKey = colors.join('|');

  React.useEffect(() => {
    activeRef.current = active;
    kickRef.current();
  }, [active]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    clearTimeout(releaseRef.current);
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      setFallback(true);
      return undefined;
    }
    const lose = gl.getExtension('WEBGL_lose_context');
    const colorData = resample(colors);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(width * dpr);
    const phh = Math.round(h * dpr);

    let raf = 0;
    let visible = true;
    let on = activeRef.current ? 1 : 0;
    let last = performance.now();
    const start = last;

    let prog = null, vs = null, fs = null, buf = null;
    let uRes = null, uPx = null, uPh = null, uOn = null;

    function build() {
      prog = gl.createProgram();
      vs = compile(gl, gl.VERTEX_SHADER, VERT);
      fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!prog) return false;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uRes = gl.getUniformLocation(prog, 'uRes');
      uPx = gl.getUniformLocation(prog, 'uPx');
      uPh = gl.getUniformLocation(prog, 'uPh');
      uOn = gl.getUniformLocation(prog, 'uOn');
      gl.uniform3fv(gl.getUniformLocation(prog, 'uCol'), colorData);
      canvas.width = pw;
      canvas.height = phh;
      gl.viewport(0, 0, pw, phh);
      gl.clearColor(0, 0, 0, 0);
      return true;
    }

    function destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!gl.isContextLost()) {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      }
      prog = vs = fs = buf = null;
    }

    function begin() {
      if (build()) {
        setFallback(false);
        if (!raf) raf = requestAnimationFrame(frame);
      } else {
        destroy();
        setFallback(true);
      }
    }

    function resetText() {
      dotRefs.current.forEach((el) => {
        if (!el) return;
        el.style.opacity = '';
        el.style.transform = '';
      });
      if (labelRef.current) labelRef.current.style.backgroundPosition = '100% 0';
    }

    function onLost(e) {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      prog = vs = fs = buf = null;
      resetText();
      setFallback(true);
    }
    function onRestored() { begin(); }
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && prog) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);

    function frame(now) {
      raf = 0;
      if (!prog) return;
      const t = reduce ? 0 : ((now - start) / 1000) * Math.max(speed, 0);
      const ph = (TAU * (((t % LOOP) + LOOP) % LOOP)) / LOOP;
      const target = activeRef.current ? 1 : 0;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      on = reduce ? target : on + (target - on) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - on) < 0.002) on = target;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, pw, phh);
      gl.uniform1f(uPx, dpr);
      gl.uniform1f(uPh, ph);
      gl.uniform1f(uOn, on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const live = !reduce && activeRef.current;
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        const w = live ? 0.5 + 0.5 * Math.cos(ph * 8 + 0.95 - i * 0.95) : 1;
        el.style.opacity = String(0.4 + 0.6 * w);
        el.style.transform = live ? `translateY(${(-0.035 * w * w).toFixed(4)}em)` : '';
      });
      if (labelRef.current) {
        const g = live ? ((ph / TAU) * 2) % 1 : 0;
        labelRef.current.style.backgroundPosition = `${(100 - Math.min(g * 1.6, 1) * 100).toFixed(2)}% 0`;
      }
      if (textRef.current) textRef.current.style.opacity = String(0.6 + 0.4 * on);
      if (visible && (live || on !== target)) raf = requestAnimationFrame(frame);
    }
    kickRef.current = () => {
      if (!raf && prog) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    if (gl.isContextLost()) {
      setFallback(true);
      const ext = released.get(canvas);
      if (ext) {
        released.delete(canvas);
        ext.restoreContext();
      }
    } else {
      begin();
    }

    return () => {
      destroy();
      kickRef.current = () => {};
      io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      releaseRef.current = setTimeout(() => {
        if (canvas.isConnected || gl.isContextLost() || !lose) return;
        released.set(canvas, lose);
        canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), { once: true });
        lose.loseContext();
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, h, speed, colorKey]);

  React.useEffect(() => {
    if (!fallback) kickRef.current();
  }, [fallback]);

  const bandDim = React.useMemo(() => {
    if (!fallback) return 1;
    const c = resample(colors);
    let max = 0;
    for (let i = 0; i < c.length; i += 3) max = Math.max(max, 0.2126 * c[i] + 0.7152 * c[i + 1] + 0.0722 * c[i + 2]);
    return Math.min(1, 0.7 / Math.max(max, 0.01));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback, colorKey]);

  const radius = h / 2;
  const sweep = colors.length ? colors : BUKVOED_COLORS;
  return (
    <div role="status" aria-live="polite" className={className}
      style={{ width, height: h, position: 'relative', borderRadius: radius, flex: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 10px 30px -8px rgba(0,0,0,0.55)', ...style }} {...props}>
      {fallback && (
        <div className="thinking-pill-fallback" style={{ position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', backgroundImage: 'linear-gradient(180deg, #0d0521 0%, #0d0521 35%, #171029 67%, #211b30 100%)' }}>
          <div style={{
            position: 'absolute', top: '-20%', bottom: '-20%', left: '-100%', width: '300%',
            backgroundImage: `linear-gradient(90deg, ${sweep.join(', ')}, ${sweep[0]})`, backgroundSize: '33.3333% 100%',
            filter: `blur(${Math.round(h * 0.08)}px)${bandDim < 1 ? ` brightness(${bandDim.toFixed(3)})` : ''}`,
            animation: `thinking-pill-flow ${LOOP / Math.max(speed, 0.01)}s linear infinite`, opacity: active ? 1 : 0, transition: 'opacity 0.6s ease',
          }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(180deg, #0d0521 0%, #0d0521 30%, rgba(13,5,33,0.6) 42%, rgba(13,5,33,0) 52%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(180deg, rgba(150,150,150,0) 58%, rgba(156,156,160,0.85) 80%, rgba(205,205,205,0.95) 100%)', opacity: active ? 1 : 0, transition: 'opacity 0.6s ease' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: radius, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 ${-h * 0.06}px ${h * 0.1}px rgba(255,255,255,0.35)` }} />
          <style>{'@keyframes thinking-pill-flow{to{transform:translateX(33.3333%)}}@media (prefers-reduced-motion:reduce){.thinking-pill-fallback *{animation:none!important}}'}</style>
        </div>
      )}
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', visibility: fallback ? 'hidden' : undefined }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
        fontFamily: 'var(--sans)', fontSize: h * FONT, fontWeight: 500, letterSpacing: '0.008em', lineHeight: 1, color: '#fff',
        textShadow: fallback
          ? '0 0 0.18em rgba(255,255,255,0.22), 0 0 0.06em rgba(13,5,33,0.75), 0 0 0.16em rgba(13,5,33,0.6), 0 0.02em 0.45em rgba(13,5,33,0.45)'
          : '0 0 0.18em rgba(255,255,255,0.22)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        <span ref={textRef} style={{ display: 'flex', alignItems: 'baseline', ...(fallback ? { opacity: active ? 1 : 0.6, transition: 'opacity 0.6s ease' } : null) }}>
          <span style={{ position: 'relative' }}>
            {label}
            {shimmer && (
              <span ref={labelRef} aria-hidden="true" style={{
                position: 'absolute', left: 0, top: '-0.2em', padding: '0.2em 0', color: 'transparent',
                textShadow: fallback ? '0 0 0.18em rgba(255,255,255,0.22)' : undefined,
                backgroundImage: 'linear-gradient(100deg, transparent 0 41%, rgba(255,255,255,0.9) 50%, transparent 59% 100%)',
                backgroundSize: '300% 100%', backgroundPosition: '100% 0', WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: 'blur(0.06em)',
              }}>{label}</span>
            )}
          </span>
          {dots && (
            <span aria-hidden="true" style={{ display: 'flex' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} ref={(el) => { dotRefs.current[i] = el; }} style={{ display: 'inline-block', marginLeft: i ? '0.02em' : '0' }}>.</span>
              ))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// Пилюля под текст: ширина по длине надписи (многоточие в конце становится анимированными точками).
export function Thinking({ text = 'Думаю', h = 38, ...p }) {
  const label = String(text).replace(/[.…]+\s*$/, '');
  const fs = h * FONT;
  const width = Math.round(Math.max(h * 3, label.length * fs * 0.64 + fs * 1.4 + h * 1.1));
  return <ThinkingPill key={width} label={label} width={width} height={h} {...p} />;
}

// Пилюля на всю ширину блока (загрузка в поиске): только живой градиент и статус.
export function WideThinking({ text = 'Думаю', h = 54, ...p }) {
  const box = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const set = () => setW(Math.round(el.clientWidth / 8) * 8); // шагом 8 px — без перезапуска шейдера на каждый пиксель
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const label = String(text).replace(/[.…]+\s*$/, '');
  return <div ref={box} className="wide-think">{w > 0 && <ThinkingPill key={w + ':' + h} label={label} width={w} height={h} {...p} />}</div>;
}

export default ThinkingPill;

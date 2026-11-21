// Лендинг для гостей: первый экран, демо поиска и ИИ, тарифы, вопросы.
import Mascot from './Mascot.jsx';
import { MeshGradient } from '@paper-design/shaders-react';
import { PALETTE } from './mesh.js';
import { Thinking } from './ThinkingPill.jsx';
import GhostMini from './GhostMini.jsx';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent, useMotionValue, useSpring } from 'motion/react';
import { ArrowRight, BookOpen, CalendarClock, FileText, Layers, Radar, ScrollText, Sparkles, Webhook } from 'lucide-react';
import { CountUp, fadeUp } from './ui.jsx';
import { Pricing, PromoBanner, openAuth, useAccount } from './account.jsx';

const toApp = (s = '') => { location.hash = '#/app' + (s ? '?s=' + s : ''); };

const Reveal = ({ children, i = 0, ...p }) => (
  <motion.div variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} {...p}>{children}</motion.div>
);

// Первый экран: Буквоед на живом градиенте своей палитры. В стеклянной строке сами набираются запросы,
// Буквоед «думает» и показывает, как поиск их понял.
const DEMO = [
  ['cn 330 ur', 'Статья 330 ГК РФ · Неустойка', 'исправлена раскладка'],
  ['неустойкка по ДКП', 'неустойка по договору купли-продажи', 'опечатка и сокращение'],
  ['ИНН 7707083893', 'Профиль компании и все её дела', 'ИНН'],
  ['дело № А40-123/26', 'Арбитражное дело А40-123/2026', 'номер дела'],
  ['Мещанский суд 20 ноября', 'Заседания суда на 20 ноября', 'суд и дата'],
];

function useDemo() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState('type'); // type → think → done
  useEffect(() => {
    const q = DEMO[i][0];
    let t;
    if (phase === 'type') t = setTimeout(() => (n < q.length ? setN(n + 1) : setPhase('think')), n < q.length ? 70 : 300);
    else if (phase === 'think') t = setTimeout(() => setPhase('done'), 1300);
    else t = setTimeout(() => { setI((i + 1) % DEMO.length); setN(0); setPhase('type'); }, 2600);
    return () => clearTimeout(t);
  }, [i, n, phase]);
  return { q: DEMO[i][0].slice(0, n), phase, res: DEMO[i][1], why: DEMO[i][2] };
}

const Words = ({ text, delay = 0 }) => text.split(' ').map((w, i) => (
  <motion.span key={i} className="bh-w" initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ type: 'spring', stiffness: 120, damping: 18, delay: delay + i * 0.07 }}>{w}&nbsp;</motion.span>
));

const ORBIT = [['А', 0, 13], ['§', 72, 17], ['Б', 144, 15], ['?', 216, 19], ['ё', 288, 14]];

function Hero({ start, user }) {
  const d = useDemo();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const copyO = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const ghostY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 160]);
  const ghostS = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.18]);
  return (
    <section className="bh" aria-label="KadBest" ref={ref}>
      <div className="bh-bg" aria-hidden><MeshGradient colors={PALETTE} speed={0.3} style={{ width: '100%', height: '100%' }} /></div>
      <div className="bh-veil" aria-hidden />
      <div className="bh-in">
        <motion.div className="bh-copy" style={{ y: copyY, opacity: copyO }}>
          <span className="bh-k mono rise">Знакомьтесь — Буквоед</span>
          <h1 className="bh-h"><Words text="Судебная практика," /><span><Words text="собранная в один ответ" delay={0.25} /></span></h1>
          <p className="bh-lede rise">Дела, компании и законы в одной строке. Пишите как привыкли — с опечатками, сокращениями и в любой раскладке. Буквоед поймёт.</p>
          <PromoBanner style={{ margin: '0 0 18px', alignSelf: 'flex-start' }} />
          <div className="bh-demo rise" aria-hidden>
            <div className="bh-input"><SearchIco /><span className="mono">{d.q}</span><i className="bh-caret" /></div>
            <div className="bh-out">
              {d.phase === 'think' && <Thinking text="Буквоед думает" h={30} />}
              {d.phase === 'done' && (
                <motion.div className="bh-res" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <b>{d.res}</b><span>{d.why}</span>
                </motion.div>
              )}
            </div>
          </div>
          <div className="lp-cta rise" style={{ margin: '22px 0 0' }}>
            <button className="btn pri big xl" onClick={start}>{user ? 'Открыть KadBest' : 'Начать бесплатно'}<ArrowRight size={18} /></button>
            <button className="btn sec big xl bh-sec" onClick={() => { location.hash = '#/integrations'; }}>Подключить ассистента</button>
          </div>
        </motion.div>
        <motion.div className="bh-mascot" style={{ y: ghostY, scale: ghostS }}>
          <div className="bh-ms">
            <div className="bh-orbit" aria-hidden>
              {ORBIT.map(([t, a, dur]) => (
                <span key={t} className="bh-ob" style={{ '--a': a + 'deg', animationDuration: dur + 's' }}><i>{t}</i></span>
              ))}
            </div>
            <Mascot size={300} />
          </div>
        </motion.div>
      </div>
      <div className="bh-hem" aria-hidden />
    </section>
  );
}

const SearchIco = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

// «Как Буквоед читает запрос»: секция закрепляется, прокрутка ведёт запрос по шагам разбора.
const STORY = [
  ['Вы написали', 'Как привыкли: с опечаткой и сокращением.'],
  ['Опечатка', 'Словарь юридических терминов — исправлено мгновенно, без ИИ.'],
  ['Сокращение', 'ДКП, ДДУ, НДФЛ и ещё три десятка раскрываются сами.'],
  ['Основы и синонимы', 'Все падежи — одно слово, пеня и штраф — близкие к неустойке.'],
  ['Ранжирование', 'Редкие слова весят больше, кодекс выше письма — нужная статья первой.'],
];
const RANK = [['ст. 330 ГК · Неустойка', 0.94], ['ст. 333 ГК · Уменьшение неустойки', 0.78], ['ст. 454 ГК · Договор купли-продажи', 0.61], ['Письмо ФНС о пенях', 0.32]];

function StoryPanel({ step }) {
  const Q = (txt, mark) => (
    <div className="st-q mono">{txt.split(' ').map((w, i) => (
      <motion.span key={w + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={mark && mark.includes(w) ? 'mk' : ''}>{w} </motion.span>
    ))}</div>
  );
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} className="st-body" initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }} transition={{ duration: 0.35 }}>
        {step === 0 && Q('неустойкка по ДКП квартиры', ['неустойкка', 'ДКП'])}
        {step === 1 && Q('неустойка по ДКП квартиры', ['неустойка'])}
        {step === 2 && Q('неустойка по договору купли-продажи квартиры', ['договору', 'купли-продажи'])}
        {step === 3 && (
          <div className="st-chips">
            {['неустойк', 'договор', 'купл', 'продаж', 'квартир'].map((c, i) => <motion.span key={c} className="st-chip" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: i * 0.08 }}>{c}</motion.span>)}
            {['+ пен', '+ штраф'].map((c, i) => <motion.span key={c} className="st-chip syn" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.45 + i * 0.1 }}>{c}</motion.span>)}
          </div>
        )}
        {step === 4 && (
          <div className="st-rank">
            {RANK.map(([t, v], i) => (
              <div key={t} className="st-r"><span>{i + 1}. {t}</span><div className="st-t"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: v }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: i * 0.12 }} /></div></div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ReadingStory() {
  const ref = useRef(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setStep(Math.max(0, Math.min(STORY.length - 1, Math.floor(v * STORY.length * 0.999)))));
  return (
    <section className="story" ref={ref} style={{ height: `${STORY.length * 70 + 40}vh` }}>
      <div className="story-pin">
        <div className="page story-in">
          <div className="story-l">
            <div className="eyebrow">Как Буквоед читает запрос</div>
            <h2 className="lh2 big" style={{ margin: '10px 0 22px' }}>От опечатки до нужной статьи — за секунду</h2>
            <ol className="story-steps">
              {STORY.map(([t, d], i) => (
                <li key={t} className={i === step ? 'on' : i < step ? 'done' : ''}>
                  <span className="mono">{i + 1}</span><div><b>{t}</b><div className="c2">{d}</div></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="story-r">
            <div className="st-card">
              <div className="st-bar"><motion.i style={{ scaleX: scrollYProgress }} /></div>
              <div className="st-label eyebrow">{STORY[step][0]}</div>
              <StoryPanel step={step} />
              <div className="st-ghost"><GhostMini size={92} look={{ x: step % 2 ? 6 : -6, y: -4 }} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Карточка, которая наклоняется за курсором; подсветка рамки бежит за мышью.
function TiltCard({ children, onClick, i }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const reduce = useReducedMotion();
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty('--mx', x * 100 + '%');
    e.currentTarget.style.setProperty('--my', y * 100 + '%');
    if (!reduce) { rx.set((0.5 - y) * 10); ry.set((x - 0.5) * 12); }
  };
  const leave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div className="lp3-card tilt" onClick={onClick} onPointerMove={move} onPointerLeave={leave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 110, damping: 18, delay: (i % 4) * 0.06 }}>
      {children}
    </motion.div>
  );
}

// Финал: живой градиент, из «подола» выглядывают Буквоеды.
function FinalCTA({ start, user }) {
  return (
    <section className="page lp2-sec" style={{ paddingBottom: 100 }}>
      <motion.div className="fin" initial={{ opacity: 0, y: 30, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 90, damping: 18 }}>
        <div className="fin-bg" aria-hidden><MeshGradient colors={PALETTE} speed={0.4} style={{ width: '100%', height: '100%' }} /></div>
        <div className="fin-in">
          <h2 className="lh2 big" style={{ margin: 0, color: '#fff' }}>Вставьте ИНН следующего контрагента</h2>
          <p style={{ color: 'rgba(255,255,255,.85)', margin: '12px 0 0', fontSize: 17 }}>Буквоед уже читает законы. 10 поисков бесплатно, без карты.</p>
          <div className="lp-cta" style={{ margin: '24px 0 0' }}>
            <button className="btn pri big xl" onClick={start}>{user ? 'Открыть KadBest' : 'Начать бесплатно'}<ArrowRight size={18} /></button>
            <button className="btn sec big xl bh-sec" onClick={() => { location.hash = '#/integrations'; }}>Подключить ассистента</button>
          </div>
        </div>
        <div className="fin-crowd" aria-hidden>
          {[[8, 70, -8], [22, 96, 6], [70, 84, -4], [86, 64, 10]].map(([x, sz, r], k) => (
            <div key={k} className="fin-g" style={{ left: x + '%', animationDelay: 0.3 + k * 0.15 + 's' }}>
              <div className="fin-bob" style={{ animationDelay: k * 0.4 + 's', rotate: r + 'deg' }}><GhostMini size={sz} look={{ x: x < 50 ? 8 : -8, y: -6 }} /></div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

const TICKER = ['7707083893', 'А40-118204/2026', 'ст. 330 ГК', '127-ФЗ', '2а-2079/2026', 'банкротство физлиц', 'неустойка', 'ст. 61.2', 'субсидиарная ответственность', 'приказ ФНС', 'подсудность по адресу', 'ст. 15 ГК'];

const FEATS = [
  [Layers, 'Арбитраж', 'Стороны, хронология, акты целиком — без пятого «обновить капчу».', () => toApp('arbitr')],
  [CalendarClock, 'Общая юрисдикция', 'Заседания на завтра и подсудность по адресу, даже если сайт суда лежит.', () => toApp('courts')],
  [ScrollText, 'Законы', 'Статья, глава или весь кодекс. Сразу в действующей редакции.', () => toApp('law')],
  [Radar, 'Контрагент', 'Сколько судится, с кем и растёт ли нагрузка. До подписания, а не после.', () => toApp()],
  [BookOpen, 'Доктрина', 'Что пишут о вашем вопросе — рядом с нормой и практикой.', () => toApp()],
  [FileText, 'Что готовится', 'Проекты актов на обсуждении: узнайте об изменении раньше клиента.', () => toApp('law')],
  [Sparkles, 'Ваш ассистент', 'Claude, Cursor и другие отвечают по реальным делам, а не по памяти. Подключение в один клик.', () => { location.hash = '#/integrations'; }],
  [Webhook, 'API', 'Те же данные в CRM и юридической системе.', () => { location.hash = '#/integrations'; }],
];

const NUMS = [[2187, '', 'судов в справочнике'], [8, '', 'источников в одном ответе'], [1, ' запрос', 'вместо пяти сайтов']];

export default function Landing() {
  const { user } = useAccount();
  const start = () => (user ? toApp() : openAuth('auth', 'Вход и регистрация'));
  return (
    <>
      <Hero start={start} user={user} />

      <div className="ticker" aria-hidden>
        <div className="ticker-track">{[...TICKER, ...TICKER].map((t, k) => <span key={k}>{t}</span>)}</div>
      </div>

      <ReadingStory />

      <section className="page lp2-sec">
        <Reveal className="lp2-head"><div className="eyebrow">Новое · ИИ в поиске</div><h2 className="lh2 big">Спросите так, как говорите</h2><p className="c2" style={{ margin: '-14px 0 0', maxWidth: 640 }}>Пишите вопрос обычными словами, с опечатками и без терминов. Сервис поймёт, найдёт нормы и статьи и коротко объяснит, с чего начать.</p></Reveal>
        <Reveal className="ask-demo">
          <div className="ask-q"><span className="ask-chip">Вопрос</span>можно ли взыскать неустойку если договор уже расторгли</div>
          <div className="ask-row"><span className="eyebrow">Поняли запрос как</span><span className="pill">Можно ли взыскать неустойку, если договор расторгнут?</span><span className="pill">неустойка после расторжения договора</span></div>
          <div className="ai-card" style={{ margin: 0 }}>
            <div className="ai-h">Кратко</div>
            <p className="ai-t">Прямого ответа в названиях нет, поэтому начните с норм об ответственности за нарушение обязательств <span className="ai-ref">документ 1</span> и об исполнении обязательств <span className="ai-ref">документ 2</span>. О соотношении расторжения и неустойки есть <span className="ai-ref">статья 3</span>.</p>
            <div className="c3 ai-n">Справка ИИ по найденным нормам и делам — ссылки ведут на первоисточник.</div>
          </div>
        </Reveal>
        <div className="ask-points">
          {[['Понимает простой язык', 'Опечатки и разговорные слова не мешают: вопрос разбирается на смысл.'], ['Ищет по двум формулировкам', 'По вашей и по уточнённой — самое подходящее идёт выше.'], ['Отвечает яснее', 'Короткая справка со ссылками на найденное, без выдумок.']].map(([t, d], k) => (
            <Reveal key={t} i={k}><div className="lp-ft" style={{ marginTop: 0 }}>{t}</div><div className="c2" style={{ fontSize: 14.5 }}>{d}</div></Reveal>
          ))}
        </div>
      </section>

      <section className="page lp3-nums">
        {NUMS.map(([v, s, t], k) => (
          <Reveal key={t} i={k} className="lp3-num"><b><CountUp value={v} suffix={s} /></b><span>{t}</span></Reveal>
        ))}
      </section>

      <section className="page lp2-sec">
        <Reveal className="lp2-head"><div className="eyebrow">Что умеет</div><h2 className="lh2 big">Всё, за чем вы обычно ходите по пяти вкладкам</h2></Reveal>
        <div className="lp3-grid">
          {FEATS.map(([I, t, d, go], k) => (
            <TiltCard key={t} i={k} onClick={go}>
              <span className="lp3-ic"><I size={24} strokeWidth={1.5} /></span>
              <div className="lp3-ct">{t}</div>
              <div className="lp3-cd">{d}</div>
              <ArrowRight className="lp-go" size={18} />
            </TiltCard>
          ))}
        </div>
      </section>

      <section className="page lp2-sec" id="pricing">
        <Reveal className="lp2-head"><div className="eyebrow">Тарифы</div><h2 className="lh2 big">Платите за ответы, а не за доступ</h2><p className="c2" style={{ margin: '-14px 0 0', maxWidth: 620 }}>Один поиск — один запрос. Карточки дел и тексты статей бесплатны.</p></Reveal>
        <Pricing />
      </section>

      <FinalCTA start={start} user={user} />
    </>
  );
}

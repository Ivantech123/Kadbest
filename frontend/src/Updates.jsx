// Страницы «Что нового» и «Планы» (данные — changelog.js).
import { motion } from 'motion/react';
import { CHANGELOG, ROADMAP } from './changelog.js';
import { fadeUp, soft } from './ui.jsx';
import Mascot from './Mascot.jsx';

// #/changelog — история версий, #/roadmap — план развития.
const TYPE = { new: ['Новое', 'blue'], better: ['Улучшено', 'green'], fix: ['Исправлено', 'orange'] };
const fmt = (d) => (d.length > 7
  ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  : new Date(d + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }));

function Tabs({ cur }) {
  return (
    <div className="upd-tabs">
      <a href="#/changelog" className={cur === 'changelog' ? 'on' : ''}>История обновлений</a>
      <a href="#/roadmap" className={cur === 'roadmap' ? 'on' : ''}>План развития</a>
      <a href="#/status">Статус</a>
    </div>
  );
}

export function Changelog() {
  return (
    <div className="page" style={{ maxWidth: 840 }}>
      <motion.div className="ph" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={soft}><div>
        <div className="eyebrow">Версия {CHANGELOG[0].v}</div>
        <h1>Что нового</h1>
        <p className="c2">Выпускаем обновления часто. Здесь всё, что изменилось, — от новых версий к старым.</p>
      </div></motion.div>
      <Tabs cur="changelog" />
      <div className="tl">
        {CHANGELOG.map((r, i) => (
          <motion.section key={r.v} className="tl-item" variants={fadeUp} custom={i} initial="hidden" animate="show">
            <div className="tl-side">
              <span className="tl-v mono">{r.v}</span>
              <span className="c3" style={{ fontSize: 12.5 }}>{fmt(r.date)}</span>
              {i === 0 && <span className="pill green" style={{ marginTop: 6 }}>Текущая</span>}
            </div>
            <div className="tl-dot" />
            <div className="tl-body">
              {r.major && <div className="tl-major"><Mascot size={72} label="Буквоед — персонаж KadBest" /><div><span className="pill violet">Большое обновление</span><div className="c2" style={{ fontSize: 13.5, marginTop: 6 }}>Встречайте Буквоеда — он читает законы до последней буквы и знает все падежи. <a href="/blog/o-velikij-russkij/">Подробно о версии 2.0 →</a></div></div></div>}
              <h3>{r.title}</h3>
              <ul>
                {r.items.map(([t, text], k) => (
                  <li key={k}><span className={'pill ' + TYPE[t][1]}>{TYPE[t][0]}</span><span>{text}</span></li>
                ))}
              </ul>
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}

export function Roadmap() {
  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <motion.div className="ph" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={soft}><div>
        <div className="eyebrow">План развития</div>
        <h1>Что мы делаем дальше</h1>
        <p className="c2">Сроки ориентировочные: порядок меняется по отзывам пользователей. Не хватает функции — напишите нам в Telegram.</p>
      </div></motion.div>
      <Tabs cur="roadmap" />
      <div className="rm">
        {ROADMAP.map((col, i) => (
          <motion.div key={col.when} className="rm-col" variants={fadeUp} custom={i} initial="hidden" animate="show">
            <div className="rm-head"><span className={'pill ' + col.tone}>{col.when}</span><span className="c3 mono" style={{ fontSize: 12 }}>{col.items.length}</span></div>
            {col.items.map(([h, t]) => (
              <div key={h} className="card rm-card">
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{h}</div>
                <div className="c2" style={{ fontSize: 13.5, marginTop: 4 }}>{t}</div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
      <p className="c3" style={{ fontSize: 13, marginTop: 20 }}>Что уже вышло — в <a href="#/changelog">истории обновлений</a>.</p>
    </div>
  );
}

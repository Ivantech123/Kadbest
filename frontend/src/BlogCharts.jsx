// Графики и схемы внутри статей блога.
import { motion } from 'motion/react';
import { soft } from './ui.jsx';
import Mascot from './Mascot.jsx';
import { MeshGradient } from '@paper-design/shaders-react';
import { meshCSS, PALETTE, coverArt } from './mesh.js';

// Графики и схемы для статей блога. В тексте статьи: строка «::chart имя».
const inView = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: soft };

function Fig({ title, note, children }) {
  return (
    <motion.figure className="bc" {...inView}>
      {title && <figcaption className="bc-t">{title}</figcaption>}
      {children}
      {note && <div className="bc-n c3">{note}</div>}
    </motion.figure>
  );
}

const grow = (i, scale = true) => ({
  initial: scale ? { scaleX: 0 } : { opacity: 0 },
  whileInView: scale ? { scaleX: 1 } : { opacity: 1 },
  viewport: { once: true },
  transition: { ...soft, delay: 0.1 + i * 0.07 },
});

// Путь запроса: что происходит со строкой на каждом шаге.
function Pipeline() {
  const steps = [
    ['Вы написали', 'неустойкка по ДКП', ''],
    ['Опечатки', 'неустойка по ДКП', 'словарь юридических терминов'],
    ['Сокращения', 'неустойка по договор купли-продажи', 'ДКП, ДДУ, НДФЛ…'],
    ['Основы слов', 'неустойк · договор · купл · продаж', 'морфология'],
    ['Синонимы', '+ пен · штраф', 'с половинным весом'],
    ['Разделы', 'нормы · законы · статьи · акты · проекты', 'параллельно'],
    ['Ранжирование', 'BM25 + сила акта + свежесть', 'одна формула'],
    ['Ответ', 'разделы приходят по мере готовности', 'поток'],
  ];
  return (
    <Fig title="Путь одного запроса" note="Пример: что поиск делает со строкой «неустойкка по ДКП», прежде чем показать ответ.">
      <ol className="pipe">
        {steps.map(([h, v, s], i) => (
          <motion.li key={h} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...soft, delay: i * 0.08 }}>
            <span className="pipe-n mono">{i + 1}</span>
            <div><div className="pipe-h">{h}{s && <span className="c3"> · {s}</span>}</div><code>{v}</code></div>
          </motion.li>
        ))}
      </ol>
    </Fig>
  );
}

// Формы слова → одна основа.
function Stems() {
  const groups = [
    ['неустойк', ['неустойка', 'неустойки', 'неустойку', 'неустойкой']],
    ['договор', ['договор', 'договора', 'договорами', 'договору']],
    ['расторжен', ['расторжение', 'расторжения', 'расторжением']],
    ['работодател', ['работодатель', 'работодателя', 'работодателем']],
  ];
  return (
    <Fig title="Десяток форм — одно слово" note="Слева — как слово встречается в тексте закона и в вашем запросе, справа — основа, по которой их сравнивает поиск.">
      <div className="stems">
        {groups.map(([stem, forms], g) => (
          <motion.div key={stem} className="stem-row" {...grow(g, false)}>
            <div className="stem-forms">{forms.map((f) => <span key={f} className="pill">{f}</span>)}</div>
            <svg className="stem-arrow" viewBox="0 0 40 12" aria-hidden><path d="M0 6h34m-5-5 6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            <b className="stem-b mono">{stem}</b>
          </motion.div>
        ))}
      </div>
    </Fig>
  );
}

// Вес слова по редкости (IDF), пример.
function Idf() {
  const N = 20;
  const rows = [['договор', 18], ['неустойк', 6], ['подряд', 4]].map(([w, df]) => [w, df, Math.log(1 + (N - df + 0.5) / (df + 0.5))]);
  const max = Math.max(...rows.map((r) => r[2]));
  return (
    <Fig title="Редкие слова важнее частых" note="Пример: запрос «неустойка по договору подряда», найдено 20 документов. «Договор» есть почти в каждом и мало что различает; «подряд» — только в четырёх, поэтому весит в 12 раз больше.">
      <div className="hb2">
        {rows.map(([w, df, v], i) => (
          <div key={w} className="hb2-r">
            <span className="mono">{w}</span>
            <div className="hb2-t"><motion.i style={{ width: `${(v / max) * 100}%` }} {...grow(i)} /></div>
            <span className="c3 mono">в {df} из {N} · вес {v.toFixed(2).replace('.', ',')}</span>
          </div>
        ))}
      </div>
    </Fig>
  );
}

// Слагаемые формулы ранжирования.
function Weights() {
  const rows = [
    ['Точная фраза в названии', 6], ['Кодекс', 3], ['Федеральный закон, Пленум ВС', 2.5], ['Найдена конкретная статья', 2],
    ['Слово в названии (×1,6)', 1.6], ['Принят с 2020 года', 0.8], ['Слово в описании (×0,6)', 0.6], ['Синоним (×0,5)', 0.5],
    ['Письмо, разъяснение', -0.5], ['Закрытый текст', -1], ['Утратил силу', -9],
  ];
  const max = 9;
  return (
    <Fig title="Из чего складывается место в выдаче" note="Текстовая часть (название, описание, синонимы) считается по формуле BM25 и зависит от редкости слова; остальное — поправки за силу и актуальность документа.">
      <div className="wbars">
        {rows.map(([k, v], i) => (
          <div key={k} className="wb-r">
            <span className="wb-l">{k}</span>
            <div className="wb-t">
              <div className="wb-neg">{v < 0 && <motion.i className="neg" style={{ width: `${(-v / max) * 100}%` }} {...grow(i)} />}</div>
              <div className="wb-pos">{v > 0 && <motion.i style={{ width: `${(v / max) * 100}%` }} {...grow(i)} />}</div>
            </div>
            <span className={'mono wb-v' + (v < 0 ? ' neg' : '')}>{v > 0 ? '+' : ''}{String(v).replace('.', ',')}</span>
          </div>
        ))}
      </div>
    </Fig>
  );
}

// Поток: когда виден каждый раздел — раньше и теперь (медианы по журналу сервиса).
function Stream() {
  const blocks = [['Статьи и публикации', 2.6], ['Проекты актов', 3.5], ['Ключевые нормы', 4.0], ['Опубликованные акты', 4.8], ['Законодательство', 5.4]];
  const T = 6;
  return (
    <Fig title="Когда вы видите каждый раздел ответа" note="Медианы времени разделов по журналу сервиса за три дня, вопрос обычными словами. Раньше страница ждала самый медленный раздел; теперь каждый появляется, как только готов.">
      <div className="gantt">
        <div className="g-axis mono c3">{[0, 1, 2, 3, 4, 5, 6].map((s) => <span key={s} style={{ left: `${(s / T) * 100}%`, transform: s === T ? 'translateX(-100%)' : s === 0 ? 'none' : undefined }}>{s} с</span>)}</div>
        {blocks.map(([k, t], i) => (
          <div key={k} className="g-r">
            <span className="g-l">{k}</span>
            <div className="g-t">
              <motion.i className="was" style={{ width: `${(5.4 / T) * 100}%` }} {...grow(i)} />
              <motion.i className="now" style={{ width: `${(t / T) * 100}%` }} {...grow(i + 0.5)} />
            </div>
          </div>
        ))}
        <div className="g-leg c3"><span><i className="was" />раньше — всё сразу через 5,4 с</span><span><i className="now" />теперь — по готовности, первое через 2,6 с</span></div>
      </div>
    </Fig>
  );
}

// Качество: замер на эталонных запросах до и после.
function Quality({ m }) {
  if (!m?.before || !m?.after) return null;
  const rows = [['Верно понят запрос', 'intentAcc'], ['Нужное на 1-м месте', 'top1'], ['Нужное в первой тройке', 'top3'], ['Нужное в первой десятке', 'top10']];
  return (
    <Fig title={`Качество на ${m.n} эталонных запросах`} note="Один и тот же набор запросов с заранее известными правильными ответами прогнали через версию 1.9 и 2.0 на боевом сервисе.">
      <div className="qbars">
        {rows.map(([k, f], i) => (
          <div key={f} className="q-r">
            <span className="q-l">{k}</span>
            <div className="q-t">
              <div className="q-b"><motion.i className="was" style={{ width: `${m.before[f] * 100}%` }} {...grow(i)} /><span className="mono">{Math.round(m.before[f] * 100)}%</span></div>
              <div className="q-b"><motion.i className="now" style={{ width: `${m.after[f] * 100}%` }} {...grow(i + 0.4)} /><span className="mono"><b>{Math.round(m.after[f] * 100)}%</b></span></div>
            </div>
          </div>
        ))}
        <div className="g-leg c3"><span><i className="was" />версия 1.9</span><span><i className="now" />версия 2.0</span></div>
      </div>
    </Fig>
  );
}

// Знакомство с персонажем
function Hero() {
  return (
    <motion.figure className="bc bc-hero" {...inView}>
      <Mascot size={150} label="Буквоед — персонаж KadBest" />
      <div>
        <div className="bc-t" style={{ marginBottom: 6 }}>Знакомьтесь: Буквоед</div>
        <p className="c2" style={{ margin: 0 }}>Персонаж версии 2.0. Читает законы до последней буквы, знает все падежи и не обижается на опечатки. Встречает вас в поиске, пока собирается ответ. Поводите курсором — он следит за ним глазами.</p>
      </div>
    </motion.figure>
  );
}

export const CHARTS = { mascot: Hero, pipeline: Pipeline, stems: Stems, idf: Idf, weights: Weights, stream: Stream, quality: Quality };

// Обложка в стиле Буквоеда: его палитра пятнами, у большой обложки — живой градиент, как у самого персонажа;
// справа — его силуэт. slug задаёт раскладку пятен.
export function Cover({ c, big, slug }) {
  if (!c) return null;
  return (
    <div className={'cover' + (big ? ' big' : '')} style={{ background: meshCSS(slug || c.word) }}>
      {big && <div className="cover-live" aria-hidden><MeshGradient colors={PALETTE} speed={0.35} style={{ width: '100%', height: '100%' }} /></div>}
      <div className="cover-grain" aria-hidden />
      <div className="cover-art" aria-hidden dangerouslySetInnerHTML={{ __html: coverArt(slug || c.word) }} />
      <div className="cover-in">
        {c.kicker && <span className="cover-k mono">{c.kicker}</span>}
        <span className="cover-w">{c.word}</span>
        {c.sub && <span className="cover-s">{c.sub}</span>}
      </div>
    </div>
  );
}

// Гиперссылки на нормы в текстах дел: «ст. 197 АПК РФ», «статьи 330 ГК», «N 127-ФЗ»,
// «ст. 61.2 Закона о банкротстве». Клик открывает читалку сразу на статье.
const CODES = {
  'АПК': 'LAW_37800', 'ГПК': 'LAW_39570', 'КАС': 'LAW_176147', 'ТК': 'LAW_34683', 'УК': 'LAW_10699', 'УПК': 'LAW_34481',
  'КоАП': 'LAW_34661', 'ЖК': 'LAW_51057', 'ЗК': 'LAW_33773', 'СК': 'LAW_8982', 'БК': 'LAW_19702',
};
const code = (c, art) => {
  const n = parseFloat(art) || 0;
  if (c === 'ГК') return n >= 1225 ? 'LAW_64629' : n >= 1110 ? 'LAW_34154' : n >= 454 ? 'LAW_9027' : 'LAW_5142';
  if (c === 'НК') return n >= 143 ? 'LAW_28165' : 'LAW_19671';
  return CODES[c];
};
const ALIAS = { 'закона о банкротстве': '127', 'закона о несостоятельности': '127', 'закона о контрактной системе': '44', 'закона о закупках': '223', 'закона о защите прав потребителей': '2300-1' };

const CODE_RE = String.raw`(АПК|ГПК|КАС|КоАП|ГК|НК|ТК|УК|УПК|ЖК|ЗК|СК|БК)(?:\s?РФ)?`;
const ART = String.raw`(\d+(?:\.\d+)*)`;
const RE = new RegExp(
  [
    String.raw`(?:ст\.|стат(?:ья|ьи|ье|ей|ьям|ьями))\s*${ART}(?:[^\n.;]{0,40}?)\s${CODE_RE}`, // ст. 197 АПК РФ / статьи 330 ГК
    String.raw`${CODE_RE}\s(?:РФ\s)?(?:ст\.|статья|статьи)\s*${ART}`,                          // ГК РФ ст. 330
    String.raw`(?:ст\.|стат(?:ья|ьи|ье|ей))\s*${ART}\s(?:Федерального\s)?(закона о банкротстве|закона о несостоятельности|закона о контрактной системе|закона о закупках|закона о защите прав потребителей)`,
    String.raw`(?:N|№)\s?(\d{1,4}(?:-\d)?)-ФЗ`,                                                 // N 127-ФЗ
  ].join('|'),
  'giu',
);

// Разметка: массив строк и { text, ref } для ссылок.
export function parseRefs(text) {
  const out = [];
  let last = 0;
  for (const m of String(text || '').matchAll(RE)) {
    let ref = null;
    if (m[1] && m[2]) ref = { doc: code(m[2], m[1]), art: m[1] };
    else if (m[3] && m[4]) ref = { doc: code(m[3], m[4]), art: m[4] };
    else if (m[5] && m[6]) ref = { fz: ALIAS[m[6].toLowerCase()], art: m[5] };
    else if (m[7]) ref = { fz: m[7] };
    if (!ref || (!ref.doc && !ref.fz)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ text: m[0], ref });
    last = m.index + m[0].length;
  }
  if (last < String(text || '').length) out.push(String(text).slice(last));
  return out;
}

export const refHash = (ref) => '#/app?' + new URLSearchParams({ o: `lawref:${ref.doc || 'fz' + ref.fz}:${ref.art || ''}` });

export function LawText({ children, as: Tag = 'span', ...p }) {
  const parts = parseRefs(children);
  return (
    <Tag {...p}>
      {parts.map((x, i) => (typeof x === 'string' ? x : (
        <a key={i} className="lawref" href={refHash(x.ref)} title="Открыть норму">{x.text}</a>
      )))}
    </Tag>
  );
}

// Текст со ссылками из документа ([подпись](law:ID/part)) + распознанные нормы.
const MD = /\[([^\]]+)\]\(law:([A-Z]+_\d+)(?:\/([0-9a-f]{40}))?\)/g;
export const lawHash = (id, part) => '#/app?' + new URLSearchParams({ o: `law:${id}${part ? ':' + part : ''}` });
export function RichText({ children, as: Tag = 'span', ...p }) {
  const s = String(children || '');
  const out = [];
  let last = 0;
  for (const m of s.matchAll(MD)) {
    if (m.index > last) out.push(<LawText key={'t' + last}>{s.slice(last, m.index)}</LawText>);
    out.push(<a key={'l' + m.index} className="lawref" href={lawHash(m[2], m[3])} title={m[3] ? 'Открыть статью' : 'Открыть документ'}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(<LawText key={'t' + last}>{s.slice(last)}</LawText>);
  return <Tag {...p}>{out}</Tag>;
}
// md → плоский текст (для копирования)
export const plain = (s) => String(s || '').replace(MD, '$1');

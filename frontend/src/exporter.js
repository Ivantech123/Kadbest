// Экспорт документа в Word (.docx), PDF и TXT — целиком в браузере, без серверов и библиотек.
// sections: [{ h: 'заголовок раздела', paras: ['абзац', …] }]

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const safeName = (n) => String(n || 'документ').replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'документ';

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function toTxt(title, sections) {
  return [title, '', ...sections.flatMap((s) => [s.h, '', ...s.paras, ''])].join('\n');
}

export function saveTxt(title, sections) {
  download(new Blob(['﻿' + toTxt(title, sections)], { type: 'text/plain;charset=utf-8' }), safeName(title) + '.txt');
}

// ── .docx: минимальный пакет Office Open XML, упакованный в zip без сжатия ──
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let off = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [name, text] of files) {
    const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true);
    h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nb, db);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true);
    c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + db.length;
  }
  const cdSize = central.reduce((n, x) => n + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

const run = (t, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (t, { rpr = '', ppr = '' } = {}) => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${run(t, rpr)}</w:p>`;

export function saveDocx(title, sections) {
  const body = [
    para(title, { rpr: '<w:b/><w:sz w:val="36"/>', ppr: '<w:spacing w:after="240"/>' }),
    ...sections.flatMap((s) => [
      s.h ? para(s.h, { rpr: '<w:b/><w:sz w:val="28"/>', ppr: '<w:keepNext/><w:spacing w:before="280" w:after="120"/>' }) : '',
      ...s.paras.map((p) => para(p, { ppr: '<w:spacing w:after="100"/><w:jc w:val="both"/>' })),
    ]),
  ].join('');
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const blob = zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ]);
  download(blob, safeName(title) + '.docx');
}

// ── PDF: страница для печати, браузер сохраняет её как PDF («Сохранить как PDF»). Окно нужно открыть сразу по клику ──
export function openPrintWindow(title = '', fmt = 'pdf') {
  const w = window.open('about:blank', '_blank'); // обычная вкладка: без размеров окна в параметрах
  if (!w) return null;
  w.document.write(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Готовим документ…</title>
<style>
html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#151517;color:#ededed;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.box{width:min(540px,86vw)}.sp{width:34px;height:34px;border-radius:50%;border:3px solid #2a2a2d;border-top-color:#9bd12a;animation:r 0.8s linear infinite;margin-bottom:18px}@keyframes r{to{transform:rotate(360deg)}}h1{font-size:28px;font-weight:650;margin:0 0 8px;letter-spacing:-.03em}.t{color:#a1a1a1;margin:0 0 22px;font-size:14.5px;word-break:break-word}
.bar{height:12px;border-radius:99px;background:#2a2a2d;overflow:hidden}.bar i{display:block;height:100%;width:3%;border-radius:99px;background:linear-gradient(90deg,#0fa968,#9bd12a);transition:width .25s ease}
.row{display:flex;justify-content:space-between;margin-top:10px;font:13px ui-monospace,Consolas,monospace;color:#a1a1a1}.cur{margin-top:18px;min-height:20px;font-size:13.5px;color:#7d7d82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hint{margin-top:26px;font-size:13px;color:#6e6e73}
</style><body><div class="box"><div class="sp"></div><h1>Начали готовить документ</h1><p class="t" id="t">${esc(title)}</p>
<div class="bar"><i id="b"></i></div><div class="row"><span id="n">загрузка…</span><span id="p">0%</span></div><div class="cur" id="c"></div>
<div class="hint" id="h">${fmt === 'pdf' ? 'Когда всё будет готово, откроется окно печати — выберите «Сохранить как PDF». Закройте вкладку, чтобы отменить.' : 'Когда всё будет готово, файл скачается сам. Закройте вкладку, чтобы отменить.'}</div></div></body></html>`);
  w.document.close();
  return w;
}

// Обновляет полосу на странице «Готовим документ…»: done из total, подпись текущей части.
export function progressPrintWindow(w, done, total, label = '') {
  try {
    if (!w || w.closed) return false;
    const d = w.document, pct = total ? Math.round((done / total) * 100) : 0;
    d.getElementById('b').style.width = Math.max(3, pct) + '%';
    d.getElementById('p').textContent = pct + '%';
    d.getElementById('n').textContent = `загружено ${done} из ${total}`;
    d.getElementById('c').textContent = label;
    return true;
  } catch { return false; }
}

export function fillPrintWindow(w, title, sections) {
  if (!w) return false;
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${esc(safeName(title))}</title>
<style>@page{size:A4;margin:18mm 16mm}body{font:12pt/1.5 "Times New Roman",Georgia,serif;color:#111;margin:0}
h1{font-size:18pt;margin:0 0 14pt}h2{font-size:14pt;margin:18pt 0 6pt;break-after:avoid}p{margin:0 0 5pt;text-align:justify}
.hint{font:10pt system-ui,sans-serif;color:#777;margin-bottom:16pt}@media print{.hint{display:none}}</style>
<body><div class="hint">В окне печати выберите «Сохранить как PDF».</div><h1>${esc(title)}</h1>
${sections.map((s) => (s.h ? `<h2>${esc(s.h)}</h2>` : '') + s.paras.map((p) => `<p>${esc(p)}</p>`).join('')).join('')}
<script>addEventListener('load',()=>setTimeout(()=>print(),350))</script></body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}

// Файл (Word/TXT) скачан: сообщаем об этом на вкладке подготовки.
export function donePrintWindow(w, name) {
  try {
    if (!w || w.closed) return;
    const d = w.document;
    d.title = 'Готово — ' + name;
    d.querySelector('h1').textContent = 'Готово — файл скачан';
    d.querySelector('.sp').style.cssText = 'border-color:#0fa968;animation:none';
    d.getElementById('b').style.width = '100%';
    d.getElementById('p').textContent = '100%';
    d.getElementById('c').textContent = '';
    d.getElementById('h').innerHTML = 'Файл «' + name.replace(/[<>&]/g, '') + '» сохранён в папку загрузок. <a href="#" id="x" style="color:#9bd12a">Закрыть вкладку</a>';
    d.getElementById('x').onclick = (e) => { e.preventDefault(); w.close(); };
  } catch { /* вкладку закрыли */ }
}

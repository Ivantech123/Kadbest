// Выбор модели в ИИ-чате: список по провайдерам с коэффициентом лимита, знаки провайдеров, настройки размышления.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { api } from './api.js';
import { openPlans } from './account.jsx';
import { useModel } from './ModelPick.jsx';
import { BRAND_ICONS } from './brandIcons.js';
import { ThinkSettings } from './AIExtras.jsx';

// Выбор модели в ИИ-чате: список по провайдерам, у каждой — коэффициент расхода лимита «ИИ».
// Недоступные по тарифу видны с замком и ведут к выбору тарифа.

const MARK = {
  Anthropic: { bg: '#f4efe6', html: BRAND_ICONS.claude },
  OpenAI: { bg: '#0b0b0b', fg: '#fff', html: BRAND_ICONS.chatgpt },
  Google: { bg: '#fff', html: '<svg viewBox="0 0 24 24"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8cf7"/><stop offset=".55" stop-color="#9b72f2"/><stop offset="1" stop-color="#e9677a"/></linearGradient></defs><path fill="url(#gm)" d="M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10z"/></svg>' },
  xAI: { bg: '#000', fg: '#fff', html: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M6.469 8.776L16.512 23h-4.464L2.005 8.776H6.47zm-.004 7.9l2.233 3.164L6.467 23H2l4.465-6.324zM22 2.582V23h-3.659V7.764L22 2.582zM22 1l-9.952 14.095-2.233-3.163L17.533 1H22z"/></svg>' },
  DeepSeek: { bg: '#fff', fg: '#4D6BFE', html: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.850c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.960-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.520-2.160-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.500-1.860-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"/></svg>' },
  Moonshot: { bg: '#16191e', fg: '#fff', html: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3a8.5 8.5 0 1 0 6.4 14.1A7 7 0 0 1 14.5 3z"/></svg>' },
};

export function ProviderMark({ provider, size = 18 }) {
  const m = MARK[provider] || MARK.Anthropic;
  return <span className="pmark" style={{ width: size, height: size, background: m.bg, color: m.fg || '#1a1a2e' }} dangerouslySetInnerHTML={{ __html: m.html }} />;
}

let cache = null;
export const modelTitle = (id) => cache?.find((x) => x.id === id)?.title || { fast: 'Claude Haiku 5.5', smart: 'Claude Sonnet 5.5', max: 'Claude Opus 5.5' }[id] || id;
export const modelProvider = (id) => cache?.find((x) => x.id === id)?.provider || 'Anthropic';
const PLAN = { pro: 'Про', business: 'Бизнес' };

export default function ModelMenu({ up = true }) {
  const [m, setM] = useModel();
  const [list, setList] = useState(cache);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [more, setMore] = useState(false);
  const box = useRef(null);
  useEffect(() => { const on = (e) => { if (e.detail !== 'model') setOpen(false); }; window.addEventListener('kb:pop', on); return () => window.removeEventListener('kb:pop', on); }, []);
  useEffect(() => { if (open) window.dispatchEvent(new CustomEvent('kb:pop', { detail: 'model' })); }, [open]);
  useEffect(() => { if (!open) return undefined; const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); box.current?.querySelector('.mm-btn')?.focus(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [open]);
  useEffect(() => { if (!cache) api('/v1/models').then((r) => { cache = r.models; setList(r.models); }, () => {}); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  if (!list) return null;
  const cur = list.find((x) => x.id === m && x.available) || list.find((x) => x.id === 'fast') || list[0];
  const groups = [];
  const curMore = list.find((x) => x.id === m)?.more;
  list.filter((x) => !x.more || more || curMore).forEach((x) => { let g = groups.find((y) => y.p === x.provider); if (!g) groups.push((g = { p: x.provider, items: [] })); g.items.push(x); });
  const moreN = list.filter((x) => x.more).length;
  const flat = groups.flatMap((g) => g.items);
  const pick = (x) => { if (!x.available) { setOpen(false); openPlans(); return; } setM(x.id); setOpen(false); };
  const onKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setHi(flat.indexOf(cur)); } return; }
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(flat[hi]); }
  };
  return (
    <div className="mm" ref={box} onKeyDown={onKey}>
      <button type="button" className={'mm-btn' + (open ? ' on' : '')} onClick={() => { setOpen((o) => !o); setHi(flat.indexOf(cur)); }} aria-haspopup="listbox" aria-expanded={open} title={`${cur.title} · сообщение = ${cur.cost} ед. лимита ИИ`}>
        <ProviderMark provider={cur.provider} size={16} />
        <span className="mm-t">{cur.title}</span>
        <span className="mm-x mono">×{cur.cost}</span>
        <ChevronDown size={14} className="mm-ch" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className={'mm-pop' + (up ? ' up' : '')} role="listbox" aria-label="Модель"
            initial={{ opacity: 0, y: up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: up ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}>
            <div className="mm-scroll">
              {groups.map((g) => (
                <div key={g.p} className="mm-g">
                  <div className="mm-gh">{g.p}</div>
                  {g.items.map((x) => {
                    const i = flat.indexOf(x);
                    return (
                      <button key={x.id} type="button" role="option" aria-selected={x.id === cur.id} className={'mm-it' + (i === hi ? ' hi' : '') + (x.available ? '' : ' locked')}
                        onMouseEnter={() => setHi(i)} onClick={() => pick(x)}>
                        <ProviderMark provider={x.provider} size={20} />
                        <span className="mm-it-t"><b>{x.title}</b><small>{x.available ? x.desc : `Доступна на тарифе «${PLAN[x.plan] || x.plan}»`}</small></span>
                        {x.available ? <span className="mm-x mono">×{x.cost}</span> : <Lock size={13} className="c3" />}
                        <span className="mm-ok">{x.id === cur.id && <Check size={14} />}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {moreN > 0 && !curMore && <button type="button" className="mm-more" onClick={() => setMore((v) => !v)}>{more ? 'Скрыть другие модели' : `Другие модели · ${moreN}`}<ChevronDown size={14} style={{ transform: more ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /></button>}
            </div>
            <ThinkSettings />
            <div className="mm-foot">×N — сколько единиц лимита «ИИ» стоит одно сообщение</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

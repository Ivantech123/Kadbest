// Выбор модели на странице поиска (три ступени) и общий хук useModel.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Zap, Brain, Gem } from 'lucide-react';
import { api } from './api.js';
import { openPlans } from './account.jsx';

// Выбор модели ИИ: «Быстрая» — всем, «Умная» — с тарифа «Про», «Максимум» — на «Бизнесе».
// Выбор запоминается в браузере; недоступная по тарифу ведёт к выбору тарифа.
const ICON = { fast: Zap, smart: Brain, max: Gem };
const HINT = { fast: 'Отвечает за секунды', smart: 'Глубже разбирает вопрос', max: 'Самая сильная модель — для сложных споров' };
const KEY = 'kb.model';
let cache = null;

const read = () => { try { return localStorage.getItem(KEY) || 'fast'; } catch { return 'fast'; } };

export function useModel() {
  const [m, setM] = useState(read);
  useEffect(() => {
    const on = () => setM(read());
    window.addEventListener('kb:model', on);
    return () => window.removeEventListener('kb:model', on);
  }, []);
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch { /* приватный режим */ } window.dispatchEvent(new Event('kb:model')); };
  return [m, set];
}

// Во сколько единиц лимита «ИИ» обходится одно сообщение.
export const COST = { fast: 1, smart: 4, max: 12 };

export default function ModelPick({ compact, cost }) {
  const [m, setM] = useModel();
  const [list, setList] = useState(cache);
  useEffect(() => { if (!cache) api('/v1/models').then((r) => { cache = r.models; setList(r.models); }, () => {}); }, []);
  if (!list) return null;
  return (
    <div className={'mpick' + (compact ? ' compact' : '')} role="radiogroup" aria-label="Модель ИИ">
      {list.filter((x) => x.tier !== false).map((x) => {
        const I = ICON[x.id] || Zap;
        const on = m === x.id && x.available;
        return (
          <button key={x.id} type="button" role="radio" aria-checked={on} className={'mpick-b' + (on ? ' on' : '') + (x.available ? '' : ' locked')}
            title={x.available ? `${HINT[x.id]} · сообщение = ${COST[x.id]} ед. лимита ИИ` : `Доступно на тарифе «${x.plan === 'pro' ? 'Про' : 'Бизнес'}»`}
            onClick={() => (x.available ? setM(x.id) : openPlans())}>
            {on && <motion.span layoutId="mpick-on" className="mpick-thumb" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="mpick-in">{x.available ? <I size={13} /> : <Lock size={12} />}{x.name}{cost && <span className="mpick-x">×{x.cost ?? COST[x.id]}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}

// Корень сайта: шапка, маршруты по #/…, переключатель «Поиск / ИИ», подвал, модальные окна.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api.js';
import { soft } from './ui.jsx';
import Landing from './Landing.jsx';
import Service from './Service.jsx';
import Integrations from './Integrations.jsx';
import Admin from './Admin.jsx';
import { Privacy, Terms } from './Legal.jsx';
import Blog from './Blog.jsx';
import Status from './Status.jsx';
import { Changelog, Roadmap } from './Updates.jsx';
import PricingPage from './PricingPage.jsx';
import AIMode from './AIMode.jsx';
import { Search as SearchI, Sparkles as SparkI } from 'lucide-react';
import { CHANGELOG } from './changelog.js';
import { react } from './react.js';
import Keys from './Keys.jsx';
import Profile from './Profile.jsx';
import Cmdk from './Cmdk.jsx';
import { Logo } from './icons.jsx';
import { LoginPage, Modals, QuotaChip, openAuth, useAccount } from './account.jsx';

// статьи блога открываются и по настоящему адресу /blog/<статья>/ (для поисковиков), и по #/blog/<статья>
export const H = () => location.hash || (location.pathname.startsWith('/blog') ? '#' + location.pathname.replace(/\/$/, '') : '');
const route = () => (H().startsWith('#/login') ? 'login' : H().startsWith('#/app') ? 'app' : H().startsWith('#/ai') ? 'ai' : H().startsWith('#/integrations') ? 'integrations' : H().startsWith('#/pricing') ? 'pricing' : H().startsWith('#/admin') ? 'admin' : H().startsWith('#/privacy') ? 'privacy' : H().startsWith('#/terms') ? 'terms' : H().startsWith('#/blog') ? 'blog' : H().startsWith('#/status') ? 'status' : H().startsWith('#/changelog') ? 'changelog' : H().startsWith('#/roadmap') ? 'roadmap' : H().startsWith('#/account') ? 'account' : 'landing');


export default function App() {
  const [r, setR] = useState(route);
  const [hover, setHover] = useState(null);
  const [cmdk, setCmdk] = useState(false);
  const [health, setHealth] = useState(null);
  const [, setHash] = useState(location.hash);
  const { user, loading } = useAccount();
  useEffect(() => { if (!loading && user && r === 'landing') location.replace('#/app'); }, [loading, user, r]); // зарегистрированным лендинг не нужен
  const [sm, setSm] = useState(false);
  useEffect(() => {
    if (r !== 'landing') return;
    const el = document.documentElement, prev = el.getAttribute('data-theme');
    el.setAttribute('data-theme', 'dark'); document.body.classList.add('on-landing');
    return () => { document.body.classList.remove('on-landing'); if (prev) el.setAttribute('data-theme', prev); else el.removeAttribute('data-theme'); };
  }, [r]);
  const [hide, setHide] = useState(false); // в поиске шапка уезжает при прокрутке вниз и возвращается при прокрутке вверх
  useEffect(() => {
    let last = window.scrollY;
    const f = () => {
      const y = window.scrollY;
      setSm(y > 24);
      if (Math.abs(y - last) > 6) { setHide(y > last && y > 140); last = y; }
    };
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const hideTop = hide && r === 'app';
  // копирование где угодно — Буквоед кивает; пять кликов по логотипу — сальто
  useEffect(() => { const c = () => react('tilt'); document.addEventListener('copy', c); return () => document.removeEventListener('copy', c); }, []);
  const [taps, setTaps] = useState([]);
  const tapLogo = () => { const now = Date.now(); const t = [...taps.filter((x) => now - x < 2500), now]; setTaps(t.length >= 5 ? [] : t); if (t.length >= 5) react('spin'); };
  // заголовок вкладки по разделу; ушли из статьи блога (/blog/…) в другой раздел — адрес снова «/#/…»
  useEffect(() => {
    if (r !== 'blog' && location.pathname !== '/') history.replaceState(null, '', '/' + location.hash);
    if (r === 'blog' || r === 'ai') return; // статья, список блога и ИИ-чат ставят заголовок сами
    const T = { ai: 'ИИ-чат', app: 'Поиск', login: 'Вход', integrations: 'Интеграции', pricing: 'Тарифы', admin: 'Админка', privacy: 'Политика конфиденциальности', terms: 'Соглашение', status: 'Статус', changelog: 'Что нового', roadmap: 'План развития', account: 'Профиль' };
    document.title = T[r] ? `${T[r]} — KadBest` : 'KadBest — судебные дела, проверка контрагентов и законодательство';
  }, [r]);
  useEffect(() => { document.documentElement.style.setProperty('--top-h', hideTop ? '0px' : '72px'); }, [hideTop]);
  const locked = ['app', 'ai', 'integrations', 'account', 'admin', 'status'].includes(r);
  useEffect(() => { if (!loading && !user && locked) openAuth('auth', 'Доступ открыт после регистрации'); }, [loading, user, locked]);
  useEffect(() => {
    const h = () => { setHash(location.hash); const n = route(); setR((o) => { if (o !== n) window.scrollTo({ top: 0 }); return n; }); };
    window.addEventListener('hashchange', h); window.addEventListener('popstate', h);
    return () => { window.removeEventListener('hashchange', h); window.removeEventListener('popstate', h); };
  }, []);
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk((o) => !o); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { api('/v1/status').then((h) => setHealth((h.services || []).every((s) => !s.now || s.now.ok)), () => setHealth(false)); }, []); // готовый результат мониторинга, без живых проверок источников

  const links = !user ? [['#/pricing', 'Тарифы'], ['#/blog', 'Блог']] : r === 'app' || r === 'ai' ? [] : r === 'landing'
    ? [['#/app', 'Сервис'], ['#/pricing', 'Тарифы'], ['#/blog', 'Блог'], ['#/integrations', 'Интеграции']]
    : [['#/app', 'Поиск'], ['#/app?s=arbitr', 'Арбитраж'], ['#/app?s=courts', 'Суды'], ['#/app?s=law', 'Законы'], ['#/integrations', 'Интеграции']];
  const cur = (h) => (h === '#/integrations' ? r === 'integrations' : h === '#/pricing' ? r === 'pricing' : h === '#/blog' ? r === 'blog' : r === 'app' && (new URLSearchParams(location.hash.split('?')[1]).get('s') || '') === (new URLSearchParams(h.split('?')[1]).get('s') || ''));

  if (r === 'login') return <><LoginPage /><Modals /></>;

  return (
    <>
      {r !== 'ai' && (
      <header className={'top' + (sm ? ' sm' : '') + (r === 'app' ? ' solid' : '') + (hideTop ? ' hide' : '')}>
        <div className="top-in">
          <a className="logo" href={user ? '#/app' : '#/'} onClick={tapLogo} style={{ textDecoration: 'none' }}><Logo />KadBest</a>
          <span className="slash">/</span>
          <nav className="tabs" onMouseLeave={() => setHover(null)}>
            {links.map(([h, l]) => (
              <a key={h} href={h} className={'tab' + (cur(h) ? ' on' : '')} onMouseEnter={() => setHover(h)} style={{ textDecoration: 'none' }}>
                {hover === h && <motion.span layoutId="tab-hov" className="hov" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                {l}
                {cur(h) && <motion.span layoutId="tab-ul" className="ul" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              </a>
            ))}
          </nav>
          {user && (r === 'app' || r === 'ai') && (
            <div className="modesw" role="tablist" aria-label="Режим">
              {[['app', 'Поиск', SearchI], ['ai', 'ИИ', SparkI]].map(([k, l, I]) => (
                <a key={k} role="tab" aria-selected={r === k} href={'#/' + k} className={'modesw-b' + (r === k ? ' on' : '')}>
                  {r === k && <motion.span layoutId="modesw" className="modesw-th" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="modesw-in"><I size={14} />{l}</span>
                </a>
              ))}
            </div>
          )}
          {r === 'app' && location.hash.includes('?') && <a className="home-b" href="#/app" onClick={() => { window.dispatchEvent(new Event('kb:home')); }}>← Главная</a>}
          {user && !['landing', 'pricing', 'blog', 'privacy', 'terms', 'status', 'app', 'ai'].includes(r) && <button className="cmdk-btn" onClick={() => setCmdk(true)}><span>Перейти к…</span><span className="kbd">Ctrl K</span></button>}
          <QuotaChip />
        </div>
      </header>
      )}

      <AnimatePresence mode="wait">
        <motion.main key={r} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ ...soft, duration: 0.18 }}>
          {locked && !user ? <div className="page" /> : r === 'landing' ? <Landing /> : r === 'app' ? <Service /> : r === 'ai' ? <AIMode /> : r === 'pricing' ? <PricingPage /> : r === 'admin' ? <Admin /> : r === 'privacy' ? <Privacy /> : r === 'terms' ? <Terms /> : r === 'blog' ? <Blog key={location.hash} /> : r === 'status' ? <Status /> : r === 'changelog' ? <Changelog /> : r === 'roadmap' ? <Roadmap /> : r === 'account' ? <Profile /> : <Integrations />}
        </motion.main>
      </AnimatePresence>

      <footer className={'foot-bar' + (r === 'ai' ? ' hide' : '')}>
        <div className="foot-in">
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo /><span>© {new Date().getFullYear()} KadBest</span><a href="#/changelog" className="ver mono" title="Что нового">v{CHANGELOG[0].v}</a></span>
          <span className="foot-links"><a href="#/pricing">Тарифы</a><a href="/blog/">Блог</a><a href="#/changelog">Обновления</a><a href="#/roadmap">План развития</a><a href="#/terms">Соглашение</a><a href="#/privacy">Конфиденциальность</a></span>
          <a href="#/status" title="Статус служб" className={'status' + (health === false ? ' warn' : '')}><i />{health === false ? 'Часть разделов работает с задержкой' : 'Все системы работают'}</a>
        </div>
      </footer>
      <Cmdk open={cmdk && !!user} onClose={() => setCmdk(false)} />
      <Modals />
      <Keys />
    </>
  );
}

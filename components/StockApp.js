'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { USERS, apply, balances, seedState } from '@/lib/stock';
import StockView from './StockView';
import ReservationsView from './ReservationsView';
import RecordView from './RecordView';
import HistoryView from './HistoryView';
import GuidedDemo from './GuidedDemo';
import Intro from './Intro';
import { LogoMark } from './Logo';

const STORAGE_KEY = 'artic-stock-demo';
const VERSION = 1;

const TABS = [
  ['stock', 'Stock'],
  ['reservations', 'Reservations'],
  ['record', 'Receive & count'],
  ['history', 'History'],
  ['walkthrough', 'Walkthrough'],
];

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...action.state, notice: null };
    case 'reset':
      return { ...seedState(), notice: { kind: 'ok', text: 'Demo data reset to the sample stock.', id: Date.now() } };
    case 'dismiss':
      return { ...state, notice: null };
    default: {
      const r = apply(state, action);
      if (r.error) return { ...state, notice: { kind: 'error', text: r.error, id: Date.now() } };
      return { ...r.state, notice: { kind: action.type === 'race' ? 'info' : 'ok', text: r.message, id: Date.now() } };
    }
  }
}

// useLayoutEffect warns during server rendering; fall back to useEffect there.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function StockApp() {
  const [state, dispatch] = useReducer(reducer, null, seedState);
  const [mounted, setMounted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [user, setUser] = useState('office');
  const [tab, setTab] = useState('stock');
  const [prefill, setPrefill] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [scrolled, setScrolled] = useState(false);

  const headerRef = useRef(null);
  const tabsRef = useRef(null);
  const [glider, setGlider] = useState({ x: 0, w: 0, ready: false });

  // Restore saved demo data, user and theme from this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.version === VERSION && saved.state) dispatch({ type: 'load', state: saved.state });
      const u = localStorage.getItem(`${STORAGE_KEY}:user`);
      if (USERS.some((x) => x.id === u)) setUser(u);
    } catch {}
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const { notice, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state: rest }));
    } catch {}
  }, [state, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(`${STORAGE_KEY}:user`, user); } catch {}
  }, [user, mounted]);

  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(() => dispatch({ type: 'dismiss' }), state.notice.kind === 'info' ? 9000 : 5000);
    return () => clearTimeout(t);
  }, [state.notice]);

  // Solid header + scroll progress bar once the page moves.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        headerRef.current?.style.setProperty('--progress', max > 0 ? String(Math.min(1, y / max)) : '0');
        setScrolled(y > 8);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Sliding highlight behind the active tab.
  const measureTabs = useCallback(() => {
    const btn = tabsRef.current?.querySelector('button.active');
    if (btn) setGlider({ x: btn.offsetLeft, w: btn.offsetWidth, ready: true });
  }, []);
  useIsoLayoutEffect(() => { measureTabs(); }, [tab, mounted, state.reservations, measureTabs]);
  useEffect(() => {
    window.addEventListener('resize', measureTabs);
    document.fonts?.ready.then(measureTabs);
    return () => window.removeEventListener('resize', measureTabs);
  }, [measureTabs]);

  const rows = useMemo(() => balances(state), [state]);
  const act = (a) => dispatch({ ...a, user, at: new Date().toISOString() });
  const finishIntro = useCallback(() => setIntroDone(true), []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-anim');
    root.dataset.theme = next;
    setTimeout(() => root.classList.remove('theme-anim'), 500);
    try { localStorage.setItem('artic-theme', next); } catch {}
    setTheme(next);
  };

  const startReservation = (row) => {
    setPrefill({ productId: row.productId, locationId: row.locationId, n: Date.now() });
    setTab('reservations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCount = state.reservations.filter((r) => r.status === 'open').length;
  const current = USERS.find((u) => u.id === user);

  return (
    <>
      {!introDone && <Intro onDone={finishIntro} />}

      <header ref={headerRef} className={`top${scrolled ? ' scrolled' : ''}`}>
        <div className="top-inner">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab('stock'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="brand-mark"><LogoMark size={22} /></span>
            <span className="brand-text">
              <strong>W Bainbridge &amp; Sons</strong>
              <span>Stock management · demo by Artic Technologies</span>
            </span>
          </a>
          <div className="top-actions">
            <label className="user-pick" title="Signed in as">
              <span className="sr">Signed in as</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              <select value={user} onChange={(e) => setUser(e.target.value)}>
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {u.device}</option>
                ))}
              </select>
            </label>
            <button
              className="icon-btn theme-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <svg key={theme} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {theme === 'dark' ? (
                  <>
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </>
                ) : (
                  <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
                )}
              </svg>
            </button>
            <button
              className="icon-btn reset-btn"
              title="Reset demo data"
              aria-label="Reset demo data"
              onClick={() => { if (window.confirm('Reset all demo data back to the sample stock?')) dispatch({ type: 'reset' }); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="tabs-bar">
          <nav className="tabs" aria-label="Sections" ref={tabsRef}>
            <span
              className={`tab-glider${glider.ready ? ' ready' : ''}`}
              style={{ transform: `translateX(${glider.x}px)`, width: glider.w }}
              aria-hidden="true"
            />
            {TABS.map(([id, label]) => (
              <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                {label}
                {id === 'reservations' && openCount > 0 && <span className="pill">{openCount}</span>}
              </button>
            ))}
          </nav>
        </div>
        <span className="scroll-progress" aria-hidden="true" />
      </header>

      <main className="wrap">
        {mounted && (
          <div key={tab} className="view">
            <p className="demo-note">
              <span>
                Sample data for demonstration only. Changes are saved in this browser and recorded against <b>{current?.name}</b> — switch user above to see who did what in History.
              </span>
            </p>
            {tab === 'stock' && <StockView rows={rows} state={state} onReserve={startReservation} />}
            {tab === 'reservations' && (
              <ReservationsView state={state} rows={rows} act={act} prefill={prefill} />
            )}
            {tab === 'record' && <RecordView state={state} rows={rows} act={act} />}
            {tab === 'history' && <HistoryView state={state} />}
            {tab === 'walkthrough' && <GuidedDemo />}
          </div>
        )}
      </main>

      <footer className="foot wrap">
        <span>Artic Technologies · artictechsolutions.com</span>
        <span>Demo build · sample data</span>
      </footer>

      {state.notice && (
        <div key={state.notice.id} className={`toast toast-${state.notice.kind}`} role="status" aria-live="polite">
          <span>{state.notice.text}</span>
          <button aria-label="Dismiss" onClick={() => dispatch({ type: 'dismiss' })}>×</button>
        </div>
      )}
    </>
  );
}

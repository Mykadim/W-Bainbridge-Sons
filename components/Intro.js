'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from './Logo';

const BEAMS = [
  '#f6d272', '#e3a63c', '#5aa9ff', '#ffb547', '#2f7df6', '#f9e3a1',
  '#c98a2b', '#7cc4ff', '#ffcf6b', '#8b6cff', '#e8b04c', '#46d2ff',
];

// Cinematic logo reveal shown on page load: the mark draws itself, the
// wordmark resolves, light ribbons burst out and the camera dives in.
export default function Intro({ onDone }) {
  const [phase, setPhase] = useState('play');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const outAt = reduce ? 150 : 2400;
    const t1 = setTimeout(() => setPhase('out'), outAt);
    const t2 = setTimeout(onDone, outAt + (reduce ? 250 : 750));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const skip = () => { setPhase('out'); setTimeout(onDone, 400); };

  return (
    <div className={`intro intro-${phase}`} onClick={skip} role="presentation">
      <div className="intro-stage">
        <div className="intro-beams" aria-hidden="true">
          {BEAMS.map((c, i) => (
            <span key={i} style={{ '--c': c, '--i': i, '--x': `${(i - (BEAMS.length - 1) / 2) * 9}px` }} />
          ))}
        </div>
        <div className="intro-mark">
          <LogoMark size={64} draw />
        </div>
        <div className="intro-pre">W</div>
        <div className="intro-word" aria-label="W Bainbridge & Sons">
          {'BAINBRIDGE'.split('').map((ch, i) => (
            <span key={i} style={{ '--i': i }}>{ch}</span>
          ))}
        </div>
        <div className="intro-sub">&amp; Sons · Stock</div>
      </div>
      <span className="intro-credit">Demo by Artic Technologies</span>
      <span className="intro-skip">Click to skip</span>
    </div>
  );
}

// Placeholder client mark for W Bainbridge & Sons: a simple ear of wheat.
// Swap for the client's real logo once they supply it.
const GRAINS = [10, 14, 18];

export function LogoMark({ size = 24, className = '', draw = false }) {
  let n = 0;
  const p = (d, extra = {}) => {
    const i = n++;
    return (
      <path
        key={i}
        d={d}
        pathLength="1"
        className={draw ? 'draw-path' : undefined}
        style={draw ? { '--d': `${i * 0.09}s` } : undefined}
        stroke="#fff"
        strokeWidth="0.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="#fff"
        {...extra}
      />
    );
  };

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {p('M12 22.5V7', { fill: 'none', strokeWidth: 1.4 })}
      {p('M12 6.5c-1.1-1.1-1.1-3 0-4.5 1.1 1.5 1.1 3.4 0 4.5z')}
      {GRAINS.flatMap((y) => [
        p(`M12 ${y}c-2.6-.3-4.2-1.9-4.5-4.5 2.6.3 4.2 1.9 4.5 4.5z`),
        p(`M12 ${y}c2.6-.3 4.2-1.9 4.5-4.5-2.6.3-4.2 1.9-4.5 4.5z`),
      ])}
    </svg>
  );
}

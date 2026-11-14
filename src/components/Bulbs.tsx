// string of bare bulbs hanging under the tarp
const BULBS = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92];

export default function Bulbs() {
  // wire sags in the middle; each bulb sits on the curve
  const y = (x: number) => 6 + 22 * (1 - Math.pow((x - 0.5) / 0.5, 2));
  return (
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="pointer-events-none -mt-1 block h-11 w-full" aria-hidden="true">
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M0 6 Q50 50 100 6" fill="none" stroke="#5a514a" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {BULBS.map((x, i) => (
        <g key={x} className={i === 2 || i === 5 ? "animate-flicker" : undefined} style={{ animationDelay: `${i * 0.7}s` }}>
          <ellipse cx={x * 100} cy={y(x) + 6} rx="6" ry="9" fill="url(#glow)" />
          <ellipse cx={x * 100} cy={y(x) + 5} rx="1.1" ry="2.2" fill="#fff1c7" />
        </g>
      ))}
    </svg>
  );
}

// Small pieces every cooking screen shares (from the redesign's "요리 중" screen)

// 3-zone gauge: too little | just right | too much, with a pointer
export function Gauge({ labels, pos }: { labels: [string, string, string]; pos: number }) {
  const p = Math.max(0, Math.min(1, pos));
  return (
    <div className="px-1" aria-hidden="true">
      <div className="flex justify-between text-xs font-medium text-muted">
        <span>{labels[0]}</span>
        <span className="text-bulb-300">{labels[1]}</span>
        <span>{labels[2]}</span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-md">
        <div className="flex-[3] bg-[#c2404a]" />
        <div className="flex-[4] bg-[linear-gradient(90deg,#d9914c,#ffd27a,#d9914c)]" />
        <div className="flex-[3] bg-[#2a1810]" />
      </div>
      <div className="relative h-3">
        <span
          className="absolute top-0.5 size-0 -translate-x-1/2 border-x-[7px] border-b-[10px] border-x-transparent border-b-bulb-100 transition-[left] duration-100"
          style={{ left: `${p * 100}%` }}
        />
      </div>
    </div>
  );
}

// value -> pointer position, so [lo, hi] always lands in the middle 40% of the gauge
export function gaugePos(v: number, min: number, lo: number, hi: number, max: number) {
  if (v < lo) return 0.3 * Math.max(0, (v - min) / (lo - min));
  if (v <= hi) return 0.3 + 0.4 * ((v - lo) / (hi - lo));
  return 0.7 + 0.3 * Math.min(1, (v - hi) / (max - hi));
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
      {steps.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={`flex h-10 items-center justify-center rounded-xl text-[15px] ring-1 ring-inset ${
            i === current ? "bg-bulb-300/12 font-semibold text-bulb-300 ring-bulb-300/40" : i < current ? "bg-night-800 text-muted ring-night-line" : "bg-night-800 text-dim ring-night-line"
          }`}
        >
          <span className="mr-1.5 font-mono text-xs">{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-center text-sm text-muted">{children}</p>;
}

// buttons pinned to the bottom of the screen like the design's CTA bar
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,var(--color-night-900)_40px)] pt-10">
      <div className="pointer-events-auto mx-auto flex max-w-[440px] gap-2.5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

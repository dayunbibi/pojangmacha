// The finished dish (a snapshot of the cooking board) served on a steel plate under the bulb
export default function Plate({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto mt-2 size-[220px] max-w-full animate-pop">
      {/* steam */}
      <svg className="absolute -top-9 left-1/2 h-12 w-24 -translate-x-1/2 overflow-visible" viewBox="0 0 96 48" aria-hidden="true">
        {[24, 48, 72].map((x, i) => (
          <path
            key={x}
            d={`M${x} 46 C${x - 8} 34 ${x + 8} 24 ${x} 10`}
            fill="none"
            stroke="rgb(255 255 255 / 0.45)"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-steam"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </svg>
      {/* plate rim */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f4f5f6,#b8bec4_60%,#7c838b)] shadow-[0_18px_30px_-10px_rgb(0_0_0/0.7),0_0_60px_-10px_rgb(255_210_122/0.35)]" />
      {/* zoomed in a bit so the hint text at the board's edge doesn't show */}
      <div className="absolute inset-[18px] overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the canvas */}
        <img src={src} alt={alt} className="size-full scale-[1.22] object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-[18px] rounded-full shadow-[inset_0_4px_18px_rgb(0_0_0/0.55)]" />
    </div>
  );
}

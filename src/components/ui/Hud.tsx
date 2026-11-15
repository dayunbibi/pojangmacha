import { won } from "@/lib/menus";

// top bar during the night: which guest, five bulbs, money so far
export default function Hud({ guest, total, sales }: { guest: number; total: number; sales: number }) {
  return (
    <div className="relative z-5 flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold">
          손님 {guest} / {total}
        </span>
        <div className="flex gap-[5px]" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-[14px] w-[10px] rounded-[5px_5px_6px_6px] border ${
                i < guest ? "border-bulb-500 bg-bulb-300 shadow-[0_0_10px_rgb(255_210_122/0.7)]" : "border-night-line bg-night-700"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex h-8 items-center gap-1.5 rounded-full border border-night-line bg-night-800 px-3">
        <span className="text-xs font-medium text-muted">매출</span>
        <span className="font-mono text-sm font-bold text-bulb-300">{won(sales)}</span>
      </div>
    </div>
  );
}

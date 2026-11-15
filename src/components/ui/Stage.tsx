/* eslint-disable @next/next/no-img-element -- static svg art, no need for next/image */
import { guestArt, MOODS, type Customer } from "@/lib/customers";

// tent background + bulb string, shared by the main screen, stages and the receipt
export function TentBg({ height = 560, opacity = 1 }: { height?: number; opacity?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height }}>
      <img src="/art/bg/bg-tent-interior.svg" alt="" className="mx-auto block h-[560px] w-[440px] max-w-none" style={{ opacity }} />
    </div>
  );
}

export function BulbString({ top }: { top: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-2 animate-flicker" style={{ top }}>
      <img src="/art/bg/bg-bulb-string.svg" alt="" className="mx-auto block h-[120px] w-[440px] max-w-none" />
    </div>
  );
}

// warm glow at the top of every screen
export function Glow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-[120px] left-1/2 h-[420px] w-[560px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_30%,rgb(255_190_100/0.2),rgb(236_106_31/0.06)_45%,transparent_70%)]"
    />
  );
}

type StageProps = { customer: Customer; mood?: number; line: string; height: number };

// the guest at the counter with a speech bubble (order + served screens)
export default function Stage({ customer, mood = 1, line, height }: StageProps) {
  return (
    <div className="relative -mt-14 overflow-hidden" style={{ height }}>
      <TentBg height={height} opacity={0.62} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgb(18_21_29/0.65)_0%,transparent_28%,transparent_70%,var(--color-night-900)_100%)]"
      />
      <BulbString top={48} />
      <img
        key={`${customer.id}-${mood}`}
        src={guestArt(customer, MOODS[mood])}
        alt={customer.who}
        className="absolute bottom-[34px] left-1/2 z-2 h-[325px] w-[260px] max-w-none -translate-x-[150px] animate-popin"
      />
      {/* steel counter */}
      <div className="absolute inset-x-0 bottom-[18px] z-3 h-[26px] bg-[linear-gradient(180deg,#d8d2ca_0%,#8f8a85_22%,#3a3532_100%)] shadow-[inset_0_-1px_0_rgb(255_255_255/0.6),0_12px_24px_rgb(0_0_0/0.5)]" />
      <span className="absolute top-[116px] left-4 z-4 rounded-lg bg-night-950/70 px-2.5 py-1.5 text-[13px] leading-none font-semibold ring-1 ring-night-line ring-inset">
        {customer.who}
      </span>
      <p key={line} className="bubble absolute top-[104px] right-4 z-4 m-0 max-w-[196px] animate-popin [animation-delay:0.25s]">
        {line}
      </p>
    </div>
  );
}

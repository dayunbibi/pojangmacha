import type { Customer } from "@/lib/customers";

type Props = { customer: Customer; mood?: number }; // mood: tier 0 (best) .. 3 (worst)

// A customer on a red plastic stool, drawn with plain CSS shapes
export default function Guest({ customer, mood }: Props) {
  const face = mood === undefined ? "•‿•" : ["^▽^", "•‿•", "•_•", "ಠ_ಠ"][mood];
  return (
    <div className="flex items-end gap-4">
      <div className="relative h-[104px] w-[84px] flex-none" aria-hidden="true">
        {/* head */}
        <div
          className="absolute top-0 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full font-sans text-[11px] font-bold text-white"
          style={{ background: customer.color }}
        >
          {face}
        </div>
        {/* body */}
        <div className="absolute top-10 left-1/2 h-10 w-16 -translate-x-1/2 rounded-t-[22px]" style={{ background: customer.color, filter: "brightness(0.8)" }} />
        {/* stool */}
        <div className="absolute bottom-0 left-1/2 h-[26px] w-[58px] -translate-x-1/2">
          <div className="h-2 rounded-full bg-stool" />
          <div className="absolute top-1.5 left-1 h-5 w-2 -skew-x-12 bg-stool" />
          <div className="absolute top-1.5 right-1 h-5 w-2 skew-x-12 bg-stool" />
        </div>
      </div>
      <p className="m-0 pb-1 font-sign text-xl">{customer.who}</p>
    </div>
  );
}

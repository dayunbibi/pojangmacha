/* eslint-disable @next/next/no-img-element -- static svg art */
import { MENUS, type MenuKey } from "@/lib/menus";
import { artUrl } from "@/lib/sprites";

// little dish picture used on the menu board and the order ticket
export default function Thumb({ menu, size = 48, paper = false }: { menu: MenuKey; size?: number; paper?: boolean }) {
  const [art, w] = MENUS[menu].thumb;
  return (
    <div
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-[14px] ${paper ? "bg-[#ebdfc6]" : "bg-[radial-gradient(circle_at_50%_35%,#3a3022,#252a38)]"}`}
      style={{ width: size, height: size }}
    >
      <img src={artUrl(art)} alt="" className="block h-auto" style={{ width: (w * size) / 48 }} />
    </div>
  );
}

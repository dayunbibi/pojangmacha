// Checks what the browser sent and works out the total on the server,
// so nobody can just post "total: 999999".
import { MENU_KEYS, type MenuKey } from "../menus";
import { payFor } from "../customers";

export type DishIn = { menu: MenuKey; score: number };

export function parseDishes(input: unknown): DishIn[] | null {
  if (!Array.isArray(input) || input.length !== MENU_KEYS.length) return null;
  const seen = new Set<string>();
  const out: DishIn[] = [];
  for (const d of input) {
    const menu = (d as { menu?: unknown })?.menu;
    const score = (d as { score?: unknown })?.score;
    if (typeof menu !== "string" || !MENU_KEYS.includes(menu as MenuKey) || seen.has(menu)) return null;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100) return null;
    seen.add(menu);
    out.push({ menu: menu as MenuKey, score });
  }
  return out; // every menu exactly once, like a real night
}

export function totalFor(dishes: DishIn[]) {
  return dishes.reduce((sum, d) => {
    const { paid, tip } = payFor(d.menu, d.score);
    return sum + paid + tip;
  }, 0);
}

// Korean, letters, numbers and a few symbols. 1-12 characters.
export function cleanName(input: unknown) {
  if (typeof input !== "string") return null;
  const name = input.normalize("NFC").trim().replace(/\s+/g, " ");
  const len = [...name].length;
  if (len < 1 || len > 12) return null;
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _.\-!?~♡]+$/.test(name)) return null;
  return name;
}

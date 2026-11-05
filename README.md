# 향수병 포차 (Homesick Pocha)

A small Korean street-tent cooking game. Five customers come in, each orders one dish,
you cook it with your finger, and at the end of the night you get a receipt card to share.

Part of [향수병 게임즈](https://homesick-games.vercel.app), web games I make in Toronto when I miss Korea.

## The menu

| Dish | What you do | What's judged |
|---|---|---|
| 염통꼬치 (grilled chicken hearts) | Rub to brush on sauce, flip, serve | Sauce coverage on both sides, how cooked each side is |
| 김밥 (gimbap) | Pick fillings (rice first, no strawberries), push up to roll, tap to cut | Right fillings, rolling slowly enough not to burst, even slices |
| 떡볶이 (tteokbokki) | Stir in circles, turn off the fire at the right time | Sauce thickness, burnt bottom from not stirring |
| 어묵꼬치 (fish cake skewer) | Tap when each fold mark reaches the skewer | Timing of each fold |
| 계란빵 (egg bread) | Hold to pour batter, tap to drop the egg, take it out | Batter level, egg centered, how golden it is |

Each dish is scored out of 100. The score decides what the customer says and pays:
a tip for great food, a discount for so-so food, and "it's on the house" if it's bad.

## How it's built

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4, no backend
- Every cooking game is its own component drawing on a 360×360 `<canvas>` with pointer events,
  so mouse and touch work the same way. A shared `useLoop` hook runs `requestAnimationFrame`
  and reads the latest callback from a ref, so the loop doesn't restart on re-renders.
- Game state that changes every frame lives in a `useRef`; React state only holds what the buttons show.
- The game flow (order → cook → serve → next customer → receipt) is a small state machine in `Pocha.tsx`.
  Adding a dish = one component + one entry in `src/lib/menus.ts`.
- The 1080×1920 receipt card is drawn with Canvas 2D. Google Fonts only downloads the Korean
  glyph chunks a page shows, so canvas-only text is loaded with `document.fonts.load()` first.
- Best night's total is kept in `localStorage` (wrapped in try/catch for private mode).
- Keyboard: the tap-timing games also work with Space/Enter. `prefers-reduced-motion` is respected.

## Running locally

```bash
npm install
npm run dev
```

## Testing

I played full nights with a Playwright script at phone width (400px): one "careful" run and one
"sloppy" run, to check the scores spread out (careful ≈ 100, sloppy ≈ 20–45) and that nothing
overflows or throws.

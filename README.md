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

## Daily sales ranking (Supabase)

After closing the night you can put your total on today's board (Toronto day, top 10).

- Same Supabase project as [AI 엄마 잔소리](https://github.com/dayunbibi/mom-nag), its own table `pocha_scores`.
  Schema and the two SQL functions are in `supabase/schema.sql`.
- The browser never talks to Supabase. Next.js route handlers call the SQL functions with the secret key,
  and RLS with no policies blocks the public keys.
- **The server decides the total.** The page only sends the 5 dish scores; the API checks each menu
  appears exactly once and every score is 0-100, then works out what the customers paid with the same
  `payFor` function the game uses. The table also rejects totals above the real maximum (22,500원).
- **Play token.** `POST /api/play` hands out an HMAC-signed token when the night starts. A score is only
  accepted with a valid token that is at least 40 seconds old (five dishes can't be cooked faster by hand),
  and each token works once (unique nonce in the table). It doesn't make cheating impossible, since the game runs
  in the browser, but it stops posting scores without playing, replaying a request, or a bot finishing in 3 seconds.
- 5 entries per person per 10 minutes, checked inside one SQL function with an advisory lock.
  IPs are stored only as an HMAC, and rows older than 30 days are cleaned up.
- Nicknames: 1-12 characters, Korean / letters / numbers / a few symbols.

Env vars (Vercel → Settings → Environment Variables), same values as mom-nag:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Without them the game works the same, the ranking just doesn't show up.

## Running locally

```bash
npm install
npm run dev
```

## Testing

- SQL: the schema runs in PGlite (Postgres in Node) and 10 tests check ranks, duplicate tokens,
  the per-person limit, the max total, and that yesterday doesn't count.
- API: fresh token → "too fast", tampered token → rejected, bad nickname, a menu twice → rejected.

I played full nights with a Playwright script at phone width (400px): one "careful" run and one
"sloppy" run, to check the scores spread out (careful ≈ 100, sloppy ≈ 20–45) and that nothing
overflows or throws.

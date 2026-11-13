// A play token is handed out when the night starts and has to come back with the score.
// It can't stop someone who really wants to cheat (the game runs in their browser),
// but it blocks the easy stuff: posting a score without playing, posting it twice,
// or a script finishing a night in 3 seconds.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { sign } from "./db";

export const MIN_PLAY_MS = 40_000; // 5 dishes can't be done faster than this by hand
export const MAX_PLAY_MS = 2 * 60 * 60 * 1000;

export function makeToken(now = Date.now()) {
  const nonce = randomBytes(12).toString("base64url");
  const body = `${now}.${nonce}`;
  return `${body}.${sign(body)}`;
}

export type TokenCheck = { ok: true; nonce: string } | { ok: false; reason: "bad" | "fast" | "old" };

export function checkToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== "string") return { ok: false, reason: "bad" };
  const [issued, nonce, sig] = token.split(".");
  if (!issued || !nonce || !sig) return { ok: false, reason: "bad" };
  const expected = Buffer.from(sign(`${issued}.${nonce}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "bad" };
  const age = now - Number(issued);
  if (!(age >= MIN_PLAY_MS)) return { ok: false, reason: "fast" };
  if (age > MAX_PLAY_MS) return { ok: false, reason: "old" };
  return { ok: true, nonce };
}

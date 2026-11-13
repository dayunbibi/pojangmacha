// Talks to Supabase through its REST API (PostgREST) with plain fetch.
// The SQL functions it calls live in supabase/schema.sql.
import { createHmac } from "node:crypto";

const URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY?.trim(); // sb_secret_..., server only

// Only turn the DB on when both values look right. (In the mom-nag project the key once
// got pasted into the URL field and showed up in error logs, so check before using.)
// (plain http is allowed for localhost while developing, for a local test database)
const looksLikeUrl = /^https:\/\/[^\s/]+$/.test(URL ?? "") || (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(URL ?? ""));
const urlOk = !!URL && looksLikeUrl && (!KEY || !URL.includes(KEY));
const configured = urlOk && !!KEY;

if ((URL || KEY) && !configured) {
  console.warn("Supabase is off: SUPABASE_URL must look like https://xxxx.supabase.co and SUPABASE_SECRET_KEY must be set");
}

export function dbEnabled() {
  return configured;
}

// Raw IPs are never stored. Same person -> same hash, but it can't be reversed.
export function hashIp(ip: string) {
  return createHmac("sha256", KEY ?? "").update(`pocha:${ip}`).digest("hex");
}

// signs play tokens, see token.ts
export function sign(data: string) {
  return createHmac("sha256", KEY ?? "").update(`pocha-token:${data}`).digest("base64url");
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY!, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (err) {
    // fetch errors can include the full URL, so only keep the error type
    throw new Error(`Supabase ${fn} request failed (${err instanceof Error ? err.name : "unknown"})`);
  }
  if (!res.ok) throw new Error(`Supabase ${fn} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type SubmitResult = { ok: true; rank: number } | { ok: false; reason: "ip" | "used" };

export function submitScore(args: { ipHash: string; nonce: string; name: string; total: number; dishes: unknown }) {
  return rpc<SubmitResult>("submit_pocha", {
    p_ip_hash: args.ipHash,
    p_nonce: args.nonce,
    p_name: args.name,
    p_total: args.total,
    p_dishes: args.dishes,
  });
}

export type Top = { count: number; top: { name: string; total: number }[] };

export function todayTop(limit = 10) {
  return rpc<Top>("pocha_top", { p_limit: limit });
}

import { dbEnabled } from "@/lib/server/db";
import { makeToken } from "@/lib/server/token";

// Called when the night starts. The token comes back with the score at the end.
export async function POST() {
  if (!dbEnabled()) return Response.json({ token: null });
  return Response.json({ token: makeToken() }, { headers: { "cache-control": "no-store" } });
}

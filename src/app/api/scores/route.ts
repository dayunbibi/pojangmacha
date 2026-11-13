import { dbEnabled, hashIp, submitScore, todayTop } from "@/lib/server/db";
import { checkToken } from "@/lib/server/token";
import { cleanName, parseDishes, totalFor } from "@/lib/server/score";

// today's ranking board
export async function GET() {
  if (!dbEnabled()) return Response.json({ enabled: false, count: 0, top: [] });
  try {
    const top = await todayTop(10);
    return Response.json(
      { enabled: true, ...top },
      { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=30" } },
    );
  } catch (err) {
    console.error("pocha_top failed", err);
    return Response.json({ enabled: false, count: 0, top: [] }, { status: 503 });
  }
}

const fail = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (!dbEnabled()) return fail("지금은 랭킹을 쉬고 있어요.", 503);

  let body: { token?: unknown; name?: unknown; dishes?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 이상해요.");
  }

  const name = cleanName(body.name);
  if (!name) return fail("닉네임은 한글·영어·숫자로 12자까지 쓸 수 있어요.");

  const dishes = parseDishes(body.dishes);
  if (!dishes) return fail("영수증이 이상해요. 다시 장사해 주세요.");

  const token = checkToken(body.token);
  if (!token.ok) {
    if (token.reason === "fast") return fail("너무 빨리 끝났어요. 진짜로 장사한 거 맞죠?");
    if (token.reason === "old") return fail("영수증이 너무 오래됐어요. 오늘 장사를 다시 해주세요.");
    return fail("영수증이 이상해요. 다시 장사해 주세요.");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  try {
    const r = await submitScore({ ipHash: hashIp(ip), nonce: token.nonce, name, total: totalFor(dishes), dishes });
    if (!r.ok) {
      if (r.reason === "used") return fail("이 영수증은 이미 올렸어요.", 409);
      return fail("잠깐 쉬었다가 올려주세요. 10분에 5번까지예요.", 429);
    }
    return Response.json({ ok: true, rank: r.rank, total: totalFor(dishes) });
  } catch (err) {
    console.error("submit_pocha failed", err);
    return fail("랭킹 서버가 잠깐 바빠요. 조금 있다 다시 해주세요.", 503);
  }
}

"use client";

import { useEffect, useState } from "react";
import { won } from "@/lib/menus";

export type Board = { enabled: boolean; count: number; top: { name: string; total: number }[] };

export async function fetchBoard(): Promise<Board | null> {
  try {
    const res = await fetch("/api/scores", { cache: "no-store" });
    return (await res.json()) as Board;
  } catch {
    return null;
  }
}

// loads the board once; `reload` is bumped after submitting a score
export function useBoard(reload = 0) {
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    let alive = true;
    fetchBoard().then((b) => alive && setBoard(b));
    return () => {
      alive = false;
    };
  }, [reload]);
  return board;
}

type Props = { board: Board | null; highlight?: number }; // highlight = my rank (1-based)

export default function Ranking({ board, highlight }: Props) {
  if (!board?.enabled) return null;

  const circle = ["bg-[#ffd27a] text-[#1a1208]", "bg-[#d9d4cc] text-[#1a1208]", "bg-[#d89660] text-[#1a1208]"];

  return (
    <section aria-labelledby="rank-title" className="card p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h2 id="rank-title" className="m-0 font-display text-[19px] leading-none font-bold">
          오늘의 매출 랭킹
        </h2>
        <span className="text-[11px] leading-none font-medium text-dim">오늘 {board.count.toLocaleString("ko-KR")}번 장사 · 토론토 기준</span>
      </div>
      {board.top.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-muted">아직 아무도 없어요. 첫 번째 사장님이 되어보세요!</p>
      ) : (
        <ol className="m-0 mt-2.5 list-none p-0">
          {board.top.map((row, i) => (
            <li key={i} className={`-mx-2 flex h-12 items-center gap-3 rounded-xl px-2 ${i + 1 === highlight ? "bg-bulb-300/12 ring-1 ring-bulb-300/40 ring-inset" : ""}`}>
              <span className={`size-7 flex-none rounded-full text-center font-mono text-[13px] leading-7 font-bold ${circle[i] ?? "bg-night-700 text-muted"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{row.name}</span>
              <span className={`font-mono text-[15px] font-bold tabular-nums ${i === 0 ? "text-bulb-300" : ""}`}>{won(row.total)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

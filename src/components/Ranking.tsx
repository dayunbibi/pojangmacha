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

  return (
    <section aria-labelledby="rank-title" className="rounded-lg bg-night-soft p-4">
      <div className="flex items-baseline justify-between">
        <h2 id="rank-title" className="m-0 font-sign text-xl font-normal text-bulb">
          오늘의 매출 랭킹
        </h2>
        <span className="text-xs text-ink-dim">오늘 {board.count.toLocaleString("ko-KR")}번 장사함 · 토론토 기준</span>
      </div>
      {board.top.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-ink-dim">아직 아무도 없어요. 첫 번째 사장님이 되어보세요!</p>
      ) : (
        <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
          {board.top.map((row, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-[15px] ${i + 1 === highlight ? "bg-tarp/25 font-bold" : ""}`}
            >
              <span className={`w-6 text-center font-sign text-lg ${i < 3 ? "text-bulb" : "text-ink-dim"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <span className="font-receipt tabular-nums">{won(row.total)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

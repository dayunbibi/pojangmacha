"use client";

import { useEffect, useRef, useState } from "react";
import { MENUS, won } from "@/lib/menus";
import { makeReceiptImage, receiptDate, stampOf, totalOf, verdict } from "@/lib/receiptImage";
import { BulbString, Glow } from "./ui/Stage";
import { BottomBar } from "./games/Kit";
import type { Served } from "./Pocha";
import Ranking, { useBoard } from "./Ranking";

type Props = { served: Served[]; best: number; token: string | null; onHome: () => void };

const NAME_KEY = "pocha-name";

export default function Receipt({ served, best, token, onHome }: Props) {
  const total = totalOf(served);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [making, setMaking] = useState(false);
  const [toast, setToast] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ranking
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [rankError, setRankError] = useState("");
  const [reload, setReload] = useState(0);
  const board = useBoard(reload);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // private mode
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setRankError("");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, dishes: served.map((s) => ({ menu: s.menu, score: s.score })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "랭킹에 못 올렸어요.");
      setRank(data.rank);
      setReload((n) => n + 1);
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        // fine
      }
    } catch (err) {
      setRankError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "인터넷 연결을 확인해 주세요.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (card) URL.revokeObjectURL(card.url);
    };
  }, [card]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  async function makeCard() {
    setMaking(true);
    try {
      const blob = await makeReceiptImage(served, location.host);
      setCard({ url: URL.createObjectURL(blob), blob });
    } finally {
      setMaking(false);
    }
  }

  function save() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = "pocha-receipt.png";
    a.click();
    flash("영수증을 저장했어요");
  }

  async function share() {
    if (!card) return;
    const text = `오늘 포차 매출 ${won(total)}… 너도 장사해봐`;
    const file = new File([card.blob], "pocha-receipt.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      flash("링크를 복사했어요");
    } catch (err) {
      // closing the share sheet isn't an error
      if ((err as Error).name !== "AbortError") flash("공유하지 못했어요. 이미지를 저장해서 올려주세요");
    }
  }

  const sold = served.reduce((a, s) => a + s.paid, 0);
  const tips = served.reduce((a, s) => a + s.tip, 0);
  const avg = Math.round(served.reduce((a, s) => a + s.score, 0) / Math.max(1, served.length));

  return (
    <section className="relative" aria-live="polite">
      <Glow />
      <BulbString top={-10} />
      <div className="relative z-3 px-6 pt-[88px] text-center">
        <p className="m-0 font-brush text-[34px] leading-none text-tarp-300">오늘 장사 끝!</p>
        <h1 ref={headingRef} tabIndex={-1} className="m-0 mt-2 font-display text-[26px] leading-tight font-bold text-bulb-100 outline-none">
          {verdict(served)}
        </h1>
        <p className="m-0 mt-1.5 text-sm text-muted">
          {total >= best && total > 0 ? "최고 매출 기록이에요!" : `내 최고 매출 ${won(best)}`}
        </p>
      </div>

      {card ? (
        <div className="relative z-3 mt-6 flex flex-col items-center gap-3 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
          <img src={card.url} alt={`마감 영수증 카드, 합계 ${won(total)}`} className="aspect-[9/16] w-[260px] max-w-full rounded-xl shadow-card" />
          <div className="grid w-full max-w-[360px] grid-cols-2 gap-2.5">
            <button type="button" className="btn btn-ghost" onClick={save}>
              이미지 저장
            </button>
            <button type="button" className="btn" onClick={share}>
              공유하기
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-3 mx-auto mt-6 w-[360px] max-w-[calc(100%-32px)] animate-printout drop-shadow-[0_18px_30px_rgb(0_0_0/0.5)]">
          <div className="bg-paper px-[22px] pt-6 pb-[18px] text-paper-ink max-[380px]:px-4">
            <div className="text-center">
              <p className="m-0 font-display text-[26px] leading-none font-bold">향수병 포차</p>
              <p className="m-0 mt-2 font-mono text-[13px] leading-none text-paper-muted">마감 영수증 · {receiptDate()}</p>
            </div>
            <hr className="my-2.5 border-0 border-t border-dashed border-[#b9ab92]" />
            <table className="w-full border-collapse font-mono text-sm">
              <colgroup>
                <col className="w-[26px]" />
                <col />
                <col className="w-[44px]" />
                <col className="w-[104px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-paper-muted">
                  <th className="pb-1 font-normal">#</th>
                  <th className="pb-1 font-normal">메뉴 · 손님</th>
                  <th className="pb-1 text-right font-normal">점수</th>
                  <th className="pb-1 text-right font-normal">금액</th>
                </tr>
              </thead>
              <tbody>
                {served.map((s, i) => (
                  <tr key={i} className="align-baseline">
                    <td className="py-[7px] text-paper-muted">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-[7px] font-sans font-medium whitespace-nowrap">
                      {MENUS[s.menu].name} <span className="font-normal text-paper-muted">· {s.customer.short}</span>
                    </td>
                    <td className="py-[7px] text-right">{s.score}</td>
                    <td className="py-[7px] text-right whitespace-nowrap">
                      {s.paid === 0 ? (
                        <>
                          <span className="text-paper-muted line-through">{MENUS[s.menu].price.toLocaleString("ko-KR")}</span>{" "}
                          <span className="font-sans font-semibold text-chair-700">서비스</span>
                        </>
                      ) : (
                        s.paid.toLocaleString("ko-KR")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr className="my-2.5 border-0 border-t border-dashed border-[#b9ab92]" />
            <dl className="m-0 font-mono text-sm">
              {[
                ["판매", won(sold)],
                ["팁", `+${won(tips)}`],
                ["평균 점수", `${avg}점`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1">
                  <dt className="font-sans">{k}</dt>
                  <dd className="m-0">{v}</dd>
                </div>
              ))}
            </dl>
            <hr className="my-2.5 border-0 border-t border-dashed border-[#b9ab92]" />
            <p className="m-0 flex items-baseline justify-between font-mono text-[22px] leading-none font-bold">
              <span className="font-sans">합계</span>
              <span>{won(total)}</span>
            </p>
            <div aria-hidden="true" className="mt-[18px] h-[34px] bg-[repeating-linear-gradient(90deg,#2b221a_0_2px,transparent_2px_4px,#2b221a_4px_7px,transparent_7px_9px)]" />
            <p className="m-0 mt-2.5 text-center font-mono text-xs leading-none text-paper-muted">오늘도 수고했어요 · 또 오세요</p>
          </div>
          {/* torn edge */}
          <div
            aria-hidden="true"
            className="h-2.5 bg-[linear-gradient(135deg,var(--color-paper)_50%,transparent_50%),linear-gradient(225deg,var(--color-paper)_50%,transparent_50%)] bg-[length:12px_10px] bg-repeat-x"
          />
          <span className="absolute -top-4 -right-1 flex size-[84px] -rotate-14 animate-stamp items-center justify-center rounded-full border-[3px] border-chair-500 font-brush text-[34px] leading-none text-chair-500 opacity-85">
            {stampOf(served)}
          </span>
        </div>
      )}

      {token && board?.enabled && (
        <div className="relative z-3 mx-4 mt-6 flex flex-col gap-3">
          {rank === null ? (
            <form onSubmit={submit} className="card flex flex-col gap-2.5 p-5">
              <label htmlFor="rank-name" className="font-display text-[19px] leading-none font-bold">
                오늘의 매출 랭킹에 올리기
              </label>
              <div className="flex gap-2">
                <input
                  id="rank-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  required
                  placeholder="포차 이름이나 닉네임"
                  autoComplete="nickname"
                  className="h-12 min-w-0 flex-1 rounded-xl bg-night-900 px-3.5 text-base text-cream ring-1 ring-night-line ring-inset placeholder:text-dim focus:ring-2 focus:ring-bulb-300 focus:outline-none"
                />
                <button type="submit" className="btn h-12 w-auto px-5 text-base" disabled={sending || !name.trim()}>
                  {sending ? "올리는 중" : "올리기"}
                </button>
              </div>
              {rankError && (
                <p role="alert" className="m-0 text-sm text-chair-500">
                  {rankError}
                </p>
              )}
              <p className="m-0 text-xs text-dim">닉네임이랑 매출만 랭킹에 보여요. 하루 지나면 새로 시작해요.</p>
            </form>
          ) : (
            <p className="m-0 text-center font-display text-2xl font-bold text-bulb-300" role="status">
              오늘 {rank}등 했어요!
            </p>
          )}
          {rank !== null && <Ranking board={board} highlight={rank} />}
        </div>
      )}

      <p role="status" className="relative z-3 m-0 mt-3 min-h-5 text-center text-sm text-bulb-300">
        {toast}
      </p>

      {/* room for the two buttons pinned at the bottom */}
      <div className="h-[80px]" aria-hidden="true" />
      <BottomBar>
        <div className="flex w-full flex-col gap-2.5">
          {!card && (
            <button type="button" className="btn" onClick={makeCard} disabled={making}>
              {making ? "영수증 뽑는 중…" : "영수증 카드 저장"}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onHome}>
            처음으로
          </button>
        </div>
      </BottomBar>
    </section>
  );
}

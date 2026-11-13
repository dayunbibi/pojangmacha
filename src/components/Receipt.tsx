"use client";

import { useEffect, useRef, useState } from "react";
import { MENUS, won } from "@/lib/menus";
import { TIER_LABEL, tierOf } from "@/lib/customers";
import { makeReceiptImage, totalOf, verdict } from "@/lib/receiptImage";
import type { Served } from "./Pocha";
import Ranking, { useBoard } from "./Ranking";

type Props = { served: Served[]; best: number; token: string | null; onAgain: () => void };

const NAME_KEY = "pocha-name";

export default function Receipt({ served, best, token, onAgain }: Props) {
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

  return (
    <section className="flex animate-pop flex-col gap-4" aria-live="polite">
      <h2 ref={headingRef} tabIndex={-1} className="m-0 text-center font-sign text-3xl font-normal outline-none">
        오늘 장사 끝!
      </h2>

      {card ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
          <img src={card.url} alt={`마감 영수증, 합계 ${won(total)}`} className="mx-auto aspect-[9/16] w-[280px] max-w-full rounded-lg shadow-lg" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-ghost" onClick={save}>
              이미지 저장
            </button>
            <button type="button" className="btn" onClick={share}>
              공유하기
            </button>
          </div>
        </>
      ) : (
        <div className="relative -rotate-1 bg-paper px-5 pt-5 pb-8 font-receipt text-[15px] text-night shadow-[4px_6px_0_rgb(0_0_0/0.35)] [clip-path:polygon(0_0,100%_0,100%_100%,95%_97%,90%_100%,85%_97%,80%_100%,75%_97%,70%_100%,65%_97%,60%_100%,55%_97%,50%_100%,45%_97%,40%_100%,35%_97%,30%_100%,25%_97%,20%_100%,15%_97%,10%_100%,5%_97%,0_100%)]">
          <p className="m-0 text-center text-lg font-bold">향수병 포차 · 마감 영수증</p>
          <hr className="my-3 border-0 border-t-2 border-dashed border-night/40" />
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {served.map((s, i) => (
              <li key={i}>
                <div className="flex justify-between font-bold">
                  <span>{MENUS[s.menu].name}</span>
                  <span>{s.paid === 0 ? "서비스" : won(s.paid)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-night/70">
                  <span>
                    {s.score}점 · {TIER_LABEL[tierOf(s.score)]} · {s.customer.who}
                  </span>
                  {s.tip > 0 && <span className="text-tarp-dark">팁 +{won(s.tip)}</span>}
                </div>
              </li>
            ))}
          </ul>
          <hr className="my-3 border-0 border-t-2 border-dashed border-night/40" />
          <div className="flex justify-between text-xl font-bold">
            <span>합계</span>
            <span>{won(total)}</span>
          </div>
          <p className="m-0 mt-3 text-center font-sign text-2xl text-[#d7261e]">{verdict(served)}</p>
        </div>
      )}

      {!card && (
        <button type="button" className="btn" onClick={makeCard} disabled={making}>
          {making ? "영수증 뽑는 중…" : "영수증 카드 만들기"}
        </button>
      )}
      {token && board?.enabled && (
        <div className="flex flex-col gap-3">
          {rank === null ? (
            <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg bg-night-soft p-4">
              <label htmlFor="rank-name" className="font-sign text-lg text-bulb">
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
                  className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-white/15 bg-night px-3 text-base text-ink placeholder:text-ink-dim focus:border-bulb focus:outline-none"
                />
                <button type="submit" className="btn w-auto px-5" disabled={sending || !name.trim()}>
                  {sending ? "올리는 중" : "올리기"}
                </button>
              </div>
              {rankError && (
                <p role="alert" className="m-0 text-sm text-stool">
                  {rankError}
                </p>
              )}
              <p className="m-0 text-xs text-ink-dim">닉네임이랑 매출만 랭킹에 보여요. 하루 지나면 새로 시작해요.</p>
            </form>
          ) : (
            <p className="m-0 text-center font-sign text-2xl text-bulb" role="status">
              오늘 {rank}등 했어요!
            </p>
          )}
          {rank !== null && <Ranking board={board} highlight={rank} />}
        </div>
      )}

      <button type="button" className={card ? "btn" : "btn btn-ghost"} onClick={onAgain}>
        내일 또 장사하기
      </button>
      <p className="m-0 text-center text-sm text-ink-dim">
        {total >= best && total > 0 ? "최고 매출 기록이에요!" : `최고 매출 ${won(best)}`}
      </p>
      <p role="status" className="m-0 min-h-5 text-center text-sm text-bulb">
        {toast}
      </p>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { TIER_LABEL, makeNight, payFor, tierOf, type Customer } from "@/lib/customers";
import { MENUS, MENU_KEYS, won, type MenuKey } from "@/lib/menus";
import { CANVAS_TEXT, loadFonts } from "@/lib/fonts";
import Yeomtong from "./games/Yeomtong";
import Gimbap from "./games/Gimbap";
import Tteokbokki from "./games/Tteokbokki";
import Eomuk from "./games/Eomuk";
import Gyeranppang from "./games/Gyeranppang";
import Receipt from "./Receipt";
import Guest from "./Guest";
import Ranking, { useBoard } from "./Ranking";
import type { GameProps } from "./games/types";

const GAMES: Record<MenuKey, React.ComponentType<GameProps>> = {
  yeomtong: Yeomtong,
  gimbap: Gimbap,
  tteokbokki: Tteokbokki,
  eomuk: Eomuk,
  gyeranppang: Gyeranppang,
};

export type Served = {
  menu: MenuKey;
  customer: Customer;
  score: number;
  note: string;
  paid: number;
  tip: number;
  reaction: string;
};

type Step = "open" | "order" | "cook" | "serve" | "close";

const BEST_KEY = "pocha-best";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export default function Pocha() {
  const [step, setStep] = useState<Step>("open");
  const [night, setNight] = useState<{ menu: MenuKey; customer: Customer }[]>([]);
  const [idx, setIdx] = useState(0);
  const [served, setServed] = useState<Served[]>([]);
  const [best, setBest] = useState(0);
  const [token, setToken] = useState<string | null>(null); // proves this night was actually played
  const board = useBoard();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setBest(readBest());
    loadFonts(CANVAS_TEXT); // canvas-only text needs its font chunks too
  }, []);

  // every new screen: back to the top and focus its heading
  useEffect(() => {
    if (step === "open") return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, idx]);

  function open() {
    setToken(null);
    fetch("/api/play", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .catch(() => {}); // no token = no ranking this time, the game still works
    setNight(makeNight(MENU_KEYS));
    setIdx(0);
    setServed([]);
    setStep("order");
  }

  function done(score: number, note: string) {
    const { menu, customer } = night[idx];
    const { paid, tip } = payFor(menu, score);
    const reaction = customer.reactions[tierOf(score)];
    setServed((s) => [...s, { menu, customer, score, note, paid, tip, reaction }]);
    setStep("serve");
    if (tierOf(score) === 0) navigator.vibrate?.(40);
  }

  function next() {
    if (idx + 1 < night.length) {
      setIdx(idx + 1);
      setStep("order");
      return;
    }
    const total = served.reduce((a, s) => a + s.paid + s.tip, 0);
    if (total > best) {
      setBest(total);
      try {
        localStorage.setItem(BEST_KEY, String(total));
      } catch {
        // private mode, record just isn't kept
      }
    }
    setStep("close");
  }

  if (step === "open") {
    return (
      <section className="flex flex-col gap-5">
        <p className="m-0 text-center leading-relaxed text-ink-dim">
          오늘 밤 손님은 5명. 메뉴판에 있는 거 하나씩 다 주문해요.
          <br />
          잘 만들면 팁, 망하면… 서비스로 드려야죠.
        </p>

        {/* menu board taped to the tent */}
        <div className="-rotate-1 rounded-lg bg-paper px-5 py-4 text-night shadow-[4px_6px_0_rgb(0_0_0/0.35)]">
          <h2 className="m-0 text-center font-hand text-[34px] leading-none font-normal">차림표</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {MENU_KEYS.map((k) => (
              <li key={k} className="flex items-baseline gap-2 font-hand text-[26px] leading-none">
                <span>{MENUS[k].name}</span>
                <span className="flex-1 border-b-2 border-dotted border-night/30" aria-hidden="true" />
                <span>{won(MENUS[k].price)}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="button" className="btn" onClick={open}>
          장사 시작
        </button>
        {best > 0 && <p className="m-0 text-center text-sm text-ink-dim">내 최고 매출 {won(best)}</p>}
        <Ranking board={board} />
      </section>
    );
  }

  if (step === "close") {
    return <Receipt served={served} best={best} token={token} onAgain={open} />;
  }

  const { menu, customer } = night[idx];
  const Game = GAMES[menu];
  const last = served[served.length - 1];
  const count = (
    <span className="font-sign text-sm text-ink-dim">
      손님 {idx + 1}/{night.length}
    </span>
  );

  if (step === "order") {
    return (
      <section className="flex animate-pop flex-col gap-4" key={`order-${idx}`}>
        <div className="flex items-center justify-between">
          <h2 ref={headingRef} tabIndex={-1} className="m-0 font-sign text-2xl font-normal outline-none">
            어서 오세요!
          </h2>
          {count}
        </div>
        <Guest customer={customer} />
        <p className="bubble m-0">{customer.order(MENUS[menu].name)}</p>
        <div className="rounded-lg bg-night-soft p-4">
          <p className="m-0 font-sign text-lg text-bulb">
            주문 · {MENUS[menu].name} <span className="text-sm text-ink-dim">({MENUS[menu].control})</span>
          </p>
          <p className="m-0 mt-1.5 text-[15px] leading-relaxed">{MENUS[menu].how}</p>
        </div>
        <button type="button" className="btn" onClick={() => setStep("cook")}>
          만들기 시작
        </button>
      </section>
    );
  }

  if (step === "cook") {
    return (
      <section className="flex flex-col gap-3" key={`cook-${idx}`}>
        <div className="flex items-center justify-between">
          <h2 ref={headingRef} tabIndex={-1} className="m-0 font-sign text-2xl font-normal outline-none">
            {MENUS[menu].name} 만드는 중
          </h2>
          {count}
        </div>
        <Game onDone={done} />
      </section>
    );
  }

  // serve
  const tier = tierOf(last.score);
  return (
    <section className="flex animate-pop flex-col gap-4" key={`serve-${idx}`} aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 ref={headingRef} tabIndex={-1} className="m-0 font-sign text-2xl font-normal outline-none">
          {MENUS[menu].name} 나왔습니다
        </h2>
        {count}
      </div>
      <div className="flex items-end justify-between gap-3 rounded-lg bg-night-soft p-4">
        <div>
          <p className={`m-0 font-sign text-3xl ${tier === 0 ? "text-bulb" : tier === 3 ? "text-stool" : "text-ink"}`}>{TIER_LABEL[tier]}</p>
          <p className="m-0 mt-1 text-[15px] text-ink-dim">{last.note}</p>
        </div>
        <p className="m-0 font-sign text-6xl leading-none tabular-nums">
          {last.score}
          <span className="text-lg text-ink-dim">점</span>
        </p>
      </div>
      <Guest customer={customer} mood={tier} />
      <p className="bubble m-0">{last.reaction}</p>
      <p className="m-0 text-center font-sign text-xl">
        {last.paid === 0 ? (
          <span className="text-stool">&ldquo;이건 서비스로 드릴게요…&rdquo; 0원</span>
        ) : (
          <>
            +{won(last.paid)}
            {last.tip > 0 && <span className="text-bulb"> 팁 +{won(last.tip)}</span>}
          </>
        )}
      </p>
      <button type="button" className="btn" onClick={next}>
        {idx + 1 < night.length ? "다음 손님 받기" : "장사 마감하기"}
      </button>
    </section>
  );
}


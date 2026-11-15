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
import Ranking, { useBoard } from "./Ranking";
import Stage, { BulbString, Glow, TentBg } from "./ui/Stage";
import Hud from "./ui/Hud";
import Thumb from "./ui/Thumb";
import Footer from "./ui/Footer";
import { BottomBar } from "./games/Kit";
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
  shot?: string; // picture of the dish
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

  function done(score: number, note: string, shot?: string) {
    const { menu, customer } = night[idx];
    const { paid, tip } = payFor(menu, score);
    const reaction = customer.reactions[tierOf(score)];
    setServed((s) => [...s, { menu, customer, score, note, paid, tip, reaction, shot }]);
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

  const sales = served.reduce((a, s) => a + s.paid + s.tip, 0);

  if (step === "open") {
    return (
      <section className="relative">
        <Glow />
        <TentBg />
        <BulbString top={36} />
        <div className="relative z-3 px-6 pt-[156px] text-center">
          <span className="inline-block rounded-full bg-night-950/55 px-3 py-1.5 text-xs leading-none font-medium tracking-[0.02em] text-bulb-300 ring-1 ring-bulb-300/35 ring-inset">
            향수병 게임즈 · 포장마차 편
          </span>
          <h1 className="m-0 mt-3.5 font-display text-[56px] leading-[1.05] font-bold tracking-[-0.02em] text-bulb-100 [text-shadow:0_0_28px_rgb(255_210_122/0.55),0_2px_0_rgb(0_0_0/0.4)]">
            향수병 포차
          </h1>
          <p className="m-0 mt-2.5 font-brush text-[26px] leading-none text-tarp-300">오늘 밤도 불 켰습니다</p>
        </div>

        <p className="relative z-3 mx-6 mt-[188px] mb-0 text-center text-[15px] leading-[1.75]">
          오늘 밤 손님은 다섯 분. 주문 하나씩 직접 만들어 드려요.
          <br />
          잘 만들면 팁, 망치면 서비스로 나갑니다.
        </p>

        <section aria-labelledby="menu-title" className="card relative z-3 mx-4 mt-7 px-5 pt-5 pb-2">
          <div className="flex items-baseline justify-between">
            <h2 id="menu-title" className="m-0 font-brush text-4xl leading-none font-normal text-bulb-300">
              차림표
            </h2>
            <span className="text-[11px] leading-none font-medium tracking-[0.18em] text-dim">MENU</span>
          </div>
          <ul className="m-0 mt-2 list-none p-0">
            {MENU_KEYS.map((k) => (
              <li key={k} className="flex h-16 items-center gap-3.5 border-b border-dashed border-night-line last:border-b-0">
                <Thumb menu={k} />
                <span className="flex-1 text-[17px] font-semibold">{MENUS[k].name}</span>
                <span className="font-mono font-bold text-bulb-300">{won(MENUS[k].price)}</span>
              </li>
            ))}
          </ul>
        </section>

        {best > 0 && <p className="relative z-3 m-0 mt-4 text-center text-sm text-muted">내 최고 매출 <span className="font-mono font-bold text-bulb-300">{won(best)}</span></p>}
        <div className="relative z-3 mx-4 mt-4">
          <Ranking board={board} />
        </div>
        <Footer />
        <BottomBar>
          <button type="button" className="btn" onClick={open}>
            장사 시작
          </button>
        </BottomBar>
      </section>
    );
  }

  if (step === "close") {
    return <Receipt served={served} best={best} token={token} onHome={() => setStep("open")} />;
  }

  const { menu, customer } = night[idx];
  const Game = GAMES[menu];
  const last = served[served.length - 1];
  const hud = <Hud guest={idx + 1} total={night.length} sales={sales} />;

  if (step === "order") {
    return (
      <section className="relative" key={`order-${idx}`}>
        <Glow />
        {hud}
        <h1 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
          {idx + 1}번째 손님, {customer.who}
        </h1>
        <Stage customer={customer} line={customer.order(MENUS[menu].name)} height={500} />

        {/* order ticket torn off a pad */}
        <section className="relative mx-6 mt-3.5 rounded-md bg-paper px-5 pt-[22px] pb-5 text-paper-ink shadow-[0_16px_36px_rgb(0_0_0/0.45)]">
          <div
            aria-hidden="true"
            className="absolute -top-1.5 left-0 h-3 w-full bg-[radial-gradient(circle_at_6px_0,var(--color-night-900)_5px,transparent_5.5px)] bg-[length:12px_12px] bg-repeat-x"
          />
          <div className="flex justify-between font-mono text-[13px] leading-none text-paper-muted">
            <span>주문서 No.{String(idx + 1).padStart(2, "0")}</span>
            <span>{clock()}</span>
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <Thumb menu={menu} size={64} paper />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-display text-2xl leading-[1.1] font-bold">{MENUS[menu].name}</p>
              <p className="m-0 mt-1.5 text-sm leading-snug text-paper-muted">{MENUS[menu].line}</p>
            </div>
            <span className="flex-none font-mono text-lg font-bold">{won(MENUS[menu].price)}</span>
          </div>
          <p className="m-0 mt-4 border-t border-dashed border-[#b9ab92] pt-3.5 text-sm leading-relaxed">
            <span className="mr-1.5 font-semibold text-tarp-700">{MENUS[menu].control}</span>
            {MENUS[menu].how}
          </p>
        </section>
        <BottomBar>
          <button type="button" className="btn" onClick={() => setStep("cook")}>
            주문 받기
          </button>
        </BottomBar>
      </section>
    );
  }

  if (step === "cook") {
    return (
      <section className="relative" key={`cook-${idx}`}>
        <Glow />
        {hud}
        <div className="mx-4 h-1.5 overflow-hidden rounded-[3px] bg-night-700" aria-hidden="true">
          <div className="h-full rounded-[3px] bg-[linear-gradient(90deg,#ffd27a,#ec6a1f)]" style={{ width: `${((idx + 0.5) / night.length) * 100}%` }} />
        </div>
        <div className="mx-auto mt-5 flex max-w-[360px] items-end justify-between px-4 min-[392px]:px-0">
          <div>
            <p className="m-0 text-[13px] leading-none font-medium text-muted">{customer.who} 주문</p>
            <h1 ref={headingRef} tabIndex={-1} className="m-0 mt-2 font-display text-[30px] leading-none font-bold text-bulb-100 outline-none">
              {MENUS[menu].name}
            </h1>
          </div>
          <Timer />
        </div>
        <div className="mt-[18px] px-4 [&_.board]:max-w-[360px]">
          <Game onDone={done} />
        </div>
      </section>
    );
  }

  // serve
  const tier = tierOf(last.score);
  return (
    <section className="relative" key={`serve-${idx}`} aria-live="polite">
      <Glow />
      {hud}
      <h1 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
        {MENUS[menu].name} {last.score}점, {TIER_LABEL[tier]}
      </h1>
      <Stage customer={customer} mood={tier} line={last.reaction} height={470} />

      <div className="relative mx-6 flex items-center gap-[18px] max-[380px]:mx-4 max-[380px]:gap-3">
        <Plate src={last.shot} alt={`${MENUS[menu].name} 완성 사진`} />
        <div className="min-w-0 flex-1 text-center">
          <p className="m-0 text-[13px] leading-none font-medium text-muted">점수</p>
          <p className="m-0 mt-1.5 font-display text-[72px] leading-none font-bold whitespace-nowrap text-bulb-100 tabular-nums [text-shadow:0_0_24px_rgb(255_210_122/0.45)] max-[380px]:text-[60px]">
            <CountUp to={last.score} />
            <span className="ml-0.5 text-[22px]">점</span>
          </p>
          <span
            className={`mt-2 inline-block animate-stamp rounded-lg border-[3px] px-3.5 py-1 font-brush text-[30px] leading-none ${tier <= 1 ? "border-chair-500 text-chair-500" : "border-muted text-muted"}`}
          >
            {TIER_LABEL[tier]}
          </span>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center gap-2.5 px-4">
        {last.paid === 0 ? (
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-chair-500/12 px-[18px] text-[15px] font-semibold text-chair-500 ring-1 ring-chair-500/45 ring-inset">
            서비스로 나갔어요 <span className="font-mono font-bold">0원</span>
          </span>
        ) : last.tip > 0 ? (
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-soju/14 px-[18px] text-[15px] font-semibold text-soju ring-1 ring-soju/45 ring-inset">
            팁 받았어요 <span className="font-mono font-bold">+{won(last.tip)}</span>
          </span>
        ) : (
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-night-800 px-[18px] text-[15px] font-semibold ring-1 ring-night-line ring-inset">
            받은 돈 <span className="font-mono font-bold text-bulb-300">+{won(last.paid)}</span>
          </span>
        )}
        <p className="m-0 text-center text-sm text-muted">{last.note}</p>
      </div>
      <BottomBar>
        <button type="button" className="btn" onClick={next}>
          {idx + 1 < night.length ? "다음 손님" : "장사 마감하기"}
        </button>
      </BottomBar>
    </section>
  );
}

function clock() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// how long you've been cooking this order
function Timer() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[22px] leading-none font-bold text-bulb-300 tabular-nums" aria-label={`${sec}초`}>
      {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
    </span>
  );
}

// score counts up from 0 like a scale settling
function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

// the finished dish (a snapshot of the cooking board) on an oval plate
function Plate({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="relative h-[150px] w-[200px] flex-none rounded-[50%] bg-[radial-gradient(ellipse_at_50%_45%,#fbf7ef_0%,#efe6d6_52%,#d9cdb8_60%,#f4ede1_64%,#c9bba3_100%)] shadow-[0_14px_30px_rgb(0_0_0/0.5)] max-[380px]:h-[128px] max-[380px]:w-[170px]">
      {src && (
        <div className="absolute inset-[16px_22px] overflow-hidden rounded-[50%] shadow-[inset_0_3px_12px_rgb(0_0_0/0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the canvas */}
          <img src={src} alt={alt} className="size-full scale-[1.25] object-cover" />
        </div>
      )}
    </div>
  );
}

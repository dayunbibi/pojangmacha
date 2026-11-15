"use client";

import { useRef, useState } from "react";
import { boardPoint, closeness, useBoard, useLoop, bulbLight, snapshot, steam } from "@/lib/canvas";
import { crossfade, put, useSprites } from "@/lib/sprites";
import { BottomBar, Gauge, gaugePos, Hint, Steps } from "./Kit";
import type { GameProps } from "./types";

// 4 pieces of heart on one skewer (positions from the design handoff),
// each piece split into 4x2 cells to track where the sauce went
const PIECES = [52, 112, 172, 232]; // left x
const PY = 152; // top y
const PW = 64;
const PH = 56;
const CY = PY + PH / 2;
const COLS = 4;
const ROWS = 2;
const PER_PIECE = COLS * ROWS;
const CELLS = PIECES.length * PER_PIECE;

const COOK_SPEED = 1 / 7; // about 4-6 seconds a side is just right
const BURN_AT = 1.35;

const ART = {
  "yeomtong-grill-bg": [360, 360],
  "yeomtong-skewer": [330, 20],
  "yeomtong-piece-raw": [64, 56],
  "yeomtong-piece-cooked": [64, 56],
  "yeomtong-piece-burnt": [64, 56],
  "yeomtong-glaze-overlay": [64, 56],
  "yeomtong-brush": [144, 36],
} as const satisfies Record<string, [number, number]>;

export default function Yeomtong({ onDone }: GameProps) {
  const ref = useBoard();
  const art = useSprites(ART);
  const s = useRef({
    down: 0, // which side is on the grill
    cook: [0, 0],
    sauce: [new Array(CELLS).fill(false), new Array(CELLS).fill(false)],
    flips: 0,
    flipAt: -1,
    brush: null as { x: number; y: number } | null,
    painting: false,
    done: false,
  });
  const [, setTick] = useState(0); // re-render the buttons a few times a second
  const lastUi = useRef(0);

  function topSide() {
    return 1 - s.current.down;
  }

  function finish() {
    const g = s.current;
    if (g.done) return;
    g.done = true;
    const coverage = g.sauce.map((side) => side.filter(Boolean).length / CELLS);
    const cooked = g.cook.map((c) => closeness(c, 0.55, 0.9, 0.4));
    const score = Math.round(100 * (0.55 * ((coverage[0] + coverage[1]) / 2) + 0.45 * ((cooked[0] + cooked[1]) / 2)));

    let note = "양념도 굽기도 딱 좋아요";
    if (Math.max(...g.cook) > 1.05) note = "한쪽이 시커멓게 탔어요";
    else if (Math.min(...g.cook) < 0.4) note = "한쪽이 덜 익었어요";
    else if (Math.min(...coverage) < 0.7) note = "양념이 덜 발렸어요";
    onDone(score, note, snapshot(ref.current));
  }

  function paint(x: number, y: number) {
    const side = s.current.sauce[topSide()];
    PIECES.forEach((px, p) => {
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          const cellX = px + (cx + 0.5) * (PW / COLS);
          const cellY = PY + (cy + 0.5) * (PH / ROWS);
          if (Math.hypot(cellX - x, cellY - y) < 18) side[p * PER_PIECE + cy * COLS + cx] = true;
        }
      }
    });
  }

  useLoop((dt, t) => {
    const g = s.current;
    const c = ref.current?.getContext("2d");
    if (!c || g.done) return;

    g.cook[g.down] += dt * COOK_SPEED;
    if (g.cook[g.down] > BURN_AT) finish();

    draw(c, t);
    bulbLight(c, t);

    if (t - lastUi.current > 0.15) {
      lastUi.current = t;
      setTick((n) => n + 1);
    }
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    const top = topSide();
    c.clearRect(0, 0, 360, 360);
    if (!art) return;

    // charcoal glows a little brighter and dimmer
    c.globalAlpha = 0.86 + 0.14 * Math.sin(t * 3.4) * Math.sin(t * 1.3);
    put(c, art["yeomtong-grill-bg"], 0, 0);
    c.globalAlpha = 1;
    put(c, art["yeomtong-skewer"], 15, 170);

    // flip = the pieces squash flat and open up again
    const flipT = g.flipAt < 0 ? 1 : Math.min(1, (t - g.flipAt) / 0.25);
    const squash = flipT < 1 ? Math.abs(Math.cos(flipT * Math.PI)) : 1;

    c.save();
    c.translate(0, CY);
    c.scale(1, Math.max(0.15, squash));
    c.translate(0, -CY);
    const looks = [
      { sprite: art["yeomtong-piece-raw"], from: 0 },
      { sprite: art["yeomtong-piece-cooked"], from: 0.45 },
      { sprite: art["yeomtong-piece-burnt"], from: 1.0 },
    ];
    PIECES.forEach((px, p) => {
      crossfade(c, looks, g.cook[top], px, PY);
      const painted = g.sauce[top].slice(p * PER_PIECE, (p + 1) * PER_PIECE).filter(Boolean).length / PER_PIECE;
      if (painted > 0) {
        c.save();
        c.globalAlpha = painted;
        put(c, art["yeomtong-glaze-overlay"], px, PY);
        c.restore();
      }
    });
    c.restore();

    // steam from the side that's on the coals
    if (g.cook[g.down] > 0.25) steam(c, 180, PY - 6, t, 4);

    // brush, its tip is where your finger is
    if (g.brush) {
      c.save();
      c.translate(g.brush.x, g.brush.y);
      c.rotate(-0.45);
      put(c, art["yeomtong-brush"], -140, -18);
      c.restore();
    }
  }

  const g = s.current;
  const coverage = (i: number) => Math.round((g.sauce[i].filter(Boolean).length / CELLS) * 100);
  const ready = g.cook.every((c) => c >= 0.55) && coverage(0) >= 70 && coverage(1) >= 70;
  const step = ready ? 2 : g.flips === 0 ? 0 : 1;

  return (
    <div className="flex flex-col gap-5">
      <canvas
        ref={ref}
        className="board"
        aria-label="석쇠 위 염통꼬치. 문질러서 양념을 바르세요."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          g.painting = true;
          const p = boardPoint(e);
          g.brush = p;
          paint(p.x, p.y);
        }}
        onPointerMove={(e) => {
          const p = boardPoint(e);
          g.brush = p;
          if (g.painting) paint(p.x, p.y);
        }}
        onPointerUp={() => (g.painting = false)}
        onPointerLeave={() => (g.brush = null)}
      />
      <Gauge labels={["날것", "잘 익음", "탐"]} pos={gaugePos(g.cook[g.down], 0, 0.55, 0.9, BURN_AT)} />
      <Hint>
        아래쪽이 익는 동안 붓으로 위쪽에 양념을 발라요 · 양념 앞 {coverage(0)}% · 뒤 {coverage(1)}%
      </Hint>
      <Steps steps={["한쪽 굽기", "뒤집기", "내기"]} current={step} />
      <BottomBar>
        <button
          type="button"
          className="btn btn-ghost w-[40%] flex-none"
          onClick={() => {
            g.down = 1 - g.down;
            g.flips += 1;
            g.flipAt = performance.now() / 1000;
          }}
        >
          뒤집기
        </button>
        <button type="button" className="btn flex-1" onClick={finish}>
          다 됐어요
        </button>
      </BottomBar>
    </div>
  );
}

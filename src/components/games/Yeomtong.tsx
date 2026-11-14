"use client";

import { useRef, useState } from "react";
import { boardPoint, closeness, cookColor, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import type { GameProps } from "./types";

// 4 pieces of heart on one skewer, each piece split into 2x4 cells for the sauce
const PIECES = [70, 135, 200, 265];
const PW = 54;
const PH = 72;
const CY = 190;
const COLS = 2;
const ROWS = 4;
const CELLS = PIECES.length * COLS * ROWS;

const COOK_SPEED = 1 / 7; // about 4-6 seconds a side is just right
const BURN_AT = 1.35;

export default function Yeomtong({ onDone }: GameProps) {
  const ref = useBoard();
  const s = useRef({
    down: 0, // which side is on the grill
    cook: [0, 0],
    sauce: [new Array(CELLS).fill(false), new Array(CELLS).fill(false)],
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
    const g = s.current;
    const side = g.sauce[topSide()];
    PIECES.forEach((px, p) => {
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          const cellX = px - PW / 2 + (cx + 0.5) * (PW / COLS);
          const cellY = CY - PH / 2 + (cy + 0.5) * (PH / ROWS);
          if (Math.hypot(cellX - x, cellY - y) < 20) side[p * COLS * ROWS + cy * COLS + cx] = true;
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

    // charcoal grill
    c.fillStyle = "#1c1512";
    c.fillRect(0, 0, 360, 360);
    for (let i = 0; i < 14; i++) {
      const flicker = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
      c.fillStyle = `rgba(255,${90 + 40 * flicker},30,${0.25 + 0.25 * flicker})`;
      c.beginPath();
      c.arc(20 + i * 25, 320 + (i % 3) * 10, 18, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#5a5552";
    c.lineWidth = 4;
    for (let y = 120; y <= 270; y += 25) {
      c.beginPath();
      c.moveTo(10, y);
      c.lineTo(350, y);
      c.stroke();
    }

    // skewer
    c.fillStyle = "#c9a36a";
    c.fillRect(18, CY - 4, 330, 8);

    // flip squash
    const flipT = g.flipAt < 0 ? 1 : Math.min(1, (t - g.flipAt) / 0.25);
    const squash = flipT < 1 ? Math.abs(Math.cos(flipT * Math.PI)) : 1;

    c.save();
    c.translate(0, CY);
    c.scale(1, Math.max(0.15, squash));
    c.translate(0, -CY);
    PIECES.forEach((px, p) => {
      c.fillStyle = cookColor(g.cook[top]);
      c.beginPath();
      c.roundRect(px - PW / 2, CY - PH / 2, PW, PH, 16);
      c.fill();
      // grill marks show up once that side has been on the grill
      if (g.cook[top] > 0.3) {
        c.strokeStyle = `rgba(30,18,12,${Math.min(0.7, g.cook[top] - 0.2)})`;
        c.lineWidth = 4;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.moveTo(px - PW / 2 + 6, CY + k * 18 - 6);
          c.lineTo(px + PW / 2 - 6, CY + k * 18 + 6);
          c.stroke();
        }
      }
      // sauce
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          if (!g.sauce[top][p * COLS * ROWS + cy * COLS + cx]) continue;
          const x = px - PW / 2 + cx * (PW / COLS);
          const y = CY - PH / 2 + cy * (PH / ROWS);
          c.fillStyle = "rgba(168,32,18,0.82)";
          c.beginPath();
          c.roundRect(x + 2, y + 2, PW / COLS - 4, PH / ROWS - 4, 6);
          c.fill();
          c.fillStyle = "rgba(255,220,200,0.35)"; // shine
          c.fillRect(x + 6, y + 5, 6, 3);
        }
      }
    });
    c.restore();

    // smoke from the side on the grill
    c.fillStyle = "rgba(220,220,220,0.12)";
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.5 + i / 5) % 1;
      c.beginPath();
      c.arc(60 + i * 60 + Math.sin(t + i) * 10, 110 - ph * 90, 14 + ph * 16, 0, Math.PI * 2);
      c.fill();
    }

    // brush
    if (g.brush) {
      c.save();
      c.translate(g.brush.x, g.brush.y);
      c.rotate(-0.5);
      c.fillStyle = "#8a5a2b";
      c.fillRect(-4, -46, 8, 34);
      c.fillStyle = "#b02a1a";
      c.beginPath();
      c.ellipse(0, -6, 12, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  const g = s.current;
  const coverage = (i: number) => Math.round((g.sauce[i].filter(Boolean).length / CELLS) * 100);
  const sideName = (i: number) => (i === 0 ? "앞면" : "뒷면");

  return (
    <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-md bg-night-soft px-3 py-2">
            <div className="flex justify-between">
              <span>{sideName(i)}</span>
              <span className={i === g.down ? "text-bulb" : ""}>
                {i === g.down ? "굽는 중 · " : "위 · "}양념 {coverage(i)}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (g.cook[i] / 1.1) * 100)}%`, background: cookColor(g.cook[i]) }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            g.down = 1 - g.down;
            g.flipAt = performance.now() / 1000;
          }}
        >
          뒤집기
        </button>
        <button type="button" className="btn" onClick={finish}>
          손님께 드리기
        </button>
      </div>
    </div>
  );
}

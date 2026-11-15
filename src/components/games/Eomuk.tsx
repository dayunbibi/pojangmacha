"use client";

import { useRef, useState } from "react";
import { clamp, steam, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import { put, useSprites } from "@/lib/sprites";
import { BottomBar, Hint } from "./Kit";
import type { GameProps } from "./types";

const ART = {
  "eomuk-broth-pot-bg": [360, 360],
  "eomuk-skewer": [20, 330],
  "eomuk-sheet-folded": [120, 56],
  "eomuk-sheet-flat": [200, 120],
} as const satisfies Record<string, [number, number]>;

const SKEWER_X = 180;
const STRIP_Y = 300;
const SPEED = 120; // px per second
const GAP = 58; // distance between fold marks
const FOLDS = 6;
const PERFECT = 5; // px
const MISS = 32; // px

export default function Eomuk({ onDone }: GameProps) {
  const ref = useBoard();
  const art = useSprites(ART);
  const [, setTick] = useState(0);
  const s = useRef({
    offset: 0, // how far the strip has slid
    hits: [] as number[], // error in px for each fold, MISS = missed
    flash: { text: "", at: -10 },
    endAt: -1,
    done: false,
  });

  // x position of fold mark i right now
  const markX = (i: number) => 380 + i * GAP - s.current.offset;

  function finish() {
    const g = s.current;
    if (g.done) return;
    g.done = true;
    const acc = g.hits.map((e) => clamp(1 - Math.max(0, e - PERFECT) / (MISS - PERFECT)));
    const score = Math.round((acc.reduce((a, b) => a + b, 0) / FOLDS) * 100);
    const misses = g.hits.filter((e) => e >= MISS).length;

    let note = "물결이 고르게 잘 꽂혔어요";
    if (misses >= 2) note = "어묵이 꼬치에서 흘러내려요";
    else if (score < 70) note = "물결이 삐뚤빼뚤해요";
    onDone(score, note, snapshot(ref.current));
  }

  function tap() {
    const g = s.current;
    const i = g.hits.length;
    if (i >= FOLDS || g.endAt > 0) return;
    const err = Math.abs(markX(i) - SKEWER_X);
    if (err > MISS * 2) return; // tapping way too early does nothing
    g.hits.push(Math.min(err, MISS));
    g.flash = { text: err <= PERFECT ? "딱!" : err < MISS / 2 ? "좋아요" : "삐끗", at: performance.now() / 1000 };
    if (g.hits.length >= FOLDS) g.endAt = performance.now() / 1000;
    setTick((n) => n + 1);
  }

  useLoop((dt, t) => {
    const g = s.current;
    const c = ref.current?.getContext("2d");
    if (!c || g.done) return;

    if (g.endAt < 0) {
      g.offset += dt * SPEED;
      // a mark that slid past without a tap is a miss
      const i = g.hits.length;
      if (i < FOLDS && markX(i) < SKEWER_X - MISS) {
        g.hits.push(MISS);
        g.flash = { text: "놓쳤어요", at: t };
        if (g.hits.length >= FOLDS) g.endAt = t;
        setTick((n) => n + 1);
      }
    } else if (t - g.endAt > 0.8) {
      finish();
    }
    draw(c, t);
    bulbLight(c, t);
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    c.fillStyle = "#1e232b";
    c.fillRect(0, 0, 360, 360);
    if (!art) return;
    put(c, art["eomuk-broth-pot-bg"], 0, 0);
    steam(c, 180, 210, t, 5);

    put(c, art["eomuk-skewer"], SKEWER_X - 10, 20);

    // folds already on the skewer, stacked upward. Bad timing = crooked fold
    g.hits.forEach((err, i) => {
      if (err >= MISS) return;
      const dir = i % 2 ? 1 : -1;
      c.save();
      c.translate(SKEWER_X, 250 - i * 34);
      c.rotate(((err / MISS) * 16 * dir * Math.PI) / 180);
      if (i % 2) c.scale(1, -1);
      put(c, art["eomuk-sheet-folded"], -60, -28);
      c.restore();
    });

    // the flat strip still sliding in from the right
    const startX = Math.max(SKEWER_X, markX(g.hits.length) - GAP / 2);
    const endX = markX(FOLDS - 1) + GAP / 2;
    if (endX > startX && g.endAt < 0) {
      c.save();
      c.beginPath();
      c.roundRect(startX, STRIP_Y - 20, endX - startX, 40, 6);
      c.clip();
      for (let x = endX - 100; x > startX - 100; x -= 96) put(c, art["eomuk-sheet-flat"], x, STRIP_Y - 30, 100, 60);
      c.restore();
      for (let i = g.hits.length; i < FOLDS; i++) {
        const x = markX(i);
        if (x < startX - 2) continue;
        c.fillStyle = "#c2404a";
        c.fillRect(x - 2, STRIP_Y - 24, 4, 48);
      }
    }

    // target line on the skewer
    c.strokeStyle = "rgba(255,210,122,0.9)";
    c.setLineDash([4, 4]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(SKEWER_X, STRIP_Y - 34);
    c.lineTo(SKEWER_X, STRIP_Y + 34);
    c.stroke();
    c.setLineDash([]);

    c.textAlign = "center";
    if (t - g.flash.at < 0.6) {
      c.fillStyle = "#ffd27a";
      c.font = "700 28px 'Gowun Batang', serif";
      c.fillText(g.flash.text, 290, 90);
    }
  }

  const done = s.current.hits.length;

  return (
    <div className="flex flex-col gap-5">
      <canvas
        ref={ref}
        className="board"
        aria-label="어묵 꽂기. 빨간 표시가 꼬치에 닿을 때 탭하세요."
        onPointerDown={tap}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            tap();
          }
        }}
      />
      <Hint>
        빨간 표시가 꼬치에 닿을 때 탭 · <span className="font-mono text-bulb-300">{done}/{FOLDS}</span>
      </Hint>
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: FOLDS }, (_, i) => (
          <span key={i} className={`h-2 w-6 rounded-full ${i < done ? (s.current.hits[i] >= MISS ? "bg-chair-500" : "bg-bulb-300") : "bg-night-700"}`} />
        ))}
      </div>
      <BottomBar>
        <button type="button" className="btn flex-1" onPointerDown={tap}>
          꽂기
        </button>
      </BottomBar>
    </div>
  );
}

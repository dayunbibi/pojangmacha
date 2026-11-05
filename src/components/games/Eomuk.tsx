"use client";

import { useRef } from "react";
import { clamp, steam, useBoard, useLoop } from "@/lib/canvas";
import type { GameProps } from "./types";

const SKEWER_X = 150;
const STRIP_Y = 290;
const SPEED = 120; // px per second
const GAP = 58; // distance between fold marks
const FOLDS = 6;
const PERFECT = 5; // px
const MISS = 32; // px

export default function Eomuk({ onDone }: GameProps) {
  const ref = useBoard();
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
    onDone(score, note);
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
      }
    } else if (t - g.endAt > 0.8) {
      finish();
    }
    draw(c, t);
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;

    // eomuk broth pot behind
    c.fillStyle = "#1e232b";
    c.fillRect(0, 0, 360, 360);
    c.fillStyle = "#8d949c";
    c.fillRect(20, 200, 320, 160);
    c.fillStyle = "#c9a46a";
    c.fillRect(30, 210, 300, 30);
    steam(c, 180, 200, t, 5);

    // skewer
    c.strokeStyle = "#d6b47c";
    c.lineWidth = 5;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(SKEWER_X, 30);
    c.lineTo(SKEWER_X, STRIP_Y + 30);
    c.stroke();

    // folds already on the skewer, stacked upward. Bad timing = crooked fold
    g.hits.forEach((err, i) => {
      if (err >= MISS) return;
      const y = STRIP_Y - 24 - i * 30;
      const dir = i % 2 ? 1 : -1;
      const tilt = (err / MISS) * 18 * dir;
      c.fillStyle = "#e7c793";
      c.strokeStyle = "#b8935a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(SKEWER_X - 46, y + tilt);
      c.quadraticCurveTo(SKEWER_X - 20 * dir, y - 22, SKEWER_X + 46, y - tilt);
      c.lineTo(SKEWER_X + 46, y + 12 - tilt);
      c.quadraticCurveTo(SKEWER_X - 20 * dir, y - 10, SKEWER_X - 46, y + 12 + tilt);
      c.closePath();
      c.fill();
      c.stroke();
    });

    // the flat strip still sliding in from the right
    const startX = Math.max(SKEWER_X, markX(g.hits.length) - GAP / 2);
    const endX = markX(FOLDS - 1) + GAP / 2;
    if (endX > startX && g.endAt < 0) {
      c.fillStyle = "#e7c793";
      c.beginPath();
      c.roundRect(startX, STRIP_Y - 12, endX - startX, 24, 6);
      c.fill();
      for (let i = g.hits.length; i < FOLDS; i++) {
        const x = markX(i);
        if (x < startX - 2) continue;
        c.fillStyle = "#c23a2a";
        c.fillRect(x - 2, STRIP_Y - 16, 4, 32);
      }
    }

    // target line on the skewer
    c.strokeStyle = "rgba(255,210,122,0.8)";
    c.setLineDash([4, 4]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(SKEWER_X, STRIP_Y - 30);
    c.lineTo(SKEWER_X, STRIP_Y + 30);
    c.stroke();
    c.setLineDash([]);

    c.textAlign = "center";
    if (t - g.flash.at < 0.6) {
      c.fillStyle = "#ffd27a";
      c.font = "28px 'Do Hyeon', sans-serif";
      c.fillText(g.flash.text, 270, 80);
    }
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.font = "17px 'Do Hyeon', sans-serif";
    c.fillText(`빨간 표시가 꼬치에 닿을 때 탭 ${g.hits.length}/${FOLDS}`, 180, 350);
  }

  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}

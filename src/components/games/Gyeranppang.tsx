"use client";

import { useRef, useState } from "react";
import { clamp, closeness, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import type { GameProps } from "./types";

const MOLDS = [70, 180, 290];
const MOLD_Y = 220;
const MOLD_W = 84;
const MOLD_H = 112;

const FILL = [0.7, 0.82]; // batter line
const POUR_SPEED = 0.5; // full mold in 2 seconds
const BAKE_SPEED = 1 / 7;
const GOLDEN = [0.62, 0.85];

type Step = "pour" | "egg" | "bake";

export default function Gyeranppang({ onDone }: GameProps) {
  const ref = useBoard();
  const [step, setStep] = useState<Step>("pour");
  const [mold, setMold] = useState(0);
  const s = useRef({
    fill: [0, 0, 0],
    egg: [null, null, null] as (number | null)[], // x offset where the egg landed
    pouring: false,
    eggX: 0,
    bake: 0,
    done: false,
  });
  const [, setTick] = useState(0);
  const lastUi = useRef(0);

  function finish() {
    const g = s.current;
    if (g.done) return;
    g.done = true;
    const pour = g.fill.map((f) => closeness(f, FILL[0], FILL[1], 0.25));
    const egg = g.egg.map((e) => (e === null ? 0 : clamp(1 - Math.abs(e) / 44)));
    const bake = closeness(g.bake, GOLDEN[0], GOLDEN[1], 0.3);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const score = Math.round(avg(pour) * 35 + avg(egg) * 35 + bake * 30);

    let note = "노릇노릇 계란이 딱 가운데예요";
    if (g.bake > 1) note = "바닥이 탔어요";
    else if (g.bake < 0.5) note = "덜 구워서 말랑해요";
    else if (Math.max(...g.fill) > 0.95) note = "반죽이 넘쳤어요";
    else if (avg(egg) < 0.6) note = "계란이 옆으로 쏠렸어요";
    onDone(score, note, snapshot(ref.current));
  }

  useLoop((dt, t) => {
    const g = s.current;
    const c = ref.current?.getContext("2d");
    if (!c || g.done) return;
    if (step === "pour" && g.pouring) g.fill[mold] = Math.min(1.05, g.fill[mold] + dt * POUR_SPEED);
    if (step === "egg") g.eggX = Math.sin(t * 2.8) * 52;
    if (step === "bake") {
      g.bake += dt * BAKE_SPEED;
      if (g.bake > 1.25) finish();
      if (t - lastUi.current > 0.12) {
        lastUi.current = t;
        setTick((n) => n + 1);
      }
    }
    draw(c, t);
    bulbLight(c, t);
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    c.fillStyle = "#24262b";
    c.fillRect(0, 0, 360, 360);
    // cast iron plate
    c.fillStyle = "#3d3f45";
    c.beginPath();
    c.roundRect(14, 130, 332, 190, 18);
    c.fill();

    // bake color: batter yellow -> golden -> dark
    const b = g.bake;
    const crust = b < 0.7 ? `rgb(${246 - b * 30},${214 - b * 40},${120 - b * 60})` : `rgb(${225 - (b - 0.7) * 260},${186 - (b - 0.7) * 260},${78 - (b - 0.7) * 120})`;

    MOLDS.forEach((mx, i) => {
      const top = MOLD_Y - MOLD_H / 2;
      c.fillStyle = "#1b1c20";
      c.beginPath();
      c.roundRect(mx - MOLD_W / 2, top, MOLD_W, MOLD_H, 24);
      c.fill();

      // batter level
      const f = Math.min(1, g.fill[i]);
      if (f > 0) {
        const h = MOLD_H * f;
        c.save();
        c.beginPath();
        c.roundRect(mx - MOLD_W / 2 + 4, top + 4, MOLD_W - 8, MOLD_H - 8, 20);
        c.clip();
        c.fillStyle = step === "bake" ? crust : "#f3d27e";
        c.fillRect(mx - MOLD_W / 2, top + MOLD_H - h, MOLD_W, h);
        c.restore();
      }
      if (g.fill[i] > 1) {
        // overflow drips
        c.fillStyle = "#f3d27e";
        c.beginPath();
        c.ellipse(mx + MOLD_W / 2 - 4, top + 10, 10, 18, 0, 0, Math.PI * 2);
        c.fill();
      }

      // line to fill up to
      if (step === "pour" && i === mold) {
        c.strokeStyle = "#ffd27a";
        c.setLineDash([5, 4]);
        c.lineWidth = 2;
        for (const level of FILL) {
          const y = top + MOLD_H * (1 - level);
          c.beginPath();
          c.moveTo(mx - MOLD_W / 2 - 6, y);
          c.lineTo(mx + MOLD_W / 2 + 6, y);
          c.stroke();
        }
        c.setLineDash([]);
      }

      // egg that landed
      const e = g.egg[i];
      if (e !== null) drawEgg(c, mx + e, top + MOLD_H * 0.4, step === "bake" ? b : 0);
    });

    // pouring stream / swinging egg above the current mold
    const mx = MOLDS[mold];
    c.textAlign = "center";
    c.font = "17px 'Do Hyeon', sans-serif";
    c.fillStyle = "rgba(255,255,255,0.9)";
    if (step === "pour") {
      c.fillStyle = "#c9ccd2";
      c.beginPath();
      c.roundRect(mx - 26, 30, 52, 50, 8); // batter kettle
      c.fill();
      if (g.pouring) {
        c.fillStyle = "#f3d27e";
        c.fillRect(mx - 4, 80, 8, MOLD_Y - MOLD_H / 2 - 80 + 4);
      }
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.fillText("꾹 누르고 있으면 반죽이 나와요", 180, 345);
    }
    if (step === "egg") {
      drawEgg(c, mx + g.eggX, 70, 0, true);
      c.fillText("계란이 가운데 올 때 탭!", 180, 345);
    }
    if (step === "bake") {
      c.fillText(g.bake < GOLDEN[0] ? "굽는 중…" : g.bake <= GOLDEN[1] ? "지금이에요! 노릇노릇" : "타고 있어요!!", 180, 345);
      // heat shimmer
      c.fillStyle = "rgba(255,140,40,0.15)";
      c.fillRect(14, 300 + Math.sin(t * 8) * 2, 332, 8);
    }
  }

  function drawEgg(c: CanvasRenderingContext2D, x: number, y: number, bake: number, whole = false) {
    if (whole) {
      c.fillStyle = "#f7efe2";
      c.beginPath();
      c.ellipse(x, y, 20, 26, 0, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.fillStyle = bake > 0.9 ? "#e8d8b8" : "#fbf7ef";
    c.beginPath();
    c.ellipse(x, y, 26, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = bake > 0.6 ? "#f0a92a" : "#f7b733";
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fill();
  }

  function down() {
    const g = s.current;
    if (step === "pour") g.pouring = true;
    if (step === "egg") {
      g.egg[mold] = g.eggX;
      if (mold < MOLDS.length - 1) {
        setMold(mold + 1);
        setStep("pour");
      } else {
        setStep("bake");
      }
    }
  }

  function up() {
    const g = s.current;
    if (step === "pour" && g.pouring) {
      g.pouring = false;
      if (g.fill[mold] > 0.05) setStep("egg");
    }
  }

  const g = s.current;

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={ref}
        className="board"
        aria-label="계란빵 틀"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          down();
        }}
        onPointerUp={up}
        onPointerCancel={up}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            down();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") up();
        }}
      />
      {step === "bake" ? (
        <>
          <div className="relative h-3 overflow-hidden rounded-full bg-black/40" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 rounded-full bg-tarp" style={{ width: `${clamp(g.bake / 1.25) * 100}%` }} />
            <div
              className="absolute inset-y-0 rounded-full border-2 border-bulb"
              style={{ left: `${(GOLDEN[0] / 1.25) * 100}%`, width: `${((GOLDEN[1] - GOLDEN[0]) / 1.25) * 100}%` }}
            />
          </div>
          <button type="button" className="btn" onClick={finish}>
            꺼내기
          </button>
        </>
      ) : (
        <p className="m-0 text-sm text-ink-dim">
          {mold + 1}번째 틀 · {step === "pour" ? "점선 사이까지 반죽 붓기" : "계란 떨어뜨리기"}
        </p>
      )}
    </div>
  );
}

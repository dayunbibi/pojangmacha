"use client";

import { useRef, useState } from "react";
import { clamp, closeness, steam, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import { crossfade, put, useSprites } from "@/lib/sprites";
import { BottomBar, Gauge, gaugePos, Hint, Steps } from "./Kit";
import type { GameProps } from "./types";

const ART = {
  "gyeranppang-mold": [360, 220],
  "gyeranppang-batter-kettle": [150, 120],
  "gyeranppang-egg-whole": [50, 64],
  "gyeranppang-egg-cracked": [92, 84],
  "gyeranppang-bake-batter": [96, 148],
  "gyeranppang-bake-golden": [96, 148],
  "gyeranppang-bake-burnt": [96, 148],
} as const satisfies Record<string, [number, number]>;

const MOLDS = [75, 180, 285];
const MOLD_Y = 180;
const MOLD_W = 96;
const MOLD_H = 148;

const FILL = [0.7, 0.82]; // batter line
const POUR_SPEED = 0.5; // full mold in 2 seconds
const BAKE_SPEED = 1 / 7;
const GOLDEN = [0.62, 0.85];

type Step = "pour" | "egg" | "bake";

export default function Gyeranppang({ onDone }: GameProps) {
  const ref = useBoard();
  const art = useSprites(ART);
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
    if (!art) return;
    put(c, art["gyeranppang-mold"], 0, 70);
    const top = MOLD_Y - MOLD_H / 2;

    MOLDS.forEach((mx, i) => {
      const x = mx - MOLD_W / 2;
      // batter fills from the bottom of the cell
      const f = Math.min(1, g.fill[i]);
      if (f > 0) {
        c.save();
        c.beginPath();
        c.rect(x, top + MOLD_H * (1 - f), MOLD_W, MOLD_H * f);
        c.clip();
        if (step === "bake") {
          crossfade(
            c,
            [
              { sprite: art["gyeranppang-bake-batter"], from: 0 },
              { sprite: art["gyeranppang-bake-golden"], from: 0.55 },
              { sprite: art["gyeranppang-bake-burnt"], from: 1.05 },
            ],
            g.bake,
            x,
            top,
            undefined,
            undefined,
            0.2,
          );
        } else put(c, art["gyeranppang-bake-batter"], x, top);
        c.restore();
      }
      if (g.fill[i] > 1) {
        // overflow drips
        c.fillStyle = "#f3d27e";
        c.beginPath();
        c.ellipse(mx + MOLD_W / 2 - 6, top + 14, 9, 16, 0, 0, Math.PI * 2);
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
          c.moveTo(x - 4, y);
          c.lineTo(x + MOLD_W + 4, y);
          c.stroke();
        }
        c.setLineDash([]);
      }

      // egg that landed (fades a little once it is golden, the bake picture has its own yolk)
      const e = g.egg[i];
      if (e !== null) {
        c.globalAlpha = step === "bake" ? clamp(1 - (g.bake - 0.4) * 2) : 1;
        put(c, art["gyeranppang-egg-cracked"], mx + e - 30, top + MOLD_H * 0.32 - 27, 60, 55);
        c.globalAlpha = 1;
      }
    });

    // kettle / swinging egg above the current mold
    const mx = MOLDS[mold];
    if (step === "pour") {
      const flip = mold === MOLDS.length - 1; // last mold is near the right edge
      c.save();
      c.translate(mx, 0);
      if (flip) c.scale(-1, 1);
      if (g.pouring) c.rotate(0.12);
      put(c, art["gyeranppang-batter-kettle"], -5, 4, 105, 84);
      c.restore();
      if (g.pouring) {
        c.fillStyle = "#f3d27e";
        c.fillRect(mx - 3, 22, 6, top + MOLD_H * (1 - Math.min(1, g.fill[mold])) - 18);
      }
    }
    if (step === "egg") put(c, art["gyeranppang-egg-whole"], mx + g.eggX - 25, 24);
    if (step === "bake") {
      steam(c, 180, 100, t, 3);
      c.fillStyle = "rgba(255,140,40,0.15)";
      c.fillRect(14, 290 + Math.sin(t * 8) * 2, 332, 8);
    }
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
  const stepIndex = step === "pour" ? 0 : step === "egg" ? 1 : 2;
  const hint =
    step === "pour"
      ? `${mold + 1}번째 틀 · 꾹 누르고 있으면 반죽이 나와요. 점선 사이까지`
      : step === "egg"
        ? `${mold + 1}번째 틀 · 계란이 가운데 올 때 탭!`
        : g.bake < GOLDEN[0]
          ? "굽는 중… 노릇해지면 꺼내요"
          : g.bake <= GOLDEN[1]
            ? "지금이에요! 노릇노릇"
            : "타고 있어요!!";

  return (
    <div className="flex flex-col gap-5">
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
      {step === "bake" && <Gauge labels={["덜 익음", "노릇", "탐"]} pos={gaugePos(g.bake, 0, GOLDEN[0], GOLDEN[1], 1.25)} />}
      <Hint>{hint}</Hint>
      <Steps steps={["반죽", "계란", "굽기"]} current={stepIndex} />
      {step === "bake" && (
        <BottomBar>
          <button type="button" className="btn flex-1" onClick={finish}>
            꺼내기
          </button>
        </BottomBar>
      )}
    </div>
  );
}

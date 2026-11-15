"use client";

import { useRef, useState } from "react";
import { boardPoint, clamp, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import { put, useSprites, type Sprite } from "@/lib/sprites";
import { BottomBar, Hint, Steps } from "./Kit";
import type { GameProps } from "./types";

type Item = { key: string; label: string; color: string; wrong?: boolean };

const RICE: Item = { key: "rice", label: "밥", color: "#f6f2e8" };
const FILLINGS: Item[] = [
  { key: "danmuji", label: "단무지", color: "#f2c230" },
  { key: "ham", label: "햄", color: "#e8728a" },
  { key: "egg", label: "계란", color: "#f7dc6f" },
  { key: "spinach", label: "시금치", color: "#3f8f3a" },
  { key: "carrot", label: "당근", color: "#e8742c" },
];
// one thing that does NOT go in gimbap
const TRAP: Item = { key: "strawberry", label: "딸기", color: "#d6283c", wrong: true };
const BUTTONS = [RICE, ...FILLINGS.slice(0, 3), TRAP, ...FILLINGS.slice(3)];

const CUTS = 7; // 8 pieces
const ROLL_LEN = 220; // px of upward drag to roll it all
const TOO_FAST = 1.6; // px per ms, faster than this and the side bursts

const ROLL_X0 = 30;
const ROLL_X1 = 330;
const ROLL_Y = 136; // top of the finished roll (306x88 picture)

const ART = {
  "gimbap-mat": [320, 280],
  "gimbap-seaweed": [280, 220],
  "gimbap-rice": [270, 160],
  "gimbap-filling-danmuji": [240, 24],
  "gimbap-filling-ham": [240, 24],
  "gimbap-filling-egg": [240, 24],
  "gimbap-filling-spinach": [240, 24],
  "gimbap-filling-carrot": [240, 24],
  "gimbap-filling-strawberry": [60, 68],
  "gimbap-roll-half": [320, 200],
  "gimbap-roll-full": [306, 88],
  "gimbap-slice": [120, 120],
  "gimbap-knife": [220, 60],
} as const satisfies Record<string, [number, number]>;

export default function Gimbap({ onDone }: GameProps) {
  const ref = useBoard();
  const art = useSprites(ART);
  const [phase, setPhase] = useState<"fill" | "roll" | "cut">("fill");
  const [placed, setPlaced] = useState<Item[]>([]);
  const s = useRef({
    roll: 0,
    bursts: 0,
    burstAt: -10,
    drag: null as { y: number; t: number } | null,
    knifeX: 180,
    cuts: [] as number[],
    finishedAt: -1,
    done: false,
  });
  const [, setTick] = useState(0);

  function fillScore() {
    if (!placed.some((p) => p.key === "rice")) return 0;
    let score = 100;
    if (placed[0].key !== "rice") score -= 30;
    for (const f of FILLINGS) if (!placed.some((p) => p.key === f.key)) score -= 15;
    if (placed.some((p) => p.wrong)) score -= 40;
    return clamp(score, 0, 100);
  }

  function finish() {
    const g = s.current;
    if (g.done) return;
    g.done = true;

    const edges = [ROLL_X0, ...[...g.cuts].sort((a, b) => a - b), ROLL_X1];
    const widths = edges.slice(1).map((x, i) => x - edges[i]);
    const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
    const std = Math.sqrt(widths.reduce((a, w) => a + (w - mean) ** 2, 0) / widths.length);
    const cutScore = clamp(1 - (std / mean) * 2.2) * 100;
    const rollScore = clamp(1 - g.bursts * 0.35) * 100;
    const fill = fillScore();
    const score = Math.round(fill * 0.3 + rollScore * 0.3 + cutScore * 0.4);

    let note = "단면이 예술이에요";
    if (placed.some((p) => p.wrong)) note = "딸기가 들어갔어요…";
    else if (fill < 70) note = "재료가 빠졌어요";
    else if (g.bursts > 0) note = "옆구리가 터졌어요";
    else if (cutScore < 60) note = "두께가 들쭉날쭉해요";
    onDone(score, note, snapshot(ref.current));
  }

  function add(item: Item) {
    if (placed.some((p) => p.key === item.key)) return;
    setPlaced((p) => [...p, item]);
  }

  useLoop((_dt, t) => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    const g = s.current;
    if (g.finishedAt > 0 && t - g.finishedAt > 0.9) finish();
    draw(c, t);
    bulbLight(c, t);
  });

  // the laid-out sheet: seaweed, rice and fillings (clipped as it gets rolled up)
  function drawSheet(c: CanvasRenderingContext2D, a: Record<keyof typeof ART, Sprite>, bottom: number) {
    c.save();
    c.beginPath();
    c.rect(0, 0, 360, bottom);
    c.clip();
    put(c, a["gimbap-seaweed"], 40, 70);
    if (placed.some((p) => p.key === "rice")) put(c, a["gimbap-rice"], 45, 120);
    placed
      .filter((p) => p.key !== "rice")
      .forEach((f, i) => {
        if (f.key === "strawberry") put(c, a["gimbap-filling-strawberry"], 258, 84);
        else put(c, a[`gimbap-filling-${f.key}` as keyof typeof ART], 60, 150 + i * 26);
      });
    c.restore();
  }

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    c.fillStyle = "#3a3f47"; // steel counter
    c.fillRect(0, 0, 360, 360);
    if (!art) return;
    put(c, art["gimbap-mat"], 20, 40);

    if (phase === "fill") drawSheet(c, art, 360);

    if (phase === "roll") {
      if (g.roll < 0.5) {
        // first half: the sheet shrinks from the bottom and the roll grows
        const bottom = 290 - g.roll * 200;
        drawSheet(c, art, bottom);
        const h = 34 + g.roll * 60;
        put(c, art["gimbap-roll-full"], 34, bottom - h / 2, 292, h);
      } else {
        put(c, art["gimbap-roll-half"], 20, 70 + (g.roll - 0.5) * 80);
      }
      if (t - g.burstAt < 1.2) {
        // rice popping out the side
        c.fillStyle = "#f3eee2";
        c.beginPath();
        c.ellipse(322, 230, 12 + g.bursts * 4, 8, 0.3, 0, Math.PI * 2);
        c.fill();
      }
      if (g.roll < 0.15) {
        c.fillStyle = "rgba(255,243,214,0.92)";
        c.font = "600 16px 'IBM Plex Sans KR', sans-serif";
        c.textAlign = "center";
        c.fillText("↑ 천천히 위로 밀어요", 180, 28 + 10 * Math.abs(Math.sin(t * 2)));
      }
    }

    if (phase === "cut") {
      const sorted = [...g.cuts].sort((a, b) => a - b);
      if (g.finishedAt < 0) {
        put(c, art["gimbap-roll-full"], 27, ROLL_Y);
        c.strokeStyle = "rgba(243,238,226,0.9)";
        c.lineWidth = 2;
        for (const x of sorted) {
          c.beginPath();
          c.moveTo(x, ROLL_Y + 6);
          c.lineTo(x, ROLL_Y + 82);
          c.stroke();
        }
        // knife hangs above your finger, blade pointing down
        c.save();
        c.translate(g.knifeX, ROLL_Y + 14);
        c.rotate(-Math.PI / 2);
        put(c, art["gimbap-knife"], -8, -40);
        c.restore();
        c.fillStyle = "rgba(255,243,214,0.92)";
        c.font = "600 16px 'IBM Plex Sans KR', sans-serif";
        c.textAlign = "center";
        c.fillText(`탭해서 썰기 ${g.cuts.length}/${CUTS}`, 180, 300);
      } else {
        // the 8 slices zig-zag on the mat, a thicker slice looks bigger
        const edges = [ROLL_X0, ...sorted, ROLL_X1];
        edges.slice(1).forEach((x1, i) => {
          const size = Math.max(36, Math.min(86, (x1 - edges[i]) * 1.6));
          const cx = 52 + i * 36;
          const cy = 150 + (i % 2) * 64;
          put(c, art["gimbap-slice"], cx - size / 2, cy - size / 2, size, size);
        });
      }
    }
  }

  const g = s.current;

  return (
    <div className="flex flex-col gap-5">
      <canvas
        ref={ref}
        className="board"
        aria-label="김발 위 김밥"
        onPointerDown={(e) => {
          const p = boardPoint(e);
          if (phase === "roll") {
            e.currentTarget.setPointerCapture(e.pointerId);
            g.drag = { y: p.y, t: performance.now() };
          }
          if (phase === "cut" && g.finishedAt < 0) {
            g.knifeX = p.x;
            // a cut right on top of another one doesn't count
            if (p.x > ROLL_X0 + 4 && p.x < ROLL_X1 - 4 && g.cuts.every((x) => Math.abs(x - p.x) > 6)) {
              g.cuts.push(p.x);
              if (g.cuts.length >= CUTS) g.finishedAt = performance.now() / 1000;
              setTick((n) => n + 1);
            }
          }
        }}
        onPointerMove={(e) => {
          const p = boardPoint(e);
          if (phase === "cut") g.knifeX = p.x;
          if (phase === "roll" && g.drag) {
            const now = performance.now();
            const dy = g.drag.y - p.y;
            const speed = dy / Math.max(1, now - g.drag.t);
            if (dy > 0) {
              g.roll = clamp(g.roll + dy / ROLL_LEN);
              if (speed > TOO_FAST && now / 1000 - g.burstAt > 0.8) {
                g.bursts += 1;
                g.burstAt = now / 1000;
              }
            }
            g.drag = { y: p.y, t: now };
            if (g.roll >= 1) {
              g.drag = null;
              setPhase("cut");
            }
          }
        }}
        onPointerUp={() => (g.drag = null)}
      />

      {phase === "fill" && (
        <>
          <Hint>밥 먼저 깔고, 김밥에 들어가는 재료만 골라 올려요</Hint>
          <div className="grid grid-cols-4 gap-2">
            {BUTTONS.map((item) => {
              const on = placed.some((p) => p.key === item.key);
              return (
                <button key={item.key} type="button" onClick={() => add(item)} disabled={on} aria-pressed={on} className="chip">
                  <span className="size-3 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <BottomBar>
            <button type="button" className="btn flex-1" disabled={placed.length === 0} onClick={() => setPhase("roll")}>
              다 올렸어요, 말기
            </button>
          </BottomBar>
        </>
      )}
      {phase === "roll" && <Hint>김밥 위를 누른 채로 천천히 위로 밀어요. 너무 빠르면 옆구리가 터져요</Hint>}
      {phase === "cut" && <Hint>칼을 움직여서 탭. 8조각이 같은 두께가 되게 썰어요</Hint>}
      <Steps steps={["재료", "말기", "썰기"]} current={phase === "fill" ? 0 : phase === "roll" ? 1 : 2} />
    </div>
  );
}

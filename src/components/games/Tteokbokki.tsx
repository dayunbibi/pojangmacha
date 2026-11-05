"use client";

import { useRef, useState } from "react";
import { boardPoint, clamp, closeness, steam, useBoard, useLoop } from "@/lib/canvas";
import type { GameProps } from "./types";

const CX = 180;
const CY = 185;
const R = 140;

const REDUCE_SPEED = 1 / 13; // sauce gets thicker on its own
const GOOD = [0.7, 0.85]; // thickness you want to stop at
const OVERCOOKED = 1.25;

// rice cakes and fish cakes, placed once around the pan
const PIECES = Array.from({ length: 16 }, (_, i) => ({
  a: (i / 16) * Math.PI * 2 + (i % 3) * 0.3,
  r: 40 + ((i * 37) % 80),
  fish: i % 4 === 0,
  rot: (i * 1.3) % Math.PI,
}));

export default function Tteokbokki({ onDone }: GameProps) {
  const ref = useBoard();
  const s = useRef({
    thick: 0.15,
    stick: 0, // how much is sticking to the bottom right now
    burn: 0, // burnt taste that stays
    spin: 0, // total stirring angle, moves the pieces
    stirSpeed: 0,
    lastAngle: null as number | null,
    lastT: 0,
    stirring: false,
    done: false,
  });
  const [, setTick] = useState(0);
  const lastUi = useRef(0);

  function finish() {
    const g = s.current;
    if (g.done) return;
    g.done = true;
    const thickScore = closeness(g.thick, GOOD[0], GOOD[1], 0.35);
    const score = Math.round(thickScore * 65 + (1 - g.burn) * 35);

    let note = "국물이 딱 꾸덕해요";
    if (g.thick > 1) note = "국물이 다 졸아서 짜요";
    else if (g.thick < 0.55) note = "국물이 너무 묽어요";
    else if (g.burn > 0.4) note = "바닥이 눌어서 탄 맛이 나요";
    onDone(score, note);
  }

  useLoop((dt, t) => {
    const g = s.current;
    const c = ref.current?.getContext("2d");
    if (!c || g.done) return;

    g.thick += dt * REDUCE_SPEED;
    g.stirSpeed *= Math.pow(0.15, dt); // slows down when you stop
    if (g.stirSpeed > 2.5) g.stick = Math.max(0, g.stick - dt * 0.8);
    else g.stick = Math.min(1, g.stick + dt * (0.25 + g.thick * 0.3)); // thicker sauce sticks faster
    if (g.stick > 0.65) g.burn = Math.min(1, g.burn + dt * 0.3);
    if (g.thick >= OVERCOOKED) finish();

    draw(c, t);
    if (t - lastUi.current > 0.12) {
      lastUi.current = t;
      setTick((n) => n + 1);
    }
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    c.fillStyle = "#2b2f36";
    c.fillRect(0, 0, 360, 360);

    // gas flame ring under the pan
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      c.fillStyle = `rgba(80,140,255,${0.4 + 0.3 * Math.sin(t * 9 + i)})`;
      c.beginPath();
      c.arc(CX + Math.cos(a) * (R + 10), CY + Math.sin(a) * (R + 10), 5, 0, Math.PI * 2);
      c.fill();
    }

    // wide flat pan
    c.fillStyle = "#5c6066";
    c.beginPath();
    c.arc(CX, CY, R, 0, Math.PI * 2);
    c.fill();

    // sauce: watery orange -> thick deep red
    const k = clamp(g.thick / 1.1);
    const r = Math.round(232 - 60 * k);
    const gg = Math.round(110 - 80 * k);
    const b = Math.round(70 - 45 * k);
    c.fillStyle = `rgb(${r},${gg},${b})`;
    c.beginPath();
    c.arc(CX, CY, R - 10 - k * 18, 0, Math.PI * 2);
    c.fill();

    // burnt bits around the edge
    if (g.burn > 0.05) {
      c.strokeStyle = `rgba(30,15,10,${Math.min(0.8, g.burn)})`;
      c.lineWidth = 6 + g.burn * 10;
      c.beginPath();
      c.arc(CX, CY, R - 14, 0, Math.PI * 2);
      c.stroke();
    }

    // rice cakes and fish cakes go around when you stir
    for (const p of PIECES) {
      const a = p.a + g.spin * 0.7;
      const x = CX + Math.cos(a) * p.r;
      const y = CY + Math.sin(a) * p.r;
      c.save();
      c.translate(x, y);
      c.rotate(p.rot + g.spin * 0.4);
      if (p.fish) {
        c.fillStyle = "#e9c48c";
        c.beginPath();
        c.moveTo(-14, 10);
        c.lineTo(14, 10);
        c.lineTo(0, -14);
        c.closePath();
        c.fill();
      } else {
        c.fillStyle = "#f4e3cf";
        c.beginPath();
        c.roundRect(-16, -6, 32, 12, 6);
        c.fill();
        c.fillStyle = "rgba(190,40,20,0.55)"; // sauce coating
        c.fillRect(-14, -1, 28, 5);
      }
      c.restore();
    }

    // bubbles pop more as it reduces
    const n = 3 + Math.round(k * 9);
    c.strokeStyle = "rgba(255,200,170,0.6)";
    c.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const ph = (t * 1.3 + i * 0.37) % 1;
      const a = i * 2.39;
      const rr = 20 + ((i * 47) % 100);
      c.globalAlpha = 1 - ph;
      c.beginPath();
      c.arc(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 3 + ph * 6, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    steam(c, CX, 40, t, 4);

    if (g.spin < 1) {
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.font = "18px 'Do Hyeon', sans-serif";
      c.textAlign = "center";
      c.fillText("↻ 냄비 위에서 빙글빙글", CX, 350);
    }
  }

  function stir(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = s.current;
    const p = boardPoint(e);
    const angle = Math.atan2(p.y - CY, p.x - CX);
    const now = performance.now() / 1000;
    if (g.lastAngle !== null) {
      let d = angle - g.lastAngle;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const dt = Math.max(0.008, now - g.lastT);
      g.spin += d;
      g.stirSpeed = Math.max(g.stirSpeed, Math.abs(d) / dt);
    }
    g.lastAngle = angle;
    g.lastT = now;
  }

  const g = s.current;
  const thickPct = clamp(g.thick / 1.25) * 100;

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={ref}
        className="board"
        aria-label="떡볶이 냄비. 원을 그리며 저으세요."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          g.stirring = true;
          g.lastAngle = null;
          stir(e);
        }}
        onPointerMove={(e) => g.stirring && stir(e)}
        onPointerUp={() => (g.stirring = false)}
      />
      <div className="flex flex-col gap-1.5 rounded-md bg-night-soft px-3 py-2 text-sm">
        <div className="flex justify-between">
          <span>국물 농도</span>
          <span className={g.stick > 0.65 ? "text-stool" : "text-ink-dim"}>{g.stick > 0.65 ? "바닥 눌어붙는 중!" : "잘 젓고 있어요"}</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-black/40">
          <div className="absolute inset-y-0 left-0 rounded-full bg-tarp" style={{ width: `${thickPct}%` }} />
          {/* the zone where you should turn the fire off */}
          <div
            className="absolute inset-y-0 rounded-full border-2 border-bulb"
            style={{ left: `${(GOOD[0] / 1.25) * 100}%`, width: `${((GOOD[1] - GOOD[0]) / 1.25) * 100}%` }}
          />
        </div>
      </div>
      <button type="button" className="btn" onClick={finish}>
        불 끄고 담기
      </button>
    </div>
  );
}

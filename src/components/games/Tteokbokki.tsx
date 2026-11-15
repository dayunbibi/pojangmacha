"use client";

import { useRef, useState } from "react";
import { boardPoint, closeness, steam, useBoard, useLoop, bulbLight, snapshot } from "@/lib/canvas";
import { crossfade, put, useSprites } from "@/lib/sprites";
import { BottomBar, Gauge, gaugePos, Hint, Steps } from "./Kit";
import type { GameProps } from "./types";

const CX = 180;
const CY = 180;

const ART = {
  "tteokbokki-gas-flame": [360, 360],
  "tteokbokki-pan": [360, 360],
  "tteokbokki-sauce-thin": [360, 360],
  "tteokbokki-sauce-right": [360, 360],
  "tteokbokki-sauce-thick": [360, 360],
  "tteokbokki-scorched-edge": [360, 360],
  "tteokbokki-rice-cake": [68, 30],
  "tteokbokki-fishcake": [76, 48],
} as const satisfies Record<string, [number, number]>;

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
  const art = useSprites(ART);
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
    onDone(score, note, snapshot(ref.current));
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
    bulbLight(c, t);
    if (t - lastUi.current > 0.12) {
      lastUi.current = t;
      setTick((n) => n + 1);
    }
  });

  function draw(c: CanvasRenderingContext2D, t: number) {
    const g = s.current;
    c.fillStyle = "#14161c";
    c.fillRect(0, 0, 360, 360);
    if (!art) return;

    c.globalAlpha = 0.75 + 0.25 * Math.abs(Math.sin(t * 2.2));
    put(c, art["tteokbokki-gas-flame"], 0, 0);
    c.globalAlpha = 1;
    put(c, art["tteokbokki-pan"], 0, 0);

    // sauce gets darker and thicker as it reduces
    crossfade(
      c,
      [
        { sprite: art["tteokbokki-sauce-thin"], from: 0 },
        { sprite: art["tteokbokki-sauce-right"], from: 0.55 },
        { sprite: art["tteokbokki-sauce-thick"], from: 0.95 },
      ],
      g.thick,
      0,
      0,
      undefined,
      undefined,
      0.15,
    );

    if (g.burn > 0.02) {
      c.globalAlpha = Math.min(1, g.burn * 1.4);
      put(c, art["tteokbokki-scorched-edge"], 0, 0);
      c.globalAlpha = 1;
    }

    // rice cakes and fish cakes go around when you stir
    for (const p of PIECES) {
      const a = p.a + g.spin * 0.7;
      c.save();
      c.translate(CX + Math.cos(a) * p.r, CY + Math.sin(a) * p.r);
      c.rotate(p.rot + g.spin * 0.4);
      if (p.fish) put(c, art["tteokbokki-fishcake"], -26, -16, 52, 33);
      else put(c, art["tteokbokki-rice-cake"], -27, -12, 54, 24);
      c.restore();
    }

    // bubbles pop more as it reduces
    const k = Math.min(1, g.thick / 1.1);
    c.strokeStyle = "rgba(255,200,170,0.55)";
    c.lineWidth = 2;
    for (let i = 0; i < 3 + Math.round(k * 9); i++) {
      const ph = (t * 1.3 + i * 0.37) % 1;
      const a = i * 2.39;
      const rr = 20 + ((i * 47) % 100);
      c.globalAlpha = 1 - ph;
      c.beginPath();
      c.arc(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 3 + ph * 6, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    steam(c, CX, 46, t, 4);

    if (g.spin < 1) {
      c.fillStyle = "rgba(255,243,214,0.92)";
      c.font = "600 16px 'IBM Plex Sans KR', sans-serif";
      c.textAlign = "center";
      c.fillText("↻ 냄비 위에서 빙글빙글", CX, 348);
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
  const burning = g.stick > 0.65;

  return (
    <div className="flex flex-col gap-5">
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
      <Gauge labels={["묽음", "딱 좋음", "졸음"]} pos={gaugePos(g.thick, 0.15, GOOD[0], GOOD[1], OVERCOOKED)} />
      <Hint>
        {burning ? <span className="font-semibold text-chair-500">바닥이 눌어붙고 있어요! 저어주세요</span> : "빙글빙글 저어서 눌어붙지 않게, 딱 좋을 때 불을 꺼요"}
      </Hint>
      <Steps steps={["젓기", "불 끄기"]} current={g.thick >= GOOD[0] ? 1 : 0} />
      <BottomBar>
        <button type="button" className="btn flex-1" onClick={finish}>
          불 끄고 담기
        </button>
      </BottomBar>
    </div>
  );
}

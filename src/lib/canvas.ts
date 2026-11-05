"use client";

import { useEffect, useRef } from "react";

// Every cooking game draws on a 360x360 board and the canvas scales it to the screen.
export const SIZE = 360;

export function useBoard() {
  const ref = useRef<HTMLCanvasElement>(null);

  // match the canvas pixels to the screen so lines stay sharp on phones
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  return ref;
}

// pointer position in board coordinates (0..360)
export function boardPoint(e: React.PointerEvent<HTMLCanvasElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
}

// requestAnimationFrame loop with dt in seconds. `tick` is read from a ref
// so the loop doesn't restart every render.
export function useLoop(tick: (dt: number, t: number) => void, running = true) {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // tab switches shouldn't jump the game
      last = now;
      tickRef.current(dt, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// 1 at the center of [lo, hi], fading to 0 at `fall` outside of it
export function closeness(v: number, lo: number, hi: number, fall: number) {
  if (v >= lo && v <= hi) return 1;
  const d = v < lo ? lo - v : v - hi;
  return clamp(1 - d / fall);
}

// pale raw meat -> grilled brown -> burnt black
export function cookColor(level: number) {
  const stops: [number, number[]][] = [
    [0, [226, 140, 140]],
    [0.5, [176, 96, 60]],
    [0.8, [120, 62, 32]],
    [1.1, [40, 28, 24]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (level <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const t = clamp((level - a) / (b - a));
      const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(40,28,24)";
}

export function steam(c: CanvasRenderingContext2D, x: number, y: number, t: number, n = 3) {
  c.save();
  c.strokeStyle = "rgba(255,255,255,0.35)";
  c.lineWidth = 3;
  c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const phase = (t * 0.6 + i / n) % 1;
    const sx = x + (i - (n - 1) / 2) * 22;
    const sy = y - phase * 40;
    c.globalAlpha = 1 - phase;
    c.beginPath();
    c.moveTo(sx, sy);
    c.bezierCurveTo(sx - 8, sy - 10, sx + 8, sy - 18, sx, sy - 28);
    c.stroke();
  }
  c.restore();
}

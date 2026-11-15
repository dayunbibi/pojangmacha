"use client";

import { useEffect, useState } from "react";

// Illustrations from the design handoff live in public/art/<group>/<name>.svg.
// Some SVGs use filters (paper grain), which are slow to redraw every frame on Safari,
// so each one is drawn once onto its own canvas and the game draws that bitmap instead.

export type Sprite = HTMLCanvasElement & { w: number; h: number };

const GROUPS: Record<string, string> = { guest: "guests" };

export function artUrl(name: string) {
  const prefix = name.split("-")[0];
  return `/art/${GROUPS[prefix] ?? prefix}/${name}.svg`;
}

const cache = new Map<string, Promise<Sprite>>();

export function loadSprite(name: string, w: number, h: number): Promise<Sprite> {
  const key = `${name}@${w}x${h}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = artUrl(name);
      await img.decode();
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 1.25; // a bit extra for the zoomed plate
      const c = document.createElement("canvas") as Sprite;
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      c.w = w;
      c.h = h;
      return c;
    })();
    cache.set(key, p);
  }
  return p;
}

// sizes come from the handoff's assets-manifest (viewBox sizes)
export type SpriteDefs = Record<string, [number, number]>;

// loads a set of sprites; returns null until all of them are ready
export function useSprites<T extends SpriteDefs>(defs: T) {
  const [sprites, setSprites] = useState<Record<keyof T, Sprite> | null>(null);
  useEffect(() => {
    let alive = true;
    const names = Object.keys(defs);
    Promise.all(names.map((n) => loadSprite(n, defs[n][0], defs[n][1])))
      .then((list) => {
        if (!alive) return;
        setSprites(Object.fromEntries(names.map((n, i) => [n, list[i]])) as Record<keyof T, Sprite>);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // the defs object is a module constant in every game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sprites;
}

// draw a sprite at its design size (or a given size)
export function put(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, w = s.w, h = s.h) {
  c.drawImage(s, x, y, w, h);
}

// fade between state pictures (raw -> cooked -> burnt) instead of a hard switch
export function crossfade(
  c: CanvasRenderingContext2D,
  steps: { sprite: Sprite; from: number }[], // sorted by `from`
  value: number,
  x: number,
  y: number,
  w?: number,
  h?: number,
  band = 0.08,
) {
  let i = 0;
  while (i + 1 < steps.length && value >= steps[i + 1].from) i++;
  put(c, steps[i].sprite, x, y, w, h);
  const next = steps[i + 1];
  if (next && value > next.from - band) {
    c.save();
    c.globalAlpha = Math.min(1, (value - (next.from - band)) / band);
    put(c, next.sprite, x, y, w, h);
    c.restore();
  }
}

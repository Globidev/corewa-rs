import { useRef } from "react";

function toRgb(color: number): [number, number, number] {
  color >>>= 0;

  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16;

  return [r, g, b];
}

export function toCssColor(color: number) {
  const [r, g, b] = toRgb(color).map((comp) =>
    comp.toString(16).padStart(2, "0")
  );

  return `#${r}${g}${b}`;
}

export function contrastingColor(color: number): number {
  const [r, g, b] = toRgb(color);
  const v = (r + g + b) / 3 > 128 ? 0x30 : 0xd0;

  return (v << 16) | (v << 8) | v;
}

export function clamp(num: number, [min, max]: [number, number]): number {
  return Math.min(Math.max(num, min), max);
}

export type Radix = 10 | 16;

export function formatNumber(num: number, radix: Radix): string {
  switch (radix) {
    case 10:
      return num.toString(10);
    case 16: {
      const numStr = remEuclid(num, 0x1_0000_0000).toString(16);
      return `0x${numStr.toUpperCase()}`;
    }
  }
}

export function remEuclid(x: number, m: number) {
  return ((x % m) + m) % m;
}

export function useDebouncer<Args extends unknown[]>(
  timeoutMs: number,
  action: (...args: Args) => void
) {
  const timeoutHandle = useRef<number>();

  const schedule = (...args: Args) => {
    clearTimeout(timeoutHandle.current);
    timeoutHandle.current = setTimeout(() => action(...args), timeoutMs);
  };

  return schedule;
}

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
  const v = (r + g + b) / 3 > 128 ? 0x30 : 0x90;

  return (v << 16) | (v << 8) | v;
}

import { parseColor, toHex } from "./color";

/*
 * APCA 0.0.98G-4g (https://github.com/Myndex/apca-w3), the contrast method
 * in the WCAG 3 working draft. Unlike the WCAG 2 ratio it depends on which
 * color is the text, and dark mode pairs read lower than the same pair
 * inverted. Informational only: WCAG 2.2 is still the legal baseline.
 */

const screenY = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  return 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
};

// biome-ignore lint/suspicious/noApproximativeNumericConstant: APCA's own exponent, not √2.
const softClamp = (y: number) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y);

/**
 * APCA lightness contrast (Lc) of text on a background, about -108 to 106.
 * Positive is dark text on a light background, negative light on dark.
 * Body text wants |Lc| ≥ 75 (90 preferred), large text ≥ 60, non-text ≥ 45.
 */
export function apca(text: string, background: string): number {
  const txt = softClamp(screenY(toHex(parseColor(text))));
  const bg = softClamp(screenY(toHex(parseColor(background))));
  if (Math.abs(bg - txt) < 0.0005) return 0;
  let out: number;
  if (bg > txt) {
    const sapc = (bg ** 0.56 - txt ** 0.57) * 1.14;
    out = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    const sapc = (bg ** 0.65 - txt ** 0.62) * 1.14;
    out = sapc > -0.1 ? 0 : sapc + 0.027;
  }
  return Math.round(out * 1000) / 10;
}

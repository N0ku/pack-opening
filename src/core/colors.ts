import type { FxColor } from './types.js';

/**
 * Splits a list of CSS colours on the commas and spaces that are not inside parentheses:
 * `"oklch(0.7 0.1 300) #fff"` and `"rgb(1, 2, 3), gold"` both give two colours.
 * Returns `null` when there is no colour at all.
 */
export function parseColorList(value: FxColor | null | undefined): readonly string[] | null {
  if (value === null || value === undefined) return null;
  const items = typeof value === 'string' ? splitColors(value) : value.map((item) => item.trim());
  const colors = items.filter(Boolean);
  return colors.length ? Object.freeze(colors) : null;
}

function splitColors(value: string): string[] {
  const colors: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (char === ',' || /\s/.test(char))) {
      colors.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  colors.push(current.trim());
  return colors;
}

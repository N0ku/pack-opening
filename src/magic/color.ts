import type { EffectHost } from '../core/effects/registry.js';
import type { FxFeature } from '../core/types.js';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };

const cache = new Map<string, Rgb | null>();
let probe: CanvasRenderingContext2D | null = null;

/** Any colour the browser understands (named, hex, rgb, hsl, oklch…) as sRGB bytes, or `null`. */
export function toRgb(color: string): Rgb | null {
  const key = color.trim();
  const known = cache.get(key);
  if (known !== undefined) return known;
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', {
    willReadFrequently: true,
  });
  let rgb: Rgb | null = null;
  if (probe && key && isColor(probe, key)) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = key;
    probe.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
    rgb = { r, g, b };
  }
  cache.set(key, rgb);
  return rgb;
}

// An invalid colour leaves `fillStyle` as it was: it parses only if two different starting values agree.
function isColor(ctx: CanvasRenderingContext2D, color: string): boolean {
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  const first = ctx.fillStyle;
  ctx.fillStyle = '#fff';
  ctx.fillStyle = color;
  return first === ctx.fillStyle;
}

export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: Math.round(a.r + (b.r - a.r) * amount),
  g: Math.round(a.g + (b.g - a.g) * amount),
  b: Math.round(a.b + (b.b - a.b) * amount),
});

export const rgba = ({ r, g, b }: Rgb, alpha: number): string => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** Rarity colour of a card (`--po-card-glow` from the theme), except for common cards. */
function rarityColor(card: HTMLElement): string | null {
  const { rarity } = card.dataset;
  if (!rarity || rarity === 'common') return null;
  return getComputedStyle(card).getPropertyValue('--po-card-glow').trim() || null;
}

/**
 * Colours of an effect, by priority: `fxColors[effect]`, the rarity colour of `card` (glimmer,
 * wake), `fxColor`, then the `--po-fx-<effect>-color` token.
 */
export function paletteOf(host: EffectHost, effect: FxFeature, card?: HTMLElement): Rgb[] {
  const { fxColor, fxColors } = host.options;
  const rarity = card ? rarityColor(card) : null;
  const list = fxColors[effect] ??
    (rarity ? [rarity] : null) ??
    fxColor ?? [getComputedStyle(host.root).getPropertyValue(`--po-fx-${effect}-color`)];
  const colors = list.map(toRgb).filter((color): color is Rgb => color !== null);
  return colors.length ? colors : [WHITE];
}

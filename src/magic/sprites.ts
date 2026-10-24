import { WHITE, mix, rgba, type Rgb } from './color.js';

export type SpriteShape = 'glow' | 'star';

const SIZE = 64;
const sprites = new Map<string, HTMLCanvasElement>();

/**
 * Pre-rendered particle images, one per shape and colour: a soft halo with a white-hot core, or a
 * four-pointed sparkle in its halo. Drawn with additive blending, they add up into light.
 */
export function sprite(shape: SpriteShape, color: Rgb): HTMLCanvasElement {
  const key = `${shape}:${color.r},${color.g},${color.b}`;
  const known = sprites.get(key);
  if (known) return known;

  const canvas = Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE });
  const ctx = canvas.getContext('2d')!;
  const c = SIZE / 2;
  const core = mix(color, WHITE, 0.7);

  const halo = (alpha: number, reach: number) => {
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c * reach);
    gradient.addColorStop(0, rgba(core, alpha));
    gradient.addColorStop(0.2, rgba(color, alpha * 0.85));
    gradient.addColorStop(0.5, rgba(color, alpha * 0.28));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);
  };

  if (shape === 'glow') {
    halo(1, 1);
  } else {
    halo(0.45, 0.7);
    // Four concave branches meeting at the centre.
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.quadraticCurveTo(c, c, SIZE, c);
    ctx.quadraticCurveTo(c, c, c, SIZE);
    ctx.quadraticCurveTo(c, c, 0, c);
    ctx.quadraticCurveTo(c, c, c, 0);
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, rgba(WHITE, 1));
    gradient.addColorStop(0.25, rgba(core, 0.95));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  sprites.set(key, canvas);
  return canvas;
}

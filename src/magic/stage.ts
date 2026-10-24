import { animate, createTimer, type AnimationParams, type JSAnimation, type Timer } from 'animejs';
import { rgba, type Rgb } from './color.js';
import { sprite, type SpriteShape } from './sprites.js';

export type ParticleShape = SpriteShape | 'ring';

/**
 * A particle is a plain object: anime.js animates its numbers, the stage draws it every frame.
 * Coordinates are CSS pixels in the canvas.
 */
export interface Particle {
  x: number;
  y: number;
  /** Diameter of the halo (or of the ring). */
  size: number;
  alpha: number;
  /** Radians (stars). */
  rotation: number;
  shape: ParticleShape;
  color: Rgb;
  /** 0: steady light, up to 1: twinkles down to nothing (slowly, well under 3 flashes a second). */
  twinkle: number;
  /** Random offset of the twinkle and the wobble. */
  phase: number;
  /** Sideways drift, in pixels. */
  wobble: number;
  /** Stroke width of a ring. */
  line: number;
  /** Height of a ring relative to its width (1: circle). */
  squash: number;
  /** When set, the particle orbits (`cx`, `cy`): `angle` and `radius` place it instead of `x` / `y`. */
  orbit: boolean;
  cx: number;
  cy: number;
  angle: number;
  radius: number;
}

export const particle = (init: Partial<Particle> & Pick<Particle, 'color'>): Particle => ({
  x: 0,
  y: 0,
  size: 12,
  alpha: 0,
  rotation: 0,
  shape: 'glow',
  twinkle: 0,
  phase: Math.random() * Math.PI * 2,
  wobble: 0,
  line: 2,
  squash: 1,
  orbit: false,
  cx: 0,
  cy: 0,
  angle: 0,
  radius: 0,
  ...init,
});

/** A per-particle value for anime.js: function-based values receive each target and its index. */
export const each =
  <T>(value: (p: Particle, index: number) => T) =>
  (target: unknown, index?: number): T =>
    value(target as Particle, index ?? 0);

/** An element's box, in canvas coordinates. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_DPR = 2;
// Radians per millisecond: about one twinkle a second, a slow sway for the wobble.
const TWINKLE_SPEED = 0.006;
const WOBBLE_SPEED = 0.0016;

export interface StageOptions {
  /** Most particles alive at once. */
  budget(): number;
  /** How far particles may go past the component, in px. */
  bleed(): number;
}

/**
 * The particle canvas of one component. One anime.js timer draws every frame while something is
 * alive (particles or emitters), and pauses as soon as the canvas is empty.
 *
 * The canvas reaches `bleed` px past the component (base.css), and sideways only as far as the
 * viewport goes: a wider canvas would make the page scroll horizontally.
 */
export class FxStage {
  readonly #canvas: HTMLCanvasElement;
  readonly #root: HTMLElement;
  readonly #ctx: CanvasRenderingContext2D | null;
  readonly #options: StageOptions;
  readonly #particles = new Set<Particle>();
  readonly #emitters = new Set<(now: number) => void>();
  readonly #animations = new Map<JSAnimation, () => void>();
  readonly #timer: Timer;
  readonly #resize: ResizeObserver | null;
  #dpr = 1;
  #painted = false;

  constructor(canvas: HTMLCanvasElement, root: HTMLElement, options: StageOptions) {
    this.#canvas = canvas;
    this.#root = root;
    this.#ctx = canvas.getContext('2d');
    this.#options = options;
    this.#timer = createTimer({ autoplay: false, onUpdate: () => this.#frame() });
    this.#resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.#fit);
    // The component (room on the sides) and the canvas itself (shown once an effect is attached).
    this.#resize?.observe(root);
    this.#resize?.observe(canvas);
    addEventListener('resize', this.#fit);
    this.#fit();
  }

  get size(): number {
    return this.#particles.size;
  }

  boxOf(el: Element): Box {
    const canvas = this.#canvas.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return { x: rect.left - canvas.left, y: rect.top - canvas.top, width: rect.width, height: rect.height };
  }

  /**
   * Puts particles on stage (as many as the budget allows) and animates them with anime.js.
   * They leave the stage when the animation ends; the promise resolves then (or on destroy).
   */
  animate(particles: readonly Particle[], params: AnimationParams): Promise<void> {
    const room = Math.max(0, Math.floor(this.#options.budget()) - this.#particles.size);
    const kept = particles.slice(0, room);
    if (!kept.length || !this.#ctx) return Promise.resolve();
    kept.forEach((p) => this.#particles.add(p));
    this.#wake();
    return new Promise((resolve) => {
      // A zero-length animation completes inside `animate()`, before it is even returned.
      let animation: JSAnimation | null = null;
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        kept.forEach((p) => this.#particles.delete(p));
        if (animation) this.#animations.delete(animation);
        resolve();
      };
      animation = animate(kept, { ...params, onComplete: done });
      if (!finished) this.#animations.set(animation, done);
    });
  }

  /** Calls `emit` on every frame until the returned function is called. */
  every(emit: (now: number) => void): () => void {
    this.#emitters.add(emit);
    this.#wake();
    return () => this.#emitters.delete(emit);
  }

  destroy(): void {
    this.#emitters.clear();
    for (const [animation, done] of this.#animations) {
      animation.cancel();
      done();
    }
    this.#particles.clear();
    this.#timer.cancel();
    this.#resize?.disconnect();
    removeEventListener('resize', this.#fit);
    this.#clear();
    for (const name of ['--po-fx-left', '--po-fx-right']) this.#canvas.style.removeProperty(name);
  }

  #wake(): void {
    if (!this.#timer.paused) return;
    this.#fit();
    this.#timer.play();
  }

  /** Room on each side within the viewport, then the bitmap at the displayed size (device pixels, capped). */
  #fit = (): void => {
    const bleed = this.#options.bleed();
    const host = this.#root.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    const room = (space: number) => `${Math.round(Math.min(bleed, Math.max(0, space)))}px`;
    this.#canvas.style.setProperty('--po-fx-left', room(host.left));
    this.#canvas.style.setProperty('--po-fx-right', room(viewport - host.right));

    const { width, height } = this.#canvas.getBoundingClientRect();
    this.#dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    const w = Math.round(width * this.#dpr);
    const h = Math.round(height * this.#dpr);
    if (this.#canvas.width !== w) this.#canvas.width = w;
    if (this.#canvas.height !== h) this.#canvas.height = h;
  };

  #clear(): void {
    if (!this.#painted || !this.#ctx) return;
    this.#ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#painted = false;
  }

  #frame(): void {
    const now = performance.now();
    this.#emitters.forEach((emit) => emit(now));
    this.#clear();
    const ctx = this.#ctx;
    if (!ctx || !this.#particles.size) {
      if (!this.#emitters.size) this.#timer.pause();
      return;
    }
    ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.#particles) this.#draw(ctx, p, now);
    ctx.globalAlpha = 1;
    this.#painted = true;
  }

  #draw(ctx: CanvasRenderingContext2D, p: Particle, now: number): void {
    const twinkle = p.twinkle ? 1 - p.twinkle * (0.5 + 0.5 * Math.sin(now * TWINKLE_SPEED + p.phase)) : 1;
    const alpha = Math.min(1, p.alpha * twinkle);
    if (alpha <= 0.004 || p.size <= 0.2) return;
    let x = p.orbit ? p.cx + Math.cos(p.angle) * p.radius : p.x;
    const y = p.orbit ? p.cy + Math.sin(p.angle) * p.radius : p.y;
    if (p.wobble) x += Math.sin(now * WOBBLE_SPEED + p.phase) * p.wobble;
    ctx.globalAlpha = alpha;

    if (p.shape === 'ring') {
      const rx = p.size / 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * p.squash, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(p.color, 1);
      ctx.lineWidth = p.line * 4;
      ctx.globalAlpha = alpha * 0.25;
      ctx.stroke();
      ctx.lineWidth = p.line;
      ctx.globalAlpha = alpha;
      ctx.stroke();
      return;
    }

    const image = sprite(p.shape, p.color);
    const half = p.size / 2;
    if (p.rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rotation);
      ctx.drawImage(image, -half, -half, p.size, p.size);
      ctx.restore();
    } else {
      ctx.drawImage(image, x - half, y - half, p.size, p.size);
    }
  }
}

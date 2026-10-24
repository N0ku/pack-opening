import { clamp } from '../utils.js';

export interface TearPathOptions {
  /** Tear line position, as a fraction of the pack height (0–1). */
  line: number;
  /** Number of zigzag teeth across the width. */
  teeth?: number;
  /** Max vertical deviation of a tooth, as a fraction of the pack height. */
  jitter?: number;
  /** Extra height given to the top strip so both halves overlap and no seam shows. */
  overlap?: number;
  seed?: number;
}

export interface TearPath {
  /** `clip-path` value for the strip that gets torn off. */
  top: string;
  /** `clip-path` value for the rest of the pack. */
  body: string;
  /** Tear line vertices in percent, `[x, y]`, from left to right. */
  points: Array<[number, number]>;
}

/** Small deterministic PRNG (mulberry32) so a seed always gives the same tear. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const toPoint = ([x, y]: [number, number]) => `${x}% ${y}%`;

export function createTearPath({
  line,
  teeth = 16,
  jitter = 0.012,
  overlap = 0.002,
  seed = 1,
}: TearPathOptions): TearPath {
  const rand = seededRandom(seed);
  const segments = Math.max(1, Math.round(teeth)) * 2;
  const points: Array<[number, number]> = [];

  for (let i = 0; i <= segments; i++) {
    // Alternate peaks and valleys, each with a random amplitude.
    const side = i % 2 === 0 ? -1 : 1;
    const amplitude = jitter * (0.35 + rand() * 0.65);
    points.push([round((i / segments) * 100), round(clamp(line + side * amplitude) * 100)]);
  }

  const topEdge = [...points]
    .reverse()
    .map(([x, y]): [number, number] => [x, round(Math.min(100, y + overlap * 100))]);

  return {
    top: `polygon(0% 0%, 100% 0%, ${topEdge.map(toPoint).join(', ')})`,
    body: `polygon(${points.map(toPoint).join(', ')}, 100% 100%, 0% 100%)`,
    points,
  };
}

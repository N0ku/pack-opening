import type { CardParts } from '../../core/parts.js';
import { readDuration } from '../../core/utils.js';
import { pick, random, type Magic } from '../context.js';
import { each, particle, type Particle } from '../stage.js';

const MAX_PER_FRAME = 16;

/** `wake`: a trail of light behind a card sent away, for as long as it leaves. */
export function wake(magic: Magic, { card }: CardParts, direction: 1 | -1): () => void {
  const { stage, host } = magic;
  const leave = readDuration(host.root, '--po-motion-card-leave', 420) / host.options.speed;
  const palette = magic.palette('wake', card);
  const life = magic.time('--po-motion-fx-wake', 650);
  const density = magic.number('--po-fx-wake-density', 0.25);
  const size = magic.particleSize();
  const start = performance.now();
  let previous: { x: number; y: number } | null = null;
  let carry = 0;

  const stop = stage.every((now) => {
    if (now - start > leave || !card.isConnected) return stop();
    const box = stage.boxOf(card);
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const from = previous ?? centre;
    previous = centre;
    carry += Math.hypot(centre.x - from.x, centre.y - from.y) * density;
    const count = Math.min(Math.floor(carry), MAX_PER_FRAME);
    if (!count) return;
    carry -= count;

    // Along the trailing edge, opposite to the way the card goes.
    const edge = direction > 0 ? box.x : box.x + box.width;
    const motes: Particle[] = Array.from({ length: count }, () =>
      particle({
        x: edge + random(-6, 6, 1),
        y: box.y + random(0.08, 0.92, 3) * box.height,
        size: size * random(1.4, 3.4, 2),
        color: pick(palette),
        shape: Math.random() < 0.35 ? 'star' : 'glow',
      }),
    );
    void stage.animate(motes, {
      x: each((p) => p.x - direction * random(6, 30, 1)),
      y: each((p) => p.y + random(-10, 10, 1)),
      alpha: [0.9, 0],
      size: each((p) => [p.size, p.size * 0.2]),
      duration: () => life * random(0.6, 1, 2),
      ease: 'outQuad',
    });
  });
  return stop;
}

import { readDuration } from '../../core/utils.js';
import { pick, random, type Magic } from '../context.js';
import { each, particle } from '../stage.js';

/**
 * `shimmer`: once a card of the summary has slid in, glitters light up across it in a diagonal
 * wave (magic.css adds the matching sheen). Cards follow each other with the summary's stagger.
 */
export function shimmer(magic: Magic): () => void {
  const { stage, host } = magic;
  const speed = host.options.speed;
  const enter = readDuration(host.root, '--po-motion-summary-in', 420) / speed;
  const step = readDuration(host.root, '--po-motion-summary-stagger', 70) / speed;
  const life = magic.time('--po-motion-fx-shimmer', 1400);
  const count = Math.round(magic.number('--po-fx-shimmer-count', 12));
  const size = magic.particleSize();
  const start = performance.now();
  const waiting = host.parts.cardList.map(({ card }, i) => ({ card, at: enter * 0.7 + i * step }));

  const stop = stage.every((now) => {
    for (const item of waiting.filter(({ at }) => now - start >= at)) {
      waiting.splice(waiting.indexOf(item), 1);
      const box = stage.boxOf(item.card);
      const palette = magic.palette('shimmer');
      const spots = Array.from({ length: count }, () => ({ u: Math.random(), v: Math.random() }));
      const glitters = spots.map(({ u, v }) =>
        particle({
          x: box.x + u * box.width,
          y: box.y + v * box.height,
          size: 0,
          color: pick(palette),
          shape: 'star',
          rotation: random(0, 3, 2),
        }),
      );
      void stage.animate(glitters, {
        size: () => [0, size * random(2.4, 4.2, 2), 0],
        alpha: [0, 1, 0],
        duration: life * 0.35,
        // Top-left corner first: a wave across the card.
        delay: each((_, i) => ((spots[i]!.u + spots[i]!.v) / 2) * life * 0.65),
        ease: 'inOutSine',
      });
    }
    if (!waiting.length) stop();
  });
  return stop;
}

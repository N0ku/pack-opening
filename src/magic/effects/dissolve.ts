import { readDuration, readNumber } from '../../core/utils.js';
import { pick, random, type Magic } from '../context.js';
import { silhouette } from '../sample.js';
import { each, particle } from '../stage.js';

/**
 * `dissolve`: the empty pack falls apart from the bottom up, in step with the mask sweep of
 * magic.css; each grain drifts up and away.
 */
export function dissolve(magic: Magic): void {
  const { stage, host } = magic;
  const box = stage.boxOf(host.parts.pack);
  if (!box.width) return;
  const line = readNumber(host.root, '--po-tear-line', 0.14);
  const point = silhouette(host.parts.packBody.querySelector('img'), line);
  const palette = magic.palette('dissolve');
  const sweep = readDuration(host.root, '--po-motion-settle', 750) / host.options.speed;
  const life = magic.time('--po-motion-fx-dissolve', 900);
  const size = magic.particleSize();

  const grains = Array.from({ length: Math.round(magic.number('--po-fx-dissolve-count', 110)) }, () => {
    const { x, y } = point();
    return { x: box.x + x * box.width, y: box.y + y * box.height, delay: ((1 - y) / (1 - line)) * sweep * 0.8 };
  });
  const motes = grains.map((grain) =>
    particle({ x: grain.x, y: grain.y, size: size * random(1.4, 3.2, 2), color: pick(palette), wobble: random(0, 8, 1) }),
  );
  void stage.animate(motes, {
    x: each((_, i) => grains[i]!.x + random(-40, 40, 1)),
    y: each((_, i) => grains[i]!.y - random(30, 110, 1)),
    alpha: [0, 1, 0],
    size: each((p) => [p.size, p.size * 0.3]),
    duration: () => life * random(0.6, 1, 2),
    delay: each((_, i) => grains[i]!.delay),
    ease: 'outCubic',
  });
}

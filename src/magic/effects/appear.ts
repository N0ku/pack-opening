import { stagger } from 'animejs';
import { pick, random, type Magic } from '../context.js';
import { silhouette } from '../sample.js';
import { each, particle } from '../stage.js';

/**
 * `appear`: motes spiral in from a wide ring and land on the silhouette of the pack, which
 * materialises meanwhile (magic.css), then a soft flash seals it. Resolves once it is over.
 */
export function appear(magic: Magic): Promise<void> {
  const { stage, host } = magic;
  const box = stage.boxOf(host.parts.pack);
  if (!box.width) return Promise.resolve();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const palette = magic.palette('appear');
  const count = Math.round(magic.number('--po-fx-appear-count', 56));
  const converge = magic.time('--po-motion-fx-converge', 900);
  const size = magic.particleSize();
  const reach = Math.max(box.width, box.height) * 0.7;
  const point = silhouette(host.parts.packBody.querySelector('img'));

  // Polar coordinates of the landing points, around the centre of the pack.
  const ends = Array.from({ length: count }, () => {
    const { x, y } = point();
    const dx = (x - 0.5) * box.width;
    const dy = (y - 0.5) * box.height;
    return { angle: Math.atan2(dy, dx), radius: Math.hypot(dx, dy), size: size * random(2.2, 4.4, 2) };
  });
  const motes = ends.map((end, i) =>
    particle({
      orbit: true,
      cx,
      cy,
      angle: end.angle - random(1.1, 2.1, 3),
      radius: reach + random(0, reach * 0.6),
      size: end.size,
      color: pick(palette),
      shape: i % 3 ? 'glow' : 'star',
      twinkle: 0.3,
    }),
  );
  const flash = particle({ x: cx, y: cy, size: box.width * 0.4, color: pick(palette) });

  return Promise.all([
    stage.animate(motes, {
      angle: each((_, i) => ends[i]!.angle),
      radius: each((_, i) => ends[i]!.radius),
      alpha: [0, 1, 0.9, 0],
      size: each((_, i) => [ends[i]!.size, ends[i]!.size * 0.45]),
      rotation: () => random(-2, 2, 2),
      duration: () => converge * random(0.75, 1, 3),
      delay: stagger((converge * 0.3) / Math.max(1, count)),
      ease: 'inOutCubic',
    }),
    stage.animate([flash], {
      alpha: [0, 0.75, 0],
      size: [box.width * 0.4, box.width * 1.5],
      duration: converge * 0.7,
      delay: converge * 0.85,
      ease: 'outQuad',
    }),
  ]).then(() => undefined);
}

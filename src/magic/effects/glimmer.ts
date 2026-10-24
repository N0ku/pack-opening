import { stagger } from 'animejs';
import type { CardParts } from '../../core/parts.js';
import type { CardInfo } from '../../core/types.js';
import { pick, random, type Magic } from '../context.js';
import { edgePoint } from '../sample.js';
import { each, particle } from '../stage.js';

/** `glimmer`: sparks burst off the outline of a card when it is revealed, more for rarer cards. */
export function glimmer(magic: Magic, { card }: CardParts, info: CardInfo): void {
  const { stage } = magic;
  const box = stage.boxOf(card);
  if (!box.width) return;
  const palette = magic.palette('glimmer', card);
  const life = magic.time('--po-motion-fx-glimmer', 900);
  const size = magic.particleSize();
  const base = magic.number('--po-fx-glimmer-count', 30);
  const legendary = info.rarity === 'legendary';
  const boost = legendary ? magic.number('--po-fx-glimmer-legendary-boost', 2) : !info.rarity || info.rarity === 'common' ? 0.5 : 1;

  const sparks = Array.from({ length: Math.round(base * boost) }, () => {
    const edge = edgePoint(box.width, box.height);
    const reach = random(10, 44, 1);
    const x = box.x + edge.x * box.width;
    const y = box.y + edge.y * box.height;
    return { x, y, toX: x + edge.nx * reach + random(-8, 8, 1), toY: y + edge.ny * reach - random(0, 14, 1) };
  });
  const motes = sparks.map((spark) =>
    particle({
      x: spark.x,
      y: spark.y,
      size: size * random(1.8, 4, 2),
      color: pick(palette),
      shape: Math.random() < 0.55 ? 'star' : 'glow',
      rotation: random(0, 3, 2),
    }),
  );
  void stage.animate(motes, {
    x: each((_, i) => sparks[i]!.toX),
    y: each((_, i) => sparks[i]!.toY),
    alpha: [0, 1, 0],
    size: each((p) => [p.size, p.size * 0.35]),
    duration: () => life * random(0.6, 1, 2),
    delay: stagger(4, { from: 'random' }),
    ease: 'outCubic',
  });

  if (legendary) {
    const ring = particle({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      shape: 'ring',
      size: Math.hypot(box.width, box.height) * 0.6,
      line: 2,
      color: pick(palette),
    });
    void stage.animate([ring], { size: Math.hypot(box.width, box.height) * 1.4, alpha: [0.8, 0], line: 0.4, duration: life, ease: 'outExpo' });
  }
}

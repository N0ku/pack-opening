import { stagger } from 'animejs';
import { pick, random, tearPoint, type Magic } from '../context.js';
import { each, particle } from '../stage.js';

/** `nova`: two translucent shockwaves and a shower of stars out of the opening. */
export function nova(magic: Magic): void {
  const { stage } = magic;
  const origin = tearPoint(magic);
  if (!origin.width) return;
  const palette = magic.palette('nova');
  const life = magic.time('--po-motion-fx-nova', 1400);
  const size = magic.particleSize();
  const scale = origin.width / 280;

  const waves = [0, 1].map((i) =>
    particle({ x: origin.x, y: origin.y, shape: 'ring', size: origin.width * 0.2, line: 3 - i * 1.5, squash: 0.42, color: pick(palette) }),
  );
  void stage.animate(waves, {
    size: origin.width * 2.4,
    alpha: [0.9, 0],
    line: 0.4,
    duration: life * 0.7,
    delay: stagger(life * 0.14),
    ease: 'outExpo',
  });

  // Fanned upwards, then a slight fall as they fade.
  const flights = Array.from({ length: Math.round(magic.number('--po-fx-nova-count', 60)) }, () => {
    const angle = -Math.PI / 2 + random(-1.25, 1.25, 3);
    const distance = random(60, 210, 1) * scale;
    return { x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance, fall: random(16, 48, 1) * scale };
  });
  const stars = flights.map(() =>
    particle({
      x: origin.x + random(-origin.width * 0.3, origin.width * 0.3, 1),
      y: origin.y,
      size: size * random(2, 4.5, 2),
      color: pick(palette),
      shape: Math.random() < 0.6 ? 'star' : 'glow',
      twinkle: 0.25,
    }),
  );
  void stage.animate(stars, {
    x: { to: each((_, i) => flights[i]!.x), ease: 'outExpo', duration: life },
    y: [
      { to: each((_, i) => flights[i]!.y), ease: 'outExpo', duration: life * 0.55 },
      { to: each((_, i) => flights[i]!.y + flights[i]!.fall), ease: 'inQuad', duration: life * 0.45 },
    ],
    rotation: () => random(-3, 3, 2),
    alpha: [1, 1, 0],
    size: each((p) => [p.size, p.size * 0.3]),
    duration: life,
    delay: stagger(5),
  });
}

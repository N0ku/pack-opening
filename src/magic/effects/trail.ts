import { readNumber } from '../../core/utils.js';
import { pick, random, type Magic } from '../context.js';
import { each, particle, type Particle } from '../stage.js';

export interface Trail {
  /** Follows the tip of the cut while the pack is being torn (swipe, `open()`, end of the cut). */
  sync(): void;
  stop(): void;
}

const MAX_PER_FRAME = 24;

/** `trail`: stardust shed along the path of the cut tip. */
export function createTrail(magic: Magic): Trail {
  const { stage, host } = magic;
  let stopEmitting: (() => void) | null = null;
  let previous: { x: number; y: number } | null = null;
  let carry = 0;

  const active = () => {
    if (!magic.on('trail')) return false;
    const { phase } = host.root.dataset;
    return host.state === 'tearing' || (host.state === 'opening' && phase === 'cut');
  };

  // The registered --po-cut-* numbers are interpolated while the theme transitions them.
  const tip = () => {
    const style = getComputedStyle(host.parts.pack);
    const edge = parseFloat(style.getPropertyValue(host.root.dataset.dir === 'rtl' ? '--po-cut-from' : '--po-cut-to'));
    const box = stage.boxOf(host.parts.pack);
    const line = readNumber(host.root, '--po-tear-line', 0.14);
    return { x: box.x + box.width * (Number.isFinite(edge) ? edge : 0), y: box.y + box.height * line };
  };

  const emit = () => {
    const point = tip();
    const from = previous ?? point;
    previous = point;
    carry += Math.hypot(point.x - from.x, point.y - from.y) * magic.number('--po-fx-trail-density', 0.35);
    const count = Math.min(Math.floor(carry), MAX_PER_FRAME);
    if (!count) return;
    carry -= count;

    const palette = magic.palette('trail');
    const life = magic.time('--po-motion-fx-trail', 750);
    const size = magic.particleSize();
    const dust: Particle[] = Array.from({ length: count }, (_, i) => {
      const t = (i + Math.random()) / count;
      return particle({
        x: from.x + (point.x - from.x) * t,
        y: from.y + (point.y - from.y) * t + random(-2, 2, 1),
        size: size * random(1.4, 3, 2),
        color: pick(palette),
        shape: Math.random() < 0.3 ? 'star' : 'glow',
        rotation: random(0, 3, 2),
      });
    });
    void stage.animate(dust, {
      x: each((p) => p.x + random(-14, 14, 1)),
      y: each((p) => p.y + random(-34, 10, 1)),
      alpha: [0.95, 0],
      size: each((p) => [p.size, p.size * 0.2]),
      duration: () => life * random(0.55, 1, 2),
      ease: 'outQuad',
    });
  };

  function sync(): void {
    if (active() && !stopEmitting) {
      previous = null;
      carry = 0;
      stopEmitting = stage.every(emit);
    } else if (!active() && stopEmitting) {
      stopEmitting();
      stopEmitting = null;
    }
  }

  return {
    sync,
    stop() {
      stopEmitting?.();
      stopEmitting = null;
    },
  };
}

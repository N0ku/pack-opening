import { pick, random, type Magic } from '../context.js';
import { particle } from '../stage.js';

export interface Aura {
  /** Starts or stops the fireflies to match the state, the phase, the features and the visibility. */
  sync(): void;
  stop(): void;
}

/** `aura`: fireflies rise and sway around the sealed pack while it waits, in view, to be opened. */
export function createAura(magic: Magic): Aura {
  const { stage, host } = magic;
  let stopEmitting: (() => void) | null = null;
  let visible = true;
  let last = 0;

  const observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          sync();
        });
  observer?.observe(host.root);

  const active = () => magic.on('aura') && host.state === 'idle' && !host.root.dataset.phase && visible;

  const emit = (now: number) => {
    const life = magic.time('--po-motion-fx-aura', 3500);
    const count = Math.max(1, magic.number('--po-fx-aura-count', 12));
    if (now - last < life / count) return;
    last = now;
    const box = stage.boxOf(host.parts.pack);
    const angle = random(0, Math.PI * 2, 3);
    const spread = random(0.85, 1.15, 3);
    const x = box.x + box.width / 2 + Math.cos(angle) * box.width * 0.58 * spread;
    const y = box.y + box.height / 2 + Math.sin(angle) * box.height * 0.5 * spread;
    const mote = particle({
      x,
      y,
      size: magic.particleSize() * random(1.8, 3.6, 2),
      color: pick(magic.palette('aura')),
      twinkle: 0.6,
      wobble: random(4, 12, 1),
    });
    void stage.animate([mote], {
      y: y - random(30, 80, 1),
      alpha: [0, random(0.45, 0.85, 2), 0],
      duration: life * random(0.7, 1.1, 2),
      ease: 'inOutSine',
    });
  };

  function sync(): void {
    if (active() && !stopEmitting) stopEmitting = stage.every(emit);
    else if (!active() && stopEmitting) {
      stopEmitting();
      stopEmitting = null;
    }
  }

  sync();
  return {
    sync,
    stop() {
      stopEmitting?.();
      stopEmitting = null;
      observer?.disconnect();
    },
  };
}

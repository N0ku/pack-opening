import type { Effect, EffectHost } from '../core/effects/registry.js';
import { readNumber, warnOnce } from '../core/utils.js';
import { createContext } from './context.js';
import { appear } from './effects/appear.js';
import { createAura } from './effects/aura.js';
import { dissolve } from './effects/dissolve.js';
import { glimmer } from './effects/glimmer.js';
import { nova } from './effects/nova.js';
import { shimmer } from './effects/shimmer.js';
import { createTrail } from './effects/trail.js';
import { wake } from './effects/wake.js';
import { FxStage } from './stage.js';

/**
 * The magic effects of one `<pack-opening>`: particles drawn on its `fx` canvas, animated with
 * anime.js. Each effect is a feature (`appear`, `aura`, `trail`, `nova`, `dissolve`, `glimmer`,
 * `wake`, `shimmer`) with its own colour; the DOM layers (circle, veil, sheen) live in magic.css.
 */
export function createMagic(host: EffectHost): Effect {
  const canvas = host.parts.fx;
  if (!canvas) {
    warnOnce(host.root, 'No [data-part="fx"] canvas: the magic particles are off (magic.css still applies).');
    return { destroy() {} };
  }

  const stage = new FxStage(canvas, host.root, {
    budget: () => readNumber(host.root, '--po-fx-max-particles', 600),
    bleed: () => readNumber(host.root, '--po-fx-bleed', 96),
  });
  const magic = createContext(host, stage);
  const aura = createAura(magic);
  const trail = createTrail(magic);
  const stops = new Set<() => void>();
  const track = (stop: () => void) => stops.add(stop);

  // State, phase and features live in attributes: the continuous effects follow them.
  const observer = new MutationObserver(() => {
    aura.sync();
    trail.sync();
  });
  observer.observe(host.root, { attributes: true, attributeFilter: ['data-state', 'data-phase', 'data-features'] });

  return {
    phase(phase) {
      trail.sync();
      if (phase === 'appear' && magic.on('appear')) return appear(magic);
      if (phase === 'open' && magic.on('nova')) nova(magic);
      if (phase === 'settle' && magic.on('dissolve')) dissolve(magic);
      return undefined;
    },
    reveal(card, info, silent) {
      if (!silent && magic.on('glimmer')) glimmer(magic, card, info);
    },
    leave(card, direction) {
      if (magic.on('wake')) track(wake(magic, card, direction));
    },
    complete() {
      if (magic.on('shimmer') && host.options.effective.summary) track(shimmer(magic));
    },
    destroy() {
      observer.disconnect();
      aura.stop();
      trail.stop();
      stops.forEach((stop) => stop());
      stage.destroy();
    },
  };
}

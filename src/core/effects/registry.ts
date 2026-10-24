import type { CardParts, PackParts } from '../parts.js';
import type { CardInfo, PackState, Phase, ResolvedOptions } from '../types.js';

/** What an effect sees of the component it decorates. Getters: always the current values. */
export interface EffectHost {
  readonly root: HTMLElement;
  readonly parts: PackParts;
  readonly options: ResolvedOptions;
  readonly state: PackState;
}

/**
 * Moments of the choreography an effect can join. A promise returned by `phase` is awaited
 * together with the CSS animations of that step (with the same timeout guard). An effect that
 * throws is reported once and skipped: it never stops the opening.
 */
export interface Effect {
  /** The options changed (features, colours, speed…). */
  update?(): void;
  state?(state: PackState, previous: PackState): void;
  /** A step starts: `appear` (the pack comes into view), `auto-cut`, `cut`, `cancel`, `open`, `settle`. */
  phase?(phase: Exclude<Phase, 'appear-wait'>): Promise<void> | void;
  /** A face-down card starts turning over. */
  flip?(card: CardParts): void;
  /** A card is face up. `silent`: revealed all at once by `revealAll()`. */
  reveal?(card: CardParts, info: CardInfo, silent: boolean): void;
  /** A card starts leaving the deck. */
  leave?(card: CardParts, direction: 1 | -1): void;
  /** Every card has been seen. */
  complete?(): void;
  destroy(): void;
}

export type EffectFactory = (host: EffectHost) => Effect;

type Listener = (name: string, factory: EffectFactory) => void;

interface Registry {
  factories: Map<string, EffectFactory>;
  listeners: Set<Listener>;
}

// Kept on the global object so that two copies of the code (the core and magic IIFE bundles,
// or two installs of the package) share one registry.
const KEY = Symbol.for('pack-opening.effects');

function registry(): Registry {
  const scope = globalThis as typeof globalThis & { [KEY]?: Registry };
  return (scope[KEY] ??= { factories: new Map(), listeners: new Set() });
}

/**
 * Adds an effect to every `<pack-opening>`, including those already on the page.
 * Registering a name again replaces the previous effect of that name.
 */
export function registerEffect(name: string, factory: EffectFactory): void {
  const { factories, listeners } = registry();
  const known = factories.get(name) === factory;
  factories.set(name, factory);
  if (!known) listeners.forEach((listener) => listener(name, factory));
}

export function registeredEffects(): ReadonlyMap<string, EffectFactory> {
  return registry().factories;
}

/** Calls `listener` for each effect registered from now on. Returns the unsubscribe function. */
export function onEffectRegistered(listener: Listener): () => void {
  const { listeners } = registry();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

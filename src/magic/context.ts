import { utils } from 'animejs';
import type { EffectHost } from '../core/effects/registry.js';
import type { FxFeature } from '../core/types.js';
import { readDuration, readNumber } from '../core/utils.js';
import { paletteOf, type Rgb } from './color.js';
import type { FxStage } from './stage.js';

/** What every magic effect works with. */
export interface Magic {
  host: EffectHost;
  stage: FxStage;
  /** Whether an effect runs (asked for, and motion not reduced). */
  on(effect: FxFeature): boolean;
  /** A duration token (`--po-motion-…`) in ms, at the component's speed. */
  time(token: string, fallback: number): number;
  /** A number token (`--po-fx-…-count`), or the number in a dimension token. */
  number(token: string, fallback: number): number;
  palette(effect: FxFeature, card?: HTMLElement): Rgb[];
  /** Base diameter of a particle, in px (`--po-fx-particle-size`). */
  particleSize(): number;
}

export function createContext(host: EffectHost, stage: FxStage): Magic {
  return {
    host,
    stage,
    on: (effect) => host.options.effective[effect],
    time: (token, fallback) => readDuration(host.root, token, fallback) / host.options.speed,
    number: (token, fallback) => readNumber(host.root, token, fallback),
    palette: (effect, card) => paletteOf(host, effect, card),
    particleSize: () => readNumber(host.root, '--po-fx-particle-size', 6),
  };
}

export const random = utils.random;

export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/** Where the strip is torn off: the middle of the tear line, in canvas coordinates. */
export function tearPoint(magic: Magic): { x: number; y: number; width: number } {
  const box = magic.stage.boxOf(magic.host.parts.pack);
  const line = readNumber(magic.host.root, '--po-tear-line', 0.14);
  return { x: box.x + box.width / 2, y: box.y + box.height * line, width: box.width };
}

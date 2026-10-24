// `pack-opening/magic`: registers the magic effects for every <pack-opening> on the page.
// Requires `animejs` (peer dependency) and the stylesheet `pack-opening/css/magic.css`.
// Imports nothing that defines the element: the registry is shared through the global object.
import { registerEffect } from '../core/effects/registry.js';
import { createMagic } from './magic.js';

registerEffect('magic', createMagic);

export { createMagic };
export { paletteOf, toRgb, type Rgb } from './color.js';
export type { Effect, EffectHost } from '../core/effects/registry.js';
export type { FxColor, FxFeature } from '../core/types.js';

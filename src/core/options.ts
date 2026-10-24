import { parseColorList } from './colors.js';
import { effectiveFeatures, resolveFeatures, type FeatureSelection } from './features.js';
import { resolveLabels } from './labels.js';
import { FX_FEATURES, type FxFeature, type Locale, type PackOpeningInit, type ResolvedOptions } from './types.js';
import { clamp } from './utils.js';
import { resolveView } from './view.js';

export const DEFAULT_OPTIONS = {
  preset: 'full',
  tearDirection: 'any',
  tearThreshold: 0.75,
  cardBack: null,
  view: 'front',
  speed: 1,
  motion: 'auto',
  fxColor: null,
} as const satisfies Partial<PackOpeningInit>;

export interface ResolveContext {
  /** Locale to use when the options don't set one. */
  locale: Locale;
  /** Whether the user prefers reduced motion (media query). */
  prefersReducedMotion: boolean;
}

/** Applies defaults, clamps numbers and resolves features and labels. */
export function resolveOptions(
  init: PackOpeningInit & Pick<FeatureSelection, 'enable' | 'disable'>,
  context: ResolveContext,
): ResolvedOptions {
  const preset = init.preset ?? DEFAULT_OPTIONS.preset;
  const motion = init.motion ?? DEFAULT_OPTIONS.motion;
  const reducedMotion = motion === 'reduce' || context.prefersReducedMotion;
  const features = resolveFeatures({ preset, enable: init.enable, disable: init.disable, features: init.features });
  const threshold = init.tearThreshold;
  const speed = init.speed;
  const locale = init.locale ?? context.locale;

  return Object.freeze({
    preset,
    features,
    effective: effectiveFeatures(features, reducedMotion),
    reducedMotion,
    motion,
    tearDirection: init.tearDirection ?? DEFAULT_OPTIONS.tearDirection,
    tearThreshold: Number.isFinite(threshold) ? clamp(threshold!, 0.2, 1) : DEFAULT_OPTIONS.tearThreshold,
    cardBack: init.cardBack || null,
    view: resolveView(init.view ?? DEFAULT_OPTIONS.view),
    speed: Number.isFinite(speed) && speed! > 0 ? speed! : DEFAULT_OPTIONS.speed,
    locale,
    labels: resolveLabels(locale, init.labels),
    fxColor: parseColorList(init.fxColor),
    fxColors: resolveFxColors(init.fxColors),
  });
}

function resolveFxColors(colors: PackOpeningInit['fxColors']): ResolvedOptions['fxColors'] {
  const result: Partial<Record<FxFeature, readonly string[]>> = {};
  for (const effect of FX_FEATURES) {
    const list = parseColorList(colors?.[effect]);
    if (list) result[effect] = list;
  }
  return Object.freeze(result);
}

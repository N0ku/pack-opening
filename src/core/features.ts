import {
  FEATURES,
  MOTION_FEATURES,
  type Feature,
  type FeatureFlags,
  type FeatureToken,
  type Preset,
} from './types.js';
import { suggest } from './utils.js';

const flags = (on: readonly Feature[]): FeatureFlags =>
  Object.freeze(Object.fromEntries(FEATURES.map((f) => [f, on.includes(f)])) as Record<Feature, boolean>);

export const PRESET_FEATURES: Readonly<Record<Preset, FeatureFlags>> = {
  full: flags(FEATURES),
  /** Interactions and guidance only, no decorative effect. */
  minimal: flags(['swipe', 'tap', 'cardSwipe', 'skip', 'hint', 'summary']),
  /** Nothing but the keyboard: build up from here with `enable`. */
  none: flags([]),
};

export const toFeatureToken = (feature: Feature): FeatureToken =>
  feature.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`) as FeatureToken;

export const FEATURE_TOKENS: readonly FeatureToken[] = FEATURES.map(toFeatureToken);

const byToken = new Map<string, Feature>(FEATURES.map((f) => [toFeatureToken(f), f]));

export const isFeature = (value: string): value is Feature => (FEATURES as readonly string[]).includes(value);

/** Accepts `card-swipe` as well as `cardSwipe`. */
export function toFeature(token: string): Feature | null {
  const normalised = token.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return byToken.get(normalised) ?? null;
}

export interface FeatureListResult {
  features: Feature[];
  unknown: Array<{ token: string; suggestion: FeatureToken | null }>;
}

/** Parses a list such as `"sparks, card-swipe tilt"` (spaces and/or commas). */
export function parseFeatureList(value: string | null | undefined): FeatureListResult {
  const result: FeatureListResult = { features: [], unknown: [] };
  for (const token of (value ?? '').split(/[\s,]+/).filter(Boolean)) {
    const feature = toFeature(token);
    if (feature) {
      if (!result.features.includes(feature)) result.features.push(feature);
    } else {
      result.unknown.push({ token, suggestion: suggest(token, FEATURE_TOKENS) });
    }
  }
  return result;
}

export interface FeatureSelection {
  preset?: Preset | undefined;
  enable?: readonly Feature[] | undefined;
  disable?: readonly Feature[] | undefined;
  features?: Partial<Record<Feature, boolean>> | undefined;
}

/**
 * preset → `enable` → `disable` → `features`.
 * `disable` wins over `enable`; the `features` object (JS) has the last word.
 */
export function resolveFeatures({ preset = 'full', enable = [], disable = [], features = {} }: FeatureSelection): FeatureFlags {
  const result: Record<Feature, boolean> = { ...PRESET_FEATURES[preset] };
  for (const feature of enable) result[feature] = true;
  for (const feature of disable) result[feature] = false;
  for (const [feature, on] of Object.entries(features)) {
    if (isFeature(feature) && typeof on === 'boolean') result[feature] = on;
  }
  return Object.freeze(result);
}

/** Removes the motion effects when the user prefers reduced motion. */
export function effectiveFeatures(features: FeatureFlags, reducedMotion: boolean): FeatureFlags {
  if (!reducedMotion) return features;
  const result: Record<Feature, boolean> = { ...features };
  for (const feature of MOTION_FEATURES) result[feature] = false;
  return Object.freeze(result);
}

/** Space-separated tokens of the enabled features, for `data-features`. */
export const featureTokens = (features: FeatureFlags): string =>
  FEATURES.filter((f) => features[f]).map(toFeatureToken).join(' ');

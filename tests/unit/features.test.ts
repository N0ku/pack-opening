import { describe, expect, it } from 'vitest';
import {
  effectiveFeatures,
  featureTokens,
  parseFeatureList,
  PRESET_FEATURES,
  resolveFeatures,
  toFeature,
  toFeatureToken,
} from '../../src/core/features';
import { FEATURES, FX_FEATURES, MOTION_FEATURES } from '../../src/core/types';

describe('feature tokens', () => {
  it('converts camelCase features to kebab-case tokens and back', () => {
    expect(toFeatureToken('cardSwipe')).toBe('card-swipe');
    expect(toFeature('card-swipe')).toBe('cardSwipe');
    expect(toFeature('cardSwipe')).toBe('cardSwipe');
    expect(toFeature('SPARKS')).toBe('sparks');
    expect(toFeature('nope')).toBeNull();
    for (const feature of FEATURES) expect(toFeature(toFeatureToken(feature))).toBe(feature);
  });
});

describe('parseFeatureList', () => {
  it('accepts spaces and commas, ignores duplicates', () => {
    expect(parseFeatureList(' sparks,tilt  card-swipe sparks ').features).toEqual(['sparks', 'tilt', 'cardSwipe']);
  });

  it('reports unknown tokens with a suggestion', () => {
    const { features, unknown } = parseFeatureList('sprks confetti');
    expect(features).toEqual([]);
    expect(unknown).toEqual([
      { token: 'sprks', suggestion: 'sparks' },
      { token: 'confetti', suggestion: null },
    ]);
  });

  it('handles empty values', () => {
    expect(parseFeatureList(null)).toEqual({ features: [], unknown: [] });
    expect(parseFeatureList('')).toEqual({ features: [], unknown: [] });
  });
});

describe('presets', () => {
  it('full enables everything, none nothing', () => {
    expect(Object.values(PRESET_FEATURES.full).every(Boolean)).toBe(true);
    expect(Object.values(PRESET_FEATURES.none).some(Boolean)).toBe(false);
  });

  it('minimal keeps the interactions and guidance, without decorative effects', () => {
    const minimal = PRESET_FEATURES.minimal;
    for (const feature of ['swipe', 'tap', 'cardSwipe', 'skip', 'hint', 'summary'] as const) expect(minimal[feature]).toBe(true);
    for (const feature of ['tilt', 'shine', 'sparks', 'burst', 'haptics', 'rarity', 'stack', 'depth'] as const) expect(minimal[feature]).toBe(false);
    for (const feature of FX_FEATURES) expect(minimal[feature]).toBe(false);
  });

  it('full includes the magic effects, which reduced motion turns off', () => {
    for (const feature of FX_FEATURES) {
      expect(PRESET_FEATURES.full[feature]).toBe(true);
      expect(MOTION_FEATURES).toContain(feature);
    }
  });
});

describe('resolveFeatures', () => {
  it('defaults to the full preset', () => {
    expect(resolveFeatures({})).toEqual(PRESET_FEATURES.full);
  });

  it('applies preset → enable → disable → features', () => {
    const flags = resolveFeatures({
      preset: 'minimal',
      enable: ['burst', 'tilt', 'sparks'],
      disable: ['tilt', 'skip'],
      features: { sparks: false, rarity: true },
    });
    expect(flags.burst).toBe(true);
    expect(flags.tilt).toBe(false); // disable wins over enable
    expect(flags.skip).toBe(false);
    expect(flags.sparks).toBe(false); // the features object has the last word
    expect(flags.rarity).toBe(true);
    expect(flags.swipe).toBe(true); // untouched preset value
  });

  it('ignores unknown keys and non-boolean values in the features object', () => {
    const flags = resolveFeatures({ features: { confetti: true, sparks: 'no' } as never });
    expect(flags).toEqual(PRESET_FEATURES.full);
    expect('confetti' in flags).toBe(false);
  });

  it('returns frozen flags', () => {
    expect(Object.isFrozen(resolveFeatures({}))).toBe(true);
  });
});

describe('effectiveFeatures', () => {
  it('turns the motion effects off when motion is reduced', () => {
    const flags = effectiveFeatures(PRESET_FEATURES.full, true);
    for (const feature of MOTION_FEATURES) expect(flags[feature]).toBe(false);
    expect(flags.swipe).toBe(true);
    expect(flags.summary).toBe(true);
  });

  it('returns the same flags otherwise', () => {
    expect(effectiveFeatures(PRESET_FEATURES.full, false)).toBe(PRESET_FEATURES.full);
  });
});

describe('featureTokens', () => {
  it('lists the enabled features as kebab-case tokens', () => {
    expect(featureTokens(resolveFeatures({ preset: 'none', enable: ['cardSwipe', 'summary'] }))).toBe('card-swipe summary');
  });
});

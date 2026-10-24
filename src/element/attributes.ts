import { parseFeatureList } from '../core/features.js';
import {
  LOCALES,
  MODES,
  MOTIONS,
  PRESETS,
  TEAR_DIRECTIONS,
  type Feature,
  type Mode,
  type PackOpeningInit,
} from '../core/types.js';
import { suggest } from '../core/utils.js';
import { parseViewAttribute } from '../core/view.js';

/** Attributes of `<pack-opening>`. Complex options (`features`, `labels`, `fxColors`) go through the `options` property. */
export const OBSERVED_ATTRIBUTES = [
  'mode',
  'preset',
  'enable',
  'disable',
  'tear-direction',
  'tear-threshold',
  'card-back',
  'view',
  'speed',
  'motion',
  'locale',
  'fx-color',
] as const;
export type PackOpeningAttribute = (typeof OBSERVED_ATTRIBUTES)[number];

/** Changing one of these rebuilds the component (they change its structure). */
export const STRUCTURAL_ATTRIBUTES: readonly PackOpeningAttribute[] = ['mode', 'card-back'];

export interface AttributeReading {
  mode: Mode;
  init: PackOpeningInit;
  enable: Feature[];
  disable: Feature[];
  /** Human-readable problems, e.g. a typo in a feature name. */
  issues: string[];
}

export function readAttributes(el: Element): AttributeReading {
  const issues: string[] = [];

  const oneOf = <T extends string>(name: PackOpeningAttribute, allowed: readonly T[]): T | undefined => {
    const value = el.getAttribute(name);
    if (value === null || value === '') return undefined;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    const hint = suggest(value, allowed);
    issues.push(`${name}="${value}" is not valid. Use ${allowed.join(' | ')}${hint ? ` (did you mean "${hint}"?)` : ''}.`);
    return undefined;
  };

  const number = (name: PackOpeningAttribute): number | undefined => {
    const value = el.getAttribute(name);
    if (value === null || value === '') return undefined;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    issues.push(`${name}="${value}" is not a number.`);
    return undefined;
  };

  const list = (name: 'enable' | 'disable'): Feature[] => {
    const { features, unknown } = parseFeatureList(el.getAttribute(name));
    for (const { token, suggestion } of unknown) {
      issues.push(`Unknown feature "${token}" in ${name}${suggestion ? ` (did you mean "${suggestion}"?)` : ''}.`);
    }
    return features;
  };

  const view = parseViewAttribute(el.getAttribute('view'));
  if (view.issue) issues.push(view.issue);

  return {
    mode: oneOf('mode', MODES) ?? 'auto',
    init: {
      preset: oneOf('preset', PRESETS),
      tearDirection: oneOf('tear-direction', TEAR_DIRECTIONS),
      tearThreshold: number('tear-threshold'),
      cardBack: el.getAttribute('card-back') || undefined,
      view: view.view,
      speed: number('speed'),
      motion: oneOf('motion', MOTIONS),
      locale: oneOf('locale', LOCALES),
      fxColor: el.getAttribute('fx-color') || undefined,
    },
    enable: list('enable'),
    disable: list('disable'),
    issues,
  };
}

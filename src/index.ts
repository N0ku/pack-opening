import { definePackOpening } from './element/define.js';

export { PackOpeningElement } from './element/pack-opening-element.js';
export { definePackOpening };
export { OBSERVED_ATTRIBUTES, type PackOpeningAttribute } from './element/attributes.js';
export { FEATURE_TOKENS, PRESET_FEATURES, parseFeatureList, resolveFeatures, toFeatureToken } from './core/features.js';
export { BUILT_IN_LABELS } from './core/labels.js';
export { parseColorList } from './core/colors.js';
export {
  onEffectRegistered,
  registerEffect,
  registeredEffects,
  type Effect,
  type EffectFactory,
  type EffectHost,
} from './core/effects/registry.js';
export type { CardParts, PackParts } from './core/parts.js';
export { REQUIRED_PARTS } from './core/parts.js';
export { VIEW_LIMITS, VIEW_PRESETS, isViewPreset, parseViewAttribute, resolveView, viewToAttribute, viewToRotate } from './core/view.js';
export { CARD_STRUCTURE, PACK_STRUCTURE, renderTree, type PartNode, type SlotName, type TreeRenderer } from './core/structure.js';
export {
  FEATURES,
  FX_FEATURES,
  LOCALES,
  MOTION_FEATURES,
  MODES,
  MOTIONS,
  PARTS,
  PRESETS,
  STATES,
  TEAR_DIRECTIONS,
  VIEWS,
  type CardInfo,
  type EventHandlerName,
  type EventHandlers,
  type Feature,
  type FeatureFlags,
  type FeatureToken,
  type FxColor,
  type FxFeature,
  type KebabCase,
  type LockedDirection,
  type Locale,
  type Mode,
  type Motion,
  type OpenHintContext,
  type PackOpeningApi,
  type PackOpeningEventDetailMap,
  type PackOpeningEventMap,
  type PackOpeningEventName,
  type PackOpeningInit,
  type PackOpeningLabels,
  type PackOpeningOptions,
  type PackState,
  type Part,
  type Phase,
  type Preset,
  type Rarity,
  type ResolvedOptions,
  type TearDirection,
  type ResolvedView,
  type ViewCoordinates,
  type ViewInput,
  type ViewPreset,
} from './core/types.js';

definePackOpening();

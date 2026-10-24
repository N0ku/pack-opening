import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { toFeatureToken } from '../src/core/features';
import {
  FEATURES,
  VIEWS,
  type Feature,
  type Locale,
  type Motion,
  type Preset,
  type Rarity,
  type TearDirection,
  type ViewPreset,
} from '../src/core/types';

export const ASSETS = 'assets';

export const CARDS: ReadonlyArray<{ src: string; alt: string; rarity: Rarity }> = [
  { src: `${ASSETS}/card-1.svg`, alt: 'Flammèche', rarity: 'common' },
  { src: `${ASSETS}/card-2.svg`, alt: 'Aquari', rarity: 'common' },
  { src: `${ASSETS}/card-3.svg`, alt: 'Voltix', rarity: 'rare' },
  { src: `${ASSETS}/card-4.svg`, alt: 'Sylvane', rarity: 'epic' },
  { src: `${ASSETS}/card-5.svg`, alt: 'Astralis', rarity: 'legendary' },
];

/** Per-feature control: keep the preset value, or force it on / off. */
export type FeatureControl = 'preset' | 'on' | 'off';

export type PackArgs = {
  preset: Preset;
  tearDirection: TearDirection;
  tearThreshold: number;
  cardBack: boolean;
  cards: number;
  /** A preset, or `custom` to use viewX / viewY / viewZ. */
  view: ViewPreset | 'custom';
  viewX: number;
  viewY: number;
  viewZ: number;
  speed: number;
  motion: Motion;
  locale: Locale;
} & Record<Feature, FeatureControl>;

export const DEFAULT_ARGS: PackArgs = {
  preset: 'full',
  tearDirection: 'any',
  tearThreshold: 0.75,
  cardBack: true,
  cards: 5,
  view: 'front',
  viewX: 20,
  viewY: 10,
  viewZ: 0,
  speed: 1,
  motion: 'auto',
  locale: 'en',
  ...(Object.fromEntries(FEATURES.map((f) => [f, 'preset'])) as Record<Feature, FeatureControl>),
};

const FEATURE_DOCS: Record<Feature, string> = {
  swipe: 'Glisser le long de la ligne de coupe pour ouvrir le paquet.',
  tap: 'Un tap ou un clic sur le paquet l’ouvre (alternative au swipe pour un seul pointeur).',
  cardSwipe: 'Faire glisser la carte du dessus sur le côté pour passer à la suivante.',
  skip: 'Bouton « Tout révéler » pendant la révélation.',
  hint: 'Pointillés, reflet et consigne sous le paquet fermé.',
  tilt: 'Inclinaison 3D qui suit la souris.',
  shine: 'Reflet métallisé qui suit la souris.',
  sparks: 'Étincelles quand la bande est arrachée.',
  burst: 'Flash lumineux quand la bande est arrachée.',
  haptics: 'Courte vibration à l’ouverture (appareils compatibles).',
  rarity: 'Halo et reflet holographique sur les cartes rares.',
  stack: 'Décalage en profondeur des cartes sous celle du dessus.',
  depth: 'Booster et pile en 3D, vus légèrement de côté : épaisseur, coins arrondis, tranche des cartes.',
  summary: 'Toutes les cartes côte à côte à la fin.',
  appear: 'Magie : invocation du booster quand il entre dans l’écran (cercle magique, particules qui convergent, matérialisation).',
  aura: 'Magie : lucioles qui flottent autour du booster scellé.',
  trail: 'Magie : poussière d’étoiles qui suit la pointe de la découpe.',
  nova: 'Magie : ondes de choc translucides et gerbe d’étoiles à l’arrachage.',
  dissolve: 'Magie : le booster vide se désintègre, les cartes sortent d’un voile lumineux.',
  glimmer: 'Magie : éclat de particules autour d’une carte révélée (couleur de rareté).',
  wake: 'Magie : traînée de particules derrière la carte qui part.',
  shimmer: 'Magie : vague scintillante sur les cartes du résumé.',
};

export const ARG_TYPES = {
  preset: { control: 'inline-radio', options: ['full', 'minimal', 'none'], table: { category: 'Features' } },
  ...Object.fromEntries(
    FEATURES.map((feature) => [
      feature,
      {
        name: toFeatureToken(feature),
        description: FEATURE_DOCS[feature],
        control: 'inline-radio',
        options: ['preset', 'on', 'off'],
        table: { category: 'Features' },
      },
    ]),
  ),
  view: {
    control: 'select',
    options: [...VIEWS, 'custom'],
    description: 'Angle de vue : un preset, ou `custom` pour des coordonnées en degrés.',
    table: { category: 'View' },
  },
  viewX: {
    name: 'x',
    description: 'Angle horizontal : > 0 montre le côté droit.',
    control: { type: 'range', min: -75, max: 75, step: 1 },
    if: { arg: 'view', eq: 'custom' },
    table: { category: 'View' },
  },
  viewY: {
    name: 'y',
    description: 'Angle vertical : > 0 montre le dessus.',
    control: { type: 'range', min: -75, max: 75, step: 1 },
    if: { arg: 'view', eq: 'custom' },
    table: { category: 'View' },
  },
  viewZ: {
    name: 'z',
    description: 'Rotation dans le plan du booster (sens horaire).',
    control: { type: 'range', min: -180, max: 180, step: 1 },
    if: { arg: 'view', eq: 'custom' },
    table: { category: 'View' },
  },
  tearDirection: { control: 'inline-radio', options: ['any', 'ltr', 'rtl'], table: { category: 'Tear' } },
  tearThreshold: { control: { type: 'range', min: 0.2, max: 1, step: 0.05 }, table: { category: 'Tear' } },
  cardBack: { control: 'boolean', description: 'Les cartes sortent face cachée et se retournent au tap.', table: { category: 'Content' } },
  cards: { control: { type: 'range', min: 0, max: 5, step: 1 }, table: { category: 'Content' } },
  speed: { control: { type: 'range', min: 0.25, max: 4, step: 0.25 }, table: { category: 'Motion' } },
  motion: { control: 'inline-radio', options: ['auto', 'reduce'], table: { category: 'Motion' } },
  locale: { control: 'inline-radio', options: ['en', 'fr'], table: { category: 'Content' } },
} as const;

/** `enable` / `disable` lists as a developer would write them for these controls. */
export function featureLists(args: Partial<PackArgs>): { enable: string | undefined; disable: string | undefined } {
  const pick = (value: FeatureControl) =>
    FEATURES.filter((f) => args[f] === value).map(toFeatureToken).join(' ') || undefined;
  return { enable: pick('on'), disable: pick('off') };
}

/** `view` attribute for these controls: the preset name, or `"x y z"`. */
export const viewAttribute = (a: Pick<PackArgs, 'view' | 'viewX' | 'viewY' | 'viewZ'>): string | undefined =>
  a.view === 'front' ? undefined : a.view === 'custom' ? `${a.viewX} ${a.viewY} ${a.viewZ}` : a.view;

export function renderPack(args: Partial<PackArgs>, extra: { id?: string; style?: string } = {}): TemplateResult {
  const a = { ...DEFAULT_ARGS, ...args };
  const { enable, disable } = featureLists(a);
  return html`<pack-opening
    id=${ifDefined(extra.id)}
    style=${ifDefined(extra.style)}
    preset=${a.preset === 'full' ? nothing : a.preset}
    enable=${ifDefined(enable)}
    disable=${ifDefined(disable)}
    tear-direction=${a.tearDirection === 'any' ? nothing : a.tearDirection}
    tear-threshold=${a.tearThreshold === 0.75 ? nothing : a.tearThreshold}
    card-back=${a.cardBack ? `${ASSETS}/back.svg` : nothing}
    view=${ifDefined(viewAttribute(a))}
    speed=${a.speed === 1 ? nothing : a.speed}
    motion=${a.motion === 'auto' ? nothing : a.motion}
    locale=${a.locale}
  >
    <img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster, series 1" />
    ${CARDS.slice(0, a.cards).map(
      (card) => html`<img data-card data-rarity=${card.rarity} src=${card.src} alt=${card.alt} />`,
    )}
  </pack-opening>`;
}

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect } from 'storybook/test';
import { ARG_TYPES, ASSETS, DEFAULT_ARGS, renderPack, type PackArgs } from './helpers';
import { getPack, part, recordAdded, waitForMount, waitForState } from './test-utils';

const meta = {
  title: 'Features',
  component: 'pack-opening',
  args: { ...DEFAULT_ARGS },
  argTypes: ARG_TYPES,
  render: (args) => renderPack(args),
} satisfies Meta<PackArgs>;

export default meta;
type Story = StoryObj<PackArgs>;

/** `preset="minimal"` : interactions et guidage, aucun effet décoratif. */
export const Minimal: Story = { args: { preset: 'minimal' } };

/** `preset="none" enable="tap summary"` : on part de zéro. */
export const BuildUpFromNone: Story = { args: { preset: 'none', tap: 'on', summary: 'on' } };

/** `disable="tilt shine sparks burst haptics"` : tous les effets coupés, interactions conservées. */
export const NoEffects: Story = {
  args: { tilt: 'off', shine: 'off', sparks: 'off', burst: 'off', haptics: 'off' },
};

/** `disable="depth"` : booster et pile vus de face, sans épaisseur ni tranche. */
export const Flat: Story = { args: { depth: 'off' } };

/** Sans `card-back` : les cartes sortent face visible. */
export const FaceUp: Story = { args: { cardBack: false } };

/** `disable="summary"` : pas de résumé, les cartes disparaissent à la fin. */
export const NoSummary: Story = { args: { summary: 'off' } };

/** `disable="swipe"` : tap uniquement (la zone de coupe est retirée). */
export const TapOnly: Story = { args: { swipe: 'off' } };

/** `tear-direction="rtl"` : seul un swipe de droite à gauche déchire. */
export const RightToLeft: Story = { args: { tearDirection: 'rtl' } };

/** `motion="reduce"` : aucune animation, même parcours. Appliqué aussi automatiquement avec `prefers-reduced-motion`. */
export const ReducedMotion: Story = { args: { motion: 'reduce' } };

/** `locale="fr"` : textes intégrés en français. */
export const French: Story = { args: { locale: 'fr' } };

/** Chaque texte se remplace via la propriété `options` (les fonctions reçoivent les infos de la carte). */
export const CustomLabels: Story = {
  render: () => html`<pack-opening
    card-back="${ASSETS}/back.svg"
    .options=${{
      labels: {
        openPack: 'Open your Stellar booster',
        hintLabel: () => 'Cut along the line ✂︎',
        revealed: (card: { index: number; name: string }) => `${card.name} joins your collection (#${card.index + 1})`,
      },
    }}
  >
    <img data-pack src="${ASSETS}/booster.svg" alt="" />
    <img data-card src="${ASSETS}/card-3.svg" alt="Voltix" data-rarity="rare" />
  </pack-opening>`,
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(part(el, 'pack-button')).toHaveAccessibleName('Open your Stellar booster');
    await expect(part(el, 'hint-label')).toHaveTextContent('Cut along the line');
  },
};

/** Les étincelles ne sont créées que si la feature est active. */
export const SparksOn: Story = {
  args: { speed: 4, cards: 1 },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const added = await recordAdded(part(el, 'effects'), () => el.open());
    await expect(added.filter((node) => node.matches('[data-part="spark"]')).length).toBeGreaterThan(0);
  },
};

export const SparksDisabled: Story = {
  args: { speed: 4, cards: 1, sparks: 'off', burst: 'off' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.features).not.toContain('sparks');
    const added = await recordAdded(part(el, 'effects'), () => el.open());
    await expect(added).toHaveLength(0);
    await waitForState(el, 'revealing');
  },
};

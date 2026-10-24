import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ASSETS, DEFAULT_ARGS, renderPack, type PackArgs } from './helpers';

const meta = {
  title: 'Theming',
  component: 'pack-opening',
  args: { ...DEFAULT_ARGS },
  render: (args) => renderPack(args),
} satisfies Meta<PackArgs>;

export default meta;
type Story = StoryObj<PackArgs>;

/** Les tokens du composant sont de simples custom properties : surchargez-les où vous voulez. */
export const CustomTokens: Story = {
  render: (args) =>
    renderPack(args, {
      style: [
        '--po-pack-width: 220px',
        '--po-cut-glow: #7fe3ff',
        '--po-cut-shadow: 0 0 8px 2px #7fe3ff',
        '--po-burst-color: #7fe3ff',
        '--po-tear-line: 0.2',
        '--po-card-radius: 4px',
      ].join(';'),
    }),
};

/** Halo par carte : définissez `--po-card-glow` sur une carte. */
export const CustomRarity: Story = {
  render: () => html`<pack-opening>
    <img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster" />
    <img data-card data-rarity="mythic" style="--po-card-glow: #ff4f9a" src="${ASSETS}/card-5.svg" alt="Astralis, mythic" />
    <img data-card data-rarity="rare" src="${ASSETS}/card-3.svg" alt="Voltix" />
  </pack-opening>`,
};

/** Ralenti : chaque durée est un token multiplié par `1 / speed`. */
export const SlowMotion: Story = { args: { speed: 0.4 } };

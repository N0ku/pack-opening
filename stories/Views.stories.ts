import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, spyOn, waitFor } from 'storybook/test';
import { VIEW_PRESETS } from '../src/core/view';
import { VIEWS } from '../src/core/types';
import { ARG_TYPES, ASSETS, DEFAULT_ARGS, renderPack, type PackArgs } from './helpers';
import { getPack, waitForMount } from './test-utils';

const meta = {
  title: 'Views',
  component: 'pack-opening',
  args: { ...DEFAULT_ARGS },
  argTypes: ARG_TYPES,
  render: (args) => renderPack(args),
  parameters: {
    docs: {
      description: {
        component:
          'Le booster est vu **de face** par défaut. `view` accepte un preset (`top-right`…) ou des coordonnées en ' +
          'degrés, comme une caméra qui tourne autour du paquet : `x` > 0 montre le côté droit, `y` > 0 le dessus, ' +
          '`z` incline le paquet dans son plan. Avec la feature `depth`, l’épaisseur du booster et la tranche des ' +
          'cartes apparaissent du côté visible.',
      },
    },
  },
} satisfies Meta<PackArgs>;

export default meta;
type Story = StoryObj<PackArgs>;

/** Les 9 presets, sur une grille 3×3. */
export const Presets: Story = {
  render: () => html`<div
    style="display: grid; grid-template-columns: repeat(3, auto); gap: 32px 48px;"
  >
    ${['top-left', 'top', 'top-right', 'left', 'front', 'right', 'bottom-left', 'bottom', 'bottom-right'].map(
      (view) => html`<figure style="margin: 0; display: grid; justify-items: center; gap: 8px;">
        <pack-opening view=${view} disable="hint skip" style="--po-pack-width: 120px">
          <img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster, ${view}" />
        </pack-opening>
        <figcaption style="font: 600 13px/1.2 system-ui, sans-serif"><code>view="${view}"</code></figcaption>
      </figure>`,
    )}
  </div>`,
  play: async ({ canvasElement }) => {
    const packs = [...canvasElement.querySelectorAll('pack-opening')];
    await waitFor(() => expect(packs.every((el) => el.dataset.state === 'idle')).toBe(true));
    for (const el of packs) {
      const view = el.getAttribute('view')!;
      await expect(el.dataset.view).toBe(view);
      const rotate = el.style.getPropertyValue('--po-view-rotate');
      await expect(rotate).toEqual(view === 'front' ? 'none' : expect.stringMatching(/deg$/));
    }
    await expect(VIEWS).toHaveLength(packs.length);
  },
};

/** Coordonnées libres : `view="30 12 -8"` (en JS `{ x: 30, y: 12, z: -8 }`). */
export const CustomCoordinates: Story = {
  args: { view: 'custom', viewX: 30, viewY: 12, viewZ: -8 },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.view).toBe('custom');
    await expect(el.options.view).toMatchObject({ x: 30, y: 12, z: -8, preset: null });
  },
};

/** Un preset ajusté en JS : `el.view = { ...VIEW_PRESETS.right, y: 12 }`. */
export const AdjustedPreset: Story = {
  render: () => html`<pack-opening .view=${{ ...VIEW_PRESETS.right, y: 12 }} card-back="${ASSETS}/back.svg">
    <img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster" />
    <img data-card src="${ASSETS}/card-3.svg" alt="Voltix" data-rarity="rare" />
  </pack-opening>`,
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.getAttribute('view')).toBe('24 12 0');
  },
};

/** Une valeur invalide est signalée avec une suggestion, et le booster reste de face. */
export const InvalidView: Story = {
  render: () => html`<div id="host"></div>`,
  play: async ({ canvasElement }) => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('pack-opening');
    el.setAttribute('view', 'top-rigth');
    el.innerHTML = `<img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster" />`;
    canvasElement.querySelector('#host')!.append(el);
    await waitForMount(el);
    await expect(warn).toHaveBeenCalledWith(expect.stringContaining('did you mean "top-right"'), el);
    await expect(el.dataset.view).toBe('front');
    warn.mockRestore();
  },
};

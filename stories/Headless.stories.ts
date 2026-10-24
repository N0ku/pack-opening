import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { expect, fn, spyOn, userEvent, waitFor } from 'storybook/test';
import { ASSETS } from './helpers';
import { getPack, waitForMount, waitForState } from './test-utils';

const meta = {
  title: 'Headless',
  component: 'pack-opening',
  parameters: {
    docs: {
      description: {
        component:
          'Avec `mode="headless"`, vous écrivez chaque part (`data-part="…"`) et le composant n’ajoute que le ' +
          'comportement : attributs d’état, variables CSS et ARIA. Votre texte est conservé tel quel.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Votre propre markup : les parts obligatoires, plus celles que vous voulez. */
export const OwnMarkup: Story = {
  render: () => html`<pack-opening mode="headless" preset="minimal" enable="rarity">
    <div data-part="stage">
      <div data-part="cards">
        <div data-part="card" data-rarity="legendary" data-value="astralis">
          <div data-part="card-front"><img src="${ASSETS}/card-5.svg" alt="Astralis" /></div>
        </div>
        <div data-part="card" data-value="aquari">
          <div data-part="card-front"><img src="${ASSETS}/card-2.svg" alt="Aquari" /></div>
        </div>
      </div>
      <div data-part="pack">
        <div data-part="pack-body"><img src="${ASSETS}/booster.svg" alt="" /></div>
        <div data-part="pack-top" aria-hidden="true"><img src="${ASSETS}/booster.svg" alt="" /></div>
        <div data-part="cut"></div>
        <div data-part="tear-zone"></div>
        <button data-part="pack-button">Open my booster</button>
      </div>
    </div>
    <button data-part="skip"></button>
  </pack-opening>`,
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const button = el.querySelector<HTMLElement>('[data-part="pack-button"]')!;
    // Your text is kept: no aria-label is added on top of it.
    await expect(button).not.toHaveAttribute('aria-label');
    await expect(button).toHaveAccessibleName('Open my booster');

    const revealed = fn();
    el.addEventListener('po-card-reveal', (event) => revealed(event.detail.value, event.detail.rarity));
    el.setAttribute('motion', 'reduce');
    await userEvent.click(button);
    await waitForState(el, 'revealing');
    await expect(revealed).toHaveBeenCalledWith('astralis', 'legendary');
  },
};

/** Une part obligatoire manquante est signalée dans la console, avec la liste de ce qui manque. */
export const MissingParts: Story = {
  render: () => html`<div id="host"></div>`,
  play: async ({ canvasElement }) => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('pack-opening');
    el.setAttribute('mode', 'headless');
    el.innerHTML = '<div data-part="stage"><div data-part="pack"></div></div>';
    canvasElement.querySelector('#host')!.append(el);
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('Missing part(s)'), el));
    await expect(String(warn.mock.calls[0]?.[0])).toContain('[data-part="cards"]');
    warn.mockRestore();
    el.remove();
  },
};

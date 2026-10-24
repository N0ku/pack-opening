import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { expect, fn, spyOn, waitFor } from 'storybook/test';
import { FX_FEATURES, type FxFeature } from '../src/core/types';
import '../src/magic/index';
import '../src/styles/magic.css';
import { ARG_TYPES, ASSETS, CARDS, DEFAULT_ARGS, featureLists, viewAttribute, type PackArgs } from './helpers';
import { getPack, part, waitForMount, waitForState } from './test-utils';

type ColorArg = `${FxFeature}Color`;
type MagicArgs = PackArgs & { fxColor: string } & Record<ColorArg, string>;

const colorArg = (effect: FxFeature): ColorArg => `${effect}Color`;

const DEFAULT_MAGIC_ARGS: MagicArgs = {
  ...DEFAULT_ARGS,
  fxColor: '',
  ...(Object.fromEntries(FX_FEATURES.map((effect) => [colorArg(effect), ''])) as Record<ColorArg, string>),
};

const COLOR_ARG_TYPES = {
  fxColor: {
    name: 'fx-color',
    control: 'color' as const,
    description: 'Couleur de tous les effets magiques (une couleur, ou plusieurs séparées par des espaces).',
    table: { category: 'Magic' },
  },
  ...Object.fromEntries(
    FX_FEATURES.map((effect) => [
      colorArg(effect),
      {
        name: `fxColors.${effect}`,
        control: 'color' as const,
        description: `Couleur de l’effet \`${effect}\` (option \`fxColors\`), prioritaire sur \`fx-color\`.`,
        table: { category: 'Magic' },
      },
    ]),
  ),
};

function renderMagic(args: Partial<MagicArgs>): TemplateResult {
  const a = { ...DEFAULT_MAGIC_ARGS, ...args };
  const { enable, disable } = featureLists(a);
  const fxColors = Object.fromEntries(
    FX_FEATURES.filter((effect) => a[colorArg(effect)]).map((effect) => [effect, a[colorArg(effect)]]),
  );
  return html`<pack-opening
    preset=${a.preset === 'full' ? nothing : a.preset}
    enable=${ifDefined(enable)}
    disable=${ifDefined(disable)}
    tear-direction=${a.tearDirection === 'any' ? nothing : a.tearDirection}
    card-back=${a.cardBack ? `${ASSETS}/back.svg` : nothing}
    view=${ifDefined(viewAttribute(a))}
    speed=${a.speed === 1 ? nothing : a.speed}
    motion=${a.motion === 'auto' ? nothing : a.motion}
    locale=${a.locale}
    fx-color=${a.fxColor || nothing}
    .options=${{ fxColors }}
  >
    <img data-pack src="${ASSETS}/booster.svg" alt="Stellar booster, series 1" />
    ${CARDS.slice(0, a.cards).map((card) => html`<img data-card data-rarity=${card.rarity} src=${card.src} alt=${card.alt} />`)}
  </pack-opening>`;
}

const meta = {
  title: 'Magic/Effects',
  component: 'pack-opening',
  args: DEFAULT_MAGIC_ARGS,
  argTypes: { ...ARG_TYPES, ...COLOR_ARG_TYPES },
  render: (args) => renderMagic(args),
  parameters: {
    docs: {
      description: {
        component:
          'Effets magiques à particules : `import \'pack-opening/magic\'` (anime.js) et `pack-opening/css/magic.css`. ' +
          'Chaque effet est une feature (`appear`, `aura`, `trail`, `nova`, `dissolve`, `glimmer`, `wake`, `shimmer`) ' +
          'avec sa propre couleur : `fx-color` pour tous, `fxColors` pour chacun.',
      },
    },
  },
} satisfies Meta<MagicArgs>;

export default meta;
type Story = StoryObj<MagicArgs>;

/** Whether something has been drawn on the particle canvas. */
function inked(canvas: HTMLCanvasElement): boolean {
  if (!canvas.width || !canvas.height) return false;
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i]) return true;
  return false;
}

/** Tous les effets, couleurs par défaut. Le booster apparaît dès qu’il entre dans l’écran. */
export const AllEffects: Story = {
  args: { speed: 4 },
  play: async ({ canvasElement, step }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.fx).toBe('magic');
    const canvas = part(el, 'fx') as HTMLCanvasElement;

    await step('The pack is summoned, then fireflies float around it', async () => {
      await waitFor(() => expect(inked(canvas)).toBe(true), { timeout: 4000 });
      await waitFor(() => expect(el.dataset.phase).toBeUndefined(), { timeout: 4000 });
    });

    await step('The whole opening still runs to the end', async () => {
      const complete = fn();
      el.addEventListener('po-complete', complete);
      await el.open();
      await waitForState(el, 'revealing');
      while (el.state === 'revealing') await el.next();
      await waitForState(el, 'complete');
      await expect(complete).toHaveBeenCalledOnce();
    });
  },
};

/** `fx-color` : une liste de couleurs, chaque particule en prend une. */
export const GlobalColor: Story = { args: { fxColor: '#ff7ad9 #6fd8ff' } };

/** `fxColors` : une couleur par effet, prioritaire sur `fx-color`. */
export const PerEffectColors: Story = {
  args: { fxColor: '#6fd8ff', novaColor: '#ffd66b', trailColor: '#ff7ad9', dissolveColor: '#8dffb0', shimmerColor: '#ffe07a' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const style = getComputedStyle(el);
    await expect(style.getPropertyValue('--po-fx-color').trim()).toBe('#6fd8ff');
    await expect(style.getPropertyValue('--po-fx-nova-color').trim()).toBe('#ffd66b');
    // Effects without a colour of their own take the global one.
    await expect(style.getPropertyValue('--po-fx-appear-color').trim()).toBe('#6fd8ff');
    await expect(el.options.fxColors).toEqual({ trail: ['#ff7ad9'], nova: ['#ffd66b'], dissolve: ['#8dffb0'], shimmer: ['#ffe07a'] });
  },
};

/** Chaque effet seul, sur le preset `minimal`. */
const only = (effect: FxFeature): Story => ({ args: { preset: 'minimal', [effect]: 'on' } });
export const AppearOnly = only('appear');
export const AuraOnly = only('aura');
export const TrailOnly = only('trail');
export const NovaOnly = only('nova');
export const DissolveOnly = only('dissolve');
export const GlimmerOnly = only('glimmer');
export const WakeOnly = only('wake');
export const ShimmerOnly = only('shimmer');

/** `motion="reduce"` : aucun effet magique, le booster est là tout de suite. */
export const ReducedMotion: Story = {
  args: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.phase).toBeUndefined();
    for (const effect of FX_FEATURES) await expect(el.options.effective[effect]).toBe(false);
    await el.open();
    await waitForState(el, 'revealing');
  },
};

/** `open()` sur un booster jamais vu (caché) : l’apparition est sautée, rien n’attend. */
export const OpenBeforeSeen: Story = {
  render: (args) => html`<div hidden>${renderMagic(args)}</div>`,
  args: { speed: 4, cards: 1 },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.phase).toBe('appear-wait');
    await el.open();
    await expect(el.state).not.toBe('idle');
  },
};

/** Headless sans `<canvas data-part="fx">` : pas de particules (un avertissement), le reste fonctionne. */
export const HeadlessWithoutCanvas: Story = {
  render: () => html`<pack-opening mode="headless" preset="minimal" enable="appear dissolve" speed="4">
    <div data-part="stage">
      <div data-part="cards">
        <div data-part="card"><div data-part="card-front"><img src="${ASSETS}/card-2.svg" alt="Aquari" /></div></div>
      </div>
      <div data-part="pack">
        <div data-part="pack-body"><img src="${ASSETS}/booster.svg" alt="" /></div>
        <div data-part="pack-top" aria-hidden="true"><img src="${ASSETS}/booster.svg" alt="" /></div>
        <button data-part="pack-button">Open my booster</button>
      </div>
    </div>
  </pack-opening>`,
  // The warning comes at mount, before `play`.
  beforeEach: () => {
    const warn = spyOn(console, 'warn');
    return () => warn.mockRestore();
  },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No [data-part="fx"] canvas'), el);
    await el.open();
    await waitForState(el, 'revealing');
  },
};

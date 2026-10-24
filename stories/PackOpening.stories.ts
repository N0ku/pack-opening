import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { ARG_TYPES, DEFAULT_ARGS, renderPack, type PackArgs } from './helpers';
import { getPack, part, swipe, waitForMount, waitForState } from './test-utils';

const meta = {
  title: 'Pack opening',
  component: 'pack-opening',
  tags: ['autodocs'],
  args: { ...DEFAULT_ARGS },
  argTypes: ARG_TYPES,
  render: (args) => renderPack(args),
  parameters: {
    docs: {
      description: {
        component:
          'Glissez le long du haut du booster pour le déchirer, puis retournez et faites défiler les cartes. ' +
          'Chaque feature peut garder la valeur du preset, être forcée **on** (`enable`) ou **off** (`disable`).',
      },
    },
  },
} satisfies Meta<PackArgs>;

export default meta;
type Story = StoryObj<PackArgs>;

/** Tous les réglages du composant. Le panneau de code montre le HTML correspondant. */
export const Playground: Story = {};

/** Le swipe ouvre le paquet dès qu’il dépasse le seuil. */
export const OpensWithSwipe: Story = {
  args: { motion: 'reduce' },
  play: async ({ canvasElement, step }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const opened = fn();
    el.addEventListener('po-opened', opened);

    await step('Swipe along the tear line', async () => {
      await swipe(el, 0.04, 0.96);
      await waitForState(el, 'revealing');
    });
    await expect(opened).toHaveBeenCalledWith(expect.objectContaining({ detail: { total: 5 } }));
    await waitFor(() => expect(part(el, 'announcer')).toHaveTextContent('Pack opened, 5 cards'));
  },
};

/** S’arrêter avant le seuil referme le paquet. */
export const CancelsShortSwipe: Story = {
  args: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const cancelled = fn();
    el.addEventListener('po-tear-cancel', cancelled);
    await swipe(el, 0.1, 0.35);
    await waitFor(() => expect(cancelled).toHaveBeenCalled());
    await expect(el.state).toBe('idle');
  },
};

/** Tout le parcours au clavier seul, le focus suit chaque étape. */
export const KeyboardOnly: Story = {
  args: { motion: 'reduce', cards: 3 },
  play: async ({ canvasElement, step }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);

    await step('Tab to the pack and press Enter', async () => {
      await userEvent.tab();
      await expect(document.activeElement).toBe(part(el, 'pack-button'));
      await expect(part(el, 'pack-button')).toHaveAccessibleName('Open the pack');
      await userEvent.keyboard('{Enter}');
      await waitForState(el, 'revealing');
    });

    const cards = [...el.querySelectorAll<HTMLElement>('[data-part="card"]')];
    for (const [index, card] of cards.entries()) {
      await step(`Card ${index + 1}: flip, then next`, async () => {
        await waitFor(() => expect(document.activeElement).toBe(card));
        await expect(card).toHaveAccessibleName(`Flip card ${index + 1} of ${cards.length}`);
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(card).toHaveAttribute('data-revealed'));
        await expect(card.getAttribute('aria-label')).toMatch(/Next card$/);
        await userEvent.keyboard(index % 2 ? '{ArrowLeft}' : '{ArrowRight}');
      });
    }

    await step('Summary gets the focus', async () => {
      await waitForState(el, 'complete');
      const list = part(el, 'cards');
      await waitFor(() => expect(document.activeElement).toBe(list));
      await expect(list).toHaveAttribute('role', 'list');
      await expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(3);
    });
  },
};

/** Les cartes pas encore révélées sont cachées aux technologies d’assistance (pas de spoiler). */
export const NoSpoilers: Story = {
  args: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await el.open();
    await waitForState(el, 'revealing');
    const [top, ...below] = el.querySelectorAll<HTMLElement>('[data-part="card"]');
    await expect(top).not.toHaveAttribute('aria-hidden');
    for (const card of below) {
      await expect(card.inert).toBe(true);
      await expect(card).toHaveAttribute('aria-hidden', 'true');
    }
  },
};

/** Avec `depth`, la tranche du paquet de cartes s’amincit à chaque carte retirée (`--po-remaining`). */
export const DeckThinsOut: Story = {
  args: { motion: 'reduce', cardBack: false },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    await expect(el.dataset.features).toContain('depth');
    await el.open();
    await waitForState(el, 'revealing');
    const cards = part(el, 'cards');
    const edge = () => parseFloat(getComputedStyle(part(el, 'deck-side')).height);
    await expect(cards.style.getPropertyValue('--po-remaining')).toBe('5');
    const full = edge();
    await el.next();
    await waitFor(() => expect(cards.style.getPropertyValue('--po-remaining')).toBe('4'));
    await waitFor(() => expect(edge()).toBeLessThan(full));
  },
};

/** `revealAll()` (ou le bouton « Tout révéler ») saute jusqu’au résumé. */
export const RevealAll: Story = {
  args: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    const el = getPack(canvasElement);
    await waitForMount(el);
    const reveals = fn();
    el.addEventListener('po-card-reveal', reveals);
    await el.open();
    await waitForState(el, 'revealing');
    await userEvent.click(part(el, 'skip'));
    await waitForState(el, 'complete');
    await expect(reveals).toHaveBeenCalledTimes(5);
  },
};

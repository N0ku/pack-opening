import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { PackCard, PackOpening, type PackOpeningExposed } from '../../src/vue';
import '../../src/styles/index.css';

const ASSETS = '/demo/assets';
let app: App | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  app?.unmount();
  container?.remove();
  app = null;
  container = null;
});

function mount(render: () => ReturnType<typeof h>) {
  container = document.body.appendChild(document.createElement('div'));
  app = createApp({ render });
  app.mount(container);
  return container.querySelector('pack-opening')!;
}

describe('Vue wrapper', () => {
  it('renders the parts, maps props and emits typed events', async () => {
    const exposed = ref<PackOpeningExposed | null>(null);
    const onCardReveal = vi.fn();
    const onComplete = vi.fn();
    const el = mount(() =>
      h(
        PackOpening,
        {
          ref: exposed,
          cardBack: `${ASSETS}/back.svg`,
          preset: 'minimal',
          enable: ['burst'],
          disable: ['skip'],
          motion: 'reduce',
          onCardReveal,
          onComplete,
        },
        {
          pack: () => h('img', { src: `${ASSETS}/booster.svg`, alt: '' }),
          default: () => [
            h(PackCard, { rarity: 'rare', value: 'voltix' }, () => h('img', { src: `${ASSETS}/card-3.svg`, alt: 'Voltix' })),
            h(PackCard, { value: 'aquari' }, () => h('img', { src: `${ASSETS}/card-2.svg`, alt: 'Aquari' })),
          ],
        },
      ),
    );
    await vi.waitFor(() => expect(el.dataset.state).toBe('idle'));

    expect(el.getAttribute('mode')).toBe('headless');
    // `burst` is requested, but reduced motion keeps it from running.
    expect(el.options.features.burst).toBe(true);
    expect(el.options.effective.burst).toBe(false);
    expect(el.dataset.features).toBe('swipe tap card-swipe hint summary');
    expect(el.querySelectorAll('[data-part="card-back"] img')).toHaveLength(2);
    expect(el.querySelectorAll('[data-part="pack-body"] img, [data-part="pack-top"] img')).toHaveLength(2);

    await exposed.value!.open();
    expect(exposed.value!.state).toBe('revealing');
    await exposed.value!.revealAll();
    expect(onCardReveal).toHaveBeenCalledTimes(2);
    expect(onCardReveal.mock.calls[1]![0]).toMatchObject({ name: 'Aquari', value: 'aquari', rarity: null });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('reacts to the features prop', async () => {
    const features = ref<Record<string, boolean>>({ tap: true });
    const el = mount(() =>
      h(PackOpening, { preset: 'none', features: features.value, motion: 'reduce' }, {
        pack: () => h('img', { src: `${ASSETS}/booster.svg`, alt: '' }),
        default: () => [h(PackCard, null, () => h('img', { src: `${ASSETS}/card-1.svg`, alt: 'Flammèche' }))],
      }),
    );
    await vi.waitFor(() => expect(el.dataset.features).toBe('tap'));
    features.value = { tap: true, summary: true };
    await nextTick();
    await vi.waitFor(() => expect(el.dataset.features).toBe('tap summary'));
  });

  it('reacts to the magic colour props', async () => {
    const fxColors = ref<Record<string, string | string[]>>({ nova: ['gold', 'white'] });
    const el = mount(() =>
      h(PackOpening, { fxColor: '#6fd8ff', fxColors: fxColors.value, motion: 'reduce' }, {
        pack: () => h('img', { src: `${ASSETS}/booster.svg`, alt: '' }),
        default: () => [h(PackCard, null, () => h('img', { src: `${ASSETS}/card-1.svg`, alt: 'Flammèche' }))],
      }),
    );
    await vi.waitFor(() => expect(el.style.getPropertyValue('--po-fx-nova-color')).toBe('gold'));
    expect(el.style.getPropertyValue('--po-fx-aura-color')).toBe('#6fd8ff');
    expect(el.querySelector('canvas[data-part="fx"]')).not.toBeNull();
    fxColors.value = { aura: 'hotpink' };
    await nextTick();
    await vi.waitFor(() => expect(el.style.getPropertyValue('--po-fx-aura-color')).toBe('hotpink'));
    expect(el.style.getPropertyValue('--po-fx-nova-color')).toBe('#6fd8ff');
  });
});

import { act, createElement, createRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PackCard, PackOpening, type PackOpeningHandle, type PackOpeningProps } from '../../src/react';
import '../../src/styles/index.css';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ASSETS = '/demo/assets';
const img = (src: string, alt: string) => createElement('img', { src: `${ASSETS}/${src}`, alt });
const cards = (n: number): ReactNode[] =>
  [
    createElement(PackCard, { key: 'voltix', rarity: 'rare', value: 'voltix' }, img('card-3.svg', 'Voltix')),
    createElement(PackCard, { key: 'aquari', value: 'aquari' }, img('card-2.svg', 'Aquari')),
    createElement(PackCard, { key: 'astralis', rarity: 'legendary', value: 'astralis' }, img('card-5.svg', 'Astralis')),
  ].slice(0, n);

let root: Root | null = null;
let container: HTMLElement | null = null;

async function render(props: PackOpeningProps & { ref?: React.Ref<PackOpeningHandle> }) {
  container ??= document.body.appendChild(document.createElement('div'));
  root ??= createRoot(container);
  await act(async () => root!.render(createElement(PackOpening, { motion: 'reduce', ...props })));
  const el = container.querySelector('pack-opening')!;
  await vi.waitFor(() => expect(el.dataset.state).toBeDefined());
  return el;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('React wrapper', () => {
  it('renders the parts in headless mode and maps props to attributes', async () => {
    const el = await render({
      pack: img('booster.svg', ''),
      cardBack: `${ASSETS}/back.svg`,
      preset: 'minimal',
      enable: ['burst', 'card-swipe'],
      disable: ['skip'],
      locale: 'fr',
      className: 'my-pack',
      children: cards(2),
    });
    expect(el.getAttribute('mode')).toBe('headless');
    expect(el.classList.contains('my-pack')).toBe(true);
    // `burst` is requested, but reduced motion keeps it from running.
    expect(el.options.features.burst).toBe(true);
    expect(el.options.effective.burst).toBe(false);
    expect(el.dataset.features).toBe('swipe tap card-swipe hint summary');
    expect(el.querySelectorAll('[data-part="card-back"]')).toHaveLength(2);
    expect(el.querySelectorAll('[data-part="pack-body"] img, [data-part="pack-top"] img')).toHaveLength(2);
    expect(el.querySelector('[data-part="pack-button"]')!.getAttribute('aria-label')).toBe('Ouvrir le booster');
  });

  it('forwards events with typed details and exposes the API through the ref', async () => {
    const ref = createRef<PackOpeningHandle>();
    const onCardReveal = vi.fn();
    const onComplete = vi.fn();
    const onStateChange = vi.fn();
    await render({ ref, pack: img('booster.svg', ''), onCardReveal, onComplete, onStateChange, children: cards(3) });

    await act(async () => ref.current!.open());
    expect(ref.current!.state).toBe('revealing');
    expect(ref.current!.element?.tagName).toBe('PACK-OPENING');

    await act(async () => ref.current!.revealAll());
    expect(ref.current!.state).toBe('complete');
    expect(onCardReveal).toHaveBeenCalledTimes(3);
    expect(onCardReveal.mock.calls[0]![0]).toMatchObject({ index: 0, total: 3, name: 'Voltix', rarity: 'rare', value: 'voltix' });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onStateChange.mock.calls.map(([d]) => d.state)).toEqual(['tearing', 'opening', 'revealing', 'complete']);
  });

  it('maps the view prop (preset or coordinates) to the attribute', async () => {
    const el = await render({ pack: img('booster.svg', ''), view: { x: 20, y: 10 }, children: cards(1) });
    expect(el.getAttribute('view')).toBe('20 10 0');
    expect(el.dataset.view).toBe('custom');
    await render({ pack: img('booster.svg', ''), view: 'top-left', children: cards(1) });
    expect(el.dataset.view).toBe('top-left');
  });

  it('applies the features object through the options property', async () => {
    const el = await render({ pack: img('booster.svg', ''), preset: 'none', features: { tap: true, rarity: true }, children: cards(1) });
    expect(el.dataset.features).toBe('tap rarity');
    await render({ pack: img('booster.svg', ''), preset: 'none', features: { tap: true }, children: cards(1) });
    expect(el.dataset.features).toBe('tap');
  });

  it('passes the magic colours through the options and renders the fx canvas', async () => {
    const el = await render({ pack: img('booster.svg', ''), fxColor: ['#b968ff', 'gold'], fxColors: { nova: 'hotpink' }, children: cards(1) });
    expect(el.options.fxColor).toEqual(['#b968ff', 'gold']);
    expect(el.options.fxColors).toEqual({ nova: ['hotpink'] });
    expect(el.style.getPropertyValue('--po-fx-color')).toBe('#b968ff');
    expect(el.style.getPropertyValue('--po-fx-nova-color')).toBe('hotpink');
    expect(el.style.getPropertyValue('--po-fx-trail-color')).toBe('#b968ff');
    expect(el.querySelector('canvas[data-part="fx"]')).not.toBeNull();
    await render({ pack: img('booster.svg', ''), children: cards(1) });
    expect(el.style.getPropertyValue('--po-fx-color')).toBe('');
  });

  it('rebuilds when React changes the cards', async () => {
    const el = await render({ pack: img('booster.svg', ''), children: cards(3) });
    await act(async () => el.open());
    expect(el.state).toBe('revealing');

    await render({ pack: img('booster.svg', ''), children: cards(1) });
    await vi.waitFor(() => expect(el.state).toBe('idle'));
    expect(el.querySelectorAll('[data-part="card"]')).toHaveLength(1);
    expect(el.querySelector<HTMLElement>('[data-part="cards"]')!.style.getPropertyValue('--po-total')).toBe('1');
  });

  it('lets you render your own parts with headless', async () => {
    const el = await render({
      headless: true,
      children: createElement('div', { 'data-part': 'stage' }, [
        createElement('div', { key: 'cards', 'data-part': 'cards' }, cards(1)),
        createElement('div', { key: 'pack', 'data-part': 'pack' }, [
          createElement('div', { key: 'body', 'data-part': 'pack-body' }, img('booster.svg', '')),
          createElement('div', { key: 'top', 'data-part': 'pack-top' }, img('booster.svg', '')),
          createElement('button', { key: 'button', 'data-part': 'pack-button' }, 'Open'),
        ]),
      ]),
    });
    expect(el.state).toBe('idle');
    await act(async () => el.open());
    expect(el.state).toBe('revealing');
  });
});

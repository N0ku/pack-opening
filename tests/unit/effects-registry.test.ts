import { describe, expect, it, vi } from 'vitest';
import { onEffectRegistered, registerEffect, registeredEffects, type EffectFactory } from '../../src/core/effects/registry';

describe('effect registry', () => {
  it('registers effects and tells the components already listening', () => {
    const factory: EffectFactory = () => ({ destroy() {} });
    const listener = vi.fn();
    const off = onEffectRegistered(listener);
    registerEffect('test-a', factory);
    expect(registeredEffects().get('test-a')).toBe(factory);
    expect(listener).toHaveBeenCalledWith('test-a', factory);

    // Registering the same factory again is a no-op; a new one replaces it.
    registerEffect('test-a', factory);
    expect(listener).toHaveBeenCalledTimes(1);
    const replacement: EffectFactory = () => ({ destroy() {} });
    registerEffect('test-a', replacement);
    expect(listener).toHaveBeenLastCalledWith('test-a', replacement);

    off();
    registerEffect('test-b', factory);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('is shared through the global object (several copies of the code)', () => {
    const shared = (globalThis as Record<symbol, { factories: Map<string, EffectFactory> }>)[Symbol.for('pack-opening.effects')];
    expect(shared?.factories).toBe(registeredEffects());
  });
});

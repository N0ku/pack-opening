import { describe, expect, it } from 'vitest';
import { parseColorList } from '../../src/core/colors';

describe('parseColorList', () => {
  it('splits on spaces and commas outside parentheses', () => {
    expect(parseColorList('#b968ff #6fd8ff')).toEqual(['#b968ff', '#6fd8ff']);
    expect(parseColorList('gold, white')).toEqual(['gold', 'white']);
    expect(parseColorList('rgb(1, 2, 3), oklch(0.7 0.1 300) hotpink')).toEqual(['rgb(1, 2, 3)', 'oklch(0.7 0.1 300)', 'hotpink']);
    expect(parseColorList('color-mix(in srgb, red 40%, blue)')).toEqual(['color-mix(in srgb, red 40%, blue)']);
  });

  it('accepts arrays and trims their items', () => {
    expect(parseColorList([' gold ', 'rgb(1, 2, 3)', ''])).toEqual(['gold', 'rgb(1, 2, 3)']);
  });

  it('returns null without any colour', () => {
    expect(parseColorList(undefined)).toBeNull();
    expect(parseColorList(null)).toBeNull();
    expect(parseColorList('  , ')).toBeNull();
    expect(parseColorList([])).toBeNull();
  });

  it('returns a frozen list', () => {
    expect(Object.isFrozen(parseColorList('gold'))).toBe(true);
  });
});

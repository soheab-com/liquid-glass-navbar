import { describe, expect, it } from 'vitest';
import { parseSectionLimit, resolveVisibleLimit } from '../src/limits.js';

describe('resolveVisibleLimit', () => {
  it('treats missing and invalid limits as unlimited', () => {
    expect(resolveVisibleLimit(undefined, 500)).toBe(Infinity);
    expect(resolveVisibleLimit(Number.NaN, 500)).toBe(Infinity);
  });
  it('floors numbers and clamps them at zero', () => {
    expect(resolveVisibleLimit(3.7, 500)).toBe(3);
    expect(resolveVisibleLimit(-2, 500)).toBe(0);
  });
  it('picks the largest breakpoint at or below the width', () => {
    const limits = { 0: 2, 600: 4, 900: 8 };
    expect(resolveVisibleLimit(limits, 320)).toBe(2);
    expect(resolveVisibleLimit(limits, 600)).toBe(4);
    expect(resolveVisibleLimit(limits, 899)).toBe(4);
    expect(resolveVisibleLimit(limits, 1400)).toBe(8);
  });
  it('is unlimited below the smallest breakpoint', () => {
    expect(resolveVisibleLimit({ 600: 3 }, 400)).toBe(Infinity);
  });
  it('calls a function with the width', () => {
    expect(resolveVisibleLimit((width) => width / 100, 750)).toBe(7);
  });
});

describe('parseSectionLimit', () => {
  it('reads counts and breakpoints, including none', () => {
    expect(parseSectionLimit(undefined, 500)).toBe(Infinity);
    expect(parseSectionLimit('  ', 500)).toBe(Infinity);
    expect(parseSectionLimit('3', 500)).toBe(3);
    expect(parseSectionLimit('0:2 900:none', 400)).toBe(2);
    expect(parseSectionLimit('0:2 900:none', 1000)).toBe(Infinity);
    expect(parseSectionLimit('600:1', 300)).toBe(Infinity);
  });
  it('ignores malformed entries', () => {
    expect(parseSectionLimit('abc', 500)).toBe(Infinity);
    expect(parseSectionLimit('0:2 x:5 900:4', 1000)).toBe(4);
  });
});

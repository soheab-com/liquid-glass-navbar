import { describe, expect, it } from 'vitest';
import { rimPixels, rimShape } from '../src/refraction.js';

const pixel = (data: Uint8ClampedArray, width: number, x: number, y: number) => {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
};

describe('rimShape', () => {
  it('clear glass has a deep bevel capped at 48px', () => {
    expect(rimShape(20, true)).toEqual({ rim: 19, scale: 20, bevel: true });
    expect(rimShape(200, true).rim).toBe(48);
    expect(rimShape(2, true).rim).toBe(6);
  });
  it('tinted glass folds in over a third of the radius', () => {
    expect(rimShape(30, false)).toEqual({ rim: 21, scale: 90, bevel: false });
    expect(rimShape(5, false).rim).toBe(6);
  });
});

describe('rimPixels', () => {
  for (const clear of [true, false]) {
    it(`${clear ? 'clear' : 'tinted'}: neutral centre, symmetric edges, opaque`, () => {
      const width = 120, height = 44;
      const data = rimPixels(width, height, 22, clear);
      expect(data).toHaveLength(width * height * 4);
      // The flat middle of the pill doesn't move the backdrop.
      expect(pixel(data, width, 60, 22)).toEqual([128, 128, 128, 255]);
      // Mirror-symmetric: the left edge pulls opposite to the right edge, the top opposite to the bottom.
      const [leftR] = pixel(data, width, 2, 22);
      const [rightR] = pixel(data, width, width - 3, 22);
      expect(leftR! - 128).toBeCloseTo(-(rightR! - 128), -0.5);
      expect(leftR).not.toBe(128);
      const [, topG] = pixel(data, width, 60, 1);
      const [, bottomG] = pixel(data, width, 60, height - 2);
      expect(topG! - 128).toBeCloseTo(-(bottomG! - 128), -0.5);
      for (let i = 2; i < data.length; i += 4) expect(data[i]).toBe(128);
      for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
    });
  }
  it('clear glass pulls outward and tinted glass pulls inward at the right edge', () => {
    const [clearR] = pixel(rimPixels(120, 44, 22, true), 120, 116, 22);
    const [tintedR] = pixel(rimPixels(120, 44, 22, false), 120, 118, 22);
    expect(clearR).toBeGreaterThan(128);
    expect(tintedR).toBeLessThan(128);
  });
  it('is deterministic for the same input', () => {
    expect(rimPixels(64, 32, 16, true)).toEqual(rimPixels(64, 32, 16, true));
  });
});

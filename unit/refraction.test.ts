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

// The straightforward per-pixel version the optimised one must match exactly.
function reference(width: number, height: number, corner: number, clear: boolean): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const radius = Math.max(4, Math.min(corner, width / 2, height / 2));
  const { rim, scale, bevel } = rimShape(radius, clear);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - width / 2;
      const dy = y + 0.5 - height / 2;
      const nx = Math.sign(dx) * Math.max(0, Math.abs(dx) - (width / 2 - radius));
      const ny = Math.sign(dy) * Math.max(0, Math.abs(dy) - (height / 2 - radius));
      const length = Math.hypot(nx, ny);
      let outward: number;
      if (bevel) {
        const depth = Math.min(rim, Math.max(0, radius - length));
        outward = depth - rim * (depth / rim) ** 4;
      } else {
        const edge = Math.min(1, Math.max(0, (length - radius + rim) / rim));
        outward = (-(1 - Math.sqrt(1 - edge * edge)) * scale) / 2;
      }
      const unit = (outward * 255) / scale / (length || 1);
      const index = (y * width + x) * 4;
      data[index] = Math.min(255, Math.max(0, 128 + nx * unit));
      data[index + 1] = Math.min(255, Math.max(0, 128 + ny * unit));
      data[index + 2] = 128;
      data[index + 3] = 255;
    }
  }
  return data;
}

describe('rimPixels matches the per-pixel reference exactly', () => {
  for (const [width, height, corner] of [
    [64, 56, 28],
    [65, 57, 28],
    [420, 58, 29],
    [421, 59, 30],
    [420, 180, 24],
    [9, 9, 4],
    [8, 30, 4],
    [300, 41, 999],
  ] as const) {
    for (const clear of [true, false]) {
      it(`${width}x${height} r${corner} ${clear ? 'clear' : 'tinted'}`, () => {
        expect(
          Buffer.from(rimPixels(width, height, corner, clear)).equals(
            Buffer.from(reference(width, height, corner, clear)),
          ),
        ).toBe(true);
      });
    }
  }
});

describe('rimPixels', () => {
  for (const clear of [true, false]) {
    it(`${clear ? 'clear' : 'tinted'}: neutral centre, symmetric edges, opaque`, () => {
      const width = 120,
        height = 44;
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

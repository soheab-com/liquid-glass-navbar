import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSpring, rubberBand, rubberBanded } from '../src/spring.js';

// A manual clock: each frame advances 1/60 s.
let now = 0;
let queue: FrameRequestCallback[] = [];
let reduce = false;
beforeEach(() => {
  now = 0;
  queue = [];
  reduce = false;
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    queue = [];
  });
  vi.stubGlobal('matchMedia', () => ({ matches: reduce }));
});
afterEach(() => vi.unstubAllGlobals());

function frames(count: number): void {
  for (let i = 0; i < count && queue.length; i++) {
    now += 1000 / 60;
    const pending = queue;
    queue = [];
    for (const callback of pending) callback(now);
  }
}

describe('createSpring', () => {
  it('settles exactly on its target and calls onRest once', () => {
    const values: number[] = [];
    const onRest = vi.fn();
    const spring = createSpring(0, (value) => values.push(value), { response: 0.3, onRest });
    spring.to(100);
    frames(600);
    expect(spring.moving).toBe(false);
    expect(spring.value).toBe(100);
    expect(values.at(-1)).toBe(100);
    expect(onRest).toHaveBeenCalledTimes(1);
    expect(onRest).toHaveBeenCalledWith(100);
  });

  it('does not overshoot when critically damped, and overshoots when underdamped', () => {
    const peak = (dampingRatio: number) => {
      let max = 0;
      const spring = createSpring(
        0,
        (value) => {
          max = Math.max(max, value);
        },
        { response: 0.3, dampingRatio },
      );
      spring.to(100);
      frames(600);
      return max;
    };
    expect(peak(1)).toBeLessThanOrEqual(100.0001);
    expect(peak(0.6)).toBeGreaterThan(105);
    expect(peak(0.6)).toBeGreaterThan(peak(0.8));
  });

  it('keeps its velocity when retargeted mid-flight', () => {
    const spring = createSpring(0, () => {}, { response: 0.4 });
    spring.to(100);
    frames(6);
    const before = spring.value;
    frames(1);
    const speed = spring.value - before;
    expect(speed).toBeGreaterThan(0);
    spring.to(-100);
    frames(1);
    // Still moving forward for a moment: the reversal decelerates rather than jumping.
    expect(spring.value).toBeGreaterThan(before + speed * 0.3);
    frames(600);
    expect(spring.value).toBe(-100);
  });

  it('uses a release velocity', () => {
    const spring = createSpring(0, () => {}, { response: 0.4 });
    spring.to(0, 2000);
    frames(3);
    expect(spring.value).toBeGreaterThan(10);
    frames(600);
    expect(spring.value).toBe(0);
  });

  it('jumps without motion under Reduce Motion, and set() never animates', () => {
    reduce = true;
    const onRest = vi.fn();
    const spring = createSpring(0, () => {}, { onRest });
    spring.to(50);
    expect(spring.value).toBe(50);
    expect(spring.moving).toBe(false);
    expect(onRest).toHaveBeenCalledWith(50);
    reduce = false;
    spring.set(10);
    expect(spring.value).toBe(10);
    expect(spring.moving).toBe(false);
  });
});

describe('rubber band', () => {
  it('follows 1:1 inside the range and resists beyond it', () => {
    expect(rubberBanded(50, 0, 100, 100)).toBe(50);
    const over = rubberBanded(200, 0, 100, 100);
    expect(over).toBeGreaterThan(100);
    expect(over).toBeLessThan(200);
    expect(rubberBanded(-100, 0, 100, 100)).toBeCloseTo(-over + 100, 10);
  });

  it('matches the UIKit curve and never exceeds the dimension', () => {
    expect(rubberBand(0, 100)).toBe(0);
    expect(rubberBand(100, 100)).toBeCloseTo((1 - 1 / (0.55 + 1)) * 100, 10);
    expect(rubberBand(1e9, 100)).toBeLessThan(100);
    expect(rubberBand(-40, 100)).toBe(-rubberBand(40, 100));
    expect(rubberBand(10, 0)).toBe(0);
  });
});

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface SpringOptions {
  /** Roughly how long the spring takes to settle, in seconds. */
  response?: number;
  /** 1 is critically damped (no overshoot), 0.85 snappy, 0.7 bouncy. */
  dampingRatio?: number;
  /** Distance from the target that counts as arrived. 0.1 suits pixels; use 0.001 for a 0..1 value. */
  precision?: number;
  /** Called once each time the spring comes to rest on its target. */
  onRest?: (value: number) => void;
}

export interface Spring {
  /** Spring to `next`. Pass the gesture's release velocity (units per second) after a drag. */
  to(next: number, releaseVelocity?: number): void;
  /** Jump with no motion: during a drag, and for a first placement. */
  set(next: number): void;
  stop(): void;
  readonly value: number;
  readonly target: number;
  readonly moving: boolean;
}

/** A value that springs towards its target and can be retargeted mid-flight, keeping its speed. */
export function createSpring(initial: number, onUpdate: (value: number) => void,
  { response = 0.35, dampingRatio = 1, precision = 0.1, onRest }: SpringOptions = {}): Spring {
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const damping = (4 * Math.PI * dampingRatio) / response;
  let value = initial, velocity = 0, target = initial, frame = 0, last = 0;

  const rest = (): void => {
    value = target; velocity = 0; frame = 0;
    onUpdate(value);
    onRest?.(value);
  };
  const step = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.1);     // a stalled tab doesn't fling it
    last = now;
    // Substeps of at most 1/240 s keep stiff springs stable, and keep a slow frame rate in real time.
    const substeps = Math.max(4, Math.ceil(dt * 240));
    for (let i = 0; i < substeps; i++) {
      const h = dt / substeps;
      velocity += (-stiffness * (value - target) - damping * velocity) * h;
      value += velocity * h;
    }
    if (Math.abs(velocity) < precision * 10 && Math.abs(value - target) < precision) { rest(); return; }
    onUpdate(value);
    frame = requestAnimationFrame(step);
  };

  return {
    to(next, releaseVelocity) {
      target = next;
      if (reducedMotion()) { cancelAnimationFrame(frame); rest(); return; }
      if (releaseVelocity !== undefined) velocity = releaseVelocity;
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(step); }
    },
    set(next) {
      cancelAnimationFrame(frame); frame = 0; value = target = next; velocity = 0; onUpdate(value);
    },
    stop() { cancelAnimationFrame(frame); frame = 0; velocity = 0; },
    get value() { return value; },
    get target() { return target; },
    get moving() { return frame !== 0; },
  };
}

export const RUBBER_BAND_COEFFICIENT = 0.55;

/** How far a thing moves when pulled `pull` past its end, given its size `dimension` (UIKit's rubber band). */
export function rubberBand(pull: number, dimension: number, coefficient = RUBBER_BAND_COEFFICIENT): number {
  if (dimension <= 0 || pull === 0) return 0;
  const offset = (1 - 1 / ((coefficient * Math.abs(pull)) / dimension + 1)) * dimension;
  return pull < 0 ? -offset : offset;
}

/** `value` followed 1:1 between `min` and `max`, rubber-banded beyond them. */
export function rubberBanded(value: number, min: number, max: number, dimension: number): number {
  if (value > max) return max + rubberBand(value - max, dimension);
  if (value < min) return min - rubberBand(min - value, dimension);
  return value;
}

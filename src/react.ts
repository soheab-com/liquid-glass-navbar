// React binding: `useLiquidGlassNavbar(ref, options)`. React is a peer dependency; the core doesn't need it.
import { type RefObject, useEffect, useRef, useState } from 'react';
import { mountLiquidGlassNavbar } from './index.js';
import type { LiquidGlassNavbar, LiquidGlassNavbarOptions } from './types.js';

/**
 * Mounts a navbar on the `<nav>` in `ref` after the first render and destroys it on unmount.
 *
 * Options are read when the bar mounts. Callbacks such as `onSelect` always call the latest render's version, so
 * they can close over state. To change other options later, call the returned instance's methods (`setLayout`,
 * `setColors`, `update`, …). The instance is `null` until the bar has mounted.
 */
export function useLiquidGlassNavbar(
  ref: RefObject<HTMLElement | null>,
  options: LiquidGlassNavbarOptions = {},
): LiquidGlassNavbar | null {
  const latest = useRef(options);
  latest.current = options;
  const [navbar, setNavbar] = useState<LiquidGlassNavbar | null>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const bar = mountLiquidGlassNavbar(nav, latestOptions(latest));
    setNavbar(bar);
    return () => {
      bar.destroy();
      setNavbar(null);
    };
  }, [ref]);

  return navbar;
}

/** An options object whose properties always read the latest render's options. */
function latestOptions(latest: { readonly current: LiquidGlassNavbarOptions }): LiquidGlassNavbarOptions {
  return new Proxy({} as LiquidGlassNavbarOptions, {
    get: (_, key) => Reflect.get(latest.current, key),
    has: (_, key) => Reflect.has(latest.current, key),
    ownKeys: () => Reflect.ownKeys(latest.current),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(latest.current, key);
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

// Vue binding: `useLiquidGlassNavbar(navRef, options)`. Vue is a peer dependency; the core doesn't need it.
import { type MaybeRefOrGetter, onBeforeUnmount, onMounted, type Ref, type ShallowRef, shallowRef, toValue } from 'vue';
import { mountLiquidGlassNavbar } from './index.js';
import type { LiquidGlassNavbar, LiquidGlassNavbarOptions } from './types.js';

/**
 * Mounts a navbar on the `<nav>` in `target` when the component mounts and destroys it before unmount.
 *
 * Options are read when the bar mounts; pass a ref or getter and callbacks such as `onSelect` always use its current
 * value. To change other options later, call the instance's methods (`setLayout`, `setColors`, `update`, …).
 */
export function useLiquidGlassNavbar(
  target: Ref<HTMLElement | null | undefined>,
  options: MaybeRefOrGetter<LiquidGlassNavbarOptions> = {},
): ShallowRef<LiquidGlassNavbar | undefined> {
  const navbar = shallowRef<LiquidGlassNavbar>();
  onMounted(() => {
    const nav = target.value;
    if (!nav) return;
    navbar.value = mountLiquidGlassNavbar(
      nav,
      new Proxy({} as LiquidGlassNavbarOptions, {
        get: (_, key) => Reflect.get(toValue(options), key),
        has: (_, key) => Reflect.has(toValue(options), key),
        ownKeys: () => Reflect.ownKeys(toValue(options)),
        getOwnPropertyDescriptor: (_, key) => {
          const descriptor = Reflect.getOwnPropertyDescriptor(toValue(options), key);
          return descriptor && { ...descriptor, configurable: true };
        },
      }),
    );
  });
  onBeforeUnmount(() => {
    navbar.value?.destroy();
    navbar.value = undefined;
  });
  return navbar;
}

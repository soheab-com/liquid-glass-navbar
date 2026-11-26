export type BackdropTone = 'light' | 'dark';

/** What's behind the bar, from the app or from marked regions. Leave a field out to let regions decide it. */
export interface BackdropSignal {
  tone?: BackdropTone;
  /** Detailed content (photos, dense text) that benefits from more tint. */
  busy?: boolean;
}

export interface ContrastOptions {
  /** Icon edge and busy-backdrop halo. Defaults to true. */
  halo?: boolean;
  /** Label edge and busy-backdrop glow. Defaults to true. */
  glow?: boolean;
  /**
   * Content regions to watch: a selector or a function returning elements. Defaults to `[data-navbar-backdrop]`.
   * A region's `data-navbar-backdrop` lists its traits: `dark`, `light` and/or `busy`.
   */
  regions?: string | (() => Iterable<Element>);
  /** Add tint over busy regions and clear it again over quiet ones. Pass `busy` to choose the busy transparency (default 34). */
  adaptiveTint?: boolean | { busy?: number };
}

export function readBackdrop(nav: HTMLElement, regions: Iterable<Element>): Required<BackdropSignal> {
  const box = nav.getBoundingClientRect();
  const area = box.width * box.height;
  let dark = 0;
  let light = 0;
  let busy = false;
  if (!area) return { tone: 'light', busy: false };
  for (const region of regions) {
    const traits = (region.getAttribute('data-navbar-backdrop') ?? '').split(/\s+/);
    const rect = region.getBoundingClientRect();
    const width = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
    const height = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);
    if (width <= 0 || height <= 0) continue;
    const share = (width * height) / area;
    if (traits.includes('dark')) dark += share;
    if (traits.includes('light')) light += share;
    if (traits.includes('busy') && share > .18) busy = true;
  }
  return { tone: dark >= .5 && dark > light ? 'dark' : 'light', busy };
}

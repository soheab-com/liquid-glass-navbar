// Transparency and adaptive contrast: how see-through the glass is, and whether items get a light or dark treatment
// for what's behind the bar. Writes `--lg-nav-tint`, `data-lg-navbar-backdrop` and a few state classes on the nav.
import { type BackdropSignal, type ContrastOptions, readBackdrop } from './contrast.js';
import type { Disposer } from './lifecycle.js';

export interface BackdropTint {
  setTransparency(percentage?: number): void;
  setContrast(value?: boolean | ContrastOptions): void;
  /** An app-supplied tone or busy signal, which takes precedence over detection. */
  setBackdrop(next?: BackdropSignal): void;
  /** Re-read the backdrop now (after layout changes). */
  update(): void;
  destroy(): void;
}

export function createBackdropTint(
  nav: HTMLElement,
  disposer: Disposer,
  refraction: { setTransparency(value?: number): void } | undefined,
): BackdropTint {
  let transparency: number | undefined;
  let contrast: ContrastOptions | undefined;
  let backdropSignal: BackdropSignal | undefined;
  let backdrop: Required<BackdropSignal> = { tone: 'light', busy: false };
  let appliedTint: number | undefined | null = null;
  let contrastWatch: AbortController | undefined;
  let contrastFrame = 0;

  function applyTint(): void {
    const adaptive = contrast?.adaptiveTint;
    const busyTint = typeof adaptive === 'object' ? (adaptive.busy ?? 34) : 34;
    const value = adaptive && backdrop.busy ? Math.min(transparency ?? 60, busyTint) : transparency;
    if (value === appliedTint) return;
    appliedTint = value;
    nav.classList.toggle('lg-navbar--custom-tint', value !== undefined);
    nav.classList.toggle('lg-navbar--clear', value === 100);
    refraction?.setTransparency(value);
    if (value === undefined) nav.style.removeProperty('--lg-nav-tint');
    else nav.style.setProperty('--lg-nav-tint', String(1 - value / 100));
  }

  function regions(): Iterable<Element> {
    const source = contrast?.regions ?? '[data-navbar-backdrop]';
    return typeof source === 'string' ? document.querySelectorAll(source) : source();
  }

  function update(): void {
    if (!contrast && !backdropSignal) {
      if (nav.hasAttribute('data-lg-navbar-backdrop')) nav.removeAttribute('data-lg-navbar-backdrop');
      nav.classList.remove('lg-navbar--busy');
      backdrop = { tone: 'light', busy: false };
      applyTint();
      return;
    }
    const detected = contrast ? readBackdrop(nav, regions()) : { tone: 'light' as const, busy: false };
    backdrop = { tone: backdropSignal?.tone ?? detected.tone, busy: backdropSignal?.busy ?? detected.busy };
    if (nav.getAttribute('data-lg-navbar-backdrop') !== backdrop.tone)
      nav.setAttribute('data-lg-navbar-backdrop', backdrop.tone);
    nav.classList.toggle('lg-navbar--busy', backdrop.busy);
    applyTint();
  }

  function schedule(): void {
    if (!contrastFrame)
      contrastFrame = disposer.frame(() => {
        contrastFrame = 0;
        update();
      });
  }

  return {
    setTransparency(percentage) {
      if (percentage !== undefined && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
        throw new RangeError('Navbar transparency must be between 0 and 100.');
      }
      transparency = percentage;
      applyTint();
    },
    setContrast(value) {
      contrast = value === true ? {} : value || undefined;
      nav.classList.toggle('lg-navbar--no-halo', contrast?.halo === false);
      nav.classList.toggle('lg-navbar--no-glow', contrast?.glow === false);
      contrastWatch?.abort();
      contrastWatch = undefined;
      if (contrast) {
        contrastWatch = new AbortController();
        const watch = { passive: true, capture: true, signal: contrastWatch.signal } as const;
        addEventListener('scroll', schedule, watch);
        addEventListener('resize', schedule, watch);
      }
      update();
    },
    setBackdrop(next) {
      backdropSignal = next && (next.tone !== undefined || next.busy !== undefined) ? { ...next } : undefined;
      update();
    },
    update,
    destroy() {
      contrastWatch?.abort();
    },
  };
}

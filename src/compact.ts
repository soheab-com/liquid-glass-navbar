export type ScrollSource = Window | HTMLElement;

export interface ScrollCompactOptions {
  /** What to watch. Defaults to the window. Pass a function to resolve the scroller lazily. */
  source?: ScrollSource | (() => ScrollSource | null | undefined);
  /** How far the page must move in one direction before the bar changes, in px. Default 16. */
  threshold?: number;
}

/**
 * Calls `onChange(true)` after scrolling down and `onChange(false)` after scrolling back up or reaching the top.
 * Reversals shorter than the threshold and rubber-band overscroll past either end are ignored.
 */
export function watchScrollDirection(options: ScrollCompactOptions, onChange: (compact: boolean) => void): () => void {
  const resolve =
    typeof options.source === 'function' ? options.source : () => options.source as ScrollSource | undefined;
  const source = resolve() ?? window;
  const threshold = Math.max(1, options.threshold ?? 16);
  const listeners = new AbortController();
  const read = (): number => {
    if (source instanceof HTMLElement) {
      return Math.max(0, Math.min(source.scrollTop, source.scrollHeight - source.clientHeight));
    }
    const root = document.scrollingElement ?? document.documentElement;
    return Math.max(0, Math.min(scrollY, root.scrollHeight - innerHeight));
  };
  let compact = false;
  let turn = read();
  let frame = 0;
  source.addEventListener(
    'scroll',
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const top = read();
        if (!compact) {
          turn = Math.min(turn, top);
          if (top - turn < threshold) return;
          compact = true;
        } else {
          turn = Math.max(turn, top);
          if (turn - top < threshold && top > 0) return;
          compact = false;
        }
        turn = top;
        onChange(compact);
      });
    },
    { passive: true, signal: listeners.signal },
  );
  return () => {
    listeners.abort();
    cancelAnimationFrame(frame);
  };
}

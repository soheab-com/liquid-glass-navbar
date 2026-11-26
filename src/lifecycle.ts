// Cleanup that cannot be forgotten: register a teardown where the resource is created, and every
// registered teardown runs (newest first) when the navbar's AbortSignal fires in destroy().

export interface Disposer {
  /** Run `teardown` on dispose. Returns it for convenience. */
  add<T extends () => void>(teardown: T): T;
  /** requestAnimationFrame that is cancelled on dispose. Returns the frame id. */
  frame(callback: FrameRequestCallback): number;
  /** Disconnect an observer on dispose and return it. */
  observe<T extends { disconnect(): void }>(observer: T): T;
  readonly disposed: boolean;
}

export function createDisposer(signal: AbortSignal): Disposer {
  const teardowns: (() => void)[] = [];
  const frames = new Set<number>();
  let disposed = signal.aborted;
  const run = (): void => {
    disposed = true;
    for (const id of frames) cancelAnimationFrame(id);
    frames.clear();
    for (const teardown of teardowns.splice(0).reverse()) {
      try {
        teardown();
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  };
  if (!disposed) signal.addEventListener('abort', run, { once: true });
  return {
    add(teardown) {
      if (disposed) teardown();
      else teardowns.push(teardown);
      return teardown;
    },
    frame(callback) {
      if (disposed) return 0;
      const id = requestAnimationFrame((time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    },
    observe(observer) {
      if (disposed) observer.disconnect();
      else teardowns.push(() => observer.disconnect());
      return observer;
    },
    get disposed() {
      return disposed;
    },
  };
}

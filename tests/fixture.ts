// Exposes the source API to Playwright tests, which build markup and mount bars inside page.evaluate().
import * as lg from '../src/index.js';

declare global {
  interface Window {
    lg: typeof lg;
    calls: unknown[][];
  }
}

window.lg = lg;
window.calls = [];
document.documentElement.dataset.ready = 'true';

// A bar over a busy, refraction-marked backdrop, for visual checks and scripts/perf.mjs.
import { mountLiquidGlassNavbar } from '../src/index.js';

const backdrop = document.querySelector('.backdrop')!;
backdrop.innerHTML = Array.from({ length: 30 }, (_, index) =>
  `<p>${index % 2 ? 'Liquid glass bends what is behind it.' : 'Stripes, gradients and text show the refraction.'}</p>`).join('');
const bar = mountLiquidGlassNavbar(document.querySelector('#nav')!, { position: 'bottom', animations: true });
Object.assign(window, { bar });
document.documentElement.dataset.ready = 'true';

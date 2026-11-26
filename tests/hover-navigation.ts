import { mountLiquidGlassNavbar } from '../src/index.js';

for (const bar of document.querySelectorAll('nav')) {
  mountLiquidGlassNavbar(bar, { hoverNavigation: { group: 'example', delay: 80 } });
}

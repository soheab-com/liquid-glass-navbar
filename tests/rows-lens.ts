import { mountLiquidGlassNavbar } from '../src/index.js';

const nav = document.querySelector<HTMLElement>('nav')!;
const selected = nav.querySelector<HTMLButtonElement>('[aria-current]')!;
const lens = () => nav.querySelector<HTMLElement>('.lg-navbar__lens')!;
const result = document.querySelector<HTMLOutputElement>('#result')!;

// Settle the desktop markup before its first paint. Folding the temporary row into the last row moves
// the fixed host down a row, so reflow gives the selected tab an upward visual translation.
const bar = mountLiquidGlassNavbar(nav, { layout: 'rows', position: 'bottom', animations: true });
nav.querySelector<HTMLElement>('[data-navbar-row="3"]')!.dataset.navbarRow = '2';
bar.sync();
bar.sync();
const beforePaint = parseFloat(lens().style.top);

requestAnimationFrame(() => requestAnimationFrame(() => {
  const origin = nav.getBoundingClientRect().top + nav.clientTop;
  const section = selected.parentElement!;
  const expected = section.getBoundingClientRect().top + selected.offsetTop - origin;
  const actual = parseFloat(lens().style.top);
  const initialLayoutAligned = Math.abs(beforePaint - expected) < 1 && Math.abs(actual - expected) < 1;
  result.value = initialLayoutAligned ? 'PASS' : `FAIL: lens top ${beforePaint} before paint, ${actual} after paint, expected ${expected}`;
  result.dataset.passed = String(initialLayoutAligned);
}));

import { mountLiquidGlassNavbar } from '../src/index.js';

const nav = document.querySelector<HTMLElement>('nav')!;
const result = document.querySelector<HTMLOutputElement>('#result')!;
const settings = nav.querySelectorAll('button')[1]!;
mountLiquidGlassNavbar(nav, {
  overflow: { maxVisible: 1 },
  onSelect(item) {
    const selected = item === settings && item.getAttribute('aria-current') === 'page';
    result.value = selected ? 'PASS' : 'FAIL: the menu item was not selected';
    result.dataset.passed = String(selected);
  },
});

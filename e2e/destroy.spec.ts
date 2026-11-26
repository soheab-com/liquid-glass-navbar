import { expect, test } from '@playwright/test';
import { tab, tabs } from './helpers';

const scenarios: [string, string, Record<string, unknown>][] = [
  ['a plain bar', tabs('One', 'Two', 'Three'), {}],
  ['overflow', tabs('One', 'Two', 'Three', 'Four', 'Five'), { overflow: { maxVisible: 2 } }],
  ['collapsible rows', `<div data-navbar-section data-navbar-row="1">${tab('A')}${tab('B')}</div>`
    + `<div data-navbar-section data-navbar-row="2">${tab('Home', 'aria-current="page"')}</div>`, { layout: 'rows', collapsible: true }],
  ['view transitions and hover', tabs('One', 'Two'), { viewTransitionName: 'test-nav', hoverNavigation: true, scrollCompact: true }],
];

for (const [name, markup, options] of scenarios) {
  test(`destroy() restores the original markup: ${name}`, async ({ page }) => {
    await page.goto('/tests/fixture.html');
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    const result = await page.evaluate(async ({ markup, options }) => {
      const app = document.querySelector('#app')!;
      app.innerHTML = `<nav id="nav" aria-label="Test">${markup}</nav>`;
      const nav = document.querySelector<HTMLElement>('#nav')!;
      const before = nav.outerHTML;
      const headBefore = document.head.children.length;
      const bodyBefore = document.body.children.length;
      let selects = 0;
      const bar = window.lg.mountLiquidGlassNavbar(nav, { position: 'bottom', ...options, onSelect: () => { selects++; } });
      await new Promise((resolve) => setTimeout(resolve, 300));
      bar.destroy();
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Listeners are gone: clicking and resizing no longer reach the navbar.
      nav.querySelector<HTMLElement>('button')?.click();
      dispatchEvent(new Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        same: nav.outerHTML === before, before, after: nav.outerHTML,
        head: document.head.children.length - headBefore, body: document.body.children.length - bodyBefore, selects,
      };
    }, { markup, options });
    expect(result.after).toBe(result.before);
    expect(result.head).toBe(0);
    expect(result.body).toBe(0);
    expect(result.selects).toBe(0);
  });
}

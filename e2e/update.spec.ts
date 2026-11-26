import { expect, test } from '@playwright/test';
import { current, mount, tabs } from './helpers';

type Bar = { update(nav: HTMLElement, options?: { animate?: boolean }): void };

test('update() keeps keyed nodes and their listeners', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  await page.evaluate(() => {
    const two = document.querySelector<HTMLElement>('[data-navbar-key="two"]')!;
    (window as unknown as { kept: Element }).kept = two;
    two.addEventListener('click', () => window.calls.push(['listener']));
    const next = document.createElement('nav');
    next.innerHTML = `<button data-navbar-key="two" aria-current="page"><span data-navbar-label>Second</span></button>
      <button data-navbar-key="four"><span data-navbar-label>Four</span></button>`;
    (window as unknown as { bar: Bar }).bar.update(next);
  });
  const sameNode = await page.evaluate(
    () => document.querySelector('[data-navbar-key="two"]') === (window as unknown as { kept: Element }).kept,
  );
  expect(sameNode).toBe(true);
  await expect(current(page)).toHaveText('Second');
  await expect(page.locator('[data-navbar-key="one"]')).toHaveCount(0, { timeout: 5000 });
  await page.getByRole('button', { name: 'Second' }).click();
  expect(await page.evaluate(() => window.calls.filter((call) => call[0] === 'listener').length)).toBe(1);
});

test('update() with animate: false is immediate', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  const result = await page.evaluate(() => {
    const next = document.createElement('nav');
    next.innerHTML = '<button data-navbar-key="five" aria-current="page"><span data-navbar-label>Five</span></button>';
    (window as unknown as { bar: Bar }).bar.update(next, { animate: false });
    const lens = document.querySelector('#nav .lg-navbar__lens')!.getBoundingClientRect();
    const five = document.querySelector('[data-navbar-key="five"]')!.getBoundingClientRect();
    return {
      keys: [...document.querySelectorAll('#nav [data-navbar-key]')].map((item) =>
        item.getAttribute('data-navbar-key'),
      ),
      offset: Math.abs(lens.left + lens.width / 2 - (five.left + five.width / 2)),
      animations: document.getAnimations().length,
    };
  });
  expect(result.keys).toEqual(['five']);
  expect(result.offset).toBeLessThan(2);
});

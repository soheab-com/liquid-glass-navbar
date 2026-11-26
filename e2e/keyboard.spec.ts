import { expect, test } from '@playwright/test';
import { calls, current, mount, tabs } from './helpers';

// Tabs are native buttons and links: Tab moves between them, Enter and Space activate them. The bar has no
// roving arrow-key focus; Alt+Arrow reorders when `reorderable` is on.

test('Tab reaches each tab in order with a visible focus indicator', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  for (const label of ['One', 'Two', 'Three']) {
    await page.keyboard.press('Tab');
    const focused = page.getByRole('button', { name: label });
    await expect(focused).toBeFocused();
    const indicator = await focused.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        element.matches(':focus-visible') &&
        ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none')
      );
    });
    expect(indicator, `${label} shows focus`).toBe(true);
  }
});

for (const key of ['Enter', ' ']) {
  test(`${key === ' ' ? 'Space' : key} activates the focused tab`, async ({ page }) => {
    await mount(page, tabs('One', 'Two', 'Three'));
    await page.getByRole('button', { name: 'Two' }).focus();
    await page.keyboard.press(key);
    await expect(current(page)).toHaveText('Two');
    expect(await calls(page, 'select')).toEqual([['select', 'Two']]);
  });
}

test('Alt+Arrow reorders when reorderable, and arrows alone do nothing', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'), { reorderable: true });
  const order = () => page.locator('#nav > button').evaluateAll((items) => items.map((item) => item.textContent));
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await order()).toEqual(['One', 'Two', 'Three']);
  await page.keyboard.press('Alt+ArrowRight');
  expect(await order()).toEqual(['Two', 'One', 'Three']);
  await expect(page.getByRole('button', { name: 'One' })).toBeFocused();
});

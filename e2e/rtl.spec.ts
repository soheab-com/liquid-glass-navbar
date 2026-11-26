import { expect, type Page, test } from '@playwright/test';
import { calls, current, drag, expectLensOn, lensCenter, mount, tabs } from './helpers';

const five = tabs('One', 'Two', 'Three', 'Four', 'Five');
const rtl = 'aria-label="Test" dir="rtl"';
const x = async (page: Page, key: string) => (await page.locator(`[data-navbar-key="${key}"]`).boundingBox())!.x;

test('tabs run right to left and the lens starts on the first tab', async ({ page }) => {
  await mount(page, five, {}, rtl);
  expect(await x(page, 'one')).toBeGreaterThan(await x(page, 'five'));
  await expectLensOn(page, '[data-navbar-key="one"]');
});

test('a swipe selects the tab under release', async ({ page }) => {
  await mount(page, five, {}, rtl);
  await drag(page, '[data-navbar-key="one"]', '[data-navbar-key="four"]');
  await expect(current(page)).toHaveText('Four');
  expect(await calls(page, 'select')).toEqual([['select', 'Four']]);
  await expectLensOn(page, '[data-navbar-key="four"]');
});

for (const [edge, key, beyond] of [
  ['right', 'one', 200],
  ['left', 'five', -200],
] as const) {
  test(`dragging past the ${edge} edge rubber-bands and springs back`, async ({ page }) => {
    await mount(page, five, {}, rtl);
    const nav = (await page.locator('#nav').boundingBox())!;
    const end = (await page.locator(`[data-navbar-key="${key}"]`).boundingBox())!;
    const endCenter = end.x + end.width / 2;
    const pointer = {
      x: edge === 'right' ? nav.x + nav.width + beyond : Math.max(1, nav.x + beyond),
      y: end.y + end.height / 2,
    };
    await drag(page, '[data-navbar-key="three"]', pointer, 20, false);
    const stretched = await lensCenter(page);
    const overshoot = edge === 'right' ? stretched - endCenter : endCenter - stretched;
    expect(overshoot).toBeGreaterThan(1);
    expect(overshoot).toBeLessThan(120);
    await page.mouse.up();
    await expect(current(page)).toHaveText(key === 'one' ? 'One' : 'Five');
    await expectLensOn(page, `[data-navbar-key="${key}"]`);
  });
}

test('More sits at the visual end of the bar (the left)', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three', 'Four', 'Five', 'Six'), { overflow: { maxVisible: 3 } }, rtl);
  const more = (await page.locator('#nav .lg-navbar__more').boundingBox())!;
  expect(more.x).toBeLessThan(await x(page, 'three'));
  await page.locator('#nav .lg-navbar__more').click();
  await page.getByRole('button', { name: 'Five' }).click();
  await expect(current(page)).toHaveText('Five');
});

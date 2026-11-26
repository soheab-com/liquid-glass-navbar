import { expect, test } from '@playwright/test';
import { drag, mount, tabs } from './helpers';

type Bar = {
  setItemHidden(item: Element, hidden: boolean): void;
  setLens(options?: Record<string, unknown>): void;
  setColors(colors?: Record<string, string>): void;
  refreshColors(): void;
};

test('setItemHidden removes an item from layout and restores it', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  const two = page.getByRole('button', { name: 'Two' });
  const threeBefore = (await page.getByRole('button', { name: 'Three' }).boundingBox())!.x;
  await page.evaluate(() =>
    (window as unknown as { bar: Bar }).bar.setItemHidden(document.querySelector('[data-navbar-key="two"]')!, true),
  );
  await expect(two).toBeHidden();
  await expect
    .poll(async () => (await page.getByRole('button', { name: 'Three' }).boundingBox())!.x)
    .toBeLessThan(threeBefore - 10);
  await page.evaluate(() =>
    (window as unknown as { bar: Bar }).bar.setItemHidden(document.querySelector('[data-navbar-key="two"]')!, false),
  );
  await expect(two).toBeVisible();
});

test('setLens applies and resets lens styling', async ({ page }) => {
  await mount(page, tabs('One', 'Two'));
  const lens = page.locator('#nav .lg-navbar__lens');
  await page.evaluate(() =>
    (window as unknown as { bar: Bar }).bar.setLens({
      style: 'tinted',
      accent: 'rgb(255, 0, 0)',
      radius: '6px',
      blur: 4,
    }),
  );
  await expect(lens).toHaveAttribute('data-navbar-lens', 'tinted');
  expect(
    await lens.evaluate((element) => [
      (element as HTMLElement).style.getPropertyValue('--lg-nav-lens-accent'),
      (element as HTMLElement).style.getPropertyValue('--lg-nav-lens-blur'),
    ]),
  ).toEqual(['rgb(255, 0, 0)', '4px']);
  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.setLens());
  await expect(lens).not.toHaveAttribute('data-navbar-lens');
  expect(await lens.getAttribute('style')).not.toContain('--lg-nav-lens-accent');
  const error = await page.evaluate(() => {
    try {
      (window as unknown as { bar: Bar }).bar.setLens({ blur: -1 });
      return '';
    } catch (caught) {
      return (caught as Error).name;
    }
  });
  expect(error).toBe('RangeError');
});

test('setColors sets variables and restores authored ones', async ({ page }) => {
  await mount(page, tabs('One', 'Two'), {}, 'aria-label="Test" style="--lg-nav-accent: rgb(1, 2, 3)"');
  const read = () =>
    page.locator('#nav').evaluate((nav) => (nav as HTMLElement).style.getPropertyValue('--lg-nav-accent'));
  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.setColors({ selected: 'rgb(200, 0, 0)' }));
  expect(await read()).toBe('rgb(200, 0, 0)');
  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.setColors());
  expect(await read()).toBe('rgb(1, 2, 3)');
});

test('refreshColors repaints the lens ink with the current theme mid-gesture', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  await drag(page, '[data-navbar-key="one"]', '[data-navbar-key="two"]', 12, false);
  const inkColours = () =>
    page
      .locator('#nav .lg-navbar__ink')
      .evaluateAll((copies) => [...new Set(copies.map((copy) => (copy as HTMLElement).style.color))]);
  await expect.poll(async () => (await inkColours()).length).toBeGreaterThan(0);
  await page
    .locator('#nav')
    .evaluate((nav) => (nav as HTMLElement).style.setProperty('--lg-nav-accent', 'rgb(0, 128, 0)'));
  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.refreshColors());
  expect((await inkColours()).join()).toContain('rgb(0, 128, 0)');
  await page.mouse.up();
});

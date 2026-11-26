import { expect, test } from '@playwright/test';
import { calls, current, mount, tab, tabs } from './helpers';

const focused = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () => document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label'),
  );

test('Tab reaches each tab in order with a visible focus ring', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  for (const label of ['One', 'Two', 'Three']) {
    await page.keyboard.press('Tab');
    const item = page.getByRole('button', { name: label });
    await expect(item).toBeFocused();
    const ring = await item.evaluate((element) => {
      const style = getComputedStyle(element);
      return element.matches(':focus-visible') && style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 2;
    });
    expect(ring, `${label} shows focus`).toBe(true);
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

test('arrow keys move focus without selecting, and wrap', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('Two');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('One');
  await page.keyboard.press('ArrowLeft');
  expect(await focused(page)).toBe('Three');
  await expect(current(page)).toHaveText('One');
  expect(await calls(page, 'select')).toEqual([]);
});

test('Home and End jump to the first and last control', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three', 'Four'));
  await page.getByRole('button', { name: 'Two' }).focus();
  await page.keyboard.press('End');
  expect(await focused(page)).toBe('Four');
  await page.keyboard.press('Home');
  expect(await focused(page)).toBe('One');
});

test('in right-to-left bars, arrows follow the screen', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'), {}, 'aria-label="Test" dir="rtl"');
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('ArrowLeft');
  expect(await focused(page)).toBe('Two');
  await page.keyboard.press('Home');
  expect(await focused(page)).toBe('One');
});

test('vertical bars use Up and Down', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'), { position: 'left' });
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('ArrowDown');
  expect(await focused(page)).toBe('Two');
  await page.keyboard.press('ArrowUp');
  expect(await focused(page)).toBe('One');
});

test('Up and Down move between rows', async ({ page }) => {
  const rows =
    `<div data-navbar-section data-navbar-row="1">${tab('Alpha')}${tab('Beta')}</div>` +
    `<div data-navbar-section data-navbar-row="2">${tab('Home', 'aria-current="page"')}${tab('Search')}${tab('Profile')}</div>`;
  await mount(page, rows, { layout: 'rows' });
  await page.getByRole('button', { name: 'Home' }).focus();
  await page.keyboard.press('ArrowUp');
  expect(['Alpha', 'Beta']).toContain(await focused(page));
  await page.keyboard.press('ArrowDown');
  expect(['Home', 'Search', 'Profile']).toContain(await focused(page));
});

test('More is reachable with arrows, and Up and Down move through its menu', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three', 'Four', 'Five'), { overflow: { maxVisible: 2 } });
  await page.getByRole('button', { name: 'Two' }).focus();
  await page.keyboard.press('ArrowRight');
  const more = page.locator('#nav .lg-navbar__more');
  await expect(more).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Three' }).focus();
  await page.keyboard.press('ArrowDown');
  expect(await focused(page)).toBe('Four');
  await page.keyboard.press('End');
  expect(await focused(page)).toBe('Five');
  await page.keyboard.press('Enter');
  await expect(current(page)).toHaveText('Five');
});

test('keyboardNavigation: false leaves arrow keys alone', async ({ page }) => {
  await mount(page, tabs('One', 'Two'), { keyboardNavigation: false });
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('One');
});

test('Alt+Arrow reorders when reorderable and announces the new position', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'), { reorderable: true });
  const order = () => page.locator('#nav > button').evaluateAll((items) => items.map((item) => item.textContent));
  await page.getByRole('button', { name: 'One' }).focus();
  await page.keyboard.press('Alt+ArrowRight');
  expect(await order()).toEqual(['Two', 'One', 'Three']);
  await expect(page.getByRole('button', { name: 'One' })).toBeFocused();
  await expect(page.locator('#nav [role="status"]')).toHaveText('Moved One to position 2 of 3');
});

test('Alt+Arrow follows the screen in right-to-left bars', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'), { reorderable: true }, 'aria-label="Test" dir="rtl"');
  const order = () => page.locator('#nav > button').evaluateAll((items) => items.map((item) => item.textContent));
  await page.getByRole('button', { name: 'Two' }).focus();
  await page.keyboard.press('Alt+ArrowLeft');
  expect(await order()).toEqual(['One', 'Three', 'Two']);
});

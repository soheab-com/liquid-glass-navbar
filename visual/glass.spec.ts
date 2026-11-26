import { expect, type Page, test } from '@playwright/test';

test.use({ viewport: { width: 700, height: 320 }, reducedMotion: 'reduce' });

async function open(page: Page, path = '/tests/glass.html'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  // Copy-mode refraction finishes loading its map a moment after mounting.
  await page.waitForTimeout(500);
}

const shot = (page: Page, name: string) =>
  expect(page.locator('#nav')).toHaveScreenshot(`${name}.png`, { animations: 'disabled', caret: 'hide' });

test('resting, light', async ({ page }) => {
  await open(page);
  await shot(page, 'rest-light');
});

test('resting, dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  await shot(page, 'rest-dark');
});

test('frosted, without a marked backdrop', async ({ page }) => {
  await open(page, '/tests/glass-plain.html');
  await shot(page, 'frosted');
});

test('lens dragged between tabs', async ({ page }) => {
  await open(page);
  const tabs = page.locator('#nav > button');
  const from = (await tabs.nth(0).boundingBox())!;
  const to = (await tabs.nth(2).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2 - 10, to.y + to.height / 2, { steps: 8 });
  await page.waitForTimeout(200);
  await expect(page).toHaveScreenshot('dragging.png', { animations: 'disabled', clip: { x: 0, y: 180, width: 700, height: 140 } });
  await page.mouse.up();
});

test('Increase Contrast', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' });
  await open(page);
  await shot(page, 'contrast-more');
});

test('forced colours', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium emulates forced-colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);
  await shot(page, 'forced-colors');
});

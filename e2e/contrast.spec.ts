import { expect, test } from '@playwright/test';
import { mount, tabs } from './helpers';

test('Increase Contrast makes the surface opaque and the lens ring thicker', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' });
  await mount(page, tabs('One', 'Two', 'Three'));
  expect(await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)).toBe(true);
  const style = await page.locator('#nav').evaluate((nav) => ({
    tint: getComputedStyle(nav).getPropertyValue('--lg-nav-tint').trim(),
    surfaceOpacity: getComputedStyle(nav, '::after').opacity,
    lensRing: getComputedStyle(nav.querySelector('.lg-navbar__lens')!).getPropertyValue('--_lg-lens-rim-width').trim(),
  }));
  expect(style).toEqual({ tint: '1', surfaceOpacity: '1', lensRing: '2px' });
});

test('forced colours draw the lens with system colours', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium emulates forced-colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, tabs('One', 'Two', 'Three'));
  const result = await page.locator('#nav').evaluate((nav) => {
    const lens = getComputedStyle(nav.querySelector('.lg-navbar__lens')!);
    const highlight = document.createElement('div');
    highlight.style.cssText = 'forced-color-adjust: none; background: Highlight; color: HighlightText';
    document.body.append(highlight);
    const expected = getComputedStyle(highlight).backgroundColor;
    const expectedText = getComputedStyle(highlight).color;
    const label = getComputedStyle(nav.querySelector('[aria-current="page"] [data-navbar-label]')!).color;
    highlight.remove();
    return {
      lens: lens.backgroundColor,
      expected,
      label,
      expectedText,
      border: lens.borderTopWidth,
      backdrop: getComputedStyle(nav, '::before').backdropFilter,
    };
  });
  expect(result.lens).toBe(result.expected);
  expect(result.label).toBe(result.expectedText);
  expect(result.border).toBe('2px');
  expect(result.backdrop).toBe('none');
});

test('without contrast preferences nothing changes', async ({ page }) => {
  await mount(page, tabs('One', 'Two'));
  const tint = await page
    .locator('#nav')
    .evaluate((nav) => getComputedStyle(nav).getPropertyValue('--lg-nav-tint').trim());
  expect(tint).not.toBe('1');
});

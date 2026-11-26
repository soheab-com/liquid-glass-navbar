import { expect, test } from '@playwright/test';

// Blink bends the live backdrop; WebKit and Gecko bend a copy of the elements marked data-navbar-refract.
test('each engine gets refraction over a marked backdrop', async ({ page, browserName }) => {
  await page.goto('/tests/glass.html');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const glass = page.locator('#nav');
  if (browserName === 'chromium') {
    await expect.poll(() => glass.evaluate((nav) => getComputedStyle(nav, '::before').backdropFilter)).toContain('url(');
  } else {
    const lens = page.locator('#nav .lg-navbar__refraction-copy .lg-navbar__refraction-lens');
    await expect(lens).toHaveCount(1);
    await expect.poll(() => lens.evaluate((element) => (element as HTMLElement).style.filter)).toContain('url(');
    expect(await page.locator('#nav .lg-navbar__refraction-frame > *').count()).toBeGreaterThan(0);
  }
});

test('without a marked backdrop, copy-mode engines keep frosted glass', async ({ page, browserName }) => {
  test.skip(browserName === 'chromium', 'Blink bends the live backdrop and needs no marked sources.');
  await page.goto('/tests/glass-plain.html');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.waitForTimeout(300);
  const filter = await page.locator('#nav').evaluate((nav) => getComputedStyle(nav, '::before').backdropFilter);
  expect(filter).toMatch(/blur\((?!0px)[\d.]+px\)/);
});

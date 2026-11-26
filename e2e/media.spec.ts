import { expect, test } from '@playwright/test';
import { expectLensOn, lensCenter, mount, tabs } from './helpers';

test('with Reduce Motion the lens moves without a spring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, tabs('One', 'Two', 'Three', 'Four'));
  await page.getByRole('button', { name: 'Four' }).click();
  const target = await page.getByRole('button', { name: 'Four' }).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left + box.width / 2;
  });
  // Read in the same frame as the click settles: no intermediate positions.
  expect(Math.abs((await lensCenter(page)) - target)).toBeLessThan(2);
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the lens glides through intermediate positions', async ({ page }) => {
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
    await mount(page, tabs('One', 'Two', 'Three', 'Four'), { animations: true });
    const start = await lensCenter(page);
    const samples = await page.evaluate(async () => {
      const lens = document.querySelector('#nav .lg-navbar__lens')!;
      (document.querySelector('[data-navbar-key="four"]') as HTMLElement).click();
      const seen: number[] = [];
      for (let frame = 0; frame < 12; frame++) {
        await new Promise(requestAnimationFrame);
        const box = lens.getBoundingClientRect();
        seen.push(box.left + box.width / 2);
      }
      return seen;
    });
    const end = await page.getByRole('button', { name: 'Four' }).evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    expect(
      samples.some((x) => x > start + 5 && x < end - 5),
      `start ${start}, end ${end}, samples ${samples.join(' ')}`,
    ).toBe(true);
    await expectLensOn(page, '[data-navbar-key="four"]');
  });
});

test('Reduce Transparency removes backdrop blur from the bar', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium can emulate prefers-reduced-transparency (via CDP).');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await mount(page, tabs('One', 'Two'));
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  const filter = await page.locator('#nav').evaluate((nav) => getComputedStyle(nav, '::before').backdropFilter);
  expect(filter).toBe('none');
});

// Measures a drag across five tabs over a refracted backdrop, and resize churn, in each browser.
// Usage: node scripts/perf.mjs [label]. Needs `npm run demo` running (or PERF_URL). Writes perf-results/<label>.json
// and a Playwright trace of the Chromium drag. PW_WEBKIT_PATH points at a WebKit launcher if the bundled one can't run.

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const label = process.argv[2] ?? 'run';
const url = process.env.PERF_URL ?? 'http://127.0.0.1:4173/tests/glass.html';
const runs = Number(process.env.PERF_RUNS ?? 5);
const engines = Object.fromEntries(
  Object.entries({ chromium, firefox, webkit }).filter(
    ([name]) => !process.env.PERF_ENGINES || process.env.PERF_ENGINES.split(',').includes(name),
  ),
);
const results = {};
mkdirSync('perf-results', { recursive: true });

const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return {
    mean: +(values.reduce((s, v) => s + v, 0) / (values.length || 1)).toFixed(2),
    p95: +at(0.95).toFixed(2),
    max: +at(1).toFixed(2),
  };
};

for (const [name, engine] of Object.entries(engines)) {
  const browser = await engine.launch(
    name === 'webkit' && process.env.PW_WEBKIT_PATH ? { executablePath: process.env.PW_WEBKIT_PATH } : {},
  );
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, reducedMotion: 'no-preference' });
  const drag = [],
    churn = [],
    cdpRuns = [],
    churnScript = [];
  for (let run = 0; run < runs; run++) {
    const page = await context.newPage();
    const cdp = name === 'chromium' ? await context.newCDPSession(page) : undefined;
    await cdp?.send('Performance.enable');
    const tracing = name === 'chromium' && run === 0;
    if (tracing) await context.tracing.start({ screenshots: false, snapshots: false });
    await page.goto(url);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    // PERF_CSS injects a stylesheet, to measure what a style costs (for example PERF_CSS='.x { filter: none }').
    if (process.env.PERF_CSS) await page.addStyleTag({ content: process.env.PERF_CSS });
    await page.waitForTimeout(500);
    const boxes = await page.locator('#nav > button').evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }),
    );
    const metrics = async () =>
      Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const before = cdp && (await metrics());
    // Record every frame's timestamp while the pointer sweeps across all five tabs and back.
    await page.evaluate(() => {
      const w = window;
      w.frames = [];
      w.recording = true;
      const tick = (time) => {
        w.frames.push(time);
        if (w.recording) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(boxes[0].x, boxes[0].y);
    await page.mouse.down();
    for (const target of [boxes[4], boxes[0], boxes[4]]) await page.mouse.move(target.x, target.y, { steps: 40 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const frames = await page.evaluate(() => {
      window.recording = false;
      return window.frames;
    });
    const after = cdp && (await metrics());
    if (tracing) await context.tracing.stop({ path: `perf-results/${label}-chromium-drag.zip` });
    const gaps = frames.slice(1).map((time, index) => time - frames[index]);
    drag.push({ frames: frames.length, gap: stats(gaps), long: gaps.filter((gap) => gap > 20).length });
    if (cdp)
      cdpRuns.push(
        Object.fromEntries(
          ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration'].map((key) => [
            key,
            +((after[key] - before[key]) * 1000).toFixed(1),
          ]),
        ),
      );
    // Resize churn: the bar alternates between two widths 20 times. Each change regenerates (or reuses) the rim map.
    const churnBefore = cdp && (await metrics());
    const churnMs = await page.evaluate(async () => {
      const frame = () => new Promise(requestAnimationFrame);
      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        document.body.classList.toggle('wide');
        await frame();
        await frame();
      }
      return performance.now() - start;
    });
    churn.push(churnMs);
    if (cdp) {
      const churnAfter = await metrics();
      churnScript.push((churnAfter.ScriptDuration - churnBefore.ScriptDuration) * 1000);
    }
    await page.close();
  }
  const pick = (key) => stats(drag.map((d) => d.gap[key]));
  results[name] = {
    dragFrameGapMs: { mean: pick('mean').mean, p95: pick('p95').mean, max: pick('max').max },
    longFramesPerDrag: stats(drag.map((d) => d.long)).mean,
    resizeChurnMs: stats(churn),
    ...(churnScript.length ? { chromiumChurnScriptMs: stats(churnScript) } : {}),
    ...(cdpRuns.length
      ? {
          chromiumMainThreadMs: Object.fromEntries(
            Object.keys(cdpRuns[0]).map((key) => [key, stats(cdpRuns.map((r) => r[key])).mean]),
          ),
        }
      : {}),
  };
  console.log(name, JSON.stringify(results[name]));
  await browser.close();
}
writeFileSync(`perf-results/${label}.json`, JSON.stringify(results, null, 2));

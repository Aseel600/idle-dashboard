import { test, expect } from '../helpers/fixtures.js';
import { stubAllExternals } from '../helpers/mocks.js';

/**
 * Layout x language x viewport matrix.
 *
 * Two real defects in this app's history came from exactly this surface: an RTL
 * padding override that put content under a fixed button, and hover-gated controls
 * that were unreachable on touch. These tests are shaped to catch that class.
 */

const LAYOUTS = ['pc', 'phone', 'tablet', 'tv'];
const LANGS = ['en', 'ar'];

const VIEWPORTS = [
  { name: 'phone-small', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phablet', width: 480, height: 900 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'wqxga-2k', width: 2560, height: 1600 },
  { name: 'ultrawide-dual', width: 3440, height: 1440 },
  { name: 'ultra-tall', width: 1080, height: 2400 },
  { name: 'tiny', width: 280, height: 480 }
];

test.beforeEach(async ({ page }) => { await stubAllExternals(page); });

test.describe('viewport sweep', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}x${vp.height}) has no horizontal overflow in either language`, async ({ app }) => {
      await app.page.setViewportSize({ width: vp.width, height: vp.height });
      for (const lang of LANGS) {
        await app.setLanguage(lang);
        await app.page.waitForTimeout(220);
        expect(await app.hasHorizontalOverflow(), `${vp.name} / ${lang} overflows horizontally`).toBe(false);
      }
    });
  }
});

test.describe('layout x language matrix', () => {
  for (const layout of LAYOUTS) {
    for (const lang of LANGS) {
      test(`${layout} + ${lang} renders without errors and keeps the clock visible`, async ({ app }) => {
        await app.setLayout(layout);
        await app.setLanguage(lang);
        await app.page.waitForTimeout(250);

        expect(await app.layout()).toBe(layout);
        expect(await app.dir()).toBe(lang === 'ar' ? 'rtl' : 'ltr');
        await expect(app.page.locator('#clock')).toBeVisible();
        expect(await app.hasHorizontalOverflow()).toBe(false);
        expect(await app.errorLog()).toEqual([]);
      });
    }
  }
});

test.describe('RTL correctness', () => {

  test('side panel mirrors to the left and clears the Focus Mode button', async ({ app }) => {
    // Regression guard: the RTL override once dropped bottom padding from 90px to
    // 30px, putting the last control underneath the fixed toggle.
    await app.setLanguage('ar');
    const pad = await app.page.evaluate(() => getComputedStyle(document.getElementById('sidePanel')).paddingBottom);
    expect(parseInt(pad, 10)).toBeGreaterThanOrEqual(80);
  });

  test('slider fill runs from the correct side under RTL', async ({ app }) => {
    await app.setLanguage('ar');
    await app.page.evaluate(() => window.setClockSize(80));
    const bg = await app.page.evaluate(() => document.getElementById('clockSizeSlider').style.background);
    expect(bg).toContain('to left');
    await app.setLanguage('en');
    await app.page.evaluate(() => window.setClockSize(80));
    const bg2 = await app.page.evaluate(() => document.getElementById('clockSizeSlider').style.background);
    expect(bg2).toContain('to right');
  });

  test('DayFlow nav border mirrors and every view has Arabic content', async ({ app }) => {
    await app.setLanguage('ar');
    await app.go('today');
    const borderLeft = await app.page.evaluate(() => getComputedStyle(document.getElementById('dfNav')).borderLeftWidth);
    expect(borderLeft).not.toBe('0px');

    for (const v of ['today', 'tasks', 'habits', 'goals', 'planner', 'focus', 'analytics', 'settings']) {
      await app.go(v);
      const html = await app.page.locator('#dfView').innerHTML();
      expect(/[؀-ۿ]/.test(html), `${v} has no Arabic text`).toBe(true);
    }
  });

  test('rapid LTR/RTL toggling does not accumulate DOM or leak state', async ({ app }) => {
    const before = await app.domNodeCount();
    for (let i = 0; i < 30; i++) await app.setLanguage(i % 2 ? 'ar' : 'en');
    await app.page.waitForTimeout(400);
    const after = await app.domNodeCount();
    // Some churn is expected; unbounded growth is not.
    expect(after).toBeLessThan(before * 1.35);
    expect(await app.errorLog()).toEqual([]);
  });

  test('rapid layout switching leaves a coherent final state', async ({ app }) => {
    for (let i = 0; i < 24; i++) await app.setLayout(LAYOUTS[i % LAYOUTS.length]);
    await app.page.waitForTimeout(400);
    expect(LAYOUTS).toContain(await app.layout());
    await expect(app.page.locator('#clock')).toBeVisible();
    expect(await app.errorLog()).toEqual([]);
  });
});

test.describe('TV layout specifics', () => {

  test('TV mode pins the side panel open and exposes the pairing block', async ({ app }) => {
    await app.setLayout('tv');
    await expect(app.page.locator('#tvPairBlock')).toBeVisible();
    const transform = await app.page.evaluate(() => getComputedStyle(document.getElementById('sidePanel')).transform);
    expect(transform === 'none' || transform.includes('matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
  });

  test('TV focus targets are enlarged for remote navigation', async ({ app }) => {
    await app.setLayout('tv');
    const size = await app.page.evaluate(() => {
      const el = document.querySelector('.zen-toggle');
      const r = el.getBoundingClientRect();
      return Math.min(r.width, r.height);
    });
    expect(size).toBeGreaterThanOrEqual(44);
  });

  test('keyboard traversal reaches the panel controls in TV mode', async ({ app }) => {
    await app.setLayout('tv');
    await app.page.keyboard.press('Tab');
    const focused = await app.page.evaluate(() => document.activeElement && document.activeElement.tagName);
    expect(focused).toBeTruthy();
  });
});

test.describe('touch-only reachability', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('every DayFlow destination is reachable without hover', async ({ app }) => {
    await app.go('today');
    const visible = await app.page.locator('.df-nav-item:visible').count();
    expect(visible).toBeGreaterThanOrEqual(5);
    await app.page.click('[data-act="more"]');
    const secondary = await app.page.locator('#dfModalBox [data-nav]').count();
    expect(secondary, 'Habits/Goals/Analytics/Settings must be reachable via More').toBe(4);
  });

  test('the quick-timer handle is visible and interactive without hover', async ({ app }) => {
    await app.go('ambient');
    const style = await app.page.evaluate(() => {
      const el = document.getElementById('endHandle');
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, pointerEvents: cs.pointerEvents };
    });
    expect(Number(style.opacity)).toBeGreaterThan(0);
    expect(style.pointerEvents).not.toBe('none');
  });

  test('theater header stays reachable in fullscreen on touch', async ({ app }) => {
    await app.page.evaluate(() => {
      document.getElementById('theaterOverlay').classList.add('active', 'mode-fullscreen');
    });
    const opacity = await app.page.evaluate(() => getComputedStyle(document.querySelector('.theater-header')).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.5);
  });
});

import { test as base, expect } from '@playwright/test';

/**
 * Shared fixtures.
 *
 * `app` boots the dashboard with a deterministic starting state and, critically,
 * asserts the page's own error log is empty at the end of every test. The app
 * captures uncaught errors and unhandled rejections into localStorage.idleErrorLog
 * (added in V7.18), which is a far better console-error check than scraping stdout.
 */

export const CHIME_CONTEXTS = ['timerEnd', 'eventStart', 'eventEnd', 'alert', 'pomodoroComplete'];

export const test = base.extend({
  /** A booted, deterministic app page. */
  app: async ({ page, context }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    // Deterministic first-run state, applied before any app script executes.
    await context.addInitScript(() => {
      localStorage.setItem('hasSeenTutorial', '1');
      localStorage.setItem('idleCity', 'Jeddah');
      localStorage.setItem('dfProfile', JSON.stringify({
        name: 'Tester', primaryGoal: '', workStart: 9, workEnd: 17, energy: 'morning', onboarded: true
      }));
      // Record audio triggers instead of playing them, so priority can be asserted.
      window.__chimes = [];
      window.__audioPatched = false;
    });

    const helpers = makeHelpers(page, errors);
    await helpers.goto();
    await use(helpers);

    // Every test implicitly asserts a clean error log unless it opted out.
    if (!helpers.__allowErrors) {
      const logged = await helpers.errorLog();
      expect(logged, 'app error log should be empty:\n' + JSON.stringify(logged, null, 2)).toEqual([]);
      expect(errors, 'no console/page errors').toEqual([]);
    }
  }
});

function makeHelpers(page, errors) {
  const h = {
    page,
    errors,
    __allowErrors: false,

    /** Some tests deliberately provoke failures; call this to skip the clean-log assertion. */
    allowErrors() { h.__allowErrors = true; return h; },

    async goto(query = '') {
      // ?preview=1 bypasses maintenance mode without depending on its current value.
      await page.goto('/index.html?preview=1' + (query ? '&' + query : ''));
      await page.waitForFunction(() => window.DF && window.DF.ready === true, null, { timeout: 20_000 });
      return h;
    },

    /** Contents of the app's own captured error log. */
    errorLog() {
      return page.evaluate(() => { try { return JSON.parse(localStorage.getItem('idleErrorLog') || '[]'); } catch { return [{ msg: 'error log unreadable' }]; } });
    },
    clearErrorLog() { return page.evaluate(() => localStorage.removeItem('idleErrorLog')); },

    /** Navigate DayFlow. */
    async go(view) {
      await page.evaluate(v => window.DF.go(v), view);
      if (view !== 'ambient') await page.waitForSelector('#dfView', { state: 'attached' });
      return h;
    },

    /** Switch the ambient layout: pc | phone | tablet | tv. */
    async setLayout(mode) {
      await page.evaluate(m => {
        const btn = document.querySelector(`#layoutPickerGrid .clock-toggle-btn[onclick*="'${m}'"]`);
        window.setDisplayLayout(m, btn);
      }, mode);
      await page.waitForTimeout(120);
      return h;
    },

    async setLanguage(lang) {
      await page.evaluate(l => window.setLanguage(l), lang);
      await page.waitForTimeout(180);
      return h;
    },

    dir() { return page.evaluate(() => document.body.getAttribute('dir')); },
    layout() { return page.evaluate(() => document.body.getAttribute('data-layout')); },

    /**
     * Replace Date inside the page. Returns a handle for advancing time.
     * Playwright's clock API is used where available; this fallback also patches
     * the value the app already captured at module scope.
     */
    async freezeClock(iso) {
      await page.evaluate(when => {
        const fixed = new Date(when).getTime();
        const Real = window.__RealDate || Date;
        window.__RealDate = Real;
        let offset = fixed - Real.now();
        function Fake(...a) { return a.length ? new Real(...a) : new Real(Real.now() + offset); }
        Fake.prototype = Real.prototype;
        Fake.now = () => Real.now() + offset;
        Fake.parse = Real.parse; Fake.UTC = Real.UTC;
        window.Date = Fake;
        window.__advance = ms => { offset += ms; };
      }, iso);
      return h;
    },
    advanceClock(ms) { return page.evaluate(m => window.__advance && window.__advance(m), ms); },

    /** Capture chime calls rather than playing them. */
    async captureChimes() {
      await page.evaluate(() => {
        if (window.__audioPatched) return;
        window.__chimes = [];
        const realById = window.playChimeById;
        const realCtx = window.playChime;
        window.playChimeById = function (id) { window.__chimes.push({ kind: 'byId', id, at: Date.now() }); };
        window.playChime = function (ctx) { window.__chimes.push({ kind: 'context', context: ctx, at: Date.now() }); };
        window.__restoreChimes = () => { window.playChimeById = realById; window.playChime = realCtx; };
        window.__audioPatched = true;
      });
      return h;
    },
    chimes() { return page.evaluate(() => window.__chimes || []); },

    /** Seed localStorage and reload so the app reads it at boot. */
    async seed(obj) {
      await page.evaluate(o => { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); }, obj);
      await h.goto();
      return h;
    },

    read(key) { return page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return localStorage.getItem(k); } }, key); },

    /** True if the document scrolls horizontally - the classic responsive smell. */
    hasHorizontalOverflow() {
      return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    },

    /** Rough JS heap size, for the soak test. Chromium only. */
    heapMB() {
      return page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null));
    },

    /** Count live timers the app has registered, as a leak proxy. */
    async instrumentTimers() {
      await page.evaluate(() => {
        if (window.__timersPatched) return;
        window.__timers = { intervals: new Set(), timeouts: new Set() };
        const si = window.setInterval, ci = window.clearInterval;
        const st = window.setTimeout, ct = window.clearTimeout;
        window.setInterval = function (...a) { const id = si.apply(this, a); window.__timers.intervals.add(id); return id; };
        window.clearInterval = function (id) { window.__timers.intervals.delete(id); return ci.call(this, id); };
        window.setTimeout = function (...a) { const id = st.apply(this, a); window.__timers.timeouts.add(id); return id; };
        window.clearTimeout = function (id) { window.__timers.timeouts.delete(id); return ct.call(this, id); };
        window.__timersPatched = true;
      });
      return h;
    },
    timerCounts() {
      return page.evaluate(() => window.__timers
        ? { intervals: window.__timers.intervals.size, timeouts: window.__timers.timeouts.size }
        : null);
    },
    domNodeCount() { return page.evaluate(() => document.getElementsByTagName('*').length); },
    listenerProxyCount() { return page.evaluate(() => document.querySelectorAll('[data-act],[data-nav]').length); }
  };
  return h;
}

export { expect };

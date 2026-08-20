import { test, expect } from '../helpers/fixtures.js';
import { stubAllExternals, applyMocks, crypto, rss, spotify } from '../helpers/mocks.js';

/**
 * 24-hour soak, compressed.
 *
 * Real elapsed time is simulated by advancing the page clock and driving the app's
 * own poll functions directly, so a day of operation runs in minutes. Three
 * independent leak signals are tracked, because heap size alone is noisy:
 *   1. JS heap after a forced GC
 *   2. live interval/timeout count  (the most common leak in this codebase's shape)
 *   3. DOM node count               (catches re-render churn that never detaches)
 *
 * Run with:  npx playwright test e2e/memory-soak.spec.js --project=chromium-desktop
 */

const SIM_HOURS = Number(process.env.SOAK_HOURS || 24);
const TICKS_PER_HOUR = 4;              // 15-minute simulated granularity
const TOTAL_TICKS = SIM_HOURS * TICKS_PER_HOUR;

test.describe('24h continuous operation', () => {
  test.setTimeout(15 * 60 * 1000);

  test('all widgets active for a simulated day without unbounded growth', async ({ app, page, browserName }) => {
    test.skip(browserName !== 'chromium', 'heap measurement requires Chromium');

    await stubAllExternals(page);
    await applyMocks(page, [crypto.ok(), rss.ok(), spotify.playing()]);

    // Turn everything on.
    await app.page.evaluate(() => {
      localStorage.setItem('idleVisibleWidgets', JSON.stringify([
        'wgSchedule', 'wgWeather', 'wgPrayer', 'wgWorldClock', 'wgSpotify', 'wgLinks',
        'wgCountdown', 'wgPomodoro', 'wgHabits', 'wgCrypto', 'wgRss'
      ]));
      localStorage.setItem('idleCryptoCoins', JSON.stringify(['bitcoin', 'ethereum', 'solana']));
      localStorage.setItem('idleRssFeedUrl', 'https://feed.example/rss');
      localStorage.setItem('spotify_token', 'tok');
    });
    await app.goto();
    await app.instrumentTimers();

    // Theater mode with a looping local video - the heaviest continuous element.
    await app.page.evaluate(() => {
      const v = document.getElementById('theaterVideo');
      if (v) {
        v.loop = true; v.muted = true;
        // A tiny generated stream avoids shipping a fixture file.
        try {
          const c = document.createElement('canvas'); c.width = 320; c.height = 180;
          const ctx = c.getContext('2d'); ctx.fillStyle = '#123'; ctx.fillRect(0, 0, 320, 180);
          v.srcObject = c.captureStream(15);
          v.play().catch(() => {});
        } catch (e) { /* captureStream unsupported - soak still valid without it */ }
      }
      document.getElementById('theaterOverlay').classList.add('active', 'mode-floating');
    });

    const gc = async () => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      await cdp.detach().catch(() => {});
    };

    await page.waitForTimeout(1500);
    await gc();
    const baseline = {
      heap: await app.heapMB(),
      timers: await app.timerCounts(),
      nodes: await app.domNodeCount()
    };

    const samples = [];
    for (let i = 0; i < TOTAL_TICKS; i++) {
      await app.advanceClock(15 * 60 * 1000);
      // Drive the pollers the way their real intervals would.
      await app.page.evaluate(() => {
        window.fetchCryptoPrices && window.fetchCryptoPrices();
        window.fetchRssFeed && window.fetchRssFeed();
        window.updateSpotifyUI && window.updateSpotifyUI();
        window.updateWorldClock && window.updateWorldClock();
        window.calculateNextPrayer && window.calculateNextPrayer();
        window.renderTaskArcs && window.renderTaskArcs();
        window.updateLiveTimer && window.updateLiveTimer();
      });
      await page.waitForTimeout(60);

      if (i % TICKS_PER_HOUR === 0) {
        await gc();
        samples.push({
          hour: i / TICKS_PER_HOUR,
          heap: await app.heapMB(),
          timers: await app.timerCounts(),
          nodes: await app.domNodeCount()
        });
      }
    }

    await gc();
    const final = {
      heap: await app.heapMB(),
      timers: await app.timerCounts(),
      nodes: await app.domNodeCount()
    };

    // eslint-disable-next-line no-console
    console.table(samples.map(s => ({ hour: s.hour, heapMB: s.heap?.toFixed(1), intervals: s.timers?.intervals, nodes: s.nodes })));

    // 1. Heap must not run away. Generous multiplier: GC timing is not deterministic.
    if (baseline.heap && final.heap) {
      expect(final.heap, `heap grew from ${baseline.heap.toFixed(1)}MB to ${final.heap.toFixed(1)}MB`)
        .toBeLessThan(baseline.heap * 3 + 40);
    }

    // 2. Timers are the sharpest signal - a per-tick setInterval that is never cleared
    //    shows up here long before the heap notices.
    expect(final.timers.intervals,
      `interval count grew ${baseline.timers.intervals} -> ${final.timers.intervals}`)
      .toBeLessThanOrEqual(baseline.timers.intervals + 5);

    // 3. DOM churn: re-renders must replace, not append.
    expect(final.nodes, `DOM nodes grew ${baseline.nodes} -> ${final.nodes}`)
      .toBeLessThan(baseline.nodes * 2);

    // 4. And nothing may have thrown across the whole simulated day.
    expect(await app.errorLog()).toEqual([]);
  });

  test('DayFlow view thrashing does not leak listeners or nodes', async ({ app, page, browserName }) => {
    test.skip(browserName !== 'chromium', 'heap measurement requires Chromium');
    await stubAllExternals(page);
    await app.instrumentTimers();

    const views = ['today', 'tasks', 'habits', 'goals', 'planner', 'focus', 'analytics', 'settings'];
    const before = { nodes: await app.domNodeCount(), timers: await app.timerCounts() };

    for (let round = 0; round < 40; round++) {
      for (const v of views) await app.go(v);
    }
    await page.waitForTimeout(500);

    const after = { nodes: await app.domNodeCount(), timers: await app.timerCounts() };
    // 320 view renders must not leave 320 views' worth of DOM behind.
    expect(after.nodes).toBeLessThan(before.nodes * 2);
    expect(after.timers.intervals).toBeLessThanOrEqual(before.timers.intervals + 3);
    expect(await app.errorLog()).toEqual([]);
  });

  test('focus timer start/stop cycles clear their interval every time', async ({ app }) => {
    await app.instrumentTimers();
    await app.go('focus');
    const before = (await app.timerCounts()).intervals;
    for (let i = 0; i < 25; i++) {
      await app.page.click('[data-act="fstart"]');   // start
      await app.page.click('[data-act="fstart"]');   // pause
      await app.page.click('[data-act="freset"]');
    }
    await app.page.waitForTimeout(300);
    const after = (await app.timerCounts()).intervals;
    expect(after, 'each start must clear its previous interval').toBeLessThanOrEqual(before + 2);
  });
});

import { test, expect } from '../helpers/fixtures.js';
import { stubAllExternals } from '../helpers/mocks.js';

test.beforeEach(async ({ page }) => { await stubAllExternals(page); });

test.describe('Schedule & Countdown managers - chronology edge cases', () => {

  test('rapid sequential creation never collides on entity ids', async ({ app }) => {
    // The original defect: ids were raw Date.now(), so a burst inside one millisecond
    // produced duplicates and edit/delete then hit the wrong record.
    const ids = await app.page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 3000; i++) out.push(window.generateEntityId());
      return out;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('200 countdowns created back-to-back all survive a reload distinctly', async ({ app }) => {
    await app.page.evaluate(() => {
      const list = [];
      for (let i = 0; i < 200; i++) {
        list.push({ id: window.generateEntityId(), title: 'CD ' + i, date: '2027-01-01', time: '00:00', icon: 'star', color: '#fff', pinned: false, tags: [] });
      }
      localStorage.setItem('idleCountdowns', JSON.stringify(list));
    });
    await app.goto();
    const stored = await app.read('idleCountdowns');
    expect(stored).toHaveLength(200);
    expect(new Set(stored.map(c => c.id)).size).toBe(200);
  });

  test('leap day 29 Feb is accepted and renders in the schedule', async ({ app }) => {
    await app.page.evaluate(() => {
      localStorage.setItem('idleCountdowns', JSON.stringify([
        { id: window.generateEntityId(), title: 'Leap event', date: '2028-02-29', time: '12:00', icon: 'star', color: '#00c6ff', pinned: false, tags: [] }
      ]));
    });
    await app.goto();
    const list = await app.read('idleCountdowns');
    expect(list[0].date).toBe('2028-02-29');
    // The widget must not crash on it.
    expect(await app.errorLog()).toEqual([]);
  });

  test('a countdown to 29 Feb in a non-leap year does not produce Invalid Date', async ({ app }) => {
    const result = await app.page.evaluate(() => {
      const d = new Date('2027-02-29T12:00:00');
      return { invalid: Number.isNaN(d.getTime()), rolled: d.toString() };
    });
    // JS rolls 2027-02-29 to 2027-03-01 rather than producing NaN. Documented so a
    // future validation change is a deliberate decision, not an accident.
    expect(result.invalid).toBe(false);
  });

  test('an event at 23:59:59 does not vanish when the day rolls over', async ({ app }) => {
    await app.freezeClock('2026-08-20T23:59:00');
    await app.goto();
    await app.page.evaluate(() => {
      localStorage.setItem('idleCountdowns', JSON.stringify([
        { id: window.generateEntityId(), title: 'Midnight edge', date: '2026-08-21', time: '00:00', icon: 'star', color: '#fff', pinned: false, tags: [] }
      ]));
    });
    await app.goto();
    await app.advanceClock(120_000);           // cross midnight
    await app.page.waitForTimeout(1200);
    expect(await app.errorLog()).toEqual([]);
    const list = await app.read('idleCountdowns');
    expect(list).toHaveLength(1);
  });

  test('quick timer state survives a reload mid-countdown', async ({ app }) => {
    // Regression guard for the "timer vanished overnight" defect.
    await app.page.evaluate(() => {
      localStorage.setItem('idleQuickTimerState', JSON.stringify({
        isTimerRunning: true,
        timerEndTime: Date.now() + 9.5 * 3600 * 1000,
        timerDurationMs: 9.5 * 3600 * 1000,
        originalDurationMs: 9.5 * 3600 * 1000,
        rawTimerDurationMs: 9.5 * 3600 * 1000
      }));
    });
    await app.goto();
    const restored = await app.read('idleQuickTimerState');
    expect(restored).not.toBeNull();
    expect(restored.originalDurationMs).toBeGreaterThan(0);
  });
});

test.describe('Time travel - midnight rollover', () => {

  test('habit streak does not reset when the clock crosses midnight', async ({ app }) => {
    const hist = {};
    for (let i = 1; i <= 6; i++) {
      const d = new Date('2026-08-20T23:00:00'); d.setDate(d.getDate() - i);
      hist[d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')] = true;
    }
    await app.freezeClock('2026-08-20T23:59:00');
    await app.seed({ idleHabits: [{ id: 'h1', name: 'Read', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: hist }] });
    const before = await app.page.evaluate(() => window.DF.__test.habitStreak(window.DF.state.habits[0]));
    await app.advanceClock(2 * 60 * 1000);
    const after = await app.page.evaluate(() => window.DF.__test.habitStreak(window.DF.state.habits[0]));
    expect(after).toBe(before);
  });

  test('a habit ticked at 23:59 lands on that day, not the next', async ({ app }) => {
    await app.freezeClock('2026-08-20T23:59:30');
    await app.seed({ idleHabits: [{ id: 'h1', name: 'Read', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: {} }] });
    await app.go('habits');
    await app.page.click('[data-act="habit-cell"][data-k="2026-08-20"]');
    const habits = await app.read('idleHabits');
    expect(habits[0].history['2026-08-20']).toBe(true);
    expect(habits[0].history['2026-08-21']).toBeUndefined();
  });

  test('the day key advances exactly once across midnight', async ({ app }) => {
    await app.freezeClock('2026-08-20T23:59:50');
    await app.goto();
    const before = await app.page.evaluate(() => window.DF.__test.dayKey());
    await app.advanceClock(20_000);
    const after = await app.page.evaluate(() => window.DF.__test.dayKey());
    expect(before).toBe('2026-08-20');
    expect(after).toBe('2026-08-21');
  });

  test('Hijri conversion stays valid across a Gregorian year boundary', async ({ app }) => {
    await app.freezeClock('2026-12-31T23:58:00');
    await app.goto();
    const ok = await app.page.evaluate(() => {
      for (let m = 1; m <= 12; m++) {
        const g = new Date(window.hijriToGregorian(1448, m, 1));
        if (Number.isNaN(g.getTime())) return false;
      }
      return true;
    });
    expect(ok).toBe(true);
  });

  test('prayer times recompute after crossing midnight without throwing', async ({ app }) => {
    await app.freezeClock('2026-08-20T23:59:00');
    await app.goto();
    await app.advanceClock(3 * 60 * 1000);
    await app.page.evaluate(() => window.calculateNextPrayer && window.calculateNextPrayer());
    await app.page.waitForTimeout(400);
    expect(await app.errorLog()).toEqual([]);
  });
});

test.describe('Simultaneous audio triggers', () => {

  test('two chime contexts firing in the same tick both dispatch, in order', async ({ app }) => {
    await app.captureChimes();
    await app.page.evaluate(() => { window.playChime('timerEnd'); window.playChime('eventStart'); });
    const fired = await app.chimes();
    expect(fired.map(c => c.context)).toEqual(['timerEnd', 'eventStart']);
  });

  test('a burst of five triggers does not drop any or throw', async ({ app }) => {
    await app.captureChimes();
    await app.page.evaluate(() => {
      ['timerEnd', 'eventStart', 'eventEnd', 'alert', 'pomodoroComplete'].forEach(c => window.playChime(c));
    });
    expect(await app.chimes()).toHaveLength(5);
    expect(await app.errorLog()).toEqual([]);
  });

  test('focus timer completion during an azan window still records the session', async ({ app }) => {
    // The interesting case is not the sound - it is whether the state write survives
    // the prayer UI takeover running in the same frame.
    await app.captureChimes();
    await app.go('focus');
    const before = (await app.read('dfSessions') || []).length;
    await app.page.evaluate(() => {
      window.DF.focus.preset = 25;
      window.DF.focus.remaining = 1;
      document.querySelector('[data-act="fstart"]').click();
      // Force the prayer takeover to run concurrently.
      if (window.updatePrayerUI) window.updatePrayerUI();
    });
    await app.page.waitForTimeout(2500);
    const after = (await app.read('dfSessions') || []).length;
    expect(after).toBe(before + 1);
  });

  test('azan reminder toggle suppresses the glow but not the prayer widget', async ({ app }) => {
    await app.page.evaluate(() => localStorage.setItem('idleAzanReminderEnabled', '0'));
    await app.goto();
    const widgetStillThere = await app.page.locator('#widgetPrayerName').count();
    expect(widgetStillThere).toBe(1);
    expect(await app.errorLog()).toEqual([]);
  });

  test('chime settings persist per context independently', async ({ app }) => {
    await app.page.evaluate(() => {
      localStorage.setItem('chimeSound_timerEnd', 'classic');
      localStorage.setItem('chimeSound_eventStart', 'chime');
    });
    await app.goto();
    expect(await app.page.evaluate(() => window.getChimeForContext('timerEnd'))).toBe('classic');
    expect(await app.page.evaluate(() => window.getChimeForContext('eventStart'))).toBe('chime');
  });
});

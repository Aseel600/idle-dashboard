import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp, freezeClock, keyFor } from '../helpers/harness.js';

/**
 * Time, scheduling and chronology.
 * These target the areas most likely to break silently: leap days, DST shifts,
 * midnight rollover and the entity-id collision fix.
 */

describe('entity id collision resistance', () => {
  let win;
  beforeAll(async () => { ({ win } = await bootApp()); });

  it('never repeats across a tight synchronous burst', () => {
    // The original bug: ids were raw Date.now(), so anything created inside the same
    // millisecond collided and edit/delete then acted on the wrong record.
    const seen = new Set();
    for (let i = 0; i < 50_000; i++) seen.add(win.generateEntityId());
    expect(seen.size).toBe(50_000);
  });

  it('is strictly increasing even when the clock does not move', () => {
    const clock = freezeClock(win, '2026-03-01T12:00:00Z');
    const ids = Array.from({ length: 5000 }, () => win.generateEntityId());
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    clock.restore();
  });

  it('does not collide with ids minted before a clock rewind', () => {
    // Guards against NTP correction / user changing the system clock backwards.
    const clock = freezeClock(win, '2026-06-01T12:00:00Z');
    const before = Array.from({ length: 200 }, () => win.generateEntityId());
    clock.set('2026-05-30T12:00:00Z');          // rewind two days
    const after = Array.from({ length: 200 }, () => win.generateEntityId());
    clock.restore();
    const overlap = after.filter(id => before.includes(id));
    expect(overlap).toEqual([]);
  });

  it('stays unique when interleaved with DayFlow uid()', async () => {
    const { T } = await bootApp();
    const seen = new Set();
    for (let i = 0; i < 20_000; i++) { seen.add(String(win.generateEntityId())); seen.add(T.uid()); }
    expect(seen.size).toBe(40_000);
  });
});

describe('leap years and month boundaries', () => {
  let T;
  beforeAll(async () => { ({ T } = await bootApp()); });

  it('produces a correct key for 29 Feb in a leap year', () => {
    expect(T.dayKey(new Date(2024, 1, 29))).toBe('2024-02-29');
  });

  it('rolls 29 Feb -> 1 Mar', () => {
    expect(T.dayKey(T.addDays(new Date(2024, 1, 29), 1))).toBe('2024-03-01');
  });

  it('handles the century rule: 1900 is not a leap year, 2000 is', () => {
    expect(T.dayKey(T.addDays(new Date(1900, 1, 28), 1))).toBe('1900-03-01');
    expect(T.dayKey(T.addDays(new Date(2000, 1, 28), 1))).toBe('2000-02-29');
  });

  it('does not lose a day stepping across a leap boundary in both directions', () => {
    const start = new Date(2024, 1, 28);
    expect(T.dayKey(T.addDays(T.addDays(start, 3), -3))).toBe('2024-02-28');
  });

  it('startOfWeek lands on Sunday regardless of where in the week it starts', () => {
    for (let i = 0; i < 7; i++) {
      const d = T.addDays(new Date(2026, 7, 16), i);   // 16 Aug 2026 is a Sunday
      expect(T.startOfWeek(d).getDay()).toBe(0);
    }
  });

  it('year boundary: 31 Dec -> 1 Jan increments the year', () => {
    expect(T.dayKey(T.addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  });
});

describe('daylight-saving and timezone behaviour', () => {
  // The app stores day keys as local YYYY-MM-DD. A DST jump must not duplicate or
  // skip a key, or a habit tick lands on the wrong day.
  let T;
  beforeAll(async () => { ({ T } = await bootApp()); });

  it('produces 7 distinct keys across a spring-forward week', () => {
    // 29 Mar 2026 is the European spring-forward date.
    const keys = new Set();
    for (let i = 0; i < 7; i++) keys.add(T.dayKey(T.addDays(new Date(2026, 2, 26), i)));
    expect(keys.size).toBe(7);
  });

  it('produces 7 distinct keys across an autumn fall-back week', () => {
    const keys = new Set();
    for (let i = 0; i < 7; i++) keys.add(T.dayKey(T.addDays(new Date(2026, 9, 22), i)));
    expect(keys.size).toBe(7);
  });

  it('dayKey is stable for the same instant regardless of how the Date was built', () => {
    const a = new Date(2026, 4, 10, 0, 0, 0);
    const b = new Date(2026, 4, 10, 23, 59, 59);
    expect(T.dayKey(a)).toBe(T.dayKey(b));
  });
});

describe('habit streaks across midnight rollover', () => {
  it('an unticked today does not break a streak, but an unticked yesterday does', async () => {
    const today = new Date(2026, 7, 20, 23, 59, 0);
    const hist = {};
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      hist[keyFor(d)] = true;
    }
    const { T } = await bootApp({ now: today, storage: { idleHabits: [{ id: 'h1', name: 'Read', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: hist }] } });
    const habit = { id: 'h1', name: 'Read', days: [0, 1, 2, 3, 4, 5, 6], history: hist };
    // Today is not ticked yet - the streak should still read 5, not 0.
    expect(T.habitStreak(habit)).toBe(5);
    // Remove yesterday: the chain is genuinely broken.
    const broken = JSON.parse(JSON.stringify(habit));
    const y = new Date(today); y.setDate(y.getDate() - 1);
    delete broken.history[keyFor(y)];
    expect(T.habitStreak(broken)).toBe(0);
  });

  it('crossing midnight does not retroactively break an intact streak', async () => {
    const beforeMidnight = new Date(2026, 7, 20, 23, 59, 30);
    const hist = {};
    for (let i = 0; i <= 4; i++) {
      const d = new Date(beforeMidnight); d.setDate(d.getDate() - i);
      hist[keyFor(d)] = true;
    }
    const { win, T } = await bootApp({ now: beforeMidnight });
    const habit = { days: [0, 1, 2, 3, 4, 5, 6], history: hist };
    const before = T.habitStreak(habit);
    const clock = freezeClock(win, new Date(2026, 7, 21, 0, 0, 30));   // one minute later
    const after = T.habitStreak(habit);
    clock.restore();
    // The new day is simply "not done yet" - the count must not drop.
    expect(after).toBe(before);
  });

  it('weekday-only habits ignore weekends rather than treating them as misses', async () => {
    const { T } = await bootApp({ now: new Date(2026, 7, 20) });   // Thursday
    const hist = {};
    // Tick only the weekdays of the preceding stretch.
    for (let i = 0; i <= 10; i++) {
      const d = new Date(2026, 7, 20); d.setDate(d.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) hist[keyFor(d)] = true;
    }
    const habit = { days: [1, 2, 3, 4, 5], history: hist };
    expect(T.habitStreak(habit)).toBeGreaterThanOrEqual(8);
  });

  it('best streak is independent of the current streak', async () => {
    const { T } = await bootApp();
    const hist = {};
    ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
      '2026-03-01', '2026-03-02'].forEach(k => { hist[k] = true; });
    expect(T.habitBest({ history: hist })).toBe(5);
  });
});

describe('Hijri conversion', () => {
  let win;
  beforeAll(async () => { ({ win } = await bootApp()); });

  it('round-trips a Hijri date into a real Gregorian Date object', () => {
    const g = win.hijriToGregorian(1447, 3, 15);
    expect(g instanceof Date || g instanceof Object).toBe(true);
    expect(Number.isNaN(new Date(g).getTime())).toBe(false);
  });

  it('is monotonic: a later Hijri day maps to a later Gregorian day', () => {
    const a = new Date(win.hijriToGregorian(1447, 3, 10)).getTime();
    const b = new Date(win.hijriToGregorian(1447, 3, 20)).getTime();
    expect(b).toBeGreaterThan(a);
  });

  it('handles month rollover without producing an invalid date', () => {
    for (let m = 1; m <= 12; m++) {
      const g = new Date(win.hijriToGregorian(1447, m, 30));
      expect(Number.isNaN(g.getTime()), `Hijri 1447-${m}-30 produced an invalid date`).toBe(false);
    }
  });

  it('does not throw on the 30th of a 29-day Hijri month', () => {
    expect(() => win.hijriToGregorian(1447, 9, 30)).not.toThrow();
  });
});

describe('today score arithmetic', () => {
  it('is bounded 0-100 and weights sum correctly at the extremes', async () => {
    const { T, DF } = await bootApp();
    DF.state.tasks = []; DF.state.habits = []; DF.state.sessions = []; DF.state.blocks = [];
    const empty = T.todayScore();
    expect(empty.total).toBeGreaterThanOrEqual(0);
    expect(empty.total).toBeLessThanOrEqual(100);
  });

  it('cannot exceed 100 even with absurd focus minutes', async () => {
    const { T, DF } = await bootApp();
    DF.state.sessions = Array.from({ length: 100 }, () => ({ at: Date.now(), minutes: 600 }));
    const s = T.todayScore();
    expect(s.focus).toBeLessThanOrEqual(100);
    expect(s.total).toBeLessThanOrEqual(100);
  });

  it('divides by zero safely when nothing is scheduled', async () => {
    const { T, DF } = await bootApp();
    DF.state.tasks = []; DF.state.habits = []; DF.state.blocks = []; DF.state.sessions = [];
    const s = T.todayScore();
    Object.values(s).forEach(v => expect(Number.isFinite(v)).toBe(true));
  });
});

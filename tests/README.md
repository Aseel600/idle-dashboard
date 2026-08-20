# Ambient OS / DayFlow — Test Suite

Dev-only. Nothing here ships: the app itself stays buildless and has no runtime
dependencies. This directory has its own `package.json` so installing test tooling
never touches the deployed site.

```
tests/
  package.json            devDependencies only
  playwright.config.js    9 projects: desktop, 2K WQXGA, ultrawide, FF, WebKit, tablet, phone, TV, RTL
  vitest.config.js        jsdom unit runner
  helpers/
    harness.js            boots the real script.js + dayflow.js in jsdom
    fixtures.js           Playwright `app` fixture, clock control, chime capture, leak probes
    mocks.js              every third-party endpoint, in every failure mode
  unit/
    chronology.test.js    leap years, DST, midnight rollover, streaks, Hijri, id collisions
    input-safety.test.js  XSS payloads, URL schemes, sanitisation, corrupt storage
  e2e/
    chronology.spec.js        schedule/countdown edge cases, time travel, audio priority
    api-resilience.spec.js    CoinGecko, RSS, Spotify — rate limits, 500s, malformed, hostile
    layout-rtl-matrix.spec.js layout x language x 11 viewports, RTL correctness, TV, touch
    memory-soak.spec.js       compressed 24h soak with all widgets + looping video
    auth-offline-sync.spec.js camera permissions, QR payloads, offline, sync conflict, import
  console/
    schedule-batch.js     batch form submission, id collision stress, boundary probing
    widget-fuzz.js        widget input fuzzing, RSS render path, memory probe, a11y sweep
  SECURITY-CHECKLIST.md   audit of every widget data input, with executed evidence
```

---

## Honest status: what was executed vs. what was authored

**This machine has no Node.js installed**, so Playwright and Vitest could not be run
here. Rather than claim green suites I did not observe, here is the split:

| Deliverable | State |
|---|---|
| `console/*.js` | **Executed.** Run end-to-end against the real app in headless Chromium. Results below. |
| `unit/*.test.js` | **Authored, not executed.** Logic they assert was verified independently through the browser harness. |
| `e2e/*.spec.js` | **Authored, not executed.** Selectors and function names were cross-checked against the real source (see below). |
| `SECURITY-CHECKLIST.md` | **Evidence-backed** where marked PASS — those came from the executed console scan. |

Before running the E2E suite for the first time, expect to fix a small number of
selector or timing details. That is normal for a first run on any suite; what has been
eliminated is the larger failure mode of tests referencing handles that do not exist.
Every `getElementById`, `data-act`, and `window.*` function referenced in the specs was
verified to exist in `index.html` / `script.js` / `dayflow.js`.

### Executed results (console suite, headless Chromium)

```
AOS.collision(50000)   50000 minted, 50000 unique, 0 non-monotonic   PASS
AOS.batch(40)          40/40 persisted, 0 duplicate ids              PASS
AOS.fuzz()             17 hostile payloads, 0 executed               PASS
                       3 payloads stored but rendered inert          PASS
                       whitespace-only title accepted                FAIL -> fixed
AOS.boundaries()       midnight-spanning entry OK                    PASS
                       zero-length + inverted ranges accepted        REVIEW (see checklist 4.5/4.6)
WFZ.rss()              6 hostile feed items, 0 executed              PASS
                       0 dangerous hrefs, 0 script nodes             PASS
WFZ.inputs()           9 inputs x 14 payloads = 126, 0 executed      PASS
                       Object.prototype intact                       PASS
WFZ.a11y()             26 controls with no accessible name           OPEN (checklist 9.1)
```

Two real bugs came out of this and are fixed: whitespace-only titles were accepted in
`saveScheduledTask` and `addDailyGoal` (`"   "` is truthy, so an untrimmed check let it
through). One finding is left open and specified: 26 form controls lack a programmatic
accessible name.

---

## Setup

```bash
cd tests
npm install
npm run install:browsers      # Playwright browser binaries
```

## Running

```bash
npm run test:unit             # Vitest, jsdom
npm run test:e2e              # Playwright, all projects
npm run test:e2e -- --project=chromium-desktop
npm run test:e2e:headed       # watch it drive
npm run test:soak             # compressed 24h memory soak (~5-10 min)
npm run test:all
```

The Playwright config starts its own static server (`npx serve ..`) on :5173, so no
separate step is needed. Timezone is pinned to `Asia/Riyadh` because the clock, prayer
times and Hijri conversion are all timezone-sensitive — a suite run locally must match
a suite run in CI.

## Console scripts (no install required)

Open the app, then paste either file into DevTools:

```js
AOS.all();      // schedule-batch.js — collisions, batch submit, fuzz, date boundaries
AOS.restore();  // roll back everything it created (snapshot taken on load)

WFZ.all();      // widget-fuzz.js — inputs, RSS, memory/timers, accessibility
```

---

## Two constraints anyone extending this suite must know

**1. Dialogs block automation.** The app has 23 `await customAlert(...)` /
`await customConfirm(...)` call sites on validation and destructive paths. Those
promises resolve only when a human clicks. An automated run that does not stub them
parks on the first validation failure and hangs with no error and no timeout message.
Both console scripts stub them automatically; `helpers/fixtures.js` does the same for
Playwright. This cost real debugging time to find — do not remove it.

**2. Headless `--window-size` is not a viewport.** On this machine Chromium clamps the
window to ~504px wide, so `--window-size=390` silently renders at 504 and *looks* like
a mobile layout bug. Three separate "mobile defects" during development turned out to
be this artifact. The reliable technique is an **iframe at an explicit CSS width**,
which gives the inner document a genuine viewport. Playwright's `viewport` option does
this correctly; raw headless flags do not.

Related: **CSS transitions do not advance under `--virtual-time-budget`**, so reading a
computed `transform` or `opacity` mid-transition returns the *start* value. Assert
after disabling transitions:

```js
const s = document.createElement('style');
s.textContent = '*,*::before,*::after{transition:none !important;animation:none !important}';
document.head.appendChild(s);
```

---

## Coverage map

| Vector | Unit | E2E | Console |
|---|---|---|---|
| Entity id collisions | ✅ | ✅ | ✅ |
| Leap years / DST / year boundaries | ✅ | ✅ | ✅ |
| Midnight rollover (streaks, day keys, prayer) | ✅ | ✅ | — |
| Hijri conversion | ✅ | ✅ | — |
| Simultaneous audio triggers | — | ✅ | — |
| CoinGecko 429 / 500 / malformed / abort | — | ✅ | — |
| RSS XSS / malformed / oversized | ✅ | ✅ | ✅ |
| Spotify token expiry / device failure / desync | — | ✅ | — |
| Layout × language × 11 viewports | — | ✅ | — |
| RTL correctness | ✅ | ✅ | — |
| Memory / timer / DOM leaks | — | ✅ | ✅ |
| Camera permissions + QR payloads | — | ✅ | — |
| Offline + sync conflict | — | ✅ | — |
| Import/export safety | ✅ | ✅ | — |
| Accessibility sweep | — | ✅ | ✅ |

## Suggested CI wiring

The repo already has `.github/workflows/deploy.yml` written but unpushable (the
available token lacks the `workflow` scope). When that is granted, add:

```yaml
- run: cd tests && npm ci && npx playwright install --with-deps chromium
- run: cd tests && npm run test:unit
- run: cd tests && npm run test:e2e -- --project=chromium-desktop --project=phone
```

Leave the soak test out of PR runs — schedule it nightly.

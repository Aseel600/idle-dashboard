# DayFlow — Audit Report

Audited against the original build requirements and `design-research.md`.
Date: 2026-08-20. Version shipped: **V8.0**.

Testing was done by driving the real application in a headless Chromium instance —
clicking real controls, reading back real state and computed styles — rather than by
inspection. Where a claim below says "verified", a scripted assertion produced it.

---

## 1. What was tested

**Onboarding** — auto-open on first run; all five questions; Skip present on every
step; Back navigation; multi-select and single-select behaviour; the payoff screen; and
whether the answers actually produce data. Verified that finishing with name "Probe",
goal "Launch the thing" and two habits created the profile name, a real goal, the
habits, three starter tasks, and landed on Today with the name in the greeting.

**Tasks** — create, edit, complete, delete, persistence to `localStorage`; list and
board views; four status columns; drag-and-drop attributes; search; and all four
required filters (priority, category, status, due date) individually and combined,
including that Clear resets every one of them.

**Habits** — creation; toggling today and past days from the weekly grid; streak and
best-streak computation; 30-day completion percentage; detail view; and that the same
array powers the ambient habits widget rather than a duplicate.

**Goals** — creation; milestone add/toggle/delete; automatic progress from milestones;
status transitions between active, paused and done; derived pacing line.

**Planner** — week grid rendering; block create/edit/delete; category colours;
current-time line; week navigation; and the mobile day strip.

**Focus** — presets; start/pause/resume/reset; task linking; run-to-completion, which
must record a session and reset the timer.

**Analytics** — both ranges; charts against real local activity; delta chips;
insight sentences; the insufficient-data path.

**Settings** — theme cards for light/dark/system; profile save; export payload shape;
import validation.

**Cross-cutting** — all eight views rendering; Arabic/RTL across every view; light
mode token application; keyboard focus; mobile layout at 390px; horizontal overflow;
console errors; and a full regression pass over the pre-existing Ambient OS features.

---

## 2. What was broken, and what was done about it

**1. Four views were unreachable on mobile.** The bottom tab bar only fits five
destinations, and the CSS hid the rest — but no "More" destination existed, so Habits,
Goals, Analytics and Settings were completely inaccessible on a phone. That is a
feature reduction, not a layout nit. *Fixed:* added a More tab that opens a sheet
listing the secondary destinations, and made it show as active while one of them is
open. Verified all four now render at 390px.

**2. The mobile planner could only ever show today.** At phone width the grid collapses
to one column, and week navigation moves by week — so six of seven days had no way to
be displayed. *Fixed:* added a day strip; verified selecting a day changes the rendered
column and that exactly one column renders.

**3. Ambient furniture bled through on top of DayFlow.** The Focus Mode toggle is
`position: fixed` and stayed visible over every DayFlow view. *Fixed:* hidden along
with the other ambient chrome while a DayFlow view is active, and verified it returns
when you go back to Ambient.

**4. Onboarding multi-select dropped clicks.** Selecting a habit re-rendered the whole
step, which replaced every option node — so a second click landed on a detached
element and did nothing. It would also have thrown away keyboard focus. *Fixed:*
selection now toggles in place. Verified three selections hold and re-clicking
deselects.

**5. Two of the four required task filters were missing.** The brief specifies
priority, category, **status** and **due date**; only the first two had been built.
*Fixed:* added both, with English and Arabic strings, and verified each narrows the
list correctly and is reset by Clear.

**6. Seeded "completed today" task could land on yesterday.** The demo task used
`Date.now() - 1 hour`, which falls on the previous day when the app is first opened
shortly after midnight — making the Today score silently wrong on a fresh install.
Caught because the first screenshot was taken at 00:10 and showed 0/3 instead of 1/4.
*Fixed:* pinned inside today.

**7. Score breakdown stretched the full card width,** so four related bars read as four
unrelated rules. *Fixed:* capped the breakdown column.

**8. Two silent resource errors on every page load — pre-existing, not introduced
here.** The final sweep read back the app's own error log (added in V7.18) rather than
trusting a visual check, and found two `Failed to load` entries on first paint and four
after a refresh. Cause: the two Spotify artwork elements were declared as
`<img src="">`, and an empty `src` resolves to the *document* URL — so the browser
dutifully tried to load `index.html` as an image and failed. They are `display:none`
and get a real `src` when Spotify returns artwork, so nothing was visibly wrong, which
is exactly why it survived this long. *Fixed:* dropped the empty attributes; the
`if (el.src)` guards still behave because a missing attribute reads back as `""`. The
error log is now empty on load and after reload.

---

## 3. Verification results

| Suite | Result |
|---|---|
| All 8 views render, no console errors | pass |
| Interaction suite (19 assertions: tasks, habits, goals, focus, analytics, settings, score) | 19/19 |
| Onboarding + data safety + ambient regression (32 assertions) | 32/32 |
| Mobile suite at 390px (16 assertions) | 16/16 |
| Arabic/RTL + light mode + i18n parity (11 assertions) | 11/11 |
| Task filter suite (9 assertions) | 9/9 |
| Inline handler resolution | none unresolved |
| Icon symbol resolution | all resolve |
| i18n key parity | `script.js` 309/309 · `dayflow.js` en/ar equal |
| Byte-order marks | none introduced |

**Ambient OS regression** — explicitly verified still present and working: the clock
and its SVG, the quick-timer drag handle, the side panel, the left widget rail, **all
eleven widgets**, theater mode, the tutorial system, the clock-face switcher, the
Spotify equaliser, prayer times, the language system, the timeline, and that habits are
shared rather than duplicated (`idleHabits` exists, `dfHabits` does not).

---

## 4. Honest remaining limitations

- **No physical device testing.** Mobile was verified at a true 390px viewport via an
  iframe, with computed styles and reachability assertions, but not on real hardware.
  Touch feel — scroll momentum, tap latency, the drag handle under a thumb — is
  unverified. (Note that `--window-size` is clamped to ~504px on this machine, which
  produced two false "mobile bugs" in earlier sessions; the iframe method avoids that.)
- **Board drag-and-drop is HTML5 DnD, which does not fire on touch.** This is why the
  task detail panel also exposes a status dropdown — the capability is reachable
  everywhere, but the *drag gesture* itself is desktop-only. A pointer-events-based
  reimplementation would fix it and is not done.
- **No automated test suite in the repository.** Everything above was driven by
  throwaway harnesses. A committed test runner would be better, but the CI workflow is
  still blocked on the `workflow` token scope (see below), so it could not gate
  anything yet.
- **CI does not gate deploys.** `.github/workflows/deploy.yml` is written and ready but
  cannot be pushed — the available credential lacks the `workflow` scope. Until an
  authorised push happens, pushes to `main` publish with no automated verification.
- **"Production build" is a no-op by design.** There is no bundler, so there is no
  build to fail. The equivalent gate used here is: every file parses, the page boots,
  and every view renders with zero console errors — all verified. If a bundled build is
  a hard requirement, that is the one part of the brief this stack does not satisfy,
  and the reasoning is in `design-research.md` section 0.
- **Analytics reports the most productive *day*, not time of day.** The brief allows
  "day or time"; per-hour attribution would need session timestamps to be bucketed by
  hour, which is not implemented.
- **Focus timer state is not restored across a refresh mid-session.** Completed
  sessions persist; an in-flight countdown does not. The ambient quick timer does
  survive refresh — these are separate timers by design.
- **Habit frequency offers daily and weekdays only.** The data model stores an explicit
  `days` array and would support arbitrary custom days; the picker for it is not built.

# DayFlow — Design Research & System

Research conducted with the Mobbin MCP across nine product categories, then distilled
into an original design system. Nothing here is copied screen-for-screen; the goal was
to find *recurring* solutions to problems DayFlow actually has.

---

## 0. Context and the one architectural decision I made alone

DayFlow is not a greenfield project. It is a merge into **Ambient OS** (live at
leesa.site), an established vanilla HTML/CSS/JS app with roughly fifty shipped
features: a draggable-arc quick timer, four clock faces, prayer times with azan
handling, Spotify with synced lyrics and a mic-driven equaliser, theater mode, eleven
widgets, full English/Arabic localisation with RTL mirroring, and Supabase-backed
cloud sync.

**The brief specifies React + TypeScript + Vite + Tailwind, "unless you have a strong
technical reason to choose an equivalent local-first stack." I am staying on the
existing vanilla stack.** The reason is the brief's own higher priority: *do not remove
any added feature*. Re-implementing ~5,600 lines of behaviour, a full RTL i18n layer
and a live auth/sync integration in React would put every one of those features at
risk, and would realistically lose several — trading a stack preference for the
requirement that actually matters. The current stack is already local-first
(localStorage), needs no build step, and deploys straight to static hosting, which
satisfies the spirit of "runs locally, no paid APIs, no env vars".

**Merge strategy: additive, not replacing.** DayFlow is introduced as a set of new
*views* alongside the existing dashboard, which is preserved intact as the **Ambient**
view. Where Ambient OS already owns a concept, DayFlow reuses that data rather than
creating a parallel copy:

| DayFlow area | Approach | Existing data reused |
|---|---|---|
| Today | New | aggregates everything below |
| Tasks | New (status/board model didn't exist) | — |
| Habits | Extends existing habits | `idleHabits` |
| Goals | New long-term goals; daily goals untouched | `idleGoals` stays as-is |
| Planner | New view over existing schedule | `idleTasksV4` |
| Focus | Extends existing Pomodoro | `idlePomodoroSettings`, `idlePomodoroStats` |
| Analytics | New | computed from all of the above |
| Settings | New view surfacing existing prefs + export/import | theme, layout, language |
| Onboarding | New personalisation flow | complements existing tutorial |

---

## 1. Products and flows examined

**Productivity dashboards (web)**
- [Asana](https://mobbin.com/screens/718a4f38-4f7f-4025-b5d9-451d8cba39a5) — greeting + date, card modules
- [Wrike](https://mobbin.com/screens/b453a329-6f1b-4745-ba03-5ce03c2c5307) — dense multi-column widget board
- [Aboard](https://mobbin.com/screens/cb9fecf9-7bac-4677-9510-0125393cce8a) — greeting with pill quick-actions
- [Rox](https://mobbin.com/screens/905512d4-9301-4dac-afd8-46d500c9bfb7) — "Here's your focus for today", restrained empty states
- [Salesforce](https://mobbin.com/screens/50f3ab46-00c4-4f83-b9d2-d6edc0581c3c) — enterprise density
- [Todoist](https://mobbin.com/screens/e563a772-95ea-4aea-abff-dabc5887026b) — date-grouped list, week strip, heavy whitespace

**Habit trackers (iOS)**
- [Liven](https://mobbin.com/screens/aa65235f-6b03-491f-bfda-8329766fb3a8) — two-stat streak header + month grid
- [Anything](https://mobbin.com/screens/5d0e3b4b-a4a5-4e4d-b969-7577157db613) — "Today's Progress 0/5" + streak pills
- [Me+](https://mobbin.com/screens/bc859f54-d4fc-4f2c-a728-0a5f82dc2bd2) — per-habit weekly 7-column grid, Week/Month/Year
- [Speak](https://mobbin.com/screens/ec44aa50-c4f6-49c3-a00f-191212e37576) — flame streak, records section
- [Gymshark](https://mobbin.com/screens/073f1e9a-1771-4026-a133-9ef2d9b70d81) — 66-day dot matrix
- [QUITTR](https://mobbin.com/screens/fb252c42-80e6-4881-be55-3fc836c8c47b) — gamified completion ring

**Goals (iOS)**
- [Rocket Money](https://mobbin.com/screens/4dd0e004-24b3-4efa-8e10-2af3b11251b9) — progress ring, upcoming milestone card, milestone badges
- [adidas Running](https://mobbin.com/screens/f76aee25-f8e8-49e1-94ff-47a7b42f31a1) — 2×3 stat grid with icons
- [ANZ Plus](https://mobbin.com/screens/4ce95300-4018-46ff-80ca-a9074d75e9ba) — "5 months to go", derived pacing advice
- [KOHO](https://mobbin.com/screens/8ce05eb0-1666-42bb-88fb-60c1429b2d62) — inline progress + key-value rows
- [Cash App](https://mobbin.com/screens/94059b5a-23d0-4b08-a6d7-47ab00f9b347) — oversized ring, forward-looking empty state

**Focus timers (iOS)**
- [Toggl Track](https://mobbin.com/screens/44018add-aa29-49a5-9caf-012cc9c6f367) — "I'm focusing on…" task link, ring with ticks
- [Tiimo](https://mobbin.com/screens/6d2012cd-7b18-45db-9822-eb66f5e0b02b) — task name as heading, "+1 min"
- [Life Reset](https://mobbin.com/screens/b5ce4ce0-b4a5-47f5-a58d-f7f1e5e8d26a) — full-bleed distraction-free session
- [Me+](https://mobbin.com/screens/444ab9ea-95f5-4884-a0f9-dbe74bf67b19) — Timer/Pomodoro segmented
- [Oura](https://mobbin.com/screens/08366dca-8bef-401f-a5d2-2514448fdf7d) — "Time remaining", single "End early" exit

**Analytics (iOS)**
- [Google Fit](https://mobbin.com/screens/13676152-27a6-4958-9c89-fa739d70cded) — Day/Week/Month, dashed goal line, badge on goal-met bars
- [Oura](https://mobbin.com/screens/90ebee77-8190-44c5-95cf-8904ec501a49) — plain-language insight above the chart
- [Brick](https://mobbin.com/screens/d9461048-177b-4fca-a15a-b68c669900d5) — "Your first day is underway. Check back for your average."
- [Withings](https://mobbin.com/screens/bf36011d-000b-4212-9346-fa3b5c1fdc62) — sparse bars + summary rows
- [GO Club](https://mobbin.com/screens/a5692117-5735-4b32-a5fe-fbc03bce43d8) — period-over-period delta chip

**Onboarding (iOS)**
- [Life Reset](https://mobbin.com/flows/e91bc9a4-db92-449a-8de2-2d5e81381f6b) — one question per screen, reassuring copy, personalised summary payoff
- [Finch](https://mobbin.com/flows/19212698-61fe-43ca-9144-60c9e73bbcd2) — multi-select, then a generated "starter plan"
- [pliability](https://mobbin.com/flows/ba530414-fbc6-4e1f-a353-bbed6c52305a) — "2/2" progress, persistent Skip, icon option rows

**Planners (web)**
- [Rise](https://mobbin.com/screens/19ebd6b1-e3fc-4c61-b57b-677aca7ea63f) — category-coloured blocks, current-time line
- [Front](https://mobbin.com/screens/1e15dd18-42c0-4bba-8903-90630ea12762) — Today button, highlighted today column
- [Clockwise](https://mobbin.com/screens/2c7ed806-2b1e-4bde-a955-9a893fc541ca) — soft pastel blocks, distinct focus blocks
- [ClickUp](https://mobbin.com/screens/f75a39f4-18b8-4991-996e-2dfa83a91ef2) — per-day event count in header
- [Toggl Track](https://mobbin.com/screens/afbd06f7-b021-4360-b71f-e56a1a8961a3) — Calendar/List/Timesheet switcher

**Settings / theming (iOS)**
- [Ubank](https://mobbin.com/screens/ba67a37d-3109-42f3-9203-a4e217895ce4) — theme cards with miniature UI previews
- [PlayStation](https://mobbin.com/screens/b2f64c32-c3f9-44c4-8d67-753bc3a92f9a) — swatch + label + radio, "Match Device" explained
- [Coinbase](https://mobbin.com/screens/0ab087e7-da1f-48b7-a2d8-373685d4bc16) — one-line description per option
- [Snapchat](https://mobbin.com/screens/eeff0b42-3ad8-4448-9d89-45789acf257c) — grouped rows + "Custom >" escape hatch

---

## 2. Patterns adopted

**P1 — Time-aware greeting plus a single focus line.** Asana/Aboard/Rox all open with a
greeting; Rox adds "Here's your focus for today". One sentence of orientation beats a
wall of widgets. *DayFlow:* greeting + date + one derived sentence naming the single
most important thing right now.

**P2 — A composite score, explained.** Oura states the number in words before charting
it. A "Today score" is meaningless unless its parts are visible. *DayFlow:* score ring
with a four-part breakdown (tasks / habits / focus / schedule) and a plain-language line.

**P3 — Progress header before a list.** Anything's "Today's Progress — 0/5 completed"
with a slim bar. *DayFlow:* used above habits and today's tasks.

**P4 — Weekly 7-column completion grid.** Me+ renders each habit as a row of seven
cells. Denser and more scannable than a month calendar. *DayFlow:* the primary habit
visual, with distinct states for done / missed / today / not-scheduled.

**P5 — Two-stat streak header.** Liven splits current vs target streak. *DayFlow:*
current vs best streak.

**P6 — Icon + number + label stat grid.** adidas Running. *DayFlow:* goal detail and
analytics summaries.

**P7 — Derived pacing guidance.** ANZ Plus computes "Save about $24 per week to achieve
this goal". Turning a target into an actionable rate is the difference between a
progress bar and advice. *DayFlow:* "About 2 milestones per month to finish on time."

**P8 — Link a focus session to work.** Toggl's "I'm focusing on…" and Tiimo's task-as-
heading. *DayFlow:* sessions attach to a task or goal and feed analytics.

**P9 — Distraction-free session mode.** Life Reset / Oura strip to time + one exit.
*DayFlow:* full-bleed focus screen, everything else hidden, single "End session".

**P10 — Plain-language insight beside every chart.** Oura and Google Fit both narrate.
*DayFlow:* every chart carries one generated sentence.

**P11 — Insufficient-data state instead of an empty chart.** Brick's "Your first day is
underway." *DayFlow:* charts with <2 days of data say so.

**P12 — Period-over-period delta chip.** GO Club. *DayFlow:* "▲ 12% vs last week".

**P13 — One question per onboarding screen, with progress and a persistent Skip.**
pliability / Life Reset.

**P14 — Onboarding payoff screen.** Finch's generated "starter plan" makes the answers
feel consequential. *DayFlow:* a summary of what was created from the answers.

**P15 — Category-coloured blocks with a left accent bar + current-time line.** Rise /
Front / Clockwise.

**P16 — Today column emphasised in week views.** Front / ClickUp.

**P17 — Theme options as visual previews with descriptions.** Ubank / Coinbase.

---

## 3. Patterns rejected, and why

**R1 — Widget-board dashboards (Wrike, Salesforce).** Many equal-weight panels with no
hierarchy is exactly the "generic admin dashboard" the brief warns against. DayFlow's
Today view commits to one primary element (the score) and demotes everything else.

**R2 — Gamified rings, mascots, badges (QUITTR, Finch).** Effective for their
audiences, but they impose a personality DayFlow shouldn't have, and they age badly.
DayFlow earns engagement through clarity, not characters.

**R3 — Full-bleed photographic backgrounds (Oura, Life Reset).** Beautiful, but they
need a curated asset pipeline, hurt text contrast, and would fight Ambient OS's
existing theme system. Used the *idea* (strip to essentials) without the imagery.

**R4 — Month-grid habit calendars (Liven, Speak).** Thirty-one cells per habit does not
scale past a couple of habits and is unreadable on mobile. The weekly grid (P4) carries
the same signal in a seventh of the space.

**R5 — Heavy saturated gradients (GO Club, Rocket Money).** The brief explicitly rules
out excessive gradients. DayFlow uses flat surfaces with one accent.

**R6 — Dense enterprise sidebars (ClickUp, Salesforce).** Nested trees of projects and
workspaces are a team-tool concern. DayFlow is single-user: eight destinations, flat.

**R7 — AI assistant panels (Asana, Rox).** Would require a paid API, which the brief
forbids.

**R8 — Confidence sliders and long psychological intake (Life Reset's 12 screens).**
Onboarding earns roughly five screens of patience before it becomes a toll gate.

---

## 4. The DayFlow design system

### 4.1 Visual direction
**"Calm instrument."** DayFlow should read like a well-made watch face rather than a
control panel: dark by default, one accent colour doing all the signalling, generous
negative space, and typography carrying the hierarchy instead of borders and boxes.
This deliberately extends Ambient OS's existing ambient-clock character rather than
fighting it — the two halves must feel like one product.

Three rules that keep it coherent:
1. **One accent per screen.** Category colours appear only on small objects (dots,
   left bars, chips), never on large fills.
2. **Elevation by surface, not shadow.** Depth comes from background steps; shadow is
   reserved for genuinely floating things (modals, popovers).
3. **Numbers are the hero.** Metrics get the largest type on any screen.

### 4.2 Colour
Built on Ambient OS's existing seven user-selectable accents, so theming keeps working.
Semantic tokens, not raw hex, throughout.

```
--df-bg          #0B0C0E   page ground (dark)      /  #F7F8FA (light)
--df-surface     #131519   cards                   /  #FFFFFF
--df-surface-2   #1A1D22   nested/hover            /  #F1F3F6
--df-border      #23262C   hairlines               /  #E3E6EB
--df-text        #F2F4F7   primary                 /  #12141A
--df-text-dim    #9BA1AC   secondary               /  #5C636E
--df-text-faint  #6B7280   tertiary/meta           /  #8A919C
--df-accent      user-selected (default #00C6FF)
--df-success     #2ED573      --df-warn  #FFA502      --df-danger #FF4757
```
Category hues (used only at small scale): deep work `#6C8CFF`, meetings `#F0A94B`,
exercise `#3FCF8E`, personal `#C77DFF`, study `#4FD1E0`, admin `#8A919C`.

### 4.3 Typography
System stack (already in use; zero network cost, correct Arabic rendering):
`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

| Role | Size / weight / spacing |
|---|---|
| Metric XL | 44px / 700 / -0.02em |
| Metric L | 30px / 700 / -0.01em |
| Title | 20px / 650 |
| Section | 15px / 600 |
| Body | 14px / 450 / 1.5 |
| Meta | 12.5px / 500 |
| Micro (labels, caps) | 11px / 600 / 0.08em uppercase |

### 4.4 Spacing
4px base; the ramp is **4, 8, 12, 16, 20, 24, 32, 40, 56, 72**. Card padding 20px
desktop / 16px mobile. Section rhythm 32px. Related items 8–12px apart; unrelated
groups never closer than 24px.

### 4.5 Radii
`--df-r-sm 8px` (chips, inputs) · `--df-r-md 14px` (cards, buttons) ·
`--df-r-lg 20px` (sheets, modals) · `--df-r-full 999px` (pills, avatars).
Consistent radii are a large part of why a UI reads as "premium".

### 4.6 Shadows
Only two, and only for floating surfaces:
```
--df-shadow-pop  0 4px 16px rgba(0,0,0,.28)
--df-shadow-modal 0 24px 60px rgba(0,0,0,.45)
```
Cards use borders, not shadows. No glows except the existing accent focus ring.

### 4.7 Icons
Existing inline SVG sprite: 1.5–2px stroke, round caps/joins, 24px grid, rendered at
16/20px. `currentColor` only. No filled or duotone icons; no emoji as UI chrome
(emoji stay available as user-chosen habit/task icons).

### 4.8 Motion
Purpose: confirm a change, or explain where something came from. Never decorative.

| Token | Value | Use |
|---|---|---|
| `--df-t-fast` | 120ms ease-out | hover, press |
| `--df-t-base` | 200ms cubic-bezier(.2,.7,.3,1) | toggles, chips, reveals |
| `--df-t-slow` | 360ms cubic-bezier(.2,.7,.3,1) | view transitions, sheets |

Rules: transform/opacity only (never animate layout); enter with 4–8px of travel, exit
with fade alone; stagger lists at 20ms/item capped at 6; **every animation is disabled
under `prefers-reduced-motion: reduce`.**

### 4.9 Charts
Bars: 10px wide, `--df-r-sm` top corners, `--df-accent` at 85% opacity, dimmed to 35%
for out-of-focus periods. One horizontal dashed goal line at 1px `--df-border`. No
vertical gridlines, no chart junk, no legends when a label suffices. Axis labels at
Micro size in `--df-text-faint`. Every chart is paired with a generated sentence (P10)
and degrades to an insufficient-data message (P11).

### 4.10 Forms
Inputs: 44px tall, `--df-r-sm`, 1px `--df-border`, accent border on focus plus a 2px
outer ring. Labels sit above (never placeholder-as-label). Validation appears inline
below the field on blur or submit, never as an alert. Destructive actions always
confirm through the existing `customConfirm`. Required fields are marked; optional
ones say "optional".

### 4.11 Empty states
Three tiers:
- **First-run** (no data ever): icon + one-line explanation + primary CTA.
- **Filtered-empty**: "No tasks match these filters" + a Clear filters action.
- **Genuinely done**: celebratory but quiet — "All clear for today."

Never an empty box, never "No data".

### 4.12 Mobile
Breakpoints 760px and 440px, matching the existing sheet. Nav becomes a bottom tab bar
with 5 primary destinations (Today, Tasks, Planner, Focus, More) and 56px targets.
Multi-column grids collapse to one column; the planner switches from 7-day to a single
day with a day strip; tables become stacked cards. Minimum touch target 44×44. Nothing
depends on hover — every hover affordance has a tap equivalent (this was a real defect
found in the existing app and fixed in V7.22).

### 4.13 Accessibility
- Contrast ≥ 4.5:1 body, ≥ 3:1 large text and meaningful UI edges.
- Visible focus ring on every interactive element: 2px accent + 2px offset.
- Full keyboard operation; modals trap focus and restore it on close (the existing
  `MODAL_FOCUS_CONFIG` pattern extends to all new modals).
- Colour is never the only signal — status carries an icon or text too.
- Live regions announce timer completion and save confirmations.
- Respects `prefers-reduced-motion`.
- All new strings ship in both English and Arabic with correct RTL mirroring.

---

## 5. Page-by-page redesign plan

**Shell.** Persistent left nav rail (desktop) / bottom tab bar (mobile) with nine
destinations: Ambient, Today, Tasks, Habits, Goals, Planner, Focus, Analytics,
Settings. Views swap in a single container; the active view is persisted so a refresh
returns you where you were.

**Ambient** — the existing dashboard, untouched. Every current feature (clock faces,
quick timer, widgets, theater mode, Spotify, prayer times) continues to live here.

**Today** — greeting + focus line (P1); Today score ring with a four-part breakdown
(P2); "Up next" card from the schedule; today's tasks with a progress header (P3);
habit row with streaks; goal progress; a one-tap Start focus button.

**Tasks** — List and Board views over one dataset. Board has four status columns with
drag-and-drop; List groups by due date (Todoist-style). Shared filter bar (priority,
category, status, due) plus search. Task detail opens in a side panel.

**Habits** — progress header (P3); per-habit weekly 7-column grid (P4); detail view
with two-stat streak header (P5), completion percentage and history.

**Goals** — cards showing ring + milestone count, grouped Active / Paused / Completed.
Detail: large ring, stat grid (P6), derived pacing line (P7), milestone checklist that
drives progress automatically.

**Planner** — week grid over the existing schedule data, category-coloured blocks with
left accent bars (P15), current-time line, today's column emphasised (P16). Click empty
space to create, click a block to edit.

**Focus** — preset chips (25/45/60) + custom; task/goal link selector (P8); ring
countdown; distraction-free mode (P9); session history feeding analytics.

**Analytics** — 7d/30d toggle; charts for task completion, habit consistency, focus
minutes and goal progress; each with an insight sentence (P10), a delta chip (P12), and
an insufficient-data state (P11); "most productive day/time" summary.

**Settings** — theme as preview cards (P17), profile and working hours, language,
export/import JSON, reset demo data, restart onboarding, restart tutorial.

**Onboarding** — five screens (name → primary goal → working hours → energy pattern →
habits), one question each with progress and a persistent Skip (P13), ending on a
payoff screen listing what was created (P14). Repeatable from Settings.

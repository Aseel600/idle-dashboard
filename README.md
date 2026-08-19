# DayFlow

A personal productivity operating system built on top of **Ambient OS**, a live ambient
clock dashboard. DayFlow adds eight product areas — Today, Tasks, Habits, Goals,
Planner, Focus, Analytics and Settings — without removing anything the ambient
dashboard already did.

Live: **https://leesa.site**

---

## Setup

There is no build step and no install step. The project is plain HTML, CSS and
JavaScript, so any static file server will run it.

```bash
# any one of these works
npx serve .
python -m http.server 8080
php -S localhost:8080
```

Then open `http://localhost:8080`.

Opening `index.html` directly from disk also works, with two caveats: the browser
blocks geolocation on `file://` (the app falls back to a default city), and Spotify
OAuth needs a real origin.

**No paid APIs, no database, no authentication provider and no environment variables
are required.** Everything runs from `localStorage` with seeded demo data on first run.
Optional extras (Spotify, cloud sync) degrade gracefully when unused.

### Why not React/Vite/Tailwind

The original brief specified React + TypeScript + Vite + Tailwind, "unless you have a
strong technical reason to choose an equivalent local-first stack." There is one, and
it is the brief's own higher-priority requirement: *do not remove any existing
feature*. Ambient OS is a mature app — a draggable-arc quick timer, four clock faces,
prayer-time handling, Spotify with synced lyrics and a mic-driven equaliser, theater
mode, eleven widgets, full English/Arabic localisation with RTL mirroring, and
Supabase-backed cloud sync. Rewriting ~5,600 lines of that in React would put every one
of those at risk to satisfy a stack preference. The existing stack is already
local-first, needs no build, and deploys as static files. See `design-research.md`
section 0 for the full reasoning.

---

## Architecture

```
index.html          markup, SVG icon sprite, ambient dashboard, DayFlow mount point
style.css           Ambient OS styles (unchanged in structure)
script.js           Ambient OS behaviour: clock, timer, widgets, i18n, cloud sync
dayflow.css         DayFlow design system tokens + all DayFlow view styles
dayflow.js          DayFlow data layer, router and all eight views
maintenance-config.js   one-flag switch to route visitors to maintenance.html
auth.js, login/     Supabase auth (optional; the app works fully signed-out)
supabase/           SQL migrations for the optional sync table
design-research.md  Mobbin research and the DayFlow design system
audit-report.md     what was tested, what broke, what was fixed
```

**Additive by design.** DayFlow renders into its own root (`#dfRoot`) that is only
shown when a DayFlow view is active. Selecting **Ambient** hides it entirely and the
original dashboard behaves exactly as before.

**Shared data, not duplicated data.** Where Ambient OS already owned a concept,
DayFlow reads and writes the same key rather than creating a parallel copy:

| Area | Storage key | Shared with |
|---|---|---|
| Profile | `dfProfile` | — |
| Tasks | `dfTasks` | — |
| Goals (long-term) | `dfGoals` | daily goals stay on `idleGoals` |
| Focus sessions | `dfSessions` | Pomodoro settings stay on `idlePomodoro*` |
| Planner blocks | `dfBlocks` | — |
| Habits | `idleHabits` | **the Ambient habits widget** |

Ticking a habit in DayFlow updates the ambient widget and vice versa. All DayFlow keys
are registered in `CLOUD_SYNC_KEYS`, so they sync across devices for signed-in users
exactly like everything else.

**Rendering model.** Views are string-returning functions in a `VIEWS` map with
optional `AFTER` hooks for event wiring. All interaction goes through a single
delegated click handler keyed on `data-act` / `data-nav`, so generated markup never
needs inline handlers or globals.

---

## Implemented features

**Onboarding**
- [x] Five questions: name, primary goal, working hours, energy pattern, habits
- [x] One question per screen with a progress bar and a persistent Skip
- [x] Payoff screen listing exactly what was created
- [x] Answers create a real goal, real habits and three starter tasks
- [x] Repeatable from Settings

**Today**
- [x] Time-aware greeting, date, and one derived focus line
- [x] Today score from tasks / habits / focus / schedule, with the breakdown shown
- [x] Today's tasks with inline completion
- [x] Habit streaks, goal progress, quick-start focus
- [x] Distinct empty states per section

**Tasks**
- [x] List and Board views over one dataset
- [x] Four statuses: Backlog, Today, In progress, Done
- [x] Drag-and-drop between board columns (with a status dropdown as the touch/keyboard path)
- [x] Filters for priority and category, plus text search
- [x] Detail modal with edit and delete
- [x] Completion feeds the dashboard and analytics

**Habits**
- [x] Create with name and frequency (daily / weekdays)
- [x] Mark complete for today or any past day in the week grid
- [x] Weekly 7-column completion grid
- [x] Current streak, best streak, 30-day completion percentage
- [x] Detail view

**Goals**
- [x] Long-term goals with description, target date and milestones
- [x] Progress calculated automatically from milestones
- [x] Active / Paused / Done grouping
- [x] Detail view with progress ring, stat grid and derived pacing advice

**Planner**
- [x] Week grid with hour gutter and current-time line
- [x] Create, edit and delete time blocks
- [x] Six categories with colour coding
- [x] Today's column emphasised; day strip on mobile

**Focus**
- [x] 25 / 45 / 60 minute presets
- [x] Start, pause, resume, reset, session-complete
- [x] Link a session to a task
- [x] Distraction-free mode
- [x] Sessions recorded and shown in history

**Analytics**
- [x] 7-day and 30-day ranges
- [x] Task completion, focus minutes, habit consistency, goal progress
- [x] Period-over-period delta chips
- [x] A plain-language insight sentence per chart
- [x] Insufficient-data state instead of an empty chart
- [x] Most productive day

**Settings**
- [x] Light / Dark / System theme as preview cards
- [x] Profile: name, working hours, energy pattern
- [x] Export all data as JSON
- [x] Import with validation (malformed files are rejected without touching stored data)
- [x] Reset demo data, restart onboarding, restart tutorial

**Preserved from Ambient OS** — clock with two faces and size control, draggable quick
timer with 5-minute snapping, prayer times with azan handling, weather, world clock,
Spotify (playback, synced lyrics, mic-driven equaliser), theater mode, countdowns,
schedule/timetable, quick links, crypto, RSS, 20-step tutorial, seven accent themes,
English/Arabic with RTL, optional Supabase cloud sync.

---

## Deployment

The project is already a static site — deploy the repository root as-is. No build
command, no output directory, no server runtime.

- **GitHub Pages** (current): serves from the default branch root. `.nojekyll` is
  present so underscore-prefixed paths are not stripped; `CNAME` holds the custom domain.
- **Netlify / Vercel / Cloudflare Pages**: build command empty, publish directory `.`
- **Any static host / S3 / nginx**: upload the repository contents.

`maintenance-config.js` has a single flag that routes all visitors to
`maintenance.html` while work is in progress. Append `?preview=1` to bypass it.

---

## Accessibility

Keyboard operable throughout, with a visible 2px focus ring on every interactive
element. Modals trap focus and restore it on close. Colour is never the only signal.
All motion is disabled under `prefers-reduced-motion: reduce`. Touch targets are at
least 44px, and nothing depends on hover.

## Browser support

Modern evergreen browsers. Uses `color-mix()`, CSS custom properties, logical
properties and `:focus-visible`.

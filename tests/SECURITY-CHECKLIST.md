# Widget Data-Input Security Audit Checklist

Scope: every path where data the app did not author reaches the DOM, storage, or a
URL. Status columns reflect an **executed scan** (see `tests/console/`) against the
current build, not a paper review. Re-run with `AOS.all()` and `WFZ.all()`.

Legend: **PASS** verified by executed test · **REVIEW** needs a human decision ·
**N/A** not applicable to this architecture

---

## 1. Trust boundaries

The dashboard ingests data from six distinct trust levels. Treat each differently.

| Source | Trust | Reaches |
|---|---|---|
| User typing into a widget field | Low | DOM, localStorage, cloud sync |
| RSS feed (third-party author, via proxy) | **None** | DOM, `href`, localStorage |
| CoinGecko / weather / prayer APIs | Low | DOM, localStorage |
| Spotify API (device names, track titles) | Low | DOM |
| QR / barcode payload from camera | **None** | auth path |
| Imported JSON export file | **None** | *every* localStorage key |

The two marked **None** are the ones that matter most: RSS content is authored by a
stranger, and an import file replaces application state wholesale.

---

## 2. Cross-site scripting

| # | Check | Status | Evidence |
|---|---|---|---|
| 2.1 | Every `innerHTML` interpolation of user/API data passes through `escapeHTML` | **PASS** | Traced all sinks; the 8 unescaped interpolations are formatted times, translation constants and numeric ids |
| 2.2 | RSS titles cannot execute | **PASS** | 6 payloads incl. `<script>`, `<img onerror>`, `<svg onload>` — none executed |
| 2.3 | RSS `link` cannot carry `javascript:` / `data:` / `vbscript:` | **PASS** | `safeExternalUrl` applied at **both** cache and render time |
| 2.4 | A poisoned link cached *before* the guard shipped is still neutralised | **PASS** | Render-time guard covers legacy cache entries |
| 2.5 | Spotify device names are escaped | **PASS** | Hostile-name mock produced no execution, no `<script>` node |
| 2.6 | Crypto coin ids cannot break out of generated `onclick` markup | **PASS** | Sanitised to `[a-z0-9-]`; 6 injection attempts all neutralised |
| 2.7 | Quick-link name and URL are escaped and scheme-validated | **PASS** | 17-case harness; `normalizeQuickLinkUrl` rejects all non-http(s) |
| 2.8 | Habit / goal / task titles are escaped in every render path | **PASS** | 126 widget-input payloads, zero execution |
| 2.9 | No `eval`, `new Function`, or `setTimeout(string)` on external data | **PASS** | Absent from the codebase |
| 2.10 | SVG `<use href>` cannot be driven by user input | **PASS** | `iconSVG` resolves through a fixed `ICON_LIBRARY` lookup |
| 2.11 | No `srcdoc` / `document.write` on untrusted data | **PASS** | Absent |

**Standing rule for new code:** `escapeHTML` neutralises markup characters. It does
**not** neutralise URI schemes. Anything landing in an `href`, `src`, `action` or
`formaction` needs `safeExternalUrl` **as well**.

---

## 3. Injection beyond XSS

| # | Check | Status | Notes |
|---|---|---|---|
| 3.1 | Prototype pollution via widget input | **PASS** | `__proto__` / `{"__proto__":{"admin":true}}` payloads left `Object.prototype` clean |
| 3.2 | Prototype pollution via imported JSON | **PASS** | Import copies only string values for keys on an allow-list |
| 3.3 | SQL injection | **N/A** | All DB access goes through the Supabase query builder; no raw SQL |
| 3.4 | Command injection | **N/A** | No server, no shell |
| 3.5 | Open redirect | **PASS** | No user-controlled navigation target; `location.replace` targets are literals |
| 3.6 | CSS injection via colour fields | **REVIEW** | Colours are written to `style.background` / custom properties. Not script-capable in modern browsers, but values come from a fixed picker — keep it that way rather than accepting free text |
| 3.7 | Unicode direction-override in titles (`‮`) | **REVIEW** | Accepted and rendered. Harmless here (no filenames, no approval flows) but can visually reverse text |

---

## 4. Input validation

| # | Check | Status | Notes |
|---|---|---|---|
| 4.1 | Empty title rejected | **PASS** | |
| 4.2 | Whitespace-only title rejected | **FIXED** | Was accepted — `"   "` is truthy, so an untrimmed check let it through and created a blank, unsearchable entry. `saveScheduledTask` and `addDailyGoal` now trim before validating |
| 4.3 | Oversized input (10k–100k chars) does not break rendering | **PASS** | Escaped and rendered; no freeze |
| 4.4 | Numeric fields clamp to sane ranges | **PASS** | Pomodoro `Math.max(1, …)`; clock size and dim clamped |
| 4.5 | Time range end-before-start | **REVIEW — intentional** | Accepted, and correctly so: it represents a block spanning midnight (23:30→00:30). Do not "fix" without adding an explicit overnight flag |
| 4.6 | Zero-length time range (10:00–10:00) | **REVIEW** | Accepted. Harmless but arguably meaningless — decide whether to reject or treat as a marker |
| 4.7 | Invalid dates (29 Feb in a non-leap year) | **PASS** | JS rolls to 1 Mar rather than producing `Invalid Date`; documented in tests so a future change is deliberate |
| 4.8 | Corrupted localStorage does not white-screen the app | **PASS** | Every key corrupted in turn; `safeParseJSON` falls back cleanly |

---

## 5. Secrets and credentials

| # | Check | Status | Notes |
|---|---|---|---|
| 5.1 | No server-side secret in client code | **PASS** | Only the Supabase publishable key and Spotify client id — both public by design |
| 5.2 | Spotify uses PKCE, no client secret | **PASS** | |
| 5.3 | Supabase anon key is RLS-gated, verified against production | **PASS** | Anonymous `SELECT` returns `[]`; anonymous `INSERT` returns 401 |
| 5.4 | Tokens are not written into the DOM or logged | **PASS** | |
| 5.5 | Exported JSON contains Spotify refresh token | **REVIEW — by design, worth a warning** | Export is a full state dump and *does* include `spotify_refresh_token`. Anyone given that file can act on the user's Spotify. Recommend a one-line warning at export time |
| 5.6 | Session token is in `localStorage`, readable by any JS on the origin | **ACCEPTED RISK** | Supabase default. This is precisely why §2 must hold — an XSS becomes account takeover |

---

## 6. Camera / QR pairing

| # | Check | Status | Notes |
|---|---|---|---|
| 6.1 | Denied permission produces a message, not a hang | **TEST WRITTEN** | `auth-offline-sync.spec.js` |
| 6.2 | `NotReadableError` (camera busy) handled | **TEST WRITTEN** | |
| 6.3 | Missing `BarcodeDetector` degrades and stops the stream | **TEST WRITTEN** | Verify the track is stopped, not merely hidden |
| 6.4 | Scanned payload is never `eval`'d | **PASS** | Parsed with `JSON.parse` inside try/catch |
| 6.5 | Scanned payload cannot inject a role/privilege field | **REVIEW** | Only `email`/`password` should be read from the payload; ignore all other keys explicitly |
| 6.6 | Oversized payload (100k chars) is bounded | **REVIEW** | Add a length cap before parsing |
| 6.7 | Camera track is stopped on success, failure and modal close | **REVIEW** | A left-running camera is a privacy defect regardless of function |

---

## 7. Import / export

| # | Check | Status | Notes |
|---|---|---|---|
| 7.1 | Import validates `app === 'DayFlow'` before writing | **PASS** | |
| 7.2 | Import ignores keys outside the allow-list | **PASS** | |
| 7.3 | Import ignores non-string values | **PASS** | |
| 7.4 | A malformed file leaves stored data untouched | **PASS** | 6 malformed payloads; data byte-identical afterwards |
| 7.5 | Import is confirmed before overwriting | **REVIEW** | Currently overwrites and reloads immediately. Recommend a confirmation showing what will be replaced |

---

## 8. Network and transport

| # | Check | Status | Notes |
|---|---|---|---|
| 8.1 | HTTPS enforced | **PASS** | GitHub Pages reports `https_enforced: true` |
| 8.2 | CDN dependency pinned + SRI | **PASS** | supabase-js pinned to an exact version with a `sha384` hash |
| 8.3 | External links use `rel="noopener"` | **PASS** | RSS and Quick Links |
| 8.4 | No Content-Security-Policy header | **OPEN — highest-value remaining hardening** | Static hosting cannot set headers; a `<meta http-equiv="Content-Security-Policy">` would still block inline-script execution and materially reduce §2's blast radius. Blocked today by the app's own inline `<script>` blocks and inline `onclick` handlers — would need nonces or a refactor |
| 8.5 | Third-party API failures degrade rather than break | **PASS** | 429 / 500 / malformed / abort all covered |
| 8.6 | No user IP sent to a third party | **PASS** | The `api.ipify.org` dev-menu gate was removed in V7.20 |

---

## 9. Accessibility findings that carry security weight

| # | Finding | Status |
|---|---|---|
| 9.1 | 26 form controls have no accessible name | **OPEN** | Checkboxes, date/time inputs and number fields rely on a visually adjacent `<span>`, which a screen reader does not announce. Recommended fix: give each `.mfr-label` span an `id` and point the control at it with `aria-labelledby` — this reuses the existing `data-i18n` translation with no new i18n machinery. Full element list in the scan output |
| 9.2 | Touch targets under 44px | **NOT A DEFECT ON DESKTOP** | The initial scan flagged 203/288, but that rule only applies to coarse pointers; the app already enlarges targets under `@media (hover: none)`. The checker is now pointer-aware |

---

## 10. Regression guards worth keeping forever

These are real defects that shipped and were fixed. Each has a test so it cannot return.

1. `<img src="">` resolves to the document URL — the browser fetched `index.html` as an image on every load.
2. RSS `link` reached an `href` escaped but not scheme-validated.
3. Entity ids were raw `Date.now()` and collided inside a single millisecond.
4. Quick timer state was never persisted and vanished on tab discard.
5. Hover-gated controls were unreachable on touch (timer handle, theater close button).
6. An RTL padding override put panel content under a fixed button.
7. `renderAccountUI` referenced a deleted element and halted the entire boot sequence.

---

## Appendix — running the scan

```js
// DevTools console on the running app
// paste tests/console/schedule-batch.js  then:
AOS.all();        // id collisions, batch submit, hostile input, date boundaries
AOS.restore();    // roll back everything it created

// paste tests/console/widget-fuzz.js     then:
WFZ.all();        // widget inputs, RSS render path, memory/timers, a11y sweep
```

**Both scripts stub `customAlert` / `customConfirm` before driving forms.** This is
mandatory, not cosmetic: the app has 23 `await customAlert/customConfirm` call sites,
and those promises only resolve on a real click. Without the stub the first validation
failure parks the await and the run hangs silently with no error.

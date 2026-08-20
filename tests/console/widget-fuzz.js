/* ============================================================================
   Widget input fuzzer + live memory probe
   ----------------------------------------------------------------------------
   Paste into DevTools on a running Ambient OS. Complements schedule-batch.js by
   targeting every *other* widget input and the long-running behaviour.

     WFZ.inputs()     fuzz every widget's text inputs
     WFZ.rss()        inject hostile feed payloads straight into the render path
     WFZ.storage()    corrupt each localStorage key and reload-test survival
     WFZ.memory(20)   sample heap/timers/nodes while thrashing views
     WFZ.a11y()       focus-visibility and touch-target sweep
     WFZ.report()
   ============================================================================ */
(function () {
  'use strict';
  const WFZ = window.WFZ = {};
  const findings = [];
  const log = (...a) => console.log('%c[WFZ]', 'color:#8E2DE2;font-weight:bold', ...a);
  const bad = (l, d) => { findings.push({ label: l, detail: d }); console.warn('%c[WFZ FAIL]', 'color:#ff4757;font-weight:bold', l, d ?? ''); };
  const good = l => console.log('%c[WFZ ok]', 'color:#2ed573', l);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* Dialog neutraliser - the app awaits customAlert/customConfirm on validation and
     destructive paths, and those only resolve on a real click. Without this the first
     rejected input parks the await and the whole sweep hangs silently. */
  (function stubDialogs() {
    WFZ._dialogs = [];
    const rec = t => m => { WFZ._dialogs.push({ type: t, message: String(m) }); return Promise.resolve(t === 'confirm' ? true : undefined); };
    window.customAlert = rec('alert');
    window.customConfirm = rec('confirm');
    window.customPrompt = (m, t, d) => { WFZ._dialogs.push({ type: 'prompt', message: String(m) }); return Promise.resolve(d ?? ''); };
    window.showDialog = () => Promise.resolve(true);
  })();
  const PAYLOADS = [
    '<script>window.__pwned=1</script>',
    '<img src=x onerror="window.__pwned=1">',
    '"><svg/onload=window.__pwned=1>',
    'javascript:window.__pwned=1',
    'data:text/html,<script>window.__pwned=1</script>',
    'vbscript:msgbox(1)',
    '__proto__',
    '{"__proto__":{"admin":true}}',
    "'; DROP TABLE x;--",
    '‮gnp.exe',
    'A'.repeat(20000),
    '',
    '   ',
    '🧨'.repeat(500)
  ];

  /* ---------- 1. every widget text input ---------- */
  const INPUTS = [
    { id: 'cityInput', label: 'Weather / prayer city' },
    { id: 'titleInput', label: 'Display title' },
    { id: 'newCryptoId', label: 'Crypto coin id', commit: () => window.addCustomCryptoCoin && addCustomCryptoCoin() },
    { id: 'rssFeedUrlInput', label: 'RSS feed URL', commit: () => window.saveRssSettings && saveRssSettings() },
    { id: 'newQuickLinkName', label: 'Quick link name' },
    { id: 'newQuickLinkUrl', label: 'Quick link URL', commit: () => window.addQuickLink && addQuickLink() },
    { id: 'newHabitName', label: 'Habit name', commit: () => window.addHabit && addHabit() },
    { id: 'newGoalName', label: 'Daily goal', commit: () => window.addGoal && addGoal() },
    { id: 'theaterUrlInput', label: 'Theater URL' }
  ];

  WFZ.inputs = async function () {
    delete window.__pwned;
    log(`fuzzing ${INPUTS.length} widget inputs x ${PAYLOADS.length} payloads…`);
    const rows = [];
    for (const inp of INPUTS) {
      const el = document.getElementById(inp.id);
      if (!el) { rows.push({ input: inp.label, status: 'not present' }); continue; }
      let threw = 0;
      for (const p of PAYLOADS) {
        el.value = p;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        try { inp.commit && inp.commit(); } catch (e) { threw++; }
        await sleep(4);
      }
      rows.push({ input: inp.label, payloads: PAYLOADS.length, threw });
      if (threw) bad(`${inp.label} threw on ${threw} payload(s)`);
    }
    console.table(rows);

    if (window.__pwned) bad('XSS EXECUTED via a widget input');
    else good('no widget input executed a payload');
    if (({}).admin !== undefined) bad('PROTOTYPE POLLUTED via a widget input');
    else good('Object.prototype intact');

    // Any href written by the app must be http(s).
    const badHrefs = [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href'))
      .filter(h => /^(javascript|data|vbscript|file):/i.test(h || ''));
    if (badHrefs.length) bad('dangerous href present in DOM', badHrefs.slice(0, 5));
    else good('no dangerous hrefs in the document');

    return rows;
  };

  /* ---------- 2. RSS render path ---------- */
  WFZ.rss = function () {
    delete window.__pwned;
    log('injecting hostile RSS items straight into the cache + render path…');
    const items = [
      { title: '<script>window.__pwned=1</script>', link: 'https://ok.example/1', pubDate: '2026-01-01' },
      { title: '<img src=x onerror="window.__pwned=1">', link: 'https://ok.example/2', pubDate: '2026-01-01' },
      { title: 'Looks fine', link: 'javascript:window.__pwned=1', pubDate: '2026-01-01' },
      { title: 'Also fine', link: 'data:text/html,<script>window.__pwned=1</script>', pubDate: '2026-01-01' },
      { title: null, link: null, pubDate: null },
      { title: 'X'.repeat(40000), link: 'https://ok.example/6', pubDate: 'garbage' }
    ];
    localStorage.setItem('idleRssCache', JSON.stringify({ items, fetchedAt: Date.now(), error: false }));
    try { window.renderRssWidget && renderRssWidget(); } catch (e) { bad('renderRssWidget threw', e.message); }

    if (window.__pwned) bad('RSS PAYLOAD EXECUTED');
    else good('no RSS payload executed');

    const hrefs = [...document.querySelectorAll('#rssWidgetList a')].map(a => a.getAttribute('href'));
    const dangerous = hrefs.filter(h => /^(javascript|data|vbscript):/i.test(h || ''));
    if (dangerous.length) bad('dangerous RSS href survived', dangerous);
    else good(`all ${hrefs.length} RSS hrefs are safe schemes`);

    const liveScripts = document.querySelectorAll('#wgRss script').length;
    if (liveScripts) bad('script element injected into the RSS widget', liveScripts);
    else good('no script elements in the RSS widget');
    return { hrefs, dangerous: dangerous.length };
  };

  /* ---------- 3. storage corruption survival ---------- */
  WFZ.storage = function () {
    log('corrupting every known key (non-destructive: snapshot first)…');
    const keys = Object.keys(localStorage);
    const snap = {};
    keys.forEach(k => snap[k] = localStorage.getItem(k));
    const CORRUPT = ['{not json', '[[[', 'undefined', 'null', '', '{"a":', '<html>', '"unterminated'];
    const rows = [];
    keys.forEach((k, i) => {
      const c = CORRUPT[i % CORRUPT.length];
      localStorage.setItem(k, c);
      let survived = true, err = '';
      try {
        window.DF && window.DF.__test && window.DF.__test._reload && window.DF.__test._reload();
        window.DF && window.DF.render && window.DF.render();
      } catch (e) { survived = false; err = e.message; }
      rows.push({ key: k, corruptedWith: c.slice(0, 12), survived, err });
      if (!survived) bad(`corrupt ${k} broke the app`, err);
      localStorage.setItem(k, snap[k]);
    });
    console.table(rows.filter(r => !r.survived).length ? rows.filter(r => !r.survived) : rows.slice(0, 8));
    if (!rows.some(r => !r.survived)) good(`all ${rows.length} keys survived corruption`);
    log('storage restored');
    return rows;
  };

  /* ---------- 4. memory / timer probe ---------- */
  WFZ.memory = async function (rounds = 20) {
    if (!performance.memory) log('note: performance.memory is Chromium-only; heap numbers will be null');
    if (!window.__wfzTimers) {
      window.__wfzTimers = { intervals: new Set(), timeouts: new Set() };
      const si = window.setInterval, ci = window.clearInterval, st = window.setTimeout, ct = window.clearTimeout;
      window.setInterval = function (...a) { const id = si.apply(this, a); window.__wfzTimers.intervals.add(id); return id; };
      window.clearInterval = function (id) { window.__wfzTimers.intervals.delete(id); return ci.call(this, id); };
      window.setTimeout = function (...a) { const id = st.apply(this, a); window.__wfzTimers.timeouts.add(id); return id; };
      window.clearTimeout = function (id) { window.__wfzTimers.timeouts.delete(id); return ct.call(this, id); };
    }
    const sample = () => ({
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      intervals: window.__wfzTimers.intervals.size,
      timeouts: window.__wfzTimers.timeouts.size,
      nodes: document.getElementsByTagName('*').length
    });

    const views = ['today', 'tasks', 'habits', 'goals', 'planner', 'focus', 'analytics', 'settings'];
    const base = sample();
    log('baseline', base);
    const series = [base];
    for (let r = 0; r < rounds; r++) {
      for (const v of views) { try { window.DF && DF.go(v); } catch (e) {} }
      try { setLanguage(r % 2 ? 'ar' : 'en'); } catch (e) {}
      await sleep(60);
      if (r % 5 === 4) series.push(Object.assign({ round: r + 1 }, sample()));
    }
    try { window.DF && DF.go('ambient'); } catch (e) {}
    await sleep(300);
    const final = sample();
    series.push(Object.assign({ round: 'final' }, final));
    console.table(series);

    if (final.intervals > base.intervals + 5) bad('interval leak', { from: base.intervals, to: final.intervals });
    else good('interval count stable');
    if (final.nodes > base.nodes * 2) bad('DOM node growth', { from: base.nodes, to: final.nodes });
    else good('DOM node count stable');
    if (base.heapMB && final.heapMB > base.heapMB * 3 + 40) bad('heap growth', { from: base.heapMB, to: final.heapMB });
    else if (base.heapMB) good('heap within bounds');
    return series;
  };

  /* ---------- 5. accessibility sweep ---------- */
  WFZ.a11y = function () {
    log('sweeping focus visibility and touch targets…');
    const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]')]
      .filter(el => el.offsetParent !== null);

    // 44px is a *touch* guideline. Flagging it on a desktop mouse viewport produces
    // ~200 false positives (the 38px icon-picker grid alone accounts for half), so
    // the size rule only applies where the primary pointer is actually coarse.
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const small = [];
    const unlabelled = [];
    interactive.forEach(el => {
      const r = el.getBoundingClientRect();
      if (coarse && r.width && r.height && (r.width < 44 || r.height < 44)) {
        small.push({ tag: el.tagName, id: el.id || el.className, w: Math.round(r.width), h: Math.round(r.height) });
      }
      // A visually adjacent <span> is not an accessible name: a screen reader needs
      // aria-label, aria-labelledby, a wrapping <label>, or text content.
      const labelledBy = el.getAttribute('aria-labelledby');
      const label = el.getAttribute('aria-label')
        || (labelledBy && document.getElementById(labelledBy) ? document.getElementById(labelledBy).textContent.trim() : '')
        || el.textContent.trim()
        || el.getAttribute('title')
        || el.getAttribute('placeholder')
        || (el.labels && el.labels.length ? [...el.labels].map(l => l.textContent.trim()).join(' ') : '');
      if (!label) unlabelled.push({ tag: el.tagName.toLowerCase(), id: el.id || el.className, type: el.type || '' });
    });

    log(`${interactive.length} interactive elements · pointer: ${coarse ? 'coarse (touch rules apply)' : 'fine (size rule skipped)'}`);
    if (coarse) {
      if (small.length) { console.table(small.slice(0, 25)); bad(`${small.length} touch target(s) under 44x44`); }
      else good('all touch targets >= 44px');
    }
    if (unlabelled.length) { console.table(unlabelled.slice(0, 30)); bad(`${unlabelled.length} control(s) with no accessible name`); }
    else good('every interactive element is labelled');

    // Contrast spot-check on primary text.
    const probe = document.querySelector('.df-h1, .display-title, .panel-header');
    if (probe) log('primary text colour', getComputedStyle(probe).color, 'on', getComputedStyle(document.body).backgroundColor);
    return { interactive: interactive.length, small: small.length, unlabelled: unlabelled.length };
  };

  WFZ.report = function () {
    console.groupCollapsed(`%c[WFZ] ${findings.length} finding(s)`, 'color:#ffa502;font-weight:bold');
    findings.length ? console.table(findings) : console.log('clean');
    console.groupEnd();
    return findings;
  };

  WFZ.all = async function () {
    await WFZ.inputs();
    WFZ.rss();
    await WFZ.memory(12);
    WFZ.a11y();
    return WFZ.report();
  };

  log('ready — WFZ.all(), or individually: inputs() rss() storage() memory() a11y()');
})();

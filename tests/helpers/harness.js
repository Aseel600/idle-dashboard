/**
 * Unit-test harness.
 *
 * Ambient OS is deliberately buildless: `script.js` and `dayflow.js` are classic
 * scripts, not ES modules, so there is nothing to `import`. Rather than duplicating
 * the logic into a fake module (which would then drift from what actually ships),
 * this boots the real files inside jsdom and hands back the live globals.
 *
 * What gets stubbed, and why - read this before trusting a result:
 *   - the Supabase CDN bundle          (no network in unit tests; auth is E2E's job)
 *   - fetch                            (weather / prayer / crypto / RSS / Spotify)
 *   - AudioContext                     (chimes)
 *   - matchMedia                       (jsdom does not implement it)
 *   - geolocation                      (absent in jsdom; app already falls back)
 * Everything else is the real code path.
 */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** Records every fetch the app attempts, so tests can assert on API behaviour. */
export class FetchRecorder {
  constructor() { this.calls = []; this.handlers = []; }
  /** on(/coingecko/, () => ({ status: 429, json: {...} })) */
  on(pattern, responder) { this.handlers.push({ pattern, responder }); return this; }
  install(win) {
    const self = this;
    win.fetch = function (url, opts) {
      const u = String(url);
      self.calls.push({ url: u, opts: opts || {} });
      for (const h of self.handlers) {
        const match = h.pattern instanceof RegExp ? h.pattern.test(u) : u.includes(h.pattern);
        if (!match) continue;
        const r = h.responder(u, opts) || {};
        if (r.reject) return Promise.reject(new Error(r.reject));
        return Promise.resolve({
          ok: r.status ? r.status >= 200 && r.status < 300 : true,
          status: r.status || 200,
          json: () => Promise.resolve(r.json === undefined ? {} : r.json),
          text: () => Promise.resolve(r.text === undefined ? '' : r.text)
        });
      }
      // Default: a benign empty success, so un-stubbed calls never hang a test.
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
    };
    return this;
  }
  urls() { return this.calls.map(c => c.url); }
  countMatching(pattern) { return this.calls.filter(c => pattern.test(c.url)).length; }
  reset() { this.calls = []; }
}

/**
 * Boot the app.
 * @param {object} opts
 * @param {object} opts.storage   seed localStorage before scripts run
 * @param {Date}   opts.now       pin Date.now()/new Date() before boot (time travel)
 * @param {string} opts.lang      'en' | 'ar'
 * @param {FetchRecorder} opts.fetch
 */
export async function bootApp(opts = {}) {
  let html = read('index.html');

  // Drop the CDN bundle (no network) and neuter the maintenance redirect so a run
  // never depends on the current state of maintenance-config.js.
  html = html.replace(/<script[^>]*cdn\.jsdelivr\.net[^>]*><\/script>/g, '');
  html = html.replace(/<script src="maintenance-config\.js"><\/script>/, '');

  const dom = new JSDOM(html, {
    url: 'http://localhost:5173/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const win = dom.window;

  // --- stubs, installed before any app code runs ---
  win.MAINTENANCE_MODE = false;
  win.matchMedia = win.matchMedia || (q => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }
  }));
  win.AudioContext = win.webkitAudioContext = function () {
    return {
      createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, value: 0 }, type: '' }),
      createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, value: 0 } }),
      createMediaStreamSource: () => ({ connect() {} }),
      createAnalyser: () => ({ connect() {}, getByteFrequencyData() {}, frequencyBinCount: 32, fftSize: 64, smoothingTimeConstant: 0 }),
      close: () => Promise.resolve(),
      currentTime: 0, destination: {}, state: 'running'
    };
  };
  win.requestAnimationFrame = win.requestAnimationFrame || (cb => win.setTimeout(() => cb(Date.now()), 16));
  win.cancelAnimationFrame = win.cancelAnimationFrame || (id => win.clearTimeout(id));
  // Supabase is exercised in E2E, not here - a stub keeps supabase-client.js happy.
  win.supabase = {
    createClient: () => ({
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithPassword: () => Promise.resolve({ error: { message: 'stubbed' } }),
        signOut: () => Promise.resolve({}),
        updateUser: () => Promise.resolve({}),
        resetPasswordForEmail: () => Promise.resolve({})
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
        upsert: () => Promise.resolve({})
      })
    })
  };

  (opts.fetch || new FetchRecorder()).install(win);

  if (opts.now) freezeClock(win, opts.now);

  if (opts.storage) {
    for (const [k, v] of Object.entries(opts.storage)) {
      win.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  if (opts.lang) win.localStorage.setItem('idleLang', opts.lang);
  // Tutorial would otherwise open over everything and swallow focus.
  win.localStorage.setItem('hasSeenTutorial', '1');

  // Run the real scripts, in load order.
  win.eval(read('supabase-client.js'));
  win.eval(read('script.js'));
  win.eval(read('dayflow.js'));

  await tick(win, 30);
  return { dom, win, doc: win.document, DF: win.DF, T: win.DF && win.DF.__test };
}

/** Pin the clock inside a window. Affects new Date(), Date.now() and the app's timers. */
export function freezeClock(win, when) {
  const fixed = when instanceof Date ? when.getTime() : new Date(when).getTime();
  const RealDate = win.Date;
  let offset = fixed - RealDate.now();
  function FakeDate(...args) {
    if (args.length === 0) return new RealDate(RealDate.now() + offset);
    return new RealDate(...args);
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = () => RealDate.now() + offset;
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  win.Date = FakeDate;
  return {
    /** Jump forward without waiting. */
    advance(ms) { offset += ms; },
    /** Move to an absolute instant. */
    set(next) { offset = (next instanceof Date ? next.getTime() : new Date(next).getTime()) - RealDate.now(); },
    restore() { win.Date = RealDate; }
  };
}

export function tick(win, ms = 0) {
  return new Promise(res => win.setTimeout(res, ms));
}

/** Convenience: the app's canonical YYYY-MM-DD key for a date. */
export function keyFor(d) {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

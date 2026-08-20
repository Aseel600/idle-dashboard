/**
 * Network mocks for every third-party the dashboard touches.
 *
 * Real endpoints used by the app (see script.js):
 *   api.coingecko.com          crypto ticker
 *   api.rss2json.com           RSS -> JSON proxy
 *   api.spotify.com            Now Playing / devices / playback
 *   accounts.spotify.com       token exchange + refresh
 *   api.aladhan.com            prayer times
 *   api.bigdatacloud.net       reverse geocoding
 *   api.open-meteo.com         weather (via fetchWeather)
 *   lrclib.net                 synced lyrics
 *   *.supabase.co              auth + user_data sync
 */

export const ENDPOINTS = {
  coingecko: '**/api.coingecko.com/**',
  rss2json: '**/api.rss2json.com/**',
  spotifyApi: '**/api.spotify.com/**',
  spotifyAuth: '**/accounts.spotify.com/**',
  aladhan: '**/api.aladhan.com/**',
  geocode: '**/api.bigdatacloud.net/**',
  weather: '**/api.open-meteo.com/**',
  lyrics: '**/lrclib.net/**',
  supabase: '**/*.supabase.co/**'
};

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

/** Silence every external call with a benign success, so tests are hermetic. */
export async function stubAllExternals(page) {
  await page.route(ENDPOINTS.coingecko, r => r.fulfill(json({})));
  await page.route(ENDPOINTS.rss2json, r => r.fulfill(json({ status: 'ok', items: [] })));
  await page.route(ENDPOINTS.spotifyApi, r => r.fulfill(json({}, 204)));
  await page.route(ENDPOINTS.spotifyAuth, r => r.fulfill(json({})));
  await page.route(ENDPOINTS.aladhan, r => r.fulfill(json({
    data: { timings: { Fajr: '05:00', Dhuhr: '12:15', Asr: '15:40', Maghrib: '18:35', Isha: '20:05' } }
  })));
  await page.route(ENDPOINTS.geocode, r => r.fulfill(json({ latitude: 21.54, longitude: 39.17, city: 'Jeddah' })));
  await page.route(ENDPOINTS.weather, r => r.fulfill(json({
    current: { temperature_2m: 31, weather_code: 0 },
    hourly: { time: [], temperature_2m: [], precipitation_probability: [] }
  })));
  await page.route(ENDPOINTS.lyrics, r => r.fulfill(json({}, 404)));
  await page.route(ENDPOINTS.supabase, r => r.fulfill(json({})));
}

/* ---------------- CoinGecko ---------------- */
export const crypto = {
  ok: prices => page => page.route(ENDPOINTS.coingecko, r => r.fulfill(json(
    prices || { bitcoin: { usd: 64000, usd_24h_change: 1.8 }, ethereum: { usd: 3100, usd_24h_change: -0.6 } }
  ))),
  rateLimited: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill({
    status: 429, contentType: 'application/json',
    headers: { 'retry-after': '60' },
    body: JSON.stringify({ status: { error_code: 429, error_message: 'You have exceeded the Rate Limit' } })
  })),
  serverError: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill(json({ error: 'internal' }, 500))),
  malformed: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"bitcoin": {' })),
  htmlInsteadOfJson: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Cloudflare</body></html>' })),
  emptyForUnknownCoin: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill(json({}))),
  networkFailure: () => page => page.route(ENDPOINTS.coingecko, r => r.abort('failed')),
  slow: ms => page => page.route(ENDPOINTS.coingecko, async r => { await new Promise(s => setTimeout(s, ms)); r.fulfill(json({})); }),
  /** Values engineered to break naive formatting. */
  hostileNumbers: () => page => page.route(ENDPOINTS.coingecko, r => r.fulfill(json({
    bitcoin: { usd: Number.MAX_SAFE_INTEGER, usd_24h_change: Infinity },
    ethereum: { usd: -0, usd_24h_change: NaN },
    tether: { usd: null, usd_24h_change: undefined },
    solana: { usd: 1e-12, usd_24h_change: -99999.999999 }
  })))
};

/* ---------------- RSS ---------------- */
export const RSS_XSS_ITEMS = [
  { title: '<script>window.__pwned=1</script>', link: 'https://ok.example/1', pubDate: '2026-08-01' },
  { title: '<img src=x onerror="window.__pwned=1">', link: 'https://ok.example/2', pubDate: '2026-08-01' },
  { title: 'Normal headline', link: 'javascript:window.__pwned=1', pubDate: '2026-08-01' },
  { title: 'Another', link: 'data:text/html,<script>window.__pwned=1</script>', pubDate: '2026-08-01' },
  { title: '"><svg/onload=window.__pwned=1>', link: 'vbscript:msgbox(1)', pubDate: '2026-08-01' },
  { title: 'Unicode ‮ override', link: 'https://ok.example/6', pubDate: 'not-a-date' },
  { title: 'A'.repeat(50_000), link: 'https://ok.example/7', pubDate: '2026-08-01' },
  { title: null, link: null, pubDate: null }
];

export const rss = {
  ok: items => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({ status: 'ok', items: items || [{ title: 'Hello', link: 'https://example.com', pubDate: '2026-08-01' }] }))),
  xss: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({ status: 'ok', items: RSS_XSS_ITEMS }))),
  statusError: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({ status: 'error', message: 'Feed not found' }))),
  http500: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({}, 500))),
  malformedJson: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok","items":[{"title":' })),
  xmlNotJson: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill({ status: 200, contentType: 'text/xml', body: '<?xml version="1.0"?><rss><channel><item><title>x</title></item></channel></rss>' })),
  /** ~8MB payload - checks the widget does not freeze the main thread. */
  huge: (count = 20_000) => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({
    status: 'ok',
    items: Array.from({ length: count }, (_, i) => ({ title: 'Item ' + i + ' ' + 'x'.repeat(300), link: 'https://example.com/' + i, pubDate: '2026-08-01' }))
  }))),
  itemsNotArray: () => page => page.route(ENDPOINTS.rss2json, r => r.fulfill(json({ status: 'ok', items: { nope: true } }))),
  networkFailure: () => page => page.route(ENDPOINTS.rss2json, r => r.abort('failed'))
};

/* ---------------- Spotify ---------------- */
export const NOW_PLAYING = {
  is_playing: true,
  progress_ms: 42_000,
  item: {
    name: 'Test Track', duration_ms: 210_000,
    artists: [{ name: 'Test Artist' }],
    album: { name: 'Test Album', images: [{ url: 'https://i.example/art.jpg' }] }
  },
  device: { id: 'dev1', name: 'LUX_3', volume_percent: 55 }
};

export const spotify = {
  playing: (body = NOW_PLAYING) => page => page.route('**/api.spotify.com/v1/me/player', r => r.fulfill(json(body))),
  noContent: () => page => page.route('**/api.spotify.com/v1/me/player', r => r.fulfill({ status: 204, body: '' })),
  tokenExpired: () => page => page.route('**/api.spotify.com/v1/**', r => r.fulfill(json({ error: { status: 401, message: 'The access token expired' } }, 401))),
  refreshOk: () => page => page.route('**/accounts.spotify.com/api/token', r => r.fulfill(json({ access_token: 'fresh-token', expires_in: 3600, refresh_token: 'new-refresh' }))),
  refreshFails: () => page => page.route('**/accounts.spotify.com/api/token', r => r.fulfill(json({ error: 'invalid_grant' }, 400))),
  devicesEmpty: () => page => page.route('**/api.spotify.com/v1/me/player/devices', r => r.fulfill(json({ devices: [] }))),
  devicesError: () => page => page.route('**/api.spotify.com/v1/me/player/devices', r => r.fulfill(json({ error: 'boom' }, 500))),
  devicesHostile: () => page => page.route('**/api.spotify.com/v1/me/player/devices', r => r.fulfill(json({
    devices: [
      { id: 'a', name: '<script>window.__pwned=1</script>', is_active: false },
      { id: 'b', name: '"><img src=x onerror=alert(1)>', is_active: true },
      { id: null, name: null, is_active: false }
    ]
  }))),
  rateLimited: () => page => page.route('**/api.spotify.com/v1/**', r => r.fulfill({ status: 429, headers: { 'retry-after': '5' }, contentType: 'application/json', body: '{}' })),
  /** Track changes on every poll - exercises the lyric/art desync path. */
  flapping: () => {
    let n = 0;
    return page => page.route('**/api.spotify.com/v1/me/player', r => {
      n++;
      r.fulfill(json({
        ...NOW_PLAYING,
        is_playing: n % 2 === 0,
        progress_ms: (n * 9000) % 210_000,
        item: { ...NOW_PLAYING.item, name: 'Track ' + n }
      }));
    });
  },
  missingAlbumArt: () => page => page.route('**/api.spotify.com/v1/me/player', r => r.fulfill(json({
    ...NOW_PLAYING, item: { ...NOW_PLAYING.item, album: { name: 'x', images: [] } }
  }))),
  nullItem: () => page => page.route('**/api.spotify.com/v1/me/player', r => r.fulfill(json({ is_playing: false, item: null })))
};

/* ---------------- Supabase ---------------- */
export const supabase = {
  offline: () => page => page.route(ENDPOINTS.supabase, r => r.abort('failed')),
  conflict: remoteData => page => page.route('**/rest/v1/user_data**', r => {
    if (r.request().method() === 'GET') return r.fulfill(json([{ data: remoteData }]));
    return r.fulfill(json({}, 409));
  }),
  ok: () => page => page.route('**/rest/v1/user_data**', r => r.fulfill(json([])))
};

/** Apply a list of mock installers to a page. */
export async function applyMocks(page, installers) {
  for (const fn of installers) await fn(page);
}

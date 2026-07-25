/* ==========================================
   1. STATE & CONFIGURATION
   ========================================== */
const SPOTIFY_CLIENT_ID = "c5a38a61e38c4f398bc51afcdf464303";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = "user-read-playback-state user-modify-playback-state user-read-currently-playing";

let spotifyToken = localStorage.getItem('spotify_token');
let spotifyTokenExpiry = localStorage.getItem('spotify_token_expiry');
let isSpotifyPlaying = false;
let spotifyUpdateInterval;

const cx = 200, cy = 200, radius = 162;
const DUAL_TRACK_AM_R = radius + 16;
const DUAL_TRACK_PM_R = radius + 32;
const DUAL_TRACK_AM_COLOR = "#ffa502";
const DUAL_TRACK_PM_COLOR = "#5352ed";
let dragging = false, prevMouseAngle = null, dragRadius = radius, isBroken = false;

// Idle Tracking
let lastInteractionTime = Date.now();
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

let originalDurationMs = 0;
let timerDurationMs = originalDurationMs;
let rawTimerDurationMs = timerDurationMs;
let timerEndTime = Date.now();
let isTimerRunning = false;

function safeParseJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed || fallback;
  } catch (e) {
    console.warn(`Corrupted localStorage data for "${key}", resetting to default.`, e);
    return fallback;
  }
}

// V4: Tasks and Database
let scheduledTasks = safeParseJSON('idleTasksV4', []);
let dailyGoals = safeParseJSON('idleGoals', []);
let activeTaskObj = null;
let clockInterruptedByPrayer = false;
let selectedTaskColor = '#ff4757';
let selectedTaskIcon = 'pencil';

// Calendar State
let currentDateView = new Date();
let isHijri = false;

let lang = localStorage.getItem('idleLang') || 'en';
const translations = {
  en: {
    language: "Language",
    location: "Location",
    displayTitle: "Display Title",
    quickTimers: "Quick Timers",
    accentColor: "Ambient Theme",
    remaining: "REMAINING",
    paused: "PAUSED",
    enterCity: "Enter City...",
    displayMode: "Display Mode",
    dark: "Dark",
    light: "Light",
    musicIntegration: "Music (Spotify)",
    loginSpotify: "Log in with Spotify",
    devices: "Playback Device",
    selectDevice: "Select Device",
    iqamaFor: "Iqamah: ",
    finishAt: "Finish at: ",
    tomorrow: " (Tomorrow)",
    gregorian: "Gregorian",
    hijri: "Hijri",
    prayerNames: { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha", None: "None" },
    newEvent: "New Event",
    editEvent: "Edit Event",
    titlePlaceholder: "Title",
    allDay: "All-day",
    routine: "Routine",
    starts: "Starts",
    ends: "Ends",
    repeatOnDays: "Repeat on Days",
    to: "to",
    timeZone: "Time Zone",
    repeatLabel: "Repeat",
    repeatNever: "Never",
    repeatDaily: "Every Day",
    repeatWeekly: "Every Week",
    repeatMonthly: "Every Month",
    repeatYearly: "Every Year",
    alertLabel: "Alert",
    alertNone: "None",
    alertAtTime: "At time of event",
    alert5: "5 minutes before",
    alert10: "10 minutes before",
    alert15: "15 minutes before",
    alert30: "30 minutes before",
    alert60: "1 hour before",
    alert1440: "1 day before",
    showReminderTimeline: "Show reminder in timeline",
    categoryIcon: "Category Icon",
    calendarColor: "Calendar Color",
    urlPlaceholder: "URL",
    notesPlaceholder: "Notes",
    cancel: "Cancel",
    delete: "Delete",
    saveTask: "Save Task",
    scheduleManager: "Schedule Manager",
    widgetSchedule: "Schedule",
    widgetWeather: "Weather",
    widgetNextPrayer: "Next Prayer",
    widgetWorldClock: "World Clock",
    widgetNowPlaying: "Now Playing",
    widgetQuickLinks: "Quick Links",
    rainLabel: "Rain",
    uvLabel: "UV",
    notConnected: "Not Connected",
    loginInSettings: "Login in settings",
    loadingText: "Loading...",
    loadingDevices: "Loading devices...",
    toggleFocusMode: "Toggle Focus Mode",
    toggleDevMenu: "Toggle QA Dev Menu",
    losAngeles: "Los Angeles",
    berlin: "Berlin",
    singapore: "Singapore",
    london: "London",
    newYork: "New York",
    tokyo: "Tokyo",
    dubaiCity: "Dubai",
    sydney: "Sydney",
    paris: "Paris",
    tasksGoals: "Tasks & Goals",
    addNewTask: "+ Add New Task",
    dailyGoalPlaceholder: "Daily Goal (e.g. Gym)...",
    add: "Add",
    widgetManager: "Widget Manager",
    clockCustomization: "Clock Customization",
    numbersLabel: "Numbers",
    minuteHand: "Minute Hand",
    hourHand: "Hour Hand",
    tickMarks: "Tick Marks",
    clockFaceStyle: "Clock Face Style",
    defaultLabel: "Default",
    classicLabel: "Classic",
    radarLabel: "Radar",
    arcStyle: "AM/PM Arc Style",
    originalLabel: "Original",
    dualTrack: "Dual Track",
    dimmedLabel: "Dimmed",
    dayNight: "Day / Night",
    systemStandby: "System Standby",
    clickToPausePlay: "Click to Pause/Play",
    offline: "Offline",
    noActiveDevice: "No active device"
  },
  ar: {
    language: "اللغة",
    location: "الموقع",
    displayTitle: "العنوان",
    quickTimers: "مؤقتات سريعة",
    accentColor: "لون المظهر",
    remaining: "المتبقي",
    paused: "متوقف",
    enterCity: "أدخل المدينة...",
    displayMode: "المظهر",
    dark: "داكن",
    light: "فاتح",
    musicIntegration: "الموسيقى (Spotify)",
    loginSpotify: "تسجيل الدخول",
    devices: "جهاز التشغيل",
    selectDevice: "اختر الجهاز",
    iqamaFor: "الإقامة: ",
    finishAt: "ينتهي في: ",
    tomorrow: " (غداً)",
    gregorian: "ميلادي",
    hijri: "هجري",
    prayerNames: { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء", None: "لا يوجد" },
    newEvent: "حدث جديد",
    editEvent: "تعديل الحدث",
    titlePlaceholder: "العنوان",
    allDay: "طوال اليوم",
    routine: "روتين",
    starts: "يبدأ",
    ends: "ينتهي",
    repeatOnDays: "التكرار في الأيام",
    to: "إلى",
    timeZone: "المنطقة الزمنية",
    repeatLabel: "التكرار",
    repeatNever: "أبداً",
    repeatDaily: "كل يوم",
    repeatWeekly: "كل أسبوع",
    repeatMonthly: "كل شهر",
    repeatYearly: "كل سنة",
    alertLabel: "التنبيه",
    alertNone: "بدون",
    alertAtTime: "في وقت الحدث",
    alert5: "قبل 5 دقائق",
    alert10: "قبل 10 دقائق",
    alert15: "قبل 15 دقيقة",
    alert30: "قبل 30 دقيقة",
    alert60: "قبل ساعة",
    alert1440: "قبل يوم",
    showReminderTimeline: "إظهار التذكير في الجدول الزمني",
    categoryIcon: "أيقونة الفئة",
    calendarColor: "لون التقويم",
    urlPlaceholder: "الرابط",
    notesPlaceholder: "ملاحظات",
    cancel: "إلغاء",
    delete: "حذف",
    saveTask: "حفظ المهمة",
    scheduleManager: "مدير الجدول",
    widgetSchedule: "الجدول",
    widgetWeather: "الطقس",
    widgetNextPrayer: "الصلاة القادمة",
    widgetWorldClock: "الساعة العالمية",
    widgetNowPlaying: "قيد التشغيل",
    widgetQuickLinks: "روابط سريعة",
    rainLabel: "المطر",
    uvLabel: "الأشعة فوق البنفسجية",
    notConnected: "غير متصل",
    loginInSettings: "سجل الدخول من الإعدادات",
    loadingText: "جارٍ التحميل...",
    loadingDevices: "جارٍ تحميل الأجهزة...",
    toggleFocusMode: "تبديل وضع التركيز",
    toggleDevMenu: "تبديل قائمة الجودة",
    losAngeles: "لوس أنجلوس",
    berlin: "برلين",
    singapore: "سنغافورة",
    london: "لندن",
    newYork: "نيويورك",
    tokyo: "طوكيو",
    dubaiCity: "دبي",
    sydney: "سيدني",
    paris: "باريس",
    tasksGoals: "المهام والأهداف",
    addNewTask: "+ إضافة مهمة جديدة",
    dailyGoalPlaceholder: "هدف يومي (مثال: الرياضة)...",
    add: "إضافة",
    widgetManager: "إدارة الأدوات",
    clockCustomization: "تخصيص الساعة",
    numbersLabel: "الأرقام",
    minuteHand: "عقرب الدقائق",
    hourHand: "عقرب الساعات",
    tickMarks: "علامات الوقت",
    clockFaceStyle: "نمط وجه الساعة",
    defaultLabel: "افتراضي",
    classicLabel: "كلاسيكي",
    radarLabel: "رادار",
    arcStyle: "نمط قوس الصباح/المساء",
    originalLabel: "أصلي",
    dualTrack: "مسار مزدوج",
    dimmedLabel: "خافت",
    dayNight: "نهار / ليل",
    systemStandby: "النظام في وضع الاستعداد",
    clickToPausePlay: "انقر للإيقاف/التشغيل",
    offline: "غير متصل بالإنترنت",
    noActiveDevice: "لا يوجد جهاز نشط"
  }
};

const toNum = (str) => lang === 'ar' ? str.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : str.toString();

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

let quickTimers = [10, 15, 30, 60, 120];
const themes = {
  blue: { name: 'blue', start: "#00c6ff", end: "#0072ff", handle: "#00c6ff" },
  pink: { name: 'pink', start: "#ff758c", end: "#ff7eb3", handle: "#ff758c" },
  white: { name: 'white', start: "#ffffff", end: "#888888", handle: "#ffffff" },
  red: { name: 'red', start: "#ff0844", end: "#ffb199", handle: "#ff0844" },
  purple: { name: 'purple', start: "#8E2DE2", end: "#4A00E0", handle: "#8E2DE2" },
  green: { name: 'green', start: "#0ba360", end: "#3cba92", handle: "#0ba360" },
  orange: { name: 'orange', start: "#f12711", end: "#f5af19", handle: "#f12711" }
};

let prayerTimes = {};
let nextPrayer = null;
let weatherHourlyData = null;
let spVolumeDragging = false;

const TIMEZONE_LIST = ['Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney', 'Europe/Paris', 'Europe/Berlin', 'Asia/Singapore', 'Asia/Riyadh'];
const ALERT_MINUTES = { attime: 0, '5': 5, '10': 10, '15': 15, '30': 30, '60': 60, '1440': 1440 };

const ICON_LIBRARY = {
  pencil: { symbol: 'icon-pencil', legacy: '📝' },
  dumbbell: { symbol: 'icon-dumbbell', legacy: '🏋️' },
  briefcase: { symbol: 'icon-briefcase', legacy: '💼' },
  gamepad: { symbol: 'icon-gamepad', legacy: '🎮' },
  moon: { symbol: 'icon-moon', legacy: '🌙' },
  utensils: { symbol: 'icon-utensils', legacy: '🍽️' },
  book: { symbol: 'icon-book', legacy: '📚' },
  laptop: { symbol: 'icon-laptop', legacy: '💻' },
  mail: { symbol: 'icon-mail', legacy: '✉️' },
  phone: { symbol: 'icon-phone', legacy: '📱' },
  chart: { symbol: 'icon-chart', legacy: '📊' },
  target: { symbol: 'icon-target', legacy: '🎯' },
  'clipboard-check': { symbol: 'icon-clipboard-check', legacy: '✅' },
  building: { symbol: 'icon-building', legacy: '🏢' },
  heart: { symbol: 'icon-heart', legacy: '❤️' },
  pill: { symbol: 'icon-pill', legacy: '💊' },
  stethoscope: { symbol: 'icon-stethoscope', legacy: '🩺' },
  droplet: { symbol: 'icon-droplet', legacy: '💧' },
  activity: { symbol: 'icon-activity', legacy: '🏃' },
  bike: { symbol: 'icon-bike', legacy: '🚴' },
  tooth: { symbol: 'icon-tooth', legacy: '🦷' },
  coffee: { symbol: 'icon-coffee', legacy: '☕' },
  pizza: { symbol: 'icon-pizza', legacy: '🍕' },
  cake: { symbol: 'icon-cake', legacy: '🎂' },
  'shopping-cart': { symbol: 'icon-shopping-cart', legacy: '🛒' },
  wine: { symbol: 'icon-wine', legacy: '🍷' },
  home: { symbol: 'icon-home', legacy: '🏠' },
  bed: { symbol: 'icon-bed', legacy: '🛏️' },
  broom: { symbol: 'icon-broom', legacy: '🧹' },
  wrench: { symbol: 'icon-wrench', legacy: '🔧' },
  key: { symbol: 'icon-key', legacy: '🔑' },
  trash: { symbol: 'icon-trash', legacy: '🗑️' },
  plane: { symbol: 'icon-plane', legacy: '✈️' },
  car: { symbol: 'icon-car', legacy: '🚗' },
  'map-pin': { symbol: 'icon-map-pin', legacy: '📍' },
  luggage: { symbol: 'icon-luggage', legacy: '🧳' },
  train: { symbol: 'icon-train', legacy: '🚆' },
  ship: { symbol: 'icon-ship', legacy: '🚢' },
  compass: { symbol: 'icon-compass', legacy: '🧭' },
  users: { symbol: 'icon-users', legacy: '👥' },
  gift: { symbol: 'icon-gift', legacy: '🎁' },
  'message-circle': { symbol: 'icon-message-circle', legacy: '💬' },
  camera: { symbol: 'icon-camera', legacy: '📷' },
  party: { symbol: 'icon-party', legacy: '🎉' },
  'dollar-sign': { symbol: 'icon-dollar-sign', legacy: '💵' },
  'credit-card': { symbol: 'icon-credit-card', legacy: '💳' },
  'piggy-bank': { symbol: 'icon-piggy-bank', legacy: '🐷' },
  receipt: { symbol: 'icon-receipt', legacy: '🧾' },
  'trending-up': { symbol: 'icon-trending-up', legacy: '📈' },
  'graduation-cap': { symbol: 'icon-graduation-cap', legacy: '🎓' },
  backpack: { symbol: 'icon-backpack', legacy: '🎒' },
  star: { symbol: 'icon-star', legacy: '⭐' },
  'alarm-clock': { symbol: 'icon-alarm-clock', legacy: '⏰' },
  umbrella: { symbol: 'icon-umbrella', legacy: '☂️' },
  paw: { symbol: 'icon-paw', legacy: '🐾' },
  baby: { symbol: 'icon-baby', legacy: '👶' },
  tree: { symbol: 'icon-tree', legacy: '🌳' },
  sun: { symbol: 'icon-sun', legacy: '☀️' }
};

const ICON_KEYWORDS = {
  dumbbell: ['gym', 'workout', 'exercise', 'fitness', 'training'],
  briefcase: ['work', 'meeting', 'office', 'job', 'client'],
  gamepad: ['game', 'gaming', 'play'],
  moon: ['sleep', 'night', 'nap'],
  utensils: ['dinner', 'lunch', 'breakfast', 'meal', 'eat', 'restaurant'],
  book: ['study', 'read', 'reading', 'class', 'homework', 'exam'],
  laptop: ['laptop', 'computer', 'code', 'coding'],
  mail: ['email', 'mail', 'inbox'],
  phone: ['call', 'phone'],
  chart: ['report', 'presentation', 'analytics', 'review'],
  target: ['goal', 'target', 'objective'],
  'clipboard-check': ['task', 'todo', 'checklist'],
  building: ['office', 'company'],
  heart: ['date', 'love', 'anniversary', 'valentine'],
  pill: ['medicine', 'pill', 'medication', 'meds'],
  stethoscope: ['doctor', 'appointment', 'checkup', 'clinic'],
  droplet: ['water', 'hydrate', 'drink'],
  activity: ['run', 'running', 'jog', 'cardio'],
  bike: ['bike', 'cycling', 'ride'],
  tooth: ['dentist', 'dental', 'teeth'],
  coffee: ['coffee', 'cafe', 'break'],
  pizza: ['pizza', 'takeout'],
  cake: ['birthday', 'cake', 'celebration'],
  'shopping-cart': ['shopping', 'shop', 'groceries', 'store'],
  wine: ['wine', 'drinks', 'bar', 'happy hour'],
  home: ['home', 'house', 'chores'],
  bed: ['bed', 'rest'],
  broom: ['clean', 'cleaning', 'housework'],
  wrench: ['repair', 'fix', 'maintenance'],
  key: ['keys', 'move', 'moving'],
  trash: ['trash', 'garbage', 'bin'],
  plane: ['flight', 'fly', 'airport', 'travel'],
  car: ['drive', 'car', 'commute'],
  'map-pin': ['visit', 'location'],
  luggage: ['vacation', 'trip', 'packing'],
  train: ['train', 'railway'],
  ship: ['cruise', 'boat', 'sailing'],
  compass: ['explore', 'adventure', 'hike', 'hiking'],
  users: ['team', 'group', 'friends', 'family'],
  gift: ['gift', 'present'],
  'message-circle': ['chat', 'message', 'text'],
  camera: ['photo', 'photography', 'shoot'],
  party: ['party', 'celebration', 'event'],
  'dollar-sign': ['pay', 'payment', 'bill', 'salary'],
  'credit-card': ['card', 'purchase'],
  'piggy-bank': ['save', 'savings', 'budget'],
  receipt: ['invoice', 'receipt', 'expense'],
  'trending-up': ['growth', 'stocks', 'investment'],
  'graduation-cap': ['graduation', 'school', 'university'],
  backpack: ['school', 'college', 'student'],
  star: ['favorite', 'important', 'priority'],
  'alarm-clock': ['alarm', 'wake', 'reminder'],
  umbrella: ['rain', 'weather'],
  paw: ['pet', 'dog', 'cat', 'vet'],
  baby: ['baby', 'kid', 'child', 'daycare'],
  tree: ['garden', 'outdoor', 'nature', 'park'],
  sun: ['sunny', 'morning', 'sunrise']
};
const LEGACY_ICON_MAP = {};
Object.entries(ICON_LIBRARY).forEach(([id, def]) => { LEGACY_ICON_MAP[def.legacy] = id; });

function resolveIconId(value) {
  if (ICON_LIBRARY[value]) return value;
  if (LEGACY_ICON_MAP[value]) return LEGACY_ICON_MAP[value];
  return 'pencil';
}
function iconSVG(value, extraClass = '') {
  const id = resolveIconId(value);
  return `<svg class="icon-svg ${extraClass}"><use href="#${ICON_LIBRARY[id].symbol}"></use></svg>`;
}
function svgIcon(symbolId, extraClass = '') {
  return `<svg class="icon-svg ${extraClass}"><use href="#${symbolId}"></use></svg>`;
}
let currentCity = localStorage.getItem('idleCity') || "Jeddah";
let cityLat = 21.5433;
let cityLon = 39.1728;
let currentTheme = themes[localStorage.getItem('idleTheme')] || themes.blue;
let currentMode = localStorage.getItem('idleMode') || 'dark';
let arcStyleMode = localStorage.getItem('arcStyleMode') || 'original';
const iqamaOffsets = { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };

/* ==========================================
   2. DOM ELEMENTS (THE NERVOUS SYSTEM)
   ========================================== */
const clockSvg = document.getElementById("clock");
const mainClockContainer = document.getElementById("mainClockContainer");
const ambientGlow = document.getElementById("ambientGlow");
const starLayer = document.getElementById("starLayer");
const shootingStar = document.getElementById("shootingStar");
const titleInput = document.getElementById("titleInput");
const displayTitle = document.getElementById("displayTitle");
const timeValueText = document.getElementById("timeValueText");
const timeLabelText = document.getElementById("timeLabelText");
const cityInput = document.getElementById("cityInput");
const startHandle = document.getElementById("startHandle");
const endHandle = document.getElementById("endHandle");
const dragString = document.getElementById("dragString");
const ballTrail = document.getElementById("ballTrail");
const sleepArc = document.getElementById("sleepArc");
const themeGrid = document.getElementById("themeGrid");
const devMenu = document.getElementById("devMenu");

/* ==========================================
   3. AMBIENT IDLE TRACKING
   ========================================== */
function resetIdleTimer() {
  lastInteractionTime = Date.now();
}
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('touchstart', resetIdleTimer);

/* ==========================================
   4. AUDIO CHIME & ZEN MODE
   ========================================== */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.error("Audio block", e);
  }
}
function toggleFocusMode() {
  document.body.classList.toggle('focus-mode');
}

/* ==========================================
   5. DEV MENU (Draggable)
   ========================================== */
let devDrag = false, devX, devY;
document.getElementById('devHeader').addEventListener('mousedown', (e) => {
  devDrag = true;
  devX = e.clientX - devMenu.getBoundingClientRect().left;
  devY = e.clientY - devMenu.getBoundingClientRect().top;
});
window.addEventListener('mousemove', (e) => {
  if (devDrag) {
    devMenu.style.left = (e.clientX - devX) + 'px';
    devMenu.style.top = (e.clientY - devY) + 'px';
    devMenu.style.right = 'auto';
  }
});
window.addEventListener('mouseup', () => devDrag = false);

function toggleDevMenu() {
  const hidden = devMenu.classList.toggle('dev-menu-hidden');
  localStorage.setItem('devMenuHidden', hidden ? '1' : '0');
}
if (localStorage.getItem('devMenuHidden') === '1') {
  devMenu.classList.add('dev-menu-hidden');
}

let isTestGlowActive = false;
function testHolyGlow() {
  isTestGlowActive = !isTestGlowActive;
  if (isTestGlowActive) {
    ambientGlow.classList.add("prayer-glow-active");
    if (document.getElementById("widgetPrayerName")) {
      document.getElementById("widgetPrayerName").classList.add("prayer-text-highlight");
      document.getElementById("widgetPrayerName").textContent = "DEV TEST";
      document.getElementById("widgetPrayerCountdown").textContent = "(05:00)";
      document.getElementById("widgetPrayerCountdown").style.color = "#FFD700";
    }
    document.getElementById('glowBtnLabel').textContent = "Reset Glow";
    if (!clockInterruptedByPrayer) {
      clockInterruptedByPrayer = true;
      document.getElementById('displayTitle').style.color = '#FFD700';
    }
    document.documentElement.style.setProperty('--accent', '#FFD700');
    displayTitle.textContent = "DEV TEST";
  } else {
    ambientGlow.classList.remove("prayer-glow-active");
    if (document.getElementById("widgetPrayerName")) {
      document.getElementById("widgetPrayerName").classList.remove("prayer-text-highlight");
      document.getElementById("widgetPrayerName").textContent = "Loading...";
    }
    document.getElementById('glowBtnLabel').textContent = "Azan Glow";
    if (clockInterruptedByPrayer) resumeClockFromPrayerInterruption();
    calculateNextPrayer();
  }
}

/* ==========================================
   6. MATH, SVG PHYSICS & EFFECTS
   ========================================== */
const minsToAngle = (m) => ((m % 720) / 720) * 360;
const getNowMins = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
};

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, r, startAngle, endAngle) {
  let diff = endAngle - startAngle;
  if (diff < 0) diff += 360;
  if (diff === 0) diff = 359.9;
  const start = polarToCartesian(x, y, r, startAngle);
  const end = polarToCartesian(x, y, r, endAngle);
  const largeArcFlag = diff > 180 ? "1" : "0";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 1, end.x, end.y].join(" ");
}

function drawTicks() {
  const tg = document.getElementById("ticks");
  if (!tg) return;
  tg.innerHTML = '';
  for (let i = 0; i < 72; i++) {
    if (i % 18 === 0) continue;
    const angle = i * 5;
    const isH = i % 3 === 0;
    const r1 = isH ? radius - 14 : radius - 20;
    const p1 = polarToCartesian(cx, cy, r1, angle);
    const p2 = polarToCartesian(cx, cy, radius - 4, angle);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("stroke", isH ? "rgba(120,120,120,0.5)" : "rgba(120,120,120,0.2)");
    line.setAttribute("stroke-width", isH ? "2" : "1");
    tg.appendChild(line);
  }
}

function triggerShootingStar() {
  document.getElementById('starLayer').style.setProperty('--star-color', activeTaskObj ? activeTaskObj.color : currentTheme.handle);
  const ss = document.getElementById('shootingStar');
  const ag = document.getElementById('ambientGlow');
  ss.classList.remove("shoot");
  void ss.offsetWidth;
  ss.classList.add("shoot");
  if (!ag.classList.contains("prayer-glow-active")) {
    ag.style.transition = "opacity 0.2s";
    ag.style.opacity = "0.7";
    setTimeout(() => {
      ag.style.transition = "opacity 2s linear";
      ag.style.opacity = "0";
    }, 200);
  }
}

function triggerSnapEasterEgg() {
  isBroken = true;
  dragging = false;
  prevMouseAngle = null;
  endHandle.classList.remove("dragging", "snap-back");
  dragString.style.opacity = "0";
  const hx = parseFloat(endHandle.getAttribute("cx")) || cx;
  const hy = parseFloat(endHandle.getAttribute("cy")) || (cy - radius);
  const dx = hx - cx, dy = hy - cy;
  const flingX = cx + dx * 6, flingY = cy + dy * 6;
  const throwCurve = "cubic-bezier(0.2, 0.8, 0.2, 1)", throwDuration = "1s";
  ballTrail.style.transition = "none";
  ballTrail.setAttribute("x1", hx);
  ballTrail.setAttribute("y1", hy);
  ballTrail.setAttribute("x2", hx);
  ballTrail.setAttribute("y2", hy);
  ballTrail.style.opacity = "0.8";
  void ballTrail.offsetWidth;
  endHandle.style.transition = `cx ${throwDuration} ${throwCurve}, cy ${throwDuration} ${throwCurve}`;
  endHandle.setAttribute("cx", flingX);
  endHandle.setAttribute("cy", flingY);
  ballTrail.style.transition = `x2 ${throwDuration} ${throwCurve}, y2 ${throwDuration} ${throwCurve}, x1 ${throwDuration} 0.15s ${throwCurve}, y1 ${throwDuration} 0.15s ${throwCurve}, opacity 1s 0.5s ease-out`;
  ballTrail.setAttribute("x2", flingX);
  ballTrail.setAttribute("y2", flingY);
  ballTrail.setAttribute("x1", flingX);
  ballTrail.setAttribute("y1", flingY);
  ballTrail.style.opacity = "0";
  setTimeout(() => {
    endHandle.style.transition = "none";
    endHandle.style.opacity = "0";
    dragRadius = radius;
    isBroken = false;
    try { updateLiveTimer(); } catch (e) {}
    setTimeout(() => {
      endHandle.style.transition = "opacity 0.3s ease";
      endHandle.style.opacity = "1";
      setTimeout(() => {
        endHandle.style.transition = "";
        endHandle.classList.add("snap-back");
      }, 300);
    }, 50);
  }, 1000);
}

function animateWobblyString() {
  requestAnimationFrame(animateWobblyString);
  if (isBroken) return;
  const nowMins = getNowMins();
  const targetMins = nowMins + (timerDurationMs / 60000);
  let baseR = radius;
  if (arcStyleMode === 'dualtrack' && !dragging) {
    const targetH = Math.floor((((targetMins % 1440) + 1440) % 1440) / 60);
    baseR = targetH < 12 ? DUAL_TRACK_AM_R : DUAL_TRACK_PM_R;
  }
  const base = polarToCartesian(cx, cy, baseR, minsToAngle(targetMins));
  const hx = parseFloat(endHandle.getAttribute("cx")) || base.x;
  const hy = parseFloat(endHandle.getAttribute("cy")) || base.y;
  const dist = Math.hypot(hx - base.x, hy - base.y);
  const centerDist = Math.hypot(hx - cx, hy - cy);
  if (dist < 1 && !dragging) {
    dragString.style.opacity = "0";
    return;
  }
  dragString.style.opacity = "1";
  if (centerDist < radius - 5) {
    dragString.style.strokeDasharray = "4 6";
    dragString.style.strokeWidth = "2.5";
    dragString.setAttribute("d", `M ${base.x} ${base.y} L ${hx} ${hy}`);
  } else {
    dragString.style.strokeDasharray = "none";
    const stretch = Math.max(0, centerDist - radius);
    dragString.style.strokeWidth = Math.max(0.5, 3 - stretch / 50).toString();
    const wobble = Math.max(0, 20 - stretch * 0.15);
    const pt1x = base.x + (hx - base.x) * 0.33, pt1y = base.y + (hy - base.y) * 0.33;
    const pt2x = base.x + (hx - base.x) * 0.66, pt2y = base.y + (hy - base.y) * 0.66;
    const nx = -(hy - base.y) / dist, ny = (hx - base.x) / dist, time = Date.now();
    const activeWobble = dragging ? wobble : 0;
    const w1 = Math.sin(time / 250) * activeWobble, w2 = Math.sin((time / 250) + Math.PI / 2) * activeWobble;
    dragString.setAttribute("d", `M ${base.x} ${base.y} C ${pt1x + nx * w1} ${pt1y + ny * w1}, ${pt2x + nx * w2} ${pt2y + ny * w2}, ${hx} ${hy}`);
  }
}

/* ==========================================
   7. MODAL & MINI CLOCK LOGIC (V4.5 TASK EDITOR)
   ========================================== */
let miniStartMins = 540, miniEndMins = 600, miniDragging = null;
const mcx = 100, mcy = 100, mr = 80;
let editingTaskId = null;

function openDefaultTaskModal() {
  openTaskModalForDate(new Date());
}

function openTaskModalForDate(dateObj, startMins = 540, endMins = 600) {
  editingTaskId = null;
  document.getElementById('modalHeaderTitle').textContent = translations[lang].newEvent;
  document.getElementById('deleteTaskBtn').style.display = "none";
  document.getElementById('newTaskName').value = "";
  document.getElementById('newTaskLocation').value = "";
  document.getElementById('taskAllDay').checked = false;
  document.getElementById('taskIsRoutine').checked = false;
  selectedRoutineDays = [];
  document.querySelectorAll('#routineDayPicker .day-bubble').forEach(b => b.classList.remove('active'));
  updateModalFieldVisibility();
  document.getElementById('newTaskRepeat').value = 'none';
  document.getElementById('newTaskAlert').value = 'none';
  document.getElementById('taskShowReminderInTimeline').checked = false;
  document.getElementById('newTaskUrl').value = "";
  document.getElementById('newTaskNotes').value = "";
  selectTaskColor('#ff4757', document.querySelector('.color-swatch'));
  selectTaskIcon('pencil', document.querySelector('.icon-option'));
  populateTimezoneSelect();
  updateIconSuggestions();

  document.getElementById('taskModal').classList.add('active');
  const tzOffset = dateObj.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(dateObj - tzOffset)).toISOString().split('T')[0];
  document.getElementById('newTaskDate').value = localISOTime;
  document.getElementById('newTaskEndDate').value = localISOTime;
  miniStartMins = startMins;
  miniEndMins = endMins;
  updateMiniClock();
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('active');
}

/* ==========================================
   7b. CUSTOM THEMED DIALOGS (replaces native alert/confirm/prompt)
   ========================================== */
let dialogResolver = null;

function showDialog({ title, message, showCancel = true, showInput = false, defaultValue = '', okLabel, cancelLabel, danger = false }) {
  return new Promise(resolve => {
    dialogResolver = resolve;
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogMessage').textContent = message;
    const input = document.getElementById('dialogPromptInput');
    input.style.display = showInput ? 'block' : 'none';
    input.value = defaultValue;
    const cancelBtn = document.getElementById('dialogCancelBtn');
    cancelBtn.style.display = showCancel ? 'block' : 'none';
    const okBtn = document.getElementById('dialogOkBtn');
    okBtn.textContent = okLabel || (lang === 'en' ? 'OK' : 'موافق');
    cancelBtn.textContent = cancelLabel || (lang === 'en' ? 'Cancel' : 'إلغاء');
    okBtn.classList.toggle('danger', danger);
    document.getElementById('customDialogModal').classList.add('active');
    if (showInput) setTimeout(() => input.focus(), 50);
  });
}

function resolveDialog(confirmed) {
  document.getElementById('customDialogModal').classList.remove('active');
  const input = document.getElementById('dialogPromptInput');
  const wasInput = input.style.display !== 'none';
  const resolver = dialogResolver;
  dialogResolver = null;
  if (!resolver) return;
  if (wasInput) resolver(confirmed ? input.value : null);
  else resolver(confirmed);
}

document.getElementById('dialogPromptInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') resolveDialog(true);
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('customDialogModal').classList.contains('active')) { resolveDialog(false); return; }
  if (document.getElementById('taskModal').classList.contains('active')) { closeTaskModal(); return; }
  if (document.getElementById('timetableModal').classList.contains('active')) { closeTimetable(); return; }
  if (document.getElementById('scheduleManagerModal').classList.contains('active')) { closeScheduleManager(); return; }
});

document.querySelectorAll('.widget-header[role="button"]').forEach(header => {
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      header.click();
    }
  });
});

async function customAlert(message, title) {
  await showDialog({ title: title || (lang === 'en' ? 'Notice' : 'تنبيه'), message, showCancel: false });
}
async function customConfirm(message, title, danger = false) {
  return await showDialog({ title: title || (lang === 'en' ? 'Confirm' : 'تأكيد'), message, showCancel: true, danger, okLabel: danger ? (lang === 'en' ? 'Delete' : 'حذف') : undefined });
}
async function customPrompt(message, defaultValue, title) {
  return await showDialog({ title: title || (lang === 'en' ? 'Edit' : 'تعديل'), message, showCancel: true, showInput: true, defaultValue });
}

function editTask(taskId) {
  const task = scheduledTasks.find(t => t.id === taskId);
  if (!task) return;
  editingTaskId = task.id;
  document.getElementById('modalHeaderTitle').textContent = translations[lang].editEvent;
  document.getElementById('deleteTaskBtn').style.display = "block";
  document.getElementById('taskModal').classList.add('active');
  document.getElementById('newTaskName').value = task.name;
  document.getElementById('newTaskLocation').value = task.location || '';
  document.getElementById('newTaskDate').value = task.date;
  document.getElementById('newTaskEndDate').value = task.endDate || task.date;
  document.getElementById('taskAllDay').checked = !!task.allDay;
  document.getElementById('taskIsRoutine').checked = !!task.isRoutine;
  selectedRoutineDays = Array.isArray(task.days) ? [...task.days] : [];
  document.querySelectorAll('#routineDayPicker .day-bubble').forEach(b => {
    b.classList.toggle('active', selectedRoutineDays.includes(parseInt(b.dataset.day, 10)));
  });
  updateModalFieldVisibility();
  populateTimezoneSelect();
  const tzSel = document.getElementById('newTaskTimezone');
  if (tzSel && task.timezone) tzSel.value = task.timezone;
  document.getElementById('newTaskRepeat').value = task.repeat || (task.recurring ? 'daily' : 'none');
  document.getElementById('newTaskAlert').value = task.alert || 'none';
  document.getElementById('taskShowReminderInTimeline').checked = !!task.showReminderInTimeline;
  document.getElementById('newTaskUrl').value = task.url || '';
  document.getElementById('newTaskNotes').value = task.notes || '';
  updateIconSuggestions();

  const [sH, sM] = task.start.split(':').map(Number);
  const [eH, eM] = task.end.split(':').map(Number);
  miniStartMins = sH * 60 + sM;
  miniEndMins = eH * 60 + eM;

  document.querySelectorAll('.color-swatch').forEach(el => { if (el.getAttribute('style').includes(task.color)) selectTaskColor(task.color, el); });
  document.querySelectorAll('.icon-option').forEach(el => { if (el.dataset.icon === resolveIconId(task.icon)) selectTaskIcon(el.dataset.icon, el); });
  updateMiniClock();
}

function selectTaskColor(color, el) {
  selectedTaskColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  updateMiniClock();
}
function selectTaskIcon(icon, el) {
  selectedTaskIcon = resolveIconId(icon);
  document.querySelectorAll('.icon-option').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

function updateIconSuggestions() {
  const nameInput = document.getElementById('newTaskName');
  const row = document.getElementById('iconSuggestRow');
  if (!nameInput || !row) return;
  const text = nameInput.value.toLowerCase().trim();
  if (!text) { row.style.display = 'none'; row.innerHTML = ''; return; }
  const matches = [];
  Object.entries(ICON_KEYWORDS).forEach(([id, words]) => {
    if (matches.includes(id)) return;
    if (words.some(w => text.includes(w))) matches.push(id);
  });
  if (matches.length === 0) { row.style.display = 'none'; row.innerHTML = ''; return; }
  row.style.display = 'flex';
  const label = `<span class="icon-suggest-label">${lang === 'en' ? 'Suggested:' : 'مقترح:'}</span>`;
  const chips = matches.slice(0, 6).map(id => `<div class="icon-suggest-chip" onclick="applySuggestedIcon('${id}')" title="${id}">${svgIcon(ICON_LIBRARY[id].symbol)}</div>`).join('');
  row.innerHTML = label + chips;
}

function applySuggestedIcon(id) {
  const optionEl = document.querySelector(`.icon-option[data-icon="${id}"]`);
  if (optionEl) {
    selectTaskIcon(id, optionEl);
    optionEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function taskOccursOnDate(task, dateObj) {
  if (task.isRoutine) return Array.isArray(task.days) && task.days.includes(dateObj.getDay());
  const dateISO = (new Date(dateObj - dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const repeat = task.repeat || (task.recurring ? 'daily' : 'none');
  if (repeat === 'none') {
    if (task.endDate && task.endDate >= task.date) return dateISO >= task.date && dateISO <= task.endDate;
    return task.date === dateISO;
  }
  if (repeat === 'daily') return true;
  if (!task.date) return false;
  const anchor = new Date(task.date + 'T00:00:00');
  if (repeat === 'weekly') return anchor.getDay() === dateObj.getDay();
  if (repeat === 'monthly') return anchor.getDate() === dateObj.getDate();
  if (repeat === 'yearly') return anchor.getMonth() === dateObj.getMonth() && anchor.getDate() === dateObj.getDate();
  return false;
}

let selectedRoutineDays = [];

function updateModalFieldVisibility() {
  const isRoutine = document.getElementById('taskIsRoutine').checked;
  const isAllDay = document.getElementById('taskAllDay').checked;
  document.getElementById('dateFieldsBlock').style.display = isRoutine ? 'none' : 'block';
  document.getElementById('routineDaysBlock').style.display = isRoutine ? 'block' : 'none';
  document.getElementById('allDayFieldRow').style.display = isRoutine ? 'none' : 'flex';
  document.getElementById('repeatFieldBlock').style.display = isRoutine ? 'none' : 'block';
  document.getElementById('miniClockContainer').style.display = (isAllDay && !isRoutine) ? 'none' : 'flex';
}

function handleAllDayToggle() {
  updateModalFieldVisibility();
}

function handleRoutineToggle() {
  if (document.getElementById('taskIsRoutine').checked) document.getElementById('taskAllDay').checked = false;
  updateModalFieldVisibility();
}

function toggleRoutineDay(day, el) {
  const idx = selectedRoutineDays.indexOf(day);
  if (idx >= 0) { selectedRoutineDays.splice(idx, 1); el.classList.remove('active'); }
  else { selectedRoutineDays.push(day); el.classList.add('active'); }
}

function populateTimezoneSelect() {
  const sel = document.getElementById('newTaskTimezone');
  if (!sel) return;
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = browserTz && !TIMEZONE_LIST.includes(browserTz) ? [browserTz, ...TIMEZONE_LIST] : TIMEZONE_LIST;
  sel.innerHTML = '';
  zones.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz;
    opt.textContent = tz.split('/').pop().replace('_', ' ') + (tz === browserTz ? ' (Local)' : '');
    sel.appendChild(opt);
  });
  sel.value = browserTz && zones.includes(browserTz) ? browserTz : zones[0];
}

function format12H(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60).toString().padStart(2, '0');
  let h12 = h % 12 || 12;
  const ampm = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
  return toNum(`${h12}:${m} ${ampm}`);
}

function updateMiniClock() {
  document.getElementById('miniTimeStart').textContent = format12H(miniStartMins);
  document.getElementById('miniTimeEnd').textContent = format12H(miniEndMins);
  const sAng = (miniStartMins / 1440) * 360;
  const eAng = (miniEndMins / 1440) * 360;
  const sPos = polarToCartesian(mcx, mcy, mr, sAng);
  const ePos = polarToCartesian(mcx, mcy, mr, eAng);
  document.getElementById('miniStartH').setAttribute('cx', sPos.x);
  document.getElementById('miniStartH').setAttribute('cy', sPos.y);
  document.getElementById('miniEndH').setAttribute('cx', ePos.x);
  document.getElementById('miniEndH').setAttribute('cy', ePos.y);
  let endA = eAng;
  if (endA < sAng) endA += 360;
  document.getElementById('miniArc').setAttribute('d', describeArc(mcx, mcy, mr, sAng, endA));
  document.getElementById('miniArc').setAttribute('stroke', selectedTaskColor);
}

const miniSvg = document.getElementById('miniClock');
miniSvg.addEventListener('mousedown', e => {
  if (e.target.id === 'miniStartH') miniDragging = 'start';
  else if (e.target.id === 'miniEndH') miniDragging = 'end';
});
window.addEventListener('mousemove', e => {
  if (!miniDragging) return;
  e.preventDefault();
  const rect = miniSvg.getBoundingClientRect();
  const x = e.clientX - rect.left - mcx, y = e.clientY - rect.top - mcy;
  let ang = Math.atan2(y, x) * (180 / Math.PI) + 90;
  if (ang < 0) ang += 360;
  let mins = Math.round((ang / 360) * 1440 / 15) * 15;
  if (mins === 1440) mins = 0;
  if (miniDragging === 'start') miniStartMins = mins; else miniEndMins = mins;
  updateMiniClock();
});
window.addEventListener('mouseup', () => miniDragging = null);

async function saveScheduledTask() {
  const name = document.getElementById('newTaskName').value;
  const isRoutine = document.getElementById('taskIsRoutine').checked;
  const dateVal = document.getElementById('newTaskDate').value;
  if (!name || (!isRoutine && !dateVal)) { await customAlert(lang === 'en' ? "Please fill name and date." : "الرجاء تعبئة الاسم والتاريخ.", lang === 'en' ? 'Missing Info' : 'معلومات ناقصة'); return; }
  if (isRoutine && selectedRoutineDays.length === 0) { await customAlert(lang === 'en' ? "Please select at least one day." : "الرجاء اختيار يوم واحد على الأقل.", lang === 'en' ? 'Missing Info' : 'معلومات ناقصة'); return; }

  const location = document.getElementById('newTaskLocation').value;
  const endDateVal = document.getElementById('newTaskEndDate').value || dateVal;
  const isAllDay = !isRoutine && document.getElementById('taskAllDay').checked;
  const timezone = document.getElementById('newTaskTimezone').value;
  const repeat = isRoutine ? 'none' : document.getElementById('newTaskRepeat').value;
  const alertValue = document.getElementById('newTaskAlert').value;
  const showReminderInTimeline = document.getElementById('taskShowReminderInTimeline').checked;
  const url = document.getElementById('newTaskUrl').value;
  const notes = document.getElementById('newTaskNotes').value;

  const sH = isAllDay ? '00' : Math.floor(miniStartMins / 60).toString().padStart(2, '0');
  const sM = isAllDay ? '00' : Math.floor(miniStartMins % 60).toString().padStart(2, '0');
  const eH = isAllDay ? '23' : Math.floor(miniEndMins / 60).toString().padStart(2, '0');
  const eM = isAllDay ? '59' : Math.floor(miniEndMins % 60).toString().padStart(2, '0');

  const taskData = {
    id: editingTaskId || Date.now(),
    name, location, allDay: isAllDay,
    isRoutine, days: isRoutine ? [...selectedRoutineDays].sort() : undefined,
    date: isRoutine ? undefined : dateVal, endDate: isRoutine ? undefined : endDateVal,
    start: `${sH}:${sM}`, end: `${eH}:${eM}`,
    timezone, repeat, alert: alertValue, showReminderInTimeline,
    color: selectedTaskColor, icon: selectedTaskIcon,
    url, notes
  };
  if (editingTaskId) scheduledTasks = scheduledTasks.map(t => t.id === editingTaskId ? taskData : t);
  else scheduledTasks.push(taskData);

  localStorage.setItem('idleTasksV4', JSON.stringify(scheduledTasks));
  closeTaskModal();
  renderTimetable();
  renderV3UI();
}

async function deleteCurrentTask() {
  if (!editingTaskId) return;
  const ok = await customConfirm(lang === 'en' ? "Delete this task?" : "حذف هذه المهمة؟", lang === 'en' ? 'Delete Task' : 'حذف المهمة', true);
  if (ok) {
    scheduledTasks = scheduledTasks.filter(t => t.id !== editingTaskId);
    localStorage.setItem('idleTasksV4', JSON.stringify(scheduledTasks));
    closeTaskModal();
    renderTimetable();
    renderV3UI();
  }
}

function addDailyGoal() {
  const name = document.getElementById('newGoalName').value;
  if (!name) return;
  dailyGoals.push({ id: Date.now(), name, completed: false });
  localStorage.setItem('idleGoals', JSON.stringify(dailyGoals));
  document.getElementById('newGoalName').value = '';
  renderV3UI();
}
function toggleGoal(id) {
  const goal = dailyGoals.find(g => g.id === id);
  if (goal) {
    goal.completed = !goal.completed;
    localStorage.setItem('idleGoals', JSON.stringify(dailyGoals));
    renderV3UI();
  }
}

/* ==========================================
   8. UI RENDERERS & TIMELINE HUD
   ========================================== */
function renderV3UI() {
  const sb = document.getElementById('horizonScoreboard');
  if (sb) {
    sb.innerHTML = '';
    dailyGoals.forEach(g => {
      sb.innerHTML += `<div class="goal-pill ${g.completed ? 'completed' : ''}" onclick="toggleGoal(${g.id})"><div class="indicator"></div>${escapeHTML(g.name)}</div>`;
    });
  }
  renderTaskArcs();
  renderTimelineSegments();
  renderTimelineReminders();
}

function renderTimelineReminders() {
  const tape = document.getElementById('timelineTape');
  if (!tape) return;
  document.querySelectorAll('.timeline-reminder-marker').forEach(e => e.remove());
  const today = new Date();
  const todayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, today) && t.showReminderInTimeline && t.alert && ALERT_MINUTES[t.alert] !== undefined);
  todayTasks.forEach(t => {
    const [sH, sM] = t.start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const reminderMins = startMins - ALERT_MINUTES[t.alert];
    if (reminderMins < 0) return;
    const marker = document.createElement('div');
    marker.className = 'timeline-reminder-marker';
    marker.style.left = (reminderMins * 3) + 'px';
    marker.innerHTML = svgIcon('icon-bell');
    marker.title = `${t.name} reminder — ${format12H(reminderMins)}`;
    tape.appendChild(marker);
  });
}

let lastReminderCheckMinute = -1;
let firedReminders = new Set();
function checkReminders(now) {
  const currentMins = now.getHours() * 60 + now.getMinutes();
  if (currentMins === lastReminderCheckMinute) return;
  lastReminderCheckMinute = currentMins;
  const todayISO = (new Date(now - now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const dueTasks = scheduledTasks.filter(t => taskOccursOnDate(t, now) && t.alert && ALERT_MINUTES[t.alert] !== undefined);
  dueTasks.forEach(t => {
    const [sH, sM] = t.start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const reminderMins = startMins - ALERT_MINUTES[t.alert];
    if (reminderMins < 0) return;
    const fireKey = `${t.id}-${todayISO}`;
    if (currentMins === reminderMins && !firedReminders.has(fireKey)) {
      firedReminders.add(fireKey);
      fireReminderAlert(t);
    }
  });
}

function fireReminderAlert(task) {
  playChime();
  showReminderToast(task);
  if (window.Notification && Notification.permission === 'granted') {
    try { new Notification(task.name, { body: lang === 'en' ? 'Starting soon' : 'يبدأ قريباً' }); } catch (e) {}
  }
}

function showReminderToast(task) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--row-color', task.color || currentTheme.handle);
  toast.innerHTML = `${svgIcon('icon-bell')}<div><div class="toast-title">${escapeHTML(task.name)}</div><div class="toast-sub">${lang === 'en' ? 'Starting soon' : 'يبدأ قريباً'}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}

function makeTaskArcPath(r, startMins, endMins, color, opacity) {
  const sAng = minsToAngle(startMins);
  let eAng = minsToAngle(endMins);
  if (eAng <= sAng) eAng += 360;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", describeArc(cx, cy, r, sAng, eAng));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "6");
  path.setAttribute("stroke-linecap", "round");
  path.style.opacity = opacity;
  path.style.cursor = "pointer";
  return path;
}

function addTaskArcTitle(el, t, startMins, endMinsRaw) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  let text = `${ICON_LIBRARY[resolveIconId(t.icon)].legacy} ${t.name} (${format12H(startMins)} - ${format12H(endMinsRaw)})`;
  if (t.location) text += ` @ ${t.location}`;
  title.textContent = text;
  el.appendChild(title);
}

function renderTaskArcs() {
  const grp = document.getElementById('scheduleArcsGroup');
  if (!grp) return;
  grp.innerHTML = '';
  const today = new Date();
  const nowIsAM = today.getHours() < 12;
  const todayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, today)).map(t => {
    const [sH, sM] = t.start.split(':').map(Number);
    const [eH, eM] = t.end.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMinsRaw = eH * 60 + eM;
    let endMins = endMinsRaw;
    if (endMins <= startMins) endMins += 1440;
    return { task: t, startMins, endMins, endMinsRaw, isAM: sH < 12 };
  });

  if (arcStyleMode === 'dualtrack') {
    const amR = DUAL_TRACK_AM_R, pmR = DUAL_TRACK_PM_R;
    const gapDeg = 9;
    const svgNS = "http://www.w3.org/2000/svg";

    const amRing = document.createElementNS(svgNS, "path");
    amRing.setAttribute("d", describeArc(cx, cy, amR, gapDeg, 360 - gapDeg));
    amRing.setAttribute("fill", "none");
    amRing.setAttribute("stroke", DUAL_TRACK_AM_COLOR);
    amRing.setAttribute("stroke-width", "2.5");
    amRing.style.opacity = "0.45";
    grp.appendChild(amRing);

    const pmRing = document.createElementNS(svgNS, "path");
    pmRing.setAttribute("d", describeArc(cx, cy, pmR, gapDeg, 360 - gapDeg));
    pmRing.setAttribute("fill", "none");
    pmRing.setAttribute("stroke", DUAL_TRACK_PM_COLOR);
    pmRing.setAttribute("stroke-width", "2.5");
    pmRing.style.opacity = "0.45";
    grp.appendChild(pmRing);

    const outerLeft = polarToCartesian(cx, cy, pmR, -gapDeg);
    const outerRight = polarToCartesian(cx, cy, pmR, gapDeg);
    const innerLeft = polarToCartesian(cx, cy, amR, -gapDeg);
    const innerRight = polarToCartesian(cx, cy, amR, gapDeg);
    const crossPeakY = Math.min(outerLeft.y, outerRight.y, innerLeft.y, innerRight.y) - 5;

    const cross1 = document.createElementNS(svgNS, "path");
    cross1.setAttribute("d", `M ${outerLeft.x} ${outerLeft.y} Q ${cx} ${crossPeakY} ${innerRight.x} ${innerRight.y}`);
    cross1.setAttribute("fill", "none");
    cross1.setAttribute("stroke", "var(--text-secondary)");
    cross1.setAttribute("stroke-width", "2");
    cross1.setAttribute("stroke-linecap", "round");
    cross1.style.opacity = "0.7";
    grp.appendChild(cross1);

    const cross2 = document.createElementNS(svgNS, "path");
    cross2.setAttribute("d", `M ${outerRight.x} ${outerRight.y} Q ${cx} ${crossPeakY} ${innerLeft.x} ${innerLeft.y}`);
    cross2.setAttribute("fill", "none");
    cross2.setAttribute("stroke", "var(--text-secondary)");
    cross2.setAttribute("stroke-width", "2");
    cross2.setAttribute("stroke-linecap", "round");
    cross2.style.opacity = "0.7";
    grp.appendChild(cross2);

    const amLabelPos = polarToCartesian(cx, cy, amR, 180);
    const amLabel = document.createElementNS(svgNS, "text");
    amLabel.setAttribute("x", amLabelPos.x);
    amLabel.setAttribute("y", amLabelPos.y + 3);
    amLabel.setAttribute("text-anchor", "middle");
    amLabel.setAttribute("font-size", "9");
    amLabel.setAttribute("font-weight", "bold");
    amLabel.setAttribute("fill", DUAL_TRACK_AM_COLOR);
    amLabel.style.opacity = "0.9";
    amLabel.textContent = lang === 'en' ? 'AM' : 'ص';
    grp.appendChild(amLabel);

    const pmLabelPos = polarToCartesian(cx, cy, pmR, 180);
    const pmLabel = document.createElementNS(svgNS, "text");
    pmLabel.setAttribute("x", pmLabelPos.x);
    pmLabel.setAttribute("y", pmLabelPos.y + 3);
    pmLabel.setAttribute("text-anchor", "middle");
    pmLabel.setAttribute("font-size", "9");
    pmLabel.setAttribute("font-weight", "bold");
    pmLabel.setAttribute("fill", DUAL_TRACK_PM_COLOR);
    pmLabel.style.opacity = "0.9";
    pmLabel.textContent = lang === 'en' ? 'PM' : 'م';
    grp.appendChild(pmLabel);

    ['am', 'pm'].forEach(period => {
      const group = todayTasks.filter(x => (period === 'am') === x.isAM);
      const r = period === 'am' ? amR : pmR;
      group.forEach(({ task, startMins, endMins, endMinsRaw }) => {
        const path = makeTaskArcPath(r, startMins, endMins, task.color, 0.8);
        addTaskArcTitle(path, task, startMins, endMinsRaw);
        grp.appendChild(path);
      });
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          const overlapStart = Math.max(a.startMins, b.startMins);
          const overlapEnd = Math.min(a.endMins, b.endMins);
          if (overlapEnd - overlapStart >= 1) {
            const blended = `color-mix(in srgb, ${a.task.color} 50%, ${b.task.color} 50%)`;
            const path = makeTaskArcPath(r, overlapStart, overlapEnd, blended, 1);
            path.style.filter = 'drop-shadow(0 0 4px rgba(255,255,255,0.5))';
            grp.appendChild(path);
          }
        }
      }
    });
  } else if (arcStyleMode === 'dimmed') {
    todayTasks.forEach(({ task, startMins, endMins, endMinsRaw, isAM }) => {
      const opacity = isAM === nowIsAM ? 0.9 : 0.25;
      const path = makeTaskArcPath(radius + 8, startMins, endMins, task.color, opacity);
      addTaskArcTitle(path, task, startMins, endMinsRaw);
      grp.appendChild(path);
    });
  } else if (arcStyleMode === 'daynight') {
    todayTasks.forEach(({ task, startMins, endMins, endMinsRaw, isAM }) => {
      const path = makeTaskArcPath(radius + 8, startMins, endMins, task.color, 0.8);
      addTaskArcTitle(path, task, startMins, endMinsRaw);
      grp.appendChild(path);

      const midAng = minsToAngle((startMins + endMins) / 2);
      const pos = polarToCartesian(cx, cy, radius + 8, midAng);
      const badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      badge.setAttribute("cx", pos.x); badge.setAttribute("cy", pos.y); badge.setAttribute("r", "8");
      badge.setAttribute("fill", "var(--bg-color-panel)");
      badge.setAttribute("stroke", task.color);
      badge.setAttribute("stroke-width", "1.5");
      grp.appendChild(badge);
      const iconUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
      iconUse.setAttribute("href", isAM ? "#icon-sun" : "#icon-moon");
      iconUse.setAttribute("x", pos.x - 6); iconUse.setAttribute("y", pos.y - 6);
      iconUse.setAttribute("width", "12"); iconUse.setAttribute("height", "12");
      iconUse.style.color = task.color;
      iconUse.style.pointerEvents = "none";
      grp.appendChild(iconUse);
    });
  } else {
    todayTasks.forEach(({ task, startMins, endMins, endMinsRaw }) => {
      const path = makeTaskArcPath(radius + 8, startMins, endMins, task.color, 0.8);
      addTaskArcTitle(path, task, startMins, endMinsRaw);
      grp.appendChild(path);
    });
  }
}

function initTimeline() {
  const tape = document.getElementById('timelineTape');
  if (!tape) return;
  Array.from(tape.children).forEach(c => { if (!c.classList.contains('timeline-core-line')) c.remove(); });
  for (let h = 0; h <= 24; h++) {
    const min = h * 60;
    const x = min * 3;
    const dot = document.createElement('div');
    dot.className = 'timeline-dot';
    dot.style.left = x + 'px';
    tape.appendChild(dot);
    if (h < 24) {
      let h12 = h % 12 || 12;
      let ampm = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
      const lbl = document.createElement('div');
      lbl.className = 'timeline-label';
      lbl.style.left = x + 'px';
      lbl.textContent = toNum(`${h12} ${ampm}`);
      tape.appendChild(lbl);
    }
  }
}

function updateTimelineHUD() {
  const tape = document.getElementById('timelineTape');
  const reticle = document.getElementById('timelineReticleText');
  if (!tape || !reticle) return;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
  const offset = (window.innerWidth / 2) - (currentMins * 3);
  tape.style.transform = `translateX(${offset}px)`;
  let h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  let h12 = h % 12 || 12;
  const ampm = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
  reticle.textContent = toNum(`${h12}:${m} ${ampm}`);
}

function renderTimelineSegments() {
  const tape = document.getElementById('timelineTape');
  if (!tape) return;
  document.querySelectorAll('.timeline-segment').forEach(e => e.remove());
  const today = new Date();
  const todayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, today));
  todayTasks.forEach(t => {
    const [sH, sM] = t.start.split(':').map(Number);
    const [eH, eM] = t.end.split(':').map(Number);
    const startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;
    if (endMins < startMins) endMins += 1440;
    const w = Math.max((endMins - startMins) * 3, 10);
    const x = startMins * 3;
    const segment = document.createElement('div');
    segment.className = 'timeline-segment';
    segment.style.left = x + 'px';
    segment.style.width = w + 'px';
    segment.style.background = t.color;
    segment.style.color = t.color;
    segment.style.zIndex = "90";
    segment.setAttribute("title", `${t.name} (${format12H(startMins)} - ${format12H(endMins)})`);
    const lbl = document.createElement('div');
    lbl.className = 'timeline-segment-label';
    lbl.innerHTML = iconSVG(t.icon);
    segment.appendChild(lbl);
    tape.appendChild(segment);
  });
}

// TOGGLES
function toggleWidgetExpand(widgetId, e) {
  if (e) e.stopPropagation();
  const card = document.getElementById(widgetId);
  if (!card) return;
  card.classList.toggle('expanded');
}
function toggleWidget(widgetId, btnEl) {
  const widget = document.getElementById(widgetId);
  if (widget) {
    if (widget.style.display === "none" || widget.style.opacity === "0") {
      widget.style.display = "flex";
      widget.style.opacity = "1";
      btnEl.classList.add("active-lang");
    } else {
      widget.style.display = "none";
      widget.style.opacity = "0";
      btnEl.classList.remove("active-lang");
    }
  }
}
function toggleClockElement(elementClassOrId, btnEl) {
  const element = document.querySelector(`.${elementClassOrId}`) || document.getElementById(elementClassOrId);
  if (element) {
    if (element.style.display === "none") {
      element.style.display = "block";
      btnEl.classList.add("active-lang");
    } else {
      element.style.display = "none";
      btnEl.classList.remove("active-lang");
    }
  }
}
function setClockFace(faceType, btnEl) {
  document.querySelectorAll('#clockFaceGrid .clock-toggle-btn').forEach(btn => btn.classList.remove('active-lang'));
  btnEl.classList.add('active-lang');
  document.querySelectorAll('.clock-face-classic, .clock-face-radar, .clock-face-numbers').forEach(el => {
    el.style.display = 'none';
    el.style.opacity = '0';
  });
  if (faceType === 'default') {
    document.querySelector('.clock-face-numbers').style.display = 'block';
    document.querySelector('.clock-face-numbers').style.opacity = '1';
  } else if (faceType === 'classic') {
    document.querySelector('.clock-face-classic').style.display = 'block';
    document.querySelector('.clock-face-classic').style.opacity = '1';
  } else if (faceType === 'radar') {
    document.querySelector('.clock-face-radar').style.display = 'block';
    document.querySelector('.clock-face-radar').style.opacity = '0.1';
  }
}

function setArcStyle(mode, btnEl) {
  arcStyleMode = mode;
  localStorage.setItem('arcStyleMode', mode);
  document.querySelectorAll('#arcStyleGrid .clock-toggle-btn').forEach(b => b.classList.remove('active-lang'));
  btnEl.classList.add('active-lang');
  renderTaskArcs();
}

function applyTheme(themeObj) {
  currentTheme = themeObj;
  localStorage.setItem('idleTheme', themeObj.name);
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
  const dot = document.querySelector(`.theme-dot[data-key="${themeObj.name}"]`);
  if (dot) dot.classList.add('active');
  document.documentElement.style.setProperty('--accent', currentTheme.handle);
  if (document.getElementById('gradStart')) {
    document.getElementById('gradStart').setAttribute('stop-color', currentTheme.start);
    document.getElementById('gradEnd').setAttribute('stop-color', currentTheme.end);
    document.getElementById('endHandle').setAttribute('fill', currentTheme.handle);
    document.getElementById('ambientGlow').style.background = `radial-gradient(circle at center, ${currentTheme.handle} 0%, transparent 80%)`;
    document.getElementById('starLayer').style.setProperty('--star-color', currentTheme.handle);
  }
}

function toggleLang() {
  setLanguage(lang === 'en' ? 'ar' : 'en');
}
function setLanguage(selectedLang) {
  lang = selectedLang;
  localStorage.setItem('idleLang', lang);
  document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  const langBg = document.getElementById('langSliderBg');
  if (lang === 'ar') {
    langBg.classList.add('slide-second');
    document.getElementById('langArOpt').classList.add('active');
    document.getElementById('langEnOpt').classList.remove('active');
  } else {
    langBg.classList.remove('slide-second');
    document.getElementById('langEnOpt').classList.add('active');
    document.getElementById('langArOpt').classList.remove('active');
  }
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[lang][key]) el.setAttribute('title', translations[lang][key]);
  });
  const calTypeBtn = document.getElementById('calTypeBtn');
  if (calTypeBtn) calTypeBtn.textContent = isHijri ? translations[lang].hijri : translations[lang].gregorian;
  refreshDayBubbleLetters();
  if (document.getElementById('taskModal').classList.contains('active')) {
    document.getElementById('modalHeaderTitle').textContent = editingTaskId ? translations[lang].editEvent : translations[lang].newEvent;
  }
  renderQuickActions();
  if (nextPrayer) updatePrayerUI();
  updateLiveTimer();
  renderV3UI();
  initTimeline();
  updateTimelineHUD();
  updateWorldClock();
  renderTimetable();
  if (document.getElementById('scheduleManagerModal').classList.contains('active')) renderScheduleManager();
}

function refreshDayBubbleLetters() {
  const abbr = lang === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  document.querySelectorAll('#routineDayPicker .day-bubble').forEach(b => {
    b.textContent = abbr[parseInt(b.dataset.day, 10)];
  });
}

function toggleMode() {
  setMode(currentMode === 'dark' ? 'light' : 'dark');
}
function setMode(mode) {
  currentMode = mode;
  localStorage.setItem('idleMode', mode);
  const modeBg = document.getElementById('modeSliderBg');
  if (mode === 'light') {
    document.body.classList.add('light-mode');
    modeBg.classList.add('slide-second');
    document.getElementById('modeLightOpt').classList.add('active');
    document.getElementById('modeDarkOpt').classList.remove('active');
  } else {
    document.body.classList.remove('light-mode');
    modeBg.classList.remove('slide-second');
    document.getElementById('modeDarkOpt').classList.add('active');
    document.getElementById('modeLightOpt').classList.remove('active');
  }
}

function renderQuickActions() {
  const tmGrid = document.getElementById('timersGrid');
  if (!tmGrid) return;
  tmGrid.innerHTML = '';
  const hLabel = lang === 'en' ? 'h' : 'س';
  const mLabel = lang === 'en' ? 'm' : 'د';
  quickTimers.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = m >= 60 ? (m % 60 === 0 ? toNum(m / 60) + hLabel : toNum((m / 60).toFixed(1)) + hLabel) : toNum(m) + mLabel;
    btn.onclick = () => {
      originalDurationMs = m * 60000;
      timerDurationMs = originalDurationMs;
      rawTimerDurationMs = originalDurationMs;
      timerEndTime = Date.now() + timerDurationMs;
      isTimerRunning = true;
      mainClockContainer.classList.add('timer-active');
      updateLiveTimer();
    };
    tmGrid.appendChild(btn);
  });
}

/* ==========================================
   9. TIMETABLE ENGINE (V4.5)
   ========================================== */
function openTimetable() {
  document.getElementById("timetableModal").classList.add("active");
  renderTimetable();
}
function closeTimetable() {
  document.getElementById("timetableModal").classList.remove("active");
}
function toggleCalendarType() {
  isHijri = !isHijri;
  document.getElementById("calTypeBtn").textContent = isHijri ? translations[lang].hijri : translations[lang].gregorian;
  renderTimetable();
}
function changeWeek(offset) {
  currentDateView.setDate(currentDateView.getDate() + (offset * 7));
  renderTimetable();
}
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function renderTimetable() {
  const grid = document.getElementById("timetableGrid");
  if (!grid) return;
  grid.innerHTML = '';
  const startOfWeek = getStartOfWeek(currentDateView);
  const monthNames = lang === 'en'
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  document.getElementById("ttMonthYear").textContent = monthNames[startOfWeek.getMonth()] + " " + startOfWeek.getFullYear();
  const timeCol = document.createElement("div");
  timeCol.className = "tt-time-col";
  const emptyHeader = document.createElement("div");
  emptyHeader.className = "tt-col-header";
  emptyHeader.style.height = "71px";
  timeCol.appendChild(emptyHeader);

  for (let h = 0; h < 24; h++) {
    const tCell = document.createElement("div");
    tCell.className = "tt-time-label";
    let h12 = h % 12 || 12;
    let ampm = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
    if (h > 0) {
      const span = document.createElement("span");
      span.textContent = toNum(`${h12} ${ampm}`);
      tCell.appendChild(span);
    }
    timeCol.appendChild(tCell);
  }
  grid.appendChild(timeCol);

  const dayNamesEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayNamesAr = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const colDate = new Date(startOfWeek);
    colDate.setDate(colDate.getDate() + i);
    const col = document.createElement("div");
    col.className = "tt-day-col";
    const header = document.createElement("div");
    header.className = "tt-col-header";
    const isToday = colDate.toDateString() === today.toDateString();
    if (isToday) header.classList.add("today");
    let dateNumStr = colDate.getDate();
    if (isHijri) { dateNumStr = new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric' }).format(colDate); }
    header.innerHTML = `<span>${lang === 'en' ? dayNamesEn[i] : dayNamesAr[i]}</span><span class="date-num">${toNum(dateNumStr)}</span>`;
    col.appendChild(header);

    for (let h = 0; h < 24; h++) {
      const cell = document.createElement("div");
      cell.className = "tt-cell";
      cell.onclick = () => openTaskModalForDate(colDate, h * 60, (h + 1) * 60);
      col.appendChild(cell);
    }
    const dayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, colDate));

    dayTasks.forEach(task => {
      const [sH, sM] = task.start.split(':').map(Number);
      const [eH, eM] = task.end.split(':').map(Number);
      const startMins = sH * 60 + sM;
      let endMins = eH * 60 + eM;
      if (endMins <= startMins) endMins += 1440;
      const topPx = (startMins / 60) * 60 + 71;
      const heightPx = ((endMins - startMins) / 60) * 60;
      const block = document.createElement("div");
      block.className = "tt-task-block";
      block.style.top = topPx + "px";
      block.style.height = heightPx + "px";
      block.style.background = task.color;
      let timeStr = format12H(startMins) + " - " + format12H(endMins);
      const repeats = (task.repeat && task.repeat !== 'none') || task.recurring;
      block.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><span class="tt-task-icon">${iconSVG(task.icon)}</span><span style="font-size:0.65rem; opacity:0.8;">${timeStr}</span></div><div>${escapeHTML(task.name)} ${repeats ? svgIcon('icon-repeat', 'tt-repeat-icon') : ''}</div>`;
      block.ondblclick = (e) => { e.stopPropagation(); editTask(task.id); };
      col.appendChild(block);
    });

    if (isToday) {
      const curMins = today.getHours() * 60 + today.getMinutes();
      const curTopPx = (curMins / 60) * 60 + 71;
      const timeLine = document.createElement("div");
      timeLine.className = "current-time-line";
      timeLine.style.top = curTopPx + "px";
      const timeDot = document.createElement("div");
      timeDot.className = "current-time-dot";
      timeLine.appendChild(timeDot);
      col.appendChild(timeLine);
    }
    grid.appendChild(col);
  }
  updateCalendarWidget();
}

function updateCalendarWidget() {
  const today = new Date();
  if (document.getElementById("widgetDateNum")) document.getElementById("widgetDateNum").textContent = toNum(today.getDate());
  const dayNames = lang === 'en'
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  if (document.getElementById("widgetDayName")) document.getElementById("widgetDayName").textContent = dayNames[today.getDay()];
  const todayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, today));
  const currentMins = today.getHours() * 60 + today.getMinutes();
  let nextTask = null;
  for (let t of todayTasks) {
    const [sH, sM] = t.start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    if (startMins >= currentMins) {
      if (!nextTask || startMins < (nextTask.start.split(':')[0] * 60 + Number(nextTask.start.split(':')[1]))) {
        nextTask = t;
      }
    }
  }
  const nextTaskEl = document.getElementById("widgetNextTask");
  if (nextTaskEl) {
    if (nextTask) nextTaskEl.textContent = `${ICON_LIBRARY[resolveIconId(nextTask.icon)].legacy} ${nextTask.name} at ${format12H(nextTask.start.split(':')[0] * 60 + Number(nextTask.start.split(':')[1]))}`;
    else nextTaskEl.textContent = lang === 'en' ? "No upcoming tasks today" : "لا يوجد مهام قادمة اليوم";
  }
  renderScheduleExpandedList();
}

function renderScheduleExpandedList() {
  const container = document.getElementById('widgetScheduleList');
  if (!container) return;
  const today = new Date();
  const currentMins = today.getHours() * 60 + today.getMinutes();
  const remainingTasks = scheduledTasks
    .filter(t => taskOccursOnDate(t, today))
    .map(t => { const [sH, sM] = t.start.split(':').map(Number); return { task: t, startMins: sH * 60 + sM }; })
    .filter(t => t.startMins >= currentMins)
    .sort((a, b) => a.startMins - b.startMins);

  container.innerHTML = '';
  if (remainingTasks.length === 0) {
    container.innerHTML = `<div class="widget-task-empty">${lang === 'en' ? 'No remaining tasks today' : 'لا يوجد مهام متبقية اليوم'}</div>`;
    return;
  }
  remainingTasks.forEach(({ task, startMins }) => {
    const row = document.createElement('div');
    row.className = 'widget-task-row';
    row.style.setProperty('--row-color', task.color);
    row.onclick = (e) => { e.stopPropagation(); editTask(task.id); };
    row.innerHTML = `<span class="wt-icon">${iconSVG(task.icon)}</span><span class="wt-name">${escapeHTML(task.name)}</span><span class="wt-time">${format12H(startMins)}</span>`;
    container.appendChild(row);
  });
}

/* ==========================================
   9b. SCHEDULE MANAGER
   ========================================== */
function openScheduleManager() {
  document.getElementById("scheduleManagerModal").classList.add("active");
  renderScheduleManager();
}
function closeScheduleManager() {
  document.getElementById("scheduleManagerModal").classList.remove("active");
}

function renderScheduleManager() {
  const container = document.getElementById('scheduleManagerList');
  if (!container) return;
  container.innerHTML = '';
  const dayAbbr = lang === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  const buildSection = (title, items, renderRow) => {
    const heading = document.createElement('div');
    heading.className = 'sm-section-title';
    heading.textContent = title;
    container.appendChild(heading);
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sm-empty';
      empty.textContent = lang === 'en' ? 'None yet' : 'لا يوجد';
      container.appendChild(empty);
      return;
    }
    items.forEach(item => container.appendChild(renderRow(item)));
  };

  const buildTaskRow = (task) => {
    const row = document.createElement('div');
    row.className = 'sm-item';
    row.style.setProperty('--row-color', task.color || currentTheme.handle);
    if (task.notes) row.title = task.notes;
    const [sH, sM] = task.start.split(':').map(Number);
    const [eH, eM] = task.end.split(':').map(Number);
    let detail;
    if (task.isRoutine) {
      const days = (task.days || []).slice().sort().map(d => dayAbbr[d]).join(' ');
      detail = `${days || '—'} • ${format12H(sH * 60 + sM)} - ${format12H(eH * 60 + eM)}`;
    } else {
      const dateLabel = task.endDate && task.endDate !== task.date ? `${task.date} → ${task.endDate}` : task.date;
      detail = task.allDay ? `${dateLabel} • ${lang === 'en' ? 'All day' : 'طوال اليوم'}` : `${dateLabel} • ${format12H(sH * 60 + sM)} - ${format12H(eH * 60 + eM)}`;
    }
    if (task.location) detail += ` • ${escapeHTML(task.location)}`;
    const urlBtn = task.url ? `<a class="sm-btn" href="${escapeHTML(task.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${svgIcon('icon-link')}</a>` : '';
    row.innerHTML = `
      <span class="sm-item-icon">${iconSVG(task.icon)}</span>
      <div class="sm-item-info">
        <div class="sm-item-name">${escapeHTML(task.name)}</div>
        <div class="sm-item-detail">${detail}</div>
      </div>
      <div class="sm-item-actions">
        ${urlBtn}
        <button class="sm-btn" onclick="closeScheduleManager(); editTask(${task.id})">${lang === 'en' ? 'Edit' : 'تعديل'}</button>
        <button class="sm-btn delete" onclick="deleteScheduleItem(${task.id})">${lang === 'en' ? 'Delete' : 'حذف'}</button>
      </div>`;
    return row;
  };

  const buildGoalRow = (goal) => {
    const row = document.createElement('div');
    row.className = 'sm-item';
    row.style.setProperty('--row-color', currentTheme.handle);
    const status = goal.completed ? (lang === 'en' ? 'Completed' : 'مكتمل') : (lang === 'en' ? 'Pending' : 'قيد الانتظار');
    row.innerHTML = `
      <span class="sm-item-icon">${svgIcon('icon-bell')}</span>
      <div class="sm-item-info">
        <div class="sm-item-name">${escapeHTML(goal.name)}</div>
        <div class="sm-item-detail">${status}</div>
      </div>
      <div class="sm-item-actions">
        <button class="sm-btn" onclick="editGoalName(${goal.id})">${lang === 'en' ? 'Edit' : 'تعديل'}</button>
        <button class="sm-btn delete" onclick="deleteGoal(${goal.id})">${lang === 'en' ? 'Delete' : 'حذف'}</button>
      </div>`;
    return row;
  };

  buildSection(lang === 'en' ? 'Events' : 'الأحداث', scheduledTasks.filter(t => !t.isRoutine), buildTaskRow);
  buildSection(lang === 'en' ? 'Routines' : 'الروتين', scheduledTasks.filter(t => t.isRoutine), buildTaskRow);
  buildSection(lang === 'en' ? 'Reminders' : 'التذكيرات', dailyGoals, buildGoalRow);
}

async function deleteScheduleItem(id) {
  const ok = await customConfirm(lang === 'en' ? "Delete this item?" : "حذف هذا العنصر؟", lang === 'en' ? 'Delete Item' : 'حذف العنصر', true);
  if (!ok) return;
  scheduledTasks = scheduledTasks.filter(t => t.id !== id);
  localStorage.setItem('idleTasksV4', JSON.stringify(scheduledTasks));
  renderTimetable();
  renderV3UI();
  renderScheduleManager();
}

async function editGoalName(id) {
  const goal = dailyGoals.find(g => g.id === id);
  if (!goal) return;
  const newName = await customPrompt(lang === 'en' ? 'Edit reminder name:' : 'تعديل اسم التذكير:', goal.name, lang === 'en' ? 'Edit Reminder' : 'تعديل التذكير');
  if (newName && newName.trim()) {
    goal.name = newName.trim();
    localStorage.setItem('idleGoals', JSON.stringify(dailyGoals));
    renderV3UI();
    renderScheduleManager();
  }
}

async function deleteGoal(id) {
  const ok = await customConfirm(lang === 'en' ? "Delete this reminder?" : "حذف هذا التذكير؟", lang === 'en' ? 'Delete Reminder' : 'حذف التذكير', true);
  if (!ok) return;
  dailyGoals = dailyGoals.filter(g => g.id !== id);
  localStorage.setItem('idleGoals', JSON.stringify(dailyGoals));
  renderV3UI();
  renderScheduleManager();
}

/* ==========================================
   10. WEATHER, CLOCK & PRAYER APIS
   ========================================== */
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation_probability,uv_index&hourly=temperature_2m,precipitation_probability&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.current) {
      document.getElementById('weatherTemp').textContent = toNum(`${Math.round(data.current.temperature_2m)}°`);
      document.getElementById('weatherRain').textContent = toNum(`${data.current.precipitation_probability || 0}%`);
      document.getElementById('weatherUV').textContent = toNum(data.current.uv_index || 0);
    }
    if (data && data.hourly) {
      weatherHourlyData = data.hourly;
      renderWeatherHourly();
    }
  } catch (err) {
    console.warn("Weather API failed");
  }
}

function renderWeatherHourly() {
  const container = document.getElementById('weatherHourlyList');
  if (!container || !weatherHourlyData || !weatherHourlyData.time) return;
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
  let startIdx = weatherHourlyData.time.indexOf(nowKey);
  if (startIdx < 0) startIdx = 0;
  const times = weatherHourlyData.time.slice(startIdx, startIdx + 6);

  container.innerHTML = '';
  times.forEach((t, offset) => {
    const i = startIdx + offset;
    const hh = parseInt(t.slice(11, 13), 10);
    const ampm = hh >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
    const h12 = hh % 12 || 12;
    const temp = Math.round(weatherHourlyData.temperature_2m[i]);
    const rain = weatherHourlyData.precipitation_probability[i] || 0;
    const item = document.createElement('div');
    item.className = 'weather-hour-item';
    item.innerHTML = `<span>${toNum(h12)}${ampm[0]}</span><span class="wh-temp">${toNum(temp)}°</span><span class="wh-rain">${toNum(rain)}%</span>`;
    container.appendChild(item);
  });
}

function updateWorldClock() {
  const now = new Date();
  const selectEl = document.getElementById('worldClockSelect');
  const tz = selectEl ? selectEl.value : 'Europe/London';
  const options = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true };
  const timeString = now.toLocaleTimeString('en-US', options);
  let [time, ampm] = timeString.split(' ');
  let finalStr = lang === 'ar' ? `${time} ${ampm === 'AM' ? 'ص' : 'م'}` : timeString;
  if (document.getElementById('worldClockTime')) document.getElementById('worldClockTime').textContent = toNum(finalStr);

  const extraZones = [
    { id: 'wcExtraLA', tz: 'America/Los_Angeles' },
    { id: 'wcExtraBerlin', tz: 'Europe/Berlin' },
    { id: 'wcExtraSGP', tz: 'Asia/Singapore' }
  ];
  extraZones.forEach(z => {
    const el = document.getElementById(z.id);
    if (!el) return;
    const ts = now.toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: true });
    const [t2, ap2] = ts.split(' ');
    el.textContent = toNum(lang === 'ar' ? `${t2} ${ap2 === 'AM' ? 'ص' : 'م'}` : ts);
  });
}

function calculateNextPrayer() {
  if (isTestGlowActive) return;
  const now = new Date();
  let upcoming = null, minDiff = Infinity;
  for (const [name, timeStr] of Object.entries(prayerTimes)) {
    if (!timeStr) continue;
    const [hours, mins] = timeStr.split(':');
    const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(mins), 0);
    const iDate = new Date(pDate.getTime() + iqamaOffsets[name] * 60000);
    const diffMs = iDate.getTime() - now.getTime();
    if (diffMs > 0 && diffMs < minDiff) {
      minDiff = diffMs;
      upcoming = { name, azanDate: pDate, iqamaDate: iDate, timeStr };
    }
  }
  if (!upcoming && prayerTimes.Fajr) {
    const [hours, mins] = prayerTimes.Fajr.split(':');
    const pDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, parseInt(hours), parseInt(mins), 0);
    const iDate = new Date(pDate.getTime() + iqamaOffsets.Fajr * 60000);
    upcoming = { name: "Fajr", azanDate: pDate, iqamaDate: iDate, timeStr: prayerTimes.Fajr };
  }
  nextPrayer = upcoming;
  updatePrayerUI();
  renderPrayerExpandedList();
}

function renderPrayerExpandedList() {
  const container = document.getElementById('prayerExpandedList');
  if (!container) return;
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  container.innerHTML = '';
  order.forEach(name => {
    const timeStr = prayerTimes[name];
    if (!timeStr) return;
    const [h, m] = timeStr.split(':');
    const h12 = parseInt(h) % 12 || 12;
    const ampm = parseInt(h) >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
    const row = document.createElement('div');
    row.className = 'prayer-row' + (nextPrayer && nextPrayer.name === name ? ' current' : '');
    row.innerHTML = `<span>${translations[lang].prayerNames[name]}</span><span class="prayer-row-time">${toNum(`${h12}:${m} ${ampm}`)}</span>`;
    container.appendChild(row);
  });
}

function updatePrayerUI() {
  if (!nextPrayer || isTestGlowActive) return;
  const pName = translations[lang].prayerNames[nextPrayer.name];
  const [h, m] = nextPrayer.timeStr.split(':');
  let h12 = parseInt(h) % 12 || 12;
  const ampm = parseInt(h) >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
  const nowMs = Date.now();
  const azanMs = nextPrayer.azanDate.getTime();
  const iqamaMs = nextPrayer.iqamaDate.getTime();
  const wName = document.getElementById("widgetPrayerName");
  const wTime = document.getElementById("widgetPrayerTime");
  const wCount = document.getElementById("widgetPrayerCountdown");
  if (!wName) return;
  if (nowMs >= iqamaMs) { calculateNextPrayer(); return; }

  if (nowMs >= azanMs && nowMs < iqamaMs) {
    ambientGlow.classList.add("prayer-glow-active");
    wName.classList.add("prayer-text-highlight");
    wName.textContent = translations[lang].iqamaFor + pName;
    wTime.textContent = "";
    const diffMs = iqamaMs - nowMs;
    const mins = Math.floor(diffMs / 60000).toString().padStart(2, '0');
    const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    wCount.textContent = toNum(`(${mins}:${secs})`);
    wCount.style.color = "#FFD700";

    if (!clockInterruptedByPrayer) {
      clockInterruptedByPrayer = true;
      document.getElementById('displayTitle').style.color = '#FFD700';
    }
    document.documentElement.style.setProperty('--accent', '#FFD700');
    displayTitle.textContent = translations[lang].iqamaFor + pName;
    timerEndTime = iqamaMs;
    timerDurationMs = diffMs;
    rawTimerDurationMs = diffMs;
    originalDurationMs = diffMs;
    isTimerRunning = true;
  } else {
    ambientGlow.classList.remove("prayer-glow-active");
    wName.classList.remove("prayer-text-highlight");
    wName.textContent = pName;
    wTime.textContent = toNum(`${h12}:${m} ${ampm}`);
    const diffMs = azanMs - nowMs;
    const hrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
    const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
    const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    wCount.textContent = toNum(`(${lang === 'en' ? 'in' : 'خلال'} ${hrs}:${mins}:${secs})`);
    wCount.style.color = currentTheme.handle;

    if (clockInterruptedByPrayer) resumeClockFromPrayerInterruption();
  }
}

async function fetchLocationData(city) {
  try {
    currentCity = city;
    localStorage.setItem('idleCity', city);
    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en&city=${city}`);
    const geoData = await geoRes.json();
    if (geoData.latitude && geoData.longitude) {
      cityLat = geoData.latitude;
      cityLon = geoData.longitude;
      fetchWeather(cityLat, cityLon);
    }
    const date = new Date();
    const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=Saudi Arabia&method=4`);
    const data = await res.json();
    const allTimes = data.data.timings;
    prayerTimes = { Fajr: allTimes.Fajr, Dhuhr: allTimes.Dhuhr, Asr: allTimes.Asr, Maghrib: allTimes.Maghrib, Isha: allTimes.Isha };
    calculateNextPrayer();
  } catch (err) {
    if (document.getElementById("widgetPrayerName")) document.getElementById("widgetPrayerName").textContent = translations[lang].offline;
  }
}

function initializeLocation() {
  if (window.location.protocol === "file:") { fetchLocationData("Jeddah"); return; }
  if ("geolocation" in navigator && !localStorage.getItem('idleCity')) {
    let hasFired = false;
    const fallback = setTimeout(() => { if (!hasFired) { hasFired = true; fetchLocationData("Jeddah"); } }, 2000);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (hasFired) return;
        hasFired = true;
        clearTimeout(fallback);
        try {
          cityLat = pos.coords.latitude;
          cityLon = pos.coords.longitude;
          fetchWeather(cityLat, cityLon);
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${cityLat}&longitude=${cityLon}&localityLanguage=en`);
          const data = await res.json();
          cityInput.value = data.city || data.locality || "Jeddah";
          fetchLocationData(cityInput.value);
        } catch (e) {
          fetchLocationData("Jeddah");
        }
      },
      () => { if (hasFired) return; hasFired = true; clearTimeout(fallback); fetchLocationData("Jeddah"); }
    );
  } else {
    fetchLocationData(currentCity);
  }
}

let lastCheckedMinute = -1;
function applyActiveTaskToClock(t, now) {
  const [eH, eM] = t.end.split(':').map(Number);
  playChime();
  document.getElementById('titleInput').value = t.name;
  displayTitle.textContent = t.name;
  document.documentElement.style.setProperty('--accent', t.color);
  document.getElementById('displayTitle').style.color = t.color;

  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eH, eM, 0);
  if (endDate.getTime() <= now.getTime()) endDate.setDate(endDate.getDate() + 1);
  timerEndTime = endDate.getTime();
  timerDurationMs = timerEndTime - now.getTime();
  rawTimerDurationMs = timerDurationMs;
  originalDurationMs = timerDurationMs;
  isTimerRunning = true;
}

function resetClockToStandby() {
  playChime();
  document.getElementById('titleInput').value = translations[lang].systemStandby;
  displayTitle.textContent = translations[lang].systemStandby;
  document.documentElement.style.setProperty('--accent', currentTheme.handle);
  document.getElementById('displayTitle').style.color = "var(--text-primary)";
  isTimerRunning = false;
  originalDurationMs = 0;
  timerDurationMs = 0;
}

function resumeClockFromPrayerInterruption() {
  clockInterruptedByPrayer = false;
  if (activeTaskObj) applyActiveTaskToClock(activeTaskObj, new Date());
  else resetClockToStandby();
}

function checkV3Logic() {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  if (currentMins === lastCheckedMinute) return;
  if (arcStyleMode === 'dimmed' && (currentMins === 0 || currentMins === 720)) renderTaskArcs();
  lastCheckedMinute = currentMins;
  let foundActive = false;
  const todayTasks = scheduledTasks.filter(t => taskOccursOnDate(t, now));
  todayTasks.forEach(t => {
    const [sH, sM] = t.start.split(':').map(Number);
    const [eH, eM] = t.end.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    if (currentMins >= startMins && currentMins < endMins) {
      foundActive = true;
      if (activeTaskObj !== t) {
        activeTaskObj = t;
        if (!clockInterruptedByPrayer) applyActiveTaskToClock(t, now);
      }
    }
  });
  if (!foundActive && activeTaskObj !== null) {
    activeTaskObj = null;
    if (!clockInterruptedByPrayer) resetClockToStandby();
  }
}

/* ==========================================
   11. MAIN LIVE TIMER SYNC
   ========================================== */
function updateLiveTimer() {
  try {
    const now = Date.now();
    const nowMins = getNowMins();
    const dateObj = new Date();
    let h = dateObj.getHours(), m = dateObj.getMinutes().toString().padStart(2, '0');

    if (document.getElementById('idleClockText')) document.getElementById('idleClockText').textContent = toNum(`${h % 12 || 12}:${m}`);
    if (document.getElementById('idleAmPmText')) document.getElementById('idleAmPmText').textContent = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');

    // Analog Classic Hands
    const classicMin = document.getElementById('classicMin');
    const classicHour = document.getElementById('classicHour');
    if (classicMin) {
      const mPos = polarToCartesian(200, 200, 120, (m / 60) * 360);
      classicMin.setAttribute('x2', mPos.x);
      classicMin.setAttribute('y2', mPos.y);
      const hPos = polarToCartesian(200, 200, 90, ((h % 12 + m / 60) / 12) * 360);
      classicHour.setAttribute('x2', hPos.x);
      classicHour.setAttribute('y2', hPos.y);
    }

    updatePrayerUI();
    checkV3Logic();
    checkReminders(new Date(now));
    updateTimelineHUD();

    if (isTimerRunning || originalDurationMs > 0 || activeTaskObj) { mainClockContainer.classList.add('timer-active'); }
    else { mainClockContainer.classList.remove('timer-active'); }

    if (now - lastInteractionTime > IDLE_TIMEOUT_MS && !isTimerRunning) {
      originalDurationMs = 0;
      timerDurationMs = 0;
      mainClockContainer.classList.remove('timer-active');
    }

    if (isBroken) return;
    let diffMs;
    if (isTimerRunning) {
      diffMs = timerEndTime - now;
      if (diffMs <= 0) {
        isTimerRunning = false;
        timerDurationMs = originalDurationMs;
        rawTimerDurationMs = originalDurationMs;
        diffMs = originalDurationMs;
        triggerShootingStar();
        if (isSpotifyPlaying) spotifyPause();
      } else {
        timerDurationMs = diffMs;
      }
    } else {
      diffMs = timerDurationMs;
    }

    if (!isTimerRunning && originalDurationMs > 0) {
      timeLabelText.textContent = translations[lang].paused;
      timeValueText.classList.add('paused');
    } else {
      timeLabelText.textContent = translations[lang].remaining;
      timeValueText.classList.remove('paused');
    }

    const absDiff = Math.abs(diffMs);
    const hNum = Math.floor(absDiff / 3600000);
    const mNum = Math.floor((absDiff % 3600000) / 60000);
    const sNum = Math.floor((absDiff % 60000) / 1000);
    const hStr = hNum.toString().padStart(2, '0');
    const mStr = mNum.toString().padStart(2, '0');
    const sStr = sNum.toString().padStart(2, '0');

    const elH = document.getElementById('timeH');
    const elM = document.getElementById('timeM');
    const elS = document.getElementById('timeS');
    let tabTimeStr = '';

    if (hNum === 0) {
      elH.classList.add('hidden');
      if (mNum === 0) {
        elM.classList.add('hidden');
        elS.textContent = toNum(sStr);
        tabTimeStr = sStr;
      } else {
        elM.classList.remove('hidden');
        elM.textContent = toNum(`${mStr}:`);
        elS.textContent = toNum(sStr);
        tabTimeStr = `${mStr}:${sStr}`;
      }
    } else {
      elH.classList.remove('hidden');
      elM.classList.remove('hidden');
      elH.textContent = toNum(`${hStr}:`);
      elM.textContent = toNum(`${mStr}:`);
      elS.textContent = toNum(sStr);
      tabTimeStr = `${hStr}:${mStr}:${sStr}`;
    }

    document.title = originalDurationMs > 0 ? `${displayTitle.textContent} • ${toNum(tabTimeStr)}` : titleInput.value;

    const fText = document.getElementById('finishTimeText');
    if (originalDurationMs > 0) {
      fText.style.display = "block";
      const finishTimeDate = new Date(now + diffMs);
      let fH = finishTimeDate.getHours();
      const fM = finishTimeDate.getMinutes().toString().padStart(2, '0');
      const fAMPM = fH >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
      fH = fH % 12 || 12;
      const finishStr = toNum(`${fH}:${fM} ${fAMPM}`);
      let dateSuffix = "";
      if (finishTimeDate.toDateString() !== new Date().toDateString()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (finishTimeDate.toDateString() === tomorrow.toDateString()) {
          dateSuffix = translations[lang].tomorrow;
        } else {
          dateSuffix = " (" + toNum(finishTimeDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA', { month: 'short', day: 'numeric' })) + ")";
        }
      }
      fText.textContent = translations[lang].finishAt + finishStr + dateSuffix;
    } else {
      fText.style.display = "none";
    }

    if (!ambientGlow.classList.contains("prayer-glow-active")) {
      if (diffMs > 0 && diffMs <= 60000 && isTimerRunning) {
        ambientGlow.style.transition = "opacity 1s linear";
        ambientGlow.style.background = `radial-gradient(circle at center, var(--accent) 0%, transparent 80%)`;
        ambientGlow.style.opacity = ((1 - (diffMs / 60000)) * 0.4).toString();
      } else if (diffMs > 60000 && !dragging) {
        ambientGlow.style.opacity = "0";
      }
    }

    const targetMins = nowMins + (diffMs / 60000);
    const realSAng = minsToAngle(nowMins);
    const realEAng = minsToAngle(targetMins);
    let arcSAng = realSAng, arcEAng = realEAng;
    if (diffMs >= 43200000) { arcEAng = arcSAng + 359.9; }

    let startR = radius, endR = radius;
    if (arcStyleMode === 'dualtrack') {
      const nowH = new Date(now).getHours();
      startR = nowH < 12 ? DUAL_TRACK_AM_R : DUAL_TRACK_PM_R;
      if (!dragging) {
        const targetH = Math.floor((((targetMins % 1440) + 1440) % 1440) / 60);
        endR = targetH < 12 ? DUAL_TRACK_AM_R : DUAL_TRACK_PM_R;
      }
    }
    const sPos = polarToCartesian(cx, cy, startR, realSAng);
    startHandle.setAttribute("cx", sPos.x);
    startHandle.setAttribute("cy", sPos.y);
    const ePos = polarToCartesian(cx, cy, dragging ? dragRadius : endR, realEAng);
    endHandle.setAttribute("cx", ePos.x);
    endHandle.setAttribute("cy", ePos.y);
    sleepArc.setAttribute("d", describeArc(cx, cy, radius, arcSAng, arcEAng));
    sleepArc.setAttribute("stroke", "url(#dynamicGrad)");
  } catch (error) {
    console.warn("Live Timer safely bypassed an error:", error);
  }
}

/* ==========================================
   12. TIMER DRAG EVENTS
   ========================================== */
timeValueText.addEventListener("click", () => {
  if (originalDurationMs === 0) return;
  isTimerRunning = !isTimerRunning;
  if (isTimerRunning) timerEndTime = Date.now() + timerDurationMs;
  resetIdleTimer();
  updateLiveTimer();
});
function getMouseData(e) {
  const rect = clockSvg.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  let ang = Math.atan2(y, x) * (180 / Math.PI) + 90;
  if (ang < 0) ang += 360;
  return { ang, dist: Math.hypot(x, y) * (400 / rect.width) };
}
function onPointerDown(e) {
  resetIdleTimer();
  if (e.target === endHandle && !isBroken) {
    dragging = true;
    prevMouseAngle = null;
    isTimerRunning = false;
    rawTimerDurationMs = timerDurationMs;
    endHandle.classList.remove("snap-back");
    dragString.style.opacity = "1";
    e.target.classList.add("dragging");
    mainClockContainer.classList.add('timer-active');
  }
}
function onPointerMove(e) {
  if (!dragging || isBroken) return;
  e.preventDefault();
  resetIdleTimer();
  const { ang, dist } = getMouseData(e);
  if (dist > 495) { triggerSnapEasterEgg(); return; }
  dragRadius = Math.max(120, dist);
  if (prevMouseAngle === null) { prevMouseAngle = ang; return; }
  let deltaAngle = ang - prevMouseAngle;
  if (deltaAngle > 180) deltaAngle -= 360;
  if (deltaAngle < -180) deltaAngle += 360;
  rawTimerDurationMs += deltaAngle * 2 * 60 * 1000;
  prevMouseAngle = ang;
  if (rawTimerDurationMs < -3600000) rawTimerDurationMs = -3600000;

  let displayDuration = rawTimerDurationMs;
  if (displayDuration < 0) displayDuration = 0;
  if (dist < radius - 5) {
    const snapMs = 5 * 60 * 1000;
    timerDurationMs = Math.round(displayDuration / snapMs) * snapMs;
  } else {
    timerDurationMs = displayDuration;
  }
  originalDurationMs = timerDurationMs;
  updateLiveTimer();
}
function onPointerUp() {
  if (dragging && !isBroken) {
    dragging = false;
    prevMouseAngle = null;
    dragRadius = radius;
    if (timerDurationMs > 0) {
      isTimerRunning = true;
      timerEndTime = Date.now() + timerDurationMs;
    }
    endHandle.classList.add("snap-back");
    endHandle.classList.remove("dragging");
    dragString.style.opacity = "0";
    resetIdleTimer();
    updateLiveTimer();
  }
}

/* ==========================================
   13. SPOTIFY API
   ========================================== */
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};
const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};
async function loginSpotify() {
  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('code_verifier', codeVerifier);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  const params = { response_type: 'code', client_id: SPOTIFY_CLIENT_ID, scope: SPOTIFY_SCOPES, code_challenge_method: 'S256', code_challenge: codeChallenge, redirect_uri: REDIRECT_URI };
  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}
async function handleSpotifyCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  let code = urlParams.get('code');
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    const codeVerifier = localStorage.getItem('code_verifier');
    const payload = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code: code, redirect_uri: REDIRECT_URI, code_verifier: codeVerifier })
    };
    const body = await fetch("https://accounts.spotify.com/api/token", payload);
    const response = await body.json();
    if (response.access_token) {
      spotifyToken = response.access_token;
      spotifyTokenExpiry = Date.now() + (response.expires_in * 1000);
      localStorage.setItem('spotify_token', spotifyToken);
      localStorage.setItem('spotify_token_expiry', spotifyTokenExpiry);
      localStorage.setItem('spotify_refresh_token', response.refresh_token);
    }
  }
}
async function fetchSpotifyAPI(endpoint, method = 'GET', body = null) {
  if (!spotifyToken) return null;
  try {
    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      method: method,
      headers: { 'Authorization': `Bearer ${spotifyToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });
    if (res.status === 401) { return null; }
    if (res.status === 204) return { no_content: true };
    if (res.ok && method === 'GET') return await res.json();
    return { success: true };
  } catch (err) {
    return null;
  }
}
function msToClock(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

async function updateSpotifyUI() {
  if (!spotifyToken) return;
  document.getElementById('spotifyLoginBlock').style.display = 'none';
  document.getElementById('spotifyDeviceBlock').style.display = 'block';
  const data = await fetchSpotifyAPI('/me/player');
  const trackEl = document.getElementById("spWidgetTrack");
  const artistEl = document.getElementById("spWidgetArtist");
  const artEl = document.getElementById("spWidgetArt");
  const playBtn = document.getElementById("spWidgetPlay");
  const fillEl = document.getElementById("spProgressFill");
  const elapsedEl = document.getElementById("spWidgetElapsed");
  const durationEl = document.getElementById("spWidgetDuration");
  const volumeEl = document.getElementById("spVolumeSlider");
  if (!data || data.no_content || !data.item) {
    trackEl.textContent = translations[lang].offline;
    artistEl.textContent = translations[lang].noActiveDevice;
    artEl.style.display = 'none';
    isSpotifyPlaying = false;
    if (fillEl) fillEl.style.width = '0%';
    if (elapsedEl) elapsedEl.textContent = '0:00';
    if (durationEl) durationEl.textContent = '0:00';
    return;
  }
  trackEl.textContent = data.item.name;
  artistEl.textContent = data.item.artists.map(a => a.name).join(', ');
  if (data.item.album.images.length > 0) {
    artEl.src = data.item.album.images[0].url;
    artEl.style.display = 'block';
  }
  isSpotifyPlaying = data.is_playing;
  playBtn.innerHTML = svgIcon(isSpotifyPlaying ? 'icon-pause' : 'icon-play');

  if (fillEl && data.item.duration_ms) {
    const pct = Math.min(100, ((data.progress_ms || 0) / data.item.duration_ms) * 100);
    fillEl.style.width = `${pct}%`;
  }
  if (elapsedEl) elapsedEl.textContent = toNum(msToClock(data.progress_ms || 0));
  if (durationEl) durationEl.textContent = toNum(msToClock(data.item.duration_ms || 0));
  if (volumeEl && !spVolumeDragging && data.device && typeof data.device.volume_percent === 'number') {
    volumeEl.value = data.device.volume_percent;
  }
}
async function fetchSpotifyDevices() {
  if (!spotifyToken) return;
  const select = document.getElementById('spDeviceSelect');
  if (!select) return;
  const data = await fetchSpotifyAPI('/me/player/devices');
  if (!data || !Array.isArray(data.devices) || data.devices.length === 0) {
    select.innerHTML = `<option value="">${lang === 'en' ? 'No devices found' : 'لا توجد أجهزة'}</option>`;
    return;
  }
  select.innerHTML = '';
  data.devices.forEach(device => {
    const opt = document.createElement('option');
    opt.value = device.id;
    opt.textContent = device.name;
    if (device.is_active) opt.selected = true;
    select.appendChild(opt);
  });
}

async function spotifyTransfer(deviceId) {
  if (!deviceId) return;
  await fetchSpotifyAPI('/me/player', 'PUT', { device_ids: [deviceId], play: true });
  setTimeout(() => { updateSpotifyUI(); fetchSpotifyDevices(); }, 800);
}

function spotifyVolumeInput() {
  spVolumeDragging = true;
}
async function spotifySetVolume(val) {
  await fetchSpotifyAPI(`/me/player/volume?volume_percent=${val}`, 'PUT');
  spVolumeDragging = false;
}
async function spotifyTogglePlay() {
  const method = isSpotifyPlaying ? 'pause' : 'play';
  await fetchSpotifyAPI(`/me/player/${method}`, 'PUT');
  setTimeout(updateSpotifyUI, 500);
}
async function spotifyPause() {
  if (!spotifyToken) return;
  await fetchSpotifyAPI('/me/player/pause', 'PUT');
  setTimeout(updateSpotifyUI, 500);
}
async function spotifyAction(action) {
  await fetchSpotifyAPI(`/me/player/${action}`, 'POST');
  setTimeout(updateSpotifyUI, 800);
}

/* ==========================================
   14. BOOT SEQUENCE
   ========================================== */
titleInput.value = localStorage.getItem('idleTitle') || translations[lang].systemStandby;
displayTitle.textContent = titleInput.value;
document.title = titleInput.value;
cityInput.value = currentCity;
cityInput.addEventListener("keydown", (e) => { if (e.key === 'Enter') fetchLocationData(e.target.value.trim()); });
titleInput.addEventListener("input", (e) => {
  displayTitle.textContent = e.target.value || " ";
  localStorage.setItem('idleTitle', e.target.value);
});
document.getElementById('newTaskName').addEventListener('input', updateIconSuggestions);
clockSvg.addEventListener("mousedown", onPointerDown);
window.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);
clockSvg.addEventListener("touchstart", onPointerDown, { passive: false });
window.addEventListener("touchmove", onPointerMove, { passive: false });
window.addEventListener("touchend", onPointerUp);

Object.entries(themes).forEach(([key, colors]) => {
  const dot = document.createElement("div");
  dot.className = `theme-dot`;
  dot.dataset.key = key;
  dot.style.background = `linear-gradient(135deg, ${colors.start}, ${colors.end})`;
  dot.setAttribute('role', 'button');
  dot.setAttribute('tabindex', '0');
  dot.setAttribute('aria-label', `${key.charAt(0).toUpperCase()}${key.slice(1)} theme`);
  dot.addEventListener('click', () => applyTheme(colors));
  dot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTheme(colors); } });
  themeGrid.appendChild(dot);
});

document.querySelectorAll('.icon-option[data-icon]').forEach(el => {
  const label = el.dataset.icon.replace(/-/g, ' ');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', label.charAt(0).toUpperCase() + label.slice(1));
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
});

const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
document.querySelectorAll('#routineDayPicker .day-bubble').forEach(el => {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', dayFullNames[parseInt(el.dataset.day, 10)]);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
});

document.querySelectorAll('.color-swatch').forEach(el => {
  const hex = (el.getAttribute('style').match(/#[0-9a-fA-F]{3,6}/) || [''])[0];
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Color ${hex}`);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
});

const arcStyleBtn = document.querySelector(`#arcStyleGrid .clock-toggle-btn[onclick*="'${arcStyleMode}'"]`);
if (arcStyleBtn) {
  document.querySelectorAll('#arcStyleGrid .clock-toggle-btn').forEach(b => b.classList.remove('active-lang'));
  arcStyleBtn.classList.add('active-lang');
}

drawTicks();
initTimeline();
renderV3UI();
updateCalendarWidget();
applyTheme(currentTheme);
setMode(currentMode);
setLanguage(lang);
updateWorldClock();

setInterval(updateLiveTimer, 1000);
setInterval(updateWorldClock, 60000);
animateWobblyString();
initializeLocation();

handleSpotifyCallback().then(() => {
  if (spotifyToken) {
    updateSpotifyUI();
    fetchSpotifyDevices();
    spotifyUpdateInterval = setInterval(updateSpotifyUI, 5000);
    setInterval(fetchSpotifyDevices, 15000);
  }
});

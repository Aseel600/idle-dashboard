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
const DUAL_TRACK_AM_R = radius + 14;
const DUAL_TRACK_PM_R = radius + 28;
const DUAL_TRACK_AM_COLOR = "#ffa502";
const DUAL_TRACK_PM_COLOR = "#5352ed";
let dragging = false, prevMouseAngle = null, dragRadius = radius, isBroken = false;

// Idle Tracking
let lastInteractionTime = Date.now();
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

// Quick Timer state survives a page reload (tab discard, browser memory-saver,
// laptop sleep, accidental refresh) by persisting to localStorage every tick -
// without this, a long-running timer looks like it "vanished" with no trace if
// the tab gets reloaded while it's still counting down, even though the timer
// itself hadn't actually finished. Restored here before boot; updateLiveTimer's
// existing end-time comparison (timerEndTime - now) already handles "it finished
// while the tab was gone" correctly on its own, since it's based on an absolute
// timestamp, not an accumulated countdown.
const savedQuickTimerState = safeParseJSON('idleQuickTimerState', null);
let originalDurationMs = (savedQuickTimerState && savedQuickTimerState.originalDurationMs) || 0;
let timerDurationMs = (savedQuickTimerState && savedQuickTimerState.timerDurationMs) || originalDurationMs;
let rawTimerDurationMs = (savedQuickTimerState && savedQuickTimerState.rawTimerDurationMs) || timerDurationMs;
let timerEndTime = (savedQuickTimerState && savedQuickTimerState.timerEndTime) || Date.now();
let isTimerRunning = !!(savedQuickTimerState && savedQuickTimerState.isTimerRunning);

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
    soundsChimes: "Sounds & Chimes",
    chimeTimerEnd: "Timer End",
    chimeEventStart: "Event Start",
    chimeEventEnd: "Event End",
    chimeAlerts: "Reminders & Alerts",
    chimePreview: "Preview",
    chimeName_classic: "Classic Ding",
    chimeName_softbell: "Soft Bell",
    chimeName_digitalbeep: "Digital Beep",
    chimeName_marimba: "Marimba Pop",
    chimeName_arpeggio: "Rising Chime",
    chimeName_alertpulse: "Alert Pulse",
    chimeName_softpiano: "Soft Piano",
    chimeName_xylophone: "Xylophone",
    chimeName_deepgong: "Deep Gong",
    chimeName_notifpop: "Notification Pop",
    chimeName_zenbell: "Zen Bell",
    chimeName_retroblip: "Retro Blip",
    accentColor: "Ambient Theme",
    remaining: "REMAINING",
    paused: "PAUSED",
    enterCity: "Enter City...",
    azanReminder: "Azan Reminder",
    azanReminderToggle: "Glow & Clock Takeover at Prayer Time",
    displayMode: "Display Mode",
    quotesToggleLabel: "Ambient Quotes",
    quotesOn: "On",
    quotesOff: "Off",
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
    widgetTimeline: "Timeline",
    widgetCountdown: "Countdown",
    widgetPomodoro: "Focus Timer",
    widgetHabits: "Habit Streaks",
    widgetCrypto: "Crypto Ticker",
    widgetRss: "News Feed",
    pomodoroSettingsTitle: "Focus Timer Settings",
    habitsSettingsTitle: "Manage Habits",
    cryptoSettingsTitle: "Crypto Ticker Settings",
    rssSettingsTitle: "News Feed Settings",
    pomWork: "Work",
    pomBreak: "Break",
    pomLongBreak: "Long Break",
    pomWorkMin: "Work (minutes)",
    pomBreakMin: "Break (minutes)",
    pomLongBreakMin: "Long Break (minutes)",
    pomSessionsUntilLong: "Sessions Until Long Break",
    pomodoroSettingsSave: "Save",
    habitsNoStreak: "No active streak",
    habitNamePlaceholder: "Habit name (e.g. Read)",
    habitsSettingsDone: "Done",
    cryptoIdPlaceholder: "Other CoinGecko id (e.g. cardano)",
    cryptoIdNote: "Use lowercase CoinGecko coin IDs (e.g. \"bitcoin\", \"binancecoin\").",
    cryptoSettingsDone: "Done",
    rssLatest: "Latest",
    rssNoFeed: "Add a feed URL to get started.",
    rssUrlPlaceholder: "https://example.com/rss.xml",
    rssUrlNote: "Paste any public RSS/Atom feed URL. Fetched via a free RSS-to-JSON proxy since most feeds don't allow direct browser access.",
    rssSettingsSave: "Save",
    quickLinksSettingsTitle: "Quick Links",
    quickLinkNamePlaceholder: "Name",
    quickLinkUrlPlaceholder: "https://example.com",
    quickLinkAdd: "Add Link",
    quickLinkNote: "Only http and https links are accepted.",
    close: "Close",
    clockSize: "Clock Size",
    clockSizeNote: "Scales the main clock face without affecting anything else on screen.",
    locationNote: "Your location is used only to line up prayer times and the clock with where you actually are. It stays on your device and is never sent anywhere except to look up those times.",
    displayTitleAutoHide: "Hide When Idle",
    displayTitleAutoHideNote: "Fades the title out after 5 seconds without input, and brings it back on any movement or key press.",
    theaterDimFloatingNote: "Dimming applies to Landscape and Fullscreen only - Floating deliberately keeps the dashboard behind it visible.",
    errorLogTitle: "Error Log",
    errorLogNote: "Uncaught errors and unhandled promise rejections captured on this device (most recent last, capped at 50). Stored locally only, never synced to your account.",
    copy: "Copy",
    clear: "Clear",
    tutQuickTimerTitle: "Set a Timer by Dragging",
    tutQuickTimerBody: "Drag the handle around the dial to set a quick timer. The arc fills as it counts down, and the finish time is shown underneath.",
    tutClockFaceTitle: "Clock Face",
    tutClockFaceBody: "Switch between the default minimal dial and a Classic face with real hour and minute hands.",
    tutClockSizeTitle: "Clock Size",
    tutClockSizeBody: "Scale the dial up or down to taste - handy on smaller screens or when you want the widgets to take centre stage.",
    tutDisplayTitleTitle: "Display Title",
    tutDisplayTitleBody: "Name your dashboard whatever you like. Leave 'Hide When Idle' on and the title fades away while you're not touching anything.",
    tutSpotifyTitle: "Now Playing",
    tutSpotifyBody: "Connect Spotify to control playback, follow along with synced lyrics, or swap the art for a live equaliser.",
    tutPomodoroTitle: "Focus Timer",
    tutPomodoroBody: "A full Pomodoro cycle with work, short break and long break - all adjustable from the widget's gear icon.",
    tutPrayerTitle: "Prayer Times",
    tutPrayerBody: "Prayer times for your city, with a countdown to the next one and an optional ambient glow when it arrives.",
    tutQuickLinksTitle: "Quick Links",
    tutQuickLinksBody: "Keep the sites you open most within one click. Add and remove them from the widget's gear icon.",
    chimePomodoroComplete: "Focus Timer",
    acctLoggedOutBlurb: "Sign in to sync tasks, countdowns, and settings across your devices.",
    acctGoToLogin: "Sign In / Sign Up →",
    noCountdownsYet: "No countdowns yet",
    countdownManager: "Countdown Manager",
    addCountdown: "+ Add Countdown",
    newCountdown: "New Countdown",
    editCountdown: "Edit Countdown",
    countdownTitlePlaceholder: "Event title",
    eventDate: "Date",
    eventTime: "Time",
    markBirthday: "Birthday / Anniversary",
    repeatEndLabel: "Repeat Until",
    workdaysOnly: "Workdays Only",
    tagsPlaceholder: "e.g. family, work",
    pinEvent: "Pin to Top",
    notifyAtTime: "Notify at time of event",
    notifyDayBefore: "Notify 1 day before",
    notifyWeekBefore: "Notify 1 week before",
    saveCountdown: "Save Countdown",
    shareCountdown: "Share Link",
    linkCopied: "Link copied to clipboard!",
    sortClosest: "Closest",
    sortFarthest: "Farthest",
    searchPlaceholder: "Search...",
    allTags: "All Tags",
    importCountdownTitle: "Import Countdown?",
    importCountdownMsg: 'Add "{title}" to your countdowns?',
    daysLeft: "days left",
    dayLeft: "day left",
    daysAgo: "days ago",
    dayAgoLabel: "day ago",
    todayLabel: "Today",
    turningAge: "Turning {age}",
    seriesEnded: "ended",
    enterTitleFirst: "Please enter a title.",
    confirmDeleteCountdown: "Delete this countdown?",
    selectedCount: "selected",
    tutWelcomeTitle: "Welcome to Ambient OS 👋",
    tutWelcomeBody: "A quick tour of what this dashboard can do. You can skip anytime — Escape or the X always closes this.",
    tutClockTitle: "Your Live Clock",
    tutClockBody: "The centerpiece. Drag the glowing dot around the edge to quickly set a countdown or alarm.",
    tutWidgetsTitle: "Widgets Panel",
    tutWidgetsBody: "Weather, prayer times, world clock, Spotify, and more can live here — they start OFF by default to keep things clean and empty right now. Next we'll show you how to turn them on.",
    tutPanelTitle: "Settings Panel",
    tutPanelBody: "Hover this edge (or tap it on touch devices) to slide out the settings panel.",
    tutWidgetManagerTitle: "Widget Manager",
    tutWidgetManagerBody: "Toggle any widget on or off here, including Focus Timer, Habit Streaks, Crypto Ticker, and News Feed - each has its own settings gear icon once turned on. Your choices are saved automatically.",
    tutAddTaskTitle: "Tasks, Routines & Countdowns",
    tutAddTaskBody: "Add one-off tasks, recurring routines, or countdowns to future events — all shown on the clock face and timeline.",
    tutThemeTitle: "Make It Yours",
    tutThemeBody: "Pick an accent color, clock face style, and AM/PM style that fits your taste.",
    tutCountdownTitle: "Countdowns",
    tutCountdownBody: "Count down to birthdays, trips, or any future date — Gregorian or Hijri. Pin favorites, add tags, and get notified as the date approaches.",
    tutLayoutTitle: "Any Screen, Any Device",
    tutLayoutBody: "The layout adapts for PC, phone, tablet, or TV — auto-detected on first visit, or pick one yourself. TV mode even supports pairing by scanning a QR code with your phone's camera.",
    tutTheaterTitle: "Theater Mode",
    tutTheaterBody: "Play a local video file or a URL — floating, landscape, or fullscreen — with the rest of the screen dimmed to your liking.",
    tutQuotesTitle: "Ambient Quotes",
    tutQuotesBody: "A new quote appears every 10 minutes at the bottom of the screen. Turn it on or off here anytime.",
    tutChimesTitle: "Sounds & Chimes",
    tutChimesBody: "Pick which sound plays for Timer End, Event Start, Event End, and Reminders & Alerts. Tap the play icon to preview any of the 12 tones before choosing.",
    tutAccountTitle: "Account",
    tutAccountBody: "Sign up to sync your tasks, countdowns, and settings across every device you log into. Fully optional — everything works fine locally without an account too.",
    tutTimelineTitle: "24-Hour Timeline",
    tutTimelineBody: "A live strip across the top shows your whole day at a glance.",
    tutZenTitle: "Focus Mode",
    tutZenBody: "Hide every panel for a distraction-free ambient display. Click again to bring it all back.",
    tutFinishTitle: "You're All Set!",
    tutFinishBody: "That's the tour. Explore, customize, and enjoy your ambient dashboard.",
    tutNext: "Next",
    tutBack: "Back",
    tutFinish: "Finish",
    accountTitle: "Account",
    acctDobOptional: "Date of Birth (optional)",
    acctDobCalendarHijri: "Hijri Calendar",
    acctLogoutBtn: "Log Out",
    acctSaveProfile: "Save Profile",
    acctWelcomeText: "Welcome, {name}",
    acctProfileSaved: "Profile saved.",
    acctLoginRequired: "Please log in first.",
    acctSettingsTitle: "Account Settings",
    acctSettingsDone: "Done",
    acctChangePassword: "Change Password",
    acctNewPasswordPlaceholder: "New password",
    acctConfirmPassword: "Confirm Password",
    acctChangePasswordBtn: "Change Password",
    acctPasswordMismatch: "Passwords do not match.",
    acctPasswordTooShort: "Password must be at least 6 characters.",
    acctPasswordChanged: "Password changed.",
    theaterMode: "Theater Mode",
    theaterLocalFile: "Local File",
    theaterFromUrl: "From URL",
    theaterUrlPlaceholder: "https://... (direct video or YouTube link)",
    theaterLoad: "Load",
    theaterUrlNote: "Direct video links (.mp4, .webm) and YouTube links work. Streaming service pages (Netflix, etc.) generally cannot be embedded.",
    theaterLayout: "Layout",
    theaterFloating: "Floating",
    theaterLandscape: "Landscape",
    theaterFullscreen: "Fullscreen",
    theaterDimLevel: "Dim Level",
    theaterRoundedEdges: "Rounded Corners",
    theaterSkipIntro: "Skip the intro",
    theaterEnter: "Enter Theater Mode",
    theaterNoSource: "Please choose a video file or enter a URL first.",
    theaterInvalidUrl: "Could not load that URL as a video.",
    screenLayout: "Screen Layout",
    layoutPc: "PC",
    layoutPhone: "Phone",
    layoutTablet: "Tablet",
    layoutTv: "TV",
    layoutAutoDetect: "↺ Re-run auto-detect",
    tvScanLogin: "Scan to Log In",
    tvStartScan: "Start Camera Scan",
    tvScanNotSupported: "This browser doesn't support barcode scanning.",
    tvScanRequesting: "Requesting camera access...",
    tvScanWaiting: "Point the camera at a QR code containing email|password",
    tvScanFound: "Code found, logging in...",
    tvScanError: "Could not access the camera.",
    tvScanBadFormat: "Scanned code was not in email|password format.",
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
    soundsChimes: "الأصوات والرنات",
    chimeTimerEnd: "انتهاء المؤقت",
    chimeEventStart: "بداية الحدث",
    chimeEventEnd: "نهاية الحدث",
    chimeAlerts: "التذكيرات والتنبيهات",
    chimePreview: "معاينة",
    chimeName_classic: "رنين كلاسيكي",
    chimeName_softbell: "جرس ناعم",
    chimeName_digitalbeep: "صفير رقمي",
    chimeName_marimba: "ماريمبا",
    chimeName_arpeggio: "نغمة صاعدة",
    chimeName_alertpulse: "نبضة تنبيه",
    chimeName_softpiano: "بيانو هادئ",
    chimeName_xylophone: "إكسيليفون",
    chimeName_deepgong: "جونج عميق",
    chimeName_notifpop: "نقرة إشعار",
    chimeName_zenbell: "جرس زِن",
    chimeName_retroblip: "تنبيه ريترو",
    accentColor: "لون المظهر",
    remaining: "المتبقي",
    paused: "متوقف",
    enterCity: "أدخل المدينة...",
    azanReminder: "تذكير الأذان",
    azanReminderToggle: "التوهج وتغيير الساعة عند وقت الصلاة",
    displayMode: "المظهر",
    quotesToggleLabel: "الاقتباسات المحيطة",
    quotesOn: "تشغيل",
    quotesOff: "إيقاف",
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
    widgetTimeline: "الجدول الزمني",
    widgetCountdown: "العد التنازلي",
    widgetPomodoro: "مؤقت التركيز",
    widgetHabits: "سلاسل العادات",
    widgetCrypto: "أسعار العملات الرقمية",
    widgetRss: "الأخبار",
    pomodoroSettingsTitle: "إعدادات مؤقت التركيز",
    habitsSettingsTitle: "إدارة العادات",
    cryptoSettingsTitle: "إعدادات أسعار العملات الرقمية",
    rssSettingsTitle: "إعدادات الأخبار",
    pomWork: "عمل",
    pomBreak: "استراحة",
    pomLongBreak: "استراحة طويلة",
    pomWorkMin: "مدة العمل (دقائق)",
    pomBreakMin: "مدة الاستراحة (دقائق)",
    pomLongBreakMin: "مدة الاستراحة الطويلة (دقائق)",
    pomSessionsUntilLong: "عدد الجلسات قبل الاستراحة الطويلة",
    pomodoroSettingsSave: "حفظ",
    habitsNoStreak: "لا توجد سلسلة نشطة",
    habitNamePlaceholder: "اسم العادة (مثال: قراءة)",
    habitsSettingsDone: "تم",
    cryptoIdPlaceholder: "معرّف آخر من CoinGecko (مثال: cardano)",
    cryptoIdNote: "استخدم معرّفات عملات CoinGecko بأحرف صغيرة (مثال: \"bitcoin\"، \"binancecoin\").",
    cryptoSettingsDone: "تم",
    rssLatest: "الأحدث",
    rssNoFeed: "أضف رابط خلاصة أخبار للبدء.",
    rssUrlPlaceholder: "https://example.com/rss.xml",
    rssUrlNote: "الصق رابط أي خلاصة RSS/Atom عامة. يتم جلبها عبر خدمة وسيطة مجانية لأن معظم الخلاصات لا تسمح بالوصول المباشر من المتصفح.",
    rssSettingsSave: "حفظ",
    quickLinksSettingsTitle: "روابط سريعة",
    quickLinkNamePlaceholder: "الاسم",
    quickLinkUrlPlaceholder: "https://example.com",
    quickLinkAdd: "إضافة رابط",
    quickLinkNote: "يُسمح بروابط http و https فقط.",
    close: "إغلاق",
    clockSize: "حجم الساعة",
    clockSizeNote: "يغيّر حجم قرص الساعة الرئيسي دون التأثير على أي عنصر آخر في الشاشة.",
    locationNote: "يُستخدم موقعك فقط لضبط أوقات الصلاة والساعة حسب مكانك الفعلي. يبقى على جهازك ولا يُرسل إلى أي جهة سوى لجلب تلك الأوقات.",
    displayTitleAutoHide: "إخفاء عند الخمول",
    displayTitleAutoHideNote: "يُخفي العنوان تدريجياً بعد 5 ثوانٍ من عدم النشاط، ويعيده عند أي حركة أو ضغطة مفتاح.",
    theaterDimFloatingNote: "التعتيم يعمل في وضعي العرض العريض وملء الشاشة فقط - الوضع العائم يُبقي لوحة التحكم خلفه ظاهرة عن قصد.",
    errorLogTitle: "سجل الأخطاء",
    errorLogNote: "الأخطاء غير المعالجة المسجّلة على هذا الجهاز (الأحدث في الأسفل، بحد أقصى 50). تُحفظ محلياً فقط ولا تُزامَن مع حسابك.",
    copy: "نسخ",
    clear: "مسح",
    tutQuickTimerTitle: "اضبط مؤقتاً بالسحب",
    tutQuickTimerBody: "اسحب المقبض حول القرص لضبط مؤقت سريع. يمتلئ القوس أثناء العد التنازلي، ويظهر وقت الانتهاء بالأسفل.",
    tutClockFaceTitle: "وجه الساعة",
    tutClockFaceBody: "بدّل بين القرص البسيط الافتراضي والوجه الكلاسيكي بعقارب ساعات ودقائق حقيقية.",
    tutClockSizeTitle: "حجم الساعة",
    tutClockSizeBody: "كبّر القرص أو صغّره حسب ذوقك - مفيد على الشاشات الصغيرة أو عندما تريد إبراز الأدوات.",
    tutDisplayTitleTitle: "عنوان اللوحة",
    tutDisplayTitleBody: "سمِّ لوحتك بما تشاء. أبقِ خيار «إخفاء عند الخمول» مفعّلاً ليختفي العنوان عندما لا تستخدم الجهاز.",
    tutSpotifyTitle: "قيد التشغيل",
    tutSpotifyBody: "اربط Spotify للتحكم بالتشغيل، ومتابعة الكلمات المتزامنة، أو استبدال الغلاف بمعادل صوتي حي.",
    tutPomodoroTitle: "مؤقت التركيز",
    tutPomodoroBody: "دورة بومودورو كاملة مع فترات عمل واستراحة قصيرة وطويلة - كلها قابلة للتعديل من أيقونة الإعدادات.",
    tutPrayerTitle: "أوقات الصلاة",
    tutPrayerBody: "أوقات الصلاة لمدينتك، مع عدّ تنازلي للصلاة القادمة وتوهّج اختياري عند دخول الوقت.",
    tutQuickLinksTitle: "روابط سريعة",
    tutQuickLinksBody: "أبقِ المواقع التي تفتحها كثيراً على بُعد نقرة واحدة. أضفها أو احذفها من أيقونة إعدادات الأداة.",
    chimePomodoroComplete: "مؤقت التركيز",
    acctLoggedOutBlurb: "سجّل الدخول لمزامنة المهام والعدّادات والإعدادات عبر أجهزتك.",
    acctGoToLogin: "تسجيل الدخول / إنشاء حساب ←",
    noCountdownsYet: "لا توجد عدادات بعد",
    countdownManager: "مدير العد التنازلي",
    addCountdown: "+ إضافة عداد",
    newCountdown: "عداد جديد",
    editCountdown: "تعديل العداد",
    countdownTitlePlaceholder: "عنوان الحدث",
    eventDate: "التاريخ",
    eventTime: "الوقت",
    markBirthday: "عيد ميلاد / ذكرى سنوية",
    repeatEndLabel: "التكرار حتى",
    workdaysOnly: "أيام العمل فقط",
    tagsPlaceholder: "مثال: عائلة، عمل",
    pinEvent: "تثبيت في الأعلى",
    notifyAtTime: "تنبيه عند وقت الحدث",
    notifyDayBefore: "تنبيه قبل يوم واحد",
    notifyWeekBefore: "تنبيه قبل أسبوع واحد",
    saveCountdown: "حفظ العداد",
    shareCountdown: "مشاركة الرابط",
    linkCopied: "تم نسخ الرابط!",
    sortClosest: "الأقرب",
    sortFarthest: "الأبعد",
    searchPlaceholder: "بحث...",
    allTags: "كل الوسوم",
    importCountdownTitle: "استيراد العداد؟",
    importCountdownMsg: 'إضافة "{title}" إلى عداداتك؟',
    daysLeft: "أيام متبقية",
    dayLeft: "يوم متبقٍ",
    daysAgo: "أيام مضت",
    dayAgoLabel: "يوم مضى",
    todayLabel: "اليوم",
    turningAge: "يبلغ {age}",
    seriesEnded: "انتهى",
    enterTitleFirst: "الرجاء إدخال عنوان.",
    confirmDeleteCountdown: "حذف هذا العداد؟",
    selectedCount: "محدد",
    tutWelcomeTitle: "مرحبًا بك في Ambient OS 👋",
    tutWelcomeBody: "جولة سريعة فيما تقدمه هذه اللوحة. يمكنك التخطي في أي وقت — زر Escape أو علامة X يغلقان الجولة دائمًا.",
    tutClockTitle: "ساعتك الحية",
    tutClockBody: "العنصر المركزي. اسحب النقطة المتوهجة حول الحافة لضبط عد تنازلي أو منبه بسرعة.",
    tutWidgetsTitle: "لوحة الأدوات",
    tutWidgetsBody: "الطقس، أوقات الصلاة، الساعة العالمية، Spotify والمزيد يمكن أن تظهر هنا — تبدأ مغلقة افتراضيًا لذا الواجهة فارغة الآن. سنريك بعد قليل كيفية تفعيلها.",
    tutPanelTitle: "لوحة الإعدادات",
    tutPanelBody: "مرر المؤشر فوق هذه الحافة (أو المس على الأجهزة اللمسية) لإظهار لوحة الإعدادات.",
    tutWidgetManagerTitle: "إدارة الأدوات",
    tutWidgetManagerBody: "فعّل أو أوقف أي أداة من هنا، بما فيها مؤقت التركيز وسلاسل العادات وأسعار العملات الرقمية والأخبار - لكل منها أيقونة إعدادات خاصة بها بعد التفعيل. يتم حفظ اختيارك تلقائيًا.",
    tutAddTaskTitle: "المهام والروتين والعدادات",
    tutAddTaskBody: "أضف مهام لمرة واحدة، روتينات متكررة، أو عدادات تنازلية لأحداث قادمة — تظهر جميعها على وجه الساعة والجدول الزمني.",
    tutThemeTitle: "اجعلها خاصة بك",
    tutThemeBody: "اختر لون التمييز، نمط وجه الساعة، ونمط AM/PM الذي يناسب ذوقك.",
    tutCountdownTitle: "العدادات التنازلية",
    tutCountdownBody: "عدّ تنازليًا لأعياد الميلاد أو الرحلات أو أي تاريخ مستقبلي — ميلادي أو هجري. ثبّت المفضلة، أضف وسومًا، واحصل على تنبيه عند اقتراب الموعد.",
    tutLayoutTitle: "أي شاشة، أي جهاز",
    tutLayoutBody: "يتكيف التخطيط مع الكمبيوتر أو الهاتف أو الجهاز اللوحي أو التلفاز — يُكتشف تلقائيًا عند أول زيارة، أو اختره بنفسك. وضع التلفاز يدعم حتى الاقتران عبر مسح رمز QR بكاميرا هاتفك.",
    tutTheaterTitle: "وضع السينما",
    tutTheaterBody: "شغّل ملف فيديو محلي أو رابطًا — عائمًا أو أفقيًا أو ملء الشاشة — مع تعتيم بقية الشاشة حسب رغبتك.",
    tutQuotesTitle: "الاقتباسات المحيطة",
    tutQuotesBody: "يظهر اقتباس جديد كل 10 دقائق أسفل الشاشة. فعّله أو أوقفه من هنا في أي وقت.",
    tutChimesTitle: "الأصوات والرنات",
    tutChimesBody: "اختر الصوت الذي يُشغَّل عند انتهاء المؤقت، وبداية الحدث، ونهايته، والتذكيرات والتنبيهات. اضغط على أيقونة التشغيل لمعاينة أي من الرنات الاثنتي عشرة قبل الاختيار.",
    tutAccountTitle: "الحساب",
    tutAccountBody: "أنشئ حسابًا لمزامنة مهامك وعدّاداتك وإعداداتك عبر كل جهاز تسجّل الدخول منه. اختياري تمامًا — كل شيء يعمل محليًا بشكل طبيعي بدون حساب أيضًا.",
    tutTimelineTitle: "الجدول الزمني على مدار 24 ساعة",
    tutTimelineBody: "شريط حي أعلى الشاشة يعرض يومك بالكامل بنظرة واحدة.",
    tutZenTitle: "وضع التركيز",
    tutZenBody: "أخفِ كل اللوحات لعرض غامر بلا تشتيت. اضغط مرة أخرى لإعادة كل شيء.",
    tutFinishTitle: "أنت جاهز الآن!",
    tutFinishBody: "هذه كانت الجولة. استكشف، خصص، واستمتع بلوحتك الأمبيانت.",
    tutNext: "التالي",
    tutBack: "رجوع",
    tutFinish: "إنهاء",
    accountTitle: "الحساب",
    acctDobOptional: "تاريخ الميلاد (اختياري)",
    acctDobCalendarHijri: "التقويم الهجري",
    acctLogoutBtn: "تسجيل الخروج",
    acctSaveProfile: "حفظ الملف الشخصي",
    acctWelcomeText: "مرحبًا، {name}",
    acctProfileSaved: "تم حفظ الملف الشخصي.",
    acctLoginRequired: "الرجاء تسجيل الدخول أولاً.",
    acctSettingsTitle: "إعدادات الحساب",
    acctSettingsDone: "تم",
    acctChangePassword: "تغيير كلمة المرور",
    acctNewPasswordPlaceholder: "كلمة المرور الجديدة",
    acctConfirmPassword: "تأكيد كلمة المرور",
    acctChangePasswordBtn: "تغيير كلمة المرور",
    acctPasswordMismatch: "كلمتا المرور غير متطابقتين.",
    acctPasswordTooShort: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    acctPasswordChanged: "تم تغيير كلمة المرور.",
    theaterMode: "وضع السينما",
    theaterLocalFile: "ملف محلي",
    theaterFromUrl: "من رابط",
    theaterUrlPlaceholder: "https://... (رابط فيديو مباشر أو يوتيوب)",
    theaterLoad: "تحميل",
    theaterUrlNote: "روابط الفيديو المباشرة (.mp4، .webm) وروابط يوتيوب تعمل. صفحات خدمات البث (نتفليكس وغيرها) عادة لا يمكن تضمينها.",
    theaterLayout: "التخطيط",
    theaterFloating: "عائم",
    theaterLandscape: "أفقي",
    theaterFullscreen: "ملء الشاشة",
    theaterDimLevel: "مستوى التعتيم",
    theaterRoundedEdges: "زوايا مدورة",
    theaterSkipIntro: "تخطي المقدمة",
    theaterEnter: "بدء وضع السينما",
    theaterNoSource: "الرجاء اختيار ملف فيديو أو إدخال رابط أولاً.",
    theaterInvalidUrl: "تعذر تحميل هذا الرابط كفيديو.",
    screenLayout: "تخطيط الشاشة",
    layoutPc: "كمبيوتر",
    layoutPhone: "هاتف",
    layoutTablet: "لوحي",
    layoutTv: "تلفاز",
    layoutAutoDetect: "↺ إعادة الكشف التلقائي",
    tvScanLogin: "مسح لتسجيل الدخول",
    tvStartScan: "بدء مسح الكاميرا",
    tvScanNotSupported: "هذا المتصفح لا يدعم مسح الباركود.",
    tvScanRequesting: "جاري طلب إذن الكاميرا...",
    tvScanWaiting: "وجّه الكاميرا نحو رمز QR يحتوي على البريد|كلمة المرور",
    tvScanFound: "تم العثور على الرمز، جاري تسجيل الدخول...",
    tvScanError: "تعذر الوصول إلى الكاميرا.",
    tvScanBadFormat: "الرمز الممسوح ليس بصيغة البريد|كلمة المرور.",
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

/* Entity ids were previously raw Date.now(), which silently collides when two
   items are created inside the same millisecond (a real risk in the countdown
   import path, which creates in a loop). A duplicate id makes edit/delete act on
   whichever item matches first - i.e. the wrong one. This keeps ids numeric on
   purpose: they are local-only handles inside the per-user RLS-scoped blob, never
   exposed in a URL or used for cross-user lookup, so switching to UUID strings
   would buy no security while breaking every `id ===` comparison and every bare
   `onclick="fn(${id})"` interpolation against already-stored data. */
let lastGeneratedEntityId = 0;
function generateEntityId() {
  const now = Date.now();
  lastGeneratedEntityId = now > lastGeneratedEntityId ? now : lastGeneratedEntityId + 1;
  return lastGeneratedEntityId;
}

/* Returns a URL only if it uses a safe browsing scheme, otherwise ''. escapeHTML
   neutralizes markup characters but NOT URI schemes, so a link arriving from an
   external source (e.g. an RSS feed) could otherwise reach an href as
   "javascript:..." and run in this page's origin - where the Supabase session
   token lives in localStorage. Applied both when caching and when rendering, so
   entries cached before this check existed can't slip through either. */
function safeExternalUrl(url) {
  if (url == null) return '';
  const raw = String(url).trim();
  try {
    const scheme = new URL(raw, window.location.href).protocol;
    return (scheme === 'http:' || scheme === 'https:') ? raw : '';
  } catch (e) {
    return '';
  }
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
let azanReminderEnabled = localStorage.getItem('idleAzanReminderEnabled') !== '0';
function setAzanReminderEnabled(enabled) {
  azanReminderEnabled = enabled;
  localStorage.setItem('idleAzanReminderEnabled', enabled ? '1' : '0');
  if (!enabled) {
    ambientGlow.classList.remove("prayer-glow-active");
    if (clockInterruptedByPrayer) resumeClockFromPrayerInterruption();
  }
}

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
   2b. DEV MENU (opt-in via ?dev=1)
   ==========================================
   Previously the menu rendered by default and was hidden only after an async
   lookup to api.ipify.org resolved, so every visitor got a red QA panel flashing
   at them on load - and their IP was sent to a third party to decide it. Both are
   gone: CSS hides the menu outright and it only appears when explicitly asked for.
   The preference is remembered so the QA tools stay available across reloads
   without re-adding the query string. */
const devToolsEnabled = (function () {
  try {
    if (new URLSearchParams(location.search).get('dev') === '1') {
      sessionStorage.setItem('devToolsEnabled', '1');
      return true;
    }
    return sessionStorage.getItem('devToolsEnabled') === '1';
  } catch (e) {
    return false;
  }
})();
if (devToolsEnabled) document.body.classList.add('dev-tools-enabled');

/* ==========================================
   3. AMBIENT IDLE TRACKING
   ========================================== */
let clockFaceMode = localStorage.getItem('idleClockFace') === 'classic' ? 'classic' : 'default';
let clockSizePercent = parseInt(localStorage.getItem('idleClockSize') || '100', 10);
let displayTitleAutoHide = localStorage.getItem('idleDisplayTitleAutoHide') !== '0';

function resetIdleTimer() {
  lastInteractionTime = Date.now();
  scheduleDisplayTitleHide();
}
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('touchstart', resetIdleTimer);
window.addEventListener('pointerdown', resetIdleTimer);
window.addEventListener('wheel', resetIdleTimer, { passive: true });

/* ==========================================
   4. AUDIO CHIME & ZEN MODE
   ========================================== */
const CHIME_LIBRARY = [
  { id: 'classic', nameKey: 'chimeName_classic', notes: [{ freq: 880, type: 'sine', start: 0, dur: 1.5, gain: 0.1 }] },
  { id: 'softbell', nameKey: 'chimeName_softbell', notes: [{ freq: 660, type: 'sine', start: 0, dur: 1.2, gain: 0.09 }, { freq: 990, type: 'sine', start: 0.15, dur: 1.1, gain: 0.07 }] },
  { id: 'digitalbeep', nameKey: 'chimeName_digitalbeep', notes: [{ freq: 1000, type: 'square', start: 0, dur: 0.15, gain: 0.05 }, { freq: 1000, type: 'square', start: 0.22, dur: 0.15, gain: 0.05 }] },
  { id: 'marimba', nameKey: 'chimeName_marimba', notes: [{ freq: 523.25, type: 'triangle', start: 0, dur: 0.4, gain: 0.12 }] },
  { id: 'arpeggio', nameKey: 'chimeName_arpeggio', notes: [{ freq: 523.25, type: 'sine', start: 0, dur: 0.5, gain: 0.09 }, { freq: 659.25, type: 'sine', start: 0.12, dur: 0.5, gain: 0.09 }, { freq: 783.99, type: 'sine', start: 0.24, dur: 0.6, gain: 0.09 }] },
  { id: 'alertpulse', nameKey: 'chimeName_alertpulse', notes: [{ freq: 800, type: 'square', start: 0, dur: 0.12, gain: 0.06 }, { freq: 800, type: 'square', start: 0.18, dur: 0.12, gain: 0.06 }] },
  { id: 'softpiano', nameKey: 'chimeName_softpiano', notes: [{ freq: 440, type: 'triangle', start: 0, dur: 2.0, gain: 0.08 }] },
  { id: 'xylophone', nameKey: 'chimeName_xylophone', notes: [{ freq: 1046.5, type: 'triangle', start: 0, dur: 0.3, gain: 0.1 }] },
  { id: 'deepgong', nameKey: 'chimeName_deepgong', notes: [{ freq: 220, type: 'sine', start: 0, dur: 3.0, gain: 0.12 }] },
  { id: 'notifpop', nameKey: 'chimeName_notifpop', notes: [{ freq: 523.25, type: 'sine', start: 0, dur: 0.2, gain: 0.09 }, { freq: 659.25, type: 'sine', start: 0.1, dur: 0.3, gain: 0.09 }] },
  { id: 'zenbell', nameKey: 'chimeName_zenbell', notes: [{ freq: 528, type: 'sine', start: 0, dur: 2.5, gain: 0.07 }] },
  { id: 'retroblip', nameKey: 'chimeName_retroblip', notes: [{ freq: 600, type: 'square', start: 0, dur: 0.09, gain: 0.05 }, { freq: 800, type: 'square', start: 0.1, dur: 0.09, gain: 0.05 }, { freq: 1000, type: 'square', start: 0.2, dur: 0.12, gain: 0.05 }] }
];

function playToneSpec(spec) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    (spec.notes || []).forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = n.type || 'sine';
      const startAt = ctx.currentTime + (n.start || 0);
      const dur = n.dur || 1;
      osc.frequency.setValueAtTime(n.freq, startAt);
      gain.gain.setValueAtTime(n.gain != null ? n.gain : 0.1, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.05);
    });
  } catch (e) {
    console.error("Audio block", e);
  }
}

function playChimeById(id) {
  const spec = CHIME_LIBRARY.find(c => c.id === id) || CHIME_LIBRARY[0];
  playToneSpec(spec);
}

function getChimeForContext(context) {
  return localStorage.getItem('chimeSound_' + context) || 'classic';
}

function setChimeForContext(context, chimeId) {
  localStorage.setItem('chimeSound_' + context, chimeId);
  playChimeById(chimeId);
}

function previewChime(selectId) {
  const sel = document.getElementById(selectId);
  if (sel) playChimeById(sel.value);
}

function populateChimeSelects() {
  const map = { timerEnd: 'chimeSelectTimerEnd', eventStart: 'chimeSelectEventStart', eventEnd: 'chimeSelectEventEnd', alert: 'chimeSelectAlert', pomodoroComplete: 'chimeSelectPomodoro' };
  Object.keys(map).forEach(context => {
    const sel = document.getElementById(map[context]);
    if (!sel) return;
    sel.innerHTML = '';
    CHIME_LIBRARY.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.setAttribute('data-i18n', c.nameKey);
      opt.textContent = translations[lang][c.nameKey] || c.id;
      sel.appendChild(opt);
    });
    sel.value = getChimeForContext(context);
  });
}

function playChime(context) {
  playChimeById(getChimeForContext(context || 'alert'));
}
function toggleFocusMode() {
  document.body.classList.toggle('focus-mode');
}

function toggleSidePanelTouch(e) {
  if (e) e.stopPropagation();
  document.querySelector('.side-panel').classList.toggle('touch-open');
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
  if (!devToolsEnabled) return;
  const hidden = devMenu.classList.toggle('dev-menu-hidden');
  localStorage.setItem('devMenuHidden', hidden ? '1' : '0');
}
if (localStorage.getItem('devMenuHidden') === '1') {
  devMenu.classList.add('dev-menu-hidden');
}
if (localStorage.getItem('timelineHidden') === '1') {
  const tlEl = document.getElementById('timelineContainer');
  const tlBtn = document.getElementById('timelineToggleBtn');
  if (tlEl) tlEl.classList.add('tl-hidden');
  if (tlBtn) tlBtn.classList.remove('active-lang');
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
  if (document.getElementById('theaterOverlay').classList.contains('active')) { exitTheaterMode(); return; }
  if (document.getElementById('tutorialOverlay').classList.contains('active')) { endTutorial(); return; }
  if (document.getElementById('customDialogModal').classList.contains('active')) { resolveDialog(false); return; }
  if (document.getElementById('taskModal').classList.contains('active')) { closeTaskModal(); return; }
  if (document.getElementById('timetableModal').classList.contains('active')) { closeTimetable(); return; }
  if (document.getElementById('scheduleManagerModal').classList.contains('active')) { closeScheduleManager(); return; }
  if (document.getElementById('countdownModal').classList.contains('active')) { closeCountdownModal(); return; }
  if (document.getElementById('countdownManagerModal').classList.contains('active')) { closeCountdownManager(); return; }
  if (document.getElementById('pomodoroSettingsModal').classList.contains('active')) { closePomodoroSettings(); return; }
  if (document.getElementById('habitsSettingsModal').classList.contains('active')) { closeHabitsSettings(); return; }
  if (document.getElementById('cryptoSettingsModal').classList.contains('active')) { closeCryptoSettings(); return; }
  if (document.getElementById('rssSettingsModal').classList.contains('active')) { closeRssSettings(); return; }
  if (document.getElementById('accountSettingsModal').classList.contains('active')) { closeAccountSettings(); return; }
  if (document.getElementById('errorLogModal').classList.contains('active')) { closeErrorLog(); return; }
  if (document.getElementById('quickLinksSettingsModal').classList.contains('active')) { closeQuickLinksSettings(); return; }
});

/* ==========================================
   4b. FOCUS TRAP + AUTO-FOCUS FOR MODALS/OVERLAYS (keyboard + TV remote)
   ========================================== */
const MODAL_FOCUS_CONFIG = [
  { sel: '#tutorialOverlay', inner: '#tutorialTooltip' },
  { sel: '#theaterOverlay', inner: '#theaterWindow' },
  { sel: '#customDialogModal', inner: '.dialog-content' },
  { sel: '#taskModal', inner: '.modal-content' },
  { sel: '#countdownModal', inner: '.modal-content' },
  { sel: '#timetableModal', inner: '.timetable-container' },
  { sel: '#scheduleManagerModal', inner: '.timetable-container' },
  { sel: '#countdownManagerModal', inner: '.timetable-container' },
  { sel: '#pomodoroSettingsModal', inner: '.modal-content' },
  { sel: '#habitsSettingsModal', inner: '.modal-content' },
  { sel: '#cryptoSettingsModal', inner: '.modal-content' },
  { sel: '#rssSettingsModal', inner: '.modal-content' },
  { sel: '#accountSettingsModal', inner: '.modal-content' },
  { sel: '#errorLogModal', inner: '.modal-content' },
  { sel: '#quickLinksSettingsModal', inner: '.modal-content' }
];
function getFocusableElements(container) {
  return Array.from(container.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.disabled && el.getClientRects().length > 0);
}
function getActiveModalInner() {
  for (const cfg of MODAL_FOCUS_CONFIG) {
    const el = document.querySelector(cfg.sel);
    if (el && el.classList.contains('active')) return el.querySelector(cfg.inner) || el;
  }
  return null;
}
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const container = getActiveModalInner();
  if (!container) return;
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (!container.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
MODAL_FOCUS_CONFIG.forEach(cfg => {
  const el = document.querySelector(cfg.sel);
  if (!el) return;
  new MutationObserver(() => {
    if (el.classList.contains('active')) {
      setTimeout(() => {
        const inner = el.querySelector(cfg.inner) || el;
        const focusables = getFocusableElements(inner);
        if (focusables.length) focusables[0].focus();
      }, 60);
    }
  }).observe(el, { attributes: true, attributeFilter: ['class'] });
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
    id: editingTaskId || generateEntityId(),
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
  dailyGoals.push({ id: generateEntityId(), name, completed: false });
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
  playChime('alert');
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

const TASK_ELAPSED_OPACITY_FACTOR = 0.4;
// Splits a task's arc into an already-elapsed segment (same color, faded) and a
// still-to-come segment (same color, normal opacity) around the current time -
// used across every clock face style so elapsed time reads consistently.
function appendTaskArcWithElapsed(grp, r, startMins, endMins, endMinsRaw, task, normalOpacity, nowMins) {
  let effectiveNow = nowMins;
  if (effectiveNow < startMins) effectiveNow += 1440;
  const elapsedEnd = Math.min(Math.max(effectiveNow, startMins), endMins);
  if (elapsedEnd > startMins) {
    const elapsedPath = makeTaskArcPath(r, startMins, elapsedEnd, task.color, normalOpacity * TASK_ELAPSED_OPACITY_FACTOR);
    addTaskArcTitle(elapsedPath, task, startMins, endMinsRaw);
    grp.appendChild(elapsedPath);
  }
  if (endMins > elapsedEnd) {
    const remainingPath = makeTaskArcPath(r, elapsedEnd, endMins, task.color, normalOpacity);
    addTaskArcTitle(remainingPath, task, startMins, endMinsRaw);
    grp.appendChild(remainingPath);
  }
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
  const nowMins = getNowMins();
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
    const svgNS = "http://www.w3.org/2000/svg";

    const amRing = document.createElementNS(svgNS, "circle");
    amRing.setAttribute("cx", cx); amRing.setAttribute("cy", cy); amRing.setAttribute("r", amR);
    amRing.setAttribute("fill", "none");
    amRing.setAttribute("stroke", DUAL_TRACK_AM_COLOR);
    amRing.setAttribute("stroke-width", "2");
    amRing.setAttribute("stroke-dasharray", "1 4");
    amRing.setAttribute("stroke-linecap", "round");
    amRing.style.opacity = "0.28";
    grp.appendChild(amRing);

    const pmRing = document.createElementNS(svgNS, "circle");
    pmRing.setAttribute("cx", cx); pmRing.setAttribute("cy", cy); pmRing.setAttribute("r", pmR);
    pmRing.setAttribute("fill", "none");
    pmRing.setAttribute("stroke", DUAL_TRACK_PM_COLOR);
    pmRing.setAttribute("stroke-width", "2");
    pmRing.setAttribute("stroke-dasharray", "4 5");
    pmRing.setAttribute("stroke-linecap", "round");
    pmRing.style.opacity = "0.32";
    grp.appendChild(pmRing);

    ['am', 'pm'].forEach(period => {
      const group = todayTasks.filter(x => (period === 'am') === x.isAM);
      const r = period === 'am' ? amR : pmR;
      group.forEach(({ task, startMins, endMins, endMinsRaw }) => {
        appendTaskArcWithElapsed(grp, r, startMins, endMins, endMinsRaw, task, 0.8, nowMins);
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
      appendTaskArcWithElapsed(grp, radius + 8, startMins, endMins, endMinsRaw, task, opacity, nowMins);
    });
  } else if (arcStyleMode === 'daynight') {
    todayTasks.forEach(({ task, startMins, endMins, endMinsRaw, isAM }) => {
      appendTaskArcWithElapsed(grp, radius + 8, startMins, endMins, endMinsRaw, task, 0.8, nowMins);

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
      appendTaskArcWithElapsed(grp, radius + 8, startMins, endMins, endMinsRaw, task, 0.8, nowMins);
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
  if (widgetId === 'wgSpotify' && typeof updateSpotifyEqAudioState === 'function') updateSpotifyEqAudioState();
}
function toggleTimeline(btnEl) {
  const el = document.getElementById('timelineContainer');
  if (!el) return;
  const hidden = el.classList.toggle('tl-hidden');
  localStorage.setItem('timelineHidden', hidden ? '1' : '0');
  btnEl.classList.toggle('active-lang', !hidden);
}
const ALL_WIDGET_IDS = ['wgSchedule', 'wgWeather', 'wgPrayer', 'wgWorldClock', 'wgSpotify', 'wgLinks', 'wgCountdown', 'wgPomodoro', 'wgHabits', 'wgCrypto', 'wgRss'];
let visibleWidgets = new Set(safeParseJSON('idleVisibleWidgets', []));

function applyWidgetVisibility() {
  ALL_WIDGET_IDS.forEach(id => {
    const card = document.getElementById(id);
    if (card) card.classList.toggle('wg-boot-hidden', !visibleWidgets.has(id));
  });
  document.querySelectorAll('#widgetTogglesGrid .clock-toggle-btn').forEach(btn => {
    const match = (btn.getAttribute('onclick') || '').match(/toggleWidget\('([^']+)'/);
    if (match) btn.classList.toggle('active-lang', visibleWidgets.has(match[1]));
  });
}
function toggleWidget(widgetId, btnEl) {
  const widget = document.getElementById(widgetId);
  if (!widget) return;
  if (visibleWidgets.has(widgetId)) {
    visibleWidgets.delete(widgetId);
    widget.classList.add('wg-boot-hidden');
    btnEl.classList.remove('active-lang');
  } else {
    visibleWidgets.add(widgetId);
    widget.classList.remove('wg-boot-hidden');
    btnEl.classList.add('active-lang');
  }
  localStorage.setItem('idleVisibleWidgets', JSON.stringify(Array.from(visibleWidgets)));
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
/* The chosen face is persisted (it previously reset to Default on every reload) and
   mirrored onto #clock as a face-* class, which is what drives the Classic-only
   readout offset in CSS. */
function setClockFace(faceType, btnEl) {
  if (faceType !== 'classic') faceType = 'default';
  clockFaceMode = faceType;
  localStorage.setItem('idleClockFace', faceType);
  document.querySelectorAll('#clockFaceGrid .clock-toggle-btn').forEach(btn => btn.classList.remove('active-lang'));
  if (btnEl) btnEl.classList.add('active-lang');
  else {
    const match = document.querySelector(`#clockFaceGrid .clock-toggle-btn[onclick*="'${faceType}'"]`);
    if (match) match.classList.add('active-lang');
  }
  const classic = document.querySelector('.clock-face-classic');
  if (classic) {
    classic.style.display = faceType === 'classic' ? 'block' : 'none';
    classic.style.opacity = faceType === 'classic' ? '1' : '0';
  }
  const svg = document.getElementById('clock');
  if (svg) {
    svg.classList.remove('face-default', 'face-classic');
    svg.classList.add('face-' + faceType);
  }
}

/* Scales the main dial only. The SVG has a viewBox and no intrinsic width, so a
   percentage width shrinks it proportionally and it stays centred in the container. */
function setClockSize(val) {
  clockSizePercent = Math.max(60, Math.min(100, parseInt(val, 10) || 100));
  localStorage.setItem('idleClockSize', String(clockSizePercent));
  const svg = document.getElementById('clock');
  if (svg) svg.style.width = clockSizePercent + '%';
}

/* Display title auto-hide: fades the title out after a few seconds with no input.
   Deliberately separate from IDLE_TIMEOUT_MS, which is a 5-minute timer that clears
   an abandoned quick timer - a different concept on a completely different scale. */
const DISPLAY_TITLE_IDLE_MS = 5000;
let displayTitleIdleTimer = null;
function setDisplayTitleAutoHide(enabled) {
  displayTitleAutoHide = !!enabled;
  localStorage.setItem('idleDisplayTitleAutoHide', displayTitleAutoHide ? '1' : '0');
  scheduleDisplayTitleHide();
}
function scheduleDisplayTitleHide() {
  const el = document.getElementById('displayTitle');
  if (!el) return;
  if (displayTitleIdleTimer) { clearTimeout(displayTitleIdleTimer); displayTitleIdleTimer = null; }
  el.classList.remove('title-auto-hidden');
  if (!displayTitleAutoHide) return;
  displayTitleIdleTimer = setTimeout(() => {
    const cur = document.getElementById('displayTitle');
    if (cur && displayTitleAutoHide) cur.classList.add('title-auto-hidden');
  }, DISPLAY_TITLE_IDLE_MS);
}

function setArcStyle(mode, btnEl) {
  arcStyleMode = mode;
  localStorage.setItem('arcStyleMode', mode);
  document.querySelectorAll('#arcStyleGrid .clock-toggle-btn').forEach(b => b.classList.remove('active-lang'));
  btnEl.classList.add('active-lang');
  renderTaskArcs();
}

function getContrastColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#ffffff';
}

function applyTheme(themeObj) {
  currentTheme = themeObj;
  localStorage.setItem('idleTheme', themeObj.name);
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
  const dot = document.querySelector(`.theme-dot[data-key="${themeObj.name}"]`);
  if (dot) dot.classList.add('active');
  document.documentElement.style.setProperty('--accent', currentTheme.handle);
  document.documentElement.style.setProperty('--accent-contrast', getContrastColor(currentTheme.handle));
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
  renderCountdownWidget();
  populateCountdownTagFilter();
  if (document.getElementById('countdownModal').classList.contains('active')) {
    document.getElementById('cdModalHeaderTitle').textContent = editingCountdownId ? translations[lang].editCountdown : translations[lang].newCountdown;
  }
  if (document.getElementById('countdownManagerModal').classList.contains('active')) renderCountdownManagerList();
  if (tutorialActive) showTutorialStep(tutorialStepIndex);
  if (document.getElementById('quoteBarText')) showRandomQuote();
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
    wName.classList.add("prayer-text-highlight");
    wName.textContent = translations[lang].iqamaFor + pName;
    wTime.textContent = "";
    const diffMs = iqamaMs - nowMs;
    const mins = Math.floor(diffMs / 60000).toString().padStart(2, '0');
    const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
    wCount.textContent = toNum(`(${mins}:${secs})`);
    wCount.style.color = "#FFD700";

    if (azanReminderEnabled) {
      ambientGlow.classList.add("prayer-glow-active");
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
    }
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
  playChime('eventStart');
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
  playChime('eventEnd');
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
  renderTaskArcs();
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
        if (!clockInterruptedByPrayer) {
          applyActiveTaskToClock(t, now);
          if (t.isBirthdayAuto) triggerConfetti();
        }
      }
    }
  });
  if (!foundActive && activeTaskObj !== null) {
    const wasBirthday = !!activeTaskObj.isBirthdayAuto;
    activeTaskObj = null;
    if (!clockInterruptedByPrayer) {
      resetClockToStandby();
      if (!wasBirthday) triggerShootingStar();
    }
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
    checkCountdownNotifications(new Date(now));
    updateCountdownLiveTimers(new Date(now));
    pomodoroTick();
    checkHabitsDayRollover();
    if (spotifyToken) { updateSpotifyProgressDisplay(); updateSpotifyLyricsHighlight(); }
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
        if (!activeTaskObj) playChime('timerEnd');
        if (isSpotifyPlaying) spotifyPause();
      } else {
        timerDurationMs = diffMs;
      }
    } else {
      diffMs = timerDurationMs;
    }

    if (originalDurationMs > 0) {
      localStorage.setItem('idleQuickTimerState', JSON.stringify({ isTimerRunning, timerEndTime, timerDurationMs, originalDurationMs, rawTimerDurationMs }));
    } else {
      localStorage.removeItem('idleQuickTimerState');
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
    updateDualTrackLiveElements(now, nowMins);
  } catch (error) {
    console.warn("Live Timer safely bypassed an error:", error);
  }
}

function updateDualTrackLiveElements(now, nowMins) {
  const marker = document.getElementById('dualTrackLiveMarker');
  const progressPath = document.getElementById('dualTrackActiveProgress');
  if (!marker || !progressPath) return;
  if (arcStyleMode !== 'dualtrack') {
    marker.style.opacity = '0';
    progressPath.style.opacity = '0';
    return;
  }
  const nowIsAM = new Date(now).getHours() < 12;
  const ringR = nowIsAM ? DUAL_TRACK_AM_R : DUAL_TRACK_PM_R;
  const ringColor = nowIsAM ? DUAL_TRACK_AM_COLOR : DUAL_TRACK_PM_COLOR;
  const angle = minsToAngle(nowMins);
  const pos = polarToCartesian(cx, cy, ringR, angle);

  marker.style.opacity = '1';
  marker.style.color = ringColor;
  document.getElementById('dtMarkerGlow').setAttribute('cx', pos.x);
  document.getElementById('dtMarkerGlow').setAttribute('cy', pos.y);
  document.getElementById('dtMarkerCore').setAttribute('cx', pos.x);
  document.getElementById('dtMarkerCore').setAttribute('cy', pos.y);
  const iconEl = document.getElementById('dtMarkerIcon');
  iconEl.setAttribute('href', nowIsAM ? '#icon-sun' : '#icon-moon');
  iconEl.setAttribute('x', pos.x - 4);
  iconEl.setAttribute('y', pos.y - 4);

  if (activeTaskObj && !clockInterruptedByPrayer) {
    const [sH, sM] = activeTaskObj.start.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const taskR = sH < 12 ? DUAL_TRACK_AM_R : DUAL_TRACK_PM_R;
    const sAng = minsToAngle(startMins);
    let eAng = angle;
    if (eAng <= sAng) eAng += 360;
    const progressColor = activeTaskObj.color || ringColor;
    progressPath.setAttribute('d', describeArc(cx, cy, taskR, sAng, eAng));
    progressPath.setAttribute('stroke', progressColor);
    progressPath.style.opacity = '1';
    progressPath.style.filter = `drop-shadow(0 0 5px ${progressColor})`;
  } else {
    progressPath.style.opacity = '0';
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
endHandle.addEventListener('keydown', (e) => {
  if (isBroken) return;
  const stepMs = 5 * 60 * 1000;
  const bigStepMs = 30 * 60 * 1000;
  let delta = 0;
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') delta = e.shiftKey ? bigStepMs : stepMs;
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') delta = e.shiftKey ? -bigStepMs : -stepMs;
  else return;
  e.preventDefault();
  resetIdleTimer();
  const base = timerDurationMs || 0;
  timerDurationMs = Math.max(0, Math.min(43200000, base + delta));
  rawTimerDurationMs = timerDurationMs;
  originalDurationMs = timerDurationMs;
  isTimerRunning = timerDurationMs > 0;
  if (isTimerRunning) timerEndTime = Date.now() + timerDurationMs;
  endHandle.setAttribute('aria-valuenow', Math.round(timerDurationMs / 60000));
  endHandle.setAttribute('aria-valuetext', msToClock(timerDurationMs));
  updateLiveTimer();
});

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
async function refreshSpotifyToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return false;
  try {
    const body = await fetch("https://accounts.spotify.com/api/token", {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'refresh_token', refresh_token: refreshToken })
    });
    const response = await body.json();
    if (response.access_token) {
      spotifyToken = response.access_token;
      spotifyTokenExpiry = Date.now() + (response.expires_in * 1000);
      localStorage.setItem('spotify_token', spotifyToken);
      localStorage.setItem('spotify_token_expiry', spotifyTokenExpiry);
      if (response.refresh_token) localStorage.setItem('spotify_refresh_token', response.refresh_token);
      return true;
    }
  } catch (err) { /* network failure, treat as not refreshed */ }
  return false;
}
async function fetchSpotifyAPI(endpoint, method = 'GET', body = null) {
  if (!spotifyToken) return null;
  if (Date.now() >= Number(spotifyTokenExpiry)) {
    const refreshed = await refreshSpotifyToken();
    if (!refreshed) return null;
  }
  try {
    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      method: method,
      headers: { 'Authorization': `Bearer ${spotifyToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });
    if (res.status === 401) {
      const refreshed = await refreshSpotifyToken();
      if (!refreshed) return null;
      const retryRes = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        method: method,
        headers: { 'Authorization': `Bearer ${spotifyToken}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
      });
      if (retryRes.status === 204) return { no_content: true };
      if (retryRes.ok && method === 'GET') return await retryRes.json();
      return retryRes.ok ? { success: true } : null;
    }
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
  const miniArtEl = document.getElementById("spMiniArt");
  const playBtn = document.getElementById("spWidgetPlay");
  const fillEl = document.getElementById("spProgressFill");
  const elapsedEl = document.getElementById("spWidgetElapsed");
  const durationEl = document.getElementById("spWidgetDuration");
  const volumeEl = document.getElementById("spVolumeSlider");
  if (!data || data.no_content || !data.item) {
    trackEl.textContent = translations[lang].offline;
    artistEl.textContent = translations[lang].noActiveDevice;
    artEl.style.display = 'none';
    if (miniArtEl) miniArtEl.style.display = 'none';
    isSpotifyPlaying = false;
    const eqBarsOffline = document.getElementById('spEqBars');
    if (eqBarsOffline) eqBarsOffline.classList.remove('sp-eq-playing');
    stopSpotifyEqMic();
    if (fillEl) fillEl.style.width = '0%';
    if (elapsedEl) elapsedEl.textContent = '0:00';
    if (durationEl) durationEl.textContent = '0:00';
    spotifyDurationMs = 0;
    spotifyLyricsTrackKey = null;
    spotifyLyricsData = null;
    renderSpotifyLyricsUI();
    return;
  }
  trackEl.textContent = data.item.name;
  artistEl.textContent = data.item.artists.map(a => a.name).join(', ');
  if (data.item.album.images.length > 0) {
    artEl.src = data.item.album.images[0].url;
    artEl.style.display = 'block';
    if (miniArtEl) { miniArtEl.src = data.item.album.images[0].url; miniArtEl.style.display = spotifyArtMode === 2 ? 'none' : 'block'; }
  }
  isSpotifyPlaying = data.is_playing;
  playBtn.innerHTML = svgIcon(isSpotifyPlaying ? 'icon-pause' : 'icon-play');
  const eqBars = document.getElementById('spEqBars');
  if (eqBars) eqBars.classList.toggle('sp-eq-playing', isSpotifyPlaying);
  updateSpotifyEqAudioState();

  if (fillEl && data.item.duration_ms) {
    const pct = Math.min(100, ((data.progress_ms || 0) / data.item.duration_ms) * 100);
    fillEl.style.width = `${pct}%`;
  }
  if (elapsedEl) elapsedEl.textContent = toNum(msToClock(data.progress_ms || 0));
  if (durationEl) durationEl.textContent = toNum(msToClock(data.item.duration_ms || 0));
  if (volumeEl && !spVolumeDragging && data.device && typeof data.device.volume_percent === 'number') {
    volumeEl.value = data.device.volume_percent;
    setVolumeSliderFill(volumeEl);
  }

  spotifyProgressMsBase = data.progress_ms || 0;
  spotifyProgressBaseTime = Date.now();
  spotifyDurationMs = data.item.duration_ms || 0;
  const trackKey = `${data.item.name}::${data.item.artists.map(a => a.name).join(',')}`;
  if (trackKey !== spotifyLyricsTrackKey) {
    spotifyLyricsTrackKey = trackKey;
    fetchSpotifyLyrics(data.item);
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

function setVolumeSliderFill(el) {
  if (!el) return;
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--input-bg) ${pct}%, var(--input-bg) 100%)`;
}
function spotifyVolumeInput(el) {
  spVolumeDragging = true;
  setVolumeSliderFill(el || document.getElementById('spVolumeSlider'));
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
   13a. SPOTIFY ALBUM ART SWIPE (cover / lyrics / hidden)
   ========================================== */
let spotifyArtMode = parseInt(localStorage.getItem('spotifyArtMode') || '0', 10);
let spotifyLyricsTrackKey = null;
let spotifyLyricsData = null;
let spotifyLyricsFetchToken = 0;
let spotifyProgressMsBase = 0;
let spotifyProgressBaseTime = Date.now();
let spotifyDurationMs = 0;
let spotifyActiveLyricIndex = -1;

function setSpotifyArtMode(mode) {
  spotifyArtMode = mode;
  localStorage.setItem('spotifyArtMode', String(mode));
  const track = document.getElementById('spArtTrack');
  if (track) track.style.transform = `translateX(-${mode * 33.3333}%)`;
  document.querySelectorAll('#spArtDots .sp-art-dot').forEach((dot, i) => dot.classList.toggle('active', i === mode));
  const miniArtEl = document.getElementById('spMiniArt');
  if (miniArtEl && miniArtEl.src) miniArtEl.style.display = mode === 2 ? 'none' : 'block';
  updateSpotifyEqAudioState();
}

/* 13b. SPOTIFY EQUALIZER - REAL AUDIO VIA MICROPHONE
   This page only remote-controls Spotify playback (Web API), it never
   receives the actual audio stream, so there is no track data to analyze
   here directly. Listening to the room's sound through the mic (Web Audio
   AnalyserNode) is the only way to drive genuinely real-time bars without
   requiring Premium or making this tab a Spotify Connect playback device. */
let spEqAudioCtx = null;
let spEqAnalyser = null;
let spEqStream = null;
let spEqRafId = null;
let spEqMicDenied = false;
let spEqFreqData = null;

function updateSpotifyEqAudioState() {
  const card = document.getElementById('wgSpotify');
  const shouldBeActive = spotifyArtMode === 2 && card && card.classList.contains('expanded');
  if (shouldBeActive) startSpotifyEqMic(); else stopSpotifyEqMic();
}

async function startSpotifyEqMic() {
  const hint = document.getElementById('spEqMicHint');
  if (spEqAudioCtx) return;
  if (spEqMicDenied) {
    if (hint) { hint.textContent = lang === 'en' ? 'Mic unavailable - showing animated pulse' : 'الميكروفون غير متاح - يتم عرض نبض متحرك'; hint.classList.add('visible'); }
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { spEqMicDenied = true; updateSpotifyEqAudioState(); return; }
  try {
    spEqStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    spEqMicDenied = true;
    if (hint) { hint.textContent = lang === 'en' ? 'Mic access denied - showing animated pulse' : 'تم رفض إذن الميكروفون - يتم عرض نبض متحرك'; hint.classList.add('visible'); }
    return;
  }
  if (spotifyArtMode !== 2 || !document.getElementById('wgSpotify')?.classList.contains('expanded')) { spEqStream.getTracks().forEach(t => t.stop()); spEqStream = null; return; }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  spEqAudioCtx = new AudioCtx();
  const source = spEqAudioCtx.createMediaStreamSource(spEqStream);
  spEqAnalyser = spEqAudioCtx.createAnalyser();
  spEqAnalyser.fftSize = 64;
  spEqAnalyser.smoothingTimeConstant = 0.75;
  source.connect(spEqAnalyser);
  spEqFreqData = new Uint8Array(spEqAnalyser.frequencyBinCount);
  const bars = document.getElementById('spEqBars');
  if (bars) bars.classList.add('sp-eq-real');
  if (hint) { hint.textContent = lang === 'en' ? 'Real-time from your mic' : 'مباشر من الميكروفون'; hint.classList.add('visible'); }
  spEqAnimateBars();
}

function spEqAnimateBars() {
  if (!spEqAnalyser) return;
  spEqAnalyser.getByteFrequencyData(spEqFreqData);
  const bars = document.querySelectorAll('#spEqBars span');
  const binCount = spEqFreqData.length;
  const bucketSize = Math.max(1, Math.floor(binCount / bars.length));
  bars.forEach((bar, i) => {
    let sum = 0;
    const start = i * bucketSize;
    for (let j = start; j < start + bucketSize; j++) sum += spEqFreqData[j] || 0;
    const avg = sum / bucketSize;
    bar.style.height = `${8 + (avg / 255) * 36}px`;
    bar.style.opacity = String(0.55 + (avg / 255) * 0.45);
  });
  spEqRafId = requestAnimationFrame(spEqAnimateBars);
}

function stopSpotifyEqMic() {
  if (spEqRafId) { cancelAnimationFrame(spEqRafId); spEqRafId = null; }
  if (spEqStream) { spEqStream.getTracks().forEach(t => t.stop()); spEqStream = null; }
  if (spEqAudioCtx) { spEqAudioCtx.close().catch(() => {}); spEqAudioCtx = null; }
  spEqAnalyser = null;
  const bars = document.getElementById('spEqBars');
  if (bars) {
    bars.classList.remove('sp-eq-real');
    bars.querySelectorAll('span').forEach(s => { s.style.height = ''; s.style.opacity = ''; });
  }
  const hint = document.getElementById('spEqMicHint');
  if (hint) hint.classList.remove('visible');
}

function parseLRC(text) {
  const lines = text.split('\n');
  const timeRe = /\[(\d{2}):(\d{2}(?:\.\d+)?)\]/g;
  const result = [];
  lines.forEach(line => {
    const matches = [...line.matchAll(timeRe)];
    if (matches.length === 0) return;
    const content = line.replace(timeRe, '').trim();
    if (!content) return;
    matches.forEach(m => {
      const mins = parseInt(m[1], 10), secs = parseFloat(m[2]);
      result.push({ time: mins * 60 + secs, text: content });
    });
  });
  return result.sort((a, b) => a.time - b.time);
}

function renderSpotifyLyricsUI() {
  const inner = document.getElementById('spLyricsInner');
  if (!inner) return;
  inner.innerHTML = '';
  spotifyActiveLyricIndex = -1;
  if (!spotifyLyricsData || spotifyLyricsData === 'none') {
    const empty = document.createElement('div');
    empty.className = 'sp-lyrics-empty';
    empty.textContent = lang === 'en' ? 'No lyrics found for this track' : 'لا توجد كلمات لهذه الأغنية';
    inner.appendChild(empty);
    return;
  }
  if (spotifyLyricsData.plain) {
    const p = document.createElement('div');
    p.className = 'sp-lyrics-line active';
    p.style.whiteSpace = 'pre-line';
    p.textContent = spotifyLyricsData.plain;
    inner.appendChild(p);
    return;
  }
  spotifyLyricsData.forEach(line => {
    const el = document.createElement('div');
    el.className = 'sp-lyrics-line';
    el.textContent = line.text;
    inner.appendChild(el);
  });
}

async function fetchSpotifyLyrics(item) {
  const myToken = ++spotifyLyricsFetchToken;
  spotifyLyricsData = null;
  renderSpotifyLyricsUI();
  const params = new URLSearchParams({
    track_name: item.name,
    artist_name: (item.artists || []).map(a => a.name).join(', '),
    album_name: (item.album && item.album.name) || '',
    duration: Math.round((item.duration_ms || 0) / 1000)
  });
  try {
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (myToken !== spotifyLyricsFetchToken) return;
    if (!res.ok) { spotifyLyricsData = 'none'; renderSpotifyLyricsUI(); return; }
    const data = await res.json();
    if (myToken !== spotifyLyricsFetchToken) return;
    if (data.syncedLyrics) spotifyLyricsData = parseLRC(data.syncedLyrics);
    else if (data.plainLyrics) spotifyLyricsData = { plain: data.plainLyrics };
    else spotifyLyricsData = 'none';
  } catch (e) {
    if (myToken !== spotifyLyricsFetchToken) return;
    spotifyLyricsData = 'none';
  }
  renderSpotifyLyricsUI();
}

function updateSpotifyProgressDisplay() {
  if (!spotifyDurationMs) return;
  const elapsedMs = isSpotifyPlaying ? spotifyProgressMsBase + (Date.now() - spotifyProgressBaseTime) : spotifyProgressMsBase;
  const clamped = Math.max(0, Math.min(elapsedMs, spotifyDurationMs));
  const fillEl = document.getElementById('spProgressFill');
  const elapsedEl = document.getElementById('spWidgetElapsed');
  if (fillEl) fillEl.style.width = `${(clamped / spotifyDurationMs) * 100}%`;
  if (elapsedEl) elapsedEl.textContent = toNum(msToClock(clamped));
}
function updateSpotifyLyricsHighlight() {
  if (!Array.isArray(spotifyLyricsData) || spotifyLyricsData.length === 0) return;
  const inner = document.getElementById('spLyricsInner');
  if (!inner) return;
  const elapsedMs = isSpotifyPlaying ? spotifyProgressMsBase + (Date.now() - spotifyProgressBaseTime) : spotifyProgressMsBase;
  const elapsedSec = elapsedMs / 1000;
  let idx = -1;
  for (let i = 0; i < spotifyLyricsData.length; i++) {
    if (spotifyLyricsData[i].time <= elapsedSec) idx = i;
    else break;
  }
  if (idx === spotifyActiveLyricIndex) return;
  spotifyActiveLyricIndex = idx;
  const lines = inner.querySelectorAll('.sp-lyrics-line');
  lines.forEach((el, i) => el.classList.toggle('active', i === idx));
  if (idx >= 0 && lines[idx]) {
    const offset = lines[idx].offsetTop - inner.parentElement.clientHeight / 2 + lines[idx].clientHeight / 2;
    inner.style.transform = `translateY(-${Math.max(0, offset)}px)`;
  }
}

(function initSpotifyArtSwipe() {
  const swipe = document.getElementById('spArtSwipe');
  const track = document.getElementById('spArtTrack');
  if (!swipe || !track) return;
  let startX = 0, currentX = 0, dragging = false;
  const onStart = (x) => { dragging = true; startX = x; currentX = x; track.classList.add('dragging'); };
  const onMove = (x) => {
    if (!dragging) return;
    currentX = x;
    const deltaPct = ((currentX - startX) / swipe.clientWidth) * 33.3333;
    track.style.transform = `translateX(calc(-${spotifyArtMode * 33.3333}% + ${currentX - startX}px))`;
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    const deltaX = currentX - startX;
    let newMode = spotifyArtMode;
    if (deltaX > 40 && spotifyArtMode > 0) newMode = spotifyArtMode - 1;
    else if (deltaX < -40 && spotifyArtMode < 2) newMode = spotifyArtMode + 1;
    setSpotifyArtMode(newMode);
  };
  swipe.addEventListener('mousedown', (e) => { onStart(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => onMove(e.clientX));
  window.addEventListener('mouseup', onEnd);
  swipe.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
  swipe.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  swipe.addEventListener('touchend', onEnd);
})();

/* ==========================================
   13b. COUNTDOWN WIDGET (mimics "Countdown" by Find Appiness)
   ========================================== */
let countdownEvents = safeParseJSON('idleCountdowns', []);
let editingCountdownId = null;
let countdownSortMode = localStorage.getItem('countdownSort') || 'closest';
let selectedCountdownIds = new Set();
let cdSelectedIcon = 'star';
let cdSelectedColor = '#1e90ff';
const COUNTDOWN_COLORS = ['#ff4757', '#ffa502', '#eccc68', '#7bed9f', '#2ed573', '#1e90ff', '#5352ed', '#3742fa', '#9b59b6', '#ff6b81', '#ffffff', '#888888'];

function saveCountdownsToStorage() {
  localStorage.setItem('idleCountdowns', JSON.stringify(countdownEvents));
}
function getCountdownTargetDate(ev) {
  return new Date(`${ev.date}T${ev.time || '00:00'}:00`);
}
function isWeekendDate(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
function getDaysRemaining(targetDate, fromDate) {
  const startFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const startTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.round((startTarget - startFrom) / 86400000);
}
function getNextCountdownOccurrence(ev, fromDate) {
  const base = getCountdownTargetDate(ev);
  const repeatEnd = ev.repeatEnd ? new Date(`${ev.repeatEnd}T23:59:59`) : null;
  const occurrence = new Date(base);

  if (ev.repeat === 'none' && !ev.isBirthday) {
    if (ev.workdaysOnly) { while (isWeekendDate(occurrence)) occurrence.setDate(occurrence.getDate() + 1); }
    return { date: occurrence, ended: false };
  }

  const effectiveRepeat = ev.isBirthday ? 'yearly' : ev.repeat;
  let ended = false;
  let guard = 0;
  while (occurrence < fromDate && guard < 2000) {
    guard++;
    if (effectiveRepeat === 'daily') occurrence.setDate(occurrence.getDate() + 1);
    else if (effectiveRepeat === 'weekly') occurrence.setDate(occurrence.getDate() + 7);
    else if (effectiveRepeat === 'monthly') occurrence.setMonth(occurrence.getMonth() + 1);
    else if (effectiveRepeat === 'yearly') occurrence.setFullYear(occurrence.getFullYear() + 1);
    else break;
    if (repeatEnd && occurrence > repeatEnd) { ended = true; break; }
  }
  if (ev.workdaysOnly) { while (isWeekendDate(occurrence)) occurrence.setDate(occurrence.getDate() + 1); }
  return { date: occurrence, ended };
}

function renderCountdownPickers() {
  const iconGrid = document.getElementById('cdIconGrid');
  const colorGrid = document.getElementById('cdColorGrid');
  if (iconGrid && iconGrid.children.length === 0) {
    Object.keys(ICON_LIBRARY).forEach(key => {
      const el = document.createElement('div');
      el.className = 'icon-option';
      el.dataset.icon = key;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', key.replace(/-/g, ' '));
      el.innerHTML = svgIcon(ICON_LIBRARY[key].symbol);
      el.addEventListener('click', () => selectCountdownIcon(key, el));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      iconGrid.appendChild(el);
    });
  }
  if (colorGrid && colorGrid.children.length === 0) {
    COUNTDOWN_COLORS.forEach(hex => {
      const el = document.createElement('div');
      el.className = 'color-swatch';
      el.style.color = hex;
      el.dataset.color = hex;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Color ${hex}`);
      el.addEventListener('click', () => selectCountdownColor(hex, el));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
      colorGrid.appendChild(el);
    });
  }
}
function selectCountdownIcon(icon, el) {
  cdSelectedIcon = icon;
  document.querySelectorAll('#cdIconGrid .icon-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}
function selectCountdownColor(color, el) {
  cdSelectedColor = color;
  document.querySelectorAll('#cdColorGrid .color-swatch').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

function handleCountdownBirthdayToggle() {
  const isBday = document.getElementById('cdIsBirthday').checked;
  document.getElementById('cdRepeatBlock').style.display = isBday ? 'none' : 'block';
  if (isBday) document.getElementById('cdRepeatEndBlock').style.display = 'none';
  else handleCountdownRepeatChange();
}
function handleCountdownRepeatChange() {
  const repeat = document.getElementById('cdRepeat').value;
  document.getElementById('cdRepeatEndBlock').style.display = repeat === 'none' ? 'none' : 'block';
}

function openCountdownModal(id = null) {
  editingCountdownId = id;
  const ev = id ? countdownEvents.find(e => e.id === id) : null;
  document.getElementById('cdModalHeaderTitle').textContent = ev ? translations[lang].editCountdown : translations[lang].newCountdown;
  document.getElementById('cdDeleteBtn').style.display = ev ? 'block' : 'none';
  document.getElementById('cdShareBtn').style.display = ev ? 'block' : 'none';
  document.getElementById('cdTitle').value = ev ? ev.title : '';
  const today = new Date();
  const tzOffset = today.getTimezoneOffset() * 60000;
  const todayISO = (new Date(today - tzOffset)).toISOString().split('T')[0];
  document.getElementById('cdDate').value = ev ? ev.date : todayISO;
  document.getElementById('cdTime').value = ev ? (ev.time || '09:00') : '09:00';
  document.getElementById('cdIsBirthday').checked = ev ? !!ev.isBirthday : false;
  document.getElementById('cdRepeat').value = ev ? (ev.repeat || 'none') : 'none';
  document.getElementById('cdRepeatEnd').value = ev ? (ev.repeatEnd || '') : '';
  document.getElementById('cdWorkdaysOnly').checked = ev ? !!ev.workdaysOnly : false;
  document.getElementById('cdPinned').checked = ev ? !!ev.pinned : false;
  document.getElementById('cdTags').value = ev && ev.tags ? ev.tags.join(', ') : '';
  document.getElementById('cdNotes').value = ev ? (ev.notes || '') : '';
  document.getElementById('cdNotifyAtTime').checked = ev ? !!ev.notifyAtTime : false;
  document.getElementById('cdNotifyDayBefore').checked = ev ? !!ev.notifyDayBefore : false;
  document.getElementById('cdNotifyWeekBefore').checked = ev ? !!ev.notifyWeekBefore : false;
  handleCountdownBirthdayToggle();

  renderCountdownPickers();
  const iconToSelect = ev ? resolveIconId(ev.icon) : 'star';
  const iconEl = document.querySelector(`#cdIconGrid .icon-option[data-icon="${iconToSelect}"]`) || document.querySelector('#cdIconGrid .icon-option');
  if (iconEl) selectCountdownIcon(iconToSelect, iconEl);
  const colorToSelect = ev ? (ev.color || '#1e90ff') : '#1e90ff';
  const colorEl = document.querySelector(`#cdColorGrid .color-swatch[data-color="${colorToSelect}"]`) || document.querySelector('#cdColorGrid .color-swatch');
  if (colorEl) selectCountdownColor(colorToSelect, colorEl);

  document.getElementById('countdownModal').classList.add('active');
}
function closeCountdownModal() {
  document.getElementById('countdownModal').classList.remove('active');
}

async function saveCountdownFromModal() {
  const title = document.getElementById('cdTitle').value.trim();
  if (!title) { await customAlert(translations[lang].enterTitleFirst); return; }
  const isBirthday = document.getElementById('cdIsBirthday').checked;
  const repeat = isBirthday ? 'yearly' : document.getElementById('cdRepeat').value;
  const tags = document.getElementById('cdTags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const notifyAtTime = document.getElementById('cdNotifyAtTime').checked;
  const notifyDayBefore = document.getElementById('cdNotifyDayBefore').checked;
  const notifyWeekBefore = document.getElementById('cdNotifyWeekBefore').checked;
  if ((notifyAtTime || notifyDayBefore || notifyWeekBefore) && window.Notification && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) {}
  }
  const ev = {
    id: editingCountdownId || generateEntityId(),
    title,
    date: document.getElementById('cdDate').value,
    time: document.getElementById('cdTime').value || '00:00',
    isBirthday,
    repeat,
    repeatEnd: repeat !== 'none' ? document.getElementById('cdRepeatEnd').value : '',
    workdaysOnly: document.getElementById('cdWorkdaysOnly').checked,
    pinned: document.getElementById('cdPinned').checked,
    icon: cdSelectedIcon,
    color: cdSelectedColor,
    tags,
    notes: document.getElementById('cdNotes').value.trim(),
    notifyAtTime,
    notifyDayBefore,
    notifyWeekBefore
  };
  if (editingCountdownId) {
    const idx = countdownEvents.findIndex(e => e.id === editingCountdownId);
    if (idx !== -1) countdownEvents[idx] = ev;
  } else {
    countdownEvents.push(ev);
  }
  saveCountdownsToStorage();
  closeCountdownModal();
  populateCountdownTagFilter();
  renderCountdownWidget();
  renderCountdownManagerList();
}

async function deleteCountdownFromModal() {
  if (!editingCountdownId) return;
  await deleteCountdownById(editingCountdownId);
  closeCountdownModal();
}
async function deleteCountdownById(id) {
  const confirmed = await customConfirm(translations[lang].confirmDeleteCountdown, undefined, true);
  if (!confirmed) return;
  countdownEvents = countdownEvents.filter(e => e.id !== id);
  selectedCountdownIds.delete(id);
  saveCountdownsToStorage();
  populateCountdownTagFilter();
  renderCountdownWidget();
  renderCountdownManagerList();
}
function togglePinCountdown(id) {
  const ev = countdownEvents.find(e => e.id === id);
  if (!ev) return;
  ev.pinned = !ev.pinned;
  saveCountdownsToStorage();
  renderCountdownWidget();
  renderCountdownManagerList();
}

async function shareCountdownLink() {
  if (!editingCountdownId) return;
  const ev = countdownEvents.find(e => e.id === editingCountdownId);
  if (!ev) return;
  const payload = { title: ev.title, icon: ev.icon, color: ev.color, date: ev.date, time: ev.time, notes: ev.notes, isBirthday: ev.isBirthday, repeat: ev.repeat, repeatEnd: ev.repeatEnd, workdaysOnly: ev.workdaysOnly, tags: ev.tags };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${window.location.origin}${window.location.pathname}?importCountdown=${encoded}`;
  try {
    await navigator.clipboard.writeText(url);
    await customAlert(translations[lang].linkCopied);
  } catch (e) {
    await customPrompt(translations[lang].shareCountdown, url, translations[lang].shareCountdown);
  }
}
async function checkCountdownImportFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('importCountdown');
  if (!encoded) return;
  window.history.replaceState({}, document.title, window.location.pathname);
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    const msg = translations[lang].importCountdownMsg.replace('{title}', payload.title);
    const confirmed = await customConfirm(msg, translations[lang].importCountdownTitle);
    if (!confirmed) return;
    countdownEvents.push({
      id: generateEntityId(),
      title: payload.title || 'Untitled',
      icon: payload.icon || 'star',
      color: payload.color || '#1e90ff',
      date: payload.date || new Date().toISOString().split('T')[0],
      time: payload.time || '00:00',
      notes: payload.notes || '',
      isBirthday: !!payload.isBirthday,
      repeat: payload.repeat || 'none',
      repeatEnd: payload.repeatEnd || '',
      workdaysOnly: !!payload.workdaysOnly,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      pinned: false,
      notifyAtTime: false,
      notifyDayBefore: false,
      notifyWeekBefore: false
    });
    saveCountdownsToStorage();
    populateCountdownTagFilter();
    renderCountdownWidget();
  } catch (e) { /* malformed or tampered import link, ignore silently */ }
}

function formatCountdownPrecise(ms) {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600).toString().padStart(2, '0');
  const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const secs = (totalSec % 60).toString().padStart(2, '0');
  const str = days > 0 ? `${days}d ${hours}:${mins}:${secs}` : `${hours}:${mins}:${secs}`;
  return toNum(str);
}

function renderCountdownWidget() {
  const bigNum = document.getElementById('cdWidgetDays');
  if (!bigNum) return;
  const titleEl = document.getElementById('cdWidgetTitle');
  const subEl = document.getElementById('cdWidgetSub');
  const preciseEl = document.getElementById('cdWidgetPrecise');
  const listEl = document.getElementById('cdWidgetList');
  if (countdownEvents.length === 0) {
    bigNum.textContent = '--';
    titleEl.textContent = translations[lang].noCountdownsYet;
    subEl.textContent = '';
    if (preciseEl) preciseEl.textContent = '';
    listEl.innerHTML = '';
    return;
  }
  const now = new Date();
  const enriched = countdownEvents.map(ev => ({ ev, occ: getNextCountdownOccurrence(ev, now) }));
  enriched.sort((a, b) => {
    if (!!a.ev.pinned !== !!b.ev.pinned) return a.ev.pinned ? -1 : 1;
    return Math.abs(a.occ.date - now) - Math.abs(b.occ.date - now);
  });
  const top = enriched[0];
  const days = getDaysRemaining(top.occ.date, now);
  bigNum.textContent = days === 0 ? translations[lang].todayLabel : Math.abs(days).toString();
  let subLabel = '';
  if (days > 0) subLabel = days === 1 ? translations[lang].dayLeft : translations[lang].daysLeft;
  else if (days < 0) subLabel = Math.abs(days) === 1 ? translations[lang].dayAgoLabel : translations[lang].daysAgo;
  titleEl.innerHTML = `${iconSVG(top.ev.icon)} ${escapeHTML(top.ev.title)}`;
  subEl.textContent = subLabel;
  if (preciseEl) preciseEl.textContent = formatCountdownPrecise(top.occ.date.getTime() - now.getTime());

  listEl.innerHTML = '';
  enriched.slice(0, 8).forEach(({ ev, occ }) => {
    const d = getDaysRemaining(occ.date, now);
    const dLabel = d === 0 ? translations[lang].todayLabel : d > 0 ? `${d}d` : `${Math.abs(d)}d`;
    const row = document.createElement('div');
    row.className = 'widget-task-row';
    row.style.setProperty('--row-color', ev.color || currentTheme.handle);
    row.innerHTML = `${iconSVG(ev.icon)} <span style="flex:1;">${escapeHTML(ev.title)}</span> <span style="color:var(--text-secondary); font-size:0.75rem;">${dLabel}</span>`;
    row.addEventListener('click', (e) => { e.stopPropagation(); openCountdownModal(ev.id); });
    listEl.appendChild(row);
  });
}

function updateCountdownLiveTimers(now) {
  if (countdownEvents.length === 0) return;
  const preciseEl = document.getElementById('cdWidgetPrecise');
  if (preciseEl) {
    const enriched = countdownEvents.map(ev => ({ ev, occ: getNextCountdownOccurrence(ev, now) }));
    enriched.sort((a, b) => {
      if (!!a.ev.pinned !== !!b.ev.pinned) return a.ev.pinned ? -1 : 1;
      return Math.abs(a.occ.date - now) - Math.abs(b.occ.date - now);
    });
    if (enriched[0]) preciseEl.textContent = formatCountdownPrecise(enriched[0].occ.date.getTime() - now.getTime());
  }
  const managerModal = document.getElementById('countdownManagerModal');
  if (managerModal && managerModal.classList.contains('active')) {
    document.querySelectorAll('.cd-row-precise').forEach(el => {
      const ev = countdownEvents.find(e => String(e.id) === el.dataset.cdId);
      if (!ev) return;
      const occ = getNextCountdownOccurrence(ev, now);
      el.textContent = formatCountdownPrecise(occ.date.getTime() - now.getTime());
    });
  }
}

function openCountdownManager() {
  populateCountdownTagFilter();
  document.getElementById('cdSearchInput').value = '';
  renderCountdownManagerList();
  document.getElementById('countdownManagerModal').classList.add('active');
}
function closeCountdownManager() {
  document.getElementById('countdownManagerModal').classList.remove('active');
  selectedCountdownIds.clear();
}
function handleCountdownSortChange() {
  countdownSortMode = document.getElementById('cdSortSelect').value;
  localStorage.setItem('countdownSort', countdownSortMode);
  renderCountdownManagerList();
}
function populateCountdownTagFilter() {
  const select = document.getElementById('cdTagFilter');
  if (!select) return;
  const current = select.value;
  const tagSet = new Set();
  countdownEvents.forEach(ev => (ev.tags || []).forEach(t => tagSet.add(t)));
  const tagList = Array.from(tagSet).sort();
  select.innerHTML = `<option value="">${translations[lang].allTags}</option>` + tagList.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
  if (tagList.includes(current)) select.value = current;
}
function toggleCountdownSelect(id, checked) {
  if (checked) selectedCountdownIds.add(id); else selectedCountdownIds.delete(id);
  renderCountdownManagerList();
}
function applyBulkColorToSelected(color) {
  countdownEvents.forEach(ev => { if (selectedCountdownIds.has(ev.id)) ev.color = color; });
  saveCountdownsToStorage();
  selectedCountdownIds.clear();
  renderCountdownWidget();
  renderCountdownManagerList();
}

function buildCountdownRow(ev, occ, now) {
  const row = document.createElement('div');
  row.className = 'sm-item';
  row.style.setProperty('--row-color', ev.color || currentTheme.handle);
  const days = getDaysRemaining(occ.date, now);
  let detail;
  if (days === 0) detail = `${ev.date} • ${translations[lang].todayLabel}`;
  else if (days > 0) detail = `${ev.date} • ${days} ${days === 1 ? translations[lang].dayLeft : translations[lang].daysLeft}`;
  else detail = `${ev.date} • ${Math.abs(days)} ${Math.abs(days) === 1 ? translations[lang].dayAgoLabel : translations[lang].daysAgo}`;
  if (ev.isBirthday) {
    const base = getCountdownTargetDate(ev);
    const age = occ.date.getFullYear() - base.getFullYear();
    if (age > 0) detail += ` • ${translations[lang].turningAge.replace('{age}', age)}`;
  }
  if (occ.ended) detail += ` • ${translations[lang].seriesEnded}`;
  const tagsHtml = (ev.tags && ev.tags.length) ? ' ' + ev.tags.map(t => `<span class="cd-tag-chip">${escapeHTML(t)}</span>`).join('') : '';
  const preciseText = formatCountdownPrecise(occ.date.getTime() - now.getTime());
  row.innerHTML = `
    <input type="checkbox" style="accent-color:var(--accent); flex-shrink:0;" ${selectedCountdownIds.has(ev.id) ? 'checked' : ''}>
    <span class="sm-item-icon">${iconSVG(ev.icon)}</span>
    <div class="sm-item-info">
      <div class="sm-item-name">${ev.pinned ? '📌 ' : ''}${escapeHTML(ev.title)}</div>
      <div class="sm-item-detail">${detail}${tagsHtml}</div>
      <div class="cd-row-precise" data-cd-id="${ev.id}">${preciseText}</div>
    </div>
    <div class="sm-item-actions">
      <button class="sm-btn" aria-label="Pin">${svgIcon('icon-star')}</button>
      <button class="sm-btn" aria-label="Edit">${lang === 'en' ? 'Edit' : 'تعديل'}</button>
      <button class="sm-btn delete" aria-label="Delete">${lang === 'en' ? 'Delete' : 'حذف'}</button>
    </div>`;
  row.querySelector('input[type="checkbox"]').addEventListener('click', (e) => { e.stopPropagation(); toggleCountdownSelect(ev.id, e.target.checked); });
  const actionBtns = row.querySelectorAll('.sm-item-actions .sm-btn');
  actionBtns[0].addEventListener('click', (e) => { e.stopPropagation(); togglePinCountdown(ev.id); });
  actionBtns[1].addEventListener('click', (e) => { e.stopPropagation(); openCountdownModal(ev.id); });
  actionBtns[2].addEventListener('click', (e) => { e.stopPropagation(); deleteCountdownById(ev.id); });
  return row;
}

function renderCountdownManagerList() {
  const container = document.getElementById('countdownManagerList');
  if (!container) return;
  const search = (document.getElementById('cdSearchInput').value || '').toLowerCase();
  const tagFilter = document.getElementById('cdTagFilter').value;
  const now = new Date();

  let list = countdownEvents.filter(ev => {
    if (tagFilter && !(ev.tags || []).includes(tagFilter)) return false;
    if (search && !ev.title.toLowerCase().includes(search)) return false;
    return true;
  }).map(ev => ({ ev, occ: getNextCountdownOccurrence(ev, now) }));

  list.sort((a, b) => {
    if (!!a.ev.pinned !== !!b.ev.pinned) return a.ev.pinned ? -1 : 1;
    const diffA = Math.abs(a.occ.date - now), diffB = Math.abs(b.occ.date - now);
    return countdownSortMode === 'farthest' ? diffB - diffA : diffA - diffB;
  });

  container.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sm-empty';
    empty.textContent = lang === 'en' ? 'None yet' : 'لا يوجد';
    container.appendChild(empty);
  } else {
    list.forEach(({ ev, occ }) => container.appendChild(buildCountdownRow(ev, occ, now)));
  }

  const bulkBar = document.getElementById('cdBulkBar');
  const bulkCount = document.getElementById('cdBulkCount');
  const bulkColorGrid = document.getElementById('cdBulkColorGrid');
  if (selectedCountdownIds.size > 0) {
    bulkBar.style.display = 'flex';
    bulkCount.textContent = `${selectedCountdownIds.size} ${translations[lang].selectedCount}`;
    if (bulkColorGrid.children.length === 0) {
      COUNTDOWN_COLORS.forEach(hex => {
        const el = document.createElement('div');
        el.className = 'color-swatch';
        el.style.color = hex;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', `Color ${hex}`);
        el.addEventListener('click', () => applyBulkColorToSelected(hex));
        bulkColorGrid.appendChild(el);
      });
    }
  } else {
    bulkBar.style.display = 'none';
  }
}

let lastCountdownCheckMinute = -1;
let firedCountdownNotifications = new Set();
function checkCountdownNotifications(now) {
  const currentMins = now.getHours() * 60 + now.getMinutes();
  if (currentMins === lastCountdownCheckMinute) return;
  lastCountdownCheckMinute = currentMins;
  countdownEvents.forEach(ev => {
    if (!ev.notifyAtTime && !ev.notifyDayBefore && !ev.notifyWeekBefore) return;
    const occ = getNextCountdownOccurrence(ev, now);
    if (occ.ended) return;
    const occISO = occ.date.toISOString().split('T')[0];
    const checkFire = (offsetDays, key) => {
      const fireDate = new Date(occ.date);
      fireDate.setDate(fireDate.getDate() - offsetDays);
      if (fireDate.getFullYear() === now.getFullYear() && fireDate.getMonth() === now.getMonth() && fireDate.getDate() === now.getDate() && fireDate.getHours() === now.getHours() && fireDate.getMinutes() === now.getMinutes()) {
        const fireKey = `${ev.id}-${occISO}-${key}`;
        if (!firedCountdownNotifications.has(fireKey)) {
          firedCountdownNotifications.add(fireKey);
          fireCountdownAlert(ev, key);
        }
      }
    };
    if (ev.notifyAtTime) checkFire(0, 'attime');
    if (ev.notifyDayBefore) checkFire(1, 'dayBefore');
    if (ev.notifyWeekBefore) checkFire(7, 'weekBefore');
  });
  renderCountdownWidget();
}
function fireCountdownAlert(ev, key) {
  playChime('alert');
  const container = document.getElementById('toastContainer');
  if (container) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.setProperty('--row-color', ev.color || currentTheme.handle);
    const subText = key === 'attime' ? (lang === 'en' ? 'Happening now' : 'يحدث الآن') : key === 'dayBefore' ? (lang === 'en' ? '1 day away' : 'يوم واحد متبقٍ') : (lang === 'en' ? '1 week away' : 'أسبوع واحد متبقٍ');
    toast.innerHTML = `${iconSVG(ev.icon)}<div><div class="toast-title">${escapeHTML(ev.title)}</div><div class="toast-sub">${subText}</div></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 400); }, 6000);
  }
  if (window.Notification && Notification.permission === 'granted') {
    try { new Notification(ev.title, { body: lang === 'en' ? 'Countdown alert' : 'تنبيه العد التنازلي' }); } catch (e) {}
  }
}

/* ==========================================
   13c. ONBOARDING TUTORIAL
   ========================================== */
const TUTORIAL_STEPS = [
  { target: null, titleKey: 'tutWelcomeTitle', bodyKey: 'tutWelcomeBody' },
  { target: '#clock', placement: 'bottom', titleKey: 'tutClockTitle', bodyKey: 'tutClockBody' },
  { target: '.left-panel', placement: 'right', titleKey: 'tutWidgetsTitle', bodyKey: 'tutWidgetsBody' },
  { target: '.panel-tab', placement: 'left', titleKey: 'tutPanelTitle', bodyKey: 'tutPanelBody' },
  { target: '#acctLoggedOutBlock', placement: 'left', titleKey: 'tutAccountTitle', bodyKey: 'tutAccountBody', forcePanel: true },
  { target: '#widgetTogglesGrid', placement: 'left', titleKey: 'tutWidgetManagerTitle', bodyKey: 'tutWidgetManagerBody', forcePanel: true },
  { target: '#addCountdownBtn', placement: 'left', titleKey: 'tutCountdownTitle', bodyKey: 'tutCountdownBody', forcePanel: true },
  { target: '#addTaskBtn', placement: 'left', titleKey: 'tutAddTaskTitle', bodyKey: 'tutAddTaskBody', forcePanel: true },
  { target: '#themeGrid', placement: 'left', titleKey: 'tutThemeTitle', bodyKey: 'tutThemeBody', forcePanel: true },
  { target: '#layoutPickerGrid', placement: 'left', titleKey: 'tutLayoutTitle', bodyKey: 'tutLayoutBody', forcePanel: true },
  { target: '#theaterEnterBtn', placement: 'left', titleKey: 'tutTheaterTitle', bodyKey: 'tutTheaterBody', forcePanel: true },
  { target: '#quoteSliderContainer', placement: 'left', titleKey: 'tutQuotesTitle', bodyKey: 'tutQuotesBody', forcePanel: true },
  { target: '.chime-select-row', placement: 'left', titleKey: 'tutChimesTitle', bodyKey: 'tutChimesBody', forcePanel: true },
  { target: '#timelineContainer', placement: 'bottom', titleKey: 'tutTimelineTitle', bodyKey: 'tutTimelineBody' },
  { target: '.zen-toggle', placement: 'left', titleKey: 'tutZenTitle', bodyKey: 'tutZenBody' },
  { target: null, titleKey: 'tutFinishTitle', bodyKey: 'tutFinishBody' }
];

/* Steps for features that shipped without one. Spliced in before the closing step so
   the tour still ends on the sign-off, and so this list stays easy to extend. Widget
   steps target elements inside the left rail, which is display:none on phones - those
   are skipped automatically there by isTutorialTargetVisible(). */
TUTORIAL_STEPS.splice(TUTORIAL_STEPS.length - 1, 0,
  { target: '#endHandle', placement: 'bottom', titleKey: 'tutQuickTimerTitle', bodyKey: 'tutQuickTimerBody' },
  { target: '#clockFaceGrid', placement: 'left', titleKey: 'tutClockFaceTitle', bodyKey: 'tutClockFaceBody', forcePanel: true },
  { target: '#clockSizeSlider', placement: 'left', titleKey: 'tutClockSizeTitle', bodyKey: 'tutClockSizeBody', forcePanel: true },
  { target: '#displayTitleAutoHideToggle', placement: 'left', titleKey: 'tutDisplayTitleTitle', bodyKey: 'tutDisplayTitleBody', forcePanel: true },
  { target: '#wgSpotify', placement: 'right', titleKey: 'tutSpotifyTitle', bodyKey: 'tutSpotifyBody' },
  { target: '#wgPomodoro', placement: 'right', titleKey: 'tutPomodoroTitle', bodyKey: 'tutPomodoroBody' },
  { target: '#wgPrayer', placement: 'right', titleKey: 'tutPrayerTitle', bodyKey: 'tutPrayerBody' },
  { target: '#wgLinks', placement: 'right', titleKey: 'tutQuickLinksTitle', bodyKey: 'tutQuickLinksBody' }
);
let tutorialStepIndex = 0;
let tutorialForcedPanelOpen = false;
let tutorialActive = false;

/* A target that is display:none (or otherwise unrendered) has a zero-size rect, which
   would put the spotlight in the top-left corner highlighting nothing. Several targets
   are legitimately hidden per device - the whole left widget rail and the timeline are
   display:none under 760px - so steps pointing at them are skipped on that device
   rather than shown as an empty highlight. */
function isTutorialTargetVisible(step) {
  if (!step.target) return true;
  const el = document.querySelector(step.target);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return getComputedStyle(el).display !== 'none';
}
function findNextVisibleStep(from, direction) {
  let i = from;
  while (i >= 0 && i < TUTORIAL_STEPS.length) {
    if (isTutorialTargetVisible(TUTORIAL_STEPS[i])) return i;
    i += direction;
  }
  return -1;
}

function positionTutorialUI(step) {
  const spotlight = document.getElementById('tutorialSpotlight');
  const tooltip = document.getElementById('tutorialTooltip');
  tooltip.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right', 'centered');

  const el = step.target ? document.querySelector(step.target) : null;
  if (!el) {
    spotlight.classList.add('no-target');
    tooltip.classList.add('centered');
    return;
  }
  spotlight.classList.remove('no-target');
  const rect = el.getBoundingClientRect();
  const pad = 8;
  spotlight.style.top = (rect.top - pad) + 'px';
  spotlight.style.left = (rect.left - pad) + 'px';
  spotlight.style.width = (rect.width + pad * 2) + 'px';
  spotlight.style.height = (rect.height + pad * 2) + 'px';

  let placement = step.placement || 'bottom';
  const gap = 16;
  const tw = tooltip.offsetWidth || 300;
  const th = tooltip.offsetHeight || 120;
  /* On a phone there is no room to sit a ~300px tooltip beside a target: a 'left' or
     'right' placement gets clamped back over the very element it is pointing at. Flip
     to whichever of above/below the target has more room so the highlight stays visible. */
  if ((placement === 'left' || placement === 'right') && window.innerWidth < tw + 120) {
    placement = (rect.top > window.innerHeight - rect.bottom) ? 'top' : 'bottom';
  }
  let top, left;
  if (placement === 'bottom') {
    top = rect.bottom + pad + gap;
    left = rect.left + rect.width / 2 - tw / 2;
    tooltip.classList.add('arrow-top');
  } else if (placement === 'top') {
    top = rect.top - pad - gap - th;
    left = rect.left + rect.width / 2 - tw / 2;
    tooltip.classList.add('arrow-bottom');
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - th / 2;
    left = rect.left - pad - gap - tw;
    tooltip.classList.add('arrow-right');
  } else {
    top = rect.top + rect.height / 2 - th / 2;
    left = rect.right + pad + gap;
    tooltip.classList.add('arrow-left');
  }
  const margin = 12;
  top = Math.max(margin, Math.min(top, window.innerHeight - th - margin));
  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
  tooltip.style.top = top + 'px';
  tooltip.style.left = left + 'px';
}

function showTutorialStep(i) {
  const step = TUTORIAL_STEPS[i];
  if (!step) { endTutorial(); return; }
  tutorialStepIndex = i;
  const sidePanel = document.getElementById('sidePanel');
  const needsPanel = !!step.forcePanel;
  const panelStateChanging = needsPanel !== tutorialForcedPanelOpen;
  tutorialForcedPanelOpen = needsPanel;
  sidePanel.classList.toggle('tutorial-force-open', needsPanel);

  document.getElementById('tutorialTitle').textContent = translations[lang][step.titleKey] || '';
  document.getElementById('tutorialBody').textContent = translations[lang][step.bodyKey] || '';
  const hasPrev = findNextVisibleStep(i - 1, -1) !== -1;
  const hasNext = findNextVisibleStep(i + 1, 1) !== -1;
  document.getElementById('tutorialBackBtn').style.visibility = hasPrev ? 'visible' : 'hidden';
  document.getElementById('tutorialBackBtn').textContent = translations[lang].tutBack;
  document.getElementById('tutorialNextBtn').textContent = hasNext ? translations[lang].tutNext : translations[lang].tutFinish;

  // Only count steps that are actually reachable on this device, so the progress dots
  // match the tour the user is really getting rather than the full desktop list.
  const dotsEl = document.getElementById('tutorialDots');
  dotsEl.innerHTML = '';
  TUTORIAL_STEPS.forEach((s, idx) => {
    if (!isTutorialTargetVisible(s)) return;
    const dot = document.createElement('div');
    dot.className = 'tutorial-dot' + (idx === i ? ' active' : '');
    dotsEl.appendChild(dot);
  });

  if (panelStateChanging) setTimeout(() => positionTutorialUI(step), 450);
  else requestAnimationFrame(() => positionTutorialUI(step));
}
function nextTutorialStep() {
  const next = findNextVisibleStep(tutorialStepIndex + 1, 1);
  if (next === -1) { endTutorial(); return; }
  showTutorialStep(next);
}
function prevTutorialStep() {
  const prev = findNextVisibleStep(tutorialStepIndex - 1, -1);
  if (prev === -1) return;
  showTutorialStep(prev);
}
function startTutorial(force) {
  if (!force && localStorage.getItem('hasSeenTutorial') === '1') return;
  tutorialActive = true;
  tutorialForcedPanelOpen = false;
  document.getElementById('tutorialOverlay').classList.add('active');
  const first = findNextVisibleStep(0, 1);
  showTutorialStep(first === -1 ? 0 : first);
}
function endTutorial() {
  tutorialActive = false;
  document.getElementById('tutorialOverlay').classList.remove('active');
  document.getElementById('sidePanel').classList.remove('tutorial-force-open');
  tutorialForcedPanelOpen = false;
  localStorage.setItem('hasSeenTutorial', '1');
}
window.addEventListener('resize', () => {
  if (tutorialActive) positionTutorialUI(TUTORIAL_STEPS[tutorialStepIndex]);
});

/* ==========================================
   13d. QUOTES ROTATION
   ========================================== */
const QUOTES_EN = [
"The only way to do great work is to love what you do. — Steve Jobs",
"Life is what happens when you're busy making other plans. — John Lennon",
"The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
"It is during our darkest moments that we must focus to see the light. — Aristotle",
"Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
"In the middle of difficulty lies opportunity. — Albert Einstein",
"Believe you can and you're halfway there. — Theodore Roosevelt",
"The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt",
"Do not go where the path may lead, go instead where there is no path and leave a trail. — Ralph Waldo Emerson",
"What lies behind us and what lies before us are tiny matters compared to what lies within us. — Ralph Waldo Emerson",
"You miss 100% of the shots you don't take. — Wayne Gretzky",
"Whether you think you can or you think you can't, you're right. — Henry Ford",
"The best way to predict the future is to create it. — Peter Drucker",
"I have not failed. I've just found 10,000 ways that won't work. — Thomas Edison",
"A person who never made a mistake never tried anything new. — Albert Einstein",
"The only impossible journey is the one you never begin. — Tony Robbins",
"In this life we cannot do great things. We can only do small things with great love. — Mother Teresa",
"Life is really simple, but we insist on making it complicated. — Confucius",
"Way to get started is to quit talking and begin doing. — Walt Disney",
"Don't judge each day by the harvest you reap but by the seeds that you plant. — Robert Louis Stevenson",
"Your time is limited, so don't waste it living someone else's life. — Steve Jobs",
"If life were predictable it would cease to be life, and be without flavor. — Eleanor Roosevelt",
"The purpose of our lives is to be happy. — Dalai Lama",
"Life is what we make it, always has been, always will be. — Grandma Moses",
"The journey of a thousand miles begins with a single step. — Lao Tzu",
"Many of life's failures are people who did not realize how close they were to success when they gave up. — Thomas Edison",
"You will face many defeats in life, but never let yourself be defeated. — Maya Angelou",
"Imagination is more important than knowledge. — Albert Einstein",
"Strive not to be a success, but rather to be of value. — Albert Einstein",
"The mind is everything. What you think you become. — Buddha",
"Twenty years from now you will be more disappointed by the things you didn't do. — Mark Twain",
"Everything you've ever wanted is on the other side of fear. — George Addair",
"Success is walking from failure to failure with no loss of enthusiasm. — Winston Churchill",
"Hardships often prepare ordinary people for an extraordinary destiny. — C.S. Lewis",
"Change your thoughts and you change your world. — Norman Vincent Peale",
"The only person you are destined to become is the person you decide to be. — Ralph Waldo Emerson",
"Go confidently in the direction of your dreams. Live the life you have imagined. — Henry David Thoreau",
"When one door of happiness closes, another opens. — Helen Keller",
"Fall seven times, stand up eight. — Japanese Proverb",
"You are never too old to set another goal or to dream a new dream. — C.S. Lewis",
"Certain things catch your eye, but pursue only those that capture the heart. — Ancient Indian Proverb",
"Everything has beauty, but not everyone can see it. — Confucius",
"How wonderful it is that nobody need wait a single moment before starting to improve the world. — Anne Frank",
"When I let go of what I am, I become what I might be. — Lao Tzu",
"Happiness is not something readymade. It comes from your own actions. — Dalai Lama",
"The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
"Your work is going to fill a large part of your life; the only way to be truly satisfied is to do great work. — Steve Jobs",
"If you want to lift yourself up, lift up someone else. — Booker T. Washington",
"I attribute my success to this: I never gave or took any excuse. — Florence Nightingale",
"You must be the change you wish to see in the world. — Mahatma Gandhi",
"Too many of us are not living our dreams because we are living our fears. — Les Brown",
"Dream big and dare to fail. — Norman Vaughan",
"Our lives begin to end the day we become silent about things that matter. — Martin Luther King Jr.",
"Never let the fear of striking out keep you from playing the game. — Babe Ruth",
"Life is 10% what happens to us and 90% how we react to it. — Charles R. Swindoll",
"The best revenge is massive success. — Frank Sinatra",
"People often say that motivation doesn't last. Well, neither does bathing — that's why we recommend it daily. — Zig Ziglar",
"Life is either a daring adventure or nothing at all. — Helen Keller",
"It is our choices that show what we truly are, far more than our abilities. — J.K. Rowling",
"Great minds discuss ideas; average minds discuss events; small minds discuss people. — Eleanor Roosevelt",
"The way to get started is to quit talking and begin doing. — Walt Disney",
"Not how long, but how well you have lived is the main thing. — Seneca",
"If you tell the truth, you don't have to remember anything. — Mark Twain",
"A friend is someone who knows all about you and still loves you. — Elbert Hubbard",
"To live is the rarest thing in the world. Most people exist, that is all. — Oscar Wilde",
"Winning isn't everything, but wanting to win is. — Vince Lombardi",
"The two most important days in your life are the day you are born and the day you find out why. — Mark Twain",
"Whatever you are, be a good one. — Abraham Lincoln",
"Nothing is impossible, the word itself says 'I'm possible'. — Audrey Hepburn",
"The only way to have a friend is to be one. — Ralph Waldo Emerson",
"I would rather die of passion than of boredom. — Vincent van Gogh",
"It always seems impossible until it's done. — Nelson Mandela",
"Do what you can, with what you have, where you are. — Theodore Roosevelt",
"Keep your face always toward the sunshine, and shadows will fall behind you. — Walt Whitman",
"You take your life in your own hands, and what happens? A terrible thing: no one to blame. — Erica Jong",
"When you reach the end of your rope, tie a knot in it and hang on. — Franklin D. Roosevelt",
"Always remember that you are absolutely unique. Just like everyone else. — Margaret Mead",
"Don't cry because it's over, smile because it happened. — Dr. Seuss",
"Yesterday is history, tomorrow is a mystery, today is a gift. — Eleanor Roosevelt",
"We know what we are, but know not what we may be. — William Shakespeare",
"Do not wait to strike till the iron is hot; but make it hot by striking. — William Butler Yeats",
"Only a life lived for others is a life worthwhile. — Albert Einstein",
"Setting goals is the first step in turning the invisible into the visible. — Tony Robbins",
"The unexamined life is not worth living. — Socrates",
"Turn your wounds into wisdom. — Oprah Winfrey",
"There is only one way to avoid criticism: do nothing, say nothing, and be nothing. — Aristotle",
"An unexamined life is not worth living, but an unlived life is not worth examining. — Anonymous",
"Simplicity is the ultimate sophistication. — Leonardo da Vinci",
"You can't use up creativity. The more you use, the more you have. — Maya Angelou",
"To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. — Ralph Waldo Emerson",
"What we think, we become. — Buddha",
"All our dreams can come true if we have the courage to pursue them. — Walt Disney",
"Act as if what you do makes a difference. It does. — William James",
"Success usually comes to those who are too busy to be looking for it. — Henry David Thoreau",
"Don't watch the clock; do what it does. Keep going. — Sam Levenson",
"Either you run the day, or the day runs you. — Jim Rohn",
"You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
"The secret of getting ahead is getting started. — Mark Twain",
"There is no substitute for hard work. — Thomas Edison",
"Perseverance is not a long race; it is many short races one after the other. — Walter Elliot",
"Quality is not an act, it is a habit. — Aristotle",
"Knowing yourself is the beginning of all wisdom. — Aristotle",
"He who has a why to live can bear almost any how. — Friedrich Nietzsche",
"Optimism is the faith that leads to achievement. Nothing can be done without hope. — Helen Keller",
"The greatest glory in living lies not in never falling, but in rising every time we fall. — Nelson Mandela",
"You have power over your mind, not outside events. Realize this, and you will find strength. — Marcus Aurelius",
"Waste no more time arguing about what a good man should be. Be one. — Marcus Aurelius",
"The happiness of your life depends upon the quality of your thoughts. — Marcus Aurelius",
"It is not the man who has too little, but the man who craves more, that is poor. — Seneca",
"Difficulties strengthen the mind, as labor does the body. — Seneca",
"He who is not satisfied with a little, is satisfied with nothing. — Epicurus",
"No man is free who is not master of himself. — Epictetus",
"Wealth consists not in having great possessions, but in having few wants. — Epictetus",
"The best revenge is to be unlike him who performed the injury. — Marcus Aurelius",
"Freedom is the only worthy goal in life. — Rumi",
"Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself. — Rumi",
"Raise your words, not voice. It is rain that grows flowers, not thunder. — Rumi",
"The wound is the place where the light enters you. — Rumi",
"Let yourself be silently drawn by the strange pull of what you really love. — Rumi",
"Live life as though nothing is a miracle and live life as though everything is a miracle. — Albert Einstein",
"Not everything that can be counted counts, and not everything that counts can be counted. — Albert Einstein",
"A ship in harbor is safe, but that is not what ships are built for. — John A. Shedd",
"The struggle you're in today is developing the strength you need for tomorrow. — Robert Tew",
"Push yourself, because no one else is going to do it for you. — Anonymous",
"Great things never came from comfort zones. — Anonymous",
"Dream it. Wish it. Do it. — Anonymous",
"Success doesn't just find you. You have to go out and get it. — Anonymous",
"The harder you work for something, the greater you'll feel when you achieve it. — Anonymous",
"Don't stop when you're tired. Stop when you're done. — Anonymous",
"Wake up with determination. Go to bed with satisfaction. — Anonymous",
"Little things make big days. — Anonymous",
"It's going to be hard, but hard does not mean impossible. — Anonymous",
"Don't wait for opportunity. Create it. — Anonymous",
"Sometimes we're tested not to show our weaknesses, but to discover our strengths. — Anonymous",
"The key to success is to focus on goals, not obstacles. — Anonymous",
"Dream bigger. Do bigger. — Anonymous",
"Time is precious, waste it wisely. — Anonymous",
"Discipline is the bridge between goals and accomplishment. — Jim Rohn",
"You are never too old to reinvent yourself. — Anonymous",
"If you want something you never had, you have to do something you've never done. — Thomas Jefferson",
"Do something today that your future self will thank you for. — Anonymous",
"Little by little, one travels far. — J.R.R. Tolkien",
"Not all those who wander are lost. — J.R.R. Tolkien",
"Even the smallest person can change the course of the future. — J.R.R. Tolkien",
"There is some good in this world, and it's worth fighting for. — J.R.R. Tolkien",
"It is our choices, that show what we truly are, far more than our abilities. — J.K. Rowling",
"Happiness can be found even in the darkest of times if one only remembers to turn on the light. — J.K. Rowling",
"We are all fools in love. — Jane Austen",
"There is nothing I would not do for those who are really my friends. — Jane Austen",
"It is a truth universally acknowledged, that hard work beats talent when talent doesn't work hard. — Anonymous",
"I can accept failure, everyone fails at something. But I can't accept not trying. — Michael Jordan",
"Talent wins games, but teamwork and intelligence win championships. — Michael Jordan",
"I've failed over and over and over again in my life and that is why I succeed. — Michael Jordan",
"Obstacles don't have to stop you. If you run into a wall, don't turn around and give up. Figure out how to climb it. — Michael Jordan",
"You must expect great things of yourself before you can do them. — Michael Jordan",
"If you're not making mistakes, then you're not making decisions. — Catherine Cook",
"Innovation distinguishes between a leader and a follower. — Steve Jobs",
"Stay hungry, stay foolish. — Steve Jobs",
"Sometimes life hits you in the head with a brick. Don't lose faith. — Steve Jobs",
"Your most unhappy customers are your greatest source of learning. — Bill Gates",
"It's fine to celebrate success but it is more important to heed the lessons of failure. — Bill Gates",
"Success is a lousy teacher. It seduces smart people into thinking they can't lose. — Bill Gates",
"I have no special talent. I am only passionately curious. — Albert Einstein",
"Logic will get you from A to B. Imagination will take you everywhere. — Albert Einstein",
"The true sign of intelligence is not knowledge but imagination. — Albert Einstein",
"Anyone who has never made a mistake has never tried anything new. — Albert Einstein",
"Try not to become a person of success, but rather try to become a person of value. — Albert Einstein",
"Insanity is doing the same thing over and over and expecting different results. — Albert Einstein",
"Weakness of attitude becomes weakness of character. — Albert Einstein",
"Great spirits have always encountered violent opposition from mediocre minds. — Albert Einstein",
"I never think of the future. It comes soon enough. — Albert Einstein",
"Peace cannot be kept by force; it can only be achieved by understanding. — Albert Einstein",
"The measure of intelligence is the ability to change. — Albert Einstein",
"Learn from yesterday, live for today, hope for tomorrow. — Albert Einstein",
"A room without books is like a body without a soul. — Marcus Tullius Cicero",
"The pen is mightier than the sword. — Edward Bulwer-Lytton",
"Knowledge is power. — Francis Bacon",
"Genius is one percent inspiration and ninety-nine percent perspiration. — Thomas Edison",
"I find that the harder I work, the more luck I seem to have. — Thomas Jefferson",
"That which does not kill us makes us stronger. — Friedrich Nietzsche",
"He who has a why can endure any how. — Friedrich Nietzsche",
"Without music, life would be a mistake. — Friedrich Nietzsche",
"Music expresses that which cannot be said and on which it is impossible to be silent. — Victor Hugo",
"Where words fail, music speaks. — Hans Christian Andersen",
"Music is the strongest form of magic. — Marilyn Manson",
"Silence is a source of great strength. — Lao Tzu",
"Nature does not hurry, yet everything is accomplished. — Lao Tzu",
"A good traveler has no fixed plans and is not intent on arriving. — Lao Tzu",
"He who knows others is wise; he who knows himself is enlightened. — Lao Tzu",
"Kindness in words creates confidence. Kindness in thinking creates profoundness. — Lao Tzu",
"To the mind that is still, the whole universe surrenders. — Lao Tzu",
"Mistakes are proof that you are trying. — Anonymous",
"Every accomplishment starts with the decision to try. — John F. Kennedy",
"Ask not what your country can do for you, ask what you can do for your country. — John F. Kennedy",
"We choose to go to the moon not because it is easy, but because it is hard. — John F. Kennedy",
"Change will not come if we wait for some other person or some other time. — Barack Obama",
"Yes we can. — Barack Obama",
"The best way to find yourself is to lose yourself in the service of others. — Mahatma Gandhi",
"An eye for an eye only ends up making the whole world blind. — Mahatma Gandhi",
"Live as if you were to die tomorrow. Learn as if you were to live forever. — Mahatma Gandhi",
"The weak can never forgive. Forgiveness is the attribute of the strong. — Mahatma Gandhi",
"First they ignore you, then they laugh at you, then they fight you, then you win. — Mahatma Gandhi",
"Darkness cannot drive out darkness: only light can do that. — Martin Luther King Jr.",
"Injustice anywhere is a threat to justice everywhere. — Martin Luther King Jr.",
"The time is always right to do what is right. — Martin Luther King Jr.",
"Faith is taking the first step even when you don't see the whole staircase. — Martin Luther King Jr.",
"I have a dream. — Martin Luther King Jr."
];

const QUOTES_AR = [
"من جد وجد، ومن زرع حصد. — مثل عربي",
"الصبر مفتاح الفرج. — مثل عربي",
"العلم نور والجهل ظلام. — مثل عربي",
"من طلب العلا سهر الليالي. — المتنبي",
"إذا غامرت في شرف مروم فلا تقنع بما دون النجوم. — المتنبي",
"على قدر أهل العزم تأتي العزائم. — المتنبي",
"وما نيل المطالب بالتمني ولكن تؤخذ الدنيا غلابا. — المتنبي",
"من عرف نفسه فقد عرف ربه. — حكمة عربية",
"خير الكلام ما قل ودل. — حكمة عربية",
"الوقت كالسيف إن لم تقطعه قطعك. — حكمة عربية",
"العقل السليم في الجسم السليم. — حكمة عربية",
"لسانك حصانك إن صنته صانك. — مثل عربي",
"رب أخ لم تلده أمك. — مثل عربي",
"الحياة كفاح لا استسلام فيه. — حكمة عربية",
"من سار على الدرب وصل. — مثل عربي",
"العين لا تعلو على الحاجب. — مثل عربي",
"الصديق وقت الضيق. — مثل عربي",
"إن غدا لناظره قريب. — مثل عربي",
"من حفر حفرة لأخيه وقع فيها. — مثل عربي",
"الجار قبل الدار. — مثل عربي",
"درهم وقاية خير من قنطار علاج. — حكمة عربية",
"من شابه أباه فما ظلم. — مثل عربي",
"القناعة كنز لا يفنى. — حكمة عربية",
"لكل داء دواء يستطب به إلا الحماقة أعيت من يداويها. — أبو الطيب المتنبي",
"إذا كان الكلام من فضة فإن السكوت من ذهب. — حكمة عربية",
"العقل زينة. — الإمام علي بن أبي طالب",
"قيمة كل امرئ ما يحسنه. — الإمام علي بن أبي طالب",
"من أمن العقوبة أساء الأدب. — الإمام علي بن أبي طالب",
"لا تنظر إلى صغر الذنب ولكن انظر إلى من عصيت. — الإمام علي بن أبي طالب",
"خير الناس من نفع الناس. — حكمة عربية",
"الحكمة ضالة المؤمن. — حكمة عربية",
"إذا أردت أن تطاع فاطلب ما يستطاع. — الإمام علي بن أبي طالب",
"ما ضاع حق وراءه مطالب. — حكمة عربية",
"لا يزال المرء عالما ما طلب العلم فإذا ظن أنه قد علم فقد جهل. — حكمة عربية",
"العلم في الصغر كالنقش في الحجر. — مثل عربي",
"من تأنى نال ما تمنى. — مثل عربي",
"الاتحاد قوة. — حكمة عربية",
"في التأني السلامة وفي العجلة الندامة. — مثل عربي",
"يد واحدة لا تصفق. — مثل عربي",
"من طلب أخا بلا عيب بقي بلا أخ. — حكمة عربية",
"الكلمة الطيبة صدقة. — حكمة عربية",
"من لم يشكر الناس لم يشكر الله. — حكمة عربية",
"ابدأ بنفسك ثم بمن تعول. — حكمة عربية",
"لكل جواد كبوة. — مثل عربي",
"الحبل الطويل يشير إلى غريق. — مثل عربي",
"الطيور على أشكالها تقع. — مثل عربي",
"كما تدين تدان. — مثل عربي",
"من قلة العقل الغنى في بلد غريب. — حكمة عربية",
"إن الحياة عقيدة وجهاد. — حسن البنا",
"من راقب الناس مات هما. — حكمة عربية",
"إذا لم تستحِ فاصنع ما شئت. — حكمة نبوية",
"الكلمة الصادقة أقوى من السيف. — حكمة عربية",
"عش كأنك تموت غدا واعمل لدنياك كأنك تعيش أبدا. — حكمة عربية",
"الجاهل يقتنص برأيه، والعاقل يستشير. — حكمة عربية",
"من عمل بلا علم كان ما يفسد أكثر مما يصلح. — حكمة عربية",
"الوقت أثمن من الذهب. — حكمة عربية",
"إن مع العسر يسرا. — حكمة قرآنية",
"وأن ليس للإنسان إلا ما سعى. — حكمة قرآنية",
"من جاهد نفسه فهو المجاهد الحق. — حكمة عربية",
"ليس الفتى من قال كان أبي، إن الفتى من قال ها أنذا. — أبو الطيب المتنبي",
"إذا كنتَ في كل الأمور معاتبا صديقك لم تلقَ الذي لا تعاتبه. — المتنبي",
"وإذا أتتك مذمتي من ناقص فهي الشهادة لي بأني كامل. — المتنبي",
"أعز مكان في الدنى سرج سابح وخير جليس في الزمان كتاب. — المتنبي",
"ذو العقل يشقى في النعيم بعقله وأخو الجهالة في الشقاوة ينعم. — المتنبي",
"الدنيا كلها همٌّ فما وجدتُ إلا غما تسليتُه بغم. — المتنبي",
"يا أعدل الناس إلا في معاملتي فيك الخصام وأنت الخصم والحكم. — المتنبي",
"الرأي قبل شجاعة الشجعان. — المتنبي",
"من هابَ أسبابَ المنايا نالَه ما هابَ منها لا محالة واقع. — المتنبي",
"وإذا كانت النفوس كبارا تعبت في مرادها الأجسام. — المتنبي",
"من الحلم أن تستقبل العذر بالقبول. — الجاحظ",
"من كتب كتابا استعبد عقول الرجال. — الجاحظ",
"القول ما لم تؤيده وقائع الأحوال ضرب من الجنون. — ابن خلدون",
"التاريخ يعيد نفسه. — ابن خلدون",
"العدل أساس الملك. — ابن خلدون",
"الظلم مؤذن بخراب العمران. — ابن خلدون",
"العصبية توجب المحبة والنصرة. — ابن خلدون",
"من طلب العلم كتب الله له ثواب المجاهد. — حكمة إسلامية",
"العلم يحرسك وأنت تحرس المال. — الإمام علي بن أبي طالب",
"إذا تم العقل نقص الكلام. — الإمام علي بن أبي طالب",
"الناس أعداء ما جهلوا. — الإمام علي بن أبي طالب",
"قيمة كل امرئ ما يحسنه. — الإمام علي بن أبي طالب",
"احذر شماتة الأعداء بك، واحذر مقتك عند الأصدقاء. — الإمام علي بن أبي طالب",
"رحم الله امرأ عرف قدر نفسه. — الإمام علي بن أبي طالب",
"لا مال أعود من العقل. — الإمام علي بن أبي طالب",
"الدهر يومان يوم لك ويوم عليك. — حكمة عربية",
"من صبر ظفر. — مثل عربي",
"العبرة بالخواتيم. — حكمة عربية",
"من جد وجد ومن زرع حصد ومن سار على الدرب وصل. — حكمة عربية",
"ابن آدم لا تظلم كما لا تحب أن تُظلم. — حكمة عربية",
"لا تؤجل عمل اليوم إلى الغد. — حكمة عربية",
"الأمل نصف الحياة. — حكمة عربية",
"من أحسن الظن استراح. — حكمة عربية",
"إن الليل مهما طال فإنه ينتهي بطلوع الفجر. — حكمة عربية",
"الجمال في العقل لا في المظهر. — حكمة عربية",
"إن لم تكن ذئبا أكلتك الذئاب. — مثل عربي",
"من يزرع الشوك لا يحصد العنب. — مثل عربي",
"كل ممنوع مرغوب. — مثل عربي",
"من راقب الناس مات هما. — مثل عربي",
"إن الرياح إذا اشتد هبوبها فارفع لها من بيوت العنكبوت حجابا. — أبو الطيب المتنبي",
"شعاعُ عينيك يغزو كل مملكة والصمت في شفتيك يخرس الحكما. — نزار قباني",
"أحبك جدا وأعرف أن الطريق إلى المستحيل طويل. — نزار قباني",
"الحب أعمق ما يكون حين يكون صامتا. — نزار قباني",
"لا تصالحي، لا تصالحي، لا تصالحي على وردةٍ باعها الفلاحون رخيصة. — أمل دنقل",
"إذا الشعب يوما أراد الحياة فلا بد أن يستجيب القدر. — أبو القاسم الشابي",
"ولا بد لليل أن ينجلي، ولا بد للقيد أن ينكسر. — أبو القاسم الشابي",
"من لم يمت بالسيف مات بغيره. — أبو الطيب المتنبي",
"وفي النفس حاجات وفيك فطانة سكوتي بيان عندها وخطاب. — المتنبي",
"إذا رأيت نيوب الليث بارزة فلا تظنن أن الليث يبتسم. — المتنبي",
"وضعتُ عصا التسيار يا أم مالك ولن نلتقي إلا لدى يوم يحشر. — طرفة بن العبد",
"إذا المرء لم يدنس من اللؤم عرضه فكل رداء يرتديه جميل. — عنترة بن شداد",
"ولقد ذكرتك والرماح نواهل مني وبيض الهند تقطر من دمي. — عنترة بن شداد",
"هلا سألتِ الخيل يا ابنة مالك إن كنت جاهلة بما لم تعلمي. — عنترة بن شداد",
"وقوفي في الديار وليس فيها أنيس غير أطلال وذكرى. — امرؤ القيس",
"قفا نبك من ذكرى حبيب ومنزل. — امرؤ القيس",
"إذا غامرت في شرف مروم فلا تقنع بما دون النجوم. — المتنبي",
"من نام لم ينم عنه الزمان. — حكمة عربية",
"العقل زينة والأدب حلية. — حكمة عربية",
"إن للحيطان آذانا. — مثل عربي",
"عصفور في اليد خير من عشرة على الشجرة. — مثل عربي",
"القرد في عين أمه غزال. — مثل عربي",
"يداك أوكتا وفوك نفخ. — مثل عربي",
"مصائب قوم عند قوم فوائد. — مثل عربي",
"إذا كثر الطباخون احترقت الطبخة. — مثل عربي",
"في التأني السلامة وفي العجلة الندامة. — مثل عربي",
"من شبّ على شيء شاب عليه. — مثل عربي",
"لا يلدغ المؤمن من جحر مرتين. — حديث نبوي",
"خيركم من تعلم القرآن وعلمه. — حديث نبوي",
"الدين المعاملة. — حكمة إسلامية",
"من حسن إسلام المرء تركه ما لا يعنيه. — حديث نبوي",
"المؤمن للمؤمن كالبنيان يشد بعضه بعضا. — حديث نبوي",
"الكلمة الطيبة صدقة. — حديث نبوي",
"إنما الأعمال بالنيات. — حديث نبوي",
"من لا يشكر الناس لا يشكر الله. — حديث نبوي",
"الصبر عند الصدمة الأولى. — حكمة إسلامية",
"رحم الله عبدا قال خيرا فغنم أو صمت فسلم. — حديث نبوي",
"الحكمة ضالة المؤمن أنى وجدها فهو أحق بها. — حديث نبوي",
"خير الأمور أوسطها. — حكمة عربية",
"العدل أساس الملك. — حكمة عربية",
"ليس الخبر كالمعاينة. — مثل عربي",
"كل إناء بما فيه ينضح. — مثل عربي",
"إذا صح العزم وضح السبيل. — حكمة عربية",
"من عذب لسانه كثر إخوانه. — حكمة عربية",
"الوطن ليس أرضا نقف عليها بل هو معنى نقف عليه. — إبراهيم الفقي",
"غير نفسك أولا ليتغير العالم من حولك. — إبراهيم الفقي",
"الفشل ليس عكس النجاح بل هو جزء منه. — إبراهيم الفقي",
"لا يوجد شيء اسمه فشل، إنما هي نتائج. — إبراهيم الفقي",
"قوة الإنسان في قدرته على تغيير أفكاره. — إبراهيم الفقي",
"إن أردتَ أن تعرف قدر نفسك فانظر عند ماذا تسكت. — جبران خليل جبران",
"الحرية الحقة ليست في رفض القيود بل في اختيارها. — جبران خليل جبران",
"العقل يحمل مصباح الشك ليضيء طريق اليقين. — جبران خليل جبران",
"أعطونى ناياً وغنّوا فالغنا سر الوجود. — جبران خليل جبران",
"في أعماق قلب كل إنسان حجرة سرية منعزلة تماما لا يعلم بها أحد سواه. — جبران خليل جبران",
"الحب الذي لا يتجدد كل يوم يصبح عادة ثم يصبح عبودية. — جبران خليل جبران",
"إذا تكلم الحب فلا تصدق شيئا سواه ولو هزّ العالم أركانه. — جبران خليل جبران",
"أعطني أذناً واعية أعطك قلباً صادقاً. — جبران خليل جبران",
"لكل إنسان في هذه الدنيا صديق يحبه دون أن يعرف لماذا. — جبران خليل جبران",
"الصداقة مسؤولية حلوة، لا فرصة. — جبران خليل جبران",
"من علمني حرفا صرت له عبدا. — الإمام علي بن أبي طالب",
"لا تكن عبدا لغيرك وقد جعلك الله حرا. — الإمام علي بن أبي طالب",
"الناس نيام فإذا ماتوا انتبهوا. — حكمة عربية",
"إذا لم تكن حليما فتحلّم. — حكمة عربية",
"من هانت عليه نفسه فلا تأمن شره. — حكمة عربية",
"العجب أن ترى إنسانا يحسن الظن بغيره ولا يحسنه بنفسه. — حكمة عربية",
"إذا أردت مطاعا فأمر بمستطاع. — حكمة عربية",
"من طلب المجد سهر الليالي. — حكمة عربية",
"لا خير في صمت عن الحق. — حكمة عربية",
"العلم بلا عمل كالشجر بلا ثمر. — حكمة عربية",
"من حسنت نيته حسن عمله. — حكمة عربية",
"إن الله لا يضيع أجر من أحسن عملا. — حكمة قرآنية",
"وقل اعملوا فسيرى الله عملكم. — حكمة قرآنية",
"من جاهد في سبيل الحق لم يخب سعيه. — حكمة عربية",
"إذا هبت رياحك فاغتنمها. — مثل عربي",
"من طلب العلا عاش كريما أو مات كريما. — حكمة عربية",
"كن كالنخلة كلما رموها بحجر ألقت أجمل ثمرها. — حكمة عربية",
"الأمل هو ذلك الضوء الذي لا تطفئه رياح اليأس. — حكمة عربية",
"إن الصبر مثل اسمه مر ولكن عاقبته أحلى من العسل. — حكمة عربية",
"الحياة رحلة، فاجعلها تستحق العناء. — حكمة عربية",
"ما ضاق أمر إلا وله فرج. — حكمة عربية",
"الأيام دول. — حكمة عربية",
"إذا ضاقت بك الدنيا فتذكر أن السماء لا تزال واسعة. — حكمة عربية"
];

let quoteIntervalId = null;
let quoteRotationActive = localStorage.getItem('quoteRotationActive') !== '0';

function getRandomQuote() {
  const list = lang === 'ar' ? QUOTES_AR : QUOTES_EN;
  return list[Math.floor(Math.random() * list.length)];
}
function showRandomQuote() {
  const el = document.getElementById('quoteBarText');
  if (!el) return;
  el.textContent = getRandomQuote();
  const bar = document.getElementById('quoteBar');
  if (bar) { bar.classList.remove('quote-fade'); void bar.offsetWidth; bar.classList.add('quote-fade'); }
}
function toggleQuoteRotation() {
  quoteRotationActive = !quoteRotationActive;
  localStorage.setItem('quoteRotationActive', quoteRotationActive ? '1' : '0');
  syncQuoteToggleUI();
  const bar = document.getElementById('quoteBar');
  if (quoteRotationActive) {
    if (bar) bar.style.display = '';
    showRandomQuote();
    startQuoteRotation();
  } else {
    if (quoteIntervalId) { clearInterval(quoteIntervalId); quoteIntervalId = null; }
    if (bar) bar.style.display = 'none';
  }
}
function syncQuoteToggleUI() {
  const btn = document.getElementById('quoteToggleBtn');
  if (btn) btn.innerHTML = svgIcon(quoteRotationActive ? 'icon-pause' : 'icon-play');
  const sliderBg = document.getElementById('quoteSliderBg');
  const onOpt = document.getElementById('quoteOnOpt');
  const offOpt = document.getElementById('quoteOffOpt');
  if (sliderBg && onOpt && offOpt) {
    sliderBg.classList.toggle('slide-second', !quoteRotationActive);
    onOpt.classList.toggle('active', quoteRotationActive);
    offOpt.classList.toggle('active', !quoteRotationActive);
  }
}
function startQuoteRotation() {
  if (quoteIntervalId) clearInterval(quoteIntervalId);
  if (!quoteRotationActive) return;
  quoteIntervalId = setInterval(showRandomQuote, 10 * 60 * 1000);
}

/* ==========================================
   13e. ACCOUNT SYSTEM (Supabase Auth + cloud sync)
   ========================================== */
let currentAccount = null;
let cloudUser = null;

const CLOUD_SYNC_KEYS = ['idleTasksV4', 'idleGoals', 'idleCountdowns', 'idleVisibleWidgets', 'idleTheme', 'idleMode',
  'idleLang', 'arcStyleMode', 'idleCity', 'idleTitle', 'idleDisplayLayout', 'spotifyArtMode', 'countdownSort',
  'quoteRotationActive', 'chimeSound_timerEnd', 'chimeSound_eventStart', 'chimeSound_eventEnd', 'chimeSound_alert',
  'idlePomodoroSettings', 'idlePomodoroStats', 'idleHabits', 'idleCryptoCoins', 'idleRssFeedUrl', 'chimeSound_pomodoroComplete',
  'idleTheaterRoundedEdges', 'idleAzanReminderEnabled',
  'spotify_token', 'spotify_token_expiry', 'spotify_refresh_token', 'idleQuickLinks'];

function collectCloudSnapshot() {
  const snap = {};
  CLOUD_SYNC_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) snap[k] = v; });
  snap.acctName = currentAccount ? (currentAccount.name || '') : '';
  snap.acctDob = currentAccount ? (currentAccount.dob || '') : '';
  snap.acctDobIsHijri = currentAccount ? !!currentAccount.dobIsHijri : false;
  return snap;
}
function applyCloudSnapshot(snap) {
  CLOUD_SYNC_KEYS.forEach(k => { if (snap[k] !== undefined) localStorage.setItem(k, snap[k]); });
}

let cloudSyncTimer = null;
function scheduleCloudSync() {
  if (!cloudUser) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(pushCloudSnapshot, 1500);
}
async function pushCloudSnapshot() {
  if (!cloudUser) return;
  const snap = collectCloudSnapshot();
  sessionStorage.setItem('cloudSyncGuard', JSON.stringify(snap));
  await supabaseClient.from('user_data').upsert({ user_id: cloudUser.id, data: snap, updated_at: new Date().toISOString() });
}

(function () {
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (CLOUD_SYNC_KEYS.includes(key)) scheduleCloudSync();
  };
})();

async function activateCloudSession(user) {
  cloudUser = user;
  localStorage.setItem('idleLastAccountEmail', user.email);
  const meta = user.user_metadata || {};
  const { data: row } = await supabaseClient.from('user_data').select('data').eq('user_id', user.id).maybeSingle();

  if (row && row.data && Object.keys(row.data).length) {
    currentAccount = {
      email: user.email,
      name: row.data.acctName || meta.name || '',
      dob: row.data.acctDob || meta.dob || '',
      dobIsHijri: row.data.acctDobIsHijri != null ? !!row.data.acctDobIsHijri : !!meta.dob_is_hijri
    };
    const snapJSON = JSON.stringify(row.data);
    if (sessionStorage.getItem('cloudSyncGuard') !== snapJSON) {
      applyCloudSnapshot(row.data);
      sessionStorage.setItem('cloudSyncGuard', snapJSON);
      location.reload();
      return;
    }
  } else {
    currentAccount = { email: user.email, name: meta.name || '', dob: meta.dob || '', dobIsHijri: !!meta.dob_is_hijri };
    await pushCloudSnapshot();
  }
  renderAccountUI();
  applyBirthdayFromAccount();
}

async function logoutAccount() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  cloudUser = null;
  currentAccount = null;
  sessionStorage.removeItem('cloudSyncGuard');
  renderAccountUI();
  applyBirthdayFromAccount();
}

async function saveAccountProfile() {
  if (!currentAccount || !cloudUser) { await customAlert(translations[lang].acctLoginRequired); return; }
  const dob = document.getElementById('profileDob').value;
  const dobIsHijri = document.getElementById('profileDobIsHijri').checked;
  currentAccount.dob = dob;
  currentAccount.dobIsHijri = dobIsHijri;
  await pushCloudSnapshot();
  await customAlert(translations[lang].acctProfileSaved);
  applyBirthdayFromAccount();
}

function hijriToGregorian(hy, hm, hd) {
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return new Date(year, month - 1, day);
}
function getCurrentHijriYear() {
  return parseInt(new Intl.DateTimeFormat('en-u-ca-islamic', { year: 'numeric' }).format(new Date()), 10);
}
function computeNextBirthdayDate(account) {
  const parts = (account.dob || '').split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (account.dobIsHijri) {
    const hy = getCurrentHijriYear();
    let occ = hijriToGregorian(hy, m, d);
    occ.setHours(0, 0, 0, 0);
    if (occ < today) { occ = hijriToGregorian(hy + 1, m, d); occ.setHours(0, 0, 0, 0); }
    return occ;
  }
  let occ = new Date(today.getFullYear(), m - 1, d);
  if (occ < today) occ = new Date(today.getFullYear() + 1, m - 1, d);
  return occ;
}
function applyBirthdayFromAccount() {
  scheduledTasks = scheduledTasks.filter(t => !t.isBirthdayAuto);
  if (currentAccount && currentAccount.dob) {
    const occ = computeNextBirthdayDate(currentAccount);
    if (occ) {
      const iso = (new Date(occ.getTime() - occ.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      scheduledTasks.push({
        id: -1,
        name: lang === 'en' ? `${currentAccount.name}'s Birthday` : `عيد ميلاد ${currentAccount.name}`,
        date: iso, endDate: iso,
        allDay: true, start: '00:00', end: '23:59',
        isRoutine: false, repeat: 'none', days: [],
        color: '#ff6b81', icon: 'cake',
        isBirthdayAuto: true,
        notes: '', location: '', url: '', alert: 'none', timezone: ''
      });
    }
  }
  localStorage.setItem('idleTasksV4', JSON.stringify(scheduledTasks));
  if (typeof renderV3UI === 'function') renderV3UI();
  if (typeof renderTimetable === 'function') renderTimetable();
  if (document.getElementById('scheduleManagerModal') && document.getElementById('scheduleManagerModal').classList.contains('active') && typeof renderScheduleManager === 'function') renderScheduleManager();
}

function triggerConfetti() {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#ff6b81', '#ffa502', '#eccc68', '#7bed9f', '#1e90ff', '#5352ed', '#9b59b6'];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    piece.style.animationDelay = (Math.random() * 0.5) + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.width = piece.style.height = (6 + Math.random() * 6) + 'px';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 5500);
  }
}

function renderAccountUI() {
  const loggedOut = document.getElementById('acctLoggedOutBlock');
  const loggedIn = document.getElementById('acctLoggedInBlock');
  const settingsBtn = document.getElementById('acctSettingsBtn');
  if (!loggedOut || !loggedIn) return;
  if (currentAccount) {
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'block';
    if (settingsBtn) settingsBtn.style.display = 'inline-flex';
    document.getElementById('acctWelcomeText').textContent = translations[lang].acctWelcomeText.replace('{name}', currentAccount.name);
    document.getElementById('acctEmailText').textContent = currentAccount.email;
  } else {
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
    if (settingsBtn) settingsBtn.style.display = 'none';
  }
}
function openAccountSettings() {
  if (!currentAccount) return;
  document.getElementById('profileDob').value = currentAccount.dob || '';
  document.getElementById('profileDobIsHijri').checked = !!currentAccount.dobIsHijri;
  document.getElementById('acctNewPassword').value = '';
  document.getElementById('acctNewPasswordConfirm').value = '';
  document.getElementById('accountSettingsModal').classList.add('active');
}
function closeAccountSettings() {
  document.getElementById('accountSettingsModal').classList.remove('active');
}

/* ---- Error log viewer (QA Tools > Error Log) ----
   Reads the rolling buffer written by the capture shim installed in index.html's
   <head>. Kept out of CLOUD_SYNC_KEYS on purpose: diagnostics describe one
   device's session, so syncing them between devices would mix unrelated traces. */
function readErrorLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem('idleErrorLog') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function refreshErrorCountBadge() {
  const badge = document.getElementById('devErrorCount');
  if (!badge) return;
  const n = readErrorLog().length;
  badge.textContent = n ? `(${toNum(n)})` : '';
  badge.style.color = n ? '#ff4757' : '';
}
function openErrorLog() {
  const listEl = document.getElementById('errorLogList');
  const entries = readErrorLog();
  if (!entries.length) {
    listEl.innerHTML = `<div class="error-log-empty">No errors captured on this device. ${escapeHTML('\u{1F389}')}</div>`;
  } else {
    listEl.innerHTML = entries.slice().reverse().map(en => {
      const when = new Date(en.at || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ar');
      return `<div class="error-log-entry">
        <div class="ele-top"><span class="ele-kind ele-kind-${escapeHTML(en.kind || 'error')}">${escapeHTML(en.kind || 'error')}</span><span class="ele-time">${escapeHTML(when)}</span></div>
        <div class="ele-msg">${escapeHTML(en.msg || '')}</div>
        ${en.src ? `<div class="ele-src">${escapeHTML(en.src)}</div>` : ''}
        ${en.stack ? `<pre class="ele-stack">${escapeHTML(en.stack)}</pre>` : ''}
      </div>`;
    }).join('');
  }
  document.getElementById('errorLogModal').classList.add('active');
}
function closeErrorLog() {
  document.getElementById('errorLogModal').classList.remove('active');
}
async function copyErrorLog() {
  const entries = readErrorLog();
  if (!entries.length) { await customAlert(lang === 'en' ? 'Nothing to copy - the error log is empty.' : 'لا يوجد شيء لنسخه - سجل الأخطاء فارغ.'); return; }
  const text = entries.map(en => `[${new Date(en.at || 0).toISOString()}] (${en.kind}) ${en.msg}${en.src ? `\n  at ${en.src}` : ''}${en.stack ? `\n${en.stack}` : ''}`).join('\n\n');
  try {
    await navigator.clipboard.writeText(text);
    await customAlert(lang === 'en' ? 'Error log copied to clipboard.' : 'تم نسخ سجل الأخطاء.');
  } catch (e) {
    await customAlert(lang === 'en' ? 'Could not access the clipboard.' : 'تعذر الوصول إلى الحافظة.');
  }
}
async function clearErrorLog() {
  const ok = await customConfirm(
    lang === 'en' ? 'Clear all captured errors on this device?' : 'مسح جميع الأخطاء المسجلة على هذا الجهاز؟',
    lang === 'en' ? 'Clear Error Log' : 'مسح سجل الأخطاء', true);
  if (!ok) return;
  localStorage.removeItem('idleErrorLog');
  refreshErrorCountBadge();
  openErrorLog();
}
async function changeAccountPassword() {
  const pw = document.getElementById('acctNewPassword').value;
  const confirm = document.getElementById('acctNewPasswordConfirm').value;
  if (!pw || pw.length < 6) { await customAlert(translations[lang].acctPasswordTooShort); return; }
  if (pw !== confirm) { await customAlert(translations[lang].acctPasswordMismatch); return; }
  const { error } = await supabaseClient.auth.updateUser({ password: pw });
  if (error) { await customAlert(error.message); return; }
  document.getElementById('acctNewPassword').value = '';
  document.getElementById('acctNewPasswordConfirm').value = '';
  await customAlert(translations[lang].acctPasswordChanged);
}

/* ==========================================
   13f. THEATER MODE
   ========================================== */
let theaterSourceTab = 'file';
let theaterLayoutMode = 'floating';
let theaterDimLevel = parseInt(localStorage.getItem('idleTheaterDim') || '70', 10);
let theaterMediaType = null;
let theaterObjectUrl = null;
let theaterRoundedEdges = localStorage.getItem('idleTheaterRoundedEdges') !== '0';

function setTheaterRoundedEdges(enabled) {
  theaterRoundedEdges = enabled;
  localStorage.setItem('idleTheaterRoundedEdges', enabled ? '1' : '0');
  applyTheaterRoundedEdges();
}
function applyTheaterRoundedEdges() {
  const overlay = document.getElementById('theaterOverlay');
  if (overlay) overlay.classList.toggle('theater-square-edges', !theaterRoundedEdges);
}
function theaterSkipIntro() {
  if (theaterMediaType === 'iframe') return;
  const v = document.getElementById('theaterVideo');
  if (!v) return;
  v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 90);
  document.getElementById('theaterOverlay').classList.add('theater-intro-skipped');
}

function setTheaterSourceTab(tab) {
  theaterSourceTab = tab;
  document.getElementById('theaterTabFileBtn').classList.toggle('active', tab === 'file');
  document.getElementById('theaterTabUrlBtn').classList.toggle('active', tab === 'url');
  document.getElementById('theaterFileBlock').style.display = tab === 'file' ? 'block' : 'none';
  document.getElementById('theaterUrlBlock').style.display = tab === 'url' ? 'block' : 'none';
}
function handleTheaterFileSelect(input) {
  if (!input.files || !input.files[0]) return;
  if (theaterObjectUrl) URL.revokeObjectURL(theaterObjectUrl);
  theaterObjectUrl = URL.createObjectURL(input.files[0]);
  theaterMediaType = 'video';
  document.getElementById('theaterEnterBtn').disabled = false;
}
function getYouTubeEmbedUrl(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  }
  return null;
}
function loadTheaterUrl() {
  const url = document.getElementById('theaterUrlInput').value.trim();
  if (!url) return;
  const ytEmbed = getYouTubeEmbedUrl(url);
  if (ytEmbed) {
    theaterMediaType = 'iframe';
    theaterObjectUrl = ytEmbed;
  } else {
    theaterMediaType = 'video';
    theaterObjectUrl = url;
  }
  document.getElementById('theaterEnterBtn').disabled = false;
}
function setTheaterLayout(modeName, btnEl) {
  theaterLayoutMode = modeName;
  document.querySelectorAll('#theaterLayoutGrid .clock-toggle-btn').forEach(b => b.classList.remove('active-lang'));
  if (btnEl) btnEl.classList.add('active-lang');
  const overlay = document.getElementById('theaterOverlay');
  const win = document.getElementById('theaterWindow');
  // Drag/resize leave inline left/top/right/width/height on #theaterWindow, and inline
  // styles always beat the mode-* CSS rules - clear them so each mode's box applies fresh.
  ['left', 'top', 'right', 'width', 'height'].forEach(p => win.style.removeProperty(p));
  overlay.classList.remove('mode-floating', 'mode-landscape', 'mode-fullscreen');
  overlay.classList.add('mode-' + modeName);
  applyTheaterDim();
  refreshTheaterDimAvailability();
}
function setTheaterDimLevel(val) {
  theaterDimLevel = parseInt(val, 10);
  localStorage.setItem('idleTheaterDim', String(theaterDimLevel));
  document.getElementById('theaterDimValue').textContent = theaterDimLevel + '%';
  applyTheaterDim();
}
function applyTheaterDim() {
  const backdrop = document.getElementById('theaterBackdrop');
  if (!backdrop) return;
  backdrop.style.opacity = theaterLayoutMode === 'floating' ? '0' : (theaterDimLevel / 100);
}
/* Dimming is meaningless in Floating mode - that layout is a small picture-in-picture
   window and the point is that the dashboard behind it stays visible and usable, so
   applyTheaterDim() pins the backdrop to 0 there. The slider used to stay fully
   enabled anyway, updating its % label while having no possible effect, which read
   as a broken control. It is now disabled with an explanation in that mode. */
function refreshTheaterDimAvailability() {
  const slider = document.getElementById('theaterDimSlider');
  const note = document.getElementById('theaterDimNote');
  const row = document.getElementById('theaterDimRow');
  const floating = theaterLayoutMode === 'floating';
  if (slider) slider.disabled = floating;
  if (row) row.style.opacity = floating ? '0.45' : '1';
  if (note) note.style.display = floating ? 'block' : 'none';
}
function theaterBackdropClick(e) {
  if (e.target !== e.currentTarget) return;
  if (theaterLayoutMode !== 'floating') exitTheaterMode();
}

function enterTheaterMode() {
  if (!theaterObjectUrl) { customAlert(translations[lang].theaterNoSource); return; }
  const overlay = document.getElementById('theaterOverlay');
  const videoEl = document.getElementById('theaterVideo');
  const iframeEl = document.getElementById('theaterIframe');
  if (theaterMediaType === 'iframe') {
    iframeEl.src = theaterObjectUrl;
    iframeEl.style.display = 'block';
    videoEl.style.display = 'none';
    videoEl.pause();
    videoEl.removeAttribute('src');
  } else {
    videoEl.src = theaterObjectUrl;
    videoEl.style.display = 'block';
    iframeEl.style.display = 'none';
    iframeEl.src = '';
    videoEl.play().catch(() => {});
  }
  overlay.classList.remove('theater-intro-skipped');
  overlay.classList.toggle('theater-media-iframe', theaterMediaType === 'iframe');
  overlay.classList.add('active');
  setTheaterLayout(theaterLayoutMode, document.querySelector(`#theaterLayoutGrid .clock-toggle-btn[onclick*="'${theaterLayoutMode}'"]`));
  initTheaterDragResize();
}
function exitTheaterMode() {
  const overlay = document.getElementById('theaterOverlay');
  overlay.classList.remove('active');
  const videoEl = document.getElementById('theaterVideo');
  const iframeEl = document.getElementById('theaterIframe');
  videoEl.pause();
  iframeEl.src = '';
}

// Arrow keys seek ±5s, Space toggles play/pause - only while Theater Mode is
// open and playing a local/direct video (can't control a cross-origin
// YouTube iframe this way, so this is a no-op during iframe playback).
window.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('theaterOverlay');
  if (!overlay || !overlay.classList.contains('active') || theaterMediaType === 'iframe') return;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const v = document.getElementById('theaterVideo');
  if (!v) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 5); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (v.paused) v.play().catch(() => {}); else v.pause(); }
});

let theaterDragInit = false;
function pointerXY(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}
function initTheaterDragResize() {
  if (theaterDragInit) return;
  theaterDragInit = true;
  const win = document.getElementById('theaterWindow');
  const header = document.getElementById('theaterHeader');
  const handle = document.getElementById('theaterResizeHandle');
  let dragging = false, dragStartX = 0, dragStartY = 0, winStartX = 0, winStartY = 0;
  const startDrag = (e) => {
    if (theaterLayoutMode !== 'floating') return;
    dragging = true;
    const p = pointerXY(e);
    dragStartX = p.x; dragStartY = p.y;
    const rect = win.getBoundingClientRect();
    winStartX = rect.left; winStartY = rect.top;
    e.preventDefault();
  };
  const moveDrag = (e) => {
    if (!dragging) return;
    const p = pointerXY(e);
    const dx = p.x - dragStartX, dy = p.y - dragStartY;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - win.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - win.offsetHeight - margin);
    win.style.left = Math.min(Math.max(winStartX + dx, margin), maxLeft) + 'px';
    win.style.top = Math.min(Math.max(winStartY + dy, margin), maxTop) + 'px';
    win.style.right = 'auto';
  };
  const endDrag = () => { dragging = false; };
  header.addEventListener('mousedown', startDrag);
  header.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  let resizing = false, resizeStartX = 0, resizeStartY = 0, startW = 0, startH = 0;
  const startResize = (e) => {
    if (theaterLayoutMode !== 'floating') return;
    resizing = true;
    const p = pointerXY(e);
    resizeStartX = p.x; resizeStartY = p.y;
    const rect = win.getBoundingClientRect();
    startW = rect.width; startH = rect.height;
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
    win.style.right = 'auto';
    e.preventDefault();
    e.stopPropagation();
  };
  const moveResize = (e) => {
    if (!resizing) return;
    const p = pointerXY(e);
    const margin = 8;
    const rect = win.getBoundingClientRect();
    const maxW = window.innerWidth - rect.left - margin;
    const maxH = window.innerHeight - rect.top - margin;
    win.style.width = Math.min(Math.max(200, startW + (p.x - resizeStartX)), maxW) + 'px';
    win.style.height = Math.min(Math.max(120, startH + (p.y - resizeStartY)), maxH) + 'px';
  };
  const endResize = () => { resizing = false; };
  handle.addEventListener('mousedown', startResize);
  handle.addEventListener('touchstart', startResize, { passive: false });
  window.addEventListener('mousemove', moveResize);
  window.addEventListener('touchmove', moveResize, { passive: false });
  window.addEventListener('mouseup', endResize);
  window.addEventListener('touchend', endResize);
}

/* ==========================================
   13g. DISPLAY LAYOUT (PC / Phone / Tablet / TV) + TV BARCODE LOGIN
   ========================================== */
function detectDeviceLayout() {
  const ua = navigator.userAgent || '';
  const tvPattern = /SmartTV|SMART-TV|Tizen|WebOS|Web0S|NetCast|HbbTV|GoogleTV|Google TV|AppleTV|CrKey|AFTB|AFTS|AFTT|AFTM|BRAVIA|VIDAA|Roku|POV_TV|OMI\/|VIZIO/i;
  if (tvPattern.test(ua)) return 'tv';

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const isCoarsePointer = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const isMobileUA = /iPhone|iPod|Mobi|Android.*Mobile/i.test(ua);
  // Modern iPadOS Safari reports its UA as a plain Mac by default (no "iPad" token) - the
  // standard workaround is checking for real touch support on a platform that claims to be Mac,
  // since actual desktop Macs report maxTouchPoints === 0.
  const isIPadOnMacUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isTabletUA = /iPad|Tablet|(?:Android(?!.*Mobile))/i.test(ua) || isIPadOnMacUA;
  const w = window.innerWidth;

  if (isMobileUA || ((isTouch || isCoarsePointer) && !isTabletUA && w < 760)) return 'phone';
  if (isTabletUA || ((isTouch || isCoarsePointer) && w >= 760)) return 'tablet';
  return 'pc';
}
function autoDetectDisplayLayout() {
  localStorage.removeItem('idleDisplayLayout');
  setDisplayLayout(detectDeviceLayout());
}
function setDisplayLayout(mode, btnEl) {
  document.body.dataset.layout = mode;
  document.documentElement.classList.toggle('tv-scale', mode === 'tv');
  localStorage.setItem('idleDisplayLayout', mode);
  document.querySelectorAll('#layoutPickerGrid .clock-toggle-btn').forEach(b => b.classList.remove('active-lang'));
  if (btnEl) btnEl.classList.add('active-lang');
  else {
    const match = document.querySelector(`#layoutPickerGrid .clock-toggle-btn[onclick*="'${mode}'"]`);
    if (match) match.classList.add('active-lang');
  }
  if (mode !== 'tv') stopTvBarcodeScan();
}

let tvScanStream = null;
let tvScanRafId = null;
async function startTvBarcodeScan() {
  const statusEl = document.getElementById('tvScanStatus');
  const videoEl = document.getElementById('tvScanVideo');
  if (!('BarcodeDetector' in window)) {
    statusEl.textContent = translations[lang].tvScanNotSupported;
    return;
  }
  statusEl.textContent = translations[lang].tvScanRequesting;
  try {
    tvScanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (e) {
    statusEl.textContent = translations[lang].tvScanError;
    return;
  }
  videoEl.srcObject = tvScanStream;
  videoEl.style.display = 'block';
  statusEl.textContent = translations[lang].tvScanWaiting;

  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const scanLoop = async () => {
    if (!tvScanStream) return;
    try {
      const codes = await detector.detect(videoEl);
      if (codes.length > 0) {
        const raw = codes[0].rawValue || '';
        const sep = raw.includes('|') ? '|' : (raw.includes(':') ? ':' : null);
        if (sep) {
          const idx = raw.indexOf(sep);
          const email = raw.substring(0, idx).trim().toLowerCase();
          const password = raw.substring(idx + 1).trim();
          statusEl.textContent = translations[lang].tvScanFound;
          stopTvBarcodeScan();
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) { statusEl.textContent = error.message; return; }
          await activateCloudSession(data.user);
          return;
        } else {
          statusEl.textContent = translations[lang].tvScanBadFormat;
        }
      }
    } catch (e) { /* detection frame error, keep trying */ }
    tvScanRafId = requestAnimationFrame(scanLoop);
  };
  scanLoop();
}
function stopTvBarcodeScan() {
  if (tvScanRafId) cancelAnimationFrame(tvScanRafId);
  tvScanRafId = null;
  if (tvScanStream) {
    tvScanStream.getTracks().forEach(t => t.stop());
    tvScanStream = null;
  }
  const videoEl = document.getElementById('tvScanVideo');
  if (videoEl) { videoEl.style.display = 'none'; videoEl.srcObject = null; }
}

/* ==========================================
   13h. NEW WIDGETS (Pomodoro / Habit Streaks / Crypto Ticker / RSS Feed)
   ========================================== */
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function todayKey() { return dateKey(new Date()); }
function widgetEmptyState(text) { return `<div style="text-align:center; color:var(--text-secondary); font-size:0.75rem; padding:10px 0;">${escapeHTML(text)}</div>`; }

/* ---- Pomodoro Focus Timer ---- */
let pomodoroSettings = safeParseJSON('idlePomodoroSettings', { workMin: 25, breakMin: 5, longBreakMin: 15, sessionsUntilLongBreak: 4 });
let pomodoroStats = safeParseJSON('idlePomodoroStats', {});
let pomodoroState = { running: false, phase: 'work', endTime: 0, remainingMs: pomodoroSettings.workMin * 60000, sessionsThisCycle: 0 };

function pomodoroPhaseDuration(phase) {
  if (phase === 'work') return pomodoroSettings.workMin * 60000;
  if (phase === 'longBreak') return pomodoroSettings.longBreakMin * 60000;
  return pomodoroSettings.breakMin * 60000;
}
function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return toNum(`${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`);
}
function pomodoroTick() {
  if (!pomodoroState.running) return;
  const remaining = pomodoroState.endTime - Date.now();
  if (remaining <= 0) { pomodoroAdvancePhase(); }
  else { pomodoroState.remainingMs = remaining; updatePomodoroTimeDisplay(); }
}
function updatePomodoroTimeDisplay() {
  const el = document.getElementById('pomWidgetTime');
  if (el) el.textContent = formatMMSS(pomodoroState.remainingMs);
}
function pomodoroAdvancePhase() {
  playChime('pomodoroComplete');
  if (pomodoroState.phase === 'work') {
    const today = todayKey();
    pomodoroStats[today] = (pomodoroStats[today] || 0) + 1;
    localStorage.setItem('idlePomodoroStats', JSON.stringify(pomodoroStats));
    pomodoroState.sessionsThisCycle++;
    if (pomodoroState.sessionsThisCycle >= pomodoroSettings.sessionsUntilLongBreak) {
      pomodoroState.phase = 'longBreak';
      pomodoroState.sessionsThisCycle = 0;
    } else {
      pomodoroState.phase = 'break';
    }
  } else {
    pomodoroState.phase = 'work';
  }
  pomodoroState.remainingMs = pomodoroPhaseDuration(pomodoroState.phase);
  pomodoroState.endTime = Date.now() + pomodoroState.remainingMs;
  renderPomodoroWidget();
}
function pomodoroToggleStartPause() {
  if (pomodoroState.running) {
    pomodoroState.running = false;
    pomodoroState.remainingMs = Math.max(0, pomodoroState.endTime - Date.now());
  } else {
    pomodoroState.running = true;
    pomodoroState.endTime = Date.now() + pomodoroState.remainingMs;
  }
  renderPomodoroWidget();
}
function pomodoroReset() {
  pomodoroState.running = false;
  pomodoroState.phase = 'work';
  pomodoroState.sessionsThisCycle = 0;
  pomodoroState.remainingMs = pomodoroPhaseDuration('work');
  renderPomodoroWidget();
}
function renderPomodoroHistoryStrip() {
  const el = document.getElementById('pomHistoryStrip');
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar', { weekday: 'narrow' }), count: pomodoroStats[dateKey(d)] || 0 });
  }
  el.innerHTML = days.map(d => `<div class="pom-history-day"><span class="phd-count">${toNum(d.count)}</span><span>${escapeHTML(d.label)}</span></div>`).join('');
}
function renderPomodoroWidget() {
  updatePomodoroTimeDisplay();
  const phaseKey = pomodoroState.phase === 'work' ? 'pomWork' : (pomodoroState.phase === 'break' ? 'pomBreak' : 'pomLongBreak');
  const phaseEl = document.getElementById('pomWidgetPhase');
  if (phaseEl) phaseEl.textContent = translations[lang][phaseKey];
  const sessionsEl = document.getElementById('pomWidgetSessionsToday');
  if (sessionsEl) sessionsEl.textContent = `${toNum(pomodoroStats[todayKey()] || 0)} ${lang === 'en' ? 'today' : 'اليوم'}`;
  const btn = document.getElementById('pomStartPauseBtn');
  if (btn) btn.innerHTML = svgIcon(pomodoroState.running ? 'icon-pause' : 'icon-play');
  renderPomodoroHistoryStrip();
}
function openPomodoroSettings() {
  document.getElementById('pomWorkMinInput').value = pomodoroSettings.workMin;
  document.getElementById('pomBreakMinInput').value = pomodoroSettings.breakMin;
  document.getElementById('pomLongBreakMinInput').value = pomodoroSettings.longBreakMin;
  document.getElementById('pomSessionsUntilLongInput').value = pomodoroSettings.sessionsUntilLongBreak;
  document.getElementById('pomodoroSettingsModal').classList.add('active');
}
function closePomodoroSettings() {
  document.getElementById('pomodoroSettingsModal').classList.remove('active');
}
function savePomodoroSettings() {
  // Only snap the live countdown to the new duration if it hasn't been touched yet
  // (still sitting at a full, un-decremented phase) - otherwise saving settings would
  // silently wipe a paused-but-in-progress session's remaining time.
  const wasPristine = !pomodoroState.running && pomodoroState.remainingMs === pomodoroPhaseDuration(pomodoroState.phase);
  pomodoroSettings = {
    workMin: Math.max(1, parseInt(document.getElementById('pomWorkMinInput').value, 10) || 25),
    breakMin: Math.max(1, parseInt(document.getElementById('pomBreakMinInput').value, 10) || 5),
    longBreakMin: Math.max(1, parseInt(document.getElementById('pomLongBreakMinInput').value, 10) || 15),
    sessionsUntilLongBreak: Math.max(2, parseInt(document.getElementById('pomSessionsUntilLongInput').value, 10) || 4)
  };
  localStorage.setItem('idlePomodoroSettings', JSON.stringify(pomodoroSettings));
  if (wasPristine) pomodoroState.remainingMs = pomodoroPhaseDuration(pomodoroState.phase);
  closePomodoroSettings();
  renderPomodoroWidget();
}

/* ---- Habit Streak Tracker ---- */
let habitsList = safeParseJSON('idleHabits', []);
let habitsLastRenderedDay = null;
function computeHabitStreak(habit) {
  let streak = 0, d = new Date();
  if (!habit.history[dateKey(d)]) d.setDate(d.getDate() - 1);
  while (habit.history[dateKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function checkHabitsDayRollover() {
  if (habitsLastRenderedDay !== todayKey()) renderHabitsWidget();
}
function renderHabitsWidget() {
  habitsLastRenderedDay = todayKey();
  const today = habitsLastRenderedDay;
  const doneCount = habitsList.filter(h => h.history[today]).length;
  const countEl = document.getElementById('habitsWidgetDoneCount');
  if (countEl) countEl.textContent = `${toNum(doneCount)}/${toNum(habitsList.length)}`;
  let bestStreak = 0;
  habitsList.forEach(h => { const s = computeHabitStreak(h); if (s > bestStreak) bestStreak = s; });
  const streakEl = document.getElementById('habitsWidgetStreakLabel');
  if (streakEl) {
    streakEl.textContent = bestStreak > 0
      ? (lang === 'en' ? `🔥 ${toNum(bestStreak)} day streak` : `🔥 سلسلة ${toNum(bestStreak)} يوم`)
      : translations[lang].habitsNoStreak;
  }
  const listEl = document.getElementById('habitsWidgetList');
  if (!listEl) return;
  if (!habitsList.length) {
    listEl.innerHTML = widgetEmptyState(lang === 'en' ? 'No habits yet - add one in settings.' : 'لا توجد عادات بعد - أضف واحدة من الإعدادات.');
    return;
  }
  listEl.innerHTML = habitsList.map(h => {
    const done = !!h.history[today];
    const streak = computeHabitStreak(h);
    return `<div class="widget-task-row" style="--row-color:${done ? '#2ed573' : 'var(--accent)'};" onclick="event.stopPropagation(); toggleHabitToday(${h.id});">
      <span class="wt-icon">${svgIcon('icon-clipboard-check')}</span>
      <span class="wt-name">${escapeHTML(h.name)}</span>
      <span class="wt-time">${done ? '✓ ' : ''}${streak > 0 ? '🔥' + toNum(streak) : ''}</span>
    </div>`;
  }).join('');
}
function toggleHabitToday(id) {
  const habit = habitsList.find(h => h.id === id);
  if (!habit) return;
  const today = todayKey();
  if (habit.history[today]) delete habit.history[today];
  else habit.history[today] = true;
  localStorage.setItem('idleHabits', JSON.stringify(habitsList));
  renderHabitsWidget();
}
function addHabit() {
  const input = document.getElementById('newHabitName');
  const name = input.value.trim();
  if (!name) return;
  habitsList.push({ id: generateEntityId(), name, history: {} });
  localStorage.setItem('idleHabits', JSON.stringify(habitsList));
  input.value = '';
  renderHabitsManageList();
  renderHabitsWidget();
}
async function deleteHabit(id) {
  const habit = habitsList.find(h => h.id === id);
  if (!habit) return;
  const ok = await customConfirm(
    lang === 'en' ? `Delete habit "${habit.name}"? This also deletes its streak history.` : `حذف عادة "${habit.name}"؟ سيتم حذف سجل السلسلة أيضًا.`,
    lang === 'en' ? 'Delete Habit' : 'حذف العادة', true);
  if (!ok) return;
  habitsList = habitsList.filter(h => h.id !== id);
  localStorage.setItem('idleHabits', JSON.stringify(habitsList));
  renderHabitsManageList();
  renderHabitsWidget();
}
function renderHabitsManageList() {
  const el = document.getElementById('habitsManageList');
  if (!el) return;
  if (!habitsList.length) {
    el.innerHTML = widgetEmptyState(lang === 'en' ? 'No habits yet.' : 'لا توجد عادات بعد.');
    return;
  }
  el.innerHTML = habitsList.map(h => `
    <div class="sm-item">
      <div class="sm-item-info">
        <div class="sm-item-name">${escapeHTML(h.name)}</div>
        <div class="sm-item-detail">${toNum(computeHabitStreak(h))} ${lang === 'en' ? 'day streak' : 'يوم متتالي'}</div>
      </div>
      <div class="sm-item-actions">
        <button class="sm-btn delete" onclick="deleteHabit(${h.id})">${lang === 'en' ? 'Delete' : 'حذف'}</button>
      </div>
    </div>
  `).join('');
}
function openHabitsSettings() {
  renderHabitsManageList();
  document.getElementById('habitsSettingsModal').classList.add('active');
}
function closeHabitsSettings() {
  document.getElementById('habitsSettingsModal').classList.remove('active');
}

/* ---- Crypto Ticker ---- */
const CRYPTO_PRESET_COINS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin', 'ripple', 'litecoin', 'polkadot', 'chainlink', 'binancecoin'];
const CRYPTO_COIN_LABELS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA', dogecoin: 'DOGE', ripple: 'XRP', litecoin: 'LTC', polkadot: 'DOT', chainlink: 'LINK', binancecoin: 'BNB' };
let cryptoCoins = safeParseJSON('idleCryptoCoins', ['bitcoin', 'ethereum', 'solana']);
let cryptoCache = safeParseJSON('idleCryptoCache', { data: {}, fetchedAt: 0, error: false });
function formatCryptoPrice(usd) {
  return '$' + toNum(usd.toLocaleString(undefined, { maximumFractionDigits: usd < 1 ? 4 : 2 }));
}
async function fetchCryptoPrices() {
  if (!cryptoCoins.length) { renderCryptoWidget(); return; }
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoCoins.join(','))}&vs_currencies=usd&include_24hr_change=true`);
    if (!res.ok) throw new Error('bad status');
    cryptoCache = { data: await res.json(), fetchedAt: Date.now(), error: false };
  } catch (e) {
    cryptoCache.error = true;
  }
  localStorage.setItem('idleCryptoCache', JSON.stringify(cryptoCache));
  renderCryptoWidget();
}
function renderCryptoWidget() {
  const staleBadge = document.getElementById('cryptoStaleBadge');
  if (staleBadge) staleBadge.style.display = cryptoCache.error ? 'inline-block' : 'none';
  const topId = cryptoCoins[0];
  const topData = topId ? cryptoCache.data[topId] : null;
  const priceEl = document.getElementById('cryptoWidgetTopPrice');
  const nameEl = document.getElementById('cryptoWidgetTopName');
  const changeEl = document.getElementById('cryptoWidgetTopChange');
  if (topData) {
    if (priceEl) priceEl.textContent = formatCryptoPrice(topData.usd);
    if (nameEl) nameEl.textContent = CRYPTO_COIN_LABELS[topId] || topId;
    if (changeEl) {
      const chg = topData.usd_24h_change || 0;
      changeEl.textContent = (chg >= 0 ? '+' : '') + toNum(chg.toFixed(2)) + '%';
      changeEl.classList.toggle('positive', chg >= 0);
      changeEl.classList.toggle('negative', chg < 0);
    }
  } else {
    if (priceEl) priceEl.textContent = '$--';
    if (nameEl) nameEl.textContent = '--';
    if (changeEl) { changeEl.textContent = '--%'; changeEl.classList.remove('positive', 'negative'); }
  }
  const listEl = document.getElementById('cryptoWidgetList');
  if (!listEl) return;
  if (!cryptoCoins.length) {
    listEl.innerHTML = widgetEmptyState(lang === 'en' ? 'No coins configured - add some in settings.' : 'لم يتم تحديد عملات - أضف بعضها من الإعدادات.');
    return;
  }
  listEl.innerHTML = cryptoCoins.map(id => {
    const d = cryptoCache.data[id];
    const chg = d ? (d.usd_24h_change || 0) : 0;
    return `<div class="crypto-row">
      <span class="cr-name">${escapeHTML(CRYPTO_COIN_LABELS[id] || id)}</span>
      <span class="cr-price">${d ? formatCryptoPrice(d.usd) : '--'}</span>
      <span class="crypto-change ${chg >= 0 ? 'positive' : 'negative'}">${d ? (chg >= 0 ? '+' : '') + toNum(chg.toFixed(2)) + '%' : ''}</span>
    </div>`;
  }).join('');
}
function renderCryptoPresetGrid() {
  const grid = document.getElementById('cryptoPresetGrid');
  if (!grid) return;
  const allIds = Array.from(new Set([...CRYPTO_PRESET_COINS, ...cryptoCoins]));
  grid.innerHTML = allIds.map(id => `
    <button type="button" class="clock-toggle-btn ${cryptoCoins.includes(id) ? 'active-lang' : ''}" onclick="toggleCryptoPresetCoin('${id}')">
      <span>${escapeHTML(CRYPTO_COIN_LABELS[id] || id)}</span>
    </button>
  `).join('');
}
function toggleCryptoPresetCoin(id) {
  if (cryptoCoins.includes(id)) cryptoCoins = cryptoCoins.filter(c => c !== id);
  else cryptoCoins.push(id);
  localStorage.setItem('idleCryptoCoins', JSON.stringify(cryptoCoins));
  renderCryptoPresetGrid();
  fetchCryptoPrices();
}
function addCustomCryptoCoin() {
  const input = document.getElementById('newCryptoId');
  // Real CoinGecko ids are always lowercase-alphanumeric-with-hyphens; stripping
  // anything else also keeps this safe to interpolate into the preset grid's
  // inline onclick without a quote/markup-breaking character sneaking through.
  const id = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (id && !cryptoCoins.includes(id)) {
    cryptoCoins.push(id);
    localStorage.setItem('idleCryptoCoins', JSON.stringify(cryptoCoins));
    renderCryptoPresetGrid();
    fetchCryptoPrices();
  }
  input.value = '';
}
function openCryptoSettings() {
  renderCryptoPresetGrid();
  document.getElementById('cryptoSettingsModal').classList.add('active');
}
function closeCryptoSettings() {
  document.getElementById('cryptoSettingsModal').classList.remove('active');
}

/* ---- Quick Links ----
   These two links used to be hardcoded <a> tags in index.html pointing at bare
   github.com / youtube.com homepages, with no way for anyone to change them -
   placeholder markup that shipped as if it were a feature. Now user-owned and
   synced. Defaults keep the original two so existing dashboards don't change
   shape; they can be deleted like any other link. */
let quickLinks = safeParseJSON('idleQuickLinks', [
  { name: 'GitHub', url: 'https://github.com', icon: 'icon-package' },
  { name: 'YouTube', url: 'https://youtube.com', icon: 'icon-play-circle' }
]);
function quickLinkIcon(icon) {
  return /^icon-[a-z-]+$/.test(icon || '') ? icon : 'icon-link';
}
function renderQuickLinks() {
  const listEl = document.getElementById('quickLinksList');
  if (!listEl) return;
  if (!quickLinks.length) {
    listEl.innerHTML = widgetEmptyState(lang === 'en' ? 'No links yet - add one in settings.' : 'لا توجد روابط بعد - أضف واحداً من الإعدادات.');
    return;
  }
  listEl.innerHTML = quickLinks.map(l => {
    const href = safeExternalUrl(l.url);
    if (!href) return '';
    return `<a href="${escapeHTML(href)}" target="_blank" rel="noopener" class="quick-link-item">${svgIcon(quickLinkIcon(l.icon))} ${escapeHTML(l.name)}</a>`;
  }).join('');
}
function renderQuickLinksManageList() {
  const el = document.getElementById('quickLinksManageList');
  if (!el) return;
  if (!quickLinks.length) {
    el.innerHTML = widgetEmptyState(lang === 'en' ? 'No links yet.' : 'لا توجد روابط بعد.');
    return;
  }
  el.innerHTML = quickLinks.map((l, i) => `
    <div class="sm-item">
      <div class="sm-item-info">
        <div class="sm-item-name">${escapeHTML(l.name)}</div>
        <div class="sm-item-detail">${escapeHTML(l.url)}</div>
      </div>
      <div class="sm-item-actions">
        <button class="sm-btn delete" onclick="deleteQuickLink(${i})">${lang === 'en' ? 'Delete' : 'حذف'}</button>
      </div>
    </div>
  `).join('');
}
/* Turns what someone actually types into a safe absolute URL, or '' to reject.
   A bare "example.com" must become https rather than resolving as a relative
   path against this site, while "javascript:..." must never be rescued that way.
   The host:port case is the awkward one - "example.com:8080" superficially looks
   like a scheme, so it is matched explicitly before the scheme check rejects it. */
function normalizeQuickLinkUrl(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return safeExternalUrl(t);
  const looksLikeHostPort = /^[^\s:\/]+:\d+(?:[\/?#]|$)/.test(t);
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) && !looksLikeHostPort) return '';
  return safeExternalUrl('https://' + t);
}
async function addQuickLink() {
  const nameEl = document.getElementById('newQuickLinkName');
  const urlEl = document.getElementById('newQuickLinkUrl');
  const name = nameEl.value.trim();
  const url = normalizeQuickLinkUrl(urlEl.value);
  if (!name || !urlEl.value.trim()) { await customAlert(lang === 'en' ? 'Enter both a name and a URL.' : 'أدخل الاسم والرابط معاً.'); return; }
  if (!url) { await customAlert(lang === 'en' ? 'Only http and https links are allowed.' : 'يُسمح بروابط http و https فقط.'); return; }
  quickLinks.push({ name, url, icon: 'icon-link' });
  localStorage.setItem('idleQuickLinks', JSON.stringify(quickLinks));
  nameEl.value = '';
  urlEl.value = '';
  renderQuickLinksManageList();
  renderQuickLinks();
}
async function deleteQuickLink(index) {
  const link = quickLinks[index];
  if (!link) return;
  const ok = await customConfirm(
    lang === 'en' ? `Remove "${link.name}" from Quick Links?` : `إزالة "${link.name}" من الروابط السريعة؟`,
    lang === 'en' ? 'Remove Link' : 'إزالة الرابط', true);
  if (!ok) return;
  quickLinks.splice(index, 1);
  localStorage.setItem('idleQuickLinks', JSON.stringify(quickLinks));
  renderQuickLinksManageList();
  renderQuickLinks();
}
function openQuickLinksSettings() {
  renderQuickLinksManageList();
  document.getElementById('quickLinksSettingsModal').classList.add('active');
}
function closeQuickLinksSettings() {
  document.getElementById('quickLinksSettingsModal').classList.remove('active');
}

/* ---- RSS / News Feed ---- */
let rssFeedUrl = localStorage.getItem('idleRssFeedUrl') || '';
let rssCache = safeParseJSON('idleRssCache', { items: [], fetchedAt: 0, error: false });
async function fetchRssFeed() {
  if (!rssFeedUrl) { renderRssWidget(); return; }
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`);
    if (!res.ok) throw new Error('bad status');
    const json = await res.json();
    if (json.status !== 'ok') throw new Error('feed error');
    rssCache = { items: (json.items || []).slice(0, 8).map(it => ({ title: it.title, link: safeExternalUrl(it.link), pubDate: it.pubDate })), fetchedAt: Date.now(), error: false };
  } catch (e) {
    rssCache.error = true;
  }
  localStorage.setItem('idleRssCache', JSON.stringify(rssCache));
  renderRssWidget();
}
function renderRssWidget() {
  const titleEl = document.getElementById('rssWidgetLatestTitle');
  const eyebrowEl = document.getElementById('rssWidgetEyebrow');
  if (!rssFeedUrl) {
    if (titleEl) titleEl.textContent = translations[lang].rssNoFeed;
    if (eyebrowEl) eyebrowEl.textContent = translations[lang].rssLatest;
  } else if (rssCache.items.length) {
    if (titleEl) titleEl.textContent = rssCache.items[0].title;
    if (eyebrowEl) eyebrowEl.textContent = translations[lang].rssLatest + (rssCache.error ? ' ⚠' : '');
  } else if (rssCache.error) {
    if (titleEl) titleEl.textContent = lang === 'en' ? 'Could not load this feed.' : 'تعذر تحميل هذا الخبر.';
    if (eyebrowEl) eyebrowEl.textContent = translations[lang].rssLatest + ' ⚠';
  } else {
    if (titleEl) titleEl.textContent = lang === 'en' ? 'Loading…' : 'جارِ التحميل…';
    if (eyebrowEl) eyebrowEl.textContent = translations[lang].rssLatest;
  }
  const listEl = document.getElementById('rssWidgetList');
  if (!listEl) return;
  if (!rssCache.items.length) { listEl.innerHTML = ''; return; }
  listEl.innerHTML = rssCache.items.map(it => `
    <a class="widget-task-row" href="${escapeHTML(safeExternalUrl(it.link))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
      <span class="wt-name">${escapeHTML(it.title)}</span>
      <span class="wt-time">${it.pubDate ? new Date(it.pubDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'ar') : ''}</span>
    </a>
  `).join('');
}
function openRssSettings() {
  document.getElementById('rssFeedUrlInput').value = rssFeedUrl;
  document.getElementById('rssSettingsModal').classList.add('active');
}
function closeRssSettings() {
  document.getElementById('rssSettingsModal').classList.remove('active');
}
function saveRssSettings() {
  rssFeedUrl = document.getElementById('rssFeedUrlInput').value.trim();
  localStorage.setItem('idleRssFeedUrl', rssFeedUrl);
  closeRssSettings();
  rssCache = { items: [], fetchedAt: 0, error: false };
  renderRssWidget();
  fetchRssFeed();
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
  // backgroundImage, not the `background` shorthand - the shorthand would reset
  // background-origin back to padding-box and reintroduce the square-seam artefact.
  dot.style.backgroundImage = `linear-gradient(135deg, ${colors.start}, ${colors.end})`;
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
document.querySelectorAll('.sp-art-dot').forEach(el => {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
});
document.querySelectorAll('.slider-container').forEach(el => {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
});
document.querySelectorAll('.widget-card.clickable').forEach(el => {
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e) => {
    if (e.target !== el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
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
applyWidgetVisibility();
renderAccountUI();
if (typeof supabaseClient !== 'undefined' && supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) activateCloudSession(data.session.user);
  });
}
setDisplayLayout(localStorage.getItem('idleDisplayLayout') || detectDeviceLayout());
setSpotifyArtMode(spotifyArtMode);
renderCountdownPickers();
populateCountdownTagFilter();
renderCountdownWidget();
checkCountdownImportFromURL();
setTimeout(() => startTutorial(false), 1000);
syncQuoteToggleUI();
if (quoteRotationActive) { showRandomQuote(); startQuoteRotation(); }
else document.getElementById('quoteBar').style.display = 'none';
populateChimeSelects();
renderPomodoroWidget();
renderHabitsWidget();
renderCryptoWidget();
renderRssWidget();
renderQuickLinks();
fetchCryptoPrices();
fetchRssFeed();
applyTheaterRoundedEdges();
refreshErrorCountBadge();
setClockFace(clockFaceMode, null);
setClockSize(clockSizePercent);
document.getElementById('theaterDimSlider').value = theaterDimLevel;
document.getElementById('theaterDimValue').textContent = theaterDimLevel + '%';
refreshTheaterDimAvailability();
document.getElementById('clockSizeSlider').value = clockSizePercent;
document.getElementById('displayTitleAutoHideToggle').checked = displayTitleAutoHide;
scheduleDisplayTitleHide();
document.getElementById('theaterRoundedToggle').checked = theaterRoundedEdges;
document.getElementById('azanReminderToggle').checked = azanReminderEnabled;

setInterval(updateLiveTimer, 1000);
setInterval(updateWorldClock, 60000);
setInterval(fetchCryptoPrices, 60000);
setInterval(fetchRssFeed, 20 * 60 * 1000);
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

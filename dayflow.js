/* ============================================================
   DayFlow — personal productivity layer for Ambient OS
   ------------------------------------------------------------
   Additive by design. The original ambient dashboard is preserved
   untouched as the "Ambient" view; everything here renders into a
   separate root that is only shown when another view is active.

   Reuses the host app's helpers rather than duplicating them:
   escapeHTML, svgIcon, toNum, customAlert, customConfirm, lang.
   Where a concept already exists in Ambient OS (habits, schedule,
   pomodoro) DayFlow reads and writes that same data instead of
   creating a parallel copy - see design-research.md section 0.
   ============================================================ */
(function () {
  'use strict';

  const DF = { state: {}, view: 'ambient', ready: false };
  window.DF = DF;

  /* ---------------- i18n ---------------- */
  const T = {
    en: {
      ambient: 'Ambient', today: 'Today', tasks: 'Tasks', habits: 'Habits', goals: 'Goals',
      planner: 'Planner', focus: 'Focus', analytics: 'Analytics', settings: 'Settings', more: 'More',
      goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
      todayScore: 'Today score', scoreTasks: 'Tasks', scoreHabits: 'Habits', scoreFocus: 'Focus', scoreSchedule: 'Schedule',
      upNext: 'Up next', nothingScheduled: 'Nothing scheduled for the rest of today',
      startFocus: 'Start focus', addTask: 'Add task', newTask: 'New task', editTask: 'Edit task',
      title: 'Title', notes: 'Notes', priority: 'Priority', category: 'Category', dueTime: 'Due time',
      status: 'Status', high: 'High', medium: 'Medium', low: 'Low',
      backlog: 'Backlog', inProgress: 'In progress', done: 'Done',
      list: 'List', board: 'Board', search: 'Search', allPriorities: 'All priorities', allCategories: 'All categories',
      allStatuses: 'All statuses', anyDue: 'Any due time', hasDue: 'Has a due time', overdueDue: 'Overdue', noDue: 'No due time',
      clearFilters: 'Clear filters', save: 'Save', cancel: 'Cancel', delete: 'Delete', close: 'Close',
      noTasksYet: 'No tasks yet', noTasksYetBody: 'Capture what needs doing and it will show up here and on your Today screen.',
      noMatch: 'Nothing matches these filters', noMatchBody: 'Try widening your search or clearing the filters.',
      allClear: 'All clear for today', allClearBody: 'Every task for today is done. Enjoy the quiet.',
      newHabit: 'New habit', habitName: 'Habit name', frequency: 'Frequency', daily: 'Daily', weekdays: 'Weekdays', custom: 'Custom days',
      currentStreak: 'Current streak', bestStreak: 'Best streak', completion: 'Completion', days: 'days', day: 'day',
      noHabitsYet: 'No habits yet', noHabitsYetBody: 'Small repeated actions compound. Add the first one you want to keep.',
      todayProgress: "Today's progress", completed: 'completed',
      newGoal: 'New goal', goalTitle: 'Goal title', description: 'Description', targetDate: 'Target date',
      milestones: 'Milestones', addMilestone: 'Add milestone', active: 'Active', paused: 'Paused',
      noGoalsYet: 'No goals yet', noGoalsYetBody: 'Set something bigger than a task, then break it into milestones you can tick off.',
      pace: 'To finish on time', perMonth: 'about {n} milestones per month', overdue: 'Past the target date',
      noMilestones: 'No milestones yet - add a few to track progress automatically.',
      week: 'Week', thisWeek: 'This week', newBlock: 'New block', editBlock: 'Edit block',
      startTime: 'Start', endTime: 'End', deepWork: 'Deep work', meetings: 'Meetings', exercise: 'Exercise',
      personal: 'Personal', study: 'Study', admin: 'Admin',
      focusOn: "I'm focusing on", nothingLinked: 'Nothing linked', start: 'Start', pause: 'Pause', resume: 'Resume',
      reset: 'Reset', endSession: 'End session', zenMode: 'Distraction-free', minutes: 'minutes', min: 'min',
      sessionDone: 'Session complete', recentSessions: 'Recent sessions', noSessions: 'No focus sessions yet',
      noSessionsBody: 'Pick a length, optionally link it to a task, and press start.',
      last7: 'Last 7 days', last30: 'Last 30 days', tasksCompleted: 'Tasks completed', habitConsistency: 'Habit consistency',
      focusMinutes: 'Focus minutes', goalProgress: 'Goal progress', mostProductive: 'Most productive',
      notEnoughData: 'Not enough data yet', notEnoughDataBody: 'Come back after a couple of days of activity and this will fill in.',
      vsPrev: 'vs previous period', appearance: 'Appearance', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System',
      themeLightDesc: 'Always use the light palette', themeDarkDesc: 'Always use the dark palette', themeSystemDesc: "Follow your device's setting",
      profile: 'Profile', yourName: 'Your name', workingHours: 'Working hours', energyPattern: 'Energy pattern',
      dataManagement: 'Data', exportData: 'Export all data', importData: 'Import data', resetDemo: 'Reset demo data',
      restartOnboarding: 'Restart onboarding', restartTutorial: 'Restart tutorial',
      exportDesc: 'Download everything as a JSON file you control.',
      importDesc: 'Restore from a file you exported earlier.',
      resetDesc: 'Replace your data with the seeded demo content.',
      exported: 'Data exported', imported: 'Data imported', importBad: 'That file is not a valid DayFlow export.',
      resetConfirm: 'Replace all DayFlow data with demo content? This cannot be undone.',
      deleteConfirm: 'Delete "{n}"?', saved: 'Saved',
      onbWelcomeT: 'Welcome to DayFlow', onbWelcomeB: 'Five quick questions and your dashboard will be set up around how you actually work. You can skip any of it.',
      onbNameT: "What should we call you?", onbNameB: 'Used for the greeting on your Today screen.',
      onbGoalT: "What's your main focus right now?", onbGoalB: 'This becomes your first goal. You can change it later.',
      onbHoursT: 'When do you usually work?', onbHoursB: 'The planner will highlight these hours.',
      onbEnergyT: 'When is your energy highest?', onbEnergyB: 'Focus sessions get suggested around your peak.',
      onbHabitsT: 'Which habits do you want to build?', onbHabitsB: 'Pick a few. You can add your own later.',
      onbDoneT: "You're set up", onbDoneB: "Here's what DayFlow created from your answers:",
      morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', varies: 'It varies',
      next: 'Next', back: 'Back', skip: 'Skip', getStarted: 'Get started', finish: 'Finish',
      createdGoal: 'goal', createdHabits: 'habits', createdTasks: 'starter tasks',
      optional: 'optional', required: 'This field is required.', invalidTime: 'End time must be after start time.',
      backToAmbient: 'Back to ambient clock'
    },
    ar: {
      ambient: 'الساعة', today: 'اليوم', tasks: 'المهام', habits: 'العادات', goals: 'الأهداف',
      planner: 'المخطط', focus: 'التركيز', analytics: 'التحليلات', settings: 'الإعدادات', more: 'المزيد',
      goodMorning: 'صباح الخير', goodAfternoon: 'مساء الخير', goodEvening: 'مساء الخير',
      todayScore: 'نتيجة اليوم', scoreTasks: 'المهام', scoreHabits: 'العادات', scoreFocus: 'التركيز', scoreSchedule: 'الجدول',
      upNext: 'التالي', nothingScheduled: 'لا يوجد شيء مجدول لبقية اليوم',
      startFocus: 'ابدأ التركيز', addTask: 'إضافة مهمة', newTask: 'مهمة جديدة', editTask: 'تعديل المهمة',
      title: 'العنوان', notes: 'ملاحظات', priority: 'الأولوية', category: 'الفئة', dueTime: 'وقت الاستحقاق',
      status: 'الحالة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة',
      backlog: 'قائمة الانتظار', inProgress: 'قيد التنفيذ', done: 'مكتملة',
      list: 'قائمة', board: 'لوحة', search: 'بحث', allPriorities: 'كل الأولويات', allCategories: 'كل الفئات',
      allStatuses: 'كل الحالات', anyDue: 'أي وقت استحقاق', hasDue: 'له وقت استحقاق', overdueDue: 'متأخرة', noDue: 'بلا وقت استحقاق',
      clearFilters: 'مسح عوامل التصفية', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', close: 'إغلاق',
      noTasksYet: 'لا توجد مهام بعد', noTasksYetBody: 'سجّل ما تحتاج إنجازه وسيظهر هنا وفي شاشة اليوم.',
      noMatch: 'لا يوجد ما يطابق عوامل التصفية', noMatchBody: 'جرّب توسيع البحث أو مسح عوامل التصفية.',
      allClear: 'انتهى كل شيء لليوم', allClearBody: 'كل مهام اليوم مكتملة. استمتع بالهدوء.',
      newHabit: 'عادة جديدة', habitName: 'اسم العادة', frequency: 'التكرار', daily: 'يومياً', weekdays: 'أيام العمل', custom: 'أيام مخصصة',
      currentStreak: 'السلسلة الحالية', bestStreak: 'أفضل سلسلة', completion: 'نسبة الإنجاز', days: 'أيام', day: 'يوم',
      noHabitsYet: 'لا توجد عادات بعد', noHabitsYetBody: 'الأفعال الصغيرة المتكررة تتراكم. أضف أول عادة تريد الالتزام بها.',
      todayProgress: 'تقدم اليوم', completed: 'مكتملة',
      newGoal: 'هدف جديد', goalTitle: 'عنوان الهدف', description: 'الوصف', targetDate: 'التاريخ المستهدف',
      milestones: 'المراحل', addMilestone: 'إضافة مرحلة', active: 'نشط', paused: 'متوقف',
      noGoalsYet: 'لا توجد أهداف بعد', noGoalsYetBody: 'حدّد شيئاً أكبر من مهمة، ثم قسّمه إلى مراحل يمكنك إنجازها.',
      pace: 'لإنهائه في الموعد', perMonth: 'حوالي {n} مراحل شهرياً', overdue: 'تجاوز التاريخ المستهدف',
      noMilestones: 'لا توجد مراحل بعد - أضف بعضها لتتبع التقدم تلقائياً.',
      week: 'أسبوع', thisWeek: 'هذا الأسبوع', newBlock: 'فترة جديدة', editBlock: 'تعديل الفترة',
      startTime: 'البداية', endTime: 'النهاية', deepWork: 'عمل عميق', meetings: 'اجتماعات', exercise: 'رياضة',
      personal: 'شخصي', study: 'دراسة', admin: 'إداري',
      focusOn: 'أركّز على', nothingLinked: 'غير مرتبط', start: 'ابدأ', pause: 'إيقاف مؤقت', resume: 'استئناف',
      reset: 'إعادة تعيين', endSession: 'إنهاء الجلسة', zenMode: 'وضع بلا تشتيت', minutes: 'دقيقة', min: 'د',
      sessionDone: 'اكتملت الجلسة', recentSessions: 'الجلسات الأخيرة', noSessions: 'لا توجد جلسات تركيز بعد',
      noSessionsBody: 'اختر المدة، واربطها بمهمة إن أردت، ثم اضغط ابدأ.',
      last7: 'آخر ٧ أيام', last30: 'آخر ٣٠ يوماً', tasksCompleted: 'المهام المكتملة', habitConsistency: 'انتظام العادات',
      focusMinutes: 'دقائق التركيز', goalProgress: 'تقدم الأهداف', mostProductive: 'الأكثر إنتاجية',
      notEnoughData: 'لا توجد بيانات كافية بعد', notEnoughDataBody: 'عد بعد يومين من النشاط وسيمتلئ هذا القسم.',
      vsPrev: 'مقارنة بالفترة السابقة', appearance: 'المظهر', themeLight: 'فاتح', themeDark: 'داكن', themeSystem: 'النظام',
      themeLightDesc: 'استخدم الألوان الفاتحة دائماً', themeDarkDesc: 'استخدم الألوان الداكنة دائماً', themeSystemDesc: 'اتبع إعداد جهازك',
      profile: 'الملف الشخصي', yourName: 'اسمك', workingHours: 'ساعات العمل', energyPattern: 'نمط الطاقة',
      dataManagement: 'البيانات', exportData: 'تصدير كل البيانات', importData: 'استيراد بيانات', resetDemo: 'إعادة تعيين البيانات التجريبية',
      restartOnboarding: 'إعادة الإعداد', restartTutorial: 'إعادة الجولة التعريفية',
      exportDesc: 'نزّل كل شيء كملف JSON تتحكم به.',
      importDesc: 'استعد من ملف صدّرته سابقاً.',
      resetDesc: 'استبدل بياناتك بالمحتوى التجريبي.',
      exported: 'تم تصدير البيانات', imported: 'تم استيراد البيانات', importBad: 'هذا الملف ليس تصديراً صالحاً من DayFlow.',
      resetConfirm: 'استبدال كل بيانات DayFlow بمحتوى تجريبي؟ لا يمكن التراجع عن هذا.',
      deleteConfirm: 'حذف "{n}"؟', saved: 'تم الحفظ',
      onbWelcomeT: 'مرحباً بك في DayFlow', onbWelcomeB: 'خمسة أسئلة سريعة وسيتم إعداد لوحتك حسب طريقة عملك الفعلية. يمكنك تخطي أي منها.',
      onbNameT: 'بماذا نناديك؟', onbNameB: 'يُستخدم في التحية على شاشة اليوم.',
      onbGoalT: 'ما هو تركيزك الأساسي حالياً؟', onbGoalB: 'سيصبح هذا هدفك الأول. يمكنك تغييره لاحقاً.',
      onbHoursT: 'متى تعمل عادةً؟', onbHoursB: 'سيبرز المخطط هذه الساعات.',
      onbEnergyT: 'متى تكون طاقتك في أعلى مستوى؟', onbEnergyB: 'ستُقترح جلسات التركيز حول ذروتك.',
      onbHabitsT: 'ما العادات التي تريد بناءها؟', onbHabitsB: 'اختر بعضها. يمكنك إضافة عاداتك لاحقاً.',
      onbDoneT: 'تم إعدادك', onbDoneB: 'إليك ما أنشأه DayFlow من إجاباتك:',
      morning: 'الصباح', afternoon: 'بعد الظهر', evening: 'المساء', varies: 'يتغير',
      next: 'التالي', back: 'رجوع', skip: 'تخطي', getStarted: 'لنبدأ', finish: 'إنهاء',
      createdGoal: 'هدف', createdHabits: 'عادات', createdTasks: 'مهام أولية',
      optional: 'اختياري', required: 'هذا الحقل مطلوب.', invalidTime: 'يجب أن يكون وقت النهاية بعد البداية.',
      backToAmbient: 'العودة إلى الساعة'
    }
  };
  function L() { return (typeof lang !== 'undefined' && lang === 'ar') ? 'ar' : 'en'; }
  function t(k, vars) {
    let s = (T[L()] && T[L()][k]) || T.en[k] || k;
    if (vars) Object.keys(vars).forEach(v => { s = s.replace('{' + v + '}', vars[v]); });
    return s;
  }
  DF.t = t;

  /* ---------------- helpers ---------------- */
  const esc = s => (typeof escapeHTML === 'function' ? escapeHTML(s) : String(s == null ? '' : s));
  const num = s => (typeof toNum === 'function' ? toNum(s) : String(s));
  const ico = (id, cls) => (typeof svgIcon === 'function' ? svgIcon(id, cls || '') : '');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const $ = sel => document.querySelector(sel);

  function dayKey(d) {
    const x = d ? new Date(d) : new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
  function parseJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function hhmm(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    const ap = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12;
    return num(h12 + ':' + String(m).padStart(2, '0')) + ' ' + ap;
  }
  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const CATS = ['deep', 'meet', 'exercise', 'personal', 'study', 'admin'];
  const CAT_LABEL = { deep: 'deepWork', meet: 'meetings', exercise: 'exercise', personal: 'personal', study: 'study', admin: 'admin' };
  const CAT_COLOR = { deep: 'var(--df-cat-deep)', meet: 'var(--df-cat-meet)', exercise: 'var(--df-cat-exercise)', personal: 'var(--df-cat-personal)', study: 'var(--df-cat-study)', admin: 'var(--df-cat-admin)' };
  const STATUSES = ['backlog', 'today', 'progress', 'done'];
  const STATUS_LABEL = { backlog: 'backlog', today: 'today', progress: 'inProgress', done: 'done' };

  /* ---------------- persistence ---------------- */
  const KEYS = {
    profile: 'dfProfile', tasks: 'dfTasks', goals: 'dfGoals', sessions: 'dfSessions',
    blocks: 'dfBlocks', habits: 'idleHabits', view: 'dfView'
  };
  function load() {
    DF.state.profile = parseJSON(KEYS.profile, { name: '', primaryGoal: '', workStart: 9, workEnd: 17, energy: 'morning', onboarded: false });
    DF.state.tasks = parseJSON(KEYS.tasks, null);
    DF.state.goals = parseJSON(KEYS.goals, null);
    DF.state.sessions = parseJSON(KEYS.sessions, []);
    DF.state.blocks = parseJSON(KEYS.blocks, null);
    // Habits are shared with the Ambient dashboard's widget - same array, same key.
    DF.state.habits = parseJSON(KEYS.habits, []);
  }
  function save(which) {
    const map = {
      profile: KEYS.profile, tasks: KEYS.tasks, goals: KEYS.goals,
      sessions: KEYS.sessions, blocks: KEYS.blocks, habits: KEYS.habits
    };
    if (map[which]) localStorage.setItem(map[which], JSON.stringify(DF.state[which]));
    if (which === 'habits' && typeof renderHabitsWidget === 'function') renderHabitsWidget();
  }
  DF.save = save;

  /* ---------------- seeded demo data ---------------- */
  function seed(force) {
    const today = dayKey();
    if (force || DF.state.tasks == null) {
      DF.state.tasks = [
        { id: uid(), title: 'Review the weekly plan', status: 'today', priority: 'high', category: 'deep', due: '09:30', notes: '', createdAt: Date.now() - 864e5 },
        { id: uid(), title: 'Reply to outstanding messages', status: 'today', priority: 'med', category: 'admin', due: '11:00', notes: '', createdAt: Date.now() - 864e5 },
        { id: uid(), title: 'Draft the project outline', status: 'progress', priority: 'high', category: 'deep', due: '', notes: 'Rough structure first, detail later.', createdAt: Date.now() - 1728e5 },
        { id: uid(), title: 'Book the dentist', status: 'backlog', priority: 'low', category: 'personal', due: '', notes: '', createdAt: Date.now() - 2592e5 },
        { id: uid(), title: 'Read one chapter', status: 'backlog', priority: 'med', category: 'study', due: '', notes: '', createdAt: Date.now() - 2592e5 },
        // completedAt is pinned inside today rather than "an hour ago", which lands on
        // yesterday when the app is first opened shortly after midnight.
        { id: uid(), title: 'Clear the inbox', status: 'done', priority: 'med', category: 'admin', due: '', notes: '', createdAt: Date.now() - 864e5, completedAt: Math.min(Date.now(), new Date().setHours(8, 30, 0, 0)) }
      ];
      save('tasks');
    }
    if (force || DF.state.goals == null) {
      const target = addDays(new Date(), 75);
      DF.state.goals = [{
        id: uid(), title: 'Ship the personal site', description: 'Design, build and publish a portfolio that actually represents my work.',
        category: 'deep', targetDate: dayKey(target), status: 'active',
        milestones: [
          { id: uid(), title: 'Decide on the structure', done: true },
          { id: uid(), title: 'Design the home page', done: true },
          { id: uid(), title: 'Build the case-study template', done: false },
          { id: uid(), title: 'Write three case studies', done: false },
          { id: uid(), title: 'Publish and share', done: false }
        ]
      }];
      save('goals');
    }
    if (force || DF.state.blocks == null) {
      DF.state.blocks = [
        { id: uid(), day: 1, start: 9 * 60, end: 11 * 60, title: 'Deep work block', cat: 'deep' },
        { id: uid(), day: 1, start: 14 * 60, end: 15 * 60, title: 'Team sync', cat: 'meet' },
        { id: uid(), day: 2, start: 7 * 60, end: 8 * 60, title: 'Training', cat: 'exercise' },
        { id: uid(), day: 3, start: 9 * 60 + 30, end: 12 * 60, title: 'Writing', cat: 'deep' },
        { id: uid(), day: 4, start: 18 * 60, end: 19 * 60 + 30, title: 'Course', cat: 'study' },
        { id: uid(), day: 5, start: 13 * 60, end: 14 * 60, title: 'Admin catch-up', cat: 'admin' }
      ];
      save('blocks');
    }
    if (force || !DF.state.habits.length) {
      DF.state.habits = [
        { id: uid(), name: 'Move for 20 minutes', icon: 'activity', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: {} },
        { id: uid(), name: 'Read before bed', icon: 'book', freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: {} },
        { id: uid(), name: 'Plan tomorrow', icon: 'clipboard-list', freq: 'weekdays', days: [1, 2, 3, 4, 5], history: {} }
      ];
      // A little history so streaks and the weekly grid have something to show.
      for (let i = 1; i <= 9; i++) {
        const k = dayKey(addDays(new Date(), -i));
        if (i % 4 !== 0) DF.state.habits[0].history[k] = true;
        if (i % 3 !== 0) DF.state.habits[1].history[k] = true;
      }
      save('habits');
    }
    if (force || !DF.state.sessions.length) {
      DF.state.sessions = [];
      for (let i = 1; i <= 6; i++) {
        if (i % 2 === 0) continue;
        DF.state.sessions.push({ id: uid(), at: addDays(new Date(), -i).getTime(), minutes: i === 1 ? 50 : 25, taskId: null, goalId: null });
      }
      save('sessions');
    }
    if (force) { DF.state.profile.onboarded = true; save('profile'); }
  }

  /* ---------------- normalisation ---------------- */
  // Habits created by the older Ambient widget only have {id, name, history}.
  // Fill in the fields DayFlow needs without touching what already works.
  function normaliseHabits() {
    let changed = false;
    (DF.state.habits || []).forEach(h => {
      if (!h.freq) { h.freq = 'daily'; changed = true; }
      if (!Array.isArray(h.days)) { h.days = h.freq === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6]; changed = true; }
      if (!h.icon) { h.icon = 'clipboard-check'; changed = true; }
      if (!h.history || typeof h.history !== 'object') { h.history = {}; changed = true; }
    });
    if (changed) save('habits');
  }

  /* ---------------- metrics ---------------- */
  function habitScheduledOn(h, d) { return (h.days || [0, 1, 2, 3, 4, 5, 6]).indexOf(new Date(d).getDay()) > -1; }
  function habitStreak(h) {
    let streak = 0, cur = new Date();
    for (let i = 0; i < 400; i++) {
      const k = dayKey(cur);
      if (!habitScheduledOn(h, cur)) { cur = addDays(cur, -1); continue; }
      if (h.history[k]) { streak++; cur = addDays(cur, -1); }
      else if (i === 0) { cur = addDays(cur, -1); }   // today not done yet doesn't break it
      else break;
    }
    return streak;
  }
  function habitBest(h) {
    const keys = Object.keys(h.history || {}).filter(k => h.history[k]).sort();
    let best = 0, run = 0, prev = null;
    keys.forEach(k => {
      const d = new Date(k + 'T00:00:00');
      if (prev && (d - prev) / 864e5 <= 1.5) run++; else run = 1;
      best = Math.max(best, run); prev = d;
    });
    return best;
  }
  function goalProgress(g) {
    if (!g.milestones || !g.milestones.length) return 0;
    return pct(g.milestones.filter(m => m.done).length, g.milestones.length);
  }
  function focusMinutesOn(k) {
    return (DF.state.sessions || []).filter(s => dayKey(s.at) === k).reduce((a, s) => a + (s.minutes || 0), 0);
  }
  function todayScore() {
    const k = dayKey();
    const todays = (DF.state.tasks || []).filter(x => x.status === 'today' || x.status === 'progress' || (x.status === 'done' && dayKey(x.completedAt) === k));
    const doneT = todays.filter(x => x.status === 'done').length;
    const sTasks = todays.length ? pct(doneT, todays.length) : 0;

    const due = (DF.state.habits || []).filter(h => habitScheduledOn(h, new Date()));
    const doneH = due.filter(h => h.history[k]).length;
    const sHabits = due.length ? pct(doneH, due.length) : 0;

    const fm = focusMinutesOn(k);
    const sFocus = clamp(Math.round((fm / 60) * 100), 0, 100);

    const dow = new Date().getDay();
    const blocks = (DF.state.blocks || []).filter(b => b.day === dow);
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const totalB = blocks.reduce((a, b) => a + (b.end - b.start), 0);
    const passedB = blocks.reduce((a, b) => a + clamp(nowM - b.start, 0, b.end - b.start), 0);
    const sSched = totalB ? pct(passedB, totalB) : 0;

    const total = Math.round(sTasks * 0.30 + sHabits * 0.30 + sFocus * 0.25 + sSched * 0.15);
    return { total, tasks: sTasks, habits: sHabits, focus: sFocus, schedule: sSched, fm, doneT, totalT: todays.length, doneH, dueH: due.length };
  }

  /* ---------------- shell / routing ---------------- */
  const NAV = [
    { id: 'ambient', icon: 'icon-clock-face', primary: true },
    { id: 'today', icon: 'icon-sun', primary: true },
    { id: 'tasks', icon: 'icon-clipboard-list', primary: true },
    { id: 'habits', icon: 'icon-repeat', primary: false },
    { id: 'goals', icon: 'icon-target', primary: false },
    { id: 'planner', icon: 'icon-calendar', primary: true },
    { id: 'focus', icon: 'icon-alarm-clock', primary: true },
    { id: 'analytics', icon: 'icon-chart', primary: false },
    { id: 'settings', icon: 'icon-gear', primary: false }
  ];

  function buildShell() {
    if ($('#dfRoot')) return;
    const root = document.createElement('div');
    root.className = 'df-root';
    root.id = 'dfRoot';
    root.innerHTML =
      '<nav class="df-nav" id="dfNav" aria-label="DayFlow"></nav>' +
      '<div class="df-main" id="dfMain"></div>';
    document.body.appendChild(root);

    const toasts = document.createElement('div');
    toasts.className = 'df-toast-wrap';
    toasts.id = 'dfToasts';
    document.body.appendChild(toasts);

    const modal = document.createElement('div');
    modal.className = 'df-modal';
    modal.id = 'dfModal';
    modal.innerHTML = '<div class="df-modal-box" id="dfModalBox" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);

    const onb = document.createElement('div');
    onb.className = 'df-onb';
    onb.id = 'dfOnb';
    document.body.appendChild(onb);

    renderNav();
  }

  function renderNav() {
    const nav = $('#dfNav');
    if (!nav) return;
    let html = '<div class="df-brand"><span class="df-brand-mark">' + ico('icon-sparkle') + '</span>DayFlow</div>';
    NAV.forEach(n => {
      if (n.id === 'settings') html += '<div class="df-nav-spacer"></div><div class="df-nav-sep"></div>';
      html += '<button class="df-nav-item' + (DF.view === n.id ? ' active' : '') + (n.primary ? '' : ' secondary') +
        '" data-nav="' + n.id + '" aria-current="' + (DF.view === n.id ? 'page' : 'false') + '">' +
        ico(n.icon) + '<span>' + esc(t(n.id)) + '</span></button>';
    });
    // The bottom tab bar only has room for five destinations, so the rest live behind
    // More. Without this they would be completely unreachable on a phone.
    const secondaryActive = NAV.some(n => !n.primary && n.id === DF.view);
    html += '<button class="df-nav-item more-tab' + (secondaryActive ? ' active' : '') + '" data-act="more">' +
      ico('icon-hash') + '<span>' + esc(t('more')) + '</span></button>';
    nav.innerHTML = html;
  }

  function go(view) {
    DF.view = view;
    localStorage.setItem(KEYS.view, view);
    document.body.classList.toggle('df-active', view !== 'ambient');
    document.body.classList.remove('df-zen');
    renderNav();
    if (view !== 'ambient') render(view);
    // Keep the ambient clock ticking correctly when returning to it.
    if (view === 'ambient' && typeof updateLiveTimer === 'function') { try { updateLiveTimer(); } catch (e) {} }
  }
  DF.go = go;

  function render(view) {
    const main = $('#dfMain');
    if (!main) return;
    const fn = VIEWS[view];
    main.innerHTML = '<section class="df-view active" id="dfView">' + (fn ? fn() : '') + '</section>';
    if (AFTER[view]) AFTER[view]();
    main.scrollTop = 0;
  }
  DF.render = () => { if (DF.view !== 'ambient') render(DF.view); };

  function toast(msg, icon) {
    const wrap = $('#dfToasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'df-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = ico(icon || 'icon-check') + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 2200);
  }
  DF.toast = toast;

  /* ---------------- modal ---------------- */
  let modalOnSave = null, lastFocused = null;
  function openModal(title, bodyHtml, onSave, wide) {
    lastFocused = document.activeElement;
    const box = $('#dfModalBox');
    box.className = 'df-modal-box' + (wide ? ' wide' : '');
    box.innerHTML =
      '<div class="df-modal-head"><h2 class="df-h2">' + esc(title) + '</h2>' +
      '<button class="df-btn ghost sm" data-act="modal-close" aria-label="' + esc(t('close')) + '">' + ico('icon-x') + '</button></div>' +
      bodyHtml +
      '<div class="df-modal-foot"><button class="df-btn secondary" data-act="modal-close">' + esc(t('cancel')) + '</button>' +
      (onSave ? '<button class="df-btn" data-act="modal-save">' + esc(t('save')) + '</button>' : '') + '</div>';
    modalOnSave = onSave || null;
    $('#dfModal').classList.add('active');
    setTimeout(() => { const f = box.querySelector('input,select,textarea,button:not([data-act="modal-close"])'); if (f) f.focus(); }, 60);
  }
  function closeModal() {
    $('#dfModal').classList.remove('active');
    modalOnSave = null;
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }
  DF.openModal = openModal; DF.closeModal = closeModal;

  function fieldError(id, msg) {
    const f = document.getElementById(id);
    if (!f) return;
    const wrap = f.closest('.df-field');
    if (!wrap) return;
    wrap.classList.add('invalid');
    const e = wrap.querySelector('.df-error');
    if (e) e.textContent = msg;
  }
  function clearErrors() { document.querySelectorAll('.df-field.invalid').forEach(x => x.classList.remove('invalid')); }

  /* ---------------- shared partials ---------------- */
  function ring(value, size, stroke, centerHtml) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c - (clamp(value, 0, 100) / 100) * c;
    return '<div class="df-ring-wrap" style="width:' + size + 'px;height:' + size + 'px;">' +
      '<svg class="df-ring" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle class="val" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke +
      '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<div class="df-ring-center">' + centerHtml + '</div></div>';
  }
  function empty(icon, title, body, actionLabel, actionAttr) {
    return '<div class="df-empty">' + ico(icon) +
      '<div class="df-empty-title">' + esc(title) + '</div>' +
      '<div class="df-empty-body">' + esc(body) + '</div>' +
      (actionLabel ? '<button class="df-btn" ' + actionAttr + '>' + esc(actionLabel) + '</button>' : '') + '</div>';
  }
  function head(title, sub, right) {
    return '<div class="df-view-head df-row-between"><div><h1 class="df-h1">' + esc(title) + '</h1>' +
      (sub ? '<p class="df-body">' + esc(sub) + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function catDot(cat) { return '<span class="df-dot" style="background:' + (CAT_COLOR[cat] || 'var(--df-text-faint)') + '"></span>'; }

  /* ============================================================
     VIEWS
     ============================================================ */
  const VIEWS = {};
  const AFTER = {};

  /* ---------- Today ---------- */
  VIEWS.today = function () {
    const s = todayScore();
    const h = new Date().getHours();
    const greet = h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
    const name = DF.state.profile.name;
    const dateStr = new Date().toLocaleDateString(L() === 'ar' ? 'ar' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // One derived sentence naming the single most important thing right now.
    let focusLine;
    const nextTask = (DF.state.tasks || []).filter(x => x.status === 'today' && x.due).sort((a, b) => a.due.localeCompare(b.due))[0];
    const openTasks = (DF.state.tasks || []).filter(x => x.status === 'today' || x.status === 'progress').length;
    if (nextTask) focusLine = t('upNext') + ': ' + nextTask.title + (nextTask.due ? ' · ' + num(nextTask.due) : '');
    else if (openTasks) focusLine = openTasks + ' ' + t('tasks').toLowerCase();
    else focusLine = t('nothingScheduled');

    const rows = [['scoreTasks', s.tasks], ['scoreHabits', s.habits], ['scoreFocus', s.focus], ['scoreSchedule', s.schedule]]
      .map(([k, v]) => '<div class="df-score-row"><span>' + esc(t(k)) + '</span>' +
        '<span class="df-bar"><i style="width:' + v + '%"></i></span><b>' + num(v) + '%</b></div>').join('');

    const todaysTasks = (DF.state.tasks || []).filter(x => x.status === 'today' || x.status === 'progress' || (x.status === 'done' && dayKey(x.completedAt) === dayKey()));
    const taskHtml = todaysTasks.length
      ? todaysTasks.map(taskRow).join('')
      : empty('icon-clipboard-check', t('allClear'), t('allClearBody'), t('addTask'), 'data-act="task-new"');

    const dueHabits = (DF.state.habits || []).filter(x => habitScheduledOn(x, new Date()));
    const habitHtml = dueHabits.length
      ? dueHabits.map(hb => '<div class="df-row"><button class="df-check' + (hb.history[dayKey()] ? ' on' : '') +
        '" data-act="habit-toggle" data-id="' + hb.id + '" aria-pressed="' + !!hb.history[dayKey()] + '" aria-label="' + esc(hb.name) + '">' + ico('icon-check') + '</button>' +
        '<div class="df-row-main"><div class="df-row-title">' + esc(hb.name) + '</div></div>' +
        (habitStreak(hb) > 0 ? '<span class="df-streak">' + ico('icon-zap') + num(habitStreak(hb)) + '</span>' : '') + '</div>').join('')
      : empty('icon-repeat', t('noHabitsYet'), t('noHabitsYetBody'), t('newHabit'), 'data-act="habit-new"');

    const goals = (DF.state.goals || []).filter(g => g.status === 'active');
    const goalHtml = goals.length
      ? goals.slice(0, 3).map(g => '<div class="df-row" data-act="goal-open" data-id="' + g.id + '" tabindex="0" role="button">' +
        ring(goalProgress(g), 38, 4, '<span style="font-size:10.5px;font-weight:700">' + num(goalProgress(g)) + '</span>') +
        '<div class="df-row-main"><div class="df-row-title">' + esc(g.title) + '</div>' +
        '<div class="df-row-sub">' + num(g.milestones.filter(m => m.done).length) + '/' + num(g.milestones.length) + ' ' + esc(t('milestones').toLowerCase()) + '</div></div></div>').join('')
      : empty('icon-target', t('noGoalsYet'), t('noGoalsYetBody'), t('newGoal'), 'data-act="goal-new"');

    return head(greet + (name ? ', ' + name : ''), dateStr) +
      '<div class="df-focusline" style="margin:-18px 0 24px">' + ico('icon-sparkle') + '<span>' + esc(focusLine) + '</span></div>' +
      '<div class="df-card df-score-card">' +
      ring(s.total, 132, 11, '<div class="df-metric-xl">' + num(s.total) + '</div><div class="df-micro">' + esc(t('todayScore')) + '</div>') +
      '<div class="df-score-break">' + rows + '</div></div>' +
      '<div class="df-grid df-grid-2" style="margin-top:16px">' +
      '<div class="df-card"><div class="df-row-between" style="margin-bottom:14px"><h2 class="df-section">' + esc(t('today')) + '</h2>' +
      '<button class="df-btn sm secondary" data-act="task-new">' + ico('icon-plus') + esc(t('addTask')) + '</button></div>' +
      (todaysTasks.length ? '<div class="df-meta" style="margin-bottom:10px">' + num(s.doneT) + '/' + num(s.totalT) + ' ' + esc(t('completed')) + '</div>' : '') +
      taskHtml + '</div>' +
      '<div class="df-card"><div class="df-row-between" style="margin-bottom:14px"><h2 class="df-section">' + esc(t('habits')) + '</h2>' +
      (dueHabits.length ? '<span class="df-meta">' + num(s.doneH) + '/' + num(s.dueH) + '</span>' : '') + '</div>' + habitHtml + '</div>' +
      '<div class="df-card"><div class="df-row-between" style="margin-bottom:14px"><h2 class="df-section">' + esc(t('goals')) + '</h2></div>' + goalHtml + '</div>' +
      '<div class="df-card" style="display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:12px">' +
      '<h2 class="df-section">' + esc(t('focus')) + '</h2>' +
      '<div class="df-metric-l">' + num(s.fm) + ' <span style="font-size:15px;color:var(--df-text-dim)">' + esc(t('min')) + '</span></div>' +
      '<button class="df-btn" data-act="go" data-view="focus">' + ico('icon-play') + esc(t('startFocus')) + '</button></div>' +
      '</div>';
  };

  function taskRow(x) {
    const done = x.status === 'done';
    return '<div class="df-row' + (done ? ' done' : '') + '">' +
      '<span class="df-prio ' + (x.priority === 'high' ? 'high' : x.priority === 'low' ? 'low' : 'med') + '"></span>' +
      '<button class="df-check' + (done ? ' on' : '') + '" data-act="task-toggle" data-id="' + x.id + '" aria-pressed="' + done + '" aria-label="' + esc(x.title) + '">' + ico('icon-check') + '</button>' +
      '<div class="df-row-main" data-act="task-open" data-id="' + x.id + '" tabindex="0" role="button">' +
      '<div class="df-row-title">' + esc(x.title) + '</div>' +
      '<div class="df-row-sub">' + catDot(x.category) + ' ' + esc(t(CAT_LABEL[x.category] || 'admin')) + (x.due ? ' · ' + num(x.due) : '') + '</div></div></div>';
  }

  /* ---------- Tasks ---------- */
  DF.taskFilter = { q: '', prio: '', cat: '', status: '', due: '', view: 'list' };
  VIEWS.tasks = function () {
    const f = DF.taskFilter;
    const nowHM = String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');
    const filtered = (DF.state.tasks || []).filter(x => {
      if (f.q && x.title.toLowerCase().indexOf(f.q.toLowerCase()) === -1 && (x.notes || '').toLowerCase().indexOf(f.q.toLowerCase()) === -1) return false;
      if (f.prio && x.priority !== f.prio) return false;
      if (f.cat && x.category !== f.cat) return false;
      if (f.status && x.status !== f.status) return false;
      if (f.due === 'has' && !x.due) return false;
      if (f.due === 'none' && x.due) return false;
      if (f.due === 'overdue' && (!x.due || x.status === 'done' || x.due >= nowHM)) return false;
      return true;
    });
    const anyFilter = f.q || f.prio || f.cat || f.status || f.due;

    const controls =
      '<div class="df-card" style="padding:14px;margin-bottom:16px">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<input class="df-input" id="dfSearch" style="flex:1;min-width:180px;min-height:38px" placeholder="' + esc(t('search')) + '" value="' + esc(f.q) + '" aria-label="' + esc(t('search')) + '">' +
      '<select class="df-select" id="dfFPrio" style="width:auto;min-height:38px" aria-label="' + esc(t('priority')) + '">' +
      '<option value="">' + esc(t('allPriorities')) + '</option>' +
      ['high', 'med', 'low'].map(p => '<option value="' + p + '"' + (f.prio === p ? ' selected' : '') + '>' + esc(t(p === 'med' ? 'medium' : p)) + '</option>').join('') + '</select>' +
      '<select class="df-select" id="dfFCat" style="width:auto;min-height:38px" aria-label="' + esc(t('category')) + '">' +
      '<option value="">' + esc(t('allCategories')) + '</option>' +
      CATS.map(c => '<option value="' + c + '"' + (f.cat === c ? ' selected' : '') + '>' + esc(t(CAT_LABEL[c])) + '</option>').join('') + '</select>' +
      '<select class="df-select" id="dfFStatus" style="width:auto;min-height:38px" aria-label="' + esc(t('status')) + '">' +
      '<option value="">' + esc(t('allStatuses')) + '</option>' +
      STATUSES.map(s => '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + esc(t(STATUS_LABEL[s])) + '</option>').join('') + '</select>' +
      '<select class="df-select" id="dfFDue" style="width:auto;min-height:38px" aria-label="' + esc(t('dueTime')) + '">' +
      '<option value="">' + esc(t('anyDue')) + '</option>' +
      '<option value="has"' + (f.due === 'has' ? ' selected' : '') + '>' + esc(t('hasDue')) + '</option>' +
      '<option value="overdue"' + (f.due === 'overdue' ? ' selected' : '') + '>' + esc(t('overdueDue')) + '</option>' +
      '<option value="none"' + (f.due === 'none' ? ' selected' : '') + '>' + esc(t('noDue')) + '</option></select>' +
      '<div class="df-seg"><button class="' + (f.view === 'list' ? 'active' : '') + '" data-act="tview" data-v="list">' + esc(t('list')) + '</button>' +
      '<button class="' + (f.view === 'board' ? 'active' : '') + '" data-act="tview" data-v="board">' + esc(t('board')) + '</button></div>' +
      (anyFilter ? '<button class="df-btn ghost sm" data-act="tclear">' + esc(t('clearFilters')) + '</button>' : '') +
      '</div></div>';

    let body;
    if (!(DF.state.tasks || []).length) {
      body = '<div class="df-card">' + empty('icon-clipboard-list', t('noTasksYet'), t('noTasksYetBody'), t('addTask'), 'data-act="task-new"') + '</div>';
    } else if (!filtered.length) {
      body = '<div class="df-card">' + empty('icon-search', t('noMatch'), t('noMatchBody'), t('clearFilters'), 'data-act="tclear"') + '</div>';
    } else if (f.view === 'board') {
      body = '<div class="df-board">' + STATUSES.map(st =>
        '<div class="df-col" data-drop="' + st + '"><div class="df-col-head"><h2 class="df-section">' + esc(t(STATUS_LABEL[st])) + '</h2>' +
        '<span class="df-col-count">' + num(filtered.filter(x => x.status === st).length) + '</span></div>' +
        filtered.filter(x => x.status === st).map(x =>
          '<div class="df-tile" draggable="true" data-id="' + x.id + '" data-act="task-open">' +
          '<span class="df-prio ' + (x.priority === 'high' ? 'high' : x.priority === 'low' ? 'low' : 'med') + '"></span>' +
          '<div style="flex:1;min-width:0"><div class="df-tile-title">' + esc(x.title) + '</div>' +
          '<div class="df-row-sub">' + catDot(x.category) + ' ' + esc(t(CAT_LABEL[x.category] || 'admin')) + '</div></div></div>').join('') +
        '</div>').join('') + '</div>';
    } else {
      body = '<div class="df-card">' + filtered.map(taskRow).join('') + '</div>';
    }

    return head(t('tasks'), null, '<button class="df-btn" data-act="task-new">' + ico('icon-plus') + esc(t('addTask')) + '</button>') + controls + body;
  };
  AFTER.tasks = function () {
    const s = $('#dfSearch');
    if (s) s.addEventListener('input', e => { DF.taskFilter.q = e.target.value; const p = e.target.selectionStart; render('tasks'); const n = $('#dfSearch'); if (n) { n.focus(); n.setSelectionRange(p, p); } });
    const p = $('#dfFPrio'); if (p) p.addEventListener('change', e => { DF.taskFilter.prio = e.target.value; render('tasks'); });
    const c = $('#dfFCat'); if (c) c.addEventListener('change', e => { DF.taskFilter.cat = e.target.value; render('tasks'); });
    const st = $('#dfFStatus'); if (st) st.addEventListener('change', e => { DF.taskFilter.status = e.target.value; render('tasks'); });
    const du = $('#dfFDue'); if (du) du.addEventListener('change', e => { DF.taskFilter.due = e.target.value; render('tasks'); });
    // Board drag and drop. Touch devices get the status dropdown in the detail panel instead.
    let dragId = null;
    document.querySelectorAll('.df-tile[draggable]').forEach(el => {
      el.addEventListener('dragstart', e => { dragId = el.dataset.id; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      el.addEventListener('dragend', () => { dragId = null; el.classList.remove('dragging'); });
    });
    document.querySelectorAll('[data-drop]').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop'));
      col.addEventListener('drop', e => {
        e.preventDefault(); col.classList.remove('drop');
        if (!dragId) return;
        setTaskStatus(dragId, col.dataset.drop);
      });
    });
  };

  function setTaskStatus(id, status) {
    const x = (DF.state.tasks || []).find(a => a.id === id);
    if (!x || x.status === status) return;
    x.status = status;
    if (status === 'done') x.completedAt = Date.now(); else delete x.completedAt;
    save('tasks'); render(DF.view); toast(t('saved'));
  }

  function taskModal(id) {
    const x = id ? (DF.state.tasks || []).find(a => a.id === id) : null;
    const body =
      '<div class="df-field"><label class="df-label" for="dfTTitle">' + esc(t('title')) + '</label>' +
      '<input class="df-input" id="dfTTitle" value="' + esc(x ? x.title : '') + '"><div class="df-error"></div></div>' +
      '<div class="df-field"><label class="df-label" for="dfTNotes">' + esc(t('notes')) + ' (' + esc(t('optional')) + ')</label>' +
      '<textarea class="df-textarea" id="dfTNotes">' + esc(x ? x.notes || '' : '') + '</textarea></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">' +
      '<div><label class="df-label" for="dfTPrio">' + esc(t('priority')) + '</label><select class="df-select" id="dfTPrio">' +
      ['high', 'med', 'low'].map(p => '<option value="' + p + '"' + (x && x.priority === p ? ' selected' : (!x && p === 'med' ? ' selected' : '')) + '>' + esc(t(p === 'med' ? 'medium' : p)) + '</option>').join('') + '</select></div>' +
      '<div><label class="df-label" for="dfTCat">' + esc(t('category')) + '</label><select class="df-select" id="dfTCat">' +
      CATS.map(c => '<option value="' + c + '"' + (x && x.category === c ? ' selected' : '') + '>' + esc(t(CAT_LABEL[c])) + '</option>').join('') + '</select></div>' +
      '<div><label class="df-label" for="dfTStatus">' + esc(t('status')) + '</label><select class="df-select" id="dfTStatus">' +
      STATUSES.map(s => '<option value="' + s + '"' + (x && x.status === s ? ' selected' : (!x && s === 'today' ? ' selected' : '')) + '>' + esc(t(STATUS_LABEL[s])) + '</option>').join('') + '</select></div>' +
      '<div><label class="df-label" for="dfTDue">' + esc(t('dueTime')) + ' (' + esc(t('optional')) + ')</label>' +
      '<input class="df-input" id="dfTDue" type="time" value="' + esc(x ? x.due || '' : '') + '"></div></div>' +
      (x ? '<button class="df-btn danger sm" style="margin-top:18px" data-act="task-del" data-id="' + x.id + '">' + ico('icon-trash') + esc(t('delete')) + '</button>' : '');

    openModal(x ? t('editTask') : t('newTask'), body, function () {
      clearErrors();
      const title = $('#dfTTitle').value.trim();
      if (!title) { fieldError('dfTTitle', t('required')); return false; }
      const rec = x || { id: uid(), createdAt: Date.now(), history: {} };
      rec.title = title;
      rec.notes = $('#dfTNotes').value.trim();
      rec.priority = $('#dfTPrio').value;
      rec.category = $('#dfTCat').value;
      rec.due = $('#dfTDue').value;
      const ns = $('#dfTStatus').value;
      if (ns === 'done' && rec.status !== 'done') rec.completedAt = Date.now();
      if (ns !== 'done') delete rec.completedAt;
      rec.status = ns;
      if (!x) DF.state.tasks.push(rec);
      save('tasks');
      return true;
    });
  }

  /* ---------- Habits ---------- */
  VIEWS.habits = function () {
    const hs = DF.state.habits || [];
    if (!hs.length) return head(t('habits'), null, '<button class="df-btn" data-act="habit-new">' + ico('icon-plus') + esc(t('newHabit')) + '</button>') +
      '<div class="df-card">' + empty('icon-repeat', t('noHabitsYet'), t('noHabitsYetBody'), t('newHabit'), 'data-act="habit-new"') + '</div>';

    const k = dayKey();
    const due = hs.filter(h => habitScheduledOn(h, new Date()));
    const doneN = due.filter(h => h.history[k]).length;
    const wkStart = startOfWeek(new Date());
    const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const gridHead = '<div class="df-habit-grid head"><span></span>' + dows.map(d => '<span>' + d + '</span>').join('') + '</div>';
    const gridRows = hs.map(h => {
      let cells = '';
      for (let i = 0; i < 7; i++) {
        const d = addDays(wkStart, i), dk = dayKey(d);
        const sched = habitScheduledOn(h, d);
        const isToday = dk === k;
        const isFuture = d > new Date() && !isToday;
        const on = !!h.history[dk];
        cells += '<button class="df-cell' + (on ? ' done' : '') + (isToday ? ' today' : '') + (!sched ? ' off' : '') + '"' +
          (sched && !isFuture ? ' data-act="habit-cell" data-id="' + h.id + '" data-k="' + dk + '"' : ' disabled') +
          ' aria-label="' + esc(h.name) + ' ' + dk + '" aria-pressed="' + on + '">' + (on ? ico('icon-check') : '') + '</button>';
      }
      return '<div class="df-habit-grid" style="margin-top:10px">' +
        '<div style="display:flex;align-items:center;gap:9px;min-width:0;cursor:pointer" data-act="habit-open" data-id="' + h.id + '" tabindex="0" role="button">' +
        ico(iconFor(h.icon)) + '<span class="df-row-title">' + esc(h.name) + '</span>' +
        (habitStreak(h) > 0 ? '<span class="df-streak">' + ico('icon-zap') + num(habitStreak(h)) + '</span>' : '') + '</div>' + cells + '</div>';
    }).join('');

    return head(t('habits'), null, '<button class="df-btn" data-act="habit-new">' + ico('icon-plus') + esc(t('newHabit')) + '</button>') +
      '<div class="df-card"><div class="df-row-between" style="margin-bottom:10px">' +
      '<h2 class="df-section">' + esc(t('todayProgress')) + '</h2>' +
      '<span class="df-meta">' + num(doneN) + '/' + num(due.length) + ' ' + esc(t('completed')) + '</span></div>' +
      '<div class="df-bar"><i style="width:' + pct(doneN, due.length) + '%"></i></div></div>' +
      '<div class="df-card" style="margin-top:16px;overflow-x:auto">' + gridHead + gridRows + '</div>';
  };
  function iconFor(id) { return id && id.indexOf('icon-') === 0 ? id : 'icon-' + (id || 'clipboard-check'); }

  function habitDetail(id) {
    const h = (DF.state.habits || []).find(a => a.id === id);
    if (!h) return;
    const cur = habitStreak(h), best = habitBest(h);
    let sched = 0, done = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(new Date(), -i);
      if (!habitScheduledOn(h, d)) continue;
      sched++; if (h.history[dayKey(d)]) done++;
    }
    const body =
      '<div style="display:flex;gap:0;text-align:center;margin-bottom:18px">' +
      '<div style="flex:1"><div class="df-metric-l">' + num(cur) + '</div><div class="df-micro" style="margin-top:4px">' + esc(t('currentStreak')) + '</div></div>' +
      '<div style="width:1px;background:var(--df-border)"></div>' +
      '<div style="flex:1"><div class="df-metric-l">' + num(best) + '</div><div class="df-micro" style="margin-top:4px">' + esc(t('bestStreak')) + '</div></div>' +
      '<div style="width:1px;background:var(--df-border)"></div>' +
      '<div style="flex:1"><div class="df-metric-l">' + num(pct(done, sched)) + '%</div><div class="df-micro" style="margin-top:4px">' + esc(t('completion')) + '</div></div></div>' +
      '<div class="df-field"><label class="df-label" for="dfHName">' + esc(t('habitName')) + '</label>' +
      '<input class="df-input" id="dfHName" value="' + esc(h.name) + '"><div class="df-error"></div></div>' +
      '<div class="df-field"><label class="df-label" for="dfHFreq">' + esc(t('frequency')) + '</label>' +
      '<select class="df-select" id="dfHFreq">' +
      '<option value="daily"' + (h.freq === 'daily' ? ' selected' : '') + '>' + esc(t('daily')) + '</option>' +
      '<option value="weekdays"' + (h.freq === 'weekdays' ? ' selected' : '') + '>' + esc(t('weekdays')) + '</option></select></div>' +
      '<button class="df-btn danger sm" style="margin-top:18px" data-act="habit-del" data-id="' + h.id + '">' + ico('icon-trash') + esc(t('delete')) + '</button>';
    openModal(h.name, body, function () {
      clearErrors();
      const n = $('#dfHName').value.trim();
      if (!n) { fieldError('dfHName', t('required')); return false; }
      h.name = n; h.freq = $('#dfHFreq').value;
      h.days = h.freq === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
      save('habits'); return true;
    });
  }

  function habitModal() {
    const body = '<div class="df-field"><label class="df-label" for="dfHName">' + esc(t('habitName')) + '</label>' +
      '<input class="df-input" id="dfHName" placeholder=""><div class="df-error"></div></div>' +
      '<div class="df-field"><label class="df-label" for="dfHFreq">' + esc(t('frequency')) + '</label>' +
      '<select class="df-select" id="dfHFreq"><option value="daily">' + esc(t('daily')) + '</option>' +
      '<option value="weekdays">' + esc(t('weekdays')) + '</option></select></div>';
    openModal(t('newHabit'), body, function () {
      clearErrors();
      const n = $('#dfHName').value.trim();
      if (!n) { fieldError('dfHName', t('required')); return false; }
      const freq = $('#dfHFreq').value;
      DF.state.habits.push({ id: uid(), name: n, icon: 'clipboard-check', freq, days: freq === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6], history: {} });
      save('habits'); return true;
    });
  }

  /* ---------- Goals ---------- */
  VIEWS.goals = function () {
    const gs = DF.state.goals || [];
    if (!gs.length) return head(t('goals'), null, '<button class="df-btn" data-act="goal-new">' + ico('icon-plus') + esc(t('newGoal')) + '</button>') +
      '<div class="df-card">' + empty('icon-target', t('noGoalsYet'), t('noGoalsYetBody'), t('newGoal'), 'data-act="goal-new"') + '</div>';

    const group = st => gs.filter(g => g.status === st);
    const sec = (label, arr) => arr.length ? '<h2 class="df-section" style="margin:26px 0 12px">' + esc(label) + '</h2>' +
      '<div class="df-grid df-grid-2">' + arr.map(g => {
        const p = goalProgress(g);
        return '<div class="df-card df-goal-card" data-act="goal-open" data-id="' + g.id + '" tabindex="0" role="button">' +
          ring(p, 60, 6, '<span style="font-size:13px;font-weight:700">' + num(p) + '</span>') +
          '<div style="min-width:0"><div class="df-row-title">' + esc(g.title) + '</div>' +
          '<div class="df-row-sub">' + num(g.milestones.filter(m => m.done).length) + '/' + num(g.milestones.length) + ' ' + esc(t('milestones').toLowerCase()) +
          (g.targetDate ? ' · ' + esc(g.targetDate) : '') + '</div></div></div>';
      }).join('') + '</div>' : '';

    return head(t('goals'), null, '<button class="df-btn" data-act="goal-new">' + ico('icon-plus') + esc(t('newGoal')) + '</button>') +
      sec(t('active'), group('active')) + sec(t('paused'), group('paused')) + sec(t('done'), group('done'));
  };

  function goalDetail(id) {
    const g = (DF.state.goals || []).find(a => a.id === id);
    if (!g) return;
    const p = goalProgress(g);
    const left = g.milestones.filter(m => m.done === false).length;
    let pace = '';
    if (g.targetDate) {
      const days = Math.ceil((new Date(g.targetDate + 'T00:00:00') - new Date()) / 864e5);
      if (days <= 0) pace = t('overdue');
      else if (left > 0) pace = t('pace') + ': ' + t('perMonth', { n: Math.max(1, Math.ceil(left / Math.max(1, days / 30))) });
    }
    const body =
      '<div style="text-align:center;margin-bottom:18px">' + ring(p, 116, 10, '<div class="df-metric-l">' + num(p) + '%</div>') + '</div>' +
      (g.description ? '<p class="df-body" style="margin-bottom:16px">' + esc(g.description) + '</p>' : '') +
      '<div class="df-stat-grid" style="margin-bottom:18px">' +
      '<div class="df-stat">' + ico('icon-calendar') + '<div><div class="df-stat-val">' + esc(g.targetDate || '—') + '</div><div class="df-stat-lbl">' + esc(t('targetDate')) + '</div></div></div>' +
      '<div class="df-stat">' + ico('icon-clipboard-check') + '<div><div class="df-stat-val">' + num(g.milestones.filter(m => m.done).length) + '/' + num(g.milestones.length) + '</div><div class="df-stat-lbl">' + esc(t('milestones')) + '</div></div></div>' +
      '</div>' +
      (pace ? '<div class="df-insight">' + ico('icon-sparkle') + '<span>' + esc(pace) + '</span></div>' : '') +
      '<h3 class="df-section" style="margin:20px 0 6px">' + esc(t('milestones')) + '</h3>' +
      (g.milestones.length ? g.milestones.map(m =>
        '<div class="df-milestone"><button class="df-check' + (m.done ? ' on' : '') + '" data-act="ms-toggle" data-id="' + g.id + '" data-m="' + m.id + '" aria-pressed="' + m.done + '" aria-label="' + esc(m.title) + '">' + ico('icon-check') + '</button>' +
        '<span style="flex:1' + (m.done ? ';text-decoration:line-through;color:var(--df-text-faint)' : '') + '">' + esc(m.title) + '</span>' +
        '<button class="df-btn ghost sm" data-act="ms-del" data-id="' + g.id + '" data-m="' + m.id + '" aria-label="' + esc(t('delete')) + '">' + ico('icon-x') + '</button></div>').join('')
        : '<p class="df-body">' + esc(t('noMilestones')) + '</p>') +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<input class="df-input" id="dfMsNew" placeholder="' + esc(t('addMilestone')) + '" style="min-height:38px">' +
      '<button class="df-btn secondary sm" data-act="ms-add" data-id="' + g.id + '">' + ico('icon-plus') + '</button></div>' +
      '<div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">' +
      '<button class="df-btn secondary sm" data-act="goal-status" data-id="' + g.id + '" data-s="' + (g.status === 'active' ? 'paused' : 'active') + '">' +
      esc(g.status === 'active' ? t('paused') : t('active')) + '</button>' +
      '<button class="df-btn secondary sm" data-act="goal-status" data-id="' + g.id + '" data-s="done">' + esc(t('done')) + '</button>' +
      '<button class="df-btn danger sm" data-act="goal-del" data-id="' + g.id + '">' + ico('icon-trash') + esc(t('delete')) + '</button></div>';
    openModal(g.title, body, null, true);
  }

  function goalModal() {
    const body =
      '<div class="df-field"><label class="df-label" for="dfGTitle">' + esc(t('goalTitle')) + '</label>' +
      '<input class="df-input" id="dfGTitle"><div class="df-error"></div></div>' +
      '<div class="df-field"><label class="df-label" for="dfGDesc">' + esc(t('description')) + ' (' + esc(t('optional')) + ')</label>' +
      '<textarea class="df-textarea" id="dfGDesc"></textarea></div>' +
      '<div class="df-field"><label class="df-label" for="dfGDate">' + esc(t('targetDate')) + ' (' + esc(t('optional')) + ')</label>' +
      '<input class="df-input" id="dfGDate" type="date"></div>';
    openModal(t('newGoal'), body, function () {
      clearErrors();
      const ti = $('#dfGTitle').value.trim();
      if (!ti) { fieldError('dfGTitle', t('required')); return false; }
      DF.state.goals.push({ id: uid(), title: ti, description: $('#dfGDesc').value.trim(), category: 'deep', targetDate: $('#dfGDate').value, status: 'active', milestones: [] });
      save('goals'); return true;
    });
  }

  /* ---------- Planner ---------- */
  DF.weekOffset = 0;
  VIEWS.planner = function () {
    const base = addDays(startOfWeek(new Date()), DF.weekOffset * 7);
    const todayK = dayKey();
    const isNarrow = window.innerWidth <= 760;
    const dows = L() === 'ar' ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    if (DF.plannerDay == null) DF.plannerDay = new Date().getDay();
    // One column at phone width, so the day being shown has to be selectable -
    // otherwise six of the seven days would be unreachable there.
    const showDays = isNarrow ? [DF.plannerDay] : [0, 1, 2, 3, 4, 5, 6];

    let heads = '<div class="df-week-head gutter"></div>';
    showDays.forEach(i => {
      const d = addDays(base, i);
      heads += '<div class="df-week-head' + (dayKey(d) === todayK ? ' today' : '') + '">' +
        '<div class="df-week-dow">' + dows[i] + '</div><div class="df-week-num">' + num(d.getDate()) + '</div></div>';
    });

    let gutter = '';
    for (let h = 6; h < 23; h++) gutter += '<div class="df-hour">' + num(h % 12 === 0 ? 12 : h % 12) + (h < 12 ? 'a' : 'p') + '</div>';

    const cols = showDays.map(i => {
      let slots = '';
      for (let h = 6; h < 23; h++) slots += '<div class="slot"></div>';
      const blocks = (DF.state.blocks || []).filter(b => b.day === i).map(b => {
        const top = ((b.start - 360) / 60) * 46, hgt = Math.max(18, ((b.end - b.start) / 60) * 46);
        return '<div class="df-block" style="top:' + top + 'px;height:' + hgt + 'px;--cat:' + (CAT_COLOR[b.cat] || 'var(--accent)') + '" data-act="block-open" data-id="' + b.id + '" tabindex="0" role="button">' +
          '<div class="df-block-t">' + esc(b.title) + '</div><div class="df-block-time">' + hhmm(b.start) + '</div></div>';
      }).join('');
      const now = new Date();
      const nowLine = (dayKey(addDays(base, i)) === todayK && now.getHours() >= 6)
        ? '<div class="df-nowline" style="top:' + (((now.getHours() * 60 + now.getMinutes()) - 360) / 60 * 46) + 'px"></div>' : '';
      return '<div class="df-daycol" data-act="block-new" data-day="' + i + '">' + slots + blocks + nowLine + '</div>';
    }).join('');

    const nav = '<div style="display:flex;gap:8px;align-items:center">' +
      '<button class="df-btn secondary sm" data-act="wk" data-d="-1" aria-label="previous week">‹</button>' +
      '<button class="df-btn secondary sm" data-act="wk" data-d="0">' + esc(t('thisWeek')) + '</button>' +
      '<button class="df-btn secondary sm" data-act="wk" data-d="1" aria-label="next week">›</button>' +
      '<button class="df-btn" data-act="block-new" data-day="' + new Date().getDay() + '">' + ico('icon-plus') + esc(t('newBlock')) + '</button></div>';

    const strip = '<div class="df-daystrip">' + [0, 1, 2, 3, 4, 5, 6].map(i =>
      '<button class="' + (DF.plannerDay === i ? 'active' : '') + '" data-act="pday" data-d="' + i + '">' + dows[i].substring(0, 3) + '</button>').join('') + '</div>';

    return head(t('planner'), null, nav) + strip +
      '<div class="df-week" style="grid-template-columns:54px repeat(' + showDays.length + ',minmax(0,1fr))">' + heads +
      '<div class="df-week-body"><div class="df-week-inner" style="grid-template-columns:54px repeat(' + showDays.length + ',minmax(0,1fr))">' +
      '<div>' + gutter + '</div>' + cols + '</div></div></div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px">' +
      CATS.map(c => '<span class="df-meta" style="display:inline-flex;align-items:center;gap:6px">' + catDot(c) + esc(t(CAT_LABEL[c])) + '</span>').join('') + '</div>';
  };

  function blockModal(id, day) {
    const b = id ? (DF.state.blocks || []).find(a => a.id === id) : null;
    const body =
      '<div class="df-field"><label class="df-label" for="dfBTitle">' + esc(t('title')) + '</label>' +
      '<input class="df-input" id="dfBTitle" value="' + esc(b ? b.title : '') + '"><div class="df-error"></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">' +
      '<div><label class="df-label" for="dfBStart">' + esc(t('startTime')) + '</label>' +
      '<input class="df-input" id="dfBStart" type="time" value="' + (b ? String(Math.floor(b.start / 60)).padStart(2, '0') + ':' + String(b.start % 60).padStart(2, '0') : '09:00') + '"></div>' +
      '<div><label class="df-label" for="dfBEnd">' + esc(t('endTime')) + '</label>' +
      '<input class="df-input" id="dfBEnd" type="time" value="' + (b ? String(Math.floor(b.end / 60)).padStart(2, '0') + ':' + String(b.end % 60).padStart(2, '0') : '10:00') + '"></div></div>' +
      '<div class="df-field" style="margin-top:14px"><label class="df-label" for="dfBCat">' + esc(t('category')) + '</label>' +
      '<select class="df-select" id="dfBCat">' + CATS.map(c => '<option value="' + c + '"' + (b && b.cat === c ? ' selected' : '') + '>' + esc(t(CAT_LABEL[c])) + '</option>').join('') + '</select>' +
      '<div class="df-error"></div></div>' +
      (b ? '<button class="df-btn danger sm" style="margin-top:18px" data-act="block-del" data-id="' + b.id + '">' + ico('icon-trash') + esc(t('delete')) + '</button>' : '');
    openModal(b ? t('editBlock') : t('newBlock'), body, function () {
      clearErrors();
      const ti = $('#dfBTitle').value.trim();
      if (!ti) { fieldError('dfBTitle', t('required')); return false; }
      const toMin = v => { const p = (v || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); };
      const st = toMin($('#dfBStart').value), en = toMin($('#dfBEnd').value);
      if (en <= st) { fieldError('dfBCat', t('invalidTime')); return false; }
      if (b) { b.title = ti; b.start = st; b.end = en; b.cat = $('#dfBCat').value; }
      else DF.state.blocks.push({ id: uid(), day: day == null ? new Date().getDay() : day, title: ti, start: st, end: en, cat: $('#dfBCat').value });
      save('blocks'); return true;
    });
  }

  /* ---------- Focus ---------- */
  DF.focus = { preset: 25, remaining: 25 * 60, running: false, taskId: '', tick: null, startedAt: null };
  VIEWS.focus = function () {
    const f = DF.focus;
    const mm = String(Math.floor(f.remaining / 60)).padStart(2, '0');
    const ss = String(f.remaining % 60).padStart(2, '0');
    const progress = f.preset > 0 ? 100 - (f.remaining / (f.preset * 60)) * 100 : 0;
    const linkables = (DF.state.tasks || []).filter(x => x.status !== 'done');
    const recent = (DF.state.sessions || []).slice().sort((a, b) => b.at - a.at).slice(0, 6);

    return head(t('focus')) +
      '<div class="df-card"><div class="df-focus-wrap">' +
      '<div class="df-focus-side" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
      [25, 45, 60].map(p => '<button class="df-chip' + (f.preset === p && !f.running ? ' active' : '') + '" data-act="fpreset" data-p="' + p + '">' + num(p) + ' ' + esc(t('min')) + '</button>').join('') +
      '</div>' +
      ring(progress, 208, 10, '<div class="df-focus-time">' + num(mm + ':' + ss) + '</div>') +
      '<div class="df-focus-side" style="width:100%;max-width:330px">' +
      '<label class="df-label" for="dfFTask">' + esc(t('focusOn')) + '</label>' +
      '<select class="df-select" id="dfFTask"><option value="">' + esc(t('nothingLinked')) + '</option>' +
      linkables.map(x => '<option value="' + x.id + '"' + (f.taskId === x.id ? ' selected' : '') + '>' + esc(x.title) + '</option>').join('') + '</select></div>' +
      '<div class="df-focus-controls">' +
      '<button class="df-btn" data-act="fstart">' + ico(f.running ? 'icon-pause' : 'icon-play') + esc(f.running ? t('pause') : (f.remaining < f.preset * 60 ? t('resume') : t('start'))) + '</button>' +
      '<button class="df-btn secondary" data-act="freset">' + esc(t('reset')) + '</button>' +
      '<button class="df-btn ghost" data-act="fzen">' + ico('icon-maximize') + esc(t('zenMode')) + '</button>' +
      '</div></div></div>' +
      '<div class="df-card df-focus-side" style="margin-top:16px"><h2 class="df-section" style="margin-bottom:12px">' + esc(t('recentSessions')) + '</h2>' +
      (recent.length ? recent.map(s => {
        const task = (DF.state.tasks || []).find(x => x.id === s.taskId);
        return '<div class="df-row"><span class="df-dot" style="background:var(--accent)"></span>' +
          '<div class="df-row-main"><div class="df-row-title">' + num(s.minutes) + ' ' + esc(t('minutes')) + (task ? ' · ' + esc(task.title) : '') + '</div>' +
          '<div class="df-row-sub">' + esc(new Date(s.at).toLocaleDateString(L() === 'ar' ? 'ar' : 'en-US', { month: 'short', day: 'numeric' })) + '</div></div></div>';
      }).join('') : empty('icon-alarm-clock', t('noSessions'), t('noSessionsBody'))) + '</div>';
  };
  AFTER.focus = function () {
    const sel = $('#dfFTask');
    if (sel) sel.addEventListener('change', e => { DF.focus.taskId = e.target.value; });
  };

  function focusTick() {
    const f = DF.focus;
    if (!f.running) return;
    f.remaining--;
    if (f.remaining <= 0) {
      f.remaining = 0; f.running = false;
      clearInterval(f.tick); f.tick = null;
      DF.state.sessions.push({ id: uid(), at: Date.now(), minutes: f.preset, taskId: f.taskId || null, goalId: null });
      save('sessions');
      document.body.classList.remove('df-zen');
      if (typeof playChime === 'function') { try { playChime('timerEnd'); } catch (e) {} }
      toast(t('sessionDone'));
      f.remaining = f.preset * 60;
      if (DF.view === 'focus') render('focus');
      return;
    }
    // Cheap in-place update so the whole view isn't re-rendered every second.
    const el = document.querySelector('.df-focus-time');
    if (el) el.textContent = num(String(Math.floor(f.remaining / 60)).padStart(2, '0') + ':' + String(f.remaining % 60).padStart(2, '0'));
    const val = document.querySelector('.df-ring .val');
    if (val) {
      const r = (208 - 10) / 2, c = 2 * Math.PI * r;
      val.setAttribute('stroke-dashoffset', (c - ((100 - (f.remaining / (f.preset * 60)) * 100) / 100) * c).toFixed(1));
    }
  }

  /* ---------- Analytics ---------- */
  DF.range = 7;
  VIEWS.analytics = function () {
    const n = DF.range;
    const days = [];
    for (let i = n - 1; i >= 0; i--) days.push(addDays(new Date(), -i));
    const tasksPer = days.map(d => (DF.state.tasks || []).filter(x => x.completedAt && dayKey(x.completedAt) === dayKey(d)).length);
    const focusPer = days.map(d => focusMinutesOn(dayKey(d)));
    const habitPer = days.map(d => {
      const due = (DF.state.habits || []).filter(h => habitScheduledOn(h, d));
      return due.length ? pct(due.filter(h => h.history[dayKey(d)]).length, due.length) : 0;
    });

    const totalTasks = tasksPer.reduce((a, b) => a + b, 0);
    const totalFocus = focusPer.reduce((a, b) => a + b, 0);
    const avgHabit = habitPer.length ? Math.round(habitPer.reduce((a, b) => a + b, 0) / habitPer.length) : 0;
    const activeDays = days.filter((d, i) => tasksPer[i] || focusPer[i]).length;

    // Previous period, for the delta chips.
    const prevTasks = (function () {
      let s = 0;
      for (let i = n; i < n * 2; i++) s += (DF.state.tasks || []).filter(x => x.completedAt && dayKey(x.completedAt) === dayKey(addDays(new Date(), -i))).length;
      return s;
    })();
    const prevFocus = (function () {
      let s = 0;
      for (let i = n; i < n * 2; i++) s += focusMinutesOn(dayKey(addDays(new Date(), -i)));
      return s;
    })();

    if (activeDays < 2) {
      return head(t('analytics')) + rangeSeg() +
        '<div class="df-card" style="margin-top:16px">' + empty('icon-chart', t('notEnoughData'), t('notEnoughDataBody')) + '</div>';
    }

    const best = tasksPer.indexOf(Math.max.apply(null, tasksPer));
    const bestDay = days[best].toLocaleDateString(L() === 'ar' ? 'ar' : 'en-US', { weekday: 'long' });

    return head(t('analytics')) + rangeSeg() +
      '<div class="df-grid df-grid-2" style="margin-top:16px">' +
      chartCard(t('tasksCompleted'), tasksPer, days, totalTasks, prevTasks,
        t('tasksCompleted') + ': ' + num(totalTasks) + ' · ' + t('mostProductive') + ': ' + bestDay) +
      chartCard(t('focusMinutes'), focusPer, days, totalFocus, prevFocus,
        num(totalFocus) + ' ' + t('minutes') + ' · ' + num(Math.round(totalFocus / n)) + ' ' + t('min') + '/' + t('day')) +
      chartCard(t('habitConsistency'), habitPer, days, avgHabit, null,
        num(avgHabit) + '% ' + t('completion')) +
      goalCard() + '</div>';
  };
  function rangeSeg() {
    return '<div class="df-seg"><button class="' + (DF.range === 7 ? 'active' : '') + '" data-act="range" data-n="7">' + esc(t('last7')) + '</button>' +
      '<button class="' + (DF.range === 30 ? 'active' : '') + '" data-act="range" data-n="30">' + esc(t('last30')) + '</button></div>';
  }
  function chartCard(title, series, days, total, prev, insight) {
    const max = Math.max.apply(null, series.concat([1]));
    const bars = series.map((v, i) => {
      const isLast = i === series.length - 1;
      return '<div class="df-chart-col' + (isLast ? '' : '') + '">' +
        '<div class="df-chart-bar" style="height:' + Math.max(2, (v / max) * 100) + '%" title="' + v + '"></div>' +
        (series.length <= 10 ? '<span class="df-chart-x">' + days[i].toLocaleDateString('en-US', { weekday: 'narrow' }) + '</span>' : '') + '</div>';
    }).join('');
    let delta = '';
    if (prev != null) {
      const d = prev > 0 ? Math.round(((total - prev) / prev) * 100) : (total > 0 ? 100 : 0);
      const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
      delta = '<span class="df-delta ' + cls + '">' + (d > 0 ? '▲' : d < 0 ? '▼' : '–') + ' ' + num(Math.abs(d)) + '% </span>';
    }
    return '<div class="df-card"><div class="df-row-between" style="margin-bottom:6px">' +
      '<h2 class="df-section">' + esc(title) + '</h2>' + delta + '</div>' +
      '<div class="df-metric-l" style="margin-bottom:10px">' + num(total) + '</div>' +
      '<div class="df-chart">' + bars + '</div>' +
      '<div class="df-insight">' + ico('icon-sparkle') + '<span>' + esc(insight) + '</span></div></div>';
  }
  function goalCard() {
    const gs = (DF.state.goals || []).filter(g => g.status === 'active');
    if (!gs.length) return '<div class="df-card">' + empty('icon-target', t('noGoalsYet'), t('noGoalsYetBody')) + '</div>';
    return '<div class="df-card"><h2 class="df-section" style="margin-bottom:14px">' + esc(t('goalProgress')) + '</h2>' +
      gs.map(g => '<div style="margin-bottom:14px"><div class="df-row-between" style="margin-bottom:6px">' +
        '<span class="df-row-title">' + esc(g.title) + '</span><span class="df-meta">' + num(goalProgress(g)) + '%</span></div>' +
        '<div class="df-bar"><i style="width:' + goalProgress(g) + '%"></i></div></div>').join('') + '</div>';
  }

  /* ---------- Settings ---------- */
  VIEWS.settings = function () {
    const p = DF.state.profile;
    const mode = localStorage.getItem('idleMode') || 'dark';
    const themeCard = (id, label, desc, bg, fg) =>
      '<button class="df-theme-card' + (mode === id ? ' active' : '') + '" data-act="theme" data-m="' + id + '">' +
      '<div class="df-theme-prev" style="background:' + bg + '"><i style="background:' + fg + ';width:70%"></i><i style="background:' + fg + ';width:45%;opacity:.6"></i><i style="background:' + fg + ';width:58%;opacity:.35"></i></div>' +
      '<div class="df-theme-name">' + esc(label) + '</div><div class="df-theme-desc">' + esc(desc) + '</div></button>';

    return head(t('settings')) +
      '<div class="df-card"><h2 class="df-section" style="margin-bottom:14px">' + esc(t('appearance')) + '</h2>' +
      '<div class="df-theme-grid">' +
      themeCard('dark', t('themeDark'), t('themeDarkDesc'), '#131519', '#F2F4F7') +
      themeCard('light', t('themeLight'), t('themeLightDesc'), '#FFFFFF', '#12141A') +
      themeCard('system', t('themeSystem'), t('themeSystemDesc'), 'linear-gradient(135deg,#131519 50%,#FFFFFF 50%)', '#9BA1AC') +
      '</div></div>' +

      '<div class="df-card" style="margin-top:16px"><h2 class="df-section" style="margin-bottom:14px">' + esc(t('profile')) + '</h2>' +
      '<div class="df-field"><label class="df-label" for="dfPName">' + esc(t('yourName')) + '</label>' +
      '<input class="df-input" id="dfPName" value="' + esc(p.name || '') + '"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">' +
      '<div><label class="df-label" for="dfPStart">' + esc(t('workingHours')) + '</label>' +
      '<input class="df-input" id="dfPStart" type="number" min="0" max="23" value="' + (p.workStart != null ? p.workStart : 9) + '"></div>' +
      '<div><label class="df-label" for="dfPEnd">&nbsp;</label>' +
      '<input class="df-input" id="dfPEnd" type="number" min="1" max="24" value="' + (p.workEnd != null ? p.workEnd : 17) + '"></div></div>' +
      '<div class="df-field" style="margin-top:14px"><label class="df-label" for="dfPEnergy">' + esc(t('energyPattern')) + '</label>' +
      '<select class="df-select" id="dfPEnergy">' +
      ['morning', 'afternoon', 'evening', 'varies'].map(v => '<option value="' + v + '"' + (p.energy === v ? ' selected' : '') + '>' + esc(t(v)) + '</option>').join('') + '</select></div>' +
      '<button class="df-btn" style="margin-top:16px" data-act="profile-save">' + esc(t('save')) + '</button></div>' +

      '<div class="df-card" style="margin-top:16px"><h2 class="df-section" style="margin-bottom:14px">' + esc(t('dataManagement')) + '</h2>' +
      '<div class="df-row"><div class="df-row-main"><div class="df-row-title">' + esc(t('exportData')) + '</div><div class="df-row-sub">' + esc(t('exportDesc')) + '</div></div>' +
      '<button class="df-btn secondary sm" data-act="export">' + ico('icon-download') + '</button></div>' +
      '<div class="df-row"><div class="df-row-main"><div class="df-row-title">' + esc(t('importData')) + '</div><div class="df-row-sub">' + esc(t('importDesc')) + '</div></div>' +
      '<button class="df-btn secondary sm" data-act="import">' + ico('icon-upload') + '</button></div>' +
      '<div class="df-row"><div class="df-row-main"><div class="df-row-title">' + esc(t('resetDemo')) + '</div><div class="df-row-sub">' + esc(t('resetDesc')) + '</div></div>' +
      '<button class="df-btn secondary sm" data-act="reset-demo">' + esc(t('reset')) + '</button></div>' +
      '<div class="df-row"><div class="df-row-main"><div class="df-row-title">' + esc(t('restartOnboarding')) + '</div></div>' +
      '<button class="df-btn secondary sm" data-act="onb-start">' + esc(t('start')) + '</button></div>' +
      '<div class="df-row"><div class="df-row-main"><div class="df-row-title">' + esc(t('restartTutorial')) + '</div></div>' +
      '<button class="df-btn secondary sm" data-act="tutorial">' + esc(t('start')) + '</button></div>' +
      '<input type="file" id="dfImportFile" accept="application/json,.json" style="display:none">' +
      '</div>';
  };
  AFTER.settings = function () {
    const f = $('#dfImportFile');
    if (f) f.addEventListener('change', handleImport);
  };

  /* ---------------- export / import ---------------- */
  const EXPORT_KEYS = ['dfProfile', 'dfTasks', 'dfGoals', 'dfSessions', 'dfBlocks', 'idleHabits', 'idleTasksV4',
    'idleGoals', 'idleCountdowns', 'idlePomodoroSettings', 'idlePomodoroStats', 'idleQuickLinks',
    'idleTheme', 'idleMode', 'idleLang', 'idleTitle', 'idleClockFace', 'idleClockSize'];
  function doExport() {
    const payload = { app: 'DayFlow', version: 1, exportedAt: new Date().toISOString(), data: {} };
    EXPORT_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) payload.data[k] = v; });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dayflow-export-' + dayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('exported'));
  }
  function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      let parsed;
      try { parsed = JSON.parse(reader.result); } catch (err) { parsed = null; }
      // Validate shape before touching anything - a bad file must not corrupt real data.
      if (!parsed || parsed.app !== 'DayFlow' || !parsed.data || typeof parsed.data !== 'object') {
        if (typeof customAlert === 'function') await customAlert(t('importBad')); else alert(t('importBad'));
        e.target.value = ''; return;
      }
      Object.keys(parsed.data).forEach(k => {
        if (EXPORT_KEYS.indexOf(k) === -1) return;         // ignore unknown keys
        if (typeof parsed.data[k] !== 'string') return;
        localStorage.setItem(k, parsed.data[k]);
      });
      e.target.value = '';
      toast(t('imported'));
      setTimeout(() => location.reload(), 600);
    };
    reader.readAsText(file);
  }

  /* ---------------- onboarding ---------------- */
  const HABIT_CHOICES = [
    { id: 'move', icon: 'icon-activity', en: 'Move for 20 minutes', ar: 'تحرّك ٢٠ دقيقة' },
    { id: 'read', icon: 'icon-book', en: 'Read before bed', ar: 'اقرأ قبل النوم' },
    { id: 'plan', icon: 'icon-clipboard-list', en: 'Plan tomorrow', ar: 'خطّط للغد' },
    { id: 'water', icon: 'icon-droplet', en: 'Drink more water', ar: 'اشرب ماءً أكثر' },
    { id: 'walk', icon: 'icon-compass', en: 'Get outside once a day', ar: 'اخرج مرة يومياً' }
  ];
  DF.onb = { step: 0, name: '', goal: '', ws: 9, we: 17, energy: 'morning', habits: [] };

  function onbStart() {
    DF.onb = { step: 0, name: DF.state.profile.name || '', goal: '', ws: DF.state.profile.workStart || 9, we: DF.state.profile.workEnd || 17, energy: DF.state.profile.energy || 'morning', habits: [] };
    $('#dfOnb').classList.add('active');
    onbRender();
  }
  function onbEnd(applied) {
    $('#dfOnb').classList.remove('active');
    DF.state.profile.onboarded = true;
    save('profile');
    if (applied) { go('today'); } else if (DF.view !== 'ambient') render(DF.view);
  }
  function onbRender() {
    const o = DF.onb, box = $('#dfOnb');
    const steps = 6;
    let q = '', help = '', body = '', canNext = true;
    if (o.step === 0) {
      q = t('onbWelcomeT'); help = t('onbWelcomeB');
    } else if (o.step === 1) {
      q = t('onbNameT'); help = t('onbNameB');
      body = '<input class="df-input" id="dfOName" value="' + esc(o.name) + '" style="margin-top:24px" placeholder="' + esc(t('yourName')) + '">';
    } else if (o.step === 2) {
      q = t('onbGoalT'); help = t('onbGoalB');
      body = '<input class="df-input" id="dfOGoal" value="' + esc(o.goal) + '" style="margin-top:24px" placeholder="' + esc(t('goalTitle')) + '">';
    } else if (o.step === 3) {
      q = t('onbHoursT'); help = t('onbHoursB');
      body = '<div style="display:flex;gap:12px;margin-top:24px">' +
        '<div style="flex:1"><label class="df-label">' + esc(t('startTime')) + '</label><input class="df-input" id="dfOWs" type="number" min="0" max="23" value="' + o.ws + '"></div>' +
        '<div style="flex:1"><label class="df-label">' + esc(t('endTime')) + '</label><input class="df-input" id="dfOWe" type="number" min="1" max="24" value="' + o.we + '"></div></div>';
    } else if (o.step === 4) {
      q = t('onbEnergyT'); help = t('onbEnergyB');
      body = '<div class="df-onb-opts">' + ['morning', 'afternoon', 'evening', 'varies'].map(v =>
        '<button class="df-opt' + (o.energy === v ? ' sel' : '') + '" data-onb="energy" data-v="' + v + '">' + ico('icon-sun') +
        '<span>' + esc(t(v)) + '</span><span class="df-opt-check">' + ico('icon-check') + '</span></button>').join('') + '</div>';
    } else if (o.step === 5) {
      q = t('onbHabitsT'); help = t('onbHabitsB');
      body = '<div class="df-onb-opts">' + HABIT_CHOICES.map(h =>
        '<button class="df-opt' + (o.habits.indexOf(h.id) > -1 ? ' sel' : '') + '" data-onb="habit" data-v="' + h.id + '">' + ico(h.icon) +
        '<span>' + esc(L() === 'ar' ? h.ar : h.en) + '</span><span class="df-opt-check">' + ico('icon-check') + '</span></button>').join('') + '</div>';
    } else {
      // payoff screen
      const created = [];
      if (o.goal) created.push('1 ' + t('createdGoal'));
      if (o.habits.length) created.push(o.habits.length + ' ' + t('createdHabits'));
      created.push('3 ' + t('createdTasks'));
      box.innerHTML =
        '<div class="df-onb-bar"><i style="width:100%"></i></div>' +
        '<div class="df-onb-top"><span></span></div>' +
        '<div class="df-onb-body"><div class="df-onb-q">' + esc(t('onbDoneT')) + '</div>' +
        '<p class="df-onb-help">' + esc(t('onbDoneB')) + '</p>' +
        '<div class="df-onb-opts">' + created.map(c => '<div class="df-opt sel" style="cursor:default">' + ico('icon-check') + '<span>' + esc(c) + '</span></div>').join('') + '</div>' +
        '<div class="df-onb-foot"><button class="df-btn" data-onb="apply">' + esc(t('getStarted')) + '</button></div></div>';
      return;
    }
    box.innerHTML =
      '<div class="df-onb-bar"><i style="width:' + Math.round((o.step / steps) * 100) + '%"></i></div>' +
      '<div class="df-onb-top">' +
      (o.step > 0 ? '<button class="df-btn ghost sm" data-onb="back">' + esc(t('back')) + '</button>' : '<span></span>') +
      '<button class="df-btn ghost sm" data-onb="skip">' + esc(t('skip')) + '</button></div>' +
      '<div class="df-onb-body"><div class="df-onb-q">' + esc(q) + '</div>' +
      '<p class="df-onb-help">' + esc(help) + '</p>' + body +
      '<div class="df-onb-foot"><button class="df-btn" data-onb="next">' + esc(o.step === 0 ? t('getStarted') : (o.step === 5 ? t('finish') : t('next'))) + '</button></div></div>';
    setTimeout(() => { const i = box.querySelector('input'); if (i) i.focus(); }, 80);
  }
  function onbCapture() {
    const o = DF.onb;
    if (o.step === 1 && $('#dfOName')) o.name = $('#dfOName').value.trim();
    if (o.step === 2 && $('#dfOGoal')) o.goal = $('#dfOGoal').value.trim();
    if (o.step === 3) { if ($('#dfOWs')) o.ws = parseInt($('#dfOWs').value, 10) || 9; if ($('#dfOWe')) o.we = parseInt($('#dfOWe').value, 10) || 17; }
  }
  function onbApply() {
    const o = DF.onb;
    DF.state.profile = { name: o.name, primaryGoal: o.goal, workStart: o.ws, workEnd: o.we, energy: o.energy, onboarded: true };
    save('profile');
    if (o.goal) {
      DF.state.goals = DF.state.goals || [];
      DF.state.goals.unshift({
        id: uid(), title: o.goal, description: '', category: 'deep',
        targetDate: dayKey(addDays(new Date(), 60)), status: 'active',
        milestones: [{ id: uid(), title: (L() === 'ar' ? 'حدّد الخطوة الأولى' : 'Define the first step'), done: false }]
      });
      save('goals');
    }
    if (o.habits.length) {
      DF.state.habits = DF.state.habits || [];
      o.habits.forEach(hid => {
        const c = HABIT_CHOICES.find(x => x.id === hid);
        if (!c) return;
        const name = L() === 'ar' ? c.ar : c.en;
        if (DF.state.habits.some(h => h.name === name)) return;
        DF.state.habits.push({ id: uid(), name, icon: c.icon.replace('icon-', ''), freq: 'daily', days: [0, 1, 2, 3, 4, 5, 6], history: {} });
      });
      save('habits');
    }
    // Starter tasks anchored to the stated working hours.
    DF.state.tasks = DF.state.tasks || [];
    const starter = L() === 'ar'
      ? ['راجع خطة اليوم', 'اختر أهم مهمة', 'خطّط للغد']
      : ['Review the plan for today', 'Pick the one thing that matters most', 'Plan tomorrow'];
    starter.forEach((s, i) => DF.state.tasks.push({
      id: uid(), title: s, status: 'today', priority: i === 1 ? 'high' : 'med',
      category: 'deep', due: String(clamp(o.ws + i, 0, 23)).padStart(2, '0') + ':00', notes: '', createdAt: Date.now()
    }));
    save('tasks');
  }

  /* ---------------- global event delegation ---------------- */
  document.addEventListener('click', function (e) {
    const onb = e.target.closest('[data-onb]');
    if (onb) {
      const a = onb.dataset.onb, o = DF.onb;
      if (a === 'next') { onbCapture(); o.step++; onbRender(); }
      else if (a === 'back') { onbCapture(); o.step--; onbRender(); }
      else if (a === 'skip') { onbEnd(false); }
      // Toggle selection in place rather than re-rendering the step. A full re-render
      // replaces every option node, which drops keyboard focus and makes a second
      // click land on a detached element.
      else if (a === 'energy') {
        o.energy = onb.dataset.v;
        document.querySelectorAll('[data-onb="energy"]').forEach(b => b.classList.toggle('sel', b.dataset.v === o.energy));
      }
      else if (a === 'habit') {
        const i = o.habits.indexOf(onb.dataset.v);
        if (i > -1) o.habits.splice(i, 1); else o.habits.push(onb.dataset.v);
        onb.classList.toggle('sel', o.habits.indexOf(onb.dataset.v) > -1);
      }
      else if (a === 'apply') { onbApply(); onbEnd(true); }
      return;
    }

    const nav = e.target.closest('[data-nav]');
    if (nav) {
      // Also covers the entries inside the mobile "More" sheet, which must dismiss it.
      if ($('#dfModal') && $('#dfModal').classList.contains('active')) closeModal();
      go(nav.dataset.nav);
      return;
    }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;

    if (act === 'more') {
      openModal(t('more'), '<div class="df-onb-opts">' + NAV.filter(n => !n.primary).map(n =>
        '<button class="df-opt" data-nav="' + n.id + '">' + ico(n.icon) + '<span>' + esc(t(n.id)) + '</span></button>').join('') + '</div>');
      return;
    }
    if (act === 'modal-close') { closeModal(); return; }
    if (act === 'modal-save') { if (!modalOnSave || modalOnSave() !== false) { closeModal(); render(DF.view); toast(t('saved')); } return; }
    if (act === 'go') { go(el.dataset.view); return; }

    if (act === 'task-new') { taskModal(null); return; }
    if (act === 'task-open') { taskModal(id); return; }
    if (act === 'task-toggle') {
      const x = (DF.state.tasks || []).find(a => a.id === id);
      if (x) { setTaskStatus(id, x.status === 'done' ? 'today' : 'done'); }
      return;
    }
    if (act === 'task-del') {
      const x = (DF.state.tasks || []).find(a => a.id === id);
      confirmThen(t('deleteConfirm', { n: x ? x.title : '' }), () => {
        DF.state.tasks = DF.state.tasks.filter(a => a.id !== id); save('tasks'); closeModal(); render(DF.view);
      });
      return;
    }
    if (act === 'tview') { DF.taskFilter.view = el.dataset.v; render('tasks'); return; }
    if (act === 'tclear') { DF.taskFilter = { q: '', prio: '', cat: '', status: '', due: '', view: DF.taskFilter.view }; render('tasks'); return; }

    if (act === 'habit-new') { habitModal(); return; }
    if (act === 'habit-open') { habitDetail(id); return; }
    if (act === 'habit-del') {
      const h = (DF.state.habits || []).find(a => a.id === id);
      confirmThen(t('deleteConfirm', { n: h ? h.name : '' }), () => {
        DF.state.habits = DF.state.habits.filter(a => a.id !== id); save('habits'); closeModal(); render(DF.view);
      });
      return;
    }
    if (act === 'habit-toggle' || act === 'habit-cell') {
      const h = (DF.state.habits || []).find(a => a.id === id);
      if (!h) return;
      const k = el.dataset.k || dayKey();
      if (h.history[k]) delete h.history[k]; else h.history[k] = true;
      save('habits'); render(DF.view);
      return;
    }

    if (act === 'goal-new') { goalModal(); return; }
    if (act === 'goal-open') { goalDetail(id); return; }
    if (act === 'goal-status') {
      const g = (DF.state.goals || []).find(a => a.id === id);
      if (g) { g.status = el.dataset.s; save('goals'); closeModal(); render(DF.view); toast(t('saved')); }
      return;
    }
    if (act === 'goal-del') {
      const g = (DF.state.goals || []).find(a => a.id === id);
      confirmThen(t('deleteConfirm', { n: g ? g.title : '' }), () => {
        DF.state.goals = DF.state.goals.filter(a => a.id !== id); save('goals'); closeModal(); render(DF.view);
      });
      return;
    }
    if (act === 'ms-toggle') {
      const g = (DF.state.goals || []).find(a => a.id === id);
      const m = g && g.milestones.find(x => x.id === el.dataset.m);
      if (m) { m.done = !m.done; save('goals'); goalDetail(id); }
      return;
    }
    if (act === 'ms-add') {
      const g = (DF.state.goals || []).find(a => a.id === id);
      const inp = $('#dfMsNew');
      if (g && inp && inp.value.trim()) { g.milestones.push({ id: uid(), title: inp.value.trim(), done: false }); save('goals'); goalDetail(id); }
      return;
    }
    if (act === 'ms-del') {
      const g = (DF.state.goals || []).find(a => a.id === id);
      if (g) { g.milestones = g.milestones.filter(x => x.id !== el.dataset.m); save('goals'); goalDetail(id); }
      return;
    }

    if (act === 'wk') { const d = parseInt(el.dataset.d, 10); DF.weekOffset = d === 0 ? 0 : DF.weekOffset + d; render('planner'); return; }
    if (act === 'pday') { DF.plannerDay = parseInt(el.dataset.d, 10); render('planner'); return; }
    if (act === 'block-new') { blockModal(null, parseInt(el.dataset.day, 10)); return; }
    if (act === 'block-open') { e.stopPropagation(); blockModal(id); return; }
    if (act === 'block-del') {
      confirmThen(t('deleteConfirm', { n: '' }), () => {
        DF.state.blocks = DF.state.blocks.filter(a => a.id !== id); save('blocks'); closeModal(); render(DF.view);
      });
      return;
    }

    if (act === 'fpreset') {
      const f = DF.focus;
      if (f.running) return;
      f.preset = parseInt(el.dataset.p, 10); f.remaining = f.preset * 60; render('focus');
      return;
    }
    if (act === 'fstart') {
      const f = DF.focus;
      if (f.running) { f.running = false; clearInterval(f.tick); f.tick = null; }
      else { f.running = true; if (!f.startedAt) f.startedAt = Date.now(); f.tick = setInterval(focusTick, 1000); }
      render('focus');
      return;
    }
    if (act === 'freset') {
      const f = DF.focus;
      f.running = false; clearInterval(f.tick); f.tick = null; f.remaining = f.preset * 60; f.startedAt = null;
      document.body.classList.remove('df-zen');
      render('focus');
      return;
    }
    if (act === 'fzen') { document.body.classList.toggle('df-zen'); return; }

    if (act === 'range') { DF.range = parseInt(el.dataset.n, 10); render('analytics'); return; }

    if (act === 'theme') {
      const m = el.dataset.m;
      if (m === 'system') {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        localStorage.setItem('idleMode', 'system');
        document.body.classList.toggle('light-mode', prefersLight);
      } else {
        localStorage.setItem('idleMode', m);
        document.body.classList.toggle('light-mode', m === 'light');
      }
      render('settings');
      return;
    }
    if (act === 'profile-save') {
      const p = DF.state.profile;
      p.name = $('#dfPName').value.trim();
      p.workStart = clamp(parseInt($('#dfPStart').value, 10) || 9, 0, 23);
      p.workEnd = clamp(parseInt($('#dfPEnd').value, 10) || 17, 1, 24);
      p.energy = $('#dfPEnergy').value;
      save('profile'); toast(t('saved'));
      return;
    }
    if (act === 'export') { doExport(); return; }
    if (act === 'import') { const f = $('#dfImportFile'); if (f) f.click(); return; }
    if (act === 'reset-demo') {
      confirmThen(t('resetConfirm'), () => { seed(true); render(DF.view); toast(t('saved')); });
      return;
    }
    if (act === 'onb-start') { onbStart(); return; }
    if (act === 'tutorial') { go('ambient'); if (typeof startTutorial === 'function') setTimeout(() => startTutorial(true), 300); return; }
  });

  // Enter/Space activation for the div-based rows that act as buttons.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if ($('#dfModal') && $('#dfModal').classList.contains('active')) { closeModal(); return; }
      if (document.body.classList.contains('df-zen')) { document.body.classList.remove('df-zen'); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-act][role="button"]')) {
      e.preventDefault();
      e.target.closest('[data-act][role="button"]').click();
    }
  });

  function confirmThen(msg, fn) {
    if (typeof customConfirm === 'function') {
      customConfirm(msg, null, true).then(ok => { if (ok) fn(); });
    } else if (confirm(msg)) fn();
  }

  /* ---------------- init ---------------- */
  function init() {
    load();
    normaliseHabits();
    seed(false);
    buildShell();
    const saved = localStorage.getItem(KEYS.view);
    if (saved && NAV.some(n => n.id === saved)) DF.view = saved;
    go(DF.view);
    if (!DF.state.profile.onboarded) setTimeout(onbStart, 400);
    // Re-render on language change so RTL and translated strings apply everywhere.
    DF.onLangChange = function () { renderNav(); if (DF.view !== 'ambient') render(DF.view); };
    window.addEventListener('resize', function () {
      clearTimeout(DF._rz);
      DF._rz = setTimeout(() => { if (DF.view === 'planner') render('planner'); }, 250);
    });
    DF.ready = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

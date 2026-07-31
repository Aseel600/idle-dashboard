/* ==========================================
   Ambient OS — Standalone Sign In / Sign Up page
   Same-origin as index.html, backed by Supabase Auth (see supabase-client.js).
   Self-contained on purpose: does not load script.js, since that file assumes
   the full dashboard DOM exists. A successful login/signup here establishes a
   real Supabase session (persisted by supabase-js), so index.html picks it up
   automatically on the next load.
   ========================================== */

const T = {
  en: {
    acctLogin: "Log In", acctSignup: "Sign Up", acctName: "Name", acctEmail: "Email",
    acctPassword: "Password", acctConfirmPassword: "Confirm Password",
    acctDobOptional: "Date of Birth (optional)", acctDobCalendarHijri: "Hijri Calendar",
    acctLoginBtn: "Log In", acctSignupBtn: "Sign Up",
    acctEmailVerifyNote: "We'll email you a confirmation link before your account is active.",
    acctFillRequired: "Please fill in all required fields.",
    acctPasswordMismatch: "Passwords do not match.",
    acctPasswordTooShort: "Password must be at least 6 characters.",
    acctCheckEmail: "Account created! Check your email to confirm it, then log in.",
    authRedirecting: "Success! Taking you to the dashboard...",
    authTagline: "Sign in to sync tasks, countdowns, and settings across your devices",
    authBackToDashboard: "← Back to dashboard"
  },
  ar: {
    acctLogin: "تسجيل الدخول", acctSignup: "إنشاء حساب", acctName: "الاسم", acctEmail: "البريد الإلكتروني",
    acctPassword: "كلمة المرور", acctConfirmPassword: "تأكيد كلمة المرور",
    acctDobOptional: "تاريخ الميلاد (اختياري)", acctDobCalendarHijri: "التقويم الهجري",
    acctLoginBtn: "تسجيل الدخول", acctSignupBtn: "إنشاء حساب",
    acctEmailVerifyNote: "سنرسل لك رابط تأكيد عبر البريد الإلكتروني قبل تفعيل حسابك.",
    acctFillRequired: "الرجاء تعبئة جميع الحقول المطلوبة.",
    acctPasswordMismatch: "كلمتا المرور غير متطابقتين.",
    acctPasswordTooShort: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    acctCheckEmail: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيده، ثم سجّل الدخول.",
    authRedirecting: "تم بنجاح! جارٍ نقلك إلى لوحة التحكم...",
    authTagline: "سجّل الدخول لمزامنة المهام والعدّادات والإعدادات عبر أجهزتك",
    authBackToDashboard: "← العودة إلى لوحة التحكم"
  }
};
const lang = localStorage.getItem('idleLang') || 'en';

function applyAuthPageChrome() {
  document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (T[lang][key]) el.textContent = T[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (T[lang][key]) el.placeholder = T[lang][key];
  });

  const themes = {
    blue: { handle: "#00c6ff" }, pink: { handle: "#ff758c" }, white: { handle: "#ffffff" },
    red: { handle: "#ff0844" }, purple: { handle: "#8E2DE2" }, green: { handle: "#0ba360" }, orange: { handle: "#f12711" }
  };
  const theme = themes[localStorage.getItem('idleTheme')] || themes.blue;
  document.documentElement.style.setProperty('--accent', theme.handle);
  document.documentElement.style.setProperty('--accent-contrast', getContrastColor(theme.handle));
  if ((localStorage.getItem('idleMode') || 'dark') === 'light') document.body.classList.add('light-mode');

  const lastEmail = localStorage.getItem('idleLastAccountEmail');
  if (lastEmail) document.getElementById('loginEmail').value = lastEmail;
}
function getContrastColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
  return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6 ? '#111111' : '#ffffff';
}

/* Minimal custom dialog system (alert/confirm/prompt replacement) */
let dialogResolver = null;
function showDialog({ title, message, showCancel = true, showInput = false, defaultValue = '' }) {
  return new Promise(resolve => {
    dialogResolver = resolve;
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogMessage').textContent = message;
    const input = document.getElementById('dialogPromptInput');
    input.style.display = showInput ? 'block' : 'none';
    input.value = defaultValue;
    document.getElementById('dialogCancelBtn').style.display = showCancel ? 'block' : 'none';
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
  resolver(wasInput ? (confirmed ? input.value : null) : confirmed);
}
async function customAlert(message) { await showDialog({ title: lang === 'en' ? 'Notice' : 'تنبيه', message, showCancel: false }); }
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('customDialogModal').classList.contains('active')) resolveDialog(false);
});
document.getElementById('dialogPromptInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') resolveDialog(true); });

/* Account tabs + signup/login via Supabase Auth (mirrors script.js's account system) */
function setAccountTab(tab) {
  document.getElementById('acctTabLoginBtn').classList.toggle('active', tab === 'login');
  document.getElementById('acctTabSignupBtn').classList.toggle('active', tab === 'signup');
  document.getElementById('acctLoginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('acctSignupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

let authSubmitInProgress = false;
async function submitSignup() {
  if (authSubmitInProgress) return;
  authSubmitInProgress = true;
  try {
    await submitSignupInner();
  } finally {
    authSubmitInProgress = false;
  }
}
async function submitSignupInner() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirmPw = document.getElementById('signupPasswordConfirm').value;
  const dob = document.getElementById('signupDob').value;
  const dobIsHijri = document.getElementById('signupDobIsHijri').checked;

  if (!name || !email || !password) { await customAlert(T[lang].acctFillRequired); return; }
  if (password !== confirmPw) { await customAlert(T[lang].acctPasswordMismatch); return; }
  if (password.length < 6) { await customAlert(T[lang].acctPasswordTooShort); return; }

  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options: { data: { name, dob, dob_is_hijri: dobIsHijri } }
  });
  if (error) { await customAlert(error.message); return; }
  localStorage.setItem('idleLastAccountEmail', email);
  if (data.session) {
    await finishAuthAndRedirect();
  } else {
    await customAlert(T[lang].acctCheckEmail);
    setAccountTab('login');
  }
}

async function submitLogin() {
  if (authSubmitInProgress) return;
  authSubmitInProgress = true;
  try {
    await submitLoginInner();
  } finally {
    authSubmitInProgress = false;
  }
}
async function submitLoginInner() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { await customAlert(T[lang].acctFillRequired); return; }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { await customAlert(error.message); return; }
  localStorage.setItem('idleLastAccountEmail', email);
  await finishAuthAndRedirect();
}

async function finishAuthAndRedirect() {
  await customAlert(T[lang].authRedirecting);
  window.location.href = 'index.html';
}

applyAuthPageChrome();

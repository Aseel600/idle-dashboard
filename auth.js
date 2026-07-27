/* ==========================================
   Ambient OS — Standalone Sign In / Sign Up page
   Same-origin as index.html, so it shares localStorage (idleAccounts,
   idleTheme, idleMode, idleLang) with the main dashboard. Self-contained
   on purpose: does not load script.js, since that file assumes the full
   dashboard DOM exists.
   ========================================== */

const T = {
  en: {
    acctLogin: "Log In", acctSignup: "Sign Up", acctName: "Name", acctEmail: "Email",
    acctPassword: "Password", acctConfirmPassword: "Confirm Password",
    acctDobOptional: "Date of Birth (optional)", acctDobCalendarHijri: "Hijri Calendar",
    acctLoginBtn: "Log In", acctSignupBtn: "Sign Up",
    acctNoBackendNote: "This site has no backend or email server — verification uses a code shown directly on screen, not a real email.",
    acctFillRequired: "Please fill in all required fields.",
    acctPasswordMismatch: "Passwords do not match.",
    acctPasswordTooShort: "Password must be at least 6 characters.",
    acctEmailExists: "An account with this email already exists.",
    acctNotFound: "No account found with that email.",
    acctWrongPassword: "Incorrect password.",
    acctVerifyTitle: "Verify Your Account",
    acctVerifyMsg: "This site has no backend to send real email, so here is your verification code directly: {code}\n\nEnter it below to confirm your account.",
    acctVerifyFailed: "Verification code did not match. Signup cancelled.",
    authRedirecting: "Success! For your security your password isn't carried across pages — redirecting you to the dashboard, where you'll log in once more to unlock your profile.",
    authTagline: "Sign in to sync birthdays, routines, and settings to your profile",
    authBackToDashboard: "← Continue without signing in",
    acctLocalOnlyBadge: "Local device only — no server, no real email sent"
  },
  ar: {
    acctLogin: "تسجيل الدخول", acctSignup: "إنشاء حساب", acctName: "الاسم", acctEmail: "البريد الإلكتروني",
    acctPassword: "كلمة المرور", acctConfirmPassword: "تأكيد كلمة المرور",
    acctDobOptional: "تاريخ الميلاد (اختياري)", acctDobCalendarHijri: "التقويم الهجري",
    acctLoginBtn: "تسجيل الدخول", acctSignupBtn: "إنشاء حساب",
    acctNoBackendNote: "لا يمتلك هذا الموقع خادمًا أو بريدًا إلكترونيًا — يتم التحقق برمز يظهر مباشرة على الشاشة، وليس عبر بريد إلكتروني حقيقي.",
    acctFillRequired: "الرجاء تعبئة جميع الحقول المطلوبة.",
    acctPasswordMismatch: "كلمتا المرور غير متطابقتين.",
    acctPasswordTooShort: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    acctEmailExists: "يوجد حساب بهذا البريد الإلكتروني مسبقًا.",
    acctNotFound: "لا يوجد حساب بهذا البريد الإلكتروني.",
    acctWrongPassword: "كلمة المرور غير صحيحة.",
    acctVerifyTitle: "تحقق من حسابك",
    acctVerifyMsg: "لا يمتلك هذا الموقع خادمًا لإرسال بريد إلكتروني حقيقي، لذا إليك رمز التحقق مباشرة: {code}\n\nأدخله أدناه لتأكيد حسابك.",
    acctVerifyFailed: "رمز التحقق غير مطابق. تم إلغاء إنشاء الحساب.",
    authRedirecting: "تم بنجاح! لأمانك، لا يتم نقل كلمة مرورك بين الصفحات — سيتم تحويلك إلى لوحة التحكم حيث تسجل الدخول مرة أخرى لفتح ملفك الشخصي.",
    authTagline: "سجّل الدخول لمزامنة أعياد الميلاد والروتين والإعدادات مع ملفك الشخصي",
    authBackToDashboard: "← المتابعة بدون تسجيل الدخول",
    acctLocalOnlyBadge: "على هذا الجهاز فقط — لا يوجد خادم، ولا يُرسل بريد إلكتروني حقيقي"
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

function safeParseJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) || fallback;
  } catch (e) { return fallback; }
}
function bytesToHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}
function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }
async function pbkdf2Hash(password, saltBytes, iterations = 100000, lengthBits = 256) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, keyMaterial, lengthBits);
  return new Uint8Array(bits);
}
async function deriveAesKey(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptWithKey(key, obj) {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: bytesToHex(iv), cipher: btoa(String.fromCharCode(...new Uint8Array(cipherBuf))) };
}
async function decryptWithKey(key, ivHex, cipherB64) {
  const cipherBytes = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(ivHex) }, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(plainBuf));
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
async function customPrompt(message, defaultValue, title) { return await showDialog({ title, message, showCancel: true, showInput: true, defaultValue }); }
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('customDialogModal').classList.contains('active')) resolveDialog(false);
});
document.getElementById('dialogPromptInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') resolveDialog(true); });

/* Account tabs + signup/login (mirrors script.js, but redirects to index.html instead of rendering the dashboard UI) */
function setAccountTab(tab) {
  document.getElementById('acctTabLoginBtn').classList.toggle('active', tab === 'login');
  document.getElementById('acctTabSignupBtn').classList.toggle('active', tab === 'signup');
  document.getElementById('acctLoginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('acctSignupForm').style.display = tab === 'signup' ? 'block' : 'none';
}

async function submitSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirmPw = document.getElementById('signupPasswordConfirm').value;
  const dob = document.getElementById('signupDob').value;
  const dobIsHijri = document.getElementById('signupDobIsHijri').checked;

  if (!name || !email || !password) { await customAlert(T[lang].acctFillRequired); return; }
  if (password !== confirmPw) { await customAlert(T[lang].acctPasswordMismatch); return; }
  if (password.length < 6) { await customAlert(T[lang].acctPasswordTooShort); return; }

  const accounts = safeParseJSON('idleAccounts', []);
  if (accounts.find(a => a.email === email)) { await customAlert(T[lang].acctEmailExists); return; }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const entered = await customPrompt(T[lang].acctVerifyMsg.replace('{code}', code), '', T[lang].acctVerifyTitle);
  if (entered !== code) { await customAlert(T[lang].acctVerifyFailed); return; }

  const salt = randomBytes(16);
  const passHash = await pbkdf2Hash(password, salt);
  const profileSalt = randomBytes(16);
  const key = await deriveAesKey(password, profileSalt);
  const enc = await encryptWithKey(key, { name, dob, dobIsHijri });

  accounts.push({
    email, salt: bytesToHex(salt), passHash: bytesToHex(passHash),
    profileSalt: bytesToHex(profileSalt), profileIv: enc.iv, profileCipher: enc.cipher
  });
  localStorage.setItem('idleAccounts', JSON.stringify(accounts));
  localStorage.setItem('idleLastAccountEmail', email);
  await finishAuthAndRedirect();
}

async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { await customAlert(T[lang].acctFillRequired); return; }

  const accounts = safeParseJSON('idleAccounts', []);
  const acct = accounts.find(a => a.email === email);
  if (!acct) { await customAlert(T[lang].acctNotFound); return; }
  const hash = await pbkdf2Hash(password, hexToBytes(acct.salt));
  if (bytesToHex(hash) !== acct.passHash) { await customAlert(T[lang].acctWrongPassword); return; }

  localStorage.setItem('idleLastAccountEmail', email);
  await finishAuthAndRedirect();
}

async function finishAuthAndRedirect() {
  await customAlert(T[lang].authRedirecting);
  window.location.href = 'index.html';
}

applyAuthPageChrome();

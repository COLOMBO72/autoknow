'use client';

const COOKIE_UID = 'ak_uid';
const COOKIE_TOKEN = 'ak_token';
const COOKIE_EMAIL = 'ak_email';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Возвращает id анонимного пользователя, создавая его при первом визите.
 * ЧЕСТНО: cookie — не авторизация, просто способ не терять баланс/историю
 * между визитами до тех пор, пока человек не зарегистрируется по-настоящему.
 */
export async function ensureUserId(api) {
  const existing = getCookie(COOKIE_UID);
  if (existing) return existing;
  const user = await api.createAnonymousUser();
  setCookie(COOKIE_UID, user.id);
  return user.id;
}

export function getGuestUserId() {
  return getCookie(COOKIE_UID);
}

export function getAuthToken() {
  return getCookie(COOKIE_TOKEN);
}

export function getUserEmail() {
  return getCookie(COOKIE_EMAIL);
}

export function isLoggedIn() {
  return Boolean(getCookie(COOKIE_TOKEN));
}

/** Сохраняет результат login/register: и токен, и userId (аккаунт мог быть уже создан анонимно). */
export function persistSession({ userId, token, email }) {
  setCookie(COOKIE_UID, userId);
  setCookie(COOKIE_TOKEN, token);
  if (email) setCookie(COOKIE_EMAIL, email);
}

export function logout() {
  clearCookie(COOKIE_TOKEN);
  clearCookie(COOKIE_EMAIL);
  // COOKIE_UID намеренно не трогаем — гостевой доступ к тому же балансу
  // остаётся, просто без email/пароля до следующего входа.
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export function photoUrl(path) {
  if (!path) return null;
  return `${API_BASE}${path}`;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // тело не JSON — не критично, ниже есть запасной текст
    }
    const error = new Error(body?.message || `Бэкенд ответил ошибкой на ${path} (${res.status})`);
    error.status = res.status;
    error.code = body?.code;
    throw error;
  }
  return res.json();
}

export const api = {
  createAnonymousUser: () => request('/users/anonymous', { method: 'POST' }),
  getUser: (id) => request(`/users/${id}`),
  getUserReports: (id) => request(`/users/${id}/reports`),
  getUserComparisons: (id) => request(`/users/${id}/comparisons`),
  getUserTransactions: (id) => request(`/users/${id}/transactions`),
  getBrands: () => request('/catalog/brands'),
  getKnownVariants: (brand, model) =>
    request(`/catalog/${encodeURIComponent(brand)}/${encodeURIComponent(model)}/variants`),
  purchaseReport: (userId, car) =>
    request('/reports/purchase', { method: 'POST', body: JSON.stringify({ userId, car }) }),
  previewReport: (userId, car) =>
    request('/reports/preview', { method: 'POST', body: JSON.stringify({ userId, car }) }),
  compareReports: (userId, cars) =>
    request('/reports/compare', { method: 'POST', body: JSON.stringify({ userId, cars }) }),
  topup: (userId, amountKopeks, returnPath) =>
    request('/billing/topup', { method: 'POST', body: JSON.stringify({ userId, amountKopeks, returnPath }) }),

  register: (email, password, consentGiven, existingUserId) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, consentGiven, existingUserId }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, token, newPassword) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, token, newPassword }) }),
  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  changeEmail: (token, newEmail) =>
    request('/auth/change-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newEmail }),
    }),

  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),

  getAdminStats: (token) => request('/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
  getAdminRecentPurchases: (token, limit = 50) =>
    request(`/admin/purchases/recent?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } }),
  getAdminAiHealth: (token) => request('/admin/ai-health', { headers: { Authorization: `Bearer ${token}` } }),
  getAdminFeedback: (token, limit = 50) =>
    request(`/admin/feedback?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminTopupByEmail: (token, email, amountKopeks) =>
    request('/admin/topup-by-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, amountKopeks }),
    }),
  adminSearchCarVariants: (token, q) =>
    request(`/admin/car-variants/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminGetCarVariantBlocks: (token, id) =>
    request(`/admin/car-variants/${id}/blocks`, { headers: { Authorization: `Bearer ${token}` } }),
  adminUpdateCarVariantBlock: (token, id, type, content) =>
    request(`/admin/car-variants/${id}/blocks/${type}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    }),
  adminUploadCarVariantPhoto: async (token, id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_BASE}/admin/car-variants/${id}/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // Content-Type НЕ ставим сами — браузер сам проставит с boundary для multipart
      body: formData,
    });
    if (!res.ok) throw new Error(`Не удалось загрузить фото (${res.status})`);
    return res.json();
  },
};

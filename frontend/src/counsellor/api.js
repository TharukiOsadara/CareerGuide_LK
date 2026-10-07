import { API_BASE_URL } from '../config';
import { tokenStore } from '../api/client';

const API_URL = API_BASE_URL;
export const COUNSELLOR_USER_ID = process.env.EXPO_PUBLIC_COUNSELLOR_USER_ID || '45';

async function request(path, options = {}) {
  const token = await tokenStore.get();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': COUNSELLOR_USER_ID }),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to connect to the counsellor portal');
  return payload;
}

export const counsellorApi = {
  dashboard: () => request('/api/counsellor/dashboard'),
  students: (query = '') => request(`/api/counsellor/students${query ? `?${query}` : ''}`),
  student: (studentId) => request(`/api/counsellor/students/${studentId}`),
  guidance: (studentId) => request(`/api/counsellor/students/${studentId}/guidance`),
  saveGuidance: (studentId, body, method = 'POST') => request(`/api/counsellor/students/${studentId}/guidance`, {
    method,
    body: JSON.stringify(body),
  }),
  markReviewed: (studentId) => request(`/api/counsellor/students/${studentId}/guidance/review`, { method: 'POST' }),
  settings: () => request('/api/counsellor/settings'),
  updateSettings: (body) => request('/api/counsellor/settings', { method: 'PUT', body: JSON.stringify(body) }),
};

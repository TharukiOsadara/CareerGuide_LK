import { API_BASE_URL } from '../config';
import { tokenStore } from '../api/client';

const API_URL = API_BASE_URL.replace(/\/api\/?$/, '');
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
  overview: () => request('/api/counsellor/dashboard/overview'),
  students: (query = '') => request(`/api/counsellor/students${query ? `?${query}` : ''}`),
  courses: () => request('/api/counsellor/courses'),
  student: (studentId) => request(`/api/counsellor/students/${studentId}`),
  studentProfile: (studentId) => request(`/api/counsellor/student-profiles/${studentId}`),
  updateStudentProfile: (studentId, body) => request(`/api/counsellor/student-profiles/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  deactivateStudentProfile: (studentId) => request(`/api/counsellor/student-profiles/${studentId}`, { method: 'DELETE' }),
  guidance: (studentId) => request(`/api/counsellor/students/${studentId}/guidance`),
  guidanceList: () => request('/api/counsellor/guidance'),
  guidanceRecord: (id) => request(`/api/counsellor/guidance/${id}`),
  saveGuidance: (studentId, body, method = 'POST') => request(`/api/counsellor/students/${studentId}/guidance`, {
    method,
    body: JSON.stringify(body),
  }),
  markReviewed: (studentId) => request(`/api/counsellor/students/${studentId}/guidance/review`, { method: 'POST' }),
  deleteGuidanceRecord: (id) => request(`/api/counsellor/guidance/${id}`, { method: 'DELETE' }),
  settings: () => request('/api/counsellor/settings'),
  updateSettings: (body) => request('/api/counsellor/settings', { method: 'PUT', body: JSON.stringify(body) }),
  profile: () => request('/api/counsellor/profile'),
  updateProfile: (body) => request('/api/counsellor/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/api/counsellor/profile/password', { method: 'PUT', body: JSON.stringify(body) }),
  inquiries: (query = '') => request(`/api/counsellor/inquiries${query ? `?${query}` : ''}`),
  inquiry: (id) => request(`/api/counsellor/inquiries/${id}`),
  replyInquiry: (id, replyMessage) => request(`/api/counsellor/inquiries/${id}/reply`, { method: 'PUT', body: JSON.stringify({ replyMessage }) }),
  deleteInquiryReply: (id) => request(`/api/counsellor/inquiries/${id}/reply`, { method: 'DELETE' }),
  notifications: () => request('/api/counsellor/notifications'),
  notificationDetail: (id) => request(`/api/counsellor/notifications/${id}`),
  replyToNotification: (id, replyMessage) => request(`/api/counsellor/notifications/${id}/reply`, { method: 'POST', body: JSON.stringify({ replyMessage }) }),
  editNotificationReply: (id, replyId, replyMessage) => request(`/api/counsellor/notifications/${id}/replies/${replyId}`, { method: 'PUT', body: JSON.stringify({ replyMessage }) }),
  deleteNotificationReply: (id, replyId) => request(`/api/counsellor/notifications/${id}/replies/${replyId}`, { method: 'DELETE' }),
  markNotificationRead: (id) => request(`/api/counsellor/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/counsellor/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id) => request(`/api/counsellor/notifications/${id}`, { method: 'DELETE' }),
};

import { API_BASE_URL } from '../../config';
import { tokenStore } from '../../api/client';

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
  deleteGuidance: (studentId) => request(`/api/counsellor/students/${studentId}/guidance`, { method: 'DELETE' }),
  // All guidance records written by this counsellor + assigned students without one.
  guidanceRecords: () => request('/api/counsellor/guidance'),
  settings: () => request('/api/counsellor/settings'),
  createSettings: (body) => request('/api/counsellor/settings', { method: 'POST', body: JSON.stringify(body) }),
  updateSettings: (body) => request('/api/counsellor/settings', { method: 'PUT', body: JSON.stringify(body) }),
  deleteSettings: () => request('/api/counsellor/settings', { method: 'DELETE' }),
  // Courses this counsellor guides (students choosing these courses are matched to them).
  myCourses: () => request('/api/counsellor/my-courses'),
  addCourse: (courseId) => request('/api/counsellor/my-courses', { method: 'POST', body: JSON.stringify({ courseId }) }),
  removeCourse: (courseId) => request(`/api/counsellor/my-courses/${courseId}`, { method: 'DELETE' }),
  // Student + parent questions addressed to this counsellor.
  inquiries: () => request('/api/counsellor/inquiries'),
  markParentInquiryRead: (id) => request(`/api/counsellor/inquiries/parent/${id}/read`, { method: 'POST' }),
  replyToInquiry: (type, id, reply) => request(`/api/counsellor/inquiries/${type}/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  }),
  deleteInquiry: (type, id) => request(`/api/counsellor/inquiries/${type}/${id}`, { method: 'DELETE' }),
};

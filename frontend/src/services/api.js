import { API_BASE_URL as SERVER_URL } from '../config';
import { tokenStore } from '../api/client';

// Student feature endpoints live under /api/student on the same server as the rest of the app.
const API_BASE_URL = `${SERVER_URL}/api/student`;

async function request(path, options = {}) {
  try {
    // Send the login token so the backend acts as the signed-in student.
    const token = await tokenStore.get();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    console.warn(`API request failed: ${path}`, error);
    throw error;
  }
}

function withQueryParams(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getStudentProfile(userId) {
  const query = userId ? withQueryParams({ userId }) : '';
  return request(`/student-profile${query}`);
}

export async function saveAcademicProfile(data) {
  return request('/academic-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAcademicProfile(userId = 42) {
  return request(`/academic-profile/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function getAcademicProfile(userId = 42) {
  return request(`/academic-profile/${encodeURIComponent(userId)}`);
}

export async function updateUserProfile(data) {
  return request('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUserProfile(userId = 42, fields = []) {
  return request(`/user/profile/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ fields }),
  });
}

export async function getCourses(filters = {}) {
  const payload = await request(`/courses${withQueryParams(filters)}`);
  return Array.isArray(payload) ? payload : payload?.courses || [];
}

export async function getCourseDetails(id) {
  if (!id) {
    throw new Error('A course id is required.');
  }
  return request(`/courses/${encodeURIComponent(id)}`);
}

export async function getCounsellors() {
  return request('/counsellors');
}

export async function sendInquiry(data) {
  return request('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotifications(userId = 42) {
  return request(`/notifications${withQueryParams({ userId })}`);
}

export async function markNotificationsRead(notificationIds, userId = 42) {
  return request('/notifications/mark-read', {
    method: 'PUT',
    body: JSON.stringify({ userId, notificationIds }),
  });
}

// ---- Course choice & matched counsellor (signed-in students) ----
export async function getCourseSelection() {
  const payload = await request('/course-selection');
  return payload?.selection || null;
}

export async function chooseCourse(courseId) {
  return request('/course-selection', { method: 'POST', body: JSON.stringify({ courseId }) });
}

export async function clearCourseSelection() {
  return request('/course-selection', { method: 'DELETE' });
}

// ---- Aptitude test result (shown to the student's parents and matched counsellor) ----
export async function saveAptitudeResults({ stream, scores, matches }) {
  return request('/aptitude-results', { method: 'POST', body: JSON.stringify({ stream, scores, matches }) });
}

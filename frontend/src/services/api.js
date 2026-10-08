const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/+$/, '')
  : `${configuredApiUrl.replace(/\/+$/, '')}/api`;

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

export async function getNotifications(userId = 1) {
  return request(`/notifications${withQueryParams({ userId })}`);
}

export async function markNotificationsRead(notificationIds, userId = 1) {
  return request('/notifications/mark-read', {
    method: 'PUT',
    body: JSON.stringify({ userId, notificationIds }),
  });
}

// Same server address as the rest of the app (src/config.js), so parent screens can't drift.
import { API_BASE_URL as API_URL } from '../../../config';
import { tokenStore } from '../../../api/client';

const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const token = await tokenStore.get();
  const baseUrl = API_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  let response;
  try {
    response = await fetch(`${baseUrl}/api/parent${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err.name === 'AbortError'
        ? 'The server is taking too long. Please try again.'
        : "Can't reach CareerGuide right now. Check your internet connection and try again.",
      0,
      'NETWORK'
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', response.status, data?.code);
  }
  return data;
}

const student = (id) => `/students/${id}`;

export const parentApi = {
  getChildren: () => request('GET', '/children'),

  getDashboard: (studentId) => request('GET', `${student(studentId)}/dashboard`),
  getProgress: (studentId) => request('GET', `${student(studentId)}/progress`),
  getGuidance: (studentId) => request('GET', `${student(studentId)}/guidance`),
  getReport: (studentId) => request('GET', `${student(studentId)}/report`),
  getAccessLogs: (studentId) => request('GET', `${student(studentId)}/access-logs`),

  // CRUD 1: counsellor inquiries
  listInquiries: (studentId) => request('GET', `${student(studentId)}/inquiries`),
  createInquiry: (studentId, inquiry) => request('POST', `${student(studentId)}/inquiries`, inquiry),
  updateInquiry: (inquiryId, changes) => request('PUT', `/inquiries/${inquiryId}`, changes),
  deleteInquiry: (inquiryId) => request('DELETE', `/inquiries/${inquiryId}`),

  // CRUD 2: privacy & data-sharing preferences
  getPrivacy: (studentId) => request('GET', `${student(studentId)}/privacy`),
  createPrivacy: (studentId, prefs) => request('POST', `${student(studentId)}/privacy`, prefs),
  updatePrivacy: (studentId, prefs) => request('PUT', `${student(studentId)}/privacy`, prefs),
  withdrawPrivacy: (studentId) => request('DELETE', `${student(studentId)}/privacy`),
};

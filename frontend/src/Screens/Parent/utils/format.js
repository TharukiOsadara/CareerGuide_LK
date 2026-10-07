// Plain-language labels and date formatting for the parent screens.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const TOPICS = [
  { key: 'fees', label: 'Fees' },
  { key: 'intake_dates', label: 'Intake dates' },
  { key: 'course_choice', label: 'Course choice' },
  { key: 'other', label: 'Other' },
];

export const topicLabel = (key) => TOPICS.find((t) => t.key === key)?.label || 'Other';

export const INQUIRY_STATUS = {
  sent: { label: 'Waiting for reply', tone: 'info' },
  read: { label: 'Read by counsellor', tone: 'warn' },
  answered: { label: 'Answered', tone: 'success' },
};

export const ASSESSMENT_STATUS = {
  completed: { label: 'Quiz completed', tone: 'success' },
  in_progress: { label: 'Quiz in progress', tone: 'warn' },
  not_started: { label: 'Quiz not started', tone: 'neutral' },
};

const onOff = (v) => (v ? 'on' : 'off');

export function describeAccessLog(log) {
  const d = log.details || {};
  switch (log.action) {
    case 'report_downloaded':
      return { title: 'Progress report downloaded' };
    case 'privacy_created':
    case 'privacy_updated':
      return {
        title: log.action === 'privacy_created' ? 'Privacy choices saved' : 'Privacy choices changed',
        detail: `Counsellor access ${onOff(d.counsellorAccess)} · Progress view ${onOff(d.parentMonitoring)} · University sharing ${onOff(d.researchShare)}`,
      };
    case 'privacy_withdrawn':
      return { title: 'Consent withdrawn and shared data erased' };
    case 'inquiry_created':
      return { title: 'Question sent to counsellor' };
    case 'inquiry_updated':
      return { title: 'Question edited' };
    case 'inquiry_deleted':
      return { title: 'Question withdrawn' };
    default:
      return { title: log.action };
  }
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function time(d) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(value) {
  const d = toDate(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d ? `${formatDate(d)}, ${time(d)}` : '';
}

// "Today, 4:15 PM" / "Yesterday, 4:15 PM" / "4 Oct 2026, 4:15 PM"
export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return '';
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 0) return `Today, ${time(d)}`;
  if (days === 1) return `Yesterday, ${time(d)}`;
  return formatDateTime(d);
}

export const formatZ = (z) => (z === null || z === undefined ? '—' : Number(z).toFixed(4));

export const firstName = (fullName = '') => fullName.trim().split(/\s+/)[0] || fullName;

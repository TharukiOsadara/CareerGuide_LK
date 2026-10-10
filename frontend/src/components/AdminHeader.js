import React from 'react';
import StudentHeader from './StudentHeader';

// Admin top bar: the same header as the student dashboard (brand, bell, avatar),
// with the bell opening admin notifications and the avatar opening the admin profile.
// The admin bell opens the admins' own notifications, with a shortcut to compose one.
const ADMIN_INBOX = {
  shortcut: { label: 'Send a notification', hint: 'To all users, or to one role', route: 'AdminNotifications' },
};

export default function AdminHeader({ navigation, user }) {
  return (
    <StudentHeader
      navigation={navigation}
      user={user}
      notificationsRoute="StudentNotifications"
      notificationsParams={ADMIN_INBOX}
      profileRoute="AdminProfile"
      showUnread={false}
    />
  );
}

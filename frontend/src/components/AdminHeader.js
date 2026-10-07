import React from 'react';
import StudentHeader from './StudentHeader';

// Admin top bar: the same header as the student dashboard (brand, bell, avatar),
// with the bell opening admin notifications and the avatar opening the admin profile.
export default function AdminHeader({ navigation, user }) {
  return (
    <StudentHeader
      navigation={navigation}
      user={user}
      notificationsRoute="AdminNotifications"
      profileRoute="AdminProfile"
      showUnread={false}
    />
  );
}

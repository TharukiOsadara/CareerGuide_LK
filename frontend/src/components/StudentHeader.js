import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Brand from './Brand';
import { api } from '../api/client';
import { colors } from '../styles/colors';
import Icon from './Icon';

// Reusable white top bar for the student area: brand on the left, a notification
// bell (with an unread red dot) and the user's avatar on the right.
export default function StudentHeader({ navigation, user }) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const { unread } = await api('/api/notifications/unread-count');
        if (mounted) setHasUnread(!!unread);
      } catch {
        if (mounted) setHasUnread(false);
      }
    };
    loadUnread();
    const unsubscribe = navigation?.addListener?.('focus', loadUnread);
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.bar}>
      <Brand size="sm" />
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          onPress={() => navigation.navigate('StudentNotifications')}
          style={({ pressed }) => [styles.bellWrap, pressed && styles.pressed]}
        >
          <Icon name="bell" size={20} color={colors.slateDark} />
          {hasUnread && <View style={styles.dot} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => navigation.navigate('StudentProfile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          {user?.avatarInitials ? <Text style={styles.avatarText}>{user.avatarInitials}</Text> : <Icon name="user" size={15} color={colors.blue} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  right: { flexDirection: 'row', alignItems: 'center' },
  bellWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

// Shared admin header: avatar tile + brand/title on the left, bell on the right.
export default function AdminHeader({ navigation, user, title }) {
  const initials = (user && user.avatarInitials) || '🎓';
  const firstName = user && user.fullName ? user.fullName.split(' ')[0] : 'Admin';

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open admin profile"
        onPress={() => navigation.navigate('AdminProfile')}
        style={({ pressed }) => [styles.left, pressed && styles.pressed]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'CareerGuide Admin'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>Admin: {firstName}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={10}
        onPress={() => navigation.navigate('AdminNotifications')}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      >
        <Text style={styles.bellIcon}>🔔</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1.5, borderBottomColor: colors.blue,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 38, height: 38, borderRadius: 9, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  titleWrap: { flex: 1 },
  title: { color: colors.blue, fontSize: 15, fontWeight: '800' },
  sub: { color: colors.slate, fontSize: 10.5, marginTop: 1 },
  bell: {
    width: 38, height: 38, borderRadius: 9, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  bellIcon: { fontSize: 18 },
  pressed: { opacity: 0.7 },
});

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Brand from './Brand';
import { api } from '../api/client';
import { colors } from '../styles/colors';
import Icon from './Icon';
import { DeleteAccountDialog } from './DeleteAccount';
import { useAuth } from '../context/AuthContext';

// Reusable white top bar (student and admin areas): brand on the left, a notification
// bell (with an unread red dot) and the user's avatar on the right. With a `profileRoute`
// the avatar opens that page (admin); without one it opens an account menu with
// Sign Out and Delete Account (student).
export default function StudentHeader({
  navigation, user,
  notificationsRoute = 'StudentNotifications',
  notificationsParams,
  profileRoute,
  showUnread = true,
}) {
  const [hasUnread, setHasUnread] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const leaveTo = (routeName) => navigation.reset({ index: 0, routes: [{ name: routeName }] });

  const doSignOut = async () => {
    setMenuOpen(false);
    try { await signOut(); } catch {}
    leaveTo('SignIn');
  };

  const openDelete = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

  useEffect(() => {
    if (!showUnread) return undefined;
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
  }, [navigation, showUnread]);

  return (
    <View style={styles.bar}>
      <Brand size="sm" />
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          onPress={() => navigation.navigate(notificationsRoute, notificationsParams)}
          style={({ pressed }) => [styles.bellWrap, pressed && styles.pressed]}
        >
          <Icon name="bell" size={20} color={colors.slateDark} />
          {hasUnread && <View style={styles.dot} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profileRoute ? 'Profile' : 'Account menu'}
          onPress={() => (profileRoute ? navigation.navigate(profileRoute) : setMenuOpen(true))}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          {user?.avatarInitials ? <Text style={styles.avatarText}>{user.avatarInitials}</Text> : <Icon name="user" size={15} color={colors.blue} />}
        </Pressable>
      </View>

      {/* Account menu (when the avatar has no profile page) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menu, { top: insets.top + 52 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.menuHead}>
              <Text style={styles.menuName} numberOfLines={1}>{user?.fullName || 'My account'}</Text>
              {user?.email ? <Text style={styles.menuEmail} numberOfLines={1}>{user.email}</Text> : null}
            </View>
            <Pressable onPress={doSignOut} style={({ pressed }) => [styles.menuBtn, styles.menuSignOut, pressed && styles.pressed]}>
              <Icon name="logout" size={17} color={colors.white} />
              <Text style={styles.menuBtnText}>Sign Out</Text>
            </Pressable>
            <Pressable onPress={openDelete} style={({ pressed }) => [styles.menuBtn, styles.menuDelete, pressed && styles.pressed]}>
              <Icon name="trash" size={17} color={colors.white} />
              <Text style={styles.menuBtnText}>Delete Account</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <DeleteAccountDialog
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => leaveTo('Onboarding')}
      />
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

  menuBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.12)' },
  menu: {
    position: 'absolute', right: 12, width: 230, backgroundColor: colors.white, borderRadius: 12,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  menuHead: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 },
  menuName: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  menuEmail: { color: colors.slate, fontSize: 11.5, marginTop: 2 },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 10, marginTop: 8, borderRadius: 9, paddingVertical: 11,
  },
  menuSignOut: { backgroundColor: colors.redStrong },
  menuDelete: { backgroundColor: colors.ink, marginBottom: 6 },
  menuBtnText: { color: colors.white, fontSize: 13.5, fontWeight: '800', marginLeft: 8 },
});

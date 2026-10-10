import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import ChildSelector from './ChildSelector';
import ParentBell from './ParentBell';
import { colors, font, space, TOUCH } from '../theme';
import BackButton from '../../../components/BackButton';
import Icon from '../../../components/Icon';

export default function ParentHeader({ title, onBack, showChild = true, right }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  // Top-level parent screens show the parent's avatar, which opens their profile.
  const avatar = !onBack && !right ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open my profile"
      hitSlop={8}
      onPress={() => navigation.navigate('ParentProfile')}
      style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
    >
      {user?.avatarInitials
        ? <Text style={styles.avatarText}>{user.avatarInitials}</Text>
        : <Icon name="user" size={18} color={colors.blue} />}
    </Pressable>
  ) : null;
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.titleRow}>
        {onBack ? (
          <BackButton onPress={onBack} style={styles.back} />
        ) : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right}
        {/* Bell for counsellor replies (only once a child is linked) */}
        {avatar && showChild ? <ParentBell /> : null}
        {avatar}
      </View>
      {showChild ? (
        <View style={styles.child}>
          <ChildSelector />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH },
  back: { minHeight: TOUCH, marginRight: space.sm },
  backText: { color: colors.navy, fontSize: 34, lineHeight: 36, marginTop: -4 },
  pressed: { opacity: 0.6 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: space.sm,
  },
  avatarText: { color: colors.blue, fontSize: font.small, fontWeight: '800' },
  title: { flex: 1, color: colors.navy, fontSize: font.title, fontWeight: '800' },
  child: { marginTop: space.sm },
});

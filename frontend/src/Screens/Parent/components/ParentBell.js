import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../Components/Icon';
import { useChild } from '../context/ChildContext';
import { parentApi } from '../services/parentApi';
import { api } from '../../../api/client';
import { colors } from '../theme';

// Notification bell for the parent portal. The badge counts counsellor replies the parent
// hasn't seen yet for the selected child plus unread CareerGuide announcements; tapping it
// opens Notifications (announcements) with a shortcut to the counsellor replies.
const seenKey = (studentId) => `cg_parent_replies_seen_${studentId}`;

export default function ParentBell() {
  const navigation = useNavigation();
  const { selectedChild, version } = useChild();
  const studentId = selectedChild?.studentId;
  const [unseen, setUnseen] = useState(0);
  const [announcements, setAnnouncements] = useState(0);

  const refresh = useCallback(async () => {
    api('/api/notifications/unread-count').then((d) => setAnnouncements(d?.unread || 0)).catch(() => {});
    if (!studentId) return;
    try {
      const [{ inquiries = [] }, seenAt] = await Promise.all([
        parentApi.listInquiries(studentId),
        AsyncStorage.getItem(seenKey(studentId)).catch(() => null),
      ]);
      const since = seenAt ? new Date(seenAt).getTime() : 0;
      setUnseen(inquiries.filter((q) => q.status === 'answered' && q.repliedAt && new Date(q.repliedAt).getTime() > since).length);
    } catch {
      setUnseen(0);
    }
  }, [studentId]);

  useEffect(() => { refresh(); }, [refresh, version]);
  useEffect(() => navigation.addListener?.('focus', refresh), [navigation, refresh]);

  const open = async () => {
    if (studentId) await AsyncStorage.setItem(seenKey(studentId), new Date().toISOString()).catch(() => {});
    const replies = unseen;
    setUnseen(0);
    navigation.navigate('StudentNotifications', {
      shortcut: {
        label: 'Counsellor replies',
        hint: replies ? `${replies} new ${replies === 1 ? 'reply' : 'replies'} to your questions` : 'See your questions and replies',
        route: 'ParentPortal',
        params: { screen: 'InquiryHistory' },
      },
    });
  };
  const total = unseen + announcements;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={total ? `Notifications, ${total} new` : 'Notifications'}
      hitSlop={8}
      onPress={open}
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
    >
      <Icon name="bell" size={21} color={colors.navy} />
      {total > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{total > 9 ? '9+' : total}</Text></View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  pressed: { opacity: 0.6 },
  badge: {
    position: 'absolute', top: 3, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
});

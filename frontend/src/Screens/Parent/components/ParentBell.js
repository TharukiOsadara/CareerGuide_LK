import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../Components/Icon';
import { useChild } from '../context/ChildContext';
import { parentApi } from '../services/parentApi';
import { colors } from '../theme';

// Notification bell for the parent portal: a badge counts counsellor replies the parent
// hasn't seen yet for the selected child; tapping it opens "Your questions" with the replies.
const seenKey = (studentId) => `cg_parent_replies_seen_${studentId}`;

export default function ParentBell() {
  const navigation = useNavigation();
  const { selectedChild, version } = useChild();
  const studentId = selectedChild?.studentId;
  const [unseen, setUnseen] = useState(0);

  const refresh = useCallback(async () => {
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
    setUnseen(0);
    navigation.navigate('InquiryHistory');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unseen ? `Counsellor replies, ${unseen} new` : 'Counsellor replies'}
      hitSlop={8}
      onPress={open}
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
    >
      <Icon name="bell" size={21} color={colors.navy} />
      {unseen > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{unseen > 9 ? '9+' : unseen}</Text></View>
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

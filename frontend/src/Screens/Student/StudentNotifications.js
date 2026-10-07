import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';

export default function StudentNotifications({ navigation }) {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // notification open in the modal

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const { notifications } = await api('/api/notifications');
      setItems(notifications || []);
    } catch (e) {
      setError(e.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openItem = async (item) => {
    setActive(item);
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      try { await api(`/api/notifications/${item.id}/read`, { method: 'POST' }); } catch {}
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await api('/api/notifications/read-all', { method: 'POST' }); } catch (e) { setError(e.message || 'Could not update.'); }
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Notifications</Text>
        {hasUnread ? (
          <Pressable
            accessibilityRole="button"
            onPress={markAll}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.markAll}>Mark all as read</Text>
          </Pressable>
        ) : <View style={{ width: 1 }} />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {error ? <View style={styles.banner}><Text style={styles.bannerText}>{error}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
        ) : items.length === 0 && !error ? (
          <View style={styles.emptyWrap}>
            <Icon name="bell" size={34} color={colors.slate400} style={styles.emptyIcon} />
            <Text style={styles.empty}>No notifications yet</Text>
          </View>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => openItem(n)}
              style={({ pressed }) => [styles.card, !n.read && styles.cardUnread, pressed && styles.pressed]}
            >
              {!n.read && <View style={styles.stripe} />}
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardText} numberOfLines={2}>{n.body}</Text>
                <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={!!active} transparent animationType="fade" onRequestClose={() => setActive(null)}>
        <Pressable style={styles.backdrop} onPress={() => setActive(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{active?.title}</Text>
            {active?.createdAt ? <Text style={styles.modalTime}>{relativeTime(active.createdAt)}</Text> : null}
            <Text style={styles.modalBody}>{active?.body}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActive(null)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, paddingHorizontal: 12, backgroundColor: colors.white,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 22, color: colors.navy },
  title: { flex: 1, color: colors.navy, fontSize: 16, fontWeight: '800', marginLeft: 4 },
  markAll: { color: colors.blue, fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 24 },

  banner: { backgroundColor: colors.redLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  bannerText: { color: colors.redStrong, fontSize: 11.5 },

  emptyWrap: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { marginBottom: 10 },
  empty: { color: colors.slate, fontSize: 13 },

  card: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, marginBottom: 10, overflow: 'hidden',
    shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardUnread: { backgroundColor: colors.blueLight },
  stripe: { width: 4, backgroundColor: colors.blue },
  cardBody: { flex: 1, padding: 13 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flex: 1, color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginLeft: 8 },
  cardText: { color: colors.slate600, fontSize: 12, lineHeight: 17, marginTop: 4 },
  time: { color: colors.slate400, fontSize: 10.5, marginTop: 6 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 18 },
  modalTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  modalTime: { color: colors.slate400, fontSize: 11, marginTop: 4 },
  modalBody: { color: colors.slateDark, fontSize: 13, lineHeight: 20, marginTop: 12 },
  closeButton: {
    marginTop: 18, height: 42, borderRadius: 9, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';

function formatDate(iso) {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(iso); }
}

export default function AdminProfile({ navigation }) {
  const { user, signOut } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!user?.isSuperAdmin) return;
    setError('');
    try {
      const { requests: list } = await api('/api/users/admin-requests');
      setRequests(list || []);
    } catch (e) { setError(e.message || 'Failed to load admin requests.'); }
  }, [user]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const act = async (id, kind) => {
    setBusy(id); setError('');
    try {
      await api(`/api/users/${id}/${kind}-admin`, { method: 'POST' });
      await loadRequests();
    } catch (e) { setError(e.message || 'Action failed.'); }
    finally { setBusy(null); }
  };

  const doSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
  };

  const initials = user && user.avatarInitials;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Admin Profile</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        <View style={styles.hero}>
          <View style={styles.avatar}>{initials ? <Text style={styles.avatarText}>{initials}</Text> : <Icon name="graduation-cap" size={34} color={colors.white} />}</View>
          <Text style={styles.name}>{user?.fullName || 'Admin'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.pills}>
            <View style={styles.pill}><Text style={styles.pillText}>ADMIN</Text></View>
            {user?.isSuperAdmin && <View style={[styles.pill, styles.pillSuper]}><Text style={styles.pillText}>SUPER ADMIN</Text></View>}
          </View>
          <Text style={styles.lastLogin}>Last login: {formatDate(user?.lastLoginAt)}</Text>
        </View>

        {user?.isSuperAdmin && (
          <>
            <Text style={styles.heading}>Admin Requests</Text>
            <View style={styles.card}>
              {requests.length === 0 ? (
                <Text style={styles.emptyLine}>No pending admin requests.</Text>
              ) : requests.map((r) => (
                <View key={r.id} style={styles.reqRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{r.fullName}</Text>
                    <Text style={styles.reqEmail}>{r.email}</Text>
                  </View>
                  <Pressable disabled={busy === r.id} onPress={() => act(r.id, 'approve')} style={({ pressed }) => [styles.approveBtn, (pressed || busy === r.id) && styles.pressed]}>
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                  <Pressable disabled={busy === r.id} onPress={() => act(r.id, 'reject')} style={({ pressed }) => [styles.rejectBtn, (pressed || busy === r.id) && styles.pressed]}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable onPress={doSignOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: colors.blue,
  },
  hBtn: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  hIcon: { fontSize: 17 },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 14.5, fontWeight: '800' },

  content: { padding: 16, paddingBottom: 24 },
  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },

  hero: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 76, height: 76, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '800' },
  name: { color: colors.navy, fontSize: 18, fontWeight: '800', marginTop: 12 },
  email: { color: colors.slate, fontSize: 12.5, marginTop: 3 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: { backgroundColor: colors.blue, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillSuper: { backgroundColor: colors.adminDark },
  pillText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  lastLogin: { color: colors.slate, fontSize: 11, marginTop: 12 },

  heading: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  emptyLine: { color: colors.slate, fontSize: 11.5, fontStyle: 'italic', paddingVertical: 14 },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  reqName: { color: colors.navy, fontSize: 12.5, fontWeight: '800' },
  reqEmail: { color: colors.slate, fontSize: 10.5, marginTop: 2 },
  approveBtn: { backgroundColor: colors.green, borderRadius: 7, paddingVertical: 7, paddingHorizontal: 12 },
  approveText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  rejectBtn: { backgroundColor: colors.redLight, borderRadius: 7, paddingVertical: 7, paddingHorizontal: 12 },
  rejectText: { color: colors.redStrong, fontSize: 11, fontWeight: '800' },

  signOut: { marginTop: 24, borderWidth: 1, borderColor: colors.red, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  signOutText: { color: colors.redStrong, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});


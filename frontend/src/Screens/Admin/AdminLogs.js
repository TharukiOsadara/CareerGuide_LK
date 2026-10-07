import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';

const ROLE_CYCLE = ['all', 'student', 'parent', 'counsellor', 'admin'];
const ACTION_CYCLE = ['all', 'login', 'failed_login', 'logout'];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function clockTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const ACTION_LABEL = { login: 'Logged in', failed_login: 'Failed login', logout: 'Logged out' };

export default function AdminLogs({ navigation }) {
  const { signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleIdx, setRoleIdx] = useState(0);
  const [actionIdx, setActionIdx] = useState(0);
  const [lockModal, setLockModal] = useState(false);
  const [locked, setLocked] = useState([]);
  const [lockErr, setLockErr] = useState('');

  const role = ROLE_CYCLE[roleIdx];
  const action = ACTION_CYCLE[actionIdx];

  const loadLogs = useCallback(async () => {
    const params = [];
    if (action !== 'all') params.push(`action=${action}`);
    if (role !== 'all') params.push(`role=${role}`);
    if (query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    try {
      const { logs: list } = await api(`/api/logs${qs}`);
      setLogs(list || []);
    } catch (e) { setError(e.message || 'Failed to load logs.'); }
  }, [action, role, query]);

  const loadStatsAndSessions = useCallback(async () => {
    setError('');
    try {
      const [s, ss] = await Promise.allSettled([
        api('/api/logs/stats'),
        api('/api/logs/sessions'),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (ss.status === 'fulfilled') setSessions(ss.value.sessions || []);
    } catch (e) { setError(e.message || 'Failed to load.'); }
  }, []);

  useEffect(() => { loadStatsAndSessions(); }, [loadStatsAndSessions]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const killSession = async (id) => {
    try {
      await api(`/api/logs/sessions/${id}/kill`, { method: 'POST' });
      await loadStatsAndSessions();
    } catch (e) { setError(e.message || 'Could not end session.'); }
  };

  const openLockModal = async () => {
    setLockModal(true); setLockErr('');
    try {
      const [l, b] = await Promise.allSettled([
        api('/api/users?status=locked'),
        api('/api/users?status=blocked'),
      ]);
      const lockedUsers = l.status === 'fulfilled' ? (l.value.users || []) : [];
      const blockedUsers = b.status === 'fulfilled' ? (b.value.users || []) : [];
      setLocked([...lockedUsers, ...blockedUsers]);
    } catch (e) { setLockErr(e.message || 'Failed to load accounts.'); }
  };

  const unlock = async (u) => {
    const path = u.status === 'blocked' ? 'unblock' : 'unlock';
    try {
      await api(`/api/users/${u.id}/${path}`, { method: 'POST' });
      await openLockModal();
      await loadStatsAndSessions();
    } catch (e) { setLockErr(e.message || 'Action failed.'); }
  };

  const doSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={({ pressed }) => [styles.hBtn, pressed && styles.pressed]}>
          <Text style={styles.hIcon}>â†</Text>
        </Pressable>
        <Text style={styles.hTitle} numberOfLines={1}>User Access & Audit Logs</Text>
        <Pressable hitSlop={10} onPress={openLockModal} style={({ pressed }) => [styles.hBtn, pressed && styles.pressed]}>
          <Text style={styles.hIcon}>ðŸ”’</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {/* Search */}
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search user or IPâ€¦"
          placeholderTextColor={colors.slate400}
          autoCapitalize="none"
        />

        {/* Filter chips */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setRoleIdx((i) => (i + 1) % ROLE_CYCLE.length)}
            style={({ pressed }) => [styles.filterChip, pressed && styles.pressed]}
          >
            <Text style={styles.filterLabel}>User Role</Text>
            <Text style={styles.filterValue}>{role}</Text>
          </Pressable>
          <Pressable
            onPress={() => setActionIdx((i) => (i + 1) % ACTION_CYCLE.length)}
            style={({ pressed }) => [styles.filterChip, pressed && styles.pressed]}
          >
            <Text style={styles.filterLabel}>Action Type</Text>
            <Text style={styles.filterValue}>{action}</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox value={stats?.activeSessions ?? 'â€”'} label="Active Sessions" note="Live" />
          <StatBox value={stats?.todayLogins ?? 'â€”'} label="Today's Logins" />
          <StatBox value={stats?.failedAttempts ?? 'â€”'} label="Failed Attempts" note="Flagged" danger />
          <StatBox value={stats?.lockedAccounts ?? 'â€”'} label="Locked" />
        </View>

        {/* Live sessions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Live Active Sessions</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyLine}>No active sessions.</Text>
          ) : sessions.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.userName}</Text>
                <Text style={styles.rowMeta}>{s.role} Â· {clockTime(s.startedAt)} Â· {s.ip || s.device || ''}</Text>
              </View>
              <Pressable onPress={() => killSession(s.id)} style={({ pressed }) => [styles.killBtn, pressed && styles.pressed]}>
                <Text style={styles.killBtnText}>Kill</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Login history */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Login History Timeline</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyLine}>No log entries match.</Text>
          ) : logs.map((l) => {
            const dot = l.action === 'login' ? colors.green : l.action === 'failed_login' ? colors.red : colors.slate;
            return (
              <View key={l.id} style={styles.logRow}>
                <View style={[styles.dot, { backgroundColor: dot }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{l.userName}</Text>
                  <Text style={styles.rowMeta}>Action: {ACTION_LABEL[l.action] || l.action} Â· {timeAgo(l.createdAt)}</Text>
                  <Text style={styles.rowSub}>{[l.device, l.ip].filter(Boolean).join(' Â· ')}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Security alerts */}
        {stats && stats.failedAttempts > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>âš ï¸ Multiple Failed Attempts</Text>
            <Text style={styles.alertBody}>
              {stats.failedAttempts} failed login attempt(s) detected. Review the timeline and lock accounts if suspicious.
            </Text>
            <Pressable onPress={openLockModal} style={({ pressed }) => [styles.alertBtn, pressed && styles.pressed]}>
              <Text style={styles.alertBtnText}>Manage Locked Accounts â†’</Text>
            </Pressable>
          </View>
        )}

        {/* Sign out */}
        <Pressable onPress={doSignOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Locked & blocked modal */}
      <Modal visible={lockModal} transparent animationType="fade" onRequestClose={() => setLockModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLockModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Locked & Blocked Accounts</Text>
              <Pressable hitSlop={10} onPress={() => setLockModal(false)}><Text style={styles.mClose}>Ã—</Text></Pressable>
            </View>
            {lockErr ? <Text style={styles.errText}>{lockErr}</Text> : null}
            <ScrollView style={{ maxHeight: 360 }}>
              {locked.length === 0 ? (
                <Text style={styles.emptyLine}>No locked or blocked accounts.</Text>
              ) : locked.map((u) => (
                <View key={u.id} style={styles.lockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{u.fullName}</Text>
                    <Text style={styles.rowMeta}>{u.email} Â· {u.status}</Text>
                  </View>
                  <Pressable onPress={() => unlock(u)} style={({ pressed }) => [styles.unlockBtn, pressed && styles.pressed]}>
                    <Text style={styles.unlockBtnText}>{u.status === 'blocked' ? 'Unblock' : 'Unlock'}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <AdminNav active="AdminLogs" navigation={navigation} />
    </SafeAreaView>
  );
}

function StatBox({ value, label, note, danger }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, danger && { color: colors.redStrong }]}>{value}</Text>
      <Text style={styles.statBoxLabel} numberOfLines={1}>{label}</Text>
      {note ? <Text style={[styles.statBoxNote, danger && { color: colors.redStrong }]}>{note}</Text> : null}
    </View>
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

  search: {
    height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: colors.white, fontSize: 13, color: colors.navy,
  },
  filterRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  filterChip: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  filterLabel: { color: colors.slate, fontSize: 9.5, fontWeight: '700' },
  filterValue: { color: colors.blue, fontSize: 13, fontWeight: '800', marginTop: 2, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statBoxValue: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  statBoxLabel: { color: colors.slate, fontSize: 8.5, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  statBoxNote: { color: colors.green, fontSize: 8, fontWeight: '800', marginTop: 1 },

  sectionCard: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800', marginBottom: 6 },
  emptyLine: { color: colors.slate, fontSize: 11.5, fontStyle: 'italic', marginTop: 4 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  rowName: { color: colors.navy, fontSize: 12.5, fontWeight: '800' },
  rowMeta: { color: colors.slate, fontSize: 10.5, marginTop: 2 },
  rowSub: { color: colors.slate400, fontSize: 10, marginTop: 1 },
  killBtn: { backgroundColor: colors.redLight, borderRadius: 7, paddingVertical: 7, paddingHorizontal: 14 },
  killBtnText: { color: colors.redStrong, fontSize: 11.5, fontWeight: '800' },

  logRow: { flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, marginRight: 10 },

  alertCard: { backgroundColor: colors.redLight, borderRadius: 13, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.red },
  alertTitle: { color: colors.redStrong, fontSize: 13, fontWeight: '800' },
  alertBody: { color: colors.redStrong, fontSize: 11, lineHeight: 16, marginTop: 5 },
  alertBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.redStrong, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  alertBtnText: { color: colors.white, fontSize: 11.5, fontWeight: '800' },

  signOut: { marginTop: 18, borderWidth: 1, borderColor: colors.red, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  signOutText: { color: colors.redStrong, fontSize: 13, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  mClose: { color: colors.slate, fontSize: 24, lineHeight: 26 },
  lockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  unlockBtn: { backgroundColor: colors.blue, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 14 },
  unlockBtnText: { color: colors.white, fontSize: 11.5, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import AdminHeader from '../../components/AdminHeader';
import Icon, { IconText } from '../../components/Icon';

const ROLE_CYCLE = ['all', 'student', 'parent', 'counsellor', 'admin'];
const ACTION_CYCLE = ['all', 'login', 'failed_login', 'logout'];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} ${m === 1 ? 'min' : 'mins'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hr' : 'hrs'} ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

// "Chrome Windows", "iPhone Safari", "CareerGuide App Android"... from a raw user-agent string.
function prettyDevice(ua) {
  if (!ua) return '';
  const os = /iPhone|iPad/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows' : /Mac OS|Macintosh/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
  if (/okhttp|Expo|CFNetwork|Darwin|ReactNative/i.test(ua)) return ['CareerGuide App', os].filter(Boolean).join(' ');
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  const label = os === 'iPhone' ? [os, browser] : [browser, os];
  return label.filter(Boolean).join(' ') || ua.slice(0, 40);
}

const TIMELINE_PREVIEW = 8;

function clockTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const ACTION_LABEL = { login: 'Logged in', failed_login: 'Failed login', logout: 'Logged out' };

export default function AdminLogs({ navigation }) {
  const { user, signOut } = useAuth();
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
  const [alerts, setAlerts] = useState({ failedAttempts: [], unusualLogins: [] });
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [lockingId, setLockingId] = useState(null);

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
      const [s, ss, al] = await Promise.allSettled([
        api('/api/logs/stats'),
        api('/api/logs/sessions'),
        api('/api/logs/alerts'),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (ss.status === 'fulfilled') setSessions(ss.value.sessions || []);
      if (al.status === 'fulfilled') setAlerts(al.value);
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

  // Lock an account flagged by the brute-force alert (ends its sessions too).
  const lockAccount = async (a) => {
    setLockingId(a.userId);
    try {
      await api(`/api/users/${a.userId}/lock`, { method: 'POST' });
      await loadStatsAndSessions();
    } catch (e) { setError(e.message || 'Could not lock the account.'); }
    finally { setLockingId(null); }
  };

  const doSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <AdminHeader navigation={navigation} user={user} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>User Access & Audit Logs</Text>
          <Pressable
            hitSlop={10}
            accessibilityLabel="Locked and blocked accounts"
            onPress={openLockModal}
            style={({ pressed }) => [styles.hBtn, pressed && styles.pressed]}
          >
            <Icon name="lock" size={18} color={colors.blue} />
          </Pressable>
        </View>
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {/* Search */}
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search user or IP�"
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
          <StatBox value={stats?.activeSessions ?? '�'} label="Active Sessions" note="Live" />
          <StatBox value={stats?.todayLogins ?? '�'} label="Today's Logins" />
          <StatBox value={stats?.failedAttempts ?? '�'} label="Failed Attempts" note="Flagged" danger />
          <StatBox value={stats?.lockedAccounts ?? '�'} label="Locked" />
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
                <Text style={styles.rowMeta}>{s.role} � {clockTime(s.startedAt)} � {s.ip || s.device || ''}</Text>
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
          ) : (showAllLogs ? logs : logs.slice(0, TIMELINE_PREVIEW)).map((l, i, list) => {
            const failed = l.action === 'failed_login';
            const tone = l.action === 'login' ? colors.greenDark : failed ? colors.redStrong : colors.slate;
            const ring = l.action === 'login' ? colors.greenPale : failed ? colors.redLight : colors.border;
            const last = i === list.length - 1;
            return (
              <View key={l.id} style={styles.tlRow}>
                <View style={styles.tlRail}>
                  <View style={[styles.tlRing, { backgroundColor: ring }]}>
                    <View style={[styles.tlDot, { backgroundColor: tone }]} />
                  </View>
                  {!last && <View style={styles.tlLine} />}
                </View>
                <View style={[styles.tlBody, !last && { paddingBottom: 18 }]}>
                  <View style={styles.tlTop}>
                    <Text style={styles.tlName} numberOfLines={1}>{l.userName || 'Unknown user'}</Text>
                    <Text style={styles.tlTime}>{timeAgo(l.createdAt)}</Text>
                  </View>
                  <Text style={styles.tlAction}>
                    Action: <Text style={styles.tlActionStrong}>{ACTION_LABEL[l.action] || l.action}</Text>
                  </Text>
                  <Text style={styles.tlMeta} numberOfLines={1}>
                    {[prettyDevice(l.device), l.ip ? `IP: ${l.ip}` : null].filter(Boolean).join(' � ')}
                  </Text>
                </View>
              </View>
            );
          })}
          {logs.length > TIMELINE_PREVIEW ? (
            <Pressable onPress={() => setShowAllLogs((v) => !v)} style={styles.moreBtn}>
              <IconText icon={showAllLogs ? 'chevron-up' : 'chevron-down'} trailing size={15} color={colors.blue} gap={4} textStyle={styles.moreText}>
                {showAllLogs ? 'Show less' : `Show all ${logs.length} entries`}
              </IconText>
            </Pressable>
          ) : null}
        </View>

        {/* Security alerts */}
        <Text style={styles.alertsHeading}>Security Alerts</Text>
        {alerts.unusualLogins.length === 0 && alerts.failedAttempts.length === 0 ? (
          <View style={styles.okCard}>
            <IconText icon="shield-check" size={16} color={colors.greenDark} textStyle={styles.okTitle}>No security alerts</IconText>
            <Text style={styles.okBody}>No unusual logins or repeated failed attempts in the last 24 hours.</Text>
          </View>
        ) : null}

        {alerts.unusualLogins.map((a) => (
          <View key={`u-${a.id}`} style={styles.warnCard}>
            <IconText icon="warning" size={17} color={colors.orange} gap={8} textStyle={styles.warnTitle}>Unusual Login Location</IconText>
            <Text style={styles.warnBody}>
              User '{a.userName}' logged in from IP {a.ip}
              {a.usualIp ? ` (Expected: ${a.usualIp})` : ''} � {timeAgo(a.createdAt)}.
            </Text>
          </View>
        ))}

        {alerts.failedAttempts.map((a) => (
          <View key={`f-${a.userId || a.account}`} style={styles.dangerCard}>
            <IconText icon="shield-alert" size={17} color={colors.redStrong} gap={8} textStyle={styles.dangerTitle}>Multiple Failed Attempts</IconText>
            <Text style={styles.dangerBody}>
              Brute force suspect: {a.attempts} failed tries on '{a.account}' in the last 24 hours.
            </Text>
            {a.canLock ? (
              <Pressable
                disabled={lockingId === a.userId}
                onPress={() => lockAccount(a)}
                style={({ pressed }) => [styles.lockBtn, (pressed || lockingId === a.userId) && styles.pressed]}
              >
                <Text style={styles.lockBtnText}>{lockingId === a.userId ? 'Locking�' : 'Lock Account'}</Text>
              </Pressable>
            ) : (
              <Text style={styles.dangerNote}>
                {a.userId ? (a.status !== 'active' ? `Account is ${a.status}.` : 'This account cannot be locked.') : 'No account exists with this email.'}
              </Text>
            )}
          </View>
        ))}

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
              <Pressable hitSlop={10} onPress={() => setLockModal(false)}><Icon name="close" size={22} color={colors.slate} /></Pressable>
            </View>
            {lockErr ? <Text style={styles.errText}>{lockErr}</Text> : null}
            <ScrollView style={{ maxHeight: 360 }}>
              {locked.length === 0 ? (
                <Text style={styles.emptyLine}>No locked or blocked accounts.</Text>
              ) : locked.map((u) => (
                <View key={u.id} style={styles.lockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{u.fullName}</Text>
                    <Text style={styles.rowMeta}>{u.email} � {u.status}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle: { flex: 1, color: colors.navy, fontSize: 18, fontWeight: '800', marginRight: 10 },
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

  // Login history timeline
  tlRow: { flexDirection: 'row', marginTop: 10 },
  tlRail: { width: 22, alignItems: 'center' },
  tlRing: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tlDot: { width: 9, height: 9, borderRadius: 5 },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  tlBody: { flex: 1, marginLeft: 12 },
  tlTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tlName: { flex: 1, color: colors.navy, fontSize: 14.5, fontWeight: '800', marginRight: 8 },
  tlTime: { color: colors.slate, fontSize: 12 },
  tlAction: { color: colors.slateDark, fontSize: 13, marginTop: 3 },
  tlActionStrong: { color: colors.navy, fontWeight: '800' },
  tlMeta: { color: colors.slate, fontSize: 12, marginTop: 3 },
  moreBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 4 },
  moreText: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },

  // Security alerts
  alertsHeading: { color: colors.navy, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 2 },
  warnCard: { backgroundColor: colors.yellow, borderRadius: 13, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.orange },
  warnTitle: { color: colors.orange, fontSize: 14.5, fontWeight: '800' },
  warnBody: { color: colors.navy, fontSize: 13, lineHeight: 19, marginTop: 8 },
  dangerCard: { backgroundColor: colors.redLight, borderRadius: 13, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.red },
  dangerTitle: { color: colors.redStrong, fontSize: 14.5, fontWeight: '800' },
  dangerBody: { color: colors.navy, fontSize: 13, lineHeight: 19, marginTop: 8 },
  dangerNote: { color: colors.redStrong, fontSize: 12, fontWeight: '700', marginTop: 10 },
  lockBtn: { marginTop: 14, backgroundColor: colors.redStrong, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  lockBtnText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  okCard: { backgroundColor: colors.greenPale, borderRadius: 13, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.greenMint },
  okTitle: { color: colors.greenDark, fontSize: 13.5, fontWeight: '800' },
  okBody: { color: colors.slateDark, fontSize: 12, lineHeight: 17, marginTop: 5 },

  signOut: { marginTop: 18, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.redStrong },
  signOutText: { color: colors.white, fontSize: 13, fontWeight: '800' },

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


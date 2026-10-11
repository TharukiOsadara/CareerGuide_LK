import React, { useCallback, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../Components/AdminHeader';
import AdminNav from '../../Components/AdminNav';
import WelcomeToast from '../../Components/WelcomeToast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import Icon, { IconText } from '../../Components/Icon';

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

export default function AdminOverview({ navigation, route }) {
  const { user } = useAuth();
  const [showToast, setShowToast] = useState(!!route?.params?.welcome);
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Admin';
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState(null);
  const [summary, setSummary] = useState(null); // counsellors, matches, parent links
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, c, u, sm] = await Promise.allSettled([
        api('/api/logs/stats'),
        api('/api/courses'),
        api('/api/users'),
        api('/api/admin/summary'),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (c.status === 'fulfilled') setCourses(c.value.courses || []);
      if (u.status === 'fulfilled') setUsers(u.value.users || []);
      if (sm.status === 'fulfilled') setSummary(sm.value);
      const failed = [s, c, u, sm].find((r) => r.status === 'rejected');
      if (failed) setError(failed.reason?.message || 'Some data could not be loaded.');
    } catch (e) {
      setError(e.message || 'Failed to load dashboard.');
    }
  }, []);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const deleteCourse = (course) => {
    Alert.alert('Delete course', `Delete "${course.degreeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/courses/${course.id}`, { method: 'DELETE' });
            load();
          } catch (e) { setError(e.message || 'Delete failed.'); }
        },
      },
    ]);
  };

  const recent = courses.slice(0, 3);

  // Card values are computed from live data so they match the detail page each card opens.
  const zScoreCount = courses.filter((c) => c.zScore != null).length;
  const uniCount = new Set(courses.map((c) => (c.uniName || '').trim()).filter(Boolean)).size;
  const activeUsers = (users || []).filter((u) => u.status === 'active').length;
  const statCards = [
    { type: 'courses', icon: 'graduation-cap', tint: colors.blue, bg: colors.blueLight, value: `${courses.length}`, label: 'Total Courses', note: `${courses.length} Programs` },
    { type: 'zscores', icon: 'chart', tint: colors.orange, bg: colors.yellow, value: `${zScoreCount}`, label: 'Z-Score Updates', note: 'Cut-offs recorded' },
    { type: 'unis', icon: 'landmark', tint: colors.teal, bg: colors.mint, value: `${uniCount}`, label: 'Active Unis', note: 'Institutes' },
    { type: 'users', icon: 'users', tint: colors.blue, bg: colors.blueChip, value: users ? `${users.length}` : '—', label: 'Registered Users', note: `${activeUsers} Active` },
    // These open their own management pages (with full create / edit / delete).
    { route: 'AdminCounsellors', icon: 'user-cog', tint: colors.teal, bg: colors.mint, value: summary ? `${summary.counsellors}` : '—', label: 'Counsellors', note: summary ? `${summary.coursesWithoutCounsellor} course(s) unguided` : '' },
    { route: 'AdminCounsellors', params: { tab: 'matches' }, icon: 'target', tint: colors.greenDark, bg: colors.greenPale, value: summary ? `${summary.matchedStudents}` : '—', label: 'Matched Students', note: summary ? `of ${summary.students} students` : '' },
    { route: 'AdminFamilies', icon: 'users', tint: colors.orange, bg: colors.yellow, value: summary ? `${summary.familyLinks}` : '—', label: 'Parent Links', note: summary ? `${summary.parents} parent account(s)` : '' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <AdminHeader navigation={navigation} user={user} />

      {/* Page body: the welcome popup is anchored here, just below the header. */}
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
          <Text style={styles.pageSub}>Welcome back, {firstName}. Here's what's happening today.</Text>
          {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

          {/* Feature card */}
          <View style={styles.feature}>
            <View style={styles.featureHead}>
              <View style={styles.featureIcon}><Icon name="shield-check" size={22} color={colors.white} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>User Management & Audit</Text>
                <Text style={styles.featureSub}>Active Sessions & Security Logs</Text>
              </View>
            </View>
            <Text style={styles.featureBody}>
              Monitor active sessions, login history, and security logs dynamically.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AdminLogs')}
              style={({ pressed }) => [styles.featureBtn, pressed && styles.pressed]}
            >
              <IconText icon="arrow-right" trailing size={15} color={colors.blue} textStyle={styles.featureBtnText}>Open User Access Logs Dashboard</IconText>
            </Pressable>
          </View>

          {/* Quick stats */}
          <Text style={styles.heading}>Admin Quick Stats</Text>
          <View style={styles.grid}>
            {statCards.map((s) => (
              <Pressable
                key={s.label}
                accessibilityRole="button"
                accessibilityLabel={`${s.label}: ${s.value}. View details`}
                onPress={() => (s.route ? navigation.navigate(s.route, s.params) : navigation.navigate('AdminStatDetail', { type: s.type }))}
                style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
              >
                <View style={styles.statTop}>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}><Icon name={s.icon} size={20} color={s.tint} /></View>
                  <Icon name="chevron-right" size={18} color={colors.slate400} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statNote}>{s.note}</Text>
              </Pressable>
            ))}
          </View>

          {/* Management action cards */}
          <Text style={styles.heading}>Management Action Cards</Text>
          <ActionCard
            title="Z-Score Criteria Manager"
            desc="Update A/L stream cut-off marks by district and intake year."
            onPress={() => navigation.navigate('AdminZScores')}
          />
          <ActionCard
            title="Add New Degree Program"
            desc="Create a new degree entry (title, university, duration, fee, UGC status, min Z-score)."
            onPress={() => navigation.navigate('AdminCourses', { create: true })}
          />
          <ActionCard
            title="Counsellors & Courses"
            desc="See which courses each counsellor guides, edit them, and manage which counsellor each student is matched to."
            cta="Manage Counsellors"
            onPress={() => navigation.navigate('AdminCounsellors')}
          />
          <ActionCard
            title="Parents & Children"
            desc="See every parent-child link, add new links, change the relationship or remove a link."
            cta="Manage Parent Links"
            onPress={() => navigation.navigate('AdminFamilies')}
          />
          <ActionCard
            title="NVQ & Accreditation Mapping"
            desc="Link course profiles to NVQ Level 1–7 frameworks and TVEC approvals."
            onPress={() => navigation.navigate('AdminCourses')}
          />

          {/* Recent course updates */}
          <Text style={styles.heading}>Recent Course Updates</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>No courses yet.</Text>
          ) : recent.map((c) => (
            <View key={c.id} style={styles.courseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName} numberOfLines={1}>{c.degreeName}</Text>
                <Text style={styles.courseMeta} numberOfLines={1}>
                  {c.uniName}{c.createdAt ? ` · ${timeAgo(c.createdAt)}` : ''}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => navigation.navigate('AdminCourses', { editId: c.id })}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Icon name="edit" size={16} color={colors.blue} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => deleteCourse(c)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Icon name="trash" size={16} color={colors.redStrong} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <WelcomeToast
          visible={showToast}
          name={firstName}
          loginTime={user?.lastLoginAt}
          variant="info"
          onHide={() => {
            setShowToast(false);
            navigation.setParams({ welcome: false });
          }}
        />
      </View>

      <AdminNav active="AdminOverview" navigation={navigation} />
    </SafeAreaView>
  );
}

function ActionCard({ title, desc, onPress, cta = 'Manage Criteria' }) {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{desc}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
      >
        <IconText icon="arrow-right" trailing size={14} color={colors.white} textStyle={styles.actionBtnText}>{cta}</IconText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },

  feature: { backgroundColor: colors.adminDark, borderRadius: 16, padding: 16 },
  featureHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: {
    width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  featureTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  featureSub: { color: colors.slate400, fontSize: 11, marginTop: 2 },
  featureBody: { color: colors.border, fontSize: 12, lineHeight: 18 },
  featureBtn: {
    marginTop: 14, backgroundColor: colors.white, borderRadius: 9,
    paddingVertical: 11, alignItems: 'center',
  },
  featureBtnText: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },

  heading: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 22, marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%', backgroundColor: colors.white, borderRadius: 13, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  pageTitle: { color: colors.navy, fontSize: 20, fontWeight: '800' },
  pageSub: { color: colors.slate, fontSize: 12, marginTop: 4, marginBottom: 14 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.navy, fontSize: 20, fontWeight: '800', marginTop: 6 },
  statLabel: { color: colors.slateDark, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  statNote: { color: colors.slate, fontSize: 10, marginTop: 2 },

  actionCard: {
    backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  actionTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  actionDesc: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  actionBtn: {
    alignSelf: 'flex-start', marginTop: 11, backgroundColor: colors.blue,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
  },
  actionBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },

  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic' },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  courseName: { color: colors.navy, fontSize: 12.5, fontWeight: '800' },
  courseMeta: { color: colors.slate, fontSize: 10.5, marginTop: 2 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  iconBtnText: { fontSize: 15 },
  pressed: { opacity: 0.78 },
});


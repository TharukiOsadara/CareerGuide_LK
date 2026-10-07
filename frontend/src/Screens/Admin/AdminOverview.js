import React, { useCallback, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../components/AdminHeader';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';

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

export default function AdminOverview({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [userCount, setUserCount] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, c, u] = await Promise.allSettled([
        api('/api/logs/stats'),
        api('/api/courses'),
        api('/api/users'),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (c.status === 'fulfilled') setCourses(c.value.courses || []);
      if (u.status === 'fulfilled') setUserCount((u.value.users || []).length);
      const failed = [s, c, u].find((r) => r.status === 'rejected');
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

  const statCards = [
    { icon: 'ðŸŽ“', value: courses.length ? `${courses.length}` : 'â€”', label: 'Total Courses', note: `${courses.length || 0} Programs` },
    { icon: 'ðŸ“Š', value: '2026', label: 'Z-Score Updates', note: 'Ingested' },
    { icon: 'ðŸ›ï¸', value: '28', label: 'Active Unis', note: 'Institutes' },
    { icon: 'ðŸ‘¥', value: userCount != null ? `${userCount}` : 'â€”', label: 'Registered Users', note: `${userCount || 0} Active` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <AdminHeader navigation={navigation} user={user} title="CareerGuide Admin" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {/* Feature card */}
        <View style={styles.feature}>
          <View style={styles.featureHead}>
            <Text style={styles.featureIcon}>ðŸ›¡ï¸</Text>
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
            <Text style={styles.featureBtnText}>Open User Access Logs Dashboard â†’</Text>
          </Pressable>
        </View>

        {/* Quick stats */}
        <Text style={styles.heading}>Admin Quick Stats</Text>
        <View style={styles.grid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statNote}>{s.note}</Text>
            </View>
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
          title="NVQ & Accreditation Mapping"
          desc="Link course profiles to NVQ Level 1â€“7 frameworks and TVEC approvals."
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
                {c.uniName}{c.createdAt ? ` Â· ${timeAgo(c.createdAt)}` : ''}
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => navigation.navigate('AdminCourses', { editId: c.id })}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Text style={styles.iconBtnText}>âœï¸</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => deleteCourse(c)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <Text style={styles.iconBtnText}>ðŸ—‘ï¸</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <AdminNav active="AdminOverview" navigation={navigation} />
    </SafeAreaView>
  );
}

function ActionCard({ title, desc, onPress }) {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{desc}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
      >
        <Text style={styles.actionBtnText}>Manage Criteria â†’</Text>
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
  featureIcon: { fontSize: 24, marginRight: 10 },
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
  statIcon: { fontSize: 20 },
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


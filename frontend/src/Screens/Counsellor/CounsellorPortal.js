import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import { styles } from './styles';
import Icon from '../../components/Icon';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';

const TABS = [
  { key: 'Dashboard', icon: 'grid' },
  { key: 'Students', icon: 'users' },
  { key: 'Guidance', icon: 'clipboard' },
  { key: 'Inquiries', icon: 'mail' },
  { key: 'Settings', icon: 'settings' },
];

function StatusChip({ status }) {
  const reviewed = status === 'reviewed';
  return (
    <View style={[styles.chip, reviewed && styles.reviewedChip]}>
      <Text style={[styles.chipText, reviewed && styles.reviewedText]}>
        {reviewed ? 'REVIEWED' : 'PENDING REVIEW'}
      </Text>
    </View>
  );
}

function StudentCard({ student, navigation }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{student.initials}</Text></View>
        <View style={[styles.headerCopy, styles.flex]}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.muted}>{student.stream || 'Stream not recorded'}</Text>
        </View>
        <StatusChip status={student.status} />
      </View>
      <Text style={styles.muted}>
        Top match: {student.topMatch ? `${student.topMatch.title} ${student.topMatch.matchPercent}%` : 'Not available'}
      </Text>
      <Pressable
        style={[styles.button, student.status === 'reviewed' && styles.secondaryButton]}
        onPress={() => navigation.navigate('CounsellorStudentProfile', { studentId: student.id })}
      >
        <Text style={[styles.buttonText, student.status === 'reviewed' && styles.secondaryText]}>
          {student.status === 'reviewed' ? 'View Profile & Advise' : 'Provide Recommendations'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CounsellorPortal({ navigation, route }) {
  const [tab, setTab] = useState(route.params?.tab || 'Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (status) query.set('status', status);
      if (stream) query.set('stream', stream);
      const [summary, list] = await Promise.all([
        counsellorApi.dashboard(),
        counsellorApi.students(query.toString()),
      ]);
      setDashboard(summary);
      setStudents(list.students || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, stream]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const list = tab === 'Dashboard' ? dashboard?.students || students : students;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>MS</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Counsellor Portal</Text>
            <Text style={styles.title}>{dashboard?.counsellor?.name || 'Counsellor'}</Text>
            <Text style={styles.subtitle}>Senior Counsellor</Text>
          </View>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !dashboard ? <ActivityIndicator color={colors.blue} /> : null}

        {tab === 'Dashboard' ? (
          <>
            <Text style={styles.heading}>Dashboard</Text>
            <Text style={styles.subtitle}>Decision support for your assigned students.</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{dashboard?.stats?.totalStudents ?? 0}</Text><Text style={styles.statLabel}>Assigned students</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{dashboard?.stats?.reviewed ?? 0}</Text><Text style={styles.statLabel}>Completed</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{dashboard?.stats?.pendingReviews ?? 0}</Text><Text style={styles.statLabel}>Pending reviews</Text></View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Assigned Students</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search assigned student by name or index..." style={styles.search} placeholderTextColor={colors.muted} />
            <View style={[styles.row, { marginBottom: 12 }]}> 
              {['', 'pending', 'reviewed'].map((value) => (
                <Pressable key={value} onPress={() => setStatus(value)} style={[styles.chip, { marginRight: 7 }, status === value && styles.reviewedChip]}>
                  <Text style={[styles.chipText, status === value && styles.reviewedText]}>{value ? value === 'pending' ? 'Pending' : 'Reviewed' : 'All Students'}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={stream} onChangeText={setStream} placeholder="Filter by Stream" style={styles.search} placeholderTextColor={colors.muted} />
          </>
        )}

        <Text style={styles.sectionTitle}>{tab === 'Dashboard' ? 'Assigned Students' : 'Students'}</Text>
        {list.map((student) => <StudentCard key={student.id} student={student} navigation={navigation} />)}
        {!loading && !list.length ? <Text style={styles.muted}>No assigned students match these filters.</Text> : null}
      </ScrollView>

      <View style={tabBarStyles.bar} accessibilityRole="tablist">
        {TABS.map((item) => {
          const selected = tab === item.key;
          return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [tabBarStyles.tab, pressed && tabBarStyles.pressed]}
            accessibilityRole="tab"
            accessibilityLabel={item.key}
            accessibilityState={{ selected }}
            onPress={() => {
            if (item.key === 'Guidance') {
              navigation.navigate('CounsellorGuidanceForm');
              return;
            }
            if (item.key === 'Inquiries') {
              navigation.navigate('CounsellorInquiries');
              return;
            }
            if (item.key === 'Settings') {
              navigation.navigate('CounsellorSettings');
              return;
            }
            setTab(item.key);
          }}
          >
            <View style={[tabBarStyles.iconWrap, selected && tabBarStyles.iconWrapActive]}>
              {item.icon === 'clipboard' ? (
                <ClipboardList size={20} color={selected ? colors.blue : colors.slate} strokeWidth={selected ? 2.2 : 1.8} />
              ) : (
                <Icon name={item.icon} size={20} color={selected ? colors.blue : colors.slate} strokeWidth={selected ? 2.2 : 1.8} />
              )}
            </View>
            <Text style={[tabBarStyles.label, selected && tabBarStyles.active]}>{item.key}</Text>
          </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export { StatusChip };

const tabBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  pressed: { opacity: 0.7 },
  iconWrap: { width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.blueLight },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  active: { color: colors.blue, fontWeight: '800' },
});

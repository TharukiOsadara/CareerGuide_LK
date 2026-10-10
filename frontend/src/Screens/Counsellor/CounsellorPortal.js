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
import Icon from '../../Components/Icon';
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
  const [pendingInquiries, setPendingInquiries] = useState(0);

  // Badge on the bell: questions from students/parents still waiting for a reply.
  useEffect(() => {
    const refreshBadge = () => counsellorApi.inquiries()
      .then((d) => setPendingInquiries(d?.counts?.pending || 0))
      .catch(() => {});
    refreshBadge();
    const unsub = navigation.addListener?.('focus', refreshBadge);
    return unsub;
  }, [navigation]);

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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(dashboard?.counsellor?.name || 'Counsellor').split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Counsellor Portal</Text>
            <Text style={styles.title}>{dashboard?.counsellor?.name || 'Counsellor'}</Text>
            <Text style={styles.subtitle}>Senior Counsellor</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Inquiries, ${pendingInquiries} awaiting reply`}
            hitSlop={10}
            onPress={() => navigation.navigate('CounsellorInquiries')}
            style={{ padding: 6 }}
          >
            <Icon name="bell" size={23} color={colors.navy} />
            {pendingInquiries > 0 ? (
              <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: colors.white, fontSize: 10.5, fontWeight: '800' }}>{pendingInquiries > 9 ? '9+' : pendingInquiries}</Text>
              </View>
            ) : null}
          </Pressable>
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

        {tab === 'Dashboard' ? (
          <>
            <View style={[styles.row, { marginTop: 8, marginBottom: 10 }]}>
              <Text style={[styles.sectionTitle, styles.flex, { marginBottom: 0, marginTop: 0 }]}>My students</Text>
              {list.length ? (
                <Pressable onPress={() => setTab('Students')} hitSlop={8}>
                  <Text style={{ color: colors.blue, fontWeight: '800', fontSize: 12 }}>View all ({list.length}) ›</Text>
                </Pressable>
              ) : null}
            </View>
            {list.length ? (
              <View style={[styles.card, { paddingVertical: 4 }]}>
                {list.slice(0, 5).map((student, i) => (
                  <Pressable
                    key={student.id}
                    onPress={() => navigation.navigate('CounsellorStudentProfile', { studentId: student.id })}
                    style={({ pressed }) => [listStyles.item, i > 0 && listStyles.divider, pressed && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${student.name}, ${student.status === 'reviewed' ? 'reviewed' : 'pending review'}`}
                  >
                    <View style={[styles.avatar, listStyles.avatar]}><Text style={[styles.avatarText, { fontSize: 12 }]}>{student.initials}</Text></View>
                    <View style={[styles.flex, { marginLeft: 10 }]}>
                      <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                      <Text style={[styles.muted, { marginTop: 2 }]} numberOfLines={1}>
                        {student.stream || 'Stream not recorded'}{student.topMatch ? ` · ${student.topMatch.title}` : ''}
                      </Text>
                    </View>
                    <View style={[listStyles.dot, { backgroundColor: student.status === 'reviewed' ? '#198754' : '#E0A100' }]} />
                    <Text style={listStyles.status}>{student.status === 'reviewed' ? 'Reviewed' : 'Pending'}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Students</Text>
            {list.map((student) => <StudentCard key={student.id} student={student} navigation={navigation} />)}
          </>
        )}
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

const listStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  status: { color: colors.muted, fontSize: 11, fontWeight: '700', marginLeft: 5 },
});

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

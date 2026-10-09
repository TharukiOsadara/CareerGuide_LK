import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { counsellorApi } from '../counsellor/api';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';
import Icon from '../components/Icon';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Chip from './Parent/components/Chip';
import { EmptyState, ErrorState, LoadingState } from './Parent/components/StateViews';
import { useToast } from './Parent/components/Toast';

const TABS = [
  { key: 'Dashboard', icon: 'grid' },
  { key: 'Students', icon: 'users' },
  { key: 'Guidance', icon: 'clipboard' },
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

function GuidanceStudentCard({ student, guidance, courseTitle, navigation }) {
  const status = guidance?.guidanceStatus === 'final' ? 'Final' : guidance ? 'Draft' : 'Not started';
  const tone = status === 'Final' ? 'success' : status === 'Draft' ? 'warn' : 'neutral';
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [guidanceCard.card, pressed && guidanceCard.pressed]}
      onPress={() => navigation.navigate('CounsellorGuidanceForm', { studentId: student.id })}
    >
      <View style={guidanceCard.row}>
        <View style={guidanceCard.avatar}><Text style={guidanceCard.initial}>{student.initials || student.name?.slice(0, 1) || '?'}</Text></View>
        <View style={guidanceCard.copy}>
          <Text style={guidanceCard.name}>{student.name}</Text>
          <Text style={guidanceCard.course}>{courseTitle || student.courseTitle || student.course || 'Course not recorded'}</Text>
        </View>
        <Chip label={status} tone={tone} />
      </View>
      <Text style={guidanceCard.action}>Open guidance  ›</Text>
    </Pressable>
  );
}

export default function CounsellorPortal({ navigation, route }) {
  const toast = useToast();
  const [tab, setTab] = useState(route.params?.tab || 'Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [guidanceRecords, setGuidanceRecords] = useState([]);
  const [inquiryCourses, setInquiryCourses] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [stream, setStream] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (status) query.set('status', status);
      if (stream) query.set('stream', stream);
      if (courseId) query.set('courseId', courseId);
      const [summary, list, guidanceResponse, inquiryResponse, overviewResponse] = await Promise.all([
        counsellorApi.dashboard(),
        counsellorApi.students(query.toString()),
        counsellorApi.guidanceList().catch(() => ({ guidance: [] })),
        counsellorApi.inquiries().catch(() => ({ inquiries: [] })),
        counsellorApi.overview().catch(() => null),
      ]);
      setDashboard(summary);
      setOverview(overviewResponse);
      setStudents(list.students || []);
      setGuidanceRecords(guidanceResponse.guidance || []);
      const coursesByStudent = {};
      (inquiryResponse.inquiries || []).forEach((inquiry) => {
        if (inquiry.studentId && inquiry.courseTitle && !coursesByStudent[inquiry.studentId]) {
          coursesByStudent[inquiry.studentId] = inquiry.courseTitle;
        }
      });
      setInquiryCourses(coursesByStudent);
    } catch (loadError) {
      setError(loadError.message);
      toast({ title: 'Could not load counsellor portal', message: loadError.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, status, stream, courseId, toast]);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => {
    if (tab === 'Guidance') loadRef.current();
  }, [tab]));
  useFocusEffect(useCallback(() => {
    counsellorApi.notifications().then((response) => setUnreadCount(response.unreadCount || 0)).catch(() => {});
  }, []));
  useEffect(() => { counsellorApi.courses().then((response) => setCourses(response.courses || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const list = tab === 'Dashboard' ? overview?.students || dashboard?.students || students : students;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>MS</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Welcome back</Text>
            <Text style={styles.title}>{dashboard?.counsellor?.name || 'Counsellor'}</Text>
            <Text style={styles.subtitle}>{dashboard?.counsellor?.isSenior ? 'Senior Counsellor' : 'Counsellor'}</Text>
            {dashboard?.counsellor?.isSenior ? <View style={[styles.chip, styles.reviewedChip]}><Text style={[styles.chipText, styles.reviewedText]}>SENIOR</Text></View> : null}
          </View>
          <Pressable onPress={() => navigation.navigate('CounsellorNotifications')} accessibilityLabel="Open notifications">
            <View>
              <Icon name="bell" size={22} color={colors.blue} />
              {unreadCount > 0 ? <View style={{ position: 'absolute', right: -5, top: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#B42318', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View> : null}
            </View>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !dashboard ? <ActivityIndicator color={colors.blue} /> : null}

        {tab === 'Guidance' ? (
          <>
            <Text style={styles.heading}>Guidance</Text>
            <Text style={styles.subtitle}>Choose an assigned student to view or write guidance.</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search students by name or course"
              style={styles.search}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
            />
            {loading && !students.length ? <LoadingState message="Loading assigned students…" /> : null}
            {error && !students.length ? <ErrorState error={{ message: error }} onRetry={load} /> : null}
            {!loading && !error && !students.length ? <EmptyState title="No assigned students" message="Students assigned to you will appear here." /> : null}
            {(overview?.students || students).map((student) => {
              const guidance = guidanceRecords.find((record) => Number(record.studentId) === Number(student.id));
              return <GuidanceStudentCard key={student.id} student={student} guidance={guidance} courseTitle={inquiryCourses[student.id]} navigation={navigation} />;
            })}
          </>
        ) : tab === 'Dashboard' ? (
          <>
            <Text style={styles.heading}>Your overview</Text>
            <Text style={styles.subtitle}>Support students across their course pathways.</Text>
            <View style={dashboardStyles.statGrid}>
              <Stat label="Assigned students" value={overview?.stats?.assignedStudents ?? dashboard?.stats?.totalStudents ?? 0} icon="users" />
              <Stat label="Pending inquiries" value={overview?.stats?.pendingInquiries ?? 0} icon="message" />
              <Stat label="Guidance drafts" value={overview?.stats?.drafts ?? 0} icon="edit" />
              <Stat label="Guidance finalised" value={overview?.stats?.guidanceFinalised ?? 0} icon="check" />
            </View>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={dashboardStyles.quickRow}>
              <QuickAction label="Students" icon="users" onPress={() => setTab('Students')} />
              <QuickAction label="Inquiries" icon="message" onPress={() => navigation.navigate('CounsellorInquiries')} />
              <QuickAction label="Guidance" icon="clipboard" onPress={() => { setSearch(''); setTab('Guidance'); }} />
            </View>
            <View style={dashboardStyles.sectionHead}><Text style={styles.sectionTitle}>Needs attention</Text><Chip label={`${overview?.needsAttention?.length || 0}`} tone="warn" /></View>
            {overview?.needsAttention?.length ? overview.needsAttention.map((item, index) => (
              <Pressable key={`${item.type}-${item.id || item.studentId}-${index}`} style={dashboardStyles.attention} onPress={() => item.type === 'inquiry' ? navigation.navigate('CounsellorInquiries') : navigation.navigate('CounsellorStudentProfile', { studentId: item.studentId })}>
                <View style={dashboardStyles.attentionIcon}><Icon name={item.type === 'inquiry' ? 'message' : 'users'} size={18} color={colors.blue} /></View>
                <View style={{ flex: 1 }}><Text style={dashboardStyles.attentionTitle}>{item.type === 'inquiry' ? item.title : `${item.studentName} needs guidance`}</Text><Text style={styles.muted}>{item.studentName}{item.courseTitle ? ` · ${item.courseTitle}` : ''}</Text></View>
                <Icon name="chevron-right" size={18} color={colors.muted} />
              </Pressable>
            )) : <Text style={styles.muted}>No items need attention right now.</Text>}
            <Text style={styles.sectionTitle}>Recent activity</Text>
            {overview?.recentActivity?.length ? overview.recentActivity.slice(0, 5).map((item, index) => <View key={`${item.type}-${index}`} style={dashboardStyles.activity}><View style={dashboardStyles.dot} /><View style={{ flex: 1 }}><Text style={dashboardStyles.attentionTitle}>{item.description}</Text><Text style={styles.muted}>{item.studentName}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}</Text></View></View>) : <Text style={styles.muted}>Recent counsellor activity will appear here.</Text>}
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
            <Text style={styles.muted}>Filter by assigned course</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              <Pressable onPress={() => setCourseId('')} style={[styles.chip, { margin: 4 }, !courseId && styles.reviewedChip]}><Text style={[styles.chipText, !courseId && styles.reviewedText]}>All Courses</Text></Pressable>
              {courses.map((course) => <Pressable key={course.id} onPress={() => setCourseId(String(course.id))} style={[styles.chip, { margin: 4 }, courseId === String(course.id) && styles.reviewedChip]}><Text style={[styles.chipText, courseId === String(course.id) && styles.reviewedText]}>{course.title}</Text></Pressable>)}
            </View>
          </>
        )}

        {tab !== 'Guidance' ? <>
          <Text style={styles.sectionTitle}>{tab === 'Dashboard' ? 'Assigned Students' : 'Students'}</Text>
          {tab === 'Dashboard' ? <TextInput value={search} onChangeText={setSearch} placeholder="Search assigned students" style={styles.search} placeholderTextColor={colors.muted} /> : null}
          {list.map((student) => <StudentCard key={student.id} student={student} navigation={navigation} />)}
          {!loading && !list.length ? <Text style={styles.muted}>No assigned students match these filters.</Text> : null}
        </> : null}
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
              setSearch('');
              setStatus('');
              setStream('');
              setCourseId('');
              setTab('Guidance');
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

function Stat({ label, value, icon }) {
  return <View style={dashboardStyles.stat}><View style={dashboardStyles.statIcon}><Icon name={icon} size={18} color={colors.blue} /></View><Text style={dashboardStyles.statValue}>{value}</Text><Text style={dashboardStyles.statLabel}>{label}</Text></View>;
}

function QuickAction({ label, icon, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [dashboardStyles.quick, pressed && { opacity: 0.75 }]}><View style={dashboardStyles.quickIcon}><Icon name={icon} size={20} color={colors.blue} /></View><Text style={dashboardStyles.quickLabel}>{label}</Text></Pressable>;
}

const dashboardStyles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 },
  stat: { width: '48%', minHeight: 112, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  statIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.navy, fontWeight: '800', fontSize: 23, marginTop: 7 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  quick: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  quickIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.blueLight },
  quickLabel: { color: colors.navy, fontWeight: '700', marginTop: 7, fontSize: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  attention: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: 10 },
  attentionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { color: colors.navy, fontWeight: '700', fontSize: 13 },
  activity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
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

const guidanceCard = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  initial: { color: colors.blue, fontWeight: '800', fontSize: 15 },
  copy: { flex: 1, marginRight: 8 },
  name: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  course: { color: colors.muted, fontSize: 12, marginTop: 4 },
  action: { color: colors.blue, fontSize: 12, fontWeight: '700', marginTop: 12 },
  pressed: { opacity: 0.72 },
});

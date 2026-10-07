import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';

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

      <View style={styles.bottomTabs}>
        {['Dashboard', 'Students', 'Guidance', 'Settings'].map((item) => (
          <Pressable key={item} style={styles.tab} onPress={() => {
            if (item === 'Guidance') {
              const first = students[0] || dashboard?.students?.[0];
              if (first) navigation.navigate('CounsellorGuidanceForm', { studentId: first.id });
              return;
            }
            if (item === 'Settings') {
              navigation.navigate('CounsellorSettings');
              return;
            }
            setTab(item);
          }}>
            <Text style={{ fontSize: 18 }}>{item === 'Dashboard' ? '⌂' : item === 'Students' ? '♙' : item === 'Guidance' ? '✎' : '⚙'}</Text>
            <Text style={[styles.tabText, tab === item && styles.activeTab]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export { StatusChip };

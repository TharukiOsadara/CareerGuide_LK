import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentHeader from '../../Components/StudentHeader';
import StudentNav from '../../Components/StudentNav';
import { api } from '../../api/client';
import { AL_STREAMS } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import Icon, { IconText } from '../../Components/Icon';

export default function StudentCourses({ navigation, route }) {
  const { user } = useAuth();
  const [query, setQuery] = useState(route?.params?.query || '');
  const [stream, setStream] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(route?.params?.focusId || null);

  const focusId = route?.params?.focusId;

  useEffect(() => {
    if (focusId) setExpandedId(focusId);
  }, [focusId]);

  useEffect(() => {
    let mounted = true;
    const params = [];
    if (stream) params.push(`stream=${encodeURIComponent(stream)}`);
    if (query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`);
    const qs = params.length ? `?${params.join('&')}` : '';

    (async () => {
      try {
        setLoading(true);
        setError('');
        const { courses: list } = await api(`/api/courses${qs}`);
        if (mounted) setCourses(list || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Could not load courses.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [query, stream]);

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <StudentHeader navigation={navigation} user={user} />

      <View style={styles.topArea}>
        <Text style={styles.title}>Courses</Text>

        <View style={styles.searchCard}>
          <Icon name="search" size={17} color={colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses…"
            placeholderTextColor={colors.slate400}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="All" active={stream === ''} onPress={() => setStream('')} />
          {AL_STREAMS.map((s) => (
            <Chip key={s} label={s} active={stream === s} onPress={() => setStream(s)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {error ? <View style={styles.banner}><Text style={styles.bannerText}>{error}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
        ) : courses.length === 0 && !error ? (
          <Text style={styles.empty}>No courses match your search.</Text>
        ) : (
          courses.map((course) => {
            const open = expandedId === course.id;
            return (
              <Pressable
                key={course.id}
                accessibilityRole="button"
                onPress={() => toggle(course.id)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  {course.ugcApproved ? (
                    <Text style={styles.ugcPill}>UGC APPROVED</Text>
                  ) : <View />}
                  {typeof course.matchPercent === 'number' ? (
                    <Text style={styles.matchPill}>{course.matchPercent}% Match</Text>
                  ) : null}
                </View>

                <Text style={styles.courseName}>{course.degreeName}</Text>
                <Text style={styles.courseUni}>{course.uniName}</Text>

                <View style={styles.metaRow}>
                  <Meta label="Z-Score" value={fmtZ(course.zScore)} />
                  <Meta label="Duration" value={course.duration} />
                </View>
                <View style={styles.metaRow}>
                  <Meta label="Tuition" value={course.tuitionFee} />
                  <Meta label="NVQ Level" value={course.nvqLevel != null ? `${course.nvqLevel}` : '—'} />
                </View>

                {open && (
                  <View style={styles.expand}>
                    {course.description ? (
                      <>
                        <Text style={styles.expandLabel}>Description</Text>
                        <Text style={styles.expandText}>{course.description}</Text>
                      </>
                    ) : null}
                    {course.careerPath ? (
                      <>
                        <Text style={[styles.expandLabel, { marginTop: 10 }]}>Career Path</Text>
                        <Text style={styles.expandText}>{course.careerPath}</Text>
                      </>
                    ) : null}
                  </View>
                )}

                <IconText icon={open ? 'chevron-up' : 'chevron-down'} trailing size={14} color={colors.blue} gap={4} style={{ marginTop: 10 }} textStyle={styles.toggleHint}>{open ? 'Tap to collapse' : 'Tap to view details'}</IconText>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <StudentNav active="StudentCourses" navigation={navigation} />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value || '—'}</Text>
    </View>
  );
}

function fmtZ(z) {
  if (z == null) return '—';
  const n = Number(z);
  return Number.isNaN(n) ? `${z}` : n.toFixed(4);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topArea: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  title: { color: colors.navy, fontSize: 20, fontWeight: '800', marginBottom: 10 },

  searchCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 44, marginBottom: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  chipRow: { gap: 8, paddingRight: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, maxWidth: 190,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.slate600, fontSize: 11.5, fontWeight: '700' },
  chipTextActive: { color: colors.white },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 10, paddingBottom: 24 },

  banner: { backgroundColor: colors.redLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  bannerText: { color: colors.redStrong, fontSize: 11.5 },
  empty: { color: colors.slate, fontSize: 12.5, textAlign: 'center', marginTop: 20 },

  card: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ugcPill: {
    color: colors.greenDark, backgroundColor: colors.greenPale, fontSize: 8.5, fontWeight: '800',
    textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  matchPill: {
    color: colors.blue, backgroundColor: colors.blueLight, fontSize: 9, fontWeight: '800',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  courseName: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  courseUni: { color: colors.slate, fontSize: 12, marginTop: 3, marginBottom: 10 },

  metaRow: { flexDirection: 'row', marginBottom: 8 },
  meta: { flex: 1 },
  metaLabel: { color: colors.slate400, fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase' },
  metaValue: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700', marginTop: 2 },

  expand: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  expandLabel: { color: colors.blue, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  expandText: { color: colors.slate600, fontSize: 12, lineHeight: 18 },

  toggleHint: { color: colors.blue, fontSize: 11, fontWeight: '700', marginTop: 10 },

  pressed: { opacity: 0.78 },
});


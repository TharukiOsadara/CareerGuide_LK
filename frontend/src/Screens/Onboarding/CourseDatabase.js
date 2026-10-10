import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { AL_STREAMS } from '../../config';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Dropdown from '../../components/Dropdown';
import Icon from '../../components/Icon';

// Public "Verified Course Database" opened from the onboarding Core Utilities card.
// Reads the read-only catalogue (/api/courses/public), so no login is needed.
const ALL_STREAMS = 'All A/L Streams';
const FILTERS = [
  { key: 'all', label: 'All Courses' },
  { key: 'ugc', label: 'UGC Approved' },
  { key: 'nvq', label: 'NVQ Levels' },
  { key: 'private', label: 'Private' },
];

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#F3E8FF';

// Badge shown on each card: UGC approved, NVQ-accredited, or private institute.
function badgeFor(c) {
  if (c.ugcApproved) return { text: 'UGC APPROVED', fg: colors.greenDark, bg: colors.greenPale };
  if (c.nvqLevel) return { text: `NVQ ${c.nvqLevel}`.toUpperCase(), fg: colors.blue, bg: colors.blueChip };
  return { text: 'PRIVATE', fg: PURPLE, bg: PURPLE_LIGHT };
}

export default function CourseDatabase({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stream, setStream] = useState(ALL_STREAMS);

  const load = useCallback(async () => {
    setError('');
    try {
      const { courses: list } = await api('/api/courses/public', { auth: false });
      setCourses(list || []);
    } catch (e) {
      setError(e.message || 'Could not load courses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter === 'ugc' && !c.ugcApproved) return false;
      if (filter === 'nvq' && !c.nvqLevel) return false;
      if (filter === 'private' && c.ugcApproved) return false;
      if (stream !== ALL_STREAMS && c.alStream !== stream) return false;
      if (!q) return true;
      return [c.degreeName, c.uniName].some((f) => (f || '').toLowerCase().includes(q));
    });
  }, [courses, search, filter, stream]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Course Database</Text>
        <View style={{ width: BACK_WIDTH, alignItems: 'flex-end' }}>
          <Icon name="help" size={20} color={colors.slate} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.blue]} />}
      >
        <View style={styles.searchBox}>
          <Icon name="search" size={17} color={colors.slate400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search courses, universities..."
            placeholderTextColor={colors.slate400}
            autoCapitalize="none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>A/L Stream</Text>
        <Dropdown value={stream} options={[ALL_STREAMS, ...AL_STREAMS]} onSelect={setStream} icon="book" />

        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} />
        ) : (
          <>
            <Text style={styles.count}>{results.length} {results.length === 1 ? 'course' : 'courses'} found</Text>
            {results.length === 0 ? (
              <Text style={styles.empty}>No courses match these filters.</Text>
            ) : results.map((c) => {
              const badge = badgeFor(c);
              return (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.uni} numberOfLines={1}>{c.uniName}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.degree}>{c.degreeName}</Text>
                  <Text style={styles.duration}>Duration: {c.duration || '—'}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 15, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginTop: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  chips: { gap: 8, paddingVertical: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.slateDark, fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: colors.white, fontWeight: '800' },

  label: { color: colors.navy, fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
  count: { color: colors.slate, fontSize: 12.5, fontWeight: '600', marginTop: 18, marginBottom: 10 },
  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginTop: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  uni: { flex: 1, color: colors.blue, fontSize: 11, fontWeight: '700', marginRight: 8 },
  badge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.3 },
  degree: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 4 },
  duration: { color: colors.slate, fontSize: 11.5, marginTop: 8 },
});

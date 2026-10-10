import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';

// Detail page opened from an Admin Overview stat card. `route.params.type` picks the dataset.
const CONFIG = {
  courses: { title: 'Total Courses', icon: 'graduation-cap', tint: colors.blue, bg: colors.blueLight, unit: 'degree programs' },
  zscores: { title: 'Z-Score Updates', icon: 'chart', tint: colors.orange, bg: colors.yellow, unit: 'programs with a recorded cut-off' },
  unis: { title: 'Active Universities', icon: 'landmark', tint: colors.teal, bg: colors.mint, unit: 'institutes offering programs' },
  users: { title: 'Registered Users', icon: 'users', tint: colors.blue, bg: colors.blueChip, unit: 'accounts' },
};

const ROLE_FILTERS = ['all', 'student', 'parent', 'counsellor', 'admin'];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export default function AdminStatDetail({ navigation, route }) {
  const type = CONFIG[route?.params?.type] ? route.params.type : 'courses';
  const cfg = CONFIG[type];
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { user: me } = useAuth();
  const [notice, setNotice] = useState('');

  // Super admin only: clear an admin's authenticator so they scan a new QR at next login.
  const resetMfa = async (u) => {
    setError(''); setNotice('');
    try {
      const { user: updated } = await api(`/api/users/${u.id}/reset-mfa`, { method: 'POST' });
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      setNotice(`Authenticator reset for ${u.fullName}. They will scan a new QR code at their next login.`);
    } catch (e) {
      setError(e.message || 'Could not reset the authenticator.');
    }
  };

  const load = useCallback(async () => {
    setError('');
    try {
      if (type === 'users') {
        const { users: list } = await api('/api/users');
        setUsers(list || []);
      } else {
        const { courses: list } = await api('/api/courses');
        setCourses(list || []);
      }
    } catch (e) {
      setError(e.message || 'Could not load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const has = (...fields) => !q || fields.some((f) => (f || '').toString().toLowerCase().includes(q));

  const rows = useMemo(() => {
    if (type === 'courses') return courses.filter((c) => has(c.degreeName, c.uniName, c.alStream));
    if (type === 'zscores') {
      return courses
        .filter((c) => c.zScore != null)
        .sort((a, b) => b.zScore - a.zScore)
        .filter((c) => has(c.degreeName, c.uniName, c.district));
    }
    if (type === 'unis') {
      const map = new Map();
      courses.forEach((c) => {
        const name = (c.uniName || '').trim();
        if (!name) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(c);
      });
      return [...map.entries()]
        .map(([name, list]) => ({ name, programs: list }))
        .sort((a, b) => b.programs.length - a.programs.length)
        .filter((u) => has(u.name, ...u.programs.map((p) => p.degreeName)));
    }
    return users
      .filter((u) => roleFilter === 'all' || u.role === roleFilter)
      .filter((u) => has(u.fullName, u.email));
  }, [type, courses, users, q, roleFilter]);

  const total = type === 'users' ? users.length
    : type === 'zscores' ? courses.filter((c) => c.zScore != null).length
    : type === 'unis' ? new Set(courses.map((c) => (c.uniName || '').trim()).filter(Boolean)).size
    : courses.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle} numberOfLines={1}>{cfg.title}</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.blue]} />}
      >
        {/* Summary */}
        <View style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: cfg.bg }]}><Icon name={cfg.icon} size={24} color={cfg.tint} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryValue}>{loading ? '—' : total}</Text>
            <Text style={styles.summaryLabel}>{cfg.unit}</Text>
          </View>
        </View>

        {type === 'users' && !loading ? (
          <View style={styles.roleRow}>
            {ROLE_FILTERS.map((r) => {
              const count = r === 'all' ? users.length : users.filter((u) => u.role === r).length;
              const on = roleFilter === r;
              return (
                <Pressable key={r} onPress={() => setRoleFilter(r)} style={[styles.roleChip, on && styles.roleChipOn]}>
                  <Text style={[styles.roleChipText, on && styles.roleChipTextOn]}>{r === 'all' ? 'All' : cap(r)} · {count}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.searchBox}>
          <Icon name="search" size={17} color={colors.slate400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={type === 'users' ? 'Search name or email…' : 'Search programs or universities…'}
            placeholderTextColor={colors.slate400}
            autoCapitalize="none"
          />
        </View>

        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}
        {notice ? <View style={styles.okBanner}><Text style={styles.okText}>{notice}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>{q ? 'No results match your search.' : 'Nothing to show yet.'}</Text>
        ) : type === 'users' ? (
          rows.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              onResetMfa={me?.isSuperAdmin && u.role === 'admin' && u.mfaEnabled ? () => resetMfa(u) : null}
            />
          ))
        ) : type === 'unis' ? (
          rows.map((u) => <UniRow key={u.name} uni={u} />)
        ) : (
          rows.map((c) => <CourseRow key={c.id} c={c} showZ={type === 'zscores'} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseRow({ c, showZ }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{c.degreeName}</Text>
          <IconText icon="landmark" size={13} color={colors.slate} gap={5} style={{ marginTop: 4 }} textStyle={styles.cardMeta} numberOfLines={1}>{c.uniName || '—'}</IconText>
        </View>
        {showZ ? (
          <View style={styles.zBadge}>
            <Text style={styles.zBadgeLabel}>Z-SCORE</Text>
            <Text style={styles.zBadgeValue}>{c.zScore}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.chipRow}>
        {c.alStream ? <Chip text={c.alStream} /> : null}
        {!showZ && c.zScore != null ? <Chip text={`Z ${c.zScore}`} /> : null}
        {showZ && c.district ? <Chip text={c.district} /> : null}
        {showZ && c.intakeYear ? <Chip text={`Intake ${c.intakeYear}`} /> : null}
        {c.ugcApproved ? <Chip text="UGC approved" tone="green" /> : null}
      </View>
    </View>
  );
}

function UniRow({ uni }) {
  const shown = uni.programs.slice(0, 3);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.uniIcon]}><Icon name="landmark" size={18} color={colors.teal} /></View>
        <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>{uni.name}</Text>
        <Text style={styles.count}>{uni.programs.length} {uni.programs.length === 1 ? 'program' : 'programs'}</Text>
      </View>
      {shown.map((p) => (
        <IconText key={p.id} icon="graduation-cap" size={13} color={colors.slate400} gap={6} style={{ marginTop: 6 }} textStyle={styles.cardMeta} numberOfLines={1}>{p.degreeName}</IconText>
      ))}
      {uni.programs.length > shown.length ? (
        <Text style={styles.more}>+{uni.programs.length - shown.length} more</Text>
      ) : null}
    </View>
  );
}

function UserRow({ u, onResetMfa }) {
  const statusTone = u.status === 'active' ? 'green' : u.status === 'pending' ? 'amber' : 'red';
  return (
    <View style={[styles.card, styles.userCard]}>
      <View style={styles.avatar}>
        {u.avatarInitials ? <Text style={styles.avatarText}>{u.avatarInitials}</Text> : <Icon name="user" size={16} color={colors.blue} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{u.fullName}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{u.email}</Text>
        <View style={styles.chipRow}>
          <Chip text={cap(u.role)} />
          <Chip text={cap(u.status)} tone={statusTone} />
          {u.provider === 'google' ? <Chip text="Google" /> : null}
          {u.role === 'admin' ? <Chip text={u.mfaEnabled ? '2FA on' : '2FA not set up'} tone={u.mfaEnabled ? 'green' : 'amber'} /> : null}
        </View>
        {onResetMfa ? (
          <Pressable onPress={onResetMfa} style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.75 }]}>
            <IconText icon="key" size={14} color={colors.blue} textStyle={styles.resetText}>Reset authenticator</IconText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const TONES = {
  blue: { bg: colors.blueChip, fg: colors.blue },
  green: { bg: colors.greenPale, fg: colors.greenDark },
  amber: { bg: colors.yellow, fg: colors.orange },
  red: { bg: colors.redLight, fg: colors.redStrong },
};

function Chip({ text, tone = 'blue' }) {
  const t = TONES[tone];
  return <View style={[styles.chip, { backgroundColor: t.bg }]}><Text style={[styles.chipText, { color: t.fg }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: colors.blue,
  },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 14.5, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },

  summary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  summaryIcon: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  summaryValue: { color: colors.navy, fontSize: 26, fontWeight: '800' },
  summaryLabel: { color: colors.slate, fontSize: 12, marginTop: 2 },

  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  roleChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  roleChipOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  roleChipText: { color: colors.slateDark, fontSize: 11.5, fontWeight: '700' },
  roleChipTextOn: { color: colors.blue, fontWeight: '800' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginTop: 14, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },
  okBanner: { backgroundColor: colors.greenPale, borderRadius: 8, padding: 10, marginBottom: 12 },
  okText: { color: colors.greenDark, fontSize: 11.5, fontWeight: '700' },
  resetBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.blueLight, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  resetText: { color: colors.blue, fontSize: 11.5, fontWeight: '800' },
  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  cardMeta: { color: colors.slate, fontSize: 11.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10.5, fontWeight: '800' },

  zBadge: { backgroundColor: colors.blueLight, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', marginLeft: 10 },
  zBadgeLabel: { color: colors.slate, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  zBadgeValue: { color: colors.blue, fontSize: 16, fontWeight: '800', marginTop: 1 },

  uniIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  count: { color: colors.teal, fontSize: 11.5, fontWeight: '800', marginLeft: 8 },
  more: { color: colors.blue, fontSize: 11.5, fontWeight: '700', marginTop: 6 },

  userCard: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
});

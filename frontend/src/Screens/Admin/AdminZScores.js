import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../components/AdminHeader';
import AdminNav from '../../components/AdminNav';
import { CourseModal } from './AdminCourses';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import { hasErrors, validateCourse } from '../../utils/validation';
import Icon, { IconText } from '../../components/Icon';

const NUMERIC = ['zScore', 'minZScore', 'islandRank', 'districtRank', 'intakeYear', 'tuitionFee', 'nvqLevel', 'matchPercent'];

const EMPTY = {
  degreeName: '', uniName: '', alStream: '', zScore: '', minZScore: '',
  islandRank: '', districtRank: '', district: '', intakeYear: '', duration: '',
  tuitionFee: '', ugcApproved: false, nvqLevel: '', matchPercent: '',
  description: '', careerPath: '',
};

function toForm(c) {
  const f = { ...EMPTY };
  Object.keys(EMPTY).forEach((k) => {
    if (c[k] == null) return;
    f[k] = k === 'ugcApproved' ? !!c[k] : String(c[k]);
  });
  return f;
}

function toPayload(f) {
  const out = {};
  Object.keys(EMPTY).forEach((k) => {
    if (k === 'ugcApproved') { out[k] = !!f[k]; return; }
    if (NUMERIC.includes(k)) { out[k] = f[k] === '' || f[k] == null ? null : Number(f[k]); return; }
    out[k] = f[k];
  });
  return out;
}

export default function AdminZScores({ navigation }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({}); // per-field messages in the popup
  const [formError, setFormError] = useState('');   // server error shown in the popup

  const load = useCallback(async () => {
    setError('');
    try {
      const { courses: list } = await api('/api/courses');
      setCourses(list || []);
    } catch (e) {
      setError(e.message || 'Failed to load Z-Score data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormErrors({}); setFormError(''); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c.id); setForm(toForm(c)); setFormErrors({}); setFormError(''); setModalOpen(true); };
  const setField = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFormErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  };

  const save = async () => {
    const errs = validateCourse(form);
    setFormErrors(errs);
    if (hasErrors(errs)) { setFormError('Please fix the highlighted fields.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = toPayload(form);
      if (editing) await api(`/api/courses/${editing}`, { method: 'PUT', body: payload });
      else await api('/api/courses', { method: 'POST', body: payload });
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c) => {
    Alert.alert('Delete entry', `Delete Z-Score entry for "${c.degreeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api(`/api/courses/${c.id}`, { method: 'DELETE' }); await load(); }
          catch (e) { setError(e.message || 'Delete failed.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <AdminHeader navigation={navigation} user={user} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.topRow}>
          <Text style={styles.h1}>Z-Score Manager</Text>
          <Pressable onPress={openCreate} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
            <IconText icon="plus" size={15} color={colors.white} gap={5} textStyle={styles.addBtnText}>Add New</IconText>
          </Pressable>
        </View>
        <IconText icon="lock" size={12} color={colors.slate} gap={5} style={{ marginTop: 6, marginBottom: 4 }} textStyle={styles.note}>Only admins can edit. Update cut-off marks by district & intake year.</IconText>

        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : courses.length === 0 ? (
          <Text style={styles.empty}>No Z-Score entries yet. Tap “Add New”.</Text>
        ) : courses.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.zTop}>
              <View style={styles.zBadge}>
                <Text style={styles.zBadgeLabel}>Z-SCORE</Text>
                <Text style={styles.zBadgeValue}>{c.zScore != null ? c.zScore : '—'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{c.degreeName}</Text>
                <IconText icon="landmark" size={13} color={colors.slate} gap={5} style={{ marginTop: 3 }} textStyle={styles.cardUni} numberOfLines={1}>{c.uniName}</IconText>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <Stat label="Island Rank" value={c.islandRank != null ? `#${c.islandRank}` : '—'} />
              <Stat label="District Rank" value={c.districtRank != null ? `#${c.districtRank}` : '—'} />
              <Stat label="District" value={c.district || '—'} />
              <Stat label="Intake Year" value={c.intakeYear != null ? `${c.intakeYear}` : '—'} />
              <Stat label="A/L Stream" value={c.alStream || '—'} />
              <Stat label="Min Z-Score" value={c.minZScore != null ? `${c.minZScore}` : '—'} />
            </View>

            <View style={styles.cardBtns}>
              <Pressable onPress={() => openEdit(c)} style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                <IconText icon="edit" size={14} color={colors.blue} center textStyle={styles.editBtnText}>Edit</IconText>
              </Pressable>
              <Pressable onPress={() => remove(c)} style={({ pressed }) => [styles.delBtn, pressed && styles.pressed]}>
                <IconText icon="trash" size={14} color={colors.redStrong} center textStyle={styles.delBtnText}>Delete</IconText>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <CourseModal
        visible={modalOpen}
        editing={!!editing}
        form={form}
        setField={setField}
        onClose={() => setModalOpen(false)}
        onSave={save}
        saving={saving}
        errors={formErrors}
        formError={formError}
        emphasis="zscore"
      />

      <AdminNav active="AdminZScores" navigation={navigation} />
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  addBtn: { backgroundColor: colors.blue, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 14 },
  addBtnText: { color: colors.white, fontSize: 12.5, fontWeight: '800' },
  note: { color: colors.slate, fontSize: 11, marginTop: 6, marginBottom: 4 },

  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginTop: 10 },
  errText: { color: colors.redStrong, fontSize: 11.5 },
  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic', marginTop: 18 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  zTop: { flexDirection: 'row', alignItems: 'center' },
  zBadge: { backgroundColor: colors.adminDark, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', marginRight: 12, minWidth: 64 },
  zBadgeLabel: { color: colors.slate400, fontSize: 8, fontWeight: '800' },
  zBadgeValue: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 2 },
  cardTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  cardUni: { color: colors.slateDark, fontSize: 11.5, marginTop: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  stat: { width: '33.33%', marginBottom: 10 },
  statLabel: { color: colors.slate, fontSize: 9.5, fontWeight: '700' },
  statValue: { color: colors.navy, fontSize: 12, fontWeight: '800', marginTop: 2 },

  cardBtns: { flexDirection: 'row', marginTop: 2, gap: 10 },
  editBtn: { flex: 1, backgroundColor: colors.blueLight, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  editBtnText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  delBtn: { flex: 1, backgroundColor: colors.redLight, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  delBtnText: { color: colors.redStrong, fontSize: 12, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


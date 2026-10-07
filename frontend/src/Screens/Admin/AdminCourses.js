import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Switch,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../components/AdminHeader';
import AdminNav from '../../components/AdminNav';
import Field from '../../components/Field';
import Dropdown from '../../components/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AL_STREAMS } from '../../config';
import { colors } from '../../styles/colors';
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

export default function AdminCourses({ navigation, route }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // course id or null
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { courses: list } = await api('/api/courses');
      setCourses(list || []);
      return list || [];
    } catch (e) {
      setError(e.message || 'Failed to load courses.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle route params (create / editId) once after load.
  useEffect(() => {
    (async () => {
      if (route?.params?.create) {
        openCreate();
        navigation.setParams({ create: undefined });
      } else if (route?.params?.editId) {
        const list = courses.length ? courses : await load();
        const c = list.find((x) => x.id === route.params.editId);
        if (c) openEdit(c);
        navigation.setParams({ editId: undefined });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.create, route?.params?.editId]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c.id); setForm(toForm(c)); setModalOpen(true); };

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.degreeName.trim()) { setError('Degree name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = toPayload(form);
      if (editing) await api(`/api/courses/${editing}`, { method: 'PUT', body: payload });
      else await api('/api/courses', { method: 'POST', body: payload });
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c) => {
    Alert.alert('Delete course', `Delete "${c.degreeName}"?`, [
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
          <Text style={styles.h1}>Course Manager</Text>
          <Pressable onPress={openCreate} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
            <IconText icon="plus" size={15} color={colors.white} gap={5} textStyle={styles.addBtnText}>Add New</IconText>
          </Pressable>
        </View>
        <IconText icon="lock" size={12} color={colors.slate} gap={5} style={{ marginTop: 6, marginBottom: 4 }} textStyle={styles.note}>Only admins can edit.</IconText>

        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : courses.length === 0 ? (
          <Text style={styles.empty}>No courses yet. Tap “Add New” to create one.</Text>
        ) : courses.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={2}>{c.degreeName}</Text>
            <IconText icon="landmark" size={13} color={colors.slate} gap={5} style={{ marginTop: 4 }} textStyle={styles.cardUni} numberOfLines={1}>{c.uniName}</IconText>
            <View style={styles.chipRow}>
              {!!c.alStream && <Chip text={c.alStream} />}
              {c.zScore != null && <Chip text={`Z ${c.zScore}`} />}
              {c.islandRank != null && <Chip text={`Island #${c.islandRank}`} />}
              {c.districtRank != null && <Chip text={`Dist #${c.districtRank}`} />}
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
      />

      <AdminNav active="AdminCourses" navigation={navigation} />
    </SafeAreaView>
  );
}

function Chip({ text }) {
  return <View style={styles.chip}><Text style={styles.chipText}>{text}</Text></View>;
}

export function CourseModal({ visible, editing, form, setField, onClose, onSave, saving, emphasis = 'degree' }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.mBackdrop}>
        <View style={styles.mSheet}>
          <View style={styles.mHead}>
            <Text style={styles.mTitle}>{editing ? 'Edit Course' : 'Add New Course'}</Text>
            <Pressable hitSlop={10} onPress={onClose}><Icon name="close" size={22} color={colors.slate} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator>
            {emphasis === 'zscore' && (
              <Text style={styles.mSection}>Z-Score & Ranking</Text>
            )}
            <Field label="Degree Name" icon="graduation-cap" value={form.degreeName} onChangeText={setField('degreeName')} placeholder="e.g. BSc in Computer Science" autoCapitalize="words" />
            <Field label="University" icon="landmark" value={form.uniName} onChangeText={setField('uniName')} placeholder="e.g. University of Colombo" autoCapitalize="words" />

            <Text style={styles.fLabel}>A/L Stream</Text>
            <Dropdown value={form.alStream} options={AL_STREAMS} onSelect={setField('alStream')} placeholder="Select A/L stream" icon="book" />

            <View style={styles.two}>
              <View style={styles.col}><Field label="Z-Score" icon="chart" value={form.zScore} onChangeText={setField('zScore')} placeholder="1.8542" keyboardType="numeric" /></View>
              <View style={styles.col}><Field label="Min Z-Score" icon="trending-down" value={form.minZScore} onChangeText={setField('minZScore')} placeholder="1.6000" keyboardType="numeric" /></View>
            </View>
            <View style={styles.two}>
              <View style={styles.col}><Field label="Island Rank" icon="medal" value={form.islandRank} onChangeText={setField('islandRank')} placeholder="120" keyboardType="numeric" /></View>
              <View style={styles.col}><Field label="District Rank" icon="map-pin" value={form.districtRank} onChangeText={setField('districtRank')} placeholder="12" keyboardType="numeric" /></View>
            </View>
            <View style={styles.two}>
              <View style={styles.col}><Field label="District" icon="map" value={form.district} onChangeText={setField('district')} placeholder="Colombo" autoCapitalize="words" /></View>
              <View style={styles.col}><Field label="Intake Year" icon="calendar" value={form.intakeYear} onChangeText={setField('intakeYear')} placeholder="2026" keyboardType="numeric" /></View>
            </View>

            {emphasis === 'zscore' && <Text style={styles.mSection}>Program Details</Text>}
            <View style={styles.two}>
              <View style={styles.col}><Field label="Duration" icon="hourglass" value={form.duration} onChangeText={setField('duration')} placeholder="4 years" autoCapitalize="none" /></View>
              <View style={styles.col}><Field label="Tuition Fee" icon="wallet" value={form.tuitionFee} onChangeText={setField('tuitionFee')} placeholder="0" keyboardType="numeric" /></View>
            </View>
            <View style={styles.two}>
              <View style={styles.col}><Field label="NVQ Level" icon="tag" value={form.nvqLevel} onChangeText={setField('nvqLevel')} placeholder="1–7" keyboardType="numeric" /></View>
              <View style={styles.col}><Field label="Match %" icon="target" value={form.matchPercent} onChangeText={setField('matchPercent')} placeholder="85" keyboardType="numeric" /></View>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>UGC Approved</Text>
                <Text style={styles.switchSub}>Recognised by the University Grants Commission.</Text>
              </View>
              <Switch
                value={!!form.ugcApproved}
                onValueChange={setField('ugcApproved')}
                trackColor={{ false: colors.border, true: colors.blue }}
                thumbColor={colors.white}
              />
            </View>

            <Text style={styles.fLabel}>Description</Text>
            <TextInput
              style={styles.multiline} multiline value={form.description}
              onChangeText={setField('description')} placeholder="Short description of the program…"
              placeholderTextColor={colors.slate400}
            />
            <Text style={styles.fLabel}>Career Path</Text>
            <TextInput
              style={styles.multiline} multiline value={form.careerPath}
              onChangeText={setField('careerPath')} placeholder="Typical roles & career outcomes…"
              placeholderTextColor={colors.slate400}
            />
          </ScrollView>

          <View style={styles.mActions}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={onSave} style={({ pressed }) => [styles.saveBtn, (pressed || saving) && styles.pressed]}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Course'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  cardTitle: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  cardUni: { color: colors.slateDark, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  chip: { backgroundColor: colors.blueChip, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: colors.blue, fontSize: 10, fontWeight: '700' },
  cardBtns: { flexDirection: 'row', marginTop: 12, gap: 10 },
  editBtn: { flex: 1, backgroundColor: colors.blueLight, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  editBtnText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  delBtn: { flex: 1, backgroundColor: colors.redLight, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  delBtnText: { color: colors.redStrong, fontSize: 12, fontWeight: '800' },

  mBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, maxHeight: '92%' },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  mClose: { color: colors.slate, fontSize: 26, lineHeight: 28 },
  mSection: { color: colors.blue, fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 2 },
  fLabel: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginTop: 14, marginBottom: 7 },
  two: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  switchTitle: { color: colors.navy, fontSize: 12.5, fontWeight: '800' },
  switchSub: { color: colors.slate, fontSize: 10.5, marginTop: 2 },
  multiline: { minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.white, fontSize: 13, color: colors.navy, textAlignVertical: 'top' },

  mActions: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  cancelBtnText: { color: colors.slateDark, fontSize: 13, fontWeight: '800' },
  saveBtn: { flex: 2, backgroundColor: colors.blue, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


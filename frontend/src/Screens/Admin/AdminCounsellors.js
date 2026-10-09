import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';
import CoursePicker from '../../components/CoursePicker';
import Dropdown from '../../components/Dropdown';
import FieldError from '../../components/FieldError';

// Admin: counsellors <-> the courses they guide, and which counsellor each student is matched to.
// Tab "counsellors": edit each counsellor's courses. Tab "matches": create / change / remove matches.
export default function AdminCounsellors({ navigation, route }) {
  const [tab, setTab] = useState(route?.params?.tab === 'matches' ? 'matches' : 'counsellors');
  const [counsellors, setCounsellors] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [matches, setMatches] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [editCounsellor, setEditCounsellor] = useState(null); // { id, fullName, courseIds }
  const [editMatch, setEditMatch] = useState(null); // { studentId, studentName, courseId, counsellorId, isNew }
  const [confirmRemove, setConfirmRemove] = useState(null); // match

  const load = useCallback(async () => {
    setError('');
    try {
      const [c, cat, m, u] = await Promise.all([
        api('/api/admin/counsellors'),
        api('/api/admin/course-catalog'),
        api('/api/admin/selections'),
        api('/api/admin/unmatched-students'),
      ]);
      setCounsellors(c.counsellors || []);
      setCatalog(cat.courses || []);
      setMatches(m.selections || []);
      setUnmatched(u.students || []);
    } catch (e) {
      setError(e.message || 'Could not load counsellors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const shownCounsellors = useMemo(() => counsellors.filter((c) => !q
    || `${c.fullName} ${c.email} ${c.courses.map((x) => x.title).join(' ')}`.toLowerCase().includes(q)), [counsellors, q]);
  const shownMatches = useMemo(() => matches.filter((m) => !q
    || `${m.studentName} ${m.studentEmail} ${m.courseTitle} ${m.counsellorName || ''}`.toLowerCase().includes(q)), [matches, q]);
  const unguided = catalog.filter((c) => !c.counsellors?.length);

  const saveCounsellorCourses = async (courseIds) => {
    const res = await api(`/api/admin/counsellors/${editCounsellor.id}/courses`, { method: 'PUT', body: { courseIds } });
    setEditCounsellor(null);
    setNotice(`${editCounsellor.fullName}: ${res.message}`);
    await load();
  };

  const saveMatch = async ({ studentId, courseId, counsellorId }) => {
    const res = await api(`/api/admin/selections/${studentId}`, {
      method: 'PUT', body: { courseId, counsellorId: counsellorId || undefined },
    });
    setEditMatch(null);
    setNotice(`Matched: ${res.message}`);
    await load();
  };

  const removeMatch = async () => {
    const m = confirmRemove;
    setConfirmRemove(null);
    try {
      await api(`/api/admin/selections/${m.studentId}`, { method: 'DELETE' });
      setNotice(`${m.studentName} is no longer matched to a counsellor.`);
      await load();
    } catch (e) {
      setError(e.message || 'Could not remove the match.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle} numberOfLines={1}>Counsellors & Courses</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.blue]} />}
      >
        <View style={styles.stats}>
          <Stat value={counsellors.length} label="Counsellors" />
          <Stat value={matches.length} label="Matched students" />
          <Stat value={unguided.length} label="Courses w/o counsellor" warn={unguided.length > 0} />
        </View>

        <View style={styles.tabs}>
          {[['counsellors', 'Counsellors'], ['matches', 'Student matches']].map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.slate400} />
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder={tab === 'counsellors' ? 'Search counsellors or courses…' : 'Search students, courses, counsellors…'}
            placeholderTextColor={colors.slate400} autoCapitalize="none"
          />
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} /> : tab === 'counsellors' ? (
          <>
            {unguided.length ? (
              <View style={styles.warnCard}>
                <IconText icon="warning" size={15} color={colors.orange} textStyle={styles.warnTitle}>Courses with no counsellor</IconText>
                <Text style={styles.warnBody}>
                  Students can't be matched for: {unguided.map((c) => c.title).join(', ')}. Add them to a counsellor below.
                </Text>
              </View>
            ) : null}
            {shownCounsellors.length === 0 ? <Text style={styles.empty}>No counsellors found.</Text> : null}
            {shownCounsellors.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{c.avatarInitials || c.fullName.slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{c.fullName}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{c.email}</Text>
                  </View>
                  <View style={[styles.chip, c.status === 'active' ? styles.chipGreen : styles.chipRed]}>
                    <Text style={[styles.chipText, { color: c.status === 'active' ? colors.greenDark : colors.redStrong }]}>{c.status}</Text>
                  </View>
                </View>
                <Text style={styles.subhead}>Guides {c.courses.length} course{c.courses.length === 1 ? '' : 's'} · {c.studentCount} matched student{c.studentCount === 1 ? '' : 's'}</Text>
                <View style={styles.courseChips}>
                  {c.courses.length === 0 ? <Text style={styles.metaWarn}>No courses yet</Text> : c.courses.map((x) => (
                    <View key={x.id} style={styles.courseChip}><Text style={styles.courseChipText} numberOfLines={1}>{x.title}</Text></View>
                  ))}
                </View>
                <Pressable
                  onPress={() => setEditCounsellor({ id: c.id, fullName: c.fullName, courseIds: c.courses.map((x) => x.id) })}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <IconText icon="edit" size={14} color={colors.blue} center textStyle={styles.actionText}>Edit courses</IconText>
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <Pressable
              disabled={!unmatched.length}
              onPress={() => setEditMatch({ isNew: true, studentId: null, courseId: null, counsellorId: null })}
              style={({ pressed }) => [styles.addBtn, !unmatched.length && styles.disabled, pressed && styles.pressed]}
            >
              <IconText icon="plus" size={15} color={colors.white} center textStyle={styles.addText}>
                {unmatched.length ? `Match a student (${unmatched.length} unmatched)` : 'All students are matched'}
              </IconText>
            </Pressable>
            {shownMatches.length === 0 ? <Text style={styles.empty}>No student matches yet.</Text> : null}
            {shownMatches.map((m) => (
              <View key={m.studentId} style={styles.card}>
                <Text style={styles.name}>{m.studentName}</Text>
                <Text style={styles.meta}>{m.studentEmail}</Text>
                <View style={styles.matchBox}>
                  <IconText icon="graduation-cap" size={14} color={colors.blue} textStyle={styles.matchText} numberOfLines={1}>{m.courseTitle}</IconText>
                  <IconText icon="user-cog" size={14} color={colors.teal} style={{ marginTop: 6 }} textStyle={styles.matchText} numberOfLines={1}>
                    {m.counsellorName || 'No counsellor'}
                  </IconText>
                </View>
                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => setEditMatch({ isNew: false, studentId: m.studentId, studentName: m.studentName, courseId: m.courseId, counsellorId: m.counsellorId })}
                    style={({ pressed }) => [styles.actionBtn, styles.half, pressed && styles.pressed]}
                  >
                    <IconText icon="edit" size={14} color={colors.blue} center textStyle={styles.actionText}>Change</IconText>
                  </Pressable>
                  <Pressable onPress={() => setConfirmRemove(m)} style={({ pressed }) => [styles.deleteBtn, styles.half, pressed && styles.pressed]}>
                    <IconText icon="trash" size={14} color={colors.redStrong} center textStyle={styles.deleteText}>Remove</IconText>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <EditCoursesModal
        data={editCounsellor}
        catalog={catalog}
        onClose={() => setEditCounsellor(null)}
        onSave={saveCounsellorCourses}
      />
      <MatchModal
        data={editMatch}
        catalog={catalog}
        students={unmatched}
        onClose={() => setEditMatch(null)}
        onSave={saveMatch}
      />
      <ConfirmModal
        visible={!!confirmRemove}
        title="Remove match?"
        message={confirmRemove ? `${confirmRemove.studentName} will no longer have a counsellor for ${confirmRemove.courseTitle}. Their counsellor will lose access.` : ''}
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={removeMatch}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label, warn }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && { color: colors.orange }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function EditCoursesModal({ data, catalog, onClose, onSave }) {
  const [ids, setIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (data) { setIds(data.courseIds); setError(''); } }, [data]);
  if (!data) return null;
  const save = async () => {
    setBusy(true); setError('');
    try { await onSave(ids); } catch (e) { setError(e.message || 'Could not save.'); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Courses guided by {data.fullName}</Text>
          <Text style={styles.sheetSub}>Students who choose these courses can be matched with this counsellor. Removing a course re-matches its students to another counsellor if one exists.</Text>
          <View style={{ marginTop: 12 }}>
            <CoursePicker value={ids} onChange={setIds} courses={catalog} maxHeight={300} />
          </View>
          <FieldError message={error} />
          <ModalButtons busy={busy} onCancel={onClose} onConfirm={save} confirmLabel="Save courses" />
        </View>
      </View>
    </Modal>
  );
}

function MatchModal({ data, catalog, students, onClose, onSave }) {
  const [studentLabel, setStudentLabel] = useState('');
  const [courseLabel, setCourseLabel] = useState('');
  const [counsellorLabel, setCounsellorLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const studentLabels = students.map((s) => `${s.fullName} (${s.email})`);
  const courseLabels = catalog.map((c) => `${c.title} - ${c.institute}`);
  const course = catalog[courseLabels.indexOf(courseLabel)];
  const AUTO = 'Auto-match (least busy counsellor)';
  const counsellorOptions = [AUTO, ...((course?.counsellors || []).map((c) => c.name))];

  useEffect(() => {
    if (!data) return;
    setError('');
    setStudentLabel('');
    const c = catalog.find((x) => x.id === data.courseId);
    setCourseLabel(c ? `${c.title} - ${c.institute}` : '');
    const co = c?.counsellors?.find((x) => x.id === data.counsellorId);
    setCounsellorLabel(co ? co.name : AUTO);
  }, [data, catalog]);

  if (!data) return null;

  const save = async () => {
    setError('');
    const student = data.isNew ? students[studentLabels.indexOf(studentLabel)] : { id: data.studentId };
    if (!student) return setError('Choose a student.');
    if (!course) return setError('Choose a course.');
    if (!course.counsellors?.length) return setError('No counsellor guides this course yet. Add it to a counsellor first.');
    const counsellor = course.counsellors.find((c) => c.name === counsellorLabel);
    setBusy(true);
    try { await onSave({ studentId: student.id, courseId: course.id, counsellorId: counsellor?.id }); }
    catch (e) { setError(e.message || 'Could not save the match.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{data.isNew ? 'Match a student' : `Change match for ${data.studentName}`}</Text>
          {data.isNew ? (
            <>
              <Text style={styles.fLabel}>Student</Text>
              <Dropdown value={studentLabel} options={studentLabels} onSelect={setStudentLabel} placeholder="Choose a student" icon="user" />
            </>
          ) : null}
          <Text style={styles.fLabel}>Course</Text>
          <Dropdown value={courseLabel} options={courseLabels} onSelect={(v) => { setCourseLabel(v); setCounsellorLabel(AUTO); }} placeholder="Choose a course" icon="graduation-cap" />
          <Text style={styles.fLabel}>Counsellor</Text>
          <Dropdown value={counsellorLabel} options={counsellorOptions} onSelect={setCounsellorLabel} placeholder="Choose a counsellor" icon="user-cog" />
          {course && !course.counsellors?.length ? <Text style={styles.metaWarn}>No counsellor guides this course yet.</Text> : null}
          <FieldError message={error} />
          <ModalButtons busy={busy} onCancel={onClose} onConfirm={save} confirmLabel="Save match" />
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ visible, title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetSub}>{message}</Text>
          <ModalButtons danger onCancel={onCancel} onConfirm={onConfirm} confirmLabel={confirmLabel} />
        </View>
      </View>
    </Modal>
  );
}

function ModalButtons({ busy, onCancel, onConfirm, confirmLabel, danger }) {
  return (
    <View style={styles.modalBtns}>
      <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={onConfirm} style={({ pressed }) => [styles.saveBtn, danger && styles.dangerBtn, (pressed || busy) && styles.pressed]}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{confirmLabel}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: colors.blue,
  },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 14.5, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 32 },

  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { color: colors.navy, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.slate, fontSize: 10.5, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  tabs: { flexDirection: 'row', backgroundColor: colors.blueChip, borderRadius: 999, padding: 4, marginTop: 14 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: colors.blue },
  tabText: { color: colors.slate, fontSize: 12.5, fontWeight: '700' },
  tabTextOn: { color: colors.white, fontWeight: '800' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginTop: 12, marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  notice: { color: colors.greenDark, backgroundColor: colors.greenPale, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  error: { color: colors.redStrong, backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },

  warnCard: { backgroundColor: colors.yellow, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.orange },
  warnTitle: { color: colors.orange, fontSize: 13, fontWeight: '800' },
  warnBody: { color: colors.navy, fontSize: 12, lineHeight: 17, marginTop: 5 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  name: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  meta: { color: colors.slate, fontSize: 11.5, marginTop: 1 },
  metaWarn: { color: colors.orange, fontSize: 11.5, fontWeight: '700', marginTop: 6 },
  subhead: { color: colors.slateDark, fontSize: 11.5, fontWeight: '700', marginTop: 10 },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  chipGreen: { backgroundColor: colors.greenPale },
  chipRed: { backgroundColor: colors.redLight },
  chipText: { fontSize: 10.5, fontWeight: '800', textTransform: 'capitalize' },
  courseChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  courseChip: { backgroundColor: colors.blueChip, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '100%' },
  courseChipText: { color: colors.blue, fontSize: 11, fontWeight: '700' },

  matchBox: { backgroundColor: colors.bgSofter, borderRadius: 10, padding: 10, marginTop: 10 },
  matchText: { color: colors.navy, fontSize: 12.5, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  actionBtn: { marginTop: 12, backgroundColor: colors.blueLight, borderRadius: 9, paddingVertical: 10 },
  actionText: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },
  deleteBtn: { marginTop: 12, backgroundColor: colors.redLight, borderRadius: 9, paddingVertical: 10 },
  deleteText: { color: colors.redStrong, fontSize: 12.5, fontWeight: '800' },
  addBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 12, marginBottom: 12 },
  addText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 18, maxHeight: '90%' },
  sheetTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  sheetSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  fLabel: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.slateDark, fontSize: 13.5, fontWeight: '800' },
  saveBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { backgroundColor: colors.redStrong },
  saveText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
});

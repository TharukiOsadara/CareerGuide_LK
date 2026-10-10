import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../Components/BackButton';
import Icon, { IconText } from '../../Components/Icon';
import Field from '../../Components/Field';
import FieldError from '../../Components/FieldError';
import { collectErrors, hasErrors, validateEmail } from '../../utils/validation';

// Admin: parent <-> child links (create, view, change relationship, remove).
const RELATIONSHIPS = [
  { key: 'mother', label: 'Mother' },
  { key: 'father', label: 'Father' },
  { key: 'guardian', label: 'Guardian' },
];
const relLabel = (k) => RELATIONSHIPS.find((r) => r.key === k)?.label || k;

export default function AdminFamilies({ navigation }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | { isNew } | link
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { links: list } = await api('/api/admin/family-links');
      setLinks(list || []);
    } catch (e) {
      setError(e.message || 'Could not load parent links.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => links.filter((l) => !q
    || `${l.parentName} ${l.parentEmail} ${l.studentName} ${l.studentEmail}`.toLowerCase().includes(q)), [links, q]);
  const parentCount = new Set(links.map((l) => l.parentId)).size;
  const childCount = new Set(links.map((l) => l.studentId)).size;

  const save = async (form) => {
    if (editing.isNew) {
      const res = await api('/api/admin/family-links', { method: 'POST', body: form });
      setNotice(res.message);
    } else {
      const res = await api(`/api/admin/family-links/${editing.id}`, { method: 'PUT', body: { relationship: form.relationship } });
      setNotice(res.message);
    }
    setEditing(null);
    await load();
  };

  const remove = async () => {
    const l = confirmRemove;
    setConfirmRemove(null);
    try {
      await api(`/api/admin/family-links/${l.id}`, { method: 'DELETE' });
      setNotice(`${l.parentName} is no longer linked to ${l.studentName}.`);
      await load();
    } catch (e) {
      setError(e.message || 'Could not remove the link.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle} numberOfLines={1}>Parents & Children</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.blue]} />}
      >
        <View style={styles.stats}>
          <Stat value={links.length} label="Links" />
          <Stat value={parentCount} label="Parents linked" />
          <Stat value={childCount} label="Children linked" />
        </View>

        <Pressable onPress={() => setEditing({ isNew: true })} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <IconText icon="plus" size={15} color={colors.white} center textStyle={styles.addText}>Link a parent to a student</IconText>
        </Pressable>

        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.slate400} />
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search parent or student…" placeholderTextColor={colors.slate400} autoCapitalize="none"
          />
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} /> : null}
        {!loading && shown.length === 0 ? <Text style={styles.empty}>No parent-child links found.</Text> : null}
        {shown.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.pair}>
              <Person icon="user" tint={colors.blue} title={l.parentName} sub={l.parentEmail} />
              <View style={styles.relPill}><Text style={styles.relPillText}>{relLabel(l.relationship)} of</Text></View>
              <Person icon="graduation-cap" tint={colors.teal} title={l.studentName} sub={l.studentEmail} />
            </View>
            <IconText icon="user-cog" size={13} color={colors.slate} style={{ marginTop: 10 }} textStyle={styles.meta}>
              {l.counsellorName ? `Child's counsellor: ${l.counsellorName}` : 'No counsellor yet'}
            </IconText>
            <View style={styles.btnRow}>
              <Pressable onPress={() => setEditing(l)} style={({ pressed }) => [styles.actionBtn, styles.half, pressed && styles.pressed]}>
                <IconText icon="edit" size={14} color={colors.blue} center textStyle={styles.actionText}>Edit</IconText>
              </Pressable>
              <Pressable onPress={() => setConfirmRemove(l)} style={({ pressed }) => [styles.deleteBtn, styles.half, pressed && styles.pressed]}>
                <IconText icon="trash" size={14} color={colors.redStrong} center textStyle={styles.deleteText}>Remove</IconText>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <LinkModal data={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal visible={!!confirmRemove} transparent animationType="fade" onRequestClose={() => setConfirmRemove(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Remove link?</Text>
            <Text style={styles.sheetSub}>
              {confirmRemove ? `${confirmRemove.parentName} will no longer see ${confirmRemove.studentName}'s progress in the Parent Portal. Their privacy choices for this child are removed too.` : ''}
            </Text>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setConfirmRemove(null)} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={remove} style={({ pressed }) => [styles.saveBtn, styles.dangerBtn, pressed && styles.pressed]}>
                <Text style={styles.saveText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Person({ icon, tint, title, sub }) {
  return (
    <View style={styles.person}>
      <Icon name={icon} size={16} color={tint} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.name} numberOfLines={1}>{title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

function LinkModal({ data, onClose, onSave }) {
  const [parentEmail, setParentEmail] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [relationship, setRelationship] = useState('guardian');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setParentEmail(data.parentEmail || '');
    setStudentEmail(data.studentEmail || '');
    setRelationship(data.relationship || 'guardian');
    setErrors({}); setError('');
  }, [data]);

  if (!data) return null;
  const isNew = !!data.isNew;

  const save = async () => {
    setError('');
    if (isNew) {
      const errs = collectErrors({
        parentEmail: validateEmail(parentEmail, 'Parent email'),
        studentEmail: validateEmail(studentEmail, 'Student email')
          || (studentEmail.trim().toLowerCase() === parentEmail.trim().toLowerCase() ? 'Parent and student must be different accounts.' : ''),
      });
      setErrors(errs);
      if (hasErrors(errs)) return;
    }
    setBusy(true);
    try {
      await onSave({ parentEmail: parentEmail.trim(), studentEmail: studentEmail.trim(), relationship });
    } catch (e) {
      setError(e.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{isNew ? 'Link a parent to a student' : 'Edit link'}</Text>
          {isNew ? (
            <>
              <Field label="Parent email" icon="user" value={parentEmail} onChangeText={(v) => { setParentEmail(v); setErrors((e) => ({ ...e, parentEmail: '' })); }}
                placeholder="parent@example.com" keyboardType="email-address" maxLength={254} error={errors.parentEmail} />
              <Field label="Student email" icon="graduation-cap" value={studentEmail} onChangeText={(v) => { setStudentEmail(v); setErrors((e) => ({ ...e, studentEmail: '' })); }}
                placeholder="student@example.com" keyboardType="email-address" maxLength={254} error={errors.studentEmail} />
            </>
          ) : (
            <Text style={styles.sheetSub}>{data.parentName} → {data.studentName}</Text>
          )}
          <Text style={styles.fLabel}>Relationship</Text>
          <View style={styles.relRow}>
            {RELATIONSHIPS.map((r) => {
              const on = relationship === r.key;
              return (
                <Pressable key={r.key} onPress={() => setRelationship(r.key)} style={[styles.relChip, on && styles.relChipOn]}>
                  <Text style={[styles.relText, on && styles.relTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={error} />
          <View style={styles.modalBtns}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={save} style={({ pressed }) => [styles.saveBtn, (pressed || busy) && styles.pressed]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{isNew ? 'Create link' : 'Save'}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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

  addBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 12, marginTop: 14 },
  addText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginTop: 12, marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  notice: { color: colors.greenDark, backgroundColor: colors.greenPale, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  error: { color: colors.redStrong, backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  empty: { color: colors.slate, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  pair: { gap: 6 },
  person: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSofter, borderRadius: 9, padding: 10 },
  relPill: { alignSelf: 'center', backgroundColor: colors.blueChip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  relPillText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  name: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.slate, fontSize: 11.5 },

  btnRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  actionBtn: { marginTop: 12, backgroundColor: colors.blueLight, borderRadius: 9, paddingVertical: 10 },
  actionText: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },
  deleteBtn: { marginTop: 12, backgroundColor: colors.redLight, borderRadius: 9, paddingVertical: 10 },
  deleteText: { color: colors.redStrong, fontSize: 12.5, fontWeight: '800' },
  pressed: { opacity: 0.8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 18 },
  sheetTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  sheetSub: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  fLabel: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  relRow: { flexDirection: 'row', gap: 8 },
  relChip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  relChipOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  relText: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700' },
  relTextOn: { color: colors.blue, fontWeight: '800' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.slateDark, fontSize: 13.5, fontWeight: '800' },
  saveBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { backgroundColor: colors.redStrong },
  saveText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
});

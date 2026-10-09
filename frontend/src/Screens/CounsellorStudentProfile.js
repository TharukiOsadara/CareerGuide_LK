import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { counsellorApi } from '../counsellor/api';
import { colors } from './Parent/theme';
import Button from './Parent/components/Button';
import Chip from './Parent/components/Chip';
import { EmptyState, ErrorState } from './Parent/components/StateViews';
import { useToast } from './Parent/components/Toast';
import Icon from '../components/Icon';

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Combined Mathematics', 'ICT', 'Accounting', 'Economics', 'Business Studies', 'Other'];
const GRADES = ['A', 'B', 'C', 'S', 'F'];
const field = (value) => value == null ? '' : String(value);

export default function CounsellorStudentProfile({ route, navigation }) {
  const studentId = route?.params?.studentId;
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    if (!studentId) { setError('No student was selected.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { setProfile(await counsellorApi.studentProfile(studentId)); }
    catch (e) { setError(e.message || 'Unable to load student profile.'); }
    finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const student = profile?.student || {};
  const academic = profile?.academicProfile || {};
  const guidance = profile?.guidance;
  const beginEdit = () => {
    const existing = academic.subjectGrades || [];
    setForm({ fullName: student.name || '', grade: field(student.grade), stream: academic.subjectStream || student.stream || '', district: academic.district || '', zScore: field(academic.zScore ?? student.zScore), subjects: Array.from({ length: 3 }, (_, i) => ({ subject: existing[i]?.subject || '', grade: existing[i]?.grade || '' })) });
    setEditOpen(true);
  };
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateSubject = (index, key, value) => setForm((current) => ({ ...current, subjects: current.subjects.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  const saveProfile = async () => {
    if (!form.fullName?.trim() || !form.grade?.trim() || !form.stream?.trim() || !form.district?.trim() || !form.zScore?.trim()) { toast({ title: 'Check required fields', message: 'Name, grade, stream, district and Z-score are required.', type: 'error' }); return; }
    const z = form.zScore === '' ? null : Number(form.zScore);
    if (z !== null && (!Number.isFinite(z) || z < 0 || z > 4)) { toast({ title: 'Invalid Z-score', message: 'Enter a value from 0 to 4.', type: 'error' }); return; }
    const subjects = form.subjects.filter((x) => x.subject && x.grade);
    if (subjects.length !== 3 || subjects.some((x) => !GRADES.includes(x.grade))) { toast({ title: 'Check subject grades', message: 'Choose a subject and A, B, C, S or F for all three rows.', type: 'error' }); return; }
    setSaving(true);
    try { await counsellorApi.updateStudentProfile(studentId, { fullName: form.fullName.trim(), grade: form.grade.trim(), stream: form.stream.trim(), district: form.district.trim(), zScore: z, subjectGrades: subjects }); setEditOpen(false); toast({ title: 'Profile updated', message: 'The student has been notified.' }); await load(); }
    catch (e) { toast({ title: 'Could not update profile', message: e.message, type: 'error' }); }
    finally { setSaving(false); }
  };
  const deleteProfile = () => Alert.alert('Remove student profile?', `This will deactivate the profile for ${student.name || 'this student'} and remove optional academic details. Their login account will remain active.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Deactivate profile', style: 'destructive', onPress: async () => { setDeleting(true); try { await counsellorApi.deactivateStudentProfile(studentId); setProfile((p) => ({ ...p, profileDeactivated: true, academicProfile: null })); toast({ title: 'Profile removed', message: 'The student has been notified.' }); } catch (e) { toast({ title: 'Could not remove profile', message: e.message, type: 'error' }); } finally { setDeleting(false); } } }]);

  if (loading) return <SafeAreaView style={s.screen}><ActivityIndicator style={{ marginTop: 48 }} size="large" color={colors.blue} /></SafeAreaView>;
  if (error || !profile) return <SafeAreaView style={s.screen}><ErrorState error={{ message: error || 'No student profile was returned.' }} onRetry={load} /><Button label="Back" variant="outline" onPress={() => navigation.goBack()} /></SafeAreaView>;
  const initials = student.initials || student.name?.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
  const consented = profile.assessment?.access !== 'not_shared';
  const guidanceLabel = guidance?.guidanceStatus === 'final' ? 'Guidance final' : guidance ? 'Guidance draft' : 'No guidance';

  return <SafeAreaView style={s.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={s.back}><Icon name="chevron-left" size={20} color={colors.blue} /><Text style={s.backText}>Back</Text></Pressable>
        <View style={s.hero}>
          {student.profilePicture ? <Image source={{ uri: student.profilePicture }} style={s.avatar} /> : <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>}
          <Text style={s.name}>{student.name || 'Student'}</Text><Text style={s.email}>{student.email || 'Email not recorded'}</Text>
          <View style={s.chips}><Chip label={student.accountStatus || 'Active'} tone={student.accountStatus === 'active' ? 'success' : 'neutral'} /><Chip label={guidanceLabel} tone={guidance?.guidanceStatus === 'final' ? 'success' : guidance ? 'warn' : 'neutral'} /></View>
          <Text style={s.meta}>Grade {student.grade || 'Not recorded'}  ·  {academic.subjectStream || student.stream || 'Stream not recorded'}</Text>
          <Text style={s.meta}>Index number: {student.indexNo || 'Not recorded'}  ·  {academic.district || 'District not recorded'}</Text>
          <View style={s.actions}><Button label="Edit profile" icon="edit" onPress={beginEdit} disabled={profile.profileDeactivated} style={{ flex: 1 }} /><Button label="Delete profile" icon="trash" variant="danger" onPress={deleteProfile} busy={deleting} disabled={profile.profileDeactivated} style={{ flex: 1 }} /></View>
        </View>
        {profile.profileDeactivated ? <View style={s.banner}><Text style={s.bannerText}>This profile has been deactivated. The student's login account remains active.</Text></View> : null}
        <View style={s.actions}><Button label="Guidance" icon="clipboard" variant="outline" onPress={() => navigation.navigate('CounsellorGuidanceForm', { studentId })} style={{ flex: 1 }} /><Button label="Follow-up" icon="message" variant="secondary" onPress={() => navigation.navigate('CounsellorInquiries', { studentId })} style={{ flex: 1 }} /></View>
        <Card title="Academic Profile">
          <Info label="Stream" value={academic.subjectStream || student.stream} /><Info label="District" value={academic.district} /><Info label="Z-score" value={academic.zScore ?? student.zScore} />
          <Text style={s.subheading}>Subject grades</Text>
          {(academic.subjectGrades || []).length ? academic.subjectGrades.map((item, i) => <View style={s.gradeRow} key={`${item.subject}-${i}`}><Text style={s.body}>{item.subject}</Text><Chip label={item.grade} tone="info" /></View>) : <Text style={s.muted}>No subject grades recorded.</Text>}
        </Card>
        <Card title="Quiz and Assessment Summary">
          {!consented ? <Text style={s.muted}>{profile.assessment?.message || 'The student has not shared assessment results with counsellors.'}</Text> : profile.assessment?.scores?.length ? profile.assessment.scores.map((score) => <View key={score.area} style={s.gradeRow}><Text style={s.body}>{score.area}</Text><Text style={s.body}>{score.percent}%</Text></View>) : <EmptyState compact title="No assessment results" message="No shared quiz results are available." />}
        </Card>
        <Card title="Guidance">
          <Text style={s.body}>{guidance?.assessmentSummary || 'No guidance summary has been saved.'}</Text>
          {guidance?.recommendedPathways?.map((path) => <Text style={s.path} key={path}>• {path}</Text>)}
        </Card>
        <Card title="Student Inquiries">
          {profile.inquiries?.length ? profile.inquiries.map((item) => <View key={item.id} style={s.inquiry}><Text style={s.subheading}>{item.subject || 'Course inquiry'}</Text><Text style={s.muted}>{item.courseTitle || 'Course not recorded'}</Text><Text style={s.muted}>{item.replyMessage ? 'Reply sent' : 'Awaiting reply'}</Text></View>) : <Text style={s.muted}>No inquiries recorded.</Text>}
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
      <SafeAreaView style={s.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>Edit student profile</Text>
          <FormField label="Full name *" value={form.fullName} onChangeText={(v) => setValue('fullName', v)} />
          <FormField label="Grade *" value={form.grade} onChangeText={(v) => setValue('grade', v)} />
          <FormField label="Stream *" value={form.stream} onChangeText={(v) => setValue('stream', v)} />
          <FormField label="District *" value={form.district} onChangeText={(v) => setValue('district', v)} />
          <FormField label="Z-score (0–4) *" value={form.zScore} onChangeText={(v) => setValue('zScore', v)} keyboardType="decimal-pad" />
          <Text style={s.subheading}>Subject grades (3 required)</Text>
          {(form.subjects || []).map((item, i) => <View style={s.subjectInputRow} key={i}><TextInput style={[s.input, { flex: 2 }]} value={item.subject} onChangeText={(v) => updateSubject(i, 'subject', v)} placeholder={`Subject ${i + 1}`} /><TextInput style={[s.input, { flex: 1 }]} value={item.grade} onChangeText={(v) => updateSubject(i, 'grade', v.toUpperCase())} placeholder="A/B/C/S/F" maxLength={1} autoCapitalize="characters" /></View>)}
          <View style={s.actions}><Button label="Cancel" variant="secondary" onPress={() => setEditOpen(false)} style={{ flex: 1 }} /><Button label="Save changes" onPress={saveProfile} busy={saving} style={{ flex: 1 }} /></View>
        </ScrollView>
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

function Card({ title, children }) { return <View style={s.card}><Text style={s.cardTitle}>{title}</Text>{children}</View>; }
function Info({ label, value }) { return <View style={s.info}><Text style={s.muted}>{label}</Text><Text style={s.body}>{value == null || value === '' ? 'Not recorded' : String(value)}</Text></View>; }
function FormField({ label, ...props }) { return <View style={{ marginTop: 14 }}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} /></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background || '#F6F8FC' }, content: { padding: 16, paddingBottom: 36 }, back: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, backText: { color: colors.blue, fontWeight: '700' },
  hero: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: colors.border }, avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' }, initials: { color: colors.blue, fontSize: 24, fontWeight: '800' }, name: { color: colors.navy, fontSize: 22, fontWeight: '800', marginTop: 10 }, email: { color: colors.muted, marginTop: 3 }, chips: { flexDirection: 'row', gap: 8, marginTop: 12 }, meta: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 12 }, cardTitle: { color: colors.navy, fontWeight: '800', fontSize: 17, marginBottom: 12 }, title: { color: colors.navy, fontWeight: '800', fontSize: 22 }, subheading: { color: colors.navy, fontWeight: '700', marginTop: 10, marginBottom: 4 }, body: { color: colors.navy, fontSize: 14, lineHeight: 21 }, muted: { color: colors.muted, fontSize: 13, lineHeight: 20 }, info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }, gradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, path: { color: colors.navy, marginTop: 8 }, inquiry: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 10 }, banner: { padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', marginBottom: 8 }, bannerText: { color: '#9A3412', fontWeight: '600' }, label: { color: colors.navy, fontWeight: '700', marginBottom: 6 }, input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, color: colors.navy, backgroundColor: colors.white }, subjectInputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
});

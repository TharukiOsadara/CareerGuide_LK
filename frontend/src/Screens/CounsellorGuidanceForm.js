import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useToast } from './Parent/components/Toast';
import Button from './Parent/components/Button';
import Chip from './Parent/components/Chip';
import { EmptyState, ErrorState } from './Parent/components/StateViews';
import ParentHeader from './Parent/components/ParentHeader';
import { counsellorApi } from '../counsellor/api';
import { colors, font, radius, space } from './Parent/theme';

const PATHWAYS = ['Software Engineering', 'Data Science & AI', 'Information Technology'];

export default function CounsellorGuidanceForm({ route, navigation }) {
  const { studentId } = route.params || {};
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [summary, setSummary] = useState('');
  const [pathways, setPathways] = useState([]);
  const [guidanceId, setGuidanceId] = useState(null);
  const [guidanceStatus, setGuidanceStatus] = useState('draft');
  const [reviewedAt, setReviewedAt] = useState(null);
  const [sharedWithParent, setSharedWithParent] = useState(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const filteredAssignedStudents = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return assignedStudents;
    return assignedStudents.filter((item) => `${item.name || ''} ${item.stream || ''} ${item.courseTitle || ''}`.toLowerCase().includes(query));
  }, [assignedStudents, pickerSearch]);

  useEffect(() => {
    if (!studentId) {
      (async () => {
        try {
          const [response, inquiryResponse] = await Promise.all([
            counsellorApi.students(),
            counsellorApi.inquiries().catch(() => ({ inquiries: [] })),
          ]);
          const courseByStudent = {};
          (inquiryResponse.inquiries || []).forEach((inquiry) => {
            if (inquiry.studentId && inquiry.courseTitle && !courseByStudent[inquiry.studentId]) {
              courseByStudent[inquiry.studentId] = inquiry.courseTitle;
            }
          });
          setAssignedStudents((response.students || []).map((item) => ({ ...item, courseTitle: courseByStudent[item.id] })));
        } catch (loadError) {
          setError(loadError.message);
          toast({ title: 'Could not load students', message: loadError.message, type: 'error' });
        } finally {
          setReady(true);
        }
      })();
      return undefined;
    }
    (async () => {
      try {
        const [profile, guidanceResponse] = await Promise.all([
          counsellorApi.student(studentId),
          counsellorApi.guidance(studentId),
        ]);
        const guidance = guidanceResponse.guidance;
        setStudent({ ...profile.student, courseTitle: profile.inquiries?.[0]?.courseTitle || profile.student.courseTitle });
        setAssessment(profile.assessment);
        setGuidanceId(guidance?.id || null);
        setSummary(guidance?.assessmentSummary || '');
        setPathways(guidance?.recommendedPathways || []);
        setGuidanceStatus(guidance?.guidanceStatus || 'draft');
        setReviewedAt(guidance?.reviewedAt || null);
        setSharedWithParent(guidance?.sharedWithParent === true);
      } catch (loadError) {
        setError(loadError.message);
        toast({ title: 'Could not load guidance', message: loadError.message, type: 'error' });
      } finally {
        setReady(true);
      }
    })();
  }, [studentId, toast]);

  useEffect(() => {
    if (!ready || !dirty || !studentId) return undefined;
    const timer = setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      setError('');
      try {
        if (guidanceStatus === 'final') return;
        const response = await counsellorApi.saveGuidance(studentId, {
          assessmentSummary: summary,
          recommendedPathways: pathways,
          sharedWithParent,
          guidanceStatus: 'draft',
        }, guidanceId ? 'PUT' : 'POST');
        setGuidanceId(response.guidance.id);
        setDirty(false);
        setSaved(true);
        toast({ title: 'Draft saved', message: 'Your changes were saved automatically.' });
      } catch (saveError) {
        setError(saveError.message);
        toast({ title: 'Autosave failed', message: saveError.message, type: 'error' });
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [ready, dirty, summary, pathways, sharedWithParent, guidanceId, guidanceStatus, studentId, toast]);

  const togglePathway = (pathway) => {
    setPathways((current) => current.includes(pathway)
      ? current.filter((item) => item !== pathway)
      : [...current, pathway]);
    setDirty(true);
  };

  const save = async (status) => {
    if (!studentId) {
      toast({ title: 'Select a student first', message: 'Choose an assigned student before saving.', type: 'error' });
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await counsellorApi.saveGuidance(studentId, {
        assessmentSummary: summary,
        recommendedPathways: pathways,
        sharedWithParent,
        guidanceStatus: status,
      }, guidanceId ? 'PUT' : 'POST');
      setGuidanceId(response.guidance.id);
      setGuidanceStatus(response.guidance.guidanceStatus);
      setReviewedAt(response.guidance.reviewedAt || null);
      setSharedWithParent(response.guidance.sharedWithParent === true);
      setDirty(false);
      setSaved(status === 'draft');
      toast({
        title: status === 'final' ? 'Guidance saved as Final' : 'Draft saved',
        message: status === 'final' ? 'This guidance is now read-only.' : 'Your draft has been saved.',
      });
    } catch (saveError) {
      setError(saveError.message);
      toast({ title: status === 'final' ? 'Could not save final guidance' : 'Could not save draft', message: saveError.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!studentId || !guidanceId) {
      toast({ title: 'Save guidance first', message: 'A guidance record is needed before it can be reviewed.', type: 'error' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await counsellorApi.markReviewed(studentId);
      setGuidanceStatus(response.guidance.guidanceStatus);
      setReviewedAt(response.guidance.reviewedAt || new Date().toISOString());
      setSharedWithParent(response.guidance.sharedWithParent === true);
      setGuidanceId(response.guidance.id);
      setDirty(false);
      setSaved(false);
      toast({ title: 'Guidance marked as reviewed', message: 'The review status has been updated.' });
    } catch (reviewError) {
      setError(reviewError.message);
      toast({ title: 'Could not mark as reviewed', message: reviewError.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateSharing = async (value) => {
    const previous = sharedWithParent;
    setSharedWithParent(value);
    setError('');
    if (!studentId) {
      setSharedWithParent(previous);
      toast({ title: 'Select a student first', message: 'Choose an assigned student before changing sharing.', type: 'error' });
      return;
    }
    if (!guidanceId || guidanceStatus !== 'final') {
      setDirty(true);
      toast({ title: value ? 'Parent sharing selected' : 'Parent sharing turned off', message: 'This preference will be saved with the draft.' });
      return;
    }
    setSaving(true);
    try {
      const response = await counsellorApi.saveGuidance(studentId, { sharedWithParent: value }, 'PUT');
      setSharedWithParent(response.guidance.sharedWithParent === true);
      toast({ title: 'Sharing preference updated', message: 'Parent sharing was updated.' });
    } catch (shareError) {
      setSharedWithParent(previous);
      setError(shareError.message);
      toast({ title: 'Could not update sharing', message: shareError.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGuidance = () => Alert.alert('Delete draft guidance?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel', onPress: () => toast({ title: 'Deletion cancelled', type: 'info' }) },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      setSaving(true);
      try {
        await counsellorApi.deleteGuidanceRecord(guidanceId);
        toast({ title: 'Draft deleted', message: 'The guidance draft was removed.' });
        navigation.goBack();
      } catch (deleteError) {
        setError(deleteError.message);
        toast({ title: 'Could not delete draft', message: deleteError.message, type: 'error' });
      } finally {
        setSaving(false);
      }
    } },
  ]);

  if (!ready) return <SafeAreaView style={page.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /></SafeAreaView>;

  if (!studentId) {
    return (
      <SafeAreaView style={page.screen}>
        <ParentHeader title="Guidance" showChild={false} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={page.content} keyboardShouldPersistTaps="handled">
          <View style={page.intro}>
            <Text style={page.heading}>Select a student to start</Text>
            <Text style={page.subtitle}>Choose a student to view or write guidance.</Text>
          </View>
          {error ? <ErrorState error={{ message: error }} /> : null}
          <TextInput
            value={pickerSearch}
            onChangeText={setPickerSearch}
            placeholder="Search students by name or course"
            placeholderTextColor={colors.muted}
            style={page.search}
            returnKeyType="search"
          />
          {filteredAssignedStudents.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [page.studentCard, pressed && page.pressed]}
              onPress={() => navigation.replace('CounsellorGuidanceForm', { studentId: item.id })}
            >
              <View style={page.studentTop}>
                <View style={page.studentAvatar}><Text style={page.avatarText}>{item.initials || item.name?.slice(0, 1) || '?'}</Text></View>
                <View style={page.studentCopy}>
                  <Text style={page.studentName}>{item.name}</Text>
                  <Text style={page.course}>{item.courseTitle || item.course || 'Course not recorded'}</Text>
                </View>
                <Text style={page.chevron}>›</Text>
              </View>
            </Pressable>
          ))}
          {!error && !filteredAssignedStudents.length ? <EmptyState title="No students found" message={assignedStudents.length ? 'Try a different search.' : 'No assigned students are available.'} /> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={page.screen}>
        <ParentHeader title="Guidance" showChild={false} onBack={() => navigation.goBack()} />
        <ErrorState error={{ message: error || 'Student details are unavailable.' }} />
        <Button label="Select a student to start" variant="outline" onPress={() => navigation.replace('CounsellorGuidanceForm')} style={page.retryButton} />
      </SafeAreaView>
    );
  }

  const isFinal = guidanceStatus === 'final';

  return (
    <SafeAreaView style={page.screen}>
      <ParentHeader title="Guidance" showChild={false} onBack={() => navigation.goBack()} right={(
        <Pressable accessibilityRole="button" onPress={() => navigation.replace('CounsellorGuidanceForm')} style={page.changeStudent}>
          <Text style={page.changeStudentText}>Change student</Text>
        </Pressable>
      )} />
      <KeyboardAvoidingView style={page.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView contentContainerStyle={page.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? <View style={page.errorBanner}><Text style={page.errorText}>{error}</Text></View> : null}
          <View style={page.titleRow}>
            <View style={page.flex}><Text style={page.heading}>{student.name}</Text><Text style={page.subtitle}>Counsellor guidance record</Text></View>
            <Chip label={isFinal ? 'Final' : guidanceId ? 'Draft' : 'Not started'} tone={isFinal ? 'success' : guidanceId ? 'warn' : 'neutral'} />
          </View>
          {isFinal ? <View style={page.readOnly}><Text style={page.readOnlyTitle}>Read-only guidance</Text><Text style={page.readOnlyText}>This guidance is final and can no longer be edited.</Text></View> : null}

          <View style={page.card}>
            <Text style={page.cardTitle}>Student summary</Text>
            <Text style={page.summaryLine}>Course: {student.courseTitle || student.course || 'Not recorded'}</Text>
            {assessment?.access === 'not_shared'
              ? <Text style={page.notice}>{assessment.message || 'Assessment data has not been shared with the assigned counsellor.'}</Text>
              : <Text style={page.summaryLine}>Assessment data is available for counsellor decision support.</Text>}
          </View>

          <View style={page.card}>
            <View style={page.titleRow}><Text style={page.cardTitle}>Assessment Summary</Text><Text style={page.counter}>{summary.length}/4000</Text></View>
            <TextInput
              multiline
              maxLength={4000}
              value={summary}
              onChangeText={(value) => { setSummary(value); setDirty(true); setError(''); }}
              editable={!isFinal && !saving}
              placeholder="Summarize the student's aptitude, strengths and guidance notes..."
              placeholderTextColor={colors.muted}
              style={[page.input, isFinal && page.inputLocked]}
              textAlignVertical="top"
              accessibilityLabel="Assessment Summary"
            />
          </View>

          <View style={page.card}>
            <Text style={page.cardTitle}>Recommended Pathway</Text>
            <Text style={page.help}>Select all pathways that fit this student.</Text>
            {PATHWAYS.map((pathway) => {
              const selected = pathways.includes(pathway);
              return (
                <Pressable
                  key={pathway}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: isFinal || saving }}
                  disabled={isFinal || saving}
                  style={({ pressed }) => [page.pathway, selected && page.pathwaySelected, pressed && !isFinal && page.pressed]}
                  onPress={() => togglePathway(pathway)}
                >
                  <Text style={[page.pathwayCheck, selected && page.pathwayCheckSelected]}>{selected ? '✓' : ''}</Text>
                  <Text style={[page.pathwayText, selected && page.pathwayTextSelected]}>{pathway}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={page.card}>
            <View style={page.titleRow}>
              <View style={page.flex}><Text style={page.cardTitle}>Share with Parent</Text><Text style={page.help}>Requires the student's privacy consent.</Text></View>
              <Switch value={sharedWithParent} onValueChange={updateSharing} disabled={saving || Boolean(reviewedAt)} trackColor={{ false: colors.border, true: colors.blue }} thumbColor={colors.white} />
            </View>
          </View>

          <View style={page.actions}>
            <Button label="Save Draft" onPress={() => save('draft')} disabled={isFinal} busy={saving} style={page.actionButton} />
            <Button label="Save Final" onPress={() => save('final')} disabled={isFinal} busy={saving} style={page.actionButton} />
          </View>
          <Button label={reviewedAt ? 'Reviewed' : dirty ? 'Save Draft Before Review' : 'Mark as Reviewed'} variant="secondary" onPress={markReviewed} disabled={!guidanceId || Boolean(reviewedAt) || dirty} busy={saving} style={page.fullButton} />
          <Button label={dirty ? 'Save Draft Before Delete' : 'Delete Draft'} variant="danger" onPress={deleteGuidance} disabled={!guidanceId || isFinal || dirty} busy={saving} style={page.fullButton} />
          <Text style={page.saveState}>{saving ? 'Saving changes…' : saved ? 'Draft saved' : dirty ? 'Unsaved changes' : ''}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const page = {
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 132 },
  intro: { marginBottom: space.md },
  heading: { color: colors.navy, fontSize: font.title, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: font.small, marginTop: space.xs },
  search: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, color: colors.navy, paddingHorizontal: space.md, marginBottom: space.md, fontSize: font.body },
  studentCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, marginBottom: space.sm },
  studentTop: { flexDirection: 'row', alignItems: 'center' },
  studentAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
  avatarText: { color: colors.blue, fontWeight: '800', fontSize: font.body },
  studentCopy: { flex: 1 },
  studentName: { color: colors.navy, fontWeight: '800', fontSize: font.body },
  course: { color: colors.muted, fontSize: font.small, marginTop: space.xs },
  chevron: { color: colors.blue, fontSize: 28, marginLeft: space.sm },
  pressed: { opacity: 0.72 },
  retryButton: { marginHorizontal: space.lg },
  changeStudent: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  changeStudentText: { color: colors.blue, fontSize: font.small, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.md },
  cardTitle: { color: colors.navy, fontSize: font.heading, fontWeight: '800' },
  summaryLine: { color: colors.slate600, fontSize: font.body, lineHeight: 22, marginTop: space.sm },
  notice: { color: colors.warnText, fontSize: font.body, lineHeight: 22, marginTop: space.sm },
  counter: { color: colors.muted, fontSize: font.small },
  input: { minHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white, padding: space.md, color: colors.navy, fontSize: font.body, lineHeight: 22 },
  inputLocked: { backgroundColor: colors.bgSofter, color: colors.muted },
  help: { color: colors.muted, fontSize: font.small, lineHeight: 19, marginTop: space.xs },
  pathway: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, marginTop: space.sm },
  pathwaySelected: { backgroundColor: colors.blueLight, borderColor: colors.blue },
  pathwayCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.slate400, color: colors.white, textAlign: 'center', textAlignVertical: 'center', marginRight: space.md },
  pathwayCheckSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  pathwayText: { color: colors.slateDark, fontSize: font.body, fontWeight: '600' },
  pathwayTextSelected: { color: colors.blue, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: space.sm },
  actionButton: { flex: 1 },
  fullButton: { marginTop: space.sm },
  saveState: { minHeight: 24, color: colors.muted, textAlign: 'center', fontSize: font.small, marginTop: space.md },
  readOnly: { backgroundColor: colors.blueLight, borderColor: colors.bluePaleBorder, borderWidth: 1, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  readOnlyTitle: { color: colors.blue, fontSize: font.body, fontWeight: '800' },
  readOnlyText: { color: colors.slateDark, fontSize: font.small, lineHeight: 19, marginTop: space.xs },
  errorBanner: { backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  errorText: { color: colors.danger, fontSize: font.small },
};

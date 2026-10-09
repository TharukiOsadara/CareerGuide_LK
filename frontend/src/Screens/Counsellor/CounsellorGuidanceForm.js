import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import { styles } from './styles';
import ProfileHeader from '../../components/ProfileHeader';

const PATHWAYS = [
  'Software Engineering', 'Biomedical Science', 'Data Science & AI',
  'Information Technology', 'Business Management', 'Marketing', 'Accounting & Finance',
  'International Relations', 'Mechanical Engineering', 'Medicine & Surgery',
];

// Alert buttons don't work in the browser build, so fall back to window.confirm there.
export function confirmAction(title, message, confirmLabel = 'Delete') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

const shortDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Guidance tab: every guidance record this counsellor has written (Read), with
// Edit (Update) and Delete, plus the assigned students who still need one (Create).
function GuidanceRecords({ navigation }) {
  const [records, setRecords] = useState([]);
  const [without, setWithout] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await counsellorApi.guidanceRecords();
      setRecords(response.records || []);
      setWithout(response.studentsWithout || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener?.('focus', load);
    return unsub;
  }, [navigation]);

  const remove = async (record) => {
    const ok = await confirmAction(
      'Delete guidance?',
      `This removes your ${record.guidanceStatus === 'final' ? 'final' : 'draft'} guidance for ${record.student.name}. You can write a new one afterwards.`
    );
    if (!ok) return;
    setBusyId(record.id);
    setError('');
    try {
      await counsellorApi.deleteGuidance(record.student.id);
      setNotice(`Guidance for ${record.student.name} deleted.`);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  };

  const open = (studentId) => navigation.push('CounsellorGuidanceForm', { studentId });

  return (
    <SafeAreaView style={styles.screen}>
      <ProfileHeader title="Career Guidance" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Guidance Records</Text>
        <Text style={styles.subtitle}>Create, update or delete the guidance you write for your students.</Text>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.muted, { color: colors.blue, marginTop: 10 }]}>{notice}</Text> : null}
        {loading && !records.length && !without.length ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.blue} /> : null}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Saved guidance ({records.length})</Text>
        {!loading && !records.length ? <Text style={styles.muted}>You haven't saved any guidance yet.</Text> : null}
        {records.map((record) => {
          const final = record.guidanceStatus === 'final';
          return (
            <View key={record.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.studentName}>{record.student.name}</Text>
                  <Text style={styles.muted}>{record.student.stream || 'Stream not recorded'} · Updated {shortDate(record.updatedAt)}</Text>
                </View>
                <View style={[styles.chip, final && styles.reviewedChip]}>
                  <Text style={[styles.chipText, final && styles.reviewedText]}>{final ? (record.reviewedAt ? 'REVIEWED' : 'FINAL') : 'DRAFT'}</Text>
                </View>
              </View>
              <Text style={[styles.muted, { color: colors.navy, marginTop: 8 }]} numberOfLines={2}>
                {record.assessmentSummary || 'No summary written yet.'}
              </Text>
              {record.recommendedPathways?.length ? (
                <Text style={styles.muted}>Pathways: {record.recommendedPathways.join(', ')}</Text>
              ) : null}
              <View style={styles.row}>
                <Pressable style={[styles.button, styles.flex, { marginRight: 6 }]} onPress={() => open(record.student.id)} disabled={busyId === record.id}>
                  <Text style={styles.buttonText}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.flex, { marginLeft: 6, backgroundColor: colors.redLight }]} onPress={() => remove(record)} disabled={busyId === record.id}>
                  <Text style={[styles.buttonText, { color: colors.redStrong }]}>{busyId === record.id ? 'Deleting...' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Students without guidance ({without.length})</Text>
        {!loading && !without.length ? <Text style={styles.muted}>Every assigned student has a guidance record.</Text> : null}
        {without.map((student) => (
          <View key={student.id} style={[styles.card, styles.row]}>
            <View style={styles.flex}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.muted}>{student.stream || 'Stream not recorded'}</Text>
            </View>
            <Pressable style={[styles.button, { marginTop: 0 }]} onPress={() => open(student.id)}>
              <Text style={styles.buttonText}>+ Create</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function CounsellorGuidanceForm({ route, navigation }) {
  const { studentId } = route.params || {};
  if (!studentId) return <GuidanceRecords navigation={navigation} />;
  return <GuidanceEditor studentId={studentId} navigation={navigation} />;
}

function GuidanceEditor({ studentId, navigation }) {
  const [student, setStudent] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [summary, setSummary] = useState('');
  const [pathways, setPathways] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [guidanceId, setGuidanceId] = useState(null);
  const [guidanceStatus, setGuidanceStatus] = useState('draft');
  const [sharedWithParent, setSharedWithParent] = useState(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [profile, guidanceResponse] = await Promise.all([
          counsellorApi.student(studentId),
          counsellorApi.guidance(studentId),
        ]);
        const guidance = guidanceResponse.guidance;
        setStudent(profile.student);
        setAssessment(profile.assessment);
        setGuidanceId(guidance?.id || null);
        setSummary(guidance?.assessmentSummary || '');
        setPathways(guidance?.recommendedPathways || []);
        setSuggestions(guidanceResponse.suggestedPathways || []);
        setGuidanceStatus(guidance?.guidanceStatus || 'draft');
        setSharedWithParent(guidance?.sharedWithParent === true);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setReady(true);
      }
    })();
  }, [studentId]);

  useEffect(() => {
    if (!ready || !dirty) return undefined;
    const timer = setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      try {
        if (guidanceStatus === 'final') return; // final records save with the Update button
        const response = await counsellorApi.saveGuidance(studentId, {
          assessmentSummary: summary,
          recommendedPathways: pathways,
          sharedWithParent,
          guidanceStatus: 'draft',
        }, guidanceId ? 'PUT' : 'POST');
        setGuidanceId(response.guidance.id);
        setDirty(false);
        setSaved(true);
      } catch (saveError) {
        setError(saveError.message);
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [ready, dirty, summary, pathways, sharedWithParent, guidanceId, guidanceStatus, studentId]);

  const togglePathway = (pathway) => {
    setPathways((current) => current.includes(pathway)
      ? current.filter((item) => item !== pathway)
      : [...current, pathway]);
    setDirty(true);
  };

  const save = async (status) => {
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
      setSharedWithParent(response.guidance.sharedWithParent === true);
      setDirty(false);
      setSaved(status === 'draft');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await counsellorApi.markReviewed(studentId);
      setGuidanceStatus(response.guidance.guidanceStatus);
      setSharedWithParent(response.guidance.sharedWithParent === true);
      setGuidanceId(response.guidance.id);
      setDirty(false);
      setSaved(false);
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGuidance = async () => {
    if (!guidanceId) return;
    const ok = await confirmAction(
      'Delete guidance?',
      `This removes your ${guidanceStatus === 'final' ? 'final' : 'draft'} guidance for ${student?.name || 'this student'}.`
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await counsellorApi.deleteGuidance(studentId);
      setGuidanceId(null); setSummary(''); setPathways([]); setGuidanceStatus('draft'); setSharedWithParent(false);
      setDirty(false); setSaved(false);
      if (navigation.canGoBack()) navigation.goBack(); else navigation.replace('CounsellorGuidanceForm');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const updateSharing = async (value) => {
    const previous = sharedWithParent;
    setSharedWithParent(value);
    setError('');
    if (!guidanceId || guidanceStatus !== 'final') {
      setDirty(true);
      return;
    }
    try {
      const response = await counsellorApi.saveGuidance(studentId, { sharedWithParent: value }, 'PUT');
      setSharedWithParent(response.guidance.sharedWithParent === true);
    } catch (shareError) {
      setSharedWithParent(previous);
      setError(shareError.message);
    }
  };

  if (!ready) return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <ProfileHeader title="Career Guidance" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <View style={styles.flex}><Text style={styles.heading}>Guidance Form</Text><Text style={styles.subtitle}>{student?.name}</Text></View>
          <Text style={styles.muted}>{saving ? 'Saving...' : saved ? 'Draft Saved' : ''}</Text>
        </View>
        {studentId ? (
          <Pressable
            style={[styles.button, styles.secondaryButton, { marginTop: 0, marginBottom: 12 }]}
            onPress={() => navigation.push('CounsellorGuidanceForm')}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>All Guidance Records</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.title}>Student summary</Text>
          {assessment?.access === 'not_shared' ? (
            <Text style={styles.error}>Not Shared: {assessment.message}</Text>
          ) : (
            <Text style={styles.muted}>
              Assessment data is available for counsellor decision support.
            </Text>
          )}
        </View>

        <View style={[styles.row, styles.card, { marginBottom: 12 }]}>
          <View style={styles.flex}>
            <Text style={styles.title}>Guidance Status</Text>
            <Text style={styles.muted}>{guidanceStatus === 'final' ? 'Final' : 'Draft'}</Text>
          </View>
          <View style={[styles.chip, guidanceStatus === 'final' ? styles.reviewedChip : null]}>
            <Text style={[styles.chipText, guidanceStatus === 'final' ? styles.reviewedText : null]}>
              {guidanceStatus === 'final' ? 'FINAL' : 'DRAFT'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Assessment Summary</Text>
        <TextInput
          multiline
          value={summary}
          onChangeText={(value) => { setSummary(value); setDirty(true); }}
          editable
          placeholder="Summarize the student's aptitude, strengths and recommended guidance notes..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Recommended Pathway</Text>
        {suggestions.length ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Suggested from the student's stream and interest assessment:</Text>
            {suggestions.map((pathway) => (
              <Pressable key={`suggested-${pathway}`} style={styles.pathway} onPress={() => togglePathway(pathway)}>
                <Text style={styles.pathwayText}>{pathways.includes(pathway) ? '✓ ' : '+ '}{pathway}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {PATHWAYS.map((pathway) => {
          const selected = pathways.includes(pathway);
          return (
            <Pressable key={pathway} style={[styles.pathway, selected && { backgroundColor: colors.blueLight, borderColor: colors.blue }]} onPress={() => togglePathway(pathway)}>
              <Text style={styles.pathwayText}>{selected ? '✓ ' : '○ '}{pathway}</Text>
            </Pressable>
          );
        })}

        <View style={[styles.card, { marginTop: 8 }]}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>Share with Parent</Text>
              <Text style={styles.muted}>Recommendations are shared only when privacy consent allows it.</Text>
            </View>
            <Switch
              value={sharedWithParent}
              onValueChange={updateSharing}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.blue }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.button, styles.flex, { marginRight: 6 }]}
            onPress={() => save(guidanceId ? guidanceStatus : 'draft')}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : guidanceId ? 'Update Guidance' : 'Create Guidance'}</Text>
          </Pressable>
          {guidanceStatus !== 'final' ? (
            <Pressable style={[styles.button, styles.flex, { marginLeft: 6 }]} onPress={() => save('final')} disabled={saving}>
              <Text style={styles.buttonText}>Save Final</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={markReviewed} disabled={saving || !guidanceId}>
          <Text style={[styles.buttonText, styles.secondaryText]}>{saving ? 'Saving...' : 'Mark as Reviewed & Notify Parent'}</Text>
        </Pressable>
        {guidanceId ? (
          <Pressable style={[styles.button, { backgroundColor: colors.redLight }]} onPress={deleteGuidance} disabled={saving}>
            <Text style={[styles.buttonText, { color: colors.redStrong }]}>Delete Guidance</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

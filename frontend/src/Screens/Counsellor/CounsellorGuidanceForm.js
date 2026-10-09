import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import { styles } from './styles';
import ProfileHeader from '../../components/ProfileHeader';

const PATHWAYS = [
  'Software Engineering', 'Biomedical Science', 'Data Science & AI',
  'Information Technology', 'Business Management', 'Marketing', 'Accounting & Finance',
  'International Relations', 'Mechanical Engineering', 'Medicine & Surgery',
];

export default function CounsellorGuidanceForm({ route, navigation }) {
  const { studentId } = route.params || {};
  const [student, setStudent] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
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
    if (!studentId) {
      (async () => {
        try {
          const response = await counsellorApi.students();
          setAssignedStudents(response.students || []);
        } catch (loadError) {
          setError(loadError.message);
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

  const deleteDraft = async () => {
    if (!guidanceId || guidanceStatus === 'final') return;
    setSaving(true);
    try {
      await counsellorApi.deleteGuidance(studentId);
      setGuidanceId(null); setSummary(''); setPathways([]); setGuidanceStatus('draft'); setDirty(false);
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
            onPress={() => navigation.replace('CounsellorGuidanceForm')}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.secondaryText]}>Select Another Student</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!studentId ? (
          <View style={styles.card}>
            <Text style={styles.title}>Select Assigned Student</Text>
            <Text style={styles.muted}>Choose a student to view or edit guidance.</Text>
            {assignedStudents.map((item) => (
              <Pressable
                key={item.id}
                style={styles.pathway}
                onPress={() => navigation.replace('CounsellorGuidanceForm', { studentId: item.id })}
              >
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.muted}>{item.stream || 'Stream not recorded'}</Text>
              </Pressable>
            ))}
            {ready && !assignedStudents.length ? <Text style={styles.muted}>No assigned students are available.</Text> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.title}>Student summary</Text>
          {!studentId ? <Text style={styles.error}>No assigned student is available for guidance yet.</Text> : null}
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
          editable={Boolean(studentId) && guidanceStatus !== 'final'}
          placeholder="Summarize the student's aptitude, strengths and recommended guidance notes..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Recommended Pathway</Text>
        {suggestions.length ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Suggested from the student's stream and interest assessment:</Text>
            {suggestions.map((pathway) => (
              <Pressable key={`suggested-${pathway}`} style={styles.pathway} onPress={() => togglePathway(pathway)} disabled={guidanceStatus === 'final'}>
                <Text style={styles.pathwayText}>{pathways.includes(pathway) ? '✓ ' : '+ '}{pathway}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {PATHWAYS.map((pathway) => {
          const selected = pathways.includes(pathway);
          return (
            <Pressable key={pathway} disabled={!studentId || guidanceStatus === 'final'} style={[styles.pathway, selected && { backgroundColor: colors.blueLight, borderColor: colors.blue }]} onPress={() => togglePathway(pathway)}>
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
              disabled={!studentId || saving}
              trackColor={{ false: colors.border, true: colors.blue }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.row}>
          <Pressable style={[styles.button, styles.flex, { marginRight: 6 }]} onPress={() => save('draft')} disabled={saving || !studentId}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.flex, { marginLeft: 6 }]} onPress={() => save('final')} disabled={saving || !studentId}>
            <Text style={styles.buttonText}>Save Final</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={markReviewed} disabled={saving || !guidanceId || !studentId}>
          <Text style={[styles.buttonText, styles.secondaryText]}>{saving ? 'Saving...' : 'Mark as Reviewed'}</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: colors.redLight }]} onPress={deleteDraft} disabled={saving || !guidanceId || guidanceStatus === 'final'}>
          <Text style={[styles.buttonText, { color: colors.redStrong }]}>Delete Draft</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

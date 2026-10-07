import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';

const PATHWAYS = ['Software Engineering', 'Data Science & AI', 'Information Technology'];

export default function CounsellorGuidanceForm({ route, navigation }) {
  const { studentId } = route.params;
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState('');
  const [pathways, setPathways] = useState([]);
  const [guidanceId, setGuidanceId] = useState(null);
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
        setGuidanceId(guidance?.id || null);
        setSummary(guidance?.assessmentSummary || '');
        setPathways(guidance?.recommendedPathways || []);
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
        const response = await counsellorApi.saveGuidance(studentId, {
          assessmentSummary: summary,
          recommendedPathways: pathways,
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
  }, [ready, dirty, summary, pathways, guidanceId, studentId]);

  const togglePathway = (pathway) => {
    setPathways((current) => current.includes(pathway)
      ? current.filter((item) => item !== pathway)
      : [...current, pathway]);
    setDirty(true);
  };

  const saveFinal = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const response = await counsellorApi.saveGuidance(studentId, {
        assessmentSummary: summary,
        recommendedPathways: pathways,
        guidanceStatus: 'final',
      }, guidanceId ? 'PUT' : 'POST');
      setGuidanceId(response.guidance.id);
      setDirty(false);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
        <View style={styles.row}>
          <View style={styles.flex}><Text style={styles.heading}>Guidance Form</Text><Text style={styles.subtitle}>{student?.name}</Text></View>
          <Text style={styles.muted}>{saving ? 'Saving...' : saved ? 'Draft Saved' : ''}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.title}>Student summary</Text>
          <Text style={styles.muted}>Top career match: assessment data is shown only when shared with the assigned counsellor.</Text>
        </View>

        <Text style={styles.sectionTitle}>Assessment Summary</Text>
        <TextInput
          multiline
          value={summary}
          onChangeText={(value) => { setSummary(value); setDirty(true); }}
          placeholder="Summarize the student's aptitude, strengths and recommended guidance notes..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Recommended Pathway</Text>
        {PATHWAYS.map((pathway) => {
          const selected = pathways.includes(pathway);
          return (
            <Pressable key={pathway} style={[styles.pathway, selected && { backgroundColor: colors.blueLight, borderColor: colors.blue }]} onPress={() => togglePathway(pathway)}>
              <Text style={styles.pathwayText}>{selected ? '✓ ' : '○ '}{pathway}</Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.button} onPress={saveFinal} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Guidance'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

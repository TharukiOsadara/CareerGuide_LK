import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';
import { StatusChip } from './CounsellorPortal';

export default function CounsellorStudentProfile({ route, navigation }) {
  const { studentId } = route?.params || {};
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) {
      setError('No student was selected.');
      return;
    }
    try {
      setProfile(await counsellorApi.student(studentId));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (!studentId) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.error}>No student was selected.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.blue }}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /><Text style={styles.error}>{error}</Text></SafeAreaView>;
  }

  const { student, assessment, guidance } = profile;
  const markReviewed = async () => {
    setSaving(true);
    setError('');
    try {
      await counsellorApi.markReviewed(studentId);
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{student.initials}</Text></View>
          <View style={styles.headerCopy}><Text style={styles.heading}>Student Profile</Text><Text style={styles.subtitle}>{student.stream || 'Stream not recorded'}</Text></View>
          <StatusChip status={student.status} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.title}>{student.name}</Text>
          <Text style={styles.muted}>Index number: {student.indexNo || 'Not recorded'}</Text>
          <Pressable style={[styles.button, styles.secondaryButton]} disabled>
            <Text style={[styles.buttonText, styles.secondaryText]}>Follow up</Text>
          </Pressable>
          <Text style={styles.muted}>Follow up behavior is pending confirmation.</Text>
        </View>

        <Text style={styles.sectionTitle}>Aptitude & Interest Assessment</Text>
        <View style={styles.card}>
          {assessment.access === 'not_shared' ? (
            <Text style={styles.error}>{assessment.message}</Text>
          ) : (
            <>
              {assessment.scores?.map((score) => (
                <View key={score.area}>
                  <View style={styles.row}><Text style={styles.flex}>{score.area}</Text><Text style={styles.muted}>{score.percent}%</Text></View>
                  <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.min(score.percent, 100)}%` }]} /></View>
                </View>
              ))}
              <Text style={styles.muted}>Source: aptitude assessment - verified</Text>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Top 3 Matched Career Paths</Text>
        <View style={styles.card}>
          {assessment.access === 'not_shared' ? <Text style={styles.muted}>Not shared with the assigned counsellor.</Text> : assessment.matchedCareers?.map((career, index) => (
            <View key={career.title} style={{ marginBottom: 12 }}>
              <View style={styles.row}><Text style={styles.flex}>{index + 1}. {career.title}</Text><Text style={styles.chipText}>{career.matchPercent}%</Text></View>
              <Text style={styles.muted}>Decision-support match from the aptitude assessment.</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Counsellor Recommendation Notes</Text>
        <View style={styles.card}>
          <Text style={styles.muted}>{guidance?.assessmentSummary || 'No guidance summary saved yet.'}</Text>
          {guidance?.recommendedPathways?.map((pathway) => <Text style={styles.pathwayText} key={pathway}>• {pathway}</Text>)}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guidance"
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('CounsellorGuidanceForm', { studentId })}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Guidance</Text>
        </Pressable>

        <Pressable style={styles.button} disabled={saving || Boolean(student.status === 'reviewed' && guidance?.sharedWithParent)} onPress={markReviewed}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Mark as Reviewed & Notify Parent'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

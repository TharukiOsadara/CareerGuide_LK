import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconText } from './Icon';
import { chooseCourse, getCourseSelection } from '../services/api';
import { colors } from '../styles/colors';

// The student's chosen course and their ONE matched counsellor.
//  - With `courseId`: "Choose this course" on a course page (or switch to it).
//  - Without: a summary card for the student's home screen.
export default function CourseMatchCard({ courseId, courseTitle, navigation, style }) {
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  const id = Number(courseId) || null;

  const load = useCallback(async () => {
    setError('');
    try {
      setSelection(await getCourseSelection());
    } catch (e) {
      setError(/sign in/i.test(e.message) ? 'Sign in as a student to choose a course.' : (e.message || 'Could not load your course.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation?.addListener?.('focus', load);
    return unsub;
  }, [load, navigation]);

  const choose = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await chooseCourse(id);
      setSelection(res.selection);
      setNotice(res.message || 'Course chosen.');
      setConfirmSwitch(false);
    } catch (e) {
      setError(e.message || 'Could not choose this course.');
    } finally {
      setBusy(false);
    }
  };

  const ask = () => navigation?.navigate?.('CounsellorInquiry', { courseId: selection?.course?.id });

  if (loading) {
    return <View style={[styles.card, style]}><ActivityIndicator color={colors.blue} /></View>;
  }

  const isThisCourse = id && selection?.course?.id === id;
  const counsellor = selection?.counsellor;

  return (
    <View style={[styles.card, style]}>
      <IconText icon="user-cog" size={17} color={colors.blue} textStyle={styles.title}>
        {id ? 'Course & counsellor' : 'My course & counsellor'}
      </IconText>

      {selection ? (
        <View style={styles.box}>
          <Text style={styles.label}>{isThisCourse || !id ? 'Your chosen course' : 'You currently chose'}</Text>
          <Text style={styles.course}>{selection.course.title}</Text>
          {selection.course.institute ? <Text style={styles.sub}>{selection.course.institute}</Text> : null}
          <View style={styles.counsellorRow}>
            <View style={styles.avatar}><Icon name="user" size={16} color={colors.blue} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.counsellorName}>{counsellor ? counsellor.name : 'No counsellor yet'}</Text>
              <Text style={styles.sub}>{counsellor ? 'Your counsellor - only they guide you' : 'One will be matched soon'}</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.body}>
          {id
            ? `Choose ${courseTitle || 'this course'} and we'll match you with a counsellor who guides it.`
            : "You haven't chosen a course yet. Pick one and we'll match you with a counsellor for it."}
        </Text>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Actions */}
      {id && !isThisCourse && !error ? (
        selection && !confirmSwitch ? (
          <Pressable onPress={() => setConfirmSwitch(true)} style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}>
            <Text style={styles.outlineText}>Switch to this course</Text>
          </Pressable>
        ) : (
          <>
            {confirmSwitch ? (
              <Text style={styles.warn}>Switching may give you a different counsellor. Your previous counsellor will no longer guide you.</Text>
            ) : null}
            <Pressable disabled={busy} onPress={choose} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
              {busy ? <ActivityIndicator color={colors.white} /> : (
                <IconText icon="check-circle" size={16} color={colors.white} center textStyle={styles.primaryText}>
                  {confirmSwitch ? 'Yes, switch course' : 'Choose this course'}
                </IconText>
              )}
            </Pressable>
          </>
        )
      ) : null}

      {selection && counsellor && (isThisCourse || !id) ? (
        <Pressable onPress={ask} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <IconText icon="mail" size={16} color={colors.white} center textStyle={styles.primaryText}>Ask my counsellor</IconText>
        </Pressable>
      ) : null}

      {!id && !selection && !error ? (
        <Pressable onPress={() => navigation?.navigate?.('StudentCourses')} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <IconText icon="book" size={16} color={colors.white} center textStyle={styles.primaryText}>Browse courses</IconText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  title: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  body: { color: colors.slateDark, fontSize: 12.5, lineHeight: 18, marginTop: 8 },
  box: { backgroundColor: colors.blueLight, borderRadius: 10, padding: 12, marginTop: 10 },
  label: { color: colors.slate, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  course: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 3 },
  sub: { color: colors.slate, fontSize: 11.5, marginTop: 1 },
  counsellorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.bluePaleBorder },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  counsellorName: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  notice: { color: colors.greenDark, backgroundColor: colors.greenPale, fontSize: 12, padding: 9, borderRadius: 8, marginTop: 10 },
  error: { color: colors.redStrong, backgroundColor: colors.redLight, fontSize: 12, padding: 9, borderRadius: 8, marginTop: 10 },
  warn: { color: colors.orange, fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  primaryBtn: { marginTop: 12, height: 44, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  outlineBtn: { marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: colors.blue, fontSize: 13.5, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});

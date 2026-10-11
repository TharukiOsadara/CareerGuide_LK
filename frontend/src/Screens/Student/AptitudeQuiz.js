import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../../Components/BottomNavigation';
import ProfileHeader from '../../Components/ProfileHeader';
import Icon, { IconText } from '../../Components/Icon';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { STREAM_SETS, scoreAnswers, streamKeyFor } from './aptitudeQuestions';
import { saveAptitudeResults } from '../../services/api';

// Aptitude test: a different question set per A/L stream. At the end the student's top
// career paths are shown on the career-path screen.
export default function AptitudeQuiz({ navigation }) {
  const { user } = useAuth();
  const detected = streamKeyFor(user?.alStream);
  const [streamKey, setStreamKey] = useState(detected || 'maths');
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const set = STREAM_SETS[streamKey];
  const total = set.questions.length;
  const question = set.questions[index];
  const chosen = answers[index];
  const progress = useMemo(() => Math.round(((index + (chosen != null ? 1 : 0)) / total) * 100), [index, chosen, total]);

  const pickStream = (key) => {
    setStreamKey(key);
    setAnswers([]);
    setIndex(0);
  };

  const choose = (optionIndex) => {
    const next = [...answers];
    next[index] = optionIndex;
    setAnswers(next);
  };

  const [saving, setSaving] = useState(false);

  const finish = async () => {
    const all = scoreAnswers(streamKey, answers, 5);
    const matches = all.slice(0, 3);
    // Save so the student's parents and matched counsellor can see it (the result still
    // shows if saving fails, e.g. when offline).
    setSaving(true);
    try {
      await saveAptitudeResults({
        stream: set.label,
        scores: all.map((m) => ({ area: m.title, percent: m.percent })),
        matches: matches.map((m) => ({ title: m.title, matchPercent: m.percent, note: m.note })),
      });
    } catch (e) {
      console.warn('Could not save aptitude results.', e);
    } finally {
      setSaving(false);
    }
    navigation.replace('StudentCareerPath', {
      matches,
      stream: set.label,
      subtitle: `Based on your ${set.label} aptitude test. These careers fit your interests and strengths best.`,
      fromQuiz: true,
    });
  };

  const goNext = () => (index + 1 < total ? setIndex(index + 1) : finish());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ProfileHeader
        title="Aptitude Test"
        onBack={() => (started && index > 0 ? setIndex(index - 1) : started ? setStarted(false) : navigation.goBack())}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!started ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}><Icon name="brain" size={30} color={colors.teal} /></View>
              <Text style={styles.title}>Discover your career path</Text>
              <Text style={styles.subtitle}>
                Answer {total} quick questions about what you enjoy. There are no right or wrong answers - pick
                what feels most like you.
              </Text>
            </View>

            <Text style={styles.label}>Your A/L stream</Text>
            {detected ? (
              <Text style={styles.hint}>We picked this from your profile. You can change it if needed.</Text>
            ) : (
              <Text style={styles.hint}>Choose your stream so we ask the right questions.</Text>
            )}
            <View style={styles.streams}>
              {Object.entries(STREAM_SETS).map(([key, s]) => {
                const on = key === streamKey;
                return (
                  <Pressable key={key} onPress={() => pickStream(key)} style={[styles.streamChip, on && styles.streamChipOn]}>
                    <Text style={[styles.streamText, on && styles.streamTextOn]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => { setStarted(true); setIndex(0); }} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
              <IconText icon="arrow-right" trailing size={18} color={colors.white} center textStyle={styles.primaryText}>Start the test</IconText>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>Question {index + 1} of {total}</Text>
              <Text style={styles.progressText}>{set.label}</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>

            <View style={styles.card}>
              <Text style={styles.question}>{question.q}</Text>
              {question.a.map(([text], i) => {
                const on = chosen === i;
                return (
                  <Pressable
                    key={text}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => choose(i)}
                    style={[styles.option, on && styles.optionOn]}
                  >
                    <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={[styles.optionText, on && styles.optionTextOn]}>{text}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <Pressable
                disabled={index === 0}
                onPress={() => setIndex(index - 1)}
                style={({ pressed }) => [styles.secondaryBtn, index === 0 && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </Pressable>
              <Pressable
                disabled={chosen == null || saving}
                onPress={goNext}
                style={({ pressed }) => [styles.nextBtn, (chosen == null || saving) && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>{saving ? 'Saving…' : index + 1 < total ? 'Next' : 'See my career matches'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <BottomNavigation activeRoute="AptitudeQuiz" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 110 },

  hero: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  heroIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.navy, fontSize: 19, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 6 },

  label: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 20 },
  hint: { color: colors.slate, fontSize: 11.5, marginTop: 3 },
  streams: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  streamChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  streamChipOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  streamText: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700' },
  streamTextOn: { color: colors.blue, fontWeight: '800' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: colors.slate, fontSize: 12, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.blueChip, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.blue, borderRadius: 3 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  question: { color: colors.navy, fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 6 },
  option: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 13, marginTop: 10, backgroundColor: colors.white,
  },
  optionOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  optionText: { flex: 1, color: colors.slateDark, fontSize: 13.5, lineHeight: 19 },
  optionTextOn: { color: colors.navy, fontWeight: '700' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryBtn: { flex: 1, height: 48, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.slateDark, fontSize: 14, fontWeight: '800' },
  nextBtn: { flex: 2, height: 48, borderRadius: 11, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { marginTop: 22, height: 50, borderRadius: 11, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});

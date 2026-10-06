import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentHeader from '../components/StudentHeader';
import StudentNav from '../components/StudentNav';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

const QUESTIONS = [
  {
    id: 'q1',
    prompt: 'Which activity energizes you most?',
    options: ['Solving a tricky maths or logic problem', 'Helping and advising other people', 'Designing or building something new', 'Organising a plan or a budget'],
  },
  {
    id: 'q2',
    prompt: 'When you learn something new, you prefer to…',
    options: ['Understand the underlying theory', 'Try it hands-on right away', 'Discuss it with others', 'See real-world examples first'],
  },
  {
    id: 'q3',
    prompt: 'A project you would enjoy the most is…',
    options: ['Analysing data to find a pattern', 'Running a community awareness drive', 'Prototyping a mobile app', 'Starting a small business'],
  },
  {
    id: 'q4',
    prompt: 'Your friends would describe you as…',
    options: ['Logical and precise', 'Caring and empathetic', 'Creative and curious', 'Practical and reliable'],
  },
];

export default function StudentQuiz({ navigation }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const select = (qId, index) => {
    setAnswers((prev) => ({ ...prev, [qId]: index }));
    setSubmitted(false);
  };

  const allAnswered = QUESTIONS.every((q) => answers[q.id] != null);

  const submit = () => { if (allAnswered) setSubmitted(true); };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <StudentHeader navigation={navigation} user={user} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.title}>Aptitude Assessment</Text>

        <View style={styles.introCard}>
          <View style={styles.introHead}>
            <View style={styles.introIcon}><Text style={styles.introIconText}>🧠</Text></View>
            <Text style={styles.introTitle}>10-minute AI quiz</Text>
          </View>
          <Text style={styles.introText}>
            Answer a few quick questions and we'll map your personality and strengths to the A/L
            streams and degree paths that fit you best.
          </Text>
        </View>

        {QUESTIONS.map((q, qi) => (
          <View key={q.id} style={styles.qCard}>
            <Text style={styles.qPrompt}>{qi + 1}. {q.prompt}</Text>
            {q.options.map((opt, oi) => {
              const on = answers[q.id] === oi;
              return (
                <Pressable
                  key={oi}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => select(q.id, oi)}
                  style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={!allAnswered}
          onPress={submit}
          style={({ pressed }) => [styles.submit, !allAnswered && styles.submitDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>

        {submitted && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>🎯 Your Results</Text>
            <Text style={styles.resultText}>
              Your strengths: <Text style={styles.resultStrong}>Analytical & Technical</Text>
            </Text>
            <Text style={styles.resultText}>
              Matched streams: <Text style={styles.resultStrong}>Physical Science</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('StudentCourses')}
              style={({ pressed }) => [styles.resultButton, pressed && styles.pressed]}
            >
              <Text style={styles.resultButtonText}>Explore Matching Courses  →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <StudentNav active="StudentQuiz" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 24 },
  title: { color: colors.navy, fontSize: 20, fontWeight: '800', marginBottom: 12 },

  introCard: {
    backgroundColor: colors.blueLight, borderWidth: 1, borderColor: colors.bluePale,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  introHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  introIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  introIconText: { fontSize: 20 },
  introTitle: { color: colors.blue, fontSize: 15, fontWeight: '800' },
  introText: { color: colors.slate600, fontSize: 12, lineHeight: 17 },

  qCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  qPrompt: { color: colors.navy, fontSize: 13.5, fontWeight: '800', marginBottom: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  optionOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  optionText: { flex: 1, color: colors.slateDark, fontSize: 12.5 },
  optionTextOn: { color: colors.blue, fontWeight: '700' },

  submit: {
    height: 46, borderRadius: 10, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitDisabled: { backgroundColor: colors.slate400 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  resultCard: {
    marginTop: 16, backgroundColor: colors.greenLight, borderWidth: 1, borderColor: colors.greenPale,
    borderRadius: 14, padding: 16,
  },
  resultTitle: { color: colors.greenDark, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  resultText: { color: colors.slateDark, fontSize: 12.5, lineHeight: 19 },
  resultStrong: { color: colors.navy, fontWeight: '800' },
  resultButton: {
    marginTop: 14, height: 42, borderRadius: 9, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  resultButtonText: { color: colors.white, fontSize: 12.5, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});

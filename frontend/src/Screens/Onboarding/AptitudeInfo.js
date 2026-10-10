import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../Components/BackButton';
import Icon, { IconText } from '../../Components/Icon';

// Public explainer for the "Aptitude Matcher Quiz" onboarding card.
const STEPS = [
  { icon: 'edit', title: 'Answer short questions', text: 'Tell us what you enjoy, the subjects you are strong in and how you like to work. There are no right or wrong answers.' },
  { icon: 'brain', title: 'We find your strengths', text: 'Your answers are combined with your A/L stream and Z-score to build a picture of your strengths.' },
  { icon: 'target', title: 'See your matches', text: 'Get degree programs and career paths that fit you, ranked by how well they match.' },
];

const BENEFITS = [
  'A summary of your top strengths and interests',
  'Degree programs that match your profile and Z-score',
  'Career paths and job outlook for each match',
  'Results you can share with a parent or counsellor (you stay in control)',
];

export default function AptitudeInfo({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Aptitude Quiz</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon name="brain" size={30} color={colors.teal} /></View>
          <Text style={styles.tag}>INTERACTIVE · ABOUT 10 MINUTES</Text>
          <Text style={styles.title}>Aptitude Matcher Quiz</Text>
          <Text style={styles.subtitle}>
            Not sure which degree is right for you? This short quiz helps you discover your strengths
            and shows the courses and careers that suit you best.
          </Text>
        </View>

        {/* Quick facts */}
        <View style={styles.facts}>
          <Fact icon="hourglass" value="~10 min" label="To complete" />
          <Fact icon="check-circle" value="Free" label="For students" />
          <Fact icon="lock" value="Private" label="Your data" />
        </View>

        {/* How it works */}
        <Text style={styles.heading}>How it works</Text>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <IconText icon={s.icon} size={15} color={colors.blue} textStyle={styles.stepTitle}>{s.title}</IconText>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          </View>
        ))}

        {/* What you get */}
        <Text style={styles.heading}>What you'll get</Text>
        <View style={styles.card}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <View style={styles.tick}><Icon name="check" size={12} color={colors.green} strokeWidth={3} /></View>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Icon name="shield-check" size={18} color={colors.blue} />
          <Text style={styles.noteText}>
            Your answers are only used to suggest courses. They are protected under Sri Lankan educational privacy standards.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('PrivacyConsent')}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Create Free Account to Start</Text>
          <Icon name="arrow-right" size={18} color={colors.white} style={{ marginLeft: 10 }} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('SignIn')} style={styles.signIn}>
          <Text style={styles.signInText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ icon, value, label }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color={colors.blue} />
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 15, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 36 },

  hero: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, marginTop: 6 },
  heroIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  tag: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 12 },
  title: { color: colors.navy, fontSize: 20, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 8 },

  facts: { flexDirection: 'row', gap: 10, marginTop: 14 },
  fact: { flex: 1, alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  factValue: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 6 },
  factLabel: { color: colors.slate, fontSize: 10.5, marginTop: 2 },

  heading: { color: colors.navy, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  step: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  stepTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  stepText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },

  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  benefitText: { flex: 1, color: colors.slateDark, fontSize: 12.5, lineHeight: 19 },

  note: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.blueLight, borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.bluePaleBorder },
  noteText: { flex: 1, color: colors.slateDark, fontSize: 11.5, lineHeight: 17, marginLeft: 10 },

  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  signIn: { alignSelf: 'center', marginTop: 14, paddingVertical: 4 },
  signInText: { color: colors.muted, fontSize: 12.5 },
  link: { color: colors.blue, fontWeight: '800' },
});

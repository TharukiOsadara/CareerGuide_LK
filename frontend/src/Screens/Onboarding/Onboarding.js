import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { colors } from '../../styles/colors';
import Icon, { IconText } from '../../components/Icon';

const utilities = [
  { icon: 'database', iconStyle: 'databaseIcon', tint: colors.blue, tag: 'VERIFIED', tagStyle: 'verifiedTag', description: 'DIRECT DIRECTORY', title: 'Verified Course Database' },
  { icon: 'brain', iconStyle: 'quizIcon', tint: colors.teal, tag: 'INTERACTIVE', tagStyle: 'interactiveTag', description: '10 MINUTE QUIZ', title: 'Aptitude Matcher Quiz' },
  { icon: 'chart', iconStyle: 'jobsIcon', tint: colors.orange, tag: 'TRENDING', tagStyle: 'trendingTag', description: 'LATEST STATS', title: 'Job Market Indicators' },
];

export default function Onboarding({ navigation }) {
  const openSignIn = () => navigation.navigate('SignIn');
  const openAbout = () => navigation.navigate('About');
  const openPrivacyConsent = () => navigation.navigate('PrivacyConsent');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Header onSignIn={openSignIn} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <View style={styles.hero}>
          <View style={styles.badge}><Text style={styles.badgeText}>UPDATED FOR 2026/2027 INTAKE</Text></View>
          <Text style={styles.heading}>Discover Your Ideal{'\n'}Degree &amp; Career Path</Text>
          <Text style={styles.subtitle}>Empowering students in Sri Lanka with trusted{'\n'}insights, course matching, and real-time job market{'\n'}indicators.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Get Started Now" onPress={openPrivacyConsent} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Get Started Now</Text><Icon name="arrow-right" size={18} color={colors.white} style={styles.arrow} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Learn More" onPress={openAbout} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Learn More</Text>
          </Pressable>
        </View>
        <View style={styles.benefits}>
          <Benefit text="UGC Approved Degrees" /><Benefit text="NVQ Framework Levels (1 to 7)" /><Benefit text="Approved Training Institutes Only" />
        </View>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Core Utilities</Text><View style={styles.sectionRule} /></View>
        <View style={styles.utilityList}>
          {utilities.map((utility) => (
            <Pressable key={utility.title} accessibilityRole="button" onPress={openSignIn} style={({ pressed }) => [styles.utilityCard, pressed && styles.pressed]}>
              <View style={[styles.utilityIcon, styles[utility.iconStyle]]}><Icon name={utility.icon} size={20} color={utility.tint} /></View>
              <View style={styles.utilityCopy}><View style={styles.utilityMeta}><Text style={[styles.utilityTag, styles[utility.tagStyle]]}>{utility.tag}</Text><Text style={styles.utilityDescription}>{utility.description}</Text></View><Text style={styles.utilityTitle}>{utility.title}</Text></View>
              <Icon name="chevron-right" size={20} color={colors.slate} style={styles.utilityArrow} />
            </Pressable>
          ))}
        </View>
        <View style={styles.exploreSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Explore More</Text>
            <View style={styles.sectionRule} />
          </View>
          <Text style={styles.exploreIntro}>
            Build confidence in your next step with practical guidance designed for Sri Lankan students.
          </Text>
          <View style={styles.exploreCard}>
            <Text style={styles.exploreCardTitle}>Plan your career journey</Text>
            <Text style={styles.exploreCardText}>
              Compare study options, discover trusted institutions, and find skills employers are looking for.
            </Text>
          </View>
          <View style={styles.exploreCard}>
            <Text style={styles.exploreCardTitle}>Make informed decisions</Text>
            <Text style={styles.exploreCardText}>
              Keep learning with current course information and helpful career resources.
            </Text>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ text }) {
  return <View style={styles.benefit}><View style={styles.check}><Icon name="check" size={9} color={colors.green} strokeWidth={3.5} /></View><Text style={styles.benefitText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 12 },
  hero: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 26 },
  badge: { borderColor: colors.blue, borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4 },
  badgeText: { color: colors.blue, fontSize: 9, fontWeight: '700' },
  heading: { color: colors.navy, fontSize: 25, lineHeight: 30, fontWeight: '800', textAlign: 'center', marginTop: 17 },
  subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 9 },
  primaryButton: { width: '100%', height: 43, marginTop: 17, borderRadius: 9, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  arrow: { marginLeft: 10 },
  secondaryButton: { width: '100%', height: 43, marginTop: 10, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  benefits: { marginTop: 24, paddingHorizontal: 17, gap: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  benefitText: { color: colors.navy, fontSize: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', marginTop: 32, paddingHorizontal: 16 },
  sectionTitle: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  sectionRule: { height: 1, flex: 1, backgroundColor: colors.border, marginLeft: 8, marginTop: 3 },
  utilityList: { paddingHorizontal: 16, marginTop: 13, gap: 10 },
  utilityCard: { minHeight: 61, paddingHorizontal: 13, borderRadius: 13, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  utilityIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  databaseIcon: { backgroundColor: colors.blueLight },
  quizIcon: { backgroundColor: colors.mint },
  jobsIcon: { backgroundColor: colors.yellow },
  utilityIconText: { fontSize: 22, fontWeight: '700' },
  databaseIconText: { color: colors.blue },
  quizIconText: { color: colors.teal },
  jobsIconText: { color: colors.orange },
  utilityCopy: { flex: 1 },
  utilityMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  utilityTag: { fontSize: 7, fontWeight: '800', marginRight: 7 },
  verifiedTag: { color: colors.green },
  interactiveTag: { color: colors.teal },
  trendingTag: { color: colors.orange },
  utilityDescription: { color: colors.slate, fontSize: 8 },
  utilityTitle: { color: colors.navy, fontSize: 12.5, fontWeight: '800' },
  utilityArrow: { marginLeft: 8 },
  exploreSection: { marginTop: 8 },
  exploreIntro: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 16, marginTop: 12 },
  exploreCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  exploreCardTitle: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  exploreCardText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
});


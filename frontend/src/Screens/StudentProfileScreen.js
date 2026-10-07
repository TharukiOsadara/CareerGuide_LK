import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../Components/BottomNavigation';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';

const skills = [
  { name: 'Logical Reasoning', percentage: 92 },
  { name: 'Analytical Thinking', percentage: 88 },
  { name: 'Creative / Design', percentage: 81 },
  { name: 'Communication', percentage: 76 },
];

const careers = [
  {
    title: 'Software Engineering',
    match: '96% Match',
    description: 'Build innovative software solutions and digital products.',
  },
  {
    title: 'Data Science',
    match: '91% Match',
    description: 'Turn complex data into meaningful insights and decisions.',
  },
  {
    title: 'UX / UI Design',
    match: '87% Match',
    description: 'Create useful, accessible, and engaging user experiences.',
  },
];

export default function StudentProfileScreen({ navigation }) {
  const goBackToPreviousScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7FC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={10}
          onPress={goBackToPreviousScreen}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <Pressable
          accessibilityLabel="Follow up with student"
          accessibilityRole="button"
          style={styles.followButton}
        >
          <Text style={styles.followIcon}>⚑</Text>
          <Text style={styles.followText}>Follow-up</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>TO</Text>
          </View>
          <View style={styles.identityDetails}>
            <Text style={styles.studentName}>Tharuki Osadara</Text>
            <Text style={styles.studentMeta}>
              Grade 13 · Physical Science Stream · Index No. 4521
            </Text>
          </View>
          <View style={styles.reviewedBadge}>
            <Text style={styles.reviewedText}>REVIEWED</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aptitude &amp; Interest Assessment</Text>
          <View style={styles.assessmentCard}>
            {skills.map((skill) => (
              <View key={skill.name} style={styles.skillRow}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillPercentage}>{skill.percentage}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${skill.percentage}%` }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 3 Matched Career Paths</Text>
          {careers.map((career, index) => (
            <View key={career.title} style={styles.careerCard}>
              <View style={styles.careerNumber}>
                <Text style={styles.careerNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.careerDetails}>
                <View style={styles.careerTitleRow}>
                  <Text style={styles.careerTitle}>{career.title}</Text>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{career.match}</Text>
                  </View>
                </View>
                <Text style={styles.careerDescription}>{career.description}</Text>
                <Text style={styles.verifiedText}>
                  Source: Aptitude Assessment · verified
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Counsellor Recommendation Notes</Text>
            <Pressable
              accessibilityLabel="Edit recommendation notes"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>
              Tharuki shows strong potential in technology-focused careers. Encourage
              further practice in communication and participation in collaborative
              projects.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('CounsellorInquiry')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Tap to send inquiry to counsellor</Text>
          <Text style={styles.primaryButtonArrow}>→</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <BottomNavigation activeRoute="StudentProfile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backButton: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 82,
  },
  backIcon: {
    color: TEXT,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 38,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  followButton: {
    alignItems: 'center',
    borderColor: BLUE,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 9,
  },
  followIcon: {
    color: BLUE,
    fontSize: 16,
  },
  followText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  identityCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 122,
    padding: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#DEEBFF',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarText: {
    color: BLUE,
    fontSize: 22,
    fontWeight: '800',
  },
  identityDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  studentName: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 7,
  },
  studentMeta: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
  reviewedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3FCEF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reviewedText: {
    color: '#006644',
    fontSize: 10,
    fontWeight: '800',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  skillRow: {
    marginBottom: 16,
  },
  skillRowLast: {
    marginBottom: 0,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skillName: {
    color: MUTED,
    fontSize: 13,
  },
  skillPercentage: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: '#EBECF0',
    borderRadius: 5,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BLUE,
    borderRadius: 5,
    height: '100%',
  },
  careerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  careerNumber: {
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  careerNumberText: {
    color: BLUE,
    fontSize: 18,
    fontWeight: '800',
  },
  careerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  careerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  careerTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  matchBadge: {
    backgroundColor: '#DEEBFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '800',
  },
  careerDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  verifiedText: {
    color: '#8993A4',
    fontSize: 10,
    marginTop: 8,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  editIcon: {
    color: BLUE,
    fontSize: 22,
    marginBottom: 12,
    marginLeft: 12,
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  notesText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    marginLeft: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: BLUE,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: '#DE350B',
    fontSize: 14,
    fontWeight: '700',
  },
});

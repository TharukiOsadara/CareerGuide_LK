import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../Components/BottomNavigation';
import { saveAcademicProfile } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

const STREAM_OPTIONS = [
  'Physical Science (Maths Stream)',
  'Biological Science Stream',
  'Commerce Stream',
  'Arts Stream',
];

const DISTRICT_OPTIONS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kurunegala', 'Puttalam',
  'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Ratnapura',
];
const STREAM_SUBJECTS = {
  'Physical Science (Maths Stream)': ['Combined Mathematics', 'Physics', 'Chemistry'],
  'Biological Science Stream': ['Biology', 'Chemistry', 'Physics'],
  'Commerce Stream': ['Accounting', 'Business Studies', 'Economics'],
  'Arts Stream': ['Sinhala / Tamil', 'Logic & Scientific Method', 'Political Science'],
};
const GRADE_OPTIONS = ['A', 'B', 'C', 'S', 'F'];

function SelectField({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((current) => !current)}
        style={styles.selectInput}
      >
        <Text style={styles.selectValue}>{value}</Text>
        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.optionsList}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => {
                onChange(option);
                setIsOpen(false);
              }}
              style={styles.option}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function GradeChip({ subject, grade }) {
  return (
    <View style={styles.gradeChip}>
      <Text style={styles.gradeSubject}>{subject}</Text>
      <View style={styles.gradeBadge}>
        <Text style={styles.gradeText}>{grade}</Text>
      </View>
    </View>
  );
}

export default function AcademicProfileScreen({ navigation }) {
  const [stream, setStream] = useState(STREAM_OPTIONS[0]);
  const [district, setDistrict] = useState(DISTRICT_OPTIONS[0]);
  const [zScore, setZScore] = useState('1.4250');
  const [grades, setGrades] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const goBackToPreviousScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const handleGenerateMatches = async () => {
    const subjects = STREAM_SUBJECTS[stream];
    const subjectGrades = subjects.map((subject) => ({ subject, grade: grades[subject] }));
    const zScoreValue = Number(zScore);
    if (!district || !Number.isFinite(zScoreValue) || zScore.trim() === '' ||
      subjectGrades.some(({ grade }) => !grade)) {
      Alert.alert(
        'Complete your academic profile',
        'Select a district, enter a valid Z-Score, and choose a grade for all three subjects.',
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveAcademicProfile({
        userId: 1,
        subjectStream: stream,
        district,
        zScore: zScoreValue,
        subjectGrades,
      });
      navigation.navigate('StudentCareerPath', { matches: response?.data || response });
    } catch (error) {
      console.warn('Unable to save academic profile.', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
        <Text style={styles.headerTitle}>Academic Profile</Text>
        <Pressable
          accessibilityLabel="Academic profile information"
          accessibilityRole="button"
          hitSlop={10}
          style={styles.infoButton}
        >
          <Text style={styles.infoIcon}>ⓘ</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Enter Your A/L Exam Details</Text>
          <Text style={styles.cardSubtitle}>
            Used to filter UGC &amp; University cut-off eligibility accurately.
          </Text>
        </View>

        <View style={styles.formCard}>
          <SelectField
            label="A/L Subject Stream"
            onChange={(nextStream) => {
              setStream(nextStream);
              setGrades({});
            }}
            options={STREAM_OPTIONS}
            value={stream}
          />
          <SelectField
            label="District"
            onChange={setDistrict}
            options={DISTRICT_OPTIONS}
            value={district}
          />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Your Z-Score / Predicted Z-Score</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✔ UGC Verified Format</Text>
              </View>
            </View>
            <TextInput
              accessibilityLabel="Your Z-Score or Predicted Z-Score"
              keyboardType="decimal-pad"
              onChangeText={setZScore}
              style={styles.textInput}
              value={zScore}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Subject Grades</Text>
            {STREAM_SUBJECTS[stream].map((subject) => (
              <View key={subject} style={styles.subjectRow}>
                <Text style={styles.subjectName}>{subject}</Text>
                <SelectField
                  label=""
                  onChange={(grade) => setGrades((current) => ({ ...current, [subject]: grade }))}
                  options={GRADE_OPTIONS}
                  value={grades[subject] || 'Select grade'}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.verificationBanner}>
          <Text style={styles.shieldIcon}>♢</Text>
          <Text style={styles.verificationText}>
            Data cross-referenced with latest UGC Sri Lanka Intake Cut-offs
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleGenerateMatches}
          style={styles.primaryButton}
        >
          {isSaving && <ActivityIndicator color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>
            Generate Career &amp; Course Matches
          </Text>
          <Text style={styles.primaryButtonArrow}>→</Text>
        </Pressable>
      </View>
      <BottomNavigation activeRoute="AcademicProfile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BACKGROUND,
    flex: 1,
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
  infoButton: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: 82,
  },
  infoIcon: {
    color: BLUE,
    fontSize: 23,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 188,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 7,
  },
  cardSubtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 14,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectInput: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 13,
  },
  selectValue: {
    color: TEXT,
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  chevron: {
    color: MUTED,
    fontSize: 12,
  },
  optionsList: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    overflow: 'hidden',
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  optionText: {
    color: TEXT,
    fontSize: 13,
  },
  labelRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedText: {
    color: '#218739',
    fontSize: 10,
    fontWeight: '700',
  },
  textInput: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  gradeList: {
    gap: 8,
    paddingVertical: 2,
  },
  subjectRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subjectName: {
    color: TEXT,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
  },
  gradeChip: {
    alignItems: 'center',
    backgroundColor: '#DEEBFF',
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 38,
    paddingLeft: 12,
    paddingRight: 5,
  },
  gradeSubject: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  gradeBadge: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginLeft: 8,
    width: 28,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  verificationBanner: {
    alignItems: 'center',
    backgroundColor: '#E9F2FF',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 2,
    padding: 14,
  },
  shieldIcon: {
    color: BLUE,
    fontSize: 24,
    marginRight: 11,
  },
  verificationText: {
    color: '#0747A6',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomAction: {
    backgroundColor: BACKGROUND,
    bottom: 72,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
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
});

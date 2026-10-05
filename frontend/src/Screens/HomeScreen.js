import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

const courses = [
  {
    title: 'B.Sc. (Hons) in Software Engineering',
    institute: 'IIT / University of Westminster',
    match: '94% Match',
  },
  {
    title: 'B.Sc. (Hons) in Biomedical Science',
    institute: 'AIC Campus',
    match: '87% Match',
  },
];

function CourseCard({ course }) {
  return (
    <View style={styles.courseCard}>
      <View style={styles.courseTags}>
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedBadgeText}>UGC APPROVED</Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{course.match}</Text>
        </View>
      </View>
      <Text style={styles.courseTitle}>{course.title}</Text>
      <Text style={styles.institute}>{course.institute}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.detailsButton}
      >
        <Text style={styles.detailsButtonText}>
          View Details &amp; Entry Requirements
        </Text>
        <Ionicons color={BLUE} name="arrow-forward" size={16} />
      </Pressable>
    </View>
  );
}

function BottomNavigation({ navigation }) {
  const tabs = [
    { label: 'Home', icon: 'home', route: 'Main', active: true },
    { label: 'Quiz', icon: 'brain', route: 'AcademicProfile' },
    { label: 'Courses', icon: 'book-open-variant', route: 'StudentCourses' },
    { label: 'Profile', icon: 'account-outline', route: 'StudentProfile' },
  ];

  return (
    <View style={styles.bottomNavigation}>
      {tabs.map((tab) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: Boolean(tab.active) }}
          key={tab.label}
          onPress={() => tab.route && navigation.navigate(tab.route)}
          style={styles.tab}
        >
          <MaterialCommunityIcons
            color={tab.active ? BLUE : MUTED}
            name={tab.icon}
            size={22}
          />
          <Text style={[styles.tabLabel, tab.active && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const openAcademicProfile = () => navigation.navigate('AcademicProfile');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <MaterialCommunityIcons color="#FFFFFF" name="compass-outline" size={21} />
          </View>
          <Text style={styles.brandText}>
            CareerGuide <Text style={styles.brandAccent}>LK</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={styles.notificationButton}
          >
            <Ionicons color={TEXT} name="notifications-outline" size={24} />
            <View style={styles.notificationDot} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open Academic Profile screen"
            accessibilityRole="button"
            hitSlop={10}
            onPress={openAcademicProfile}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>TO</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBar}>
          <Ionicons color={MUTED} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search courses, careers, or institutes"
            placeholder="Search courses, careers, or institutes..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.welcomeTitle}>Welcome back, Tharuki!</Text>
          <Text style={styles.welcomeSubtitle}>
            Complete your profile to unlock verified course applications.
          </Text>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Profile Completion</Text>
            <Text style={styles.progressValue}>65%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.assessmentBanner}>
          <View style={styles.assessmentTopRow}>
            <View style={styles.brainIcon}>
              <MaterialCommunityIcons color={BLUE} name="brain" size={25} />
            </View>
            <View style={styles.assessmentCopy}>
              <Text style={styles.assessmentTitle}>Aptitude Assessment</Text>
              <Text style={styles.assessmentSubtitle}>
                10-minute AI quiz to map your personality &amp; strengths.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Open academic profile"
            accessibilityRole="button"
            onPress={openAcademicProfile}
            style={styles.quizButton}
          >
            <Text style={styles.quizButtonText}>Start Quiz Now</Text>
            <Ionicons color="#FFFFFF" name="arrow-forward" size={18} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Recommended Courses</Text>
          <Pressable accessibilityRole="button">
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {courses.map((course) => (
          <CourseCard course={course} key={course.title} />
        ))}
      </ScrollView>

      <BottomNavigation navigation={navigation} />
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginRight: 9,
    width: 36,
  },
  brandText: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  brandAccent: {
    color: BLUE,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  notificationButton: {
    marginRight: 16,
    padding: 3,
    position: 'relative',
  },
  notificationDot: {
    backgroundColor: '#DE350B',
    borderColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    position: 'absolute',
    right: 1,
    top: 0,
    width: 9,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#DEEBFF',
    borderColor: '#B3D4FF',
    borderRadius: 22,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 105,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: TEXT,
    flex: 1,
    fontSize: 13,
    marginLeft: 9,
    paddingVertical: 0,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    marginTop: 16,
    padding: 17,
    shadowColor: '#172B4D',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  welcomeTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeSubtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  progressLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
  progressValue: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#EBECF0',
    borderRadius: 5,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BLUE,
    borderRadius: 5,
    height: '100%',
    width: '65%',
  },
  assessmentBanner: {
    backgroundColor: '#E9F2FF',
    borderColor: '#B3D4FF',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 15,
  },
  assessmentTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brainIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  assessmentCopy: {
    flex: 1,
    marginLeft: 12,
  },
  assessmentTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  assessmentSubtitle: {
    color: '#42526E',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  quizButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    minHeight: 44,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 9,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 25,
  },
  sectionTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  seeAll: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    marginTop: 12,
    padding: 16,
    shadowColor: '#172B4D',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  courseTags: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approvedBadge: {
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  approvedBadgeText: {
    color: '#218739',
    fontSize: 10,
    fontWeight: '800',
  },
  matchBadge: {
    backgroundColor: '#DEEBFF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  matchBadgeText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '800',
  },
  courseTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 13,
  },
  institute: {
    color: MUTED,
    fontSize: 13,
    marginTop: 6,
  },
  detailsButton: {
    alignItems: 'center',
    borderColor: BLUE,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    minHeight: 42,
  },
  detailsButtonText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 7,
  },
  bottomNavigation: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: BORDER,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    elevation: 8,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-around',
    left: 0,
    position: 'absolute',
    right: 0,
    shadowColor: '#172B4D',
    shadowOffset: { height: -2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabLabel: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  activeTabLabel: {
    color: BLUE,
    fontWeight: '700',
  },
});

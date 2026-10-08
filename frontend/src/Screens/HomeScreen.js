import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../Components/BottomNavigation';
import { getCourses, getNotifications, getStudentProfile, markNotificationsRead } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

function CourseCard({ course, navigation }) {
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
        onPress={() => navigation.navigate('CourseDetails', { courseId: course.id })}
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

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const openStudentProfile = () => navigation.navigate('StudentProfile');

  useEffect(() => {
    let mounted = true;
    getStudentProfile()
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
      })
      .catch((error) => console.warn('Unable to load home profile data.', error))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    getCourses()
      .then((data) => {
        if (mounted) {
          setCourses(data.slice(0, 3).map((course) => ({
            ...course,
            match: `${course.match_percentage ?? 0}% Match`,
          })));
        }
      })
      .catch((error) => console.warn('Unable to load courses for home screen.', error));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsNotificationsLoading(true);
    getNotifications()
      .then((data) => {
        if (mounted) setNotifications(data?.notifications || []);
      })
      .catch((error) => console.warn('Unable to load notifications.', error))
      .finally(() => mounted && setIsNotificationsLoading(false));
    return () => { mounted = false; };
  }, []);

  const openNotification = async (notification) => {
    setSelectedNotification(notification);
    try {
      await markNotificationsRead([notification.id]);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error) {
      console.warn('Unable to mark notification as read.', error);
    }
  };

  const closeNotifications = () => {
    setIsNotificationsVisible(false);
    setSelectedNotification(null);
  };

  const studentName = profile?.user?.full_name || 'Savindi Piyarathna';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
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
            onPress={() => setIsNotificationsVisible(true)}
            style={styles.notificationButton}
          >
            <Ionicons color={TEXT} name="notifications-outline" size={24} />
            {notifications.length > 0 && <View style={styles.notificationDot} />}
          </Pressable>
          <Pressable
            accessibilityLabel="View student profile"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.navigate('AcademicProfile')}
            style={({ pressed }) => [
              styles.avatar,
              pressed && styles.avatarPressed,
            ]}
          >
            {profile?.user?.profilePicture ? (
              <Image source={{ uri: profile.user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>TO</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Open course search and filters"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CourseFilter')}
          style={styles.searchBar}
        >
          <Ionicons color={MUTED} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search courses, careers, or institutes"
            editable={false}
            placeholder="Search courses, careers, or institutes..."
            placeholderTextColor={MUTED}
            pointerEvents="none"
            style={styles.searchInput}
          />
        </Pressable>

        <View style={styles.progressCard}>
          <Text style={styles.welcomeTitle}>Welcome back, {studentName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Complete your profile to unlock verified course applications.
          </Text>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Profile Completion</Text>
            <Text style={styles.progressValue}>65%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '65%' }]} />
          </View>
          <Pressable
            accessibilityLabel="View profile"
            accessibilityRole="button"
            onPress={openStudentProfile}
            style={styles.viewProfileButton}
          >
            <Text style={styles.viewProfileButtonText}>View Profile</Text>
            <Ionicons color={BLUE} name="arrow-forward" size={16} />
          </Pressable>
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
            accessibilityLabel="Start aptitude quiz"
            accessibilityRole="button"
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
        {isLoading && <ActivityIndicator color={BLUE} />}

        {courses.map((course) => (
          <CourseCard course={course} key={course.title} navigation={navigation} />
        ))}
      </ScrollView>

      <BottomNavigation activeRoute="Main" navigation={navigation} />

      <Modal
        animationType="slide"
        onRequestClose={closeNotifications}
        transparent
        visible={isNotificationsVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsCard}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Counsellor Replies &amp; Updates</Text>
              <Pressable
                accessibilityLabel="Close notifications"
                accessibilityRole="button"
                onPress={closeNotifications}
                style={styles.closeNotificationsButton}
              >
                <Ionicons color={MUTED} name="close" size={23} />
              </Pressable>
            </View>
            {isNotificationsLoading ? (
              <ActivityIndicator color={BLUE} style={styles.notificationsLoading} />
            ) : notifications.length === 0 && !selectedNotification ? (
              <Text style={styles.emptyNotifications}>No unread counsellor replies.</Text>
            ) : (
              <>
                {notifications.map((notification) => (
                  <Pressable
                    key={notification.id}
                    onPress={() => openNotification(notification)}
                    style={styles.notificationItem}
                  >
                    <View style={styles.notificationItemIcon}>
                      <Ionicons color={BLUE} name="chatbubble-ellipses-outline" size={19} />
                    </View>
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationCounsellor}>
                        {notification.counsellor_name || 'Counsellor'}
                      </Text>
                      <Text style={styles.notificationCourse}>{notification.course_title}</Text>
                      <Text numberOfLines={2} style={styles.notificationExcerpt}>
                        {notification.reply_message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {notification.replied_at
                          ? new Date(notification.replied_at).toLocaleString()
                          : 'Recently'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {selectedNotification && (
                  <View style={styles.fullReplyBox}>
                    <Text style={styles.fullReplyLabel}>Full counsellor reply</Text>
                    <Text style={styles.fullReplyText}>{selectedNotification.reply_message}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  notificationsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    padding: 18,
    width: '100%',
  },
  notificationsHeader: {
    alignItems: 'center',
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  notificationsTitle: { color: TEXT, flex: 1, fontSize: 17, fontWeight: '800' },
  closeNotificationsButton: { padding: 4 },
  notificationsLoading: { margin: 28 },
  emptyNotifications: { color: MUTED, padding: 28, textAlign: 'center' },
  notificationItem: {
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  notificationItemIcon: {
    alignItems: 'center',
    backgroundColor: '#DEEBFF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  notificationCopy: { flex: 1, marginLeft: 11 },
  notificationCounsellor: { color: TEXT, fontSize: 14, fontWeight: '800' },
  notificationCourse: { color: BLUE, fontSize: 12, fontWeight: '700', marginTop: 3 },
  notificationExcerpt: { color: MUTED, fontSize: 12, lineHeight: 17, marginTop: 5 },
  notificationTime: { color: MUTED, fontSize: 10, marginTop: 5 },
  fullReplyBox: { backgroundColor: '#EBF3FE', borderRadius: 10, marginTop: 14, padding: 13 },
  fullReplyLabel: { color: BLUE, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  fullReplyText: { color: TEXT, fontSize: 13, lineHeight: 19 },
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
  avatarPressed: {
    opacity: 0.7,
  },
  avatarImage: {
    borderRadius: 22,
    height: 42,
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
  viewProfileButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 13,
  },
  viewProfileButtonText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 5,
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
});

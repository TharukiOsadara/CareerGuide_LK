import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentHeader from '../../components/StudentHeader';
import StudentNav from '../../components/StudentNav';
import WelcomeToast from '../../components/WelcomeToast';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import Icon, { IconText } from '../../components/Icon';

export default function StudentHome({ navigation, route }) {
  const { user } = useAuth();
  const firstName = (user?.fullName || 'there').trim().split(' ')[0];
  const completion = Number(user?.profileCompletion || 0);

  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(!!route?.params?.welcome);

  useEffect(() => {
    if (route?.params?.welcome) setShowToast(true);
  }, [route?.params?.welcome]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { courses: list } = await api('/api/courses');
        if (mounted) setCourses(list || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Could not load courses.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submitSearch = () => {
    navigation.navigate('StudentCourses', { query: query.trim() });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <StudentHeader navigation={navigation} user={user} />

      {/* Page body: the welcome popup is anchored here, just below the header. */}
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          {/* Search bar */}
          <View style={styles.searchCard}>
            <Icon name="search" size={17} color={colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses, careers, or institutes�"
              placeholderTextColor={colors.slate400}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
          </View>

          {/* Welcome card */}
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
            <Text style={styles.welcomeSub}>
              Complete your profile to unlock verified course applications.
            </Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Profile Completion</Text>
              <Text style={styles.progressLabel}>{completion}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, completion))}%` }]} />
            </View>
          </View>

          {/* Aptitude card */}
          <View style={styles.aptitudeCard}>
            <View style={styles.aptitudeHead}>
              <View style={styles.aptitudeIcon}><Icon name="brain" size={22} color={colors.blue} /></View>
              <View style={styles.aptitudeCopy}>
                <Text style={styles.aptitudeTitle}>Aptitude Assessment</Text>
                <Text style={styles.aptitudeText}>10-minute AI quiz to map your personality & strengths.</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              // TODO: link to the new aptitude page once it exists.
              onPress={() => {}}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <IconText icon="arrow-right" trailing size={16} color={colors.white} gap={8} textStyle={styles.primaryButtonText}>Start Quiz Now</IconText>
            </Pressable>
          </View>

          {/* Recommended courses */}
          <Text style={styles.sectionTitle}>Top Recommended Courses</Text>

          {error ? <View style={styles.banner}><Text style={styles.bannerText}>{error}</Text></View> : null}

          {loading ? (
            <ActivityIndicator color={colors.blue} style={{ marginTop: 20 }} />
          ) : courses.length === 0 && !error ? (
            <Text style={styles.empty}>No courses available right now.</Text>
          ) : (
            courses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseTop}>
                  {course.ugcApproved ? (
                    <Text style={styles.ugcPill}>UGC APPROVED</Text>
                  ) : <View />}
                  {typeof course.matchPercent === 'number' ? (
                    <Text style={styles.matchPill}>{course.matchPercent}% Match</Text>
                  ) : null}
                </View>
                <Text style={styles.courseName}>{course.degreeName}</Text>
                <Text style={styles.courseUni}>{course.uniName}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('StudentCourses', { focusId: course.id })}
                  style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                >
                  <Text style={styles.outlineButtonText}>View Details & Entry Requirements</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
        <WelcomeToast
          visible={showToast}
          name={firstName}
          loginTime={user?.lastLoginAt}
          onHide={() => {
            setShowToast(false);
            navigation.setParams({ welcome: false });
          }}
        />
      </View>

      <StudentNav active="StudentHome" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 24 },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.navy, paddingVertical: 0 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  welcomeTitle: { color: colors.navy, fontSize: 22, fontWeight: '800' },
  welcomeSub: { color: colors.slate, fontSize: 12, lineHeight: 17, marginTop: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 7 },
  progressLabel: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.blue },

  aptitudeCard: {
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.bluePale,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  aptitudeHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  aptitudeIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  aptitudeIconText: { fontSize: 22 },
  aptitudeCopy: { flex: 1 },
  aptitudeTitle: { color: colors.blue, fontSize: 15, fontWeight: '800' },
  aptitudeText: { color: colors.slate600, fontSize: 12, lineHeight: 17, marginTop: 4 },

  primaryButton: {
    height: 44, borderRadius: 10, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },

  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '800', marginBottom: 12 },

  banner: {
    backgroundColor: colors.redLight, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  bannerText: { color: colors.redStrong, fontSize: 11.5 },
  empty: { color: colors.slate, fontSize: 12.5, textAlign: 'center', marginTop: 16 },

  courseCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ugcPill: {
    color: colors.greenDark, backgroundColor: colors.greenPale, fontSize: 8.5, fontWeight: '800',
    textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  matchPill: {
    color: colors.blue, backgroundColor: colors.blueLight, fontSize: 9, fontWeight: '800',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  courseName: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  courseUni: { color: colors.slate, fontSize: 12, marginTop: 3 },
  outlineButton: {
    marginTop: 12, height: 40, borderRadius: 9, borderWidth: 1, borderColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineButtonText: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


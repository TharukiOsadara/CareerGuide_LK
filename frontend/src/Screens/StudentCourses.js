import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
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
import { getCourses } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';
const filters = ['All Courses', 'UGC Approved', 'Computing & IT', 'Engineering', 'Business'];

function normalizeCourse(course) {
  return {
    ...course,
    match: course.match ?? course.match_percentage ?? 0,
    category: course.category ?? course.stream,
    ugcApproved: course.ugcApproved ?? course.ugc_approved,
  };
}

function CourseCard({ course, navigation }) {
  return (
    <View style={styles.courseCard}>
      <View style={styles.cardHeader}>
        {course.ugcApproved && (
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedBadgeText}>UGC APPROVED</Text>
          </View>
        )}
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{course.match}% Match</Text>
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

export default function StudentCourses({ navigation, route }) {
  const [courses, setCourses] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All Courses');
  const [searchQuery, setSearchQuery] = useState(route?.params?.filters?.search || '');
  const [isLoading, setIsLoading] = useState(true);
  const routeFilters = route?.params?.filters || {};
  const goBackToPreviousScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const remoteCourses = await getCourses({
          ...routeFilters,
          search: searchQuery,
          ugcApproved: activeFilter === 'UGC Approved' ? 'true' : undefined,
          stream: activeFilter !== 'All Courses' && activeFilter !== 'UGC Approved'
            ? activeFilter
            : routeFilters.stream,
        });
        if (!Array.isArray(remoteCourses)) {
          throw new Error('Course response must contain an array');
        }
        if (isMounted) {
          setCourses(remoteCourses.map(normalizeCourse));
        }
      } catch (error) {
        console.warn('Unable to load courses from the API; showing fallback courses.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [activeFilter, routeFilters.maxZ, routeFilters.minZ, routeFilters.universityType, routeFilters.stream, searchQuery]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !normalizedQuery ||
        [course.title, course.institute, course.category]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesFilter =
        activeFilter === 'All Courses' ||
        (activeFilter === 'UGC Approved' && course.ugcApproved) ||
        course.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, courses, searchQuery]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={goBackToPreviousScreen}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Courses</Text>
        <Pressable
          accessibilityLabel="Open course filters"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CourseFilter')}
          style={styles.headerFilterButton}
        >
          <Ionicons color={BLUE} name="options-outline" size={22} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBar}>
          <Ionicons color={MUTED} name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search courses, degrees, or institutes"
            onChangeText={setSearchQuery}
            placeholder="Search courses, degrees, or institutes..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
            value={searchQuery}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.filterList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => (
            <Pressable
              accessibilityRole="button"
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterPill, activeFilter === filter && styles.activeFilterPill]}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Recommended Courses</Text>
          {isLoading && <ActivityIndicator color={BLUE} size="small" />}
        </View>
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <CourseCard course={course} key={course.id || course.title} navigation={navigation} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={MUTED} name="book-search-outline" size={34} />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptyText}>Try another search or filter.</Text>
          </View>
        )}
      </ScrollView>

      <BottomNavigation activeRoute="StudentCourses" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: BACKGROUND, flex: 1 },
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
  backButton: { justifyContent: 'center', width: 82 },
  backIcon: { color: TEXT, fontSize: 36, fontWeight: '300', lineHeight: 38 },
  headerTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
  headerFilterButton: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
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
  searchInput: { color: TEXT, flex: 1, fontSize: 13, marginLeft: 9, paddingVertical: 0 },
  filterList: { gap: 8, paddingVertical: 16 },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeFilterPill: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { color: TEXT, fontSize: 12, fontWeight: '600' },
  activeFilterText: { color: '#FFFFFF' },
  resultsHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 2 },
  sectionTitle: { color: TEXT, flex: 1, fontSize: 18, fontWeight: '800' },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  approvedBadge: { backgroundColor: '#E6F4EA', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  approvedBadgeText: { color: '#218739', fontSize: 10, fontWeight: '800' },
  matchBadge: { backgroundColor: '#DEEBFF', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  matchBadgeText: { color: BLUE, fontSize: 10, fontWeight: '800' },
  courseTitle: { color: TEXT, fontSize: 16, fontWeight: '800', lineHeight: 22, marginTop: 13 },
  institute: { color: MUTED, fontSize: 13, marginTop: 6 },
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
  detailsButtonText: { color: BLUE, fontSize: 12, fontWeight: '700', marginRight: 7 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 13, marginTop: 5 },
});

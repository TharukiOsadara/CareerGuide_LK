import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import { getCourses } from '../services/api';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

const INITIAL_FILTERS = {
  searchTerm: 'B.Sc. (Hons)',
  selectedStream: 'Physical Science',
  minZScore: '0.00',
  maxZScore: '3.00',
  universityType: 'Government',
};

const streams = ['Physical Science', 'Biological Science', 'Commerce', 'Arts'];
const universityTypes = ['Government', 'Private', 'Both'];
const suggestions = [
  'BSC (HONS) SOFTWARE ENGINEERING',
  'BSC (HONS) ELECTRICAL ENGINEERING',
  'BSC(HONS) DATA ENGINEERING',
];

export default function CourseFilterScreen({ navigation }) {
  const [searchTerm, setSearchTerm] = useState(INITIAL_FILTERS.searchTerm);
  const [selectedStream, setSelectedStream] = useState(INITIAL_FILTERS.selectedStream);
  const [minZScore, setMinZScore] = useState(INITIAL_FILTERS.minZScore);
  const [maxZScore, setMaxZScore] = useState(INITIAL_FILTERS.maxZScore);
  const [universityType, setUniversityType] = useState(INITIAL_FILTERS.universityType);
  const [resultCount, setResultCount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const goBackToPreviousScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const handleReset = () => {
    setSearchTerm(INITIAL_FILTERS.searchTerm);
    setSelectedStream(INITIAL_FILTERS.selectedStream);
    setMinZScore(INITIAL_FILTERS.minZScore);
    setMaxZScore(INITIAL_FILTERS.maxZScore);
    setUniversityType(INITIAL_FILTERS.universityType);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      getCourses({
        search: searchTerm,
        stream: selectedStream,
        minZ: minZScore,
        maxZ: maxZScore,
        universityType,
      })
        .then((courses) => setResultCount(courses.length))
        .catch((error) => console.warn('Unable to load filtered courses.', error))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStream, minZScore, maxZScore, universityType]);

  const applyFilters = () => navigation.navigate('StudentCourses', {
    filters: { search: searchTerm, stream: selectedStream, minZ: minZScore, maxZ: maxZScore, universityType },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBackToPreviousScreen}
          style={styles.headerButton}
        >
          <Ionicons color={TEXT} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Find Your Course</Text>
        <Pressable
          accessibilityLabel="Search courses"
          accessibilityRole="button"
          style={styles.headerButton}
        >
          <Ionicons color={BLUE} name="search" size={22} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchCard}>
          <Ionicons color={BLUE} name="search" size={20} />
          <TextInput
            autoFocus
            accessibilityLabel="Search courses"
            onChangeText={setSearchTerm}
            selectionColor={BLUE}
            style={styles.searchInput}
            value={searchTerm}
          />
        </View>

        <Text style={styles.sectionLabel}>STREAM</Text>
        <View style={styles.pillGrid}>
          {streams.map((stream) => {
            const isSelected = stream === selectedStream;
            return (
              <Pressable
                accessibilityRole="button"
                key={stream}
                onPress={() => setSelectedStream(stream)}
                style={[styles.pill, isSelected && styles.selectedPill]}
              >
                <Text style={[styles.pillText, isSelected && styles.selectedPillText]}>
                  {stream}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Z-SCORE RANGE</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreField}>
            <Text style={styles.inputLabel}>Min Z-Score</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setMinZScore}
              style={styles.scoreInput}
              value={minZScore}
            />
          </View>
          <View style={styles.scoreField}>
            <Text style={styles.inputLabel}>Max Z-Score</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setMaxZScore}
              style={styles.scoreInput}
              value={maxZScore}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>UNIVERSITY TYPE</Text>
        <View style={styles.segmentedControl}>
          {universityTypes.map((type) => {
            const isSelected = type === universityType;
            return (
              <Pressable
                accessibilityRole="button"
                key={type}
                onPress={() => setUniversityType(type)}
                style={[styles.segment, isSelected && styles.selectedSegment]}
              >
                <Text style={[styles.segmentText, isSelected && styles.selectedSegmentText]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>RECENT SEARCHES / SUGGESTED RESULTS</Text>
        {isLoading && <ActivityIndicator color={BLUE} />}
        <View style={styles.suggestionsCard}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion}
              onPress={() => setSearchTerm(suggestion)}
              style={[styles.suggestion, index < suggestions.length - 1 && styles.suggestionBorder]}
            >
              <Ionicons color={MUTED} name="search-outline" size={17} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable accessibilityRole="button" onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={applyFilters}
          style={styles.applyButton}
        >
          <Text style={styles.applyText}>Apply Filters ({resultCount ?? 0} Results)</Text>
        </Pressable>
      </View>
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
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: 'center',
    borderColor: BORDER,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { color: TEXT, fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 190 },
  searchCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: BLUE,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  searchInput: { color: TEXT, flex: 1, fontSize: 15, marginLeft: 10 },
  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 24,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  pill: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedPill: { backgroundColor: BLUE, borderColor: BLUE },
  pillText: { color: TEXT, fontSize: 12, fontWeight: '600' },
  selectedPillText: { color: '#FFFFFF' },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreField: { flex: 1 },
  inputLabel: { color: MUTED, fontSize: 11, marginBottom: 6 },
  scoreInput: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderRadius: 9,
    borderWidth: 1,
    color: TEXT,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  segmentedControl: {
    backgroundColor: '#EBECF0',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 4,
  },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 11 },
  selectedSegment: { backgroundColor: BLUE },
  segmentText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  selectedSegmentText: { color: '#FFFFFF' },
  suggestionsCard: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14 },
  suggestion: { alignItems: 'center', flexDirection: 'row', minHeight: 52 },
  suggestionBorder: { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionText: { color: TEXT, flex: 1, fontSize: 12, fontWeight: '700', marginLeft: 10 },
  actionBar: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    bottom: 72,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
  },
  resetButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingHorizontal: 12 },
  resetText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  applyButton: {
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  applyText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

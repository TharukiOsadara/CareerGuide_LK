import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../components/ProfileHeader';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';

export default function StudentCareerPathScreen({ navigation, route }) {
  const matches = route?.params?.matches;
  const careers = Array.isArray(matches) ? matches : matches?.careerPaths || [];

  return (
    <SafeAreaView style={styles.container}>
      <ProfileHeader
        title="Your Career Matches"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Career &amp; Course Matches</Text>
        <Text style={styles.subtitle}>
          {route?.params?.subtitle || 'Your academic profile has been saved successfully.'}
        </Text>
        {careers.length ? careers.map((career, index) => (
          <View key={career.title || index} style={styles.card}>
            <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
            <View style={styles.copy}>
              <Text style={styles.careerTitle}>{career.title || career.name}</Text>
              <Text style={styles.match}>{career.match || 'Recommended match'}</Text>
              {career.note && <Text style={styles.note}>{career.note}</Text>}
            </View>
          </View>
        )) : (
          <View style={styles.card}><Text style={styles.note}>Matches will appear here once course data is available.</Text></View>
        )}

        {route?.params?.fromQuiz ? (
          <>
            <Text style={styles.disclaimer}>
              These results are guidance to support your decision, not a final answer. Talk them through with your counsellor.
            </Text>
            <Pressable onPress={() => navigation.navigate('StudentCourses')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Explore matching courses</Text>
            </Pressable>
            <Pressable onPress={() => navigation.replace('AptitudeQuiz')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Retake the test</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Main')} style={styles.linkButton}>
              <Text style={styles.linkText}>Back to home</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F4F7FC', flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', height: 64, justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { alignItems: 'center', width: 40 },
  title: { color: TEXT, fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  heading: { color: TEXT, fontSize: 22, fontWeight: '800' },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 8, marginBottom: 20 },
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, flexDirection: 'row', marginBottom: 12, padding: 16 },
  rank: { alignItems: 'center', backgroundColor: '#DEEBFF', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  rankText: { color: BLUE, fontWeight: '800' },
  copy: { flex: 1, marginLeft: 12 },
  careerTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  match: { color: BLUE, fontSize: 13, fontWeight: '700', marginTop: 4 },
  note: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 4 },
  disclaimer: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 6 },
  primaryButton: { alignItems: 'center', backgroundColor: BLUE, borderRadius: 11, marginTop: 12, paddingVertical: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: BLUE, borderRadius: 11, borderWidth: 1.5, marginTop: 10, paddingVertical: 13 },
  secondaryButtonText: { color: BLUE, fontSize: 14, fontWeight: '800' },
  linkButton: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  linkText: { color: MUTED, fontSize: 13, fontWeight: '700' },
});

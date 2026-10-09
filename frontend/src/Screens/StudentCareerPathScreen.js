import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';

export default function StudentCareerPathScreen({ navigation, route }) {
  const matches = route?.params?.matches;
  const careers = Array.isArray(matches) ? matches : matches?.careerPaths || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons color={TEXT} name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.title}>Your Career Matches</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Career &amp; Course Matches</Text>
        <Text style={styles.subtitle}>Your academic profile has been saved successfully.</Text>
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
});

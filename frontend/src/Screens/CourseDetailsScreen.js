import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../Components/BottomNavigation';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

export default function CourseDetailsScreen({ navigation, route }) {
  const [isSaved, setIsSaved] = useState(false);
  const courseId = route?.params?.courseId;
  const courseTitle =
    courseId === 'software-engineering'
      ? 'BSc (Hons) Software Engineering'
      : 'BSc (Hons) Data Science & AI';

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('StudentCourses');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.roundButton}>
          <Ionicons color={TEXT} name="chevron-back" size={23} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>{courseTitle}</Text>
        <Pressable
          accessibilityLabel={isSaved ? 'Remove course bookmark' : 'Save course'}
          accessibilityRole="button"
          onPress={() => setIsSaved((saved) => !saved)}
          style={styles.roundButton}
        >
          <Ionicons color={isSaved ? BLUE : TEXT} name={isSaved ? 'bookmark' : 'bookmark-outline'} size={21} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.badgesRow}>
            <View style={styles.approvedBadge}><Text style={styles.approvedText}>✔ UGC Approved</Text></View>
            <View style={styles.nvqBadge}><Text style={styles.nvqText}>🎖 NVQ Level 7</Text></View>
          </View>
          <Text style={styles.source}>Source: Official UGC Handbook 2026/2027 | Last Updated: Sep 2026</Text>
          <View style={styles.institutionRow}>
            <MaterialCommunityIcons color={BLUE} name="school-outline" size={24} />
            <Text style={styles.institution}>University of Colombo (UOC)</Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoBox icon="target" label="Min Z-Score" value="2.10" note="Physical Science" />
            <InfoBox icon="clock-outline" label="Duration" value="4 Years" note="Full-Time" />
            <InfoBox icon="calendar-month-outline" label="Intake" value="Feb & Sept" note="Twice Annually" />
            <InfoBox icon="wallet-outline" label="Estimated Fee" value="LKR 2.4M" note="Total Program" />
          </View>
        </View>

        <View style={styles.demandBanner}>
          <Text style={styles.demandTitle}>📈 94% HIGH INDUSTRY DEMAND</Text>
          <Text style={styles.demandText}>💵 Entry Salary Range: LKR 150,000 - 250,000/mo</Text>
          <Text style={styles.demandText}>🏢 Top Hiring Partners: Virtusa, Sysco LABS, WSO2</Text>
        </View>

        <Text style={styles.sectionTitle}>Check Affiliated Campus Availability</Text>
        <View style={styles.briefCard}>
          <View style={styles.briefHeader}>
            <View style={styles.documentIcon}><MaterialCommunityIcons color="#DE350B" name="file-document-outline" size={25} /></View>
            <View style={styles.briefCopy}>
              <Text style={styles.briefTitle}>Official 1-Page Course Brief</Text>
              <Text style={styles.briefSubtitle}>Complete course summary in PDF format</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" style={styles.downloadButton}>
            <Ionicons color="#FFFFFF" name="download-outline" size={19} />
            <Text style={styles.downloadText}>Download 1-Page Official Course Brief (PDF)</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNavigation activeRoute="StudentCourses" navigation={navigation} />
    </SafeAreaView>
  );
}

function InfoBox({ icon, label, value, note }) {
  return (
    <View style={styles.infoBox}>
      <MaterialCommunityIcons color={BLUE} name={icon} size={18} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 64, justifyContent: 'space-between', paddingHorizontal: 16 },
  roundButton: { alignItems: 'center', borderColor: BORDER, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: TEXT, flex: 1, fontSize: 16, fontWeight: '800', marginHorizontal: 12, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 105 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  approvedBadge: { backgroundColor: '#E6F4EA', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  approvedText: { color: '#218739', fontSize: 11, fontWeight: '800' },
  nvqBadge: { backgroundColor: '#DEEBFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  nvqText: { color: BLUE, fontSize: 11, fontWeight: '800' },
  source: { color: MUTED, fontSize: 10, lineHeight: 16, marginTop: 12 },
  institutionRow: { alignItems: 'center', flexDirection: 'row', marginTop: 16 },
  institution: { color: BLUE, fontSize: 15, fontWeight: '800', marginLeft: 9 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  infoBox: { backgroundColor: '#F4F5F7', borderRadius: 10, minHeight: 105, padding: 11, width: '48%' },
  infoLabel: { color: MUTED, fontSize: 11, marginTop: 7 },
  infoValue: { color: TEXT, fontSize: 15, fontWeight: '800', marginTop: 5 },
  infoNote: { color: MUTED, fontSize: 10, marginTop: 3 },
  demandBanner: { backgroundColor: '#FFF4CE', borderRadius: 14, marginTop: 16, padding: 15 },
  demandTitle: { color: '#974F0C', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  demandText: { color: '#7A4E00', fontSize: 12, lineHeight: 20 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '800', marginBottom: 11, marginTop: 25 },
  briefCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15 },
  briefHeader: { alignItems: 'center', flexDirection: 'row' },
  documentIcon: { alignItems: 'center', backgroundColor: '#FFEBE6', borderRadius: 10, height: 48, justifyContent: 'center', width: 48 },
  briefCopy: { flex: 1, marginLeft: 12 },
  briefTitle: { color: TEXT, fontSize: 14, fontWeight: '800' },
  briefSubtitle: { color: MUTED, fontSize: 12, marginTop: 5 },
  downloadButton: { alignItems: 'center', backgroundColor: BLUE, borderRadius: 9, flexDirection: 'row', justifyContent: 'center', marginTop: 16, minHeight: 48, paddingHorizontal: 10 },
  downloadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 8 },
});

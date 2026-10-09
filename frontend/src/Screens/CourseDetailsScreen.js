import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getCourseDetails } from '../services/api';
import CourseMatchCard from '../components/CourseMatchCard';
import BottomNavigation from '../components/BottomNavigation';

const BLUE = '#0052CC';
const TEXT = '#172B4D';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';
const BACKGROUND = '#F4F7FC';

export default function CourseDetailsScreen({ navigation, route }) {
  const [isSaved, setIsSaved] = useState(false);
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const courseId = route?.params?.courseId;
  const courseTitle =
    courseId === 'software-engineering'
      ? 'BSc (Hons) Software Engineering'
      : 'BSc (Hons) Data Science & AI';
  useEffect(() => {
    let mounted = true;
    if (!courseId) {
      setIsLoading(false);
      return undefined;
    }
    getCourseDetails(courseId)
      .then((data) => mounted && setCourse(data?.course || data))
      .catch((error) => console.warn('Unable to load course details.', error))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, [courseId]);
  const displayTitle = course?.title || courseTitle;
  const institution = course?.institute || course?.university || 'University of Colombo (UOC)';
  const minZScore = course?.min_z_score ?? '2.10';
  const duration = course?.duration || '4 Years';
  const intake = course?.intake || 'Feb & Sept';
  const estimatedFee = course?.estimated_fee || course?.fee || 'LKR 2.4M';

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }[character]));
      const html = `
        <!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page { margin: 28px; }
              body { color: #172B4D; font-family: Arial, sans-serif; margin: 0; }
              .header { border-bottom: 3px solid #0052CC; padding-bottom: 14px; }
              h1 { color: #0052CC; font-size: 22px; margin: 0 0 8px; }
              h2 { font-size: 17px; margin: 22px 0 10px; }
              .muted { color: #6B778C; font-size: 11px; }
              .course-title { font-size: 19px; font-weight: bold; margin-top: 22px; }
              .institute { color: #0052CC; font-size: 14px; font-weight: bold; margin-top: 7px; }
              .badge { border-radius: 12px; display: inline-block; font-size: 10px; font-weight: bold; margin: 12px 6px 0 0; padding: 6px 10px; }
              .green { background: #E6F4EA; color: #218739; }
              .blue { background: #DEEBFF; color: #0052CC; }
              table { border-collapse: separate; border-spacing: 7px; margin: 4px -7px 0; width: 100%; }
              td { background: #F4F5F7; border-radius: 7px; padding: 11px; vertical-align: top; width: 50%; }
              .label { color: #6B778C; font-size: 10px; }
              .value { font-size: 14px; font-weight: bold; margin-top: 5px; }
              .insights { background: #FFF4CE; border-radius: 10px; padding: 13px; }
              .insights p { color: #7A4E00; font-size: 12px; margin: 6px 0; }
              footer { border-top: 1px solid #DFE1E6; color: #6B778C; font-size: 10px; margin-top: 24px; padding-top: 12px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CareerGuide LK - Official Course Brief</h1>
              <div class="muted">Official UGC course information</div>
            </div>
            <div class="course-title">${escapeHtml(displayTitle)}</div>
            <div class="institute">${escapeHtml(institution)}</div>
            <span class="badge green">✔ UGC Approved</span>
            <span class="badge blue">🎖 NVQ Level 7</span>
            <div class="muted" style="margin-top: 10px;">Stream: ${escapeHtml(course?.stream || 'Physical Science')}</div>
            <h2>Summary Metrics</h2>
            <table>
              <tr>
                <td><div class="label">Min Z-Score</div><div class="value">${escapeHtml(minZScore)}</div></td>
                <td><div class="label">Program Duration</div><div class="value">${escapeHtml(duration)}</div></td>
              </tr>
              <tr>
                <td><div class="label">Intake Months</div><div class="value">${escapeHtml(intake)}</div></td>
                <td><div class="label">Estimated Tuition Fee</div><div class="value">${escapeHtml(estimatedFee)}</div></td>
              </tr>
            </table>
            <h2>Career &amp; Industry Insights</h2>
            <div class="insights">
              <p><strong>📈 94% HIGH INDUSTRY DEMAND</strong></p>
              <p>💵 Entry Salary Range: LKR 150,000 - 250,000/mo</p>
              <p>🏢 Top Hiring Partners: Virtusa, Sysco LABS, WSO2</p>
            </div>
            <footer>Generated via CareerGuide LK Mobile Portal • Official UGC Intake Data</footer>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share or save course brief',
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        console.warn('Native sharing is not available on this device.');
      }
    } catch (error) {
      console.warn('Unable to generate or share course brief PDF.', error);
    } finally {
      setIsDownloading(false);
    }
  };

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
        <Text numberOfLines={1} style={styles.headerTitle}>{displayTitle}</Text>
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
        {isLoading && <ActivityIndicator color={BLUE} />}
        <View style={styles.summaryCard}>
          <View style={styles.badgesRow}>
            <View style={styles.approvedBadge}><Text style={styles.approvedText}>✔ UGC Approved</Text></View>
            <View style={styles.nvqBadge}><Text style={styles.nvqText}>🎖 NVQ Level 7</Text></View>
          </View>
          <Text style={styles.source}>Source: Official UGC Handbook 2026/2027 | Last Updated: Sep 2026</Text>
          <View style={styles.institutionRow}>
            <MaterialCommunityIcons color={BLUE} name="school-outline" size={24} />
            <Text style={styles.institution}>{institution}</Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoBox icon="target" label="Min Z-Score" value={minZScore} note="Physical Science" />
            <InfoBox icon="clock-outline" label="Duration" value={duration} note="Full-Time" />
            <InfoBox icon="calendar-month-outline" label="Intake" value={intake} note="Twice Annually" />
            <InfoBox icon="wallet-outline" label="Estimated Fee" value={estimatedFee} note="Total Program" />
          </View>
        </View>

        {course?.id ? (
          <CourseMatchCard courseId={course.id} courseTitle={displayTitle} navigation={navigation} />
        ) : null}

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
          <Pressable
            accessibilityLabel="Download official course brief PDF"
            accessibilityRole="button"
            disabled={isDownloading}
            onPress={handleDownloadPDF}
            style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
          >
            {isDownloading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons color="#FFFFFF" name="download-outline" size={19} />
                <Text style={styles.downloadText}>Download 1-Page Official Course Brief (PDF)</Text>
              </>
            )}
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
  downloadButtonDisabled: { opacity: 0.7 },
  downloadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 8 },
});

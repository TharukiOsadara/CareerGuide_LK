import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import { colors } from '../../styles/colors';

const FEATURES = [
  { icon: 'ðŸŽ“', title: 'Verified UGC Degrees', text: 'Only accredited programs from recognised Sri Lankan universities and institutes.' },
  { icon: 'ðŸ§ ', title: 'AI Aptitude Matching', text: 'A 10-minute quiz maps your strengths to the right degree and career path.' },
  { icon: 'ðŸ“Š', title: 'Z-Score Intelligence', text: 'Live cut-off marks by district and intake year so you apply with confidence.' },
  { icon: 'ðŸ§­', title: 'Clear Career Paths', text: 'See where each degree leads â€” roles, industries and earning potential.' },
];

export default function About({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>â†</Text>
        </Pressable>
        <Brand size="sm" />
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoTile}><Text style={styles.logoEmoji}>ðŸŽ“</Text></View>
          <Text style={styles.title}>About CareerGuide LK</Text>
          <Text style={styles.subtitle}>
            CareerGuide LK helps Sri Lankan A/L students turn their results into a confident
            next step â€” matching them with UGC-approved and accredited university programs.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat value="142+" label="Programs" />
          <Stat value="28" label="Institutes" />
          <Stat value="1,240+" label="Students" />
        </View>

        <Text style={styles.sectionTitle}>Why students choose us</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.card}>
            <View style={styles.cardIcon}><Text style={{ fontSize: 20 }}>{f.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardText}>{f.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.missionCard}>
          <Text style={styles.missionTitle}>Our mission</Text>
          <Text style={styles.missionText}>
            To make higher-education decisions transparent and data-driven for every student in
            Sri Lanka â€” regardless of district, school or background.
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Onboarding')}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Get Started</Text>
          <Text style={styles.arrow}>â†’</Text>
        </Pressable>

        <Text style={styles.footer}>ðŸ›¡ï¸  Protected under Sri Lankan educational privacy standards</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 54, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { fontSize: 22, color: colors.navy },
  content: { padding: 18, paddingBottom: 36 },
  hero: { alignItems: 'center', marginTop: 8 },
  logoTile: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 34 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginTop: 14 },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 10 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 19, fontWeight: '800', color: colors.blue },
  statLabel: { fontSize: 11, color: colors.slate, marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 24, marginBottom: 12 },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: colors.navy },
  cardText: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 },
  missionCard: { backgroundColor: colors.blueLight, borderColor: colors.bluePale, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 14 },
  missionTitle: { fontSize: 14, fontWeight: '800', color: colors.blue },
  missionText: { fontSize: 12.5, lineHeight: 19, color: colors.slateDark, marginTop: 6 },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20, marginLeft: 10 },
  pressed: { opacity: 0.8 },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 20 },
});


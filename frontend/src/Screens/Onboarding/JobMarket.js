import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import BackButton, { BACK_WIDTH } from '../../Components/BackButton';
import Icon from '../../Components/Icon';

// Public "Job Market Indicators" page opened from the onboarding Core Utilities card.
// Figures are indicative content kept here in one place; swap INSIGHTS for an API
// response when a live labour-market data source is available.
const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
];

const CYAN = '#06B6D4';
const SECTOR_COLORS = [colors.blue, colors.green, CYAN, '#F59E0B'];

const DEMAND = {
  high: { label: 'High Demand', fg: colors.greenDark, bg: colors.greenPale },
  growing: { label: 'Growing', fg: colors.blue, bg: colors.blueChip },
  stable: { label: 'Stable', fg: colors.blue, bg: colors.blueLight },
};

const ROLES = [
  { title: 'Software Developer', salary: 'LKR 150K–350K', demand: 'high' },
  { title: 'Data Analyst', salary: 'LKR 120K–280K', demand: 'high' },
  { title: 'Registered Nurse', salary: 'LKR 80K–180K', demand: 'growing' },
  { title: 'Civil Engineer', salary: 'LKR 100K–250K', demand: 'stable' },
];

const INSIGHTS = {
  month: {
    sectors: [['Information Technology', 85], ['Healthcare & Nursing', 72], ['Engineering', 68], ['Finance & Banking', 55]],
    skills: 'Python, Cloud Computing, and Data Science are the most sought-after skills this month.',
  },
  quarter: {
    sectors: [['Information Technology', 82], ['Healthcare & Nursing', 74], ['Engineering', 65], ['Finance & Banking', 58]],
    skills: 'Python, Cloud Computing, and Data Science are the most sought-after skills this quarter.',
  },
  year: {
    sectors: [['Information Technology', 80], ['Healthcare & Nursing', 76], ['Engineering', 63], ['Finance & Banking', 60]],
    skills: 'Software engineering, nursing and data analytics roles grew fastest over the past year.',
  },
};

export default function JobMarket({ navigation }) {
  const [period, setPeriod] = useState('month');
  const data = INSIGHTS[period];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Job Market Insights</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period tabs */}
        <View style={styles.tabs}>
          {PERIODS.map((p) => {
            const on = period === p.key;
            return (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Trending sectors */}
        <View style={styles.headingRow}>
          <Icon name="key" size={18} color={colors.blue} />
          <Text style={styles.heading}>Trending Job Sectors</Text>
        </View>
        <View style={styles.card}>
          {data.sectors.map(([name, pct], i) => (
            <View key={name} style={[styles.sector, i > 0 && { marginTop: 14 }]}>
              <View style={styles.sectorTop}>
                <Text style={styles.sectorName}>{name}</Text>
                <Text style={[styles.sectorPct, { color: SECTOR_COLORS[i] }]}>{pct}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: SECTOR_COLORS[i] }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Skills gap */}
        <View style={styles.alert}>
          <Icon name="shield" size={22} color={colors.orange} />
          <Text style={styles.alertText}>
            <Text style={styles.alertStrong}>Skills Gap Alert: </Text>{data.skills}
          </Text>
        </View>

        {/* Roles */}
        <Text style={[styles.heading, { marginTop: 22, marginLeft: 0 }]}>Top In-Demand Roles</Text>
        {ROLES.map((r) => {
          const d = DEMAND[r.demand];
          return (
            <View key={r.title} style={styles.role}>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{r.title}</Text>
                <Text style={styles.roleSalary}>Est. Salary: {r.salary}</Text>
              </View>
              <View style={[styles.demand, { backgroundColor: d.bg }]}>
                <Text style={[styles.demandText, { color: d.fg }]}>{d.label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 15, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  tabs: { flexDirection: 'row', backgroundColor: colors.blueChip, borderRadius: 999, padding: 4, marginTop: 6 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: colors.blue },
  tabText: { color: colors.slate, fontSize: 12, fontWeight: '700' },
  tabTextOn: { color: colors.white, fontWeight: '800' },

  headingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  heading: { color: colors.navy, fontSize: 16, fontWeight: '800', marginLeft: 8 },

  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  sector: {},
  sectorTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sectorName: { color: colors.navy, fontSize: 12.5, fontWeight: '600' },
  sectorPct: { fontSize: 12.5, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bgSofter, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

  alert: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.yellowPale, borderRadius: 12,
    borderWidth: 1, borderColor: '#FDE68A', padding: 14, marginTop: 16,
  },
  alertText: { flex: 1, color: colors.warnText || '#92400E', fontSize: 12, lineHeight: 18, marginLeft: 10 },
  alertStrong: { fontWeight: '800' },

  role: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12,
    padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border,
  },
  roleTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800' },
  roleSalary: { color: colors.slate, fontSize: 11.5, marginTop: 3 },
  demand: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  demandText: { fontSize: 10, fontWeight: '800' },
});

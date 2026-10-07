import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

export default function ProgressBar({ label, percent }) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${value} percent`}
      accessibilityValue={{ min: 0, max: 100, now: value }}
    >
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.navy, fontSize: font.small, fontWeight: '600' },
  value: { color: colors.navy, fontSize: font.small, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
});

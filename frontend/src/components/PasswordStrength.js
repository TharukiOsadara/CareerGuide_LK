import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

// Returns 0..4. Also exported so screens can gate submission on strength.
export function scorePassword(pw = '') {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const META = [
  { label: '', color: colors.border, bars: 0 },
  { label: 'Weak Password', color: colors.red, bars: 1 },
  { label: 'Low Medium', color: colors.orange, bars: 2 },
  { label: 'Medium', color: '#F59E0B', bars: 3 },
  { label: 'Strong Password', color: colors.green, bars: 4 },
];

export default function PasswordStrength({ value }) {
  if (!value) return null;
  const score = scorePassword(value);
  const meta = META[score];
  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i < meta.bars ? meta.color : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bars: { flexDirection: 'row', flex: 1, gap: 5 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  label: { marginLeft: 10, fontSize: 11, fontWeight: '700' },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Brand from './Brand';
import BackButton, { BACK_WIDTH } from './BackButton';
import { colors } from '../styles/colors';

// Same header on every profile page (student, parent, counsellor, admin):
// back button, the CareerGuide LK logo (graduation cap) in the middle, and the page title below.
export default function ProfileHeader({ title, onBack, right, style }) {
  return (
    <View style={[styles.bar, style]}>
      <View style={styles.row}>
        <View style={styles.side}>{onBack ? <BackButton onPress={onBack} /> : null}</View>
        <Brand size="sm" />
        <View style={[styles.side, styles.sideRight]}>{right || null}</View>
      </View>
      {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  side: { width: BACK_WIDTH + 16 },
  sideRight: { alignItems: 'flex-end' },
  title: { color: colors.navy, fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 6 },
});

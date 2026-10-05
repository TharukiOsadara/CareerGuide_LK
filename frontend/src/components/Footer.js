import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

export default function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>CareerGuide LK</Text>
      <Text style={styles.caption}>Your trusted career companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 28, paddingVertical: 20 },
  text: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  caption: { color: colors.slate, fontSize: 10, marginTop: 4 },
});

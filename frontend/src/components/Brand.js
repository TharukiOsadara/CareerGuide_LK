import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

// Graduation-cap logo tile (#0052CC) + "CareerGuide LK" wordmark.
export default function Brand({ size = 'md', showText = true, textColor = colors.navy }) {
  const dims = size === 'lg' ? 34 : size === 'sm' ? 22 : 28;
  const font = size === 'lg' ? 20 : size === 'sm' ? 13 : 16;
  return (
    <View style={styles.row}>
      <View style={[styles.logo, { width: dims, height: dims, borderRadius: dims * 0.28 }]}>
        <Text style={{ fontSize: dims * 0.6 }}>🎓</Text>
      </View>
      {showText && (
        <Text style={[styles.text, { fontSize: font, color: textColor }]}>
          CareerGuide <Text style={styles.accent}>LK</Text>
        </Text>
      )}
    </View>
  );
}

export function LogoTile({ dims = 56, emoji = '🎓' }) {
  return (
    <View style={[styles.logo, { width: dims, height: dims, borderRadius: dims * 0.28 }]}>
      <Text style={{ fontSize: dims * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  text: { fontWeight: '800' },
  accent: { color: colors.blue },
});

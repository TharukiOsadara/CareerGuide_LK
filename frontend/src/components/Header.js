import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

export default function Header({ onSignIn }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>⌂</Text>
        </View>
        <Text style={styles.brandText}>
          CareerGuide <Text style={styles.brandAccent}>LK</Text>
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onSignIn} hitSlop={10}>
          <Text style={styles.signIn}>Sign In</Text>
        </Pressable>
        <Text style={styles.menu}>≡</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, paddingHorizontal: 12, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 27, height: 27, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, marginRight: 7 },
  logoMark: { color: colors.white, fontSize: 15, fontWeight: '700' },
  brandText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  brandAccent: { color: colors.blue },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  signIn: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  menu: { color: colors.muted, fontSize: 24, lineHeight: 21 },
});

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { colors } from '../styles/colors';

// Standard "‹ Back" control used in every screen header.
export const BACK_WIDTH = 64;

export default function BackButton({ onPress, label = 'Back', style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <Icon name="chevron-left" size={20} color={colors.blue} strokeWidth={2.4} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minWidth: BACK_WIDTH },
  text: { fontSize: 14, color: colors.blue, fontWeight: '700', marginLeft: 2 },
  pressed: { opacity: 0.6 },
});

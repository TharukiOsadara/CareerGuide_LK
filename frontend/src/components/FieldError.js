import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../styles/colors';

// Red helper line shown under an invalid form field.
export default function FieldError({ message, style }) {
  if (!message) return null;
  return <Text style={[styles.text, style]} accessibilityLiveRegion="polite">{message}</Text>;
}

// Border style to apply to an input box that has an error.
export const errorBorder = { borderColor: colors.redStrong, borderWidth: 1.5 };

const styles = StyleSheet.create({
  text: { color: colors.redStrong, fontSize: 11.5, marginTop: 5, lineHeight: 15 },
});

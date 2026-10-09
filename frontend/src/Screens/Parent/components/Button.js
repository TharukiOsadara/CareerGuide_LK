import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, TOUCH } from '../theme';
import Icon from '../../../components/Icon';

const VARIANTS = {
  primary: { bg: colors.blue, border: colors.blue, text: colors.white },
  secondary: { bg: colors.white, border: colors.border, text: colors.navy },
  outline: { bg: colors.white, border: colors.blue, text: colors.blue },
  danger: { bg: colors.dangerLight, border: colors.dangerBorder, text: colors.danger },
  signOut: { bg: colors.redStrong, border: colors.redStrong, text: colors.white },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  icon,
  accessibilityHint,
  style,
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.label, { color: v.text }]}>{label}</Text>
          {icon ? <Icon name={icon} size={18} color={v.text} style={{ marginLeft: 8 }} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: font.body, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
});

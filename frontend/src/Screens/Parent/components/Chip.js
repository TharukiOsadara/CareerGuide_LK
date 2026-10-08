import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import Icon from '../../../Components/Icon';

const TONES = {
  info: { bg: colors.blueLight, text: colors.blue },
  success: { bg: colors.successLight, text: colors.successText },
  warn: { bg: colors.yellow, text: colors.warnText },
  danger: { bg: colors.dangerLight, text: colors.danger },
  neutral: { bg: '#F1F5F9', text: colors.muted },
};

// Small status label. Never relies on colour alone - the text carries the meaning.
export default function Chip({ label, tone = 'neutral', icon, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }, style]}>
      {icon ? <Icon name={icon} size={13} color={t.text} strokeWidth={2.5} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: font.tiny, fontWeight: '700' },
});

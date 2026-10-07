import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, font, space } from '../theme';

// A privacy switch with a plain-language explanation underneath (UI-04).
// The whole row is a large tap target; the Switch itself is what screen readers
// announce (it reports on/off natively on iOS, Android and web).
export default function ToggleRow({ title, helper, value, onChange, disabled = false, last = false }) {
  return (
    <Pressable
      accessible={false}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.row, !last && styles.divider]}
    >
      <View style={styles.copy} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.title}>{title}</Text>
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      </View>
      {/* Pointer taps go to the row (so a tap never toggles twice); keyboard and
          screen-reader activation reach the Switch directly. */}
      <View pointerEvents="none">
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          accessibilityLabel={title}
          accessibilityHint={helper}
          trackColor={{ false: colors.border, true: colors.blue }}
          thumbColor={colors.white}
          activeThumbColor={colors.white} // web ignores thumbColor when on
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  copy: { flex: 1, paddingRight: space.md },
  title: { color: colors.navy, fontSize: font.body, fontWeight: '700' },
  helper: { color: colors.muted, fontSize: font.small, lineHeight: 19, marginTop: 4 },
});

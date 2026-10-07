import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, space } from '../theme';

export const PARENT_TABS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'progress', label: 'Progress', icon: '▥' },
  { key: 'counsellor', label: 'Counsellor', icon: '✉' },
  { key: 'privacy', label: 'Privacy', icon: '◈' },
];

export default function ParentTabBar({ active, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} accessibilityRole="tablist">
      {PARENT_TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
              <Text style={[styles.icon, selected && styles.active]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, selected && styles.active]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  pressed: { opacity: 0.7 },
  iconWrap: { width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.blueLight },
  icon: { fontSize: 18, color: colors.slate },
  label: { fontSize: font.tiny, color: colors.muted, fontWeight: '600', marginTop: 2 },
  active: { color: colors.blue, fontWeight: '800' },
});

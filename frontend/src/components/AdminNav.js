import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import Icon from './Icon';

// Bottom navigation for the admin area (Overview, Courses, Z-Scores, Logs, Settings).
// The admin profile is reached from the avatar in the header.
const ITEMS = [
  { key: 'AdminOverview', label: 'Overview', icon: 'grid' },
  { key: 'AdminCourses', label: 'Courses', icon: 'graduation-cap' },
  { key: 'AdminZScores', label: 'Z-Scores', icon: 'chart' },
  { key: 'AdminLogs', label: 'Audit Logs', icon: 'shield' },
  { key: 'AdminSettings', label: 'Settings', icon: 'settings' },
];

export default function AdminNav({ active, navigation }) {
  return (
    <View style={styles.bar}>
      {ITEMS.map((item) => {
        const on = active === item.key;
        return (
          <Pressable
            key={item.key}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => { if (!on) navigation.navigate(item.key); }}
          >
            <Icon name={item.icon} size={21} color={on ? colors.blue : colors.slate400} strokeWidth={on ? 2.2 : 1.8} />
            <Text style={[styles.label, on && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 8, paddingBottom: 14,
  },
  item: { flex: 1, alignItems: 'center' },
    label: { fontSize: 9.5, color: colors.slate400, marginTop: 3, fontWeight: '600' },
  labelActive: { color: colors.blue, fontWeight: '800' },
});

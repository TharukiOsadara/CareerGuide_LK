import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

// Bottom navigation for the student area. Each item navigates to its own screen.
const ITEMS = [
  { key: 'StudentHome', label: 'Home', icon: '🏠' },
  { key: 'StudentQuiz', label: 'Quiz', icon: '🧠' },
  { key: 'StudentCourses', label: 'Courses', icon: '📖' },
  { key: 'StudentProfile', label: 'Profile', icon: '👤' },
];

export default function StudentNav({ active, navigation }) {
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
            <Text style={[styles.icon, on && styles.iconActive]}>{item.icon}</Text>
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
  icon: { fontSize: 19, opacity: 0.45 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10.5, color: colors.slate400, marginTop: 3, fontWeight: '600' },
  labelActive: { color: colors.blue, fontWeight: '800' },
});

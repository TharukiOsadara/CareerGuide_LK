import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import Icon from './Icon';

// Bottom navigation for the student area. Each item navigates to its own screen.
const ITEMS = [
  { key: 'StudentHome', label: 'Home', icon: 'home' },
  { key: 'StudentCourses', label: 'Courses', icon: 'book' },
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
            <Icon name={item.icon} size={22} color={on ? colors.blue : colors.slate400} strokeWidth={on ? 2.2 : 1.8} />
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
    label: { fontSize: 10.5, color: colors.slate400, marginTop: 3, fontWeight: '600' },
  labelActive: { color: colors.blue, fontWeight: '800' },
});

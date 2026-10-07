import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

const LABELS = { student: 'Student', parent: 'Parent', counsellor: 'Counsellor', admin: 'Admin' };

// Segmented role selector. The active tab fills with brand blue (navy for admin).
export default function RoleTabs({ roles, value, onChange }) {
  return (
    <View style={styles.wrap}>
      {roles.map((role) => {
        const active = value === role;
        const activeBg = role === 'admin' ? colors.blue : colors.blue;
        return (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(role)}
            style={[styles.tab, active && { backgroundColor: activeBg }]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {LABELS[role]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.bluePale, borderRadius: 12, padding: 4 },
  tab: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.slate600 },
  labelActive: { color: colors.white },
});

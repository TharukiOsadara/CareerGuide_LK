import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChildSelector from './ChildSelector';
import { colors, font, space, TOUCH } from '../theme';

export default function ParentHeader({ title, onBack, showChild = true, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.titleRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {showChild ? (
        <View style={styles.child}>
          <ChildSelector />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH },
  back: { width: TOUCH, height: TOUCH, marginLeft: -space.md, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.navy, fontSize: 34, lineHeight: 36, marginTop: -4 },
  pressed: { opacity: 0.6 },
  title: { flex: 1, color: colors.navy, fontSize: font.title, fontWeight: '800' },
  child: { marginTop: space.sm },
});

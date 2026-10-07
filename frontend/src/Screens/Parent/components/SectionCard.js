import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, font, radius, space } from '../theme';

export default function SectionCard({ title, subtitle, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.header}>
          <View style={styles.titles}>
            {title ? (
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    marginHorizontal: space.lg,
    marginTop: space.md,
    ...cardShadow,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.md },
  titles: { flex: 1, paddingRight: space.sm },
  title: { color: colors.navy, fontSize: font.heading, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: font.small, marginTop: 2, lineHeight: 18 },
});

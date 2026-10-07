import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors, font, space } from '../theme';

export function LoadingState({ message = 'Loading…' }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Couldn't load this page</Text>
      <Text style={styles.message}>{error?.message || 'Something went wrong. Please try again.'}</Text>
      {onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

export function EmptyState({ title, message, actionLabel, onAction, compact = false }) {
  return (
    <View style={[styles.center, compact && styles.compact]}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel ? <Button label={actionLabel} variant="outline" onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 240 },
  compact: { flex: 0, minHeight: 0, paddingVertical: space.lg },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    lineHeight: 44,
    fontSize: 22,
    fontWeight: '800',
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  title: { color: colors.navy, fontSize: font.heading, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center', marginTop: space.sm },
  action: { marginTop: space.lg, minWidth: 160 },
});

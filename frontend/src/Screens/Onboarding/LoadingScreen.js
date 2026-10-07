import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/colors';

const DURATION_MS = 3000;

export default function LoadingScreen({ navigation }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / DURATION_MS) * 100)));
    }, 30);
    const timer = setTimeout(() => navigation.replace('Onboarding'), DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.content}>
        <Text style={styles.title}>CareerGuide LK</Text>
        <Text style={styles.subtitle}>Your Career Companion</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.loadingText}>Loading... {progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  content: { width: '78%', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textDark, marginBottom: 10 },
  subtitle: { fontSize: 16, color: colors.mutedLight, marginBottom: 60 },
  track: { width: '100%', height: 6, backgroundColor: colors.progressTrack, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.blue, borderRadius: 3 },
  loadingText: { fontSize: 14, color: colors.slate, marginTop: 20 },
});

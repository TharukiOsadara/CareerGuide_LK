import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Icon from '../../components/Icon';

const DURATION_MS = 3000;

// Splash palette (from the design spec).
const BLUE = '#0052CC';
const GREY = '#757575';
const NAVY = '#0F172A';
const WHITE = '#FFFFFF';
const BLUE_10 = 'rgba(0, 82, 204, 0.102)';

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
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      {/* Linear background: #0052CC at 5.88% -> 3.92% -> white */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BLUE} stopOpacity={0.0588} />
            <Stop offset="0.55" stopColor={BLUE} stopOpacity={0.0392} />
            <Stop offset="1" stopColor={WHITE} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <View style={styles.content}>
        <View style={styles.logo}>
          <Icon name="graduation-cap" size={32} color={WHITE} />
        </View>
        <Text style={styles.title}>
          CareerGuide <Text style={styles.accent}>LK</Text>
        </Text>
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
  container: { flex: 1, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  content: { width: '78%', alignItems: 'center' },
  logo: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: NAVY, marginBottom: 10 },
  accent: { color: BLUE },
  subtitle: { fontSize: 16, color: GREY, marginBottom: 60 },
  track: { width: '100%', height: 6, backgroundColor: BLUE_10, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: BLUE, borderRadius: 3 },
  loadingText: { fontSize: 14, color: GREY, marginTop: 20 },
});

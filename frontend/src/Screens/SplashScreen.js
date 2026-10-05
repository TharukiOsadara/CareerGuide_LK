import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../styles/colors';

export default function SplashScreen({ navigation }) {
  const [progress, setProgress] = useState(0);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(1, { duration: 2000, easing: Easing.linear });
    const interval = setInterval(() => setProgress((previous) => {
      if (previous >= 100) { clearInterval(interval); return 100; }
      return previous + 1;
    }), 20);
    const timer = setTimeout(() => navigation.replace('Onboarding'), 2000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [navigation, progressValue]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${progressValue.value * 100}%` }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.content}>
        <Text style={styles.title}>CareerGuide LK</Text>
        <Text style={styles.subtitle}>Your Career Companion</Text>
        <View style={styles.progressBarContainer}><Animated.View style={[styles.progressBar, animatedStyle]} /></View>
        <Text style={styles.loadingText}>Loading... {progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textDark, marginBottom: 10 },
  subtitle: { fontSize: 16, color: colors.mutedLight, marginBottom: 60 },
  progressBarContainer: { width: '100%', height: 4, backgroundColor: colors.progressTrack, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  progressBar: { height: '100%', backgroundColor: colors.blue, borderRadius: 2 },
  loadingText: { fontSize: 14, color: colors.slate },
});

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Icon from '../../components/Icon';

const DURATION_MS = 3000;
const useNativeDriver = Platform.OS !== 'web';

// Splash palette (from the design spec).
const BLUE = '#0052CC';
const GREY = '#757575';
const NAVY = '#0F172A';
const WHITE = '#FFFFFF';
const BG = '#EEF4FD'; // light blue base, matching the other pages
const BLUE_10 = 'rgba(0, 82, 204, 0.102)';

export default function LoadingScreen({ navigation }) {
  const [progress, setProgress] = useState(0);

  // Animation values
  const logoIn = useRef(new Animated.Value(0)).current;   // tile pop-in
  const salute = useRef(new Animated.Value(0)).current;   // cap tip (-1..1)
  const lift = useRef(new Animated.Value(0)).current;     // cap lift (0..1)
  const ring = useRef(new Animated.Value(0)).current;     // pulse ring (0..1)
  const textIn = useRef(new Animated.Value(0)).current;   // title + subtitle

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / DURATION_MS) * 100)));
    }, 30);
    const timer = setTimeout(() => navigation.replace('Onboarding'), DURATION_MS);

    // 1) Logo pops in, then the title slides up.
    Animated.sequence([
      Animated.spring(logoIn, { toValue: 1, friction: 5, tension: 80, useNativeDriver }),
      Animated.timing(textIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]).start();

    // 2) The cap "salutes": lifts and tips like a raised cap, settles, pauses, repeats.
    const tip = (to, duration) => Animated.timing(salute, { toValue: to, duration, easing: Easing.inOut(Easing.quad), useNativeDriver });
    const raise = (to, duration) => Animated.timing(lift, { toValue: to, duration, easing: Easing.inOut(Easing.quad), useNativeDriver });
    const saluteLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(350),
        Animated.parallel([raise(1, 260), tip(-1, 260)]),
        tip(0.6, 200),
        tip(-0.4, 180),
        Animated.parallel([raise(0, 280), tip(0, 280)]),
        Animated.delay(500),
      ])
    );
    saluteLoop.start();

    // 3) Soft pulsing ring behind the logo.
    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver })
    );
    ringLoop.start();

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      saluteLoop.stop();
      ringLoop.stop();
    };
  }, [navigation]);

  const logoStyle = {
    opacity: logoIn,
    transform: [{ scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
  };
  const capStyle = {
    transform: [
      { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { rotate: salute.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
    ],
  };
  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
  };
  const textStyle = {
    opacity: textIn,
    transform: [{ translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      {/* Light blue linear background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BLUE} stopOpacity={0.14} />
            <Stop offset="0.5" stopColor={BLUE} stopOpacity={0.07} />
            <Stop offset="1" stopColor={BLUE} stopOpacity={0.03} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
      </Svg>
      {/* Soft decorative circles */}
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <View style={styles.content}>
        <View style={styles.logoArea}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.logo, logoStyle]}>
            <Animated.View style={capStyle}>
              <Icon name="graduation-cap" size={34} color={WHITE} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.textBlock, textStyle]}>
          <Text style={styles.title}>
            CareerGuide <Text style={styles.accent}>LK</Text>
          </Text>
          <Text style={styles.subtitle}>Your Career Companion</Text>
        </Animated.View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.loadingText}>Loading... {progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: BLUE },
  blobTop: { width: 260, height: 260, top: -90, right: -80, opacity: 0.06 },
  blobBottom: { width: 320, height: 320, bottom: -140, left: -110, opacity: 0.05 },

  content: { width: '78%', alignItems: 'center' },
  logoArea: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE },
  logo: {
    width: 68, height: 68, borderRadius: 18, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  textBlock: { alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: NAVY, marginBottom: 10 },
  accent: { color: BLUE },
  subtitle: { fontSize: 16, color: GREY, marginBottom: 60 },
  track: { width: '100%', height: 6, backgroundColor: BLUE_10, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: BLUE, borderRadius: 3 },
  loadingText: { fontSize: 14, color: GREY, marginTop: 20 },
});

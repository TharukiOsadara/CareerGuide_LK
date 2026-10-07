import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';

// Slide-in-from-the-right "Welcome back" popup showing the login time.
export default function WelcomeToast({ visible, name, loginTime, onHide, variant = 'success' }) {
  const x = useRef(new Animated.Value(360)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(x, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      const t = setTimeout(hide, 4200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(x, { toValue: 360, duration: 220, useNativeDriver: true }).start(() => onHide && onHide());
  };

  if (!visible) return null;
  const time = loginTime
    ? new Date(loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.toast, { transform: [{ translateX: x }] }]}>
        <View style={[styles.stripe, variant === 'success' ? styles.ok : styles.info]} />
        <View style={styles.body}>
          <Text style={styles.title}>👋 Welcome back{ name ? `, ${name}!` : '!'}</Text>
          <Text style={styles.sub}>Signed in today at {time}</Text>
        </View>
        <Pressable hitSlop={8} onPress={hide}><Text style={styles.close}>×</Text></Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'flex-end', paddingHorizontal: 12, zIndex: 50 },
  toast: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, width: '94%', overflow: 'hidden',
    shadowColor: colors.navy, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  ok: { backgroundColor: colors.green },
  info: { backgroundColor: colors.blue },
  body: { flex: 1, marginLeft: 6 },
  title: { fontSize: 13.5, fontWeight: '800', color: colors.navy },
  sub: { fontSize: 11.5, color: colors.slate, marginTop: 2 },
  close: { fontSize: 22, color: colors.slate400, marginLeft: 8, lineHeight: 22 },
});

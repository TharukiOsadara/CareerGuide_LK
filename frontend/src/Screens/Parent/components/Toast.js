import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, space } from '../theme';

// A real toast (fixes the prototype's blocking "Inquiry Sent" modal):
// slides in, never blocks the screen, disappears by itself, can be tapped away,
// and is announced to screen readers.
const ToastContext = createContext(() => {});
const useNativeDriver = Platform.OS !== 'web';

const TONES = {
  success: { bg: colors.successText, icon: '✓' },
  error: { bg: colors.danger, icon: '!' },
  info: { bg: colors.navy, icon: 'i' },
};

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [anim]);

  const show = useCallback(
    ({ title, message, type = 'success', duration = 3500 }) => {
      clearTimeout(timer.current);
      setToast({ title, message, type });
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver }).start();
      timer.current = setTimeout(hide, duration);
      AccessibilityInfo.announceForAccessibility?.([title, message].filter(Boolean).join('. '));
    },
    [anim, hide]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const tone = TONES[toast?.type] || TONES.success;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + space.sm }]}>
          <Animated.View
            style={{
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            }}
          >
            <Pressable
              onPress={hide}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityHint="Tap to dismiss"
              style={[styles.toast, { backgroundColor: tone.bg }]}
            >
              <Text style={styles.icon}>{tone.icon}</Text>
              <View style={styles.copy}>
                {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
                {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 1000, elevation: 10 },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    fontSize: font.small,
    marginRight: space.md,
    overflow: 'hidden',
  },
  copy: { flex: 1 },
  title: { color: colors.white, fontSize: font.body, fontWeight: '800' },
  message: { color: colors.white, fontSize: font.small, lineHeight: 19, marginTop: 2 },
});

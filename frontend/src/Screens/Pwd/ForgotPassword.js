import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
    setBusy(true);
    try {
      const res = await api('/api/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim() } });
      // The demo backend returns the reset token so the flow completes end-to-end.
      navigation.navigate('ResetPassword', { email: email.trim(), resetToken: res.resetToken });
    } catch (e) {
      setError(e.message || 'Could not send reset instructions.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <Pressable hitSlop={10} onPress={() => navigation.navigate('SignIn')} style={styles.backRow}>
          <Text style={styles.back}>â€¹</Text><Text style={styles.backText}>Back</Text>
        </Pressable>
        <Brand size="sm" />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconTile}><Text style={styles.icon}>ðŸ”‘</Text></View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address to receive a secure password reset link.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>âœ‰ï¸</Text>
            <TextInput
              style={styles.input} value={email} onChangeText={setEmail}
              placeholder="student@example.lk" placeholderTextColor={colors.slate400}
              keyboardType="email-address" autoCapitalize="none" autoFocus
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Sendingâ€¦' : 'Send Reset Instructions'}</Text>
            {!busy && <Text style={styles.arrow}>â†’</Text>}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 16, alignSelf: 'center' }}>
            <Text style={styles.link}>â† Back to Sign In</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>ðŸ›¡ï¸  Your data is protected under Sri Lankan educational privacy standards</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  topbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 26, color: colors.blue, marginRight: 2, marginTop: -2 },
  backText: { fontSize: 14, color: colors.blue, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconTile: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 26 },
  title: { fontSize: 21, fontWeight: '800', color: colors.navy, marginTop: 14 },
  subtitle: { fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: 8 },
  label: { alignSelf: 'flex-start', fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 20 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1.5, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.blueLight, width: '100%' },
  inputIcon: { fontSize: 15, marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8, alignSelf: 'stretch' },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, width: '100%' },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20, marginLeft: 10 },
  pressed: { opacity: 0.8 },
  link: { color: colors.blue, fontWeight: '800', fontSize: 13 },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});


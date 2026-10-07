import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import PasswordStrength, { scorePassword } from '../../components/PasswordStrength';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';

export default function ResetPassword({ navigation, route }) {
  const { email, resetToken } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const match = password.length > 0 && password === confirm;

  const submit = async () => {
    setError('');
    if (scorePassword(password) < 3) return setError('Please choose a stronger password.');
    if (!match) return setError('Passwords do not match.');

    setBusy(true);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST', auth: false,
        body: { token: resetToken, email, newPassword: password },
      });
      setSuccess(true);
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'SignIn', params: { email } }] }), 1800);
    } catch (e) {
      setError(e.message || 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <Pressable hitSlop={10} onPress={() => navigation.navigate('ForgotPassword')} style={styles.backRow}>
          <Text style={styles.back}>â€¹</Text><Text style={styles.backText}>Back</Text>
        </Pressable>
        <Brand size="sm" />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconTile}><Text style={styles.icon}>ðŸ›¡ï¸</Text></View>
          <Text style={styles.title}>Reset New Password</Text>
          <Text style={styles.subtitle}>Create a strong, new password for your CareerGuide LK account</Text>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>ðŸ”’</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}><Text style={styles.eye}>{showPw ? 'ðŸ™ˆ' : 'ðŸ‘ï¸'}</Text></Pressable>
          </View>
          <PasswordStrength value={password} />

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>ðŸ”’</Text>
            <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Re-enter new password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} />
            {confirm.length > 0 && <Text style={styles.matchMark}>{match ? 'âœ…' : 'âŒ'}</Text>}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy || success} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy || success) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Updatingâ€¦' : 'Reset Password & Sign In'}</Text>
            {!busy && <Text style={styles.arrow}>â†’</Text>}
          </Pressable>

          {success && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>âœ…  Password updated successfully! Redirecting to Sign Inâ€¦</Text>
            </View>
          )}
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
  icon: { fontSize: 24 },
  title: { fontSize: 21, fontWeight: '800', color: colors.navy, marginTop: 14 },
  subtitle: { fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: 8 },
  label: { alignSelf: 'flex-start', fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 18 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, width: '100%', backgroundColor: colors.bgSofter },
  inputIcon: { fontSize: 15, marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { fontSize: 16, marginLeft: 6 },
  matchMark: { fontSize: 15, marginLeft: 6 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8, alignSelf: 'stretch' },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, width: '100%' },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20, marginLeft: 10 },
  pressed: { opacity: 0.8 },
  successBox: { backgroundColor: colors.greenPale, borderColor: colors.greenMint, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16, width: '100%' },
  successText: { color: colors.greenDark, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});


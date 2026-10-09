import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import PasswordStrength from '../../components/PasswordStrength';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import { collectErrors, hasErrors, validateCode6, validateNewPassword } from '../../utils/validation';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';
import FieldError, { errorBorder } from '../../components/FieldError';

export default function ResetPassword({ navigation, route }) {
  const { email } = route.params || {};
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState(email ? `We sent a 6-digit code to ${email}. It expires in 15 minutes.` : '');
  const [resending, setResending] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const match = password.length > 0 && password === confirm;

  // Sends a fresh code (the old one stops working).
  const resend = async () => {
    if (!email || resending) return;
    setResending(true); setError('');
    try {
      await api('/api/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
      setCode('');
      setNotice(`A new code was sent to ${email}.`);
    } catch (e) {
      setError(e.message || 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!email) return setError('Start again from "Forgot Password" to get a reset code.');
    const errs = collectErrors({
      code: validateCode6(code),
      password: validateNewPassword(password, 'New password'),
      confirm: !confirm ? 'Please confirm your new password.' : !match ? 'Passwords do not match.' : '',
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setBusy(true);
    try {
      const res = await api('/api/auth/reset-password', {
        method: 'POST', auth: false,
        body: { email, code: code.trim(), newPassword: password },
      });
      setSuccess(true);
      // Go to the sign-in for this account's role (admins use the Admin Portal).
      const role = res?.role || 'student';
      const next = role === 'admin'
        ? { name: 'AdminPortal' }
        : { name: 'SignIn', params: { email, role, passwordReset: true } };
      setTimeout(() => navigation.reset({ index: 0, routes: [next] }), 1800);
    } catch (e) {
      setNotice('');
      setError(e.message || 'Could not reset your password.');
      if (e.data?.restart) setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <BackButton onPress={() => navigation.navigate('ForgotPassword')} />
        <Brand size="sm" />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconTile}><Icon name="shield-alert" size={26} color={colors.blue} /></View>
          <Text style={styles.title}>Reset New Password</Text>
          <Text style={styles.subtitle}>Enter the code from your email, then create a strong new password.</Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Text style={styles.label}>6-Digit Reset Code</Text>
          <View style={[styles.inputBox, !!errors.code && errorBorder]}>
            <Icon name="key" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.codeInput]} value={code}
              onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, code: '' })); }}
              placeholder="000000" placeholderTextColor={colors.slate400}
              keyboardType="number-pad" maxLength={6} autoFocus
              textContentType="oneTimeCode" autoComplete="one-time-code"
            />
          </View>
          <FieldError message={errors.code} style={{ alignSelf: 'flex-start' }} />
          <Pressable onPress={resend} disabled={resending || !email} hitSlop={8} style={styles.resend}>
            <Text style={styles.resendText}>{resending ? 'Sending…' : "Didn't get it? Resend code"}</Text>
          </Pressable>

          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputBox, !!errors.password && errorBorder]}>
            <Icon name="lock" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={password} onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }} placeholder="New password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} maxLength={128} />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}><Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.slate} style={styles.eye} /></Pressable>
          </View>
          <FieldError message={errors.password} style={{ alignSelf: 'flex-start' }} />
          <PasswordStrength value={password} />

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={[styles.inputBox, !!errors.confirm && errorBorder]}>
            <Icon name="lock" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={confirm} onChangeText={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: '' })); }} maxLength={128} placeholder="Re-enter new password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} />
            {confirm.length > 0 && <Icon name={match ? 'check-circle' : 'x-circle'} size={18} color={match ? colors.greenDark : colors.redStrong} style={styles.matchMark} />}
          </View>
          <FieldError message={errors.confirm} style={{ alignSelf: 'flex-start' }} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy || success} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy || success) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Updating…' : 'Reset Password & Sign In'}</Text>
            {!busy && <Icon name="arrow-right" size={18} color={colors.white} style={styles.arrow} />}
          </Pressable>

          {success && (
            <View style={styles.successBox}>
              <IconText icon="check-circle" size={16} color={colors.greenDark} center textStyle={styles.successText}>Password updated successfully! Redirecting to Sign In…</IconText>
            </View>
          )}
        </View>

        <IconText icon="shield-check" size={13} color={colors.slate400} gap={5} center style={{ marginTop: 20 }} textStyle={styles.footer}>Your data is protected under Sri Lankan educational privacy standards</IconText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notice: { color: colors.greenDark, backgroundColor: colors.greenPale, fontSize: 12, lineHeight: 17, padding: 10, borderRadius: 8, marginTop: 12, alignSelf: 'stretch' },
  codeInput: { fontSize: 18, fontWeight: '800', letterSpacing: 6 },
  resend: { alignSelf: 'flex-end', marginTop: 8 },
  resendText: { color: colors.blue, fontSize: 12.5, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  topbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginRight: 2 },
  backText: { fontSize: 14, color: colors.blue, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconTile: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', color: colors.navy, marginTop: 14 },
  subtitle: { fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: 8 },
  label: { alignSelf: 'flex-start', fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 18 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, width: '100%', backgroundColor: colors.bgSofter },
  inputIcon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { marginLeft: 6 },
  matchMark: { marginLeft: 6 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8, alignSelf: 'stretch' },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, width: '100%' },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { marginLeft: 10 },
  pressed: { opacity: 0.8 },
  successBox: { backgroundColor: colors.greenPale, borderColor: colors.greenMint, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16, width: '100%' },
  successText: { color: colors.greenDark, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});


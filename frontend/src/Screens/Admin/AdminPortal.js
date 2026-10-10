import React, { useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../Components/Brand';
import RoleTabs from '../../Components/RoleTabs';
import { useAuth } from '../../context/AuthContext';
import { ROLES_WITH_ADMIN } from '../../config';
import { colors } from '../../styles/colors';
import { collectErrors, hasErrors, validateCode6, validateEmail, validateLoginPassword } from '../../utils/validation';
import BackButton, { BACK_WIDTH } from '../../Components/BackButton';
import Icon, { IconText } from '../../Components/Icon';
import FieldError, { errorBorder } from '../../Components/FieldError';

// Admin sign-in is two steps: (1) email + password, (2) the 6-digit code from an
// authenticator app (Google / Microsoft Authenticator). On an admin's first login,
// step 2 starts with a QR code to scan.
export default function AdminPortal({ navigation }) {
  const { adminPasswordStep, adminMfaSetup, adminMfaVerify } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 'password' -> ('setup' on first login) -> 'code'
  const [step, setStep] = useState('password');
  const [mfaToken, setMfaToken] = useState(null);
  const [setup, setSetup] = useState(null); // { qrDataUrl, secret, account }
  const [errors, setErrors] = useState({});
  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  // Switching away from Admin returns to the standard sign-in with that role.
  const onRoleChange = (r) => {
    if (r === 'admin') return;
    navigation.navigate('SignIn', { role: r });
  };

  const restart = (message = '') => {
    setStep('password'); setMfaToken(null); setSetup(null); setCode(''); setErrors({}); setError(message);
  };

  const submitPassword = async () => {
    const errs = collectErrors({ email: validateEmail(email, 'Administrator email'), password: validateLoginPassword(password) });
    setErrors(errs);
    if (hasErrors(errs)) return;
    const res = await adminPasswordStep({ email: email.trim(), password });
    setMfaToken(res.mfaToken);
    setCode('');
    if (res.setupRequired) {
      setSetup(await adminMfaSetup(res.mfaToken));
      setStep('setup');
    } else {
      setStep('code');
    }
  };

  const submitCode = async () => {
    const clean = code.replace(/\s/g, '');
    const codeMsg = validateCode6(clean);
    setErrors({ code: codeMsg });
    if (codeMsg) return;
    await adminMfaVerify({ mfaToken, code: clean });
    navigation.reset({ index: 0, routes: [{ name: 'AdminOverview', params: { welcome: true } }] });
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (step === 'password') await submitPassword();
      else await submitCode();
    } catch (e) {
      if (e.data?.restart) restart(e.message);
      else setError(e.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const buttonLabel = busy
    ? (step === 'password' ? 'Checking…' : 'Verifying…')
    : step === 'password' ? 'Continue' : step === 'setup' ? 'Verify & Finish Setup' : 'Authenticate Admin Access';
  const secretGroups = setup?.secret ? setup.secret.match(/.{1,4}/g).join(' ') : '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <BackButton onPress={() => navigation.navigate('Onboarding')} />
        <Brand size="sm" />
        <View style={{ width: BACK_WIDTH, alignItems: 'flex-end' }}><Icon name="help" size={20} color={colors.slate} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <RoleTabs roles={ROLES_WITH_ADMIN} value="admin" onChange={onRoleChange} />

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Administrative Portal</Text>
              <Text style={styles.subtitle}>Secure staff authentication required.</Text>
            </View>
            <View style={styles.shield}><Icon name="shield-check" size={20} color={colors.blue} /></View>
          </View>

          <Text style={styles.label}>Administrator Email or Staff ID</Text>
          <View style={[styles.inputBox, step !== 'password' && styles.inputLocked, !!errors.email && errorBorder]}>
            <Icon name="user-cog" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={email} onChangeText={change(setEmail, 'email')} maxLength={254} editable={step === 'password'} placeholder="admin@careerguide.lk" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" />
            {step !== 'password' && <Icon name="check-circle" size={18} color={colors.greenDark} />}
          </View>
          <FieldError message={errors.email} />

          {step === 'password' ? (
            <>
              <Text style={styles.label}>Admin Password</Text>
              <View style={[styles.inputBox, !!errors.password && errorBorder]}>
                <Icon name="lock" size={17} color={colors.blue} style={styles.inputIcon} />
                <TextInput style={styles.input} value={password} onChangeText={change(setPassword, 'password')} maxLength={128} placeholder="Enter admin password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} onSubmitEditing={submit} />
                <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}><Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.slate} style={styles.eye} /></Pressable>
              </View>
              <FieldError message={errors.password} />

              <Pressable style={styles.rememberRow} onPress={() => setRemember((r) => !r)}>
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>{remember && <Icon name="check" size={13} color={colors.white} strokeWidth={3} />}</View>
                <Text style={styles.rememberText}>Remember this device</Text>
              </Pressable>
            </>
          ) : (
            <>
              {step === 'setup' && setup ? (
                <View style={styles.setupBox}>
                  <Text style={styles.setupTitle}>Set up your authenticator (one time)</Text>
                  <Text style={styles.setupStep}>1. Open Google Authenticator or Microsoft Authenticator.</Text>
                  <Text style={styles.setupStep}>2. Tap + and choose "Scan a QR code".</Text>
                  <Text style={styles.setupStep}>3. Scan this code, then type the 6-digit code it shows.</Text>
                  <View style={styles.qrWrap}>
                    {setup.qrDataUrl
                      ? <Image source={{ uri: setup.qrDataUrl }} style={styles.qr} resizeMode="contain" accessibilityLabel="Authenticator setup QR code" />
                      : <ActivityIndicator color={colors.blue} />}
                  </View>
                  <Text style={styles.manualLabel}>Can't scan? Choose "Enter a setup key" and type:</Text>
                  <Text selectable style={styles.secret}>{secretGroups}</Text>
                  <Text style={styles.manualHint}>Account: {setup.account} · Time based</Text>
                </View>
              ) : (
                <View style={styles.codeHint}>
                  <Icon name="shield-check" size={18} color={colors.blue} />
                  <Text style={styles.codeHintText}>Password accepted. Open your authenticator app and enter the current code for CareerGuide LK.</Text>
                </View>
              )}

              <Text style={styles.label}>Security Token / 2FA Pin</Text>
              <View style={[styles.inputBox, styles.codeBox, !!errors.code && errorBorder]}>
                <Icon name="key" size={17} color={colors.blue} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]} value={code}
                  onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, code: '' })); }}
                  placeholder="Enter 6-digit code" placeholderTextColor={colors.slate400}
                  keyboardType="number-pad" maxLength={6} autoFocus
                  textContentType="oneTimeCode" autoComplete="one-time-code"
                  onSubmitEditing={submit}
                />
              </View>
              <FieldError message={errors.code} />

              <Pressable onPress={() => restart()} hitSlop={8} style={styles.changeAccount}>
                <IconText icon="arrow-left" size={14} color={colors.blue} textStyle={styles.changeAccountText}>Use a different account</IconText>
              </Pressable>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{buttonLabel}</Text>
            {!busy && <Icon name="arrow-right" size={18} color={colors.white} style={styles.arrow} />}
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('AdminCreateAccount')} style={{ marginTop: 18, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="shield" size={14} color={colors.muted} style={{ marginRight: 6 }} />
            <Text style={styles.bottom}>Are you a portal administrator? <Text style={styles.link}>Staff Login Here</Text></Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  topbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { fontSize: 22, color: colors.navy },
  help: { fontSize: 16, color: colors.slate, width: 20, textAlign: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 36, paddingTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  shield: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11.5, fontWeight: '700', color: colors.slate, marginBottom: 7, marginTop: 16, textTransform: 'none' },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.bgSofter },
  inputIcon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { marginLeft: 6 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  checkboxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  rememberText: { fontSize: 12.5, color: colors.slateDark },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 14, backgroundColor: colors.redLight, padding: 9, borderRadius: 8 },
  primaryBtn: { height: 52, borderRadius: 11, backgroundColor: colors.adminDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { marginLeft: 10 },
  pressed: { opacity: 0.85 },
  bottom: { fontSize: 12, color: colors.muted },
  link: { color: colors.blue, fontWeight: '800' },

  // Two-factor step
  inputLocked: { opacity: 0.75 },
  codeBox: { borderColor: colors.blue, borderWidth: 1.5, backgroundColor: colors.white },
  codeInput: { fontSize: 18, fontWeight: '800', letterSpacing: 6 },
  codeHint: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.blueLight, borderRadius: 10,
    padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.bluePaleBorder,
  },
  codeHintText: { flex: 1, color: colors.slateDark, fontSize: 12, lineHeight: 17, marginLeft: 8 },
  setupBox: { backgroundColor: colors.bgSofter, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  setupTitle: { color: colors.navy, fontSize: 13.5, fontWeight: '800', marginBottom: 8 },
  setupStep: { color: colors.slateDark, fontSize: 12, lineHeight: 18 },
  qrWrap: {
    alignSelf: 'center', width: 196, height: 196, marginTop: 12, backgroundColor: colors.white,
    borderRadius: 12, padding: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  qr: { width: 178, height: 178 },
  manualLabel: { color: colors.slate, fontSize: 11.5, marginTop: 12, textAlign: 'center' },
  secret: { color: colors.navy, fontSize: 14, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 4 },
  manualHint: { color: colors.slate400, fontSize: 10.5, textAlign: 'center', marginTop: 4 },
  changeAccount: { alignSelf: 'flex-start', marginTop: 12 },
  changeAccountText: { color: colors.blue, fontSize: 12.5, fontWeight: '700' },
});


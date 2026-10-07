import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import RoleTabs from '../../components/RoleTabs';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ROLES_WITH_ADMIN, homeRouteFor } from '../../config';
import { getGoogleIdToken } from '../../auth/googleSignIn';
import { collectErrors, hasErrors, validateEmail, validateLoginPassword } from '../../utils/validation';
import { colors } from '../../styles/colors';
import GoogleLogo from '../../components/GoogleLogo';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';
import FieldError, { errorBorder } from '../../components/FieldError';

const ROLE_LABEL = { student: 'Student', parent: 'Parent', counsellor: 'Counsellor', admin: 'Admin' };

export default function SignIn({ navigation, route }) {
  const { signIn, googleAuth } = useAuth();
  const [role, setRole] = useState(route.params?.role || 'student');
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);
  const [detectedRole, setDetectedRole] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(route.params?.justSignedUp ? 'Account created! Please sign in.' : '');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errors, setErrors] = useState({});
  // Updates a field and clears its error message as the user types.
  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };
  const lookupTimer = useRef(null);

  // Selecting the Admin tab sends the user to the dedicated admin portal.
  const onRoleChange = (r) => {
    if (r === 'admin') { navigation.navigate('AdminPortal'); return; }
    setRole(r);
  };

  // Debounced email -> role detection shown in the field's right corner.
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (email.trim().length < 3) { setDetectedRole(null); return; }
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await api(`/api/auth/role-lookup?email=${encodeURIComponent(email.trim())}`, { auth: false });
        setDetectedRole(res.found ? res.role : null);
      } catch { setDetectedRole(null); }
    }, 350);
    return () => lookupTimer.current && clearTimeout(lookupTimer.current);
  }, [email]);

  const goHome = (user) => {
    navigation.reset({ index: 0, routes: [{ name: homeRouteFor(user.role), params: { welcome: true } }] });
  };

  const continueWithGoogle = async () => {
    setError(''); setInfo('');
    setGoogleBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return; // cancelled
      const user = await googleAuth({ idToken, role });
      goHome(user);
    } catch (e) {
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    setError(''); setInfo('');
    const errs = collectErrors({ email: validateEmail(email), password: validateLoginPassword(password) });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setBusy(true);
    try {
      const user = await signIn({ email: email.trim(), password, role });
      goHome(user);
    } catch (e) {
      // Surface role-mismatch guidance from the backend.
      setError(e.message || 'Could not sign in.');
      if (e.data?.actualRole) setDetectedRole(e.data.actualRole);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <BackButton onPress={() => navigation.navigate('Onboarding')} />
        <Brand size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back!!</Text>
          <Text style={styles.subtitle}>Sign in to customize your career suggestions.</Text>

          <View style={{ marginTop: 16 }}>
            <RoleTabs roles={ROLES_WITH_ADMIN} value={role} onChange={onRoleChange} />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputBox, !!errors.email && errorBorder]}>
            <Icon name="mail" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={email} onChangeText={change(setEmail, 'email')} maxLength={254}
              placeholder="studying.lk@gmail.com" placeholderTextColor={colors.slate400}
              keyboardType="email-address" autoCapitalize="none"
            />
            {detectedRole ? (
              <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{ROLE_LABEL[detectedRole]}</Text></View>
            ) : null}
          </View>
          <FieldError message={errors.email} />

          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputBox, !!errors.password && errorBorder]}>
            <Icon name="lock" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={password} onChangeText={change(setPassword, 'password')} maxLength={128}
              placeholder="Enter your password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw}
            />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}><Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.slate} style={styles.eye} /></Pressable>
          </View>
          <FieldError message={errors.password} />

          <View style={styles.row}>
            <Pressable style={styles.keepRow} onPress={() => setKeep((k) => !k)}>
              <View style={[styles.checkbox, keep && styles.checkboxOn]}>{keep && <Icon name="check" size={13} color={colors.white} strokeWidth={3} />}</View>
              <Text style={styles.keepText}>Keep me signed in</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot Password?</Text>
            </Pressable>
          </View>

          {info ? <Text style={styles.info}>{info}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR CONTINUE WITH</Text><View style={styles.line} /></View>

          <Pressable disabled={googleBusy || busy} onPress={continueWithGoogle} style={({ pressed }) => [styles.googleBtn, (pressed || googleBusy) && styles.pressed]}>
            <GoogleLogo size={18} style={styles.googleG} /><Text style={styles.googleText}>{googleBusy ? 'Connecting to Google…' : 'Continue with Google'}</Text>
          </Pressable>
        </View>

        <View style={styles.secureNote}>
          <IconText icon="shield-check" size={14} color={colors.greenDark} center textStyle={styles.secureText}>Your data is encrypted &amp; processed according to UGC / Sri Lankan Privacy Standards.</IconText>
        </View>

        <Pressable onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 18, alignSelf: 'center' }}>
          <Text style={styles.bottomText}>Don't have an account? <Text style={styles.link}>Sign Up</Text></Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  topbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginRight: 2 },
  backText: { fontSize: 14, color: colors.blue, fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingBottom: 36, paddingTop: 6 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 23, fontWeight: '800', color: colors.navy },
  subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 6 },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 16 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.bgSofter },
  inputIcon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { marginLeft: 6 },
  roleBadge: { backgroundColor: colors.blueLight, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, marginLeft: 6 },
  roleBadgeText: { color: colors.blue, fontSize: 10.5, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  keepRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  keepText: { fontSize: 12, color: colors.slateDark },
  link: { color: colors.blue, fontWeight: '800', fontSize: 12.5 },
  info: { color: colors.greenDark, fontSize: 12, marginTop: 12, backgroundColor: colors.greenPale, padding: 9, borderRadius: 8 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8 },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontSize: 10, fontWeight: '700', color: colors.slate400, marginHorizontal: 10 },
  googleBtn: { height: 50, borderRadius: 11, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  googleG: { marginRight: 10 },
  googleText: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  secureNote: { backgroundColor: colors.greenLight, borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.greenMint },
  secureText: { fontSize: 11, color: colors.greenDark, lineHeight: 16, textAlign: 'center' },
  bottomText: { fontSize: 13, color: colors.muted },
});


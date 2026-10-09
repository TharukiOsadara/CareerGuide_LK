import React, { useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import RoleTabs from '../../components/RoleTabs';
import Dropdown from '../../components/Dropdown';
import PasswordStrength from '../../components/PasswordStrength';
import { api } from '../../api/client';
import { AL_STREAMS, ROLES, homeRouteFor } from '../../config';
import { useAuth } from '../../context/AuthContext';
import {
  collectErrors, hasErrors, required, validateEmail, validateName, validateNewPassword, validateNumber,
} from '../../utils/validation';
import { colors } from '../../styles/colors';
import GoogleLogo from '../../components/GoogleLogo';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';
import FieldError, { errorBorder } from '../../components/FieldError';
import CoursePicker from '../../components/CoursePicker';

export default function SignUp({ navigation }) {
  const { googleAuth } = useAuth();
  const [role, setRole] = useState('student');
  const [counsellorCourses, setCounsellorCourses] = useState([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [stream, setStream] = useState('');
  const [zScore, setZScore] = useState('');
  const [childEmail1, setChildEmail1] = useState('');
  const [childEmail2, setChildEmail2] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errors, setErrors] = useState({});
  // Updates a field and clears its error message as the user types.
  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  // Google sign-up: creates the account with the selected role, then opens that role's dashboard.
  const continueWithGoogle = async () => {
    setError('');
    if (!agree) return setError('Please accept the privacy agreement to continue.');
    setGoogleBusy(true);
    try {
      const user = await googleAuth({ role });
      if (!user) return; // closed the Google page
      const next = user.profileCompleted ? homeRouteFor(user.role) : 'CompleteProfile';
      navigation.reset({ index: 0, routes: [{ name: next, params: { welcome: true } }] });
    } catch (e) {
      setError(e.message || 'Google sign-up failed.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    const own = email.trim().toLowerCase();
    const c1 = childEmail1.trim().toLowerCase();
    const c2 = childEmail2.trim().toLowerCase();
    const errs = collectErrors({
      fullName: validateName(fullName),
      email: validateEmail(email),
      stream: role === 'student' ? required(stream, 'A/L stream') : '',
      zScore: role === 'student' ? validateNumber(zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }) : '',
      childEmail1: role === 'parent'
        ? (validateEmail(childEmail1, 'Child 1 email') || (c1 === own ? 'Use your child\'s email, not your own.' : ''))
        : '',
      childEmail2: role === 'parent' && c2
        ? (validateEmail(childEmail2, 'Child 2 email')
          || (c2 === own ? 'Use your child\'s email, not your own.' : '')
          || (c2 === c1 ? 'Child 2 email must be different from Child 1.' : ''))
        : '',
      password: validateNewPassword(password),
      counsellorCourses: role === 'counsellor' && counsellorCourses.length === 0
        ? 'Choose at least one course you guide.' : '',
      agree: agree ? '' : 'Please accept the privacy agreement to continue.',
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setBusy(true);
    try {
      await api('/api/auth/signup', {
        method: 'POST', auth: false,
        body: {
          fullName: fullName.trim(), email: email.trim(), password, role,
          alStream: role === 'student' ? stream : null,
          zScore: role === 'student' && zScore ? Number(zScore) : null,
          childEmail1: role === 'parent' ? childEmail1.trim() : null,
          childEmail2: role === 'parent' ? childEmail2.trim() : null,
          counsellorCourseIds: role === 'counsellor' ? counsellorCourses : undefined,
        },
      });
      navigation.navigate('SignIn', { email: email.trim(), role, justSignedUp: true });
    } catch (e) {
      setError(e.message || 'Could not create your account.');
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
        <View style={{ width: BACK_WIDTH, alignItems: 'flex-end' }}><Icon name="help" size={20} color={colors.slate} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your Free Account</Text>
        <Text style={styles.subtitle}>
          Match your A/L results with UGC &amp; accredited university programs in Sri Lanka
        </Text>

        <View style={{ marginTop: 16 }}>
          <RoleTabs roles={ROLES} value={role} onChange={(r) => { setRole(r); setErrors({}); }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputBox, !!errors.fullName && errorBorder]}>
            <Icon name="user" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={fullName} onChangeText={change(setFullName, 'fullName')} placeholder="Name" placeholderTextColor={colors.slate400} autoCapitalize="words" maxLength={100} />
          </View>
          <FieldError message={errors.fullName} />

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputBox, !!errors.email && errorBorder]}>
            <Icon name="mail" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={email} onChangeText={change(setEmail, 'email')} placeholder="student@example.lk" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
          </View>
          <FieldError message={errors.email} />

          {role === 'student' && (
            <>
              <Text style={styles.label}>A/L Examination Stream</Text>
              <Dropdown value={stream} options={AL_STREAMS} onSelect={change(setStream, 'stream')} placeholder="Select your stream" icon="book" error={errors.stream} />
              <Text style={styles.label}>Z-Score</Text>
              <View style={[styles.inputBox, !!errors.zScore && errorBorder]}>
                <Icon name="chart" size={17} color={colors.blue} style={styles.inputIcon} />
                <TextInput style={styles.input} value={zScore} onChangeText={change(setZScore, 'zScore')} placeholder="e.g. 1.8542" placeholderTextColor={colors.slate400} keyboardType="decimal-pad" maxLength={7} />
              </View>
              <FieldError message={errors.zScore} />
            </>
          )}

          {role === 'parent' && (
            <>
              <Text style={styles.label}>Child 1 Student Email</Text>
              <View style={[styles.inputBox, !!errors.childEmail1 && errorBorder]}>
                <Icon name="mail" size={17} color={colors.blue} style={styles.inputIcon} />
                <TextInput style={styles.input} value={childEmail1} onChangeText={change(setChildEmail1, 'childEmail1')} placeholder="child1@example.com" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
              </View>
              <FieldError message={errors.childEmail1} />
              <Text style={styles.label}>Child 2 Student Email (optional)</Text>
              <View style={[styles.inputBox, !!errors.childEmail2 && errorBorder]}>
                <Icon name="mail" size={17} color={colors.blue} style={styles.inputIcon} />
                <TextInput style={styles.input} value={childEmail2} onChangeText={change(setChildEmail2, 'childEmail2')} placeholder="child2@example.com" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
              </View>
              <FieldError message={errors.childEmail2} />
              <Text style={styles.helper}>The student must already have an active account.</Text>
            </>
          )}

          {role === 'counsellor' && (
            <>
              <Text style={styles.label}>Courses</Text>
              <Text style={styles.helper}>
                Choose the courses you guide. Students who pick one of these courses can be matched with you.
              </Text>
              <View style={{ marginTop: 8 }}>
                <CoursePicker
                  value={counsellorCourses}
                  onChange={(ids) => { setCounsellorCourses(ids); setErrors((e) => ({ ...e, counsellorCourses: '' })); }}
                  error={errors.counsellorCourses}
                />
              </View>
            </>
          )}

          <Text style={styles.label}>Create Password</Text>
          <View style={[styles.inputBox, !!errors.password && errorBorder]}>
            <Icon name="lock" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput style={styles.input} value={password} onChangeText={change(setPassword, 'password')} placeholder="Create a strong password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} maxLength={128} />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}>
              <Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.slate} style={styles.eye} />
            </Pressable>
          </View>
          <FieldError message={errors.password} />
          <PasswordStrength value={password} />

          <Pressable style={styles.agreeRow} onPress={() => { setAgree((a) => !a); setErrors((e) => ({ ...e, agree: '' })); }}>
            <View style={[styles.checkbox, agree && styles.checkboxOn]}>{agree && <Icon name="check" size={13} color={colors.white} strokeWidth={3} />}</View>
            <Text style={styles.agreeText}>
              I agree to the processing of my academic profile under local educational privacy guidelines.
            </Text>
          </Pressable>
          <FieldError message={errors.agree} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Create Free Account'}</Text>
            {!busy && <Icon name="arrow-right" size={18} color={colors.white} style={styles.arrow} />}
          </Pressable>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR SIGN UP WITH</Text><View style={styles.line} /></View>

          <Pressable disabled={googleBusy || busy} onPress={continueWithGoogle} style={({ pressed }) => [styles.googleBtn, (pressed || googleBusy) && styles.pressed]}>
            <GoogleLogo size={18} style={styles.googleG} />
            <Text style={styles.googleText}>{googleBusy ? 'Connecting to Google…' : 'Sign up with Google'}</Text>
          </Pressable>
        </View>

        <IconText icon="shield-check" size={13} color={colors.slate400} gap={5} center style={{ marginTop: 18 }} textStyle={styles.footer}>Your data is protected under Sri Lankan educational privacy standards</IconText>
        <Pressable onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 14, alignSelf: 'center' }}>
          <Text style={styles.haveAccount}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
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
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 14 },
  helper: { fontSize: 11, color: colors.muted, marginTop: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 },
  inputIcon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { marginLeft: 6 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  checkboxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: colors.slateDark },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8 },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { marginLeft: 10 },
  pressed: { opacity: 0.8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontSize: 10, fontWeight: '700', color: colors.slate400, marginHorizontal: 10 },
  googleBtn: { height: 50, borderRadius: 11, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  googleG: { marginRight: 10 },
  googleText: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
  haveAccount: { fontSize: 12.5, color: colors.muted },
  link: { color: colors.blue, fontWeight: '800' },
});

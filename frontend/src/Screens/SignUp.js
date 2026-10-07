import React, { useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../components/Brand';
import RoleTabs from '../components/RoleTabs';
import Dropdown from '../components/Dropdown';
import PasswordStrength, { scorePassword } from '../components/PasswordStrength';
import { api } from '../api/client';
import { AL_STREAMS, ROLES } from '../config';
import { colors } from '../styles/colors';

export default function SignUp({ navigation }) {
  const [role, setRole] = useState('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [stream, setStream] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
    if (scorePassword(password) < 3) return setError('Please choose a stronger password.');
    if (!agree) return setError('Please accept the privacy agreement to continue.');

    setBusy(true);
    try {
      await api('/api/auth/signup', {
        method: 'POST', auth: false,
        body: { fullName: fullName.trim(), email: email.trim(), password, role, alStream: role === 'student' ? stream : null },
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
        <Pressable hitSlop={10} onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Brand size="sm" />
        <Text style={styles.help}>?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your Free Account</Text>
        <Text style={styles.subtitle}>
          Match your A/L results with UGC &amp; accredited university programs in Sri Lanka
        </Text>

        <View style={{ marginTop: 16 }}>
          <RoleTabs roles={ROLES} value={role} onChange={setRole} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Name" placeholderTextColor={colors.slate400} autoCapitalize="words" />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="student@example.lk" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" />
          </View>

          {role === 'student' && (
            <>
              <Text style={styles.label}>A/L Examination Stream</Text>
              <Dropdown value={stream} options={AL_STREAMS} onSelect={setStream} placeholder="Select your stream" icon="📘" />
            </>
          )}

          <Text style={styles.label}>Create Password</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a strong password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}>
              <Text style={styles.eye}>{showPw ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
          <PasswordStrength value={password} />

          <Pressable style={styles.agreeRow} onPress={() => setAgree((a) => !a)}>
            <View style={[styles.checkbox, agree && styles.checkboxOn]}>{agree && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.agreeText}>
              I agree to the processing of my academic profile under local educational privacy guidelines.
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Create Free Account'}</Text>
            {!busy && <Text style={styles.arrow}>→</Text>}
          </Pressable>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR SIGN UP WITH</Text><View style={styles.line} /></View>

          <Pressable onPress={() => setError('Google sign-up requires a configured Google OAuth client ID (see .env).')} style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Sign up with Google</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>🛡️  Your data is protected under Sri Lankan educational privacy standards</Text>
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
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 },
  inputIcon: { fontSize: 15, marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { fontSize: 16, marginLeft: 6 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  checkboxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: colors.slateDark },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8 },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20, marginLeft: 10 },
  pressed: { opacity: 0.8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontSize: 10, fontWeight: '700', color: colors.slate400, marginHorizontal: 10 },
  googleBtn: { height: 50, borderRadius: 11, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  googleG: { fontSize: 16, fontWeight: '800', color: '#EA4335', marginRight: 10 },
  googleText: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
  haveAccount: { fontSize: 12.5, color: colors.muted },
  link: { color: colors.blue, fontWeight: '800' },
});

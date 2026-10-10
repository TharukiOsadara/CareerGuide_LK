import React, { useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Field from '../../components/Field';
import PasswordStrength from '../../components/PasswordStrength';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import { collectErrors, hasErrors, validateEmail, validateName, validateNewPassword } from '../../utils/validation';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';

export default function AdminCreateAccount({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const submit = async () => {
    setError(''); setMessage('');
    const errs = collectErrors({
      fullName: validateName(fullName),
      email: validateEmail(email),
      password: validateNewPassword(password),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSubmitting(true);
    try {
      const res = await api('/api/auth/admin/register', {
        method: 'POST', auth: false,
        body: { fullName: fullName.trim(), email: email.trim(), password },
      });
      setMessage((res && res.message) || 'Your admin account request has been submitted and is pending super admin approval.');
      setFullName(''); setEmail(''); setPassword('');
    } catch (e) {
      setError(e.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Create Admin Account</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Register as Admin</Text>
        <Text style={styles.subtitle}>
          New admin accounts require super admin approval before you can sign in.
        </Text>

        {message ? (
          <View style={styles.okBanner}>
            <IconText icon="check-circle" size={16} color={colors.greenDark} textStyle={styles.okTitle}>Request Submitted</IconText>
            <Text style={styles.okText}>{message}</Text>
            <Text style={styles.okNote}>
              You cannot sign in as admin until a super admin approves this request.
            </Text>
          </View>
        ) : null}

        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        <View style={styles.card}>
          <Field label="Full Name" icon="user" value={fullName} onChangeText={change(setFullName, 'fullName')} placeholder="Your full name" autoCapitalize="words" maxLength={100} error={errors.fullName} />
          <Field label="Email" icon="mail" value={email} onChangeText={change(setEmail, 'email')} placeholder="you@example.com" keyboardType="email-address" maxLength={254} error={errors.email} />
          <Field label="Password" icon="key" value={password} onChangeText={change(setPassword, 'password')} placeholder="Create a password" secure maxLength={128} error={errors.password} />
          <PasswordStrength value={password} />

          <Pressable disabled={submitting} onPress={submit} style={({ pressed }) => [styles.submitBtn, (pressed || submitting) && styles.pressed]}>
            <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Request Admin Account'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('AdminPortal')} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backText}>Back to Admin Login</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: colors.blue,
  },
  hBtn: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  hIcon: { fontSize: 17 },
  hTitle: { flex: 1, textAlign: 'center', color: colors.navy, fontSize: 14.5, fontWeight: '800' },

  content: { padding: 16, paddingBottom: 24 },
  title: { color: colors.navy, fontSize: 20, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6 },

  okBanner: { backgroundColor: colors.greenPale, borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.green },
  okTitle: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  okText: { color: colors.greenDark, fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  okNote: { color: colors.greenDark, fontSize: 11, fontWeight: '700', marginTop: 8 },

  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginTop: 14 },
  errText: { color: colors.redStrong, fontSize: 11.5 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  submitBtn: { backgroundColor: colors.blue, borderRadius: 9, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  submitText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },

  backBtn: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  backText: { color: colors.blue, fontSize: 13, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});


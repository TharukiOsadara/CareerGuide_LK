import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import { validateEmail } from '../../utils/validation';
import BackButton, { BACK_WIDTH } from '../../components/BackButton';
import Icon, { IconText } from '../../components/Icon';
import FieldError, { errorBorder } from '../../components/FieldError';

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const emailMsg = validateEmail(email);
    setEmailError(emailMsg);
    if (emailMsg) return;
    setBusy(true);
    try {
      // The code is emailed (never returned here); the next screen asks for it.
      await api('/api/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim() } });
      navigation.navigate('ResetPassword', { email: email.trim() });
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
        <BackButton onPress={() => navigation.navigate('SignIn')} />
        <Brand size="sm" />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconTile}><Icon name="key" size={26} color={colors.blue} /></View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we'll send you a 6-digit reset code.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputBox, !!emailError && errorBorder]}>
            <Icon name="mail" size={17} color={colors.blue} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={email} onChangeText={(v) => { setEmail(v); setEmailError(''); }} maxLength={254}
              placeholder="student@example.lk" placeholderTextColor={colors.slate400}
              keyboardType="email-address" autoCapitalize="none" autoFocus
            />
          </View>
          <FieldError message={emailError} style={{ alignSelf: 'flex-start' }} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Sending�' : 'Send Reset Code'}</Text>
            {!busy && <Icon name="arrow-right" size={18} color={colors.white} style={styles.arrow} />}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 16, alignSelf: 'center' }}>
            <IconText icon="arrow-left" size={15} color={colors.blue} textStyle={styles.link}>Back to Sign In</IconText>
          </Pressable>
        </View>

        <IconText icon="shield-check" size={13} color={colors.slate400} gap={5} center style={{ marginTop: 20 }} textStyle={styles.footer}>Your data is protected under Sri Lankan educational privacy standards</IconText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  label: { alignSelf: 'flex-start', fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7, marginTop: 20 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1.5, borderColor: colors.blue, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.blueLight, width: '100%' },
  inputIcon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 12, backgroundColor: colors.redLight, padding: 9, borderRadius: 8, alignSelf: 'stretch' },
  primaryBtn: { height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, width: '100%' },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { marginLeft: 10 },
  pressed: { opacity: 0.8 },
  link: { color: colors.blue, fontWeight: '800', fontSize: 13 },
  footer: { fontSize: 10.5, color: colors.slate400, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});


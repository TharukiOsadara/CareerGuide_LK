import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../components/Brand';
import RoleTabs from '../components/RoleTabs';
import { useAuth } from '../context/AuthContext';
import { ROLES_WITH_ADMIN } from '../config';
import { colors } from '../styles/colors';

export default function AdminPortal({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Switching away from Admin returns to the standard sign-in with that role.
  const onRoleChange = (r) => {
    if (r === 'admin') return;
    navigation.navigate('SignIn', { role: r });
  };

  const submit = async () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid administrator email.');
    if (!password) return setError('Enter your admin password.');
    setBusy(true);
    try {
      await signIn({ email: email.trim(), password, role: 'admin' });
      navigation.reset({ index: 0, routes: [{ name: 'AdminOverview', params: { welcome: true } }] });
    } catch (e) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}>
        <Pressable hitSlop={10} onPress={() => navigation.navigate('Onboarding')}><Text style={styles.back}>←</Text></Pressable>
        <Brand size="sm" />
        <Text style={styles.help}>?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <RoleTabs roles={ROLES_WITH_ADMIN} value="admin" onChange={onRoleChange} />

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Administrative Portal</Text>
              <Text style={styles.subtitle}>Secure staff authentication required.</Text>
            </View>
            <Text style={styles.shield}>🛡️</Text>
          </View>

          <Text style={styles.label}>Administrator Email or Staff ID</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>🧑‍💼</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="admin@careerguide.lk" placeholderTextColor={colors.slate400} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <Text style={styles.label}>Admin Password</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Enter admin password" placeholderTextColor={colors.slate400} secureTextEntry={!showPw} />
            <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}><Text style={styles.eye}>{showPw ? '🙈' : '👁️'}</Text></Pressable>
          </View>

          <Text style={styles.label}>Security Token / 2FA Pin</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput style={styles.input} value={token2fa} onChangeText={setToken2fa} placeholder="Enter 6-digit code" placeholderTextColor={colors.slate400} keyboardType="number-pad" maxLength={6} />
          </View>

          <Pressable style={styles.rememberRow} onPress={() => setRemember((r) => !r)}>
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>{remember && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.rememberText}>Remember this device</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Authenticating…' : 'Authenticate Admin Access'}</Text>
            {!busy && <Text style={styles.arrow}>→</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('AdminCreateAccount')} style={{ marginTop: 18, alignSelf: 'center' }}>
          <Text style={styles.bottom}>🛡️  Are you a portal administrator? <Text style={styles.link}>Staff Login Here</Text></Text>
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
  shield: { fontSize: 20 },
  label: { fontSize: 11.5, fontWeight: '700', color: colors.slate, marginBottom: 7, marginTop: 16, textTransform: 'none' },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.bgSofter },
  inputIcon: { fontSize: 15, marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { fontSize: 16, marginLeft: 6 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  checkboxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  rememberText: { fontSize: 12.5, color: colors.slateDark },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 14, backgroundColor: colors.redLight, padding: 9, borderRadius: 8 },
  primaryBtn: { height: 52, borderRadius: 11, backgroundColor: colors.adminDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  arrow: { color: colors.white, fontSize: 20, marginLeft: 10 },
  pressed: { opacity: 0.85 },
  bottom: { fontSize: 12, color: colors.muted },
  link: { color: colors.blue, fontWeight: '800' },
});

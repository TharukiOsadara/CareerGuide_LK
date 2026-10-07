import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentHeader from '../components/StudentHeader';
import StudentNav from '../components/StudentNav';
import Dropdown from '../components/Dropdown';
import { api } from '../api/client';
import { AL_STREAMS } from '../config';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

export default function StudentProfile({ navigation }) {
  const { user, refresh, signOut } = useAuth();
  const completion = Number(user?.profileCompletion || 0);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [alStream, setAlStream] = useState(user?.alStream || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async () => {
    setError('');
    setSuccess('');
    try {
      setSaving(true);
      await api('/api/users/me', { method: 'PUT', body: { fullName: fullName.trim(), alStream } });
      await refresh();
      setSuccess('Profile updated successfully.');
    } catch (e) {
      setError(e.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    try { await signOut(); } catch {}
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <StudentHeader navigation={navigation} user={user} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {/* Profile summary */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.avatarInitials || '👤'}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName || 'Student'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.pillRow}>
            <Text style={styles.rolePill}>STUDENT</Text>
          </View>
          {user?.alStream ? <Text style={styles.stream}>🎓 {user.alStream}</Text> : null}

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Profile Completion</Text>
            <Text style={styles.progressLabel}>{completion}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, completion))}%` }]} />
          </View>
        </View>

        {/* Edit section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          {error ? <View style={styles.banner}><Text style={styles.bannerText}>{error}</Text></View> : null}
          {success ? <View style={styles.successBanner}><Text style={styles.successText}>{success}</Text></View> : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.slate400}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>A/L Stream</Text>
          <View style={{ marginTop: 6 }}>
            <Dropdown
              value={alStream}
              options={AL_STREAMS}
              onSelect={setAlStream}
              placeholder="Select your A/L stream"
              icon="📘"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            style={({ pressed }) => [styles.saveButton, saving && styles.saveDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </Pressable>
        </View>

        {/* Sign out */}
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <StudentNav active="StudentProfile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 24 },

  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  avatar: {
    alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: colors.blue, fontSize: 26, fontWeight: '800' },
  name: { color: colors.navy, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  email: { color: colors.slate, fontSize: 12, textAlign: 'center', marginTop: 3 },
  pillRow: { alignItems: 'center', marginTop: 8 },
  rolePill: {
    color: colors.blue, backgroundColor: colors.blueLight, fontSize: 9.5, fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden',
  },
  stream: { color: colors.slateDark, fontSize: 12.5, textAlign: 'center', marginTop: 8, fontWeight: '600' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 7 },
  progressLabel: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.blue },

  sectionTitle: { color: colors.navy, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  label: { color: colors.slate600, fontSize: 11.5, fontWeight: '700' },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12,
    fontSize: 13.5, color: colors.navy, marginTop: 6, backgroundColor: colors.white,
  },

  banner: { backgroundColor: colors.redLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  bannerText: { color: colors.redStrong, fontSize: 11.5 },
  successBanner: { backgroundColor: colors.greenLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  successText: { color: colors.greenDark, fontSize: 11.5, fontWeight: '700' },

  saveButton: {
    marginTop: 18, height: 46, borderRadius: 10, backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  saveDisabled: { backgroundColor: colors.slate400 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  signOutButton: {
    height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.redLight, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { color: colors.red, fontSize: 13.5, fontWeight: '800' },

  pressed: { opacity: 0.78 },
});

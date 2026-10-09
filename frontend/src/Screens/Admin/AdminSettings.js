import React, { useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../components/AdminHeader';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';

export default function AdminSettings({ navigation }) {
  const { user, signOut } = useAuth();
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [emailDigests, setEmailDigests] = useState(false);
  const [darkSurfaces, setDarkSurfaces] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { settings } = await api('/api/settings');
        if (settings && typeof settings.loginNotifications === 'boolean') {
          setLoginNotifications(settings.loginNotifications);
        }
      } catch (e) { setError(e.message || 'Failed to load settings.'); }
    })();
  }, []);

  const toggleLoginNotifications = async (val) => {
    setLoginNotifications(val); // optimistic
    setSaving(true); setError('');
    try {
      await api('/api/settings', { method: 'PUT', body: { loginNotifications: val } });
    } catch (e) {
      setLoginNotifications(!val); // revert
      setError(e.message || 'Could not update setting.');
    } finally {
      setSaving(false);
    }
  };

  const doSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <AdminHeader navigation={navigation} user={user} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.pageTitle}>Settings</Text>
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        <Text style={styles.heading}>Notifications</Text>
        <View style={styles.card}>
          <Row
            title="Login Notifications"
            sub="Get notified when any user logs in. Turn off to stop these alerts."
            value={loginNotifications}
            onChange={toggleLoginNotifications}
            disabled={saving}
          />
          <View style={styles.divider} />
          <Row
            title="Email Digests"
            sub="Receive a daily summary of admin activity by email."
            value={emailDigests}
            onChange={setEmailDigests}
          />
        </View>

        <Text style={styles.heading}>Appearance</Text>
        <View style={styles.card}>
          <Row
            title="Dark Admin Surfaces"
            sub="Use dark cards across the admin dashboard."
            value={darkSurfaces}
            onChange={setDarkSurfaces}
          />
        </View>

        <Pressable onPress={doSignOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <AdminNav active="AdminSettings" navigation={navigation} />
    </SafeAreaView>
  );
}

function Row({ title, sub, value, onChange, disabled }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.blue }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: { color: colors.navy, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },
  heading: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowTitle: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  rowSub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border },
  signOut: { marginTop: 24, borderWidth: 1, borderColor: colors.red, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white },
  signOutText: { color: colors.redStrong, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});


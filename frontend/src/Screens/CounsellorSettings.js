import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';
import { useAuth } from '../context/AuthContext';

export default function CounsellorSettings({ navigation }) {
  const { signOut } = useAuth();
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    counsellorApi.settings().then((response) => setSettings(response.settings)).catch((loadError) => setError(loadError.message));
    counsellorApi.profile().then((response) => { setProfile(response.profile); setFullName(response.profile.fullName || ''); }).catch((loadError) => setError(loadError.message));
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim()) return setError('Full name is required.');
    try { const response = await counsellorApi.updateProfile({ fullName }); setProfile(response.profile); }
    catch (saveError) { setError(saveError.message); }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    try { await counsellorApi.changePassword({ currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setError('Password updated successfully.'); }
    catch (saveError) { setError(saveError.message); }
  };

  const update = async (field, value) => {
    const next = { ...settings, [field]: value };
    setSettings(next);
    try {
      const response = await counsellorApi.updateSettings({ [field]: value });
      setSettings(response.settings);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  if (!settings) return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /><Text style={styles.error}>{error}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
        <Text style={styles.heading}>Counsellor Settings</Text>
        <Text style={styles.subtitle}>Manage your portal preferences.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.title}>Profile</Text><Text style={styles.muted}>{profile?.email || 'Loading profile…'}</Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" style={[styles.search, { marginTop: 12 }]} placeholderTextColor={colors.muted} />
          <Pressable style={styles.button} onPress={saveProfile}><Text style={styles.buttonText}>Save Profile</Text></Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Change Password</Text>
          <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry style={[styles.search, { marginTop: 12 }]} placeholderTextColor={colors.muted} />
          <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password (8+ characters)" secureTextEntry style={styles.search} placeholderTextColor={colors.muted} />
          <Pressable style={styles.button} onPress={savePassword}><Text style={styles.buttonText}>Update Password</Text></Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>CA</Text></View><View style={styles.headerCopy}><Text style={styles.title}>Senior Educational Counsellor</Text><Text style={styles.muted}>Verified Advisor</Text></View></View>
          <Text style={[styles.muted, { marginTop: 12 }]}>{settings.schoolAffiliation || 'School affiliation not recorded'}</Text>
          <Text style={styles.muted}>{settings.zone || 'Zone not recorded'}</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 18 }]}><Text style={styles.flex}>Notifications</Text><Switch value={settings.notificationsEnabled} onValueChange={(value) => update('notificationsEnabled', value)} trackColor={{ false: colors.border, true: colors.blue }} /></View>
          <View style={styles.row}><Text style={styles.flex}>Email Alerts</Text><Switch value={settings.emailAlertsEnabled} onValueChange={(value) => update('emailAlertsEnabled', value)} trackColor={{ false: colors.border, true: colors.blue }} /></View>
        </View>
        <View style={styles.card}>
          <Text style={styles.muted}>School Affiliation</Text><Text style={styles.title}>{settings.schoolAffiliation || 'Not recorded'}</Text>
          <Text style={[styles.muted, { marginTop: 14 }]}>Zone</Text><Text style={styles.title}>{settings.zone || 'Not recorded'}</Text>
          <Text style={[styles.muted, { marginTop: 14 }]}>UGC Handbook Version</Text><Text style={styles.title}>{settings.ugcHandbookVersion || 'Not recorded'}</Text>
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={async () => { await signOut(); navigation.replace('SignIn'); }}><Text style={[styles.buttonText, styles.secondaryText]}>Sign Out</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import { styles } from './styles';
import { useAuth } from '../../context/AuthContext';
import ProfileHeader from '../../components/ProfileHeader';

export default function CounsellorSettings({ navigation }) {
  const { signOut, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    counsellorApi.settings().then((response) => setSettings(response.settings)).catch((loadError) => setError(loadError.message));
  }, []);

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
      <ProfileHeader title="Counsellor Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Manage your portal preferences.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <View style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.avatarInitials || (user?.fullName || 'C').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</Text></View><View style={styles.headerCopy}><Text style={styles.title}>{user?.fullName || 'Counsellor'}</Text><Text style={styles.muted}>Senior Educational Counsellor</Text><Text style={styles.muted}>Verified Advisor</Text></View></View>
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

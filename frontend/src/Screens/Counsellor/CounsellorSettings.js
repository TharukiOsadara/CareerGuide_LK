import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import { styles } from './styles';
import { useAuth } from '../../context/AuthContext';
import ProfileHeader from '../../Components/ProfileHeader';
import { confirmAction } from './CounsellorGuidanceForm';

const FIELDS = [
  { key: 'schoolAffiliation', label: 'School Affiliation', placeholder: 'e.g. Royal College, Colombo 07', max: 160 },
  { key: 'zone', label: 'Zone / Province', placeholder: 'e.g. Colombo Zone, Western Province', max: 160 },
  { key: 'ugcHandbookVersion', label: 'UGC Handbook Version', placeholder: 'e.g. v2026.1', max: 40 },
];

const blankForm = { schoolAffiliation: '', zone: '', ugcHandbookVersion: '' };
const toForm = (s) => ({
  schoolAffiliation: s?.schoolAffiliation || '',
  zone: s?.zone || '',
  ugcHandbookVersion: s?.ugcHandbookVersion || '',
});

export default function CounsellorSettings({ navigation }) {
  const { signOut, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [courses, setCourses] = useState([]);
  const [available, setAvailable] = useState([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Profile details exist on the server once createdAt is set (otherwise these are defaults).
  const saved = Boolean(settings?.createdAt);
  const dirty = settings && FIELDS.some(({ key }) => (form[key] || '') !== (settings[key] || ''));

  const loadCourses = useCallback(async () => {
    const response = await counsellorApi.myCourses();
    setCourses(response.courses || []);
    setAvailable(response.available || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await counsellorApi.settings();
        setSettings(response.settings);
        setForm(toForm(response.settings));
        await loadCourses();
      } catch (loadError) {
        setError(loadError.message);
      }
    })();
  }, [loadCourses]);

  const run = async (label, action, success) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  };

  // Create (first save) or Update the profile details.
  const saveDetails = () => {
    const body = {};
    FIELDS.forEach(({ key }) => { body[key] = form[key].trim() || null; });
    return run('save', async () => {
      const response = saved ? await counsellorApi.updateSettings(body) : await counsellorApi.createSettings(body);
      setSettings(response.settings);
      setForm(toForm(response.settings));
    }, saved ? 'Profile details updated.' : 'Profile details saved.');
  };

  // Delete the saved profile details.
  const clearDetails = async () => {
    const ok = await confirmAction('Clear profile details?', 'Your school, zone and handbook version will be removed. Notification choices go back to the defaults.', 'Clear');
    if (!ok) return;
    run('clear', async () => {
      await counsellorApi.deleteSettings();
      const response = await counsellorApi.settings();
      setSettings(response.settings);
      setForm(toForm(response.settings));
    }, 'Profile details cleared.');
  };

  const toggle = (field, value) => run(field, async () => {
    setSettings((current) => ({ ...current, [field]: value }));
    const response = saved
      ? await counsellorApi.updateSettings({ [field]: value })
      : await counsellorApi.createSettings({ [field]: value });
    setSettings(response.settings);
  });

  const addCourse = (course) => run(`add-${course.id}`, async () => {
    await counsellorApi.addCourse(course.id);
    await loadCourses();
    setPicking(false);
  }, `You now guide ${course.title}.`);

  const removeCourse = async (course) => {
    const ok = await confirmAction(
      'Stop guiding this course?',
      `${course.title}${course.myStudents ? `\n${course.myStudents} matched student(s) will be moved to another counsellor for this course.` : ''}`,
      'Remove'
    );
    if (!ok) return;
    run(`remove-${course.id}`, async () => {
      await counsellorApi.removeCourse(course.id);
      await loadCourses();
    }, `Removed ${course.title}.`);
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.screen}>
        <ProfileHeader title="Counsellor Settings" onBack={() => navigation.goBack()} />
        {error ? <Text style={[styles.error, { margin: 18 }]}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} />}
      </SafeAreaView>
    );
  }

  const initials = user?.avatarInitials || (user?.fullName || 'C').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.screen}>
      <ProfileHeader title="Counsellor Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={[styles.muted, { color: colors.blue, marginBottom: 10 }]}>{notice}</Text> : null}

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{user?.fullName || 'Counsellor'}</Text>
              <Text style={styles.muted}>{user?.email}</Text>
              <Text style={styles.muted}>{settings.schoolAffiliation || 'School not recorded'} · {settings.zone || 'Zone not recorded'}</Text>
            </View>
          </View>
        </View>

        {/* CRUD 1: profile details (create / read / update / delete) */}
        <Text style={styles.sectionTitle}>Profile details</Text>
        <View style={styles.card}>
          {FIELDS.map(({ key, label, placeholder, max }) => (
            <View key={key} style={{ marginBottom: 12 }}>
              <Text style={styles.muted}>{label}</Text>
              <TextInput
                value={form[key]}
                onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                maxLength={max}
                style={[styles.search, { marginTop: 6, marginBottom: 0 }]}
              />
            </View>
          ))}
          <Text style={styles.muted}>{saved ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}` : 'Not saved yet'}</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.flex, { marginRight: saved ? 6 : 0 }, !dirty && saved && { opacity: 0.5 }]}
              onPress={saveDetails}
              disabled={Boolean(busy) || (saved && !dirty)}
            >
              <Text style={styles.buttonText}>{busy === 'save' ? 'Saving...' : saved ? 'Update Details' : 'Save Details'}</Text>
            </Pressable>
            {saved ? (
              <Pressable style={[styles.button, styles.flex, { marginLeft: 6, backgroundColor: colors.redLight }]} onPress={clearDetails} disabled={Boolean(busy)}>
                <Text style={[styles.buttonText, { color: colors.redStrong }]}>{busy === 'clear' ? 'Clearing...' : 'Clear Details'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* CRUD 2: courses I guide (create / read / delete) */}
        <Text style={styles.sectionTitle}>Courses I guide ({courses.length})</Text>
        <Text style={[styles.muted, { marginTop: -6, marginBottom: 10 }]}>Students who choose these courses are matched to you.</Text>
        {courses.map((course) => (
          <View key={course.id} style={[styles.card, styles.row]}>
            <View style={styles.flex}>
              <Text style={styles.studentName}>{course.title}</Text>
              <Text style={styles.muted}>{course.institute || 'Institute not recorded'} · {course.myStudents} student(s)</Text>
            </View>
            <Pressable
              style={[styles.button, { marginTop: 0, backgroundColor: colors.redLight }]}
              onPress={() => removeCourse(course)}
              disabled={Boolean(busy)}
            >
              <Text style={[styles.buttonText, { color: colors.redStrong }]}>{busy === `remove-${course.id}` ? '...' : 'Remove'}</Text>
            </Pressable>
          </View>
        ))}
        {!courses.length ? <Text style={styles.muted}>You don't guide any course yet.</Text> : null}
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setPicking((v) => !v)} disabled={Boolean(busy)}>
          <Text style={[styles.buttonText, styles.secondaryText]}>{picking ? 'Close course list' : '+ Add a course'}</Text>
        </Pressable>
        {picking ? (
          <View style={[styles.card, { marginTop: 10 }]}>
            {available.map((course) => (
              <Pressable key={course.id} style={styles.pathway} onPress={() => addCourse(course)} disabled={Boolean(busy)}>
                <Text style={styles.pathwayText}>{busy === `add-${course.id}` ? 'Adding... ' : '+ '}{course.title}</Text>
                <Text style={styles.muted}>{course.institute || ''}</Text>
              </Pressable>
            ))}
            {!available.length ? <Text style={styles.muted}>You already guide every course.</Text> : null}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Notifications</Text>
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 18 }]}>
            <Text style={styles.flex}>Notifications</Text>
            <Switch value={settings.notificationsEnabled} onValueChange={(value) => toggle('notificationsEnabled', value)} trackColor={{ false: colors.border, true: colors.blue }} />
          </View>
          <View style={styles.row}>
            <Text style={styles.flex}>Email Alerts</Text>
            <Switch value={settings.emailAlertsEnabled} onValueChange={(value) => toggle('emailAlertsEnabled', value)} trackColor={{ false: colors.border, true: colors.blue }} />
          </View>
        </View>

        <Pressable style={[styles.button, styles.secondaryButton]} onPress={async () => { await signOut(); navigation.replace('SignIn'); }}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

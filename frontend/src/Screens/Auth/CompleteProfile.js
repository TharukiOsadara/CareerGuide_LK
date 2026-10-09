import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Brand from '../../components/Brand';
import Field from '../../components/Field';
import Dropdown from '../../components/Dropdown';
import FieldError from '../../components/FieldError';
import CoursePicker from '../../components/CoursePicker';
import Icon, { IconText } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AL_STREAMS, homeRouteFor } from '../../config';
import { colors } from '../../styles/colors';
import { collectErrors, hasErrors, required, validateEmail, validateName, validateNumber } from '../../utils/validation';

const RELATIONSHIPS = [
  { key: 'mother', label: 'Mother' },
  { key: 'father', label: 'Father' },
  { key: 'guardian', label: 'Guardian' },
];
const ROLE_LABEL = { student: 'Student', parent: 'Parent', counsellor: 'Counsellor' };

// Shown once after a Google sign-up: Google gives us the name, email and photo,
// so here the user adds what only they know (stream & Z-score, or their children).
export default function CompleteProfile({ navigation }) {
  const { user, setUser, signOut } = useAuth();
  const role = user?.role || 'student';
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [alStream, setAlStream] = useState(user?.alStream || '');
  const [zScore, setZScore] = useState(user?.zScore != null ? String(user.zScore) : '');
  const [relationship, setRelationship] = useState('guardian');
  const [childEmail1, setChildEmail1] = useState('');
  const [childEmail2, setChildEmail2] = useState('');
  const [counsellorCourses, setCounsellorCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const submit = async () => {
    setError('');
    const own = (user?.email || '').toLowerCase();
    const c1 = childEmail1.trim().toLowerCase();
    const c2 = childEmail2.trim().toLowerCase();
    const errs = collectErrors({
      fullName: validateName(fullName),
      alStream: role === 'student' ? required(alStream, 'A/L stream') : '',
      zScore: role === 'student' ? validateNumber(zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }) : '',
      childEmail1: role === 'parent'
        ? (validateEmail(childEmail1, 'Child 1 email') || (c1 === own ? "Use your child's email, not your own." : ''))
        : '',
      childEmail2: role === 'parent' && c2
        ? (validateEmail(childEmail2, 'Child 2 email')
          || (c2 === own ? "Use your child's email, not your own." : '')
          || (c2 === c1 ? 'Child 2 email must be different from Child 1.' : ''))
        : '',
      counsellorCourses: role === 'counsellor' && counsellorCourses.length === 0
        ? 'Choose at least one course you guide.' : '',
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setBusy(true);
    try {
      const { user: updated } = await api('/api/users/me/complete-profile', {
        method: 'PUT',
        body: {
          fullName: fullName.trim(),
          alStream: role === 'student' ? alStream : undefined,
          zScore: role === 'student' ? zScore.trim() : undefined,
          relationship: role === 'parent' ? relationship : undefined,
          childEmail1: role === 'parent' ? c1 : undefined,
          childEmail2: role === 'parent' && c2 ? c2 : undefined,
          counsellorCourseIds: role === 'counsellor' ? counsellorCourses : undefined,
        },
      });
      setUser(updated);
      navigation.reset({ index: 0, routes: [{ name: homeRouteFor(updated.role), params: { welcome: true } }] });
    } catch (e) {
      setError(e.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    try { await signOut(); } catch {}
    navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      <View style={styles.topbar}><Brand size="sm" /></View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          You signed in with Google. Add a few details so we can personalise CareerGuide for you.
        </Text>

        {/* What Google shared */}
        <View style={styles.googleCard}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={styles.photo} />
            : <View style={[styles.photo, styles.photoEmpty]}><Icon name="user" size={22} color={colors.blue} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <IconText icon="check-circle" size={13} color={colors.greenDark} gap={4} style={{ marginTop: 3 }} textStyle={styles.verified}>
              Verified by Google
            </IconText>
          </View>
          <View style={styles.rolePill}><Text style={styles.rolePillText}>{ROLE_LABEL[role] || role}</Text></View>
        </View>

        <View style={styles.card}>
          <Field
            label="Full Name" icon="user" value={fullName} onChangeText={change(setFullName, 'fullName')}
            placeholder="Your full name" autoCapitalize="words" maxLength={100} error={errors.fullName}
          />

          {role === 'student' && (
            <>
              <Text style={styles.label}>A/L Examination Stream</Text>
              <Dropdown
                value={alStream} options={AL_STREAMS} onSelect={change(setAlStream, 'alStream')}
                placeholder="Select your stream" icon="book" error={errors.alStream}
              />
              <Field
                label="Z-Score" icon="chart" value={zScore} onChangeText={change(setZScore, 'zScore')}
                placeholder="e.g. 1.8542" keyboardType="decimal-pad" maxLength={7} error={errors.zScore}
              />
            </>
          )}

          {role === 'parent' && (
            <>
              <Text style={styles.label}>You are the student's</Text>
              <View style={styles.relRow}>
                {RELATIONSHIPS.map((r) => {
                  const on = relationship === r.key;
                  return (
                    <Pressable key={r.key} onPress={() => setRelationship(r.key)} style={[styles.relChip, on && styles.relChipOn]}>
                      <Text style={[styles.relText, on && styles.relTextOn]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field
                label="Child 1 Student Email" icon="mail" value={childEmail1} onChangeText={change(setChildEmail1, 'childEmail1')}
                placeholder="child1@example.com" keyboardType="email-address" maxLength={254} error={errors.childEmail1}
              />
              <Field
                label="Child 2 Student Email (optional)" icon="mail" value={childEmail2} onChangeText={change(setChildEmail2, 'childEmail2')}
                placeholder="child2@example.com" keyboardType="email-address" maxLength={254} error={errors.childEmail2}
              />
              <Text style={styles.helper}>Your child must already have a CareerGuide student account.</Text>
            </>
          )}

          {role === 'counsellor' && (
            <>
              <Text style={styles.label}>Courses</Text>
              <Text style={styles.helper}>Choose the courses you guide. Students who pick these can be matched with you.</Text>
              <View style={{ marginTop: 8 }}>
                <CoursePicker
                  value={counsellorCourses}
                  onChange={(ids) => { setCounsellorCourses(ids); setErrors((e) => ({ ...e, counsellorCourses: '' })); }}
                  error={errors.counsellorCourses}
                />
              </View>
            </>
          )}

          {error ? <FieldError message={error} style={styles.errorBox} /> : null}

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}>
            <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save & Continue'}</Text>
            {!busy && <Icon name="arrow-right" size={18} color={colors.white} style={{ marginLeft: 10 }} />}
          </Pressable>
        </View>

        <Pressable onPress={cancel} style={styles.cancel} hitSlop={8}>
          <Text style={styles.cancelText}>Not now — sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  topbar: { height: 54, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginTop: 4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 6 },

  googleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 14,
    padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.border,
  },
  photo: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: colors.blueLight },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  email: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  verified: { color: colors.greenDark, fontSize: 11, fontWeight: '700' },
  rolePill: { backgroundColor: colors.blueChip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  rolePillText: { color: colors.blue, fontSize: 11, fontWeight: '800' },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginTop: 14, marginBottom: 7 },
  helper: { color: colors.slate, fontSize: 11.5, marginTop: 8 },
  relRow: { flexDirection: 'row', gap: 8 },
  relChip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.white },
  relChipOn: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  relText: { color: colors.slateDark, fontSize: 12.5, fontWeight: '700' },
  relTextOn: { color: colors.blue, fontWeight: '800' },
  errorBox: { backgroundColor: colors.redLight, padding: 10, borderRadius: 8, marginTop: 14 },

  primaryBtn: {
    height: 50, borderRadius: 11, backgroundColor: colors.blue, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  cancel: { alignSelf: 'center', marginTop: 16 },
  cancelText: { color: colors.slate, fontSize: 12.5, fontWeight: '700' },
});

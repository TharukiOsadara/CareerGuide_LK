import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Field from '../../Components/Field';
import Dropdown from '../../Components/Dropdown';
import { api } from '../../api/client';
import { colors } from '../../styles/colors';
import { hasErrors, validateNotification } from '../../utils/validation';
import FieldError, { errorBorder } from '../../Components/FieldError';
import BackButton, { BACK_WIDTH } from '../../Components/BackButton';
import Icon, { IconText } from '../../Components/Icon';

const AUDIENCE = [
  { label: 'All Users', role: 'all' },
  { label: 'Students', role: 'student' },
  { label: 'Parents', role: 'parent' },
  { label: 'Counsellors', role: 'counsellor' },
  { label: 'Admins', role: 'admin' },
];
const LABELS = AUDIENCE.map((a) => a.label);
const roleForLabel = (label) => (AUDIENCE.find((a) => a.label === label) || AUDIENCE[0]).role;
const labelForRole = (role) => (AUDIENCE.find((a) => a.role === role) || AUDIENCE[0]).label;

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminNotifications({ navigation }) {
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [audience, setAudience] = useState('All Users');
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const change = (setter, key) => (v) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const load = useCallback(async () => {
    try {
      const { notifications } = await api('/api/notifications/sent');
      setSent(notifications || []);
    } catch (e) { setError(e.message || 'Failed to load notifications.'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setTitle(''); setBodyText(''); setAudience('All Users'); setEditingId(null); setErrors({}); };

  const submit = async () => {
    const errs = validateNotification({ title, body: bodyText, audience });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSending(true); setError(''); setSuccess('');
    const payload = { title: title.trim(), body: bodyText.trim(), targetRole: roleForLabel(audience) };
    try {
      if (editingId) await api(`/api/notifications/${editingId}`, { method: 'PUT', body: payload });
      else await api('/api/notifications', { method: 'POST', body: payload });
      setSuccess(editingId ? 'Notification updated' : 'Notification sent');
      resetForm();
      await load();
    } catch (e) {
      setError(e.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const edit = (n) => {
    setEditingId(n.id); setTitle(n.title); setBodyText(n.body);
    setAudience(labelForRole(n.targetRole)); setSuccess('');
  };

  const remove = (n) => {
    Alert.alert('Delete notification', `Delete "${n.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api(`/api/notifications/${n.id}`, { method: 'DELETE' }); await load(); }
          catch (e) { setError(e.message || 'Delete failed.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.hTitle}>Send Notifications</Text>
        <View style={{ width: BACK_WIDTH }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {success ? <View style={styles.okBanner}><IconText icon="check-circle" size={15} color={colors.greenDark} textStyle={styles.okText}>{success}</IconText></View> : null}
        {error ? <View style={styles.errBanner}><Text style={styles.errText}>{error}</Text></View> : null}

        {/* Compose */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingId ? 'Edit Notification' : 'Compose Notification'}</Text>
          <Field label="Title" icon="megaphone" value={title} onChangeText={change(setTitle, 'title')} placeholder="Notification title" autoCapitalize="sentences" maxLength={120} error={errors.title} />

          <Text style={styles.fLabel}>Message</Text>
          <TextInput
            style={[styles.multiline, !!errors.body && errorBorder]} multiline value={bodyText}
            onChangeText={change(setBodyText, 'body')} placeholder="Write your message…"
            placeholderTextColor={colors.slate400} maxLength={1000}
          />
          <FieldError message={errors.body} />

          <Text style={styles.fLabel}>Target Audience</Text>
          <Dropdown value={audience} options={LABELS} onSelect={change(setAudience, 'audience')} placeholder="Select audience" icon="users" error={errors.audience} />

          <View style={styles.formBtns}>
            {editingId ? (
              <Pressable onPress={resetForm} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable disabled={sending} onPress={submit} style={({ pressed }) => [styles.sendBtn, (pressed || sending) && styles.pressed]}>
              <Text style={styles.sendText}>{sending ? 'Sending…' : editingId ? 'Update Notification' : 'Send Notification'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Sent list */}
        <Text style={styles.heading}>Sent Notifications</Text>
        {sent.length === 0 ? (
          <Text style={styles.emptyLine}>No notifications sent yet.</Text>
        ) : sent.map((n) => (
          <View key={n.id} style={styles.sentCard}>
            <View style={styles.sentTop}>
              <Text style={styles.sentTitle} numberOfLines={1}>{n.title}</Text>
              <View style={styles.roleChip}><Text style={styles.roleChipText}>{labelForRole(n.targetRole)}</Text></View>
            </View>
            <Text style={styles.sentBody} numberOfLines={2}>{n.body}</Text>
            <View style={styles.sentFoot}>
              <Text style={styles.sentTime}>{timeAgo(n.createdAt)}</Text>
              <View style={{ flex: 1 }} />
              <Pressable hitSlop={6} onPress={() => edit(n)} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
                <Icon name="edit" size={15} color={colors.blue} />
              </Pressable>
              <Pressable hitSlop={6} onPress={() => remove(n)} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
                <Icon name="trash" size={15} color={colors.redStrong} />
              </Pressable>
            </View>
          </View>
        ))}
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
  okBanner: { backgroundColor: colors.greenPale, borderRadius: 8, padding: 10, marginBottom: 12 },
  okText: { color: colors.greenDark, fontSize: 12, fontWeight: '700' },
  errBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  errText: { color: colors.redStrong, fontSize: 11.5 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  fLabel: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginTop: 14, marginBottom: 7 },
  multiline: { minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.white, fontSize: 13, color: colors.navy, textAlignVertical: 'top' },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.slateDark, fontSize: 13, fontWeight: '800' },
  sendBtn: { flex: 2, backgroundColor: colors.blue, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  sendText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  heading: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  emptyLine: { color: colors.slate, fontSize: 11.5, fontStyle: 'italic' },
  sentCard: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  sentTop: { flexDirection: 'row', alignItems: 'center' },
  sentTitle: { flex: 1, color: colors.navy, fontSize: 13, fontWeight: '800' },
  roleChip: { backgroundColor: colors.blueChip, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  roleChipText: { color: colors.blue, fontSize: 9.5, fontWeight: '800' },
  sentBody: { color: colors.muted, fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  sentFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  sentTime: { color: colors.slate, fontSize: 10.5 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  iconBtnText: { fontSize: 14 },

  pressed: { opacity: 0.78 },
});


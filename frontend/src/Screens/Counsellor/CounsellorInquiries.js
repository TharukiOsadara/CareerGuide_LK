import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { counsellorApi } from './api';
import { colors } from '../../styles/colors';
import ProfileHeader from '../../components/ProfileHeader';
import Icon, { IconText } from '../../components/Icon';
import FieldError from '../../components/FieldError';

// Questions sent to this counsellor by their students (from course pages) and by parents
// (from the Parent Portal). The counsellor reads and replies here; replies appear in the
// student's notifications / the parent's question history.
const FILTERS = [
  { key: 'pending', label: 'Awaiting reply' },
  { key: 'answered', label: 'Answered' },
  { key: 'all', label: 'All' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export default function CounsellorInquiries({ navigation }) {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, answered: 0, total: 0 });
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(null); // inquiry being read / answered

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await counsellorApi.inquiries();
      setItems(data.inquiries || []);
      setCounts(data.counts || { pending: 0, answered: 0, total: 0 });
    } catch (e) {
      setError(e.message || 'Could not load inquiries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => items.filter((i) => filter === 'all' || i.status === filter), [items, filter]);

  const openInquiry = (inq) => {
    setOpen(inq);
    if (inq.type === 'parent' && inq.status === 'pending') {
      counsellorApi.markParentInquiryRead(inq.id).catch(() => {});
    }
  };

  const sendReply = async (reply) => {
    const res = await counsellorApi.replyToInquiry(open.type, open.id, reply);
    setOpen(null);
    setNotice(res.message || 'Reply sent.');
    await load();
  };

  const removeInquiry = () => {
    if (!open) return;
    Alert.alert('Delete inquiry?', 'This removes the inquiry from your counsellor inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await counsellorApi.deleteInquiry(open.type, open.id);
          setOpen(null);
          setNotice('Inquiry deleted.');
          await load();
        } catch (e) { setError(e.message || 'Could not delete the inquiry.'); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ProfileHeader title="Inquiries" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.blue]} />}
      >
        <Text style={styles.intro}>Questions from your students and their parents. Replies are sent straight back to them in the app.</Text>

        <View style={styles.stats}>
          <Stat value={counts.pending} label="Awaiting reply" warn={counts.pending > 0} />
          <Stat value={counts.answered} label="Answered" />
          <Stat value={counts.total} label="Total" />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filter, on && styles.filterOn]}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 30 }} /> : null}
        {!loading && !shown.length ? (
          <Text style={styles.empty}>{filter === 'pending' ? 'No questions are waiting for a reply.' : 'No inquiries here yet.'}</Text>
        ) : null}

        {shown.map((inq) => (
          <Pressable key={`${inq.type}-${inq.id}`} onPress={() => openInquiry(inq)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.cardTop}>
              <View style={[styles.typeChip, inq.type === 'parent' ? styles.typeParent : styles.typeStudent]}>
                <Text style={[styles.typeText, { color: inq.type === 'parent' ? colors.orange : colors.blue }]}>
                  {inq.type === 'parent' ? 'PARENT' : 'STUDENT'}
                </Text>
              </View>
              <View style={[styles.statusChip, inq.status === 'answered' ? styles.statusDone : styles.statusPending]}>
                <Text style={[styles.statusText, { color: inq.status === 'answered' ? colors.greenDark : colors.redStrong }]}>
                  {inq.status === 'answered' ? 'Answered' : 'Awaiting reply'}
                </Text>
              </View>
              <Text style={styles.time}>{timeAgo(inq.createdAt)}</Text>
            </View>
            <Text style={styles.subject} numberOfLines={2}>{inq.subject}</Text>
            <Text style={styles.from} numberOfLines={1}>
              From {inq.from}{inq.type === 'parent' ? ` (parent of ${inq.studentName})` : ''}{inq.context && inq.type === 'student' ? ` · ${inq.context}` : ''}
            </Text>
            <Text style={styles.message} numberOfLines={2}>{inq.message}</Text>
            <IconText icon={inq.status === 'answered' ? 'eye' : 'mail'} size={14} color={colors.blue} style={{ marginTop: 10 }} textStyle={styles.cta}>
              {inq.status === 'answered' ? 'View conversation' : 'Read & reply'}
            </IconText>
          </Pressable>
        ))}
      </ScrollView>

      <ReplyModal inquiry={open} onClose={() => setOpen(null)} onSend={sendReply} onDelete={removeInquiry} />
    </SafeAreaView>
  );
}

function Stat({ value, label, warn }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && { color: colors.redStrong }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReplyModal({ inquiry, onClose, onSend, onDelete }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setReply(''); setError(''); }, [inquiry]);
  if (!inquiry) return null;
  const answered = inquiry.status === 'answered';

  const send = async () => {
    const t = reply.trim();
    if (t.length < 2) return setError('Write a reply first.');
    setBusy(true); setError('');
    try { await onSend(t); } catch (e) { setError(e.message || 'Could not send the reply.'); } finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle} numberOfLines={2}>{inquiry.subject}</Text>
            <Pressable hitSlop={10} onPress={onClose}><Icon name="close" size={22} color={colors.slate} /></Pressable>
          </View>
          <Text style={styles.from}>
            From {inquiry.from} ({inquiry.fromEmail}){inquiry.type === 'parent' ? ` · parent of ${inquiry.studentName}` : ''}
          </Text>
          <ScrollView style={{ maxHeight: 360 }}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{inquiry.message}</Text>
              <Text style={styles.bubbleTime}>{timeAgo(inquiry.createdAt)}</Text>
            </View>
            {answered ? (
              <View style={[styles.bubble, styles.bubbleMine]}>
                <Text style={styles.bubbleLabel}>Your reply</Text>
                <Text style={styles.bubbleText}>{inquiry.reply}</Text>
                <Text style={styles.bubbleTime}>{timeAgo(inquiry.repliedAt)}</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={reply}
                  onChangeText={(v) => { setReply(v); setError(''); }}
                  placeholder="Write your reply…"
                  placeholderTextColor={colors.slate400}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.counter}>{reply.length}/1000</Text>
                <FieldError message={error} />
              </>
            )}
          </ScrollView>
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{answered ? 'Close' : 'Cancel'}</Text>
            </Pressable>
            {!answered ? (
              <Pressable disabled={busy} onPress={send} style={({ pressed }) => [styles.sendBtn, (pressed || busy) && styles.pressed]}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.sendText}>Send reply</Text>}
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={onDelete} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.redStrong, fontWeight: '700', textAlign: 'center' }}>Delete inquiry</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },

  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { color: colors.navy, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.slate, fontSize: 10.5, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  filters: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 },
  filter: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  filterOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.slateDark, fontSize: 12, fontWeight: '700' },
  filterTextOn: { color: colors.white, fontWeight: '800' },

  notice: { color: colors.greenDark, backgroundColor: colors.greenPale, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  error: { color: colors.redStrong, backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 },
  empty: { color: colors.slate, fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

  card: { backgroundColor: colors.white, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeStudent: { backgroundColor: colors.blueChip },
  typeParent: { backgroundColor: colors.yellow },
  typeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  statusChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusPending: { backgroundColor: colors.redLight },
  statusDone: { backgroundColor: colors.greenPale },
  statusText: { fontSize: 10, fontWeight: '800' },
  time: { marginLeft: 'auto', color: colors.slate400, fontSize: 11 },
  subject: { color: colors.navy, fontSize: 14, fontWeight: '800', marginTop: 9 },
  from: { color: colors.slate, fontSize: 11.5, marginTop: 3 },
  message: { color: colors.slateDark, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  cta: { color: colors.blue, fontSize: 12.5, fontWeight: '800' },
  pressed: { opacity: 0.85 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 18 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 18, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { flex: 1, color: colors.navy, fontSize: 16, fontWeight: '800' },
  bubble: { backgroundColor: colors.bgSofter, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.blueLight, borderColor: colors.bluePaleBorder },
  bubbleLabel: { color: colors.blue, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  bubbleText: { color: colors.navy, fontSize: 13, lineHeight: 19 },
  bubbleTime: { color: colors.slate400, fontSize: 10.5, marginTop: 6 },
  input: {
    minHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12,
    fontSize: 13.5, color: colors.navy, backgroundColor: colors.white,
  },
  counter: { color: colors.slate400, fontSize: 11, textAlign: 'right', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.slateDark, fontSize: 13.5, fontWeight: '800' },
  sendBtn: { flex: 2, height: 46, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
});

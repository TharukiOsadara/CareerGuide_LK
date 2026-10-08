import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import Chip from './Chip';
import TopicChips from './TopicChips';
import { INQUIRY_STATUS, formatRelative, topicLabel } from '../utils/format';
import { colors, font, radius, space } from '../theme';

export const MAX_MESSAGE = 1000;

// One parent question. Shows the counsellor's reply when there is one.
// While the counsellor hasn't read it ("sent"), it can be edited inline or withdrawn.
export default function InquiryCard({ inquiry, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [topic, setTopic] = useState(inquiry.topic);
  const [message, setMessage] = useState(inquiry.message);
  const [saving, setSaving] = useState(false);

  const status = INQUIRY_STATUS[inquiry.status] || INQUIRY_STATUS.sent;
  const edited = new Date(inquiry.updatedAt) - new Date(inquiry.createdAt) > 1000;
  const trimmed = message.trim();
  const unchanged = trimmed === inquiry.message && topic === inquiry.topic;

  const startEdit = () => {
    setTopic(inquiry.topic);
    setMessage(inquiry.message);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave(inquiry, { topic, message: trimmed });
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Chip label={topicLabel(inquiry.topic)} tone="info" />
        <Chip label={status.label} tone={status.tone} />
      </View>

      {editing ? (
        <View>
          <Text style={styles.editLabel}>Topic</Text>
          <TopicChips value={topic} onChange={setTopic} disabled={saving} />
          <Text style={[styles.editLabel, styles.gapTop]}>Your question</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={MAX_MESSAGE}
            editable={!saving}
            style={styles.input}
            accessibilityLabel="Edit your question"
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {message.length}/{MAX_MESSAGE}
          </Text>
          <View style={styles.actions}>
            <Button
              label="Save changes"
              onPress={save}
              busy={saving}
              disabled={!trimmed || unchanged}
              style={styles.flex}
            />
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={saving} style={styles.flex} />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.message}>{inquiry.message}</Text>
          <Text style={styles.date}>
            Sent {formatRelative(inquiry.createdAt)}
            {edited ? ' · Edited' : ''}
          </Text>

          {inquiry.reply ? (
            <View style={styles.reply}>
              <Text style={styles.replyLabel}>Counsellor's reply</Text>
              <Text style={styles.replyText}>{inquiry.reply}</Text>
              {inquiry.repliedAt ? <Text style={styles.date}>{formatRelative(inquiry.repliedAt)}</Text> : null}
            </View>
          ) : null}

          {inquiry.canEdit ? (
            <View style={styles.actions}>
              <Button label="Edit" variant="outline" onPress={startEdit} style={styles.flex} />
              <Button label="Withdraw" variant="danger" onPress={() => onDelete(inquiry)} style={styles.flex} />
            </View>
          ) : inquiry.status === 'read' ? (
            <Text style={styles.lockedNote}>The counsellor has read this question, so it can't be changed.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
    backgroundColor: colors.white,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  message: { color: colors.navy, fontSize: font.body, lineHeight: 22 },
  date: { color: colors.muted, fontSize: font.tiny, marginTop: space.xs },
  reply: {
    marginTop: space.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    padding: space.md,
  },
  replyLabel: { color: colors.successText, fontSize: font.tiny, fontWeight: '800', marginBottom: 4 },
  replyText: { color: colors.navy, fontSize: font.body, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  flex: { flex: 1 },
  lockedNote: { color: colors.muted, fontSize: font.small, marginTop: space.md, fontStyle: 'italic' },
  editLabel: { color: colors.navy, fontSize: font.small, fontWeight: '700', marginBottom: space.sm },
  gapTop: { marginTop: space.md },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.sm,
    padding: space.md,
    fontSize: font.body,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  counter: { alignSelf: 'flex-end', color: colors.muted, fontSize: font.tiny, marginTop: 4 },
});

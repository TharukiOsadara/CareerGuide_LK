import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from './components/Button';
import InquiryCard, { MAX_MESSAGE } from './components/InquiryCard';
import ParentHeader from './components/ParentHeader';
import SectionCard from './components/SectionCard';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import { useToast } from './components/Toast';
import TopicChips from './components/TopicChips';
import { useChild } from './context/ChildContext';
import { useInquiryActions } from './hooks/useInquiryActions';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { firstName, formatRelative } from './utils/format';
import { colors, font, radius, space } from './theme';

const PREVIEW_COUNT = 2;

async function loadGuidance(studentId) {
  const [guidance, { inquiries }] = await Promise.all([
    parentApi.getGuidance(studentId),
    parentApi.listInquiries(studentId),
  ]);
  return { ...guidance, inquiries };
}

export default function CounsellorGuidance({ active, navigation }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(loadGuidance, { active });
  const { selectedChild, invalidate } = useChild();
  const toast = useToast();
  const { saveInquiry, requestDelete, dialog } = useInquiryActions();

  const [topic, setTopic] = useState('other');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (loading) return <Screen><LoadingState message="Loading guidance…" /></Screen>;
  if (error && !data) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen />;

  const { counsellor, note, inquiries } = data;
  const counsellorName = counsellor?.name || 'the counsellor';
  const childName = firstName(selectedChild?.fullName);
  const trimmed = message.trim();

  const send = async () => {
    setSending(true);
    try {
      const result = await parentApi.createInquiry(selectedChild.studentId, { topic, message: trimmed });
      toast({ title: 'Question sent', message: result.message });
      setMessage('');
      setTopic('other');
      invalidate();
    } catch (err) {
      toast({ type: 'error', title: "Couldn't send your question", message: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
        >
          <SectionCard
            title={counsellor ? counsellor.name : 'No counsellor assigned'}
            subtitle={
              counsellor
                ? `${childName}'s school counsellor${note?.lastReviewedAt ? ` · Last reviewed ${formatRelative(note.lastReviewedAt)}` : ''}`
                : `A counsellor hasn't been assigned to ${childName} yet.`
            }
          >
            {note ? (
              <>
                <Text style={styles.label}>Guidance summary</Text>
                <Text style={styles.body}>{note.summary}</Text>
                {note.nextSteps?.length ? (
                  <>
                    <Text style={[styles.label, styles.gapTop]}>Next steps</Text>
                    {note.nextSteps.map((step) => (
                      <View key={step} style={styles.stepRow}>
                        <Text style={styles.stepDot}>•</Text>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.body}>
                {counsellor ? `${counsellorName} hasn't written guidance for ${childName} yet.` : ''}
              </Text>
            )}
          </SectionCard>

          {counsellor ? (
            <SectionCard title={`Ask ${counsellorName}`} subtitle="Choose a topic and type your question.">
              <TopicChips value={topic} onChange={setTopic} disabled={sending} />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={`e.g. What are the fees and intake dates for ${childName}'s top courses?`}
                placeholderTextColor={colors.slate}
                multiline
                maxLength={MAX_MESSAGE}
                editable={!sending}
                style={styles.input}
                textAlignVertical="top"
                accessibilityLabel={`Your question for ${counsellorName}`}
              />
              <Text style={styles.counter}>
                {message.length}/{MAX_MESSAGE}
              </Text>
              <Button
                label={`Send to ${counsellorName}`}
                icon="arrow-right"
                onPress={send}
                busy={sending}
                disabled={!trimmed}
                accessibilityHint="Sends your question. You'll see the reply here."
              />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Your questions"
            subtitle={inquiries.length ? `${inquiries.length} in total` : undefined}
            right={
              inquiries.length > PREVIEW_COUNT ? (
                <Button
                  label="View all"
                  variant="outline"
                  onPress={() => navigation.navigate('InquiryHistory')}
                  style={styles.viewAll}
                />
              ) : null
            }
          >
            {inquiries.length ? (
              inquiries
                .slice(0, PREVIEW_COUNT)
                .map((inq) => (
                  <InquiryCard
                    key={`${inq.id}-${inq.updatedAt}`}
                    inquiry={inq}
                    onSave={saveInquiry}
                    onDelete={requestDelete}
                  />
                ))
            ) : (
              <EmptyState compact title="No questions yet" message="Questions you send will appear here with the counsellor's reply." />
            )}
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
      {dialog}
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <View style={styles.screen}>
      <ParentHeader title="Counsellor Guidance" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingBottom: space.xl },
  label: { color: colors.muted, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', marginBottom: space.xs },
  gapTop: { marginTop: space.lg },
  body: { color: colors.navy, fontSize: font.body, lineHeight: 22 },
  stepRow: { flexDirection: 'row', marginTop: space.xs },
  stepDot: { color: colors.blue, fontSize: font.body, width: 18, fontWeight: '800' },
  stepText: { flex: 1, color: colors.navy, fontSize: font.body, lineHeight: 22 },
  input: {
    minHeight: 110,
    marginTop: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: font.body,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  counter: { alignSelf: 'flex-end', color: colors.muted, fontSize: font.tiny, marginTop: 4, marginBottom: space.md },
  viewAll: { minHeight: 36, paddingHorizontal: 12 },
});

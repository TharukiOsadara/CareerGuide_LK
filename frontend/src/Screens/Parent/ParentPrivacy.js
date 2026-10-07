import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './components/Button';
import ConfirmDialog from './components/ConfirmDialog';
import ParentHeader from './components/ParentHeader';
import SectionCard from './components/SectionCard';
import { ErrorState, LoadingState } from './components/StateViews';
import { useToast } from './components/Toast';
import ToggleRow from './components/ToggleRow';
import { useChild } from './context/ChildContext';
import { useLeaveGuard } from './context/LeaveGuardContext';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { firstName, formatRelative } from './utils/format';
import { colors, font, radius, space } from './theme';

const FIELDS = ['counsellorAccess', 'parentMonitoring', 'researchShare'];
const pick = (p) => ({
  counsellorAccess: p.counsellorAccess,
  parentMonitoring: p.parentMonitoring,
  researchShare: p.researchShare,
});

export default function ParentPrivacy({ active, navigation }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(parentApi.getPrivacy, { active });
  const { selectedChild, invalidate } = useChild();
  const { setLeaveGuard } = useLeaveGuard();
  const toast = useToast();

  const [form, setForm] = useState(null);
  const [formSource, setFormSource] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Reset the form whenever fresh data arrives (after save, refresh or a child switch).
  // Done during render so the previous child's values are never shown, even for one frame.
  if (data && formSource !== data) {
    setFormSource(data);
    setForm(pick(data.preferences));
  }

  const saved = data ? pick(data.preferences) : null;
  const dirty = Boolean(form && saved && formSource === data && FIELDS.some((f) => form[f] !== saved[f]));

  // Block tab/child switches while there are unsaved changes.
  useEffect(() => {
    if (!active) return undefined;
    setLeaveGuard(() => dirty);
    return () => setLeaveGuard(null);
  }, [active, dirty, setLeaveGuard]);

  if (loading || (data && formSource !== data)) return <Screen><LoadingState message="Loading privacy settingsâ€¦" /></Screen>;
  if (error && !data) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen />;

  const exists = data.exists;
  const name = firstName(selectedChild?.fullName);
  const counsellorName = selectedChild?.counsellor?.name || 'the school counsellor';
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      if (exists) await parentApi.updatePrivacy(selectedChild.studentId, form);
      else await parentApi.createPrivacy(selectedChild.studentId, form);
      toast({ title: 'Privacy choices saved', message: `Saved for ${name}.` });
      invalidate();
    } catch (err) {
      toast({ type: 'error', title: "Couldn't save", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await parentApi.withdrawPrivacy(selectedChild.studentId);
      toast({ title: 'Consent withdrawn', message: 'Nothing is shared now. Shared data has been erased.' });
      invalidate();
    } catch (err) {
      toast({ type: 'error', title: "Couldn't withdraw", message: err.message });
    } finally {
      setWithdrawing(false);
      setConfirmWithdraw(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
      >
        {!exists ? (
          <View style={styles.notice} accessibilityRole="summary">
            <Text style={styles.noticeTitle}>No privacy choices saved</Text>
            <Text style={styles.noticeText}>
              Nothing about {name} is shared with the counsellor or universities until you save your choices below.
            </Text>
          </View>
        ) : null}

        <SectionCard
          title={`Who can see ${name}'s results`}
          subtitle={exists && data.preferences.updatedAt ? `Last changed ${formatRelative(data.preferences.updatedAt)}` : undefined}
        >
          <ToggleRow
            title="School counsellor can see quiz results"
            helper={`Lets ${counsellorName} review ${name}'s results and give advice.`}
            value={form.counsellorAccess}
            onChange={set('counsellorAccess')}
            disabled={saving}
          />
          <ToggleRow
            title="Show progress in this app"
            helper={
              form.parentMonitoring
                ? 'You can see quiz results and matched courses here.'
                : "Quiz results and matched courses will be hidden from this account."
            }
            value={form.parentMonitoring}
            onChange={set('parentMonitoring')}
            disabled={saving}
          />
          <ToggleRow
            title="Share anonymous data with universities"
            helper={`${name}'s name and contact details are never shared. Anonymous answers only help universities plan future intakes. Off unless you turn it on.`}
            value={form.researchShare}
            onChange={set('researchShare')}
            disabled={saving}
            last
          />
        </SectionCard>

        <View style={styles.saveArea}>
          {dirty ? (
            <Text style={styles.unsaved} accessibilityLiveRegion="polite">
              You have unsaved changes
            </Text>
          ) : null}
          <Button
            label={exists ? 'Save privacy choices' : 'Save my choices'}
            onPress={save}
            busy={saving}
            disabled={exists && !dirty}
          />
          {dirty ? (
            <Button
              label="Undo changes"
              variant="secondary"
              onPress={() => setForm(saved)}
              disabled={saving}
              style={styles.gapTop}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="link"
          onPress={() => navigation.navigate('AccessHistory')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>View data access history  â€º</Text>
        </Pressable>

        {exists ? (
          <SectionCard
            title="Withdraw consent"
            subtitle="Removes your saved choices and erases any anonymous data already shared. You can choose again at any time."
          >
            <Button
              label="Withdraw consent & erase shared data"
              variant="danger"
              onPress={() => setConfirmWithdraw(true)}
              disabled={saving}
            />
          </SectionCard>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Withdraw consent?"
        message={`${counsellorName} will no longer see ${name}'s quiz results, and nothing will be shared with universities. Any anonymous data already shared will be erased.`}
        confirmLabel="Withdraw & erase"
        cancelLabel="Keep my choices"
        tone="danger"
        busy={withdrawing}
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <View style={styles.screen}>
      <ParentHeader title="Privacy & Sharing" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: space.xl },
  notice: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    backgroundColor: colors.yellow,
    borderRadius: radius.md,
    padding: space.md,
  },
  noticeTitle: { color: colors.warnText, fontSize: font.body, fontWeight: '800' },
  noticeText: { color: colors.warnText, fontSize: font.small, lineHeight: 19, marginTop: 4 },
  saveArea: { marginHorizontal: space.lg, marginTop: space.lg },
  unsaved: { color: colors.warnText, fontSize: font.small, fontWeight: '700', textAlign: 'center', marginBottom: space.sm },
  gapTop: { marginTop: space.sm },
  link: { marginHorizontal: space.lg, marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.blue, fontSize: font.body, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});


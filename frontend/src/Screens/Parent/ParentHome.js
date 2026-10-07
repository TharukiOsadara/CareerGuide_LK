import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './components/Button';
import Chip from './components/Chip';
import ParentHeader from './components/ParentHeader';
import SectionCard from './components/SectionCard';
import { ErrorState, LoadingState } from './components/StateViews';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { ASSESSMENT_STATUS, firstName, formatDate, formatRelative, formatZ } from './utils/format';
import { cardShadow, colors, font, radius, space } from './theme';

function Stat({ label, value, hint, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Pressable>
  );
}

export default function ParentHome({ active, goToTab }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(parentApi.getDashboard, { active });

  if (loading) return <Screen><LoadingState message="Loading your child's summaryâ€¦" /></Screen>;
  if (error && !data) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen />;

  const { child, assessment, topMatches, coursesMatched, counsellor, inquiries, privacy, monitoringOff } = data;
  const name = firstName(child.fullName);
  const status = assessment ? ASSESSMENT_STATUS[assessment.status] || ASSESSMENT_STATUS.not_started : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
      >
        {monitoringOff ? (
          <SectionCard title="Progress viewing is turned off" subtitle={`You turned off progress viewing for ${name} in Privacy settings.`}>
            <Button label="Open Privacy settings" variant="outline" onPress={() => goToTab('privacy')} />
          </SectionCard>
        ) : (
          <SectionCard
            title={`${name}'s quiz`}
            right={status ? <Chip label={status.label} tone={status.tone} /> : null}
          >
            {assessment.status === 'completed' ? (
              <>
                <Text style={styles.body}>Completed on {formatDate(assessment.completedAt)}</Text>
                {assessment.zScore !== null ? (
                  <View style={styles.zBox}>
                    <Text style={styles.zLabel}>
                      Predicted Z-score{assessment.district ? ` Â· ${assessment.district} district` : ''}
                    </Text>
                    <Text style={styles.zValue}>{formatZ(assessment.zScore)}</Text>
                  </View>
                ) : null}
                {topMatches.length ? (
                  <>
                    <Text style={styles.subheading}>Top career matches</Text>
                    {topMatches.map((m) => (
                      <View key={m.title} style={styles.matchRow}>
                        <Text style={styles.matchTitle}>{m.title}</Text>
                        <Chip label={`${m.matchPercent}% match`} tone="success" />
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.body}>
                {assessment.status === 'in_progress'
                  ? `${name} has started the aptitude quiz but hasn't finished it yet. Results will appear here when it's done.`
                  : `${name} hasn't started the aptitude quiz yet.`}
              </Text>
            )}
            <Button
              label="View academic progress"
              icon="â†’"
              onPress={() => goToTab('progress')}
              style={styles.cardAction}
            />
          </SectionCard>
        )}

        <View style={styles.statGrid}>
          <Stat
            label="Matched courses"
            value={monitoringOff ? 'Hidden' : String(coursesMatched)}
            hint={monitoringOff ? 'Progress view is off' : 'For their A/L stream'}
            onPress={() => goToTab(monitoringOff ? 'privacy' : 'progress')}
          />
          <Stat
            label="Your questions"
            value={inquiries.total ? `${inquiries.answered} answered` : 'None yet'}
            hint={inquiries.awaitingReply ? `${inquiries.awaitingReply} waiting for reply` : 'Ask the counsellor'}
            onPress={() => goToTab('counsellor')}
          />
          <Stat
            label="Counsellor"
            value={counsellor.name || 'Not assigned'}
            hint={counsellor.lastReviewedAt ? `Reviewed ${formatRelative(counsellor.lastReviewedAt)}` : undefined}
            onPress={() => goToTab('counsellor')}
          />
          <Stat
            label="University sharing"
            value={privacy.researchShare ? 'On' : 'Off'}
            hint={privacy.researchShare ? 'Anonymous data only' : 'Nothing is shared'}
            onPress={() => goToTab('privacy')}
          />
        </View>

        {counsellor.summary ? (
          <SectionCard
            title="Latest from the counsellor"
            subtitle={counsellor.lastReviewedAt ? `${counsellor.name} Â· ${formatRelative(counsellor.lastReviewedAt)}` : counsellor.name}
          >
            <Text style={styles.body} numberOfLines={4}>
              {counsellor.summary}
            </Text>
            <Button
              label="Read guidance & ask a question"
              variant="outline"
              onPress={() => goToTab('counsellor')}
              style={styles.cardAction}
            />
          </SectionCard>
        ) : null}

        <Text style={styles.disclaimer}>
          CareerGuide supports, not replaces, your child's school counsellor.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <View style={styles.screen}>
      <ParentHeader title="Parent Home" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: space.xl },
  body: { color: colors.navy, fontSize: font.body, lineHeight: 22 },
  zBox: {
    marginTop: space.md,
    backgroundColor: colors.blueLight,
    borderRadius: radius.md,
    padding: space.md,
  },
  zLabel: { color: colors.muted, fontSize: font.small },
  zValue: { color: colors.blue, fontSize: 26, fontWeight: '800', marginTop: 2 },
  subheading: { color: colors.navy, fontSize: font.body, fontWeight: '800', marginTop: space.lg, marginBottom: space.xs },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    gap: space.sm,
  },
  matchTitle: { flex: 1, color: colors.navy, fontSize: font.body },
  cardAction: { marginTop: space.lg },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: space.md,
    rowGap: space.md,
  },
  stat: {
    width: '48.5%',
    minHeight: 104,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...cardShadow,
  },
  pressed: { opacity: 0.78 },
  statLabel: { color: colors.muted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { color: colors.navy, fontSize: font.heading, fontWeight: '800', marginTop: space.xs },
  statHint: { color: colors.muted, fontSize: font.tiny, marginTop: space.xs },
  disclaimer: {
    color: colors.muted,
    fontSize: font.small,
    textAlign: 'center',
    marginTop: space.xl,
    paddingHorizontal: space.xl,
  },
});


import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './components/Button';
import Chip from './components/Chip';
import ParentHeader from './components/ParentHeader';
import ProgressBar from './components/ProgressBar';
import SectionCard from './components/SectionCard';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { ASSESSMENT_STATUS, firstName, formatDate, formatZ } from './utils/format';
import { colors, font, radius, space } from './theme';

function CourseCard({ course }) {
  return (
    <View style={styles.course}>
      <Text style={styles.courseTitle}>{course.degreeName}</Text>
      <Text style={styles.courseUni}>{course.university}</Text>

      {/* FR02 / UI-02 / DR-03: verification and freshness sit together, never hidden. */}
      <View style={styles.badges}>
        {course.ugcApproved ? <Chip label="UGC approved" icon="check" tone="success" /> : null}
        {course.nvqLevel ? <Chip label={course.nvqLevel} tone="info" /> : null}
        <Chip label={`Updated ${formatDate(course.lastUpdated)}`} tone="neutral" />
      </View>

      <View style={styles.facts}>
        <Fact label="Minimum Z-score" value={formatZ(course.minZScore)} note={course.cutOffLabel} />
        <Fact label="Duration" value={course.duration || '—'} />
        <Fact label="Fees" value={course.tuitionFee || '—'} />
        {course.matchPercent !== null ? <Fact label="Match" value={`${course.matchPercent}%`} /> : null}
      </View>

      {course.meetsCutOff === false ? (
        <Text style={styles.cutOffNote}>
          The predicted Z-score is below this cut-off. Ask the counsellor about other routes into this field.
        </Text>
      ) : course.meetsCutOff === true ? (
        <Text style={[styles.cutOffNote, styles.cutOffOk]}>The predicted Z-score meets this cut-off.</Text>
      ) : null}

      {course.careerPath ? <Text style={styles.careers}>Careers: {course.careerPath}</Text> : null}
      <Text style={styles.source}>Source: {course.source}</Text>
    </View>
  );
}

function Fact({ label, value, note }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
      {note ? <Text style={styles.factNote}>{note}</Text> : null}
    </View>
  );
}

export default function AcademicProgress({ active, goToTab }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(parentApi.getProgress, { active });

  if (loading) return <Screen><LoadingState message="Loading academic progress…" /></Screen>;
  if (error && !data) {
    if (error.code === 'MONITORING_OFF') {
      return (
        <Screen>
          <EmptyState
            title="Progress viewing is off"
            message="You turned off progress viewing in Privacy settings. Turn it back on to see quiz results and matched courses."
            actionLabel="Open Privacy settings"
            onAction={() => goToTab('privacy')}
          />
        </Screen>
      );
    }
    return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;
  }
  if (!data) return <Screen />;

  const { child, assessment, matchedCareers, matchedCourses, disclaimer } = data;
  const name = firstName(child.fullName);
  const status = ASSESSMENT_STATUS[assessment.status] || ASSESSMENT_STATUS.not_started;
  const completed = assessment.status === 'completed';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
      >
        <SectionCard
          title="Aptitude assessment"
          subtitle={completed ? `Completed on ${formatDate(assessment.completedAt)}` : undefined}
          right={<Chip label={status.label} tone={status.tone} />}
        >
          {completed ? (
            <>
              {assessment.zScore !== null ? (
                <View style={styles.zRow}>
                  <Text style={styles.zLabel}>
                    Predicted Z-score{assessment.district ? ` (${assessment.district} district)` : ''}
                  </Text>
                  <Text style={styles.zValue}>{formatZ(assessment.zScore)}</Text>
                </View>
              ) : null}
              {assessment.scores.map((s) => (
                <ProgressBar key={s.area} label={s.area} percent={s.percent} />
              ))}
            </>
          ) : (
            <Text style={styles.body}>
              {assessment.status === 'in_progress'
                ? `${name} hasn't finished the aptitude quiz yet. Scores and career matches will appear here once it's complete.`
                : `${name} hasn't started the aptitude quiz yet.`}
            </Text>
          )}
        </SectionCard>

        {completed && matchedCareers.length ? (
          <SectionCard title="Matched career paths" subtitle="Based on the aptitude quiz">
            {matchedCareers.map((c, i) => (
              <View key={c.title} style={[styles.careerRow, i > 0 && styles.divider]}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={styles.careerTitle}>{c.title}</Text>
                <Chip label={`${c.matchPercent}% match`} tone="success" />
              </View>
            ))}
          </SectionCard>
        ) : null}

        <SectionCard
          title="Matched university courses"
          subtitle={child.alStream ? `For the ${child.alStream} stream` : undefined}
        >
          {matchedCourses.length ? (
            matchedCourses.map((course) => <CourseCard key={course.id} course={course} />)
          ) : (
            <EmptyState
              compact
              title="No courses yet"
              message={
                child.alStream
                  ? 'No verified courses are listed for this stream yet.'
                  : "Your child's A/L stream isn't set yet."
              }
            />
          )}
        </SectionCard>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimer}>{disclaimer} Discuss these matches with the counsellor.</Text>
          <Button label="Ask the counsellor" variant="outline" onPress={() => goToTab('counsellor')} style={styles.ask} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <View style={styles.screen}>
      <ParentHeader title="Academic Progress" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: space.xl },
  body: { color: colors.navy, fontSize: font.body, lineHeight: 22 },
  zRow: {
    backgroundColor: colors.blueLight,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
  zLabel: { color: colors.muted, fontSize: font.small },
  zValue: { color: colors.blue, fontSize: 26, fontWeight: '800', marginTop: 2 },
  careerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    fontSize: font.small,
    overflow: 'hidden',
  },
  careerTitle: { flex: 1, color: colors.navy, fontSize: font.body, fontWeight: '700' },
  course: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  courseTitle: { color: colors.navy, fontSize: font.body + 1, fontWeight: '800' },
  courseUni: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md, rowGap: space.md },
  fact: { width: '50%', paddingRight: space.sm },
  factLabel: { color: colors.muted, fontSize: font.tiny },
  factValue: { color: colors.navy, fontSize: font.body, fontWeight: '800', marginTop: 2 },
  factNote: { color: colors.blue, fontSize: font.tiny, fontWeight: '700', marginTop: 2 },
  cutOffNote: {
    marginTop: space.md,
    backgroundColor: colors.yellow,
    color: colors.warnText,
    fontSize: font.small,
    lineHeight: 19,
    borderRadius: radius.sm,
    padding: space.sm,
    overflow: 'hidden',
  },
  cutOffOk: { backgroundColor: colors.successLight, color: colors.successText },
  careers: { color: colors.navy, fontSize: font.small, lineHeight: 19, marginTop: space.md },
  source: { color: colors.muted, fontSize: font.tiny, marginTop: space.sm },
  disclaimerBox: { marginHorizontal: space.lg, marginTop: space.lg, alignItems: 'center' },
  disclaimer: { color: colors.muted, fontSize: font.small, textAlign: 'center', lineHeight: 19 },
  ask: { marginTop: space.md, alignSelf: 'stretch' },
});

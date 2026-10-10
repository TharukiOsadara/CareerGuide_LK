import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ParentHeader from './components/ParentHeader';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { describeAccessLog, formatDateTime } from './utils/format';
import { colors, font, radius, space } from './theme';

const loadLogs = (studentId) => parentApi.getAccessLogs(studentId);

// "View data access history": every report download and privacy/question change.
export default function AccessHistory({ navigation }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(loadLogs);
  const header = <ParentHeader title="Data access history" onBack={() => navigation.goBack()} />;

  if (loading) return <View style={styles.screen}>{header}<LoadingState /></View>;
  if (error && !data) return <View style={styles.screen}>{header}<ErrorState error={error} onRetry={reload} /></View>;

  const logs = data?.logs || [];

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
      >
        <Text style={styles.intro}>
          Every time a report is downloaded or a privacy choice or question changes, it is recorded here.
        </Text>
        {logs.length ? (
          logs.map((log) => {
            const { title, detail } = describeAccessLog(log);
            return (
              <View key={log.id} style={styles.item} accessible accessibilityLabel={`${title}. ${formatDateTime(log.createdAt)}`}>
                <View style={styles.dot} />
                <View style={styles.copy}>
                  <Text style={styles.title}>{title}</Text>
                  {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                  <Text style={styles.date}>{formatDateTime(log.createdAt)}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState title="Nothing recorded yet" message="Activity will appear here." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xl },
  intro: { color: colors.muted, fontSize: font.small, lineHeight: 19, marginBottom: space.md },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue, marginTop: 6, marginRight: space.md },
  copy: { flex: 1 },
  title: { color: colors.navy, fontSize: font.body, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: font.small, lineHeight: 19, marginTop: 2 },
  date: { color: colors.muted, fontSize: font.tiny, marginTop: space.xs },
});

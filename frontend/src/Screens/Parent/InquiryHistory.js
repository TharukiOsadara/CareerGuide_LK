import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import InquiryCard from './components/InquiryCard';
import ParentHeader from './components/ParentHeader';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import { useInquiryActions } from './hooks/useInquiryActions';
import { useParentData } from './hooks/useParentData';
import { parentApi } from './services/parentApi';
import { colors, font, radius, space } from './theme';

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'waiting', label: 'Waiting', match: (i) => i.status !== 'answered' },
  { key: 'answered', label: 'Answered', match: (i) => i.status === 'answered' },
];

const loadInquiries = (studentId) => parentApi.listInquiries(studentId);

export default function InquiryHistory({ navigation }) {
  const { data, error, loading, refreshing, reload, refresh } = useParentData(loadInquiries);
  const { saveInquiry, requestDelete, dialog } = useInquiryActions();
  const [filter, setFilter] = useState('all');

  const header = <ParentHeader title="Your questions" onBack={() => navigation.goBack()} />;

  if (loading) return <View style={styles.screen}>{header}<LoadingState /></View>;
  if (error && !data) return <View style={styles.screen}>{header}<ErrorState error={error} onRetry={reload} /></View>;

  const all = data?.inquiries || [];
  const current = FILTERS.find((f) => f.key === filter);
  const shown = all.filter(current.match);

  return (
    <View style={styles.screen}>
      {header}
      <View style={styles.filters} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const selected = f.key === filter;
          const count = all.filter(f.match).length;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${f.label}, ${count}`}
              onPress={() => setFilter(f.key)}
              style={[styles.filter, selected && styles.filterOn]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextOn]}>
                {f.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.blue]} />}
      >
        {shown.length ? (
          shown.map((inq) => (
            <InquiryCard key={`${inq.id}-${inq.updatedAt}`} inquiry={inq} onSave={saveInquiry} onDelete={requestDelete} />
          ))
        ) : (
          <EmptyState
            title={filter === 'all' ? 'No questions yet' : `No ${current.label.toLowerCase()} questions`}
            message="Questions you send from the Counsellor tab appear here."
          />
        )}
      </ScrollView>
      {dialog}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  filter: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  filterOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.muted, fontSize: font.small, fontWeight: '700' },
  filterTextOn: { color: colors.white },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl },
});

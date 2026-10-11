import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from './Icon';
import FieldError, { errorBorder } from './FieldError';
import { getCourses } from '../services/api';
import { colors } from '../styles/colors';

// Multi-select list of catalogue courses (courses_list). Used for the courses a counsellor
// guides: at sign-up, in Complete Profile and on the admin Counsellors page.
//   value: array of course ids, onChange(ids)
//   courses: optional pre-loaded list ({ id, title, institute }); otherwise loaded here.
export default function CoursePicker({ value = [], onChange, courses: given, error, maxHeight = 260 }) {
  const [courses, setCourses] = useState(given || []);
  const [loading, setLoading] = useState(!given);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (given) { setCourses(given); setLoading(false); return undefined; }
    let alive = true;
    getCourses()
      .then((list) => alive && setCourses(list))
      .catch((e) => alive && setLoadError(e.message || 'Could not load courses.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [given]);

  const selected = new Set(value.map(Number));
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next]);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? courses.filter((c) => `${c.title} ${c.institute || c.university || ''}`.toLowerCase().includes(q))
      : courses;
  }, [courses, search]);

  return (
    <View>
      <View style={[styles.box, !!error && errorBorder]}>
        <View style={styles.searchRow}>
          <Icon name="search" size={16} color={colors.slate400} />
          <TextInput
            style={styles.search} value={search} onChangeText={setSearch}
            placeholder="Search courses…" placeholderTextColor={colors.slate400} autoCapitalize="none"
          />
          <Text style={styles.count}>{selected.size} selected</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 16 }} />
        ) : loadError ? (
          <Text style={styles.empty}>{loadError}</Text>
        ) : (
          <View style={{ maxHeight, overflow: 'hidden' }}>
            {shown.length === 0 ? <Text style={styles.empty}>No courses match.</Text> : null}
            {shown.slice(0, 60).map((c) => {
              const on = selected.has(Number(c.id));
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(Number(c.id))}
                  style={[styles.row, on && styles.rowOn]}
                >
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on ? <Icon name="check" size={12} color={colors.white} strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{c.institute || c.university || ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.white, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.navy, paddingVertical: 0 },
  count: { color: colors.blue, fontSize: 11.5, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowOn: { backgroundColor: colors.blueLight },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  title: { color: colors.navy, fontSize: 13, fontWeight: '700' },
  sub: { color: colors.slate, fontSize: 11, marginTop: 1 },
  empty: { color: colors.slate, fontSize: 12, textAlign: 'center', padding: 14 },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TOPICS } from '../utils/format';
import { colors, font, radius, space } from '../theme';
import Icon from '../../../components/Icon';

// Quick topic choice so parents don't have to type everything (TC-04 < 30 s).
export default function TopicChips({ value, onChange, disabled = false }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Question topic">
      {TOPICS.map((topic) => {
        const selected = topic.key === value;
        return (
          <Pressable
            key={topic.key}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={topic.label}
            disabled={disabled}
            onPress={() => onChange(topic.key)}
            style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
          >
            {selected ? <Icon name="check" size={14} color={colors.blue} strokeWidth={2.5} style={{ marginRight: 4 }} /> : null}
            <Text style={[styles.text, selected && styles.selectedText]}>{topic.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  pressed: { opacity: 0.75 },
  text: { color: colors.muted, fontSize: font.small, fontWeight: '600' },
  selectedText: { color: colors.blue, fontWeight: '800' },
});

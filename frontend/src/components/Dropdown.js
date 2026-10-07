import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/colors';
import Icon from './Icon';
import FieldError, { errorBorder } from './FieldError';

// Tappable field that opens a modal list of options (A/L streams, roles, etc.).
export default function Dropdown({ value, placeholder = 'Select…', options, onSelect, icon = 'book', error }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.field, !!error && errorBorder]} onPress={() => setOpen(true)}>
        <Icon name={icon} size={17} color={colors.blue} style={styles.icon} />
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.slate} />
      </Pressable>
      <FieldError message={error} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select an option</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item}</Text>
                    {active && <Icon name="check" size={16} color={colors.blue} strokeWidth={2.5} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white,
  },
  icon: { marginRight: 9 },
  value: { flex: 1, fontSize: 13.5, color: colors.navy },
  placeholder: { color: colors.slate400 },
  chevron: { fontSize: 13, color: colors.slate },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 14 },
  sheetTitle: { fontSize: 13, fontWeight: '800', color: colors.navy, marginBottom: 8, paddingHorizontal: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
  },
  optionActive: { backgroundColor: colors.blueLight },
  optionText: { fontSize: 13.5, color: colors.slateDark },
  optionTextActive: { color: colors.blue, fontWeight: '700' },
  tick: { color: colors.blue, fontWeight: '800' },
});

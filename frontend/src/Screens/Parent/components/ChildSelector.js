import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChild } from '../context/ChildContext';
import { useLeaveGuard } from '../context/LeaveGuardContext';
import { colors, font, radius, space, TOUCH } from '../theme';

function Avatar({ initials, size = 36 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// Shows the child being viewed. With more than one linked child it becomes a
// picker; with one child it is a plain label (no needless control).
export default function ChildSelector() {
  const { linkedChildren, selectedChild, selectChild } = useChild();
  const { requestLeave } = useLeaveGuard();
  const [open, setOpen] = useState(false);

  if (!selectedChild) return null;
  const canSwitch = linkedChildren.length > 1;

  const content = (
    <>
      <Avatar initials={selectedChild.initials} />
      <View style={styles.copy}>
        <Text style={styles.caption}>{canSwitch ? 'Viewing' : 'Your child'}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {selectedChild.fullName}
        </Text>
      </View>
      {canSwitch ? <Text style={styles.switchText}>Switch ▾</Text> : null}
    </>
  );

  if (!canSwitch) return <View style={styles.row}>{content}</View>;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Viewing ${selectedChild.fullName}. Switch child`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, styles.switchable, pressed && styles.pressed]}
      >
        {content}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Choose a child
            </Text>
            {linkedChildren.map((child) => {
              const selected = child.studentId === selectedChild.studentId;
              return (
                <Pressable
                  key={child.studentId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${child.fullName}, ${child.alStream || 'stream not set'}`}
                  onPress={() => {
                    setOpen(false);
                    if (!selected) requestLeave(() => selectChild(child.studentId));
                  }}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                >
                  <Avatar initials={child.initials} size={40} />
                  <View style={styles.copy}>
                    <Text style={styles.optionName}>{child.fullName}</Text>
                    <Text style={styles.optionMeta}>{child.alStream || 'Stream not set'}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH },
  switchable: {
    backgroundColor: colors.blueLight,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.75 },
  avatar: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: font.small },
  copy: { flex: 1, marginLeft: space.md },
  caption: { color: colors.muted, fontSize: font.tiny },
  name: { color: colors.navy, fontSize: font.body, fontWeight: '800' },
  switchText: { color: colors.blue, fontSize: font.small, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.lg },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  sheetTitle: { color: colors.navy, fontSize: font.heading, fontWeight: '800', marginBottom: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    marginTop: space.sm,
  },
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueLight },
  optionName: { color: colors.navy, fontSize: font.body, fontWeight: '700' },
  optionMeta: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
});

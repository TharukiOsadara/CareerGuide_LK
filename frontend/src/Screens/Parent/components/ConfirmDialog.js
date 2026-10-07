import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors, font, radius, space } from '../theme';

// Used before anything destructive (delete a question, withdraw consent, discard edits).
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel} accessibilityLabel="Close dialog">
        <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              busy={busy}
              onPress={onConfirm}
            />
            <Button label={cancelLabel} variant="secondary" disabled={busy} onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  title: { color: colors.navy, fontSize: font.heading + 1, fontWeight: '800' },
  message: { color: colors.muted, fontSize: font.body, lineHeight: 22, marginTop: space.sm },
  actions: { marginTop: space.xl, gap: space.sm },
});

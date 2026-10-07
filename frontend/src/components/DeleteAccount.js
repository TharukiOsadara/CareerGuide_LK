import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon, { IconText } from './Icon';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

// "Danger zone" card + confirmation dialog shared by every role's profile page.
// Password accounts confirm with their password; Google-only accounts type DELETE.
// `onDeleted` runs after the account is gone (use it to reset navigation).
export default function DeleteAccount({ onDeleted, style }) {
  const { user, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const usesPassword = user?.hasPassword !== false;
  const isSuperAdmin = !!user?.isSuperAdmin;
  const ready = usesPassword ? password.length > 0 : confirmText.trim() === 'DELETE';

  const close = () => {
    if (busy) return;
    setOpen(false); setPassword(''); setConfirmText(''); setError('');
  };

  const confirm = async () => {
    setError('');
    setBusy(true);
    try {
      await deleteAccount(usesPassword ? { password } : { confirm: confirmText.trim() });
      setOpen(false);
      onDeleted && onDeleted();
    } catch (e) {
      setError(e.message || 'Could not delete your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, style]}>
      <IconText icon="warning" size={16} color={colors.redStrong} textStyle={styles.title}>Delete Account</IconText>
      <Text style={styles.body}>
        {isSuperAdmin
          ? 'The super admin account cannot be deleted.'
          : 'Permanently remove your account and personal data. This cannot be undone.'}
      </Text>
      {!isSuperAdmin && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <IconText icon="trash" size={15} color={colors.white} center textStyle={styles.btnText}>Delete My Account</IconText>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconWrap}><Icon name="trash" size={24} color={colors.redStrong} /></View>
            <Text style={styles.sheetTitle}>Delete your account?</Text>
            <Text style={styles.sheetBody}>
              This permanently deletes {user?.email ? <Text style={styles.bold}>{user.email}</Text> : 'your account'} and
              signs you out. This cannot be undone.
            </Text>

            {usesPassword ? (
              <>
                <Text style={styles.label}>Enter your password to confirm</Text>
                <View style={styles.inputBox}>
                  <Icon name="lock" size={17} color={colors.slate} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input} value={password} onChangeText={setPassword}
                    placeholder="Password" placeholderTextColor={colors.slate400}
                    secureTextEntry autoCapitalize="none"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Type DELETE to confirm</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input} value={confirmText} onChangeText={setConfirmText}
                    placeholder="DELETE" placeholderTextColor={colors.slate400} autoCapitalize="characters"
                  />
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.row}>
              <Pressable onPress={close} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!ready || busy}
                onPress={confirm}
                style={({ pressed }) => [styles.danger, (!ready || busy) && styles.disabled, pressed && styles.pressed]}
              >
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.dangerText}>Delete</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.redPale, borderRadius: 13, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.redLight },
  title: { color: colors.redStrong, fontSize: 13.5, fontWeight: '800' },
  body: { color: colors.slateDark, fontSize: 12, lineHeight: 17, marginTop: 6 },
  btn: { marginTop: 12, backgroundColor: colors.redStrong, borderRadius: 9, paddingVertical: 11 },
  btnText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.redLight,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  sheetTitle: { color: colors.navy, fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  sheetBody: { color: colors.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  bold: { fontWeight: '800', color: colors.navy },
  label: { color: colors.slateDark, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.bgSofter,
  },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  error: { color: colors.redStrong, fontSize: 12, marginTop: 10 },
  row: { flexDirection: 'row', marginTop: 18 },
  cancel: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cancelText: { color: colors.slateDark, fontSize: 13.5, fontWeight: '800' },
  danger: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.redStrong, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../styles/colors';
import Icon from './Icon';
import FieldError, { errorBorder } from './FieldError';

// Labeled input with a leading icon, optional password visibility toggle,
// an optional right-corner adornment (used for the sign-in role badge) and an
// optional `error` message shown under the box with a red border.
export default function Field({
  label, icon, value, onChangeText, placeholder, secure = false,
  keyboardType, autoCapitalize = 'none', rightAdornment, highlight = false,
  editable = true, error, maxLength,
}) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, highlight && styles.boxHighlight, !!error && errorBorder]}>
        {icon ? <Icon name={icon} size={17} color={colors.blue} style={styles.icon} /> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          maxLength={maxLength}
        />
        {rightAdornment}
        {secure ? (
          <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.slate} style={styles.eye} />
          </Pressable>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.slateDark, marginBottom: 7 },
  box: {
    flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white,
  },
  boxHighlight: { borderColor: colors.blue, borderWidth: 1.5, backgroundColor: colors.blueLight },
  icon: { marginRight: 9 },
  input: { flex: 1, fontSize: 13.5, color: colors.navy, paddingVertical: 0 },
  eye: { marginLeft: 6 },
});

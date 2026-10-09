import React, { useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import Icon, { IconText } from '../../components/Icon';

export default function PrivacyConsent({ navigation }) {
  const [isChecked, setIsChecked] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);

  const acceptConsent = () => {
    if (isChecked) {
      navigation.replace('SignUp');
    }
  };

  return (
    <SafeAreaView style={styles.overlay}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(0, 0, 0, 0.5)" />
      <View style={styles.sheet}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Icon name="shield" size={16} color={colors.blue} />
          </View>
          <Text style={styles.title}>Data Privacy &amp; Consent</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close privacy consent"
            onPress={() => navigation.replace('Onboarding')}
            style={styles.closeButton}
          >
            <Icon name="close" size={15} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Icon name="lock" size={15} color={colors.blue} style={styles.lock} />
          <Text style={styles.infoText}>
            All academic entries, including A/L results, are strictly encrypted. They are only
            utilized to simulate eligibility boundaries for course matchmaking.
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isChecked }}
          onPress={() => setIsChecked((checked) => !checked)}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <Icon name="check" size={13} color={colors.white} strokeWidth={3} />}
          </View>
          <View style={styles.consentCopy}>
            <Text style={styles.consentText}>
              I agree to processing my academic background and quiz preferences for course matching
            </Text>
            <Text style={styles.required}>REQUIRED</Text>
          </View>
        </Pressable>

        <View style={styles.sharingRow}>
          <View style={styles.sharingCopy}>
            <Text style={styles.sharingTitle}>Allow Anonymized Profile Sharing</Text>
            <Text style={styles.sharingText}>Help university advisors review your match profile.</Text>
          </View>
          <Switch
            accessibilityLabel="Allow anonymized profile sharing"
            value={allowSharing}
            onValueChange={setAllowSharing}
            trackColor={{ false: colors.border, true: colors.blue }}
            thumbColor={colors.white}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept and Continue"
          disabled={!isChecked}
          onPress={acceptConsent}
          style={({ pressed }) => [
            styles.acceptButton,
            !isChecked && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.acceptText}>Accept &amp; Continue</Text>
          <Icon name="arrow-right" size={18} color={colors.white} style={styles.acceptArrow} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decline"
          onPress={() => navigation.replace('Onboarding')}
          style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    width: '92%',
    maxWidth: 390,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 21,
    paddingBottom: 14,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleIcon: {
    width: 32,
    height: 29,
    borderRadius: 7,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  shield: {
    width: 12,
    height: 15,
    borderWidth: 2,
    borderColor: colors.blue,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.blue,
  },
  title: { flex: 1, color: colors.navy, fontSize: 16, fontWeight: '800' },
  closeButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.muted, fontSize: 20, lineHeight: 21 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.blueLight,
    borderColor: colors.bluePale,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 17,
  },
  lock: { marginRight: 9, marginTop: 1 },
  infoText: { flex: 1, color: colors.blue, fontSize: 10.5, lineHeight: 15 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 17 },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '800' },
  consentCopy: { flex: 1 },
  consentText: { color: colors.navy, fontSize: 11, lineHeight: 17 },
  required: {
    alignSelf: 'flex-start',
    color: colors.orange,
    backgroundColor: colors.yellow,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  sharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 21,
    marginBottom: 20,
  },
  sharingCopy: { flex: 1 },
  sharingTitle: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  sharingText: { color: colors.muted, fontSize: 9.5, marginTop: 3 },
  acceptButton: {
    height: 43,
    borderRadius: 8,
    backgroundColor: colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: colors.slate },
  acceptText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  acceptArrow: { marginLeft: 10 },
  declineButton: {
    height: 43,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  declineText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});


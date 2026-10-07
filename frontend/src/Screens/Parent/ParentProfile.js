import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from './components/Button';
import ParentHeader from './components/ParentHeader';
import SectionCard from './components/SectionCard';
import { useChild } from './context/ChildContext';
import { colors, font, radius, space } from './theme';
import DeleteAccount from '../../components/DeleteAccount';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';

// Parent account page: who is signed in, linked children, sign out and delete account.
export default function ParentProfile({ navigation }) {
  const { user, signOut } = useAuth();
  const { linkedChildren = [] } = useChild();

  // The parent portal is a nested stack, so leave it through the root navigator.
  const leavePortal = (route) => {
    const root = navigation.getParent() || navigation;
    root.reset({ index: 0, routes: [{ name: route }] });
  };

  const doSignOut = async () => {
    try { await signOut(); } catch {}
    leavePortal('SignIn');
  };

  return (
    <View style={styles.screen}>
      <ParentHeader title="My Profile" onBack={() => navigation.goBack()} showChild={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {user?.avatarInitials
              ? <Text style={styles.avatarText}>{user.avatarInitials}</Text>
              : <Icon name="user" size={34} color={colors.blue} />}
          </View>
          <Text style={styles.name}>{user?.fullName || 'Parent'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <Text style={styles.pill}>PARENT</Text>
        </View>

        <SectionCard title="Linked children">
          {linkedChildren.length ? (
            linkedChildren.map((c) => (
              <View key={c.studentId} style={styles.childRow}>
                <Icon name="graduation-cap" size={18} color={colors.blue} />
                <Text style={styles.childName}>{c.fullName}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No child is linked to your account yet.</Text>
          )}
        </SectionCard>

        <Button label="Sign out" variant="outline" onPress={doSignOut} style={styles.signOut} />

        <DeleteAccount onDeleted={() => leavePortal('Onboarding')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  hero: {
    alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg,
    padding: space.xl, marginBottom: space.lg, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.blue, fontSize: 26, fontWeight: '800' },
  name: { color: colors.navy, fontSize: font.heading, fontWeight: '800', marginTop: space.md },
  email: { color: colors.slate, fontSize: font.small, marginTop: 2 },
  pill: {
    marginTop: space.sm, color: colors.blue, backgroundColor: colors.blueLight, fontSize: font.tiny,
    fontWeight: '800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden',
  },
  childRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  childName: { color: colors.navy, fontSize: font.body, fontWeight: '600', marginLeft: space.sm },
  muted: { color: colors.muted, fontSize: font.small },
  signOut: { marginTop: space.lg },
});

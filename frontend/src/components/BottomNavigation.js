import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#0052CC';
const MUTED = '#6B778C';
const BORDER = '#DFE1E6';

const tabs = [
  { label: 'Home', icon: 'home-outline', route: 'Main' },
  { label: 'Quiz', icon: 'brain' },
  { label: 'Courses', icon: 'book-open-variant', route: 'StudentCourses' },
  { label: 'Profile', icon: 'account-outline', route: 'StudentProfile' },
];

export default function BottomNavigation({ navigation, activeRoute }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { height: 72 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.route === activeRoute;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.label}
            onPress={() => tab.route && navigation.navigate(tab.route)}
            style={styles.tab}
          >
            <MaterialCommunityIcons
              color={isActive ? BLUE : MUTED}
              name={tab.icon}
              size={22}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: BORDER,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    elevation: 8,
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-around',
    left: 0,
    position: 'absolute',
    right: 0,
    shadowColor: '#172B4D',
    shadowOffset: { height: -2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  activeLabel: {
    color: BLUE,
    fontWeight: '700',
  },
});

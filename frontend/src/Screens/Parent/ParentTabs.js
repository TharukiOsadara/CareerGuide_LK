import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import AcademicProgress from './AcademicProgress';
import CounsellorGuidance from './CounsellorGuidance';
import ParentHome from './ParentHome';
import ParentPrivacy from './ParentPrivacy';
import ParentHeader from './components/ParentHeader';
import ParentTabBar from './components/ParentTabBar';
import { EmptyState, ErrorState, LoadingState } from './components/StateViews';
import { useChild } from './context/ChildContext';
import { useLeaveGuard } from './context/LeaveGuardContext';
import { colors } from './theme';

const SCREENS = {
  home: ParentHome,
  progress: AcademicProgress,
  counsellor: CounsellorGuidance,
  privacy: ParentPrivacy,
};

// Bottom-tab shell. Each tab mounts on first visit and then stays mounted (keeps
// scroll position and typed text); it refetches whenever it becomes active again.
export default function ParentTabs({ navigation }) {
  const { status, error, reload, linkedChildren } = useChild();
  const { requestLeave } = useLeaveGuard();
  const [active, setActive] = useState('home');
  const [visited, setVisited] = useState({ home: true });

  const goToTab = useCallback(
    (key) =>
      requestLeave(() => {
        setActive(key);
        setVisited((v) => (v[key] ? v : { ...v, [key]: true }));
      }),
    [requestLeave]
  );

  // Android back: return to Home first instead of leaving the parent portal.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigation.isFocused() || active === 'home') return false;
      goToTab('home');
      return true;
    });
    return () => sub.remove();
  }, [active, goToTab, navigation]);

  if (status !== 'ready') {
    return (
      <View style={styles.screen}>
        <ParentHeader title="Parent Portal" showChild={false} />
        {status === 'error' ? <ErrorState error={error} onRetry={reload} /> : <LoadingState />}
      </View>
    );
  }

  if (!linkedChildren.length) {
    return (
      <View style={styles.screen}>
        <ParentHeader title="Parent Portal" showChild={false} />
        <EmptyState
          title="No child linked yet"
          message="Once your child's account is linked to yours, their progress will appear here."
          actionLabel="Check again"
          onAction={reload}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        {Object.entries(SCREENS).map(([key, Screen]) =>
          visited[key] ? (
            <View key={key} style={[styles.page, key !== active && styles.hidden]}>
              <Screen active={key === active} goToTab={goToTab} navigation={navigation} />
            </View>
          ) : null
        )}
      </View>
      <ParentTabBar active={active} onChange={goToTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  page: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
});


import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Icon Container */}
      <View style={styles.iconContainer}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🎓</Text>
        </View>
      </View>

      {/* App Title */}
      <Text style={styles.title}>
        CareerGuide <Text style={styles.titleHighlight}>LK</Text>
      </Text>

      {/* Loading Bar */}
      <View style={styles.loadingBarContainer}>
        <View style={styles.loadingBarBackground}>
          <Animated.View style={[styles.loadingBarFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* Connecting Text */}
      <Text style={styles.connectingText}>CONNECTING TO WORKSPACE...</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Empowering your educational & career pathway • v2.4</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    width: 80,
    height: 80,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
  titleHighlight: {
    color: '#4A90E2',
  },
  loadingBarContainer: {
    width: width * 0.7,
    marginBottom: 20,
  },
  loadingBarBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  connectingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

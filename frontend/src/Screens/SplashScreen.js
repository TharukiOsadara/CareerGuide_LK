import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export default function SplashScreen({ navigation }) {
  const [progress, setProgress] = useState(0);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    // Animate progress from 0 to 1 over 2 seconds
    progressValue.value = withTiming(1, {
      duration: 2000,
      easing: Easing.linear,
    });

    // Update percentage for display
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [progressValue, navigation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.content}>
        <Text style={styles.title}>CareerGuide LK</Text>
        <Text style={styles.subtitle}>Your Career Companion</Text>
        
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, animatedStyle]} />
        </View>
        
        <Text style={styles.loadingText}>Loading... {progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 60,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
});

import React from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';

export default function MainScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.title}>CareerGuide LK</Text>
      <Text style={styles.successText}>✓ App is successfully running</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  successText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

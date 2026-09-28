import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>CareerGuide LK</Text>
      <Text style={styles.subtitle}>App is running successfully!</Text>
      <Text style={styles.info}>File structure is set up correctly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4A90E2',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 16,
    color: '#666',
  },
});

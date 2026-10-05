import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { colors } from '../styles/colors';

export default function MainScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Header />
      <Text style={styles.title}>CareerGuide LK</Text>
      <Text style={styles.successText}>✓ App is successfully running version 2.0</Text>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: colors.textDark },
  successText: { fontSize: 18, color: colors.success, fontWeight: '600' },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';

export default function QuizResultScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Quiz Result</Text>
      <Text variant="bodyMedium" style={styles.sub}>Results Screen — coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { color: colors.textPrimary, fontWeight: 'bold' },
  sub: { color: colors.textSecondary, marginTop: 8 },
});
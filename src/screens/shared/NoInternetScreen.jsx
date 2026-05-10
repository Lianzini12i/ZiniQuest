import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

export default function NoInternetScreen() {
  const retry = () => {};

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="wifi-off" size={64} color={colors.textSecondary} />
      <Text variant="headlineSmall" style={styles.title}>No Internet Connection</Text>
      <Text variant="bodyMedium" style={styles.sub}>
        ZiniQuest requires an internet connection.{'\n'}Please check your connection and try again.
      </Text>
      <Button mode="contained" onPress={retry} style={styles.button}>
        Retry
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: colors.textPrimary, marginTop: 24, marginBottom: 12, textAlign: 'center' },
  sub: { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: { backgroundColor: colors.primary, borderRadius: 12 },
});
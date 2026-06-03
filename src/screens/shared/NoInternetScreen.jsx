import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../../constants/colors';
import { hapticError, hapticSuccess } from '../../utils/haptics';

export default function NoInternetScreen() {
  const [checking, setChecking]   = useState(false);
  const [failed, setFailed]       = useState(false);
  const pulseAnim                 = React.useRef(new Animated.Value(1)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleRetry = async () => {
    setChecking(true);
    setFailed(false);
    startPulse();

    try {
      const state = await NetInfo.fetch();
      const connected = state.isConnected && state.isInternetReachable;

      if (connected) {
        await hapticSuccess();
        // AppNavigator's useNetworkStatus hook will detect the change
        // and automatically re-render the correct screen
      } else {
        await hapticError();
        setFailed(true);
      }
    } catch (e) {
      await hapticError();
      setFailed(true);
    } finally {
      stopPulse();
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated icon */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={56}
            color={failed ? colors.error : colors.textSecondary}
          />
        </View>
      </Animated.View>

      <Text variant="headlineSmall" style={styles.title}>No Internet Connection</Text>
      <Text variant="bodyMedium" style={styles.sub}>
        ZiniQuest requires an active internet connection to load your courses, track your
        progress, and keep your XP up to date.
      </Text>

      {failed && (
        <View style={styles.failedBanner}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
          <Text variant="bodySmall" style={styles.failedText}>
            Still no connection. Check your Wi-Fi or mobile data and try again.
          </Text>
        </View>
      )}

      <Button
        mode="contained"
        onPress={handleRetry}
        loading={checking}
        disabled={checking}
        style={styles.retryBtn}
        contentStyle={styles.retryBtnContent}
        labelStyle={styles.retryBtnLabel}
        icon={checking ? undefined : 'refresh'}
      >
        {checking ? 'Checking...' : 'Try Again'}
      </Button>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text variant="labelMedium" style={styles.tipsTitle}>Troubleshooting Tips</Text>
        {[
          'Check your Wi-Fi or mobile data is turned on',
          'Move closer to your router if on Wi-Fi',
          'Toggle Airplane Mode off and on',
          'Restart the app if the problem persists',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <MaterialCommunityIcons name="circle-small" size={20} color={colors.textSecondary} />
            <Text variant="bodySmall" style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sub: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  failedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.error + '11',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.error + '33',
    width: '100%',
  },
  failedText: {
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: '100%',
  },
  retryBtnContent: { height: 50 },
  retryBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tipsTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
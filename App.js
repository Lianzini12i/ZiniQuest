import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import BadgeUnlockModal from './src/components/BadgeUnlockModal';
import SplashScreen from './src/screens/shared/SplashScreen';
import useUserStore from './src/store/userStore';
import { colors } from './src/constants/colors';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:    colors.primary,
    secondary:  colors.accent,
    background: colors.background,
    surface:    colors.card,
    onSurface:  colors.textPrimary,
    outline:    colors.border,
  },
};

function BadgeModalWrapper() {
  const { pendingBadgeModal, clearPendingBadgeModal } = useUserStore();
  return (
    <BadgeUnlockModal
      badgeId={pendingBadgeModal}
      visible={!!pendingBadgeModal}
      onDismiss={clearPendingBadgeModal}
    />
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar style="light" backgroundColor={colors.background} />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AppNavigator />
      <BadgeModalWrapper />
    </PaperProvider>
  );
}
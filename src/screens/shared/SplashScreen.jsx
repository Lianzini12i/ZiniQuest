import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Step 1 — Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // Step 2 — Title fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // Step 3 — Tagline fades in
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      // Step 4 — Hold for a moment
      Animated.delay(1200),

      // Step 5 — Fade everything out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());

    // Glow pulse loop on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1, duration: 900, useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0, duration: 900, useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Glow ring behind logo */}
      <Animated.View style={[styles.glowRing, {
        opacity: glowAnim.interpolate({
          inputRange: [0, 1], outputRange: [0.15, 0.45],
        }),
        transform: [{
          scale: glowAnim.interpolate({
            inputRange: [0, 1], outputRange: [0.85, 1.15],
          }),
        }],
      }]} />

      {/* Logo */}
      <Animated.View style={{
        opacity:   logoOpacity,
        transform: [{ scale: logoScale }],
      }}>
        <Image
          source={require('../../../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text variant="displaySmall" style={styles.appName}>
          ZiniQuest
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: tagOpacity }}>
        <Text variant="bodyMedium" style={styles.tagline}>
          Learn. Level Up. Conquer.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  glowRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
  },
  logo: {
    width: width * 0.52,
    height: width * 0.52,
  },
  appName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 8,
  },
  tagline: {
    color: colors.accent,
    letterSpacing: 1,
    fontWeight: '600',
  },
});
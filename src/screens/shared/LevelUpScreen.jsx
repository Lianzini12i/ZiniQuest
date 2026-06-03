import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { clearPendingLevelUp } from '../../services/userService';
import { playSound } from '../../utils/soundPlayer';
import { hapticHeavy } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';

const { width, height } = Dimensions.get('window');

const LEVEL_TITLES = [
  'Newbie','Apprentice','Coder','Developer','Engineer',
  'Architect','Senior Dev','Tech Lead','Principal','Code Legend',
];

function Particle({ delay, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  const x    = (Math.random() - 0.5) * width * 1.2;
  const y    = -(Math.random() * height * 0.8 + 100);
  const rot  = Math.random() * 720 - 360;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1, duration: 1200, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: 8, height: 8,
      borderRadius: 4,
      backgroundColor: color,
      transform: [
        { translateX: anim.interpolate({ inputRange: [0,1], outputRange: [0, x] }) },
        { translateY: anim.interpolate({ inputRange: [0,1], outputRange: [0, y] }) },
        { rotate:     anim.interpolate({ inputRange: [0,1], outputRange: ['0deg', `${rot}deg`] }) },
        { scale:      anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) },
      ],
      opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
    }} />
  );
}

export default function LevelUpScreen({ route, navigation }) {
  const { level } = route.params || { level: 2 };
  const { user }  = useAuthStore();

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const titleAnim   = useRef(new Animated.Value(0)).current;

  const levelTitle  = LEVEL_TITLES[(level || 2) - 1] || 'Apprentice';

  const PARTICLE_COLORS = [
    colors.primary, colors.accent, colors.success,
    '#FFD700', '#FF6B6B', '#A78BFA',
  ];

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: Math.random() * 400,
  }));

  useEffect(() => {
    const init = async () => {
      await playSound('level-up');
      await hapticHeavy();

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, tension: 40, friction: 6, useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // Title slide in
      setTimeout(() => {
        Animated.spring(titleAnim, {
          toValue: 1, tension: 50, friction: 8, useNativeDriver: true,
        }).start();
      }, 400);

      // Auto-dismiss after 4 seconds
      setTimeout(() => handleDismiss(), 4000);
    };
    init();
  }, []);

  const handleDismiss = async () => {
    try {
      await clearPendingLevelUp(user.uid);
    } catch (e) {
      console.warn('Could not clear pendingLevelUp:', e.message);
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleDismiss}
    >
      {/* Particles */}
      <View style={styles.particleContainer} pointerEvents="none">
        {particles.map(p => (
          <Particle key={p.id} delay={p.delay} color={p.color} />
        ))}
      </View>

      {/* Main content */}
      <Animated.View style={[styles.content, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, {
          opacity: glowAnim.interpolate({
            inputRange: [0, 1], outputRange: [0.4, 1],
          }),
          transform: [{
            scale: glowAnim.interpolate({
              inputRange: [0, 1], outputRange: [0.95, 1.05],
            }),
          }],
        }]} />

        {/* Icon */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="star-four-points" size={64} color={colors.accent} />
        </View>

        {/* Level up text */}
        <Text variant="labelLarge" style={styles.levelUpLabel}>LEVEL UP!</Text>

        <Animated.View style={{
          transform: [{
            translateY: titleAnim.interpolate({
              inputRange: [0, 1], outputRange: [30, 0],
            }),
          }],
          opacity: titleAnim,
        }}>
          <Text variant="displaySmall" style={styles.levelNumber}>
            Level {level}
          </Text>
          <Text variant="headlineMedium" style={styles.levelTitle}>
            {levelTitle}
          </Text>
        </Animated.View>

        <Text variant="bodyMedium" style={styles.tapToDismiss}>
          Tap anywhere to continue
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '11',
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.accent + '22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
    marginBottom: 8,
  },
  levelUpLabel: {
    color: colors.accent,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontSize: 14,
  },
  levelNumber: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 52,
  },
  levelTitle: {
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  tapToDismiss: {
    color: colors.textSecondary,
    marginTop: 16,
  },
});
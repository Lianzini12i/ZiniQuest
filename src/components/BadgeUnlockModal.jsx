import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { playSound } from '../utils/soundPlayer';
import { hapticHeavy } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const BADGE_META = {
  first_step:      { icon: 'shoe-print',        color: colors.primary,  name: 'First Step' },
  quiz_crusher:    { icon: 'lightning-bolt',     color: colors.accent,   name: 'Quiz Crusher' },
  perfectionist:   { icon: 'star-circle',        color: colors.accent,   name: 'Perfectionist' },
  on_fire:         { icon: 'fire',               color: '#EA580C',       name: 'On Fire' },
  unstoppable:     { icon: 'weather-hurricane',  color: colors.error,    name: 'Unstoppable' },
  speed_learner:   { icon: 'rocket-launch',      color: colors.info,     name: 'Speed Learner' },
  module_master:   { icon: 'book-open-variant',  color: colors.primary,  name: 'Module Master' },
  course_champion: { icon: 'trophy',             color: colors.accent,   name: 'Course Champion' },
  early_bird:      { icon: 'weather-sunset-up',  color: '#F59E0B',       name: 'Early Bird' },
  night_owl:       { icon: 'owl',                color: '#8B5CF6',       name: 'Night Owl' },
  top_10:          { icon: 'medal',              color: colors.accent,   name: 'Top 10' },
  code_veteran:    { icon: 'shield-star',        color: colors.primary,  name: 'Code Veteran' },
};

const BADGE_DESCRIPTIONS = {
  first_step:      'You completed your very first lesson!',
  quiz_crusher:    'You passed 10 quizzes. Unstoppable!',
  perfectionist:   'You scored 100% on a quiz. Flawless!',
  on_fire:         'You maintained a 7-day learning streak!',
  unstoppable:     'You maintained a 30-day learning streak!',
  speed_learner:   'You completed 3 lessons in a single day!',
  module_master:   'You completed all lessons in a module!',
  course_champion: 'You completed an entire course!',
  early_bird:      'You completed a lesson before 8 AM!',
  night_owl:       'You completed a lesson after 10 PM!',
  top_10:          'You reached the top 10 on a leaderboard!',
  code_veteran:    'You completed 50 lessons in total!',
};

function Particle({ delay, color }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const x     = (Math.random() - 0.5) * width * 1.4;
  const y     = -(Math.random() * height * 0.7 + 100);
  const rot   = Math.random() * 720 - 360;
  const size  = Math.random() * 8 + 4;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position:  'absolute',
      width:     size,
      height:    size,
      borderRadius: size / 2,
      backgroundColor: color,
      transform: [
        { translateX: anim.interpolate({ inputRange: [0,1], outputRange: [0, x] }) },
        { translateY: anim.interpolate({ inputRange: [0,1], outputRange: [0, y] }) },
        { rotate:     anim.interpolate({ inputRange: [0,1], outputRange: ['0deg', `${rot}deg`] }) },
        { scale:      anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1.2, 0] }) },
      ],
      opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
    }} />
  );
}

export default function BadgeUnlockModal({ badgeId, visible, onDismiss }) {
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const badge = BADGE_META[badgeId];
  const desc  = BADGE_DESCRIPTIONS[badgeId];

  const PARTICLE_COLORS = [
    badge?.color || colors.primary,
    colors.accent,
    colors.success,
    '#FFD700',
    '#A78BFA',
    '#F472B6',
  ];

  const particles = Array.from({ length: 25 }, (_, i) => ({
    id:    i,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: Math.random() * 300,
  }));

  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      await playSound('badge-unlock');
      await hapticHeavy();

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, tension: 45, friction: 6, useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]).start();

      // Bounce loop on the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -12, duration: 400, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0,   duration: 400, useNativeDriver: true }),
        ])
      ).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    };

    // Reset animations
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    bounceAnim.setValue(0);
    glowAnim.setValue(0);

    init();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, badgeId]);

  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* Particles */}
        <View style={styles.particleContainer} pointerEvents="none">
          {particles.map(p => (
            <Particle key={p.id} delay={p.delay} color={p.color} />
          ))}
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, {
          opacity:   fadeAnim,
          transform: [{ scale: scaleAnim }],
        }]}>
          {/* Glow ring */}
          <Animated.View style={[styles.glowRing, {
            borderColor: badge.color,
            opacity: glowAnim.interpolate({
              inputRange: [0,1], outputRange: [0.3, 0.9],
            }),
            transform: [{
              scale: glowAnim.interpolate({
                inputRange: [0,1], outputRange: [0.9, 1.1],
              }),
            }],
          }]} />

          {/* NEW BADGE label */}
          <View style={[styles.newBadgePill, { backgroundColor: badge.color }]}>
            <MaterialCommunityIcons name="star" size={12} color={colors.white} />
            <Text variant="labelSmall" style={styles.newBadgePillText}>
              NEW BADGE UNLOCKED
            </Text>
          </View>

          {/* Badge icon */}
          <Animated.View style={[styles.iconCircle, {
            backgroundColor: badge.color + '22',
            borderColor:     badge.color,
            transform: [{ translateY: bounceAnim }],
          }]}>
            <MaterialCommunityIcons
              name={badge.icon}
              size={64}
              color={badge.color}
            />
          </Animated.View>

          {/* Badge name */}
          <Text variant="headlineMedium" style={[styles.badgeName, { color: badge.color }]}>
            {badge.name}
          </Text>

          {/* Description */}
          <Text variant="bodyMedium" style={styles.badgeDesc}>
            {desc}
          </Text>

          {/* Dismiss */}
          <TouchableOpacity style={[styles.dismissBtn, { backgroundColor: badge.color }]}
            onPress={onDismiss}>
            <Text variant="labelLarge" style={styles.dismissBtnText}>Awesome!</Text>
          </TouchableOpacity>

          <Text variant="labelSmall" style={styles.tapToDismiss}>
            Tap anywhere to continue
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    width: width * 0.85,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    top: '15%',
  },
  newBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  newBadgePillText: {
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  badgeName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeDesc: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dismissBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  dismissBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  tapToDismiss: {
    color: colors.textSecondary,
  },
});
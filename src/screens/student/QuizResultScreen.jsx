import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { playSound } from '../../utils/soundPlayer';
import { hapticSuccess, hapticError, hapticHeavy } from '../../utils/haptics';

function getGrade(score) {
  if (score >= 90) return { grade: 'A+', color: colors.success,  label: 'Outstanding!' };
  if (score >= 80) return { grade: 'A',  color: colors.success,  label: 'Excellent!' };
  if (score >= 70) return { grade: 'B',  color: colors.info,     label: 'Great work!' };
  if (score >= 60) return { grade: 'C',  color: colors.accent,   label: 'Good effort!' };
  if (score >= 50) return { grade: 'D',  color: colors.error,    label: 'Keep practising' };
  return               { grade: 'F',  color: colors.error,    label: 'Try again!' };
}

export default function QuizResultScreen({ route, navigation }) {
  const {
    score,
    correct,
    total,
    passed,
    perfect,
    xpAwarded,
    passMark,
    lessonTitle,
    lessonId,
  } = route.params;

  const { grade, color: gradeColor, label } = getGrade(score);

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scoreAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scoreAnim, {
          toValue: score,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();

      // Sound + haptic
      if (perfect) {
        await playSound('level-up');
        await hapticHeavy();
      } else if (passed) {
        await playSound('xp-earn');
        await hapticSuccess();
      } else {
        await playSound('wrong-answer');
        await hapticError();
      }
    };
    init();
  }, []);

  const handleRetry = () => {
    navigation.replace('Quiz', {
      quizId: route.params.quizId,
      lessonId,
      lessonTitle,
    });
  };

  const handleContinue = () => {
    navigation.navigate('CourseBrowser');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Score circle */}
      <Animated.View style={[styles.scoreCircleWrap, {
        transform: [{ scale: scaleAnim }],
        opacity: fadeAnim,
      }]}>
        <View style={[styles.scoreCircle, {
          borderColor: gradeColor,
          backgroundColor: gradeColor + '15',
        }]}>
          <Animated.Text style={[styles.scoreNumber, { color: gradeColor }]}>
            {score}%
          </Animated.Text>
          <Text variant="titleLarge" style={[styles.gradeText, { color: gradeColor }]}>
            {grade}
          </Text>
          <Text variant="bodySmall" style={[styles.gradeLabel, { color: gradeColor }]}>
            {label}
          </Text>
        </View>
      </Animated.View>

      {/* Pass / Fail banner */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Surface style={[styles.statusBanner, {
          backgroundColor: passed ? colors.success + '22' : colors.error + '22',
          borderColor:      passed ? colors.success : colors.error,
        }]} elevation={1}>
          <MaterialCommunityIcons
            name={passed ? 'check-decagram' : 'close-circle'}
            size={24}
            color={passed ? colors.success : colors.error}
          />
          <Text variant="titleMedium" style={[styles.statusText, {
            color: passed ? colors.success : colors.error,
          }]}>
            {passed ? 'Quiz Passed!' : 'Quiz Failed'}
          </Text>
          <Text variant="bodySmall" style={[styles.statusSub, {
            color: passed ? colors.success : colors.error,
          }]}>
            Pass mark: {passMark}%
          </Text>
        </Surface>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={2}>
            <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
            <Text variant="titleLarge" style={[styles.statValue, { color: colors.success }]}>
              {correct}
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>Correct</Text>
          </Surface>

          <Surface style={styles.statCard} elevation={2}>
            <MaterialCommunityIcons name="close-circle" size={28} color={colors.error} />
            <Text variant="titleLarge" style={[styles.statValue, { color: colors.error }]}>
              {total - correct}
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>Wrong</Text>
          </Surface>

          <Surface style={styles.statCard} elevation={2}>
            <MaterialCommunityIcons name="help-circle" size={28} color={colors.textSecondary} />
            <Text variant="titleLarge" style={[styles.statValue, { color: colors.textPrimary }]}>
              {total}
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>Total</Text>
          </Surface>
        </View>

        {/* XP earned */}
        {xpAwarded > 0 && (
          <Surface style={styles.xpCard} elevation={2}>
            <MaterialCommunityIcons name="lightning-bolt" size={28} color={colors.accent} />
            <View style={styles.xpInfo}>
              <Text variant="titleMedium" style={styles.xpTitle}>
                XP Earned
              </Text>
              <Text variant="bodySmall" style={styles.xpSub}>
                {perfect ? 'Perfect score bonus included!' : passed ? 'Keep it up!' : ''}
              </Text>
            </View>
            <Text variant="headlineSmall" style={styles.xpAmount}>
              +{xpAwarded}
            </Text>
          </Surface>
        )}

        {/* Perfect score badge */}
        {perfect && (
          <Surface style={styles.perfectCard} elevation={2}>
            <MaterialCommunityIcons name="star-circle" size={32} color={colors.accent} />
            <View style={styles.perfectInfo}>
              <Text variant="titleMedium" style={styles.perfectTitle}>
                Perfect Score!
              </Text>
              <Text variant="bodySmall" style={styles.perfectSub}>
                You answered every question correctly
              </Text>
            </View>
          </Surface>
        )}

        {/* Lesson info */}
        <Surface style={styles.lessonCard} elevation={1}>
          <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
          <Text variant="bodyMedium" style={styles.lessonCardText} numberOfLines={2}>
            {lessonTitle}
          </Text>
        </Surface>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!passed && (
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="refresh"
            >
              Try Again
            </Button>
          )}
          <Button
            mode={passed ? 'contained' : 'outlined'}
            onPress={handleContinue}
            style={passed ? styles.continueButton : styles.continueButtonOutlined}
            contentStyle={styles.buttonContent}
            labelStyle={passed ? styles.buttonLabel : { color: colors.primary, fontWeight: 'bold', fontSize: 16 }}
            icon="arrow-right"
          >
            Continue Learning
          </Button>
        </View>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
    alignItems: 'stretch',
  },

  // Score circle
  scoreCircleWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  gradeText: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  gradeLabel: {
    fontSize: 13,
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    gap: 10,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusSub: {
    opacity: 0.8,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // XP card
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    gap: 12,
  },
  xpInfo: { flex: 1 },
  xpTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  xpSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpAmount: {
    color: colors.accent,
    fontWeight: 'bold',
  },

  // Perfect card
  perfectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '11',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    gap: 12,
  },
  perfectInfo: { flex: 1 },
  perfectTitle: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  perfectSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Lesson card
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  lessonCardText: {
    flex: 1,
    color: colors.textSecondary,
  },

  // Buttons
  actions: { gap: 12 },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  continueButtonOutlined: {
    borderRadius: 12,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  buttonContent: { height: 50 },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
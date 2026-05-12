import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getQuizByLesson, submitQuizAttempt, getQuizAttempts } from '../../services/quizService';
import { awardXP, triggerBadgeCheck } from '../../services/gamificationService';
import { XP_RULES } from '../../constants/xpRules';
import { playSound } from '../../utils/soundPlayer';
import { hapticSuccess, hapticError, hapticLight } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';

const TIMER_DEFAULT = 30;

export default function QuizScreen({ route, navigation }) {
  const { quizId, lessonId, lessonTitle } = route.params;
  const { user } = useAuthStore();

  const [quiz, setQuiz]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [answers, setAnswers]               = useState([]);
  const [selected, setSelected]             = useState(null);
  const [revealed, setRevealed]             = useState(false);
  const [timeLeft, setTimeLeft]             = useState(TIMER_DEFAULT);
  const [timerActive, setTimerActive]       = useState(true);
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [submitting, setSubmitting]         = useState(false);

  const timerRef    = useRef(null);
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load quiz
  useEffect(() => {
    const load = async () => {
      try {
        const [quizData, attempts] = await Promise.all([
          getQuizByLesson(lessonId),
          getQuizAttempts(user.uid, quizId),
        ]);
        setQuiz(quizData);
        setIsFirstAttempt(attempts.length === 0);
        setTimeLeft(quizData?.timerSeconds || TIMER_DEFAULT);
      } catch (e) {
        console.warn('Failed to load quiz:', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (!quiz || !timerActive || revealed) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    timerRef.current = setTimeout(async () => {
      const newTime = timeLeft - 1;
      setTimeLeft(newTime);
      if (newTime <= 5 && newTime > 0) {
        await playSound('quiz-tick');
      }
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, timerActive, revealed, quiz]);

  // Progress bar animation
  useEffect(() => {
    if (!quiz) return;
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / quiz.questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, quiz]);

  const handleTimeout = () => {
    setTimerActive(false);
    setRevealed(true);
    setAnswers(prev => [...prev, -1]); // -1 = timed out
    playSound('wrong-answer');
    hapticError();
  };

  const shakeWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = async (optionIndex) => {
    if (revealed || selected !== null) return;
    clearTimeout(timerRef.current);
    setTimerActive(false);
    setSelected(optionIndex);
    setRevealed(true);

    const question = quiz.questions[currentIndex];
    const correct  = question.correctIndex;
    const isRight  = optionIndex === correct;

    setAnswers(prev => [...prev, optionIndex]);

    if (isRight) {
      await playSound('correct-answer');
      await hapticSuccess();
    } else {
      await playSound('wrong-answer');
      await hapticError();
      shakeWrong();
    }
  };

  const handleNext = async () => {
    await hapticLight();
    const isLast = currentIndex === quiz.questions.length - 1;

    if (isLast) {
      await handleSubmit();
      return;
    }

    // Fade transition
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 150, useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setRevealed(false);
      setTimeLeft(quiz.timerSeconds || TIMER_DEFAULT);
      setTimerActive(true);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const total    = quiz.questions.length;
      const correct  = answers.filter((a, i) => a === quiz.questions[i]?.correctIndex).length;
      const score    = Math.round((correct / total) * 100);
      const passed   = score >= (quiz.passMark || 60);
      const perfect  = score === 100;

    let xpAwarded = 0;
    if (passed && isFirstAttempt) {
      xpAwarded += XP_RULES.QUIZ_PASS_FIRST;
      if (perfect) xpAwarded += XP_RULES.QUIZ_PERFECT_BONUS;
      await awardXP('QUIZ_PASS', quizId, xpAwarded);
      await triggerBadgeCheck(user.uid);
    }

      await submitQuizAttempt(
        user.uid, quizId, lessonId,
        answers, score, passed, xpAwarded, isFirstAttempt
      );

    navigation.replace('QuizResult', {
      score,
      correct,
      total,
      passed,
      perfect,
      xpAwarded,
      passMark: quiz.passMark || 60,
      lessonTitle,
      lessonId,
      quizId,
    });
    } catch (e) {
      console.warn('Quiz submit failed:', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quiz || !quiz.questions?.length) {
    return (
      <View style={styles.centred}>
        <MaterialCommunityIcons name="help-circle-outline" size={48} color={colors.textSecondary} />
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          No questions found
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question    = quiz.questions[currentIndex];
  const timerColor  = timeLeft <= 5 ? colors.error : timeLeft <= 10 ? colors.accent : colors.success;
  const timerPct    = timeLeft / (quiz.timerSeconds || TIMER_DEFAULT);
  const isLast      = currentIndex === quiz.questions.length - 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="labelLarge" style={styles.questionCounter}>
            Question {currentIndex + 1} of {quiz.questions.length}
          </Text>
        </View>
        {/* Timer */}
        <View style={[styles.timerBadge, { backgroundColor: timerColor + '22', borderColor: timerColor }]}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={timerColor} />
          <Text variant="labelMedium" style={[styles.timerText, { color: timerColor }]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }]} />
      </View>

      {/* Timer bar */}
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, {
          width: `${timerPct * 100}%`,
          backgroundColor: timerColor,
        }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }}>
          <Surface style={styles.questionCard} elevation={3}>
            <Text variant="headlineSmall" style={styles.questionText}>
              {question.text}
            </Text>
          </Surface>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option, i) => {
              const isSelected = selected === i;
              const isCorrect  = revealed && i === question.correctIndex;
              const isWrong    = revealed && isSelected && i !== question.correctIndex;
              const isTimeout  = revealed && selected === null && i === question.correctIndex;

              let bgColor    = colors.card;
              let borderColor = colors.border;
              let textColor  = colors.textPrimary;
              let iconName   = null;

              if (isCorrect || isTimeout) {
                bgColor     = colors.success + '22';
                borderColor = colors.success;
                textColor   = colors.success;
                iconName    = 'check-circle';
              } else if (isWrong) {
                bgColor     = colors.error + '22';
                borderColor = colors.error;
                textColor   = colors.error;
                iconName    = 'close-circle';
              } else if (isSelected && !revealed) {
                bgColor     = colors.primary + '22';
                borderColor = colors.primary;
                textColor   = colors.primary;
              }

              const optionLabels = ['A', 'B', 'C', 'D'];

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionBtn, { backgroundColor: bgColor, borderColor }]}
                  onPress={() => handleAnswer(i)}
                  disabled={revealed}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionLabel, { backgroundColor: borderColor + '33' }]}>
                    <Text style={[styles.optionLabelText, { color: textColor }]}>
                      {optionLabels[i]}
                    </Text>
                  </View>
                  <Text variant="bodyLarge" style={[styles.optionText, { color: textColor }]}>
                    {option}
                  </Text>
                  {iconName && (
                    <MaterialCommunityIcons name={iconName} size={22} color={textColor} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation */}
          {revealed && question.explanation && (
            <Surface style={styles.explanationCard} elevation={1}>
              <View style={styles.explanationHeader}>
                <MaterialCommunityIcons name="lightbulb-on" size={18} color={colors.accent} />
                <Text variant="labelLarge" style={styles.explanationTitle}>Explanation</Text>
              </View>
              <Text variant="bodyMedium" style={styles.explanationText}>
                {question.explanation}
              </Text>
            </Surface>
          )}

          {/* Timeout message */}
          {revealed && selected === null && (
            <Surface style={styles.timeoutCard} elevation={1}>
              <MaterialCommunityIcons name="clock-alert" size={20} color={colors.error} />
              <Text variant="bodyMedium" style={styles.timeoutText}>
                Time's up! The correct answer has been revealed.
              </Text>
            </Surface>
          )}
        </Animated.View>
      </ScrollView>

      {/* Next / Submit button */}
      {revealed && (
        <View style={styles.nextContainer}>
          <TouchableOpacity
            style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size={20} color={colors.white} />
            ) : (
              <>
                <Text variant="labelLarge" style={styles.nextBtnText}>
                  {isLast ? 'See Results' : 'Next Question'}
                </Text>
                <MaterialCommunityIcons
                  name={isLast ? 'flag-checkered' : 'arrow-right'}
                  size={20}
                  color={colors.white}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: colors.textSecondary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 12,
  },
  closeBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  questionCounter: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  timerText: { fontWeight: 'bold' },

  // Progress bars
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  timerTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Question card
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    lineHeight: 30,
  },

  // Options
  optionsContainer: { gap: 12 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    gap: 12,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabelText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionText: {
    flex: 1,
    lineHeight: 20,
  },

  // Explanation
  explanationCard: {
    backgroundColor: colors.accent + '11',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    gap: 8,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explanationTitle: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  explanationText: {
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // Timeout
  timeoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.error + '11',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.error + '33',
  },
  timeoutText: {
    flex: 1,
    color: colors.error,
  },

  // Next button
  nextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getLessonById, markLessonComplete, getCompletedLessons } from '../../services/lessonService';
import { getQuizByLesson } from '../../services/quizService';
import { awardXP, triggerBadgeCheck } from '../../services/gamificationService';
import { XP_RULES } from '../../constants/xpRules';
import { hapticSuccess, hapticLight } from '../../utils/haptics';
import { playSound } from '../../utils/soundPlayer';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/userStore';

const DIFFICULTY_COLORS = {
  beginner:     colors.success,
  intermediate: colors.accent,
  advanced:     colors.error,
};

function CodeBlock({ text }) {
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeBlockHeader}>
        <MaterialCommunityIcons name="code-braces" size={14} color={colors.textSecondary} />
        <Text variant="labelSmall" style={styles.codeBlockLabel}>Code</Text>
      </View>
      <Text style={styles.codeText}>{text}</Text>
    </View>
  );
}

function renderContent(content, hasCodeBlocks) {
  // Replace literal \n strings with real newlines
  const normalised = content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ');

  const lines = normalised.split('\n');

  if (!hasCodeBlocks) {
    return lines.map((line, i) => {
      if (line.trim() === '') return <View key={i} style={{ height: 10 }} />;
      return (
        <Text key={i} variant="bodyMedium" style={styles.contentLine}>
          {line}
        </Text>
      );
    });
  }

  const elements = [];
  let codeBuffer = [];
  let textBuffer = [];
  let elementKey = 0;

  const flushText = () => {
    if (textBuffer.length === 0) return;
    const block = textBuffer.slice();
    textBuffer = [];
    elements.push(
      <View key={`text-${elementKey++}`}>
        {block.map((line, i) => {
          if (line.trim() === '') return <View key={i} style={{ height: 10 }} />;
          return (
            <Text key={i} variant="bodyMedium" style={styles.contentLine}>
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) return;
    const block = codeBuffer.slice();
    codeBuffer = [];
    elements.push(<CodeBlock key={`code-${elementKey++}`} text={block.join('\n')} />);
  };

  const CODE_PATTERNS = [
    /^(def |class |if |elif |else:|for |while |try:|except|return |import |from |#)/,
    /^(print|input|len|range|int|float|str|bool|list|dict)\s*\(/,
    /^\s{4,}/,
    /^[a-z_][a-z_0-9]*\s*=/,
    /^[a-z_][a-z_0-9]*\s*\(/,
  ];

  lines.forEach((line) => {
    const isCode = hasCodeBlocks && CODE_PATTERNS.some(p => p.test(line));
    if (isCode) {
      flushText();
      codeBuffer.push(line);
    } else {
      flushCode();
      textBuffer.push(line);
    }
  });

  flushCode();
  flushText();

  return elements;
}

export default function LessonDetailScreen({ route, navigation }) {
  const { lessonId } = route.params;
  const { user } = useAuthStore();
  const { profile } = useUserStore();

  const [lesson, setLesson]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [completed, setCompleted]     = useState(false);
  const [hasQuiz, setHasQuiz]         = useState(false);
  const [quiz, setQuiz]               = useState(null);
  const [completing, setCompleting]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const loadLesson = async () => {
      try {
        const [lessonData, completedList, quizData] = await Promise.all([
          getLessonById(lessonId),
          getCompletedLessons(user.uid),
          getQuizByLesson(lessonId),
        ]);
        setLesson(lessonData);
        setCompleted(completedList.includes(lessonId));
        if (quizData) {
          setHasQuiz(true);
          setQuiz(quizData);
        }
      } catch (e) {
        console.warn('Failed to load lesson:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadLesson();
  }, [lessonId]);

  const handleComplete = async () => {
    if (completed || completing) return;
    setCompleting(true);
    try {
      // Mark complete in Firestore
      await markLessonComplete(user.uid, lessonId);

      // Determine XP amount from difficulty
      const xpMap = {
        beginner:     XP_RULES.LESSON_BEGINNER,
        intermediate: XP_RULES.LESSON_INTERMEDIATE,
        advanced:     XP_RULES.LESSON_ADVANCED,
      };
      const xpAmount = xpMap[lesson.difficulty] || XP_RULES.LESSON_BEGINNER;

      // Hybrid model — instant local feedback + server sync
      await awardXP('LESSON_COMPLETE', lessonId, xpAmount);
      await triggerBadgeCheck(user.uid);

      await hapticSuccess();
      await playSound('xp-earn');

      setCompleted(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.warn('Failed to complete lesson:', e.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleStartQuiz = () => {
    hapticLight();
    navigation.navigate('Quiz', {
      quizId: quiz.id,
      lessonId,
      lessonTitle: lesson.title,
    });
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.centred}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          Lesson not found
        </Text>
      </View>
    );
  }

  const diffColor = DIFFICULTY_COLORS[lesson.difficulty] || colors.textSecondary;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Lesson header */}
        <Surface style={styles.headerCard} elevation={2}>
          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={[styles.diffTag, { backgroundColor: diffColor + '22' }]}>
              <Text variant="labelSmall" style={[styles.diffTagText, { color: diffColor }]}>
                {lesson.difficulty?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
              <Text variant="labelSmall" style={styles.metaText}>
                {lesson.estimatedMins} min read
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.accent} />
              <Text variant="labelSmall" style={[styles.metaText, { color: colors.accent }]}>
                +{lesson.xpReward} XP
              </Text>
            </View>
            {completed && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                <Text variant="labelSmall" style={{ color: colors.success }}>Done</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text variant="headlineSmall" style={styles.lessonTitle}>
            {lesson.title}
          </Text>
        </Surface>

        {/* XP success toast */}
        {showSuccess && (
          <Surface style={styles.successToast} elevation={4}>
            <MaterialCommunityIcons name="star-circle" size={24} color={colors.accent} />
            <Text variant="labelLarge" style={styles.successToastText}>
              +{lesson.xpReward} XP earned!
            </Text>
          </Surface>
        )}

        {/* Lesson content */}
        <Surface style={styles.contentCard} elevation={1}>
          <View style={styles.contentBody}>
            {renderContent(lesson.content || '', lesson.hasCodeBlocks)}
          </View>
        </Surface>

        {/* Bottom actions */}
        <View style={styles.actions}>
          {!completed ? (
            <Button
              mode="contained"
              onPress={handleComplete}
              loading={completing}
              disabled={completing}
              style={styles.completeButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="check-circle"
            >
              {completing ? 'Saving...' : 'Mark as Complete'}
            </Button>
          ) : (
            <Surface style={styles.completedCard} elevation={1}>
              <MaterialCommunityIcons name="check-decagram" size={28} color={colors.success} />
              <Text variant="titleSmall" style={styles.completedText}>
                Lesson Completed!
              </Text>
            </Surface>
          )}

          {completed && hasQuiz && (
            <Button
              mode="contained"
              onPress={handleStartQuiz}
              style={styles.quizButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="help-circle"
            >
              Take Quiz
            </Button>
          )}

          {completed && !hasQuiz && (
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              labelStyle={{ color: colors.primary }}
              icon="arrow-left"
            >
              Back to Course
            </Button>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  centred: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },

  // Header card
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffTagText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    lineHeight: 30,
  },

  // Success toast
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accent + '22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },
  successToastText: {
    color: colors.accent,
    fontWeight: 'bold',
  },

  // Content
  contentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  contentBody: {
    padding: 18,
    gap: 4,
  },
  contentLine: {
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },

  // Code block
  codeBlock: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  codeBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  codeBlockLabel: {
    color: colors.textSecondary,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // Actions
  actions: {
    gap: 12,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  quizButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  backButton: {
    borderRadius: 12,
    borderColor: colors.primary,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.success + '22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '44',
  },
  completedText: {
    color: colors.success,
    fontWeight: 'bold',
  },
});
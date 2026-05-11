import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getCourseById, getModulesByCourse, getLessonsByModule, getCompletedLessons } from '../../services/lessonService';
import useAuthStore from '../../store/authStore';

const SUBJECT_COLORS = {
  programming: colors.primary,
  mathematics: colors.info,
  science:     colors.success,
  history:     colors.accent,
  language:    '#8B5CF6',
  business:    '#EA580C',
  engineering: colors.error,
  health:      '#EC4899',
};

const SUBJECT_ICONS = {
  programming: 'code-braces',
  mathematics: 'calculator',
  science:     'flask',
  history:     'book-open-page-variant',
  language:    'translate',
  business:    'briefcase',
  engineering: 'cog',
  health:      'heart-pulse',
};

const DIFFICULTY_COLORS = {
  beginner:     colors.success,
  intermediate: colors.accent,
  advanced:     colors.error,
};

function ProgressRing({ progress, size = 64, color = colors.primary }) {
  const filled = Math.round(progress * 100);
  return (
    <View style={[styles.progressRing, {
      width: size, height: size, borderRadius: size / 2,
      borderColor: color, borderWidth: 5,
      backgroundColor: color + '22',
    }]}>
      <Text style={[styles.progressRingText, { color }]}>{filled}%</Text>
    </View>
  );
}

function LessonRow({ lesson, completed, onPress }) {
  const diffColor = DIFFICULTY_COLORS[lesson.difficulty] || colors.textSecondary;
  return (
    <TouchableOpacity style={styles.lessonRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.lessonStatusIcon, {
        backgroundColor: completed ? colors.success + '22' : colors.border,
      }]}>
        <MaterialCommunityIcons
          name={completed ? 'check-circle' : 'circle-outline'}
          size={22}
          color={completed ? colors.success : colors.textSecondary}
        />
      </View>
      <View style={styles.lessonRowInfo}>
        <Text variant="bodyMedium" style={[styles.lessonTitle, completed && styles.lessonTitleDone]}
          numberOfLines={1}>
          {lesson.title}
        </Text>
        <View style={styles.lessonMeta}>
          <View style={[styles.diffTag, { backgroundColor: diffColor + '22' }]}>
            <Text variant="labelSmall" style={[styles.diffTagText, { color: diffColor }]}>
              {lesson.difficulty}
            </Text>
          </View>
          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textSecondary} />
          <Text variant="labelSmall" style={styles.lessonMetaText}>
            {lesson.estimatedMins} min
          </Text>
          <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.accent} />
          <Text variant="labelSmall" style={[styles.lessonMetaText, { color: colors.accent }]}>
            {lesson.xpReward} XP
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function ModuleAccordion({ module, lessons, completedLessons, onLessonPress, subjectColor }) {
  const [expanded, setExpanded] = useState(true);
  const completedCount = lessons.filter(l => completedLessons.includes(l.id)).length;
  const progress = lessons.length > 0 ? completedCount / lessons.length : 0;
  const allDone = completedCount === lessons.length && lessons.length > 0;

  return (
    <Surface style={styles.moduleCard} elevation={2}>
      {/* Module header */}
      <TouchableOpacity
        style={styles.moduleHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={[styles.moduleIconBg, { backgroundColor: subjectColor + '22' }]}>
          <MaterialCommunityIcons
            name={allDone ? 'check-decagram' : 'book-open-variant'}
            size={20}
            color={allDone ? colors.success : subjectColor}
          />
        </View>
        <View style={styles.moduleHeaderInfo}>
          <Text variant="titleSmall" style={styles.moduleTitle} numberOfLines={2}>
            {module.title}
          </Text>
          <Text variant="labelSmall" style={styles.moduleProgress}>
            {completedCount}/{lessons.length} lessons complete
          </Text>
        </View>
        <View style={styles.moduleHeaderRight}>
          <View style={styles.moduleProgressBar}>
            <View style={[styles.moduleProgressFill, {
              width: `${progress * 100}%`,
              backgroundColor: subjectColor,
            }]} />
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Lessons list */}
      {expanded && (
        <View style={styles.lessonsList}>
          {lessons.length === 0 ? (
            <Text variant="bodySmall" style={styles.noLessons}>
              No lessons available yet
            </Text>
          ) : (
            lessons.map((lesson, index) => (
              <View key={lesson.id}>
                {index > 0 && <View style={styles.lessonDivider} />}
                <LessonRow
                  lesson={lesson}
                  completed={completedLessons.includes(lesson.id)}
                  onPress={() => onLessonPress(lesson)}
                />
              </View>
            ))
          )}
        </View>
      )}
    </Surface>
  );
}

export default function MyCourseScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;
  const { user } = useAuthStore();

  const [course, setCourse]                 = useState(null);
  const [modules, setModules]               = useState([]);
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const loadData = async () => {
    try {
      const [courseData, modulesData, completedData] = await Promise.all([
        getCourseById(courseId),
        getModulesByCourse(courseId),
        getCompletedLessons(user.uid),
      ]);

      setCourse(courseData);
      setModules(modulesData);
      setCompletedLessons(completedData);

      const lessonsMap = {};
      await Promise.all(
        modulesData.map(async (mod) => {
          const lessons = await getLessonsByModule(mod.id);
          lessonsMap[mod.id] = lessons;
        })
      );
      setLessonsByModule(lessonsMap);
    } catch (e) {
      console.warn('Failed to load course data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLessonPress = (lesson) => {
    navigation.navigate('LessonDetail', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    });
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  const subjectColor = SUBJECT_COLORS[course?.subject] || colors.primary;
  const subjectIcon  = SUBJECT_ICONS[course?.subject]  || 'book';

  const totalLessons    = Object.values(lessonsByModule).flat().length;
  const totalCompleted  = Object.values(lessonsByModule).flat()
    .filter(l => completedLessons.includes(l.id)).length;
  const overallProgress = totalLessons > 0 ? totalCompleted / totalLessons : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Course header */}
      <Surface style={[styles.courseHeader, { borderColor: subjectColor }]} elevation={3}>
        <View style={styles.courseHeaderTop}>
          <View style={[styles.courseIconBg, { backgroundColor: subjectColor + '22' }]}>
            <MaterialCommunityIcons name={subjectIcon} size={32} color={subjectColor} />
          </View>
          <View style={styles.courseHeaderInfo}>
            <View style={[styles.subjectTag, { backgroundColor: subjectColor + '22' }]}>
              <Text variant="labelSmall" style={[styles.subjectTagText, { color: subjectColor }]}>
                {course?.subject?.toUpperCase()}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.courseTitle} numberOfLines={2}>
              {course?.title}
            </Text>
          </View>
          <ProgressRing progress={overallProgress} color={subjectColor} />
        </View>

        {course?.description && (
          <Text variant="bodySmall" style={styles.courseDesc}>
            {course.description}
          </Text>
        )}

        {/* Stats row */}
        <View style={styles.courseStatsRow}>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="book-multiple" size={16} color={subjectColor} />
            <Text variant="labelMedium" style={styles.courseStatText}>
              {modules.length} modules
            </Text>
          </View>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="text-box-multiple" size={16} color={subjectColor} />
            <Text variant="labelMedium" style={styles.courseStatText}>
              {totalLessons} lessons
            </Text>
          </View>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
            <Text variant="labelMedium" style={[styles.courseStatText, { color: colors.success }]}>
              {totalCompleted} done
            </Text>
          </View>
        </View>

        {/* Overall progress bar */}
        <View style={styles.overallProgressBar}>
          <View style={[styles.overallProgressFill, {
            width: `${overallProgress * 100}%`,
            backgroundColor: subjectColor,
          }]} />
        </View>
        <Text variant="labelSmall" style={styles.progressLabel}>
          {totalCompleted}/{totalLessons} lessons completed
        </Text>
      </Surface>

      {/* Modules */}
      <Text variant="titleMedium" style={styles.modulesHeading}>Course Modules</Text>

      {modules.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <MaterialCommunityIcons name="book-off" size={40} color={colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No modules available yet
          </Text>
        </Surface>
      ) : (
        modules.map((mod) => (
          <ModuleAccordion
            key={mod.id}
            module={mod}
            lessons={lessonsByModule[mod.id] || []}
            completedLessons={completedLessons}
            onLessonPress={handleLessonPress}
            subjectColor={subjectColor}
          />
        ))
      )}

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
  loadingText: {
    color: colors.textSecondary,
  },

  // Back button
  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },

  // Course header card
  courseHeader: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12,
  },
  courseHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  courseIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  subjectTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectTagText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  courseTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  courseDesc: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  courseStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseStatText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    color: colors.textSecondary,
    textAlign: 'right',
  },

  // Progress ring
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingText: {
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Modules section
  modulesHeading: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  // Module card
  moduleCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  moduleIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  moduleTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  moduleProgress: {
    color: colors.textSecondary,
  },
  moduleHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  moduleProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  moduleProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Lessons list
  lessonsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noLessons: {
    color: colors.textSecondary,
    padding: 16,
    textAlign: 'center',
  },
  lessonDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },

  // Lesson row
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  lessonStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonRowInfo: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  lessonTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffTagText: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  lessonMetaText: {
    color: colors.textSecondary,
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
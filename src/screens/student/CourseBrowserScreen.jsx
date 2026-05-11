import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Surface, Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { SUBJECTS } from '../../constants/subjects';
import { getCourses } from '../../services/lessonService';
import { enrollInCourse, isEnrolled } from '../../services/enrollmentService';
import { awardXP } from '../../services/gamificationService';
import { XP_RULES } from '../../constants/xpRules';
import { hapticSuccess, hapticLight } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/userStore';

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

function CourseCard({ course, enrolled, onEnroll, onOpen, enrolling }) {
  const subjectColor = SUBJECT_COLORS[course.subject] || colors.primary;
  const subjectIcon  = SUBJECT_ICONS[course.subject]  || 'book';

  return (
    <Surface style={styles.courseCard} elevation={2}>
      {/* Subject colour bar */}
      <View style={[styles.courseColorBar, { backgroundColor: subjectColor }]} />

      <View style={styles.courseBody}>
        {/* Icon + subject tag */}
        <View style={styles.courseTopRow}>
          <View style={[styles.subjectIconBg, { backgroundColor: subjectColor + '22' }]}>
            <MaterialCommunityIcons name={subjectIcon} size={22} color={subjectColor} />
          </View>
          <View style={[styles.subjectTag, { backgroundColor: subjectColor + '22' }]}>
            <Text variant="labelSmall" style={[styles.subjectTagText, { color: subjectColor }]}>
              {course.subject?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Title + description */}
        <Text variant="titleMedium" style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>
        {course.description ? (
          <Text variant="bodySmall" style={styles.courseDesc} numberOfLines={2}>
            {course.description}
          </Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.courseStatsRow}>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="account-group" size={14} color={colors.textSecondary} />
            <Text variant="labelSmall" style={styles.courseStatText}>
              {course.enrollmentCount || 0} enrolled
            </Text>
          </View>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="book-multiple" size={14} color={colors.textSecondary} />
            <Text variant="labelSmall" style={styles.courseStatText}>
              {course.moduleCount || 0} modules
            </Text>
          </View>
          <View style={styles.courseStat}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.accent} />
            <Text variant="labelSmall" style={[styles.courseStatText, { color: colors.accent }]}>
              +{course.totalXP || 150} XP
            </Text>
          </View>
        </View>

        {/* Action button */}
        {enrolled ? (
          <TouchableOpacity
            style={[styles.courseButton, styles.courseButtonEnrolled]}
            onPress={onOpen}
          >
            <MaterialCommunityIcons name="play-circle" size={18} color={colors.white} />
            <Text variant="labelLarge" style={styles.courseButtonTextEnrolled}>
              Continue Learning
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.courseButton, { backgroundColor: subjectColor }]}
            onPress={onEnroll}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size={16} color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="plus-circle" size={18} color={colors.white} />
                <Text variant="labelLarge" style={styles.courseButtonTextEnrolled}>
                  Enrol Now
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );
}

export default function CourseBrowserScreen({ navigation }) {
  const { user } = useAuthStore();
  const { profile } = useUserStore();

  const [courses, setCourses]           = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [enrolledMap, setEnrolledMap]   = useState({});
  const [enrollingId, setEnrollingId]   = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeSubject, setActiveSubject] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const loadCourses = async () => {
    try {
      const data = await getCourses(true);
      setCourses(data);
      setFiltered(data);

      // Check enrollment status for each course
      const map = {};
      await Promise.all(
        data.map(async (c) => {
          map[c.id] = await isEnrolled(user.uid, c.id);
        })
      );
      setEnrolledMap(map);
    } catch (e) {
      console.warn('Failed to load courses:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadCourses(); }, []);

  // Filter logic
  useEffect(() => {
    let result = courses;
    if (activeSubject !== 'all') {
      result = result.filter((c) => c.subject === activeSubject);
    }
    if (searchQuery.trim()) {
      result = result.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFiltered(result);
  }, [searchQuery, activeSubject, courses]);

  const handleEnrol = async (course) => {
    setEnrollingId(course.id);
    try {
      const alreadyEnrolled = await isEnrolled(user.uid, course.id);
      if (!alreadyEnrolled) {
        await enrollInCourse(user.uid, course.id);
        // Award XP for first enrolment
        if ((profile?.enrolledCourses?.length || 0) === 0) {
          await awardXP('FIRST_ENROLL', course.id, XP_RULES.FIRST_ENROLL);
        }
        setEnrolledMap((prev) => ({ ...prev, [course.id]: true }));
        await hapticSuccess();
      }
    } catch (e) {
      console.warn('Enrolment failed:', e.message);
    } finally {
      setEnrollingId(null);
    }
  };

  const handleOpen = (course) => {
    hapticLight();
    navigation.navigate('MyCourse', { courseId: course.id, courseTitle: course.title });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Explore Courses</Text>
        <Text variant="bodyMedium" style={styles.headerSub}>
          Find your next learning adventure
        </Text>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Search courses..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ color: colors.textPrimary }}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Subject filter chips */}
      <View>
        <FlatList
          horizontal
          data={[{ key: 'all', label: 'All', icon: 'apps' }, ...SUBJECTS]}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => (
            <Chip
              selected={activeSubject === item.key}
              onPress={() => {
                hapticLight();
                setActiveSubject(item.key);
              }}
              style={[
                styles.chip,
                activeSubject === item.key && styles.chipActive,
              ]}
              textStyle={[
                styles.chipText,
                activeSubject === item.key && styles.chipTextActive,
              ]}
              icon={() => (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={14}
                  color={activeSubject === item.key ? colors.white : colors.textSecondary}
                />
              )}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {/* Course list */}
      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centred}>
          <MaterialCommunityIcons name="book-off" size={56} color={colors.textSecondary} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No courses found</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : 'No courses available in this subject yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              enrolled={!!enrolledMap[item.id]}
              enrolling={enrollingId === item.id}
              onEnroll={() => handleEnrol(item)}
              onOpen={() => handleOpen(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 14,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Course card
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  courseColorBar: {
    width: 6,
  },
  courseBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectTag: {
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
    gap: 14,
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseStatText: {
    color: colors.textSecondary,
  },
  courseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  courseButtonEnrolled: {
    backgroundColor: colors.success,
  },
  courseButtonTextEnrolled: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
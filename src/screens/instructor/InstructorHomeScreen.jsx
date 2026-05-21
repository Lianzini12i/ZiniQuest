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
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { logoutUser } from '../../services/authService';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/userStore';

function StatCard({ icon, value, label, color }) {
  return (
    <Surface style={styles.statCard} elevation={2}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
      <Text variant="titleLarge" style={[styles.statValue, { color }]}>{value}</Text>
      <Text variant="labelSmall" style={styles.statLabel}>{label}</Text>
    </Surface>
  );
}

function StudentRow({ student, atRisk }) {
  const AVATAR_ICONS = {
    avatar_1: { icon: 'account-circle',     color: colors.primary },
    avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
    avatar_3: { icon: 'account-star',       color: colors.success },
    avatar_4: { icon: 'robot-excited',      color: colors.info },
    avatar_5: { icon: 'alien',              color: colors.error },
    avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
  };
  const avatarMeta = AVATAR_ICONS[student.avatar] || AVATAR_ICONS.avatar_1;

  return (
    <View style={[styles.studentRow, atRisk && styles.studentRowRisk]}>
      <View style={[styles.studentAvatar, { backgroundColor: avatarMeta.color + '22' }]}>
        <MaterialCommunityIcons name={avatarMeta.icon} size={24} color={avatarMeta.color} />
      </View>
      <View style={styles.studentInfo}>
        <Text variant="bodyMedium" style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text variant="labelSmall" style={styles.studentMeta}>
          {student.xp || 0} XP · Level {student.level || 1}
        </Text>
      </View>
      {atRisk && (
        <View style={styles.riskBadge}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
          <Text variant="labelSmall" style={styles.riskText}>Inactive</Text>
        </View>
      )}
      {!atRisk && (
        <View style={styles.activeBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
          <Text variant="labelSmall" style={styles.activeText}>Active</Text>
        </View>
      )}
    </View>
  );
}

export default function InstructorHomeScreen({ navigation }) {
  const { user }    = useAuthStore();
  const { profile } = useUserStore();

  const [courses, setCourses]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [atRiskStudents, setAtRisk]   = useState([]);
  const [recentAttempts, setAttempts] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const loadData = async () => {
    try {
      // Load instructor's courses
      const coursesSnap = await getDocs(
        query(collection(db, 'courses'), where('instructorId', '==', user.uid))
      );
      const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(coursesData);

      // Load enrolled students across all courses
      const courseIds = coursesData.map(c => c.id);
      if (courseIds.length > 0) {
        const enrollSnap = await getDocs(
          query(collection(db, 'enrollments'), where('courseId', 'in', courseIds))
        );
        const userIds = [...new Set(enrollSnap.docs.map(d => d.data().userId))];

        // Fetch student profiles
        const studentProfiles = await Promise.all(
          userIds.map(async (uid) => {
            const userSnap = await getDocs(
              query(collection(db, 'users'), where('uid', '==', uid))
            );
            if (!userSnap.empty) return { id: uid, ...userSnap.docs[0].data() };
            return null;
          })
        );

        const validStudents = studentProfiles.filter(Boolean);
        setStudents(validStudents);

        // Identify at-risk students (inactive 7+ days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const atRisk = validStudents.filter(s =>
          !s.lastActiveDate || s.lastActiveDate < sevenDaysAgoStr
        );
        setAtRisk(atRisk);

        // Load recent quiz attempts
        if (courseIds.length > 0) {
          const attemptsSnap = await getDocs(
            query(
              collection(db, 'quizAttempts'),
              orderBy('submittedAt', 'desc'),
              limit(10)
            )
          );
          setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      }
    } catch (e) {
      console.warn('Failed to load instructor data:', e.message);
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

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const totalEnrolled = students.length;
  const totalCourses  = courses.length;
  const totalAttempts = recentAttempts.length;
  const passRate      = recentAttempts.length > 0
    ? Math.round((recentAttempts.filter(a => a.passed).length / recentAttempts.length) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="bodyMedium" style={styles.headerSub}>Instructor Portal</Text>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            {profile?.name?.split(' ')[0]} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={logoutUser} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="book-multiple"  value={totalCourses}  label="Courses"   color={colors.info} />
        <StatCard icon="account-group"  value={totalEnrolled} label="Students"  color={colors.primary} />
        <StatCard icon="clipboard-list" value={totalAttempts} label="Attempts"  color={colors.accent} />
        <StatCard icon="percent"        value={`${passRate}%`} label="Pass Rate" color={colors.success} />
      </View>

      {/* Quick actions */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.info + '22', borderColor: colors.info }]}
          onPress={() => navigation.navigate('Content', { screen: 'CreateLesson' })}
        >
          <MaterialCommunityIcons name="plus-circle" size={28} color={colors.info} />
          <Text variant="labelMedium" style={[styles.actionLabel, { color: colors.info }]}>
            New Lesson
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
          onPress={() => navigation.navigate('Content', { screen: 'CreateQuiz' })}
        >
          <MaterialCommunityIcons name="help-circle" size={28} color={colors.accent} />
          <Text variant="labelMedium" style={[styles.actionLabel, { color: colors.accent }]}>
            New Quiz
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success + '22', borderColor: colors.success }]}
          onPress={() => navigation.navigate('Students')}
        >
          <MaterialCommunityIcons name="chart-bar" size={28} color={colors.success} />
          <Text variant="labelMedium" style={[styles.actionLabel, { color: colors.success }]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {/* My Courses */}
      <Text variant="titleMedium" style={styles.sectionTitle}>My Courses</Text>
      {courses.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <MaterialCommunityIcons name="book-plus" size={36} color={colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No courses yet. Create your first lesson to get started.
          </Text>
        </Surface>
      ) : (
        courses.map(course => (
          <Surface key={course.id} style={styles.courseCard} elevation={2}>
            <View style={[styles.courseBar, { backgroundColor: colors.info }]} />
            <View style={styles.courseBody}>
              <Text variant="titleSmall" style={styles.courseTitle} numberOfLines={1}>
                {course.title}
              </Text>
              <Text variant="labelSmall" style={styles.courseMeta}>
                {course.subject} · {course.enrollmentCount || 0} enrolled
              </Text>
              <View style={[styles.publishedChip, {
                backgroundColor: course.published ? colors.success + '22' : colors.accent + '22',
              }]}>
                <Text variant="labelSmall" style={{
                  color: course.published ? colors.success : colors.accent,
                  fontWeight: 'bold',
                }}>
                  {course.published ? 'Published' : 'Draft'}
                </Text>
              </View>
            </View>
          </Surface>
        ))
      )}

      {/* At-risk students */}
      {atRiskStudents.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>⚠ At-Risk Students</Text>
            <Text variant="labelSmall" style={styles.sectionSub}>Inactive 7+ days</Text>
          </View>
          <Surface style={styles.studentsCard} elevation={1}>
            {atRiskStudents.slice(0, 5).map((student, i) => (
              <View key={student.id}>
                {i > 0 && <View style={styles.studentDivider} />}
                <StudentRow student={student} atRisk={true} />
              </View>
            ))}
          </Surface>
        </>
      )}

      {/* All students */}
      {students.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            All Students ({students.length})
          </Text>
          <Surface style={styles.studentsCard} elevation={1}>
            {students.slice(0, 8).map((student, i) => (
              <View key={student.id}>
                {i > 0 && <View style={styles.studentDivider} />}
                <StudentRow
                  student={student}
                  atRisk={atRiskStudents.some(s => s.id === student.id)}
                />
              </View>
            ))}
          </Surface>
        </>
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
  loadingText: { color: colors.textSecondary },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerSub: { color: colors.info, fontWeight: 'bold' },
  headerTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: colors.error + '11',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.error + '33',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontWeight: 'bold', color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, textAlign: 'center' },

  // Quick actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  actionLabel: { fontWeight: 'bold', textAlign: 'center' },

  // Section titles
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionSub: { color: colors.error },

  // Course cards
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  courseBar: { width: 5 },
  courseBody: { flex: 1, padding: 14, gap: 4 },
  courseTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  courseMeta: { color: colors.textSecondary },
  publishedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },

  // Students
  studentsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  studentRowRisk: {
    backgroundColor: colors.error + '08',
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfo: { flex: 1 },
  studentName: { color: colors.textPrimary, fontWeight: '600' },
  studentMeta: { color: colors.textSecondary },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: { color: colors.error, fontWeight: 'bold' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: { color: colors.success, fontWeight: 'bold' },
  studentDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
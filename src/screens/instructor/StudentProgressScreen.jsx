import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';

const AVATAR_ICONS = {
  avatar_1: { icon: 'account-circle',     color: colors.primary },
  avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
  avatar_3: { icon: 'account-star',       color: colors.success },
  avatar_4: { icon: 'robot-excited',      color: colors.info },
  avatar_5: { icon: 'alien',              color: colors.error },
  avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
};

function StatSummaryCard({ icon, value, label, color }) {
  return (
    <Surface style={styles.summaryCard} elevation={2}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text variant="titleMedium" style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text variant="labelSmall" style={styles.summaryLabel}>{label}</Text>
    </Surface>
  );
}

function StudentCard({ student, attempts, onPress }) {
  const avatarMeta  = AVATAR_ICONS[student.avatar] || AVATAR_ICONS.avatar_1;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const atRisk = !student.lastActiveDate || student.lastActiveDate < sevenDaysAgoStr;
  const studentAttempts = attempts.filter(a => a.userId === student.uid);
  const passedAttempts  = studentAttempts.filter(a => a.passed);
  const avgScore = studentAttempts.length > 0
    ? Math.round(studentAttempts.reduce((sum, a) => sum + a.score, 0) / studentAttempts.length)
    : 0;

  return (
    <TouchableOpacity onPress={() => onPress(student, studentAttempts)} activeOpacity={0.8}>
      <Surface style={[styles.studentCard, atRisk && styles.studentCardRisk]} elevation={2}>
        <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22' }]}>
          <MaterialCommunityIcons name={avatarMeta.icon} size={28} color={avatarMeta.color} />
        </View>
        <View style={styles.studentInfo}>
          <View style={styles.studentNameRow}>
            <Text variant="bodyLarge" style={styles.studentName} numberOfLines={1}>
              {student.name}
            </Text>
            {atRisk && (
              <View style={styles.riskChip}>
                <MaterialCommunityIcons name="alert-circle" size={12} color={colors.error} />
                <Text variant="labelSmall" style={styles.riskText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text variant="labelSmall" style={styles.studentEmail} numberOfLines={1}>
            {student.email}
          </Text>
          <View style={styles.studentStats}>
            <View style={styles.statPill}>
              <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.accent} />
              <Text variant="labelSmall" style={{ color: colors.accent }}>{student.xp || 0} XP</Text>
            </View>
            <View style={styles.statPill}>
              <MaterialCommunityIcons name="clipboard-check" size={12} color={colors.success} />
              <Text variant="labelSmall" style={{ color: colors.success }}>
                {passedAttempts.length} passed
              </Text>
            </View>
            {studentAttempts.length > 0 && (
              <View style={styles.statPill}>
                <MaterialCommunityIcons name="chart-line" size={12} color={colors.info} />
                <Text variant="labelSmall" style={{ color: colors.info }}>{avgScore}% avg</Text>
              </View>
            )}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </Surface>
    </TouchableOpacity>
  );
}

function StudentDetailModal({ student, attempts, onClose }) {
  if (!student) return null;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;
  const passed = attempts.filter(a => a.passed).length;

  return (
    <View style={styles.modalOverlay}>
      <Surface style={styles.modalCard} elevation={5}>
        <View style={styles.modalHeader}>
          <Text variant="titleLarge" style={styles.modalTitle}>{student.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text variant="bodySmall" style={styles.modalEmail}>{student.email}</Text>

        <View style={styles.modalStats}>
          <View style={styles.modalStatItem}>
            <Text variant="titleMedium" style={{ color: colors.accent, fontWeight: 'bold' }}>
              {student.xp || 0}
            </Text>
            <Text variant="labelSmall" style={styles.modalStatLabel}>Total XP</Text>
          </View>
          <View style={styles.modalStatItem}>
            <Text variant="titleMedium" style={{ color: colors.success, fontWeight: 'bold' }}>
              {passed}
            </Text>
            <Text variant="labelSmall" style={styles.modalStatLabel}>Quizzes Passed</Text>
          </View>
          <View style={styles.modalStatItem}>
            <Text variant="titleMedium" style={{ color: colors.info, fontWeight: 'bold' }}>
              {avgScore}%
            </Text>
            <Text variant="labelSmall" style={styles.modalStatLabel}>Avg Score</Text>
          </View>
          <View style={styles.modalStatItem}>
            <Text variant="titleMedium" style={{ color: '#EA580C', fontWeight: 'bold' }}>
              {student.streak || 0}
            </Text>
            <Text variant="labelSmall" style={styles.modalStatLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Recent attempts */}
        {attempts.length > 0 && (
          <>
            <Text variant="labelLarge" style={styles.attemptsTitle}>Recent Quiz Attempts</Text>
            {attempts.slice(0, 5).map((a, i) => (
              <View key={i} style={styles.attemptRow}>
                <MaterialCommunityIcons
                  name={a.passed ? 'check-circle' : 'close-circle'}
                  size={18}
                  color={a.passed ? colors.success : colors.error}
                />
                <Text variant="bodySmall" style={styles.attemptScore}>
                  {a.score}%
                </Text>
                <View style={[styles.attemptGradeBadge, {
                  backgroundColor: a.passed ? colors.success + '22' : colors.error + '22',
                }]}>
                  <Text variant="labelSmall" style={{
                    color: a.passed ? colors.success : colors.error,
                    fontWeight: 'bold',
                  }}>
                    {a.passed ? 'PASSED' : 'FAILED'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
          <Text variant="labelLarge" style={styles.modalCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </Surface>
    </View>
  );
}

export default function StudentProgressScreen() {
  const { user } = useAuthStore();

  const [students, setStudents]     = useState([]);
  const [attempts, setAttempts]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAttempts, setSelectedAttempts] = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [exporting, setExporting]   = useState(false);

  const loadData = async () => {
    try {
      // Get instructor's courses
      const coursesSnap = await getDocs(
        query(collection(db, 'courses'), where('instructorId', '==', user.uid))
      );
      const courseIds = coursesSnap.docs.map(d => d.id);
      if (courseIds.length === 0) {
        setStudents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get enrollments
      const enrollSnap = await getDocs(
        query(collection(db, 'enrollments'), where('courseId', 'in', courseIds))
      );
      const userIds = [...new Set(enrollSnap.docs.map(d => d.data().userId))];

      // Get student profiles
      const profiles = await Promise.all(
        userIds.map(async (uid) => {
          const snap = await getDocs(
            query(collection(db, 'users'), where('uid', '==', uid))
          );
          if (!snap.empty) return { id: uid, ...snap.docs[0].data() };
          return null;
        })
      );

      const validStudents = profiles.filter(Boolean);
      setStudents(validStudents);
      setFiltered(validStudents);

      // Get all quiz attempts
      const attemptsSnap = await getDocs(
        query(collection(db, 'quizAttempts'), orderBy('submittedAt', 'desc'))
      );
      setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn('Failed to load progress data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(students);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFiltered(students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    ));
  }, [searchQuery, students]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStudentPress = (student, studentAttempts) => {
    hapticLight();
    setSelectedStudent(student);
    setSelectedAttempts(studentAttempts);
    setShowModal(true);
  };

  // CSV Export — Academic Research Feature
  const handleExportCSV = async () => {
    if (students.length === 0) {
      Alert.alert('No Data', 'No student data available to export.');
      return;
    }
    setExporting(true);
    try {
      const headers = [
        'Name', 'Email', 'Total XP', 'Level', 'Streak',
        'Quizzes Attempted', 'Quizzes Passed', 'Average Score (%)',
        'Badges Earned', 'Enrolled Courses', 'Last Active',
      ];

      const rows = students.map(student => {
        const studentAttempts = attempts.filter(a => a.userId === student.uid);
        const passed = studentAttempts.filter(a => a.passed).length;
        const avgScore = studentAttempts.length > 0
          ? Math.round(studentAttempts.reduce((sum, a) => sum + a.score, 0) / studentAttempts.length)
          : 0;
        return [
          student.name || '',
          student.email || '',
          student.xp || 0,
          student.level || 1,
          student.streak || 0,
          studentAttempts.length,
          passed,
          avgScore,
          (student.badges || []).length,
          (student.enrolledCourses || []).length,
          student.lastActiveDate || 'Never',
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      await Share.share({
        message: csv,
        title:   'ZiniQuest Student Performance Export',
      });

      await hapticSuccess();
    } catch (e) {
      console.warn('Export failed:', e.message);
    } finally {
      setExporting(false);
    }
  };

  // Summary stats
  const totalStudents = students.length;
  const sevenDaysAgo  = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const atRiskCount   = students.filter(s =>
    !s.lastActiveDate || s.lastActiveDate < sevenDaysAgoStr
  ).length;
  const avgXP = totalStudents > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.xp || 0), 0) / totalStudents)
    : 0;
  const passRate = attempts.length > 0
    ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100)
    : 0;

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading student data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showModal && (
        <StudentDetailModal
          student={selectedStudent}
          attempts={selectedAttempts}
          onClose={() => setShowModal(false)}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.info}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text variant="headlineMedium" style={styles.headerTitle}>
                  Student Progress
                </Text>
                <Text variant="bodyMedium" style={styles.headerSub}>
                  Monitor and analyse student performance
                </Text>
              </View>
              {/* Export CSV button */}
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportCSV}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size={16} color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="file-export" size={18} color={colors.white} />
                    <Text variant="labelSmall" style={styles.exportBtnText}>Export CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Summary stats */}
            <View style={styles.summaryRow}>
              <StatSummaryCard
                icon="account-group"
                value={totalStudents}
                label="Students"
                color={colors.primary}
              />
              <StatSummaryCard
                icon="alert-circle"
                value={atRiskCount}
                label="At Risk"
                color={colors.error}
              />
              <StatSummaryCard
                icon="lightning-bolt"
                value={avgXP}
                label="Avg XP"
                color={colors.accent}
              />
              <StatSummaryCard
                icon="percent"
                value={`${passRate}%`}
                label="Pass Rate"
                color={colors.success}
              />
            </View>

            {/* Search */}
            <Searchbar
              placeholder="Search students..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ color: colors.textPrimary }}
              iconColor={colors.textSecondary}
              placeholderTextColor={colors.textSecondary}
              theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            />

            {students.length === 0 && (
              <Surface style={styles.emptyCard} elevation={1}>
                <MaterialCommunityIcons name="account-off" size={40} color={colors.textSecondary} />
                <Text variant="titleMedium" style={styles.emptyTitle}>No students yet</Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Students will appear here once they enrol in your courses
                </Text>
              </Surface>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <StudentCard
            student={item}
            attempts={attempts}
            onPress={handleStudentPress}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
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
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Export button
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  exportBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { fontWeight: 'bold', color: colors.textPrimary },
  summaryLabel: { color: colors.textSecondary, textAlign: 'center' },

  // Search
  searchBar: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    marginBottom: 16,
  },

  // Student card
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentCardRisk: {
    borderColor: colors.error + '44',
    backgroundColor: colors.error + '08',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfo: { flex: 1, gap: 3 },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  studentEmail: { color: colors.textSecondary },
  studentStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.error + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskText: { color: colors.error, fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    flex: 1,
  },
  modalEmail: { color: colors.textSecondary },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  modalStatItem: { alignItems: 'center', gap: 2 },
  modalStatLabel: { color: colors.textSecondary },
  attemptsTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attemptScore: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    width: 40,
  },
  attemptGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalCloseBtn: {
    backgroundColor: colors.info,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCloseBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
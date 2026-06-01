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
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { logoutUser } from '../../services/authService';
import useAuthStore from '../../store/authStore';

function StatCard({ icon, value, label, color }) {
  return (
    <Surface style={styles.statCard} elevation={2}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
      <Text variant="titleLarge" style={[styles.statValue, { color }]}>{value}</Text>
      <Text variant="labelSmall" style={styles.statLabel}>{label}</Text>
    </Surface>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuthStore();

  const [stats, setStats]           = useState({
    totalUsers: 0, totalCourses: 0,
    totalLessons: 0, totalAttempts: 0,
  });
  const [topLearners, setTopLearners]   = useState([]);
  const [recentUsers, setRecentUsers]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const loadData = async () => {
    try {
      const [usersSnap, coursesSnap, lessonsSnap, attemptsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'lessons')),
        getDocs(collection(db, 'quizAttempts')),
      ]);

      setStats({
        totalUsers:    usersSnap.size,
        totalCourses:  coursesSnap.size,
        totalLessons:  lessonsSnap.size,
        totalAttempts: attemptsSnap.size,
      });

      // Top learners by XP
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted   = [...allUsers]
        .filter(u => u.role === 'student')
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 5);
      setTopLearners(sorted);

      // Recent signups
      const recent = [...allUsers]
        .filter(u => u.createdAt)
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return bTime - aTime;
        })
        .slice(0, 5);
      setRecentUsers(recent);
    } catch (e) {
      console.warn('Failed to load admin data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const AVATAR_ICONS = {
    avatar_1: { icon: 'account-circle',     color: colors.primary },
    avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
    avatar_3: { icon: 'account-star',       color: colors.success },
    avatar_4: { icon: 'robot-excited',      color: colors.info },
    avatar_5: { icon: 'alien',              color: colors.error },
    avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
  };

  const ROLE_COLORS = {
    student:    colors.primary,
    instructor: colors.info,
    admin:      colors.error,
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.error} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.error} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="bodyMedium" style={styles.headerSub}>Admin Panel</Text>
          <Text variant="headlineSmall" style={styles.headerTitle}>ZiniQuest</Text>
        </View>
        <TouchableOpacity onPress={logoutUser} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard icon="account-group"  value={stats.totalUsers}    label="Total Users"    color={colors.primary} />
        <StatCard icon="book-multiple"  value={stats.totalCourses}  label="Courses"        color={colors.info} />
        <StatCard icon="text-box"       value={stats.totalLessons}  label="Lessons"        color={colors.success} />
        <StatCard icon="clipboard-list" value={stats.totalAttempts} label="Quiz Attempts"  color={colors.accent} />
      </View>

      {/* Quick nav */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Management</Text>
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navCard, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('ManageUsers')}
        >
          <MaterialCommunityIcons name="account-cog" size={32} color={colors.primary} />
          <Text variant="labelLarge" style={[styles.navCardText, { color: colors.primary }]}>
            Manage Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navCard, { borderColor: colors.info }]}
          onPress={() => navigation.navigate('ManageContent')}
        >
          <MaterialCommunityIcons name="book-edit" size={32} color={colors.info} />
          <Text variant="labelLarge" style={[styles.navCardText, { color: colors.info }]}>
            Manage Content
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top learners */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Top Learners</Text>
      <Surface style={styles.listCard} elevation={1}>
        {topLearners.length === 0 ? (
          <Text variant="bodySmall" style={styles.emptyText}>No student data yet</Text>
        ) : topLearners.map((u, i) => {
          const avatarMeta = AVATAR_ICONS[u.avatar] || AVATAR_ICONS.avatar_1;
          return (
            <View key={u.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.userRow}>
                <Text variant="labelLarge" style={styles.rankNum}>#{i + 1}</Text>
                <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22' }]}>
                  <MaterialCommunityIcons name={avatarMeta.icon} size={22} color={avatarMeta.color} />
                </View>
                <View style={styles.userInfo}>
                  <Text variant="bodyMedium" style={styles.userName} numberOfLines={1}>{u.name}</Text>
                  <Text variant="labelSmall" style={styles.userMeta}>Level {u.level || 1}</Text>
                </View>
                <View style={styles.xpPill}>
                  <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.accent} />
                  <Text variant="labelMedium" style={styles.xpText}>{u.xp || 0}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </Surface>

      {/* Recent signups */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Recent Signups</Text>
      <Surface style={styles.listCard} elevation={1}>
        {recentUsers.length === 0 ? (
          <Text variant="bodySmall" style={styles.emptyText}>No users yet</Text>
        ) : recentUsers.map((u, i) => {
          const avatarMeta  = AVATAR_ICONS[u.avatar] || AVATAR_ICONS.avatar_1;
          const roleColor   = ROLE_COLORS[u.role]    || colors.textSecondary;
          return (
            <View key={u.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.userRow}>
                <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22' }]}>
                  <MaterialCommunityIcons name={avatarMeta.icon} size={22} color={avatarMeta.color} />
                </View>
                <View style={styles.userInfo}>
                  <Text variant="bodyMedium" style={styles.userName} numberOfLines={1}>{u.name}</Text>
                  <Text variant="labelSmall" style={styles.userMeta} numberOfLines={1}>{u.email}</Text>
                </View>
                <View style={[styles.rolePill, { backgroundColor: roleColor + '22' }]}>
                  <Text variant="labelSmall" style={[styles.roleText, { color: roleColor }]}>
                    {u.role}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </Surface>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  centred: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerSub: { color: colors.error, fontWeight: 'bold' },
  headerTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: colors.error + '11', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: colors.error + '33' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontWeight: 'bold', color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { color: colors.textPrimary, fontWeight: 'bold', marginBottom: 12 },
  navRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  navCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1.5 },
  navCardText: { fontWeight: 'bold', textAlign: 'center' },
  listCard: { backgroundColor: colors.card, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  rankNum: { color: colors.accent, fontWeight: 'bold', width: 24 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { color: colors.textPrimary, fontWeight: '600' },
  userMeta: { color: colors.textSecondary },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accent + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  xpText: { color: colors.accent, fontWeight: 'bold' },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontWeight: 'bold', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: 16 },
});
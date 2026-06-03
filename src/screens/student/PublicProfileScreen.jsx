import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getUserProfile } from '../../services/userService';
import { getCompletedLessons } from '../../services/lessonService';
import { getQuizAttempts } from '../../services/quizService';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AVATAR_ICONS = {
  avatar_1: { icon: 'account-circle',     color: colors.primary },
  avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
  avatar_3: { icon: 'account-star',       color: colors.success },
  avatar_4: { icon: 'robot-excited',      color: colors.info },
  avatar_5: { icon: 'alien',              color: colors.error },
  avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
};

const LEVEL_TITLES = [
  'Newbie','Apprentice','Coder','Developer','Engineer',
  'Architect','Senior Dev','Tech Lead','Principal','Code Legend',
];

const ALL_BADGES = [
  { id: 'first_step',      name: 'First Step',      icon: 'shoe-print',        color: colors.primary },
  { id: 'quiz_crusher',    name: 'Quiz Crusher',    icon: 'lightning-bolt',    color: colors.accent },
  { id: 'perfectionist',   name: 'Perfectionist',   icon: 'star-circle',       color: colors.accent },
  { id: 'on_fire',         name: 'On Fire',         icon: 'fire',              color: '#EA580C' },
  { id: 'unstoppable',     name: 'Unstoppable',     icon: 'weather-hurricane', color: colors.error },
  { id: 'speed_learner',   name: 'Speed Learner',   icon: 'rocket-launch',     color: colors.info },
  { id: 'module_master',   name: 'Module Master',   icon: 'book-open-variant', color: colors.primary },
  { id: 'course_champion', name: 'Course Champion', icon: 'trophy',            color: colors.accent },
  { id: 'early_bird',      name: 'Early Bird',      icon: 'weather-sunset-up', color: '#F59E0B' },
  { id: 'night_owl',       name: 'Night Owl',       icon: 'owl',               color: '#8B5CF6' },
  { id: 'top_10',          name: 'Top 10',          icon: 'medal',             color: colors.accent },
  { id: 'code_veteran',    name: 'Code Veteran',    icon: 'shield-star',       color: colors.primary },
];

function StatItem({ icon, value, label, color }) {
  return (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text variant="titleMedium" style={[styles.statValue, { color }]}>{value}</Text>
      <Text variant="labelSmall" style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PublicProfileScreen({ route, navigation }) {
  const { userId, userName } = route.params;

  const [profile, setProfile]             = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [passedCount, setPassedCount]     = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, completedLessons] = await Promise.all([
          getUserProfile(userId),
          getCompletedLessons(userId),
        ]);
        setProfile(profileData);
        setCompletedCount(completedLessons.length);

        // Get passed quiz count
        const attemptsSnap = await getDocs(
          query(
            collection(db, 'quizAttempts'),
            where('userId', '==', userId),
            where('passed', '==', true)
          )
        );
        setPassedCount(attemptsSnap.size);
      } catch (e) {
        console.warn('Failed to load public profile:', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centred}>
        <MaterialCommunityIcons name="account-off" size={48} color={colors.textSecondary} />
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          Profile not found
        </Text>
      </View>
    );
  }

  const avatarMeta   = AVATAR_ICONS[profile.avatar] || AVATAR_ICONS.avatar_1;
  const levelTitle   = LEVEL_TITLES[(profile.level || 1) - 1] || 'Newbie';
  const earnedBadges = profile.badges || [];
  const memberSince  = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Recently';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Profile card */}
      <Surface style={styles.profileCard} elevation={3}>
        <View style={[styles.avatarCircle, {
          backgroundColor: avatarMeta.color + '22',
          borderColor: avatarMeta.color,
        }]}>
          <MaterialCommunityIcons name={avatarMeta.icon} size={64} color={avatarMeta.color} />
        </View>

        <Text variant="headlineSmall" style={styles.profileName}>{profile.name}</Text>

        <View style={styles.levelBadge}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={colors.accent} />
          <Text variant="labelMedium" style={styles.levelBadgeText}>
            Level {profile.level} · {levelTitle}
          </Text>
        </View>

        <Text variant="labelSmall" style={styles.memberSince}>
          Member since {memberSince}
        </Text>
      </Surface>

      {/* Stats */}
      <Surface style={styles.statsCard} elevation={2}>
        <StatItem icon="lightning-bolt"   value={profile.xp || 0}    label="Total XP"  color={colors.accent} />
        <View style={styles.statDivider} />
        <StatItem icon="fire"             value={profile.streak || 0} label="Streak"   color="#EA580C" />
        <View style={styles.statDivider} />
        <StatItem icon="book-open-check"  value={completedCount}      label="Lessons"  color={colors.primary} />
        <View style={styles.statDivider} />
        <StatItem icon="clipboard-check"  value={passedCount}         label="Quizzes"  color={colors.success} />
      </Surface>

      {/* Badges */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Badges ({earnedBadges.length}/{ALL_BADGES.length})
      </Text>

      {earnedBadges.length === 0 ? (
        <Surface style={styles.emptyBadgeCard} elevation={1}>
          <MaterialCommunityIcons name="trophy-outline" size={36} color={colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.emptyBadgeText}>
            No badges earned yet
          </Text>
        </Surface>
      ) : (
        <View style={styles.badgeGrid}>
          {ALL_BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <Surface
                key={badge.id}
                style={[styles.badgeCard, earned && styles.badgeCardEarned]}
                elevation={earned ? 2 : 1}
              >
                <View style={[styles.badgeIconBg, {
                  backgroundColor: earned ? badge.color + '22' : colors.border + '44',
                }]}>
                  <MaterialCommunityIcons
                    name={badge.icon}
                    size={28}
                    color={earned ? badge.color : colors.textSecondary}
                    style={!earned && { opacity: 0.35 }}
                  />
                  {!earned && (
                    <View style={styles.lockOverlay}>
                      <MaterialCommunityIcons name="lock" size={11} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                <Text
                  variant="labelSmall"
                  style={[styles.badgeName, { color: earned ? colors.textPrimary : colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
              </Surface>
            );
          })}
        </View>
      )}

      {/* Subject interests */}
      {profile.subjectInterests?.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsRow}>
            {profile.subjectInterests.map(subj => (
              <View key={subj} style={styles.interestChip}>
                <Text variant="labelSmall" style={styles.interestText}>
                  {subj.charAt(0).toUpperCase() + subj.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const CARD_SIZE = (Dimensions => {
  const { width } = Dimensions;
  return (width - 40 - 24) / 3;
})(require('react-native').Dimensions.get('window'));

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

  // Profile card
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent + '22',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },
  levelBadgeText: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  memberSince: {
    color: colors.textSecondary,
  },

  // Stats
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontWeight: 'bold' },
  statLabel: { color: colors.textSecondary, textAlign: 'center' },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Section title
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  badgeCard: {
    width: CARD_SIZE,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeCardEarned: {
    borderColor: colors.primary + '44',
  },
  badgeIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeName: {
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
    fontSize: 10,
  },
  emptyBadgeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBadgeText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Interests
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interestChip: {
    backgroundColor: colors.primary + '22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  interestText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
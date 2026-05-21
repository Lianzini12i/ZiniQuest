import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import useUserStore from '../../store/userStore';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48 - 24) / 3;

const ALL_BADGES = [
  {
    id:          'first_step',
    name:        'First Step',
    description: 'Complete your very first lesson',
    icon:        'shoe-print',
    color:       colors.primary,
    criteria:    'Complete 1 lesson',
  },
  {
    id:          'quiz_crusher',
    name:        'Quiz Crusher',
    description: 'Pass 10 quizzes across any course',
    icon:        'lightning-bolt',
    color:       colors.accent,
    criteria:    'Pass 10 quizzes',
  },
  {
    id:          'perfectionist',
    name:        'Perfectionist',
    description: 'Score 100% on any quiz',
    icon:        'star-circle',
    color:       colors.accent,
    criteria:    'Score 100% on a quiz',
  },
  {
    id:          'on_fire',
    name:        'On Fire',
    description: 'Maintain a 7-day learning streak',
    icon:        'fire',
    color:       '#EA580C',
    criteria:    '7-day streak',
  },
  {
    id:          'unstoppable',
    name:        'Unstoppable',
    description: 'Maintain a 30-day learning streak',
    icon:        'weather-hurricane',
    color:       colors.error,
    criteria:    '30-day streak',
  },
  {
    id:          'speed_learner',
    name:        'Speed Learner',
    description: 'Complete 3 lessons in a single day',
    icon:        'rocket-launch',
    color:       colors.info,
    criteria:    '3 lessons in one day',
  },
  {
    id:          'module_master',
    name:        'Module Master',
    description: 'Complete all lessons in any module',
    icon:        'book-open-variant',
    color:       colors.primary,
    criteria:    'Complete a full module',
  },
  {
    id:          'course_champion',
    name:        'Course Champion',
    description: 'Complete all modules in any course',
    icon:        'trophy',
    color:       colors.accent,
    criteria:    'Complete a full course',
  },
  {
    id:          'early_bird',
    name:        'Early Bird',
    description: 'Complete a lesson before 8 AM',
    icon:        'weather-sunset-up',
    color:       '#F59E0B',
    criteria:    'Study before 8 AM',
  },
  {
    id:          'night_owl',
    name:        'Night Owl',
    description: 'Complete a lesson after 10 PM',
    icon:        'owl',
    color:       '#8B5CF6',
    criteria:    'Study after 10 PM',
  },
  {
    id:          'top_10',
    name:        'Top 10',
    description: 'Appear in the top 10 of any course leaderboard',
    icon:        'medal',
    color:       colors.accent,
    criteria:    'Reach top 10 on a leaderboard',
  },
  {
    id:          'code_veteran',
    name:        'Code Veteran',
    description: 'Complete 50 lessons across any subjects',
    icon:        'shield-star',
    color:       colors.primary,
    criteria:    'Complete 50 lessons total',
  },
];

function BadgeCard({ badge, earned, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.badgeCard, earned && styles.badgeCardEarned]}
      onPress={() => onPress(badge)}
      activeOpacity={0.8}
    >
      <View style={[styles.badgeIconBg, {
        backgroundColor: earned ? badge.color + '22' : colors.border + '44',
      }]}>
        <MaterialCommunityIcons
          name={badge.icon}
          size={32}
          color={earned ? badge.color : colors.textSecondary}
          style={!earned && styles.lockedIcon}
        />
        {!earned && (
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons name="lock" size={14} color={colors.textSecondary} />
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
      {earned && (
        <View style={[styles.earnedDot, { backgroundColor: badge.color }]} />
      )}
    </TouchableOpacity>
  );
}

function BadgeModal({ badge, earned, visible, onClose }) {
  if (!badge) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Surface style={styles.modalCard} elevation={5}>
          {/* Badge icon */}
          <View style={[styles.modalIconBg, {
            backgroundColor: earned ? badge.color + '22' : colors.border,
          }]}>
            <MaterialCommunityIcons
              name={badge.icon}
              size={64}
              color={earned ? badge.color : colors.textSecondary}
            />
          </View>

          {/* Status chip */}
          <View style={[styles.statusChip, {
            backgroundColor: earned ? colors.success + '22' : colors.border,
          }]}>
            <MaterialCommunityIcons
              name={earned ? 'check-circle' : 'lock'}
              size={14}
              color={earned ? colors.success : colors.textSecondary}
            />
            <Text variant="labelSmall" style={{
              color: earned ? colors.success : colors.textSecondary,
              fontWeight: 'bold',
            }}>
              {earned ? 'EARNED' : 'LOCKED'}
            </Text>
          </View>

          <Text variant="titleLarge" style={styles.modalTitle}>{badge.name}</Text>
          <Text variant="bodyMedium" style={styles.modalDesc}>{badge.description}</Text>

          {/* Criteria */}
          <View style={styles.criteriaRow}>
            <MaterialCommunityIcons name="target" size={16} color={colors.primary} />
            <Text variant="labelMedium" style={styles.criteriaText}>
              {badge.criteria}
            </Text>
          </View>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text variant="labelLarge" style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
}

export default function BadgesScreen() {
  const { profile } = useUserStore();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);

  const earnedBadges = profile?.badges || [];
  const earnedCount  = earnedBadges.length;

  const handleBadgePress = (badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>Badges</Text>
          <Text variant="bodyMedium" style={styles.headerSub}>
            Your achievement collection
          </Text>
        </View>

        {/* Progress summary */}
        <Surface style={styles.summaryCard} elevation={2}>
          <View style={styles.summaryLeft}>
            <Text variant="displaySmall" style={styles.summaryCount}>
              {earnedCount}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              of {ALL_BADGES.length} earned
            </Text>
          </View>
          <View style={styles.summaryRight}>
            <View style={styles.summaryTrack}>
              <View style={[styles.summaryFill, {
                width: `${(earnedCount / ALL_BADGES.length) * 100}%`,
              }]} />
            </View>
            <Text variant="labelSmall" style={styles.summaryPct}>
              {Math.round((earnedCount / ALL_BADGES.length) * 100)}% complete
            </Text>
          </View>
        </Surface>

        {/* Earned section */}
        {earnedCount > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="check-decagram" size={18} color={colors.success} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Earned ({earnedCount})
              </Text>
            </View>
            <View style={styles.badgeGrid}>
              {ALL_BADGES.filter(b => earnedBadges.includes(b.id)).map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={true}
                  onPress={handleBadgePress}
                />
              ))}
            </View>
          </>
        )}

        {/* Locked section */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="lock" size={18} color={colors.textSecondary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Locked ({ALL_BADGES.length - earnedCount})
          </Text>
        </View>
        <View style={styles.badgeGrid}>
          {ALL_BADGES.filter(b => !earnedBadges.includes(b.id)).map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={false}
              onPress={handleBadgePress}
            />
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BadgeModal
        badge={selectedBadge}
        earned={selectedBadge ? earnedBadges.includes(selectedBadge.id) : false}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
    paddingBottom: 20,
  },

  // Header
  header: { marginBottom: 20 },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Summary card
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryLeft: { alignItems: 'center' },
  summaryCount: {
    color: colors.primary,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  summaryLabel: {
    color: colors.textSecondary,
  },
  summaryRight: { flex: 1, gap: 8 },
  summaryTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  summaryPct: {
    color: colors.textSecondary,
    textAlign: 'right',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  badgeCard: {
    width: CARD_SIZE,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeCardEarned: {
    borderColor: colors.primary + '44',
  },
  badgeIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockedIcon: { opacity: 0.4 },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeName: {
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },
  earnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalDesc: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '11',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  criteriaText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  modalCloseBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
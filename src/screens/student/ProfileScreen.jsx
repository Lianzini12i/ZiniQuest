import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { logoutUser } from '../../services/authService';
import { updateDisplayName, updateAvatar } from '../../services/userService';
import { setSoundEnabled } from '../../utils/soundPlayer';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/userStore';

const AVATAR_OPTIONS = [
  { key: 'avatar_1', icon: 'account-circle',     color: colors.primary },
  { key: 'avatar_2', icon: 'account-cowboy-hat', color: colors.accent },
  { key: 'avatar_3', icon: 'account-star',       color: colors.success },
  { key: 'avatar_4', icon: 'robot-excited',      color: colors.info },
  { key: 'avatar_5', icon: 'alien',              color: colors.error },
  { key: 'avatar_6', icon: 'ninja',              color: '#8B5CF6' },
];

const LEVEL_TITLES = [
  'Newbie','Apprentice','Coder','Developer','Engineer',
  'Architect','Senior Dev','Tech Lead','Principal','Code Legend',
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

function SettingRow({ icon, label, value, onPress, isSwitch, switchValue, onToggle, color, danger }) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={isSwitch}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIconBg, { backgroundColor: (color || colors.primary) + '22' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text variant="bodyMedium" style={[styles.settingLabel, danger && styles.dangerText]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value ? (
          <Text variant="labelSmall" style={styles.settingValue}>{value}</Text>
        ) : null}
        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={danger ? colors.error : colors.textSecondary}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user }    = useAuthStore();
  const { profile } = useUserStore();

  const [soundOn, setSoundOn]           = useState(true);
  const [hapticsOn, setHapticsOn]       = useState(true);
  const [notifsOn, setNotifsOn]         = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingName, setEditingName]   = useState(false);
  const [newName, setNewName]           = useState('');
  const [savingName, setSavingName]     = useState(false);
  const [loggingOut, setLoggingOut]     = useState(false);

  if (!profile) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const avatarMeta  = AVATAR_OPTIONS.find(a => a.key === profile.avatar) || AVATAR_OPTIONS[0];
  const levelTitle  = LEVEL_TITLES[(profile.level || 1) - 1] || 'Newbie';
  const memberSince = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Recently';

  const handleToggleSound = (val) => {
    setSoundOn(val);
    setSoundEnabled(val);
    hapticLight();
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === profile.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(user.uid, newName.trim());
      await hapticSuccess();
      setEditingName(false);
    } catch (e) {
      console.warn('Name update failed:', e.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarSelect = async (avatarKey) => {
    try {
      await updateAvatar(user.uid, avatarKey);
      await hapticSuccess();
      setShowAvatarPicker(false);
    } catch (e) {
      console.warn('Avatar update failed:', e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logoutUser();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <Surface style={styles.profileCard} elevation={3}>
        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => setShowAvatarPicker(!showAvatarPicker)}
        >
          <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22',
            borderColor: avatarMeta.color }]}>
            <MaterialCommunityIcons
              name={avatarMeta.icon}
              size={64}
              color={avatarMeta.color}
            />
          </View>
          <View style={styles.avatarEditBadge}>
            <MaterialCommunityIcons name="pencil" size={12} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Avatar picker */}
        {showAvatarPicker && (
          <View style={styles.avatarPicker}>
            {AVATAR_OPTIONS.map(av => (
              <TouchableOpacity
                key={av.key}
                style={[styles.avatarOption,
                  profile.avatar === av.key && styles.avatarOptionSelected,
                  { borderColor: av.color }
                ]}
                onPress={() => handleAvatarSelect(av.key)}
              >
                <MaterialCommunityIcons name={av.icon} size={32} color={av.color} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Name */}
        <Text variant="headlineSmall" style={styles.profileName}>
          {profile.name}
        </Text>
        <Text variant="bodyMedium" style={styles.profileEmail}>
          {profile.email}
        </Text>

        {/* Level badge */}
        <View style={styles.levelBadge}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={colors.accent} />
          <Text variant="labelMedium" style={styles.levelBadgeText}>
            Level {profile.level} · {levelTitle}
          </Text>
        </View>

        {/* Member since */}
        <Text variant="labelSmall" style={styles.memberSince}>
          Member since {memberSince}
        </Text>
      </Surface>

      {/* Stats */}
      <Surface style={styles.statsCard} elevation={2}>
        <StatItem
          icon="lightning-bolt"
          value={profile.xp || 0}
          label="Total XP"
          color={colors.accent}
        />
        <View style={styles.statDivider} />
        <StatItem
          icon="fire"
          value={profile.streak || 0}
          label="Day Streak"
          color="#EA580C"
        />
        <View style={styles.statDivider} />
        <StatItem
          icon="medal"
          value={profile.badges?.length || 0}
          label="Badges"
          color={colors.primary}
        />
        <View style={styles.statDivider} />
        <StatItem
          icon="book-open-variant"
          value={profile.enrolledCourses?.length || 0}
          label="Courses"
          color={colors.info}
        />
      </Surface>

      {/* Account settings */}
      <Text variant="titleSmall" style={styles.sectionLabel}>ACCOUNT</Text>
      <Surface style={styles.settingsCard} elevation={1}>
        <SettingRow
          icon="account-edit"
          label="Display Name"
          value={profile.name}
          color={colors.primary}
          onPress={() => {
            setNewName(profile.name);
            Alert.prompt(
              'Update Name',
              'Enter your new display name',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: async (text) => {
                    if (!text?.trim()) return;
                    await updateDisplayName(user.uid, text.trim());
                    await hapticSuccess();
                  },
                },
              ],
              'plain-text',
              profile.name
            );
          }}
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="email"
          label="Email"
          value={profile.email}
          color={colors.info}
          onPress={() => {}}
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="target"
          label="Daily Goal"
          value={`${profile.dailyGoalMins} min`}
          color={colors.success}
          onPress={() => {}}
        />
      </Surface>

      {/* Preferences */}
      <Text variant="titleSmall" style={styles.sectionLabel}>PREFERENCES</Text>
      <Surface style={styles.settingsCard} elevation={1}>
        <SettingRow
          icon="volume-high"
          label="Sound Effects"
          color={colors.primary}
          isSwitch
          switchValue={soundOn}
          onToggle={handleToggleSound}
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="vibrate"
          label="Haptic Feedback"
          color={colors.accent}
          isSwitch
          switchValue={hapticsOn}
          onToggle={(val) => { setHapticsOn(val); hapticLight(); }}
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="bell"
          label="Push Notifications"
          color={colors.info}
          isSwitch
          switchValue={notifsOn}
          onToggle={setNotifsOn}
        />
      </Surface>

      {/* About */}
      <Text variant="titleSmall" style={styles.sectionLabel}>ABOUT</Text>
      <Surface style={styles.settingsCard} elevation={1}>
        <SettingRow
          icon="information"
          label="App Version"
          value="1.0.0"
          color={colors.textSecondary}
          onPress={() => {}}
        />
        <View style={styles.settingDivider} />
        <SettingRow
          icon="school"
          label="Crescent University"
          value="CS Dept"
          color={colors.primary}
          onPress={() => {}}
        />
      </Surface>

      {/* Sign out */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator size={20} color={colors.error} />
        ) : (
          <>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text variant="labelLarge" style={styles.logoutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

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
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOptionSelected: {
    borderWidth: 3,
    backgroundColor: colors.card,
  },
  profileName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileEmail: {
    color: colors.textSecondary,
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
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Settings
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    color: colors.textPrimary,
  },
  dangerText: {
    color: colors.error,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    color: colors.textSecondary,
    maxWidth: 120,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.error + '11',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error + '33',
    marginBottom: 8,
  },
  logoutText: {
    color: colors.error,
    fontWeight: 'bold',
  },
});
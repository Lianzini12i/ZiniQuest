import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { SUBJECTS } from '../../constants/subjects';
import { updateOnboarding } from '../../services/userService';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import { playSound } from '../../utils/soundPlayer';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');

const AVATARS = [
  { key: 'avatar_1', icon: 'account-circle',     color: colors.primary },
  { key: 'avatar_2', icon: 'account-cowboy-hat', color: colors.accent },
  { key: 'avatar_3', icon: 'account-star',       color: colors.success },
  { key: 'avatar_4', icon: 'robot-excited',      color: colors.info },
  { key: 'avatar_5', icon: 'alien',              color: colors.error },
  { key: 'avatar_6', icon: 'ninja',              color: '#8B5CF6' },
];

const GOALS = [
  { value: 15, label: '15 min',  sub: 'Casual',   icon: 'coffee' },
  { value: 30, label: '30 min',  sub: 'Balanced',  icon: 'lightning-bolt' },
  { value: 60, label: '60 min',  sub: 'Intensive', icon: 'fire' },
];

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1');
  const [selectedGoal, setSelectedGoal] = useState(30);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSubject = async (key) => {
    await hapticLight();
    setSelectedSubjects((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const goNext = async () => {
    await hapticLight();
    await playSound('button-tap');
    setStep((s) => s + 1);
  };

  const goBack = async () => {
    await hapticLight();
    setStep((s) => s - 1);
  };

  const handleFinish = async () => {
    if (selectedSubjects.length === 0) return;
    setLoading(true);
    try {
      await updateOnboarding(user.uid, {
        avatar: selectedAvatar,
        dailyGoalMins: selectedGoal,
        subjectInterests: selectedSubjects,
      });
      await hapticSuccess();
      await playSound('app-intro');
      // AppNavigator real-time listener picks up onboardingDone: true
      // and automatically routes to StudentTabs
    } catch (e) {
      console.warn('Onboarding save failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i + 1 <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Choose Avatar ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text variant="headlineMedium" style={styles.stepTitle}>
              Choose your avatar
            </Text>
            <Text variant="bodyMedium" style={styles.stepSub}>
              Pick the one that represents you best
            </Text>

            <View style={styles.avatarGrid}>
              {AVATARS.map((av) => (
                <TouchableOpacity
                  key={av.key}
                  style={[
                    styles.avatarCard,
                    selectedAvatar === av.key && styles.avatarCardSelected,
                  ]}
                  onPress={async () => {
                    await hapticLight();
                    setSelectedAvatar(av.key);
                  }}
                >
                  <MaterialCommunityIcons
                    name={av.icon}
                    size={52}
                    color={selectedAvatar === av.key ? av.color : colors.textSecondary}
                  />
                  {selectedAvatar === av.key && (
                    <View style={styles.avatarCheckBadge}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={goNext}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Continue
            </Button>
          </View>
        )}

        {/* ── STEP 2: Daily Goal ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text variant="headlineMedium" style={styles.stepTitle}>
              Set your daily goal
            </Text>
            <Text variant="bodyMedium" style={styles.stepSub}>
              How much time can you dedicate to learning each day?
            </Text>

            <View style={styles.goalGrid}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.goalCard,
                    selectedGoal === g.value && styles.goalCardSelected,
                  ]}
                  onPress={async () => {
                    await hapticLight();
                    setSelectedGoal(g.value);
                  }}
                >
                  <MaterialCommunityIcons
                    name={g.icon}
                    size={36}
                    color={selectedGoal === g.value ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    variant="titleLarge"
                    style={[
                      styles.goalLabel,
                      selectedGoal === g.value && styles.goalLabelActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.goalSub,
                      selectedGoal === g.value && styles.goalSubActive,
                    ]}
                  >
                    {g.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              <Button
                mode="outlined"
                onPress={goBack}
                style={styles.backButton}
                labelStyle={{ color: colors.textSecondary }}
              >
                Back
              </Button>
              <Button
                mode="contained"
                onPress={goNext}
                style={styles.nextButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Continue
              </Button>
            </View>
          </View>
        )}

        {/* ── STEP 3: Choose Subjects ── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text variant="headlineMedium" style={styles.stepTitle}>
              What do you want to learn?
            </Text>
            <Text variant="bodyMedium" style={styles.stepSub}>
              Select all subjects that interest you
            </Text>

            <View style={styles.subjectGrid}>
              {SUBJECTS.map((subj) => {
                const selected = selectedSubjects.includes(subj.key);
                return (
                  <TouchableOpacity
                    key={subj.key}
                    style={[
                      styles.subjectChip,
                      selected && styles.subjectChipSelected,
                    ]}
                    onPress={() => toggleSubject(subj.key)}
                  >
                    <MaterialCommunityIcons
                      name={subj.icon}
                      size={20}
                      color={selected ? colors.white : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.subjectLabel,
                        selected && styles.subjectLabelSelected,
                      ]}
                    >
                      {subj.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedSubjects.length === 0 && (
              <Text variant="bodySmall" style={styles.subjectHint}>
                Please select at least one subject to continue
              </Text>
            )}

            <View style={styles.navRow}>
              <Button
                mode="outlined"
                onPress={goBack}
                style={styles.backButton}
                labelStyle={{ color: colors.textSecondary }}
              >
                Back
              </Button>
              <Button
                mode="contained"
                onPress={handleFinish}
                disabled={selectedSubjects.length === 0 || loading}
                loading={loading}
                style={styles.nextButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {loading ? 'Saving...' : "Let's Go!"}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSub: {
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },

  // Avatar grid
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 40,
  },
  avatarCard: {
    width: (width - 48 - 32) / 3,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft + '22',
  },
  avatarCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Goal grid
  goalGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  goalCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
  },
  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  goalLabel: {
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  goalLabelActive: {
    color: colors.primary,
  },
  goalSub: {
    color: colors.textSecondary,
  },
  goalSubActive: {
    color: colors.primary,
  },

  // Subject chips
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  subjectChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subjectLabel: {
    color: colors.textSecondary,
  },
  subjectLabelSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  subjectHint: {
    color: colors.error,
    marginBottom: 16,
  },

  // Buttons
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: colors.border,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
});
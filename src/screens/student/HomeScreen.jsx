import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Text, Surface } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getXPProgress } from "../../utils/levelCalc";
import { getCourseById } from "../../services/lessonService";
import useAuthStore from "../../store/authStore";
import useUserStore from "../../store/userStore";
import { logoutUser } from "../../services/authService";

const { width } = Dimensions.get("window");

const AVATAR_ICONS = {
  avatar_1: { icon: "account-circle", color: colors.primary },
  avatar_2: { icon: "account-cowboy-hat", color: colors.accent },
  avatar_3: { icon: "account-star", color: colors.success },
  avatar_4: { icon: "robot-excited", color: colors.info },
  avatar_5: { icon: "alien", color: colors.error },
  avatar_6: { icon: "ninja", color: "#8B5CF6" },
};

const BADGE_META = {
  first_step: { icon: "shoe-print", color: colors.primary },
  quiz_crusher: { icon: "fist", color: colors.accent },
  perfectionist: { icon: "star-circle", color: colors.accent },
  on_fire: { icon: "fire", color: "#EA580C" },
  unstoppable: { icon: "lightning-bolt", color: colors.primary },
  speed_learner: { icon: "rocket-launch", color: colors.info },
  module_master: { icon: "book-open-variant", color: colors.primary },
  course_champion: { icon: "trophy", color: colors.accent },
  early_bird: { icon: "weather-sunny", color: colors.accent },
  night_owl: { icon: "owl", color: "#8B5CF6" },
  top_10: { icon: "medal", color: colors.accent },
  code_veteran: { icon: "shield-star", color: colors.primary },
};

const LEVEL_TITLES = [
  "Newbie",
  "Apprentice",
  "Coder",
  "Developer",
  "Engineer",
  "Architect",
  "Senior Dev",
  "Tech Lead",
  "Principal",
  "Code Legend",
];

function XPBar({ xp }) {
  const { current, nextLevel, progress, xpIntoLevel, xpNeeded } =
    getXPProgress(xp);
  return (
    <View style={styles.xpBarContainer}>
      <View style={styles.xpBarRow}>
        <Text variant="labelMedium" style={styles.xpLabel}>
          Level {current.level} — {current.title}
        </Text>
        <Text variant="labelMedium" style={styles.xpNumbers}>
          {xpIntoLevel} / {xpNeeded} XP
        </Text>
      </View>
      <View style={styles.xpTrack}>
        <View
          style={[
            styles.xpFill,
            { width: `${Math.min(progress * 100, 100)}%` },
          ]}
        />
      </View>
      {nextLevel && (
        <Text variant="labelSmall" style={styles.xpNext}>
          {xpNeeded - xpIntoLevel} XP to {nextLevel.title}
        </Text>
      )}
    </View>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <Surface style={styles.statCard} elevation={2}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
      <Text variant="titleLarge" style={[styles.statValue, { color }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={styles.statLabel}>
        {label}
      </Text>
    </Surface>
  );
}

function GoalRing({ dailyGoalMins, minsToday }) {
  const progress  = Math.min(minsToday / dailyGoalMins, 1);
  const achieved  = progress >= 1;
  const ringColor = achieved ? colors.success : colors.primary;

  return (
    <View style={styles.goalRingContainer}>
      <View style={[styles.goalRingOuter, {
        borderColor: ringColor,
        backgroundColor: ringColor + '22',
      }]}>
        <View style={styles.goalRingInner}>
          <Text variant="titleMedium" style={[styles.goalRingValue, { color: ringColor }]}>
            {minsToday}
          </Text>
          <Text variant="labelSmall" style={styles.goalRingLabel}>
            / {dailyGoalMins}m
          </Text>
        </View>
      </View>
      <Text variant="labelSmall" style={[styles.goalRingTitle, achieved && { color: colors.success }]}>
        {achieved ? 'Goal Met! 🎉' : 'Daily Goal'}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const { profile } = useUserStore();
  const [greeting, setGreeting] = useState("");
  const [enrolledCourseTitles, setEnrolledCourseTitles] = useState({});
  const [minsToday, setMinsToday] = useState(0);

useEffect(() => {
  if (!user) return;
  const calcTodayMins = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snap  = await getDocs(
        query(
          collection(db, 'lessonProgress'),
          where('userId',    '==', user.uid),
          where('completed', '==', true)
        )
      );

      // Count lessons completed today and sum their estimated times
      const todayLessons = snap.docs.filter(d => {
        const ts = d.data().completedAt;
        if (!ts) return false;
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toISOString().split('T')[0] === today;
      });

      // Fetch lesson details to get estimatedMins for each
      const lessonIds = todayLessons.map(d => d.data().lessonId);
      let totalMins   = 0;

      await Promise.all(
        lessonIds.map(async (lessonId) => {
          const { getDoc, doc } = await import('firebase/firestore');
          const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
          if (lessonSnap.exists()) {
            totalMins += lessonSnap.data().estimatedMins || 5;
          }
        })
      );

      setMinsToday(totalMins);
    } catch (e) {
      console.warn('Failed to calc today mins:', e.message);
    }
  };
  calcTodayMins();
}, [user, profile?.xp]); // Recalculate when XP changes (lesson completed)

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!profile?.enrolledCourses?.length) return;
    const fetchTitles = async () => {
      const map = {};
      await Promise.all(
        profile.enrolledCourses.map(async (id) => {
          const course = await getCourseById(id);
          if (course) map[id] = course.title;
        }),
      );
      setEnrolledCourseTitles(map);
    };
    fetchTitles();
  }, [profile?.enrolledCourses]);

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons
          name="loading"
          size={40}
          color={colors.primary}
        />
      </View>
    );
  }

  const avatarMeta = AVATAR_ICONS[profile.avatar] || AVATAR_ICONS.avatar_1;
  const latestBadge =
    profile.badges?.length > 0
      ? profile.badges[profile.badges.length - 1]
      : null;
  const badgeMeta = latestBadge ? BADGE_META[latestBadge] : null;
  const levelTitle = LEVEL_TITLES[(profile.level || 1) - 1] || "Newbie";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="bodyMedium" style={styles.greetingText}>
            {greeting},
          </Text>
          <Text variant="headlineSmall" style={styles.nameText}>
            {profile.name?.split(" ")[0]} 👋
          </Text>
          <View style={styles.levelBadge}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={12}
              color={colors.accent}
            />
            <Text variant="labelSmall" style={styles.levelBadgeText}>
              {" "}
              Level {profile.level || 1} · {levelTitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <MaterialCommunityIcons
            name={avatarMeta.icon}
            size={52}
            color={avatarMeta.color}
          />
        </TouchableOpacity>
      </View>

      {/* XP Bar */}
      <Surface style={styles.xpCard} elevation={2}>
        <XPBar xp={profile.xp || 0} />
      </Surface>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          icon="fire"
          value={profile.streak || 0}
          label="Day Streak"
          color="#EA580C"
        />
        <StatCard
          icon="lightning-bolt"
          value={profile.xp || 0}
          label="Total XP"
          color={colors.accent}
        />
        <StatCard
          icon="medal"
          value={profile.badges?.length || 0}
          label="Badges"
          color={colors.primary}
        />
      </View>

      {/* Daily Goal + Latest Badge */}
      <View style={styles.goalBadgeRow}>
        <Surface style={styles.goalCard} elevation={2}>
          <GoalRing dailyGoalMins={profile.dailyGoalMins || 30} minsToday={minsToday} />
        </Surface>

        <Surface style={styles.latestBadgeCard} elevation={2}>
          {badgeMeta ? (
            <>
              <MaterialCommunityIcons
                name={badgeMeta.icon}
                size={40}
                color={badgeMeta.color}
              />
              <Text variant="labelMedium" style={styles.latestBadgeTitle}>
                Latest Badge
              </Text>
              <Text variant="labelSmall" style={styles.latestBadgeName}>
                {latestBadge?.replace(/_/g, " ")}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text variant="labelMedium" style={styles.latestBadgeTitle}>
                No badges yet
              </Text>
              <Text variant="labelSmall" style={styles.latestBadgeName}>
                Complete a lesson!
              </Text>
            </>
          )}
        </Surface>
      </View>

      {/* My Courses */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          My Courses
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Learn")}>
          <Text variant="labelMedium" style={styles.seeAll}>
            Browse all →
          </Text>
        </TouchableOpacity>
      </View>

      {profile.enrolledCourses?.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.coursesRow}
        >
          {profile.enrolledCourses.map((courseId) => (
            <Surface key={courseId} style={styles.courseChip} elevation={2}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={20}
                color={colors.primary}
              />
              <Text
                variant="labelMedium"
                style={styles.courseChipText}
                numberOfLines={1}
              >
                {enrolledCourseTitles[courseId] || "..."}
              </Text>
            </Surface>
          ))}
        </ScrollView>
      ) : (
        <Surface style={styles.emptyCoursesCard} elevation={1}>
          <MaterialCommunityIcons
            name="book-plus"
            size={32}
            color={colors.textSecondary}
          />
          <Text variant="bodyMedium" style={styles.emptyCoursesText}>
            You haven't enrolled in any courses yet
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Learn")}>
            <Text variant="labelMedium" style={styles.emptyCoursesLink}>
              Browse courses →
            </Text>
          </TouchableOpacity>
        </Surface>
      )}

      {/* Subject Interests */}
      {profile.subjectInterests?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Your Interests
            </Text>
          </View>
          <View style={styles.interestsRow}>
            {profile.subjectInterests.map((subj) => (
              <View key={subj} style={styles.interestChip}>
                <Text variant="labelSmall" style={styles.interestText}>
                  {subj.charAt(0).toUpperCase() + subj.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 24 }} />
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerLeft: { flex: 1 },
  greetingText: { color: colors.textSecondary },
  nameText: {
    color: colors.textPrimary,
    fontWeight: "bold",
    marginBottom: 6,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelBadgeText: { color: colors.accent, fontWeight: "bold" },
  avatarButton: { padding: 4 },

  xpCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xpBarContainer: {},
  xpBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  xpLabel: { color: colors.textPrimary, fontWeight: "bold" },
  xpNumbers: { color: colors.accent, fontWeight: "bold" },
  xpTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  xpFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  xpNext: { color: colors.textSecondary, textAlign: "right" },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontWeight: "bold", color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, textAlign: "center" },

  goalBadgeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  goalCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalRingContainer: { alignItems: "center", gap: 8 },
  goalRingOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 8,
  },
  goalRingInner: { alignItems: "center" },
  goalRingValue: { color: colors.primary, fontWeight: "bold" },
  goalRingLabel: { color: colors.textSecondary },
  goalRingTitle: { color: colors.textSecondary },

  latestBadgeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  latestBadgeTitle: { color: colors.textSecondary },
  latestBadgeName: {
    color: colors.textPrimary,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "capitalize",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: colors.textPrimary, fontWeight: "bold" },
  seeAll: { color: colors.primary },

  coursesRow: { marginBottom: 24 },
  courseChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseChipText: { color: colors.textPrimary, maxWidth: 120 },

  emptyCoursesCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCoursesText: { color: colors.textSecondary, textAlign: "center" },
  emptyCoursesLink: { color: colors.primary, fontWeight: "bold" },

  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  interestChip: {
    backgroundColor: colors.primary + "22",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  interestText: { color: colors.primary, fontWeight: "bold" },
});

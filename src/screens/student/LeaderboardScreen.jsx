import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import useAuthStore from '../../store/authStore';
import useUserStore from '../../store/userStore';

const AVATAR_ICONS = {
  avatar_1: { icon: 'account-circle',     color: colors.primary },
  avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
  avatar_3: { icon: 'account-star',       color: colors.success },
  avatar_4: { icon: 'robot-excited',      color: colors.info },
  avatar_5: { icon: 'alien',              color: colors.error },
  avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
};

const RANK_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const LEVEL_TITLES = [
  'Newbie','Apprentice','Coder','Developer','Engineer',
  'Architect','Senior Dev','Tech Lead','Principal','Code Legend',
];

function RankBadge({ rank }) {
  const color = RANK_COLORS[rank];
  if (color) {
    return (
      <View style={[styles.rankBadge, { backgroundColor: color + '22', borderColor: color }]}>
        <MaterialCommunityIcons
          name={rank === 1 ? 'crown' : 'medal'}
          size={16}
          color={color}
        />
        <Text style={[styles.rankText, { color }]}>#{rank}</Text>
      </View>
    );
  }
  return (
    <View style={styles.rankBadgeDefault}>
      <Text style={styles.rankTextDefault}>#{rank}</Text>
    </View>
  );
}

function LeaderboardItem({ entry, isCurrentUser, rank }) {
  const avatarMeta = AVATAR_ICONS[entry.avatar] || AVATAR_ICONS.avatar_1;
  const levelTitle = LEVEL_TITLES[(entry.level || 1) - 1] || 'Newbie';

  return (
    <Surface style={[
      styles.itemCard,
      isCurrentUser && styles.itemCardSelf,
      rank <= 3 && styles.itemCardTop,
    ]} elevation={isCurrentUser ? 3 : 1}>
      <RankBadge rank={rank} />
      <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22' }]}>
        <MaterialCommunityIcons
          name={avatarMeta.icon}
          size={30}
          color={avatarMeta.color}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text variant="bodyLarge" style={[
          styles.itemName,
          isCurrentUser && styles.itemNameSelf,
        ]} numberOfLines={1}>
          {entry.name} {isCurrentUser ? '(You)' : ''}
        </Text>
        <Text variant="labelSmall" style={styles.itemLevel}>
          Level {entry.level} · {levelTitle}
        </Text>
      </View>
      <View style={styles.itemXP}>
        <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.accent} />
        <Text variant="titleSmall" style={styles.itemXPText}>
          {entry.courseXP || entry.weeklyXP || 0}
        </Text>
        <Text variant="labelSmall" style={styles.itemXPLabel}>XP</Text>
      </View>
    </Surface>
  );
}

function TopThreePodium({ entries, currentUserId, navigation }) {
  if (entries.length < 1) return null;
  const first  = entries[0];
  const second = entries[1];
  const third  = entries[2];

  const PodiumItem = ({ entry, rank, height }) => {
    if (!entry) return <View style={{ flex: 1 }} />;
    const avatarMeta = AVATAR_ICONS[entry.avatar] || AVATAR_ICONS.avatar_1;
    const color      = RANK_COLORS[rank];
    const isSelf     = entry.userId === currentUserId;
    return (
  <TouchableOpacity
    style={styles.podiumItem}
    onPress={() => {
      if (!isSelf && entry.userId) {
        hapticLight();
        navigation.navigate('PublicProfile', {
          userId: entry.userId,
          userName: entry.name,
        });
      }
    }}
    activeOpacity={isSelf ? 1 : 0.7}
  >
      <View style={styles.podiumItem}>
        <View style={[styles.podiumAvatar, { borderColor: color }]}>
          <MaterialCommunityIcons name={avatarMeta.icon} size={28} color={avatarMeta.color} />
          {isSelf && <View style={styles.podiumSelfDot} />}
        </View>
        <Text variant="labelSmall" style={styles.podiumName} numberOfLines={1}>
          {isSelf ? 'You' : entry.name?.split(' ')[0]}
        </Text>
        <Text variant="labelSmall" style={[styles.podiumXP, { color }]}>
          {entry.courseXP || entry.weeklyXP || 0} XP
        </Text>
        <View style={[styles.podiumBlock, { height, backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.podiumRank, { color }]}>#{rank}</Text>
        </View>
      </View>
  </TouchableOpacity>  
  );
  };

  return (
    <View style={styles.podium}>
      <PodiumItem entry={second} rank={2} height={70} />
      <PodiumItem entry={first}  rank={1} height={100} />
      <PodiumItem entry={third}  rank={3} height={50} />
    </View>
  );
}

export default function LeaderboardScreen() {
  const { user }    = useAuthStore();
  const { profile } = useUserStore();

  const [activeTab, setActiveTab]       = useState('allTime');
  const [activeCourse, setActiveCourse] = useState(null);
  const [leaderboard, setLeaderboard]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [courseNames, setCourseNames]   = useState({});
  const [userRank, setUserRank]         = useState(null);

  const enrolledCourses = profile?.enrolledCourses || [];

  useEffect(() => {
    const loadNames = async () => {
      const names = {};
      await Promise.all(
        enrolledCourses.map(async (id) => {
          const snap = await getDoc(doc(db, 'courses', id));
          if (snap.exists()) names[id] = snap.data().title;
        })
      );
      setCourseNames(names);
      if (enrolledCourses.length > 0 && !activeCourse) {
        setActiveCourse(enrolledCourses[0]);
      }
    };
    if (enrolledCourses.length > 0) loadNames();
    else setLoading(false);
  }, [enrolledCourses]);

  useEffect(() => {
    if (!activeCourse) return;
    loadLeaderboard();
  }, [activeCourse, activeTab]);

  const loadLeaderboard = async () => {
    if (!activeCourse) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'courseLeaderboard', activeCourse));
      if (snap.exists()) {
        const data    = snap.data();
        const entries = activeTab === 'allTime' ? data.allTime : data.weekly;
        setLeaderboard(entries || []);
        const rank = (entries || []).findIndex(e => e.userId === user.uid);
        setUserRank(rank >= 0 ? rank + 1 : null);
      } else {
        setLeaderboard([]);
        setUserRank(null);
      }
    } catch (e) {
      console.warn('Failed to load leaderboard:', e.message);
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const topThree   = leaderboard.slice(0, 3);
  const restOfList = leaderboard.slice(3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Leaderboard</Text>
        <Text variant="bodyMedium" style={styles.headerSub}>
          Course rankings — updated nightly
        </Text>
      </View>

      {/* Course selector */}
      {enrolledCourses.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.courseChips}
        >
          {enrolledCourses.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.courseChip, activeCourse === item && styles.courseChipActive]}
              onPress={() => setActiveCourse(item)}
            >
              <Text
                variant="labelMedium"
                style={[
                  styles.courseChipText,
                  activeCourse === item && styles.courseChipTextActive,
                ]}
                numberOfLines={1}
              >
                {courseNames[item] || '...'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {['allTime', 'weekly'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialCommunityIcons
              name={tab === 'allTime' ? 'trophy' : 'calendar-week'}
              size={16}
              color={activeTab === tab ? colors.white : colors.textSecondary}
            />
            <Text variant="labelMedium" style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive,
            ]}>
              {tab === 'allTime' ? 'All Time' : 'This Week'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Your rank pill */}
      {userRank && (
        <Surface style={styles.yourRankPill} elevation={2}>
          <MaterialCommunityIcons name="account-star" size={18} color={colors.primary} />
          <Text variant="labelLarge" style={styles.yourRankText}>
            Your rank: #{userRank}
          </Text>
        </Surface>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>Loading rankings...</Text>
        </View>
      ) : enrolledCourses.length === 0 ? (
        <View style={styles.centred}>
          <MaterialCommunityIcons name="trophy-outline" size={56} color={colors.textSecondary} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No courses yet</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Enrol in a course to see its leaderboard
          </Text>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.centred}>
          <MaterialCommunityIcons name="chart-bar" size={56} color={colors.textSecondary} />
          <Text variant="titleMedium" style={styles.emptyTitle}>No rankings yet</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Complete lessons to appear on the leaderboard.{'\n'}
            Rankings update nightly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={restOfList}
          keyExtractor={(item, i) => item.userId || String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <TopThreePodium entries={topThree} currentUserId={user.uid} navigation={navigation} />
          }
renderItem={({ item, index }) => (
  <TouchableOpacity
    onPress={() => {
      if (item.userId !== user.uid) {
        hapticLight();
        navigation.navigate('PublicProfile', {
          userId: item.userId,
          userName: item.name,
        });
      }
    }}
    activeOpacity={item.userId === user.uid ? 1 : 0.7}
  >
    <LeaderboardItem
      entry={item}
      rank={index + 4}
      isCurrentUser={item.userId === user.uid}
    />
  </TouchableOpacity>
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
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  courseChips: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  courseChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  courseChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  courseChipText: {
    color: colors.textSecondary,
  },
  courseChipTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  yourRankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '11',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  yourRankText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  podiumSelfDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  podiumName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  podiumXP: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  podiumBlock: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 8,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  loadingText: { color: colors.textSecondary },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardSelf: {
    borderColor: colors.primary + '66',
    backgroundColor: colors.primary + '11',
  },
  itemCardTop: {
    borderColor: colors.accent + '44',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 46,
    justifyContent: 'center',
  },
  rankText: { fontWeight: 'bold', fontSize: 12 },
  rankBadgeDefault: {
    minWidth: 46,
    alignItems: 'center',
  },
  rankTextDefault: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemNameSelf: { color: colors.primary },
  itemLevel: { color: colors.textSecondary, marginTop: 2 },
  itemXP: {
    alignItems: 'center',
    gap: 2,
  },
  itemXPText: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  itemXPLabel: { color: colors.textSecondary },
});
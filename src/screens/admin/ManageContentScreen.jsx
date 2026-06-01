import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { hapticSuccess, hapticError, hapticLight } from '../../utils/haptics';

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

const TABS = ['courses', 'lessons'];

export default function ManageContentScreen({ navigation }) {
  const [activeTab, setActiveTab]   = useState('courses');
  const [courses, setCourses]       = useState([]);
  const [lessons, setLessons]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = async () => {
    try {
      const [coursesSnap, lessonsSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'lessons')),
      ]);
      const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const lessonsData = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(coursesData);
      setLessons(lessonsData);
      setFiltered(activeTab === 'courses' ? coursesData : lessonsData);
    } catch (e) {
      console.warn('Failed to load content:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const data = activeTab === 'courses' ? courses : lessons;
    if (!searchQuery.trim()) {
      setFiltered(data);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFiltered(data.filter(item => item.title?.toLowerCase().includes(q)));
  }, [searchQuery, activeTab, courses, lessons]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleTogglePublish = async (item, type) => {
    setUpdatingId(item.id);
    try {
      await updateDoc(doc(db, type, item.id), { published: !item.published });
      const update = (prev) => prev.map(i => i.id === item.id ? { ...i, published: !i.published } : i);
      if (type === 'courses') setCourses(update);
      else setLessons(update);
      await hapticSuccess();
    } catch (e) {
      await hapticError();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (item, type) => {
    Alert.alert(
      'Delete Content',
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(item.id);
            try {
              await deleteDoc(doc(db, type, item.id));
              const remove = (prev) => prev.filter(i => i.id !== item.id);
              if (type === 'courses') setCourses(remove);
              else setLessons(remove);
              await hapticSuccess();
            } catch (e) {
              await hapticError();
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderCourse = ({ item }) => {
    const subjectColor = SUBJECT_COLORS[item.subject] || colors.primary;
    const isUpdating   = updatingId === item.id;

    return (
      <Surface style={styles.itemCard} elevation={2}>
        <View style={[styles.colorBar, { backgroundColor: subjectColor }]} />
        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <View style={styles.itemInfo}>
              <Text variant="titleSmall" style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="labelSmall" style={styles.itemMeta}>
                {item.subject} · {item.enrollmentCount || 0} enrolled
              </Text>
            </View>
            <View style={[styles.publishBadge, {
              backgroundColor: item.published ? colors.success + '22' : colors.accent + '22',
            }]}>
              <Text variant="labelSmall" style={{
                color: item.published ? colors.success : colors.accent,
                fontWeight: 'bold',
              }}>
                {item.published ? 'Live' : 'Draft'}
              </Text>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.itemActionBtn, { borderColor: item.published ? colors.accent : colors.success }]}
              onPress={() => { hapticLight(); handleTogglePublish(item, 'courses'); }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size={14} color={colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={item.published ? 'eye-off' : 'eye'}
                    size={14}
                    color={item.published ? colors.accent : colors.success}
                  />
                  <Text variant="labelSmall" style={{
                    color: item.published ? colors.accent : colors.success,
                    fontWeight: 'bold',
                  }}>
                    {item.published ? 'Unpublish' : 'Publish'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.itemActionBtn, { borderColor: colors.error }]}
              onPress={() => { hapticLight(); handleDelete(item, 'courses'); }}
              disabled={isUpdating}
            >
              <MaterialCommunityIcons name="trash-can" size={14} color={colors.error} />
              <Text variant="labelSmall" style={{ color: colors.error, fontWeight: 'bold' }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
    );
  };

  const renderLesson = ({ item }) => {
    const DIFF_COLORS = { beginner: colors.success, intermediate: colors.accent, advanced: colors.error };
    const diffColor  = DIFF_COLORS[item.difficulty] || colors.textSecondary;
    const isUpdating = updatingId === item.id;

    return (
      <Surface style={styles.itemCard} elevation={2}>
        <View style={[styles.colorBar, { backgroundColor: diffColor }]} />
        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <View style={styles.itemInfo}>
              <Text variant="titleSmall" style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="labelSmall" style={styles.itemMeta}>
                {item.difficulty} · {item.estimatedMins} min · +{item.xpReward} XP
              </Text>
            </View>
            <View style={[styles.publishBadge, {
              backgroundColor: item.published ? colors.success + '22' : colors.accent + '22',
            }]}>
              <Text variant="labelSmall" style={{
                color: item.published ? colors.success : colors.accent,
                fontWeight: 'bold',
              }}>
                {item.published ? 'Live' : 'Draft'}
              </Text>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.itemActionBtn, { borderColor: item.published ? colors.accent : colors.success }]}
              onPress={() => { hapticLight(); handleTogglePublish(item, 'lessons'); }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size={14} color={colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={item.published ? 'eye-off' : 'eye'}
                    size={14}
                    color={item.published ? colors.accent : colors.success}
                  />
                  <Text variant="labelSmall" style={{
                    color: item.published ? colors.accent : colors.success,
                    fontWeight: 'bold',
                  }}>
                    {item.published ? 'Unpublish' : 'Publish'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.itemActionBtn, { borderColor: colors.error }]}
              onPress={() => { hapticLight(); handleDelete(item, 'lessons'); }}
              disabled={isUpdating}
            >
              <MaterialCommunityIcons name="trash-can" size={14} color={colors.error} />
              <Text variant="labelSmall" style={{ color: colors.error, fontWeight: 'bold' }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.error} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.error} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View>
                <Text variant="headlineMedium" style={styles.headerTitle}>Manage Content</Text>
                <Text variant="bodySmall" style={styles.headerSub}>
                  {courses.length} courses · {lessons.length} lessons
                </Text>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => { hapticLight(); setActiveTab(tab); setSearchQuery(''); }}
                >
                  <MaterialCommunityIcons
                    name={tab === 'courses' ? 'book-multiple' : 'text-box-multiple'}
                    size={16}
                    color={activeTab === tab ? colors.white : colors.textSecondary}
                  />
                  <Text variant="labelMedium" style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} (
                    {tab === 'courses' ? courses.length : lessons.length})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Searchbar
              placeholder={`Search ${activeTab}...`}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ color: colors.textPrimary }}
              iconColor={colors.textSecondary}
              placeholderTextColor={colors.textSecondary}
              theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            />
          </View>
        }
        renderItem={activeTab === 'courses' ? renderCourse : renderLesson}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.centred}>
            <MaterialCommunityIcons name="book-off" size={48} color={colors.textSecondary} />
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              No {activeTab} found
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  centred: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary },
  tabRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: colors.error },
  tabText: { color: colors.textSecondary },
  tabTextActive: { color: colors.white, fontWeight: 'bold' },
  searchBar: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 0, marginBottom: 16 },
  itemCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  colorBar: { width: 5 },
  itemBody: { flex: 1, padding: 14, gap: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemInfo: { flex: 1, gap: 3 },
  itemTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  itemMeta: { color: colors.textSecondary },
  publishBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  itemActions: { flexDirection: 'row', gap: 8 },
  itemActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 8, borderWidth: 1, backgroundColor: colors.background },
});
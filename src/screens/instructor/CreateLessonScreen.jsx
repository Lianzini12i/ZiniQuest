import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Surface, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { SUBJECTS } from '../../constants/subjects';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { hapticSuccess, hapticLight } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const XP_BY_DIFFICULTY = { beginner: 10, intermediate: 20, advanced: 35 };

export default function CreateLessonScreen() {
  const { user } = useAuthStore();

  const [courses, setCourses]       = useState([]);
  const [modules, setModules]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Form fields
  const [title, setTitle]               = useState('');
  const [content, setContent]           = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [difficulty, setDifficulty]     = useState('beginner');
  const [estimatedMins, setEstimatedMins] = useState('5');
  const [hasCodeBlocks, setHasCodeBlocks] = useState(false);
  const [published, setPublished]       = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'courses'), where('instructorId', '==', user.uid))
        );
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Failed to load courses:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setModules([]); return; }
    const loadModules = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'modules'),
            where('courseId', '==', selectedCourse.id),
            orderBy('order', 'asc')
          )
        );
        setModules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Failed to load modules:', e.message);
      }
    };
    loadModules();
  }, [selectedCourse]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a lesson title.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Field', 'Please enter lesson content.');
      return;
    }
    if (!selectedCourse) {
      Alert.alert('Missing Field', 'Please select a course.');
      return;
    }
    if (!selectedModule) {
      Alert.alert('Missing Field', 'Please select a module.');
      return;
    }

    setSaving(true);
    try {
      // Get current lesson count in module for ordering
      const existingSnap = await getDocs(
        query(collection(db, 'lessons'), where('moduleId', '==', selectedModule.id))
      );
      const order = existingSnap.size + 1;

      await addDoc(collection(db, 'lessons'), {
        title:         title.trim(),
        content:       content.trim(),
        moduleId:      selectedModule.id,
        courseId:      selectedCourse.id,
        instructorId:  user.uid,
        difficulty,
        estimatedMins: parseInt(estimatedMins) || 5,
        xpReward:      XP_BY_DIFFICULTY[difficulty],
        hasCodeBlocks,
        published,
        order,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });

      await hapticSuccess();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setTitle('');
        setContent('');
        setSelectedModule(null);
        setDifficulty('beginner');
        setEstimatedMins('5');
        setHasCodeBlocks(false);
        setPublished(false);
      }, 2000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save lesson. Please try again.');
      console.warn('Save lesson failed:', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineMedium" style={styles.pageTitle}>Create Lesson</Text>
      <Text variant="bodyMedium" style={styles.pageSub}>
        Add new content to your course
      </Text>

      {/* Title */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Lesson Title *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        placeholder="e.g. Introduction to Variables"
        style={styles.input}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Course selector */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Course *</Text>
      {loading ? (
        <ActivityIndicator color={colors.info} style={{ marginBottom: 16 }} />
      ) : courses.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text variant="bodySmall" style={styles.emptyText}>
            No courses found. Courses must be created in the admin panel.
          </Text>
        </Surface>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={[styles.chip, selectedCourse?.id === course.id && styles.chipActive]}
              onPress={() => {
                hapticLight();
                setSelectedCourse(course);
                setSelectedModule(null);
              }}
            >
              <Text variant="labelMedium" style={[
                styles.chipText,
                selectedCourse?.id === course.id && styles.chipTextActive,
              ]} numberOfLines={1}>
                {course.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Module selector */}
      {selectedCourse && (
        <>
          <Text variant="labelLarge" style={styles.fieldLabel}>Module *</Text>
          {modules.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <Text variant="bodySmall" style={styles.emptyText}>
                No modules found for this course.
              </Text>
            </Surface>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {modules.map(mod => (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.chip, selectedModule?.id === mod.id && styles.chipActive]}
                  onPress={() => {
                    hapticLight();
                    setSelectedModule(mod);
                  }}
                >
                  <Text variant="labelMedium" style={[
                    styles.chipText,
                    selectedModule?.id === mod.id && styles.chipTextActive,
                  ]} numberOfLines={1}>
                    {mod.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Difficulty */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Difficulty *</Text>
      <View style={styles.diffRow}>
        {DIFFICULTIES.map(d => {
          const diffColors = {
            beginner:     colors.success,
            intermediate: colors.accent,
            advanced:     colors.error,
          };
          const c = diffColors[d];
          return (
            <TouchableOpacity
              key={d}
              style={[styles.diffChip, difficulty === d && {
                backgroundColor: c + '22', borderColor: c,
              }]}
              onPress={() => { hapticLight(); setDifficulty(d); }}
            >
              <Text variant="labelMedium" style={[
                styles.diffChipText,
                difficulty === d && { color: c, fontWeight: 'bold' },
              ]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
              {difficulty === d && (
                <Text variant="labelSmall" style={{ color: c }}>
                  +{XP_BY_DIFFICULTY[d]} XP
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Estimated time */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Estimated Read Time (minutes)</Text>
      <TextInput
        value={estimatedMins}
        onChangeText={setEstimatedMins}
        mode="outlined"
        keyboardType="number-pad"
        style={[styles.input, { width: 120 }]}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Toggles */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleChip, hasCodeBlocks && styles.toggleChipActive]}
          onPress={() => { hapticLight(); setHasCodeBlocks(!hasCodeBlocks); }}
        >
          <MaterialCommunityIcons
            name="code-braces"
            size={16}
            color={hasCodeBlocks ? colors.white : colors.textSecondary}
          />
          <Text variant="labelMedium" style={[
            styles.toggleText,
            hasCodeBlocks && styles.toggleTextActive,
          ]}>
            Code Blocks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleChip, published && styles.toggleChipPublished]}
          onPress={() => { hapticLight(); setPublished(!published); }}
        >
          <MaterialCommunityIcons
            name={published ? 'eye' : 'eye-off'}
            size={16}
            color={published ? colors.white : colors.textSecondary}
          />
          <Text variant="labelMedium" style={[
            styles.toggleText,
            published && styles.toggleTextActive,
          ]}>
            {published ? 'Published' : 'Draft'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Lesson Content *</Text>
      <Text variant="labelSmall" style={styles.contentHint}>
        Write your lesson content below. Use line breaks to separate paragraphs.
      </Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        mode="outlined"
        multiline
        numberOfLines={12}
        placeholder="Write your lesson content here..."
        style={[styles.input, styles.contentInput]}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Save button */}
      {saved ? (
        <Surface style={styles.savedCard} elevation={1}>
          <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
          <Text variant="titleSmall" style={styles.savedText}>Lesson saved successfully!</Text>
        </Surface>
      ) : (
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
          labelStyle={styles.saveBtnLabel}
          icon="content-save"
          buttonColor={colors.info}
        >
          {saving ? 'Saving...' : published ? 'Publish Lesson' : 'Save as Draft'}
        </Button>
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
  pageTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  pageSub: {
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 24,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contentHint: {
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  contentInput: {
    minHeight: 200,
  },
  chipRow: {
    marginBottom: 20,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: 'bold' },
  diffRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  diffChip: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  diffChipText: { color: colors.textSecondary },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleChipPublished: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleText: { color: colors.textSecondary },
  toggleTextActive: { color: colors.white, fontWeight: 'bold' },
  saveBtn: {
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnContent: { height: 50 },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.success + '22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.success + '44',
    marginTop: 8,
  },
  savedText: {
    color: colors.success,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
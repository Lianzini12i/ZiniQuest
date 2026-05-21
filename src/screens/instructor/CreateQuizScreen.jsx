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
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { hapticSuccess, hapticLight, hapticError } from '../../utils/haptics';
import useAuthStore from '../../store/authStore';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function QuestionCard({ question, index, onChange, onDelete }) {
  return (
    <Surface style={styles.questionCard} elevation={2}>
      <View style={styles.questionCardHeader}>
        <View style={styles.questionNumBadge}>
          <Text variant="labelLarge" style={styles.questionNumText}>Q{index + 1}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(index)} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Question text */}
      <TextInput
        value={question.text}
        onChangeText={(val) => onChange(index, 'text', val)}
        mode="outlined"
        placeholder="Enter question text..."
        multiline
        style={styles.questionInput}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Options */}
      <Text variant="labelMedium" style={styles.optionsLabel}>
        Answer Options (tap to set correct answer)
      </Text>
      {question.options.map((opt, oi) => {
        const isCorrect = question.correctIndex === oi;
        return (
          <View key={oi} style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.optionCorrectBtn, isCorrect && styles.optionCorrectBtnActive]}
              onPress={() => {
                hapticLight();
                onChange(index, 'correctIndex', oi);
              }}
            >
              <Text style={[styles.optionLabel, isCorrect && styles.optionLabelActive]}>
                {OPTION_LABELS[oi]}
              </Text>
            </TouchableOpacity>
            <TextInput
              value={opt}
              onChangeText={(val) => {
                const newOptions = [...question.options];
                newOptions[oi] = val;
                onChange(index, 'options', newOptions);
              }}
              mode="outlined"
              placeholder={`Option ${OPTION_LABELS[oi]}`}
              style={styles.optionInput}
              outlineColor={isCorrect ? colors.success : colors.border}
              activeOutlineColor={colors.info}
              textColor={colors.textPrimary}
              theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            />
            {isCorrect && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            )}
          </View>
        );
      })}

      {/* Explanation */}
      <Text variant="labelMedium" style={styles.optionsLabel}>
        Explanation (shown after answering)
      </Text>
      <TextInput
        value={question.explanation}
        onChangeText={(val) => onChange(index, 'explanation', val)}
        mode="outlined"
        placeholder="Why is this the correct answer?"
        multiline
        style={styles.questionInput}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />
    </Surface>
  );
}

export default function CreateQuizScreen() {
  const { user } = useAuthStore();

  const [lessons, setLessons]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  const [title, setTitle]               = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [passMark, setPassMark]         = useState('60');
  const [timerSeconds, setTimerSeconds] = useState('10');
  const [published, setPublished]       = useState(false);
  const [questions, setQuestions]       = useState([
    {
      questionId:   'q1',
      text:         '',
      options:      ['', '', '', ''],
      correctIndex: 0,
      explanation:  '',
    },
  ]);

  useEffect(() => {
    const loadLessons = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'lessons'),
            where('instructorId', '==', user.uid),
            where('published', '==', true)
          )
        );
        setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Failed to load lessons:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadLessons();
  }, []);

  const addQuestion = () => {
    hapticLight();
    setQuestions(prev => [...prev, {
      questionId:   `q${prev.length + 1}`,
      text:         '',
      options:      ['', '', '', ''],
      correctIndex: 0,
      explanation:  '',
    }]);
  };

  const deleteQuestion = (index) => {
    if (questions.length === 1) {
      Alert.alert('Cannot Delete', 'A quiz must have at least one question.');
      return;
    }
    hapticError();
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a quiz title.');
      return false;
    }
    if (!selectedLesson) {
      Alert.alert('Missing Field', 'Please select a lesson to link this quiz to.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        Alert.alert('Incomplete', `Question ${i + 1} has no text.`);
        return false;
      }
      if (q.options.some(o => !o.trim())) {
        Alert.alert('Incomplete', `Question ${i + 1} has empty options.`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Strip correctIndex from questions — store separately for security
      const safeQuestions = questions.map(({ correctIndex, ...rest }) => rest);
      const correctIndexes = questions.map(q => q.correctIndex);

      const quizRef = await addDoc(collection(db, 'quizzes'), {
        title:        title.trim(),
        lessonId:     selectedLesson.id,
        courseId:     selectedLesson.courseId,
        instructorId: user.uid,
        passMark:     parseInt(passMark) || 60,
        timerSeconds: parseInt(timerSeconds) || 10,
        questions:    safeQuestions,
        published,
        createdAt:    serverTimestamp(),
      });

      // Store correct answers in server-only subcollection
      await addDoc(collection(db, 'quizzes', quizRef.id, 'answers'), {
        quizId:        quizRef.id,
        correctIndexes,
        createdAt:     serverTimestamp(),
      });

      await hapticSuccess();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setTitle('');
        setSelectedLesson(null);
        setPassMark('60');
        setTimerSeconds('10');
        setPublished(false);
        setQuestions([{
          questionId: 'q1', text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '',
        }]);
      }, 2000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
      console.warn('Save quiz failed:', e.message);
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
      <Text variant="headlineMedium" style={styles.pageTitle}>Create Quiz</Text>
      <Text variant="bodyMedium" style={styles.pageSub}>
        Build a quiz and link it to a lesson
      </Text>

      {/* Title */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Quiz Title *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        placeholder="e.g. Python Syntax Quiz"
        style={styles.input}
        outlineColor={colors.border}
        activeOutlineColor={colors.info}
        textColor={colors.textPrimary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
      />

      {/* Lesson selector */}
      <Text variant="labelLarge" style={styles.fieldLabel}>Link to Lesson *</Text>
      {loading ? (
        <ActivityIndicator color={colors.info} style={{ marginBottom: 16 }} />
      ) : lessons.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <Text variant="bodySmall" style={styles.emptyText}>
            No published lessons found. Create and publish a lesson first.
          </Text>
        </Surface>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {lessons.map(lesson => (
            <TouchableOpacity
              key={lesson.id}
              style={[styles.chip, selectedLesson?.id === lesson.id && styles.chipActive]}
              onPress={() => { hapticLight(); setSelectedLesson(lesson); }}
            >
              <Text variant="labelSmall" style={[
                styles.chipText,
                selectedLesson?.id === lesson.id && styles.chipTextActive,
              ]} numberOfLines={2}>
                {lesson.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Settings row */}
      <View style={styles.settingsRow}>
        <View style={styles.settingField}>
          <Text variant="labelLarge" style={styles.fieldLabel}>Pass Mark (%)</Text>
          <TextInput
            value={passMark}
            onChangeText={setPassMark}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.smallInput}
            outlineColor={colors.border}
            activeOutlineColor={colors.info}
            textColor={colors.textPrimary}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
          />
        </View>
        <View style={styles.settingField}>
          <Text variant="labelLarge" style={styles.fieldLabel}>Timer (seconds)</Text>
          <TextInput
            value={timerSeconds}
            onChangeText={setTimerSeconds}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.smallInput}
            outlineColor={colors.border}
            activeOutlineColor={colors.info}
            textColor={colors.textPrimary}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
          />
        </View>
        <View style={styles.settingField}>
          <Text variant="labelLarge" style={styles.fieldLabel}>Status</Text>
          <TouchableOpacity
            style={[styles.publishToggle, published && styles.publishToggleActive]}
            onPress={() => { hapticLight(); setPublished(!published); }}
          >
            <MaterialCommunityIcons
              name={published ? 'eye' : 'eye-off'}
              size={16}
              color={published ? colors.white : colors.textSecondary}
            />
            <Text variant="labelSmall" style={[
              styles.publishToggleText,
              published && styles.publishToggleTextActive,
            ]}>
              {published ? 'Live' : 'Draft'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Questions */}
      <View style={styles.questionsSectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Questions ({questions.length})
        </Text>
        <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.info} />
          <Text variant="labelMedium" style={styles.addQuestionText}>Add</Text>
        </TouchableOpacity>
      </View>

      {questions.map((q, i) => (
        <QuestionCard
          key={i}
          question={q}
          index={i}
          onChange={updateQuestion}
          onDelete={deleteQuestion}
        />
      ))}

      {/* Save */}
      {saved ? (
        <Surface style={styles.savedCard} elevation={1}>
          <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
          <Text variant="titleSmall" style={styles.savedText}>
            Quiz saved successfully!
          </Text>
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
          {saving ? 'Saving...' : published ? 'Publish Quiz' : 'Save as Draft'}
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
  input: {
    backgroundColor: colors.card,
    marginBottom: 20,
  },
  chipScroll: { marginBottom: 20 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  chipActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: 'bold' },

  // Settings row
  settingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  settingField: { flex: 1 },
  smallInput: {
    backgroundColor: colors.card,
  },
  publishToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  publishToggleActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  publishToggleText: { color: colors.textSecondary, fontWeight: 'bold' },
  publishToggleTextActive: { color: colors.white },

  // Questions section
  questionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.info + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.info + '44',
  },
  addQuestionText: {
    color: colors.info,
    fontWeight: 'bold',
  },

  // Question card
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionNumBadge: {
    backgroundColor: colors.info + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.info + '44',
  },
  questionNumText: {
    color: colors.info,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: colors.error + '11',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.error + '33',
  },
  questionInput: {
    backgroundColor: colors.background,
  },
  optionsLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  optionCorrectBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCorrectBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  optionLabel: {
    fontWeight: 'bold',
    color: colors.textSecondary,
    fontSize: 13,
  },
  optionLabelActive: {
    color: colors.white,
  },
  optionInput: {
    flex: 1,
    backgroundColor: colors.background,
    height: 44,
  },

  // Save
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
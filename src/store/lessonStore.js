import { create } from 'zustand';

const useLessonStore = create((set) => ({
  courses: [],
  currentLesson: null,
  completedLessons: [],

  setCourses: (courses) => set({ courses }),
  setCurrentLesson: (lesson) => set({ currentLesson: lesson }),
  setCompletedLessons: (lessons) => set({ completedLessons: lessons }),
  markLessonComplete: (lessonId) =>
    set((state) => ({
      completedLessons: [...new Set([...state.completedLessons, lessonId])],
    })),
  clearLessons: () => set({ courses: [], currentLesson: null, completedLessons: [] }),
}));

export default useLessonStore;
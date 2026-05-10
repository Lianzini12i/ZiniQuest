import { create } from 'zustand';

const useQuizStore = create((set) => ({
  currentQuiz: null,
  answers: [],
  currentQuestionIndex: 0,
  quizComplete: false,
  score: null,

  setQuiz: (quiz) => set({ currentQuiz: quiz, answers: [], currentQuestionIndex: 0, quizComplete: false, score: null }),
  recordAnswer: (index) =>
    set((state) => ({
      answers: [...state.answers, index],
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),
  setScore: (score) => set({ score, quizComplete: true }),
  resetQuiz: () => set({ currentQuiz: null, answers: [], currentQuestionIndex: 0, quizComplete: false, score: null }),
}));

export default useQuizStore;
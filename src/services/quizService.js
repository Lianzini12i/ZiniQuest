import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getQuizByLesson(lessonId) {
  const q = query(
    collection(db, 'quizzes'),
    where('lessonId', '==', lessonId),
    where('published', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function submitQuizAttempt(uid, quizId, lessonId, answers, score, passed, xpAwarded, isFirstAttempt) {
  await addDoc(collection(db, 'quizAttempts'), {
    userId: uid,
    quizId,
    lessonId,
    answers,
    score,
    passed,
    xpAwarded,
    isFirstAttempt,
    submittedAt: serverTimestamp(),
  });
}

export async function getQuizAttempts(uid, quizId) {
  const q = query(
    collection(db, 'quizAttempts'),
    where('userId', '==', uid),
    where('quizId', '==', quizId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
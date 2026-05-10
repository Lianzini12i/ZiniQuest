import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getCourses(publishedOnly = true) {
  let q = collection(db, 'courses');
  if (publishedOnly) q = query(q, where('published', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCourseById(courseId) {
  const snap = await getDoc(doc(db, 'courses', courseId));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export async function getModulesByCourse(courseId) {
  const q = query(
    collection(db, 'modules'),
    where('courseId', '==', courseId),
    orderBy('order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getLessonsByModule(moduleId) {
  const q = query(
    collection(db, 'lessons'),
    where('moduleId', '==', moduleId),
    orderBy('order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getLessonById(lessonId) {
  const snap = await getDoc(doc(db, 'lessons', lessonId));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export async function markLessonComplete(uid, lessonId) {
  const progressId = `${uid}_${lessonId}`;
  await setDoc(doc(db, 'lessonProgress', progressId), {
    userId: uid,
    lessonId,
    completed: true,
    completedAt: serverTimestamp(),
  });
}

export async function getCompletedLessons(uid) {
  const q = query(
    collection(db, 'lessonProgress'),
    where('userId', '==', uid),
    where('completed', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().lessonId);
}
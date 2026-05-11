import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function enrollInCourse(uid, courseId) {
  const enrollId = `${uid}_${courseId}`;
  const enrollRef = doc(db, 'enrollments', enrollId);
  const existing = await getDoc(enrollRef);
  if (existing.exists()) return; // already enrolled

  await setDoc(enrollRef, {
    userId: uid,
    courseId,
    enrolledAt: serverTimestamp(),
    courseXP: 0,
    weeklyXP: 0,
    lessonsCompleted: 0,
    quizzesCompleted: 0,
  });

  await updateDoc(doc(db, 'users', uid), {
    enrolledCourses: arrayUnion(courseId),
  });
}

export async function isEnrolled(uid, courseId) {
  const snap = await getDoc(doc(db, 'enrollments', `${uid}_${courseId}`));
  return snap.exists();
}

export async function getEnrollment(uid, courseId) {
  const snap = await getDoc(doc(db, 'enrollments', `${uid}_${courseId}`));
  if (snap.exists()) return snap.data();
  return null;
}

export async function getUserEnrollments(uid) {
  const q = query(collection(db, 'enrollments'), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
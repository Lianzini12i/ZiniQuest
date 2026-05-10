import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { XP_RULES } from '../constants/xpRules';
import { getTodayString } from '../utils/formatDate';

export async function registerUser(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    role: 'student',
    avatar: 'avatar_1',
    photoURL: null,
    xp: XP_RULES.REGISTRATION_BONUS,
    level: 1,
    streak: 0,
    lastActiveDate: getTodayString(),
    dailyGoalMins: 30,
    badges: [],
    enrolledCourses: [],
    subjectInterests: [],
    onboardingDone: false,
    pendingLevelUp: false,
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data().role;
  return null;
}
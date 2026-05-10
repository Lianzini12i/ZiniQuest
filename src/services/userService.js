import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayString } from '../utils/formatDate';

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export function subscribeToUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function updateOnboarding(uid, { avatar, dailyGoalMins, subjectInterests }) {
  await updateDoc(doc(db, 'users', uid), {
    avatar,
    dailyGoalMins,
    subjectInterests,
    onboardingDone: true,
  });
}

export async function updateDisplayName(uid, name) {
  await updateDoc(doc(db, 'users', uid), { name });
}

export async function updatePhotoURL(uid, photoURL) {
  await updateDoc(doc(db, 'users', uid), { photoURL });
}

export async function updateAvatar(uid, avatar) {
  await updateDoc(doc(db, 'users', uid), { avatar });
}

export async function clearPendingLevelUp(uid) {
  await updateDoc(doc(db, 'users', uid), { pendingLevelUp: false });
}
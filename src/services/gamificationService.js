import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../config/firebase';
import {
  doc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import useUserStore from '../store/userStore';
import { playSound } from '../utils/soundPlayer';
import { hapticSuccess, hapticHeavy } from '../utils/haptics';
import { getTodayString } from '../utils/formatDate';
import { getLevelFromXP } from '../utils/levelCalc';

async function updateStreakLocally(uid) {
  try {
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data          = userSnap.data();
    const today         = getTodayString();
    const lastActive    = data.lastActiveDate || '';
    const yesterday     = new Date(Date.now() - 86400000)
      .toISOString().split('T')[0];

    let newStreak     = data.streak || 0;
    let streakChanged = false;

    if (lastActive === today) {
      // Already active today — no change needed
      return;
    } else if (lastActive === yesterday) {
      // Consecutive day — increment streak
      newStreak += 1;
      streakChanged = true;
    } else if (lastActive !== today) {
      // Missed a day or first activity — reset to 1
      newStreak = 1;
      streakChanged = true;
    }

    if (streakChanged) {
      await updateDoc(userRef, {
        streak:         newStreak,
        lastActiveDate: today,
      });

      // Update local store immediately
      const profile = useUserStore.getState().profile;
      if (profile) {
        useUserStore.getState().setProfile({
          ...profile,
          streak:         newStreak,
          lastActiveDate: today,
        });
      }

      // Milestone bonuses
      if (newStreak === 7) {
        await awardXPLocally(uid, 50);
        await playSound('streak-milestone');
        await hapticHeavy();
      } else if (newStreak === 30) {
        await awardXPLocally(uid, 200);
        await playSound('streak-milestone');
        await hapticHeavy();
      }
    }
  } catch (e) {
    console.warn('Local streak update failed:', e.message);
  }
}

async function awardXPLocally(uid, xpAmount) {
  try {
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data       = userSnap.data();
    const currentXP  = data.xp    || 0;
    const currentLvl = data.level  || 1;
    const newXP      = currentXP + xpAmount;
    const newLevel   = getLevelFromXP(newXP);
    const leveledUp  = newLevel.level > currentLvl;

    await updateDoc(userRef, {
      xp:             newXP,
      level:          newLevel.level,
      pendingLevelUp: leveledUp,
    });

  } catch (e) {
    console.warn('Local XP award failed:', e.message);
  }
}

// ── Badge Check (local — runs on device) ────────────────────
async function checkBadgesLocally(uid) {
  try {
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const data        = userSnap.data();
    const earned      = new Set(data.badges || []);
    const newBadges   = [];

    const { getDocs, collection, query, where } = await import('firebase/firestore');

    const [progressSnap, attemptsSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'lessonProgress'),
        where('userId', '==', uid),
        where('completed', '==', true)
      )),
      getDocs(query(
        collection(db, 'quizAttempts'),
        where('userId', '==', uid)
      )),
    ]);

    const completedCount = progressSnap.size;
    const attempts       = attemptsSnap.docs.map(d => d.data());
    const passedCount    = attempts.filter(a => a.passed).length;
    const hasPerfect     = attempts.some(a => a.score === 100);
    const streak         = data.streak || 0;

    const grant = (id) => {
      if (!earned.has(id)) {
        earned.add(id);
        newBadges.push(id);
      }
    };

    if (completedCount >= 1)  grant('first_step');
    if (passedCount    >= 10) grant('quiz_crusher');
    if (hasPerfect)            grant('perfectionist');
    if (streak         >= 7)  grant('on_fire');
    if (streak         >= 30) grant('unstoppable');
    if (completedCount >= 50) grant('code_veteran');

    // Speed learner — 3 lessons today
    const today = getTodayString();
    const todayCount = progressSnap.docs.filter(d => {
      const ts   = d.data().completedAt;
      if (!ts) return false;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toISOString().split('T')[0] === today;
    }).length;
    if (todayCount >= 3) grant('speed_learner');

    // Early bird — lesson before 8 AM
    const earlyLesson = progressSnap.docs.some(d => {
      const ts = d.data().completedAt;
      if (!ts) return false;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.getHours() < 8;
    });
    if (earlyLesson) grant('early_bird');

    // Night owl — lesson after 10 PM
    const nightLesson = progressSnap.docs.some(d => {
      const ts = d.data().completedAt;
      if (!ts) return false;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.getHours() >= 22;
    });
    if (nightLesson) grant('night_owl');

    // Write new badges
    if (newBadges.length > 0) {
      const { arrayUnion } = await import('firebase/firestore');
      await updateDoc(userRef, {
        badges: arrayUnion(...newBadges),
      });

      // Update local store
      const profile = useUserStore.getState().profile;
      if (profile) {
        useUserStore.getState().setProfile({
          ...profile,
          badges: [...(profile.badges || []), ...newBadges],
        });
      }
    }

    return newBadges;
  } catch (e) {
    console.warn('Local badge check failed:', e.message);
    return [];
  }
}

// ── Public API ───────────────────────────────────────────────
export async function awardXP(actionType, contextId, xpAmount, uid) {
  // Step 1 — Instant local feedback
  useUserStore.getState().addXPLocally(xpAmount);
  await playSound('xp-earn');
  await hapticSuccess();

  // Step 2 — Write to Firestore locally
  if (uid) {
    await awardXPLocally(uid, xpAmount);
    await updateStreakLocally(uid);

    // Update enrollment courseXP for leaderboard
    try {
      if (contextId) {
        const enrollId  = `${uid}_${contextId}`;
        const enrollRef = doc(db, 'enrollments', enrollId);
        const enrollSnap = await getDoc(enrollRef);
        if (enrollSnap.exists()) {
          await updateDoc(enrollRef, {
            courseXP: increment(xpAmount),
            weeklyXP: increment(xpAmount),
          });
        }
      }
    } catch (e) {
      console.warn('Enrollment XP update failed:', e.message);
    }
  }

  try {
    const fn = httpsCallable(functions, 'awardXP');
    await fn({ actionType, contextId, xpAmount });
  } catch (e) {
    // Expected to fail without Blaze — local logic above handles it
  }
}

export async function triggerBadgeCheck(uid) {
  const newBadges = await checkBadgesLocally(uid);

for (const badgeId of newBadges) {
  useUserStore.getState().setPendingBadgeModal(badgeId);
  // Small delay between badges if multiple unlocked
  await new Promise(r => setTimeout(r, 300));
}

  try {
    const fn = httpsCallable(functions, 'checkBadges');
    await fn({ uid });
  } catch (e) {
    // Expected to fail without Blaze
  }

  return newBadges;
}

export async function triggerLevelUp() {
  await playSound('level-up');
  await hapticHeavy();
}

export async function updateStreak(uid) {
  await updateStreakLocally(uid);
}
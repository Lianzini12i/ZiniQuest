import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import useUserStore from '../store/userStore';
import { playSound } from '../utils/soundPlayer';
import { hapticSuccess, hapticHeavy } from '../utils/haptics';

// Hybrid Model:
// 1. Trigger local animation + sound instantly for great demo feel
// 2. Call Cloud Function in background as source of truth

export async function awardXP(actionType, contextId, xpAmount) {
  // Step 1 — Instant local feedback
  useUserStore.getState().addXPLocally(xpAmount);
  await playSound('xp-earn');
  await hapticSuccess();

  // Step 2 — Server sync (source of truth)
  try {
    const fn = httpsCallable(functions, 'awardXP');
    await fn({ actionType, contextId, xpAmount });
  } catch (e) {
    console.warn('Cloud Function awardXP failed silently:', e.message);
  }
}

export async function triggerBadgeCheck(uid) {
  try {
    const fn = httpsCallable(functions, 'checkBadges');
    const result = await fn({ uid });
    const newBadges = result.data?.newBadges || [];

    for (const badgeId of newBadges) {
      useUserStore.getState().addBadgeLocally(badgeId);
      await playSound('badge-unlock');
      await hapticHeavy();
    }

    return newBadges;
  } catch (e) {
    console.warn('Badge check failed silently:', e.message);
    return [];
  }
}

export async function triggerLevelUp() {
  await playSound('level-up');
  await hapticHeavy();
}
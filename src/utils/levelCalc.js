import { LEVELS } from '../constants/xpRules';

export function getLevelFromXP(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

export function getXPProgress(xp) {
  const current = getLevelFromXP(xp);
  const nextLevel = LEVELS.find(l => l.level === current.level + 1);
  if (!nextLevel) return { current, nextLevel: null, progress: 1, xpIntoLevel: xp - current.xpRequired, xpNeeded: 0 };
  const xpIntoLevel = xp - current.xpRequired;
  const xpNeeded = nextLevel.xpRequired - current.xpRequired;
  const progress = xpIntoLevel / xpNeeded;
  return { current, nextLevel, progress, xpIntoLevel, xpNeeded };
}
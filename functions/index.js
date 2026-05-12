const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ── XP Thresholds ────────────────────────────────────────────
const LEVELS = [
  { level: 1,  title: 'Newbie',      xpRequired: 0    },
  { level: 2,  title: 'Apprentice',  xpRequired: 100  },
  { level: 3,  title: 'Coder',       xpRequired: 250  },
  { level: 4,  title: 'Developer',   xpRequired: 500  },
  { level: 5,  title: 'Engineer',    xpRequired: 900  },
  { level: 6,  title: 'Architect',   xpRequired: 1400 },
  { level: 7,  title: 'Senior Dev',  xpRequired: 2000 },
  { level: 8,  title: 'Tech Lead',   xpRequired: 3000 },
  { level: 9,  title: 'Principal',   xpRequired: 4500 },
  { level: 10, title: 'Code Legend', xpRequired: 6500 },
];

function getLevelFromXP(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

// ── awardXP ──────────────────────────────────────────────────
exports.awardXP = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const { actionType, contextId, xpAmount } = data;
  const uid = context.auth.uid;

  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found');

  const userData   = userSnap.data();
  const currentXP  = userData.xp  || 0;
  const currentLvl = userData.level || 1;
  const newXP      = currentXP + xpAmount;
  const newLevel   = getLevelFromXP(newXP);
  const leveledUp  = newLevel.level > currentLvl;

  // Update user XP and level
  await userRef.update({
    xp:             newXP,
    level:          newLevel.level,
    pendingLevelUp: leveledUp,
  });

  // Update courseXP in enrollment if contextId is a courseId
  try {
    if (contextId) {
      const enrollId  = `${uid}_${contextId}`;
      const enrollRef = db.collection('enrollments').doc(enrollId);
      const enrollSnap = await enrollRef.get();
      if (enrollSnap.exists) {
        await enrollRef.update({
          courseXP:  admin.firestore.FieldValue.increment(xpAmount),
          weeklyXP:  admin.firestore.FieldValue.increment(xpAmount),
        });
      }
    }
  } catch (e) {
    console.log('Enrollment XP update skipped:', e.message);
  }

  // Update streak
  const today         = new Date().toISOString().split('T')[0];
  const lastActive    = userData.lastActiveDate || '';
  const yesterday     = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let   newStreak     = userData.streak || 0;
  let   streakBonus   = 0;

  if (lastActive === today) {
    // Already active today — no change
  } else if (lastActive === yesterday) {
    newStreak += 1;
    if (newStreak === 7)  streakBonus = 50;
    if (newStreak === 30) streakBonus = 200;
    await userRef.update({ streak: newStreak, lastActiveDate: today });
  } else {
    newStreak = 1;
    await userRef.update({ streak: newStreak, lastActiveDate: today });
  }

  // Award streak bonus XP if milestone reached
  if (streakBonus > 0) {
    await userRef.update({
      xp: admin.firestore.FieldValue.increment(streakBonus),
    });
  }

  return { success: true, newXP, newLevel: newLevel.level, leveledUp, streakBonus };
});

// ── checkBadges ──────────────────────────────────────────────
exports.checkBadges = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const uid      = context.auth.uid;
  const userRef  = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return { newBadges: [] };

  const user       = userSnap.data();
  const earned     = new Set(user.badges || []);
  const newBadges  = [];

  const grant = async (badgeId) => {
    if (!earned.has(badgeId)) {
      earned.add(badgeId);
      newBadges.push(badgeId);
    }
  };

  // Fetch data needed for checks
  const [progressSnap, attemptsSnap, enrollSnap] = await Promise.all([
    db.collection('lessonProgress').where('userId', '==', uid).where('completed', '==', true).get(),
    db.collection('quizAttempts').where('userId', '==', uid).get(),
    db.collection('enrollments').where('userId', '==', uid).get(),
  ]);

  const completedLessons = progressSnap.size;
  const attempts         = attemptsSnap.docs.map(d => d.data());
  const passedQuizzes    = attempts.filter(a => a.passed).length;
  const perfectQuiz      = attempts.some(a => a.score === 100);

  // Badge criteria
  if (completedLessons >= 1)  await grant('first_step');
  if (passedQuizzes   >= 10)  await grant('quiz_crusher');
  if (perfectQuiz)             await grant('perfectionist');
  if (user.streak     >= 7)   await grant('on_fire');
  if (user.streak     >= 30)  await grant('unstoppable');
  if (completedLessons >= 50) await grant('code_veteran');

  // Speed learner — 3 lessons completed today
  const today        = new Date().toISOString().split('T')[0];
  const todayLessons = progressSnap.docs.filter(d => {
    const ts = d.data().completedAt;
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toISOString().split('T')[0] === today;
  }).length;
  if (todayLessons >= 3) await grant('speed_learner');

  // Early bird — completed lesson before 8 AM
  const earlyLesson = progressSnap.docs.some(d => {
    const ts = d.data().completedAt;
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.getHours() < 8;
  });
  if (earlyLesson) await grant('early_bird');

  // Night owl — completed lesson after 10 PM
  const nightLesson = progressSnap.docs.some(d => {
    const ts = d.data().completedAt;
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.getHours() >= 22;
  });
  if (nightLesson) await grant('night_owl');

  // Module master — all lessons in any module completed
  const moduleIds = [...new Set(
    progressSnap.docs.map(d => d.data().moduleId).filter(Boolean)
  )];
  for (const moduleId of moduleIds) {
    const moduleLessons = await db.collection('lessons')
      .where('moduleId', '==', moduleId)
      .where('published', '==', true)
      .get();
    const completedInModule = progressSnap.docs.filter(
      d => d.data().moduleId === moduleId
    ).length;
    if (moduleLessons.size > 0 && completedInModule >= moduleLessons.size) {
      await grant('module_master');
      break;
    }
  }

  // Course champion — all lessons in any course completed
  for (const enrollDoc of enrollSnap.docs) {
    const { courseId } = enrollDoc.data();
    const courseLessons = await db.collection('lessons')
      .where('courseId', '==', courseId)
      .where('published', '==', true)
      .get();
    const completedInCourse = progressSnap.docs.filter(d => {
      return courseLessons.docs.some(l => l.id === d.data().lessonId);
    }).length;
    if (courseLessons.size > 0 && completedInCourse >= courseLessons.size) {
      await grant('course_champion');
      break;
    }
  }

  // Write new badges to Firestore
  if (newBadges.length > 0) {
    await userRef.update({
      badges: admin.firestore.FieldValue.arrayUnion(...newBadges),
    });
  }

  return { newBadges };
});

// ── updateLeaderboard (scheduled nightly) ───────────────────
exports.updateLeaderboard = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    const coursesSnap = await db.collection('courses')
      .where('published', '==', true)
      .get();

    const monday    = getMondayDate();
    const today     = new Date().toISOString().split('T')[0];

    for (const courseDoc of coursesSnap.docs) {
      const courseId    = courseDoc.id;
      const enrollSnap  = await db.collection('enrollments')
        .where('courseId', '==', courseId)
        .get();

      if (enrollSnap.empty) continue;

      // Fetch user names and avatars
      const entries = await Promise.all(
        enrollSnap.docs.map(async (doc) => {
          const data     = doc.data();
          const userSnap = await db.collection('users').doc(data.userId).get();
          const user     = userSnap.data() || {};
          return {
            userId:   data.userId,
            name:     user.name     || 'Unknown',
            avatar:   user.avatar   || 'avatar_1',
            level:    user.level    || 1,
            courseXP: data.courseXP || 0,
            weeklyXP: data.weeklyXP || 0,
          };
        })
      );

      // Sort and rank
      const allTime = [...entries]
        .sort((a, b) => b.courseXP - a.courseXP)
        .slice(0, 50)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      const weekly = [...entries]
        .sort((a, b) => b.weeklyXP - a.weeklyXP)
        .slice(0, 50)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      await db.collection('courseLeaderboard').doc(courseId).set({
        courseId,
        allTime,
        weekly,
        weekStartDate: monday,
        updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Reset weekly XP every Monday
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) {
      const allEnrollSnap = await db.collection('enrollments').get();
      const batch = db.batch();
      allEnrollSnap.docs.forEach(doc => {
        batch.update(doc.ref, { weeklyXP: 0 });
      });
      await batch.commit();
    }

    console.log('Leaderboard updated successfully');
    return null;
  });

function getMondayDate() {
  const d    = new Date();
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
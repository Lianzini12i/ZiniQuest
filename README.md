# ZiniQuest

**ZiniQuest** is a subject-agnostic, gamified mobile learning platform built for tertiary-level students across any academic discipline. By wrapping structured academic content in a game-like progression system — XP, badges, streaks, and leaderboards — ZiniQuest transforms passive studying into an active, rewarding experience.

---

## 🚀 Overview

Students earn XP and level up as they complete lessons and quizzes, collect achievement badges, maintain daily learning streaks, and compete on course-specific leaderboards. Instructors can create and publish content for any subject, monitor class performance in real time, and export student data for academic research. Administrators manage users, roles, and platform content through a dedicated dashboard.

The platform is strictly online, role-based, and architected entirely on free-tier infrastructure — requiring no paid services beyond optional Firebase Blaze for Cloud Functions.

---

## ✨ Key Features

### Student Experience
- **Gamified Progression** — Earn XP for every lesson completed and quiz passed. Level up through 10 titles from *Newbie* to *Code Legend*.
- **Achievement Badges** — 12 unlockable badges with criteria ranging from daily streaks to perfect quiz scores.
- **Course Leaderboards** — Course-scoped weekly and all-time rankings with a gold/silver/bronze podium and public player profiles.
- **Daily Streak System** — Daily login and activity tracking with streak milestones rewarding bonus XP.
- **Interactive Quizzes** — Per-question countdown timers, instant answer feedback with explanations, haptic responses, and sound effects.
- **Level-Up Animation** — Full-screen particle animation with sound triggered on every level threshold crossed.
- **Public Profiles** — View any student's badges, XP, level, and stats from the leaderboard.

### Instructor Portal
- **Content Creation** — Create and publish lessons for any academic subject with rich text content and optional code block formatting.
- **Quiz Builder** — Build multi-question quizzes with configurable pass marks, per-question timers, correct answer security, and explanations.
- **Student Analytics** — Real-time class performance dashboard with per-student drill-down, at-risk student detection (inactive 7+ days), and class-wide pass rate tracking.
- **CSV Data Export** — Export full student performance metrics as a CSV file for academic research and institutional reporting.

### Admin Panel
- **User Management** — Search, filter, and manage all users. Assign and revoke instructor roles, suspend accounts, and delete users.
- **Content Management** — Publish, unpublish, and delete courses and lessons across all instructors from a single interface.
- **Platform Analytics** — Top learners, recent signups, total users, courses, lessons, and quiz attempt counts.

### Platform
- **Subject-Agnostic** — Supports any academic subject. Subject icons and colour coding differentiate courses visually.
- **Role-Based Access** — Three fully separate interfaces: Student, Instructor, and Admin. Roles assigned by Admin only.
- **Resilient Connectivity** — High-fidelity No Internet overlay with retry mechanism, animated pulse, and troubleshooting tips. App requires active connection; no stale data risks.
- **Sound & Haptics** — 9 bundled sound effects and full haptic feedback for all key interactions (XP earn, badge unlock, level-up, correct/wrong answers, button taps).
- **Firestore Security Rules** — Production-grade rules enforcing role-based access at the database level. XP and courseXP fields are write-protected from the client. Quiz answers stored in a server-only subcollection unreadable by client SDK.

---

## 🛠 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React Native (Expo SDK 54) | iOS + Android from one codebase |
| UI Library | React Native Paper (MD3) | Dark theme, consistent components |
| Navigation | React Navigation v6 | Stack + bottom tab navigators |
| State | Zustand | Auth store, user store, lesson/quiz stores |
| Auth & Database | Firebase Auth + Firestore | Free tier |
| Game Logic | Firebase Cloud Functions | Server-side XP, badges, streaks, leaderboard |
| Profile Photos | Cloudinary (Free Tier) | No credit card required |
| Sound | expo-av | 9 bundled .mp3 sound effects |
| Haptics | expo-haptics | Success, error, light, and heavy feedback |
| Forms | React Hook Form | Validation on all auth and content forms |
| Icons | @expo/vector-icons | MaterialCommunityIcons throughout |
| Demo Device | iPhone 13 Pro Max | Via Expo Go, SDK 54 |

---

## 📊 Content

Two courses seeded for demonstration:

| Course | Subject | Modules | Lessons | Quizzes |
|---|---|---|---|---|
| Intro to Python | Programming | 3 | 15 | 1+ |
| Algebra Fundamentals | Mathematics | 3 | 15 | 1+ |
| **Total** | | **6** | **30** | **6** |

---

## ✅ Feature Implementation Status

### Student Experience
- [x] Authentication — Register, Login, Logout, Password Reset
- [x] Onboarding — Avatar selection, daily goal, subject interests
- [x] Home Dashboard — XP bar, streak, stats, daily goal ring, enrolled courses, latest badge
- [x] Course Browser — Search, subject filters, enrolment flow
- [x] My Course Screen — Module accordion, lesson list, per-module progress bars
- [x] Lesson Detail — Rich text rendering, code block formatting, completion flow
- [x] Quiz Screen — Timer, haptics, sounds, answer reveal, explanation
- [x] Quiz Result Screen — Grade, XP earned, retry, continue
- [x] Badges Screen — Full gallery, earned/locked states, detail modal
- [x] Leaderboard Screen — Course-scoped, weekly/all-time tabs, podium, public profiles
- [x] Profile Screen — Stats, avatar picker, sound/haptic toggles, logout
- [x] Public Profile Screen — View other students' badges, XP, level, stats
- [x] Level-Up Animation — Particle screen, sound, haptics, auto-dismiss
- [x] No Internet Screen — Retry mechanism, animated pulse, troubleshooting tips

### Instructor Portal
- [x] Instructor Dashboard — Stats, quick actions, course list, at-risk students
- [x] Create Lesson Screen — Subject, difficulty, content editor, draft/publish toggle
- [x] Create Quiz Screen — Question builder, correct answer security, timer, pass mark
- [x] Student Progress Screen — Class analytics, search, student drill-down, CSV export

### Admin Panel
- [x] Admin Dashboard — Platform stats, top learners, recent signups
- [x] Manage Users — Search, role filters, change role, suspend, delete
- [x] Manage Content — Courses/lessons tabs, publish toggle, delete

### Backend & Infrastructure
- [x] Firebase Authentication
- [x] Firestore Database — Full schema implemented
- [x] Firestore Security Rules — Production rules published
- [x] Hybrid Gamification Model — Instant local XP feedback + server sync
- [x] Cloud Functions code written — awardXP, checkBadges, updateLeaderboard
- [ ] Cloud Functions deployed — On hold pending Firebase Blaze plan activation

---

## 📁 Project Structure

```
ZiniQuest/
├── assets/          # Sounds, badge images, avatars, icons
├── functions/       # Firebase Cloud Functions (ready to deploy)
└── src/
    ├── config/      # Firebase + Cloudinary config
    ├── constants/   # Colors, typography, XP rules, subjects
    ├── components/  # Reusable UI components
    ├── hooks/       # useAuth, useUserData, useNetworkStatus
    ├── navigation/  # AppNavigator, StudentTabs, InstructorTabs
    ├── screens/     # All screens organised by role
    ├── services/    # Firebase service layer (auth, lessons, quiz, etc.)
    ├── store/       # Zustand stores
    └── utils/       # Level calc, sound player, haptics, date formatting
```

---

## 🎯 Demo Flow

1. Register a new student account
2. Complete onboarding (avatar → goal → subjects)
3. Browse and enrol in a course
4. Open a lesson, read content, mark complete — XP earned
5. Take a quiz — sounds, timer, haptics, instant feedback
6. View quiz result — grade, XP, pass/fail
7. Check Home dashboard — updated XP bar, streak, stats
8. View Badges screen — First Step badge unlocked
9. View Leaderboard — course ranking with podium
10. Tap a player → Public Profile
11. Switch to Instructor role → show content creation and student analytics
12. Switch to Admin role → show user management and content control

---

## 📝 Author

**Kazeem Okikiola El-Fayyd**
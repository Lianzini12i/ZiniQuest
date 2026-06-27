# ZiniQuest

**ZiniQuest** is a subject-agnostic, gamified mobile learning platform built for tertiary-level students across any academic discipline. By wrapping structured academic content in a game-like progression system — XP, badges, streaks, and leaderboards — ZiniQuest transforms passive studying into an active, rewarding experience.

Built as a B.Sc. Computer Science final year project at Crescent University Abeokuta, supervised by Dr. I. O. Lasisi.

---

## 🚀 Overview

Students earn XP and level up as they complete lessons and quizzes, collect achievement badges, maintain daily learning streaks, and compete on course-specific leaderboards. Instructors can create and publish content for any subject, monitor class performance in real time, and export student data for academic research. Administrators manage users, roles, and platform content through a dedicated dashboard.

---

## ✨ Key Features

### Student Experience
- **Animated Splash Screen** — Custom animated splash with logo spring-in, title fade, tagline reveal, and glow pulse before transitioning into the app
- **Gamified Progression** — Earn XP for every lesson completed and quiz passed. Level up through 10 titles from *Newbie* to *Code Legend*
- **Achievement Badges** — 12 unlockable badges with custom WebP artwork, criteria ranging from daily streaks to perfect quiz scores
- **Course Leaderboards** — Course-scoped weekly and all-time rankings with a gold/silver/bronze podium and public player profiles
- **Daily Streak System** — Daily activity tracking with streak milestones rewarding bonus XP at 7 and 30 days
- **Interactive Quizzes** — Per-question countdown timers, instant answer feedback with explanations, haptic responses, and sound effects
- **Level-Up Animation** — Full-screen particle animation with sound triggered on every level threshold crossed
- **Badge Unlock Modal** — Full-screen celebration with particles, bounce animation, custom WebP badge artwork, and 7-second auto-dismiss
- **Daily Goal Ring** — Tracks real study minutes completed today against the student's personal daily target
- **Resume Card** — Home screen card showing the last lesson accessed with one-tap navigation back into the course
- **Public Profiles** — View any student's badges, XP, level, and stats from the leaderboard

### Instructor Portal
- **Content Creation** — Create and publish lessons for any academic subject with rich text content and optional code block formatting
- **Quiz Builder** — Build multi-question quizzes with configurable pass marks, per-question timers, and answer explanations
- **Student Analytics** — Real-time class performance dashboard with per-student drill-down, at-risk student detection (inactive 7+ days), and class-wide pass rate tracking
- **CSV Data Export** — Export full student performance metrics as a CSV file for academic research and SPSS analysis

### Admin Panel
- **User Management** — Search, filter, and manage all users. Assign and revoke instructor roles, suspend accounts, and delete users
- **Content Management** — Publish, unpublish, and delete courses and lessons across all instructors from a single interface
- **Platform Analytics** — Top learners, recent signups, total users, courses, lessons, and quiz attempt counts

### Platform
- **Subject-Agnostic** — Supports any academic discipline. 20 courses across 8 subjects seeded for demonstration
- **Role-Based Access** — Three fully separate interfaces: Student, Instructor, and Admin
- **Resilient Connectivity** — No Internet overlay with retry mechanism, animated pulse, and troubleshooting tips
- **Sound Effects** — 9 bundled MP3 sound effects for XP earn, badge unlock, level-up, correct/wrong answers, button taps, and streak milestones
- **Haptic Feedback** — Full haptic feedback for all key interactions across success, error, light, and heavy categories
- **Firestore Security Rules** — Production-grade rules enforcing role-based access at the database level. Only `role` is write-protected from the client; XP, level, and badges are writable by the authenticated owner

---

## 🛠 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React Native (Expo SDK 54) | iOS + Android from one codebase |
| UI Library | React Native Paper (MD3) | Dark theme, consistent components |
| Navigation | React Navigation v6 | Stack + bottom tab navigators |
| State Management | Zustand | Auth store, user store |
| Auth & Database | Firebase Auth + Firestore | Free Spark tier — no Cloud Functions |
| Game Logic | Hybrid Local Model | Instant device-side XP + Firestore sync |
| Cloud Functions | Firebase Cloud Functions | Written, awaiting Blaze plan deployment |
| Profile Photos | Cloudinary (Free Tier) | Unsigned upload preset |
| Sound | expo-av | 9 bundled MP3 sound effects |
| Haptics | expo-haptics | Success, error, light, and heavy feedback |
| Forms | React Hook Form | Validation on all auth and content forms |
| Icons | @expo/vector-icons (MaterialCommunityIcons) | Used throughout |
| Badge Assets | 12 custom WebP images | Compressed, bundled in assets/badges/ |
| Network Detection | @react-native-community/netinfo | Online/offline guard |
| Demo Device | iPhone (Expo Go, SDK 54) | |

---

## 📊 Content

| Course | Subject | Modules | Lessons | Quizzes |
|---|---|---|---|---|
| Intro to Python | Programming | 3 | 15 | 3 |
| Algebra Fundamentals | Mathematics | 3 | 15 | 3 |
| ICT Law and AI Regulation | Business | 3 | 15 | 3 |
| + 17 additional courses | 8 subjects | — | — | — |
| **Total** | | | **45+** | **9+** |

---

## ✅ Feature Implementation Status

### Student Experience
- [x] Authentication — Register, Login, Logout
- [x] Onboarding — Avatar selection, daily goal, subject interests
- [x] Animated Splash Screen — Logo spring, title + tagline fade, glow pulse, auto-transition
- [x] Home Dashboard — XP bar, streak, stats, daily goal ring (real study time), resume card, enrolled courses, latest badge
- [x] Course Browser — Search, subject filters, enrolment flow
- [x] My Course Screen — Module accordion, lesson list, per-module progress bars
- [x] Lesson Detail — Rich text rendering, code block formatting, completion flow
- [x] Quiz Screen — Per-question timer, haptics, sounds, answer reveal, explanation
- [x] Quiz Result Screen — Grade, XP earned, retry, continue
- [x] Badges Screen — Full gallery with WebP artwork, earned/locked states, detail modal
- [x] Badge Unlock Modal — Full-screen celebration with particles, WebP badge image, 7-second auto-dismiss
- [x] Leaderboard Screen — Course-scoped, weekly/all-time tabs, podium, public profiles
- [x] Profile Screen — Stats, avatar picker, sound/haptic toggles, logout
- [x] Public Profile Screen — View other students' badges, XP, level, stats
- [x] Level-Up Animation — Particle screen, sound, haptics, auto-dismiss
- [x] No Internet Screen — Retry mechanism, animated pulse, troubleshooting tips
- [x] Streak Logic — Local device-side streak tracking with Firestore sync, runs once per session

### Instructor Portal
- [x] Instructor Dashboard — Stats, quick actions, course list, at-risk students
- [x] Create Lesson Screen — Subject, difficulty, content editor, draft/publish toggle
- [x] Create Quiz Screen — Question builder, correct answer storage, timer, pass mark
- [x] Student Progress Screen — Class analytics, search, student drill-down, CSV export

### Admin Panel
- [x] Admin Dashboard — Platform stats, top learners, recent signups
- [x] Manage Users — Search, role filters, change role, suspend, delete
- [x] Manage Content — Courses/lessons tabs, publish toggle, delete

### Backend & Infrastructure
- [x] Firebase Authentication
- [x] Firestore Database — Full schema implemented
- [x] Firestore Security Rules — Production rules published
- [x] Hybrid Gamification Model — Instant local XP + badge + streak logic with Firestore sync
- [x] Snapshot listener stability — Single session-scoped subscription, streak gate prevents write loops
- [x] Cloud Functions code written — awardXP, checkBadges, updateLeaderboard
- [ ] Cloud Functions deployed — Awaiting Firebase Blaze plan activation

---

## 📁 Project Structure

---
ZiniQuest/
├── App.js
├── assets/
│   ├── badges/
│   ├── sounds/
│   ├── icon.png
│   └── splash-icon.png
├── functions/
└── src/
├── config/
├── constants/
├── components/
├── hooks/
├── navigation/
├── screens/
│   ├── auth/
│   ├── shared/
│   ├── student/
│   ├── instructor/
│   └── admin/
├── services/
├── store/
└── utils/

---

## 🎯 Demo Flow

1. App launches — animated splash screen plays (logo, title, tagline, glow)
2. Register a new student account
3. Complete onboarding — avatar, daily goal, subjects
4. Browse and enrol in a course
5. Open a lesson, read content, mark complete — XP earned, streak updated
6. Take a quiz — sounds, timer, haptics, instant feedback
7. View quiz result — grade, XP, pass/fail
8. Check Home dashboard — updated XP bar, streak, daily goal ring, resume card
9. View Badges screen — First Step badge unlocked with full modal celebration and WebP artwork
10. View Leaderboard — course ranking with podium
11. Tap a player → Public Profile
12. Switch to Instructor role → content creation and student analytics with CSV export
13. Switch to Admin role → user management and content control

---

## 🔬 Research Methodology

This project follows a **Hybrid Evaluation Strategy** comprising:

- **Live Pilot Study (n=20)** — Real CS students at Crescent University using a pre-test / post-test design over a 2-week active run
- **Synthetic Data Generation (N=100)** — Programmatic Python pipeline generating a statistically augmented dataset for regression modelling
- **Instruments** — Unmodified SUS (10 items), TAM (12 items), and IMI (7 items) scales
- **Analysis** — Paired t-test (learning gains), One-sample t-test (SUS vs 68 benchmark), Multiple linear regression (engagement → achievement)

---

## 📝 Author

**Kazeem Okikiola El-Fayyd**
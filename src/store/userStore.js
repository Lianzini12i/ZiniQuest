import { create } from 'zustand';

const useUserStore = create((set, get) => ({
  profile: null,
  isLoadingProfile: false,

  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),

  // Optimistic local XP update (Hybrid Gamification Model)
  // Cloud Function remains the source of truth in Firestore
  addXPLocally: (amount) => {
    const profile = get().profile;
    if (!profile) return;
    set({ profile: { ...profile, xp: profile.xp + amount } });
  },

  addBadgeLocally: (badgeId) => {
    const profile = get().profile;
    if (!profile) return;
    if (profile.badges.includes(badgeId)) return;
    set({ profile: { ...profile, badges: [...profile.badges, badgeId] } });
  },

  setLoadingProfile: (val) => set({ isLoadingProfile: val }),
}));

export default useUserStore;
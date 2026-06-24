import { create } from 'zustand';

const useUserStore = create((set, get) => ({
  profile:              null,
  isLoadingProfile:     false,
  pendingBadgeModal:    null,

  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),

  // Local XP add — only used for instant visual feedback
  // Real value always comes from Firestore via subscribeToUserProfile
  addXPLocally: (amount) => {
    const profile = get().profile;
    if (!profile) return;
    set({ profile: { ...profile, xp: (profile.xp || 0) + amount } });
  },

  addBadgeLocally: (badgeId) => {
    const profile = get().profile;
    if (!profile) return;
    if ((profile.badges || []).includes(badgeId)) return;
    set({ profile: { ...profile, badges: [...(profile.badges || []), badgeId] } });
  },

  setLoadingProfile: (val) => set({ isLoadingProfile: val }),
  setPendingBadgeModal: (badgeId) => set({ pendingBadgeModal: badgeId }),
  clearPendingBadgeModal: () => set({ pendingBadgeModal: null }),
}));

export default useUserStore;
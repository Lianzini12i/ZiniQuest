import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { View, ActivityIndicator } from "react-native";

import { auth } from "../config/firebase";
import { getUserRole } from "../services/authService";
import { subscribeToUserProfile } from "../services/userService";
import useAuthStore from "../store/authStore";
import useUserStore from "../store/userStore";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { updateStreak } from '../services/gamificationService';
import { colors } from "../constants/colors";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import LevelUpScreen from "../screens/shared/LevelUpScreen";
import NoInternetScreen from "../screens/shared/NoInternetScreen";
import StudentTabs from "./StudentTabs";
import InstructorTabs from "./InstructorTabs";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import ManageUsersScreen from "../screens/admin/ManageUsersScreen";
import ManageContentScreen from "../screens/admin/ManageContentScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const { profile, setProfile } = useUserStore();
  const isConnected = useNetworkStatus();
  const navigationRef = useRef(null);

  // ── Track whether streak has been run this session ──────────
  const streakUpdatedRef = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      // Reset streak gate on every new login session
      streakUpdatedRef.current = false;
    });
    return unsubscribeAuth;
  }, []);

  // ── Real-time profile listener ───────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfile(null);
      streakUpdatedRef.current = false;
      return;
    }

    const unsubscribeProfile = subscribeToUserProfile(user.uid, (data) => {
      const wasNotLevelingUp = !profile?.pendingLevelUp;
      setProfile(data);

      // Run streak update only ONCE per session, not on every snapshot
      if (!streakUpdatedRef.current) {
        streakUpdatedRef.current = true;
        updateStreak(data.uid);
      }

      if (data?.pendingLevelUp && wasNotLevelingUp) {
        setTimeout(() => {
          navigationRef.current?.navigate('LevelUp', { level: data.level });
        }, 500);
      }
    });

    return unsubscribeProfile;
  }, [user]);

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isConnected) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="NoInternet" component={NoInternetScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : profile?.role === "admin" ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
            <Stack.Screen name="ManageContent" component={ManageContentScreen} />
          </>
        ) : profile?.role === "instructor" ? (
          <Stack.Screen name="InstructorTabs" component={InstructorTabs} />
        ) : (
          <>
            {profile && !profile.onboardingDone ? (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : (
              <>
                <Stack.Screen name="StudentTabs" component={StudentTabs} />
                <Stack.Screen
                  name="LevelUp"
                  component={LevelUpScreen}
                  options={{
                    presentation: "transparentModal",
                    animation: "fade",
                  }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
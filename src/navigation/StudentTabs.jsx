import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../constants/colors';

import HomeScreen from '../screens/student/HomeScreen';
import CourseBrowserScreen from '../screens/student/CourseBrowserScreen';
import MyCourseScreen from '../screens/student/MyCourseScreen';
import LessonDetailScreen from '../screens/student/LessonDetailScreen';
import QuizScreen from '../screens/student/QuizScreen';
import QuizResultScreen from '../screens/student/QuizResultScreen';
import LeaderboardScreen from '../screens/student/LeaderboardScreen';
import BadgesScreen from '../screens/student/BadgesScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import PublicProfileScreen from '../screens/student/PublicProfileScreen';

const Tab = createBottomTabNavigator();
const LearnStack = createNativeStackNavigator();

function LearnStackNavigator() {
  return (
    <LearnStack.Navigator screenOptions={{ headerShown: false }}>
      <LearnStack.Screen name="CourseBrowser" component={CourseBrowserScreen} />
      <LearnStack.Screen name="MyCourse" component={MyCourseScreen} />
      <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <LearnStack.Screen name="Quiz" component={QuizScreen} />
      <LearnStack.Screen name="QuizResult" component={QuizResultScreen} />
    </LearnStack.Navigator>
  );
}
const LeaderboardStack = createNativeStackNavigator();

function LeaderboardStackNavigator() {
  return (
    <LeaderboardStack.Navigator screenOptions={{ headerShown: false }}>
      <LeaderboardStack.Screen name="LeaderboardMain" component={LeaderboardScreen} />
      <LeaderboardStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </LeaderboardStack.Navigator>
  );
}

export default function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Learn: 'book-open-variant',
            Leaderboard: 'trophy',
            Badges: 'medal',
            Profile: 'account-circle',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name]}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Learn" component={LearnStackNavigator} />
      <Tab.Screen name="Leaderboard" component={LeaderboardStackNavigator} />
      <Tab.Screen name="Badges" component={BadgesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../constants/colors';

import InstructorHomeScreen from '../screens/instructor/InstructorHomeScreen';
import CreateLessonScreen from '../screens/instructor/CreateLessonScreen';
import CreateQuizScreen from '../screens/instructor/CreateQuizScreen';
import StudentProgressScreen from '../screens/instructor/StudentProgressScreen';

const Tab = createBottomTabNavigator();
const ContentStack = createNativeStackNavigator();

function ContentStackNavigator() {
  return (
    <ContentStack.Navigator screenOptions={{ headerShown: false }}>
      <ContentStack.Screen name="CreateLesson" component={CreateLessonScreen} />
      <ContentStack.Screen name="CreateQuiz" component={CreateQuizScreen} />
    </ContentStack.Navigator>
  );
}

export default function InstructorTabs() {
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
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            'Instructor Home': 'view-dashboard',
            Content: 'pencil-box-multiple',
            Students: 'account-group',
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
      <Tab.Screen name="Instructor Home" component={InstructorHomeScreen} />
      <Tab.Screen name="Content" component={ContentStackNavigator} />
      <Tab.Screen name="Students" component={StudentProgressScreen} />
    </Tab.Navigator>
  );
}
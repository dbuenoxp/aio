import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { HomeScreen } from '../features/home/HomeScreen';
import { TasksScreen } from '../features/tasks/TasksScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { FinanceScreen } from '../features/finance/FinanceScreen';
import { FitnessScreen } from '../features/fitness/FitnessScreen';
import { typography } from '../theme';
import { useThemeStore } from '../store/useThemeStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const AppTabNavigator: React.FC = () => {
  const { palette } = useThemeStore();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: palette.cyanLight,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: palette.isDark
              ? palette.background
              : palette.surface,
            borderTopColor: palette.border,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Finance') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Fitness') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ tabBarLabel: 'Tareas' }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ tabBarLabel: 'Metas' }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ tabBarLabel: 'Finanzas' }}
      />
      <Tab.Screen
        name="Fitness"
        component={FitnessScreen}
        options={{ tabBarLabel: 'Fitness' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

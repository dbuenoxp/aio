import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Goals: undefined;
  Finance: undefined;
  Fitness: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  MainApp: NavigatorScreenParams<MainTabParamList> | undefined;
};

import React, { useEffect, useMemo, useRef } from 'react';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { RootStackParamList } from './types';
import { notificationService } from '../services/notifications/NotificationService';
import { ActiveAlarmModal } from '../features/tasks/components/ActiveAlarmModal';
import { SettingsModal } from '../features/home/components/SettingsModal';
import { CelebrationModal } from '../components/common/CelebrationModal';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { palette } = useThemeStore();
  const { isAuthenticated, checkSession } = useAuthStore();
  const wasAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    notificationService.init();
    checkSession();
  }, []);

  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const navigationTheme = useMemo(() => {
    const base = palette.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.background,
        card: palette.surface,
        text: palette.textPrimary,
        border: palette.border,
        primary: palette.primary,
      },
    };
  }, [palette]);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <AuthNavigator />
      <ActiveAlarmModal />
      <SettingsModal />
      <CelebrationModal />
    </NavigationContainer>
  );
};

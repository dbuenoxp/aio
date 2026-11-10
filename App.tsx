import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AIO_FAVICON_DATA_URI } from './src/theme/aioFaviconDataUri';
import { useThemeStore } from './src/store/useThemeStore';

export default function App() {
  const { themeMode } = useThemeStore();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'AIO • All In One';

      // Remove existing default Expo favicons so the browser immediately updates the tab icon
      const existingIcons = document.querySelectorAll(
        "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
      );
      existingIcons.forEach((node) => node.parentNode?.removeChild(node));

      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.type = 'image/png';
      iconLink.href = AIO_FAVICON_DATA_URI;
      document.head.appendChild(iconLink);

      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = 'image/png';
      shortcutLink.href = AIO_FAVICON_DATA_URI;
      document.head.appendChild(shortcutLink);

      const appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      appleTouchLink.href = AIO_FAVICON_DATA_URI;
      document.head.appendChild(appleTouchLink);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

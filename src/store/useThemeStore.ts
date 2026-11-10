import { create } from 'zustand';
import { Platform } from 'react-native';
import {
  ThemeMode,
  ThemePalette,
  THEME_PALETTES,
  syncThemeTokens,
} from '../theme';

const STORAGE_KEY = 'aio_theme_mode_v1';

function getInitialThemeMode(): ThemeMode {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light' || saved === 'hybrid') {
        syncThemeTokens(saved);
        return saved;
      }
    } catch {
      // ignore storage errors
    }
  }
  return 'dark';
}

interface ThemeState {
  themeMode: ThemeMode;
  palette: ThemePalette;
  settingsModalVisible: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setSettingsModalVisible: (visible: boolean) => void;
}

const initialMode = getInitialThemeMode();
const initialPalette = syncThemeTokens(initialMode);

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: initialMode,
  palette: initialPalette,
  settingsModalVisible: false,

  setThemeMode: (mode: ThemeMode) => {
    const nextPalette = syncThemeTokens(mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = nextPalette.background;
        }
      } catch {
        // ignore storage errors
      }
    }
    set({
      themeMode: mode,
      palette: nextPalette,
    });
  },

  setSettingsModalVisible: (visible: boolean) => {
    set({ settingsModalVisible: visible });
  },
}));

export { THEME_PALETTES };


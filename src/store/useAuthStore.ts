import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { biometricsService } from '../services/auth/BiometricsService';
import { userRepository } from '../services/db/repositories/userRepository';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, emailOrUser: string, pass: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  loginWithBiometrics: () => Promise<boolean>;
  updateUserProfile: (data: {
    name: string;
    username?: string;
    email?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const STORAGE_KEYS = {
  USER: 'aio_session_user',
  ONBOARDED: 'aio_onboarding_completed',
};

function getInitialWebUser(): User | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.USER);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        if (
          (parsed.name === 'dbueno' || parsed.name === 'Daniel Bueno') &&
          (parsed.username === 'dbueno' || parsed.id === 'usr-dbueno')
        ) {
          parsed.name = 'Diego Bueno';
        }
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

const initialWebUser = getInitialWebUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialWebUser,
  isAuthenticated: !!initialWebUser,
  isOnboarded: false,
  isLoading: true,

  checkSession: async () => {
    try {
      const [userJson, onboardedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
      ]);

      const isOnboarded = onboardedStr === 'true';

      if (userJson) {
        const user = JSON.parse(userJson) as User;
        // Automatically upgrade legacy 'dbueno' display name to full name 'Diego Bueno'
        if (
          (user.name === 'dbueno' || user.name === 'Daniel Bueno') &&
          (user.username === 'dbueno' || user.id === 'usr-dbueno')
        ) {
          user.name = 'Diego Bueno';
          user.username = user.username || 'dbueno';
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
        set({
          user,
          isAuthenticated: true,
          isOnboarded,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isOnboarded,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (identifier: string, pass: string) => {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: 'Por favor ingresa tu usuario o correo electrónico' };
    }
    if (!pass) {
      return { success: false, error: 'Por favor ingresa tu contraseña' };
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. FAST-PATH: Instant check for dbueno / admin1414 (guaranteed 0ms latency, zero hang)
    if (
      (cleanIdentifier === 'dbueno' || cleanIdentifier === 'dbueno@aio.app') &&
      pass === 'admin1414'
    ) {
      const existingStored = await userRepository.findByUsernameOrEmail('dbueno');
      const adminUser: User = existingStored?.user || {
        id: 'usr-dbueno',
        username: 'dbueno',
        name: 'Diego Bueno',
        email: 'dbueno@aio.app',
        isGuest: false,
        biometricsEnabled: true,
        createdAt: new Date().toISOString(),
      };
      if (adminUser.name === 'dbueno' || adminUser.name === 'Daniel Bueno') {
        adminUser.name = 'Diego Bueno';
      }
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(adminUser));
      set({ user: adminUser, isAuthenticated: true });
      return { success: true };
    }

    try {
      // 2. Verify credentials via userRepository (checks persistent storage and SQLite)
      const verifyRes = await userRepository.verifyCredentials(cleanIdentifier, pass);
      if (verifyRes.success && verifyRes.user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(verifyRes.user));
        set({ user: verifyRes.user, isAuthenticated: true });
        return { success: true };
      }

      return {
        success: false,
        error: verifyRes.error || 'Usuario o contraseña incorrectos',
      };
    } catch {
      if (
        (cleanIdentifier.toLowerCase() === 'dbueno' || cleanIdentifier.toLowerCase() === 'dbueno@aio.app') &&
        pass === 'admin1414'
      ) {
        const adminUser: User = {
          id: 'usr-dbueno',
          username: 'dbueno',
          name: 'Diego Bueno',
          email: 'dbueno@aio.app',
          isGuest: false,
          biometricsEnabled: true,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(adminUser));
        set({ user: adminUser, isAuthenticated: true });
        return { success: true };
      }
      return { success: false, error: 'Credenciales inválidas' };
    }
  },

  register: async (name: string, emailOrUser: string, pass: string, username?: string) => {
    if (!name.trim()) {
      return { success: false, error: 'Por favor ingresa tu nombre completo' };
    }
    if (!emailOrUser.trim()) {
      return { success: false, error: 'Por favor ingresa tu correo electrónico o usuario' };
    }
    if (!pass || pass.length < 4) {
      return { success: false, error: 'La contraseña debe tener al menos 4 caracteres' };
    }

    try {
      const cleanEmail = emailOrUser.includes('@')
        ? emailOrUser.trim().toLowerCase()
        : `${emailOrUser.trim().toLowerCase()}@aio.app`;
      const cleanUsername = username?.trim().toLowerCase() || emailOrUser.trim().toLowerCase().replace('@aio.app', '');

      const dbRes = await userRepository.createUser({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: pass,
      });

      if (!dbRes.success || !dbRes.user) {
        return { success: false, error: dbRes.error || 'Error al guardar el usuario en la base de datos' };
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(dbRes.user));
        } catch {
          // ignore
        }
      }
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(dbRes.user));
      set({ user: dbRes.user, isAuthenticated: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al registrar la cuenta' };
    }
  },

  loginAsGuest: () => {
    const guestUser: User = {
      id: 'guest-1',
      name: 'Invitado Demo',
      email: 'invitado@aio.app',
      isGuest: true,
      biometricsEnabled: false,
      createdAt: new Date().toISOString(),
    };
    set({ user: guestUser, isAuthenticated: true });
  },

  loginWithBiometrics: async () => {
    const success = await biometricsService.authenticate('Ingresa a AIO con tu biometría');
    if (success) {
      const user: User = {
        id: 'bio-user-1',
        name: 'Usuario AIO',
        email: 'usuario@aio.app',
        isGuest: false,
        biometricsEnabled: true,
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return true;
    }
    return false;
  },

  updateUserProfile: async ({ name, username, email }) => {
    const current = get().user || {
      id: 'usr-dbueno',
      username: 'dbueno',
      name: 'Diego Bueno',
      email: 'dbueno@aio.app',
      isGuest: false,
      biometricsEnabled: true,
      createdAt: new Date().toISOString(),
    };

    const cleanName = name.trim() || current.name;
    const cleanUsername = username?.trim().toLowerCase() || current.username || 'dbueno';
    const cleanEmail = email?.trim().toLowerCase() || current.email || 'dbueno@aio.app';

    const updatedUser: User = {
      ...current,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
    };

    // Update Zustand state immediately so UI reflects the change synchronously
    set({ user: updatedUser, isAuthenticated: true });

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      } catch {
        // ignore
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    await userRepository.updateProfile(updatedUser.id, {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
    });
  },

  logout: async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        // ignore
      }
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    set({ user: null, isAuthenticated: false });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
    set({ isOnboarded: true });
  },
}));

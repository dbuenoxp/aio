import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDatabase } from '../sqlite';
import { User } from '../../../types';

const STORAGE_USERS_KEY = 'aio_local_users_registry';

interface StoredUserRecord {
  user: User;
  passwordHash: string;
}

// Default seeded administrator credentials
const DEFAULT_ADMIN_RECORD: StoredUserRecord = {
  user: {
    id: 'usr-dbueno',
    username: 'dbueno',
    name: 'Diego Bueno',
    email: 'dbueno@aio.app',
    isGuest: false,
    biometricsEnabled: true,
    createdAt: new Date().toISOString(),
  },
  passwordHash: 'admin1414',
};

async function getStoredUsersFromStorage(): Promise<StoredUserRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) return [DEFAULT_ADMIN_RECORD];
    const parsed = JSON.parse(raw) as StoredUserRecord[];
    // Ensure default admin is always present
    const hasAdmin = parsed.some(
      (r) =>
        r.user.username?.toLowerCase() === 'dbueno' ||
        r.user.email.toLowerCase() === 'dbueno@aio.app'
    );
    if (!hasAdmin) {
      parsed.push(DEFAULT_ADMIN_RECORD);
    }
    return parsed;
  } catch {
    return [DEFAULT_ADMIN_RECORD];
  }
}

async function saveStoredUsersToStorage(records: StoredUserRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export const userRepository = {
  /**
   * Find a user by their username OR their email (case-insensitive)
   */
  async findByUsernameOrEmail(
    identifier: string
  ): Promise<{ user: User; passwordHash: string | null } | null> {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Check AsyncStorage persistent registry first (preserves edited profile name)
    const localUsers = await getStoredUsersFromStorage();
    const localMatch = localUsers.find(
      (r) =>
        r.user.username?.toLowerCase() === cleanId ||
        r.user.email.toLowerCase() === cleanId
    );
    if (localMatch) {
      if (
        (localMatch.user.name === 'dbueno' ||
          localMatch.user.name === 'Daniel Bueno') &&
        localMatch.user.username === 'dbueno'
      ) {
        localMatch.user.name = 'Diego Bueno';
      }
      return {
        user: localMatch.user,
        passwordHash: localMatch.passwordHash,
      };
    }

    // 2. Direct fallback match for default admin credentials
    if (cleanId === 'dbueno' || cleanId === 'dbueno@aio.app') {
      return {
        user: DEFAULT_ADMIN_RECORD.user,
        passwordHash: DEFAULT_ADMIN_RECORD.passwordHash,
      };
    }

    // 3. Check SQLite database if available
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM users 
         WHERE LOWER(username) = ? OR LOWER(email) = ? 
         LIMIT 1`,
        cleanId,
        cleanId
      );

      if (row) {
        return {
          user: {
            id: row.id,
            username: row.username || undefined,
            name: row.name,
            email: row.email,
            isGuest: row.is_guest === 1,
            biometricsEnabled: row.biometrics_enabled === 1,
            avatarUrl: row.avatar_url || undefined,
            createdAt: row.created_at,
          },
          passwordHash: row.password_hash,
        };
      }
    } catch {
      // Fallback silently
    }

    return null;
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    if (id === 'usr-dbueno') return DEFAULT_ADMIN_RECORD.user;

    const localUsers = await getStoredUsersFromStorage();
    const localMatch = localUsers.find((r) => r.user.id === id);
    if (localMatch) return localMatch.user;

    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        id
      );
      if (row) {
        return {
          id: row.id,
          username: row.username || undefined,
          name: row.name,
          email: row.email,
          isGuest: row.is_guest === 1,
          biometricsEnabled: row.biometrics_enabled === 1,
          avatarUrl: row.avatar_url || undefined,
          createdAt: row.created_at,
        };
      }
    } catch {
      // fallback
    }

    return null;
  },

  /**
   * Create a new registered user in the database and local storage
   */
  async createUser(params: {
    name: string;
    username?: string;
    email: string;
    password?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const cleanEmail = params.email.trim().toLowerCase();
      const cleanUsername = (
        params.username || params.email.split('@')[0]
      )
        .trim()
        .toLowerCase();

      // Check duplicate in AsyncStorage
      const localUsers = await getStoredUsersFromStorage();
      const duplicate = localUsers.find(
        (r) =>
          r.user.email.toLowerCase() === cleanEmail ||
          (r.user.username && r.user.username.toLowerCase() === cleanUsername)
      );

      if (duplicate) {
        if (duplicate.user.email.toLowerCase() === cleanEmail) {
          return {
            success: false,
            error: 'Ya existe una cuenta con este correo electrónico',
          };
        }
        if (
          duplicate.user.username &&
          duplicate.user.username.toLowerCase() === cleanUsername
        ) {
          return {
            success: false,
            error: 'Este nombre de usuario ya está en uso',
          };
        }
      }

      const id = `usr-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newUser: User = {
        id,
        username: cleanUsername,
        name: params.name.trim(),
        email: cleanEmail,
        isGuest: false,
        biometricsEnabled: true,
        avatarUrl: params.avatarUrl,
        createdAt: nowIso,
      };

      const newRecord: StoredUserRecord = {
        user: newUser,
        passwordHash: params.password || '',
      };

      // 1. Save to persistent AsyncStorage
      localUsers.push(newRecord);
      await saveStoredUsersToStorage(localUsers);

      // 2. Also save to SQLite if available
      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT INTO users (id, username, name, email, password_hash, is_guest, biometrics_enabled, avatar_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          cleanUsername,
          params.name.trim(),
          cleanEmail,
          params.password || null,
          0,
          1,
          params.avatarUrl || null,
          nowIso
        );
      } catch {
        // SQLite sync optional on web
      }

      return { success: true, user: newUser };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error al guardar el usuario en la base de datos',
      };
    }
  },

  /**
   * Verify credentials against local SQLite database and persistent registry
   */
  async verifyCredentials(
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();

    // Fast-path: default admin (prefer stored profile if customized)
    if (
      (cleanId === 'dbueno' || cleanId === 'dbueno@aio.app') &&
      pass === 'admin1414'
    ) {
      const localUsers = await getStoredUsersFromStorage();
      const customAdmin = localUsers.find(
        (r) =>
          r.user.id === 'usr-dbueno' ||
          r.user.username?.toLowerCase() === 'dbueno'
      );
      if (customAdmin) {
        if (
          customAdmin.user.name === 'dbueno' ||
          customAdmin.user.name === 'Daniel Bueno'
        ) {
          customAdmin.user.name = 'Diego Bueno';
        }
        return { success: true, user: customAdmin.user };
      }
      return { success: true, user: DEFAULT_ADMIN_RECORD.user };
    }

    const found = await this.findByUsernameOrEmail(identifier);
    if (!found) {
      return { success: false, error: 'Usuario o correo no encontrado' };
    }

    if (found.passwordHash !== pass) {
      return { success: false, error: 'Contraseña incorrecta' };
    }

    return { success: true, user: found.user };
  },

  /**
   * Update user profile (name, username, email)
   */
  async updateProfile(
    userId: string,
    data: { name: string; username?: string; email?: string }
  ): Promise<User | null> {
    const cleanName = data.name.trim();
    const cleanUsername = data.username?.trim().toLowerCase();
    const cleanEmail = data.email?.trim().toLowerCase();

    const localUsers = await getStoredUsersFromStorage();
    let updatedUser: User | null = null;

    const idx = localUsers.findIndex((r) => r.user.id === userId);
    if (idx !== -1) {
      localUsers[idx].user = {
        ...localUsers[idx].user,
        name: cleanName || localUsers[idx].user.name,
        username: cleanUsername || localUsers[idx].user.username,
        email: cleanEmail || localUsers[idx].user.email,
      };
      updatedUser = localUsers[idx].user;
      await saveStoredUsersToStorage(localUsers);
    } else if (userId === 'usr-dbueno') {
      DEFAULT_ADMIN_RECORD.user = {
        ...DEFAULT_ADMIN_RECORD.user,
        name: cleanName || DEFAULT_ADMIN_RECORD.user.name,
        username: cleanUsername || DEFAULT_ADMIN_RECORD.user.username,
        email: cleanEmail || DEFAULT_ADMIN_RECORD.user.email,
      };
      localUsers.push(DEFAULT_ADMIN_RECORD);
      updatedUser = DEFAULT_ADMIN_RECORD.user;
      await saveStoredUsersToStorage(localUsers);
    }

    if (userId === 'usr-dbueno' && updatedUser) {
      DEFAULT_ADMIN_RECORD.user = updatedUser;
    }

    try {
      const db = await getDatabase();
      if (updatedUser) {
        await db.runAsync(
          'UPDATE users SET name = ?, username = ?, email = ? WHERE id = ?',
          updatedUser.name,
          updatedUser.username || null,
          updatedUser.email,
          userId
        );
      }
    } catch {
      // ignore sqlite error on web if any
    }

    return updatedUser;
  },

  /**
   * Get all registered users
   */
  async getAllUsers(): Promise<User[]> {
    const localUsers = await getStoredUsersFromStorage();
    return localUsers.map((r) => r.user);
  },
};

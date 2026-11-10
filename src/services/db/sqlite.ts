import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { getWebDatabase, resetWebDatabaseData } from './webDatabase';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    return (await getWebDatabase()) as unknown as SQLite.SQLiteDatabase;
  }

  if (databaseInstance) {
    return databaseInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('aio_app.db');
      await db.execAsync(CREATE_TABLES_SQL);

      // Safe schema upgrades for users table
      try {
        await db.execAsync('ALTER TABLE users ADD COLUMN username TEXT;');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE users ADD COLUMN password_hash TEXT;');
      } catch {
        // column already exists
      }

      // Safe schema upgrades for transactions table
      try {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN total_amount REAL;');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN my_percentage REAL DEFAULT 100;');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN involved_people TEXT;');
      } catch {
        // column already exists
      }

      await seedInitialDataIfNeeded(db);
      databaseInstance = db;
      return db;
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Ensures only the base user account and default fitness profile exist.
 * Tasks, transactions, goals, and workouts start completely empty (clean slate for production).
 */
async function seedInitialDataIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  // 1. Ensure default admin user dbueno (Diego Bueno) exists with password admin1414
  const existingAdmin = await db.getFirstAsync<{ id: string; name: string }>(
    "SELECT id, name FROM users WHERE username = 'dbueno' OR email = 'dbueno@aio.app' LIMIT 1"
  );
  if (!existingAdmin) {
    const nowIso = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO users (id, username, name, email, password_hash, is_guest, biometrics_enabled, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'usr-dbueno',
      'dbueno',
      'Diego Bueno',
      'dbueno@aio.app',
      'admin1414',
      0,
      1,
      null,
      nowIso
    );
  } else {
    const nextName =
      existingAdmin.name === 'dbueno' || existingAdmin.name === 'Daniel Bueno'
        ? 'Diego Bueno'
        : existingAdmin.name;
    await db.runAsync(
      "UPDATE users SET password_hash = 'admin1414', username = 'dbueno', name = ? WHERE id = ? OR username = 'dbueno'",
      nextName,
      existingAdmin.id
    );
  }

  // Clean up any legacy seeded demo rows if they existed from development
  try {
    await db.runAsync("DELETE FROM tasks WHERE id IN ('task-1', 'task-2', 'task-3')");
    await db.runAsync("DELETE FROM transactions WHERE id IN ('tx-1', 'tx-2', 'tx-3', 'tx-4')");
    await db.runAsync("DELETE FROM milestones WHERE goal_id IN ('goal-1', 'goal-2')");
    await db.runAsync("DELETE FROM goals WHERE id IN ('goal-1', 'goal-2')");
    await db.runAsync("DELETE FROM workout_entries WHERE id IN ('wko-1', 'wko-2')");
    await db.runAsync("DELETE FROM weight_entries WHERE id = 'w-1'");
  } catch {
    // ignore cleanup error
  }

  // 2. Ensure base fitness_profile row exists so user can configure weight & hydration
  const existingProfile = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM fitness_profile LIMIT 1'
  );
  if (!existingProfile) {
    await db.runAsync(
      `INSERT INTO fitness_profile (
        id, current_weight, target_weight, initial_weight, height, unit,
        hydration_reminder_hours, hydration_reminder_enabled, workout_reminder_time, workout_reminder_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'default_profile',
      70.0,
      68.0,
      70.0,
      175.0,
      'kg',
      2,
      1,
      '07:30',
      1
    );
  }
}

/**
 * Clears all tasks, transactions, goals, milestones, workouts, and water/weight logs
 * while keeping the user account and fitness profile configuration intact.
 */
export async function clearAllUserData(): Promise<void> {
  if (Platform.OS === 'web') {
    await resetWebDatabaseData();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks');
  await db.runAsync('DELETE FROM milestones');
  await db.runAsync('DELETE FROM goals');
  await db.runAsync('DELETE FROM transactions');
  await db.runAsync('DELETE FROM workout_entries');
  await db.runAsync('DELETE FROM weight_entries');
  await db.runAsync('DELETE FROM water_logs');
}

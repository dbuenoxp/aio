import { getDatabase } from '../sqlite';
import {
  FitnessProfile,
  WeightEntry,
  WaterLog,
  WorkoutEntry,
  WorkoutCategory,
} from '../../../types';

interface ProfileRow {
  current_weight: number;
  target_weight: number;
  initial_weight: number;
  height: number;
  unit: string;
  hydration_reminder_hours: number;
  hydration_reminder_enabled: number;
  workout_reminder_time: string;
  workout_reminder_enabled: number;
}

interface WeightRow {
  id: string;
  weight: number;
  date: string;
  note: string | null;
  created_at: string;
}

interface WaterRow {
  id: string;
  date: string;
  glasses: number;
  target_glasses: number;
  amount_ml: number;
  updated_at: string;
}

interface WorkoutRow {
  id: string;
  title: string;
  category: string;
  duration_minutes: number;
  calories_burned: number;
  date: string;
  completed: number;
  created_at: string;
}

export const fitnessRepository = {
  async getProfile(): Promise<FitnessProfile> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProfileRow>(
      'SELECT * FROM fitness_profile LIMIT 1'
    );

    if (!row) {
      return {
        currentWeight: 70,
        targetWeight: 65,
        initialWeight: 75,
        height: 175,
        unit: 'kg',
        hydrationReminderIntervalHours: 2,
        hydrationReminderEnabled: true,
        workoutReminderTime: '07:30',
        workoutReminderEnabled: true,
      };
    }

    return {
      currentWeight: row.current_weight,
      targetWeight: row.target_weight,
      initialWeight: row.initial_weight,
      height: row.height,
      unit: (row.unit as 'kg' | 'lbs') || 'kg',
      hydrationReminderIntervalHours: row.hydration_reminder_hours,
      hydrationReminderEnabled: row.hydration_reminder_enabled === 1,
      workoutReminderTime: row.workout_reminder_time,
      workoutReminderEnabled: row.workout_reminder_enabled === 1,
    };
  },

  async updateProfile(profile: Partial<FitnessProfile>): Promise<void> {
    const db = await getDatabase();
    const current = await this.getProfile();
    const updated = { ...current, ...profile };

    await db.runAsync(
      `UPDATE fitness_profile SET
        current_weight = ?, target_weight = ?, initial_weight = ?, height = ?, unit = ?,
        hydration_reminder_hours = ?, hydration_reminder_enabled = ?,
        workout_reminder_time = ?, workout_reminder_enabled = ?
       WHERE id = 'default_profile'`,
      updated.currentWeight,
      updated.targetWeight,
      updated.initialWeight,
      updated.height,
      updated.unit,
      updated.hydrationReminderIntervalHours,
      updated.hydrationReminderEnabled ? 1 : 0,
      updated.workoutReminderTime,
      updated.workoutReminderEnabled ? 1 : 0
    );
  },

  async getWeightHistory(): Promise<WeightEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<WeightRow>(
      'SELECT * FROM weight_entries ORDER BY date DESC'
    );
    return rows.map((r) => ({
      id: r.id,
      weight: r.weight,
      date: r.date,
      note: r.note || undefined,
      createdAt: r.created_at,
    }));
  },

  async addWeightEntry(weight: number, note?: string): Promise<WeightEntry> {
    const db = await getDatabase();
    const id = `w-${Date.now()}`;
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO weight_entries (id, weight, date, note, created_at) VALUES (?, ?, ?, ?, ?)',
      id,
      weight,
      now,
      note || null,
      now
    );

    // Also update current_weight in profile
    await db.runAsync(
      'UPDATE fitness_profile SET current_weight = ? WHERE id = ' + "'default_profile'",
      weight
    );

    return {
      id,
      weight,
      date: now,
      note,
      createdAt: now,
    };
  },

  async getTodayWater(dateString: string): Promise<WaterLog> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<WaterRow>(
      'SELECT * FROM water_logs WHERE date = ?',
      dateString
    );

    if (!row) {
      const id = `water-${dateString}`;
      const now = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO water_logs (id, date, glasses, target_glasses, amount_ml, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        dateString,
        0,
        8,
        0,
        now
      );
      return {
        id,
        date: dateString,
        glasses: 0,
        targetGlasses: 8,
        amountMl: 0,
        updatedAt: now,
      };
    }

    return {
      id: row.id,
      date: row.date,
      glasses: row.glasses,
      targetGlasses: row.target_glasses,
      amountMl: row.amount_ml,
      updatedAt: row.updated_at,
    };
  },

  async updateWater(
    dateString: string,
    glasses: number,
    targetGlasses = 8
  ): Promise<WaterLog> {
    const db = await getDatabase();
    const amountMl = Math.max(0, glasses * 250);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO water_logs (id, date, glasses, target_glasses, amount_ml, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         glasses = excluded.glasses,
         target_glasses = excluded.target_glasses,
         amount_ml = excluded.amount_ml,
         updated_at = excluded.updated_at`,
      `water-${dateString}`,
      dateString,
      Math.max(0, glasses),
      targetGlasses,
      amountMl,
      now
    );

    return {
      id: `water-${dateString}`,
      date: dateString,
      glasses: Math.max(0, glasses),
      targetGlasses,
      amountMl,
      updatedAt: now,
    };
  },

  async getWorkouts(): Promise<WorkoutEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<WorkoutRow>(
      'SELECT * FROM workout_entries ORDER BY date DESC, created_at DESC'
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category as WorkoutCategory,
      durationMinutes: r.duration_minutes,
      caloriesBurned: r.calories_burned,
      date: r.date,
      completed: r.completed === 1,
      createdAt: r.created_at,
    }));
  },

  async addWorkout(
    entry: Omit<WorkoutEntry, 'id' | 'createdAt'>
  ): Promise<WorkoutEntry> {
    const db = await getDatabase();
    const id = `wko-${Date.now()}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO workout_entries (
        id, title, category, duration_minutes, calories_burned, date, completed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      entry.title,
      entry.category,
      entry.durationMinutes,
      entry.caloriesBurned,
      entry.date,
      entry.completed ? 1 : 0,
      now
    );

    return {
      ...entry,
      id,
      createdAt: now,
    };
  },

  async toggleWorkout(id: string, completed: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE workout_entries SET completed = ? WHERE id = ?',
      completed ? 1 : 0,
      id
    );
  },
};

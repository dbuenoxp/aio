import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import {
  FitnessProfile,
  WeightEntry,
  WaterLog,
  WorkoutEntry,
  WorkoutCategory,
} from '../types';
import { fitnessRepository } from '../services/db/repositories/fitnessRepository';
import { notificationService } from '../services/notifications/NotificationService';
import { useCelebrationStore } from './useCelebrationStore';

interface FitnessState {
  profile: FitnessProfile;
  weightHistory: WeightEntry[];
  todayWater: WaterLog;
  workouts: WorkoutEntry[];
  isLoading: boolean;
  loadFitness: () => Promise<void>;
  updateProfile: (data: Partial<FitnessProfile>) => Promise<void>;
  addWeight: (weight: number, note?: string) => Promise<WeightEntry>;
  incrementWater: () => Promise<void>;
  decrementWater: () => Promise<void>;
  setTargetGlasses: (target: number) => Promise<void>;
  toggleHydrationReminder: (enabled: boolean, hours?: number) => Promise<void>;
  toggleWorkoutReminder: (enabled: boolean, time?: string) => Promise<void>;
  addWorkout: (data: {
    title: string;
    category: WorkoutCategory;
    durationMinutes: number;
    caloriesBurned: number;
    date: Date;
  }) => Promise<WorkoutEntry>;
  toggleWorkout: (id: string) => Promise<void>;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export const useFitnessStore = create<FitnessState>((set, get) => ({
  profile: {
    currentWeight: 74.5,
    targetWeight: 68.0,
    initialWeight: 78.0,
    height: 175.0,
    unit: 'kg',
    hydrationReminderIntervalHours: 2,
    hydrationReminderEnabled: true,
    workoutReminderTime: '07:30',
    workoutReminderEnabled: true,
  },
  weightHistory: [],
  todayWater: {
    id: 'today',
    date: getTodayString(),
    glasses: 0,
    targetGlasses: 8,
    amountMl: 0,
    updatedAt: new Date().toISOString(),
  },
  workouts: [],
  isLoading: false,

  loadFitness: async () => {
    set({ isLoading: true });
    try {
      const todayStr = getTodayString();
      const [profile, weightHistory, todayWater, workouts] = await Promise.all([
        fitnessRepository.getProfile(),
        fitnessRepository.getWeightHistory(),
        fitnessRepository.getTodayWater(todayStr),
        fitnessRepository.getWorkouts(),
      ]);

      set({
        profile,
        weightHistory,
        todayWater,
        workouts,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading fitness data:', error);
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Partial<FitnessProfile>) => {
    await fitnessRepository.updateProfile(data);
    set((state) => ({ profile: { ...state.profile, ...data } }));
  },

  addWeight: async (weight: number, note?: string) => {
    const entry = await fitnessRepository.addWeightEntry(weight, note);
    set((state) => ({
      weightHistory: [entry, ...state.weightHistory],
      profile: { ...state.profile, currentWeight: weight },
    }));
    return entry;
  },

  incrementWater: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics fallback on unsupported platforms
    }

    const currentGlasses = get().todayWater.glasses;
    const targetGlasses = get().todayWater.targetGlasses;
    const todayStr = getTodayString();

    const updated = await fitnessRepository.updateWater(
      todayStr,
      currentGlasses + 1,
      targetGlasses
    );

    set({ todayWater: updated });
  },

  decrementWater: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }

    const currentGlasses = get().todayWater.glasses;
    if (currentGlasses <= 0) return;

    const targetGlasses = get().todayWater.targetGlasses;
    const todayStr = getTodayString();

    const updated = await fitnessRepository.updateWater(
      todayStr,
      currentGlasses - 1,
      targetGlasses
    );

    set({ todayWater: updated });
  },

  setTargetGlasses: async (targetGlasses: number) => {
    const currentGlasses = get().todayWater.glasses;
    const todayStr = getTodayString();
    const updated = await fitnessRepository.updateWater(
      todayStr,
      currentGlasses,
      targetGlasses
    );
    set({ todayWater: updated });
  },

  toggleHydrationReminder: async (enabled: boolean, hours?: number) => {
    const currentProfile = get().profile;
    const intervalHours = hours || currentProfile.hydrationReminderIntervalHours;

    if (enabled) {
      await notificationService.scheduleHydrationReminder(intervalHours);
    } else {
      await notificationService.cancelHydrationReminders();
    }

    await fitnessRepository.updateProfile({
      hydrationReminderEnabled: enabled,
      hydrationReminderIntervalHours: intervalHours,
    });

    set((state) => ({
      profile: {
        ...state.profile,
        hydrationReminderEnabled: enabled,
        hydrationReminderIntervalHours: intervalHours,
      },
    }));
  },

  toggleWorkoutReminder: async (enabled: boolean, timeStr?: string) => {
    const time = timeStr || get().profile.workoutReminderTime;
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));

    if (enabled) {
      await notificationService.scheduleDailyWorkoutReminder(h || 7, m || 30);
    }

    await fitnessRepository.updateProfile({
      workoutReminderEnabled: enabled,
      workoutReminderTime: time,
    });

    set((state) => ({
      profile: {
        ...state.profile,
        workoutReminderEnabled: enabled,
        workoutReminderTime: time,
      },
    }));
  },

  addWorkout: async ({ title, category, durationMinutes, caloriesBurned, date }) => {
    const entry = await fitnessRepository.addWorkout({
      title: title.trim(),
      category,
      durationMinutes,
      caloriesBurned,
      date: date.toISOString(),
      completed: true,
    });

    set((state) => ({
      workouts: [entry, ...state.workouts],
    }));

    return entry;
  },

  toggleWorkout: async (id: string) => {
    const workout = get().workouts.find((w) => w.id === id);
    if (!workout) return;

    const nextCompleted = !workout.completed;
    await fitnessRepository.toggleWorkout(id, nextCompleted);

    set((state) => ({
      workouts: state.workouts.map((w) =>
        w.id === id ? { ...w, completed: nextCompleted } : w
      ),
    }));

    if (nextCompleted) {
      useCelebrationStore.getState().triggerCelebration({
        type: 'task',
        title: workout.title,
        badgeText: `ENTRENAMIENTO COMPLETADO • ${workout.caloriesBurned} KCAL`,
        subtitle: `¡Excelente sesión de ${workout.durationMinutes} min! Has sumado ${workout.caloriesBurned} kcal quemadas a tu semana.`,
      });
    }
  },
}));

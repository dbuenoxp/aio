import { create } from 'zustand';
import { Goal, GoalTerm, GoalCategory } from '../types';
import { goalRepository } from '../services/db/repositories/goalRepository';
import { useCelebrationStore } from './useCelebrationStore';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  selectedTerm: string; // 'Todos' or GoalTerm
  loadGoals: () => Promise<void>;
  createGoal: (data: {
    title: string;
    description?: string;
    term: GoalTerm;
    category: GoalCategory;
    targetDate: Date;
    milestones: string[];
  }) => Promise<Goal>;
  toggleMilestone: (milestoneId: string, goalId: string) => Promise<void>;
  addMilestone: (goalId: string, title: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setSelectedTerm: (term: string) => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  selectedTerm: 'Todos',

  loadGoals: async () => {
    set({ isLoading: true });
    try {
      const goals = await goalRepository.getAll();
      set({ goals, isLoading: false });
    } catch (error) {
      console.error('Error loading goals:', error);
      set({ isLoading: false });
    }
  },

  createGoal: async ({ title, description, term, category, targetDate, milestones }) => {
    const goalId = `goal-${Date.now()}`;
    const newGoal = await goalRepository.create(
      {
        id: goalId,
        title: title.trim(),
        description: description?.trim(),
        term,
        category,
        targetDate: targetDate.toISOString(),
      },
      milestones
    );

    set((state) => ({ goals: [newGoal, ...state.goals] }));
    return newGoal;
  },

  toggleMilestone: async (milestoneId: string, goalId: string) => {
    const goal = get().goals.find((g) => g.id === goalId);
    if (!goal || !goal.milestones) return;

    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    const nextCompleted = !milestone.completed;
    const newProgress = await goalRepository.toggleMilestone(
      milestoneId,
      nextCompleted,
      goalId
    );

    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          progress: newProgress,
          milestones: (g.milestones || []).map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  completed: nextCompleted,
                  completedAt: nextCompleted ? new Date().toISOString() : null,
                }
              : m
          ),
        };
      }),
    }));

    if (nextCompleted) {
      const isGoalComplete = newProgress >= 100;
      useCelebrationStore.getState().triggerCelebration({
        type: isGoalComplete ? 'goal' : 'milestone',
        title: isGoalComplete ? goal.title : milestone.title,
        progress: newProgress,
        badgeText: isGoalComplete
          ? `¡META 100% LOGRADA! • ${goal.category.toUpperCase()}`
          : `HITO COMPLETADO • ${goal.title.toUpperCase()}`,
        subtitle: isGoalComplete
          ? '¡Increíble logro! Has completado absolutamente todos los hitos de esta meta.'
          : `¡Avance registrado en "${goal.title}"! Ya alcanzaste el ${newProgress}% de tu meta.`,
      });
    }
  },

  addMilestone: async (goalId: string, title: string) => {
    const newMilestone = await goalRepository.addMilestone(goalId, title);
    // Reload goals to refresh recalculated progress
    const goals = await goalRepository.getAll();
    set({ goals });
  },

  deleteGoal: async (id: string) => {
    await goalRepository.delete(id);
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
  },

  setSelectedTerm: (selectedTerm: string) => set({ selectedTerm }),
}));

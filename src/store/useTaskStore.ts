import { create } from 'zustand';
import { Task, TaskCategory, TaskPriority } from '../types';
import { taskRepository } from '../services/db/repositories/taskRepository';
import {
  notificationService,
  AlarmTriggerPayload,
} from '../services/notifications/NotificationService';
import { useCelebrationStore } from './useCelebrationStore';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  selectedCategory: string; // 'Todas' or TaskCategory
  selectedStatus: 'all' | 'pending' | 'reminders' | 'completed';
  activeAlarm: AlarmTriggerPayload | null;
  loadTasks: () => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: Date;
    hasAlarm: boolean;
  }) => Promise<Task>;
  updateTaskReminder: (
    id: string,
    dueDate: Date,
    hasAlarm: boolean
  ) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  dismissActiveAlarm: () => void;
  snoozeActiveAlarm: (minutes?: number) => Promise<void>;
  setSelectedCategory: (cat: string) => void;
  setSelectedStatus: (status: 'all' | 'pending' | 'reminders' | 'completed') => void;
}

let listenerRegistered = false;

export const useTaskStore = create<TaskState>((set, get) => {
  if (!listenerRegistered) {
    listenerRegistered = true;
    notificationService.onAlarmTriggered((payload) => {
      set({ activeAlarm: payload });
    });
  }

  return {
    tasks: [],
    isLoading: false,
    selectedCategory: 'Todas',
    selectedStatus: 'all',
    activeAlarm: null,

    loadTasks: async () => {
      set({ isLoading: true });
      try {
        const tasks = await taskRepository.getAll();
        set({ tasks, isLoading: false });

        // Re-arm future alarms for pending tasks
        const now = Date.now();
        for (const t of tasks) {
          if (!t.completed && t.hasAlarm && t.alarmTime) {
            const alarmDate = new Date(t.alarmTime);
            if (alarmDate.getTime() > now) {
              notificationService.scheduleTaskAlarm(
                t.id,
                t.title,
                alarmDate,
                t.description
              );
            }
          }
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        set({ isLoading: false });
      }
    },

    createTask: async ({
      title,
      description,
      category,
      priority,
      dueDate,
      hasAlarm,
    }) => {
      const taskId = `task-${Date.now()}`;
      let notificationId: string | null = null;

      if (hasAlarm) {
        notificationId = await notificationService.scheduleTaskAlarm(
          taskId,
          title.trim(),
          dueDate,
          description?.trim()
        );
      }

      const newTask: Omit<Task, 'createdAt'> = {
        id: taskId,
        title: title.trim(),
        description: description?.trim(),
        category,
        priority,
        dueDate: dueDate.toISOString(),
        hasAlarm,
        alarmTime: hasAlarm ? dueDate.toISOString() : null,
        notificationId,
        completed: false,
      };

      const created = await taskRepository.create(newTask);
      set((state) => ({ tasks: [created, ...state.tasks] }));
      return created;
    },

    updateTaskReminder: async (id: string, dueDate: Date, hasAlarm: boolean) => {
      const currentTask = get().tasks.find((t) => t.id === id);
      if (!currentTask) return;

      if (currentTask.notificationId) {
        await notificationService.cancelNotification(
          currentTask.notificationId,
          id
        );
      }

      let notificationId: string | null = null;
      if (hasAlarm && !currentTask.completed) {
        notificationId = await notificationService.scheduleTaskAlarm(
          id,
          currentTask.title,
          dueDate,
          currentTask.description
        );
      }

      const dueIso = dueDate.toISOString();
      const alarmIso = hasAlarm ? dueIso : null;

      await taskRepository.updateReminder(
        id,
        dueIso,
        hasAlarm,
        alarmIso,
        notificationId
      );

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                dueDate: dueIso,
                hasAlarm,
                alarmTime: alarmIso,
                notificationId,
              }
            : t
        ),
      }));
    },

    toggleTask: async (id: string) => {
      const currentTask = get().tasks.find((t) => t.id === id);
      if (!currentTask) return;

      const nextCompleted = !currentTask.completed;
      await taskRepository.toggleComplete(id, nextCompleted);

      if (nextCompleted) {
        await notificationService.cancelNotification(
          currentTask.notificationId || `alarm-${id}`,
          id
        );
      } else if (currentTask.hasAlarm && currentTask.alarmTime) {
        const alarmDate = new Date(currentTask.alarmTime);
        if (alarmDate.getTime() > Date.now()) {
          await notificationService.scheduleTaskAlarm(
            id,
            currentTask.title,
            alarmDate,
            currentTask.description
          );
        }
      }

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: nextCompleted,
                completedAt: nextCompleted
                  ? new Date().toISOString()
                  : undefined,
              }
            : t
        ),
      }));

      if (nextCompleted) {
        useCelebrationStore.getState().triggerCelebration({
          type: 'task',
          title: currentTask.title,
          badgeText: `TAREA COMPLETADA • ${currentTask.category.toUpperCase()}`,
          subtitle:
            '¡Excelente trabajo! Completaste esta tarea y tu productividad del mes sigue subiendo.',
        });
      }
    },

    deleteTask: async (id: string) => {
      const currentTask = get().tasks.find((t) => t.id === id);
      await notificationService.cancelNotification(
        currentTask?.notificationId || `alarm-${id}`,
        id
      );

      await taskRepository.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    },

    dismissActiveAlarm: () => {
      notificationService.stopAlarmSoundLoop();
      set({ activeAlarm: null });
    },

    snoozeActiveAlarm: async (minutes = 5) => {
      const active = get().activeAlarm;
      notificationService.stopAlarmSoundLoop();
      set({ activeAlarm: null });

      if (!active) return;

      const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
      if (active.taskId && active.taskId !== 'test-alarm') {
        await get().updateTaskReminder(active.taskId, snoozeDate, true);
      } else {
        await notificationService.scheduleTaskAlarm(
          `snooze-${Date.now()}`,
          active.title,
          snoozeDate,
          active.description
        );
      }
    },

    setSelectedCategory: (selectedCategory: string) =>
      set({ selectedCategory }),
    setSelectedStatus: (
      selectedStatus: 'all' | 'pending' | 'reminders' | 'completed'
    ) => set({ selectedStatus }),
  };
});

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Configure default notification handler for native platforms
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldPresentAlert: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // ignore on unsupported environments
  }
}

export interface AlarmTriggerPayload {
  taskId: string;
  title: string;
  description?: string;
  scheduledAt: string;
}

type AlarmListener = (payload: AlarmTriggerPayload) => void;

class NotificationService {
  private initialized = false;
  private webTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<AlarmListener> = new Set();
  private ringingInterval: ReturnType<typeof setInterval> | null = null;
  private audioCtx: any = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('aio_tasks', {
          name: 'Alarmas y Tareas AIO',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('aio_wellness', {
          name: 'Recordatorios de Bienestar e Hidratación',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 150, 200],
          lightColor: '#06B6D4',
          sound: 'default',
        });
      } catch {
        // fallback
      }
    }

    if (Platform.OS !== 'web') {
      try {
        Notifications.addNotificationReceivedListener((notification) => {
          const data = notification.request.content.data as any;
          if (data?.type === 'task_alarm') {
            this.emitAlarm({
              taskId: String(data.taskId || `task-${Date.now()}`),
              title: String(
                notification.request.content.title || 'Recordatorio de Tarea'
              ).replace(/^🔔\s*(Tarea AIO:\s*)?/, ''),
              description: notification.request.content.body || undefined,
              scheduledAt: new Date().toISOString(),
            });
          }
        });
      } catch {
        // fallback
      }
    }

    this.initialized = true;
  }

  onAlarmTriggered(listener: AlarmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitAlarm(payload: AlarmTriggerPayload) {
    this.startAlarmSoundLoop();
    this.showWebSystemNotification(payload.title, payload.description);
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (e) {
        console.warn('Error in alarm listener:', e);
      }
    }
  }

  /**
   * Play a single melodic alarm chime using Web Audio API (on web) + Haptics
   */
  playAlarmChime(): void {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {}
      );
    } catch {
      // ignore
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const notes = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6 alarm chord arpeggio

        notes.forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);

          gain.gain.setValueAtTime(0.001, now + idx * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.14 + 0.03);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + idx * 0.14 + 0.35
          );

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.36);
        });
      } catch {
        // ignore audio errors if autoplay blocked
      }
    }
  }

  /**
   * Start repeating alarm sound until dismissed
   */
  startAlarmSoundLoop(): void {
    this.stopAlarmSoundLoop();
    this.playAlarmChime();
    this.ringingInterval = setInterval(() => {
      this.playAlarmChime();
    }, 2200);
  }

  /**
   * Stop repeating alarm sound
   */
  stopAlarmSoundLoop(): void {
    if (this.ringingInterval) {
      clearInterval(this.ringingInterval);
      this.ringingInterval = null;
    }
  }

  /**
   * Trigger an immediate test alarm / reminder notification
   */
  triggerImmediateAlarm(
    title: string,
    description?: string,
    taskId = 'test-alarm'
  ): void {
    this.emitAlarm({
      taskId,
      title: title.trim() || 'Recordatorio de prueba',
      description:
        description?.trim() ||
        '¡Así sonará y se verá tu recordatorio a la fecha y hora programada!',
      scheduledAt: new Date().toISOString(),
    });
  }

  private showWebSystemNotification(title: string, description?: string) {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'Notification' in window
    ) {
      try {
        if (window.Notification.permission === 'granted') {
          new window.Notification(`🔔 Recordatorio AIO: ${title}`, {
            body:
              description || '¡Es hora de cumplir con tu tarea / recordatorio!',
          });
        }
      } catch {
        // ignore
      }
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      await this.init();

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (window.Notification.permission === 'granted') return true;
          if (window.Notification.permission !== 'denied') {
            const perm = await window.Notification.requestPermission();
            return perm === 'granted';
          }
        }
        return true; // Always allow in-app alarm timer on web
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.warn('Error requesting notification permissions:', error);
      return Platform.OS === 'web';
    }
  }

  /**
   * Schedule exact alarm for a task (both in-app timer & OS notification)
   */
  async scheduleTaskAlarm(
    taskId: string,
    title: string,
    date: Date,
    description?: string
  ): Promise<string | null> {
    try {
      await this.requestPermissions();

      const now = new Date();
      const delayMs = date.getTime() - now.getTime();
      if (delayMs <= 0) {
        return null;
      }

      const timerId = `alarm-${taskId}`;

      // Clear any previous timer for this task
      const existingTimer = this.webTimers.get(timerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Schedule in-app alarm timer (capped safely at 24.8 days max setTimeout)
      if (delayMs <= 2147483647) {
        const timer = setTimeout(() => {
          this.webTimers.delete(timerId);
          this.emitAlarm({
            taskId,
            title,
            description,
            scheduledAt: date.toISOString(),
          });
        }, delayMs);
        this.webTimers.set(timerId, timer);
      }

      if (Platform.OS !== 'web') {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Tarea AIO: ${title}`,
            body: description || '¡Es hora de cumplir con tu tarea pendiente!',
            sound: true,
            data: { taskId, type: 'task_alarm' },
            ...(Platform.OS === 'android' ? { channelId: 'aio_tasks' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: date,
          },
        });

        return notificationId;
      }

      return timerId;
    } catch (error) {
      console.error('Error scheduling task alarm:', error);
      return `alarm-${taskId}`;
    }
  }

  /**
   * Schedule recurring hydration reminder (e.g. every X hours)
   */
  async scheduleHydrationReminder(intervalHours = 2): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return 'web-hydration';
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      await this.cancelHydrationReminders();

      const seconds = Math.max(60, intervalHours * 3600);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Momento de hidratarte',
          body: '¡Toma un vaso de agua (250ml) para mantener tu energía y foco!',
          sound: true,
          data: { type: 'hydration_reminder' },
          ...(Platform.OS === 'android' ? { channelId: 'aio_wellness' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling hydration reminder:', error);
      return null;
    }
  }

  /**
   * Schedule daily workout alarm (e.g. at 07:30)
   */
  async scheduleDailyWorkoutReminder(
    hour: number,
    minute: number,
    title = 'Tu entrenamiento diario'
  ): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return 'web-workout';
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚡ ${title}`,
          body: '¡Dedica 30 minutos a tu cuerpo hoy! Vamos por esa meta.',
          sound: true,
          data: { type: 'workout_reminder' },
          ...(Platform.OS === 'android' ? { channelId: 'aio_wellness' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling workout reminder:', error);
      return null;
    }
  }

  /**
   * Cancel specific notification by ID or taskId
   */
  async cancelNotification(notificationId: string, taskId?: string): Promise<void> {
    try {
      if (this.webTimers.has(notificationId)) {
        clearTimeout(this.webTimers.get(notificationId)!);
        this.webTimers.delete(notificationId);
      }
      if (taskId && this.webTimers.has(`alarm-${taskId}`)) {
        clearTimeout(this.webTimers.get(`alarm-${taskId}`)!);
        this.webTimers.delete(`alarm-${taskId}`);
      }
      if (Platform.OS !== 'web' && !notificationId.startsWith('alarm-')) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
    } catch (error) {
      console.warn('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel hydration reminders
   */
  async cancelHydrationReminders(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled) {
        if (item.content.data?.type === 'hydration_reminder') {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
    } catch (error) {
      console.warn('Error cancelling hydration reminders:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAll(): Promise<void> {
    try {
      for (const timer of this.webTimers.values()) {
        clearTimeout(timer);
      }
      this.webTimers.clear();
      if (Platform.OS !== 'web') {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.warn('Error cancelling all notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();

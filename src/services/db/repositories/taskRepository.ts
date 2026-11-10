import { getDatabase } from '../sqlite';
import { Task, TaskCategory, TaskPriority } from '../../../types';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  due_date: string;
  has_alarm: number;
  alarm_time: string | null;
  notification_id: string | null;
  completed: number;
  completed_at: string | null;
  created_at: string;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category as TaskCategory,
    priority: row.priority as TaskPriority,
    dueDate: row.due_date,
    hasAlarm: row.has_alarm === 1,
    alarmTime: row.alarm_time,
    notificationId: row.notification_id,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      'SELECT * FROM tasks ORDER BY completed ASC, due_date ASC'
    );
    return rows.map(mapRowToTask);
  },

  async create(task: Omit<Task, 'createdAt'>): Promise<Task> {
    const db = await getDatabase();
    const createdAt = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO tasks (
        id, title, description, category, priority, due_date,
        has_alarm, alarm_time, notification_id, completed, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.title,
      task.description || null,
      task.category,
      task.priority,
      task.dueDate,
      task.hasAlarm ? 1 : 0,
      task.alarmTime || null,
      task.notificationId || null,
      task.completed ? 1 : 0,
      task.completedAt || null,
      createdAt
    );

    return {
      ...task,
      createdAt,
    };
  },

  async toggleComplete(id: string, completed: boolean): Promise<void> {
    const db = await getDatabase();
    const completedAt = completed ? new Date().toISOString() : null;
    await db.runAsync(
      'UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?',
      completed ? 1 : 0,
      completedAt,
      id
    );
  },

  async updateNotificationId(id: string, notificationId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tasks SET notification_id = ? WHERE id = ?',
      notificationId,
      id
    );
  },

  async updateReminder(
    id: string,
    dueDate: string,
    hasAlarm: boolean,
    alarmTime: string | null,
    notificationId: string | null
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tasks SET due_date = ?, has_alarm = ?, alarm_time = ?, notification_id = ? WHERE id = ?',
      dueDate,
      hasAlarm ? 1 : 0,
      alarmTime,
      notificationId,
      id
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
  },
};

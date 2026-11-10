export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  isGuest: boolean;
  biometricsEnabled: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export type TaskCategory = 'Trabajo' | 'Personal' | 'Proyectos' | 'Salud' | 'Finanzas';
export type TaskPriority = 'Baja' | 'Media' | 'Alta';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // ISO string
  hasAlarm: boolean;
  alarmTime?: string | null;
  notificationId?: string | null;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
}

export type GoalTerm = 'Corto' | 'Mediano' | 'Largo';
export type GoalCategory = 'Finanzas' | 'Carrera' | 'Personal' | 'Salud' | 'Educación';

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  term: GoalTerm;
  category: GoalCategory;
  targetDate: string; // ISO string
  progress: number; // 0 - 100
  milestones?: Milestone[];
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';
export type TransactionCategory =
  | 'Comida'
  | 'Servicios'
  | 'Inversión'
  | 'Transporte'
  | 'Salario'
  | 'Educación'
  | 'Entretenimiento'
  | 'Salud'
  | 'Otros';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  totalAmount?: number;
  myPercentage?: number;
  involvedPeople?: string[];
  category: TransactionCategory;
  description: string;
  date: string; // ISO string
  currency: string;
  createdAt: string;
}

export interface FinanceSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  currency: string;
}

export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  note?: string;
  createdAt: string;
}

export type WorkoutCategory = 'Cardio' | 'Fuerza' | 'Flexibilidad' | 'HIIT' | 'Funcional' | 'Running';

export interface WorkoutEntry {
  id: string;
  title: string;
  category: WorkoutCategory;
  durationMinutes: number;
  caloriesBurned: number;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  date: string; // YYYY-MM-DD
  glasses: number;
  targetGlasses: number;
  amountMl: number;
  updatedAt: string;
}

export interface FitnessProfile {
  currentWeight: number;
  targetWeight: number;
  initialWeight: number;
  height: number;
  unit: 'kg' | 'lbs';
  hydrationReminderIntervalHours: number;
  hydrationReminderEnabled: boolean;
  workoutReminderTime: string; // e.g. "07:30"
  workoutReminderEnabled: boolean;
}

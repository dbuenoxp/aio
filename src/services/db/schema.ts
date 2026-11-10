export const CREATE_TABLES_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    is_guest INTEGER DEFAULT 0,
    biometrics_enabled INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TEXT NOT NULL,
    has_alarm INTEGER DEFAULT 0,
    alarm_time TEXT,
    notification_id TEXT,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    term TEXT NOT NULL,
    category TEXT NOT NULL,
    target_date TEXT NOT NULL,
    progress REAL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    total_amount REAL,
    my_percentage REAL DEFAULT 100,
    involved_people TEXT,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PEN',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fitness_profile (
    id TEXT PRIMARY KEY,
    current_weight REAL NOT NULL,
    target_weight REAL NOT NULL,
    initial_weight REAL NOT NULL,
    height REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    hydration_reminder_hours INTEGER DEFAULT 2,
    hydration_reminder_enabled INTEGER DEFAULT 1,
    workout_reminder_time TEXT DEFAULT '07:30',
    workout_reminder_enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    weight REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS water_logs (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    glasses INTEGER DEFAULT 0,
    target_glasses INTEGER DEFAULT 8,
    amount_ml INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    calories_burned INTEGER DEFAULT 200,
    date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

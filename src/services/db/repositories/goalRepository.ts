import { getDatabase } from '../sqlite';
import { Goal, Milestone, GoalTerm, GoalCategory } from '../../../types';

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  term: string;
  category: string;
  target_date: string;
  progress: number;
  created_at: string;
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  title: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
}

export const goalRepository = {
  async getAll(): Promise<Goal[]> {
    const db = await getDatabase();
    const goalRows = await db.getAllAsync<GoalRow>(
      'SELECT * FROM goals ORDER BY target_date ASC'
    );
    const milestoneRows = await db.getAllAsync<MilestoneRow>(
      'SELECT * FROM milestones ORDER BY created_at ASC'
    );

    const milestonesByGoal = new Map<string, Milestone[]>();
    for (const m of milestoneRows) {
      const list = milestonesByGoal.get(m.goal_id) || [];
      list.push({
        id: m.id,
        goalId: m.goal_id,
        title: m.title,
        completed: m.completed === 1,
        completedAt: m.completed_at,
        createdAt: m.created_at,
      });
      milestonesByGoal.set(m.goal_id, list);
    }

    return goalRows.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description || undefined,
      term: g.term as GoalTerm,
      category: g.category as GoalCategory,
      targetDate: g.target_date,
      progress: Math.round(g.progress),
      milestones: milestonesByGoal.get(g.id) || [],
      createdAt: g.created_at,
    }));
  },

  async create(
    goalData: Omit<Goal, 'createdAt' | 'progress' | 'milestones'>,
    milestoneTitles: string[]
  ): Promise<Goal> {
    const db = await getDatabase();
    const createdAt = new Date().toISOString();
    const progress = 0;

    await db.runAsync(
      `INSERT INTO goals (id, title, description, term, category, target_date, progress, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      goalData.id,
      goalData.title,
      goalData.description || null,
      goalData.term,
      goalData.category,
      goalData.targetDate,
      progress,
      createdAt
    );

    const createdMilestones: Milestone[] = [];
    for (let i = 0; i < milestoneTitles.length; i++) {
      const title = milestoneTitles[i].trim();
      if (!title) continue;
      const mId = `m-${Date.now()}-${i}`;
      await db.runAsync(
        `INSERT INTO milestones (id, goal_id, title, completed, created_at) VALUES (?, ?, ?, ?, ?)`,
        mId,
        goalData.id,
        title,
        0,
        createdAt
      );
      createdMilestones.push({
        id: mId,
        goalId: goalData.id,
        title,
        completed: false,
        createdAt,
      });
    }

    return {
      ...goalData,
      progress,
      milestones: createdMilestones,
      createdAt,
    };
  },

  async toggleMilestone(
    milestoneId: string,
    completed: boolean,
    goalId: string
  ): Promise<number> {
    const db = await getDatabase();
    const completedAt = completed ? new Date().toISOString() : null;

    await db.runAsync(
      'UPDATE milestones SET completed = ?, completed_at = ? WHERE id = ?',
      completed ? 1 : 0,
      completedAt,
      milestoneId
    );

    // Recalculate progress for this goal
    const milestones = await db.getAllAsync<{ completed: number }>(
      'SELECT completed FROM milestones WHERE goal_id = ?',
      goalId
    );

    let newProgress = 0;
    if (milestones.length > 0) {
      const completedCount = milestones.filter((m) => m.completed === 1).length;
      newProgress = Math.round((completedCount / milestones.length) * 100);
    }

    await db.runAsync(
      'UPDATE goals SET progress = ? WHERE id = ?',
      newProgress,
      goalId
    );

    return newProgress;
  },

  async addMilestone(goalId: string, title: string): Promise<Milestone> {
    const db = await getDatabase();
    const id = `m-${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO milestones (id, goal_id, title, completed, created_at) VALUES (?, ?, ?, ?, ?)`,
      id,
      goalId,
      title,
      0,
      createdAt
    );

    // Recalculate progress
    const milestones = await db.getAllAsync<{ completed: number }>(
      'SELECT completed FROM milestones WHERE goal_id = ?',
      goalId
    );
    const completedCount = milestones.filter((m) => m.completed === 1).length;
    const newProgress = Math.round((completedCount / milestones.length) * 100);
    await db.runAsync('UPDATE goals SET progress = ? WHERE id = ?', newProgress, goalId);

    return {
      id,
      goalId,
      title,
      completed: false,
      createdAt,
    };
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM goals WHERE id = ?', id);
  },
};

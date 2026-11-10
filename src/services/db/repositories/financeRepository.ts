import { getDatabase } from '../sqlite';
import { Transaction, TransactionCategory, TransactionType, FinanceSummary } from '../../../types';

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  total_amount?: number | null;
  my_percentage?: number | null;
  involved_people?: string | null;
  category: string;
  description: string | null;
  date: string;
  currency: string;
  created_at: string;
}

function parseInvolvedPeople(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => String(p).trim()).filter(Boolean);
    }
  } catch {
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: row.amount,
    totalAmount: row.total_amount ?? row.amount,
    myPercentage: row.my_percentage ?? 100,
    involvedPeople: parseInvolvedPeople(row.involved_people),
    category: row.category as TransactionCategory,
    description: row.description || '',
    date: row.date,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

export const financeRepository = {
  async getAll(): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
    );
    return rows.map(mapRow);
  },

  async create(tx: Omit<Transaction, 'createdAt'>): Promise<Transaction> {
    const db = await getDatabase();
    const createdAt = new Date().toISOString();
    const totalAmount = tx.totalAmount ?? tx.amount;
    const myPercentage = tx.myPercentage ?? 100;
    const involvedPeopleJson =
      tx.involvedPeople && tx.involvedPeople.length > 0
        ? JSON.stringify(tx.involvedPeople)
        : null;

    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, total_amount, my_percentage, involved_people, category, description, date, currency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tx.id,
      tx.type,
      tx.amount,
      totalAmount,
      myPercentage,
      involvedPeopleJson,
      tx.category,
      tx.description,
      tx.date,
      tx.currency || 'PEN',
      createdAt
    );

    return {
      ...tx,
      totalAmount,
      myPercentage,
      involvedPeople: tx.involvedPeople || [],
      createdAt,
    };
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  },

  async getSummary(
    currency = 'PEN',
    targetMonth?: number,
    targetYear?: number
  ): Promise<FinanceSummary> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE currency = ?',
      currency
    );

    let totalBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    const now = new Date();
    const activeYear = targetYear !== undefined ? targetYear : now.getFullYear();
    const activeMonth = targetMonth !== undefined ? targetMonth : now.getMonth();

    for (const r of rows) {
      const txDate = new Date(r.date);
      const isTargetMonth =
        txDate.getFullYear() === activeYear && txDate.getMonth() === activeMonth;

      if (r.type === 'income') {
        totalBalance += r.amount;
        if (isTargetMonth) monthlyIncome += r.amount;
      } else {
        totalBalance -= r.amount;
        if (isTargetMonth) monthlyExpense += r.amount;
      }
    }

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      netSavings: monthlyIncome - monthlyExpense,
      currency,
    };
  },
};

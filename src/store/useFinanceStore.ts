import { create } from 'zustand';
import { Transaction, TransactionCategory, TransactionType, FinanceSummary } from '../types';
import { financeRepository } from '../services/db/repositories/financeRepository';

interface FinanceState {
  transactions: Transaction[];
  summary: FinanceSummary;
  currency: string;
  selectedMonth: number; // 0 - 11
  selectedYear: number;
  isLoading: boolean;
  selectedCategory: string;
  selectedType: 'all' | 'income' | 'expense';
  loadFinance: () => Promise<void>;
  addTransaction: (data: {
    type: TransactionType;
    amount: number;
    totalAmount?: number;
    myPercentage?: number;
    involvedPeople?: string[];
    category: TransactionCategory;
    description: string;
    date: Date;
    currency?: string;
  }) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setCurrency: (currency: string) => void;
  setSelectedPeriod: (month: number, year: number) => Promise<void>;
  prevMonth: () => Promise<void>;
  nextMonth: () => Promise<void>;
  resetToCurrentMonth: () => Promise<void>;
  setSelectedCategory: (cat: string) => void;
  setSelectedType: (type: 'all' | 'income' | 'expense') => void;
}

const initialNow = new Date();

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  summary: {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    netSavings: 0,
    currency: 'PEN',
  },
  currency: 'PEN',
  selectedMonth: initialNow.getMonth(),
  selectedYear: initialNow.getFullYear(),
  isLoading: false,
  selectedCategory: 'Todas',
  selectedType: 'all',

  loadFinance: async () => {
    set({ isLoading: true });
    try {
      const { currency, selectedMonth, selectedYear } = get();
      const [transactions, summary] = await Promise.all([
        financeRepository.getAll(),
        financeRepository.getSummary(currency, selectedMonth, selectedYear),
      ]);
      set({ transactions, summary, isLoading: false });
    } catch (error) {
      console.error('Error loading finance:', error);
      set({ isLoading: false });
    }
  },

  addTransaction: async ({
    type,
    amount,
    totalAmount,
    myPercentage,
    involvedPeople,
    category,
    description,
    date,
    currency,
  }) => {
    const activeCurrency = currency || get().currency;
    const { selectedMonth, selectedYear } = get();
    const txId = `tx-${Date.now()}`;
    const newTx = await financeRepository.create({
      id: txId,
      type,
      amount,
      totalAmount: totalAmount ?? amount,
      myPercentage: myPercentage ?? 100,
      involvedPeople: involvedPeople || [],
      category,
      description,
      date: date.toISOString(),
      currency: activeCurrency,
    });

    const summary = await financeRepository.getSummary(
      activeCurrency,
      selectedMonth,
      selectedYear
    );
    set((state) => ({
      transactions: [newTx, ...state.transactions],
      summary,
    }));

    return newTx;
  },

  deleteTransaction: async (id: string) => {
    await financeRepository.delete(id);
    const { currency, selectedMonth, selectedYear } = get();
    const summary = await financeRepository.getSummary(
      currency,
      selectedMonth,
      selectedYear
    );
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      summary,
    }));
  },

  setCurrency: async (currency: string) => {
    const { selectedMonth, selectedYear } = get();
    set({ currency });
    const summary = await financeRepository.getSummary(
      currency,
      selectedMonth,
      selectedYear
    );
    set({ summary });
  },

  setSelectedPeriod: async (selectedMonth: number, selectedYear: number) => {
    const { currency } = get();
    set({ selectedMonth, selectedYear });
    const summary = await financeRepository.getSummary(
      currency,
      selectedMonth,
      selectedYear
    );
    set({ summary });
  },

  prevMonth: async () => {
    const { selectedMonth, selectedYear } = get();
    const nextM = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const nextY = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    await get().setSelectedPeriod(nextM, nextY);
  },

  nextMonth: async () => {
    const { selectedMonth, selectedYear } = get();
    const nextM = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextY = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    await get().setSelectedPeriod(nextM, nextY);
  },

  resetToCurrentMonth: async () => {
    const now = new Date();
    await get().setSelectedPeriod(now.getMonth(), now.getFullYear());
  },

  setSelectedCategory: (selectedCategory: string) => set({ selectedCategory }),
  setSelectedType: (selectedType: 'all' | 'income' | 'expense') => set({ selectedType }),
}));

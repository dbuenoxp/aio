import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Transaction } from '../../types';
import { Header, GlassCard, FloatingActionButton } from '../../components/common';
import { FinanceChart } from './components/FinanceChart';
import { TransactionItem } from './components/TransactionItem';
import { CreateTransactionModal } from './components/CreateTransactionModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { PersonAccountModal } from './components/PersonAccountModal';
import { colors, ThemePalette, borderRadius, typography, spacing, shadows } from '../../theme';

const CURRENCIES = [
  { code: 'PEN', label: 'PEN (S/.)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
];

const TYPE_TABS = [
  { label: 'Todos', value: 'all' as const },
  { label: 'Ingresos', value: 'income' as const },
  { label: 'Gastos', value: 'expense' as const },
];

export const FinanceScreen: React.FC = () => {
  const { palette } = useThemeStore();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const {
    transactions,
    summary,
    currency,
    selectedMonth,
    selectedYear,
    loadFinance,
    deleteTransaction,
    setCurrency,
    selectedType,
    setSelectedType,
  } = useFinanceStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [personAccountModalVisible, setPersonAccountModalVisible] = useState(false);
  const [accountTargetPerson, setAccountTargetPerson] = useState<string | null>(null);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('Todas');

  useEffect(() => {
    loadFinance();
  }, [currency]);

  const currencyTransactions = useMemo(
    () => transactions.filter((t) => (t.currency || 'PEN') === currency),
    [transactions, currency]
  );

  // Unique list of people involved across transactions in the active currency
  const involvedPeopleList = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of currencyTransactions) {
      for (const raw of t.involvedPeople || []) {
        const clean = raw.trim();
        if (clean && !map.has(clean.toLowerCase())) {
          map.set(clean.toLowerCase(), clean);
        }
      }
    }
    return Array.from(map.values());
  }, [currencyTransactions]);

  // Quick monthly totals per person for the "Sacar Cuenta" section
  const monthlyPeopleSummaries = useMemo(() => {
    const curYear = selectedYear;
    const curMonth = selectedMonth;

    return involvedPeopleList.map((person) => {
      const pLower = person.toLowerCase();
      let monthPersonShare = 0;
      let monthTxCount = 0;

      for (const tx of currencyTransactions) {
        const d = new Date(tx.date);
        if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;

        const hasPerson = (tx.involvedPeople || []).some(
          (p) => p.trim().toLowerCase() === pLower
        );
        if (!hasPerson) continue;

        monthTxCount++;
        const count = Math.max(1, (tx.involvedPeople || []).length);
        const totalAmt = tx.totalAmount ?? tx.amount;

        if (tx.type === 'expense') {
          const othersTotal = Math.max(0, totalAmt - tx.amount);
          monthPersonShare += othersTotal / count;
        } else {
          monthPersonShare += tx.amount / count;
        }
      }

      return {
        person,
        monthPersonShare: Number(monthPersonShare.toFixed(2)),
        monthTxCount,
      };
    });
  }, [involvedPeopleList, currencyTransactions, selectedMonth, selectedYear]);

  const filteredTransactions = currencyTransactions.filter((t) => {
    if (selectedType !== 'all' && t.type !== selectedType) return false;
    if (
      selectedPersonFilter !== 'Todas' &&
      !(t.involvedPeople || []).some(
        (p) => p.trim().toLowerCase() === selectedPersonFilter.toLowerCase()
      )
    ) {
      return false;
    }
    return true;
  });

  const currencySymbol = currency === 'USD' ? '$' : currency === 'PEN' ? 'S/. ' : '€ ';

  const handleOpenSacarCuenta = (personName?: string) => {
    setAccountTargetPerson(personName || involvedPeopleList[0] || null);
    setPersonAccountModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style={palette.isDark ? 'light' : 'dark'} />

      <Header
        title="Finanzas Personales"
        subtitle="Control de flujo de caja y distribución de gastos"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Currency Switcher Bar (Default: PEN Soles) */}
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>Moneda Activa:</Text>
          <View style={styles.currencyPills}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => {
                  setCurrency(c.code);
                  setSelectedPersonFilter('Todas');
                }}
                style={[
                  styles.currencyPill,
                  currency === c.code && styles.currencyPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    currency === c.code && styles.currencyPillTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Total Balance Card */}
        <LinearGradient
          colors={colors.gradients.financeHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceCaption}>Balance Neto Acumulado</Text>
          <Text style={styles.balanceAmount}>
            {currencySymbol}
            {summary.totalBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <View style={styles.incomeIcon}>
                <Ionicons name="arrow-down" size={16} color={colors.mint} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Ingresos Mes</Text>
                <Text style={styles.incomeText}>
                  +{currencySymbol}{summary.monthlyIncome.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricBox}>
              <View style={styles.expenseIcon}>
                <Ionicons name="arrow-up" size={16} color={colors.danger} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Gastos Mes</Text>
                <Text style={styles.expenseText}>
                  -{currencySymbol}{summary.monthlyExpense.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Sacar Cuenta por Persona Section */}
        <GlassCard style={styles.sacarCuentaCard}>
          <View style={styles.sacarCuentaHeader}>
            <View style={styles.sacarCuentaTitleRow}>
              <View style={styles.sacarCuentaIconWrap}>
                <Ionicons
                  name="calculator-outline"
                  size={18}
                  color={colors.cyanLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sacarCuentaTitle}>
                  Sacar Cuenta del Mes
                </Text>
                <Text style={styles.sacarCuentaSubtitle}>
                  Selecciona una persona para ver el resumen de su cuenta mensual
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleOpenSacarCuenta()}
              style={styles.sacarCuentaBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={14} color="#FFF" />
              <Text style={styles.sacarCuentaBtnText}>Sacar Cuenta</Text>
            </TouchableOpacity>
          </View>

          {monthlyPeopleSummaries.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peopleAccountCardsRow}
            >
              {monthlyPeopleSummaries.map((item) => (
                <TouchableOpacity
                  key={item.person}
                  onPress={() => handleOpenSacarCuenta(item.person)}
                  style={styles.personAccountMiniCard}
                  activeOpacity={0.75}
                >
                  <View style={styles.personMiniTop}>
                    <View style={styles.personMiniAvatar}>
                      <Text style={styles.personMiniAvatarText}>
                        {item.person.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personMiniName} numberOfLines={1}>
                        {item.person}
                      </Text>
                      <Text style={styles.personMiniSub}>
                        {item.monthTxCount}{' '}
                        {item.monthTxCount === 1 ? 'mov. este mes' : 'movs. este mes'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.personMiniBottom}>
                    <Text style={styles.personMiniLabel}>Cuenta del mes:</Text>
                    <Text style={styles.personMiniAmount}>
                      {currencySymbol}
                      {item.monthPersonShare.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPeopleHintText}>
              Agrega personas involucradas en tus ingresos o gastos compartidos
              para calcular su cuenta mensual automáticamente.
            </Text>
          )}
        </GlassCard>

        {/* Dynamic Category SVG Donut Chart Card */}
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Distribución de Gastos por Categoría</Text>
            <Ionicons name="pie-chart-outline" size={18} color={colors.cyanLight} />
          </View>
          <FinanceChart transactions={currencyTransactions} currency={currency} />
        </GlassCard>

        {/* People Filter Pills (when there are transactions with involved people) */}
        {involvedPeopleList.length > 0 && (
          <View style={styles.peopleFilterSection}>
            <View style={styles.peopleFilterHeader}>
              <Ionicons name="people-outline" size={15} color={colors.cyanLight} />
              <Text style={styles.peopleFilterTitle}>Filtrar Movimientos por Persona</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peopleFilterRow}
            >
              {['Todas', ...involvedPeopleList].map((person) => {
                const isSelected = selectedPersonFilter === person;
                return (
                  <TouchableOpacity
                    key={person}
                    onPress={() => setSelectedPersonFilter(person)}
                    style={[
                      styles.personFilterPill,
                      isSelected && styles.personFilterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.personFilterPillText,
                        isSelected && styles.personFilterPillTextActive,
                      ]}
                    >
                      {person}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Transactions Section */}
        <View style={styles.txSectionHeader}>
          <View>
            <Text style={styles.txTitle}>Historial de Movimientos</Text>
            <Text style={styles.txTapHint}>
              Toca un movimiento para ver su detalle
            </Text>
          </View>

          {/* Filter Pills: Todos, Ingresos, Gastos */}
          <View style={styles.typeFilterContainer}>
            {TYPE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setSelectedType(tab.value)}
                style={[
                  styles.typeTab,
                  selectedType === tab.value && styles.typeTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === tab.value && styles.typeTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredTransactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            currency={currency}
            onDelete={deleteTransaction}
            onPress={(selected) => setSelectedTransaction(selected)}
          />
        ))}

        {filteredTransactions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No hay transacciones con este filtro.</Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <FloatingActionButton
        onPress={() => setCreateModalVisible(true)}
        icon="add"
      />

      <CreateTransactionModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      <TransactionDetailModal
        visible={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={deleteTransaction}
        onOpenPersonAccount={(personName) => handleOpenSacarCuenta(personName)}
      />

      <PersonAccountModal
        visible={personAccountModalVisible}
        onClose={() => setPersonAccountModalVisible(false)}
        transactions={transactions}
        currency={currency}
        initialPerson={accountTargetPerson}
        onSelectTransaction={(tx) => setSelectedTransaction(tx)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    currencyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    currencyLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    currencyPills: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.full,
      padding: 3,
    },
    currencyPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
    },
    currencyPillActive: {
      backgroundColor: colors.primary,
    },
    currencyPillText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    currencyPillTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    balanceCard: {
      borderRadius: borderRadius.xl,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(79, 70, 229, 0.3)' : '#BAE6FD',
      marginBottom: 16,
      ...shadows.glass,
      shadowOpacity: colors.isDark ? 0.35 : 0.08,
    },
    balanceCaption: {
      ...typography.caption,
      color: colors.cyanLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    balanceAmount: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 6,
      marginBottom: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    metricBox: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    incomeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.mint}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    expenseIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.danger}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    metricLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    incomeText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.mint,
    },
    expenseText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.danger,
    },
    divider: {
      width: 1,
      height: 32,
      backgroundColor: colors.divider,
    },
    sacarCuentaCard: {
      padding: 16,
      marginBottom: 16,
    },
    sacarCuentaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    sacarCuentaTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    sacarCuentaIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.cyan}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sacarCuentaTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    sacarCuentaSubtitle: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    sacarCuentaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
    },
    sacarCuentaBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
    },
    peopleAccountCardsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    personAccountMiniCard: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: `${colors.cyan}45`,
      borderRadius: borderRadius.md,
      padding: 12,
      minWidth: 165,
    },
    personMiniTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    personMiniAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.primary}30`,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personMiniAvatarText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.isDark ? '#FFF' : colors.primary,
    },
    personMiniName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    personMiniSub: {
      fontSize: 10,
      color: colors.textMuted,
    },
    personMiniBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    personMiniLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    personMiniAmount: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.cyanLight,
    },
    noPeopleHintText: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 10,
    },
    chartCard: {
      padding: 16,
      marginBottom: 20,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    chartTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    peopleFilterSection: {
      marginBottom: 16,
    },
    peopleFilterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    peopleFilterTitle: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    peopleFilterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    personFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    personFilterPillActive: {
      backgroundColor: `${colors.cyan}22`,
      borderColor: colors.cyanLight,
    },
    personFilterPillText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    personFilterPillTextActive: {
      color: colors.cyanLight,
      fontWeight: '700',
    },
    txSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    txTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      fontSize: 16,
    },
    txTapHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    typeFilterContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 2,
    },
    typeTab: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
    },
    typeTabActive: {
      backgroundColor: colors.primary,
    },
    typeTabText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    typeTabTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 8,
    },
  });

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ModalContainer, CustomButton } from '../../../components/common';
import { Transaction } from '../../../types';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface PersonAccountModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: string;
  initialPerson?: string | null;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const PersonAccountModal: React.FC<PersonAccountModalProps> = ({
  visible,
  onClose,
  transactions,
  currency,
  initialPerson = null,
  onSelectTransaction,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { selectedMonth: storeMonth, selectedYear: storeYear } = useFinanceStore();
  const [selectedYear, setSelectedYear] = useState(storeYear);
  const [selectedMonth, setSelectedMonth] = useState(storeMonth); // 0-11
  const [onlyCurrentMonth, setOnlyCurrentMonth] = useState(true);

  useEffect(() => {
    if (visible) {
      setSelectedMonth(storeMonth);
      setSelectedYear(storeYear);
    }
  }, [visible, storeMonth, storeYear]);

  // Extract all unique people across transactions in the active currency
  const peopleList = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      if ((tx.currency || 'PEN') !== currency) continue;
      for (const raw of tx.involvedPeople || []) {
        const clean = raw.trim();
        if (clean && !map.has(clean.toLowerCase())) {
          map.set(clean.toLowerCase(), clean);
        }
      }
    }
    return Array.from(map.values());
  }, [transactions, currency]);

  const [selectedPerson, setSelectedPerson] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (initialPerson && peopleList.some((p) => p.toLowerCase() === initialPerson.toLowerCase())) {
        const match = peopleList.find((p) => p.toLowerCase() === initialPerson.toLowerCase());
        setSelectedPerson(match || peopleList[0] || '');
      } else if (!selectedPerson || !peopleList.includes(selectedPerson)) {
        setSelectedPerson(peopleList[0] || '');
      }
    }
  }, [visible, initialPerson, peopleList]);

  const currencySymbol =
    currency === 'USD' ? '$' : currency === 'PEN' ? 'S/. ' : '€ ';

  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    'es-ES',
    { month: 'long', year: 'numeric' }
  );
  const formattedMonthLabel =
    monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const goPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Compute account breakdown for selectedPerson
  const accountSummary = useMemo(() => {
    if (!selectedPerson) {
      return {
        items: [] as {
          tx: Transaction;
          totalAmount: number;
          myPercentage: number;
          myShare: number;
          personPercentage: number;
          personShare: number;
        }[],
        personExpenseTotal: 0,
        myExpenseShareTotal: 0,
        sharedBillsGrossTotal: 0,
        personIncomeTotal: 0,
        totalPersonAccount: 0,
      };
    }

    const personLower = selectedPerson.toLowerCase();

    const filteredTxs = transactions.filter((tx) => {
      if ((tx.currency || 'PEN') !== currency) return false;
      const hasPerson = (tx.involvedPeople || []).some(
        (p) => p.trim().toLowerCase() === personLower
      );
      if (!hasPerson) return false;

      if (onlyCurrentMonth) {
        const d = new Date(tx.date);
        return (
          d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
        );
      }
      return true;
    });

    let personExpenseTotal = 0;
    let myExpenseShareTotal = 0;
    let sharedBillsGrossTotal = 0;
    let personIncomeTotal = 0;

    const items = filteredTxs.map((tx) => {
      const peopleCount = Math.max(1, (tx.involvedPeople || []).length);
      const totalAmount = tx.totalAmount ?? tx.amount;
      const myPercentage = tx.myPercentage ?? 100;

      if (tx.type === 'expense') {
        const myShare = tx.amount;
        const othersTotal = Math.max(
          0,
          Number((totalAmount - myShare).toFixed(2))
        );
        const othersPercent = Math.max(
          0,
          Number((100 - myPercentage).toFixed(2))
        );
        const personShare = Number((othersTotal / peopleCount).toFixed(2));
        const personPercentage = Number(
          (othersPercent / peopleCount).toFixed(2)
        );

        personExpenseTotal += personShare;
        myExpenseShareTotal += myShare;
        sharedBillsGrossTotal += totalAmount;

        return {
          tx,
          totalAmount,
          myPercentage,
          myShare,
          personPercentage,
          personShare,
        };
      } else {
        // Income / owed to user by this person
        const personShare = Number((tx.amount / peopleCount).toFixed(2));
        const personPercentage = Number((100 / peopleCount).toFixed(2));
        personIncomeTotal += personShare;

        return {
          tx,
          totalAmount: tx.amount,
          myPercentage: 0,
          myShare: 0,
          personPercentage,
          personShare,
        };
      }
    });

    const totalPersonAccount = Number(
      (personExpenseTotal + personIncomeTotal).toFixed(2)
    );

    return {
      items,
      personExpenseTotal: Number(personExpenseTotal.toFixed(2)),
      myExpenseShareTotal: Number(myExpenseShareTotal.toFixed(2)),
      sharedBillsGrossTotal: Number(sharedBillsGrossTotal.toFixed(2)),
      personIncomeTotal: Number(personIncomeTotal.toFixed(2)),
      totalPersonAccount,
    };
  }, [
    selectedPerson,
    transactions,
    currency,
    onlyCurrentMonth,
    selectedYear,
    selectedMonth,
  ]);

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Sacar Cuenta por Persona"
      subtitle="Resumen mensual de gastos compartidos e ingresos por persona"
      footer={
        <CustomButton
          title="Cerrar Resumen de Cuenta"
          onPress={onClose}
          variant="primary"
        />
      }
    >
      {peopleList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>
            Aún no hay personas registradas
          </Text>
          <Text style={styles.emptySubtitle}>
            Agrega personas involucradas al crear un ingreso o gasto compartido
            para sacar su cuenta del mes.
          </Text>
        </View>
      ) : (
        <>
          {/* Person Selector */}
          <Text style={styles.sectionLabel}>Selecciona a la Persona</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personPillsRow}
          >
            {peopleList.map((person) => {
              const isSelected =
                person.toLowerCase() === selectedPerson.toLowerCase();
              return (
                <TouchableOpacity
                  key={person}
                  onPress={() => setSelectedPerson(person)}
                  style={[
                    styles.personPill,
                    isSelected && styles.personPillActive,
                  ]}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.personAvatarSmall,
                      isSelected && styles.personAvatarSmallActive,
                    ]}
                  >
                    <Text style={styles.personAvatarSmallText}>
                      {person.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.personPillText,
                      isSelected && styles.personPillTextActive,
                    ]}
                  >
                    {person}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Period / Month Selector */}
          <View style={styles.periodBar}>
            <View style={styles.periodToggleGroup}>
              <TouchableOpacity
                onPress={() => setOnlyCurrentMonth(true)}
                style={[
                  styles.periodTab,
                  onlyCurrentMonth && styles.periodTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    onlyCurrentMonth && styles.periodTabTextActive,
                  ]}
                >
                  Por Mes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOnlyCurrentMonth(false)}
                style={[
                  styles.periodTab,
                  !onlyCurrentMonth && styles.periodTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    !onlyCurrentMonth && styles.periodTabTextActive,
                  ]}
                >
                  Todo
                </Text>
              </TouchableOpacity>
            </View>

            {onlyCurrentMonth && (
              <View style={styles.monthNavigator}>
                <TouchableOpacity
                  onPress={goPrevMonth}
                  style={styles.monthNavBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
                <Text style={styles.monthNavLabel}>{formattedMonthLabel}</Text>
                <TouchableOpacity
                  onPress={goNextMonth}
                  style={styles.monthNavBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Hero Account Summary Card for Selected Person */}
          <LinearGradient
            colors={colors.gradients.financeHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryHeroCard}
          >
            <View style={styles.summaryHeroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryHeroCaption}>
                  CUENTA DE {selectedPerson.toUpperCase()}
                </Text>
                <Text style={styles.summaryHeroPeriod}>
                  {onlyCurrentMonth ? formattedMonthLabel : 'Historial Completo'}
                </Text>
              </View>
              <View style={styles.txCountBadge}>
                <Text style={styles.txCountText}>
                  {accountSummary.items.length}{' '}
                  {accountSummary.items.length === 1
                    ? 'movimiento'
                    : 'movimientos'}
                </Text>
              </View>
            </View>

            <Text style={styles.summaryHeroTotalLabel}>
              Total que le corresponde cubrir / abonar:
            </Text>
            <Text style={styles.summaryHeroTotalAmount}>
              {currencySymbol}
              {accountSummary.totalPersonAccount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <View style={styles.summaryMetricsGrid}>
              <View style={styles.summaryMetricBox}>
                <Text style={styles.summaryMetricLabel}>
                  Parte de {selectedPerson} (Gastos)
                </Text>
                <Text
                  style={[
                    styles.summaryMetricValue,
                    { color: colors.cyanLight },
                  ]}
                >
                  {currencySymbol}
                  {accountSummary.personExpenseTotal.toFixed(2)}
                </Text>
              </View>

              <View style={styles.summaryMetricDivider} />

              <View style={styles.summaryMetricBox}>
                <Text style={styles.summaryMetricLabel}>
                  Tu Parte (Gastos)
                </Text>
                <Text
                  style={[styles.summaryMetricValue, { color: colors.danger }]}
                >
                  {currencySymbol}
                  {accountSummary.myExpenseShareTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryFooterTotals}>
              <View style={styles.summaryFooterRow}>
                <Text style={styles.summaryFooterText}>
                  Total recibos compartidos (100%):
                </Text>
                <Text style={styles.summaryFooterVal}>
                  {currencySymbol}
                  {accountSummary.sharedBillsGrossTotal.toFixed(2)}
                </Text>
              </View>

              {accountSummary.personIncomeTotal > 0 && (
                <View style={styles.summaryFooterRow}>
                  <Text style={styles.summaryFooterText}>
                    Ingresos / Deudas directas registradas:
                  </Text>
                  <Text
                    style={[styles.summaryFooterVal, { color: colors.mint }]}
                  >
                    +{currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Breakdown List of Transactions for this Person */}
          <Text style={styles.sectionLabel}>
            Desglose de Movimientos ({accountSummary.items.length})
          </Text>

          {accountSummary.items.length === 0 ? (
            <View style={styles.emptyMonthBox}>
              <Ionicons
                name="receipt-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text style={styles.emptyMonthText}>
                No hay movimientos con {selectedPerson} en este período.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {accountSummary.items.map((item) => {
                const isIncome = item.tx.type === 'income';
                const dStr = new Date(item.tx.date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <TouchableOpacity
                    key={item.tx.id}
                    style={styles.itemCard}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (onSelectTransaction) {
                        onClose();
                        onSelectTransaction(item.tx);
                      }
                    }}
                  >
                    <View style={styles.itemTopRow}>
                      <View style={styles.itemTitleWrap}>
                        <View
                          style={[
                            styles.itemDot,
                            {
                              backgroundColor: isIncome
                                ? colors.mint
                                : colors.cyanLight,
                            },
                          ]}
                        />
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.tx.description}
                        </Text>
                      </View>
                      <Text style={styles.itemDate}>
                        {item.tx.category} • {dStr}
                      </Text>
                    </View>

                    <View style={styles.itemNumbersRow}>
                      <View>
                        <Text style={styles.itemSubText}>
                          {isIncome
                            ? `Ingreso / Deuda registrada`
                            : `Total recibo: ${currencySymbol}${item.totalAmount.toFixed(
                                2
                              )} • Tú (${item.myPercentage}%): ${currencySymbol}${item.myShare.toFixed(
                                2
                              )}`}
                        </Text>
                      </View>

                      <View style={styles.itemPersonShareWrap}>
                        <Text style={styles.itemPersonPercentTag}>
                          {isIncome
                            ? 'Ingreso'
                            : `${item.personPercentage}% ${selectedPerson.split(' ')[0]}`}
                        </Text>
                        <Text
                          style={[
                            styles.itemPersonShareVal,
                            {
                              color: isIncome ? colors.mint : colors.cyanLight,
                            },
                          ]}
                        >
                          {currencySymbol}
                          {item.personShare.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    marginTop: 12,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  personPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  personPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personPillActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: colors.cyanLight,
  },
  personAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarSmallActive: {
    backgroundColor: colors.primary,
  },
  personAvatarSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  personPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  personPillTextActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  periodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  periodToggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  monthNavBtn: {
    padding: 2,
  },
  monthNavLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 105,
    textAlign: 'center',
  },
  summaryHeroCard: {
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  summaryHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  summaryHeroCaption: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.cyanLight,
    letterSpacing: 0.8,
  },
  summaryHeroPeriod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txCountBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  txCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cyanLight,
  },
  summaryHeroTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryHeroTotalAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    marginBottom: 14,
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryMetricBox: {
    flex: 1,
  },
  summaryMetricDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  summaryMetricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryMetricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryFooterTotals: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  summaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryFooterVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyMonthBox: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  emptyMonthText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  itemDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemSubText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemPersonShareWrap: {
    alignItems: 'flex-end',
  },
  itemPersonPercentTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cyanLight,
  },
  itemPersonShareVal: {
    fontSize: 14,
    fontWeight: '800',
  },
});


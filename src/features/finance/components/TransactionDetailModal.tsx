import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalContainer, CustomButton } from '../../../components/common';
import { Transaction, TransactionCategory } from '../../../types';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpenPersonAccount?: (personName: string) => void;
}

const CATEGORY_ICONS: Record<TransactionCategory, keyof typeof Ionicons.glyphMap> = {
  Comida: 'restaurant-outline',
  Servicios: 'wifi-outline',
  Inversión: 'trending-up-outline',
  Transporte: 'car-outline',
  Salario: 'briefcase-outline',
  Educación: 'school-outline',
  Entretenimiento: 'game-controller-outline',
  Salud: 'fitness-outline',
  Otros: 'receipt-outline',
};

const CURRENCY_LABELS: Record<string, string> = {
  PEN: 'Soles (PEN)',
  USD: 'Dólares (USD)',
  EUR: 'Euros (EUR)',
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  visible,
  transaction,
  onClose,
  onDelete,
  onOpenPersonAccount,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const txCurrency = transaction.currency || 'PEN';
  const currencySymbol =
    txCurrency === 'USD' ? '$' : txCurrency === 'PEN' ? 'S/. ' : '€ ';

  const totalAmount = transaction.totalAmount ?? transaction.amount;
  const myPercentage = transaction.myPercentage ?? 100;
  const isSplitExpense = !isIncome && myPercentage < 100;
  const othersPercentage = Math.max(0, Number((100 - myPercentage).toFixed(2)));
  const othersTotalAmount = Math.max(
    0,
    Number((totalAmount - transaction.amount).toFixed(2))
  );

  const people = transaction.involvedPeople || [];
  const perPersonExpenseAmount =
    people.length > 0
      ? Number((othersTotalAmount / people.length).toFixed(2))
      : othersTotalAmount;
  const perPersonPercentage =
    people.length > 0
      ? Number((othersPercentage / people.length).toFixed(2))
      : othersPercentage;
  const perPersonIncomeAmount =
    people.length > 0
      ? Number((transaction.amount / people.length).toFixed(2))
      : transaction.amount;

  const dateObj = new Date(transaction.date);
  const fullDateFormatted = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const iconName = CATEGORY_ICONS[transaction.category] || 'receipt-outline';

  const handleConfirmDelete = () => {
    Alert.alert(
      'Eliminar Transacción',
      `¿Estás seguro de eliminar "${transaction.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDelete(transaction.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title={isIncome ? 'Detalle de Ingreso' : 'Detalle de Gasto / Egreso'}
      subtitle="Información completa del movimiento financiero"
      footer={
        <View style={styles.footerButtons}>
          <TouchableOpacity
            onPress={handleConfirmDelete}
            style={styles.deleteBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Eliminar</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <CustomButton
              title="Cerrar Detalle"
              onPress={onClose}
              variant="primary"
            />
          </View>
        </View>
      }
    >
      {/* Hero Amount Banner */}
      <View
        style={[
          styles.heroBanner,
          isIncome ? styles.heroBannerIncome : styles.heroBannerExpense,
        ]}
      >
        <View style={styles.heroTopBadges}>
          <View
            style={[
              styles.typePill,
              isIncome ? styles.typePillIncome : styles.typePillExpense,
            ]}
          >
            <Ionicons
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={14}
              color={isIncome ? colors.mint : colors.danger}
            />
            <Text
              style={[
                styles.typePillText,
                { color: isIncome ? colors.mint : colors.danger },
              ]}
            >
              {isIncome ? 'INGRESO' : 'GASTO / EGRESO'}
            </Text>
          </View>

          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>
              {CURRENCY_LABELS[txCurrency] || txCurrency}
            </Text>
          </View>
        </View>

        <Text style={styles.heroConcept}>{transaction.description}</Text>

        <Text
          style={[
            styles.heroAmount,
            { color: isIncome ? colors.mint : colors.danger },
          ]}
        >
          {isIncome ? '+' : '-'}
          {currencySymbol}
          {transaction.amount.toFixed(2)}
        </Text>

        {isSplitExpense && (
          <Text style={styles.heroSubAmount}>
            Tu parte ({myPercentage}%) de un gasto total de {currencySymbol}
            {totalAmount.toFixed(2)}
          </Text>
        )}
      </View>

      {/* General Metadata Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelGroup}>
            <Ionicons name={iconName} size={16} color={colors.cyanLight} />
            <Text style={styles.infoLabel}>Categoría</Text>
          </View>
          <Text style={styles.infoValue}>{transaction.category}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelGroup}>
            <Ionicons name="calendar-outline" size={16} color={colors.cyanLight} />
            <Text style={styles.infoLabel}>Fecha</Text>
          </View>
          <Text style={styles.infoValue}>{fullDateFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelGroup}>
            <Ionicons name="time-outline" size={16} color={colors.cyanLight} />
            <Text style={styles.infoLabel}>Hora de registro</Text>
          </View>
          <Text style={styles.infoValue}>{timeFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelGroup}>
            <Ionicons name="cash-outline" size={16} color={colors.cyanLight} />
            <Text style={styles.infoLabel}>Moneda</Text>
          </View>
          <Text style={styles.infoValue}>
            {CURRENCY_LABELS[txCurrency] || txCurrency}
          </Text>
        </View>
      </View>

      {/* Expense Split Breakdown Card */}
      {!isIncome && (isSplitExpense || people.length > 0) && (
        <View style={styles.breakdownCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="pie-chart-outline" size={16} color={colors.cyanLight} />
            <Text style={styles.sectionTitle}>
              DISTRIBUCIÓN DEL GASTO
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Monto Total del Gasto</Text>
            <Text style={styles.breakdownTotalValue}>
              {currencySymbol}
              {totalAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownTagRow}>
              <Text style={styles.breakdownLabel}>Lo que te corresponde</Text>
              <View style={styles.percentPillMy}>
                <Text style={styles.percentPillMyText}>{myPercentage}%</Text>
              </View>
            </View>
            <Text style={styles.breakdownMyValue}>
              {currencySymbol}
              {transaction.amount.toFixed(2)}
            </Text>
          </View>

          {isSplitExpense && (
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownTagRow}>
                <Text style={styles.breakdownLabel}>
                  Parte compartida (otros)
                </Text>
                <View style={styles.percentPillOthers}>
                  <Text style={styles.percentPillOthersText}>
                    {othersPercentage}%
                  </Text>
                </View>
              </View>
              <Text style={styles.breakdownOthersValue}>
                {currencySymbol}
                {othersTotalAmount.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Involved People Section */}
      <View style={styles.peopleCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={16} color={colors.cyanLight} />
          <Text style={styles.sectionTitle}>
            PERSONAS INVOLUCRADAS ({people.length})
          </Text>
        </View>

        {people.length === 0 ? (
          <Text style={styles.emptyPeopleText}>
            No se registraron otras personas en este movimiento (100% individual).
          </Text>
        ) : (
          <View style={styles.peopleList}>
            {people.map((person) => (
              <View key={person} style={styles.personDetailRow}>
                <View style={styles.personLeft}>
                  <View style={styles.personAvatar}>
                    <Text style={styles.personAvatarText}>
                      {person.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{person}</Text>
                    <Text style={styles.personRoleSub}>
                      {isIncome
                        ? 'Deudor / Pagador asociado'
                        : isSplitExpense
                        ? `Le corresponde el ${perPersonPercentage}% del gasto`
                        : 'Participante en el gasto'}
                    </Text>
                  </View>
                </View>

                <View style={styles.personRight}>
                  <Text
                    style={[
                      styles.personShareAmount,
                      { color: isIncome ? colors.mint : colors.cyanLight },
                    ]}
                  >
                    {currencySymbol}
                    {(isIncome
                      ? perPersonIncomeAmount
                      : perPersonExpenseAmount
                    ).toFixed(2)}
                  </Text>
                  {onOpenPersonAccount && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onOpenPersonAccount(person);
                      }}
                      style={styles.sacarCuentaLink}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="calculator-outline"
                        size={11}
                        color={colors.cyanLight}
                      />
                      <Text style={styles.sacarCuentaLinkText}>
                        Sacar cuenta
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  heroBanner: {
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  heroBannerExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  heroBannerIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  heroTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typePillExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  typePillIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  heroConcept: {
    ...typography.h3,
    fontSize: 18,
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  heroSubAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  breakdownCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.cyanLight,
    letterSpacing: 0.6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  breakdownTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownMyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
  },
  breakdownOthersValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cyanLight,
  },
  percentPillMy: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  percentPillMyText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
  },
  percentPillOthers: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  percentPillOthersText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.cyanLight,
  },
  peopleCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 8,
  },
  emptyPeopleText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  peopleList: {
    marginTop: 8,
    gap: 10,
  },
  personDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  personAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  personRoleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  personRight: {
    alignItems: 'flex-end',
  },
  personShareAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  sacarCuentaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  sacarCuentaLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cyanLight,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});


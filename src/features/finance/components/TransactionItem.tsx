import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, TransactionCategory } from '../../../types';
import { GlassCard } from '../../../components/common';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface TransactionItemProps {
  transaction: Transaction;
  currency: string;
  onDelete: (id: string) => void;
  onPress?: (transaction: Transaction) => void;
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

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  currency,
  onDelete,
  onPress,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isIncome = transaction.type === 'income';
  const txCurrency = transaction.currency || currency || 'PEN';
  const currencySymbol =
    txCurrency === 'USD' ? '$' : txCurrency === 'PEN' ? 'S/. ' : '€ ';

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar Transacción',
      `¿Deseas eliminar "${transaction.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(transaction.id) },
      ]
    );
  };

  const iconName = CATEGORY_ICONS[transaction.category] || 'receipt-outline';
  const dateFormatted = new Date(transaction.date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });

  const hasPeople =
    transaction.involvedPeople && transaction.involvedPeople.length > 0;
  const isSplitExpense =
    !isIncome &&
    transaction.myPercentage !== undefined &&
    transaction.myPercentage < 100;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress && onPress(transaction)}
    >
      <GlassCard style={styles.card}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isIncome
                ? `${colors.mint}20`
                : `${colors.danger}20`,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isIncome ? colors.mint : colors.danger}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.metaText}>
            {transaction.category} • {dateFormatted}
          </Text>

          {(hasPeople || isSplitExpense) && (
            <View style={styles.badgesRow}>
              {hasPeople && (
                <View
                  style={[
                    styles.peopleBadge,
                    isIncome ? styles.peopleBadgeIncome : styles.peopleBadgeExpense,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={11}
                    color={isIncome ? colors.mint : colors.cyanLight}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.peopleBadgeText,
                      { color: isIncome ? colors.mint : colors.cyanLight },
                    ]}
                    numberOfLines={1}
                  >
                    {isIncome ? 'De: ' : 'Con: '}
                    {transaction.involvedPeople!.join(', ')}
                  </Text>
                </View>
              )}

              {isSplitExpense && (
                <View style={styles.percentageBadge}>
                  <Text style={styles.percentageBadgeText}>
                    {transaction.myPercentage}% tuyo
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              { color: isIncome ? colors.mint : colors.danger },
            ]}
          >
            {isIncome ? '+' : '-'}
            {currencySymbol}
            {transaction.amount.toFixed(2)}
          </Text>
          {isSplitExpense &&
            transaction.totalAmount !== undefined &&
            transaction.totalAmount !== transaction.amount && (
              <Text style={styles.totalAmountSub}>
                Total: {currencySymbol}
                {transaction.totalAmount.toFixed(2)}
              </Text>
            )}
        </View>

        <TouchableOpacity
          onPress={confirmDelete}
          style={styles.deleteButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </GlassCard>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 8,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    details: {
      flex: 1,
      marginRight: 6,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    metaText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 5,
    },
    peopleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      maxWidth: '100%',
    },
    peopleBadgeExpense: {
      backgroundColor: `${colors.cyan}18`,
      borderColor: `${colors.cyan}45`,
    },
    peopleBadgeIncome: {
      backgroundColor: `${colors.mint}18`,
      borderColor: `${colors.mint}45`,
    },
    peopleBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    percentageBadge: {
      backgroundColor: `${colors.primary}20`,
      borderColor: `${colors.primaryLight}55`,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    percentageBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryLight,
    },
    amountContainer: {
      alignItems: 'flex-end',
      marginRight: 8,
    },
    amount: {
      ...typography.body,
      fontWeight: '700',
    },
    totalAmountSub: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    deleteButton: {
      padding: 6,
    },
  });

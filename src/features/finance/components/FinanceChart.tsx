import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Transaction, TransactionCategory } from '../../../types';
import { colors, ThemePalette, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface FinanceChartProps {
  transactions: Transaction[];
  currency: string;
}

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Comida: '#10B981',        // Mint
  Servicios: '#06B6D4',     // Cyan
  Inversión: '#8B5CF6',     // Purple
  Transporte: '#F59E0B',    // Amber
  Salario: '#4F46E5',       // Indigo
  Educación: '#EC4899',     // Pink
  Entretenimiento: '#3B82F6',// Blue
  Salud: '#14B8A6',         // Teal
  Otros: '#64748B',         // Slate
};

export const FinanceChart: React.FC<FinanceChartProps> = ({
  transactions,
  currency,
}) => {
  const { palette } = useThemeStore();
  const styles = useMemo(() => createStyles(palette), [palette]);

  // Aggregate expenses by category
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

  const categoryTotals: Record<string, number> = {};
  for (const t of expenses) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  }

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category: category as TransactionCategory,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      color: CATEGORY_COLORS[category as TransactionCategory] || '#64748B',
    }));

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let strokeDashoffsetAccumulator = 0;

  if (totalExpense === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay gastos registrados este mes.</Text>
      </View>
    );
  }

  const slices = sortedCategories.map((item, idx) => {
    const strokeDasharray = `${(circumference * item.percentage) / 100} ${circumference}`;
    const strokeDashoffset = strokeDashoffsetAccumulator;
    strokeDashoffsetAccumulator += (circumference * item.percentage) / 100;
    return {
      key: `${item.category}-${idx}`,
      color: item.color,
      strokeDasharray,
      strokeDashoffset: -strokeDashoffset,
    };
  });

  const trackStroke = palette.isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(15, 23, 42, 0.1)';

  const renderDonutGraphic = () => {
    if (Platform.OS === 'web') {
      const circlesHtml = slices
        .map(
          (s) =>
            `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${s.color}" stroke-width="${strokeWidth}" stroke-dasharray="${s.strokeDasharray}" stroke-dashoffset="${s.strokeDashoffset}" stroke-linecap="round" fill="transparent" />`
        )
        .join('');
      const svgMarkup = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-90 ${size / 2} ${size / 2})"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${trackStroke}" stroke-width="${strokeWidth}" fill="transparent" />${circlesHtml}</g></svg>`;

      return (
        <div
          style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      );
    }

    // Native iOS / Android fallback
    const RNSvg = require('react-native-svg');
    const SvgComp = RNSvg.default || RNSvg.Svg;
    const GComp = RNSvg.G;
    const CircleComp = RNSvg.Circle;

    return (
      <SvgComp width={size} height={size}>
        <GComp rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <CircleComp
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackStroke}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {slices.map((s) => (
            <CircleComp
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          ))}
        </GComp>
      </SvgComp>
    );
  };

  return (
    <View style={styles.container}>
      {/* SVG Donut */}
      <View style={styles.chartWrapper}>
        {renderDonutGraphic()}

        <View style={styles.centerLabel}>
          <Text style={styles.centerCaption}>Gastos</Text>
          <Text style={styles.centerAmount}>
            {currency === 'USD' ? '$' : currency === 'PEN' ? 'S/. ' : '€ '}
            {totalExpense.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {sortedCategories.slice(0, 4).map((item) => (
          <View key={item.category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.category}
            </Text>
            <Text style={styles.legendPercentage}>
              {item.percentage.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    chartWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    centerCaption: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    centerAmount: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    legendContainer: {
      flex: 1,
      marginLeft: 20,
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    legendLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
    legendPercentage: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });
